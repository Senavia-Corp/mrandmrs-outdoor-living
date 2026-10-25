#!/usr/bin/env node
/**
 * PUERTA · check-publicar — los puntos tecnicos de salida del encargo PUBLICAR, sobre el build.
 *
 *     npm run check:publicar                         todo el build (.vercel/output)
 *     node scripts/check-publicar.mjs /blogs/        acotada por subcadena de ruta
 *     node scripts/check-publicar.mjs '=/'           la home, exacta
 *     node scripts/check-publicar.mjs --build <dir>  otro build (carpeta con static/ y config.json)
 *     node scripts/check-publicar.mjs --sin-excepciones   ignora check-publicar-excepciones.json (calibracion)
 *
 * Estatica y sin navegador: JSDOM sobre `static/`, ~20 s en las 233. Sale con 1 si hay fallos y
 * lista `punto · ruta · detalle`. El filtro acota lo que se LISTA; el sitemap, los duplicados y el
 * enlazado se calculan siempre sobre el build entero, porque solo tienen sentido asi.
 *
 * Los diez puntos (prompt §2.2.2, medidos en D1 el 25-oct-2026 con este mismo metodo):
 *   1  canonica a si misma en www; `noindex` solo en /thank-you
 *   2  sitemap = construidas − /thank-you − redirigidas (config.json); cada <loc> existe; robots.txt
 *   3  un solo <h1> y sin saltos de nivel (documento entero)
 *   4  <title> ≤ 60 y description ≤ 155, uno de cada, unicos en todo el build
 *   5  todo JSON-LD parsea; cada pregunta de un FAQPage esta en el texto de <main>
 *   6  ningun <a> de <main> con nombre generico sin aria-label que nombre el destino
 *   7  toda <img> de <main> con alt, width y height; alt="" solo donde se declara; hero precargado y sin lazy
 *   8  toda ruta a ≤ 3 clics de la home y con ≥ 2 entrantes distintos; las ciudades de piscina enlazan a su ficha
 *   9  casos nombrados: /brochures, los dos estimadores, los /project/*, la ficha de piscina
 *  10  P-9 y P-10: ni el telefono 954 ni «soffit» en ningun HTML
 *
 * Las excepciones viven en `check-publicar-excepciones.json` y solo las anade el director: este
 * script no decide ninguna. Quien construye no afloja la puerta que lo juzga (prompt §2.4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const HOST = 'https://www.mrandmrsoutdoorliving.com';
const argv = process.argv.slice(2);
const opcion = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const BUILD = path.resolve(opcion('--build') ?? path.join(RAIZ, '.vercel/output'));
const ESTATICO = path.join(BUILD, 'static');
const SIN_EXCEPCIONES = argv.includes('--sin-excepciones');
const filtro = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--build');
const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));

if (!fs.existsSync(ESTATICO) || !fs.existsSync(path.join(BUILD, 'config.json'))) {
  console.error(`\n  ROJO no hay build en ${BUILD} (hacen falta static/ y config.json). \`npm run build\` primero.\n`);
  process.exit(1);
}
const VACIAS = { hero_sin_imagen: { selector: null }, alt_vacio_permitido: { selectores: [] }, sin_img_en_main: { rutas: [] }, fuera_del_enlazado: { rutas: [] }, titulo_largo: { rutas: [] }, descripcion_larga: { rutas: [] } };
const EXC = SIN_EXCEPCIONES ? VACIAS : JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/check-publicar-excepciones.json'), 'utf8'));

// ── el build ────────────────────────────────────────────────────────────────────────────────
const ficheros = [];
(function barre(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) barre(p); else if (f.name.endsWith('.html')) ficheros.push(p);
  }
}(ESTATICO));
const rutaDe = (f) => (f.replace(ESTATICO, '').replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/');
const normTxt = (s) => s.replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const GENERICOS = /^(see more|read more|click here|learn more|more|here|view more)$/;
const limpiaNombre = (s) => normTxt(s).replace(/[→←›»>‹«<\-–—.…:!]/g, ' ').replace(/\s+/g, ' ').trim();
const normHref = (h) => { h = h.split('#')[0].split('?')[0]; if (!h.startsWith('/') || h.startsWith('//')) return null; return h.replace(/\/+$/, '') || '/'; };
const recorta = (s, n) => s.replace(/\s+/g, ' ').trim().slice(0, n);

const R = {};
for (const f of ficheros) {
  const ruta = rutaDe(f);
  const html = fs.readFileSync(f, 'utf8');
  const d = new JSDOM(html).window.document;
  const head = d.head, main = d.querySelector('main');
  const x = { ruta, html };
  x.canonical = [...head.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute('href'));
  x.robots = [...head.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content') || '');
  x.title = recorta(d.querySelector('title')?.textContent || '', 1e4);
  x.titles = d.querySelectorAll('title').length;
  const descs = [...head.querySelectorAll('meta[name="description"]')].map((m) => m.getAttribute('content') || '');
  x.descripcion = descs[0] ?? null; x.descripciones = descs.length;
  x.h1 = [...d.querySelectorAll('h1')].map((h) => recorta(h.textContent, 80));
  x.saltos = []; let prev = 0;
  for (const h of d.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const n = +h.tagName[1];
    if (prev && n > prev + 1) x.saltos.push(`h${prev}→h${n} «${recorta(h.textContent, 50)}»`);
    prev = n;
  }
  x.tieneMain = !!main;
  const mainTxt = normTxt((main ?? d.body).textContent);
  x.ld = []; x.faqFaltan = []; x.faqPreguntas = 0;
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    let obj; try { obj = JSON.parse(s.textContent); } catch (e) { x.ld.push({ ok: false, error: e.message.slice(0, 80) }); continue; }
    const nodos = Array.isArray(obj) ? obj : (obj['@graph'] ? obj['@graph'] : [obj]);
    x.ld.push({ ok: true });
    for (const n of nodos) if (n['@type'] === 'FAQPage') {
      for (const q of n.mainEntity || []) { const nombre = normTxt(q.name || ''); x.faqPreguntas++; if (!nombre || !mainTxt.includes(nombre)) x.faqFaltan.push(q.name); }
    }
  }
  x.genericos = []; x.img = { total: 0, sinAlt: [], altVacio: [], sinDim: [] }; x.hero = null; x.enlacesMain = [];
  if (main) {
    for (const a of main.querySelectorAll('a')) {
      const aria = a.getAttribute('aria-label');
      const visible = limpiaNombre(a.textContent + ' ' + [...a.querySelectorAll('img')].map((i) => i.getAttribute('alt') || '').join(' '));
      if (GENERICOS.test(visible) && !(aria && aria.trim())) x.genericos.push({ txt: recorta(a.textContent, 40), href: a.getAttribute('href') });
      else if (GENERICOS.test(visible) && limpiaNombre(aria) === visible) x.genericos.push({ txt: recorta(a.textContent, 40), href: a.getAttribute('href'), nota: 'aria-label igual de generico' });
    }
    const imgs = [...main.querySelectorAll('img')];
    x.img.total = imgs.length;
    for (const i of imgs) {
      const src = (i.getAttribute('src') || i.getAttribute('srcset') || '').split(/[ ,]/)[0];
      if (!i.hasAttribute('alt')) x.img.sinAlt.push(src);
      else if (i.getAttribute('alt').trim() === '' && !EXC.alt_vacio_permitido.selectores.some((sel) => i.matches(sel))) x.img.altVacio.push(src);
      if (!i.getAttribute('width') || !i.getAttribute('height')) x.img.sinDim.push(src);
    }
    const sec = main.querySelector('section');
    const selHero = EXC.hero_sin_imagen.selector;
    const heroDeTexto = !!(sec && selHero && (sec.matches(selHero) || sec.closest(selHero) || sec.querySelector(selHero)));
    const hero = sec?.querySelector('img') ?? null;
    if (heroDeTexto) x.hero = { deTexto: true };
    else if (hero) {
      const src = hero.getAttribute('src') || '';
      const stem = path.basename(src).replace(/(-mm\d+|-lcp\d+|-\d+)?\.(webp|avif|jpe?g|png)$/, '');
      const preloads = [...head.querySelectorAll('link[rel="preload"][as="image"]')].map((l) => (l.getAttribute('href') || '') + ' ' + (l.getAttribute('imagesrcset') || ''));
      x.hero = { src, lazy: hero.getAttribute('loading') === 'lazy', preloads: preloads.length, preloadCasa: preloads.some((p) => stem && p.includes(stem)) };
    } else if (imgs.length) x.hero = { fueraDeSection: true };
    x.enlacesMain = [...main.querySelectorAll('a[href]')].map((a) => normHref(a.getAttribute('href'))).filter(Boolean);
  }
  x.telefono = /954[ .)\-]*913[ .\-]*7112/.test(html);
  x.soffit = /soffit/i.test(html);
  R[ruta] = x;
}
const rutas = Object.keys(R).sort();

// ── fallos ──────────────────────────────────────────────────────────────────────────────────
const F = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), []]));
const falla = (p, r, d) => F[p].push([r, d]);

// 1
for (const r of rutas) {
  const x = R[r], esperado = HOST + (r === '/' ? '/' : r);
  if (x.canonical.length !== 1 || ![esperado, esperado.replace(/\/$/, '')].includes(x.canonical[0])) falla('1', r, `canonical=${JSON.stringify(x.canonical)}`);
  const noindex = x.robots.some((c) => /noindex/.test(c));
  if (r === '/thank-you' && !noindex) falla('1', r, 'sin noindex');
  if (r !== '/thank-you' && noindex) falla('1', r, `noindex indebido: ${JSON.stringify(x.robots)}`);
}
// 2
const config = JSON.parse(fs.readFileSync(path.join(BUILD, 'config.json'), 'utf8'));
const redirSrc = new Set((config.routes || []).filter((x) => [301, 302, 307, 308].includes(x.status)).map((x) => x.src.replace(/^\^/, '').replace(/\$$/, '').replace(/\\/g, '')));
const esperadas = new Set(rutas.filter((r) => r !== '/thank-you' && !redirSrc.has(r)));
const sitemapTxt = fs.existsSync(path.join(ESTATICO, 'sitemap.xml')) ? fs.readFileSync(path.join(ESTATICO, 'sitemap.xml'), 'utf8') : '';
const locs = [...sitemapTxt.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(HOST, '').replace(/\/$/, '') || '/');
const enSitemap = new Set(locs);
for (const s of [...enSitemap].filter((s) => !esperadas.has(s)).sort()) falla('2', s, 'en sitemap pero no esperada' + (R[s] ? '' : ' (NO existe en el build)'));
for (const s of [...esperadas].filter((s) => !enSitemap.has(s)).sort()) falla('2', s, 'construida y no esta en el sitemap');
if (locs.length !== enSitemap.size) falla('2', '/sitemap.xml', `loc duplicados: ${locs.length - enSitemap.size}`);
if (!sitemapTxt) falla('2', '/sitemap.xml', 'no existe');
const robots = fs.existsSync(path.join(ESTATICO, 'robots.txt')) ? fs.readFileSync(path.join(ESTATICO, 'robots.txt'), 'utf8') : '';
if (!/^Allow: \/\s*$/m.test(robots)) falla('2', '/robots.txt', 'sin Allow: /');
if (!new RegExp(`^Sitemap: ${HOST.replace(/[.]/g, '\\.')}/sitemap\\.xml`, 'm').test(robots)) falla('2', '/robots.txt', 'sin linea Sitemap:');
// 3
for (const r of rutas) {
  const x = R[r];
  if (x.h1.length !== 1) falla('3', r, `${x.h1.length} h1: ${JSON.stringify(x.h1)}`);
  if (x.saltos.length) falla('3', r, 'saltos (documento): ' + x.saltos.slice(0, 3).join('; ') + (x.saltos.length > 3 ? ` (+${x.saltos.length - 3})` : ''));
}
// 4
const porT = new Map(), porD = new Map();
for (const r of rutas) {
  const x = R[r];
  porT.set(x.title, [...(porT.get(x.title) ?? []), r]); porD.set(x.descripcion ?? '', [...(porD.get(x.descripcion ?? '') ?? []), r]);
  if (x.titles !== 1) falla('4', r, `${x.titles} <title>`);
  if (x.descripciones !== 1) falla('4', r, `${x.descripciones} meta description`);
  if (!x.title) falla('4', r, 'title vacio');
  else if (x.title.length > 60 && !EXC.titulo_largo.rutas.includes(r)) falla('4', r, `title ${x.title.length} car.: «${x.title}»`);
  if (x.descripcion === null) falla('4', r, 'sin description');
  else if (x.descripcion.length > 155 && !EXC.descripcion_larga.rutas.includes(r)) falla('4', r, `description ${x.descripcion.length} car.`);
}
for (const [t, rs] of porT) if (rs.length > 1) falla('4', rs[0], `title duplicado en ${rs.length}: «${t.slice(0, 60)}» → ${JSON.stringify(rs.slice(1, 4))}`);
for (const [t, rs] of porD) if (rs.length > 1 && t) falla('4', rs[0], `description duplicada en ${rs.length}: «${t.slice(0, 60)}…» → ${JSON.stringify(rs.slice(1, 4))}`);
// 5
for (const r of rutas) {
  const x = R[r];
  for (const b of x.ld) if (!b.ok) falla('5', r, 'JSON-LD no parsea: ' + b.error);
  if (x.faqFaltan.length) falla('5', r, `FAQ: ${x.faqFaltan.length} de ${x.faqPreguntas} preguntas sin texto visible: ${JSON.stringify(x.faqFaltan.slice(0, 2).map((q) => String(q).slice(0, 50)))}`);
}
// 6
for (const r of rutas) {
  const g = R[r].genericos;
  if (g.length) falla('6', r, `${g.length} enlaces genericos: ` + g.slice(0, 3).map((e) => `«${e.txt}»→${e.href}` + (e.nota ? ' [aria igual]' : '')).join('; '));
}
// 7
let d1_7 = 0, altVacio7 = 0;
for (const r of rutas) {
  const x = R[r];
  if (!x.tieneMain) { falla('7', r, 'sin <main>'); d1_7++; continue; }
  const det = [], d1 = [];
  if (x.img.sinAlt.length) d1.push(`${x.img.sinAlt.length} img sin alt (${x.img.sinAlt[0]})`);
  if (x.img.sinDim.length) d1.push(`${x.img.sinDim.length} img sin width/height (${x.img.sinDim[0]})`);
  if (x.img.altVacio.length) { det.push(`${x.img.altVacio.length} img con alt="" fuera de lo declarado (${x.img.altVacio[0]})`); altVacio7++; }
  const h = x.hero;
  if (h?.deTexto) { /* hero de texto declarado: preload y lazy no aplican */ }
  else if (h?.src !== undefined) {
    if (h.lazy) d1.push('hero loading=lazy');
    if (!h.preloads) d1.push('hero sin <link rel=preload as=image>');
    else if (!h.preloadCasa) d1.push(`preload no casa con el hero (${h.src.split('/').pop()})`);
  } else if (h?.fueraDeSection) d1.push('la primera <section> de <main> no tiene <img> y no es un hero de texto declarado');
  else if (!x.img.total && !EXC.sin_img_en_main.rutas.includes(r)) d1.push('sin <img> en main');
  if (d1.length) d1_7++;
  const todo = [...d1, ...det];
  if (todo.length) falla('7', r, todo.join('; '));
}
// 8 — el mismo mapa que enlazado.py: solo <a href> del HTML servido, sin JS
const sale = {}, entra = {};
for (const r of rutas) {
  sale[r] = new Set();
  for (const m of R[r].html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) { const n = normHref(m[1]); if (n && R[n] && n !== r) sale[r].add(n); }
}
for (const r of rutas) for (const d of sale[r]) (entra[d] ??= new Set()).add(r);
const prof = { '/': 0 }; const cola = ['/'];
while (cola.length) { const r = cola.shift(); for (const d of sale[r] ?? []) if (!(d in prof)) { prof[d] = prof[r] + 1; cola.push(d); } }
for (const r of rutas) {
  if (EXC.fuera_del_enlazado.rutas.includes(r)) continue;
  const p = prof[r];
  if (p === undefined) falla('8', r, 'a ∞ (sin camino) clics de la home'); else if (p > 3) falla('8', r, `a ${p} clics de la home`);
  const n = entra[r]?.size ?? 0;
  if (n < 2) falla('8', r, `${n} enlaces entrantes distintos`);
}
const ciudadesPiscina = rutas.filter((r) => /^\/services\/pool-builders\/[^/]+-fl$/.test(r) && !r.endsWith('-county-fl'));
for (const c of ciudadesPiscina) if (!R[c].enlacesMain.includes('/services/pool-builders')) falla('8', c, 'no enlaza a /services/pool-builders desde <main>');
// 9
const br = R['/brochures'];
if (!br) falla('9', '/brochures', 'no existe en el build');
else { if (!br.descripcion) falla('9', '/brochures', 'sin description'); if (!br.ld.length) falla('9', '/brochures', 'sin JSON-LD'); }
for (const r of ['/pool-cost-estimator', '/pool-investment-estimator']) {
  if (!R[r]) falla('9', r, 'no existe en el build'); else if (R[r].h1.length !== 1) falla('9', r, `h1: ${JSON.stringify(R[r].h1)}`);
}
for (const r of rutas.filter((r) => r.startsWith('/project/'))) {
  const oks = R[r].ld.map((b) => b.ok);
  if (!oks.length || !oks.every(Boolean)) falla('9', r, `JSON-LD: ${JSON.stringify(oks)}`);
}
const pb = R['/services/pool-builders'];
if (!pb) falla('9', '/services/pool-builders', 'no existe en el build');
else if (!/pool builders? near me/i.test(`${pb.title} ${pb.descripcion ?? ''}`)) falla('9', '/services/pool-builders', 'title/description sin «pool builders near me»');
// 10
let tel = 0, sof = 0;
for (const r of rutas) {
  if (R[r].telefono) { tel++; falla('10', r, 'telefono 954 en el HTML (P-9)'); }
  if (R[r].soffit) { sof++; falla('10', r, '«soffit» en el HTML (P-10)'); }
}

// ── salida ──────────────────────────────────────────────────────────────────────────────────
const NOMBRE = { 1: 'canonica / noindex', 2: 'sitemap + robots', 3: 'h1 unico y saltos', 4: 'title/description unicos y cortos', 5: 'JSON-LD parsea + FAQ visible', 6: 'enlaces genericos sin aria-label', 7: 'img alt/width/height + hero', 8: 'enlazado', 9: 'casos nombrados', 10: 'P-9 / P-10' };
let total = 0;
console.log(`\ncheck-publicar · ${BUILD.replace(RAIZ + '/', '')} · ${rutas.length} rutas` + (filtro.length ? ` · filtro ${JSON.stringify(filtro)}` : '') + (SIN_EXCEPCIONES ? ' · SIN EXCEPCIONES' : '') + '\n');
for (const p of Object.keys(F)) {
  const vistos = F[p].filter(([r]) => casa(r));
  total += vistos.length;
  let nota = '';
  if (p === '2') nota = ` (esperadas ${esperadas.size} = ${rutas.length} rutas − /thank-you − ${[...redirSrc].filter((s) => R[s]).length} redirigidas construidas · en sitemap ${enSitemap.size})`;
  if (p === '7') nota = ` (rutas con fallo de medidas/alt ausente/hero/sin img: ${d1_7} · con alt="" fuera de lo declarado: ${altVacio7})`;
  if (p === '10') nota = ` (telefono 954: ${tel} rutas · «soffit»: ${sof} rutas)`;
  console.log(`  ${vistos.length ? '🔴' : '✅'} ${p.padStart(2)} ${NOMBRE[p]}: ${vistos.length} fallo(s)${nota}`);
  for (const [r, d] of vistos) console.log(`       ${p} · ${r} · ${d}`);
}
console.log(total ? `\n🔴 check-publicar: ${total} fallo(s)\n` : '\n✅ check-publicar: 0 fallos\n');
process.exit(total ? 1 : 0);
