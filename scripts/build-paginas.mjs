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
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { renombra } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;
/* El manifiesto ya trae `dim:{w,h}` de 1877 de los 2000 assets. Indexado por ruta publica,
 * sirve para reservar el hueco de una imagen que no declara tamano (§ limpia()). */
const DIM = new Map(Object.values(man).filter((a) => a.dim?.w).map((a) => [a.publico, a.dim]));
/* Las clases de `<img>` a las que se les reserva el hueco (§ limpia()). Enumeradas y medidas:
 * cada una entro aqui con una cifra de `layout-shift` detras, no por precaucion. */
const RESERVAN_HUECO = ['fs-marquee-logoscms_logo', 'image-whereweserve'];

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
      enlace: at(ficha.querySelector('.block-buttom-services a'), 'href'),
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
   * `src/pages/pool-builders/[slug].astro`. Al correr este generador para probar la guarda de
   * `/`, reaparecieron los 53 como ficheros sin versionar. Eso ensombrece la plantilla, mete 53
   * rutas de mas y rompe `check:rutas` -que exige 115 y 0 extras-, y todo ello en silencio: el
   * banner solo hablaba de `/`, asi que quien lo leyera se habria quedado tranquilo.
   *
   * O sea, la guarda daba una falsa seguridad, que es peor que no tenerla. Es exactamente la
   * familia de fallo que R6 viene a matar, solo que en el generador en vez de en la puerta.
   */
  ['/pool-builders/', 'la familia entera la sirve src/pages/pool-builders/[slug].astro leyendo '
      + 'de Sanity desde la Fase 6b, que borro los 53 .astro a proposito. Regenerarlos los '
      + 'repone sin versionar, ensombrece la plantilla y rompe check:rutas con 53 rutas de mas.'],
  /**
   * LA TERCERA: las 2 de Estado. Su heroe (T0) se edita A MANO desde el rediseno del 3-sep-2026
   * y este generador las SOBRESCRIBIA en silencio — no era una hipotesis, paso en la sesion de
   * SEO del 3-sep-2026 y hubo que restaurarlas de una instantanea. La cabecera del .astro ya lo
   * avisaba; lo que faltaba era la guarda que lo impide.
   */
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
const protegida = (ruta) => [...NO_REGENERAR.keys()]
  .find((k) => (k !== '/' && k.endsWith('/') ? ruta.startsWith(k) : ruta === k));

/* Cuenta las rutas de services/+where-we-serves/ que reciben el carrusel de blog POR
 * INSERCION (§ mas abajo). Se COMPRUEBA al final contra 16: si sube, se ha colado en una ruta
 * de mas; si baja, alguna se ha quedado sin el. Un «las que salgan» no comprobaria nada. */
let blogsInsertados = 0;
/* Y las que lo reciben por SUSTITUCION -Condado ya traia `.blog-section-page` en su origen-,
 * comprobado al final contra 9. Los dos mecanismos son disjuntos por construccion: Condado no
 * pasa por el `if` de insercion y Estado/Servicios no tienen la seccion en su origen. */
let blogsSustituidos = 0;
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
for (const [ruta] of RUTAS) {
  const slug = aSlug(ruta);
  const fichero = path.join(RAIZ, '_source/vivo', `${slug}.html`);
  if (!fs.existsSync(fichero)) { console.error(`  ROJO falta _source/vivo/${slug}.html`); continue; }
  const doc = new JSDOM(fs.readFileSync(fichero, 'utf8')).window.document;

  const menu = doc.querySelector('section.menu');
  const pie = doc.querySelector('section.footer');
  // /pool-investment-estimator no tiene cascaron porque NO ES una pagina de Webflow: en el
  // origen era una app de Webflow Cloud, sin nav ni pie. Desde la Fase 12c la escribe a mano
  // `src/pages/pool-investment-estimator.astro` con el componente `widgets/Estimador.astro`,
  // el mismo que monta `/pool-cost-estimator`. Aqui se salta: no hay nada que derivar.
  if (ruta === '/pool-investment-estimator') continue;
  if (!menu) { console.error(`  ROJO ${ruta}: no encuentro el nav`); continue; }

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
   * SE ACOTA POR PREFIJO DE RUTA y no por «si la pagina tiene .cta-footer»: ese `.cta-footer`
   * esta en mas paginas de las 16, asi que la condicion obvia habria puesto el carrusel de mas.
   *
   * VA ANTES DE `.cta-footer` porque es donde lo pidio Sebastian: entre las reseñas y el CTA
   * del pie. En una ficha las secciones acaban en
   *     location -> testimonial-section -> social-media -> cta-footer -> logos-section
   *
   * COSTE QUE HAY QUE TENER PRESENTE: son +32 lineas de `innerText` en cada una de las 16, y
   * `baseline/text/` NO se re-baseliniza nunca (§1.1). Por eso el bloque va DECLARADO en
   * `check-texto.mjs`, derivado de `src/data/blogs.json` (mas el encabezado por ruta de
   * `blog-heading-por-ruta.json` para las 2 de Estado), igual que el de reseñas.
   */
  const CON_BLOG_INSERTADO = ['/services/', '/where-we-serve/'];
  let acumulado = '';
  for (let n = menu.nextElementSibling; n && n !== pie; n = n.nextElementSibling) {
    if (CON_BLOG_INSERTADO.some((p) => ruta.startsWith(p)) && n.matches?.('section.cta-footer')) {
      acumulado += MARCA + 'CarruselBlog' + MARCA;
      usados.add('CarruselBlog');
      blogsInsertados++;
    }
    acumulado += limpia(n);
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

  const titulo = doc.querySelector('title')?.textContent ?? '';
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
    const t = sc.textContent.replace(reUrlGlobal, (u) => renombra(local(equilibra(u))));
    try { jsonLd.push(ordena(JSON.parse(t))); } catch {
      try { jsonLd.push(ordena(JSON.parse(sanea(t)))); ldReparados++; }
      catch { jsonLdCrudo.push(t); }
    }
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
console.log(`  carrusel de blog sustituido en ${blogsSustituidos} ficha(s) de country/`
  + `${blogsSustituidos === 9 ? '' : '   <<< SE ESPERABAN 9'}`);
console.log('        (la home tambien trae la seccion en su origen y se cuenta en memoria, pero');
console.log('        esta en NO_REGENERAR y no se escribe: sigue con su propio S_BLOG a mano.)');
console.log('        Las 53 de pool-builders/ NO pasan por este generador — su migracion es');
console.log('        manual, con scripts/migrar-blog-pool-builders.mjs (npm run plantillas la');
console.log('        salta con «0 paginas · ya convertida»).\n');
console.log(`  enlaces reescritos a una ruta renombrada: ${enlacesRenombrados}`);
console.log(`  imagenes con hueco reservado (width+height): ${huecosReservados}`);
console.log(`  heroes que dejan de ser lazy (imagen LCP): ${heroesDesperezados}`);
if (imgSinDim.length) {
  console.error(`\n  ROJO ${imgSinDim.length} imagen(es) declarada(s) sin dim en el manifiesto —`
    + ' siguen desplazando y esto no lo dice ninguna puerta:');
  imgSinDim.slice(0, 6).forEach((x) => console.error(`      ${x}`));
  process.exit(1);
}
console.log(`  huecos de SEO rellenados: ${huecosRellenados} de ${Object.keys(HUECOS_SEO).length}`
  + `${huecosRellenados === Object.keys(HUECOS_SEO).length ? '' : '   <<< FALTA ALGUNA'}`);
console.log(`  JSON-LD del origen reparado (caracter de control): ${ldReparados}`
  + `${ldReparados === 8 ? '' : '   <<< SE ESPERABAN 8'}`);
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
