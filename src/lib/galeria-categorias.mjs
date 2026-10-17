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
 * Las seis teselas de las 53 `/services/pool-builders/*` y las 2 `/where-we-serve/*-florida`
 * (antes «Pool Features & Upgrades»). Cada tesela es una categoria con `panel` en
 * `galeria-categorias.json`, y las tres paginas la sacan de aqui.
 *
 * GALERIA-REJILLA (5-oct-2026, encargo de Sebastian): deja de ser acordeon. Rejilla 3x2 a sangre,
 * las seis abiertas, foto apaisada al natural con un degradado solo abajo. Lo que eso cambio
 * en el MARCADO, y por que:
 *   · fuera el `<button aria-expanded>` del `<h3>`: el nombre va en texto plano. `innerText` no
 *     se mueve (el boton era inline y su texto era el mismo).
 *   · la tesela entera es el enlace por el `::after` del «See photos» (el mismo patron que las
 *     tarjetas de /gallery, `components/galeria-categorias.css`): UNA parada de tabulador, y la
 *     foto con `alt=""` porque el nombre ya esta en el titular de al lado.
 *   · clases `mm-gal-*` nuevas: las de Webflow (`.feature-card`, `.feature-text`...) traen de
 *     `webflow.css` un `opacity:0`, `min-height:550px` y `width:16%` que no hay que pelear.
 *   · se QUEDAN la `<section class="animated-divs-section">` (marcador de `conBandaGaleria`,
 *     `[slug].astro` y `check-estructura-ciudades`) y los DOS `data-w-id`, que son claves de
 *     `src/data/reveals.json`: quitarlos subiria las huerfanas de `check-ix2` de 14 a 16.
 *   · fuera el icono de servicio: con la foto mandando, era ruido encima de la foto.
 *
 * El titular es FIJO aqui y no de Sanity. Sin ciudad en el parrafo: el banco no sabe en que
 * ciudad se hizo cada obra, asi que «built in Ocala» seria afirmar algo que no podemos respaldar. */
export const TITULO_BANDA = 'Project Gallery';
export const TEXTO_BANDA = 'See pools, pergolas and outdoor kitchens we have built for Florida homeowners.';
export const PANELES = CATEGORIAS.filter((c) => c.panel);
const INICIO_BANDA = '<section class="animated-divs-section">';

/* LAS FOTOS: un 4:3 de la foto del banco (`panel.bancoId`), recortado por
 * `scripts/build-paneles-galeria.mjs` con estas MISMAS cuentas, que por eso viven aqui y no alli:
 * el `srcset` y los ficheros no pueden discrepar. Variantes a 480/800/1200/1600 hasta el ancho del
 * recorte; si el recorte se pasa en mas de 100 px de la ultima, el recorte entero es una mas. */
const BANCO = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/data/banco-imagenes.json'), 'utf8'));
const FICHA = new Map(BANCO.map((e) => [e.id, e]));
export const ANCHOS_TESELA = [480, 800, 1200, 1600];
export function recorteTesela(c) {
  const e = FICHA.get(c.panel.bancoId);
  if (!e) throw new Error(`galeria-categorias: el panel ${c.slug} apunta a ${c.panel.bancoId}, que no esta en el banco`);
  const ancho = Math.min(e.ancho, Math.floor(e.alto * 4 / 3));
  const alto = Math.round(ancho * 3 / 4);
  const anchos = ANCHOS_TESELA.filter((w) => w <= ancho);
  if (ancho - anchos[anchos.length - 1] > 100) anchos.push(ancho);
  return { ficha: e, ancho, alto, anchos };
}
export const fotoTesela = (c, w) => `/images/obra/teselas/gallery-tile-${c.slug}-${w}.webp`;

/* GALERIA-HUB · ajustes 2: el enlace DICE «See photos» y el resto va en un `.mm-sr` (base.css). El
 * enlace sigue siendo descriptivo para el crawler y el lector de pantalla («See photos of pool
 * remodeling»); a la vista, el nombre ya esta en el titular de encima. */
const VISIBLE_PANEL = 'See photos';
const sufijoPanel = (c) => `of ${c.nombre.toLowerCase()}`;

/* La flecha del enlace: SVG en linea con `aria-hidden`, sin texto, asi que no entra en `innerText`.
 * Va con `currentColor` y la mueve el hover de la tesela (`caracteristicas.css`). */
const FLECHA = '<svg class="mm-gal-flecha" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16">'
  + '<path d="M1 8h12M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* `sizes`: una columna por debajo de 768, dos hasta 991 y tres desde 992, todas a sangre.
 * `object-position` solo actua en movil (3:2 sobre un fichero 4:3); desde 768 la tesela es 4:3
 * y la foto entra entera.
 *
 * La linea y el enlace van en el MISMO `<p>` y los dos en linea: el enlace baja a su renglon por
 * ancho (`inline-flex` al 100 %), no por `display:block`, que partiria «<linea> See photos» en dos
 * lineas de `innerText` y `check:texto` caeria. */
export function bandaGaleriaHtml() {
  const teselas = PANELES.map((c) => {
    const { ancho, alto, anchos } = recorteTesela(c);
    const ref = anchos.includes(800) ? 800 : anchos[anchos.length - 1];
    return '<div class="mm-gal-tesela">'
      + `<img class="mm-gal-foto" src="${fotoTesela(c, ref)}" alt="" width="${ancho}" height="${alto}" loading="lazy" decoding="async"`
      + ` sizes="(min-width: 992px) 34vw, (min-width: 768px) 50vw, 100vw"`
      + ` srcset="${anchos.map((w) => `${fotoTesela(c, w)} ${w}w`).join(', ')}"`
      + ` style="object-position:${c.panel.x}% ${c.panel.y}%">`
      + '<div class="mm-gal-pie">'
      + `<h3 class="mm-gal-nombre">${esc(c.nombre)}</h3>`
      + `<p class="mm-gal-texto"><span class="mm-gal-linea">${esc(c.linea)}</span> `
      + `<a class="mm-gal-enlace" href="${rutaDe(c)}">${VISIBLE_PANEL}`
      + `<span class="mm-sr"> ${esc(sufijoPanel(c))}</span>${FLECHA}</a></p>`
      + '</div></div>';
  }).join('');
  return INICIO_BANDA
    + '<div data-w-id="330b3a3f-e72c-3f91-1f24-8dfe4f37952f" class="mm-gal-cabecera">'
    + `<h2 class="white">${esc(TITULO_BANDA)}</h2><p>${esc(TEXTO_BANDA)}</p></div>`
    + `<div data-w-id="330b3a3f-e72c-3f91-1f24-8dfe4f379534" class="mm-gal-rejilla">${teselas}</div>`
    + '</section>';
}

/**
 * Cambia la banda vieja de una cadena derivada (`B[0]` de `[slug].astro`) por la nueva. Mismo
 * contrato que `partirEn`: si el marcador no esta UNA vez, el build cae con la ruta puesta en vez
 * de servir media seccion o dos bandas.
 */
/**
 * ASTRO-2 · la banda en su forma COMPACTA (lamina «Ciudad», D-79 y D-100): cabecera de seccion
 * con la accion de la pagina dentro, y las seis teselas en una fila, foto arriba y texto debajo.
 * Las MISMAS seis teselas, los mismos seis enlaces y el mismo texto que `bandaGaleriaHtml()`: el
 * enlace sigue dentro del parrafo, asi que `innerText` da las mismas lineas (§ lineasBanda). Lo
 * unico nuevo es la accion de la cabecera.
 */
const FLECHA_SISTEMA = '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>';
export function bandaCompactaHtml(accion, ancla = '#estimate') {
  const teselas = PANELES.map((c) => {
    const { ancho, alto, anchos } = recorteTesela(c);
    const ref = anchos.includes(480) ? 480 : anchos[0];
    return '<li class="mm-cat-tesela">'
      + `<span class="mm-cat-foto"><img src="${fotoTesela(c, ref)}" alt="" width="${ancho}" height="${alto}" loading="lazy" decoding="async"`
      + ` sizes="(min-width: 992px) 17vw, (min-width: 768px) 33vw, 50vw"`
      + ` srcset="${anchos.map((w) => `${fotoTesela(c, w)} ${w}w`).join(', ')}"`
      + ` style="object-position:${c.panel.x}% ${c.panel.y}%"></span>`
      + `<h3 class="mm-cat-t">${esc(c.nombre)}</h3>`
      + `<p class="mm-cat-p"><span>${esc(c.linea)}</span> `
      + `<a class="mm-cat-ver" href="${rutaDe(c)}">${VISIBLE_PANEL}`
      + `<span class="mm-sr"> ${esc(sufijoPanel(c))}</span>${FLECHA_SISTEMA}</a></p>`
      + '</li>';
  }).join('');
  const [antes, ultima] = [TITULO_BANDA.split(' ').slice(0, -1).join(' '), TITULO_BANDA.split(' ').slice(-1)[0]];
  return '<section class="mm-cat">'
    + `<div class="mm-sec-cab"><h2 class="mm-h2">${esc(antes)} <span class="mm-rot">${esc(ultima)}</span></h2>`
    + `<div class="mm-sec-lado"><p class="mm-p">${esc(TEXTO_BANDA)}</p>`
    + `<div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${ancla}">${esc(accion)}</a></div></div></div>`
    + `<ul class="mm-cat-fila" role="list">${teselas}</ul>`
    + '</section>';
}

/**
 * ASTRO-4 lote B (lamina «Galeria», D-100) · LAS DIEZ CATEGORIAS DEL INDICE DE GALERIA. Seis
 * teselas con foto (las de la banda compacta), la tesela de accion y las otras cuatro en lista.
 * Las mismas lineas y el mismo orden que `tarjetasHtml()` (§ lineasTarjetas); lo nuevo es la tesela
 * de accion, que entra detras de la sexta.
 */
export function indiceGaleriaHtml(telefonosHtml) {
  const tesela = (c) => {
    const { ancho, alto, anchos } = recorteTesela(c);
    const ref = anchos.includes(800) ? 800 : anchos[0];
    return '<li class="mm-cat-tesela">'
      + `<span class="mm-cat-foto"><img src="${fotoTesela(c, ref)}" alt="" width="${ancho}" height="${alto}" loading="lazy" decoding="async"`
      + ' sizes="(min-width: 992px) 25vw, 50vw"'
      + ` srcset="${anchos.map((w) => `${fotoTesela(c, w)} ${w}w`).join(', ')}"></span>`
      + `<h3 class="mm-cat-t">${esc(c.nombre)}</h3><p class="mm-cat-p">${esc(c.linea)}</p>`
      + `<a class="mm-cat-ver" href="${rutaDe(c)}">${esc(enlaceDe(c))}${FLECHA_SISTEMA}</a></li>`;
  };
  const linea = (c) => `<li><a class="mm-linea mm-linea--doble" href="${rutaDe(c)}"><span class="mm-linea-txt">`
    + `<span class="mm-linea-t" role="heading" aria-level="3">${esc(c.nombre)}</span><span class="mm-linea-p">${esc(c.linea)}</span></span>`
    + `<span class="mm-art-ver">${esc(enlaceDe(c))}${FLECHA_SISTEMA}</span></a></li>`;
  return '<nav class="mm-cat mm-cat--indice" aria-labelledby="gal-cats-tit">'
    + `<div class="mm-sec-cab"><h2 class="mm-h2 mm-min" id="gal-cats-tit">${esc(TITULO_TARJETAS).replace(/(service)$/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<ul class="mm-cat-fila" role="list">${PANELES.map(tesela).join('')}`
    + '<li class="mm-muro-accion"><p class="mm-muro-t">Seen something you like?</p>'
    + `<a class="mm-btn mm-btn--linea mm-min" href="/request-estimated">Get a free estimate</a>${telefonosHtml}</li></ul>`
    + `<ul class="mm-arts-indice mm-cat-resto" role="list">${CATEGORIAS.filter((c) => !c.panel).map(linea).join('')}</ul>`
    + '</nav>';
}

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
  ...PANELES.flatMap((c) => [c.nombre, `${c.linea} ${VISIBLE_PANEL}`]),
];

/** GALERIA-FICHAS (17-oct-2026): las lineas que la banda COMPACTA pone en el `innerText` de una ficha, en
 *  orden: titular, entradilla, la accion de la cabecera y, por panel, nombre, linea con «See photos» y su
 *  sufijo `.mm-sr`. `check-texto.mjs` la quita SEGUIDA de las 14 fichas, que en el baseline no la tienen. */
export const lineasBandaCompacta = (accion) => [
  TITULO_BANDA, TEXTO_BANDA, accion,
  ...PANELES.flatMap((c) => [c.nombre, `${c.linea} ${VISIBLE_PANEL}`, sufijoPanel(c)]),
];

/** El sufijo `.mm-sr` del enlace sale en `innerText` como linea PROPIA, justo detras de la del parrafo.
 *  `check-texto.mjs` la declara con `LINEAS_ANADIDAS`, derivada de aqui. */
export const lineasSrBanda = () => PANELES.map((c) => ({ tras: `${c.linea} ${VISIBLE_PANEL}`, linea: sufijoPanel(c) }));
