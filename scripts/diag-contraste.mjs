#!/usr/bin/env node
/**
 * DIAGNOSTICO (no es una puerta) — CONTRASTE POR PEOR PIXEL sobre el fondo real de una seccion.
 *
 *     node scripts/diag-contraste.mjs <ruta> 'section.svc-confianza, section.svc-intro' 1440
 *
 * `CRITERIO.md` manda por PEOR PIXEL, nunca por promedio, y da el caso que lo justifica: una
 * media de 5,49:1 sobre una teja que en su peor punto daba 3,11:1. Un promedio aprueba texto
 * ilegible. Aqui no hay promedios.
 *
 * COMO SE AISLA EL FONDO. No se puede medir el fondo con el texto encima -se mediria el texto-.
 * Se hace en dos pasadas sobre la MISMA pagina:
 *
 *   1 · se apunta la caja y el `color` computado de cada elemento con texto propio;
 *   2 · se vuelven TRANSPARENTES LOS GLIFOS (`color: transparent`, mas `text-shadow: none`)
 *       y se captura. Queda el respaldo real de cada texto: el fondo de la seccion, las
 *       imagenes del mosaico y EL FONDO PROPIO DEL ELEMENTO.
 *
 * ⚠️ NO se usa `visibility: hidden`, y la diferencia no es cosmetica: ocultar el elemento
 * oculta TAMBIEN su propio fondo. La primera version de este script lo hacia y dio un falso
 * positivo de manual — `a.button.button-styles` salio a 1,00:1 «navy sobre navy», cuando lo
 * que tiene debajo es su degradado de oro (`webflow.css`: `.button-styles` lleva
 * `linear-gradient(135deg, var(--yellow-1) …)`). Se medía el fondo de la seccion a traves
 * del boton que el propio script acababa de borrar. Tampoco se ocultan las imagenes: si un
 * texto cae encima de una foto, esa foto ES su respaldo.
 *
 * Y SE MIDE BAJO LOS GLIFOS, NO BAJO LA CAJA. Se capturan las dos pasadas y se restan: donde
 * los pixeles difieren es exactamente donde hay tinta. Ese es el respaldo que cuenta.
 *
 * ⚠️ Medir la caja entera da falsos positivos, y tambien lo dio este script antes de existir
 * la mascara: `a.button.button-styles` salio 1,00:1 «navy sobre navy» porque sus ESQUINAS
 * REDONDEADAS dejan ver el navy de la seccion dentro del rectangulo, y ahi no cae ni puede
 * caer una letra. El boton es navy sobre su degradado de oro y esta perfectamente legible.
 * Un umbral que salta por una esquina de 5 px de radio no mide legibilidad, mide geometria.
 *
 * Se informa tambien el perfil por bandas, que es lo que delata una franja clara cruzando una
 * seccion oscura.
 *
 * Mide sobre `.vercel/output/static`, nunca sobre `astro dev`.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { ARGS_NAVEGADOR, asentar } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const [RUTA, SELECTOR, ANCHO = '1440', BANDAS = '14'] = process.argv.slice(2);
if (!RUTA || !SELECTOR) {
  console.error('\n  uso: node scripts/diag-contraste.mjs <ruta> <selector[,selector]> [ancho] [bandas]\n');
  process.exit(1);
}

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

/** WCAG 2.x: luminancia relativa y razon de contraste. */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razon = (a, b) => { const L1 = Math.max(a, b), L2 = Math.min(a, b); return (L1 + 0.05) / (L2 + 0.05); };
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const aRGB = (css) => { const m = css.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null; };

const nav = await chromium.launch({ args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: Number(ANCHO), height: 1000 }, deviceScaleFactor: 1 });
const pag = await ctx.newPage();
await pag.goto(BASE + RUTA, { waitUntil: 'load' });
const ok = await asentar(pag);
if (!ok.valida) { console.error('  MEDICION NO VALIDA'); process.exit(1); }

// 1 · geometria de la zona y de cada texto
const plano = await pag.evaluate((sel) => {
  const secs = [...document.querySelectorAll(sel)];
  if (!secs.length) return null;
  const top = Math.min(...secs.map((s) => s.getBoundingClientRect().top + scrollY));
  const bot = Math.max(...secs.map((s) => s.getBoundingClientRect().bottom + scrollY));
  const textos = [];
  for (const s of secs) {
    for (const el of s.querySelectorAll('*')) {
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) continue;
      const cs = getComputedStyle(el);
      textos.push({
        etiqueta: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        texto: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30),
        color: cs.color, tam: cs.fontSize, peso: cs.fontWeight,
        x: Math.round(r.left), y: Math.round(r.top + scrollY),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
  }
  return { top: Math.round(top), bot: Math.round(bot), textos,
    secciones: secs.map((s) => ({ clase: s.className,
      top: Math.round(s.getBoundingClientRect().top + scrollY),
      alto: Math.round(s.getBoundingClientRect().height),
      fondo: getComputedStyle(s).backgroundColor, img: getComputedStyle(s).backgroundImage.slice(0, 60),
      sombra: getComputedStyle(s).boxShadow.slice(0, 60) })) };
}, SELECTOR);
if (!plano) { console.error(`  no existe ${SELECTOR}`); process.exit(1); }

// 1.bis · la pasada CON tinta, para poder restarla despues y saber donde hay glifos
const pngConTinta = PNG.sync.read(await pag.screenshot({ fullPage: true, animations: 'disabled' }));

// 2 · el respaldo real: glifos transparentes, TODO lo demas intacto (ver la cabecera)
await pag.evaluate((sel) => {
  for (const s of document.querySelectorAll(sel)) {
    for (const el of s.querySelectorAll('*')) {
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (propio) {
        el.style.setProperty('color', 'transparent', 'important');
        el.style.setProperty('text-shadow', 'none', 'important');
        el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      }
    }
  }
}, SELECTOR);

const png = PNG.sync.read(await pag.screenshot({ fullPage: true, animations: 'disabled' }));
const pix = (x, y) => { const i = (png.width * y + x) << 2; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
/** ¿Habia tinta en este pixel? Se compara con la pasada anterior. 8/255 deja fuera el ruido
 *  del antialias del subpixel sin perder el borde de la letra. */
const hayGlifo = (x, y) => {
  if (pngConTinta.width !== png.width || pngConTinta.height !== png.height) return true;
  const i = (png.width * y + x) << 2;
  return Math.abs(pngConTinta.data[i] - png.data[i]) > 8
    || Math.abs(pngConTinta.data[i + 1] - png.data[i + 1]) > 8
    || Math.abs(pngConTinta.data[i + 2] - png.data[i + 2]) > 8;
};

console.log(`\n═══ ${RUTA}  ·  ${ANCHO} px  ·  ${SELECTOR}`);
for (const s of plano.secciones) {
  console.log(`    ${String(s.clase).slice(0, 44).padEnd(44)} top ${String(s.top).padStart(5)}  alto ${String(s.alto).padStart(4)}`);
  console.log(`        fondo ${s.fondo}  img ${s.img}  sombra ${s.sombra}`);
}

// perfil por bandas
const nb = Number(BANDAS);
const alto = plano.bot - plano.top;
console.log(`\n    perfil del fondo por bandas (peor pixel de cada banda, y su contraste)`);
console.log(`    banda      y   peor pixel   blanco   #c7cddd      oro`);
const REF = { blanco: [255, 255, 255], c7cddd: [199, 205, 221], oro: [244, 178, 72] };
let peorGlobal = { r: 99 };
for (let b = 0; b < nb; b++) {
  const y0 = plano.top + Math.floor((alto * b) / nb);
  const y1 = plano.top + Math.floor((alto * (b + 1)) / nb);
  let peor = null;
  for (let y = y0; y < y1; y += 2) {
    for (let x = 2; x < png.width - 2; x += 4) {
      const [r, g, bb] = pix(x, y);
      const L = lum(r, g, bb);
      const c = Math.min(...Object.values(REF).map((v) => razon(L, lum(...v))));
      if (!peor || c < peor.c) peor = { c, r, g, b: bb, L };
    }
  }
  if (!peor) continue;
  const rs = Object.fromEntries(Object.entries(REF).map(([k, v]) => [k, razon(peor.L, lum(...v))]));
  const mal = (v) => (v < 4.5 ? '!' : ' ');
  console.log(`    ${String(b).padStart(5)} ${String(y0 - plano.top).padStart(6)}   ${hex(peor.r, peor.g, peor.b)}`
    + `   ${rs.blanco.toFixed(2).padStart(6)}${mal(rs.blanco)} ${rs.c7cddd.toFixed(2).padStart(7)}${mal(rs.c7cddd)}`
    + ` ${rs.oro.toFixed(2).padStart(7)}${mal(rs.oro)}`);
  if (rs.blanco < peorGlobal.r) peorGlobal = { r: rs.blanco, hex: hex(peor.r, peor.g, peor.b) };
}

// 3 · peor pixel bajo CADA texto, contra SU color
console.log(`\n    peor pixel BAJO CADA TEXTO, contra su propio color`);
let peorTexto = null;
for (const t of plano.textos) {
  const rgb = aRGB(t.color); if (!rgb) continue;
  const Lt = lum(...rgb);
  let peor = null, conTinta = 0;
  for (let y = t.y; y < t.y + t.h; y++) {
    for (let x = t.x; x < t.x + t.w; x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      if (!hayGlifo(x, y)) continue;          // solo donde de verdad hay letra
      conTinta++;
      const [r, g, b] = pix(x, y);
      const c = razon(Lt, lum(r, g, b));
      if (!peor || c < peor.c) peor = { c, hex: hex(r, g, b) };
    }
  }
  if (!peor) { console.log(`      --       (sin glifos detectados)  ${t.etiqueta.slice(0, 26)} «${t.texto}»`); continue; }
  const grande = parseFloat(t.tam) >= 24 || (parseFloat(t.tam) >= 18.66 && Number(t.peso) >= 700);
  const umbral = grande ? 3 : 4.5;
  const marca = peor.c < umbral ? '  <<< POR DEBAJO DE ' + umbral : '';
  console.log(`    ${peor.c.toFixed(2).padStart(6)}:1  umbral ${umbral}  ${hex(...rgb)} sobre ${peor.hex}  `
    + `${t.etiqueta.slice(0, 26).padEnd(26)} «${t.texto}»${marca}`);
  if (!peorTexto || peor.c - umbral < peorTexto.margen) peorTexto = { margen: peor.c - umbral, c: peor.c, umbral, t: t.etiqueta };
}
console.log(`\n    PEOR CASO: ${peorTexto ? `${peorTexto.c.toFixed(2)}:1 contra umbral ${peorTexto.umbral} (${peorTexto.t})` : 'sin texto'}`);

await ctx.close(); await nav.close(); servidor.close();
