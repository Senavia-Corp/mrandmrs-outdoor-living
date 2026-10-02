/**
 * PARECIDO VISUAL — la misma foto con otro nombre.
 *
 * Una foto puede estar a la vez en `/gallery` (`mm-construction-8`), en el banco (`bi-0504`) y en
 * una escalera heredada (`custom-pool-spa-builders-florida-02`). El nombre no lo delata; los
 * pixeles si. Lo usan la puerta de duplicados de `build-imagenes-blog.mjs` y el casting.
 *
 * dHash de 64 bits sobre el RECORTE 16:9 CENTRADO, que es lo que el blog publica. Medido el
 * 1-oct-2026 sobre las 90 fotos del blog y las 10 parejas de `publicada_como`:
 *
 *     misma foto (recodificada, graduada, de otra fuente)   0-5
 *     misma obra, otro recorte del mismo disparo             8
 *     fotos distintas                                        15 en adelante
 *
 * ponytail: dentro del blog basta un recorte centrado, porque todas las imagenes salen del mismo
 * recorte. Un recorte DESCENTRADO o de otra proporcion (las fichas de R24 publican og 1200x630 y
 * verticales con object-position) no se compara asi: para eso esta `ventanas()`, que la puerta usa
 * en su calibracion.
 */
import sharp from 'sharp';

export const MISMA = 8;
export const DUDOSA = 12;

/** dHash de una ventana de proporcion `aspecto`, colocada en (dx, dy) del sobrante y a escala `esc`. */
export async function dhash(fichero, { aspecto = 16 / 9, dx = 0.5, dy = 0.5, esc = 1 } = {}) {
  const m = await sharp(fichero).metadata();
  const w0 = Math.min(m.width, Math.floor(m.height * aspecto));
  const w = Math.round(w0 * esc);
  const h = Math.round((w0 / aspecto) * esc);
  const px = await sharp(fichero)
    .extract({ left: Math.round((m.width - w) * dx), top: Math.round((m.height - h) * dy), width: w, height: h })
    .grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let v = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) v = (v << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return v;
}

/** La foto entera con su propia proporcion: lo que se publico, tal cual. */
export async function dhashEntera(fichero) {
  const m = await sharp(fichero).metadata();
  return dhash(fichero, { aspecto: m.width / m.height });
}

/**
 * Las ventanas de `fichero` con proporcion `aspecto`: 5x5 posiciones a escalas de 1 a 0,6. Es donde
 * puede estar un recorte de direccion de arte (las fichas de R24 cierran hasta ~0,6 y descentran).
 * La misma foto recortada da su minimo en una. Se trabaja sobre una copia de 320 px: un dHash de 9x8
 * no necesita mas, y asi son 125 ventanas en milisegundos.
 */
export async function ventanas(fichero, aspecto) {
  const { data, info } = await sharp(fichero).resize({ width: 320 }).toColourspace('b-w').extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`ventanas: se esperaba 1 canal y hay ${info.channels}`);
  const out = [];
  for (const esc of [1, 0.9, 0.8, 0.7, 0.6]) {
    const w0 = Math.min(info.width, Math.floor(info.height * aspecto));
    const w = Math.max(9, Math.round(w0 * esc)); const h = Math.max(8, Math.round((w0 / aspecto) * esc));
    for (const dy of [0, 0.25, 0.5, 0.75, 1]) for (const dx of [0, 0.25, 0.5, 0.75, 1]) {
      const px = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
        .extract({ left: Math.round((info.width - w) * dx), top: Math.round((info.height - h) * dy), width: w, height: h })
        .resize(9, 8, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
      let v = 0n;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) v = (v << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
      out.push(v);
    }
  }
  return out;
}

export function distancia(a, b) {
  let x = a ^ b; let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}
