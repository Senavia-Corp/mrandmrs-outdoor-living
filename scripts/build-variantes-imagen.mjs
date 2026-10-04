#!/usr/bin/env node
/**
 * VARIANTES RESPONSIVE DE LAS IMAGENES GRANDES SIN `srcset` (SEO-REMEDIACION, 4-oct-2026).
 *
 *     node scripts/build-variantes-imagen.mjs           genera lo que falte y reescribe el indice
 *     node scripts/build-variantes-imagen.mjs --check   falla si el indice nombra un fichero que no esta
 *
 * POR QUE. Medido sobre `.vercel/output/static`: 384 imagenes locales de mas de 150 KB y mas de
 * 1000 px de ancho se sirven SIN `srcset` (139 MB de originales), casi todas heredadas de Webflow
 * —1792x1792 a 802 KB en la ficha de Pool Builders, 1950 px en las fichas de servicio—. Un movil
 * de 390 px se las bajaba enteras. En la ficha de Pool Builders, tres de ellas (1,6 MB) competian
 * con el LCP bajo la red estrangulada de Lighthouse.
 *
 * QUE HACE. Para cada una genera `<nombre>-mm640.<ext>` y `<nombre>-mm1024.<ext>` (solo los anchos
 * MENORES que el original; mismo formato, sin metadatos) junto al original, y escribe el indice
 * `src/data/variantes-imagen.json`. `src/lib/srcset-auto.mjs` lo usa al renderizar para añadir
 * `srcset` (variantes + el original como candidato mayor) y `sizes="100vw"`. Con `100vw` el
 * navegador nunca elige algo mas pequeño que el ancho de la pantalla, asi que la calidad nunca
 * baja respecto a hoy; solo deja de bajarse el original donde no hace falta.
 *
 * La lista sale del BUILD (lo que de verdad se sirve), no de una lista a mano. Hace falta un build
 * antes; despues de generar, otro build para que el marcado lo recoja.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const INDICE = path.join(RAIZ, 'src/data/variantes-imagen.json');
const ANCHOS = [640, 1024];
const MIN_BYTES = 150 * 1024;
const MIN_ANCHO = 1000;
const CHECK = process.argv.includes('--check');

const variante = (u, w) => u.replace(/\.(avif|jpe?g|webp)$/i, `-mm${w}.$1`);

if (CHECK) {
  const idx = JSON.parse(fs.readFileSync(INDICE, 'utf8'));
  const faltan = Object.values(idx.imagenes).flatMap((e) => e.variantes.map(([, u]) => u))
    .filter((u) => !fs.existsSync(path.join(RAIZ, 'public', decodeURI(u))));
  if (faltan.length) { console.error(`✗ ${faltan.length} variantes no estan en public/:\n  ${faltan.slice(0, 10).join('\n  ')}`); process.exit(1); }
  console.log(`✓ variantes de imagen: ${Object.keys(idx.imagenes).length} originales, todas sus variantes en disco`);
  process.exit(0);
}

if (!fs.existsSync(ESTATICO)) { console.error('✗ no hay build'); process.exit(1); }
const html = [];
(function recorre(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['_astro', 'images', 'videos', 'fonts'].includes(e.name)) recorre(p); }
    else if (e.name.endsWith('.html')) html.push(p);
  }
})(ESTATICO);

const usadas = new Set();
for (const f of html) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/<img\b[^>]*>/g)) {
    if (/\ssrcset=/.test(m[0])) continue;
    const s = m[0].match(/\ssrc="(\/images\/[^"]+\.(?:avif|jpe?g|webp))"/i);
    if (s && !/-mm\d+\./.test(s[1])) usadas.add(s[1]);
  }
}

const previo = fs.existsSync(INDICE) ? JSON.parse(fs.readFileSync(INDICE, 'utf8')).imagenes : {};
const imagenes = {};
let nuevas = 0;
let bytesOrig = 0;
let bytesVar = 0;
for (const u of [...usadas].sort()) {
  const orig = path.join(RAIZ, 'public', decodeURI(u));
  if (!fs.existsSync(orig)) continue;
  const st = fs.statSync(orig).size;
  if (st < MIN_BYTES) continue;
  const md = await sharp(orig).metadata().catch(() => null);
  if (!md?.width || md.width < MIN_ANCHO) continue;
  const ext = path.extname(orig).slice(1).toLowerCase();
  const vars = [];
  for (const w of ANCHOS.filter((x) => x < md.width)) {
    const vu = variante(u, w);
    const vp = path.join(RAIZ, 'public', decodeURI(vu));
    if (!fs.existsSync(vp)) {
      let s = sharp(orig).rotate().resize({ width: w });
      s = ext === 'avif' ? s.avif({ quality: 55, effort: 4 })
        : ext === 'webp' ? s.webp({ quality: 78 })
          : s.jpeg({ quality: 78, mozjpeg: true });
      await s.toFile(vp);
      nuevas++;
    }
    bytesVar += fs.statSync(vp).size;
    vars.push([w, vu]);
  }
  bytesOrig += st;
  imagenes[u] = { ancho: md.width, variantes: vars };
}

fs.writeFileSync(INDICE, JSON.stringify({
  _lee_esto: 'GENERADO por scripts/build-variantes-imagen.mjs desde el build. Lo lee src/lib/srcset-auto.mjs. No editar a mano.',
  imagenes,
}, null, 1) + '\n');
console.log(`variantes: ${Object.keys(imagenes).length} originales (${(bytesOrig / 1048576).toFixed(1)} MB) · `
  + `${nuevas} ficheros nuevos · variantes ${(bytesVar / 1048576).toFixed(1)} MB en total`);
if (Object.keys(previo).length && Object.keys(previo).some((k) => !imagenes[k])) {
  console.log('  aviso: el indice anterior tenia originales que el build ya no sirve sin srcset');
}
