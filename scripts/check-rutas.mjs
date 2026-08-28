#!/usr/bin/env node
/**
 * PUERTA de la Fase 6 — las 115 rutas responden y NO existe ninguna extra.
 *
 *     npm run check:rutas
 *
 * Las dos mitades importan lo mismo:
 *   · que estén las 115 -> una que falte es una página perdida;
 *   · que no haya NINGUNA de más -> una ruta que el origen no tiene se indexa, se enlaza y
 *     hay que mantenerla. Aquí ya hubo dos candidatas (la vista de diseño de los widgets y el
 *     fixture del cascarón), y por eso el fixture acabó siendo una ruta dinámica que solo se
 *     construye con MM_FIXTURES=1: confiar en acordarse de borrar un fichero no es un plan.
 *
 * Se mide sobre `.vercel/output/static`, que es LO QUE SE DESPLIEGA, no sobre `src/pages`.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));

/** Ficheros de `public/` que NO son páginas: no cuentan como ruta. */
const NO_SON_PAGINAS = /^\/(images|videos|brochures|fonts|_astro|favicon|robots\.txt|sitemap)/;

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 8) => xs.slice(0, n).forEach((x) => console.log(`       ${x}`))
  || (xs.length > n && console.log(`       ... y ${xs.length - n} mas`));

// ── 1 · están las 115 ───────────────────────────────────────────────────────
const resuelve = (ruta) => [path.join(ESTATICO, ruta), path.join(ESTATICO, ruta + '.html'),
  path.join(ESTATICO, ruta, 'index.html')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());

const faltan = RUTAS.filter((r) => !resuelve(r));
check(`${RUTAS.length - faltan.length}/${RUTAS.length} rutas del sitio construidas`, faltan.length === 0,
  `${faltan.length} sin construir`);
lista(faltan);

// ── 2 · ninguna de más ──────────────────────────────────────────────────────
const enDisco = [];
(function barrer(d, base = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const rel = `${base}/${e.name}`;
    if (e.isDirectory()) barrer(path.join(d, e.name), rel);
    else if (e.name === 'index.html') enDisco.push(base || '/');
    else if (e.name.endsWith('.html')) enDisco.push(rel.replace(/\.html$/, ''));
  }
}(ESTATICO));

const esperadas = new Set(RUTAS);
const extras = enDisco.filter((r) => !esperadas.has(r) && !NO_SON_PAGINAS.test(r));
check(`${enDisco.length} paginas en el build, 0 de mas`, extras.length === 0, `${extras.length} extra`);
lista(extras);

// ── 3 · el estimador, que no lo genera Astro sino public/ ───────────────────
const est = resuelve('/pool-investment-estimator');
check('el estimador se sirve', Boolean(est), est ? '' : 'falta public/pool-investment-estimator/index.html');

// ── 4 · cero referencias a Webflow en lo desplegado ─────────────────────────
let refs = 0; const conRefs = [];
(function barrer2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { barrer2(f); continue; }
    if (!/\.(html|css|js|json|xml|txt)$/.test(e.name)) continue;
    const t = fs.readFileSync(f, 'utf8');
    const n = (t.match(/website-files\.com|uploads-ssl\.webflow\.com|wf-app-prod|elfsightcdn|d3e54v103j8qbb/g) ?? []).length;
    if (n) { refs += n; conRefs.push(`${path.relative(ESTATICO, f)} (${n})`); }
  }
}(ESTATICO));
check('0 referencias a Webflow / Elfsight en lo desplegado', refs === 0, `${refs} en ${conRefs.length} ficheros`);
lista(conRefs);

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
