#!/usr/bin/env node
/**
 * PUERTA de la identidad del negocio — ningun numero de licencia fuera de la fuente unica.
 *
 *     npm run check:identidad
 *
 * NACE DE LA SEO-REMEDIACION DEL 4-OCT-2026. Los numeros de licencia vivian escritos a mano en
 * ~20 ficheros con tres variantes de linea, y `negocio.mjs` solo conocia dos de los tres que
 * publica el pie. La autoridad es ahora `src/lib/identidad.mjs`; esta puerta mide el HTML servido
 * (`.vercel/output/static`, nunca dev) y exige:
 *   1 · ningun numero con forma de licencia de Florida que no este en `LICENCIAS`;
 *   2 · el `#negocio` del JSON-LD lleva EXACTAMENTE los numeros de `LICENCIAS`;
 *   3 · el pie (en toda pagina que lo lleve) publica los tres.
 * Y lo dice por pantalla: que numero sale en cuantas paginas.
 *
 * FALLA CERRADA: sin build, o con menos de 150 paginas, es ROJO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { NUMEROS, RE_LICENCIA } from '../src/lib/identidad.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('✗ no hay build en .vercel/output/static'); process.exit(1); }

const html = [];
(function recorre(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) recorre(p); else if (e.name.endsWith('.html')) html.push(p);
  }
})(ESTATICO);

const fallos = [];
const cuenta = new Map();
let conPie = 0;
for (const f of html) {
  const t = fs.readFileSync(f, 'utf8');
  const ruta = '/' + path.relative(ESTATICO, f).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
  const vistos = new Set(t.match(RE_LICENCIA) ?? []);
  for (const n of vistos) {
    cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
    if (!NUMEROS.includes(n)) fallos.push(`${ruta}: publica ${n}, que no esta en src/lib/identidad.mjs (regla 1)`);
  }
  for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let b; try { b = JSON.parse(m[1]); } catch { continue; }
    if (!String(b['@id'] ?? '').endsWith('/#negocio')) continue;
    const ids = (b.identifier ?? []).map((x) => x.value).sort().join(',');
    if (ids !== [...NUMEROS].sort().join(',')) fallos.push(`${ruta}: #negocio publica [${ids}] (regla 2)`);
  }
  const pie = t.match(/<section class="footer[\s\S]*$/)?.[0];
  if (pie) {
    conPie++;
    for (const n of NUMEROS) if (!pie.includes(n)) fallos.push(`${ruta}: el pie no publica ${n} (regla 3)`);
  }
}
if (html.length < 150) fallos.push(`solo ${html.length} paginas en el build; se esperaban 150 o mas`);

console.log(`check:identidad — ${html.length} paginas, ${conPie} con pie`);
for (const [n, c] of [...cuenta].sort()) console.log(`  ${NUMEROS.includes(n) ? 'ok  ' : 'ROJO'} ${n} en ${c} pagina(s)`);
if (fallos.length) {
  console.error(`\n✗ PUERTA ROJA — ${fallos.length} fallo(s):`);
  for (const m of fallos.slice(0, 30)) console.error('  ' + m);
  process.exit(1);
}
console.log('PUERTA VERDE');
