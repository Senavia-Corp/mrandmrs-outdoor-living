#!/usr/bin/env node
/**
 * PUERTA · similitud-ciudades — diferenciacion local entre paginas de ciudad del mismo servicio.
 *
 *     npm run check:similitud                                   los 7 servicios y los 9 condados
 *     node scripts/similitud-ciudades.mjs --servicio pool-builders
 *     node scripts/similitud-ciudades.mjs --servicio condados --umbral 60
 *     node scripts/similitud-ciudades.mjs --suelo 60            suelo plano (calibracion); sin el, el de D-250
 *     node scripts/similitud-ciudades.mjs --build <dir> --volcar <fichero.json> --matriz
 *
 * Metodo congelado (D-250, medido en D1 el 25-oct-2026 con este mismo procedimiento):
 *   1. Texto: `innerText` de <main> con todos sus <details> abiertos, en Chromium headless (1280x900),
 *      sirviendo el build en local; red externa, imagenes, fuentes y media abortadas.
 *   2. Normalizacion: minusculas; apostrofos fuera; todo lo que no sea [a-z0-9] pasa a espacio.
 *   3. Toponimos → «X»: la lista de `similitud-toponimos.json` (congelada; de mas larga a mas corta,
 *      con limite de palabra). Se lee ese fichero y no el modulo vivo, para que anadir datos a una
 *      ciudad no enmascare mas palabras.
 *   4. Shingles de 5 palabras consecutivas (conjunto).
 *   5. Cascaron del grupo = shingles presentes en ≥ 50 % de sus paginas. Propio = shingles − cascaron.
 *      Palabra propia = palabra cuyos shingles (los que la contienen) son todos propios.
 *   6. Similitud propia del par = Jaccard sobre shingles propios × 100 (los dos vacios → 100 %).
 *   7. Puerta: ≤ umbral (60) en todo par del grupo, salvo `pares_parecidos` de
 *      `check-publicar-excepciones.json`; y palabras propias ≥ suelo: 60 en las nueve ciudades con
 *      volumen y en las que tienen obra con ubicacion (`src/data/obra-ubicacion.json`), 30 en el resto.
 *
 * Grupos: `/services/<servicio>/<slug>-fl` por servicio; los `-county-fl` son el grupo `condados`.
 * Sale con 1 si algun par supera el umbral o alguna pagina queda bajo su suelo.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const RAIZ = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const opcion = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const BUILD = path.resolve(opcion('--build') ?? path.join(RAIZ, '.vercel/output'));
const ESTATICO = path.join(BUILD, 'static');
const UMBRAL = Number(opcion('--umbral') ?? 60);
const SUELO_PLANO = opcion('--suelo') ? Number(opcion('--suelo')) : null;
const SOLO = opcion('--servicio');
const VOLCAR = opcion('--volcar');
const MATRIZ = argv.includes('--matriz');
const K = 5, CASCARON = 0.5, CONCURRENCIA = 6;
const SERVICIOS = ['pool-builders', 'pool-remodeling', 'pergola-builders', 'louvered-roofs', 'outdoor-kitchens', 'deck-builders', 'landscaping'];
const NUEVE = ['pembroke-pines', 'davie', 'fort-lauderdale', 'boca-raton', 'delray-beach', 'jupiter', 'miramar', 'deerfield-beach', 'hollywood'];

if (!fs.existsSync(ESTATICO)) { console.error(`\n  ROJO no hay build en ${ESTATICO}. \`npm run build\` primero.\n`); process.exit(1); }
if (SOLO && !SERVICIOS.includes(SOLO) && SOLO !== 'condados') { console.error(`\n  ROJO --servicio ${SOLO}: vale uno de ${SERVICIOS.join(', ')} o condados.\n`); process.exit(1); }

const TOPON = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/similitud-toponimos.json'), 'utf8')).toponimos
  .sort((a, b) => b.length - a.length || a.localeCompare(b));
const RE = TOPON.map((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'));
const EXC = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/check-publicar-excepciones.json'), 'utf8'));
const PARES_PERMITIDOS = new Set((EXC.pares_parecidos?.pares ?? []).map((p) => [...p].sort().join(' ')));
const fObra = path.join(RAIZ, 'src/data/obra-ubicacion.json');
const OBRA = fs.existsSync(fObra) ? Object.values(JSON.parse(fs.readFileSync(fObra, 'utf8'))) : [];
const conObra = (slug) => OBRA.some((o) => o && (o.ciudad === slug || o.condado === slug));
const sueloDe = (ruta) => {
  if (SUELO_PLANO !== null) return SUELO_PLANO;
  const slug = ruta.split('/').pop();
  return (NUEVE.includes(slug.replace(/-fl$/, '')) || conObra(slug)) ? 60 : 30;
};

// ── grupos ──────────────────────────────────────────────────────────────────────────────────
const grupos = []; const condados = [];
for (const s of SERVICIOS) {
  const dir = path.join(ESTATICO, 'services', s);
  if (!fs.existsSync(dir)) continue;
  const slugs = fs.readdirSync(dir).filter((d) => d.endsWith('-fl') && fs.existsSync(path.join(dir, d, 'index.html'))).sort();
  grupos.push({ grupo: s, rutas: slugs.filter((d) => !d.endsWith('-county-fl')).map((d) => `/services/${s}/${d}`) });
  for (const d of slugs.filter((d) => d.endsWith('-county-fl'))) condados.push(`/services/${s}/${d}`);
}
grupos.push({ grupo: 'condados', rutas: condados.sort() });
const elegidos = grupos.filter((g) => (!SOLO || g.grupo === SOLO) && g.rutas.length > 1);
const todas = elegidos.flatMap((g) => g.rutas);

// ── texto ───────────────────────────────────────────────────────────────────────────────────
const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const navegador = await chromium.launch({ headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: true });
await ctx.route('**/*', (route) => {
  const u = new URL(route.request().url());
  const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  if (!local || ['image', 'media', 'font'].includes(route.request().resourceType())) return route.abort();
  return route.continue();
});
const norm = (s) => s.toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const enmascara = (t) => { let x = norm(t); for (const re of RE) x = x.replace(re, 'X'); return x.replace(/\s+/g, ' ').trim(); };
const texto = {}; let i = 0;
async function obrero() {
  const pag = await ctx.newPage();
  while (i < todas.length) {
    const r = todas[i++];
    await pag.goto(`${BASE}${r}/`, { waitUntil: 'load', timeout: 60000 });
    await pag.waitForSelector('main', { state: 'attached', timeout: 15000 });
    const t = await pag.evaluate(() => { document.querySelectorAll('main details').forEach((d) => { d.open = true; }); return document.querySelector('main')?.innerText ?? ''; });
    if (!t.trim()) throw new Error(`main vacio en ${r}`);
    texto[r] = enmascara(t);
  }
  await pag.close();
}
await Promise.all(Array.from({ length: CONCURRENCIA }, obrero));
await navegador.close(); servidor.close();

// ── medida ──────────────────────────────────────────────────────────────────────────────────
const r1 = (x) => Math.round(x * 10) / 10;
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const jaccard = (a, b) => { if (!a.size && !b.size) return 100; let inter = 0; for (const s of a) if (b.has(s)) inter++; const u = a.size + b.size - inter; return u ? (100 * inter) / u : 100; };
function analiza(g) {
  const n = g.rutas.length;
  const palabras = Object.fromEntries(g.rutas.map((r) => [r, texto[r].split(' ')]));
  const shingles = Object.fromEntries(g.rutas.map((r) => { const w = palabras[r], L = []; for (let k = 0; k + K <= w.length; k++) L.push(w.slice(k, k + K).join(' ')); return [r, L]; }));
  const freq = new Map();
  for (const r of g.rutas) for (const s of new Set(shingles[r])) freq.set(s, (freq.get(s) || 0) + 1);
  const cascaron = new Set([...freq].filter(([, c]) => c / n >= CASCARON).map(([s]) => s));
  const propios = {}, propias = {};
  for (const r of g.rutas) {
    const L = shingles[r], w = palabras[r];
    propios[r] = new Set(L.filter((s) => !cascaron.has(s)));
    let c = 0;
    for (let a = 0; a < w.length; a++) {
      let todos = true, alguno = false;
      for (let j = Math.max(0, a - K + 1); j <= Math.min(a, L.length - 1); j++) { alguno = true; if (cascaron.has(L[j])) { todos = false; break; } }
      if (alguno && todos) c++;
    }
    propias[r] = c;
  }
  const M = g.rutas.map((a) => g.rutas.map((b) => r1(jaccard(propios[a], propios[b]))));
  const pares = [], sobre = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    pares.push(M[a][b]);
    if (M[a][b] > UMBRAL && !PARES_PERMITIDOS.has([g.rutas[a], g.rutas[b]].sort().join(' '))) sobre.push([g.rutas[a], g.rutas[b], M[a][b]]);
  }
  const bajo = g.rutas.filter((r) => propias[r] < sueloDe(r)).map((r) => [r, propias[r], sueloDe(r)]);
  const pp = g.rutas.map((r) => propias[r]);
  return { grupo: g.grupo, n, rutas: g.rutas, cascaron: cascaron.size, matriz: M, palabras_propias: propias, palabras_total: Object.fromEntries(g.rutas.map((r) => [r, palabras[r].length])),
    maximo: pares.length ? Math.max(...pares) : null, mediana: pares.length ? r1(mediana(pares)) : null, pares: pares.length,
    sobre: sobre.sort((x, y) => y[2] - x[2]), bajo: bajo.sort((x, y) => x[1] - y[1]), pp: { min: Math.min(...pp), med: r1(mediana(pp)), max: Math.max(...pp) } };
}
const res = elegidos.map(analiza);

// ── salida ──────────────────────────────────────────────────────────────────────────────────
const corto = (r) => r.split('/').pop().replace(/-fl$/, '');
let fallos = 0;
console.log(`\nsimilitud-ciudades · ${BUILD.replace(RAIZ + '/', '')} · umbral ${UMBRAL} % · suelo ${SUELO_PLANO ?? 'D-250 (60 nueve y con obra, 30 resto)'}\n`);
console.log('  grupo               n   cascaron   max %   mediana %   pares > umbral        palabras propias min / med / max');
for (const g of res) {
  console.log(`  ${g.grupo.padEnd(18)} ${String(g.n).padStart(3)}   ${String(g.cascaron).padStart(6)}   ${String(g.maximo).padStart(5)}   ${String(g.mediana).padStart(9)}   ${`${g.sobre.length} de ${g.pares}`.padEnd(20)}  ${g.pp.min} / ${g.pp.med} / ${g.pp.max}`);
}
for (const g of res) {
  if (MATRIZ || g.n <= 15) {
    console.log(`\n  matriz propia · ${g.grupo} (filas y columnas en este orden: ${g.rutas.map(corto).join(', ')})`);
    for (const fila of g.matriz) console.log('    ' + fila.map((v) => String(v).padStart(5)).join(''));
  }
  if (g.sobre.length) { console.log(`\n  🔴 ${g.grupo}: ${g.sobre.length} par(es) > ${UMBRAL} %`); for (const [a, b, v] of g.sobre) console.log(`       ${v.toString().padStart(5)} %  ${corto(a)} ↔ ${corto(b)}`); }
  if (g.bajo.length) { console.log(`\n  🔴 ${g.grupo}: ${g.bajo.length} pagina(s) bajo su suelo de palabras propias`); for (const [r, p, s] of g.bajo) console.log(`       ${String(p).padStart(4)} < ${s}  ${r}`); }
  fallos += g.sobre.length + g.bajo.length;
}
if (VOLCAR) fs.writeFileSync(VOLCAR, JSON.stringify({ umbral: UMBRAL, suelo: SUELO_PLANO, grupos: res, textos: texto }, null, 1));
console.log(fallos ? `\n🔴 similitud-ciudades: ${fallos} fallo(s)\n` : '\n✅ similitud-ciudades: 0 fallos\n');
process.exit(fallos ? 1 : 0);
