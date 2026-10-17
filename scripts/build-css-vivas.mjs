#!/usr/bin/env node
/**
 * LAS CLASES DE `webflow.css` QUE EL SITIO TODAVIA USA (E5, D-154). Lo lee `build-css.mjs` para podar.
 *
 *     node scripts/build-css-vivas.mjs       (con un build hecho; despues `npm run css` y otro build)
 *
 * POR QUE. Con el rediseño, las secciones de Webflow salieron de las 234 rutas, pero su hoja se
 * seguia sirviendo entera: 167 KB de los que mas del 80 % no podia casar con nada. Y es CSS que
 * bloquea el pintado.
 *
 * QUE CUENTA COMO «EN USO». Una clase que aparece en un atributo `class` del HTML construido, o
 * como palabra en el JavaScript que el sitio sirve —los `<script>` en linea y los ficheros de
 * `_astro/`—, que es de donde salen las que se ponen en marcha (`w--open`, `is-active`…). Es
 * deliberadamente generoso: una regla que se queda sin motivo pesa unos bytes; una que se va y
 * hacia falta rompe un estado que ninguna captura estatica ensena.
 *
 * Solo se guardan las clases que la hoja de origen nombra: el fichero queda en unas centenas de
 * lineas y su diff dice exactamente que selector ha dejado de usarse.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const ORIGEN = path.join(RAIZ, '_source/webflow-css');
const DESTINO = path.join(RAIZ, 'src/data/css-clases-vivas.json');

if (!fs.existsSync(path.join(ESTATICO, 'index.html'))) { console.error('✗ no hay build: `npm run build` primero'); process.exit(1); }

const enHtml = new Set();
const enJs = new Set();
let paginas = 0;
(function recorre(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['images', 'videos', 'fonts'].includes(e.name)) recorre(p); continue; }
    if (e.name.endsWith('.html')) {
      paginas++;
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/\sclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) enHtml.add(c);
      for (const m of t.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) for (const w of m[1].matchAll(/[A-Za-z_][\w-]*/g)) enJs.add(w[0]);
    } else if (e.name.endsWith('.js')) {
      for (const w of fs.readFileSync(p, 'utf8').matchAll(/[A-Za-z_][\w-]*/g)) enJs.add(w[0]);
    }
  }
})(ESTATICO);

const fuentes = fs.readdirSync(ORIGEN).filter((f) => f.endsWith('.css'));
if (fuentes.length !== 1) throw new Error(`se esperaba 1 css en _source/webflow-css, hay ${fuentes.length}`);
const deLaHoja = new Set([...fs.readFileSync(path.join(ORIGEN, fuentes[0]), 'utf8').matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
const vivas = [...deLaHoja].filter((c) => enHtml.has(c) || enJs.has(c)).sort();

fs.writeFileSync(DESTINO, JSON.stringify({
  _lee_esto: 'DERIVADO por scripts/build-css-vivas.mjs desde el build. Lo lee scripts/build-css.mjs para podar webflow.css. No editar a mano.',
  clases: vivas,
}, null, 1) + '\n');
console.log(`css-clases-vivas: ${paginas} paginas · la hoja de origen nombra ${deLaHoja.size} clases · ${vivas.length} siguen en uso `
  + `(${vivas.filter((c) => enHtml.has(c)).length} en el HTML, ${vivas.filter((c) => !enHtml.has(c)).length} solo en el JavaScript)`);
