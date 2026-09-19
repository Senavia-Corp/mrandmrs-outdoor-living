/**
 * R23-PORTADAS — grado fotografico de las imagenes de PORTADA del blog.
 *
 * Solo las tarjetas: las que se ven en `/blogs-tips`, en el carrusel de 79 rutas y en «Most Read
 * Articles». Las 30 figuras del cuerpo NO pasan por aqui.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE NO HAY UNA RECETA UNICA
 *
 * Las 10 portadas llegan con problemas distintos, medidos sobre su histograma:
 *
 *   062-06     negro en 29 y blanco en 214  -> lavada por los dos lados
 *   pergola-05 negro en 25                   -> sin punto negro
 *   kitchen-2  3,90 % de negro empastado, saturacion 4  -> sucia de sombras y apagada
 *   061-08     1,83 % de altas luces quemadas           -> NO se puede subir
 *   061-12     mediana en 78                            -> subexpuesta de verdad
 *   059-08/09  media baja pero saturacion 39            -> sujeto vivo, no tocar color
 *
 * Una sola curva para todas habria quemado unas y lavado otras. Los parametros salen del
 * histograma de CADA imagen y el resultado se MIDE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CADENA
 *
 *   1. NIVELES    p0.5 -> negro objetivo, p99.5 -> blanco objetivo. Rango completo sin inventar.
 *   2. MEDIOS     gamma hasta llevar la mediana a ~122, y SOLO ACLARA. Forzar todas a la misma
 *                 mediana es lo que aplana un reportaje: `062-06` venia con 136 -luminosa y
 *                 correcta- y el objetivo fijo la apagaba y le empastaba el negro al 2,34 %.
 *   3. CURVA S    contraste suave anclado en los medios, AFLOJADO en lo que ya viene vivo: sin
 *                 eso `062-06` pasaba de saturacion 28 a 41 (+46 %) sin tocar el color.
 *   4. SATURACION inversa a la que ya tiene. Lo apagado sube; lo vivo se queda.
 *   5. CLARITY    CLAHE suave = contraste local.
 *   6. NITIDEZ    ligera, para pantalla.
 *
 * 🚨 LA LUT SE APLICA IGUAL A R, G Y B. Eso mueve luminosidad y contraste SIN ROTAR EL TONO.
 * `R13-COLOR` dejo fuera a proposito las fotos reales de obra («retonar el trabajo del cliente es
 * peor», `check-assets.mjs`): esto es exposicion, contraste y saturacion, no retoque de color.
 *
 * 🚨 TODO EN 8 BITS. Los `.avif` de galeria entran como `depth=ushort`/`rgb16`: CLAHE revienta
 * con `hist_local: image must be VIPS_FORMAT_UCHAR`, y un desplazamiento en 0-255 se pierde
 * sobre una escala de 0-65535 (ya cazado en R22, oscurecia la imagen en vez de aclararla). Por
 * eso se pasa a `raw({depth:'uchar'})` ANTES de nada.
 *
 * 🚨 Y `sharp.gamma(g)` NO SIRVE AQUI: con un solo argumento fija entrada Y salida, y el tono casi
 * no se mueve — medido, `061-12` se quedaba en media 90 con g=1,56. El gamma va en la LUT.
 */
import sharp from 'sharp';

export const NEGRO = 6, BLANCO = 249, MEDIANA_OBJ = 122;
/** Topes de aceptacion. Si el grado los pasa, el lazo sube el punto negro y repite. */
export const TOPE_NEGRO = 1.0, TOPE_QUEMADO = 0.9;

const pct = (h, p) => {
  const tot = h.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < 256; i++) { acc += h[i]; if (acc >= tot * p) return i; }
  return 255;
};

/** Histograma y estadisticos del RECORTE ya hecho — el encuadre cambia la media. */
export async function analiza(fuente, ancho, alto) {
  const crop = typeof fuente === 'string' || Buffer.isBuffer(fuente)
    ? await sharp(fuente).resize(ancho, alto, { fit: 'cover', position: 'centre' }).toBuffer()
    : fuente;
  const [r, g, b] = (await sharp(crop).stats()).channels;
  const gris = await sharp(crop).greyscale().raw().toBuffer();
  const h = new Array(256).fill(0);
  for (const v of gris) h[v]++;
  let q = 0, n = 0;
  for (const v of gris) { if (v >= 252) q++; if (v <= 3) n++; }
  return {
    media: 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean,
    sat: (Math.abs(r.mean - g.mean) + Math.abs(g.mean - b.mean) + Math.abs(r.mean - b.mean)) / 3,
    p05: pct(h, 0.005), p50: pct(h, 0.5), p995: pct(h, 0.995),
    quemado: 100 * q / gris.length, negro: 100 * n / gris.length,
  };
}

export function receta(a, negroExtra = 0) {
  const Wt = a.quemado > 0.8 ? Math.min(BLANCO, a.p995) : BLANCO;
  const Bt = (a.negro > 1.5 ? 12 : NEGRO) + negroExtra;
  const pend = (Wt - Bt) / Math.max(1, a.p995 - a.p05);
  const desp = Bt - pend * a.p05;
  const medPost = Math.min(254, Math.max(1, pend * a.p50 + desp));
  const gamma = Math.min(1.7, Math.max(1, Math.log(medPost / 255) / Math.log(MEDIANA_OBJ / 255)));
  const sat = Math.min(1.26, Math.max(1.0, 1 + (20 - a.sat) / 70));
  const base = a.p995 - a.p05 > 200 ? 0.10 : 0.16;
  const s = base * Math.min(1, Math.max(0.35, (34 - a.sat) / 34));
  return { pend, desp, gamma, sat, s };
}

/** LUT de 256: niveles -> gamma de medios -> curva S. Misma para R, G y B. */
export function lut(r) {
  const t = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    let x = Math.min(255, Math.max(0, r.pend * v + r.desp)) / 255;
    x = Math.pow(x, 1 / r.gamma);
    x -= r.s * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
    t[v] = Math.round(Math.min(1, Math.max(0, x)) * 255);
  }
  return t;
}

async function aplicar(fuente, r, ancho, alto, calidad) {
  const { data, info } = await sharp(fuente)
    .resize(ancho, alto, { fit: 'cover', position: 'centre' })
    .toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  const T = lut(r);
  for (let i = 0; i < data.length; i++) data[i] = T[data[i]];
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .modulate({ saturation: r.sat })
    .clahe({ width: 64, height: 64, maxSlope: 2 })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: calidad })
    .toBuffer();
}

/**
 * Gradua y MIDE. Si empasta el negro, sube el punto negro y repite — como se ajusta a ojo, pero
 * con el numero delante. Devuelve el buffer y las dos medidas, para poder enseñarlas.
 */
export async function graduarPortada(fuente, ancho, alto, calidad = 86) {
  const a = await analiza(fuente, ancho, alto);
  let extra = 0, r, out, b;
  for (let i = 0; i < 3; i++) {
    r = receta(a, extra);
    out = await aplicar(fuente, r, ancho, alto, calidad);
    b = await analiza(out);
    if (b.negro <= TOPE_NEGRO && b.quemado <= TOPE_QUEMADO) break;
    extra += 5;
  }
  return { out, antes: a, despues: b, receta: r };
}
