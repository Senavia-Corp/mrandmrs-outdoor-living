/**
 * LA FRANJA DE LOGOS QUE DESFILA (E7, D-166) — una sola pieza, `.mm-logos`, para las 146 rutas.
 *
 * SIN JAVASCRIPT. La pista va DOS veces en el HTML (la copia, `aria-hidden`) y la mueve una
 * animacion de CSS, `translateX(-50%)` lineal e infinita: cuando la primera lista ha salido
 * entera, la copia esta exactamente donde empezo la primera, y el bucle no se nota.
 *
 * LA VELOCIDAD SE CALCULA AQUI, EN EL BUILD. Produccion lo hacia en el navegador: esperaba a las
 * imagenes, media la lista y fijaba la duracion para ir a 60 px/s. No hace falta medir nada: los
 * logos traen `width` y `height`, se pintan a 36 px de alto con un tope de 140 de ancho y 32 de
 * hueco (`sistema.css`, § la franja de logos), asi que el ancho de una vuelta se conoce ya. La
 * duracion viaja en `--mm-logos-dur`. Si esos tres numeros cambian en la hoja, cambian aqui:
 * `check:logos` mide la velocidad real en el navegador y sale roja si se separan.
 *
 * CADA LOGO, A PIXELES ENTEROS. Su ancho a 36 de alto sale con decimales (344x108 da 114,67), y
 * con ellos la vuelta medía 1.803,34 px: al cerrarla, la copia caia a un tercio de pixel de donde
 * empezo la lista y los logos se repintaban con otro suavizado —un temblor de un fotograma cada
 * treinta segundos—. Aqui se redondea el ancho de cada uno y se escribe en su `<li>`; la vuelta
 * es un numero entero de pixeles y el cierre es la MISMA imagen, pixel a pixel.
 *
 * SIN HUECOS. Una vuelta tiene que ser al menos tan ancha como la ventana mas ancha que la
 * ensena, que es el contenedor del sitio (`--mm-contenedor`); si no lo fuera, la lista se repite
 * las veces que haga falta. Hoy una vuelta mide ~1.800 px y el contenedor 1.312: una copia basta.
 *
 * TRES CAJAS, y cada una hace una cosa. `.mm-logos-vista` es la ventana: recibe el foco y lleva
 * el anillo. `.mm-logos-marco` recorta y funde los bordes con la mascara. `.mm-logos-pista` es lo
 * que se mueve. La mascara no puede ir en la ventana: recorta tambien su propio contorno, y el
 * anillo de foco desaparecia.
 *
 * La usan `build-paginas.mjs` (fichas, condados, /about, /request-estimated y las de estado),
 * `PaginaCiudad.astro` (las 118 ciudades) y `index.astro` (la home).
 */
import fs from 'node:fs';
import path from 'node:path';

export const ALTO = 36;         // px · alto al que se pinta cada logo
export const ANCHO_MAX = 140;   // px · tope de ancho de un logo
export const HUECO = 32;        // px · --mm-e-32, detras de cada logo
export const PX_POR_S = 60;     // la velocidad de produccion

const tokens = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/disenio/tokens.css'), 'utf8');
const CONTENEDOR = Number(/--mm-contenedor:\s*(\d+)px/.exec(tokens)?.[1]);
if (!CONTENEDOR) throw new Error('logos-franja: no encuentro --mm-contenedor en tokens.css');

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** El ancho, en pixeles enteros, al que se pinta un logo. */
export const anchoDe = (l) => Math.round(Math.min((l.w * ALTO) / l.h, ANCHO_MAX));

/** El ancho de una vuelta, cuantas listas hacen falta por mitad y lo que tarda la vuelta. */
export function medidaDeFranja(logos) {
  const ancho = logos.reduce((s, l) => s + anchoDe(l) + HUECO, 0);
  const porMitad = Math.max(1, Math.ceil(CONTENEDOR / ancho));
  return { ancho, porMitad, dur: (ancho * porMitad) / PX_POR_S };
}

/** El HTML de la franja. `logos`: [{ src, w, h }], en su orden. */
export function franjaLogos(titulo, logos) {
  if (!logos.length || logos.some((l) => !l.src || !(l.w > 0) || !(l.h > 0))) throw new Error('logos-franja: un logo va sin src o sin medidas; sin ellas no se puede calcular la vuelta');
  const { porMitad, dur } = medidaDeFranja(logos);
  const lis = logos.map((l) => `<li style="width:${anchoDe(l)}px"><img src="${esc(l.src)}" alt="" width="${l.w}" height="${l.h}" loading="lazy" decoding="async"></li>`).join('');
  const lista = (copia) => `<ul class="mm-logos-lista"${copia ? ' aria-hidden="true"' : ' role="list"'}>${lis}</ul>`;
  return `<div class="mm-logos" style="--mm-logos-dur:${dur.toFixed(2)}s">`
    + `<h2 class="mm-etiqueta" id="mm-logos-t">${esc(titulo)}</h2>`
    + `<div class="mm-logos-vista" tabindex="0" role="group" aria-labelledby="mm-logos-t">`
    + `<div class="mm-logos-marco"><div class="mm-logos-pista">${lista(false)}${lista(true).repeat(2 * porMitad - 1)}</div></div></div></div>`;
}
