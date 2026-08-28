#!/usr/bin/env node
/**
 * PUERTA de la Fase 4 — el nav y el pie del build contra el sitio vivo congelado.
 *
 *     npm run check:cascaron
 *
 * SOBRE `dist/` (en realidad `.vercel/output/static`), NUNCA sobre `astro dev`.
 *
 * QUÉ COMPARA, Y POR QUÉ ASÍ
 * La puerta del encargo era «≥99 % de píxeles». Medido, esa métrica NO SIRVE para el nav: con
 * la tolerancia que hace que contenido idéntico llegue al 99 %, un nav con un enlace movido
 * 6 px daba 99,33 % y pasaba igual. La banda es casi toda blanca y el texto son cuatro
 * píxeles. Así que lo que manda aquí es:
 *
 *   1. LA CAJA DE CADA ELEMENTO, relativa a la sección. 303 en el nav y 180 en el pie, en los
 *      4 anchos. Un elemento movido, más ancho o que falta, salta a la primera Y DICE CUÁL.
 *   2. EL TEXTO, idéntico carácter a carácter.
 *   3. Los píxeles, como señal secundaria y con la tolerancia calibrada (0.3, medida: es la
 *      que hace que contenido idéntico dé 100 % tras el reescalado a 1/4). No decide la
 *      puerta; está para cazar un cambio de color o una imagen que no carga, que la geometría
 *      no ve.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ANCHOS, ARGS_NAVEGADOR, ESCALA, asentar, disparar, aJpeg } from './lib/captura.mjs';
import { sondaCascaron } from './capture-cascaron.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const RUTA_PRUEBA = '/cascaron';
const TOL_PIXEL = 0.3;      // calibrada: con 0.1 el reescalado a 1/4 solo da 97,7 % con contenido idéntico
const UMBRAL_PIXEL = 99;
const TOL_CAJA = 0.6;       // px. Absorbe el redondeo subpíxel; 6 px de deriva no pasan.

const ref = JSON.parse(fs.readFileSync(path.join(RAIZ, 'baseline/cascaron.json'), 'utf8'));
if (!fs.existsSync(ESTATICO)) { console.error('\n🔴 falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
// Puerto 0: uno fijo prueba el proyecto que haya al otro lado si está ocupado, sin avisar.
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? '✅' : '🔴'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 5) => xs.slice(0, n).forEach((x) => console.log(`       ${x}`))
  || (xs.length > n && console.log(`       … y ${xs.length - n} más`));

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });

for (const [ancho, alto] of ANCHOS) {
  console.log(`\n── ${ancho}px`);
  const esperado = ref.anchos[ancho];
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();
  const resp = await pag.goto(BASE + RUTA_PRUEBA, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  if (!resp?.ok()) { check('carga /cascaron', false, `HTTP ${resp?.status()}`); await ctx.close(); continue; }
  await pag.bringToFront();
  const est = await asentar(pag);
  if (!est.valida) { check('medición válida', false, JSON.stringify(est.sonda)); await ctx.close(); continue; }

  for (const parte of ['menu', 'footer']) {
    const e = esperado[parte];
    const m = await pag.evaluate(sondaCascaron, '.' + parte);
    if (!m) { check(`${parte}: existe`, false, 'no está en el DOM'); continue; }

    check(`${parte}: ${e.elementos.length} elementos`, m.elementos.length === e.elementos.length,
      `hay ${m.elementos.length}`);

    const desvios = [];
    for (let i = 0; i < Math.min(e.elementos.length, m.elementos.length); i++) {
      const [se, xe, ye, we, he, de] = e.elementos[i].split('|');
      const [sm, xm, ym, wm, hm, dm] = m.elementos[i].split('|');
      if (se !== sm) { desvios.push(`#${i} selector: ${se} -> ${sm}`); continue; }
      if (de !== dm) { desvios.push(`#${i} ${se} display: ${de || 'visible'} -> ${dm || 'visible'}`); continue; }
      const d = [[xe, xm, 'x'], [ye, ym, 'y'], [we, wm, 'w'], [he, hm, 'h']]
        .filter(([a, b]) => Math.abs(+a - +b) > TOL_CAJA)
        .map(([a, b, q]) => `${q} ${a}->${b}`);
      if (d.length) desvios.push(`#${i} ${se}: ${d.join(', ')}`);
    }
    check(`${parte}: geometría`, desvios.length === 0, `${desvios.length} elementos desviados (tol ${TOL_CAJA}px)`);
    lista(desvios);
    check(`${parte}: texto idéntico`, m.texto === e.texto,
      m.texto === e.texto ? '' : `${m.texto.length} car. vs ${e.texto.length}`);
    if (m.texto !== e.texto) {
      const a = e.texto.split('\n'), b = m.texto.split('\n');
      lista(a.filter((l, i) => b[i] !== l).map((l, i) => `esperado: ${l.slice(0, 60)}  ·  hay: ${(b[a.indexOf(l)] ?? '(nada)').slice(0, 60)}`));
    }
  }

  // señal secundaria: la banda del nav en píxeles
  const { buffer } = await aJpeg(sharp, await disparar(pag));
  const refJpg = path.join(RAIZ, 'baseline/shots', String(ancho), 'index.jpg');
  const h = Math.round(esperado.menu.alto * ESCALA);
  const cruda = (s) => s.ensureAlpha().raw().toBuffer();
  const mm = await sharp(buffer, { limitInputPixels: false }).metadata();
  const [pa, pb] = await Promise.all([
    cruda(sharp(refJpg, { limitInputPixels: false }).extract({ left: 0, top: 0, width: mm.width, height: h })),
    cruda(sharp(buffer, { limitInputPixels: false }).extract({ left: 0, top: 0, width: mm.width, height: h })),
  ]);
  const dist = pixelmatch(pa, pb, null, mm.width, h, { threshold: TOL_PIXEL });
  const igual = 100 * (1 - dist / (mm.width * h));
  check(`nav: píxeles (señal secundaria)`, igual >= UMBRAL_PIXEL, `${igual.toFixed(2)} %`);
  await ctx.close();
}
await nav.close();
servidor.close();
console.log(`\n${fallos === 0 ? '✅ PUERTA VERDE' : `🔴 PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
