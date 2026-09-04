#!/usr/bin/env node
/**
 * DIAGNÓSTICO (no es una puerta) — mide el VELO de los dos héroes con vídeo.
 *
 *     node scripts/diag-velo.mjs /                                 # 6 anchos, perfil + contraste
 *     node scripts/diag-velo.mjs /pool-builders/ocala-florida 1920 1080
 *     node scripts/diag-velo.mjs / 1920 1080 --sin-contraste       # solo el perfil (rápido)
 *
 * Existe porque las dos cifras que gobiernan este subsistema no las daba ningún script:
 * `check:visual` dice cuánto difiere una captura, no si el degradado tiene un canto, y el
 * 8,09:1 que documentan home.css y hero-zona.css se sacó a mano. Un número sin el comando
 * que lo produjo es una opinión (00-PRINCIPIOS.md §6), así que aquí está el comando.
 *
 * Mide DOS cosas distintas, con dos montajes distintos:
 *
 * 1 · PERFIL DE ALFA — ¿se ve una línea?
 *    NO se captura la sección: el nav se pinta encima y su canto sale en la medida como un
 *    salto de 42 %/px que no es del velo (medido, primer intento de este script). Se clona
 *    el `background-image` ya computado en un <div> SONDA del MISMO alto que el héroe —
 *    mismo alto, mismas `calc(26% + 307px)`— sobre blanco y sin nada delante. Lo que queda
 *    en la captura es el velo solo, así que
 *        alfa(y) = (255 - canal(y)) / (255 - canal_navy)
 *    en el canal donde `--mm-navy` más se aleja del blanco (el rojo: navy es 0,28,99).
 *    De ahí salen las dos cifras del encargo R9-VELO-BORDE:
 *      · el mayor |Δalfa| por píxel, sobre ventana de 8px — cuánto salta el velo en el peor
 *        sitio. La ventana no es cosmética: el canal es de 8 bits y una derivada entre
 *        píxeles adyacentes no puede leer nada por debajo de 1/255 = 0,392 %/px.
 *      · el HOYO — cuántos puntos de alfa baja el mínimo local más hondo respecto a lo que
 *        tiene a los dos lados. Una franja clara con algo más oscuro encima Y debajo es lo
 *        que el ojo lee como una raya, y es el defecto que este encargo venía a quitar.
 *        0 puntos = perfil monótono.
 *
 * 2 · CONTRASTE sobre el fotograma EN VIVO — ¿sigue legible el texto?
 *    El velo no puede arreglarse a costa del texto. Vuelca el frame del <video> a canvas,
 *    busca el píxel MÁS CLARO bajo la caja de cada texto sin fondo propio, lo mezcla con
 *    navy al alfa que el perfil da en esa fila, y aplica WCAG. Muestrea segundo a segundo
 *    todo el bucle: el peor píxel es blanco puro (la piedra del borde de la piscina) y
 *    aparece en unos pocos segundos sueltos — un fotograma no vale (00-PRINCIPIOS.md §4).
 *
 *    ⚠️ Oculta todo `position:fixed` ANTES de muestrear. El botón flotante de llamada se
 *    superpone a la caja de algunos textos y su navy se cuenta como si fuera el fondo: ya
 *    dio un falso 1,35:1 una vez.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { ARGS_NAVEGADOR } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

/** Alto realista por ancho: a >=992 el héroe es `height:100vh`, así que el alto MANDA sobre
 *  la longitud de la rampa. Medir 1920 en una ventana de 800 daría otra rampa. */
const MATRIZ = [[1920, 1080], [1440, 900], [1280, 800], [991, 800], [768, 1024], [390, 844]];

const args = process.argv.slice(2);
const SIN_CONTRASTE = args.includes('--sin-contraste');
const [RUTA, ANCHO, ALTO] = args.filter((a) => !a.startsWith('--'));
if (!RUTA) { console.error('\n  uso: node scripts/diag-velo.mjs / [ancho] [alto] [--sin-contraste]\n'); process.exit(1); }
const anchos = ANCHO ? [[Number(ANCHO), Number(ALTO ?? 1080)]] : MATRIZ;

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf' };
/**
 * El servidor de `check-visual.mjs`, MÁS peticiones por rango.
 *
 * Sin `Range` el <video> no es «seekable»: `v.currentTime = 12` se ignora en silencio y
 * `currentTime` se queda en 0. Medido — el primer intento de este script muestreó 27 veces
 * el MISMO fotograma y dio el peor píxel «@0s» en las tres cajas. Los otros scripts del
 * repo no lo necesitan porque ninguno rebobina un vídeo; éste vive de eso.
 */
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  const tipo = TIPO[path.extname(f)] ?? 'application/octet-stream';
  const total = fs.statSync(f).size;
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (!rango) {
    res.writeHead(200, { 'content-type': tipo, 'content-length': total, 'accept-ranges': 'bytes' });
    return fs.createReadStream(f).pipe(res);
  }
  const fin = rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
  const ini = rango[1] ? Number(rango[1]) : total - fin - 1;   // `bytes=-500` = los últimos 500
  if (ini > fin || ini >= total) {
    res.writeHead(416, { 'content-range': `bytes */${total}` });
    return res.end();
  }
  res.writeHead(206, { 'content-type': tipo, 'accept-ranges': 'bytes',
    'content-range': `bytes ${ini}-${fin}/${total}`, 'content-length': fin - ini + 1 });
  fs.createReadStream(f, { start: ini, end: fin }).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

const SEL = '.hero-glass-section-page, .hero-glass-section';
const nav = await chromium.launch({ headless: true, args: ARGS_NAVEGADOR });

/* ── WCAG. Nada de atajos: linealizar sRGB y pesar 0,2126/0,7152/0,0722. ─────────────── */
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** Composición «source-over»: navy al alfa `a` encima del píxel del vídeo. */
const velar = (px, navy, a) => px.map((c, i) => navy[i] * a + c * (1 - a));

console.log(`\n${'═'.repeat(78)}\n  VELO · ${RUTA}\n${'═'.repeat(78)}`);
const resumen = [];

for (const [w, h] of anchos) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load', timeout: 40000 });
  await pag.evaluate(() => document.fonts.ready);

  const geo = await pag.evaluate((sel) => {
    const hero = document.querySelector(sel);
    if (!hero) return null;
    const r = hero.getBoundingClientRect();
    // `--mm-navy` es `var(--mm-azul-900)` → `#001c63`, o sea HEX. Se resuelve pintándolo en
    // un elemento y leyendo `color` de vuelta: así vale sea hex, rgb(), oklch() o lo que
    // llegue mañana a tokens.css, en vez de parsear un formato concreto.
    const sonda = document.createElement('span');
    sonda.style.color = 'var(--mm-navy)';
    document.body.appendChild(sonda);
    const navy = getComputedStyle(sonda).color;
    sonda.remove();
    // Cajas del texto SIN fondo propio: h1, h2 y párrafo son blancos directamente sobre el
    // vídeo. Las badges van sobre pastilla blanca opaca y los botones sobre oro/blanco
    // opacos — a esos el velo no los protege y no hace falta medirlos.
    const cajas = [...hero.querySelectorAll('h1, h2, .paragraph-2, .subheading-hero')]
      .filter((el) => el.offsetParent !== null && el.textContent.trim())
      .map((el) => { const b = el.getBoundingClientRect();
        return { que: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          top: Math.round(b.top - r.top), bottom: Math.round(b.bottom - r.top),
          left: Math.round(b.left - r.left), right: Math.round(b.right - r.left) }; });
    return { alto: Math.round(r.height), ancho: Math.round(r.width), navy, cajas };
  }, SEL);
  if (!geo) { console.error(`  ${w}x${h}: no hay héroe con vídeo en ${RUTA}`); await ctx.close(); continue; }

  const navy = geo.navy.match(/[\d.]+/g).slice(0, 3).map(Number);   // `rgb(0, 28, 99)`

  /* ═══ 1 · PERFIL DE ALFA ═══════════════════════════════════════════════════════════ */
  await pag.evaluate(({ sel, alto }) => {
    const hero = document.querySelector(sel);
    const p = document.createElement('div');
    p.id = '__velo_sonda';
    p.style.cssText = `position:absolute;left:0;top:0;width:24px;height:${alto}px;`
      + 'z-index:2147483647;background-color:#fff;margin:0;padding:0;border:0';
    // El valor computado conserva las `calc(26% + 307px)` sin resolver, y la sonda tiene el
    // MISMO alto que el héroe: los % resuelven al mismo píxel. Si el navegador las hubiera
    // resuelto ya, saldrían resueltas contra la caja del héroe, que es igualmente correcto.
    p.style.backgroundImage = getComputedStyle(hero).backgroundImage;
    document.body.appendChild(p);
  }, { sel: SEL, alto: geo.alto });
  const png = PNG.sync.read(await pag.locator('#__velo_sonda').screenshot({ type: 'png' }));
  await pag.evaluate(() => document.getElementById('__velo_sonda').remove());

  const alfa = [];
  for (let y = 0; y < png.height; y++) {
    const i = (png.width * y + 12) << 2;   // centro de la sonda
    alfa.push((255 - png.data[i]) / (255 - navy[0]));
  }

  // ⚠️ CUANTIZACIÓN: el canal es de 8 bits, o sea que el alfa sólo puede moverse en escalones
  // de 1/255 = 0,392 %. Una derivada entre píxeles ADYACENTES no puede leer nada por debajo de
  // eso: mide 0 o 0,392 o 0,784 y nunca los 0,104 %/px de una rampa suave. Medido en el primer
  // intento: la rampa real de 0,644 %/px salía como 0,784. Por eso la pendiente se toma sobre
  // una VENTANA de 8px, que baja la resolución a 0,049 %/px.
  const V = 8;
  let maxSalto = 0, yMax = 0;
  for (let y = 0; y + V < alfa.length; y++) {
    const d = Math.abs(alfa[y + V] - alfa[y]) / V;
    if (d > maxSalto) { maxSalto = d; yMax = y + V / 2; }
  }
  // EL DEFECTO PRINCIPAL DEL ENCARGO, en un solo número: la profundidad del hoyo más hondo.
  // Un mínimo local de alfa = una franja CLARA con algo más oscuro encima y debajo, y eso es
  // lo que el ojo lee como una raya. Se mide como cuánto baja el alfa respecto al máximo que
  // hay a cada lado; 0 puntos = perfil monótono, que es el objetivo. Contarlo así en vez de
  // buscar mínimos con una ventana fija esquiva la cuantización: el hoyo de hoy tiene 15
  // puntos de hondo pero sus laderas son de 0,026 %/px, invisibles entre píxeles vecinos.
  const maxHasta = [], maxDesde = [];
  let m = -1; for (let y = 0; y < alfa.length; y++) { m = Math.max(m, alfa[y]); maxHasta[y] = m; }
  m = -1; for (let y = alfa.length - 1; y >= 0; y--) { m = Math.max(m, alfa[y]); maxDesde[y] = m; }
  let hoyo = 0, yHoyo = 0;
  for (let y = 0; y < alfa.length; y++) {
    const d = Math.min(maxHasta[y], maxDesde[y]) - alfa[y];
    if (d > hoyo) { hoyo = d; yHoyo = y; }
  }
  const EPS = 0.006;   // 1,5 escalones de 8 bits: por debajo es ruido de cuantización

  const desdePie = (y) => png.height - Math.round(y);
  console.log(`\n  ── ${w}×${h} ${'─'.repeat(52)}`);
  console.log(`     héroe ${geo.ancho}×${geo.alto}px · navy rgb(${navy})`);
  console.log(`     alfa: pie ${(alfa.at(-1) * 100).toFixed(1)}%  ·  techo ${(alfa[0] * 100).toFixed(1)}%`);
  console.log(`     MAYOR CAMBIO DE ALFA POR PÍXEL: ${(maxSalto * 100).toFixed(3)} %/px  (a ${desdePie(yMax)}px del pie)`);
  console.log(`     HOYO MÁS HONDO (mínimo local): ${hoyo < EPS ? 'NINGUNO — perfil monótono ✓'
    : `${(hoyo * 100).toFixed(1)} puntos a ${desdePie(yHoyo)}px del pie (alfa ${(alfa[yHoyo] * 100).toFixed(1)}%) ✗`}`);

  /* ═══ 2 · CONTRASTE SOBRE EL FOTOGRAMA EN VIVO ═════════════════════════════════════ */
  let peor = null;
  if (!SIN_CONTRASTE) {
    await pag.reload({ waitUntil: 'load', timeout: 40000 });
    await pag.evaluate(() => document.fonts.ready);
    const dur = await pag.evaluate(async (sel) => {
      // El <video> DEL HÉROE, no el primero del documento: la home lleva 2 y el otro es de
      // otra sección. Medirlo sería medir otro vídeo y no enterarse.
      const v = document.querySelector(sel).querySelector('video');
      if (!v) return 0;
      // El botón flotante de llamada es `position:fixed` y pisa la caja de algunos textos:
      // su navy se contaría como fondo del vídeo. Fuera ANTES de muestrear.
      document.querySelectorAll('body *').forEach((el) => {
        if (getComputedStyle(el).position === 'fixed') el.style.display = 'none';
      });
      for (let i = 0; i < 100 && v.readyState < 2; i++) await new Promise((r) => setTimeout(r, 100));
      v.pause();
      // Sin rangos HTTP el vídeo no es rebobinable y todas las muestras salen del segundo 0.
      // Se comprueba aquí en vez de confiar: el fallo es silencioso.
      if (!v.seekable.length) return -1;
      return v.duration || 0;
    }, SEL);
    if (dur === -1) { console.log('     contraste: el <video> NO es rebobinable (¿servidor sin Range?) ✗'); }
    else if (!dur) { console.log('     contraste: sin <video> utilizable'); }
    else {
      const muestras = [];
      for (let t = 0; t < dur; t += 1) muestras.push(Number(t.toFixed(2)));
      const claros = await pag.evaluate(async ({ cajas, segs, sel }) => {
        const hero = document.querySelector(sel);
        const v = hero.querySelector('video');
        const cv = document.createElement('canvas');
        const cx = cv.getContext('2d', { willReadFrequently: true });
        const R = hero.getBoundingClientRect();
        cv.width = Math.round(R.width); cv.height = Math.round(R.height);
        // El <video> es `object-fit:cover` a tamaño de sección: se dibuja el frame escalado
        // al mismo rectángulo que ocupa en pantalla, así las cajas del DOM caen encima.
        const esc = Math.max(cv.width / v.videoWidth, cv.height / v.videoHeight);
        const dw = v.videoWidth * esc, dh = v.videoHeight * esc;
        const dx = (cv.width - dw) / 2, dy = (cv.height - dh) / 2;
        const peorPorCaja = cajas.map(() => ({ px: [0, 0, 0], L: -1, seg: null }));
        for (const s of segs) {
          v.currentTime = s;
          await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 800); });
          cx.drawImage(v, dx, dy, dw, dh);
          cajas.forEach((c, k) => {
            const x = Math.max(0, c.left), y = Math.max(0, c.top);
            const w = Math.min(cv.width - x, c.right - c.left), h = Math.min(cv.height - y, c.bottom - c.top);
            if (w <= 0 || h <= 0) return;
            const d = cx.getImageData(x, y, w, h).data;
            for (let i = 0; i < d.length; i += 4) {
              // Proxy de luminancia para BUSCAR el peor píxel; el WCAG exacto se aplica
              // fuera, en Node, sobre el ganador. Buscar con la fórmula completa por cada
              // uno de ~10^6 píxeles × 27 segundos × 6 anchos no aporta nada.
              const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
              if (L > peorPorCaja[k].L) peorPorCaja[k] = { px: [d[i], d[i + 1], d[i + 2]], L, seg: s };
            }
          });
        }
        return peorPorCaja;
      }, { cajas: geo.cajas, segs: muestras, sel: SEL });

      console.log(`     contraste · ${muestras.length} segundos del bucle (${dur.toFixed(1)}s), fixed ocultos:`);
      geo.cajas.forEach((c, k) => {
        if (claros[k].L < 0) return;
        // Alfa del velo en la fila donde el contraste es peor: el techo de la caja, que es
        // donde el velo es más flojo (el velo se aclara hacia arriba).
        const a = alfa[Math.max(0, Math.min(alfa.length - 1, c.top))];
        const r = ratio([255, 255, 255], velar(claros[k].px, navy, a));
        peor = peor === null ? r : Math.min(peor, r);
        console.log(`       ${c.que.padEnd(18)} ${String(geo.alto - c.bottom).padStart(4)}–${String(geo.alto - c.top).padEnd(4)}px del pie`
          + ` · alfa ${(a * 100).toFixed(1)}% · peor píxel rgb(${claros[k].px}) @${claros[k].seg}s`
          + ` → ${r.toFixed(2)}:1 ${r >= 4.5 ? '✓' : '✗ POR DEBAJO DE 4,5:1'}`);
      });
    }
  }

  resumen.push({ w, h, salto: maxSalto, hoyo: hoyo < EPS ? 0 : hoyo, peor });
  await ctx.close();
}

await nav.close();
servidor.close();

console.log(`\n${'═'.repeat(78)}\n  RESUMEN · ${RUTA}\n${'═'.repeat(78)}`);
console.log('  ancho×alto     Δalfa máx/px    hoyo (mínimo local)   contraste peor');
for (const r of resumen) {
  console.log(`  ${`${r.w}×${r.h}`.padEnd(14)} ${`${(r.salto * 100).toFixed(3)} %/px`.padEnd(15)}`
    + ` ${String(r.hoyo === 0 ? '0 pts ✓' : `${(r.hoyo * 100).toFixed(1)} pts ✗`).padEnd(21)}`
    + ` ${r.peor === null ? '—' : `${r.peor.toFixed(2)}:1 ${r.peor >= 4.5 ? '✓' : '✗'}`}`);
}
const mal = resumen.filter((r) => r.hoyo || (r.peor !== null && r.peor < 4.5));
console.log(`\n  ${mal.length === 0 ? 'VELO LIMPIO: monótono y con contraste ✓' : `${mal.length} de ${resumen.length} anchos con defecto ✗`}\n`);
