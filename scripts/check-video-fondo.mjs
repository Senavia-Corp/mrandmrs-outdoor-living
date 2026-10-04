#!/usr/bin/env node
/**
 * PUERTA de los vídeos de fondo — que ningún `<video>` vuelva a ser el LCP.
 *
 *     npm run check:video-fondo
 *
 * NACE DE LA SEO-REMEDIACIÓN DEL 4-OCT-2026. Lighthouse móvil sobre `.vercel/output/static`
 * medía en `/` Performance 59, LCP 10,5 s y 17,7 MB: el `<video autoplay>` del héroe sin
 * `preload` ni `poster` era el LCP, y la sección 3D bajaba otros 6,34 MB fuera de pantalla.
 * `src/lib/video-fondo.mjs` lo reescribe en `Base.astro`; esta puerta mide que el HTML servido
 * lo lleve, página a página, sobre el build (nunca dev).
 *
 * Qué exige en CADA `.w-background-video`:
 *   1 · un `<video>` sin `autoplay`, con `preload="none"` y `data-mm-video`;
 *   2 · ningún `<source src>` (la URL va en `data-src`; con `src` el navegador la pide);
 *   3 · ningún `background-image` en línea en el `<video>` (bajaba el póster dos veces);
 *   4 · un `<img class="mm-video-poster">` con `width`, `height`, `srcset` y `sizes`, cuyos
 *       ficheros existen en `public/`;
 *   5 · el botón de pausa nace `hidden`.
 * Y en cada PÁGINA con héroe de vídeo:
 *   6 · exactamente 1 `fetchpriority="high"` en el `<body>`, y es el póster del héroe;
 *   7 · su `<link rel="preload" as="image">` del `<head>` nombra URLs que el `<picture>` pinta.
 *
 * FALLA CERRADA: si no encuentra ni una página con vídeo, es ROJO (el build no está, o el
 * marcado cambió y la puerta ya no ve lo que dice medir). El suelo de conteo es el medido el
 * 4-oct-2026: 65 páginas, 121 bloques.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PUBLICO = path.join(RAIZ, 'public');
const SUELO_PAGINAS = 65;
const SUELO_BLOQUES = 121;

if (!fs.existsSync(ESTATICO)) {
  console.error('✗ no hay build en .vercel/output/static — ejecuta `npm run build` antes.');
  process.exit(1);
}

const html = [];
(function recorre(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorre(p);
    else if (e.name.endsWith('.html')) html.push(p);
  }
})(ESTATICO);

const fallos = [];
let paginas = 0;
let bloques = 0;
const existe = (url) => fs.existsSync(path.join(PUBLICO, decodeURI(url.split('?')[0])));
const urlsDe = (srcset) => (srcset || '').split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);

for (const f of html) {
  const crudo = fs.readFileSync(f, 'utf8');
  if (!crudo.includes('w-background-video')) continue;
  const ruta = '/' + path.relative(ESTATICO, f).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
  const doc = new JSDOM(crudo).window.document;
  const cajas = [...doc.querySelectorAll('.w-background-video')];
  if (!cajas.length) continue;
  paginas++;
  const mal = (m) => fallos.push(`${ruta}: ${m}`);
  let heroes = 0;
  for (const c of cajas) {
    bloques++;
    const v = c.querySelector(':scope > video');
    if (!v) { mal('bloque sin <video>'); continue; }
    if (v.hasAttribute('autoplay')) mal('<video autoplay> (regla 1)');
    if (v.getAttribute('preload') !== 'none') mal(`<video preload="${v.getAttribute('preload')}"> (regla 1)`);
    if (!v.dataset.mmVideo) mal('<video> sin data-mm-video (regla 1)');
    if (v.dataset.mmVideo === 'heroe') heroes++;
    if (v.querySelector('source[src]')) mal('<source src> dentro del vídeo: se descarga (regla 2)');
    if (!v.querySelector('source[data-src]')) mal('<video> sin <source data-src> (regla 2)');
    if (/background-image/.test(v.getAttribute('style') || '')) mal('background-image en línea en el <video> (regla 3)');
    const img = c.querySelector(':scope > picture > img.mm-video-poster');
    if (!img) { mal('sin <img class="mm-video-poster"> (regla 4)'); continue; }
    for (const a of ['width', 'height', 'srcset', 'sizes', 'src']) if (!img.getAttribute(a)) mal(`póster sin ${a} (regla 4)`);
    const urls = [img.getAttribute('src'), ...urlsDe(img.getAttribute('srcset')),
      ...[...c.querySelectorAll(':scope > picture > source')].flatMap((s) => urlsDe(s.getAttribute('srcset')))];
    for (const u of urls) if (!existe(u)) mal(`póster inexistente en public/: ${u} (regla 4)`);
    const control = c.querySelector(':scope > [aria-live]');
    if (control && !control.hidden) mal('el botón de pausa no nace hidden (regla 5)');
  }
  if (heroes) {
    const altas = [...doc.body.querySelectorAll('[fetchpriority="high"]')];
    if (altas.length !== 1) mal(`${altas.length} fetchpriority="high" en el body, se esperaba 1 (regla 6)`);
    else if (!altas[0].matches('.mm-video-poster')) mal('el fetchpriority="high" no es el póster del héroe (regla 6)');
    const pintadas = new Set([...doc.querySelectorAll('[data-mm-video="heroe"]')].flatMap((v) =>
      [...v.parentElement.querySelectorAll(':scope > picture source')].flatMap((s) => urlsDe(s.getAttribute('srcset')))));
    const pre = [...doc.head.querySelectorAll('link[rel="preload"][as="image"]')];
    if (!pre.length) mal('héroe de vídeo sin <link rel="preload" as="image"> (regla 7)');
    for (const l of pre) for (const u of urlsDe(l.getAttribute('imagesrcset'))) {
      if (!pintadas.has(u)) mal(`la precarga nombra ${u}, que el héroe no pinta (regla 7)`);
    }
  }
}

if (paginas < SUELO_PAGINAS || bloques < SUELO_BLOQUES) {
  fallos.push(`solo ${paginas} páginas / ${bloques} bloques con vídeo de fondo; el suelo medido es ${SUELO_PAGINAS} / ${SUELO_BLOQUES}. La puerta no ve lo que dice medir.`);
}

console.log(`check:video-fondo — ${paginas} páginas, ${bloques} bloques .w-background-video`);
if (fallos.length) {
  console.error(`\n✗ PUERTA ROJA — ${fallos.length} fallo(s):`);
  for (const m of fallos.slice(0, 40)) console.error('  ' + m);
  if (fallos.length > 40) console.error(`  … y ${fallos.length - 40} más`);
  process.exit(1);
}
console.log('PUERTA VERDE');
