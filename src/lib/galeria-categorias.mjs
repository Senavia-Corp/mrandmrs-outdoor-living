/**
 * LAS CATEGORIAS DE LA GALERIA, y el marcado de sus tarjetas, en un solo sitio.
 *
 * Lo cargan DOS mundos que no comparten nada mas: `scripts/build-paginas.mjs`, que inyecta las
 * tarjetas en `/gallery` (pagina DERIVADA, se escribe como cadena), y
 * `src/pages/gallery/[categoria].astro`, que las pinta al pie de cada categoria. Por eso el
 * marcado es una funcion que devuelve HTML y no un componente Astro: un componente no se puede
 * llamar desde el generador, y dos copias del mismo marcado dejan de ser iguales al primer
 * arreglo.
 *
 * `readFileSync` y no `import ... with { type: 'json' }`, por lo mismo que
 * `scripts/lib/rutas-propias.mjs`: lo cargan puertas, y un fallo de sintaxis de import
 * assertions las tiraria todas a la vez.
 */
import fs from 'node:fs';
import path from 'node:path';

// `process.cwd()` y no `import.meta.url`: dentro del build de Astro este modulo viaja en un
// chunk y su URL ya no cuelga de `src/lib`. Generador, puertas y build corren desde la raiz.
const FICHERO = path.resolve(process.cwd(), 'src/data/galeria-categorias.json');

export const CATEGORIAS = JSON.parse(fs.readFileSync(FICHERO, 'utf8')).categorias;

export const rutaDe = (c) => `/gallery/${c.slug}`;

/** La miniatura de la tarjeta: la escribe `scripts/build-galeria-portadas.mjs`. */
export const portadaDe = (c) => `/images/galeria-categorias/${c.slug}.webp`;

/** El texto del enlace de cada tarjeta. Lo lee tambien `check-texto.mjs`: una sola formula. */
export const enlaceDe = (c) => `See ${c.nombre.toLowerCase()}`;

export const TITULO_TARJETAS = 'Browse by service';
export const TITULO_OTRAS = 'More project galleries';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Las tarjetas. `sin` quita una categoria (la pagina en la que ya se esta).
 * La tarjeta entera es el enlace: el `::after` del «See …» la cubre (galeria.css §8), asi que
 * hay UNA parada de tabulador por tarjeta y la foto lleva `alt=""` — el nombre ya esta en el
 * titular de al lado, y repetirlo seria leerlo dos veces.
 */
export function tarjetasHtml({ titulo = TITULO_TARJETAS, sin = null, perezosa = false } = {}) {
  const items = CATEGORIAS.filter((c) => c.slug !== sin).map((c) => (
    '<li class="gal-cat">'
    + `<img class="gal-cat__foto" src="${portadaDe(c)}" alt="" width="640" height="427"`
    + ` loading="${perezosa ? 'lazy' : 'eager'}" decoding="async">`
    + `<h3 class="gal-cat__nombre">${esc(c.nombre)}</h3>`
    + `<p class="gal-cat__linea">${esc(c.linea)}</p>`
    + `<a class="gal-cat__mas" href="${rutaDe(c)}">${esc(enlaceDe(c))}</a>`
    + '</li>'
  )).join('');
  return '<nav class="gal-cats" aria-labelledby="gal-cats-tit">'
    + `<h2 class="gal-cats__tit" id="gal-cats-tit">${esc(titulo)}</h2>`
    + `<ul class="gal-cats__lista">${items}</ul>`
    + '</nav>';
}

/** Las lineas que las tarjetas anaden al `innerText`, en orden. Para `check-texto.mjs`. */
export const lineasTarjetas = () => [
  TITULO_TARJETAS,
  ...CATEGORIAS.flatMap((c) => [c.nombre, c.linea, enlaceDe(c)]),
];

/* ── LA BANDA «Project Gallery» ──────────────────────────────────────────────────────────────
 * Los seis paneles verticales de las 53 `/services/pool-builders/*` y las 2 `/where-we-serve/*-florida`
 * (antes «Pool Features & Upgrades»). Eran TRES copias a mano del mismo marcado; ahora las tres
 * salen de aqui, y cada panel es una categoria con `panel` en `galeria-categorias.json`.
 *
 * Mismas clases y mismos `data-w-id` que el marcado de Webflow: el acordeon
 * (`Interacciones.astro` §6), `caracteristicas.css` e IX2 cuelgan de ellos. El enlace va DENTRO
 * del parrafo y no sustituye al boton: el acordeon sigue siendo acordeon.
 *
 * El titular es FIJO aqui y no de Sanity: dejaron de leerse `headingFeature` y
 * `paragraphFeatures`. Sin ciudad en el parrafo: el banco no sabe en que ciudad se hizo cada
 * obra, asi que «built in Ocala» seria afirmar algo que no podemos respaldar. */
export const TITULO_BANDA = 'Project Gallery';
export const TEXTO_BANDA = 'See pools, pergolas and outdoor kitchens we have built for Florida homeowners.';
export const PANELES = CATEGORIAS.filter((c) => c.panel);
const INICIO_BANDA = '<section class="animated-divs-section">';

const fotoPanel = (c, suf = '') => `/images/obra/paneles/gallery-panel-${c.slug}${suf}.webp`;
const enlacePanel = (c) => `${enlaceDe(c)} photos`;

export function bandaGaleriaHtml() {
  const tarjetas = PANELES.map((c, i) => (
    `<div${i ? '' : ' id="w-node-_330b3a3f-e72c-3f91-1f24-8dfe4f379535-4f37952d"'} class="feature-card">`
    + `<img src="${fotoPanel(c)}" loading="lazy" alt="" width="941" height="1672"`
    + ' sizes="(min-width: 992px) 250px, (min-width: 768px) 50vw, 100vw"'
    + ` srcset="${fotoPanel(c, '-p-500')} 500w, ${fotoPanel(c, '-p-800')} 800w, ${fotoPanel(c)} 941w"`
    + ` style="object-position:${c.panel.x}% 50%" class="feature-image">`
    + '<div class="block-feature"><h3 class="title-feature">'
    + `<button type="button" class="feature-boton" aria-expanded="false" aria-controls="mm-carac-${i + 1}">`
    + `${esc(c.nombre)}</button></h3>`
    + `<p class="feature-text" id="mm-carac-${i + 1}">${esc(c.linea)} `
    + `<a href="${rutaDe(c)}">${esc(enlacePanel(c))}</a></p></div></div>`
  )).join('');
  return INICIO_BANDA
    + '<div data-w-id="330b3a3f-e72c-3f91-1f24-8dfe4f37952f" class="header-feature">'
    + `<h2 class="white">${esc(TITULO_BANDA)}</h2><p>${esc(TEXTO_BANDA)}</p></div>`
    + `<div data-w-id="330b3a3f-e72c-3f91-1f24-8dfe4f379534" class="wrapper-feature">${tarjetas}</div>`
    + '</section>';
}

/**
 * Cambia la banda vieja de una cadena derivada (`B[0]` de `[slug].astro`) por la nueva. Mismo
 * contrato que `partirEn`: si el marcador no esta UNA vez, el build cae con la ruta puesta en vez
 * de servir media seccion o dos bandas.
 */
export function conBandaGaleria(cadena, donde) {
  const i = cadena.indexOf(INICIO_BANDA);
  if (i < 0 || cadena.indexOf(INICIO_BANDA, i + 1) >= 0) {
    throw new Error(`${donde}: «${INICIO_BANDA}» tiene que salir exactamente una vez`);
  }
  const fin = cadena.indexOf('</section>', i) + '</section>'.length;
  if (cadena.slice(i + 1, fin).includes('<section')) throw new Error(`${donde}: la banda trae una <section> anidada`);
  return cadena.slice(0, i) + bandaGaleriaHtml() + cadena.slice(fin);
}

/** Las lineas que la banda pone en el `innerText`, en orden. Para `check-texto.mjs`. */
export const lineasBanda = () => [
  TITULO_BANDA, TEXTO_BANDA,
  ...PANELES.flatMap((c) => [c.nombre, `${c.linea} ${enlacePanel(c)}`]),
];
