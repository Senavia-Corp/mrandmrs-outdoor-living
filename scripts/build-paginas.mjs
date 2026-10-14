#!/usr/bin/env node
/**
 * FASE 5 — genera las páginas ESTÁTICAS desde el HTML servido del sitio vivo.
 *
 *     npm run paginas
 *
 * De dónde sale el marcado: `_source/vivo/*.html`, el HTML SERVIDO. No de `baseline/html/`,
 * que es el DOM después de ejecutar JS y trae estado que no es del documento.
 *
 * Qué cambia respecto al origen, y nada más:
 *   1. Las URLs del CDN de Webflow pasan a rutas locales (src, srcset, style, data-video-urls,
 *      poster). **Si alguna no se puede mapear, esto ABORTA**: el requisito del cliente es
 *      cero referencias a website-files.com, y un 404 en un `url()` no da error en consola.
 *   2. Los `<div class="elfsight-app-...">` con su `<script>` se sustituyen por los
 *      componentes nativos (decisión D2). El click-to-call vive en el layout: aquí se quita.
 *   3. Los `<script>` de Webflow y de los terceros que se retiran (jQuery, webflow.js, el
 *      config de Finsweet, showdown y el render de tablas markdown) se quitan.
 *
 * Lo que NO se toca: los `data-w-id` (los necesita la Fase 7), las clases de Webflow, el
 * orden de las secciones y los `<script>` en línea que son código de la propia página.
 *
 * SOBRE showdown Y EL RENDER DE TABLAS MARKDOWN: se quitan porque **no hacen nada**. El
 * script busca bloques `[markdown]...[/markdown]` dentro de `.w-richtext`, y no hay ni uno
 * en las 115 páginas. Medido, no supuesto.
 */
import TEXTOS_PROPIOS_RAW from '../src/data/textos-propios.json' with { type: 'json' };
import { franjaLogos } from '../src/lib/logos-franja.mjs';
const TEXTOS_PROPIOS = TEXTOS_PROPIOS_RAW;
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { renombra, origen, esFicha, esCondado } from './lib/renombradas.mjs';
import { CATEGORIAS as GALERIA_CATEGORIAS, indiceGaleriaHtml } from '../src/lib/galeria-categorias.mjs';
import { logoLigero, ALTO_LOGO } from '../src/lib/logo-ligero.mjs';
import { OCULTAS, serviciosDe } from '../src/lib/filtro-proyectos.mjs';
import { tramosMiga } from '../src/lib/miga-tramos.mjs';
import { fotoDeHeroe, fotosDeSeccion as fotosDeSeccionCiudad } from '../src/lib/heroe-ciudad.mjs';
import { zonasDeCondado } from '../src/lib/condados.mjs';
import { heroProyectoHtml, detalleProyectoHtml, cierreProyectoHtml, conAlt } from '../src/lib/ficha-proyecto.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;
/* El manifiesto ya trae `dim:{w,h}` de 1877 de los 2000 assets. Indexado por ruta publica,
 * sirve para reservar el hueco de una imagen que no declara tamano (§ limpia()). */
const DIM = new Map(Object.values(man).filter((a) => a.dim?.w).map((a) => [a.publico, a.dim]));
/* El MISMO mapa, pero indexado por la URL DEL CDN. Hace falta porque `captacion()` (R17-CORE)
 * corre ANTES que `localizar()`: cuando toca esas imagenes todavia apuntan a
 * `cdn.prod.website-files.com`, asi que buscarlas por ruta publica no encuentra ninguna. Salio
 * en rojo midiendo: 35 imagenes de la ruta se quedaron sin `width`/`height` en silencio. */
const DIM_CDN = new Map(Object.entries(man).filter(([, a]) => a.dim?.w).map(([u, a]) => [u, a.dim]));

/**
 * R17-CORE — LA CAPA DE CAPTACION DE LAS FICHAS DE `/services/`.
 *
 * `src/data/captacion-servicios.json` tiene UNA clave por ruta y hoy solo una entrada: la Final
 * URL del ad group «Pool Builders Core». La lista se deriva del propio JSON —no se escribe dos
 * veces— asi que **extender esto a otra ficha es anadir una entrada alli y nada mas**. Las 14
 * son la misma plantilla, verificado elemento a elemento.
 *
 * TODO lo que hace `captacion()` esta dentro de `if (!c) return;`. Esa guarda es lo que
 * garantiza que las otras 121 paginas salgan BYTE A BYTE iguales, y se comprueba con un diff de
 * sha1 del build entero, no de palabra.
 */
const CAPTACION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'));
/**
 * 🚨 ESTE GENERADOR SOLO HACE `/services/`, Y DESDE R20-CIUDADES EL JSON YA NO ES SOLO SUYO.
 *
 * `captacion-servicios.json` tenia 1 clave en R17-CORE y 14 desde R19, todas de `/services/`, asi
 * que contar SUS CLAVES y contar «las fichas que paso por aqui» era lo mismo. R20-CIUDADES anadio
 * `/services/pool-builders/ocala-fl` y `/services/pool-builders/gainesville-fl`, que las pinta
 * `src/pages/services/pool-builders/[slug].astro` en tiempo de build y NO pasan por este generador.
 *
 * Con el conteo viejo las dos comprobaciones del final se creian 16 contra 14 y `npm run paginas`
 * SALIA CON 1 —«la gallery se movio en 14 fichas y hay 16»— sin que nada estuviera roto. Una
 * puerta que da rojo por un cambio legitimo en otra familia de rutas se acaba desactivando, que es
 * peor que no tenerla.
 */
const RUTAS_CAPTACION_SERVICIOS = Object.keys(CAPTACION).filter(esFicha);
const TELEFONOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/telefonos.json'), 'utf8')).items;

/* ── REDISEÑO STITCH · ASTRO-2 · piezas del Hero A ────────────────────────────────────────────
 * EL PIE DE FOTO (D-109). Solo cuando la foto del hero está en el banco: el pie es su `alt` del
 * banco, TAL CUAL. No se redacta ninguna cadena a mano. Si la foto no está en el banco
 * (`heroe._banco` ausente) no hay tarjeta: variante sin pie. */
const BANCO_ALT = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'))
  .filter((e) => e.procedencia === 'obra_real').map((e) => [e.id, e.alt]));
function pieDeFoto(heroe) {
  const alt = heroe._banco && BANCO_ALT.get(heroe._banco);
  if (!alt) return '';
  return `<figcaption class="mm-pie-foto"><span class="mm-dato-rot">Project</span><span>${alt.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></figcaption>`;
}
/* LA FRANJA DE LOGOS, estática y dentro del hero. Los mismos logos y el mismo titular que la
 * marquesina `section.logos-section` del origen, una vez cada uno y en su orden. */
const nbIntro = (html) => String(html).replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>');
/** La flecha de los enlaces de linea del sistema (`.mm-flecha`). Decorativa. */
const FLECHA = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>';

function franjaDeLogos(doc) {
  const sec = doc.querySelector('section.logos-section');
  if (!sec) return '';
  // En las fichas el titular de la marquesina es un `<h2>`; en los condados, un `<h4 class="heading-logos">`.
  const titulo = sec.querySelector('h2, .heading-logos')?.textContent.trim() ?? '';
  if (!titulo) throw new Error('franjaDeLogos: la marquesina de logos no trae titular');
  const vistos = new Set();
  const logos = [...sec.querySelectorAll('img')].filter((i) => { const u = i.getAttribute('src'); if (vistos.has(u)) return false; vistos.add(u); return true; })
    .map((i) => {
      // Las medidas salen del manifiesto: estas `<img>` no las traen del origen, y `getAttribute`
      // devolvia `null`, que acababa escrito tal cual en el HTML (`width="null"`).
      const src = i.getAttribute('src');
      const d = DIM.get(src) ?? DIM_CDN.get(src);
      if (!d) throw new Error(`franjaDeLogos: ${src} no tiene medidas en el manifiesto`);
      // D-132: a 36 px de alto se sirve la version ligera del logo si la hay (`logo-ligero.mjs`).
      // Aqui `src` aun puede ser la URL del CDN de Webflow: la ligera se busca por su ruta local.
      const l = logoLigero(man[src]?.publico ?? src, d);
      if (l.h !== ALTO_LOGO) l.src = src;
      return { src: l.src, w: l.w, h: l.h };
    });
  // E7 (D-166): la franja desfila. El marcado y la duracion de la vuelta salen de `logos-franja.mjs`.
  return franjaLogos(titulo, logos);
}
/* Las clases de `<img>` a las que se les reserva el hueco (§ limpia()). Enumeradas y medidas:
 * cada una entro aqui con una cifra de `layout-shift` detras, no por precaucion.
 *   · `cover-brochure-page` (/brochures, 57 portadas `lazy`): miden 0 px hasta cargar y la
 *     lista va en `columns`, que re-equilibra en cada llegada. Con las portadas retenidas y
 *     luego soltadas, cambian de columna 38 de 57 tarjetas a 1440 y 30 a 991 y 768; con
 *     el hueco reservado, 0. Casi todo pasa bajo el pliegue, por eso el CLS no lo ve. */
const RESERVAN_HUECO = ['fs-marquee-logoscms_logo', 'image-whereweserve', 'cover-brochure-page'];

/** Widgets de Elfsight -> componentes nativos. El click-to-call ya vive en el layout. */
const WIDGETS = {
  'ce5a93b9-7d28-40c9-8767-e211c9d09497': 'ResenasGoogle',
  'fdd09947-7c83-4b04-9694-2331de1a89a2': 'FeedInstagram',
  'e4536a7a-7d1e-4555-8d8c-e81075d084b0': '',   // click-to-call: está en Base.astro
  // El CUARTO widget, que PROMPT.md no conocía. Es el único de los 4 que SÍ pinta.
  '2dd65b70-1baf-4e76-86a4-a77acd88989d': 'GaleriaYouTube',
};

/** Scripts de terceros que se van, con el motivo. */
const SCRIPTS_FUERA = [
  [/jquery-3\.5\.1/, 'jQuery: solo lo pedia webflow.js'],
  [/\/js\/webflow\./, 'webflow.js: IX2 se reimplementa en la Fase 7'],
  [/finsweetcomponentsconfig/, 'config de Finsweet: filtrado, marquee y slider se rehacen en local'],
  [/showdown/, 'showdown: solo lo usa el render de tablas markdown, que no tiene nada que renderizar'],
  [/seo_ai_markdown_table_render/, 'busca bloques markdown y no hay ninguno en las 115 paginas'],
  [/elfsightcdn\.com/, 'Elfsight: los 3 widgets se rehacen nativos (D2)'],
  [/@finsweet\/attributes/, 'Finsweet: se reimplementa en local'],
  [/flowbase-co\/boosters-before-after-slider/, 'el antes/despues se reimplementa en local'],
];

const MARCA = '@@WIDGET@@';
// Dentro de una cadena JSON o de un <script> el delimitador es la comilla, NO el parentesis:
// parar en `)` truncaba 3 og:image en `...florida%2520(1` y las dejaba sin mapear. Es el mismo
// bug que ya aparecio en el inventario. Se admite `)` y despues se recorta el que sobra.
const reUrlGlobal = /https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g;
const equilibra = (u) => { while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1); return u; };

const sinMapear = new Set();

/**
 * SERVICIOS POR CATEGORIA — los datos de `section.products-section`, ruta a ruta.
 *
 * La seccion vive en 3 paginas (`/` y las 2 de `/where-we-serves/`) y en las tres es la MISMA
 * pieza con DISTINTOS datos: cambia el orden de las 3 pestanas, el orden de los 14 servicios y
 * la categoria por defecto. Por eso esto se extrae por ruta y no se cablea en el componente.
 */
const SERVICIOS = {};
function local(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  if (!/(website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb\.cloudfront\.net)/.test(url)) return url;
  const a = man[url] ?? man[url.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/')];
  if (!a) { sinMapear.add(url); return url; }
  return a.publico;
}

const aSlug = (r) => (r === '/' ? 'index' : r.replace(/^\//, '').replace(/\//g, '_'));

/** Reescribe TODO lo que puede llevar una URL del CDN. */
function localizar(raiz) {
  for (const el of raiz.querySelectorAll('[src]')) el.setAttribute('src', local(el.getAttribute('src')));
  // Tambien los href: los botones de descarga de los 54 PDF apuntaban al CDN. No son
  // imagenes, asi que no salian en ningun escaneo de src/srcset, y el sitio habria seguido
  // sirviendo sus folletos desde Webflow.
  for (const el of raiz.querySelectorAll('a[href]')) el.setAttribute('href', local(el.getAttribute('href')));
  for (const el of raiz.querySelectorAll('[poster]')) el.setAttribute('poster', local(el.getAttribute('poster')));
  for (const el of raiz.querySelectorAll('[data-poster-url]')) el.setAttribute('data-poster-url', local(el.getAttribute('data-poster-url')));
  for (const el of raiz.querySelectorAll('[srcset]')) {
    el.setAttribute('srcset', el.getAttribute('srcset').split(',')
      .map((p) => { const [u, d] = p.trim().split(/\s+/); return [local(u), d].filter(Boolean).join(' '); })
      .join(', '));
  }
  // Los videos de fondo llevan mp4 y webm separados por coma en un solo atributo.
  for (const el of raiz.querySelectorAll('[data-video-urls]')) {
    el.setAttribute('data-video-urls',
      el.getAttribute('data-video-urls').split(',').map((u) => local(u.trim())).join(','));
  }
  // Y dentro de los <script>: el JSON-LD de /gallery lleva 137 URLs de imagen del CDN, y el
  // codigo en linea de otras paginas alguna mas. No son atributos, asi que ningun escaneo de
  // src/srcset/href las veia, y el sitio habria seguido pidiendoselas a Webflow.
  const reUrl = reUrlGlobal;
  for (const el of raiz.querySelectorAll('script')) {
    if (el.getAttribute('src')) continue;
    const t = el.textContent;
    // Webflow guarda la plantilla de lista vacia (`text/x-wf-template`) URL-CODIFICADA, asi
    // que la URL de dentro no casa ningun patron literal. Hay que decodificar, reescribir y
    // volver a codificar, o esas 20 referencias se publican apuntando al CDN.
    if (el.getAttribute('type') === 'text/x-wf-template') {
      let dec;
      try { dec = decodeURIComponent(t); } catch { continue; }
      if (!reUrl.test(dec)) continue;
      reUrl.lastIndex = 0;
      el.textContent = encodeURIComponent(dec.replace(reUrl, (u) => local(equilibra(u))));
      continue;
    }
    if (!/website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb/.test(t)) continue;
    el.textContent = t.replace(reUrl, (u) => local(equilibra(u)));
  }
  for (const el of raiz.querySelectorAll('[style]')) {
    const s = el.getAttribute('style');
    if (!/website-files|cloudfront/.test(s)) continue;
    el.setAttribute('style', s.replace(
      /url\(\s*(?:&quot;|["'])?(https:\/\/[^"')]+?)(?:&quot;|["'])?\s*\)/g, (_, u) => `url(${local(u)})`));
  }
}

/**
 * ENCABEZADO DEL CARRUSEL DE BLOG, POR RUTA — R11-BLOG-02.
 *
 * `CarruselBlog.astro` ya no solo se inserta (R9-BLOG-01, `/services/`): tambien SUSTITUYE el
 * `section.blog-section-page` que Condado ya traia en su origen, y se inserta de nuevo, esta
 * vez en Estado. El generador solo puede dejar un marcador `<CarruselBlog />` SIN props -el
 * mismo mecanismo que ya usa `ServiciosPorCategoria`-, asi que el encabezado propio de cada
 * ruta (Estado a mano aqui abajo, Condado extraido de su `.header-blog` antes de descartarlo)
 * se escribe a `src/data/blog-heading-por-ruta.json` y el componente se autolocaliza por
 * `Astro.url.pathname`, exactamente como ya hace `ServiciosPorCategoria` con
 * `servicios-categoria.json`.
 *
 * ESTADO NO TIENE ENCABEZADO EN EL ORIGEN -la seccion no existe en `_source/vivo/where-we-serves_*.html`,
 * es contenido nuevo- asi que el texto va a mano, calcado del patron ya usado en Condado
 * (p.ej. Marion: "Outdoor Living Insights for Marion County" / "...tailored to North Florida
 * homes."). Si Sebastian pide otro texto, es el UNICO contenido no derivado de todo el cambio.
 */
/**
 * LO MISMO PARA EL CARRUSEL «Project Showcase» (R16-PROY), y por el mismo motivo.
 *
 * Esta seccion SI venia en el origen de las 10 rutas derivadas, pero venia SIETE VECES: el
 * mismo bloque de 10 slides pegado en `index.astro`, `industry-solutions`, las 2 de Estado,
 * las 9 de Condado y `plantilla-pool-builders.json`. Medido antes de tocarlo, el tramo era
 * byte a byte identico en los siete (6103 bytes, sha1 76930c21c9bf): no eran siete variantes,
 * eran siete copias. Por eso las 5 obras propias de R14 solo salian en la home, que fue la
 * unica copia que se actualizo.
 *
 * Ahora se SUSTITUYE por un marcador, igual que el carrusel de blog, y el encabezado propio de
 * cada ruta -lo unico que de verdad cambiaba entre paginas- se extrae de su `.header-projects`
 * antes de descartar el nodo.
 *
 * LAS TRES DE AQUI ABAJO VAN A MANO porque el generador nunca las escribe: `/` y las 2 de
 * Estado estan en `NO_REGENERAR`. Sin seed, `npm run paginas` las borraria del JSON derivado y
 * las tres caerian a `_defecto` en silencio. El texto es el que ya tenian, extraido de su
 * propio marcado, no redactado aqui.
 */
const ENCABEZADOS_PROYECTOS = {
  _lee_esto: 'El encabezado del carrusel «Project Showcase» de cada ruta. Es lo UNICO que cambiaba entre paginas: el bloque de 10 slides y la cola de flechas + barra + CTA eran byte a byte identicos en los 7 sitios donde estaba pegado (6103 y 1581 bytes, sha1 76930c21c9bf y 3c5989650bad). Espejo de blog-heading-por-ruta.json, y lo lee igual: CarruselProyectos.astro se autolocaliza por Astro.url.pathname. DERIVADO: lo escribe scripts/build-paginas.mjs.',
  _ojo: 'El texto va DECODIFICADO (ampersand suelto, no la entidad): lo escapa Astro al pintar, y sale el mismo byte que habia en el blob. Escribir aqui la entidad pintaria una entidad doblemente escapada y romperia check:texto, que compara innerText al 100 % y no se re-baseliniza nunca.',
  _quien_no_esta_aqui: 'Las 53 rutas de /services/pool-builders/ NO estan: su titulo y su entradilla salen de Sanity (campos headingPortfolio y paragraphPortfolio, huecos 25 y 27 de CAMPOS en [slug].astro) y por eso Reddick dice «Reddick portfolio». Esas pasan las dos como props. _defecto solo existe para que una ruta sin entrada y sin props no pinte una cabecera vacia.',
  _defecto: {
    titulo: 'Project showcase',
    entradilla: 'Browse our completed residential & Commercial projects and transformations',
  },
  '/': {
    titulo: 'Project showcase',
    entradilla: 'Browse our completed residential & Commercial projects and transformations',
  },
  '/where-we-serve/north-florida': {
    titulo: 'Project showcase',
    entradilla: 'Explore completed North Florida projects featuring custom pools and refined outdoor living spaces.',
  },
  '/where-we-serve/south-florida': {
    titulo: 'Project showcase',
    entradilla: 'Explore completed South Florida projects featuring custom inground pools and refined outdoor living spaces built through our fully managed design-build process.',
  },
};

const ENCABEZADOS_BLOG = {
  '/where-we-serve/north-florida': {
    titulo: 'Outdoor Living Insights for North Florida',
    entradilla: 'Explore expert tips on pool design, outdoor living trends, and maintenance strategies tailored to North Florida homes.',
  },
  '/where-we-serve/south-florida': {
    titulo: 'Outdoor Living Insights for South Florida',
    entradilla: 'Explore expert tips on pool design, outdoor living trends, and maintenance strategies tailored to South Florida homes.',
  },
};

/**
 * Saca los datos de `section.products-section`. Se llama YA LOCALIZADA, o sea despues de
 * `localizar()`, para que las fotos y los iconos salgan con su ruta de `public/` y no con la
 * del CDN de Webflow.
 *
 * Se guarda `innerHTML` y no `textContent` en los campos de texto: el origen trae `&amp;` en
 * casi todos los titulos y `check:texto` compara el `innerText` renderizado. Reinyectarlo con
 * `set:html` lo devuelve tal cual; con `textContent` saldria un `&amp;` literal en pantalla.
 */
function extraeServicios(sec, ruta) {
  const t = (el) => (el ? el.innerHTML.trim() : null);
  const at = (el, a) => (el ? el.getAttribute(a) : null);

  // La categoria por defecto la decide CADA PAGINA en su propio <script>: `/` arranca en
  // `outdoor-living` y las 2 de where-we-serves en `pool-spa`. Sin esto las tres abririan por
  // la misma pestana y `check:texto` -que compara el orden linea a linea- se pondria rojo.
  const codigo = [...sec.querySelectorAll('script:not([src])')].map((x) => x.textContent).join('\n');
  const defecto = codigo.match(/DEFAULT_CATEGORY_SLUG\s*=\s*'([a-z0-9-]+)'/)?.[1] ?? null;

  const categorias = [...sec.querySelectorAll('.js-category-tab')].map((tab) => ({
    slug: at(tab, 'data-category-slug'),
    nombre: t(tab.querySelector('.js-service-cat-name')),
  }));

  const servicios = [...sec.querySelectorAll('.cms-item-services')].map((it) => {
    const ficha = it.querySelector('.block-services-info');
    return {
      id: at(it, 'data-service-id'),
      nombre: t(it.querySelector('.heading-services')),
      icono: at(it.querySelector('.icon-services'), 'src'),
      // Un servicio puede estar en DOS categorias: `Pool Screen Enclosures` sale en
      // `patio-cover` y en `pool-spa`. Son 14 items con 15 asignaciones.
      categorias: [...it.querySelectorAll('.block-categories .js-service-cat')]
        .map((c) => c.textContent.trim()),
      foto: at(ficha.querySelector('.image-bg-services'), 'src'),
      alt: at(ficha.querySelector('.image-bg-services'), 'alt'),
      titulo: t(ficha.querySelector('h4')),
      texto: t(ficha.querySelector('.paragraph-mini')),
      // Renombrada si toca: el origen enlaza la URL vieja (§ lib/renombradas.mjs).
      enlace: renombra(at(ficha.querySelector('.block-buttom-services a'), 'href')),
      cta: t(ficha.querySelector('.block-buttom-services a')),
    };
  });

  // El bloque del titulo de la ficha NO es igual en las 3 paginas: en `/` es
  // `<div class="block-content-service"><h4 class="heading-3">` y en las 2 de where-we-serves
  // son un `<div>` y un `<h4>` PELADOS. Y esas clases pintan (`width:100%` y
  // `margin-bottom:5px`), asi que unificarlas movería píxeles en 2 de las 3 rutas.
  const conClasesFicha = !!sec.querySelector('.block-content-service');

  const datos = {
    titulo: t(sec.querySelector('.wrapper-title-services h2')),
    subtitulo: t(sec.querySelector('.paragraph-services')),
    // Los dos `data-w-id` son los que `src/data/reveals.json` usa para animar la seccion, y
    // los mira `check:ix2`. Si se pierden, la seccion deja de revelarse.
    wIdTitulo: at(sec.querySelector('.wrapper-title-services'), 'data-w-id'),
    wIdCuerpo: at(sec.querySelector('.wrapper-item-service'), 'data-w-id'),
    defecto,
    conClasesFicha,
    categorias,
    servicios,
  };

  // Un hueco aqui es una ficha muda en la pagina. Mejor que reviente el generador.
  const faltan = [];
  if (!datos.titulo || !datos.subtitulo) faltan.push('titulo/subtitulo');
  if (!datos.defecto) faltan.push('DEFAULT_CATEGORY_SLUG');
  if (!datos.wIdTitulo || !datos.wIdCuerpo) faltan.push('data-w-id');
  if (categorias.length !== 3) faltan.push(`categorias=${categorias.length}`);
  for (const sv of servicios) {
    for (const k of ['id', 'nombre', 'icono', 'foto', 'alt', 'titulo', 'texto', 'enlace', 'cta']) {
      if (!sv[k]) faltan.push(`${sv.id ?? '?'}.${k}`);
    }
    if (!sv.categorias.length) faltan.push(`${sv.id}.categorias`);
    if (!categorias.some((c) => sv.categorias.includes(c.slug))) faltan.push(`${sv.id}: sin pestana`);
  }
  if (faltan.length) {
    console.error(`\n  ROJO ${ruta}: la seccion de servicios sale incompleta -> ${faltan.join(', ')}\n`);
    process.exit(1);
  }
  // LOOP-IMAGENES (2-oct-2026): `src/data/fotos-servicios-categoria.json` manda sobre la foto del
  // origen, por `id`, con la misma traza al banco que `fotosPorRuta()`. Un id sin entrada sale como hoy.
  for (const sv of datos.servicios) {
    const o = FOTOS_SERVICIOS_CATEGORIA[sv.id];
    if (!o) continue;
    const e = BANCO.get(o._banco);
    const rojo = (msg) => { console.error(`\n  ROJO Full-Service ${sv.id}: ${msg}\n`); process.exit(1); };
    if (!e) rojo(`${o._banco} no esta en banco-imagenes.json`);
    if (e.procedencia !== 'obra_real' || !String(e.estado).startsWith('aprobada')) rojo(`${o._banco} no es obra_real aprobada`);
    if (e.src !== o.foto && !(e.publicada_como ?? []).includes(o.foto)) rojo(`${o.foto} no es el src de ${o._banco} ni esta en publicada_como`);
    if (!(e.usada_en ?? []).includes(ruta)) rojo(`${o._banco} no lleva ${ruta} en usada_en`);
    if (!fs.existsSync(path.join(RAIZ, 'public', o.foto))) rojo(`falta el fichero ${o.foto}`);
    Object.assign(sv, { foto: o.foto, alt: o.alt, ancho: o.ancho, alto: o.alto, pos: o.pos });
  }
  SERVICIOS[ruta] = datos;
}

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g).map((c) => c.slice(1, -1)))
  // FASE 6: tambien las 101 de coleccion. Es el mismo camino -el marcado sale del HTML
  // servido de cada una-, asi que no hay una segunda implementacion que pueda divergir.
  .filter(([, tipo]) => tipo === 'estatica' || tipo === 'coleccion' || tipo === 'estatica-oculta');

/**
 * LAS RUTAS QUE ESTE GENERADOR YA NO PUEDE ESCRIBIR (PROMPT-REDISENO §2.2).
 *
 * Mas abajo esto hace `writeFileSync` sobre `src/pages/<ruta>.astro`, cabecera `// DERIVADO`
 * incluida. Para las 114 es lo correcto: su marcado sale de `_source/vivo/` y se regenera igual.
 * Para la home, en cuanto R9 la descomprima y la redisene, es BORRAR EL TRABAJO — y hasta hoy no
 * habia ninguna guarda, asi que se perdia sin un mensaje.
 *
 * La guarda esta puesta ANTES de que haya nada que proteger, y es a proposito: una guarda que
 * llega despues del accidente no es una guarda. El precio es que `npm run paginas` a secas ya no
 * regenera la home; el motivo va escrito aqui al lado de la ruta.
 *
 * Falla RUIDOSAMENTE: no la toca, lo dice con un banner y **sale con codigo 1**, para que un
 * `npm run paginas && npm run plantillas` se pare y alguien lo lea. Lo que NO hace es abortar la
 * corrida entera: las otras 114 si se regeneran, porque una guarda que rompe la tuberia del
 * repo es una guarda que alguien acaba borrando.
 */
const NO_REGENERAR = new Map([
  ['/', 'la home la redisena la fase R9 y deja de ser derivable. Para regenerarla habria que '
      + 'sacarla de aqui a mano, con su motivo en MIGRACION-LOG.md.'],
  /**
   * LA SEGUNDA, Y NO LA PUSO EL PROGRAMA R: la destapo la demostracion en rojo de la primera.
   *
   * La Fase 6b paso esta familia a leer de Sanity y BORRO los 53 .astro estaticos; hoy la sirve
   * `src/pages/services/pool-builders/[slug].astro`. Al correr este generador para probar la guarda de
   * `/`, reaparecieron los 53 como ficheros sin versionar. Eso ensombrece la plantilla, mete 53
   * rutas de mas y rompe `check:rutas` -que exige 115 y 0 extras-, y todo ello en silencio: el
   * banner solo hablaba de `/`, asi que quien lo leyera se habria quedado tranquilo.
   *
   * O sea, la guarda daba una falsa seguridad, que es peor que no tenerla. Es exactamente la
   * familia de fallo que R6 viene a matar, solo que en el generador en vez de en la puerta.
   */
  ['/services/pool-builders/', 'la familia entera la sirve src/pages/services/pool-builders/[slug].astro leyendo '
      + 'de Sanity desde la Fase 6b, que borro los 53 .astro a proposito. Regenerarlos los '
      + 'repone sin versionar, ensombrece la plantilla y rompe check:rutas con 53 rutas de mas.'],
  /**
   * LA TERCERA: las 2 de Estado. Su heroe (T0) se edita A MANO desde el rediseno del 3-sep-2026
   * y este generador las SOBRESCRIBIA en silencio — no era una hipotesis, paso en la sesion de
   * SEO del 3-sep-2026 y hubo que restaurarlas de una instantanea. La cabecera del .astro ya lo
   * avisaba; lo que faltaba era la guarda que lo impide.
   */
  /**
   * LA CUARTA Y LA QUINTA: el blog entero, y por el mismo motivo que `/services/pool-builders/`.
   *
   * BLOG-SANITY paso las fichas a `src/pages/blogs/[slug].astro`, que lee de Sanity, y borro
   * los 10 `.astro`. Regenerarlos los repone SIN VERSIONAR, ensombrece la ruta dinamica y
   * rompe `check:rutas` con 10 rutas de mas — exactamente lo que le paso a `/services/pool-builders/`
   * el dia que se probo la guarda de `/`.
   *
   * `/blogs-tips` no se borra: pasa a editarse A MANO (buscador, filtros y «Load More» sobre
   * un indice horneado desde Sanity). Regenerarlo lo borraria, igual que le paso a las 2 de
   * Estado el 3-sep-2026.
   */
  ['/blogs/', 'la familia entera la sirve src/pages/blogs/[slug].astro leyendo de Sanity desde '
      + 'BLOG-SANITY, que borro los 10 .astro a proposito. Regenerarlos los repone sin '
      + 'versionar y rompe check:rutas con 10 rutas de mas.'],
  ['/blogs-tips', 'el indice se edita A MANO desde BLOG-SANITY: buscador, filtros por categoria '
      + 'y «Load More» sobre un indice horneado desde Sanity. Regenerarlo lo borra.'],
  ['/where-we-serve/north-florida', 'el heroe (T0) se edita A MANO desde el rediseno del '
      + '3-sep-2026. Regenerarla lo borra: ya paso una vez.'],
  ['/where-we-serve/south-florida', 'idem que la de North: heroe a mano desde el 3-sep-2026.'],
]);

/**
 * HUECOS DE SEO DEL ORIGEN QUE SE RELLENAN A PROPOSITO (D5 en MIGRACION-LOG.md).
 *
 * `/brochures` es la unica pagina de contenido real que sale de Webflow SIN meta description y
 * SIN un solo bloque de JSON-LD (SEO-URLS-PLAN.md hallazgo 4). `/pool-investment-estimator`
 * tambien los tiene vacios, pero ese ya esta declarado como excepcion en `check-seo.mjs`
 * (`SIN_HEAD_DE_WEBFLOW`, cabecera propia de 4 etiquetas); este no: es un hueco de verdad.
 *
 * ESTO ROMPE LA PARIDAD A PROPOSITO, y por eso se declara aqui y no se arregla en
 * `_source/vivo/brochures.html` -que es el origen y no se toca- ni a mano en el `.astro` -que
 * es DERIVADO y se perderia en el siguiente `npm run paginas`-.
 *
 * LA DESCRIPCION NO ES COPY INVENTADO: es la entradilla que la propia pagina ya muestra en
 * `div.text-block-4`, 150 caracteres, dentro de rango. Escribir texto nuevo es de la sesion de
 * SEO de contenido, no de esta.
 *
 * El JSON-LD copia la forma de `/gallery` y `/videos`, que son las dos paginas indice
 * comparables: `CollectionPage` con `about` -> `Organization`.
 */
const HUECOS_SEO = {
  '/brochures': {
    descripcion: 'Dive into the details. Explore our digital catalogs for in-depth details, '
      + 'design inspiration, and premium materials for your custom backyard projects.',
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      about: {
        '@type': 'Organization',
        description: 'Licensed design-build contractor specializing in luxury pool construction, '
          + 'outdoor living spaces, pergolas, and custom outdoor projects across North and South '
          + 'Florida.',
        name: 'Mr. and Mrs. Outdoor Living',
      },
      description: 'Digital catalogs with materials, finishes and design details for custom pool '
        + 'and outdoor living projects in North & South Florida.',
      inLanguage: 'en',
      name: 'Outdoor Living Brochures',
      url: '/brochures',
    }],
  },
};

/**
 * Coincidencia EXACTA, o por prefijo si la clave acaba en `/`. `/` es un caso aparte: acaba en
 * barra pero solo puede casar consigo misma, o protegeria el sitio entero.
 */
/* El prefijo `/services/pool-builders/` protege a las 53 CIUDADES (plantilla dinamica) y NO a los
 * 9 condados, que viven bajo el mismo prefijo desde el 3-oct-2026 pero siguen siendo estaticos
 * derivados de `_source/vivo/country_*.html`. Sin `!esCondado` este generador dejaria de
 * escribirlos y `check:rutas` saldria rojo con 9 rutas sin construir. */
const protegida = (ruta) => [...NO_REGENERAR.keys()]
  .find((k) => (k !== '/' && k.endsWith('/') ? ruta.startsWith(k) && !esCondado(ruta) : ruta === k));

/* Cuenta las rutas de services/+where-we-serves/ que reciben el carrusel de blog POR
 * INSERCION (§ mas abajo). Se COMPRUEBA al final contra 16: si sube, se ha colado en una ruta
 * de mas; si baja, alguna se ha quedado sin el. Un «las que salgan» no comprobaria nada. */
/**
 * ── LAS OBRAS DE AUTORIA PROPIA EN EL INDICE DE PORTAFOLIO ──────────────────────────────────
 *
 * 5 obras publicadas el 3-sep-2026 que el Webflow de origen nunca tuvo. Su FICHA es una pagina
 * propia escrita a mano (`src/pages/project/*.astro`, declaradas en `lib/rutas-propias.mjs`),
 * pero su TARJETA vive en `/projects`, que SI se sigue derivando de `_source/vivo/projects.html`.
 * De ahi que la insercion tenga que ocurrir aqui.
 *
 * POR QUE AQUI Y NO EN `NO_REGENERAR`. Meter `/projects` en `NO_REGENERAR` congelaria un fichero
 * cuyo `T0` es UNA sola cadena de 12 kB en una linea: a partir de ese dia se mantiene a mano.
 * Los dos precedentes no se parecen —`/` se congelo DESPUES de descomprimirse en constantes
 * editables, y `/services/pool-builders/` porque sus 53 estaticos ya no existen—. Declarandolo aqui,
 * `/projects` sigue siendo derivable: el dia que alguien corra `npm run vivo` y traiga el origen
 * fresco, estas 5 se vuelven a poner solas.
 *
 * LA TARJETA NO SE ESCRIBE A MANO: SE CLONA LA PRIMERA DEL ORIGEN Y SE LE CAMBIA EL TEXTO. Asi
 * el marcado —las clases, el `data-w-id` que la anima, el `loading="lazy"`, los envoltorios—
 * sigue saliendo del origen y no de mi memoria, y si Webflow cambiara la forma de la tarjeta,
 * estas 5 cambiarian con ella. El `style="opacity:0"` que trae el molde lo limpia despues el
 * mismo paso que limpia las 10 (`:458-474`), sin excepcion para estas.
 */
const OBRAS_PROPIAS = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/proyectos-propios.json'), 'utf8')).obras;

/** Ruta -> donde se inyectan y por que. Hoy solo `/projects`; `/` lleva las suyas a mano
 *  porque esta en NO_REGENERAR y ya no pasa por aqui. */
/* Las 14 fotos de obra propia que se anaden a `/gallery` (21-sep-2026). Fichero aparte porque
 * el casting es contenido, no codigo: quien lo revise no deberia tener que leer este script. */
const GALERIA_PAGINA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/galeria-pagina.json'), 'utf8'));
let galeriaPropiaInsertada = 0;
let galeriaExcluida = 0;

const OBRAS_EN = {
  '/projects': {
    lista: '.cms-list-work',
    motivo: 'El indice de portafolio. Las 5 obras propias van al PRINCIPIO: son lo ultimo '
      + 'construido, y el orden del indice es el de publicacion, de mas nuevo a mas viejo.',
  },
};
let obrasInsertadas = 0;
let obrasOcultadas = 0;

let blogsInsertados = 0;
/* Y las que lo reciben por SUSTITUCION -Condado ya traia `.blog-section-page` en su origen-,
 * comprobado al final contra 9. Los dos mecanismos son disjuntos por construccion: Condado no
 * pasa por el `if` de insercion y Estado/Servicios no tienen la seccion en su origen. */
let blogsSustituidos = 0;
let proyectosSustituidos = 0;
/* Anclas «Read More» del HTML crudo a las que se les pone `aria-label` (§ limpia()). Se
 * COMPRUEBA al final contra 80: 10 de /blogs-tips + 7 x 10 de /blogs/. Si baja, el origen ha
 * cambiado la forma de la tarjeta y hay enlaces sin etiquetar; si sube, se ha colado en otro
 * sitio. `ctaSinTitulo` recoge las que no encontraron encabezado, que es el fallo silencioso. */
let ctaEtiquetados = 0;
const ctaSinTitulo = [];
/* Bloques de JSON-LD del origen que no parseaban y se han reparado escapando el caracter de
 * control (§ mas abajo). Se COMPRUEBA al final contra 8, las de SEO-URLS-PLAN.md hallazgo 2. */
let ldReparados = 0;
/* Rutas de `HUECOS_SEO` efectivamente rellenadas. Se COMPRUEBA al final contra el tamano de
 * la tabla: si baja, una ruta declarada ya no pasa por aqui y su hueco vuelve a estar abierto. */
let huecosRellenados = 0;
/* Imagenes de `RESERVAN_HUECO` a las que se les fija width+height. `imgSinDim` recoge las que
 * el manifiesto no conoce, que serian las que siguen desplazando sin que nadie lo diga. */
let huecosReservados = 0;
const imgSinDim = [];
/* Heroes que dejan de ser `lazy` por ser la imagen LCP de su ruta. */
let heroesDesperezados = 0;
/* Rutas con la capa de captacion aplicada (R17-CORE). Se COMPRUEBA al final contra el
 * tamano de `CAPTACION`: si baja, una ruta declarada dejo de pasar por aqui y la landing
 * de pago se quedo sin formulario sin que nadie lo dijera. */
let captacionAplicada = 0;
/* Fichas de `/services/` con la `gallery` movida detras de la FAQ (bloque 8b). Se COMPRUEBA al
 * final contra el tamano de `CAPTACION`, con salida 1: las 14 tienen que tener el mismo orden. */
let galeriasMovidas = 0;
/* Los tres arreglos que antes vivian a mano en el `.astro` (§ limpia()). */
let logosConSizes = 0;
let relAnadidos = 0;
let telefonosEnvueltos = 0;
/* Enlaces reescritos a una ruta renombrada (§ scripts/lib/renombradas.mjs). */
let enlacesRenombrados = 0;
/* El embed WAAPI del mosaico de `.trusted-section` (9 rutas de country/, huella `STEP_MS`
 * dentro del `<script>` — mas fiable que la clase `.code-embed`, que es generica de Webflow y
 * tambien la lleva el menu). Se retira aqui, no a mano en `_source/vivo/`: si algun dia se
 * vuelve a correr `npm run vivo` contra el sitio real, un hand-edit se perderia y esto no.
 * El bucle vive ahora en src/styles/intro.css §5 + src/components/MosaicoConfianza.astro,
 * igual para las 80 rutas. Se COMPRUEBA al final contra 9. */
let codeEmbedsEliminados = 0;
const generadas = [];
const porColeccion = {};
const protegidas = [];
/* R22-BLOG-IMG · RETIRADO EN BLOG-SANITY, y no por obsoleto: por quedarse SIN SUPERFICIE.
 *
 * `fotosBlog`, `figurasBlog` y `seoBlog` solo actuaban sobre `/blogs-tips` y `/blogs/*` -la
 * propia guarda de `fotosBlog` lo decia: `if (ruta !== '/blogs-tips' && !ruta.startsWith(
 * '/blogs/')) return 0;`-. Las dos familias acaban de entrar en NO_REGENERAR, asi que las tres
 * funciones pasarian por 0 rutas y su invariante (80/30/31) reventaria el build diciendo que
 * «la cuenta no cuadra», cuando lo que ha pasado es que ya no hay nada que contar.
 *
 * EL TRABAJO DE R22 NO SE PIERDE: las mismas fotos y las mismas 3 figuras por articulo viven
 * ahora EN SANITY (campo `portada` y bloques `image` dentro de `blog`), puestas por
 * `scripts/backfill-blog-sanity.mjs` desde el mismo `src/data/imagenes-blog-por-ruta.json`.
 * El casting -que foto va en que hueco y por que- sigue donde estaba: en la cabecera de
 * `scripts/build-imagenes-blog.mjs`. Las figuras se insertan en las MISMAS posiciones que
 * calculaba `figurasBlog()`, verificado articulo a articulo.
 *
 * Las otras 79 rutas no se enteran: su carrusel sale de `src/data/blogs.json`, no de aqui.
 */
/**
 * ── FOTOS DEL BANCO POR RUTA (PROMPT-IMAGENES-ABOUT) ─────────────────────────────────────
 *
 * Cambia `<img>` del origen por fotos de obra real del banco, ruta a ruta, leyendo
 * `src/data/fotos-por-ruta.json`: `{ ruta: { selector: [foto | null, ...] } }`, en orden DOM.
 * `null` deja la del origen. Mismo canje que `proceso.fotos` de `captacion()`: src, alt,
 * width, height, object-position, y fuera `srcset`/`sizes` (apuntarian al render de antes).
 * `ratio` va inline porque `check:tokens` no tiene sitio para una regla mas.
 *
 * POR RUTA EXACTA Y POR SELECTOR, NUNCA POR `src`: el render de whatsetus de `/about` tambien
 * lo pinta `/where-we-serve`, y alli se queda.
 *
 * Y LA TRAZA LA COMPRUEBA ESTO, porque no la comprueba nadie mas (`build-banco.mjs` no lee
 * `usada_en`): cada `_banco` tiene que existir en el indice con el mismo src y medidas, ser
 * `obra_real` y `aprobada*`, tener fichero y llevar la ruta en `usada_en`. Si no, ROJO.
 */
const FOTOS_SERVICIOS_CATEGORIA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/fotos-servicios-categoria.json'), 'utf8'));
const FOTOS_POR_RUTA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/fotos-por-ruta.json'), 'utf8'));
const BANCO = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'))
  .map((e) => [e.id, e]));
let fotosCanjeadas = 0;
/**
 * SEO-REMEDIACION (4-oct-2026) — TEXTOS PROPIOS DE PAGINAS DERIVADAS (`src/data/textos-propios.json`).
 *
 * `/about` traia una FAQ titulada «Commercial Pool Construction» con LA MISMA respuesta en las
 * cinco preguntas, tambien en su `FAQPage`. Se corrige aqui, en el generador, para que
 * `npm run paginas` no lo devuelva al origen. Con GUARDA: si la FAQ no tiene exactamente las
 * preguntas que el JSON dice que «eran», o una sustitucion no encuentra su texto, revienta.
 */
let textosCorregidos = 0;
function textosPropios(doc, ruta) {
  const t = TEXTOS_PROPIOS[ruta];
  if (!t) return 0;
  if (t.faq) {
    const sec = doc.querySelector('section.faq-section');
    const h2 = sec?.querySelector('h2');
    const items = [...(sec?.querySelectorAll('.dropdown-faq') ?? [])];
    if (!h2 || items.length !== t.faq.preguntas.length) {
      throw new Error(`textos-propios ${ruta}: la FAQ trae ${items.length} preguntas y el JSON declara ${t.faq.preguntas.length}`);
    }
    h2.textContent = t.faq.titulo;
    items.forEach((it, i) => {
      const q = t.faq.preguntas[i];
      const h3 = it.querySelector('h3');
      const p = it.querySelector('nav p');
      if (h3?.textContent.trim() !== q.era || !p) throw new Error(`textos-propios ${ruta}: la pregunta ${i} ya no es «${q.era}»`);
      h3.textContent = q.pregunta;
      p.textContent = q.respuesta;
    });
    let ld = 0;
    for (const sc of doc.head.querySelectorAll('script[type="application/ld+json"]')) {
      let b; try { b = JSON.parse(sc.textContent); } catch { continue; }
      /* En `/about` el `FAQPage` va ANIDADO: es el `mainEntity` de un `AboutPage`. Se busca a
       * cualquier profundidad y se reescribe donde esta, sin mover nada mas del bloque. */
      const faqs = [];
      (function busca(o) {
        if (!o || typeof o !== 'object') return;
        if (o['@type'] === 'FAQPage') faqs.push(o);
        for (const v of Object.values(o)) busca(v);
      })(b);
      for (const f of faqs) {
        f.mainEntity = t.faq.preguntas.map((q) => ({
          '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta },
        }));
        ld++;
      }
      if (faqs.length) sc.textContent = JSON.stringify(b);
    }
    if (ld !== 1) throw new Error(`textos-propios ${ruta}: ${ld} FAQPage en el head, se esperaba 1`);
  }
  /* Campos que se anaden detras de un bloque existente, una sola vez (`/request-estimated`). */
  for (const { tras, html } of t.inserta ?? []) {
    const ancla = doc.querySelectorAll(tras);
    if (ancla.length !== 1) throw new Error(`textos-propios ${ruta}: «${tras}» sale ${ancla.length} veces`);
    ancla[0].insertAdjacentHTML('afterend', html);
  }
  /* La imagen que pinta el LCP: carga ansiosa, prioridad alta y su hueco reservado. */
  if (t.imagenLcp) {
    const img = doc.querySelectorAll(t.imagenLcp.selector);
    if (img.length !== 1) throw new Error(`textos-propios ${ruta}: «${t.imagenLcp.selector}» sale ${img.length} veces`);
    img[0].setAttribute('loading', 'eager');
    img[0].setAttribute('fetchpriority', 'high');
    img[0].setAttribute('width', String(t.imagenLcp.ancho));
    img[0].setAttribute('height', String(t.imagenLcp.alto));
  }
  /* Un `<div>` que hace de etiqueta pasa a `<label for>` (mismo texto, misma clase). */
  if (t.etiqueta) {
    const el = doc.querySelector(t.etiqueta.div);
    if (!el || el.tagName !== 'DIV') throw new Error(`textos-propios ${ruta}: no encuentro la etiqueta ${t.etiqueta.div}`);
    const lab = doc.createElement('label');
    lab.className = el.className;
    lab.setAttribute('for', t.etiqueta.for);
    lab.innerHTML = el.innerHTML;
    el.replaceWith(lab);
  }
  /* Ids duplicados -> unicos, y fuera el `for` de un <span> (no es una etiqueta). */
  if (t.idsUnicos) {
    const els = [...doc.querySelectorAll(t.idsUnicos.selector)];
    if (!els.length) throw new Error(`textos-propios ${ruta}: «${t.idsUnicos.selector}» no casa nada`);
    els.forEach((el, i) => {
      el.id = `${t.idsUnicos.prefijo}-${i + 1}`;
      el.parentElement?.querySelector('span[for]')?.removeAttribute('for');
    });
  }
  for (const { era, es } of t.sustituye ?? []) {
    const el = [...doc.body.querySelectorAll('p, h1, h2, h3, h4, div')]
      .find((e) => e.children.length === 0 && e.textContent.trim() === era);
    if (!el) throw new Error(`textos-propios ${ruta}: no encuentro «${era.slice(0, 60)}…»`);
    el.textContent = es;
  }
  return 1;
}

function fotosPorRuta(doc, ruta) {
  const porSelector = FOTOS_POR_RUTA[ruta];
  if (!porSelector) return 0;
  const rojo = (msg) => { console.error(`\n  ROJO ${ruta}: ${msg}\n`); process.exit(1); };
  let n = 0;
  for (const [sel, fotos] of Object.entries(porSelector)) {
    const imgs = [...doc.querySelectorAll(sel)];
    if (imgs.length !== fotos.length) rojo(`«${sel}» casa ${imgs.length} <img> y fotos-por-ruta.json trae ${fotos.length}`);
    imgs.forEach((img, i) => {
      const f = fotos[i];
      if (!f) return;
      const e = BANCO.get(f._banco);
      if (!e) rojo(`${f._banco} no esta en banco-imagenes.json`);
      if (e.src !== f.src || e.ancho !== f.ancho || e.alto !== f.alto) rojo(`${f._banco} no casa con el indice (src/ancho/alto)`);
      if (e.procedencia !== 'obra_real' || !String(e.estado).startsWith('aprobada')) rojo(`${f._banco} no es obra_real aprobada`);
      if (!fs.existsSync(path.join(RAIZ, 'public', f.src))) rojo(`falta el fichero ${f.src}`);
      if (!(e.usada_en ?? []).includes(ruta)) rojo(`${f._banco} no lleva ${ruta} en usada_en`);
      img.setAttribute('src', f.src);
      img.setAttribute('alt', f.alt);
      img.setAttribute('width', String(f.ancho));
      img.setAttribute('height', String(f.alto));
      img.setAttribute('style', `object-position:${f.pos}${f.ratio ? `;aspect-ratio:${f.ratio}` : ''}`);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      // LOOP-IMAGENES (2-oct-2026): si la <img> vive en un `a.w-lightbox`, el visor lee la URL del
      // `script.w-json` hermano, no del `src`. Sin esto la galeria ensena la foto nueva y el
      // lightbox abre la vieja. Mismo JSON que escribe el bloque de /gallery mas abajo.
      const lb = img.closest('a.w-lightbox')?.querySelector('script.w-json');
      if (lb) lb.textContent = JSON.stringify({ items: [{ url: f.src, type: 'image' }], group: 'images' });
      n++;
    });
  }
  return n;
}


/* ── ASTRO-2 · LA GALERIA DE OBRA DE LA FICHA, EN MOSAICO (lamina «GaleriaObra») ─────────
 * El carrusel de Finsweet sale. Quedan el titular y la linea de siempre, la accion de la
 * pagina en boton de linea (D-76), el enlace a `/gallery` y un mosaico de hasta seis fotos:
 * cada una es un `<button>` que abre el visor que ya existe (`<dialog class="mm-lb">`,
 * `Componentes.astro`).
 *
 * QUE FOTOS: las de la galeria de la ficha, en su orden, que tengan procedencia verificada en
 * uno de los dos registros (D-99): el banco (`obra_real`) o `gallery-procedencia.json`
 * (`usable`). Las que no la tienen NO se pintan. Las seis primeras van al mosaico; el resto
 * solo al visor, en el JSON de la seccion. */
const GALERIA_USABLE = new Set([
  ...Object.values(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/gallery-procedencia.json'), 'utf8')).servicios)
    .flat().filter((x) => x.usable).map((x) => x.src),
  ...JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'))
    .filter((e) => e.src && e.procedencia === 'obra_real' && /^aprobada/.test(e.estado)).map((e) => e.src),
]);
/* D-124 (12-oct-2026): el mosaico de una ficha puede completar con las demas fotos de la galeria
 * de su servicio que constan en el registro, segun `galeria-complementaria.json`. Solo en el
 * mosaico de SU ficha, detras de las primeras (limite c), sin pie (limite b) y nunca las
 * `excluidas` (limite a). Una excluida que ya no conste en el registro es un fichero que se ha
 * quedado viejo: revienta. */
const COMPLEMENTARIA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/galeria-complementaria.json'), 'utf8'));
const RESTO_GALERIA = Object.values(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/gallery-procedencia.json'), 'utf8')).servicios)
  .flat().filter((x) => !x.usable).map((x) => x.src);
for (const src of COMPLEMENTARIA.excluidas) {
  if (!RESTO_GALERIA.includes(src)) throw new Error(`galeria-complementaria.json excluye ${src}, que no consta en el resto de la galeria del registro`);
}
const GALERIA_COMPLEMENTARIA = new Set(RESTO_GALERIA.filter((src) => !COMPLEMENTARIA.excluidas.includes(src)));
const escAttr = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let mosaicos = 0;
/** Las fotos de seccion de cada ficha (FAQ, cierre, resenas, por ese orden): ids del banco elegidos
 *  en hoja de contactos (`fotos-seccion-fichas.json`). Con las 10 de la galeria a la vista (D-117)
 *  ya no pueden salir de ella. Se validan aqui: una que no cumpla tumba el script. Vertical vale si aguanta 3:2 (D-193). */
const FOTOS_SECCION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/fotos-seccion-fichas.json'), 'utf8'));
const BANCO_POR_ID = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8')).map((e) => [e.id, e]));
/** D-185: la ficha de luces de alero ensena el SISTEMA sobre una casa, y de eso no hay obra propia. Sus fotos de seccion
 *  son las que ya ensenaba la pagina de origen, que no estan en el banco: van como objeto y solo valen en esta ruta. */
const SECCION_FUERA_DEL_BANCO = new Set(['/services/soffit-led-lighting']);
function fotoDeSeccion(ruta, k) {
  if (!(ruta in FOTOS_SECCION)) throw new Error(`${ruta}: no esta en fotos-seccion-fichas.json (una lista vacia vale; faltar, no)`);
  const id = FOTOS_SECCION[ruta][k];
  if (!id) return null;
  if (typeof id === 'object') {
    const mal = !SECCION_FUERA_DEL_BANCO.has(ruta) ? 'esta ruta no tiene declarada la excepcion' : !id.alt ? 'sin alt' : !(id.w > id.h * 1.05) ? 'no es apaisada'
      : !fs.existsSync(path.join(RAIZ, 'public', id.src)) ? 'falta el fichero' : null;
    if (mal) throw new Error(`${ruta}: ${id.src} no vale de foto de seccion — ${mal}`);
    return { src: id.src, alt: id.alt, w: id.w, h: id.h };
  }
  const e = BANCO_POR_ID.get(id);
  const falla = !e ? 'no esta en el banco' : e.procedencia !== 'obra_real' ? `procedencia «${e.procedencia}»`
    : !/^aprobada/.test(e.estado ?? '') ? `estado «${e.estado}»` : e.etapa !== 'terminado' ? `etapa «${e.etapa}»`
      // D-193: ya no hace falta que sea apaisada (desde 992 px la seccion va en 4:5 con su derivada); lo que si hace falta
      // es que aguante la caja 3:2 de movil y del cierre, y eso lo dice el banco en `recortes_seguros`.
      : e.orientacion !== 'horizontal' && !(e.recortes_seguros ?? []).includes('3:2') ? `${e.orientacion} y sin recorte 3:2 seguro (la caja de movil es 3:2)` : !e.src || !e.alt ? 'sin fichero o sin alt'
        : id === CAPTACION[ruta].heroe._banco ? 'es la foto del hero de la ficha' : null;
  if (falla) throw new Error(`${ruta}: ${id} no vale de foto de seccion — ${falla}`);
  return { src: e.src, alt: e.alt, w: e.ancho, h: e.alto };
}
function mosaicoDeObra(doc, ruta) {
  if (!esFicha(ruta) && !esCondado(ruta)) return;
  const sec = doc.querySelector('section.gallery');
  const h2 = sec?.querySelector('.header-gallery h2');
  const linea = h2?.nextElementSibling;
  const cta = doc.querySelector('.mm-hero-a-acc > a.mm-btn');
  if (!h2 || !linea || !cta) throw new Error(`${ruta}: la galeria no trae titular y linea, o el hero no trae su accion`);
  localizar(sec);
  const todas = [...sec.querySelectorAll('img.image-gallery')].map((i) => ({ src: i.getAttribute('src'), alt: COMPLEMENTARIA.ilustraciones?.[i.getAttribute('src')] ?? i.getAttribute('alt') ?? '',
    w: i.getAttribute('width'), h: i.getAttribute('height') }));
  // La foto del hero no se repite en la galeria (screen rooms y riego toman el hero de ella, D-122).
  const delHero = doc.querySelector('.mm-hero-a-medio img')?.getAttribute('src');
  // Primero las usables del registro, en su orden; detras, las complementarias (D-124, limite c).
  const fotos = [...todas.filter((f) => GALERIA_USABLE.has(f.src)), ...todas.filter((f) => !GALERIA_USABLE.has(f.src) && GALERIA_COMPLEMENTARIA.has(f.src))]
    .filter((f) => f.src !== delHero);
  // Las apaisadas delante, en su orden: la primera celda ocupa media anchura y una vertical ahi
  // se recorta a la mitad (visto en la hoja de contactos de las 14, 12-oct-2026).
  const apaisada = (f) => (DIM.get(f.src)?.w ?? f.w) / (DIM.get(f.src)?.h ?? f.h) >= 1.2;
  const real = (f) => GALERIA_USABLE.has(f.src);
  fotos.sort((x, y) => (real(y) - real(x)) || (apaisada(y) - apaisada(x)));
  // Tres es el suelo: una grande y dos apiladas (riego, que cede una de sus cuatro al hero).
  if (fotos.length < 3) throw new Error(`${ruta}: la galeria solo tiene ${fotos.length} fotos con procedencia verificada; el mosaico pide 3`);
  // Los condados no tienen entrada de captacion: su galeria es la de piscinas.
  const marca = CAPTACION[ruta]?.heroe.marca ?? 'Pool';
  const tit = marca && h2.innerHTML.includes(marca) ? h2.innerHTML.replace(marca, `<span class="mm-rot">${marca}</span>`) : h2.innerHTML;
  const medidas = (f) => {
    const d = f.w && f.h ? { w: f.w, h: f.h } : DIM.get(f.src);
    if (!d) throw new Error(`${ruta}: ${f.src} no tiene medidas en el manifiesto`);
    return d;
  };
  /* `sizes`: lo que ocupa la celda, para que `srcset-auto.mjs` no sirva el original de 1600 px a
   * una celda de 300 (la primera va a media anchura; las demas, a un cuarto; en movil, entera y media). */
  const celda = (f, clase, sizes) => {
    const d = medidas(f);
    return `<button type="button" class="${clase}" data-mm-foto="${f.src}" aria-label="Open photo: ${escAttr(f.alt)}">`
      + `<img src="${f.src}" alt="${escAttr(f.alt)}" width="${d.w}" height="${d.h}" sizes="${sizes}" loading="lazy" decoding="async"></button>`;
  };
  /* D-117: TODAS las fotos de la galeria siguen en el HTML y a la vista. Seis en el mosaico y el
   * resto en una segunda fila pequena; todas abren el mismo visor, en su orden. */
  const enMosaico = fotos.slice(0, 6);
  const resto = fotos.slice(6);
  /* D-119: `/services/pool-builders` enlazaba a `/projects` desde el antes/despues que pierde. El
   * enlace vuelve, con su mismo texto, junto al de la galeria. */
  const aProyectos = ruta === '/services/pool-builders' ? `<a class="mm-flecha" href="/projects">View All Projects${FLECHA}</a>` : '';
  const nueva = doc.createElement('section');
  nueva.setAttribute('class', 'mm-gal');
  nueva.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${nbIntro(tit)}</h2><div class="mm-sec-lado"><p class="mm-p">${linea.innerHTML}</p>`
    + `<div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${cta.getAttribute('href')}">${cta.innerHTML}</a>`
    + `<a class="mm-flecha" href="/gallery">Project Gallery${FLECHA}</a>${aProyectos}</div></div></div>`
    + `<div class="mm-fotos"><div class="mm-mosaico mm-mosaico--${enMosaico.length}">${enMosaico.map((f, i) => celda(f, 'mm-celda', i === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw')).join('')}</div>`
    + (resto.length ? `<div class="mm-mosaico-resto">${resto.map((f) => celda(f, 'mm-celda mm-celda--resto', '(min-width: 768px) 25vw, 50vw')).join('')}</div>` : '') + '</div>';
  sec.replaceWith(nueva);
  mosaicos++;
}

/* ── ASTRO-2 · LAS 9 PAGINAS DE CONDADO, CON LAS PIEZAS DE LA PAGINA DE CIUDAD ────────────
 * `/services/pool-builders/<condado>-county-fl` sale de `_source/vivo/country_*.html` y traia la
 * maqueta de Webflow entera: hero a pantalla completa, mosaico animado, pestanas de proceso y
 * tres carruseles. Aqui pasa a las mismas piezas `.mm-*` que la ciudad, con SU texto:
 *
 *   hero A (miga, h1 con rotulador en el condado, apoyo, boton, banda de datos, foto de obra con
 *   pie, franja de logos) · intro (con sus enlaces a ciudad) · galeria en mosaico · render 3D ·
 *   proceso en lista (los cuatro pasos a la vista, sin foto: las del origen no son de obra) ·
 *   proyectos · articulos · resenas · banda de cierre (con su boton: aqui no hay formulario).
 *
 * Proyectos, articulos y resenas los pintan sus componentes en la variante de lista.
 * La foto del hero y las de seccion salen de la bolsa de piscinas (`heroe-ciudad.mjs`), que ya
 * repartia contando los 9 condados. La foto de Webflow del hero no esta en ningun registro. */
function condadoStitch(doc, ruta) {
  if (!esCondado(ruta)) return;
  const falta = (que) => { throw new Error(`${ruta}: ${que}`); };
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // 1 · HERO A, con la franja de logos dentro
  const hero = doc.querySelector('section.hero-country');
  const h1 = hero?.querySelector('h1');
  const apoyo = h1?.nextElementSibling;
  const boton = hero?.querySelector('.wrapper-buttons a');
  const titulo = h1?.textContent.trim() ?? '';
  const marca = titulo.match(/\bin (.+? County)\b/)?.[1];
  const foto = fotoDeHeroe(ruta);
  if (!h1 || !apoyo || !boton || !marca || !foto) falta('el hero de condado no trae h1, apoyo y boton, o no hay foto de obra para el');
  const [antes, ...resto] = titulo.split(marca);
  const [rotLic, ...valLic] = CAPTACION['/services/pool-builders'].heroe.licencias.split(' · ');
  const tramos = tramosMiga(ruta);
  // D-134: los dos condados del sur pintan «South Florida» primero, como sus ciudades.
  const tels = zonasDeCondado(ruta).map((z) => TELEFONOS.find((t) => t.zona === z));
  if (tels.some((t) => !t)) falta('una zona de `condados.mjs` no esta en telefonos.json');
  const datoTel = (t) => `<a class="mm-dato" href="tel:${t.tel}"><span class="mm-dato-rot">${t.zona}</span><span class="mm-dato-val">${t.visible}</span></a>`;
  const bandaTel = `<div class="mm-datos mm-datos--tel">${tels.map(datoTel).join('')}</div>`;
  const nh = doc.createElement('section');
  nh.setAttribute('class', 'mm-hero-a');
  nh.innerHTML = '<div class="mm-hero-a-txt">'
    + '<nav class="mm-miga" aria-label="Breadcrumb"><ol>'
    + tramos.map((t, k) => (k === tramos.length - 1 ? `<li aria-current="page">${esc(t.nombre)}</li>` : `<li><a href="${t.href}">${esc(t.nombre)}</a></li>`)).join('')
    + '</ol></nav>'
    + `<h1 class="mm-h1">${esc(antes)}<span class="mm-rot">${esc(marca)}</span>${esc(resto.join(marca))}</h1>`
    + `<p class="mm-p">${apoyo.innerHTML}</p>`
    + `<div class="mm-hero-a-acc"><a class="mm-btn" href="${boton.getAttribute('href')}">${esc(boton.textContent.trim())}</a></div>`
    + '<div class="mm-datos mm-datos--3">'
    + tels.map(datoTel).join('')
    + `<div class="mm-dato"><span class="mm-dato-rot">${esc(rotLic)}</span><span class="mm-dato-val">${esc(valLic.join(' · '))}</span></div>`
    + '</div></div>'
    + `<figure class="mm-hero-a-medio"><img sizes="(min-width: 992px) 50vw, 100vw" src="${foto.src}" alt="${escAttr(foto.alt)}" width="${foto.ancho}" height="${foto.alto}" loading="eager" fetchpriority="high" decoding="async">`
    + `<figcaption class="mm-pie-foto"><span class="mm-dato-rot">Project</span><span>${esc(foto.pie)}</span></figcaption></figure>`
    + franjaDeLogos(doc);
  hero.replaceWith(nh);
  doc.querySelector('section.logos-section')?.remove();
  const cta = nh.querySelector('.mm-hero-a-acc > a.mm-btn');
  const padre = nh.parentNode;
  const hermana = (x, que) => { if (x.parentNode !== padre) falta(`${que} no es hermana del hero`); return x; };

  // 2 · INTRO: titular, parrafo, sus enlaces a ciudad y «More About Us». Las tres fotos del mosaico
  //     animado salen: no estan en ningun registro, y la lamina de intro no lleva foto.
  const tr = doc.querySelector('section.trusted-section');
  const [th2, tp] = ['.wrapper-vertical-text-copy h2', '.wrapper-vertical-text-copy p'].map((q) => tr?.querySelector(q));
  const ciudades = [...(tr?.querySelectorAll('.list-cities-cms a') ?? [])];
  const mas = [...(tr?.querySelectorAll('a') ?? [])].find((x) => !x.closest('.list-cities-cms'));
  if (!th2 || !tp || !ciudades.length || !mas) falta('la intro de condado no trae titular, parrafo, ciudades y «More About Us»');
  const enlace = (x) => `<a class="mm-flecha" href="${x.getAttribute('href')}">${esc(x.textContent.trim())}${FLECHA}</a>`;
  const ni = doc.createElement('section');
  ni.setAttribute('class', 'svc-intro mm-intro');
  ni.innerHTML = `<div class="mm-marco"><h2 class="mm-h2">${th2.innerHTML}</h2><p class="mm-p">${tp.innerHTML}</p>`
    + `<ul class="mm-intro-lista" role="list">${ciudades.map((x) => `<li>${enlace(x)}</li>`).join('')}</ul>${enlace(mas)}</div>`;
  hermana(tr, 'la intro').replaceWith(ni);

  // 3 · GALERIA EN MOSAICO (la misma funcion que la ficha) y RENDER 3D
  mosaicoDeObra(doc, ruta);
  const gal = hermana(doc.querySelector('section.mm-gal'), 'la galeria');
  const d3 = doc.querySelector('section._3d-section');
  const [dh2, dp] = ['.header-3d-section h2', '.header-3d-section p'].map((q) => d3?.querySelector(q));
  const video = d3?.querySelector('.w-background-video');
  if (!dh2 || !dp || !video) falta('el 3D no trae titular, parrafo y video');
  const n3 = doc.createElement('section');
  n3.setAttribute('class', 'mm-3d');
  n3.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${nb(dh2.innerHTML)}</h2><div class="mm-sec-lado"><p class="mm-p">${dp.innerHTML}</p>`
    + `<div class="mm-sec-acc"><a class="mm-btn mm-btn--linea mm-btn--linea-inv" href="${cta.getAttribute('href')}">${cta.innerHTML}</a></div></div></div>`
    + '<figure class="mm-3d-medio"></figure>';
  n3.querySelector('figure').append(video);   // el nodo tal cual: `limpia()` le pone poster y carga diferida
  hermana(d3, 'el 3D').replaceWith(n3);

  // 4 · PROCESO: las pestanas (un paso a la vista) pasan a lista con los cuatro
  const st = doc.querySelector('section.stepbystep-section');
  const [sh2, sp] = ['.wrapper-vertical-text h2', '.wrapper-vertical-text p'].map((q) => st?.querySelector(q));
  const pasos = [...(st?.querySelectorAll('.w-tab-pane') ?? [])].map((x) => ({ tit: x.querySelector('.content-step-tab h2'), txt: x.querySelector('.text-divider') }));
  if (!sh2 || !sp || pasos.length !== 4 || pasos.some((x) => !x.tit || !x.txt)) falta('el proceso no trae titular, linea y cuatro pasos');
  const np = doc.createElement('section');
  np.setAttribute('class', 'mm-proc mm-proc--sin');
  np.innerHTML = cabeceraDeSeccion(sh2.innerHTML.replace(/(Process)\s*$/, '<span class="mm-rot">$1</span>'), sp.innerHTML, cta)
    // D-134: sin el circulo numerado de la lista. El titulo de cada paso ya trae su «1. » del
    // origen y no se toca; con los dos, el numero se leia dos veces.
    + '<div class="mm-proc-cuerpo"><ol class="mm-pasos mm-pasos--sin-num">'
    + pasos.map((x) => `<li class="mm-paso"><h3 class="mm-paso-t">${x.tit.innerHTML}</h3>${x.txt.innerHTML}</li>`).join('')
    + '</ol></div>';
  hermana(st, 'el proceso').replaceWith(np);

  // 5 · RESENAS: su cabecera con la accion y el enlace al perfil, la lista (la pinta
  //     `ResenasGoogle.astro`), los telefonos y una foto de la bolsa
  const [, fcierre, fres] = [null, ...fotosDeSeccionCiudad(ruta)];
  const res = doc.querySelector('section.testimonial-section');
  const [rlabel, rh2, rp] = ['.header-reviews .label', '.header-reviews h2', '.header-reviews p'].map((q) => res?.querySelector(q));
  const widget = res?.querySelector('[class*="elfsight-app-"]');
  if (!rlabel || !rh2 || !rp || !widget) falta('las resenas no traen rotulo, titular, linea y widget');
  const figura = (f, clase) => (f ? `<figure class="${clase}"><img sizes="(min-width: 992px) 42vw, 100vw" src="${f.src}" alt="${escAttr(f.alt)}" width="${f.ancho}" height="${f.alto}" loading="lazy" decoding="async"></figure>` : '');
  const nr = doc.createElement('section');
  nr.setAttribute('class', `mm-res${fres ? '' : ' mm-res--sin'}`);
  nr.innerHTML = `<div class="mm-sec-cab"><div class="mm-sec-tit"><p class="mm-etiqueta">${rlabel.innerHTML}</p><h2 class="mm-h2">${rh2.innerHTML.replace(/\b(Homeowners)\b/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<div class="mm-sec-lado"><p class="mm-p">${rp.innerHTML}</p><div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${cta.getAttribute('href')}">${cta.innerHTML}</a>`
    + `<a class="mm-flecha" href="${RESENAS_PERFIL}" target="_blank" rel="noopener noreferrer">See all reviews${FLECHA}</a></div></div></div>`
    + `<div class="mm-res-cuerpo"><div class="mm-res-col">${widget.outerHTML}${bandaTel}</div>${figura(fres, 'mm-res-medio')}</div>`;
  hermana(res, 'las resenas').replaceWith(nr);

  // 6 · BANDA DE CIERRE: la banda de media pagina pasa al final, navy, con los telefonos. Conserva
  //     su boton (T-57 lo quita solo donde debajo hay formulario; aqui no lo hay).
  const banda = doc.querySelector('section.cta-page-section');
  const bh2 = banda?.querySelector('h2');
  const bp = bh2?.nextElementSibling;
  const bb = banda?.querySelector('.wrapper-buttons-center a');
  if (!bh2 || !bp || !bb) falta('la banda no trae titular, parrafo y boton');
  const nc = doc.createElement('section');
  nc.setAttribute('class', `mm-cierre mm-cierre--sola${fcierre ? '' : ' mm-cierre--sin'}`);
  nc.innerHTML = '<div class="mm-cierre-caja"><div class="mm-cierre-txt">'
    + `<h2 class="mm-h2">${nb(bh2.innerHTML)}</h2><p class="mm-p">${bp.innerHTML}</p>${bandaTel}`
    + `<a class="mm-btn" href="${bb.getAttribute('href')}">${esc(bb.textContent.trim())}</a></div>`
    + `${figura(fcierre, 'mm-cierre-medio')}</div>`;
  hermana(banda, 'la banda').remove();

  // 7 · ORDEN (lamina «Ciudad»): … intro · galeria · 3D · proceso · proyectos · articulos · resenas · cierre
  const proy = hermana(doc.querySelector('section.projects-section'), 'proyectos');
  const blog = hermana(doc.querySelector('section.blog-section-page'), 'articulos');
  padre.insertBefore(gal, n3);
  padre.insertBefore(np, proy);
  padre.insertBefore(nr, blog.nextSibling);
  padre.insertBefore(nc, nr.nextSibling);
  doc.querySelector('section.social-media')?.remove();
}

/* ── ASTRO-4 · LA FICHA DE PROYECTO (laminas «Proyecto» y «ProyectoDetalle») ──────────────
 * Las 10 fichas de `/project/` que salen del origen. El marcado nuevo lo escribe
 * `src/lib/ficha-proyecto.mjs`, el mismo que usa `FichaObra.astro` para las 5 de autoria propia:
 * aqui solo se LEE el origen —titular, parrafo, los tres datos, el boton, las fotos de la
 * galeria y la banda final— y se le pasa. «More Projects» y el formulario los cuelga el bucle
 * de salida, delante y detras de la banda de cierre. */
/**
 * D-150: «Terms» y «Privacy Policy» del consentimiento de un formulario llevaban a otro dominio
 * (el del origen, con una «s» de mas). Van a las dos rutas legales del sitio, las del pie.
 * Si el origen cambia de forma, para: un enlace legal no se reescribe a medias.
 */
const LEGALES_PROPIOS = [
  ['https://mrandmrsoutdoorsliving.com/terms-of-service', '/articles/terms-conditions'],
  ['https://mrandmrsoutdoorsliving.com/privacy-policy-page', '/articles/privacy-policy'],
];
function legalPropio(html) {
  for (const [de, a] of LEGALES_PROPIOS) {
    if (!html.includes(`href="${de}"`)) throw new Error(`legalPropio: no encuentro ${de} en el consentimiento del formulario`);
    html = html.replace(`href="${de}"`, `href="${a}"`);
  }
  return html;
}

/**
 * ASTRO-4 lote B · `/request-estimated` (lamina «Presupuesto»; D-88, D-87).
 *
 * QUE CONSIGUE: que quien llega desde un boton de presupuesto deje primero como localizarle.
 * El formulario tenia tres pasos y pedia el contacto en el ultimo; ahora son dos, el contacto
 * (nombre, telefono, correo y codigo postal) delante, y el proyecto —servicios, presupuesto,
 * propiedad, plazo y direccion— detras.
 *
 * QUE CAMBIA DE COMPOSICION: el formulario centrado sobre fondo blanco pasa a un bloque partido:
 * foto de obra y, montando sobre ella, el panel del formulario; debajo de la foto, lo que pasa
 * despues de enviar y la franja de logos, que sube dentro del bloque. Detras, solo el pie.
 *
 * LOS CAMPOS SON LOS MISMOS NODOS DEL ORIGEN, con sus `name`, `id`, `data-name` y opciones: se
 * mueven, no se reescriben, y `/api/formulario` recibe lo de siempre. Lo que cambia es quien los
 * mueve entre pasos: el formulario gana `data-mm-pasos` y lo lleva `Formularios.astro`, como el
 * de las fichas (validacion nativa del navegador). El script incrustado de Webflow se queda sin
 * su `#msf` y no hace nada. Los campos de texto no traian etiqueta, solo `placeholder`: ganan la
 * suya, con su `data-name`.
 */
function presupuestoStitch(doc, ruta) {
  if (ruta !== '/request-estimated') return;
  const sec = doc.querySelector('section.appointment-section');
  const form = sec?.querySelector('form');
  const h1 = sec?.querySelector('.header-form-block h1');
  const intro = h1?.nextElementSibling;
  const pasos = [1, 2, 3].map((n) => form?.querySelector(`[data-step="${n}"]`));
  const [done, fail] = ['.w-form-done', '.w-form-fail'].map((q) => sec?.querySelector(q));
  const logos = franjaDeLogos(doc);
  if (!form || !h1 || !intro || pasos.some((x) => !x) || !done || !fail || !logos) throw new Error('/request-estimated: no trae titular, formulario de tres pasos, mensajes y franja de logos');
  const q = (sel) => { const e = form.querySelector(sel); if (!e) throw new Error(`/request-estimated: falta ${sel}`); return e; };
  const prepara = (e, extra = {}) => {
    e.removeAttribute('class'); e.removeAttribute('placeholder');
    if (e.getAttribute('data-required') === 'true') e.setAttribute('required', '');
    e.removeAttribute('data-required');
    for (const [k, v] of Object.entries(extra)) e.setAttribute(k, v);
    return e;
  };
  // Un campo de texto con su etiqueta nueva (el `data-name` del propio campo).
  const campo = (sel, extra) => {
    const e = prepara(q(sel), extra);
    const opc = e.hasAttribute('required') ? '' : ' <span class="mm-campo-opc">(optional)</span>';
    return `<div class="mm-campo"><label for="${e.id}">${e.getAttribute('data-name')}${opc}</label>${e.outerHTML}</div>`;
  };
  // Un desplegable con la etiqueta que ya traia.
  const lista = (sel) => {
    const e = q(sel);
    const lab = e.parentElement.querySelector('label');
    if (!lab) throw new Error(`/request-estimated: ${sel} no trae etiqueta`);
    return `<div class="mm-campo"><label for="${e.id}">${lab.innerHTML}</label>${prepara(e).outerHTML}</div>`;
  };
  const cab = (p) => { const h = p.querySelector('.header-form h2'); const t = h?.nextElementSibling; if (!h || !t) throw new Error('/request-estimated: un paso no trae titular y texto'); return { h: h.innerHTML, t: t.innerHTML }; };
  const [c1, c2, c3] = pasos.map(cab);
  const servicios = [...pasos[0].querySelectorAll('.services-form label.w-checkbox')].map((l) => {
    const i = l.querySelector('input'); i.removeAttribute('class');
    return `<label class="mm-opcion">${i.outerHTML}${l.querySelector('.w-form-label').textContent.trim()}</label>`;
  });
  if (servicios.length !== 14) throw new Error(`/request-estimated: ${servicios.length} servicios y son 14`);
  const acepto = q('#Checkbox'); acepto.removeAttribute('class');
  const aceptoTxt = acepto.parentElement.querySelector('.w-form-label')?.innerHTML;
  const envia = q('input[type="submit"]');
  const legal = legalPropio(q('.text-block-7').innerHTML.replace(/ class="link-4"/g, ''));
  const sig = q('#msf-next').textContent.trim();
  const atras = q('#msf-back').textContent.trim();
  if (!aceptoTxt) throw new Error('/request-estimated: la casilla de consentimiento no trae texto');
  const pastilla = (n) => `<div class="mm-form-cab"><span class="mm-pastilla" id="pres-paso-${n}">Step ${n} of 2</span><span class="mm-progreso" aria-hidden="true"><span class="hecho"></span><span${n === 2 ? ' class="hecho"' : ''}></span></span></div>`;
  const paso1 = `<div class="mm-form-paso" data-paso="1" role="group" aria-labelledby="pres-paso-1">${pastilla(1)}`
    + `<div class="mm-form-intro"><h2 class="mm-form-pasos-t">${c3.h}</h2><p class="mm-p">${c3.t}</p></div>`
    + `<div class="mm-form-rejilla">${campo('#Full-Name', { autocomplete: 'name' })}${campo('#Phone', { autocomplete: 'tel', pattern: '[0-9()+\\-\\s]{7,}' })}`
    + `${campo('#email', { autocomplete: 'email' })}${campo('#ZIP-Code', { autocomplete: 'postal-code', inputmode: 'numeric' })}</div>`
    + `<div class="mm-form-pie"><button type="button" class="mm-btn" data-mm-sig hidden>${sig}</button></div></div>`;
  const paso2 = `<div class="mm-form-paso" data-paso="2" role="group" aria-labelledby="pres-paso-2">${pastilla(2)}`
    + `<div class="mm-form-intro"><h2 class="mm-form-pasos-t" id="pres-servicios">${c1.h}</h2><p class="mm-p">${c1.t}</p></div>`
    + `<div class="mm-form-rejilla">${lista('#Estimated-Project-Budget')}${lista('#Type')}${lista('#Timeline')}</div>`
    + `<div class="mm-opciones mm-opciones--2" role="group" aria-labelledby="pres-servicios">${servicios.join('')}</div>`
    + `<div class="mm-form-intro"><h3 class="mm-form-pasos-t">${c2.h}</h3><p class="mm-p">${c2.t}</p></div>`
    + `<div class="mm-form-rejilla">${campo('#Street-Address', { autocomplete: 'address-line1' })}${campo('#City', { autocomplete: 'address-level2' })}${campo('#State', { autocomplete: 'address-level1' })}</div>`
    + `<label class="mm-consent">${acepto.outerHTML}<span>${aceptoTxt}</span></label>`
    + `<div class="mm-form-pie"><button type="button" class="mm-btn mm-btn--linea" data-mm-atras hidden>${atras}</button>`
    + `<input type="submit" data-wait="${escAttr(envia.getAttribute('data-wait') ?? '')}" class="mm-btn" value="${escAttr(envia.getAttribute('value'))}"></div>`
    + `<p class="mm-form-legal">${legal}</p></div>`;
  form.setAttribute('class', 'mm-form');
  form.setAttribute('data-mm-pasos', '');
  // El campo trampa (`ref_id`) lo anade mas abajo el paso comun de formularios.
  form.innerHTML = paso1 + paso2;
  // E12 (D-197): junto al formulario, la obra mas completa (piscina, cubierta, barra y tumbonas). En movil es la LCP.
  const foto = BANCO_POR_ID.get('bi-1280');
  if (!foto || foto.procedencia !== 'obra_real' || !foto.alt) throw new Error('/request-estimated: la foto del bloque no es obra real con alt');
  const cap = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'))['/services/pool-builders'].formulario;
  const ns = doc.createElement('section');
  ns.setAttribute('class', 'mm-pres');
  ns.innerHTML = `<div class="mm-sec-cab"><h1 class="mm-h1">${h1.textContent.trim().replace(/&/g, '&amp;').replace(/(Outdoor Living)/, '<span class="mm-rot">$1</span>')}</h1>`
    + `<div class="mm-sec-lado"><p class="mm-p">${intro.innerHTML}</p></div></div>`
    + '<div class="mm-pres-cuerpo">'
    // E12: en movil la caja es una franja con la tarjeta del formulario encima de su borde inferior; el
    // encuadre baja para que se vean la cubierta, las tumbonas y el borde de la piscina. En escritorio es 4:3, como la foto.
    + `<figure class="mm-pres-medio"><img src="${foto.src}" alt="${escAttr(foto.alt)}" width="${foto.ancho}" height="${foto.alto}" sizes="(min-width: 992px) 45vw, 100vw" loading="eager" fetchpriority="high" decoding="async" style="object-position:50% 85%"></figure>`
    + `<div class="mm-form-panel">${form.outerHTML}${done.outerHTML}${fail.outerHTML}</div>`
    + `<aside class="mm-pres-lado"><div><h2 class="mm-form-pasos-t">${cap.pasosTitulo}</h2><ol class="mm-form-pasos" role="list">${cap.pasos.map((x) => `<li>${x}</li>`).join('')}</ol></div>${logos}</aside>`
    + '</div>';
  sec.replaceWith(ns);
  doc.querySelector('section.logos-section')?.remove();
}

/**
 * ASTRO-4 lote B · `/contact-us` (lamina «Contacto»; D-93, D-76).
 *
 * QUE CONSIGUE: que quien quiere escribir tenga el formulario en la primera pantalla y, al lado,
 * las otras tres formas de llegar (correo y los dos telefonos).
 *
 * QUE CAMBIA DE COMPOSICION: el hero oscuro y la caja de contacto sobre foto pasan a hero claro y
 * a un bloque partido —datos de contacto a un lado, panel del formulario al otro—; las zonas van
 * en dos columnas con su telefono y el mapa, las resenas en lista y la banda final gana foto.
 *
 * EL FORMULARIO SIGUE SIENDO EL SUYO, DE UN PASO (D-93): los mismos campos con sus `name`, `id` y
 * opciones, el mismo destino. El unico boton oro de la pagina es el de envio (D-76): los otros
 * dos «Get a Free Estimate» van en navy y en linea. Sale el `autofocus` que traian cuatro campos
 * (se llevaba el foco, y la vista, al formulario nada mas cargar).
 */
function contactoStitch(doc, ruta) {
  if (ruta !== '/contact-us') return;
  const falta = (que) => { throw new Error(`/contact-us: ${que}`); };
  const hero = doc.querySelector('section.hero-section');
  const [h1, htx] = ['h1', '.text-block-4'].map((q) => hero?.querySelector(q));
  const sec = doc.querySelector('section.form-section');
  const [bh2, bp] = ['.header-box-info h2', '.header-box-info p'].map((q) => sec?.querySelector(q));
  const correo = sec?.querySelector('a[href^="mailto:"]');
  const tels = [...(sec?.querySelectorAll('.phone-wrapper a[href^="tel:"]') ?? [])];
  const zona = sec?.querySelector('.wrapper-icons > div.label');
  const bcta = sec?.querySelector('.box-info-contact .wrapper-buttons a');
  const form = sec?.querySelector('form');
  const [done, fail] = ['.w-form-done', '.w-form-fail'].map((q) => sec?.querySelector(q));
  if (!h1 || !htx || !bh2 || !bp || !correo || tels.length !== 2 || !zona || !bcta || !form || !done || !fail) falta('no trae hero, caja de contacto con correo, dos telefonos, zona y boton, y formulario con sus mensajes');
  const q = (sel) => form.querySelector(sel) ?? falta(`falta ${sel}`);
  const prepara = (e) => { e.removeAttribute('class'); e.removeAttribute('autofocus'); if (e.getAttribute('placeholder') === '') e.removeAttribute('placeholder'); return e; };
  const campo = (sel) => {
    const e = q(sel);
    const lab = form.querySelector(`label[for="${e.id}"]`) ?? falta(`${sel} no trae etiqueta`);
    return `<div class="mm-campo"><label for="${e.id}">${lab.innerHTML}</label>${prepara(e).outerHTML}</div>`;
  };
  const radios = [...form.querySelectorAll('.wrapper-radio-buttons label.w-radio')].map((l) => {
    const i = l.querySelector('input'); i.removeAttribute('class');
    return `<label class="mm-opcion">${i.outerHTML}${l.querySelector('.w-form-label').textContent.trim()}</label>`;
  });
  const rotRadios = form.querySelector('.wrapper-radio-buttons')?.parentElement.querySelector(':scope > label')?.innerHTML;
  const acepto = q('#Checkbox'); acepto.removeAttribute('class');
  const aceptoTxt = acepto.parentElement.querySelector('.w-form-label')?.innerHTML;
  const envia = q('input[type="submit"]');
  const legal = legalPropio(q('.text-block-7').innerHTML.replace(/ class="link-4"/g, ''));
  if (radios.length !== 6 || !rotRadios || !aceptoTxt) falta('el formulario no trae sus seis opciones, su rotulo y el consentimiento');
  const campos = '<div class="mm-form-rejilla">' + ['#First-Name', '#Last-Name', '#Email', '#Phone-Number'].map(campo).join('') + '</div>'
    + campo('#Project-Type')
    + `<fieldset class="mm-grupo-campo"><legend>${rotRadios}</legend><div class="mm-opciones">${radios.join('')}</div></fieldset>`
    + campo('#Message')
    + `<label class="mm-consent">${acepto.outerHTML}<span>${aceptoTxt}</span></label>`
    + `<div class="mm-form-pie"><input type="submit" data-wait="${escAttr(envia.getAttribute('data-wait') ?? '')}" class="mm-btn" value="${escAttr(envia.getAttribute('value'))}"><p class="mm-form-legal">${legal}</p></div>`;
  form.setAttribute('class', 'mm-form mm-form--uno');
  form.innerHTML = campos;
  const nh = doc.createElement('section');
  nh.setAttribute('class', 'mm-hero-d');
  nh.innerHTML = `<div class="mm-hero-d-caja"><div class="mm-sec-cab"><h1 class="mm-h1">${h1.innerHTML}</h1><div class="mm-sec-lado"><p class="mm-p">${htx.innerHTML}</p></div></div></div>`;
  hero.replaceWith(nh);
  const fila = (a) => `<a class="mm-contacto-fila" href="${a.getAttribute('href')}">${a.innerHTML}</a>`;
  const ns = doc.createElement('section');
  ns.setAttribute('class', 'mm-contacto');
  ns.innerHTML = '<div class="mm-contacto-caja"><div class="mm-contacto-lado">'
    + `<h2 class="mm-h2">${bh2.innerHTML.trim().replace(/\b(Vision)\b/, '<span class="mm-rot">$1</span>')}</h2><p class="mm-p">${bp.innerHTML}</p>`
    + `<div class="mm-contacto-filas">${fila(correo)}${tels.map(fila).join('')}<p class="mm-contacto-fila">${zona.innerHTML}</p></div>`
    + `<a class="mm-btn mm-btn--navy" href="${bcta.getAttribute('href')}" target="_blank" rel="noopener">${bcta.innerHTML}</a></div>`
    + `<div class="mm-form-panel">${form.outerHTML}${done.outerHTML}${fail.outerHTML}</div></div>`;
  sec.replaceWith(ns);

  // ZONAS, RESENAS y BANDA FINAL: las mismas piezas que la ficha de servicio (§ listasDePlano).
  const zon = doc.querySelector('section.location');
  const zh2 = zon?.querySelector('.header-location h2');
  const zlema = zon?.querySelector('.header-location p');
  const zonas = [...(zon?.querySelectorAll('.item-country') ?? [])].map((it) => ({ t: it.querySelector('h3'), p: it.querySelector('.block-info-country p'), a: it.querySelector('a') }));
  if (!zh2 || !zlema || zonas.length !== 2 || zonas.some((z) => !z.t || !z.p || !z.a)) falta('«Where We Serve» no trae rotulo, lema y dos zonas con texto y enlace');
  zonas.sort((x, y) => TELEFONOS.findIndex((t) => t.zona === x.t.textContent.trim()) - TELEFONOS.findIndex((t) => t.zona === y.t.textContent.trim()));
  const nz = doc.createElement('section');
  nz.setAttribute('class', 'mm-zonas');
  nz.innerHTML = '<div class="mm-zonas-caja"><div class="mm-zonas-txt">'
    + `<div class="mm-sec-tit"><h2 class="mm-etiqueta">${zh2.innerHTML}</h2><p class="mm-h2">${zlema.innerHTML.replace(/\b(Coverage)\b/, '<span class="mm-rot">$1</span>')}</p></div>`
    + '<div class="mm-zonas-lista">' + zonas.map((z) => {
      const tel = TELEFONOS.find((t) => t.zona === z.t.textContent.trim()) ?? falta(`la zona «${z.t.textContent.trim()}» no tiene telefono`);
      return `<article class="mm-zona"><h3 class="mm-zona-t">${z.t.innerHTML}</h3><p>${z.p.innerHTML}</p>`
        + `<div class="mm-datos"><a class="mm-dato" href="tel:${tel.tel}"><span class="mm-dato-rot">${tel.zona}</span><span class="mm-dato-val">${tel.visible}</span></a></div>`
        + `<a class="mm-flecha" href="${z.a.getAttribute('href')}">${z.a.innerHTML}${FLECHA}</a></article>`;
    }).join('') + '</div></div>'
    + '<svg class="mm-mapa" viewBox="0 0 420 460" aria-hidden="true" focusable="false">'
    + '<path d="M20 60 H250 L262 40 H330 L352 92 L372 150 L386 214 L392 280 L384 340 L360 392 L334 420 L318 404 L300 350 L270 300 L246 250 L226 196 L214 150 L196 118 L150 104 L96 110 L60 96 L20 92 Z" class="mm-plano-vaso"></path>'
    + '<path d="M212 200 L392 236" class="mm-plano-cota" stroke-dasharray="6 6"></path>'
    + '<circle cx="300" cy="130" r="5" class="mm-plano-punto"></circle><circle cx="348" cy="330" r="5" class="mm-plano-punto"></circle></svg></div>';
  const res = doc.querySelector('section.testimonial-section');
  const [rlabel, rh2, rp] = ['.header-reviews .label', '.header-reviews h2', '.header-reviews p'].map((x) => res?.querySelector(x));
  const widget = res?.querySelector('[class*="elfsight-app-"]');
  const fin = doc.querySelector('section.cta-footer');
  const [fh2, fp, fa] = ['h2', '.text-block-3', 'a'].map((x) => fin?.querySelector(x));
  if (!rlabel || !rh2 || !rp || !widget || !fh2 || !fp || !fa) falta('las resenas o la banda final no traen lo de siempre');
  const bolsa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/heroes-ciudad.json'), 'utf8')).bolsas['pool-builders'];
  const [fres, fcie] = [4, 5].map((k) => { const e = BANCO_POR_ID.get(bolsa[k]); if (!e || e.procedencia !== 'obra_real' || !e.alt) falta(`la foto ${k} de la bolsa no es obra real con alt`); return e; });
  const img = (e, sizes) => `<img src="${e.src}" alt="${escAttr(e.alt)}" width="${e.ancho}" height="${e.alto}" sizes="${sizes}" loading="lazy" decoding="async">`;
  const nr = doc.createElement('section');
  nr.setAttribute('class', 'mm-res');
  nr.innerHTML = `<div class="mm-sec-cab"><div class="mm-sec-tit"><p class="mm-etiqueta">${rlabel.innerHTML}</p><h2 class="mm-h2">${rh2.innerHTML.replace(/\b(Clients)\b/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<div class="mm-sec-lado"><p class="mm-p">${rp.innerHTML}</p><div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${fa.getAttribute('href')}">${fa.innerHTML}</a>`
    + `<a class="mm-flecha" href="${RESENAS_PERFIL}" target="_blank" rel="noopener noreferrer">See all reviews${FLECHA}</a></div></div></div>`
    + `<div class="mm-res-cuerpo"><div class="mm-res-col">${widget.outerHTML}${BANDA_TELEFONOS}</div>`
    + `<figure class="mm-res-medio">${img(fres, '(min-width: 992px) 33vw, 100vw')}</figure></div>`;
  const nc = doc.createElement('section');
  nc.setAttribute('class', 'mm-cierre mm-cierre--sola mm-cierre--alta');
  nc.innerHTML = '<div class="mm-cierre-caja"><div class="mm-cierre-txt">'
    + `<h2 class="mm-h2">${fh2.innerHTML.replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>')}</h2><p class="mm-p">${fp.innerHTML}</p>`
    + `<a class="mm-btn mm-btn--linea mm-btn--linea-inv" href="${fa.getAttribute('href')}">${fa.innerHTML}</a>${BANDA_TELEFONOS}</div>`
    + `<figure class="mm-cierre-medio">${img(fcie, '(min-width: 992px) 42vw, 100vw')}</figure></div>`;
  zon.remove(); res.remove();
  ns.parentNode.insertBefore(nz, ns.nextSibling);
  nz.parentNode.insertBefore(nr, nz.nextSibling);
  fin.replaceWith(nc);
}

/**
 * ASTRO-4 lote C · LAS DOS PIEZAS COMUNES de las paginas que no tienen lamina propia.
 *
 * `heroD`: el `section.hero-section` de Webflow (titular centrado sobre azul, con filete) pasa al
 * hero D del sistema: titular a la izquierda y entradilla a la derecha, sobre blanco. Mismo `h1`,
 * mismo texto. Devuelve la seccion nueva.
 *
 * `bandaFinal`: `section.cta-footer` pasa a la banda navy del sistema, con su titular, su parrafo
 * y su boton, los dos telefonos (T-56) y una foto de obra de la bolsa de `heroes-ciudad.json`
 * (obra real, terminada, recorte 4:5 seguro). `k` elige la foto, para que no sea la misma en
 * todas las paginas; o es el id del banco cuando la pagina tiene la suya (E12, D-197).
 */
const BOLSA_BANDA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/heroes-ciudad.json'), 'utf8')).bolsas['pool-builders'];
function heroD(doc, ruta) {
  const hero = doc.querySelector('section.hero-section');
  const h1 = hero?.querySelector('h1');
  const tx = hero?.querySelector('.text-block-4');
  if (!h1) throw new Error(`${ruta}: el hero no trae titular`);
  const nh = doc.createElement('section');
  nh.setAttribute('class', 'mm-hero-d');
  nh.innerHTML = `<div class="mm-hero-d-caja"><div class="mm-sec-cab"><h1 class="mm-h1">${h1.innerHTML}</h1>${tx ? `<div class="mm-sec-lado"><p class="mm-p">${tx.innerHTML}</p></div>` : ''}</div></div>`;
  hero.replaceWith(nh);
  return nh;
}
function bandaFinal(doc, ruta, k) {
  const fin = doc.querySelector('section.cta-footer');
  const [h2, p, a] = ['h2', '.text-block-3', 'a'].map((q) => fin?.querySelector(q));
  if (!h2 || !p || !a) throw new Error(`${ruta}: la banda final no trae titular, parrafo y boton`);
  const e = BANCO_POR_ID.get(typeof k === 'string' ? k : BOLSA_BANDA[k % BOLSA_BANDA.length]);
  if (!e || e.procedencia !== 'obra_real' || !e.alt) throw new Error(`${ruta}: la foto de la banda no es obra real con alt`);
  const nc = doc.createElement('section');
  nc.setAttribute('class', 'mm-cierre mm-cierre--sola mm-cierre--alta');
  nc.innerHTML = '<div class="mm-cierre-caja"><div class="mm-cierre-txt">'
    + `<h2 class="mm-h2">${h2.innerHTML.replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>')}</h2><p class="mm-p">${p.innerHTML}</p>`
    + `<a class="mm-btn" href="${a.getAttribute('href')}">${a.innerHTML}</a>${BANDA_TELEFONOS}</div>`
    + `<figure class="mm-cierre-medio"><img src="${e.src}" alt="${escAttr(e.alt)}" width="${e.ancho}" height="${e.alto}" sizes="(min-width: 992px) 42vw, 100vw" loading="lazy" decoding="async"></figure></div>`;
  fin.replaceWith(nc);
  return nc;
}

/**
 * ASTRO-4 lote C · LAS TRES LEGALES (`/articles/*`; lamina «Legal»). El titular sale del cuerpo y
 * abre la pagina en el hero D; el cuerpo pasa a la columna de lectura del articulo (`.mm-prosa`),
 * sin tarjeta al lado; y la banda final, a la del sistema. El texto y su orden no cambian.
 * `check-encabezados.mjs` deja de esperar el `h1` dentro del cuerpo.
 */
function legalStitch(doc, ruta) {
  if (!ruta.startsWith('/articles/')) return;
  const sec = doc.querySelector('section.article-body');
  const rt = sec?.querySelector('.w-richtext');
  const h1 = rt?.querySelector('h1');
  if (!h1) throw new Error(`${ruta}: la pagina legal no trae su titular dentro del cuerpo`);
  const titulo = h1.innerHTML;
  h1.remove();
  const ns = doc.createElement('section');
  ns.setAttribute('class', 'mm-lect mm-lect--sola');
  // Con el titular fuera, los apartados (`h3` en el origen, colgados del `h1` del cuerpo) pasan a
  // `h2`: es su nivel de verdad y `check:encabezados` lo exige.
  ns.innerHTML = `<div class="mm-prosa mm-prosa--legal">${rt.innerHTML.replace(/<(\/?)h3\b/g, '<$1h2')}</div>`;
  const nh = doc.createElement('section');
  nh.setAttribute('class', 'mm-hero-d');
  nh.innerHTML = `<div class="mm-hero-d-caja"><div class="mm-sec-cab"><h1 class="mm-h1">${titulo}</h1></div></div>`;
  sec.replaceWith(ns);
  ns.parentNode.insertBefore(nh, ns);
  bandaFinal(doc, ruta, 6 + ['accessibility', 'privacy-policy', 'terms-conditions'].indexOf(ruta.split('/').pop()));
}

/**
 * ASTRO-4 lote C · `/testimonials` y `/videos` (sin lamina propia: hero D y piezas aprobadas).
 *
 * `/testimonials`: el titular y su entradilla en el hero, con el enlace al perfil de Google; las
 * ocho resenas en lista (no en carrusel) con una foto de obra al lado y los dos telefonos; banda.
 * `/videos`: hero, la galeria de YouTube tal cual (es un componente con su hoja propia), las
 * resenas con su cabecera de siempre en lista, y la banda.
 * Las resenas las pinta `ResenasGoogle.astro` en su rama de lista. Mismos textos.
 */
function fotoBolsa(ruta, k) {
  const e = BANCO_POR_ID.get(BOLSA_BANDA[k % BOLSA_BANDA.length]);
  if (!e || e.procedencia !== 'obra_real' || !e.alt) throw new Error(`${ruta}: la foto ${k} de la bolsa no es obra real con alt`);
  return `<img src="${e.src}" alt="${escAttr(e.alt)}" width="${e.ancho}" height="${e.alto}" sizes="(min-width: 992px) 33vw, 100vw" loading="lazy" decoding="async">`;
}
const VER_RESENAS = () => `<a class="mm-flecha" href="${RESENAS_PERFIL}" target="_blank" rel="noopener noreferrer">See all reviews${FLECHA}</a>`;
function testimoniosStitch(doc, ruta) {
  if (ruta !== '/testimonials') return;
  const nh = heroD(doc, ruta);
  const sec = doc.querySelector('section.testimonials-page-section');
  const widget = sec?.querySelector('[class*="elfsight-app-"]');
  const lado = nh.querySelector('.mm-sec-lado');
  if (!widget || !lado) throw new Error('/testimonials: no trae entradilla y widget de resenas');
  lado.insertAdjacentHTML('beforeend', `<div class="mm-sec-acc">${VER_RESENAS()}</div>`);
  const ns = doc.createElement('section');
  ns.setAttribute('class', 'mm-res mm-res--pagina');
  ns.innerHTML = `<div class="mm-res-cuerpo"><div class="mm-res-col">${widget.outerHTML}${BANDA_TELEFONOS}</div><figure class="mm-res-medio">${fotoBolsa(ruta, 9)}</figure></div>`;
  sec.replaceWith(ns);
  bandaFinal(doc, ruta, 10);
}
/** Las resenas con su cabecera de siempre (rotulo, titular, entradilla), en lista: la accion de la
 *  pagina y el enlace al perfil en la cabecera, los dos telefonos detras y una foto de obra al lado. */
function resenasConCabecera(doc, ruta, k) {
  const res = doc.querySelector('section.testimonial-section');
  const [rlabel, rh2, rp] = ['.header-reviews .label', '.header-reviews h2', '.header-reviews p'].map((x) => res?.querySelector(x));
  const widget = res?.querySelector('[class*="elfsight-app-"]');
  const fa = doc.querySelector('section.cta-footer a');
  if (!rlabel || !rh2 || !rp || !widget || !fa) throw new Error(`${ruta}: no trae las resenas con su cabecera y la banda`);
  const nr = doc.createElement('section');
  nr.setAttribute('class', 'mm-res');
  nr.innerHTML = `<div class="mm-sec-cab"><div class="mm-sec-tit"><p class="mm-etiqueta">${rlabel.innerHTML}</p><h2 class="mm-h2">${rh2.innerHTML.replace(/\b(Clients)\b/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<div class="mm-sec-lado"><p class="mm-p">${rp.innerHTML}</p><div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${fa.getAttribute('href')}">${fa.innerHTML}</a>${VER_RESENAS()}</div></div></div>`
    + `<div class="mm-res-cuerpo"><div class="mm-res-col">${widget.outerHTML}${BANDA_TELEFONOS}</div><figure class="mm-res-medio">${fotoBolsa(ruta, k)}</figure></div>`;
  res.replaceWith(nr);
}
function videosStitch(doc, ruta) {
  if (ruta !== '/videos') return;
  heroD(doc, ruta);
  const sec = doc.querySelector('section.videos-section');
  const yt = sec?.querySelector('[class*="elfsight-app-"]');
  if (!yt) throw new Error('/videos: no trae la galeria de videos');
  const nv = doc.createElement('section');
  nv.setAttribute('class', 'mm-videos');
  nv.innerHTML = `<div class="mm-videos-caja">${yt.outerHTML}</div>`;
  sec.replaceWith(nv);
  resenasConCabecera(doc, ruta, 0);
  bandaFinal(doc, ruta, 1);
}

/**
 * ASTRO-4 lote C · `/projects`, el indice de las 15 obras (sin lamina propia: hero D y la tarjeta
 * de obra del sistema).
 *
 * QUE CAMBIA DE COMPOSICION: las tarjetas con su caja, su sombra y un boton oro cada una pasan a la
 * ficha de obra del sistema —foto, titular, relato y enlace de linea—, entera pulsable, en dos
 * columnas (tres desde 1200). El oro de la pagina es el de la cabecera.
 *
 * Cada obra sigue siendo su `.cms-item-work` con su `data-servicios`, que es lo que lee el filtro
 * (`FiltroProyectos.astro`). Mismo titular, mismo relato, mismo enlace y en el mismo orden.
 */
/**
 * ASTRO-4 lote C · `/industry-solutions` (sin lamina propia: hero D y piezas aprobadas).
 *
 * QUE CAMBIA DE COMPOSICION: eran tres carruseles apilados —el de galeria sacaba la pagina de su
 * ancho a 1440— y las diez fotos se ensenaban dos veces, una en cada carrusel. Ahora se lee de
 * arriba abajo: con quien trabajamos, en cuatro bloques de texto; la galeria, en un muro de
 * diez fotos de obra real del banco (D-152) que se abren en el visor de siempre; los diez tipos de propiedad, en un indice de
 * nombre y frase, todos a la vista; las resenas en lista, las obras con la ficha del sistema
 * (`CarruselProyectos.astro`, rama de lista) y la banda final.
 * Mismos textos y mismo orden. Sale la foto vertical que hacia de centro del primer bloque y
 * las diez fotos repetidas del tercero: cada foto se ensena una vez.
 */
function industriasStitch(doc, ruta) {
  if (ruta !== '/industry-solutions') return;
  heroD(doc, ruta);
  const foto = (img, sizes) => {
    // D-152: las diez fotos de la galeria llegan ya canjeadas por `fotosPorRuta()` (obra real del
    // banco), con su src, su alt y sus medidas.
    const [src, w, h] = ['src', 'width', 'height'].map((k) => img.getAttribute(k));
    if (!src?.startsWith('/images/banco/') || !w || !h) throw new Error(`${ruta}: ${src} no es una foto del banco con medidas (fotos-por-ruta.json)`);
    return `<img src="${src}" alt="${escAttr(img.getAttribute('alt') ?? '')}" width="${w}" height="${h}" sizes="${sizes}" loading="lazy" decoding="async">`;
  };

  const pub = doc.querySelector('section.industries-section');
  // D-152: los cuatro publicos van sin foto (las suyas no estaban en ningun registro): la lista de
  // confianza del sistema, que esta hecha para cuatro.
  const publicos = [...(pub?.querySelectorAll('.industrie-component') ?? [])].map((c) => ['h3', 'p'].map((q) => c.querySelector(q)));
  if (publicos.length !== 4 || publicos.some((c) => c.some((n) => !n))) throw new Error(`${ruta}: el primer bloque no trae sus cuatro publicos con titulo y parrafo`);
  const np = doc.createElement('section');
  np.setAttribute('class', 'mm-conf mm-conf--sola');
  np.innerHTML = '<div class="mm-conf-caja"><ul class="mm-conf-lista" role="list">' + publicos.map(([h, p]) =>
    `<li class="mm-conf-item"><h2 class="mm-conf-t">${h.innerHTML}</h2><p class="mm-conf-p">${p.innerHTML}</p></li>`).join('') + '</ul></div>';
  pub.replaceWith(np);

  const gal = doc.querySelector('section.gallery');
  const [gh2, gp] = ['.header-gallery h2', '.header-gallery h2 + div'].map((q) => gal?.querySelector(q));
  const enlaces = [...(gal?.querySelectorAll('a.w-lightbox') ?? [])];
  if (!gh2 || !gp || enlaces.length !== 10 || enlaces.some((a) => !a.querySelector('img') || !a.querySelector('script.w-json'))) throw new Error(`${ruta}: la galeria no trae su cabecera y sus diez fotos con visor`);
  // Dos filas de 7+5 y dos de tres. En movil, a dos columnas: la grande y las que quedarian sueltas, enteras.
  const PIEZAS = [7, 5, 4, 4, 4, 5, 7, 4, 4, 4];
  const ENTERAS = new Set([0, 5, 6, 9]);
  const ng = doc.createElement('section');
  ng.setAttribute('class', 'mm-muro-sec mm-ind-gal');
  ng.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${gh2.innerHTML}</h2><div class="mm-sec-lado"><p class="mm-p">${gp.innerHTML}</p></div></div><div class="mm-muro" role="list">`
    + enlaces.map((a, k) => `<div role="listitem" class="mm-muro-foto mm-muro-foto--${PIEZAS[k]}${ENTERAS.has(k) && PIEZAS[k] !== 7 ? ' mm-muro-foto--ancha' : ''}"><a href="#" class="${a.getAttribute('class')}">`
      + foto(a.querySelector('img'), `(min-width: 768px) ${{ 7: 58, 5: 42, 4: 33 }[PIEZAS[k]]}vw, ${ENTERAS.has(k) ? 100 : 50}vw`)
      + `${a.querySelector('script.w-json').outerHTML}</a></div>`).join('') + '</div>';
  gal.replaceWith(ng);

  const ind = doc.querySelector('section.industries-section-page');
  const [ih2, ip] = ['.header-industries h2', '.header-industries p'].map((q) => ind?.querySelector(q));
  const tipos = [...(ind?.querySelectorAll('.card') ?? [])].map((c) => ['h3', '.content-card p'].map((q) => c.querySelector(q)));
  if (!ih2 || !ip || tipos.length !== 10 || tipos.some((c) => c.some((n) => !n))) throw new Error(`${ruta}: el bloque de industrias no trae su cabecera y sus diez tipos con frase`);
  const ni = doc.createElement('section');
  ni.setAttribute('class', 'mm-rel mm-ind-tipos');
  ni.innerHTML = `<div class="mm-rel-caja"><div class="mm-rel-cab"><h2 class="mm-h2">${ih2.innerHTML}</h2><p class="mm-p">${ip.innerHTML}</p></div>`
    + '<ul class="mm-indice" role="list">' + tipos.map(([h, p]) => `<li class="mm-linea mm-linea--doble"><div class="mm-linea-txt"><h3 class="mm-linea-t">${h.innerHTML}</h3><p class="mm-linea-p">${p.innerHTML}</p></div></li>`).join('') + '</ul></div>';
  ind.replaceWith(ni);

  resenasConCabecera(doc, ruta, 4);
  bandaFinal(doc, ruta, 3);
}

/**
 * «Where We Serve» (lamina «Zonas»): `section.location` del origen —dos tarjetas con foto de fondo—
 * pasa a dos columnas de texto, norte delante, cada una con su telefono y su enlace, junto al mapa
 * en linea. Es la misma pieza de la ficha y de `/contact-us`, para las paginas que no pasan por ahi.
 */
function zonasDeLocation(doc, ruta) {
  const zon = doc.querySelector('section.location');
  const [zh2, zlema] = ['.header-location h2', '.header-location p'].map((q) => zon?.querySelector(q));
  const zonas = [...(zon?.querySelectorAll('.item-country') ?? [])].map((it) => ({ t: it.querySelector('h3'), p: it.querySelector('.block-info-country p'), a: it.querySelector('a') }));
  if (!zh2 || !zlema || zonas.length !== 2 || zonas.some((z) => !z.t || !z.p || !z.a)) throw new Error(`${ruta}: «Where We Serve» no trae rotulo, lema y dos zonas con texto y enlace`);
  const telDe = (z) => TELEFONOS.find((t) => t.zona === z.t.textContent.trim());
  if (zonas.some((z) => !telDe(z))) throw new Error(`${ruta}: una zona de «Where We Serve» no tiene telefono`);
  zonas.sort((x, y) => TELEFONOS.indexOf(telDe(x)) - TELEFONOS.indexOf(telDe(y)));
  const nz = doc.createElement('section');
  nz.setAttribute('class', 'mm-zonas');
  nz.innerHTML = '<div class="mm-zonas-caja"><div class="mm-zonas-txt">'
    + `<div class="mm-sec-tit"><h2 class="mm-etiqueta">${zh2.innerHTML}</h2><p class="mm-h2">${zlema.innerHTML.replace(/\b(Coverage)\b/, '<span class="mm-rot">$1</span>')}</p></div>`
    + '<div class="mm-zonas-lista">' + zonas.map((z) => `<article class="mm-zona"><h3 class="mm-zona-t">${z.t.innerHTML}</h3><p>${z.p.innerHTML}</p>`
      + `<div class="mm-datos"><a class="mm-dato" href="tel:${telDe(z).tel}"><span class="mm-dato-rot">${telDe(z).zona}</span><span class="mm-dato-val">${telDe(z).visible}</span></a></div>`
      + `<a class="mm-flecha" href="${z.a.getAttribute('href')}">${z.a.innerHTML}${FLECHA}</a></article>`).join('') + '</div></div>'
    + MAPA_FLORIDA + '</div>';
  zon.replaceWith(nz);
}

/**
 * ASTRO-4 lote C · `/about` (lamina «About»).
 *
 * QUE CAMBIA DE COMPOSICION. La pagina era un hero oscuro con los fundadores recortados, tarjetas
 * con icono, tres filas alternas de foto y texto y dos tarjetas de zona con foto de fondo. Ahora:
 *   · hero partido: titular, subtitulo, parrafo y los dos telefonos, y al lado la foto ENTERA de
 *     los fundadores (la que estaba en «Meet Rob & Val»; sale el recorte con transparencia);
 *   · «What Sets Us Apart»: las seis razones en rejilla de tres, sin iconos;
 *   · «Why … Choose»: mision y vision a un lado, y los cuatro valores con su letra al otro;
 *   · la gestion de obra, en tres pasos con la foto que acompana al paso que se lee (la pieza de
 *     proceso de la ficha); los numeros los pinta el CSS, no son texto;
 *   · «Meet Rob & Val», el unico bloque navy, solo texto: su foto abre la pagina;
 *   · FAQ en `<details>`, con la foto que acompanaba a «What Sets Us Apart» y la tarjeta de accion;
 *   · zonas con mapa en linea y banda final.
 * Mismos textos y mismo orden, salvo las zonas (norte delante). Lo que entra —la accion de la
 * pagina en tres cabeceras y en el FAQ, y los telefonos— lo declara `check-texto.mjs` (T-97).
 */
function aboutStitch(doc, ruta) {
  if (ruta !== '/about') return;
  const falta = (que) => { throw new Error(`${ruta}: ${que}`); };
  const accion = doc.querySelector('section.cta-footer a') ?? falta('la banda final no trae boton');
  const boton = (clase) => `<a class="mm-btn${clase ? ` ${clase}` : ''}" href="${accion.getAttribute('href')}">${accion.innerHTML}</a>`;
  /* Las fotos de este cuerpo ya vienen canjeadas por `fotosPorRuta()`, con su src, su alt y sus
   * medidas. Del estilo en linea se conserva el encuadre; la proporcion la pone la pieza. */
  const fotoDe = (i, clase, sizes) => {
    const pos = (i.getAttribute('style') ?? '').match(/object-position:[^;]+/);
    if (!i.getAttribute('width') || !i.getAttribute('height')) falta(`${i.getAttribute('src')} no trae medidas`);
    return `<img class="${clase}" src="${i.getAttribute('src')}" alt="${escAttr(i.getAttribute('alt') ?? '')}" width="${i.getAttribute('width')}" height="${i.getAttribute('height')}" sizes="${sizes}" loading="lazy" decoding="async"${pos ? ` style="${pos[0]}"` : ''}>`;
  };

  // 1 · hero
  const hero = doc.querySelector('section.hero-about');
  const [h1, h2, hp] = ['h1', 'h2', '.hero-about-text p'].map((q) => hero?.querySelector(q));
  const fund = doc.querySelector('section.meet-us-section img');
  if (!h1 || !h2 || !hp || !fund) falta('el hero no trae titular, subtitulo y parrafo, o falta la foto de los fundadores');
  const fsrc = local(fund.getAttribute('src'));
  const fd = DIM.get(fsrc) ?? falta(`${fsrc} no tiene medidas en el manifiesto`);
  const nh = doc.createElement('section');
  nh.setAttribute('class', 'mm-hero-a mm-hero-a--about');
  nh.innerHTML = `<div class="mm-hero-a-txt"><h1 class="mm-h1">${h1.innerHTML}</h1><h2 class="mm-hero-a-sub">${h2.innerHTML}</h2><p class="mm-p">${hp.innerHTML}</p>${BANDA_TELEFONOS}</div>`
    + `<figure class="mm-hero-a-medio"><img sizes="(min-width: 992px) 50vw, 100vw" src="${fsrc}" alt="${escAttr(fund.getAttribute('alt') ?? '')}" width="${fd.w}" height="${fd.h}" loading="eager" fetchpriority="high" decoding="async"></figure>`
    + franjaDeLogos(doc);
  hero.replaceWith(nh);
  doc.querySelector('section.logos-section')?.remove();

  // 2 · las seis razones
  const ws = doc.querySelector('section.whatsetus-section');
  const [wh2, wp, wimg] = ['.header-whatsetus h2', '.header-whatsetus p', 'img.image-left'].map((q) => ws?.querySelector(q));
  const razones = [...(ws?.querySelectorAll('.wsua-component') ?? [])].map((c) => [c.querySelector('h3'), c.querySelector('p')]);
  if (!wh2 || !wp || !wimg || razones.length !== 6 || razones.some((r) => r.some((n) => !n))) falta('«What Sets Us Apart» no trae cabecera, foto y seis razones');
  const fotoFaq = fotoDe(wimg, 'mm-lam-foto', '(min-width: 992px) 42vw, 100vw');
  const nw = doc.createElement('section');
  nw.setAttribute('class', 'mm-franja mm-franja--blanca');
  nw.innerHTML = cabeceraDeSeccion(wh2.innerHTML.replace(/\b(Apart)\b/, '<span class="mm-rot">$1</span>'), wp.innerHTML, null)
    + '<ul class="mm-franja-lista mm-franja-lista--filas" role="list">' + razones.map(([h, p]) => `<li class="mm-franja-item"><h3 class="mm-conf-t">${h.innerHTML}</h3><p class="mm-conf-p">${p.innerHTML}</p></li>`).join('') + '</ul>';
  ws.replaceWith(nw);

  // 3 · mision, vision y valores
  const wc = doc.querySelector('section.whychooseus-section');
  const [ch2, cp, vh] = ['.header-title h2', '.header-title p', '.wrapper-vertical-text h2'].map((q) => wc?.querySelector(q));
  const mv = [...(wc?.querySelectorAll('.block-info') ?? [])].map((b) => [b.querySelector('h2'), b.querySelector('p')]);
  const valores = [...(wc?.querySelectorAll('.pool-card') ?? [])].map((c) => [c.querySelector('.letter'), c.querySelector('h3'), c.querySelector('p')]);
  if (!ch2 || !cp || !vh || mv.length !== 2 || valores.length !== 4 || [...mv, ...valores].some((r) => r.some((n) => !n))) falta('«Why … Choose» no trae cabecera, mision, vision y cuatro valores');
  const nc = doc.createElement('section');
  nc.setAttribute('class', 'mm-franja mm-ab');
  nc.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${ch2.innerHTML.replace(/\b(Choose)\b/, '<span class="mm-rot">$1</span>')}</h2><div class="mm-sec-lado"><p class="mm-p">${cp.innerHTML}</p><div class="mm-sec-acc">${boton('mm-btn--navy')}</div></div></div>`
    + '<div class="mm-ab-cuerpo"><div class="mm-ab-mv">' + mv.map(([h, p]) => `<div class="mm-ab-bloque"><h3 class="mm-conf-t">${h.innerHTML}</h3><p class="mm-conf-p">${p.innerHTML}</p></div>`).join('') + '</div>'
    + `<div class="mm-ab-pool"><h3 class="mm-conf-t">${vh.innerHTML}</h3><ul class="mm-ab-valores" role="list">`
    + valores.map(([l, h, p]) => `<li class="mm-ab-valor"><span class="mm-ab-letra">${l.innerHTML}</span><div><h4 class="mm-conf-t">${h.innerHTML}</h4><p class="mm-conf-p">${p.innerHTML}</p></div></li>`).join('') + '</ul></div></div>';
  wc.replaceWith(nc);

  // 4 · la gestion de obra, en tres pasos
  const au = doc.querySelector('section.aboutus-section');
  const pasos = [...(au?.querySelectorAll('.fullwrapper') ?? [])].map((w) => ({ rot: w.querySelector('h4'), t: w.querySelector('h2'), p: w.querySelector('p'), img: w.querySelector('img') }));
  if (pasos.length !== 3 || pasos.some((x) => !x.rot || !x.t || !x.p || !x.img)) falta('el bloque de gestion de obra no trae sus tres filas con rotulo, titular, parrafo y foto');
  const np = doc.createElement('section');
  np.setAttribute('class', 'mm-proc mm-proc--about');
  // La accion y los telefonos van en la columna de los pasos, encima del primero (lamina).
  np.innerHTML = '<div class="mm-proc-cuerpo">'
    + `<figure class="mm-lam-medio mm-proc-medio" data-mm-pasos-medio>${fotoDe(pasos[0].img, 'mm-lam-foto', '(min-width: 992px) 42vw, 100vw')}<div class="mm-lam-pie" aria-hidden="true" data-n="01 / 03" data-t="${escAttr(pasos[0].t.textContent.trim())}"></div></figure>`
    + `<div class="mm-ab-pasos"><div class="mm-ab-acc">${boton('mm-btn--linea')}${BANDA_TELEFONOS}</div>`
    + '<ol class="mm-pasos mm-pasos--auto" data-mm-pasos>' + pasos.map((x) => `<li class="mm-paso"><span class="mm-paso-n" aria-hidden="true"></span>${fotoDe(x.img, 'mm-paso-foto', '(min-width: 992px) 42vw, 100vw')}`
      + `<span class="mm-etiqueta">${x.rot.innerHTML}</span><h2 class="mm-paso-t">${x.t.innerHTML}</h2><p>${x.p.innerHTML}</p></li>`).join('') + '</ol></div></div>';
  au.replaceWith(np);

  // 5 · los fundadores, en navy
  const me = doc.querySelector('section.meet-us-section');
  const [mh2, mp] = ['.block-info-team h2', '.block-info-team p'].map((q) => me?.querySelector(q));
  if (!mh2 || !mp) falta('«Meet Rob & Val» no trae titular y parrafo');
  const nm = doc.createElement('section');
  nm.setAttribute('class', 'mm-franja mm-franja--navy');
  nm.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${mh2.innerHTML}</h2><div class="mm-sec-lado"><p class="mm-p">${mp.innerHTML}</p><div class="mm-sec-acc">${boton('mm-btn--linea-inv')}</div></div></div>`;
  me.replaceWith(nm);

  // 6 · FAQ
  const faq = doc.querySelector('section.faq-section');
  const fh2 = faq?.querySelector('.header-faq h2');
  const preguntas = [...(faq?.querySelectorAll('.dropdown-faq') ?? [])].map((d) => ({ q: d.querySelector('h3.dropdown-text'), r: d.querySelector('.dropdown-list') }));
  if (!fh2 || preguntas.length < 2 || preguntas.some((x) => !x.q || !x.r)) falta('la FAQ no trae titular y preguntas con respuesta');
  for (const x of preguntas) for (const p of x.r.querySelectorAll('p.grey')) p.removeAttribute('class');
  const nf = doc.createElement('section');
  nf.setAttribute('class', 'mm-faq');
  nf.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${fh2.innerHTML.replace(/\b(Construction)\s*$/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + '<div class="mm-faq-cuerpo"><div class="mm-faq-lista">' + preguntas.map((x) => `<details class="mm-faq-item"><summary><h3>${x.q.innerHTML}</h3>${CHEVRON}</summary><div class="mm-faq-r">${x.r.innerHTML}</div></details>`).join('') + '</div>'
    + `<div class="mm-faq-lado"><figure class="mm-lam-medio mm-faq-medio">${fotoFaq}</figure><div class="mm-faq-accion">${boton('')}${BANDA_TELEFONOS}</div></div></div>`;
  faq.replaceWith(nf);

  // 7 · zonas y banda
  zonasDeLocation(doc, ruta);
  // E12 (D-197): la banda de /about lleva su foto, vertical para que la caja 4:5 no la amplie a densidad 1.
  bandaFinal(doc, ruta, 'bi-0661');
}

/** El mapa en linea de Florida con sus dos oficinas. Decorativo: los telefonos van en texto. */
const MAPA_FLORIDA = '<svg class="mm-mapa" viewBox="0 0 420 460" aria-hidden="true" focusable="false">'
  + '<path d="M20 60 H250 L262 40 H330 L352 92 L372 150 L386 214 L392 280 L384 340 L360 392 L334 420 L318 404 L300 350 L270 300 L246 250 L226 196 L214 150 L196 118 L150 104 L96 110 L60 96 L20 92 Z" class="mm-plano-vaso"></path>'
  + '<path d="M212 200 L392 236" class="mm-plano-cota" stroke-dasharray="6 6"></path>'
  + '<circle cx="300" cy="130" r="5" class="mm-plano-punto"></circle><circle cx="348" cy="330" r="5" class="mm-plano-punto"></circle></svg>';

/** El hero partido (A) de una pagina sin obra propia: titular, subtitulo, parrafo, el boton del
 *  origen en oro y, al lado, una foto de la bolsa de heroes (obra real, terminada, con alt). */
function heroPartido(doc, ruta, { h1, sub, p, a, k, extra = '', clase = '' }) {
  const e = BANCO_POR_ID.get(BOLSA_BANDA[k % BOLSA_BANDA.length]);
  if (!e || e.procedencia !== 'obra_real' || !e.alt) throw new Error(`${ruta}: la foto ${k} de la bolsa no es obra real con alt`);
  const nh = doc.createElement('section');
  nh.setAttribute('class', `mm-hero-a${clase ? ` ${clase}` : ''}`);
  nh.innerHTML = `<div class="mm-hero-a-txt"><h1 class="mm-h1">${h1.innerHTML}</h1>${sub ? `<h2 class="mm-hero-a-sub">${sub.innerHTML}</h2>` : ''}<p class="mm-p">${p.innerHTML}</p>`
    + `<div class="mm-hero-a-acc"><a class="mm-btn" href="${a.getAttribute('href')}">${a.innerHTML}</a></div>${extra}</div>`
    + `<figure class="mm-hero-a-medio"><img sizes="(min-width: 992px) 50vw, 100vw" src="${e.src}" alt="${escAttr(e.alt)}" width="${e.ancho}" height="${e.alto}" loading="eager" fetchpriority="high" decoding="async"></figure>`;
  return nh;
}

/**
 * ASTRO-4 lote C · `/where-we-serve` (lamina «ZonasPagina»).
 *
 * QUE CAMBIA DE COMPOSICION: el medio hero con una imagen compuesta, el collage de tres fotos y
 * las dos vistas aereas salen. Queda lo que la pagina tiene que hacer —llevar a cada condado—:
 * hero partido con una foto de obra y el boton en oro; la presentacion en dos columnas con su
 * enlace y los dos telefonos; y la cobertura con el mapa en linea a un lado y, al otro, las dos
 * zonas, cada condado en una linea entera pulsable. Mismos textos, mismos enlaces, mismo orden.
 */
function zonasPaginaStitch(doc, ruta) {
  if (ruta !== '/where-we-serve') return;
  const falta = (que) => { throw new Error(`${ruta}: ${que}`); };
  const hero = doc.querySelector('section.half-hero-section');
  const [h1, sub, p, a] = ['h1', 'h2', '.wrapper-hero-page p', '.wrapper-hero-page a'].map((q) => hero?.querySelector(q));
  if (!h1 || !sub || !p || !a) falta('el hero no trae titular, subtitulo, parrafo y boton');
  hero.replaceWith(heroPartido(doc, ruta, { h1, sub, p, a, k: 1, clase: 'mm-hero-a--bajo' }));

  const tr = doc.querySelector('section.trusted-section');
  const [th2, tp, ta] = ['.block-contect-intro h2', '.block-contect-intro p', '.block-contect-intro a'].map((q) => tr?.querySelector(q));
  const parrafos = (tp?.innerHTML ?? '').split(/(?:<br\s*\/?>\s*){2,}/).map((x) => x.trim()).filter(Boolean);
  if (!th2 || !ta || parrafos.length !== 2) falta('la presentacion no trae titular, dos parrafos y enlace');
  const nt = doc.createElement('section');
  nt.setAttribute('class', 'mm-franja mm-franja--blanca');
  nt.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${th2.innerHTML.replace(/(North &amp; South Florida)\s*$/, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<div class="mm-zp-intro">${parrafos.map((x) => `<p class="mm-p">${x}</p>`).join('')}`
    + `<div class="mm-zp-acc"><a class="mm-flecha" href="${ta.getAttribute('href')}">${ta.textContent.trim()}${FLECHA}</a>${BANDA_TELEFONOS}</div></div>`;
  tr.replaceWith(nt);

  const cv = doc.querySelector('section.coverage-section');
  const [deco, ch2, cp] = ['.header-country .heading-deco', '.header-country h2', '.header-country p'].map((q) => cv?.querySelector(q));
  const zonas = [...(cv?.querySelectorAll('.wrapper-service-areas') ?? [])].map((w) => ({
    h: w.querySelector('.wrapper-vertical-text h3'), p: w.querySelector('.wrapper-vertical-text p'),
    condados: [...w.querySelectorAll('.item-cities-cms a')], zona: w.querySelector('.wrapper-buttons a'),
  }));
  if (!deco || !ch2 || !cp || zonas.length !== 2 || zonas.some((z) => !z.h || !z.p || !z.condados.length || !z.zona)) falta('la cobertura no trae cabecera y dos zonas con condados y enlace');
  const nv = doc.createElement('section');
  nv.setAttribute('class', 'mm-zp');
  nv.innerHTML = '<div class="mm-zp-caja"><div class="mm-zp-cab">'
    + `<div class="mm-sec-tit"><p class="mm-etiqueta">${deco.innerHTML}</p><h2 class="mm-h2">${ch2.innerHTML.replace(/\b(areas)\s*$/i, '<span class="mm-rot">$1</span>')}</h2></div>`
    + `<p class="mm-p">${cp.innerHTML}</p><a class="mm-btn mm-btn--navy" href="${a.getAttribute('href')}">${a.innerHTML}</a>${MAPA_FLORIDA}</div>`
    + '<div class="mm-zp-zonas">' + zonas.map((z) => `<article class="mm-zp-zona"><h3 class="mm-zona-t">${z.h.innerHTML}</h3><p>${z.p.innerHTML}</p>`
      + '<ul class="mm-indice" role="list">' + z.condados.map((c) => `<li><a class="mm-linea" href="${c.getAttribute('href')}"><span class="mm-linea-t">${c.textContent.trim()}</span>${FLECHA}</a></li>`).join('') + '</ul>'
      + `<a class="mm-flecha" href="${z.zona.getAttribute('href')}">${z.zona.textContent.trim()}${FLECHA}</a></article>`).join('') + '</div></div>';
  cv.replaceWith(nv);
  bandaFinal(doc, ruta, 7);
}

/** ASTRO-4 lote C · `/brochures`: el hero D y la tipografia del sistema. El muro de catalogos, su
 *  filtro por categoria y sus 57 enlaces a PDF conservan el diseno propio que ya tenian (FOLLETOS). */
function folletosStitch(doc, ruta) {
  if (ruta !== '/brochures') return;
  heroD(doc, ruta);
  const sec = doc.querySelector('section.brochures-section-page');
  if (!sec) throw new Error('/brochures: no trae la seccion de catalogos');
  sec.classList.add('mm-folletos');
}

function proyectosIndiceStitch(doc, ruta) {
  if (ruta !== '/projects') return;
  heroD(doc, ruta);
  const sec = doc.querySelector('section.project-page');
  const lista = sec?.querySelector('.cms-list-work');
  const items = [...(lista?.querySelectorAll('.cms-item-work') ?? [])];
  if (!lista || items.length < 10) throw new Error(`/projects: ${items.length} obras en la lista`);
  for (const it of items) {
    const img = it.querySelector('img.img-work');
    const h = it.querySelector('.title-work');
    const p = h?.nextElementSibling;
    const a = it.querySelector('a[href^="/project/"]');
    if (!img || !h || !p || !a) throw new Error('/projects: una obra no trae foto, titular, relato y enlace');
    img.removeAttribute('class');
    img.setAttribute('sizes', '(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw');
    img.setAttribute('decoding', 'async');
    it.innerHTML = `<a class="mm-ficha mm-ficha--indice" href="${a.getAttribute('href')}"><span class="mm-ficha-foto">${img.outerHTML}</span>`
      + `<span class="mm-ficha-cuerpo"><h2 class="mm-ficha-t">${h.innerHTML}</h2><span class="mm-ficha-p">${p.innerHTML}</span>`
      + `<span class="mm-flecha">${a.innerHTML}${FLECHA}</span></span></a>`;
  }
  sec.setAttribute('class', 'project-page mm-obras');
  lista.classList.add('mm-obras-lista');
  bandaFinal(doc, ruta, 2);
}

const esProyecto = (ruta) => ruta.startsWith('/project/');
function proyectoStitch(doc, ruta) {
  if (!esProyecto(ruta)) return;
  const falta = (que) => { throw new Error(`${ruta}: ${que}`); };
  const hero = doc.querySelector('section.hero-project');
  const h1 = hero?.querySelector('h1');
  const resumen = h1?.nextElementSibling;
  const gal = doc.querySelector('section.project-gallery');
  const caja = gal?.querySelector('.div-block-5');
  const dh2 = caja?.querySelector('h2');
  const boton = gal?.querySelector('.wrapper-buttons a');
  const banda = doc.querySelector('section.cta-footer');
  const [bh2, bp] = ['.wrapper-vertical-text h2', '.text-block-3'].map((q) => banda?.querySelector(q));
  if (!h1 || !resumen || !gal || !dh2 || !boton || !bh2 || !bp) falta('la ficha de proyecto no trae hero, galeria con «Project Details» y banda final');
  if (gal.parentNode !== hero.parentNode || banda.parentNode !== hero.parentNode) falta('hero, galeria y banda no son hermanas');
  localizar(gal);
  const fotos = conAlt([...gal.querySelectorAll('.cms-list-workgallery img')].map((i) => {
    const src = i.getAttribute('src');
    const d = DIM.get(src);
    if (!d) falta(`${src} no tiene medidas en el manifiesto`);
    return { src, alt: i.getAttribute('alt') ?? '', w: d.w, h: d.h };
  }), h1.textContent);
  if (fotos.length < 2) falta(`la galeria solo trae ${fotos.length} foto(s)`);
  const datos = [...caja.querySelectorAll('.heading-deco')].map((r) => [r.textContent.trim(), r.nextElementSibling?.textContent.trim() ?? '']);
  const tmp = doc.createElement('div');
  tmp.innerHTML = heroProyectoHtml({ tituloHtml: h1.innerHTML, resumenHtml: resumen.innerHTML, fotos })
    + detalleProyectoHtml({ tituloHtml: dh2.innerHTML, datos, fotos, accion: { href: boton.getAttribute('href'), texto: boton.textContent.trim() }, telefonos: TELEFONOS })
    + cierreProyectoHtml({ tituloHtml: bh2.innerHTML, parrafoHtml: bp.innerHTML, telefonos: TELEFONOS });
  const [nh, nd, nc] = [...tmp.children];
  hero.replaceWith(nh);
  gal.replaceWith(nd);
  banda.replaceWith(nc);
}

/* ── ASTRO-2 · PROCESO Y «WHAT WE DO», EN LISTA DE PLANO (laminas «Proceso» y «QueHacemos») ──
 * PROCESO: las pestanas de Webflow (un paso a la vista, autoplay por `<script>` embebido) pasan
 * a una lista numerada con los cuatro pasos a la vista; los titulos de paso dejan de ser `<h2>`
 * hermanos del titular y son `<h3>`. Con foto solo si las cuatro son de obra de la casa
 * (`/images/obra/`); si alguna no lo es, variante sin foto. En escritorio la foto del paso que
 * se esta leyendo va en una figura fija a la izquierda (`Componentes.astro` la cambia); en
 * movil cada paso lleva la suya.
 *
 * «WHAT WE DO»: las cuatro filas con foto pasan a cuatro grupos en lista (titular, entradilla y
 * sus subservicios en `<dl>`), con UNA foto: la primera de las cuatro que tenga procedencia
 * verificada. Los iconos de subservicio salen; los enlaces a otra ficha se conservan. */
/** D-51: «Design-Build» y «Design-Built» no se parten entre lineas en un titular. Un `<span>` con
 *  `white-space: nowrap`, no un guion duro: el texto del HTML no cambia ni un caracter. */
const nb = (html) => String(html).replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>');
const FOTO_VERIFICADA = (src) => GALERIA_USABLE.has(src) || /^\/images\/(obra|projects)\//.test(src);
const cabeceraDeSeccion = (tit, linea, cta, antetitulo = '') => '<div class="mm-sec-cab">'
  + (antetitulo ? `<div class="mm-sec-tit"><p class="mm-etiqueta">${antetitulo}</p><h2 class="mm-h2">${nb(tit)}</h2></div>` : `<h2 class="mm-h2">${nb(tit)}</h2>`)
  + `<div class="mm-sec-lado"><p class="mm-p">${linea}</p>${cta ? `<div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${cta.getAttribute('href')}">${cta.innerHTML}</a></div>` : ''}</div></div>`;
const RESENAS_PERFIL = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/resenas.json'), 'utf8')).enlacePerfil;
const BANDA_TELEFONOS = '<div class="mm-datos mm-datos--tel">' + TELEFONOS.map((t) => `<a class="mm-dato" href="tel:${t.tel}"><span class="mm-dato-rot">${t.zona}</span><span class="mm-dato-val">${t.visible}</span></a>`).join('') + '</div>';
const CHEVRON = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>';
const imgDe = (i, clase) => `<img class="${clase}" sizes="(min-width: 992px) 42vw, 100vw" src="${i.getAttribute('src')}" alt="${escAttr(i.getAttribute('alt') ?? '')}" width="${i.getAttribute('width')}" height="${i.getAttribute('height')}" loading="lazy" decoding="async"${i.getAttribute('style') ? ` style="${i.getAttribute('style')}"` : ''}>`;
function listasDePlano(doc, ruta) {
  if (!esFicha(ruta)) return;
  const cta = doc.querySelector('.mm-hero-a-acc > a.mm-btn');

  const proc = doc.querySelector('section.process-section');
  const h2 = proc?.querySelector('.process-header h2');
  const linea = proc?.querySelector('.process-header p');
  const pasos = [...(proc?.querySelectorAll('.process-content-item') ?? [])].map((it) => ({
    img: it.querySelector('img.img-process'), tit: it.querySelector('.content-step-tab h2'), txt: it.querySelector('.w-richtext'),
  }));
  if (!h2 || !linea || pasos.length !== 4 || pasos.some((x) => !x.img || !x.tit || !x.txt)) {
    throw new Error(`${ruta}: el proceso no trae titular, linea y cuatro pasos con foto, titulo y texto`);
  }
  localizar(proc);
  for (const x of pasos) {
    if (!x.img.getAttribute('width')) { const d = DIM.get(x.img.getAttribute('src')); if (d) { x.img.setAttribute('width', d.w); x.img.setAttribute('height', d.h); } }
  }
  const conFoto = pasos.every((x) => FOTO_VERIFICADA(x.img.getAttribute('src')) && x.img.getAttribute('width'));
  const n2 = (k) => String(k).padStart(2, '0');
  const nuevo = doc.createElement('section');
  nuevo.setAttribute('class', `mm-proc${conFoto ? '' : ' mm-proc--sin'}`);
  nuevo.innerHTML = cabeceraDeSeccion(h2.innerHTML.replace(/(Process)\s*$/, '<span class="mm-rot">$1</span>'), linea.innerHTML, cta)
    + '<div class="mm-proc-cuerpo">'
    + (conFoto ? `<figure class="mm-lam-medio mm-proc-medio" data-mm-pasos-medio>${imgDe(pasos[0].img, 'mm-lam-foto')}`
      + `<div class="mm-lam-pie" aria-hidden="true" data-n="01 / 04" data-t="${escAttr(pasos[0].tit.textContent.trim())}"></div></figure>` : '')
    + `<ol class="mm-pasos"${conFoto ? ' data-mm-pasos' : ''}>` + pasos.map((x, k) => `<li class="mm-paso"><span class="mm-paso-n">${k + 1}</span>`
      + (conFoto ? imgDe(x.img, 'mm-paso-foto') : '')
      + `<h3 class="mm-paso-t">${x.tit.innerHTML}</h3>${x.txt.innerHTML}</li>`).join('') + '</ol></div>';
  proc.replaceWith(nuevo);

  const que = doc.querySelector('section.services');
  const cab = que?.querySelector('.header-subservices');
  const filas = [...(que?.querySelectorAll('.svc-detalle__fila') ?? [])];
  const [deco, qh2, qp] = ['.heading-deco', 'h2', 'p'].map((q) => cab?.querySelector(q));
  if (!deco || !qh2 || !qp || filas.length < 2) throw new Error(`${ruta}: «What we do» no trae rotulo, titular, linea y filas`);
  localizar(que);
  const grupos = filas.map((f) => ({
    img: f.querySelector('img.svc-detalle__foto'), tit: f.querySelector('.svc-detalle__tit'), intro: f.querySelector('.svc-detalle__intro'),
    items: [...f.querySelectorAll('.svc-detalle__item')].map((li) => ({ a: li.querySelector('a.svc-subservicio'), t: li.querySelector('h4'), d: li.querySelector('.paragraph-mini') })),
  }));
  if (grupos.some((g) => !g.tit || !g.intro || !g.items.length || g.items.some((x) => !x.t || !x.d))) {
    throw new Error(`${ruta}: una fila de «What we do» no trae titulo, entradilla y subservicios`);
  }
  const k = grupos.findIndex((g) => g.img && FOTO_VERIFICADA(g.img.getAttribute('src')) && g.img.getAttribute('width'));
  const nq = doc.createElement('section');
  nq.setAttribute('class', `mm-que${k < 0 ? ' mm-que--sin' : ''}`);
  nq.innerHTML = cabeceraDeSeccion(qh2.innerHTML, qp.innerHTML, cta, deco.innerHTML)
    + '<div class="mm-que-cuerpo"><div class="mm-que-col"><ol class="mm-grupos">'
    + grupos.map((g, j) => `<li class="mm-grupo${j === k ? ' mm-grupo--activo' : ''}"><h3 class="mm-grupo-t">${g.tit.innerHTML}</h3><p class="mm-grupo-p">${g.intro.innerHTML}</p><dl class="mm-grupo-dl">`
      + g.items.map((x) => `<div class="mm-grupo-i"><dt>${x.a ? `<a href="${x.a.getAttribute('href')}">${x.t.innerHTML}</a>` : x.t.innerHTML}</dt><dd>${x.d.innerHTML}</dd></div>`).join('')
      + '</dl></li>').join('') + '</ol>'
    + BANDA_TELEFONOS + '</div>'
    + (k < 0 ? '' : `<figure class="mm-lam-medio mm-que-medio">${imgDe(grupos[k].img, 'mm-lam-foto')}`
      + `<div class="mm-lam-pie" aria-hidden="true" data-n="${n2(k + 1)} / ${n2(grupos.length)}" data-t="${escAttr(grupos[k].tit.textContent.trim())}"></div></figure>`)
    + '</div>';
  que.replaceWith(nq);

  /* FAQ (lamina «Faq»): `<details>` cerrados en vez de los desplegables de Webflow —se abren sin
   * JS y el buscador del navegador los encuentra—, con las mismas preguntas y respuestas, que
   * son las del `FAQPage`. Al lado, una foto de la galeria que no esta en el mosaico y, montada
   * sobre ella, la accion de la pagina en oro (D-76) con los dos telefonos. Sin foto libre,
   * la tarjeta de accion va sola. */
  const faq = doc.querySelector('section.faq-section');
  const fh2 = faq?.querySelector('.header-faq h2');
  const flinea = fh2?.nextElementSibling;
  const preguntas = [...(faq?.querySelectorAll('.dropdown-faq') ?? [])].map((d) => ({ q: d.querySelector('h3.dropdown-text'), r: d.querySelector('.dropdown-list') }));
  if (!fh2 || !flinea || preguntas.length < 2 || preguntas.some((x) => !x.q || !x.r)) throw new Error(`${ruta}: la FAQ no trae titular, linea y preguntas con respuesta`);
  const ffoto = fotoDeSeccion(ruta, 0);
  const nf = doc.createElement('section');
  nf.setAttribute('class', `mm-faq${ffoto ? '' : ' mm-faq--sin'}`);
  for (const x of preguntas) for (const p of x.r.querySelectorAll('p.grey')) p.removeAttribute('class');
  nf.innerHTML = cabeceraDeSeccion(fh2.innerHTML.replace(/(FAQs?)\s*$/, '<span class="mm-rot">$1</span>'), flinea.innerHTML, null)
    + '<div class="mm-faq-cuerpo"><div class="mm-faq-lista">' + preguntas.map((x) => `<details class="mm-faq-item"><summary><h3>${x.q.innerHTML}</h3>${CHEVRON}</summary><div class="mm-faq-r">${x.r.innerHTML}</div></details>`).join('') + '</div>'
    + '<div class="mm-faq-lado">'
    + (ffoto ? `<figure class="mm-lam-medio mm-faq-medio"><img class="mm-lam-foto" sizes="(min-width: 992px) 42vw, 100vw" src="${ffoto.src}" alt="${escAttr(ffoto.alt)}" width="${ffoto.w}" height="${ffoto.h}" loading="lazy" decoding="async"></figure>` : '')
    + `<div class="mm-faq-accion"><a class="mm-btn" href="${cta.getAttribute('href')}">${cta.innerHTML}</a>${BANDA_TELEFONOS}</div></div></div>`;
  faq.replaceWith(nf);

  /* ZONAS (lamina «Zonas»): las dos tarjetas con foto de fondo pasan a dos columnas de texto con
   * su telefono y su enlace, junto a un mapa en linea decorativo. Mismos textos y mismos dos
   * enlaces. «Where We Serve» sigue siendo el `<h2>`, pintado como rotulo; el lema que lo
   * acompana se pinta grande pero sigue siendo un parrafo: los encabezados no cambian. */
  const zon = doc.querySelector('section.location');
  const zh2 = zon?.querySelector('.header-location h2');
  const zlema = zon?.querySelector('.header-location p');
  const zonas = [...(zon?.querySelectorAll('.item-country') ?? [])].map((it) => ({ t: it.querySelector('h3'), p: it.querySelector('.block-info-country p'), a: it.querySelector('a') }));
  if (!zh2 || !zlema || zonas.length !== 2 || zonas.some((z) => !z.t || !z.p || !z.a)) throw new Error(`${ruta}: «Where We Serve» no trae rotulo, lema y dos zonas con texto y enlace`);
  const nz = doc.createElement('section');
  nz.setAttribute('class', 'mm-zonas');
  nz.innerHTML = '<div class="mm-zonas-caja"><div class="mm-zonas-txt">'
    + `<div class="mm-sec-tit"><h2 class="mm-etiqueta">${zh2.innerHTML}</h2><p class="mm-h2">${zlema.innerHTML.replace(/\b(Coverage)\b/, '<span class="mm-rot">$1</span>')}</p></div>`
    + '<div class="mm-zonas-lista">' + zonas.map((z) => {
      const tel = TELEFONOS.find((t) => t.zona === z.t.textContent.trim());
      if (!tel) throw new Error(`${ruta}: la zona «${z.t.textContent.trim()}» no tiene telefono en telefonos.json`);
      return `<article class="mm-zona"><h3 class="mm-zona-t">${z.t.innerHTML}</h3><p>${z.p.innerHTML}</p>`
        + `<div class="mm-datos"><a class="mm-dato" href="tel:${tel.tel}"><span class="mm-dato-rot">${tel.zona}</span><span class="mm-dato-val">${tel.visible}</span></a></div>`
        + `<a class="mm-flecha" href="${z.a.getAttribute('href')}">${z.a.innerHTML}${FLECHA}</a></article>`;
    }).join('') + '</div></div>'
    + '<svg class="mm-mapa" viewBox="0 0 420 460" aria-hidden="true" focusable="false">'
    + '<path d="M20 60 H250 L262 40 H330 L352 92 L372 150 L386 214 L392 280 L384 340 L360 392 L334 420 L318 404 L300 350 L270 300 L246 250 L226 196 L214 150 L196 118 L150 104 L96 110 L60 96 L20 92 Z" class="mm-plano-vaso"></path>'
    + '<path d="M212 200 L392 236" class="mm-plano-cota" stroke-dasharray="6 6"></path>'
    + '<circle cx="300" cy="130" r="5" class="mm-plano-punto"></circle><circle cx="348" cy="330" r="5" class="mm-plano-punto"></circle></svg></div>';
  zon.replaceWith(nz);

  /* RESENAS (lamina «Resenas»): la cabecera de siempre con la accion de la pagina y el enlace al
   * perfil de Google, las ocho resenas en lista (las pinta `ResenasGoogle.astro`, rama de ficha),
   * los dos telefonos y, al lado, una foto de la galeria que no esta en el mosaico ni en el FAQ. */
  const res = doc.querySelector('section.testimonial-section');
  const [rlabel, rh2, rp] = ['.header-reviews .label', '.header-reviews h2', '.header-reviews p'].map((q) => res?.querySelector(q));
  const widget = res?.querySelector('[class*="elfsight-app-"]');
  if (!rlabel || !rh2 || !rp || !widget) throw new Error(`${ruta}: las resenas no traen rotulo, titular, linea y widget`);
  const rfoto = fotoDeSeccion(ruta, 2);
  const nr = doc.createElement('section');
  nr.setAttribute('class', `mm-res${rfoto ? '' : ' mm-res--sin'}`);
  nr.innerHTML = `<div class="mm-sec-cab"><div class="mm-sec-tit"><p class="mm-etiqueta">${rlabel.innerHTML}</p><h2 class="mm-h2">${nb(rh2.innerHTML.replace(/\b(Clients)\b/, '<span class="mm-rot">$1</span>'))}</h2></div>`
    + `<div class="mm-sec-lado"><p class="mm-p">${rp.innerHTML}</p><div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${cta.getAttribute('href')}">${cta.innerHTML}</a>`
    + `<a class="mm-flecha" href="${RESENAS_PERFIL}" target="_blank" rel="noopener noreferrer">See all reviews${FLECHA}</a></div></div></div>`
    + `<div class="mm-res-cuerpo"><div class="mm-res-col">${widget.outerHTML}${BANDA_TELEFONOS}</div>`
    + (rfoto ? `<figure class="mm-res-medio"><img src="${rfoto.src}" alt="${escAttr(rfoto.alt)}" width="${rfoto.w}" height="${rfoto.h}" loading="lazy" decoding="async"></figure>` : '')
    + '</div>';
  res.replaceWith(nr);

  /* CIERRE FUNDIDO (D-77) Y ORDEN DE LA FICHA (laminas de la Etapa 4).
   * La banda final (`cta-footer`) pasa a banda navy con su titular, su parrafo, los telefonos y
   * una foto de la galeria; el formulario (`FormularioCore`, que el bucle de salida cuelga de
   * ella) monta sobre su borde. El boton «Get a Free Estimate» de la banda sale (T-57): apuntaba
   * al formulario que ahora tiene pegado. El feed de Instagram sale de la ficha (T-42).
   *
   * El orden: hero · confianza · intro · galeria · proceso · «what we do» · [antes/despues] ·
   * inversion · FAQ · zonas · articulos · resenas · cierre · formulario. Todo queda como
   * hermano de primer nivel, que es lo que recorre el bucle de salida. */
  /* ANTES/DESPUES, LADO A LADO (D-96, D-120). Solo queda en `/services/pool-remodeling`. Su par son
   * dos fotos reales de la misma obra (obra-048), pero NO desde el mismo punto: la de antes esta
   * tomada desde dentro de la jaula. Un deslizador promete el mismo encuadre; aqui van las dos
   * fotos una junto a otra, rotuladas. Mismos textos y los mismos dos enlaces; sale el script de
   * Flowbase. Los dos titulos de tarjeta pasan de `<h4>` a `<h3>`: cuelgan de un `<h2>`. */
  const ad = doc.querySelector('section.before-after-section');
  let nad = null;
  if (ad) {
    const [iA, iD] = ['img.bas-image-before', 'img.bas-image-after-h'].map((q) => ad.querySelector(q));
    const [eA, eD] = ['.bas-label-before-h', '.bas-label-after-h'].map((q) => ad.querySelector(q));
    const ah2 = ad.querySelector('.before-after-intro h2');
    const ap = ah2?.nextElementSibling;
    const tarjetas = [...ad.querySelectorAll('.item-transformation-benefits')].map((t) => ({ t: t.querySelector('h4'), p: t.querySelector('.paragraph-mini') }));
    const enlaces = [...ad.querySelectorAll('.transformation-actions a')];
    const aCta = enlaces.find((x) => x.getAttribute('href') === '/request-estimated');
    const aProy = enlaces.find((x) => x.getAttribute('href') === '/projects');
    if (!iA || !iD || !eA || !eD || !ah2 || !ap || tarjetas.length !== 2 || tarjetas.some((x) => !x.t || !x.p) || !aCta || !aProy) {
      throw new Error(`${ruta}: el antes/despues no trae las dos fotos, sus rotulos, titular, parrafo, dos tarjetas y dos enlaces`);
    }
    const foto = (i, etq, clase) => `<figure class="mm-ad-foto"><img src="${i.getAttribute('src')}" srcset="${i.getAttribute('srcset') ?? ''}" sizes="(min-width: 768px) 50vw, 100vw" alt="${escAttr(i.getAttribute('alt'))}" width="${i.getAttribute('width')}" height="${i.getAttribute('height')}" loading="lazy" decoding="async">`
      + `<figcaption class="mm-ad-etq ${clase}">${etq.innerHTML}</figcaption></figure>`;
    nad = doc.createElement('section');
    nad.setAttribute('class', 'mm-ad');
    nad.innerHTML = `<div class="mm-sec-cab"><h2 class="mm-h2">${nb(ah2.innerHTML.replace(/(Renovation)\s*$/, '<span class="mm-rot">$1</span>'))}</h2>`
      + `<div class="mm-sec-lado"><p class="mm-p">${ap.innerHTML}</p><div class="mm-sec-acc"><a class="mm-btn mm-btn--linea" href="${aCta.getAttribute('href')}">${aCta.innerHTML}</a>`
      + `<a class="mm-flecha" href="${aProy.getAttribute('href')}">${aProy.innerHTML}${FLECHA}</a></div></div></div>`
      + `<div class="mm-ad-par">${foto(iA, eA, 'mm-ad-etq--antes')}${foto(iD, eD, 'mm-ad-etq--despues')}</div>`
      + '<div class="mm-ad-datos">' + tarjetas.map((x) => `<div><h3 class="mm-dato-rot">${x.t.innerHTML}</h3><p>${x.p.innerHTML}</p></div>`).join('') + '</div>';
    ad.replaceWith(nad);
  }

  const fin = doc.querySelector('section.cta-footer');
  const [ch2, cp] = ['.wrapper-vertical-text h2', '.text-block-3'].map((q) => fin?.querySelector(q));
  const heroA = doc.querySelector('section.mm-hero-a');
  if (!ch2 || !cp || fin.parentNode !== heroA?.parentNode) throw new Error(`${ruta}: la banda final no trae titular y parrafo, o no es hermana del hero`);
  const cfoto = fotoDeSeccion(ruta, 1);
  const nc = doc.createElement('section');
  nc.setAttribute('class', `mm-cierre${cfoto ? '' : ' mm-cierre--sin'}`);
  nc.innerHTML = '<div class="mm-cierre-caja"><div class="mm-cierre-txt">'
    + `<h2 class="mm-h2">${nb(ch2.innerHTML)}</h2><p class="mm-p">${cp.innerHTML}</p>${BANDA_TELEFONOS}</div>`
    + (cfoto ? `<figure class="mm-cierre-medio"><img src="${cfoto.src}" alt="${escAttr(cfoto.alt)}" width="${cfoto.w}" height="${cfoto.h}" loading="lazy" decoding="async"></figure>` : '')
    + '</div>';
  const invMarca = [...nuevo.parentNode.childNodes].find((x) => x.nodeType === 3 && x.textContent.includes('InversionCore'));
  if (!invMarca) throw new Error(`${ruta}: no encuentro el marcador de la banda de inversion junto al proceso`);
  const viejos = new Set([nuevo, nq, nf, nz, nr].map((x) => x.parentNode));
  for (const x of [doc.querySelector('section.svc-intro'), doc.querySelector('section.mm-gal'), nuevo, nq,
    nad, nf, nz, nr].filter(Boolean)) fin.parentNode.insertBefore(x, fin);
  // El marcador de la inversion era un nodo de texto dentro del `<div>` de contenido. Con las
  // secciones ya de primer nivel lo pone el bucle de salida, delante del FAQ.
  invMarca.remove();
  fin.replaceWith(nc);
  doc.querySelector('section.social-media')?.remove();
  for (const v of viejos) if (v !== nc.parentNode && !v.children.length && !v.textContent.trim()) v.remove();
}

/**
 * ── LA CIRUGIA DE LA LANDING DE PAGO (R17-CORE) ──────────────────────────────────────────
 *
 * Muta el DOM de la ruta ANTES de que el bucle de hermanos lo recorra, asi que todo lo que
 * viene despues -`limpia()`, los marcadores, el troceo- ve ya la pagina reordenada.
 *
 * POR QUE AQUI Y NO A MANO EN EL `.astro`. El fichero lleva cabecera `// DERIVADO` y lo
 * reescribe este generador: una edicion a mano se pierde en la siguiente corrida. Y NO se pasa
 * a autoria propia -que seria la otra salida- por dos razones medidas:
 *   · `build-plantillas.mjs:358,648` hace `readdirSync` + `unlinkSync` sobre `src/pages/services/`
 *     y borraria el fichero. Es la trampa que documenta la cabecera de `financing.astro`.
 *   · `RUTAS_PROPIAS` apagaria `check:texto` y la comparacion de `<head>` de `check:seo` justo
 *     en la pagina que mas vigilancia necesita: es una URL final de anuncio.
 *
 * @param {Document} doc  el DOM de la ruta
 * @param {string}   ruta
 * @returns {boolean} si se aplico (para el contador-invariante del final)
 */
function captacion(doc, ruta) {
  const c = CAPTACION[ruta];
  if (!c) return false;
  /**
   * 🔧 ARREGLO FUERA DE ENCARGO (R22-BLOG-IMG, 18-sep-2026) — `npm run paginas` estaba ROTO en
   * `main` y esto lo desbloquea. No es una decision de diseño: es la guarda que ya describe el
   * comentario de `CAPTACION` ARRIBA («ESTE GENERADOR SOLO HACE `/services/`») y que exige el
   * invariante de ABAJO (`captacionAplicada === RUTAS_CAPTACION_SERVICIOS.length`), pero que no
   * estaba escrita en ningun sitio.
   *
   * QUE PASABA. R20-CIUDADES metio `/services/pool-builders/{ocala,gainesville}-florida` en
   * `captacion-servicios.json`. Esas dos las pinta `src/pages/services/pool-builders/[slug].astro` desde
   * Sanity y su `_source/vivo/` no tiene `section.gallery`, `section.faq-section` ni
   * `section.location` -comprobado: 0 de las 3-, asi que el bloque 8b lanzaba y el generador
   * abortaba en la ruta 44 de 115. Las 10 de `/blogs/` son las 93-102: no se llegaba a ellas.
   *
   * Reproducible con el generador de HEAD y el arbol limpio, o sea que no lo trajo este encargo
   * ni el trabajo sin commitear de R21.
   */
  if (!esFicha(ruta)) return false;

  /* ── 1 · EL HEROE ──────────────────────────────────────────────────────────────────────
   * Cuatro cosas, y cada una tiene su numero detras:
   *
   * LA FOTO. La que habia -`new-pool-spa-construction-florida.avif`- es una EXCAVACION: un
   * hoyo con una miniexcavadora. Miradas en hoja de contactos las cuatro fotos propias de la
   * ruta, LAS CUATRO son obra en curso y ninguna es una piscina terminada. En la imagen LCP de
   * una landing de pago eso no vende nada. La nueva es obra real de North Florida con ficha
   * propia en `/project/estate-pool-spa-sun-shelf-north-florida`.
   *
   * `eager` + `fetchpriority="high"`. Era el LCP y llevaba `loading="lazy"`: el navegador lo
   * trataba como diferible. En todo el sitio solo UNA imagen llevaba `fetchpriority`.
   *
   * `width`/`height`. El manifiesto no conoce las fotos de `projects/` -no vienen de Webflow-,
   * asi que las dimensiones van declaradas en el JSON y se hornean aqui.
   *
   * EL CTA ANCLA AL FORMULARIO DE ESTA PAGINA. Antes salia a `/request-estimated`: un segundo
   * clic que el anuncio ya habia pagado. El camino a `/request-estimated` NO desaparece —sigue
   * en `.cta-footer`, que es el cierre de 102 rutas—, asi que la regla 7 de `check:ads`
   * («ningun enlace a los destinos de conversion») sigue satisfecha. */
  const heroe = doc.querySelector('section.hero-services');
  if (heroe) {
    heroe.classList.add('svc-heroe');
    const img = heroe.querySelector('img.image-bg-hero-services');
    if (img) {
      img.setAttribute('src', c.heroe.foto);
      img.setAttribute('alt', c.heroe.alt);
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
      img.setAttribute('width', String(c.heroe.ancho));
      img.setAttribute('height', String(c.heroe.alto));
      heroesDesperezados++;
    }
    const bloque = heroe.querySelector('.block-hero-services-page');
    const parrafo = bloque?.querySelector('p');
    if (parrafo) parrafo.textContent = c.heroe.apoyo;
    const cta = bloque?.querySelector('a.button');
    if (cta) {
      cta.setAttribute('href', c.heroe.ancla);
      /* SEO-REMEDIACION (Sebastian, 4-oct-2026): «Request a Design-Build Project Evaluation» en
       * las dos landings de piscina. Opt-in por `heroe.cta`; las otras doce siguen como estaban. */
      if (c.heroe.cta) cta.textContent = c.heroe.cta;
      /* LOS DOS TELEFONOS, NORTH FLORIDA PRIMERO. La pagina no tenia NI UNO en el cuerpo: el
       * invariante de `check:ads` («el de North Florida antes que el de South») lo cumplia solo
       * el cromo -el nav y el boton flotante-. Era un verde prestado. Salen de
       * `src/data/telefonos.json`, que es la fuente unica, y en su orden. */
      const tel = doc.createElement('p');
      tel.className = 'svc-heroe__tel';
      tel.innerHTML = TELEFONOS
        .map((t) => `<a href="tel:${t.tel}">${t.visible}</a> ${t.zona}`)
        .join(' &middot; ');
      const lic = doc.createElement('p');
      lic.className = 'svc-heroe__lic';
      lic.textContent = c.heroe.licencias;
      cta.parentNode.insertBefore(tel, cta);
      cta.parentNode.insertBefore(lic, cta);
    }

    /* ── REDISEÑO STITCH · ASTRO-2 · HERO A (12-oct-2026) ──────────────────────────────────────
     * El hero deja de ser texto sobre foto con velo: texto a la izquierda y la foto a sangre a
     * la derecha (lámina G2-A, STITCH-PARTE-6 y 18). Mismo texto, mismo destino del botón, la
     * misma imagen con sus medidas y `fetchpriority="high"`. Lo que cambia de forma:
     *   · los dos teléfonos y la licencia pasan a la banda de datos `.mm-datos` (mismo contenido);
     *   · el H1 lleva el rotulador en la palabra de servicio (`heroe.marca`, CON GUARDA: si la
     *     palabra no está en el H1, el build revienta en vez de publicar un título sin marca).
     * La sección pasa a llamarse `mm-hero-a`: sin `hero-services` no le llega ni una regla de
     * `webflow.css` ni de `servicio-core.css`, que es lo que permite retirarlas. */
    const h1 = heroe.querySelector('h1');
    const deco = heroe.querySelector('.heading-deco-services');
    if (img && h1 && cta && c.heroe.marca) {
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const titulo = h1.textContent.trim();
      if (!titulo.includes(c.heroe.marca)) {
        console.error(`\n  ROJO ${ruta}: heroe.marca «${c.heroe.marca}» no está en el H1 «${titulo}»\n`);
        process.exit(1);
      }
      const [antes, ...resto] = titulo.split(c.heroe.marca);
      const [rotLic, ...valLic] = c.heroe.licencias.split(' · ');
      const nuevo = doc.createElement('section');
      nuevo.className = 'mm-hero-a';
      /* D-118: la miga, visible, de la MISMA funcion que da el `BreadcrumbList` del JSON-LD
       * (`miga-tramos.mjs`): lo que se ve es lo que ya se le declara a Google. */
      const tramos = tramosMiga(ruta);
      const miga = tramos.length > 1 ? '<nav class="mm-miga" aria-label="Breadcrumb"><ol>'
        + tramos.map((t, k) => (k === tramos.length - 1 ? `<li aria-current="page">${esc(t.nombre)}</li>` : `<li><a href="${t.href}">${esc(t.nombre)}</a></li>`)).join('')
        + '</ol></nav>' : '';
      nuevo.innerHTML = '<div class="mm-hero-a-txt">' + miga
        + (deco ? `<p class="mm-etiqueta">${esc(deco.textContent.trim())}</p>` : '')
        + `<h1 class="mm-h1">${esc(antes)}<span class="mm-rot">${esc(c.heroe.marca)}</span>${esc(resto.join(c.heroe.marca))}</h1>`
        + `<p class="mm-p">${esc(c.heroe.apoyo)}</p>`
        + `<div class="mm-hero-a-acc"><a class="mm-btn" href="${cta.getAttribute('href')}">${esc(cta.textContent.trim())}</a></div>`
        + '<div class="mm-datos mm-datos--3">'
        + TELEFONOS.map((t) => `<a class="mm-dato" href="tel:${t.tel}"><span class="mm-dato-rot">${t.zona}</span><span class="mm-dato-val">${t.visible}</span></a>`).join('')
        + `<div class="mm-dato"><span class="mm-dato-rot">${esc(rotLic)}</span><span class="mm-dato-val">${esc(valLic.join(' · '))}</span></div>`
        + '</div></div>'
        + `<figure class="mm-hero-a-medio"><img sizes="(min-width: 992px) 50vw, 100vw" src="${img.getAttribute('src')}" alt="${img.getAttribute('alt').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" width="${c.heroe.ancho}" height="${c.heroe.alto}" loading="eager" fetchpriority="high" decoding="async">${pieDeFoto(c.heroe)}</figure>`
        + franjaDeLogos(doc);
      heroe.replaceWith(nuevo);
      /* La marquesina de logos de Webflow se va de la ficha: la primera pasa a ser la fila
       * estática de dentro del hero (lámina G2-A) y la repetida junto al pie se retira (D-53). */
      /* SE MARCAN, NO SE QUITAN AQUI: los bloques de mas abajo usan `logos-section` de ancla
       * (confianza, formulario, el canje de galeria). La salida las omite al emitir. */
      doc.querySelectorAll('section.logos-section').forEach((x) => x.setAttribute('data-mm-retirada', ''));
    }
  }

  /* `og:image` / `twitter:image` = EL HEROE, opt-in por `heroe.og` (R24-FOTO-PISCINAS, 1-oct-2026).
   * Hasta hoy se copiaban del `<head>` de origen, y en las dos fichas de piscina eran imagenes
   * GENERADAS (`trainedAlgorithmicMedia` + «Made with Google AI»): la tarjeta que se ve al compartir
   * la pagina era la unica foto falsa que no salia en el cuerpo. `heroe.og` es un JPEG 1200x630
   * derivado del heroe, no el AVIF: varios rastreadores sociales no pintan AVIF. `metaSeo` lee este
   * mismo `<head>` mas abajo y `Base.astro` lo vuelve absoluto. Solo las rutas que lo declaran. */
  if (c.heroe.og) {
    for (const k of ['og:image', 'twitter:image']) {
      const m = doc.head.querySelector(`meta[property="${k}"],meta[name="${k}"]`);
      if (!m) {
        console.error(`\n  ROJO ${ruta}: heroe.og declarado y el origen no trae ${k}\n`);
        process.exit(1);
      }
      m.setAttribute('content', c.heroe.og);
    }
  }

  /* ── 2 · FUERA EL ANTES/DESPUES ────────────────────────────────────────────────────────
   * La foto «Before» es de un listado del MLS de Miami, con la marca de agua
   * `A11…… © Miami MLS© 202…` incrustada y visible a tamano real, y un `alt` que atribuye la
   * escena a Mr & Mrs. Encima, el «After» es OTRO patio: otra casa, otra valla, otra
   * vegetacion. La seccion ensena una transformacion que NO OCURRIO, que es lo que
   * `CRITERIO.md:200` llama «no es feo, es falso».
   *
   * Se retira de las 14 fichas salvo opt-in (abajo). Vuelve en su propio commit cuando
   * exista el par honesto: obra real como «After» y el «Before» reconstruido por relleno
   * generativo sobre esa misma foto, con etiqueta VISIBLE de visualizacion. El prompt, la
   * mascara y la prueba de aceptacion estan escritos en `docs/encargos/R17-CORE.md` §10.
   *
   * Sus dos tarjetas de valor -«Design-Build Authority» y «Licensed & Engineered»- no se
   * pierden: suben a la franja de confianza, dichas mas corto.
   *
   * VUELVE EN LA DE REMODELACION (R24-FOTO-PISCINAS, 1-oct-2026), y sin relleno generativo: el
   * banco de obra propia tiene el par honesto, «antes» y «despues» de la MISMA piscina desde el
   * mismo punto de camara. Opt-in por `antesDespues` en el JSON; donde no se declara, se sigue
   * retirando. Solo se canjean las dos `<img>`: el texto es el del origen, que `check:texto` ya
   * tiene en su baseline, y el CSS y el JS del deslizador son globales (`antes-despues.css`,
   * `Componentes.astro`). El «despues» se pinta encima del «antes» con `clip-path`: si no miden
   * lo mismo la costura no casa (`fb4318f`), y eso es ROJO, no un aviso.
   *
   * Y EN LA DE OBRA NUEVA (2-oct-2026), con el par de la home (`fb4318f`): patio vacio -> piscina,
   * la misma casa. Es lo que ya promete su texto del origen, «From Empty Backyard to Your Dream
   * Custom Pool», asi que el texto se queda. */
  const antesDespues = doc.querySelector('section.before-after-section');
  if (c.antesDespues) {
    const { antes, despues } = c.antesDespues;
    const pares = [[antesDespues?.querySelector('img.bas-image-before'), antes],
      [antesDespues?.querySelector('img.bas-image-after-h'), despues]];
    if (pares.some(([img]) => !img)) {
      console.error(`\n  ROJO ${ruta}: antesDespues declarado y el origen no trae el deslizador\n`);
      process.exit(1);
    }
    if (antes.ancho !== despues.ancho || antes.alto !== despues.alto) {
      console.error(`\n  ROJO ${ruta}: el antes y el despues no miden igual — la costura no casa\n`);
      process.exit(1);
    }
    for (const [img, f] of pares) {
      img.setAttribute('src', f.src);
      img.setAttribute('srcset', f.srcset);
      img.setAttribute('sizes', '(min-width: 992px) 56vw, 100vw');   // el de la home
      img.setAttribute('alt', f.alt);
      img.setAttribute('width', String(f.ancho));
      img.setAttribute('height', String(f.alto));
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  } else {
    antesDespues?.remove();
  }

  /* ── 3 · LAS RESENAS SUBEN DEL BLOQUE 10 AL 5 ──────────────────────────────────────────
   * Ocho resenas reales de Google Business Profile, y no se veian hasta pasada la mitad de la
   * pagina. Justo debajo del formulario es donde sirven: son la objecion que queda despues de
   * decidir dejar los datos.
   *
   * Se mueve la SECCION entera -`testimonial-section` lleva dentro el marcador del componente
   * `ResenasGoogle`-, no el componente suelto, asi que su encabezado viaja con ella.
   * `insertBefore` con el hermano siguiente de `logos-section` la deja justo detras de los dos
   * marcadores que se anaden en el bucle. */
  const logos = doc.querySelector('section.logos-section');
  const testimonios = doc.querySelector('section.testimonial-section');
  if (logos && testimonios && logos.parentNode) {
    logos.parentNode.insertBefore(testimonios, logos.nextSibling);
  }

  /* ── 3.bis · «WHY» Y «CUSTOM» SE FUNDEN, Y SUBEN DELANTE DEL FORMULARIO (C4) ───────────
   * Sebastian lo pidio por experiencia de uso, y el motivo es bueno: asi se ven imagenes de
   * obra ANTES de pedirle los datos a nadie. El mosaico de fotos dejaba de estar enterrado
   * detras del formulario.
   *
   * `trusted-section` NO es hermana de primer nivel -cuelga del `<div>` sin clase, ver el
   * bloque 4-, asi que esto la SACA de ahi y la deja como hermana justo detras de
   * `logos-section`. Se hace despues del bloque 3 a proposito: `logos.nextSibling` ya son las
   * resenas, asi que la intro queda entre las dos y el orden final es
   *
   *     logos · «Why» (ConfianzaCore) · «Custom» (intro) · formulario · resenas
   *
   * Y al ser hermana de primer nivel, el bucle de mas abajo SI la ve, que es lo que permite
   * colgar de ella el marcador del formulario sin nodos de texto.
   *
   * 🚨 `.trusted-section` LA MONTAN 80 PAGINAS CONSTRUIDAS
   * (`grep -rlo 'trusted-section' .vercel/output/static --include='*.html' | wc -l`), asi que
   * su regla global NO se toca. La marca `svc-intro` es lo que permite corregirla SOLO aqui;
   * y `mm-inverso` le da el navy y, sobre todo, redefine los papeles del ambito -tinta,
   * enlace, borde y foco- por cero bytes. */
  const intro = doc.querySelector('section.trusted-section');
  if (logos && intro && logos.parentNode) {
    logos.parentNode.insertBefore(intro, logos.nextSibling);
    /* ASTRO-2 · lamina «Intro»: el titular, el parrafo y el enlace de siempre, centrados dentro
     * de un marco de dos esquinas. Las tres fotos del mosaico salen (no son texto) y con ellas
     * sus `data-w-id`. La seccion deja de llamarse `trusted-section` para no heredar la regla
     * global de Webflow que siguen usando las demas plantillas. */
    const h2 = intro.querySelector('h2');
    const p = intro.querySelector('.text-divider p');
    const a = intro.querySelector('.wrapper-buttons a');
    if (!h2 || !p || !a) throw new Error(`${ruta}: la intro no trae titular, parrafo o enlace`);
    const nueva = doc.createElement('section');
    nueva.setAttribute('class', 'svc-intro mm-intro');
    // El rotulador va en el territorio, que es como cierran los 14 titulares.
    const tit = h2.innerHTML.replace(/((?:North &amp; South )?Florida(?: Homes)?)\s*$/, '<span class="mm-rot">$1</span>');
    if (tit === h2.innerHTML) throw new Error(`${ruta}: el titular de la intro no cierra con el territorio`);
    nueva.innerHTML = `<div class="mm-marco"><h2 class="mm-h2">${nbIntro(tit)}</h2><p class="mm-p">${p.innerHTML}</p>`
      + `<a class="mm-flecha" href="${a.getAttribute('href')}">${a.innerHTML}${FLECHA}</a></div>`;
    intro.replaceWith(nueva);
  }

  /* ── 4 · EL MARCADOR DE LA BANDA DE INVERSION ──────────────────────────────────────────
   * 🚨 SEIS SECCIONES DE ESTA FICHA NO SON HERMANAS DE PRIMER NIVEL: `trusted-section`,
   * `services`, `before-after-section`, `process-section`, `gallery` y `faq-section` cuelgan
   * TODAS de un `<div>` sin clase que si lo es. El bucle de hermanos no las ve una a una, asi
   * que un `n.matches('section.process-section')` alli no casa nunca — comprobado en rojo: la
   * primera version de esto dejo la pagina sin banda de inversion y sin que nada lo dijera.
   *
   * La salida es insertar el marcador COMO NODO DE TEXTO en el DOM, donde toca. Al serializar
   * el `<div>`, `limpia()` se lo lleva dentro y el troceo de mas abajo lo convierte en
   * `<InversionCore />`. `@` no se escapa en un nodo de texto, asi que el marcador sobrevive. */
  const proceso = doc.querySelector('section.process-section');
  if (proceso && proceso.parentNode) {
    proceso.parentNode.insertBefore(
      doc.createTextNode(MARCA + 'InversionCore' + MARCA), proceso.nextSibling);
  }

  /* ── 4.bis · LAS FOTOS DE LOS PASOS (R24-FOTO-PISCINAS, 1-oct-2026) ─────────────────────
   * Los 4 pasos de las fichas de piscina eran PNG GENERADOS de 1408x768 con firma C2PA de Google
   * (~2 MB cada uno): obra inventada donde el visitante lee «asi trabajamos nosotros». Opt-in por
   * `proceso.fotos`, en el orden del origen; se cuentan para que un paso de mas o de menos sea
   * ROJO y no una foto en el paso equivocado. Fuera `srcset`/`sizes`: un `srcset` heredado
   * apuntaria a los recortes del PNG viejo. Estas `<img>` no llevan `data-w-id`. */
  if (c.proceso?.fotos) {
    const pasos = [...(proceso?.querySelectorAll('img.img-process') ?? [])];
    if (pasos.length !== c.proceso.fotos.length) {
      console.error(`\n  ROJO ${ruta}: proceso.fotos trae ${c.proceso.fotos.length} y el origen ${pasos.length} pasos\n`);
      process.exit(1);
    }
    pasos.forEach((img, i) => {
      const f = c.proceso.fotos[i];
      if (!f) return;            // LOOP-IMAGENES: `null` = ese paso se queda, como en fotos-por-ruta.json
      img.setAttribute('src', f.foto);
      img.setAttribute('alt', f.alt);
      img.setAttribute('width', String(f.ancho));
      img.setAttribute('height', String(f.alto));
      if (f.pos) img.setAttribute('style', `object-position:${f.pos}`);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    });
  }

  /* ── 5 · LA REJILLA DE SUBSERVICIOS ────────────────────────────────────────────────────
   * TRES arreglos, y el tercero es el que vale dinero.
   *
   * EL ORDEN. De los ocho subservicios, SEIS hablaban de remodelacion: tres lo dicen en el
   * titulo y otros tres en el texto («renovations», «upgrades», «existing pools»). En la ficha
   * cuyo `<h1>` es «Custom Pool BUILDERS» eso canibaliza la intencion de la ficha hermana. Se
   * REORDENAN, no se borran (Principio 1): construccion nueva delante, remodelacion detras.
   *
   * EL TEXTO. La primera tarjeta decia «Custom pool REDESIGNS engineered for Florida homes».
   * En una landing de obra nueva, eso es la intencion equivocada en la primera tarjeta que se
   * lee. Igual con los dos «upgrades». Las sustituciones van en el JSON, no aqui.
   *
   * LOS ENLACES. Ninguna de las ocho tarjetas enlazaba a ningun sitio. Las tres de
   * remodelacion pasan a llevar a la landing de Remodeling: separa los dos clusters y manda el
   * lead donde vale, en vez de dejarlo muerto en una tarjeta sin salida. */
  const svc = doc.querySelector('section.services');
  if (svc && c.servicios) {
    /* Las cuatro claves de abajo son OPCIONALES desde R22-DETALLE. La ficha de piscina las
     * trae todas porque R17-CORE arreglo ahi la errata del rotulo, reescribio tres resumenes
     * y mando las tres tarjetas de remodelacion a su landing. Las otras trece solo traen
     * `detalle`: su rotulo y sus textos son los del origen y no se tocan, asi que pedirles
     * las claves que no tienen solo serviria para reventar el generador. */
    const deco = svc.querySelector('.heading-deco');
    if (deco && c.servicios.rotulo) deco.textContent = c.servicios.rotulo;   // la errata «What do we do!»

    const lista = svc.querySelector('.cms-list-subservices');
    const items = [...svc.querySelectorAll('.cms-item-subservices')];
    const titulo = (el) => el.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const porTitulo = new Map(items.map((el) => [titulo(el).replace(/&/g, '&'), el]));

    for (const [t, nuevo] of Object.entries(c.servicios.textos ?? {})) {
      const el = porTitulo.get(t);
      const parrafo = el?.querySelector('.paragraph-mini');
      if (parrafo) parrafo.textContent = nuevo;
    }

    /* Las de remodelacion se envuelven en un `<a>` que va a su landing. El ancla cuelga DENTRO
     * de la tarjeta, alrededor de `.item-subservice`, para no romper la rejilla: el `<li>` de
     * Webflow sigue siendo el hijo directo de la lista. */
    for (const t of c.servicios.remodelacion ?? []) {
      const el = porTitulo.get(t);
      const caja = el?.querySelector('.item-subservice');
      if (!caja) continue;
      const a = doc.createElement('a');
      a.setAttribute('href', c.servicios.remodelacionHref);
      a.className = 'svc-subservicio';
      caja.parentNode.insertBefore(a, caja);
      a.appendChild(caja);
    }

    /* ── LAS FILAS DE DETALLE (`servicios.detalle`) ────────────────────────────────────
     * La rejilla de ocho tarjetas decia QUE se hace y no decia nada mas: ocho resumenes de
     * una linea, sin foto y sin contexto, en la ficha donde el visitante esta decidiendo una
     * obra de cinco cifras. `detalle` la sustituye por filas alternas foto/texto, y cada fila
     * AGRUPA los subservicios que de verdad van juntos en la obra.
     *
     * LOS SUBSERVICIOS NO SE REESCRIBEN NI SE COPIAN AL JSON: `items` son REFERENCIAS por
     * titulo a las tarjetas que ya estan en el marcado de origen. Asi el texto que se publica
     * sigue siendo el del origen al 100 % -que es lo que `check:texto` exige-, y el dia que
     * alguien toque un subservicio en Webflow esto no se queda mintiendo. Si un titulo
     * referenciado no aparece, ABORTA: un subservicio perdido en silencio es justo el fallo
     * que esta capa existe para no tener.
     *
     * LOS `h3` BAJAN A `h4`. La fila estrena el `h3`, asi que los ocho titulos pasan a `h4`
     * para que la jerarquia sea real. NO cambia `innerText`: `webflow.css` pone
     * `text-transform: capitalize` en los CUATRO niveles de encabezado, asi que el texto
     * renderizado es el mismo antes y despues. Comprobado en la hoja, no supuesto.
     *
     * SIN `detalle` NO PASA NADA DE ESTO y se aplica el reorden plano de siempre: es lo que
     * mantiene identicas las trece fichas que aun no tienen la clave. */
    if (c.servicios.detalle && lista) {
      const usados = new Set();
      const banda = doc.createElement('div');
      banda.className = 'svc-detalle';

      for (const fila of c.servicios.detalle) {
        const f = doc.createElement('div');
        f.className = `svc-detalle__fila svc-detalle__fila--${fila.lado}`;

        const foto = doc.createElement('img');
        foto.className = 'svc-detalle__foto';
        foto.setAttribute('src', fila.foto);
        foto.setAttribute('alt', fila.alt);
        foto.setAttribute('width', String(fila.ancho));
        foto.setAttribute('height', String(fila.alto));
        foto.setAttribute('loading', 'lazy');
        f.appendChild(foto);

        const cuerpo = doc.createElement('div');
        cuerpo.className = 'svc-detalle__cuerpo';
        const h = doc.createElement('h3');
        h.className = 'svc-detalle__tit';
        h.textContent = fila.titulo;
        cuerpo.appendChild(h);
        const p = doc.createElement('p');
        p.className = 'svc-detalle__intro';
        p.textContent = fila.parrafo;
        cuerpo.appendChild(p);

        const ul = doc.createElement('ul');
        ul.className = 'svc-detalle__lista';
        for (const t of fila.items) {
          const el = porTitulo.get(t);
          if (!el) {
            console.error(`\n  ROJO ${ruta}: \`servicios.detalle\` referencia el subservicio `
              + `«${t}» y no esta en el marcado de origen\n`);
            process.exit(1);
          }
          usados.add(t);
          const li = doc.createElement('li');
          li.className = 'svc-detalle__item';
          /* EL `data-w-id` SE MUDA CON LA TARJETA, y esto no es cosmetico: `reveals.json` lo
           * mapea a `growIn`, y al tirar el envoltorio `.cms-item-subservices` la clave se
           * quedaba SIN ELEMENTO en las catorce fichas a la vez. `check:ix2` lo caza contando
           * claves huerfanas (salio 15 contra un umbral de 14) y tiene razon: sin esto los ocho
           * subservicios entran planos mientras todo lo que los rodea aparece con su reveal.
           * Subir el umbral habria tapado el sintoma; la animacion se mueve con lo que animaba. */
          const wid = el.getAttribute('data-w-id');
          if (wid) li.setAttribute('data-w-id', wid);
          /* `firstElementChild` es el `<a class="svc-subservicio">` en los de remodelacion y
           * `.item-subservice` en los demas: el envoltorio de Webflow se queda fuera. */
          li.appendChild(el.firstElementChild);
          /* `.item-subservice` es la PIEL DE TARJETA: `webflow.css` le pone relleno de 2em,
           * radio y sombra, y `servicios.css` fondo tenido y borde. Dentro de una fila que ya
           * trae foto, eso es una caja dentro de otra caja. Se RENOMBRA en vez de anularse
           * declaracion a declaracion: seis anulaciones en `servicio-core.css` costaban 190 B
           * de un presupuesto de capa que `check:tokens` deja hoy en 1 KB. Las otras clases
           * (`div-block-2`, `heading-2`, `paragraph-mini`) SE QUEDAN: ahi `servicios.css` ya
           * dice lo que esta fila quiere. */
          const caja = li.querySelector('.item-subservice');
          if (caja) caja.className = 'svc-detalle__caja';
          const t3 = li.querySelector('h3.heading-2');
          if (t3) {
            const t4 = doc.createElement('h4');
            t4.className = t3.className;
            t4.textContent = t3.textContent;
            t3.replaceWith(t4);
          }
          ul.appendChild(li);
        }
        cuerpo.appendChild(ul);
        f.appendChild(cuerpo);
        banda.appendChild(f);
      }

      /* Los titulos salen de `porTitulo`, que se construyo ANTES de mover nada. Leerlos ahora
       * del DOM con `items.map(titulo)` devuelve ocho cadenas vacias: el `<h3>` ya vive dentro
       * de su `<li>` y el envoltorio de Webflow se ha quedado hueco. Salio en rojo. */
      const huerfanos = [...porTitulo.keys()].filter((t) => !usados.has(t));
      if (huerfanos.length) {
        console.error(`\n  ROJO ${ruta}: \`servicios.detalle\` deja fuera ${huerfanos.length} `
          + `subservicio(s) -> ${huerfanos.join(', ')}\n`);
        process.exit(1);
      }

      const envoltorio = svc.querySelector('.cms-wrapper-subservices');
      (envoltorio ?? lista).replaceWith(banda);
    } else if (lista && c.servicios.construccionPrimero) {
      /* El reorden: primero los declarados de construccion, en su orden, y detras los de
       * remodelacion. Un titulo que no este en ninguna de las dos listas se queda donde
       * estaba, detras de los declarados: asi anadir un subservicio en el origen no rompe
       * nada en silencio. */
      const orden = [...c.servicios.construccionPrimero, ...(c.servicios.remodelacion ?? [])];
      const ordenados = [
        ...orden.map((t) => porTitulo.get(t)).filter(Boolean),
        ...items.filter((el) => !orden.includes(titulo(el))),
      ];
      for (const el of ordenados) lista.appendChild(el);
    }

    /* Un paso siguiente al final de la rejilla: ocho tarjetas y ninguna salida era dos
     * secciones seguidas sin CTA. */
    const cajaSvc = svc.querySelector('.block-page-service') ?? svc.querySelector('.container');
    if (cajaSvc && c.servicios.cta) {
      const p = doc.createElement('p');
      p.className = 'svc-cierre';
      const a = doc.createElement('a');
      a.setAttribute('href', c.servicios.cta.href);
      a.className = 'button button-styles w-button';
      a.textContent = c.servicios.cta.texto;
      p.appendChild(a);
      cajaSvc.appendChild(p);
    }
  }

  /* ── 6 · LA FAQ ────────────────────────────────────────────────────────────────────────
   * La respuesta de financiacion publicaba «$75,000 … $500,000+». La hoja 18 del libro de Ads
   * marca `$75K` como DATA NOT AVAILABLE y la decision de Sebastian del 2-sep-2026 (TILA/Reg Z)
   * prohibe cifras financieras en el sitio. Sale de aqui Y del JSON-LD (paso 9).
   *
   * Y se anaden las tres objeciones que faltaban -coste, permisos y que incluye-, todas con
   * respuesta que la propia pagina ya sostiene. El `FAQPage` se actualiza en el paso 9 para que
   * siga coincidiendo con lo que se ve: dos listas distintas es peor que una sola. */
  const faq = doc.querySelector('section.faq-section .wrapper-faq-components');
  if (faq && c.faq) {
    for (const [preg, resp] of Object.entries(c.faq.sustituye)) {
      for (const d of faq.querySelectorAll('.dropdown-faq')) {
        if (d.querySelector('h3')?.textContent?.trim() === preg) {
          const p = d.querySelector('nav p');
          if (p) p.textContent = resp;
        }
      }
    }
    const molde = faq.querySelector('.dropdown-faq');
    for (const { pregunta, respuesta } of c.faq.anade) {
      if (!molde) break;
      const nuevo = molde.cloneNode(true);
      /* SIN `data-w-id`, como `/financing`. El `data-rev` lo pone el JS casando el `data-w-id`
       * contra `src/data/reveals.json`: duplicar el del molde daria dos elementos peleandose por
       * la misma entrada, e inventar uno seria marcado que miente. El acordeon funciona por
       * clase, no por ese atributo (`Interacciones.astro:180-235`). */
      nuevo.removeAttribute('data-w-id');
      const h3 = nuevo.querySelector('h3');
      const p = nuevo.querySelector('nav p');
      if (h3) h3.textContent = pregunta;
      if (p) p.textContent = respuesta;
      faq.appendChild(nuevo);
    }
  }

  /* ── 7 · NORTH FLORIDA DELANTE EN `location` ───────────────────────────────────────────
   * La seccion ponia South Florida primero. En la landing cuyo anuncio promete North Florida y
   * cuyo `<title>` dice «Custom Pool Builders in North Florida». Medido sobre el cuerpo: la
   * primera «South Florida» estaba en el caracter 97 y la primera «North Florida» suelta en el
   * 6053. Se intercambian los dos bloques: MISMAS lineas, otro orden. */
  const bloques = [...doc.querySelectorAll('section.location .item-country')];
  if (bloques.length === 2) {
    const norte = bloques.find((b) => /north florida/i.test(b.textContent ?? ''));
    const sur = bloques.find((b) => b !== norte);
    if (norte && sur && norte.parentNode) norte.parentNode.insertBefore(norte, sur);
  }

  /* ── 8 · LA GALERIA, EN LAS CATORCE Y DETRAS DE LA FAQ (Sebastian, 13-sep-2026) ─────────
   * Las 14 fichas tienen que tener la misma estructura y el mismo orden. Hasta hoy la de
   * piscina cambiaba `gallery` por `CarruselProyectos` (opt-in `proyectos.reemplazaGaleria`,
   * R17-CORE) y en las otras trece la galeria iba entre la banda de inversion y la FAQ. Ahora
   * las catorce llevan su `gallery`, detras de la FAQ y delante de `location`. Sustituye el
   * orden confirmado en `docs/encargos/R19-CAMBIOS.md` (projects 10 · FAQ 11 · location 12).
   *
   * LAS FOTOS SON LAS DE ORIGEN EN LAS CATORCE, tambien en la de piscina (Sebastian, 14-sep-2026):
   * su `gallery` pinta las 10 de «New Pool and Spa Construction» de `/gallery`
   * (`custom-pool-spa-builders-florida-10…01`, mismo orden y mismo `alt`). Del 13 al 14-sep llevo
   * 8 de obra propia; se retiro a peticion suya. SE ACEPTA, Y QUEDA DICHO, que esas 10 son
   * tambien las del feed de Instagram de la misma pagina (solape 10/10, R17-CORE §4.7). */
  if (c.proyectos) {
    throw new Error(`${ruta}: \`proyectos\` ya no existe en captacion-servicios.json — las fichas `
      + 'de /services/ llevan su `gallery` desde el 13-sep-2026');
  }
  const galeria = doc.querySelector('section.gallery');
  const seccionFaq = doc.querySelector('section.faq-section');
  const ubicacion = doc.querySelector('section.location');
  const resenas = doc.querySelector('section.testimonial-section');
  if (!galeria || !seccionFaq || !ubicacion || !resenas) {
    throw new Error(`${ruta}: falta ${[!galeria && 'section.gallery', !seccionFaq && 'section.faq-section',
      !ubicacion && 'section.location', !resenas && 'section.testimonial-section'].filter(Boolean).join(' y ')}`
      + ' — sin las cuatro no hay mismo orden');
  }

  /* `alt` PROPIOS EN LA GALERIA (R24-FOTO-PISCINAS, 1-oct-2026). Las fotos son las de origen y no
   * se tocan, pero en la de remodelacion tres `alt` estaban repetidos (la 10 copia el de la 09, la
   * 03 el de la 02, y la 01 lleva el de otra galeria): dos imagenes con el mismo `alt` en la misma
   * pagina no le dicen nada distinto a nadie. Se casa por el FINAL del nombre porque aqui la `src`
   * aun es la del CDN (`localizar()` corre despues), y tiene que casar exactamente una. */
  for (const [fichero, alt] of Object.entries(c.galeria?.alts ?? {})) {
    const casan = [...galeria.querySelectorAll('img')]
      .filter((i) => (i.getAttribute('src') ?? '').endsWith(fichero));
    if (casan.length !== 1) {
      throw new Error(`${ruta}: galeria.alts «${fichero}» casa ${casan.length} fotos de la galeria`);
    }
    casan[0].setAttribute('alt', alt);
  }

  /* EL CANJE (21-sep-2026). Sebastian pide las dos bandas azules intercambiadas: la GALERIA
   * pasa a ir justo debajo del formulario —donde estaban las resenas— y las RESENAS bajan
   * detras de la FAQ, donde estaba la galeria.
   *
   * Es un canje 1:1 de POSICION, y eso es lo que lo hace barato. Las dos secciones son bandas
   * de la familia «fondo agua» (`propio.css` §juntas): mientras cada una siga teniendo vecinos
   * NO azules por arriba y por abajo, ninguna junta se dispara y ningun color se mueve. Si en
   * vez de canjear se aplanase el `<div>`, las resenas quedarian pegadas a otra banda azul y
   * «Updated Aug 2026» caeria a ~3,5:1 — suspenso AA, medido en `propio.css` §593-601.
   *
   * ANCLADO A ELEMENTOS, NO A POSICIONES. `insertBefore(galeria, resenas)` deja la galeria
   * exactamente donde estaba la otra, sea cual sea el puesto; y como la FAQ es la ultima hija
   * del `<div>` una vez sale la galeria, insertar tras ella equivale a cerrar el `<div>`.
   *
   * Las guardas convierten cualquier otra forma del origen en un error, no en un orden distinto
   * en silencio — que es el modo de fallo que este repo lleva siete casos matando. */
  if (galeria.parentNode !== seccionFaq.parentNode) {
    throw new Error(`${ruta}: gallery y faq-section ya no son hermanas — revisa el origen`);
  }
  if (resenas.parentNode !== galeria.parentNode.parentNode) {
    throw new Error(`${ruta}: testimonial-section no cuelga de donde se espera — revisa el bloque 3`);
  }
  resenas.parentNode.insertBefore(galeria, resenas);
  seccionFaq.parentNode.insertBefore(resenas, seccionFaq.nextSibling);
  if (resenas.nextElementSibling || resenas.parentNode.nextElementSibling !== ubicacion) {
    throw new Error(`${ruta}: tras el canje, lo que sigue a las resenas no es section.location`);
  }
  if (galeria.nextElementSibling !== resenas.parentNode) {
    throw new Error(`${ruta}: tras el canje, la galeria no quedo delante del <div> de contenido`);
  }
  /* Con la banda azul encima, `location` pierde el padding de la FAQ en su costura de arriba:
   * la marca le da el suyo en `servicio-core.css` §6 sin tocar las otras 3 rutas que la montan.
   * Tras el canje la banda de encima son las RESENAS en vez de la galeria — sigue siendo azul,
   * asi que la clase sigue haciendo falta igual. */
  ubicacion.classList.add('svc-ubicacion');
  galeriasMovidas++;

  /* ── 9 · WIDTH/HEIGHT EN TODAS LAS IMAGENES DE LA RUTA ─────────────────────────────────
   * De las 56 `<img>` del cuerpo, 42 no declaraban tamano. Son el motor del CLS, y el
   * manifiesto conoce las 42 -comprobado antes de escribir esto: 0 desconocidas-, asi que se
   * pueden hornear todas sin un solo hueco de datos.
   *
   * Esto NO se hace con `RESERVAN_HUECO` porque esa lista es GLOBAL POR CLASE y su propio
   * comentario avisa del riesgo: dar proporcion a un `<img>` cuyo CSS le fija solo una de las
   * dos dimensiones SI cambia lo pintado, y son 115 rutas con contrato de paridad. Aqui el
   * radio es UNA ruta, que ademas se va a re-aprobar mirandola. */
  for (const img of doc.querySelectorAll('img:not([width])')) {
    const src = img.getAttribute('src');
    const d = DIM.get(src) ?? DIM_CDN.get(src);
    if (!d) continue;                 // las que el manifiesto no conoce se quedan como estaban
    img.setAttribute('width', String(d.w));
    img.setAttribute('height', String(d.h));
  }

  /* ── 10 · EL JSON-LD, QUE ESTABA ROTO DE CUATRO FORMAS ─────────────────────────────────
   * Se arregla AQUI, sobre el `<script>` del `<head>`, porque la extraccion del SEO ocurre mas
   * abajo en el bucle: cuando llegue, ya lee el bloque corregido. Los cuatro defectos venian
   * del origen de Webflow y ninguna puerta los veia — `check:seo` compara el JSON-LD contra el
   * baseline caracter a caracter, o sea que replicaba el defecto fielmente.
   *
   *   1. `about.serviceType` decia «Smart Soffit LED Lighting Installation» — EL SERVICIO DE
   *      OTRA FICHA, en la pagina de piscinas y dentro de la landing de un anuncio de piscinas.
   *   2. `about.name` decia «Pool  Construction», con doble espacio.
   *   3. `about.image` llevaba un TEXTO ALT en un campo que espera una URL.
   *   4. `dateModified` era ANTERIOR a `datePublished`.
   *   5. La quinta `Question` del `FAQPage` se llamaba literalmente «construction», y su
   *      respuesta publicaba «$75,000 … $500,000+».
   *
   * Y el `FAQPage` se pone al dia con las tres preguntas nuevas: si la pagina ensena ocho y el
   * schema declara cinco, hay dos versiones de la verdad y Google no sabe cual creer. */
  for (const sc of doc.head.querySelectorAll('script[type="application/ld+json"]')) {
    let bloque;
    try { bloque = JSON.parse(sc.textContent); } catch { continue; }
    const about = bloque?.about;
    if (about) {
      if (c.schema?.serviceType) about.serviceType = c.schema.serviceType;
      if (typeof about.name === 'string') about.name = about.name.replace(/\s{2,}/g, ' ').trim();
      if (typeof about.image === 'string' && !about.image.startsWith('/') && !/^https?:/.test(about.image)) {
        /* D-126: `about.image` sigue a la foto del hero. Donde el hero cambia (jaulas y riego,
         * ASTRO-2), el dato estructurado cambia con el: una sola propiedad, la unica que se toca. */
        about.image = c.heroe.foto;
      }
      /* SEO-SAFE (1-oct-2026): el `Service` del origen no decia QUIEN lo presta ni DONDE vive.
       * `provider` lo ata por `@id` al `LocalBusiness#negocio` que `Base.astro` inyecta en todas
       * las paginas (`src/lib/negocio.mjs`, mismo host que la canonica), y `url` es la propia
       * ficha. Es lo que permite a un motor generativo leer «este servicio lo ofrece esta
       * entidad, en esta pagina» sin adivinarlo. `check-seo.mjs` lo declara para las 14. */
      if (about['@type'] === 'Service') {
        /* El origen YA trae `provider: {Organization, name}`; se conserva y se le anade el `@id`.
         * `LocalBusiness` es subtipo de `Organization`, asi que el mismo `@id` con los dos tipos
         * nombra a la misma entidad. */
        about.provider = { ...(about.provider ?? {}), '@id': 'https://www.mrandmrsoutdoorliving.com/#negocio' };
        about.url = `https://www.mrandmrsoutdoorliving.com${ruta}`;
      }
    }
    if (bloque.dateModified && bloque.datePublished
        && Date.parse(bloque.dateModified) < Date.parse(bloque.datePublished)) {
      const t = bloque.dateModified; bloque.dateModified = bloque.datePublished; bloque.datePublished = t;
    }
    const preguntas = bloque?.mainEntity?.mainEntity;
    if (Array.isArray(preguntas) && c.faq) {
      /* La `Question` rota se reconoce por su RESPUESTA, no por su nombre: el nombre es
       * justamente lo que estaba mal. Se le pone la pregunta que se ve y la respuesta nueva. */
      for (const [preg, resp] of Object.entries(c.faq.sustituye)) {
        /* SEO-REMEDIACION (4-oct-2026): primero por NOMBRE —las respuestas reescritas por cifras
         * sin verificar («~7 %», «hasta 90 %», plazos en semanas) traen su pregunta bien escrita—;
         * solo si no casa, la `Question` rota de financiacion, que se reconoce por su respuesta. */
        const q = preguntas.find((x) => x?.name === preg)
          ?? preguntas.find((x) => /\$\s?\d|financ/i.test(x?.acceptedAnswer?.text ?? ''));
        if (q) { q.name = preg; q.acceptedAnswer.text = resp; }
      }
      for (const { pregunta, respuesta } of c.faq.anade) {
        if (preguntas.some((x) => x?.name === pregunta)) continue;
        preguntas.push({ '@type': 'Question', name: pregunta,
          acceptedAnswer: { '@type': 'Answer', text: respuesta } });
      }
    }
    sc.textContent = JSON.stringify(bloque);
  }

  /* Los componentes que esta ruta ha usado de verdad. Desde el 13-sep-2026 ninguna ficha monta
   * `CarruselProyectos` (bloque 8), asi que solo queda la banda de inversion. */
  return ['InversionCore'];
}

for (const [ruta] of RUTAS) {
  // El origen se nombra por la ruta VIEJA: `_source/vivo/` no se toca (§ lib/renombradas.mjs).
  const slug = aSlug(origen(ruta));
  const fichero = path.join(RAIZ, '_source/vivo', `${slug}.html`);
  if (!fs.existsSync(fichero)) { console.error(`  ROJO falta _source/vivo/${slug}.html`); continue; }
  const doc = new JSDOM(fs.readFileSync(fichero, 'utf8')).window.document;

  // Las obras de autoria propia, al principio de la lista (§ OBRAS_PROPIAS).
  const inj = OBRAS_EN[ruta];
  let conFiltro = false;
  if (inj) {
    const lista = doc.querySelector(inj.lista);
    const molde = lista?.firstElementChild;
    // Falla RUIDOSAMENTE y para el generador: sin molde no hay tarjeta que clonar, y publicar
    // `/projects` con 10 obras cuando el sitio dice tener 15 es peor que no publicarla.
    if (!molde) {
      console.error(`\n  ROJO ${ruta}: no encuentro «${inj.lista} > primera tarjeta» en el origen\n`);
      process.exit(1);
    }
    for (const o of [...OBRAS_PROPIAS].reverse()) {   // al reves: cada una entra la primera
      const n = molde.cloneNode(true);
      const img = n.querySelector('.img-work');
      img.setAttribute('src', o.portada);
      img.setAttribute('alt', o.alt);
      n.querySelector('.title-work').textContent = o.titulo;
      [...n.querySelectorAll('.block-content-work > div')]
        .find((x) => !x.classList.contains('wrapper-buttons')).textContent = o.resumen;
      n.querySelector('.wrapper-buttons a').setAttribute('href', `/project/${o.slug}`);
      lista.insertBefore(n, lista.firstElementChild);
      obrasInsertadas++;
    }

    /* ── EL INDICE CON FILTRO (PROMPT-PROYECTOS-BANCO, 2-oct-2026) ─────────────────────────
     * Despues de clonar, nunca antes: la primera tarjeta del origen es el molde y es una de las
     * ocultas. Ocultar es quitar la TARJETA; la ficha sigue viva (dato y motivo en
     * `src/data/proyectos-indice.json`). Cada tarjeta que se queda lleva `data-servicios`, que es
     * lo unico que lee el filtro, y el filtro entra como componente delante de la lista.
     * Las dos faltas posibles paran el generador: una tarjeta sin servicios saldria en «All» y
     * en ningun filtro, y una oculta que ya no esta en la pagina es una lista que miente. */
    const vistas = new Set();
    for (const a of [...lista.querySelectorAll('.wrapper-buttons a[href^="/project/"]')]) {
      const slug = a.getAttribute('href').slice('/project/'.length);
      const tarjeta = a.closest('.cms-item-work');
      if (OCULTAS.has(slug)) { tarjeta.remove(); vistas.add(slug); obrasOcultadas++; continue; }
      const servicios = serviciosDe(slug);
      if (!servicios.length) {
        console.error(`\n  ROJO ${ruta}: la tarjeta /project/${slug} no tiene servicios `
          + '(src/data/proyectos-indice.json o proyectos-propios.json)\n');
        process.exit(1);
      }
      tarjeta.setAttribute('data-servicios', servicios.join(' '));
    }
    const perdidas = [...OCULTAS].filter((s) => !vistas.has(s));
    if (perdidas.length) {
      console.error(`\n  ROJO ${ruta}: ocultas que ya no estan en la pagina: ${perdidas.join(', ')}\n`);
      process.exit(1);
    }
    const envoltorio = lista.closest('.cms-wrapper-work') ?? lista;
    envoltorio.parentNode.insertBefore(doc.createTextNode(MARCA + 'FiltroProyectos' + MARCA), envoltorio);
    conFiltro = true;
  }

  /* ── LAS 14 FOTOS DEL BANCO EN `/gallery` (21-sep-2026, Sebastian) ──────────────────────
   * `/gallery` es el indice donde se ensenan todas las fotos de obra, y hasta hoy las 137 que
   * pintaba venian del Webflow: JPG de 1250 px. Estas 14 salen del banco de imagen del cliente
   * en el derivado `gallery`, 1600x1067 — un 28 % mas de definicion por la mitad de peso.
   *
   * MISMO MECANISMO QUE `OBRAS_EN`: se clona el primer `.cms-item-pictures` como molde, para
   * heredar la forma exacta del item (el `id` de rejilla, el ancla `.gallery-picture` y el
   * `<script class="w-json">` del lightbox). Los 137 items de origen usan solo dos `id`
   * distintos y AMBOS resuelven a `grid-area: span 1/span 1` — comprobado en `webflow.css` —,
   * asi que heredar el del molde no mueve la rejilla.
   *
   * El lightbox de esta pagina NO es el de `Componentes.astro`: `check:galeria` excluye
   * `/gallery` a proposito y quien la cubre es `GalleryLeadLightbox.astro` sobre
   * `a.closest('.gallery-page')`. Clonando dentro de la misma lista, los items nuevos caen
   * dentro de ese guard igual que los otros 137.
   *
   * `data-service-id` es lo que filtra Finsweet: es lo unico que decide en que pestana sale.
   *
   * Van al PRINCIPIO de la lista, y por eso se recorre al reves: son las de mas definicion de
   * la pagina y las unicas con trazabilidad al banco activo por activo. */
  if (ruta === '/gallery') {
    /* E6 (D-124, limite a) · LAS `excluidas` SALEN TAMBIEN DEL INDICE. Son las fotos de
     * `galeria-complementaria.json` que no se pintan en ningun mosaico; la rejilla de `/gallery`
     * las seguia trayendo del origen. Se quita el item entero —foto y entrada del visor—; el
     * fichero no se borra. Una excluida que el origen ya no traiga revienta: una lista que no
     * excluye nada es una lista que se ha quedado vieja. Va ANTES de elegir el molde. */
    for (const src of COMPLEMENTARIA.excluidas) {
      const fuera = [...doc.querySelectorAll('.gallery-page .cms-item-pictures')]
        .filter((it) => local(it.querySelector('img')?.getAttribute('src') ?? '') === src);
      if (!fuera.length) {
        console.error(`\n  ROJO /gallery: \`excluidas\` nombra ${src} y la rejilla del origen no la trae\n`);
        process.exit(1);
      }
      for (const it of fuera) it.remove();
      galeriaExcluida += fuera.length;
    }
    // E6: el desplegable del filtro no tiene `<label>` ni texto al lado; sin esto no tiene nombre
    // para un lector de pantalla. No anade texto a la vista.
    doc.querySelector('select.service-filter')?.setAttribute('aria-label', 'Filter photos by service');
    const listaFotos = doc.querySelector('.cms-list-pictures');
    const moldeFoto = listaFotos?.querySelector('.cms-item-pictures');
    // Falla RUIDOSAMENTE: sin molde no hay forma de item que heredar, y publicar /gallery con
    // 14 items cojos —sin lightbox o fuera de la rejilla— es peor que no anadirlas.
    if (!moldeFoto) {
      console.error('\n  ROJO /gallery: no encuentro «.cms-list-pictures > .cms-item-pictures» para el molde\n');
      process.exit(1);
    }
    for (const pestana of ['construction', 'remodeling']) {
      for (const f of [...GALERIA_PAGINA[pestana]].reverse()) {
        const n = moldeFoto.cloneNode(true);
        n.setAttribute('data-service-id', pestana);
        const img = n.querySelector('img');
        const jsonLb = n.querySelector('script.w-json');
        if (!img || !jsonLb) {
          console.error('\n  ROJO /gallery: el molde ya no trae <img> + script.w-json — revisa el origen\n');
          process.exit(1);
        }
        img.setAttribute('src', f.src);
        img.setAttribute('alt', f.alt);
        img.setAttribute('width', String(f.ancho));
        img.setAttribute('height', String(f.alto));
        // El derivado del banco es UNA sola medida: un `srcset` heredado apuntaria a los
        // recortes del JPG viejo, y `sizes` sin `srcset` no pinta nada.
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        jsonLb.textContent = JSON.stringify({ items: [{ url: f.src, type: 'image' }], group: 'images' });
        listaFotos.insertBefore(n, listaFotos.firstElementChild);
        galeriaPropiaInsertada++;
      }
    }

    /* ── LAS FOTOS DEL BANCO DE LAS PAGINAS DE CATEGORIA (2-oct-2026) ─────────────────────
     * `/gallery` es «todas»: una foto que sale en `/gallery/<slug>` tiene que salir tambien
     * aqui, bajo su `data-service-id`. Se leen de la MISMA entrada de
     * `galeria-categorias.json` que pinta la pagina de categoria (`origen: banco`); las
     * `obra` ya las ha metido el bucle de arriba y las `webflow` ya venian en el origen.
     * Van delante de la PRIMERA foto de su servicio, para no romper el orden por servicio
     * de la rejilla (MIGRACION-LOG, «/gallery — orden de la rejilla»). */
    for (const cat of GALERIA_CATEGORIAS) {
      // La rejilla son DOS listas apiladas (99 + 38): se busca en la pagina, no solo en la primera.
      const ancla = doc.querySelector(`.gallery-page .cms-item-pictures[data-service-id="${cat.id}"]`);
      if (!ancla) {
        console.error(`\n  ROJO /gallery: no hay ninguna foto con data-service-id="${cat.id}" donde anclar\n`);
        process.exit(1);
      }
      for (const f of cat.fotos.filter((x) => x.origen === 'banco')) {
        const n = moldeFoto.cloneNode(true);
        n.setAttribute('data-service-id', cat.id);
        const img = n.querySelector('img');
        img.setAttribute('src', f.src);
        img.setAttribute('alt', f.alt);
        img.setAttribute('width', String(f.ancho));
        img.setAttribute('height', String(f.alto));
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        n.querySelector('script.w-json').textContent = JSON.stringify({ items: [{ url: f.src, type: 'image' }], group: 'images' });
        ancla.parentNode.insertBefore(n, ancla);
        galeriaPropiaInsertada++;
      }
    }

    /* ── LAS TARJETAS DE CATEGORIA, ARRIBA DEL FILTRO (2-oct-2026) ────────────────────────
     * Una por pagina `/gallery/<slug>`. El marcado sale de `src/lib/galeria-categorias.mjs`,
     * que es el mismo que pinta el pie de cada pagina de categoria. */
    const navFiltro = doc.querySelector('.gallery-page .nav-gallery');
    if (!navFiltro) {
      console.error('\n  ROJO /gallery: no encuentro «.gallery-page .nav-gallery» para poner las tarjetas delante\n');
      process.exit(1);
    }
    /* ASTRO-4 lote B (lamina «Galeria»). El hero deja de ir ENCIMA de la cabecera y entra en la
     * pagina (hero D: titular y entradilla); las diez categorias van delante de la seccion de
     * fotos, con la accion dentro (D-100); la lista de fotos gana las clases del muro —el filtro y
     * el visor de captacion siguen leyendo las suyas, que no se tocan—; y la banda final pasa a
     * la del sistema, con los dos telefonos. */
    const heroG = doc.querySelector('section.hero-section');
    const gh1 = heroG?.querySelector('h1');
    const gtx = heroG?.querySelector('.text-block-4');
    const gp = doc.querySelector('section.gallery-page');
    const lista = gp?.querySelector('.cms-list-pictures');
    const finG = doc.querySelector('section.cta-footer');
    const [fh2, fp, fa] = ['h2', '.text-block-3', 'a'].map((q) => finG?.querySelector(q));
    if (!gh1 || !gtx || !lista || !fh2 || !fp || !fa) throw new Error('/gallery: no trae hero con titular y entradilla, lista de fotos y banda final');
    const nh = doc.createElement('section');
    nh.setAttribute('class', 'mm-hero-d');
    nh.innerHTML = `<div class="mm-hero-d-caja"><div class="mm-sec-cab"><h1 class="mm-h1">${gh1.innerHTML}</h1><div class="mm-sec-lado"><p class="mm-p">${gtx.innerHTML}</p></div></div></div>`;
    heroG.remove();
    gp.parentNode.insertBefore(nh, gp);
    gp.insertAdjacentHTML('beforebegin', indiceGaleriaHtml(BANDA_TELEFONOS.replace('mm-datos--tel', 'mm-datos--pila')));
    gp.classList.add('mm-muro-sec', 'mm-galeria');
    lista.classList.add('mm-muro', 'mm-muro--uniforme');
    // Cada foto del muro ocupa media pantalla en movil, un tercio desde 768 y un cuarto desde 1200:
    // sin `sizes` el navegador pedia la variante de pantalla entera para una tesela de 320 px.
    for (const it of lista.querySelectorAll('.cms-item-pictures')) {
      it.classList.add('mm-muro-foto');
      it.querySelector('img')?.setAttribute('sizes', '(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw');
    }
    const fotoBanda = BANCO_POR_ID.get(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/heroes-ciudad.json'), 'utf8')).bolsas['pool-builders'][2]);
    if (!fotoBanda || fotoBanda.procedencia !== 'obra_real' || !fotoBanda.alt) throw new Error('/gallery: la foto de la banda no es obra real con alt');
    const nc2 = doc.createElement('section');
    nc2.setAttribute('class', 'mm-cierre mm-cierre--sola mm-cierre--alta');
    nc2.innerHTML = '<div class="mm-cierre-caja"><div class="mm-cierre-txt">'
      + `<h2 class="mm-h2">${fh2.innerHTML.replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>')}</h2><p class="mm-p">${fp.innerHTML}</p>`
      + `<a class="mm-btn" href="${fa.getAttribute('href')}">${fa.innerHTML}</a>${BANDA_TELEFONOS}</div>`
      + `<figure class="mm-cierre-medio"><img src="${fotoBanda.src}" alt="${escAttr(fotoBanda.alt)}" width="${fotoBanda.ancho}" height="${fotoBanda.alto}" sizes="(min-width: 992px) 42vw, 100vw" loading="lazy" decoding="async"></figure></div>`;
    finG.replaceWith(nc2);
  }

  const menu = doc.querySelector('section.menu');
  const pie = doc.querySelector('section.footer');
  // /pool-investment-estimator no tiene cascaron porque NO ES una pagina de Webflow: en el
  // origen era una app de Webflow Cloud, sin nav ni pie. Desde la Fase 12c la escribe a mano
  // `src/pages/pool-investment-estimator.astro` con el componente `widgets/Estimador.astro`,
  // el mismo que monta `/pool-cost-estimator`. Aqui se salta: no hay nada que derivar.
  if (ruta === '/pool-investment-estimator') continue;
  if (!menu) { console.error(`  ROJO ${ruta}: no encuentro el nav`); continue; }

  const inyectados = captacion(doc, ruta);
  if (inyectados) captacionAplicada++;

  fotosCanjeadas += fotosPorRuta(doc, ruta);
  textosCorregidos += textosPropios(doc, ruta);
  // Los condados hacen su propio mosaico y su propio orden (§ condadoStitch).
  condadoStitch(doc, ruta);
  proyectoStitch(doc, ruta);
  presupuestoStitch(doc, ruta);
  contactoStitch(doc, ruta);
  legalStitch(doc, ruta);
  testimoniosStitch(doc, ruta);
  videosStitch(doc, ruta);
  proyectosIndiceStitch(doc, ruta);
  folletosStitch(doc, ruta);
  industriasStitch(doc, ruta);
  aboutStitch(doc, ruta);
  zonasPaginaStitch(doc, ruta);
  if (!esCondado(ruta)) {
    mosaicoDeObra(doc, ruta);
    listasDePlano(doc, ruta);
  }


  const usados = new Set();
  const limpia = (n) => {
    localizar(n);
    /**
     * SERVICIOS POR CATEGORIA -> componente. Se sustituye la SECCION ENTERA, no un trozo, y eso
     * importa: el `<script>` de 6 KB que mueve las pestanas y el `<style>` que pinta la pestana
     * activa viven los dos dentro de ella, en el mismo `div.w-embed.w-script`. Reemplazando el
     * `<section>` se van los dos con el, sin ningun caso especial.
     *
     * Se comprueba con `matches` y no con `querySelector`: la seccion ES uno de los nodos de
     * primer nivel que recorre el bucle, no un descendiente.
     */
    if (n.matches?.('section.products-section')) {
      extraeServicios(n, ruta);
      usados.add('ServiciosPorCategoria');
      return MARCA + 'ServiciosPorCategoria' + MARCA;
    }
    /**
     * CARRUSEL DE BLOG -> componente, por SUSTITUCION (R11-BLOG-02). Solo Condado trae esta
     * seccion en su origen (y, en memoria, la home -protegida, nunca se escribe: ver
     * `NO_REGENERAR`-). Antes de descartar el nodo se guarda su encabezado propio -"Outdoor
     * Living Insights for Marion County"...- en `ENCABEZADOS_BLOG`, o `CarruselBlog` caeria al
     * generico de la home y la ruta perderia su personalizacion.
     *
     * Se salta a proposito para rutas protegidas: la home usa su PROPIO `S_BLOG` cableado a
     * mano -no el componente-, asi que una entrada `ENCABEZADOS_BLOG['/']` seria dato muerto
     * que nadie lee, y ensuciaria el JSON derivado.
     */
    if (n.matches?.('section.blog-section-page')) {
      if (!protegida(ruta)) {
        const h2 = n.querySelector('.header-blog h2')?.textContent.trim();
        const p = n.querySelector('.header-blog p')?.textContent.trim();
        if (h2 && p) ENCABEZADOS_BLOG[ruta] = { titulo: h2, entradilla: p };
        blogsSustituidos++;
      }
      usados.add('CarruselBlog');
      return MARCA + 'CarruselBlog' + MARCA;
    }

    /**
     * CARRUSEL «Project Showcase» -> componente, por SUSTITUCION (R16-PROY). Mismo mecanismo
     * exacto que el de blog de aqui arriba: se guarda el encabezado propio de la ruta y se
     * descarta el nodo, que ya no aporta nada -sus 10 slides son los mismos 10 que emite el
     * componente, byte a byte, mas las 5 obras propias que a esta ruta le faltaban-.
     *
     * Se salta para rutas protegidas por el mismo motivo que alli, pero con la diferencia que
     * importa: `/` y las 2 de Estado SI llevan entrada en el JSON, escrita a mano en el seed.
     * Alli la home no la necesitaba porque usa su propio `S_BLOG`; aqui la home usa ESTE
     * componente, asi que sin seed se quedaria sin encabezado.
     */
    if (n.matches?.('section.projects-section')) {
      if (!protegida(ruta)) {
        const h2 = n.querySelector('.header-projects h2')?.textContent.trim();
        const p = n.querySelector('.header-projects p')?.textContent.trim();
        if (h2 && p) ENCABEZADOS_PROYECTOS[ruta] = { titulo: h2, entradilla: p };
        proyectosSustituidos++;
      }
      usados.add('CarruselProyectos');
      return MARCA + 'CarruselProyectos' + MARCA;
    }
    for (const s of n.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src') ?? '';
      if (SCRIPTS_FUERA.some(([re]) => re.test(src))) s.remove();
    }
    if (n.tagName === 'SCRIPT' && SCRIPTS_FUERA.some(([re]) => re.test(n.getAttribute('src') ?? ''))) return '';
    for (const div of [...n.querySelectorAll('[class*="elfsight-app-"]')]) {
      const id = String(div.className).replace('elfsight-app-', '').trim();
      const comp = WIDGETS[id] ?? '';
      const envoltorio = div.closest('.w-embed') ?? div;
      envoltorio.replaceWith(doc.createTextNode(MARCA + comp + MARCA));
      if (comp) usados.add(comp);
    }
    /**
     * DECISION D3 (Sebastian, 28-ago-2026) — FUERA EL IFRAME de /pool-cost-estimator.
     *
     * Esa pagina embebia `/pool-investment-estimator` en un `<iframe>` con altura FIJA
     * (900/1400/1600 px segun el ancho) porque el estimador era una app de Webflow Cloud que
     * vivia en otro servidor. Desde la Fase 12c es un componente de este mismo sitio, asi que
     * el iframe ya no compra nada: cuesta un documento entero, un juego de CSS y JS repetido, y
     * unas alturas fijas que o sobran o cortan.
     *
     * Se sustituye por el MISMO mecanismo con el que ya se cambian los 4 widgets de Elfsight:
     * un marcador que mas abajo se convierte en `<Estimador />`. Por eso el componente vive en
     * `components/widgets/`: asi el generador de imports no necesita ningun caso especial.
     *
     * La ruta `/pool-investment-estimator` NO desaparece: sigue siendo una de las 115 y sigue
     * sirviendo el estimador desnudo. Las dos comparten el componente.
     */
    for (const emb of [...n.querySelectorAll('.code-embed-cost')]) {
      (emb.closest('.w-embed') ?? emb).replaceWith(doc.createTextNode(MARCA + 'Estimador' + MARCA));
      usados.add('Estimador');
    }
    // El iframe del estimador viene con URL ABSOLUTA al dominio de produccion. Se pasa a
    // relativa: si no, cualquier preview cargaria el sitio VIEJO de Webflow dentro del nuevo
    // -y el check:visual estaria comparando el original contra si mismo-. Tras el corte
    // apuntaria al sitio bueno igualmente, pero hasta entonces mentiria en cada verificacion.
    // LA TRAMPA DE AMS, y aqui estaba: el HTML servido trae `style="opacity:0"` EN LINEA en
    // los elementos que anima IX2 -270 repartidos por 35 paginas-. Es el anti-FOUC de Webflow:
    // «manten esto invisible hasta que arranque la interaccion». Sin webflow.js no arranca
    // nadie y se quedan invisibles PARA SIEMPRE. Ademas, un style en linea gana a cualquier
    // regla de autor, asi que tambien romperia el revelado propio.
    //
    // No lo caza check:texto -innerText incluye lo que tiene opacity:0-; lo caza check:ix2.
    for (const emb of [...n.querySelectorAll('.code-embed')]) {
      if (/STEP_MS\s*=\s*1100/.test(emb.querySelector('script')?.textContent ?? '')) {
        emb.remove();
        codeEmbedsEliminados++;
      }
    }
    for (const el of n.querySelectorAll('[style*="opacity"]')) {
      const limpio = el.getAttribute('style').replace(/(^|;)\s*opacity\s*:\s*0(?!\.)\s*(?=;|$)/gi, '$1')
        .replace(/^;+|;+$/g, '').trim();
      if (limpio) el.setAttribute('style', limpio); else el.removeAttribute('style');
    }
    // FASE 8: los formularios de Webflow mueren al salir de Webflow -enviaban a
    // webflow.com/api/v1/form-. Se reapuntan al endpoint propio y se les anaden las dos capas
    // que van en el cliente. El comportamiento vive en src/components/Formularios.astro.
    for (const form of n.querySelectorAll('form[data-name]')) {
      /**
       * SOLO LOS DOS FORMULARIOS DE LEAD. No todo `<form>` de Webflow envía nada.
       *
       * `/gallery` tiene un `form[data-name="service-filter"]` que es el FILTRO de Finsweet: un
       * `<select>` que no se envía a ninguna parte. Reapuntarlo a `/api/formulario` le colgaba
       * el honeypot y hacía que `Formularios.astro` le montara un widget de Turnstile encima —
       * en una página que no recoge datos de nadie.
       *
       * Medido con `diag-geometria.mjs` contra el vivo: `div.gallery-filter-form` salía **2 px
       * más alta** y eso desplazaba las 181 fotos de la galería. `check:visual` lo veía como
       * «98,7 %, diferencia repartida por toda la página», que es justo lo que parece medio
       * píxel de desfase al reescalar a 1/4, y no señalaba nada.
       *
       * La lista es la MISMA que conoce `src/pages/api/formulario.ts`: si un formulario no está
       * ahí, el endpoint lo rechaza con «formulario desconocido», así que cablearlo era además
       * mandar al visitante a un 400.
       */
      // El endpoint conoce un TERCERO, `Pool Estimator Form` (Fase 12d), que NO va aquí: no
      // sale del HTML de Webflow, lo escribe `components/widgets/Estimador.astro` con su
      // `data-mm-envia` y su honeypot puestos a mano. Esta lista es solo la de los formularios
      // DERIVADOS; el invariante que importa sigue siendo el mismo -si un `data-name` no está
      // en `FORMULARIOS` de `api/formulario.ts`, el envío es un 400-.
      const LEADS = new Set(['Contact Page Form', 'Request Quote Form']);
      if (!LEADS.has(form.getAttribute('data-name'))) continue;
      form.setAttribute('method', 'post');
      form.setAttribute('action', '/api/formulario');
      form.dataset.mmEnvia = '1';
      // HONEYPOT. Se llama `ref_id` a proposito: `company_url` o parecidos los autorellenan
      // los gestores de contrasenas y tiran usuarios de verdad. Oculto sin `display:none`,
      // que algunos bots detectan, y fuera del orden de tabulacion.
      if (!form.querySelector('[name="ref_id"]')) {
        const hp = doc.createElement('input');
        hp.type = 'text'; hp.name = 'ref_id'; hp.tabIndex = -1;
        hp.setAttribute('autocomplete', 'off');
        hp.setAttribute('aria-hidden', 'true');
        hp.setAttribute('style', 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0');
        form.appendChild(hp);
      }
      // CASILLAS DE SERVICIO SIN VALOR. Las 14 de "Request Quote Form" comparten
      // name="checkbox" y ninguna lleva `value`: el backend ve cuantas se marcaron, nunca
      // cuales (docs/encargos/R12-EST.md, decision de Sebastian). Se corrige por texto de
      // la etiqueta -no a mano por casilla- para que sobreviva si Webflow las reordena.
      for (const cb of form.querySelectorAll('.services-form input[type="checkbox"][name="checkbox"]:not([value])')) {
        const etiqueta = cb.closest('label')?.querySelector('strong')?.textContent?.trim();
        if (etiqueta) cb.setAttribute('value', etiqueta);
      }
    }
    for (const f of n.querySelectorAll('iframe[src^="https://mrandmrsoutdoorliving.com/"]')) {
      f.setAttribute('src', f.getAttribute('src').replace('https://mrandmrsoutdoorliving.com', ''));
    }
    // Y los 1482 enlaces internos ABSOLUTOS al dominio de produccion, repartidos por 114
    // paginas. En una preview, cada clic se sale al sitio VIEJO de Webflow: navegar el sitio
    // nuevo seria imposible y cualquier verificacion estaria mirando el original. Despues del
    // corte funcionarian, pero hasta entonces mienten en todo.
    for (const a of n.querySelectorAll('a[href^="https://mrandmrsoutdoorliving.com"]')) {
      a.setAttribute('href', a.getAttribute('href').replace('https://mrandmrsoutdoorliving.com', '') || '/');
    }

    /* Y las rutas que hemos RENOMBRADO despues del scrape. `_source/vivo/` es el origen y no se
     * toca, asi que sus enlaces apuntan —y seguiran apuntando— a la ruta vieja. Sin esto, los 44
     * enlaces internos que se actualizaron a mano volverian atras en el siguiente `npm run
     * paginas`, y el sintoma seria 44 redirects de mas en produccion, no un rojo. */
    for (const a of n.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      const r = renombra(h);
      if (r !== h) { a.setAttribute('href', r); enlacesRenombrados++; }
    }

    /**
     * TEXTO DE ENLACE NO DESCRIPTIVO — el unico audit que separa el sitio del 100/100 de SEO
     * en Lighthouse (`link-text`; SEO-URLS-PLAN.md hallazgo 1). Son 80 anclas «Read More» en
     * HTML crudo scrapeado: 10 en `/blogs-tips` y 7 en cada una de las 10 de `/blogs/`.
     *
     * NO SE TOCA EL TEXTO VISIBLE -Principio 2, `check:texto` compara innerText al 100 %-.
     * Se anade `aria-label`, que es lo que evaluan Lighthouse y un lector de pantalla y que
     * NO entra en innerText.
     *
     * EL TITULO SALE DEL DOM, NO DE UNA TABLA. Las 80 tarjetas comparten forma
     * -`<h3|h4>TITULO</h3> ... <div class="wrapper-buttons"><a>Read More</a>`-, asi que el
     * encabezado se busca hacia arriba desde el propio enlace. Una tabla ruta->titulo se
     * desincronizaria del origen sin avisar; esto se rompe RUIDOSAMENTE (el contador de abajo).
     */
    /**
     * RESERVAR EL HUECO DE LAS IMAGENES QUE DESPLAZAN — el CLS de SEO-URLS-PLAN.md hallazgo 8.
     *
     * MEDIDO, no supuesto. Con `PerformanceObserver({type:'layout-shift'})` sobre el build, a
     * 412x823, las fuentes de desplazamiento reales son estas dos:
     *   · `/where-we-serve` — `SECTION.trusted-section` pasa de `y=485,alto=338` a
     *     `y=766,alto=57` a los 53 ms: **0.1403** de su CLS de 0.153. Lo empuja el heroe de
     *     arriba, `img.image-whereweserve`, que ademas de no declarar tamano es la imagen LCP
     *     y venia con `loading="lazy"` — lo peor de los dos mundos.
     *   · `/` — `DIV.fs-marquee-logoscms_item`: **0.0210**. `.fs-marquee-logoscms_logo` declara
     *     `height:35px` en CSS y NO declara ancho, asi que hasta que carga ocupa 0 px y empuja a
     *     sus 27 hermanas; y la lista esta EN FLUJO a proposito (`Componentes.astro:103-106`).
     *     El propio codigo ya lo sabia: «Los logos no llevan width/height, asi que antes de
     *     cargar ocupan 0» (`Componentes.astro:266-268`). Van de 1.00 a 4.63 de proporcion —de
     *     35 a 162 px de ancho—, que es la medida del salto.
     *
     * POR LISTA DECLARADA, NO A TODAS LAS IMAGENES. Darle proporcion a un `<img>` cuyo CSS ya
     * le fija alto Y ancho no cambia nada, pero a uno al que solo le fija uno de los dos SI
     * puede cambiar lo pintado, y son 115 rutas con contrato de paridad. Aqui el radio de
     * impacto es enumerable y esta medido. Si mañana aparece otra, se anade con su cifra.
     *
     * `width`/`height` NO cambian un pixel de lo pintado: el CSS sigue mandando, y la
     * proporcion que reserva el navegador es la misma que tendria la imagen ya cargada.
     */
    for (const img of n.querySelectorAll(RESERVAN_HUECO.map((c) => `img.${c}:not([width])`).join(','))) {
      const d = DIM.get(img.getAttribute('src'));
      if (!d) { imgSinDim.push(`${ruta} :: ${img.getAttribute('src')}`); continue; }
      img.setAttribute('width', String(d.w));
      img.setAttribute('height', String(d.h));
      huecosReservados++;
    }
    /* Y la del heroe, que ademas NO puede ir en `lazy`: es la imagen LCP de la ruta. Webflow
     * pone `loading="lazy"` en TODAS por defecto, incluida esa. */
    for (const img of n.querySelectorAll('img.image-whereweserve[loading="lazy"]')) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
      heroesDesperezados++;
    }

    /**
     * TRES ARREGLOS QUE SE HICIERON A MANO SOBRE EL `.astro` DERIVADO, y que cada `npm run
     * paginas` deshacia en silencio (MIGRACION-LOG, «/gallery — orden de la rejilla»). No es
     * hipotesis: ff5f142 regenero las 9 de country/ y les quito el `sizes` del primero.
     * Viven aqui para que regenerar salga byte a byte igual que lo commiteado.
     *
     * 1 · `sizes` de los logos del marquee (102942c). Webflow les pone el `sizes` de una imagen a
     *     todo el ancho -`100vw` en movil- y el navegador baja la variante mas grande del `srcset`
     *     para pintar un logo de 35-45 px de alto (webflow.css). El mas apaisado es 4:1, o sea
     *     180 px como mucho: `200px` los cubre a todos. Solo los que traen `sizes`: ponerlo en
     *     uno sin `srcset` no hace nada y ensucia el diff.
     */
    for (const img of n.querySelectorAll('img.fs-marquee-logoscms_logo[sizes]')) {
      img.setAttribute('sizes', '200px');
      logosConSizes++;
    }
    /* 2 · M11 (7f0a2c6): `target="_blank"` sin `rel`. El `rel` va JUSTO DETRAS de `target`,
     *     que es donde quedo a mano; `setAttribute` lo pondria al final y cambiaria 62 enlaces. */
    for (const a of n.querySelectorAll('a[target="_blank"]:not([rel])')) {
      const at = [...a.attributes];
      const tras = at.slice(at.findIndex((x) => x.name === 'target') + 1).map((x) => [x.name, x.value]);
      for (const [k] of tras) a.removeAttribute(k);
      a.setAttribute('rel', 'noopener');
      for (const [k, v] of tras) a.setAttribute(k, v);
      relAnadidos++;
    }
    /* 3 · M9 (9356a5f): el telefono de /contact-us partia por el guion y salia tachado. El
     *     numero va en `.mm-tel` (nowrap, contacto.css:225) y el `&nbsp;` de South pasa a
     *     espacio, o no podria partir por ahi. Por clase y no por ruta: la CSS que hace
     *     inofensivo el `<span>` -`display:block`- tambien cuelga de `.phone-wrapper`. */
    for (const a of n.querySelectorAll('.phone-wrapper a[href^="tel:"]')) {
      const m = a.textContent.match(/^(.*?:)\s+(\+[\d ()-]+)$/);
      if (!m) continue;
      const tel = doc.createElement('span');
      tel.className = 'mm-tel';
      tel.textContent = m[2];
      a.textContent = `${m[1]} `;
      a.append(tel);
      telefonosEnvueltos++;
    }

    for (const a of n.querySelectorAll('a')) {
      const rotulo = a.textContent.trim();
      if (!/^(read|see|learn|view) more$/i.test(rotulo) || a.hasAttribute('aria-label')) continue;
      let h = null;
      for (let c = a.parentElement; c && !h; c = c.parentElement) h = c.querySelector('h1,h2,h3,h4');
      if (!h) { ctaSinTitulo.push(`${ruta} :: ${rotulo}`); continue; }
      a.setAttribute('aria-label', `${rotulo}: ${h.textContent.trim()}`);
      ctaEtiquetados++;
    }

    return n.outerHTML;
  };

  // /gallery lleva su hero ANTES del nav. Una sola página de las 115, pero si se ignora, esas
  // dos líneas salen en otro sitio del innerText y check:texto no perdona el orden.
  const code = doc.querySelector('section.code');
  let antesNav = '';
  for (let n = doc.body.firstElementChild; n && n !== menu; n = n.nextElementSibling) {
    const t = n.tagName.toLowerCase();
    if (n === code || t === 'script' || t === 'style') continue;
    if (String(n.className).includes('elfsight-app-')) continue;   // el click-to-call, ya en Base
    antesNav += limpia(n);
  }

  /**
   * EL CARRUSEL DE BLOG EN LAS 14 FICHAS DE `services/` Y LAS 2 DE `where-we-serves/` — y es
   * una INSERCION, no una sustitucion. R11-BLOG-02 sumo las 2 de Estado a la lista de R9-BLOG-01
   * con el mismo mecanismo, para que tambien esas 2 acaben con el carrusel al final.
   *
   * SIGUE SIN HABER NADA QUE REEMPLAZAR EN NINGUNA DE LAS 16: la seccion de blog no existe en
   * `_source/vivo/services_*.html` NI en `_source/vivo/where-we-serves_*.html` -verificado, 0
   * coincidencias en ambos-. Es contenido nuevo, no paridad. (Condado es la excepcion: SI la
   * trae en su origen, y por eso va por SUSTITUCION mas arriba, no por aqui.)
   *
   * SE ACOTA POR PREFIJO DE RUTA y no por «si la pagina tiene la seccion ancla»: tanto
   * `.cta-footer` como `.social-media` estan en mas paginas de las 16, asi que la condicion
   * obvia habria puesto el carrusel de mas.
   *
   * VA ANTES DE `.social-media`, Y HASTA R15-IG IBA ANTES DE `.cta-footer`. Lo que Sebastian
   * pidio -«entre las reseñas y el CTA del pie»- se sigue cumpliendo; lo unico que cambia es el
   * orden relativo con el feed de Instagram. Anclado al CTA, el carrusel se colaba EN MEDIO de
   * una pareja que el origen trae PEGADA (medido en `_source/vivo/services_*.html` y
   * `where-we-serve_{north,south}-florida.html`, las 16):
   *     location -> testimonial-section -> social-media -> cta-footer -> logos-section
   * Eso no se veia porque `src/data/instagram.json` estaba vacio y `.social-media` medía 0 px
   * -`social.css` cuelga todo su padding de `:has(.mm-ig)`-. Al poblarlo en R15-IG, las 16
   * habrian quedado con el feed separado del CTA por el carrusel entero. Anclarlo a
   * `.social-media` RESTAURA la adyacencia del origen y deja el mismo orden que la home:
   *     testimonial-section -> [CarruselBlog] -> social-media -> cta-footer -> logos-section
   *
   * QUE VALIDA `blogsInsertados` Y QUE NO — importa, porque es facil leerlo de mas. Se compara
   * contra 16 al final y eso SI comprueba que las 16 tienen la seccion ancla: si a alguna le
   * faltara `.social-media`, el contador baja y la corrida lo dice en vez de reordenar en
   * silencio. Lo que NO comprueba es que las 16 se hayan ESCRITO: este `++` esta en el recorrido
   * del DOM y la guarda de `NO_REGENERAR` corta mas abajo, al ir a escribir el fichero. Hoy
   * `/where-we-serve/{north,south}-florida` estan protegidas (heroe a mano desde el 3-sep-2026),
   * asi que el contador dice 16 y los ficheros tocados son 14. Esas 2 llevan el mismo reorden
   * HECHO A MANO en su `.astro`, y ahi no hay contador que lo defienda: lo defiende
   * `check:visual` una vez re-aprobadas.
   *
   * COSTE QUE HAY QUE TENER PRESENTE: son +32 lineas de `innerText` en cada una de las 16, y
   * `baseline/text/` NO se re-baseliniza nunca (§1.1). Por eso el bloque va DECLARADO en
   * `check-texto.mjs`, derivado de `src/data/blogs.json` (mas el encabezado por ruta de
   * `blog-heading-por-ruta.json` para las 2 de Estado), igual que el de reseñas.
   */
  const CON_BLOG_INSERTADO = ['/where-we-serve/'];
  // Las 14 fichas (`esFicha`) y las 2 regionales. NO el silo `/services/pool-builders/<x>`: los 9
  // condados traen su carrusel del origen y las 53 ciudades lo montan desde su plantilla.
  const conBlogInsertado = (r) => esFicha(r) || CON_BLOG_INSERTADO.some((p) => r.startsWith(p));
  /**
   * R17-CORE — LOS TRES COMPONENTES DE CAPTACION, POR INSERCION.
   *
   * Mismo mecanismo que el carrusel de blog: un marcador en la cadena, que el troceo de mas
   * abajo convierte en `<Componente />` con su import generado solo. NO se pasan props —el
   * mecanismo no las tiene— y por eso los tres se localizan por `Astro.url.pathname`.
   *
   * DONDE, Y POR QUE AHI:
   *   · la franja de confianza y el formulario van justo DESPUES de `logos-section`, o sea el
   *     tercer y cuarto bloque de la pagina. El trafico de pago llega con la intencion ya
   *     formada: cuanto antes pueda dejar sus datos, menos se pierde. Y la franja va DELANTE
   *     porque «¿por que vosotros?» se pregunta antes de dar un telefono.
   *   · la banda de inversion va DESPUES de `process-section`: cuando ya se ha visto como se
   *     construye, la siguiente pregunta es cuanto cuesta y como se paga.
   *
   * `primerLogos` existe porque `logos-section` aparece DOS VECES en estas fichas -el marquee
   * se repite al final, antes del pie- y sin la guarda los componentes se pintarian dos veces.
   */
  if (inyectados) for (const comp of inyectados) usados.add(comp);
  if (conFiltro) usados.add('FiltroProyectos');
  let primerLogos = true;
  let acumulado = '';
  for (let n = menu.nextElementSibling; n && n !== pie; n = n.nextElementSibling) {
    if (esFicha(ruta) && n.matches?.('section.mm-faq')) {
      acumulado += MARCA + 'InversionCore' + MARCA;
      usados.add('InversionCore');
    }
    // ASTRO-2: en las fichas el feed de Instagram ya no esta; los articulos van delante de las resenas.
    if (conBlogInsertado(ruta) && n.matches?.(esFicha(ruta) ? 'section.mm-res' : 'section.social-media')) {
      acumulado += MARCA + 'CarruselBlog' + MARCA;
      usados.add('CarruselBlog');
      blogsInsertados++;
    }
    // ASTRO-2: la franja de logos ya va dentro del hero; la seccion vieja no se emite, pero
    // sigue sirviendo de ancla para lo que cuelga detras de ella.
    // ASTRO-4: en la ficha de proyecto, «More Projects» va delante de la banda de cierre.
    if (esProyecto(ruta) && n.matches?.('section.mm-cierre')) {
      acumulado += MARCA + 'CarruselProyectos' + MARCA;
      usados.add('CarruselProyectos');
    }
    if (!n.hasAttribute?.('data-mm-retirada')) acumulado += limpia(n);
    // …y el formulario, detras (D-82): el cierre fundido de D-77.
    if (esProyecto(ruta) && n.matches?.('section.mm-cierre')) {
      acumulado += MARCA + 'FormularioCore' + MARCA;
      usados.add('FormularioCore');
    }
    if (CAPTACION[ruta] && n.matches?.('section.logos-section') && primerLogos) {
      primerLogos = false;
      acumulado += MARCA + 'ConfianzaCore' + MARCA;
      usados.add('ConfianzaCore');
    }
    /* El formulario va DETRAS de la intro, no pegado a `ConfianzaCore`: entre los dos queda la
     * seccion fundida de C4. `trusted-section` es hermana de primer nivel porque el bloque
     * 3.bis la subio ahi; antes de eso este `matches` no casaba nunca. */
    if (CAPTACION[ruta] && n.matches?.(esFicha(ruta) ? 'section.mm-cierre' : 'section.svc-intro')) {
      acumulado += MARCA + 'FormularioCore' + MARCA;
      usados.add('FormularioCore');
    }
    if (CAPTACION[ruta] && n.matches?.('section.process-section')) {
      acumulado += MARCA + 'InversionCore' + MARCA;
      usados.add('InversionCore');
    }
    /* LOOP-CIUDADES (5-oct-2026): detras de «Where We Serve», la linea de enlaces a las landings
     * `/services/<servicio>/<ciudad>-fl` de la ficha. El componente no pinta nada si la ficha no
     * tiene landings, asi que montarlo en las 14 no cambia las que no las tienen. */
    if (esFicha(ruta) && n.matches?.('section.mm-zonas')) {
      acumulado += MARCA + 'CiudadesServicio' + MARCA;
      usados.add('CiudadesServicio');
    }
  }

  // 2 páginas llevan un <script>+<style> DESPUÉS del pie (el redimensionador del iframe del
  // estimador). Si se ignoraran, esas páginas perderían código; si se pegaran arriba,
  // cambiaría el orden del documento.
  let trasPie = '';
  if (pie) for (let n = pie.nextElementSibling; n; n = n.nextElementSibling) trasPie += limpia(n);

  // Se parte por los marcadores para poder intercalar componentes de verdad.
  const partes = [];
  for (const [i, t] of acumulado.split(MARCA).entries()) {
    if (i % 2 === 0) { if (t) partes.push({ html: t }); }
    else if (t) partes.push({ componente: t });
  }

  const trocear = (txt) => {
    const out = [];
    for (const [i, t] of txt.split(MARCA).entries()) {
      if (i % 2 === 0) { if (t) out.push({ html: t }); }
      else if (t) out.push({ componente: t });
    }
    return out;
  };
  const partesTras = trocear(trasPie);
  const partesAntes = trocear(antesNav);

  /**
   * M2 (auditoria 5-sep-2026) — DOS PARES DE FICHAS COMPARTEN `<title>`, Y VIENE DEL ORIGEN.
   *
   * El Webflow del que se migro repetia el titulo en dos pares de obras. Al replicarlo carácter
   * a carácter se replico tambien el defecto: dos paginas distintas compitiendo por la misma
   * consulta. `check:medicion` lo viene avisando desde que existe —«defecto real de
   * posicionamiento anotado para Sebastian»— pero la paridad lo protegia.
   *
   * Sebastian levanto esa proteccion el 4-sep-2026: el sitio es producto propio, no espejo.
   *
   * LOS TITULOS NUEVOS NO SE INVENTAN: salen de lo que cada ficha YA dice de si misma. Su
   * `meta description` y el `about.name` de su JSON-LD distinguen las cuatro; era el
   * `<title>` el unico campo que no lo hacia.
   *
   *   ...-motorized-pergola-outdoor-kitchen-...  desc: «... and outdoor kitchen»
   *   ...-motorized-pergola-screen-enclosure-... desc: «... and screen enclosure»
   *   luxury-pool-spa-screen-enclosure-...       desc: «... screen enclosure and outdoor kitchen»
   *   luxury-pool-spa-with-screen-enclosure-...  desc: «... screen enclosure»   <- se queda igual
   *
   * D-195 (14-oct-2026): la tercera ya no existe —su URL redirige a la cuarta—, asi que su titulo
   * sale de la tabla y el par queda resuelto por la redireccion.
   *
   * Solo cambia `<title>`. `og:title` y `twitter:title` conservan el texto del origen: no
   * pesan en posicionamiento y tocarlos ensancharia la desviacion de paridad sin ganar nada.
   * `check-seo.mjs` lo tiene declarado en `TITULO_PROPIO` y lo dice por pantalla.
   */
  const TITULO_PROPIO = new Map([
    ['/project/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida',
      'Luxury Pool with Motorized Pergola & Outdoor Kitchen | North Florida'],
    ['/project/luxury-pool-motorized-pergola-screen-enclosure-north-florida',
      'Luxury Pool with Motorized Pergola & Screen Enclosure | North Florida'],
  ]);
  const titulo = TITULO_PROPIO.get(ruta) ?? doc.querySelector('title')?.textContent ?? '';
  let desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

  // Todo lo demas del <head> que es SEO, tal cual lo sirve el origen. `description` va aparte
  // porque Base ya la emite; repetirla daria dos etiquetas.
  const metaSeo = {};
  for (const m of doc.head.querySelectorAll('meta[property],meta[name]')) {
    const k = m.getAttribute('property') || m.getAttribute('name');
    if (!/^(og:|twitter:|robots$|keywords$)/.test(k)) continue;
    if (k === 'description') continue;
    metaSeo[k] = renombra(local(m.getAttribute('content') ?? ''));
  }
  // El JSON-LD se reserializa con las claves ORDENADAS para que un diff no falle por el orden.
  const ordena = (v) => (Array.isArray(v) ? v.map(ordena)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordena(v[k])])) : v);

  /**
   * LOS 8 BLOQUES ROTOS DEL ORIGEN — reparados aqui desde el 3-sep-2026 (D4 en MIGRACION-LOG).
   *
   * 8 de las 10 `/project/*` traen del scrape de Webflow un SALTO DE LINEA LITERAL dentro del
   * valor de `description`, y JSON prohibe caracteres de control sin escapar dentro de una
   * cadena. Resultado: `Bad control character in string literal ... (line 6 ...)` en las 8, y
   * Google Rich Results no puede leer ninguna.
   *
   * Hasta hoy se replicaban CRUDAS por el contrato de paridad. Es una desviacion deliberada:
   * replicar un defecto del origen que solo perjudica, cuando la reparacion es SINTACTICA y no
   * cambia ni una palabra del contenido -el valor de la cadena es identico; lo unico que cambia
   * es como se codifica el salto de linea-.
   *
   * SE INTENTA PRIMERO SIN SANEAR, a proposito: las 2 sanas nunca pasan por el saneador, asi
   * que no hay forma de que este arreglo les toque un byte. Y si algun dia llega un bloque roto
   * de otra manera, el segundo `catch` lo devuelve a CRUDO como siempre: el mecanismo viejo
   * sigue debajo, no se ha borrado.
   *
   * LIMITE CONOCIDO del saneador: recorre literales de cadena con una expresion regular
   * (`"..."` con escapes), no con un analizador. Basta para este defecto -medido: repara 8/8
   * sobre `_source/vivo/project_*.html`- y falla hacia el lado seguro, porque lo que no repare
   * sale por el `catch` de siempre.
   */
  const sanea = (t) => t.replace(/"((?:[^"\\]|\\.)*)"/g, (m) => m
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'));

  const jsonLd = [];
  const jsonLdCrudo = [];
  for (const sc of doc.head.querySelectorAll('script[type="application/ld+json"]')) {
    /* Las absolutas (con host) y tambien las RELATIVAS entre comillas (`"url":"/services/..."`,
     * que el origen trae en el `WebPage` de las 14 fichas): sin esto el JSON-LD seguiria
     * nombrando la URL vieja mientras la canonica dice la nueva. */
    const t = sc.textContent.replace(reUrlGlobal, (u) => renombra(local(equilibra(u))))
      .replace(/"(\/[a-z0-9\-/]+)"/g, (_, u) => `"${renombra(u)}"`);
    try { jsonLd.push(ordena(JSON.parse(t))); } catch {
      try { jsonLd.push(ordena(JSON.parse(sanea(t)))); ldReparados++; }
      catch { jsonLdCrudo.push(t); }
    }
  }

  /**
   * EL `hasPart` CRECE CON LAS TARJETAS, o el JSON-LD miente: la pagina enseñaria 15 obras y le
   * diria a Google que tiene 10. Van al principio y en el mismo orden que las tarjetas.
   * `check-seo.mjs` lo tiene declarado en PARTES_PROPIAS y sigue comparando las 10 del origen
   * caracter a caracter: lo que se declara es que estas 5 estan, no que el bloque no se mire.
   */
  if (inj && jsonLd.length) {
    const b = jsonLd[0];
    if (!Array.isArray(b.hasPart)) {
      console.error(`\n  ROJO ${ruta}: el JSON-LD del origen ya no trae hasPart que ampliar\n`);
      process.exit(1);
    }
    b.hasPart = [...OBRAS_PROPIAS.map((o) => ordena({
      '@type': 'CreativeWork',
      description: o.resumen,
      image: { '@type': 'ImageObject', caption: o.alt, url: o.portada },
      name: o.titulo,
      url: `/project/${o.slug}`,
    })), ...b.hasPart];
    // Y decrece con las ocultas: el JSON-LD dice las obras que la pagina ensena, ni una mas.
    const antes = b.hasPart.length;
    b.hasPart = b.hasPart.filter((p) => !OCULTAS.has(String(p.url).replace(/^\/project\//, '')));
    if (antes - b.hasPart.length !== OCULTAS.size) {
      console.error(`\n  ROJO ${ruta}: el hasPart quito ${antes - b.hasPart.length} partes y hay ${OCULTAS.size} ocultas\n`);
      process.exit(1);
    }
  }

  /* D-172: la miga que el origen anida en el WebPage de esta pagina trae rutas relativas («/», «/pool-cost-estimator»)
   * y Google pide URL absolutas en `item`. Es forma, no contenido. Si el origen la arreglara, se para aqui. */
  if (ruta === '/pool-cost-estimator') {
    const miga = jsonLd[0]?.breadcrumb?.itemListElement;
    if (!Array.isArray(miga) || miga.length !== 2 || miga.some((x) => !String(x.item).startsWith('/'))) { console.error(`\n  ROJO ${ruta}: la miga del origen ya no son dos rutas relativas\n`); process.exit(1); }
    for (const x of miga) x.item = `https://www.mrandmrsoutdoorliving.com${x.item}`;
  }

  // La profundidad importa: /blogs/{slug} vive en src/pages/blogs/, asi que necesita ../../
  const arriba = '../'.repeat((ruta.match(/\//g) ?? []).length);
  const imports = [...usados].map((c) => `import ${c} from '${arriba}components/widgets/${c}.astro';`).join('\n');
  const cuerpo = partes.map((p, i) => (p.componente ? `<${p.componente} />` : `<Fragment set:html={T${i}} />`)).join('\n  ');
  const consts = [...partes.map((p, i) => (p.componente ? null : `const T${i} = ${JSON.stringify(p.html)};`)),
    ...partesTras.map((p, i) => (p.componente ? null : `const P${i} = ${JSON.stringify(p.html)};`)),
    ...partesAntes.map((p, i) => (p.componente ? null : `const A${i} = ${JSON.stringify(p.html)};`))]
    .filter(Boolean).join('\n');
  const cuerpoAntes = partesAntes.map((p, i) => (p.componente
    ? `<${p.componente} slot="antes-nav" />`
    : `<Fragment slot="antes-nav" set:html={A${i}} />`)).join('\n  ');
  const cuerpoTras = partesTras.map((p, i) => (p.componente
    ? `<${p.componente} slot="tras-pie" />`
    : `<Fragment slot="tras-pie" set:html={P${i}} />`)).join('\n  ');

  /**
   * LA GUARDA VA AQUI, EN LA ESCRITURA, Y NO AL PRINCIPIO DEL BUCLE.
   *
   * La primera version cortaba arriba con un `continue`, y eso tambien se saltaba
   * `extraeServicios(...)`: `src/data/servicios-categoria.json` perdia la entrada de `/`
   * -221 lineas- y la seccion de servicios de la home se quedaba sin datos. Medido al probar
   * la guarda en rojo, no razonado: la propia guarda rompia lo que venia a proteger.
   *
   * Aqui abajo ya se ha hecho todo el trabajo de lectura y solo queda tocar el disco, que es
   * exactamente lo unico que hay que impedir.
   */
  // Los huecos declarados se rellenan justo antes de escribir, para que se vean en el diff del
  // fichero generado y no escondidos dentro de la extraccion del <head>.
  const hueco = HUECOS_SEO[ruta];
  if (hueco) {
    if (desc) { console.error(`\n  ROJO ${ruta} ya trae description del origen: quita su entrada de HUECOS_SEO\n`); process.exit(1); }
    if (jsonLd.length) { console.error(`\n  ROJO ${ruta} ya trae JSON-LD del origen: quita su entrada de HUECOS_SEO\n`); process.exit(1); }
    desc = hueco.descripcion;
    jsonLd.push(...hueco.jsonLd.map(ordena));
    huecosRellenados++;
  }

  const clave = protegida(ruta);
  if (clave) { protegidas.push([ruta, clave]); continue; }

  const destino = ruta === '/' ? 'index' : ruta.slice(1);
  const salida = path.join(RAIZ, 'src/pages', `${destino}.astro`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, `---
// DERIVADO - no editar a mano. Lo genera scripts/build-paginas.mjs desde
// _source/vivo/${slug}.html (el HTML que sirve el sitio vivo). Regenerar: npm run paginas
import Base from '${arriba}layouts/Base.astro';
${imports}

${consts}
const SEO = ${JSON.stringify({ meta: metaSeo, jsonLd })};
${jsonLdCrudo.length ? `// ${jsonLdCrudo.length} bloque(s) de JSON-LD del origen NO parsean (salto de linea literal
// dentro de la cadena). Se emiten CRUDOS, byte a byte, porque el contrato dice replicar.
const LD_CRUDO = ${JSON.stringify(jsonLdCrudo)};` : 'const LD_CRUDO = [];'}
---
<Base titulo=${JSON.stringify(titulo)} descripcion=${JSON.stringify(desc)} ruta=${JSON.stringify(ruta)}${pie ? '' : ' conPie={false}'} seo={SEO} jsonLdCrudo={LD_CRUDO}>
  ${cuerpoAntes}
  ${cuerpo}
  ${cuerpoTras}
</Base>
`);
  generadas.push([ruta, partes.length, acumulado.length, [...usados].join('+')]);
  const col = ruta.split('/')[1] && RUTAS.find(([r]) => r === ruta)?.[2];
  porColeccion[col || 'estatica'] = (porColeccion[col || 'estatica'] ?? 0) + 1;
}

// Los datos de la seccion de servicios, ruta a ruta. Los lee
// `src/components/widgets/ServiciosPorCategoria.astro` por `Astro.url.pathname`: el mecanismo
// de marcador no pasa props, asi que el componente se localiza solo.
fs.writeFileSync(path.join(RAIZ, 'src/data/servicios-categoria.json'),
  JSON.stringify(SERVICIOS, null, 2) + '\n');
console.log(`\n  servicios-categoria.json  ${Object.keys(SERVICIOS).length} rutas`);

// El encabezado del carrusel de blog, ruta a ruta (Estado a mano + Condado extraido). Lo lee
// `CarruselBlog.astro` por `Astro.url.pathname`, mismo mecanismo que arriba.
fs.writeFileSync(path.join(RAIZ, 'src/data/blog-heading-por-ruta.json'),
  JSON.stringify(ENCABEZADOS_BLOG, null, 2) + '\n');
console.log(`  blog-heading-por-ruta.json  ${Object.keys(ENCABEZADOS_BLOG).length} rutas`);

// Idem para el carrusel de proyectos. Lo lee `CarruselProyectos.astro`, tambien por
// `Astro.url.pathname`. Las claves `_*` del seed no son rutas: son la documentacion del
// fichero derivado, y por eso el recuento las descuenta.
fs.writeFileSync(path.join(RAIZ, 'src/data/proyectos-heading-por-ruta.json'),
  JSON.stringify(ENCABEZADOS_PROYECTOS, null, 2) + '\n');
console.log(`  proyectos-heading-por-ruta.json  `
  + `${Object.keys(ENCABEZADOS_PROYECTOS).filter((k) => k.startsWith('/')).length} rutas`);

if (sinMapear.size) {
  console.error(`\nROJO ${sinMapear.size} URLs del CDN sin entrada en el manifiesto:\n`);
  [...sinMapear].slice(0, 10).forEach((u) => console.error('   ' + u));
  console.error('\n   No se generan paginas que apunten al CDN de Webflow.\n');
  process.exit(1);
}

console.log('');
for (const [k, v] of Object.entries(porColeccion).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(20)} ${String(v).padStart(3)} paginas`);
}
const kb = generadas.reduce((a, [, , b]) => a + b, 0) / 1024;
console.log(`\n  OK ${generadas.length} paginas · ${Math.round(kb)} kB de marcado`);
console.log(`  carrusel de blog insertado en ${blogsInsertados} ficha(s) de services/+where-we-serves/`
  + `${blogsInsertados === 16 ? '' : '   <<< SE ESPERABAN 16'}`);
console.log(`  captacion aplicada en ${captacionAplicada} ruta(s)`
  + `${captacionAplicada === RUTAS_CAPTACION_SERVICIOS.length ? '' : '   <<< NO CUADRA CON captacion-servicios.json'}`);
console.log(`  carrusel de proyectos sustituido en ${proyectosSustituidos} ruta(s)`
  + `${proyectosSustituidos === 10 ? '' : '   <<< SE ESPERABAN 10'}`);
console.log(`  carrusel de blog sustituido en ${blogsSustituidos} ficha(s) de country/`
  + `${blogsSustituidos === 9 ? '' : '   <<< SE ESPERABAN 9'}`);

/* Las 14 de `/gallery`: si no entran todas, el casting y lo publicado dejan de coincidir y la
 * trazabilidad de `page_asset_usage.csv` se vuelve mentira. Para el generador. */
const GALERIA_PROPIA_ESPERADA = GALERIA_PAGINA.construction.length + GALERIA_PAGINA.remodeling.length
  + GALERIA_CATEGORIAS.reduce((n, c) => n + c.fotos.filter((f) => f.origen === 'banco').length, 0);
if (galeriaPropiaInsertada !== GALERIA_PROPIA_ESPERADA) {
  console.error(`\n  ROJO /gallery: se insertaron ${galeriaPropiaInsertada} fotos del banco y el casting trae ${GALERIA_PROPIA_ESPERADA}\n`);
  process.exit(1);
}
console.log(`  ${galeriaPropiaInsertada} fotos del banco insertadas en /gallery · ${galeriaExcluida} retirada(s) de su rejilla por \`excluidas\`\n`);

const OBRAS_ESPERADAS = OBRAS_PROPIAS.length * Object.keys(OBRAS_EN).length;
console.log(`  obras propias insertadas en el indice: ${obrasInsertadas}`
  + `${obrasInsertadas === OBRAS_ESPERADAS ? '' : `   <<< SE ESPERABAN ${OBRAS_ESPERADAS}`}`
  + ` · ocultadas: ${obrasOcultadas} (src/data/proyectos-indice.json)`);
console.log('        (la home tambien trae la seccion en su origen y se cuenta en memoria, pero');
console.log('        esta en NO_REGENERAR y no se escribe: sigue con su propio S_BLOG a mano.)');
console.log('        Las 53 de pool-builders/ NO pasan por este generador — su migracion es');
console.log('        manual, con scripts/migrar-blog-pool-builders.mjs (npm run plantillas la');
console.log('        salta con «0 paginas · ya convertida»).\n');
console.log(`  enlaces reescritos a una ruta renombrada: ${enlacesRenombrados}`);
console.log(`  imagenes con hueco reservado (width+height): ${huecosReservados}`);
console.log(`  heroes que dejan de ser lazy (imagen LCP): ${heroesDesperezados}`);
console.log(`  logos con sizes="200px": ${logosConSizes} · rel="noopener" anadidos: ${relAnadidos}`
  + ` · telefonos en .mm-tel: ${telefonosEnvueltos}`);
if (imgSinDim.length) {
  console.error(`\n  ROJO ${imgSinDim.length} imagen(es) declarada(s) sin dim en el manifiesto —`
    + ' siguen desplazando y esto no lo dice ninguna puerta:');
  imgSinDim.slice(0, 6).forEach((x) => console.error(`      ${x}`));
  process.exit(1);
}
console.log(`  huecos de SEO rellenados: ${huecosRellenados} de ${Object.keys(HUECOS_SEO).length}`
  + `${huecosRellenados === Object.keys(HUECOS_SEO).length ? '' : '   <<< FALTA ALGUNA'}`);
// 7 desde D-195: una de las 8 era la ficha de proyecto que se retiro.
console.log(`  JSON-LD del origen reparado (caracter de control): ${ldReparados}`
  + `${ldReparados === 7 ? '' : '   <<< SE ESPERABAN 7'}`);
console.log(`  «Read More» del HTML crudo con aria-label: ${ctaEtiquetados}`
  + `${ctaEtiquetados === 80 ? '' : '   <<< SE ESPERABAN 80'}`);
if (ctaSinTitulo.length) {
  console.error(`\n  ROJO ${ctaSinTitulo.length} enlace(s) generico(s) sin encabezado del que sacar`
    + ' el aria-label. La forma de la tarjeta ha cambiado en el origen:');
  ctaSinTitulo.slice(0, 8).forEach((x) => console.error(`      ${x}`));
  process.exit(1);
}
console.log(`  embed WAAPI del mosaico retirado en ${codeEmbedsEliminados} ficha(s) de country/`
  + `${codeEmbedsEliminados === 9 ? '' : '   <<< SE ESPERABAN 9'}`);
console.log('        El bucle nuevo vive en src/styles/intro.css §5, igual para las 80 rutas.\n');

/* Va ANTES del aviso de NO_REGENERAR, que sale siempre con 1: detras no correria nunca. */
const FOTOS_ESPERADAS = Object.entries(FOTOS_POR_RUTA).filter(([k]) => k.startsWith('/'))
  .flatMap(([, s]) => Object.values(s).flat()).filter(Boolean).length;
console.log(`  ${fotosCanjeadas} fotos del banco canjeadas por fotos-por-ruta.json\n`);
if (fotosCanjeadas !== FOTOS_ESPERADAS) {
  console.error(`\n  ROJO fotos-por-ruta.json declara ${FOTOS_ESPERADAS} y se canjearon ${fotosCanjeadas}:`
    + ' alguna ruta no se genero (NO_REGENERAR o fuera de routes.csv).\n');
  process.exit(1);
}
const FICHAS_CAPTACION = RUTAS_CAPTACION_SERVICIOS.length;
console.log(`  gallery y resenas canjeadas en ${galeriasMovidas} de ${FICHAS_CAPTACION} fichas de services/\n`);
if (galeriasMovidas !== FICHAS_CAPTACION) {
  console.error(`\n  ROJO el canje se hizo en ${galeriasMovidas} fichas y hay ${FICHAS_CAPTACION}:`
    + ' las fichas de /services/ tienen que tener todas el mismo orden.\n');
  process.exit(1);
}

if (protegidas.length) {
  console.error('  ' + '='.repeat(74));
  console.error(`  NO SE HAN REGENERADO ${protegidas.length} RUTA(S) — estan en NO_REGENERAR`);
  console.error('  ' + '='.repeat(74));
  const porClave = new Map();
  for (const [r, k] of protegidas) porClave.set(k, [...(porClave.get(k) ?? []), r]);
  for (const [k, rs] of porClave) {
    console.error(`    ${k}   ${rs.length} ruta(s): ${rs.slice(0, 3).join(' ')}`
      + (rs.length > 3 ? ` ... y ${rs.length - 3} mas` : ''));
    console.error(`      ${NO_REGENERAR.get(k)}`);
  }
  console.error('\n  Su .astro sigue como estaba. Si de verdad querias regenerarla, sacala de');
  console.error('  NO_REGENERAR en scripts/build-paginas.mjs y anota el motivo en la bitacora.');
  console.error('  Salida 1 a proposito: un `&&` detras de esto tiene que pararse.\n');
  process.exit(1);
}
