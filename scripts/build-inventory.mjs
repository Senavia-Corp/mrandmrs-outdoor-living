// Genera los dos inventarios que congelan el alcance de la migración:
//   _source/routes.csv            las 115 rutas públicas -> colección -> plantilla
//   _source/assets-inventory.csv  todo asset referenciado, deduplicado por URL
// Ambos son idempotentes: mismas entradas -> mismo fichero, byte a byte.
import fs from 'node:fs';
import path from 'node:path';

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
    rutas.push([r, 'coleccion', col, tpl, enSitemap(r)]);
  }
}
fs.writeFileSync(path.join(ROOT, '_source/routes.csv'), csv(rutas));

// ─────────── ASSETS ───────────
// Regla dura: deduplicar por URL ANTES de tocar la red, y que gane la referencia
// que trae `alt`. Encolar una tarea por REFERENCIA hace el manifiesto no determinista:
// la misma URL sale con `alt` o sin él según quién llegue antes.
const assets = new Map(); // url -> {url, ext, alt, usos:[]}
const ALT_DE = { // campo de imagen -> campo hermano que lleva su texto alternativo
  'Image': 'Metadata Image SEO', 'Main Image': 'Metadescription Main Image SEO',
  'Image Cover': 'Metadata Imagen Cover', 'Image Page': 'Metadata Image Page',
  'Main Project Image': 'Metadata SEO Main Project Image', 'Step Image': 'Metadata Step Image',
  'Logo': 'Metadata', 'Cover': 'Metadata', 'Icon': '',
};
for (const f of fs.readdirSync(CMS)) {
  const col = f.replace(/\.csv$/, '');
  for (const [i, item] of load(col).entries()) {
    for (const [campo, valor] of Object.entries(item)) {
      if (!/^https?:\/\//.test(valor)) continue;
      for (const raw of valor.split(';')) {
        const url = decodeURI(raw.trim().replace(/[;,]$/, ''));
        if (!/^https?:\/\//.test(url)) continue;
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
  for (const m of html.matchAll(/https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"')\s]+/g)) {
    const url = decodeURIComponent(m[0].replace(/&quot;$/, ''));
    const prev = assets.get(url);
    if (!prev) assets.set(url, { url, alt: '', usos: [`html:${f}`] });
    else prev.usos.push(`html:${f}`);
  }
}

// nombre final: quita los hashes ENCADENADOS de Webflow ({nuevo}_{viejo}_nombre)
// y la doble codificación (%2520). Ambas vistas en migraciones anteriores.
function nombreFinal(url) {
  let n = decodeURIComponent(decodeURIComponent(url.split('/').pop().split('?')[0]));
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
