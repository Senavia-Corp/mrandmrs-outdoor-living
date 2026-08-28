#!/usr/bin/env node
/**
 * DIAGNÓSTICO (no es una puerta) — dónde empieza a desalinearse una página contra el vivo.
 *
 *     node scripts/diag-geometria.mjs /gallery 1920
 *
 * `check:visual` dice «98,7 %» y `diag-visual` dice «repartido por toda la página». Las dos
 * cosas juntas son la firma de UN desplazamiento de pocos píxeles arriba que corre todo lo de
 * abajo: al reescalar a 1/4, medio píxel de desfase emborrona cada borde y sale diferencia
 * difusa en todas partes. Un porcentaje nunca va a señalar eso.
 *
 * Esto mide GEOMETRÍA en los dos DOM —el vivo y el construido— y dice el PRIMER elemento cuyo
 * `top` se separa. Es el mismo método que cerró la Fase 4: medir el DOM, no mirar la captura.
 * Cada vez que una captura me ha engañado en este proyecto, la medición del DOM tenía razón.
 *
 * Requiere que el origen siga sirviendo. Cuando el dominio se corte, esto deja de funcionar.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ANCHOS, ARGS_NAVEGADOR, asentar } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const VIVO = 'https://mrandmrsoutdoorliving.com';
const [RUTA, ANCHO = '1920'] = process.argv.slice(2);
if (!RUTA) { console.error('\n  uso: node scripts/diag-geometria.mjs /gallery 1920\n'); process.exit(1); }
const alto = (ANCHOS.find(([w]) => String(w) === ANCHO) ?? ANCHOS[0])[1];

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const LOCAL = `http://localhost:${servidor.address().port}`;

/**
 * Clave de emparejamiento: etiqueta + primeras clases + índice de aparición de esa combinación.
 * NO se usa la posición absoluta en el árbol: el sitio nuevo puede llevar un `<div>` de más de
 * un componente propio y entonces todo lo demás quedaría desplazado un puesto y el diff sería
 * ruido de principio a fin.
 */
const MEDIR = () => {
  const vistos = new Map();
  return [...document.querySelectorAll('body *')].map((e) => {
    const cls = (e.className || '').toString().split(/\s+/).filter(Boolean)
      .filter((c) => !/^w--|^w-condition|active$/.test(c)).slice(0, 2).join('.');
    const k = `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
    const n = (vistos.get(k) ?? 0); vistos.set(k, n + 1);
    const r = e.getBoundingClientRect();
    return { k: `${k}#${n}`, top: Math.round((r.top + scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100 };
  }).filter((x) => x.h > 0);
};

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: Number(ANCHO), height: alto }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pag = await ctx.newPage();

const medir = async (base) => {
  await pag.goto(base + RUTA, { waitUntil: 'load', timeout: 60000 });
  await pag.bringToFront();
  const est = await asentar(pag);
  if (!est.valida) throw new Error(`medicion invalida en ${base}: ${JSON.stringify(est.sonda)}`);
  return pag.evaluate(MEDIR);
};

const A = await medir(VIVO);
const B = await medir(LOCAL);
await nav.close(); servidor.close();

const mb = new Map(B.map((x) => [x.k, x]));
console.log(`\n  ${RUTA} @ ${ANCHO}  ·  vivo ${A.length} elementos  ·  local ${B.length}\n`);

const soloVivo = A.filter((x) => !mb.has(x.k));
const soloLocal = B.filter((x) => !A.some((y) => y.k === x.k));
if (soloVivo.length) console.log(`  solo en el vivo (${soloVivo.length}): ${soloVivo.slice(0, 6).map((x) => x.k).join(', ')}`);
if (soloLocal.length) console.log(`  solo en local  (${soloLocal.length}): ${soloLocal.slice(0, 6).map((x) => x.k).join(', ')}`);

const comunes = A.filter((x) => mb.has(x.k));
const desvios = comunes.map((x) => ({ k: x.k, dTop: +(mb.get(x.k).top - x.top).toFixed(2), dH: +(mb.get(x.k).h - x.h).toFixed(2), top: x.top }))
  .filter((x) => x.dTop || x.dH);
console.log(`  ${comunes.length} elementos comunes · ${desvios.length} con desvio\n`);

if (!desvios.length) { console.log('  sin desvios de geometria: la diferencia es de PINTADO, no de maqueta\n'); process.exit(0); }

// el primero por posición vertical: la causa está arriba, lo de abajo solo lo arrastra
desvios.sort((a, b) => a.top - b.top);
console.log('  ── primeros desvios, de arriba abajo ──');
for (const d of desvios.slice(0, Number(process.env.MM_N ?? 12))) {
  console.log(`   y${String(Math.round(d.top)).padStart(6)}  ${d.k.padEnd(46).slice(0, 46)}  dTop ${String(d.dTop).padStart(7)}  dAlto ${String(d.dH).padStart(7)}`);
}
// el que CRECE es el culpable; los que solo se desplazan son consecuencia
const crecen = desvios.filter((d) => d.dH).sort((a, b) => a.top - b.top);
console.log(`\n  ── los que cambian de ALTO (la causa; los demas solo se arrastran) ── ${crecen.length}`);
for (const d of crecen.slice(0, 10)) {
  console.log(`   y${String(Math.round(d.top)).padStart(6)}  ${d.k.padEnd(46).slice(0, 46)}  dAlto ${String(d.dH).padStart(7)}`);
}
