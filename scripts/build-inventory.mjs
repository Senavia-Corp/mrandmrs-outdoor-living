// Genera los dos inventarios que congelan el alcance de la migración:
//   _source/routes.csv            las 115 rutas públicas -> colección -> plantilla
//   _source/assets-inventory.csv  todo asset referenciado, deduplicado por URL
// Ambos son idempotentes: mismas entradas -> mismo fichero, byte a byte.
import fs from 'node:fs';
import path from 'node:path';
import { RENOMBRADAS } from './lib/renombradas.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CMS = path.join(ROOT, '_source/cms');
const EXPORT = path.join(ROOT, '_source/webflow-export');
const SITE = 'https://mrandmrsoutdoorliving.com';

const csv = (rows) => rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';

// --- parser CSV mínimo (los export de Webflow llevan comillas y saltos dentro de celda)
function parse(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const load = (n) => parse(fs.readFileSync(path.join(CMS, n + '.csv'), 'utf8'));

// ─────────── RUTAS ───────────
const ESTATICAS = [
  ['/', 'index.html'],
  ['/about', 'about.html'], ['/blogs-tips', 'blogs-tips.html'], ['/brochures', 'brochures.html'],
  ['/contact-us', 'contact-us.html'], ['/gallery', 'gallery.html'],
  ['/industry-solutions', 'industry-solutions.html'], ['/pool-cost-estimator', 'pool-cost-estimator.html'],
  ['/projects', 'projects.html'], ['/request-estimated', 'request-estimated.html'],
  ['/testimonials', 'testimonials.html'], ['/videos', 'videos.html'], ['/where-we-serve', 'where-we-serve.html'],
];
// viva y servida, pero FUERA del sitemap: un barrido que salga del sitemap la pierde
const FUERA_SITEMAP = [['/pool-investment-estimator', '(no está en el export; capturar del sitio vivo)']];
const COLECCIONES = [
  ['/services', 'residentials', 'detail_services.html'],
  ['/pool-builders', 'pool-builders', 'detail_pool-builders.html'],
  ['/project', 'projects', 'detail_project.html'],
  ['/blogs', 'blogs', 'detail_blogs.html'],
  ['/country', 'countries', 'detail_country.html'],
  ['/articles', 'articles', 'detail_articles.html'],
  ['/where-we-serves', 'where-we-serves', 'detail_where-we-serves.html'],
];

const rutas = [['ruta', 'tipo', 'coleccion', 'plantilla', 'enSitemap']];
const sitemap = fs.existsSync(path.join(ROOT, '_source/live/sitemap.txt'))
  ? new Set(fs.readFileSync(path.join(ROOT, '_source/live/sitemap.txt'), 'utf8').split('\n').filter(Boolean))
  : null;
const enSitemap = (r) => sitemap ? (sitemap.has(r) ? 'si' : 'NO') : '?';

for (const [r, t] of ESTATICAS) rutas.push([r, 'estatica', '', t, enSitemap(r)]);
for (const [r, t] of FUERA_SITEMAP) rutas.push([r, 'estatica-oculta', '', t, 'NO']);
for (const [base, col, tpl] of COLECCIONES) {
  for (const item of load(col)) {
    if (item.Archived === 'true') continue;
    const r = `${base}/${item.Slug}`;
    rutas.push([RENOMBRADAS.get(r) ?? r, 'coleccion', col, tpl, enSitemap(r)]);
  }
}
fs.writeFileSync(path.join(ROOT, '_source/routes.csv'), csv(rutas));

// ─────────── ASSETS ───────────
// Regla dura: deduplicar por URL ANTES de tocar la red, y que gane la referencia
// que trae `alt`. Encolar una tarea por REFERENCIA hace el manifiesto no determinista:
// la misma URL sale con `alt` o sin él según quién llegue antes.
const assets = new Map(); // url -> {url, ext, alt, usos:[]}
// El campo del alt se EMPAREJA POR NOMBRE, no con una lista a mano: escribirla a mano
// dejó fuera `Imagen Intro N`, `Image Animation N`, `Before/After Image` e `Img Feature N`
// (31 alts perdidos en silencio, medidos). Webflow nombra el hermano con prefijo variable:
// Metadata / Metadescription / Metada / SEO Metadata, y a veces Image<->Imagen.
const PREFIJO = /^(seo\s+)?(metadata|metadescription|metadatos|metada)\s*/i;
const canon = (s) => s.toLowerCase().replace(/\bimagen\b/g, 'image').replace(/[^a-z0-9]+/g, '');
function mapaAlt(cols) {
  const metas = cols.filter(c => PREFIJO.test(c));
  const mapa = {};
  for (const c of cols) {
    if (PREFIJO.test(c)) continue;
    const hit = metas.find(m => canon(m.replace(PREFIJO, '').replace(/\bseo\b/gi, '')) === canon(c));
    if (hit) mapa[c] = hit;
  }
  return mapa;
}

for (const f of fs.readdirSync(CMS)) {
  const col = f.replace(/\.csv$/, '');
  const filas = load(col);
  const ALT_DE = filas.length ? mapaAlt(Object.keys(filas[0])) : {};
  for (const [i, item] of filas.entries()) {
    for (const [campo, valor] of Object.entries(item)) {
      if (!/^https?:\/\//.test(valor)) continue;
      for (const raw of valor.split(';')) {
        const url = normalizarUrl(raw.trim().replace(/[;,]$/, ''));
        if (!url) continue;
        const alt = (item[ALT_DE[campo] ?? ''] || '').trim();
        const prev = assets.get(url);
        if (!prev) assets.set(url, { url, alt, usos: [`${col}.${campo}#${item.Slug || i}`] });
        else { prev.usos.push(`${col}.${campo}#${item.Slug || i}`); if (!prev.alt && alt) prev.alt = alt; }
      }
    }
  }
}
// más los del HTML del export
for (const f of fs.readdirSync(EXPORT).filter(x => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(EXPORT, f), 'utf8');
  for (const m of html.matchAll(/https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g)) {
    const url = normalizarUrl(equilibrarParentesis(equilibrarParentesis(m[0]).replace(/&(quot|apos|#34|#39);?$/, '')));
    if (!url) continue;
    // el alt del cromo vive en el propio <img>, no en un campo del CMS
    const ctx = html.slice(Math.max(0, m.index - 400), m.index + 400);
    const alt = (ctx.match(/\salt="([^"]*)"/) || [, ''])[1].trim();
    const prev = assets.get(url);
    if (!prev) assets.set(url, { url, alt, usos: [`html:${f}`] });
    else { prev.usos.push(`html:${f}`); if (!prev.alt && alt) prev.alt = alt; }
  }
}

// ...y los del CSS del ESTIMADOR, que vive en otro origen y por eso se quedó fuera en la
// primera pasada de la Fase 2.
//
// `/pool-investment-estimator` no es una página de Webflow: es una app Astro+React servida
// por Webflow Cloud desde un host `*.wf-app-prod.cosmic.webflow.services`. Su CSS pide 9
// assets del CDN de Webflow y NINGUNO estaba en el manifiesto — entre ellos `checked.png` y
// `unchecked.png`, que la bitácora dio por «no referenciados por ninguna página ni el CSS».
// Lo eran, pero por un CSS que nadie había escaneado. Dos fallos independientes con el mismo
// síntoma; el segundo solo se ve mirando fuera del export.
//
// El requisito del cliente es CERO referencias a cdn.prod.website-files.com al terminar, y
// el CDN ya devuelve 403 permanente en assets de proyectos anteriores: lo que no se baje
// ahora puede no estar cuando haga falta.
// ...y los del CSS DEL PROPIO SITIO. Tercer origen de referencias que la Fase 2 no miraba, y
// el que avisa `PROMPT.md`: «ninguna puerta escanea los url() del CSS, ahí puede quedar un 404
// invisible». No se veía porque el CSS DEL EXPORT usa rutas relativas (`../images/…`) — 0
// url(https://) — mientras que el que sirve el vivo, que es el que produjo el baseline,
// apunta al CDN en 13 sitios.
//
// Además hay que ensanchar el HOST: `custom-checkbox-checkmark.589d534424.svg` vive en
// `d3e54v103j8qbb.cloudfront.net`, el host de assets de plataforma de Webflow, que el patrón
// de siempre ni miraba. Es la palomita de todos los `w-checkbox` del sitio.
// ...y los de LAS 115 PÁGINAS DEL SITIO VIVO, que es la fuente de verdad del contrato.
//
// Esto tenía que haber sido el escaneo PRINCIPAL desde el principio. Construir el inventario
// desde el export dio tres reaperturas de la Fase 2 por la misma causa, y al medirlo salió
// que el export está DESFASADO: de las 1183 URLs del CDN que piden las 115 páginas vivas,
// solo 39 estaban en el manifiesto. Medidas las 1144 restantes una a una:
//   · 689 son el MISMO contenido con otra URL — Webflow antepone un hash nuevo al resubir,
//     así que el fichero ya estaba en disco y solo faltaba el mapeo URL -> fichero;
//   · 440 son las variantes responsive `-p-500/800/1080` que Webflow genera para el srcset;
//   ·  15 dan 403: el CDN ya no las sirve. 11 tienen equivalente local; las otras 4 son
//     imágenes de una entrada de blog que están ROTAS EN EL SITIO VIVO ahora mismo.
//   · imágenes de contenido genuinamente nuevas: CERO.
//
// Las variantes `-p-N` HEREDAN los usos de su imagen base, para que acaben en la misma
// carpeta que ella. Si no, entrarían como cromo y 440 ficheros de colección se irían a
// `images/site/`, que va a git: 47 MB versionados sin motivo.
const VIVO = path.join(ROOT, 'baseline/html');
if (fs.existsSync(VIVO)) {
  const porNombre = new Map();
  for (const a of assets.values()) porNombre.set(nombreFinal(a.url), a);
  const pendientes = [];
  for (const f of fs.readdirSync(VIVO).filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(VIVO, f), 'utf8');
    for (const m of html.matchAll(/https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g)) {
      const url = normalizarUrl(equilibrarParentesis(equilibrarParentesis(m[0]).replace(/&(quot|apos|#34|#39);?$/, '')));
      if (!url) continue;
      const prev = assets.get(url);
      if (prev) { prev.usos.push(`vivo:${f}`); continue; }
      pendientes.push([url, f, html.slice(Math.max(0, m.index - 400), m.index + 400)]);
    }
  }
  // Dos pasadas: primero las que no son variantes, para que las variantes encuentren su base.
  const esVariante = (u) => /-p-\d+\.\w+$/.test(nombreFinal(u));
  for (const orden of [0, 1]) {
    for (const [url, f, ctx] of pendientes) {
      if ((esVariante(url) ? 1 : 0) !== orden || assets.get(url)) continue;
      const base = esVariante(url)
        ? porNombre.get(nombreFinal(url).replace(/-p-\d+(\.\w+)$/, '$1'))
        : null;
      const alt = base?.alt || (ctx.match(/\salt="([^"]*)"/) || [, ''])[1].trim();
      const a = { url, alt, usos: base ? [...base.usos] : [`vivo:${f}`] };
      assets.set(url, a);
      porNombre.set(nombreFinal(url), a);
    }
  }
}

const CSS_SITIO = path.join(ROOT, '_source/webflow-css');
if (fs.existsSync(CSS_SITIO)) {
  for (const f of fs.readdirSync(CSS_SITIO).filter((x) => x.endsWith('.css'))) {
    const txt = fs.readFileSync(path.join(CSS_SITIO, f), 'utf8');
    for (const m of txt.matchAll(/url\(\s*['"]?(https:\/\/[^'")\s]+)['"]?\s*\)/g)) {
      const url = normalizarUrl(m[1]);
      if (!url) continue;
      const prev = assets.get(url);
      // Sin alt: son fondos e iconos de CSS, no hay <img> del que sacarlo.
      if (!prev) assets.set(url, { url, alt: '', usos: [`css:${f}`] });
      else prev.usos.push(`css:${f}`);
    }
  }
}

const ESTIMADOR = path.join(ROOT, '_source/estimator');
if (fs.existsSync(ESTIMADOR)) {
  for (const f of fs.readdirSync(ESTIMADOR).filter((x) => /\.(css|html)$/.test(x))) {
    const txt = fs.readFileSync(path.join(ESTIMADOR, f), 'utf8');
    for (const m of txt.matchAll(/https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"')\s]+/g)) {
      const url = normalizarUrl(m[0].replace(/&(quot|apos|#34|#39);?$/, ''));
      if (!url) continue;
      const prev = assets.get(url);
      // Sin alt: son fondos e iconos de un CSS, no hay <img> del que sacarlo.
      if (!prev) assets.set(url, { url, alt: '', usos: [`html:estimator/${f}`] });
      else prev.usos.push(`html:estimator/${f}`);
    }
  }
}

// La URL se usa CRUDA para descargar. Solo se corrigen dos defectos reales del origen:
//   - `industry-solutions.html` repite el id de sitio en la ruta -> 403 (la simple da 200)
//   - assets que no son media (el config .js de Finsweet) no son assets
/**
 * La COMA tampoco forma parte de la URL cuando se saca de HTML: `data-video-urls` lleva el
 * mp4 y el webm separados por coma, y `srcset` separa así sus entradas. Cogerla dentro daba
 * una «URL» con dos pegadas que devolvía 403 — los 3 vídeos de fondo del sitio.
 *
 * Recorta el paréntesis de cierre que sobra al final de una URL sacada de HTML.
 *
 * En HTML el delimitador es la comilla, no el paréntesis: parar en `)` truncaba
 * `…_Adobe Express - file (1).png` en `…file%20(1` y dejaba 12 assets sin extensión, entre
 * ellos los 4 de una entrada de blog. Pero una URL dentro de `style="background:url(…)"` sí
 * acaba en `)`. La regla que distingue las dos: si sobran cierres, el último no es de la URL.
 */
function equilibrarParentesis(u) {
  while (u.endsWith(')') && (u.split(')').length > u.split('(').length)) u = u.slice(0, -1);
  return u;
}

function normalizarUrl(u) {
  if (!/^https?:\/\//.test(u)) return null;
  // d3e54v103j8qbb.cloudfront.net es el host de assets de PLATAFORMA de Webflow (la palomita
  // de los checkbox, iconos del reproductor…). No es website-files.com, así que el patrón de
  // los escaneos de HTML no lo casa; aquí llega por el CSS y hay que dejarlo pasar.
  if (!/(website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb\.cloudfront\.net)/.test(u)) return null;
  if (/\.(js|css|json)(\?|$)/i.test(u)) return null;
  return u.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/');
}

// nombre final: quita los hashes ENCADENADOS de Webflow ({nuevo}_{viejo}_nombre)
// y la doble codificación (%2520). Ambas vistas en migraciones anteriores.
function nombreFinal(url) {
  // Decodificar ANTES de partir: 3 URLs traen la barra como %2F y el nombre se
  // llevaría el id de sitio y el hash por delante.
  let n = url.split('?')[0];
  for (let i = 0; i < 2; i++) { try { n = decodeURIComponent(n); } catch { break; } }
  n = n.split('/').pop();
  while (/^[0-9a-f]{24}_/.test(n)) n = n.slice(25);
  return n.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const rows = [['url', 'nombreFinal', 'ext', 'alt', 'nUsos', 'usos']];
for (const a of [...assets.values()].sort((x, y) => x.url.localeCompare(y.url))) {
  const n = nombreFinal(a.url);
  rows.push([a.url, n, n.split('.').pop(), a.alt, a.usos.length, a.usos.join(' | ')]);
}
fs.writeFileSync(path.join(ROOT, '_source/assets-inventory.csv'), csv(rows));

// ─────────── resumen ───────────
const porExt = {};
for (const r of rows.slice(1)) porExt[r[2]] = (porExt[r[2]] || 0) + 1;
const multi = rows.slice(1).filter(r => r[4] > 1).length;
const sinAlt = rows.slice(1).filter(r => !r[3] && !/svg|pdf/.test(r[2])).length;
console.log(`routes.csv            ${rutas.length - 1} rutas`);
console.log(`assets-inventory.csv  ${rows.length - 1} assets únicos`);
console.log(`  por extensión:      ${JSON.stringify(porExt)}`);
console.log(`  referenciados 2+ veces: ${multi}  (fundidos por URL: el manifiesto es determinista)`);
console.log(`  sin alt (no svg/pdf):   ${sinAlt}`);
