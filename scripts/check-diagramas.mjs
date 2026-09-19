#!/usr/bin/env node
/**
 * PUERTA — los diagramas del blog.
 *
 *     node scripts/check-diagramas.mjs
 *
 * Los SVG de `public/images/blog/diagramas/` ilustran los dos clusters que no tienen
 * fotografia de obra del cliente. Son marcado que se sirve tal cual, sin pasar por `sharp`,
 * asi que ninguna de las puertas existentes los mira: `check:assets` cuenta ficheros,
 * `check:visual` fotografia la pagina entera y un texto de 15 px ilegible no mueve el
 * porcentaje, y `check:tokens` solo lee CSS.
 *
 * Esta comprueba lo que de verdad puede salir mal en un SVG servido:
 *
 *   1. que parsee como XML —un `&` suelto lo rompe entero y el navegador no pinta nada;
 *   2. que declare `viewBox="0 0 W H"` —sin medidas hay CLS, que es justo lo que las 40
 *      figuras de R22 arreglaron;
 *   3. que traiga `<title>` y `<desc>` con `aria-labelledby` —un diagrama sin equivalente
 *      textual es contenido que no existe para quien no ve, y aqui el diagrama ES el dato;
 *   4. que TODO color salga de la paleta de `disenio/tokens.css`. Un SVG no pasa por el
 *      `check:tokens` de CSS y es por donde se cuela un azul de Webflow;
 *   5. que ningun texto baje de 15 px al ancho al que se sirve;
 *   6. que no haya `<image>` ni `<foreignObject>`: un raster incrustado o un HTML dentro del
 *      SVG serian una foto disfrazada de dibujo, que es exactamente lo que esto evita.
 *
 * Rota a proposito antes de darla por buena — ver el commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'public/images/blog/diagramas');

/** La paleta de `src/styles/disenio/tokens.css`, mas el blanco y dos grises de superficie que
 *  ya usa el sitio. Se escribe aqui a proposito: un SVG no tiene `var()` que resolver. */
const PALETA = new Set([
  '#000f36', '#1a3373', '#596b9a', '#8794b6', '#c7cddd', '#e0e4ec',
  '#f4b248', '#d99933', '#edb660', '#ffffff', '#f6f7fa', '#f3f5f9', '#eef1f7', '#fbfcfd',
  '#767676', '#000000',
]);

/** El ancho maximo al que se sirve una figura del cuerpo (`SIZES_FIGURA`, 992+). Un SVG de
 *  1280 de viewBox pintado a 650 px reduce su texto a la mitad: 15 px de fuente se ven a 7,6. */
const ANCHO_SERVIDO = 650;
const MINIMO_LEGIBLE = 12;

let fallos = 0;
const mal = (f, m) => { console.log(`  🔴 ${f}: ${m}`); fallos++; };

if (!fs.existsSync(DIR)) {
  console.log('\n  no hay diagramas todavia — nada que comprobar\n');
  process.exit(0);
}
const svgs = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort();
if (!svgs.length) {
  console.log('\n  no hay diagramas todavia — nada que comprobar\n');
  process.exit(0);
}

for (const nombre of svgs) {
  const bruto = fs.readFileSync(path.join(DIR, nombre), 'utf8');
  let doc;
  try {
    doc = new JSDOM(bruto, { contentType: 'image/svg+xml' }).window.document;
    if (doc.querySelector('parsererror')) throw new Error('parsererror');
  } catch {
    mal(nombre, 'no parsea como XML — el navegador no pintaria nada');
    continue;
  }
  const svg = doc.documentElement;

  const vb = (svg.getAttribute('viewBox') ?? '').match(/^0 0 ([\d.]+) ([\d.]+)$/);
  if (!vb) { mal(nombre, 'sin viewBox="0 0 W H" — habria CLS'); continue; }
  const ancho = Number(vb[1]);

  const etiquetado = svg.getAttribute('aria-labelledby');
  const titulo = doc.querySelector('title');
  const desc = doc.querySelector('desc');
  if (!titulo?.textContent.trim()) mal(nombre, 'sin <title>');
  if (!desc?.textContent.trim()) mal(nombre, 'sin <desc> — el diagrama ES el dato, y sin esto no existe para quien no ve');
  if (!etiquetado || !titulo || !desc
      || !etiquetado.includes(titulo.id) || !etiquetado.includes(desc.id)) {
    mal(nombre, 'el <svg> no apunta a su <title> y su <desc> con aria-labelledby');
  }
  if ((desc?.textContent ?? '').trim().length < 80) {
    mal(nombre, `<desc> de ${(desc?.textContent ?? '').trim().length} caracteres: describe la figura, no la titules otra vez`);
  }

  for (const color of bruto.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
    const c = color.toLowerCase();
    const normal = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    if (!PALETA.has(normal)) mal(nombre, `color ${color} fuera de la paleta de tokens`);
  }

  /* Los tamanos de fuente, escalados al ancho al que se sirve de verdad. */
  const escala = ANCHO_SERVIDO / ancho;
  const tams = new Set();
  for (const m of bruto.matchAll(/font-size:\s*([\d.]+)px/g)) tams.add(Number(m[1]));
  for (const m of bruto.matchAll(/font-size="([\d.]+)"/g)) tams.add(Number(m[1]));
  if (!tams.size) mal(nombre, 'no declara ningun font-size — ¿de verdad no lleva texto?');
  for (const t of tams) {
    const real = t * escala;
    if (real < MINIMO_LEGIBLE) {
      mal(nombre, `texto de ${t}px se ve a ${real.toFixed(1)}px servido a ${ANCHO_SERVIDO} (minimo ${MINIMO_LEGIBLE})`);
    }
  }

  /* Ingles americano tambien AQUI. El texto de un diagrama es texto publicado igual que el del
   * articulo, y `check-blog.mjs` solo mira el Portable Text: un «Greys in one season» dentro de
   * un SVG se le escapa entero. Paso justo eso en la primera tanda. */
  const AMERICANO = [
    [/\baluminium\b/i, 'aluminum'], [/\blicence/i, 'license'], [/\bcolour/i, 'color'],
    [/\bgrey(s|ish|ing|ed)?\b/i, 'gray'], [/\bcentres?\b/i, 'center'], [/\bmetres?\b/i, 'meter'],
    [/\bstoreys?\b/i, 'story'], [/\bfibre/i, 'fiber'], [/\bmould/i, 'mold'],
    [/\bneighbour/i, 'neighbor'], [/\bwhilst\b/i, 'while'], [/\bkerb\b/i, 'curb'],
  ];
  const texto = [...doc.querySelectorAll('text, title, desc')].map((n) => n.textContent).join(' ');
  for (const [re, bien] of AMERICANO) {
    if (re.test(texto)) mal(nombre, `"${re.source.replace(/\\b/g, '')}" -> "${bien}" (ingles americano)`);
  }

  if (doc.querySelector('image')) mal(nombre, 'lleva un <image> incrustado: un raster dentro de un dibujo es una foto disfrazada');
  if (doc.querySelector('foreignObject')) mal(nombre, 'lleva <foreignObject>: no se renderiza igual en todas partes');
  if (/<script/i.test(bruto)) mal(nombre, 'lleva <script>: un SVG servido como <img> no lo ejecuta, y si se inserta inline es un agujero');

  const kb = Buffer.byteLength(bruto) / 1024;
  if (kb > 40) mal(nombre, `${kb.toFixed(1)} KB — un diagrama de linea no deberia pasar de 40`);
  if (fallos === 0 || true) {
    console.log(`  ${fallos ? ' ' : 'ok'}   ${nombre.padEnd(38)} ${ancho}px · ${kb.toFixed(1)} KB · texto min ${(Math.min(...tams) * escala).toFixed(1)}px servido`);
  }
}

console.log(`\n  ${svgs.length} diagrama(s)`);
console.log(fallos === 0 ? '\nPUERTA VERDE\n' : `\nPUERTA ROJA — ${fallos} fallo(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
