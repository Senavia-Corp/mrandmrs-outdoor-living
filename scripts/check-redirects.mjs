#!/usr/bin/env node
/**
 * PUERTA de la migracion de URLs (3-oct-2026) — `docs/seo/URL-MIGRATION-2026.md`.
 *
 *     npm run check:redirects
 *
 * Estatica, sobre `.vercel/output/static` + `vercel.json` + `public/sitemap.xml` (los tres, LO
 * QUE SE DESPLIEGA). No abre navegador ni pide red: todo lo que mide esta en disco.
 *
 * LO QUE EXIGE, y cada punto es una regresion real que podria colarse en silencio:
 *   1. las 76 URLs nuevas estan construidas (= 200 en Vercel);
 *   2. las 76 viejas NO estan construidas y tienen redirect permanente DIRECTO a su nueva;
 *   3. los 14 historicos siguen, permanentes, y apuntan a una pagina construida;
 *   4. NINGUN destino es a su vez un source (eso es una cadena A -> B -> C), y ningun source
 *      vuelve a si mismo por ningun camino (bucle); ningun source repetido;
 *   5. `vercel.json` coincide con la tabla (`build-redirects.mjs --check`);
 *   6. el sitemap: lleva las 76 nuevas, ninguna vieja ni ningun source de redirect, cada <loc>
 *      resuelve a un fichero construido, host `www`, sin duplicados; y cada <loc> coincide con
 *      la canonica de su pagina;
 *   7. ningun enlace interno del build apunta a una de las 76 viejas ni a ningun source de
 *      redirect salvo los 3 que el menu enlaza a proposito (MENU-PLAN.md), que se declaran;
 *   8. canonica y `og:url` (si hay) de cada pagina construida: absoluta, `www`, igual a su
 *      propia ruta, y no es un source de redirect;
 *   9. JSON-LD: ninguna URL vieja; cada `item` de la miga (`#miga`) resuelve a pagina construida;
 *  10. no vuelve a construirse nada bajo `/pool-builders/` ni `/country/`, ni un slug largo de
 *      los 14 de antes; `_source/routes.csv` no lleva ninguna vieja;
 *  11. normalizacion: rutas construidas en minuscula, sin `%20`, sin `//`, sin `.html` en hrefs.
 *
 * FUERA DE PRODUCCION (sin `PUBLIC_ES_PRODUCCION=1` al construir) no hay canonicas ni sitemap:
 * esos puntos se SALTAN y se dice en pantalla. Una puerta que no corrio no es una puerta verde.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { LEGACY, MIGRACIONES } from './lib/renombradas.mjs';
import { redirectsDeRuta } from './build-redirects.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }
const SITIO = process.env.PUBLIC_SITE_URL || 'https://www.mrandmrsoutdoorliving.com';
const HOST = new URL(SITIO).host;

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 10) => { xs.slice(0, n).forEach((x) => console.log(`       ${x}`)); if (xs.length > n) console.log(`       ... y ${xs.length - n} mas`); };

const ficheroDe = (ruta) => [path.join(ESTATICO, ruta + '.html'), path.join(ESTATICO, ruta, 'index.html'),
  ruta === '/' ? path.join(ESTATICO, 'index.html') : null]
  .find((c) => c && fs.existsSync(c) && fs.statSync(c).isFile());
const construida = (ruta) => Boolean(ficheroDe(ruta.split('?')[0].split('#')[0]));

const vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const deRuta = (vercel.redirects ?? []).filter((r) => !(Array.isArray(r.has) && r.has.some((h) => h?.type === 'host')));
const porSource = new Map(deRuta.map((r) => [r.source, r]));
const SOURCES = new Set(porSource.keys());
const VIEJAS = new Map(MIGRACIONES.map((m) => [m.old, m.new]));
const NUEVAS = new Set(MIGRACIONES.map((m) => m.new));

// ── 1 · las 76 nuevas, construidas ──────────────────────────────────────────
console.log('\n── 1. las 76 URLs nuevas responden (estan construidas)');
const nuevasSin = MIGRACIONES.filter((m) => !construida(m.new)).map((m) => m.new);
check(`${MIGRACIONES.length - nuevasSin.length}/${MIGRACIONES.length} nuevas construidas`, nuevasSin.length === 0);
lista(nuevasSin);
const porTipo = Object.entries(MIGRACIONES.reduce((a, m) => ((a[m.type] = (a[m.type] ?? 0) + 1), a), {}));
console.log(`       ${porTipo.map(([t, n]) => `${t}: ${n}`).join(' · ')}`);

// ── 2 · las 76 viejas: no construidas, con 308 directo ──────────────────────
console.log('\n── 2. las 76 URLs viejas: sin pagina y con redirect permanente directo a la nueva');
const viejasConstruidas = [...VIEJAS.keys()].filter(construida);
check('0 viejas construidas (una vieja con pagina seria contenido duplicado)', viejasConstruidas.length === 0);
lista(viejasConstruidas);
const sinRedirect = [...VIEJAS].filter(([o, n]) => { const r = porSource.get(o); return !r || r.destination !== n || r.permanent !== true; })
  .map(([o, n]) => `${o} -> ${porSource.get(o)?.destination ?? '(sin redirect)'} (esperado ${n})`);
check(`${VIEJAS.size - sinRedirect.length}/${VIEJAS.size} viejas con redirect permanente a su nueva exacta`, sinRedirect.length === 0);
lista(sinRedirect);

// ── 3 · los historicos ──────────────────────────────────────────────────────
console.log('\n── 3. los 14 redirects historicos siguen y llegan a una pagina');
const legacyMal = LEGACY.filter((l) => { const r = porSource.get(l.source); return !r || r.destination !== l.destination || r.permanent !== true || !construida(l.destination); })
  .map((l) => `${l.source} -> ${l.destination}`);
check(`${LEGACY.length - legacyMal.length}/${LEGACY.length} historicos permanentes y con destino construido`, legacyMal.length === 0);
lista(legacyMal);

// ── 4 · ni cadenas, ni bucles, ni sources repetidos ─────────────────────────
console.log('\n── 4. cadenas y bucles');
const cadenas = deRuta.filter((r) => SOURCES.has(r.destination)).map((r) => `${r.source} -> ${r.destination} -> ${porSource.get(r.destination).destination}`);
check('0 cadenas (ningun destino es a su vez un source)', cadenas.length === 0);
lista(cadenas);
const bucles = [];
for (const r of deRuta) {
  const vistos = new Set([r.source]); let d = r.destination; let pasos = 0;
  while (porSource.has(d) && pasos++ < 20) { if (vistos.has(d)) { bucles.push(r.source); break; } vistos.add(d); d = porSource.get(d).destination; }
}
check('0 bucles', bucles.length === 0);
lista(bucles);
const repetidos = deRuta.map((r) => r.source).filter((s, i, a) => a.indexOf(s) !== i);
check('0 sources repetidos', repetidos.length === 0);
lista(repetidos);
const destinosRotos = deRuta.filter((r) => !construida(r.destination)).map((r) => `${r.source} -> ${r.destination}`);
check(`${deRuta.length} redirects de ruta, todos a una pagina construida`, destinosRotos.length === 0);
lista(destinosRotos);
const temporales = deRuta.filter((r) => r.permanent !== true).map((r) => r.source);
check('todos permanentes (308)', temporales.length === 0);
lista(temporales);

// ── 5 · vercel.json en sincronia con la tabla ───────────────────────────────
console.log('\n── 5. vercel.json = tabla');
const esperados = redirectsDeRuta();
const mismos = JSON.stringify(esperados) === JSON.stringify(deRuta.map(({ source, destination, permanent }) => ({ source, destination, permanent })));
check(`vercel.json lleva exactamente los ${esperados.length} redirects de ruta de seo-url-migrations.json, en orden`, mismos,
  mismos ? '' : 'corre: npm run redirects');

// ── 6 · sitemap ─────────────────────────────────────────────────────────────
console.log('\n── 6. sitemap');
const sitemapTxt = fs.readFileSync(path.join(ESTATICO, 'sitemap.xml'), 'utf8');
const locs = [...sitemapTxt.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const PROD = locs.length > 0;
const canonicaDe = (f) => new JSDOM(fs.readFileSync(f, 'utf8')).window.document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null;
if (!PROD) {
  console.log('  SALTADA el sitemap esta vacio (build sin PUBLIC_ES_PRODUCCION=1): los puntos 6 y 8 NO se han medido');
} else {
  const rutasLoc = locs.map((u) => new URL(u).pathname);
  const hostsMal = locs.filter((u) => new URL(u).host !== HOST);
  check(`${locs.length} <loc>, todas en ${HOST}`, hostsMal.length === 0); lista(hostsMal);
  const dup = rutasLoc.filter((r, i, a) => a.indexOf(r) !== i);
  check('0 <loc> duplicadas', dup.length === 0); lista(dup);
  const faltanNuevas = [...NUEVAS].filter((n) => !rutasLoc.includes(n));
  check(`${NUEVAS.size - faltanNuevas.length}/${NUEVAS.size} nuevas en el sitemap`, faltanNuevas.length === 0); lista(faltanNuevas);
  const viejasEnSitemap = rutasLoc.filter((r) => VIEJAS.has(r) || SOURCES.has(r));
  check('0 viejas / sources de redirect en el sitemap', viejasEnSitemap.length === 0); lista(viejasEnSitemap);
  const locRotas = rutasLoc.filter((r) => !construida(r));
  check('todas las <loc> resuelven a una pagina construida', locRotas.length === 0); lista(locRotas);
  const locCanon = rutasLoc.filter((r) => { const f = ficheroDe(r); return f && canonicaDe(f) !== `${SITIO}${r === '/' ? '' : r}` && canonicaDe(f) !== `${SITIO}${r}`; });
  check('cada <loc> es la canonica de su propia pagina', locCanon.length === 0); lista(locCanon);
  const barraFinal = locs.filter((u) => u !== SITIO && u.endsWith('/'));
  check('0 <loc> con barra final (trailingSlash: never)', barraFinal.length === 0); lista(barraFinal);
}

// ── 7 · enlaces internos: ni a las viejas ni a sources de redirect ──────────
console.log('\n── 7. enlaces internos del build');
/** Los 3 que el menu enlaza a proposito: fichas comerciales que ya daban 404 en Webflow; el
 *  redirect a /industry-solutions es la decision de MENU-PLAN.md. Se declaran, no se perdonan
 *  por prefijo: cualquier otro source enlazado desde dentro es rojo. */
const ENLAZADOS_A_PROPOSITO = new Set([
  '/commercial-services/commercial-pool-construction-north-south-florida',
  '/commercial-services/commercial-pool-contractors-north-south-florida',
  '/commercial-services/commercial-pool-renovations-north-south-florida',
]);
const htmls = [];
(function barrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) barrer(f); else if (e.name.endsWith('.html')) htmls.push(f);
  }
}(ESTATICO));
const aViejas = new Set(); const aSources = new Set(); const conHtml = new Set();
const rutaDe = (f) => '/' + path.relative(ESTATICO, f).replace(/\.html$/, '').replace(/(^|\/)index$/, '');
const local = (h) => (h.startsWith(SITIO) ? h.slice(SITIO.length) || '/' : h).split('?')[0].split('#')[0];
for (const f of htmls) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/href="([^"]+)"/g)) {
    const h = m[1]; if (!(h.startsWith('/') || h.startsWith(SITIO)) || h.startsWith('//')) continue;
    const r = local(h);
    if (/\.html$/.test(r)) conHtml.add(`${rutaDe(f)} -> ${h}`);
    if (VIEJAS.has(r)) aViejas.add(`${rutaDe(f)} -> ${r}`);
    else if (SOURCES.has(r) && !ENLAZADOS_A_PROPOSITO.has(r)) aSources.add(`${rutaDe(f)} -> ${r}`);
  }
}
check(`${htmls.length} paginas: 0 enlaces internos a las 76 URLs viejas`, aViejas.size === 0, `${aViejas.size}`); lista([...aViejas]);
check('0 enlaces internos a otros sources de redirect (salvo los 3 declarados del menu)', aSources.size === 0, `${aSources.size}`); lista([...aSources]);
check('0 enlaces a .html', conHtml.size === 0); lista([...conHtml]);

// ── 8 · canonicas y og:url ──────────────────────────────────────────────────
console.log('\n── 8. canonicas y og:url');
if (!PROD) {
  console.log('  SALTADA sin PUBLIC_ES_PRODUCCION=1 no se emiten canonicas: NO medido');
} else {
  const canonMal = []; const ogMal = [];
  for (const f of htmls) {
    const ruta = rutaDe(f);
    if (ruta.startsWith('/lab/') || ruta.startsWith('/_')) continue;
    const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
    if (d.querySelector('meta[name=robots][content*="noindex"]')) continue;   // /thank-you, a proposito
    const can = d.querySelector('link[rel=canonical]')?.getAttribute('href');
    const esperada = `${SITIO}${ruta === '/' ? '' : ruta}`;
    if (!can) canonMal.push(`${ruta}: sin canonica`);
    else if (can !== esperada && can !== `${SITIO}${ruta}`) canonMal.push(`${ruta}: canonica ${can}`);
    else if (SOURCES.has(local(can))) canonMal.push(`${ruta}: canonica a un redirect`);
    const og = d.querySelector('meta[property="og:url"]')?.getAttribute('content');
    if (og && og !== can) ogMal.push(`${ruta}: og:url ${og} != canonica ${can}`);
  }
  check('canonica presente, absoluta, en www, igual a su ruta y nunca a un redirect', canonMal.length === 0, `${canonMal.length}`); lista(canonMal);
  check('og:url (donde existe) = canonica', ogMal.length === 0); lista(ogMal);
}

// ── 9 · JSON-LD ─────────────────────────────────────────────────────────────
console.log('\n── 9. datos estructurados');
const ldViejas = new Set(); const migaRota = new Set();
/* Ruta vieja EXACTA: precedida de nada, de un delimitador o de un host, y nunca como tramo de otra
 * cosa (`/images/pool-builders/alachua-florida/...` es un fichero, no la URL vieja). */
const reViejas = new RegExp('(?:^|[^\\w/.-])(?:https?://[^/"\x27\\s]+)?(' + [...VIEJAS.keys()].map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w/-])');
for (const f of htmls) {
  const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  for (const sc of d.querySelectorAll('script[type="application/ld+json"]')) {
    if (reViejas.test(sc.textContent)) ldViejas.add(rutaDe(f));
    let b; try { b = JSON.parse(sc.textContent); } catch { continue; }
    if (b?.['@type'] === 'BreadcrumbList') {
      for (const it of b.itemListElement ?? []) {
        if (!it.item) continue;
        const r = local(String(it.item));
        if (!it.item.startsWith(SITIO) || SOURCES.has(r) || !construida(r)) migaRota.add(`${rutaDe(f)}: ${it.name} -> ${it.item}`);
      }
    }
  }
}
check('0 paginas con URLs viejas en application/ld+json', ldViejas.size === 0, `${ldViejas.size}`); lista([...ldViejas]);
check('cada item de la miga (#miga) resuelve a una pagina construida en www', migaRota.size === 0, `${migaRota.size}`); lista([...migaRota]);

// ── 10 · que no vuelvan ─────────────────────────────────────────────────────
console.log('\n── 10. regresiones');
const todas = htmls.map(rutaDe);
const resucitadas = todas.filter((r) => r.startsWith('/pool-builders/') || r.startsWith('/country/')
  || /^\/services\/[a-z-]*(in-north-south-florida|north-south-florida-(homes|pools))$/.test(r));
check('0 paginas bajo /pool-builders/, /country/ o con los slugs largos de /services/', resucitadas.length === 0); lista(resucitadas);
const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const csvViejas = [...VIEJAS.keys()].filter((v) => csv.includes(`"${v}"`));
check('_source/routes.csv no lleva ninguna de las 76 viejas', csvViejas.length === 0); lista(csvViejas);
const csvNuevas = [...NUEVAS].filter((n) => !csv.includes(`"${n}"`));
check('_source/routes.csv lleva las 76 nuevas', csvNuevas.length === 0); lista(csvNuevas);

// ── 11 · normalizacion ──────────────────────────────────────────────────────
console.log('\n── 11. normalizacion de rutas');
const raras = todas.filter((r) => r !== r.toLowerCase() || /%20|\/\/|\s/.test(r) || /florida$/.test(r.split('/').pop() ?? '') && NUEVAS.has(r));
check('rutas construidas en minuscula, sin %20 ni // ni espacios', raras.length === 0); lista(raras);

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
