#!/usr/bin/env node
/**
 * Auto-aloja LAS MISMAS fuentes que carga el sitio vivo, bajadas de Google.
 *
 *     npm run fuentes
 *
 * POR QUÉ NO VALE @fontsource
 * Se probó primero con `@fontsource-variable/inter`, que es lo que dice el encargo. Misma
 * familia, mismo tamaño, mismo peso... y el nav salía al 95,85 % contra el baseline. Medido
 * elemento a elemento: la caja del nav coincidía al píxel y el logo también, pero un
 * `a.nav-link` medía **57,35 px en el build y 59,54 px en el vivo**. O sea, métricas
 * distintas: el Inter variable de fontsource no es el Inter que sirve Google hoy. Con el
 * texto 2 px más estrecho en cada enlace, ninguna comparación de píxeles iba a llegar al 99 %
 * en 115 páginas.
 *
 * Así que se bajan los .woff2 EXACTOS que pide el sitio, con la misma cadena de familias que
 * usa su WebFont Loader. Es la única forma de que el texto ocupe lo mismo.
 *
 * SUBCONJUNTOS: solo `latin` y `latin-ext`. El sitio es de Florida y está en inglés; Google
 * sirve además cirílico, griego y vietnamita, que aquí no pinta nadie.
 *
 * PLAYFAIR DISPLAY NO SE BAJA. El loader del origen la carga, pero no la usa NADIE: 0
 * `font-family` con Playfair en el CSS del vivo y en las 115 páginas del baseline. Bajarla
 * sería arrastrar 5 pesos para que ningún píxel cambie.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DEST_FUENTES = path.join(RAIZ, 'public/fonts');
const DEST_CSS = path.join(RAIZ, 'src/styles/fuentes.css');

/** La misma cadena que el WebFont Loader del sitio, menos Playfair (ver arriba). */
const FAMILIAS = [
  'Montserrat:100,100italic,200,200italic,300,300italic,400,400italic,500,500italic,600,600italic,700,700italic,800,800italic,900,900italic',
  'Inter:300,400,500,600,700',
].join('|');
const SUBCONJUNTOS = new Set(['latin', 'latin-ext']);

// El UA importa: con uno viejo Google devuelve TTF en vez de woff2.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

const url = `https://fonts.googleapis.com/css?family=${encodeURIComponent(FAMILIAS)}`;
const css = await (await fetch(url, { headers: { 'user-agent': UA } })).text();

await fs.mkdir(DEST_FUENTES, { recursive: true });

const bloques = css.split('/*').filter(Boolean);
let salida = `/* DERIVADO — no editar a mano. Lo genera scripts/fetch-fuentes.mjs.\n`
  + ` * Son los .woff2 EXACTOS que sirve Google para la misma cadena de familias que pide el\n`
  + ` * WebFont Loader del sitio vivo. El porqué (métricas) está en la cabecera del script.\n */\n`;
let bajadas = 0, saltados = 0;

for (const b of bloques) {
  const sub = b.slice(0, b.indexOf('*/')).trim();
  if (!SUBCONJUNTOS.has(sub)) { saltados++; continue; }
  let cuerpo = b.slice(b.indexOf('*/') + 2);
  for (const m of [...cuerpo.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)]) {
    const remota = m[1];
    const nombre = remota.split('/').slice(-3).join('-');
    const destino = path.join(DEST_FUENTES, nombre);
    if (!await fs.access(destino).then(() => true, () => false)) {
      const r = await fetch(remota, { headers: { 'user-agent': UA } });
      if (!r.ok) throw new Error(`${r.status} bajando ${remota}`);
      await fs.writeFile(destino, Buffer.from(await r.arrayBuffer()));
      bajadas++;
    }
    cuerpo = cuerpo.split(remota).join(`/fonts/${nombre}`);
  }
  // swap: el texto se ve con la fuente de respaldo hasta que llega la real, en vez de
  // quedarse invisible. Es lo que hace el loader del origen.
  if (!/font-display/.test(cuerpo)) cuerpo = cuerpo.replace('@font-face {', '@font-face {\n  font-display: swap;');
  salida += `\n/* ${sub} */${cuerpo}`;
}

await fs.writeFile(DEST_CSS, salida);
const ficheros = (await fs.readdir(DEST_FUENTES)).length;
console.log(`\n  familias  : Montserrat + Inter (Playfair no: no la usa nadie)`);
console.log(`  woff2     : ${ficheros} en public/fonts/ (${bajadas} nuevas, ${saltados} subconjuntos fuera)`);
console.log(`  css       : src/styles/fuentes.css\n`);
