#!/usr/bin/env node
/**
 * DIAGNÓSTICO (no es una puerta) — dice DÓNDE difiere una página, no solo cuánto.
 *
 *     node scripts/diag-visual.mjs /gallery 1920
 *
 * `check:visual` da un porcentaje, y un porcentaje no señala nada: 98,7 % sobre una página de
 * 3500 px puede ser una imagen mal, una sección desplazada o ruido repartido. Esto parte la
 * comparación en bandas horizontales, dice cuánto difiere cada una, y luego **pregunta al DOM
 * qué elementos caen en la peor banda**. El DOM ha sido la verdad todas las veces que una
 * captura me ha engañado en este proyecto.
 *
 * Usa el MISMO congelado que el baseline y que la puerta (`lib/captura.mjs`): si reimplementara
 * la receta estaría diagnosticando otra cosa.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ANCHOS, ARGS_NAVEGADOR, aSlug, asentar, disparar, aJpeg } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const [RUTA, ANCHO = '1920'] = process.argv.slice(2);
if (!RUTA) { console.error('\n  uso: node scripts/diag-visual.mjs /gallery 1920\n'); process.exit(1); }

const alto = (ANCHOS.find(([w]) => String(w) === ANCHO) ?? ANCHOS[0])[1];
const BANDA = 40;          // px del JPEG a 1/4 → 160 px reales
const TOLERANCIA = 0.3;    // la misma que la puerta

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
const BASE = `http://localhost:${servidor.address().port}`;

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: Number(ANCHO), height: alto }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pag = await ctx.newPage();
await pag.goto(BASE + RUTA, { waitUntil: 'load', timeout: 40000 });
await pag.bringToFront();
const est = await asentar(pag);
if (!est.valida) { console.error(`\n  medicion invalida ${JSON.stringify(est.sonda)}\n`); process.exit(1); }
const { buffer } = await aJpeg(sharp, await disparar(pag));

const ref = path.join(RAIZ, 'baseline/shots', ANCHO, `${aSlug(RUTA)}.jpg`);
const ma = await sharp(ref, { limitInputPixels: false }).metadata();
const mb = await sharp(buffer, { limitInputPixels: false }).metadata();
console.log(`\n  ${RUTA} @ ${ANCHO}  ·  baseline ${ma.width}x${ma.height}  ·  ahora ${mb.width}x${mb.height}  (${mb.height - ma.height >= 0 ? '+' : ''}${mb.height - ma.height} px)`);

const h = Math.min(ma.height, mb.height);
const cruda = (src) => sharp(src, { limitInputPixels: false })
  .extract({ left: 0, top: 0, width: ma.width, height: h }).ensureAlpha().raw().toBuffer();
const [pa, pb] = await Promise.all([cruda(ref), cruda(buffer)]);
const mapa = Buffer.alloc(ma.width * h * 4);
const total = pixelmatch(pa, pb, mapa, ma.width, h, { threshold: TOLERANCIA });
console.log(`  ${total} pixeles distintos de ${ma.width * h} (${(100 * (1 - total / (ma.width * h))).toFixed(2)} % iguales)\n`);

// ── por bandas ──────────────────────────────────────────────────────────────
const bandas = [];
for (let y0 = 0; y0 < h; y0 += BANDA) {
  let n = 0;
  for (let y = y0; y < Math.min(y0 + BANDA, h); y++) {
    for (let x = 0; x < ma.width; x++) {
      // pixelmatch pinta las diferencias en rojo sobre el mapa
      const i = (y * ma.width + x) * 4;
      if (mapa[i] > 200 && mapa[i + 1] < 100) n++;
    }
  }
  if (n) bandas.push({ y0, y1: Math.min(y0 + BANDA, h), n });
}
bandas.sort((a, b) => b.n - a.n);
console.log('  ── bandas con mas diferencia (px del JPEG a 1/4; multiplica por 4 para px reales) ──');
for (const b of bandas.slice(0, 6)) {
  console.log(`   y ${String(b.y0 * 4).padStart(6)}..${String(b.y1 * 4).padStart(6)} real · ${String(b.n).padStart(7)} px  (${(100 * b.n / total).toFixed(1)} % del total)`);
}

// ── que hay ahi, segun el DOM ───────────────────────────────────────────────
if (bandas.length) {
  const { y0, y1 } = bandas[0];
  const dentro = await pag.evaluate(([a, b]) => [...document.querySelectorAll('body *')]
    .map((e) => { const r = e.getBoundingClientRect(); return { e, top: r.top + scrollY, bot: r.bottom + scrollY, r }; })
    .filter((x) => x.bot > a && x.top < b && x.r.width > 40 && x.r.height > 20)
    .slice(0, 14)
    .map((x) => `${x.e.tagName.toLowerCase()}.${(x.e.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')}`
      + `  ${Math.round(x.r.width)}x${Math.round(x.r.height)} @y${Math.round(x.top)}`
      + (x.e.tagName === 'IMG' ? `  src=${(x.e.getAttribute('src') || '').split('/').pop()}` : '')),
  [y0 * 4, y1 * 4]);
  console.log('\n  ── elementos del DOM en la peor banda ──');
  for (const d of dentro) console.log(`   ${d}`);
}

await nav.close();
servidor.close();
