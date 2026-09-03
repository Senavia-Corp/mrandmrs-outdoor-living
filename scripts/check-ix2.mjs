#!/usr/bin/env node
/**
 * PUERTA de la Fase 7 — las interacciones, medidas EN EL NAVEGADOR y con foco real.
 *
 *     npm run check:ix2
 *
 * Sobre `.vercel/output/static`, con el mismo congelado que el baseline, en los 4 anchos y
 * con barrido completo. Lo que exige:
 *
 *   0. **0 claves de `reveals.json` huerfanas** (sin navegador, antes de todo lo demas).
 *      Ninguna de las reglas de abajo puede ver una clave que no casa con ningun elemento:
 *      si nadie recibe `data-rev`, nadie recibe `opacity:0` y todo sale verde. El porque,
 *      con el defecto concreto que dejo pasar, junto al codigo.
 *
 *   1. **0 elementos con `data-w-id` en `opacity: 0`.** Es el fallo grande de esta migración:
 *      el HTML servido trae `style="opacity:0"` en línea en 270 elementos de 35 páginas -el
 *      anti-FOUC de Webflow-, y sin `webflow.js` nadie los enciende. `check:texto` NO lo caza,
 *      porque `innerText` incluye lo que está a opacity 0. Esta puerta sí.
 *   2. **0 `transform` residual distinto de `none` en reposo.** Un transform que se queda
 *      puesto crea contexto de apilamiento y bloque contenedor para descendientes
 *      `fixed`/`absolute`. Es la razón de usar `backwards` y nunca `both`.
 *   3. **0 barra de scroll horizontal** a 479 y 767. Aplicar el deslizamiento lateral en móvil
 *      la mete: en LTR solo desborda el positivo, así que `slideInRight` es el peligroso.
 *   4. Que el nav vuelva tras subir, que los desplegables abran y que el menú móvil abra.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ARGS_NAVEGADOR, asentar } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static\n'); process.exit(1); }

/**
 * PRE-PUERTA ESTATICA — ninguna clave de `reveals.json` puede quedar HUERFANA.
 *
 * Es la regla que faltaba, y es exactamente la que dejo pasar el defecto de las 41 claves
 * compuestas: el extractor guardaba `<pageId>|<data-w-id>` -la codificacion de Webflow para
 * los targets con ambito de pagina- mientras que el atributo del HTML lleva SOLO el
 * data-w-id, asi que el selector no casaba con ningun elemento y esas 41 entradas por scroll
 * no se animaban nunca.
 *
 * La regla 1 de mas abajo NO lo caza y no puede cazarlo: un elemento que nunca recibe
 * `data-rev` tampoco recibe el `opacity:0` que cuelga de el, o sea que sale VERDE estando
 * roto. La unica forma de verlo es preguntar por el otro lado -las claves que no casan con
 * nada- y eso no necesita navegador.
 *
 * Las 14 que quedan son elementos que viven en plantillas del export que este sitio no
 * publica (`detail_*`, que dan 404) o que la migracion no porto. Se FIJA el numero en vez de
 * tolerar «algunas»: si sube, algo ha dejado de casar; si baja, es una mejora y hay que
 * actualizarlo aqui. Un `>0` a secas volveria a ser una puerta que no comprueba.
 */
const HUERFANAS_ESPERADAS = 14;
{
  const { porId } = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/reveals.json'), 'utf8'));
  const vistos = new Set();
  (function barrer(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, d.name);
      if (d.isDirectory()) barrer(f);
      else if (d.name.endsWith('.html')) {
        for (const m of fs.readFileSync(f, 'utf8').matchAll(/data-w-id="([^"]+)"/g)) vistos.add(m[1]);
      }
    }
  }(ESTATICO));
  const huerfanas = Object.keys(porId).filter((k) => !vistos.has(k));
  const ok = huerfanas.length <= HUERFANAS_ESPERADAS;
  console.log(`\n\u2500\u2500 claves de reveals.json que casan con algun elemento`);
  console.log(`  ${ok ? 'ok  ' : 'ROJO'} huerfanas ${huerfanas.length} (esperadas ${HUERFANAS_ESPERADAS}) de ${Object.keys(porId).length}`);
  if (!ok) {
    for (const k of huerfanas.slice(0, 10)) console.log(`       ${k} -> ${porId[k].map((x) => x.anim).join('/')}`);
    console.error('\nPUERTA ROJA — hay claves que no casan con ningun elemento: esas entradas por scroll no se animan nunca\n');
    process.exit(1);
  }
}

/**
 * Un arquetipo de cada tipo de página, no las 115: esto abre navegador y cuesta minutos.
 *
 * `/financing` entra aunque NO tenga ni un `data-w-id` —no lleva reveals, ver la cabecera de
 * `src/pages/financing.astro`—, y precisamente por eso. De esta puerta le importan las dos
 * comprobaciones que no son de IX2: `scrollX` a 479 y 991, y que el nav siga visible. Es la
 * primera página escrita a mano sobre `Base.astro`, o sea la única cuyo marcado no salió de
 * Webflow ya cuadrado, y sin esta línea NINGUNA puerta mediría su desbordamiento horizontal
 * —`check:visual` compara píxeles contra una referencia nuestra, que es otra cosa—.
 * Cuesta 4 cargas más de 44 a 48.
 */
const RUTAS = ['/', '/about', '/gallery', '/contact-us', '/videos', '/brochures',
  '/services/custom-deck-builders-in-north-south-florida',
  '/pool-builders/alachua-florida', '/project/modern-pool-motorized-pergola-south-florida',
  '/blogs/top-10-luxury-pool-designs-for-florida-homes',
  '/country/custom-pool-builders-alachua-county-fl',
  '/financing'];
const ANCHOS = [[1920, 1080], [1440, 900], [991, 800], [479, 850]];

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

const sonda = () => {
  const visible = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const b = e.getBoundingClientRect();
    return b.width >= 1 && b.height >= 1;
  };
  const wid = [...document.querySelectorAll('[data-w-id]')];
  return {
    sello: document.documentElement.hasAttribute('data-anim'),
    total: wid.length,
    conRev: document.querySelectorAll('[data-rev]').length,
    invisibles: wid.filter((e) => visible(e) && parseFloat(getComputedStyle(e).opacity) === 0)
      .map((e) => `${e.dataset.wId?.slice(0, 8)} .${String(e.className).slice(0, 26)}`),
    residual: wid.filter((e) => { const t = getComputedStyle(e).transform; return t && t !== 'none'; })
      .map((e) => `${e.dataset.wId?.slice(0, 8)} ${getComputedStyle(e).transform.slice(0, 26)}`),
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    navVisible: (() => { const n = document.querySelector('.menu'); return n ? parseFloat(getComputedStyle(n).opacity) > .9 : null; })(),
    dropdowns: document.querySelectorAll('.w-dropdown').length,
  };
};

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });

for (const [ancho, alto] of ANCHOS) {
  console.log(`\n── ${ancho}px`);
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();
  let invisibles = 0, residual = 0, scrollX = [], sinSello = [], navMal = [];

  for (const ruta of RUTAS) {
    const resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
    if (!resp?.ok()) { check(`carga ${ruta}`, false, `HTTP ${resp?.status()}`); continue; }
    await pag.bringToFront();
    const est = await asentar(pag);
    if (!est.valida) { check(`medicion ${ruta}`, false, JSON.stringify(est.sonda)); continue; }
    // Un respiro extra: las entradas duran 1000 ms y el ultimo elemento puede acabar de entrar.
    await pag.waitForTimeout(1200);
    const r = await pag.evaluate(sonda);
    if (r.invisibles.length) { invisibles += r.invisibles.length; console.log(`       ${ruta}: ${r.invisibles.slice(0, 3).join(' · ')}`); }
    if (r.residual.length) { residual += r.residual.length; console.log(`       ${ruta}: transform ${r.residual.slice(0, 3).join(' · ')}`); }
    if (r.scrollX) scrollX.push(ruta);
    if (!r.sello) sinSello.push(ruta);
    if (r.navVisible === false) navMal.push(ruta);
  }

  check(`${RUTAS.length} paginas: 0 [data-w-id] en opacity:0`, invisibles === 0, `${invisibles}`);
  check('0 transform residual en reposo', residual === 0, `${residual}`);
  check('0 barra de scroll horizontal', scrollX.length === 0, scrollX.join(', '));
  check('el sello data-anim en todas', sinSello.length === 0, sinSello.join(', '));
  check('el nav vuelve tras subir', navMal.length === 0, navMal.join(', '));
  await ctx.close();
}

// ── interaccion: un desplegable y el menu movil ─────────────────────────────
console.log('\n── interaccion');
for (const [ancho, alto, que] of [[1920, 1080, 'desplegable'], [479, 850, 'menu movil']]) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + '/', { waitUntil: 'load' });
  await pag.bringToFront();
  if (que === 'desplegable') {
    const r = await pag.evaluate(async () => {
      const b = document.querySelector('.w-dropdown-toggle');
      if (!b) return 'no hay desplegable';
      b.click(); await new Promise((x) => setTimeout(x, 250));
      const abierto = !!document.querySelector('.w-dropdown-list.w--open');
      b.click(); await new Promise((x) => setTimeout(x, 250));
      return { abre: abierto, cierra: !document.querySelector('.w-dropdown-list.w--open') };
    });
    check(`${ancho}: el desplegable abre y cierra`, r.abre === true && r.cierra === true, JSON.stringify(r));
  } else {
    const r = await pag.evaluate(async () => {
      const b = document.querySelector('.w-nav-button');
      const ov = document.querySelector('.w-nav-overlay');
      if (!b || !ov) return 'falta el boton o el overlay';
      b.click(); await new Promise((x) => setTimeout(x, 500));
      const abierto = ov.hasAttribute('data-abierto') && ov.querySelector('.w-nav-menu') !== null;
      const enPantalla = (() => { const m = ov.querySelector('.w-nav-menu'); if (!m) return false;
        const r2 = m.getBoundingClientRect(); return r2.right > 0 && r2.left < innerWidth; })();
      b.click(); await new Promise((x) => setTimeout(x, 500));
      return { abre: abierto, visible: enPantalla, cierra: !ov.hasAttribute('data-abierto') };
    });
    check(`${ancho}: el menu movil abre, se ve y cierra`,
      r.abre === true && r.visible === true && r.cierra === true, JSON.stringify(r));
  }
  await ctx.close();
}

await nav.close();
servidor.close();
console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
