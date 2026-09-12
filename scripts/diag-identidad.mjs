#!/usr/bin/env node
/**
 * DIAGNOSTICO (no es una puerta) — QUE PAGINAS CAMBIAN entre dos construcciones.
 *
 *     node scripts/diag-identidad.mjs --guarda  antes.json     # antes de tocar nada
 *     …cambios + npm run build…
 *     node scripts/diag-identidad.mjs --compara antes.json     # que se movio
 *
 * Este repo promete que al tocar UNA ruta las otras 121 salen byte a byte iguales. Esa promesa
 * se comprueba, no se supone (`PROMPT-R19.md` §4.bis), y hasta ahora no habia comando que la
 * comprobara: se miraba el diff del codigo, que es justo lo que no basta -un selector
 * compartido no se ve en el diff de la hoja, se ve en la salida-.
 *
 * SE NORMALIZA EL HASH DEL BUNDLE. Astro renombra `/_astro/Base.<hash>.css` en cuanto cambia
 * una hoja, asi que un cambio de CSS legitimo moveria las 122 paginas y ahogaria la senal.
 * El encargo admite expresamente que cambie ese hash. Se sustituye por un marcador antes de
 * resumir, de modo que lo que quede sea el cambio de MARCADO, que es lo que importa.
 * Los hashes que aparezcan se listan aparte: un cambio de bundle inesperado tambien es noticia.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

const argv = process.argv.slice(2);
const iG = argv.indexOf('--guarda');
const iC = argv.indexOf('--compara');
if (iG < 0 && iC < 0) {
  console.error('\n  uso: node scripts/diag-identidad.mjs --guarda <fichero.json>'
    + '\n       node scripts/diag-identidad.mjs --compara <fichero.json>\n');
  process.exit(1);
}

if (!fs.existsSync(ESTATICO)) {
  console.error(`\n  no existe ${ESTATICO}. Construye primero.\n`);
  process.exit(1);
}

/** Todas las paginas construidas, en rutas relativas al estatico. */
function html(dir = ESTATICO, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) html(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ESTATICO, p));
  }
  return acc;
}

const RE_HASH = /\/_astro\/([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{8})\.(css|js)/g;

function resume(rel) {
  const txt = fs.readFileSync(path.join(ESTATICO, rel), 'utf8');
  const bundles = new Set();
  const normal = txt.replace(RE_HASH, (_, nombre, hash, ext) => {
    bundles.add(`${nombre}.${ext}=${hash}`);
    return `/_astro/${nombre}.<HASH>.${ext}`;
  });
  return {
    sha: crypto.createHash('sha256').update(normal).digest('hex'),
    bytes: txt.length,
    bundles: [...bundles].sort(),
  };
}

const paginas = html().sort();
const mapa = Object.fromEntries(paginas.map((p) => [p, resume(p)]));

if (iG >= 0) {
  const dest = argv[iG + 1];
  fs.writeFileSync(dest, JSON.stringify(mapa, null, 1));
  console.log(`\n  guardadas ${paginas.length} paginas en ${dest}\n`);
  process.exit(0);
}

const ref = JSON.parse(fs.readFileSync(argv[iC + 1], 'utf8'));
const antes = Object.keys(ref), ahora = Object.keys(mapa);
const nuevas = ahora.filter((p) => !ref[p]);
const idas = antes.filter((p) => !mapa[p]);
const movidas = ahora.filter((p) => ref[p] && ref[p].sha !== mapa[p].sha);

console.log(`\n═══ IDENTIDAD · ${antes.length} -> ${ahora.length} paginas`);
for (const p of nuevas) console.log(`    NUEVA     /${p}`);
for (const p of idas)   console.log(`    BORRADA   /${p}`);
for (const p of movidas) {
  const d = mapa[p].bytes - ref[p].bytes;
  console.log(`    CAMBIA    /${p}   ${d >= 0 ? '+' : ''}${d} B`);
}
const bundlesAntes = new Set(antes.flatMap((p) => ref[p].bundles));
const bundlesAhora = new Set(ahora.flatMap((p) => mapa[p].bundles));
const bDif = [...bundlesAhora].filter((b) => !bundlesAntes.has(b));
if (bDif.length) {
  console.log(`\n    bundles con hash nuevo (admitido por el encargo): ${bDif.join(' ')}`);
}
const quietas = ahora.length - movidas.length - nuevas.length;
console.log(`\n    ${movidas.length} cambian · ${nuevas.length} nuevas · ${idas.length} borradas`
  + ` · ${quietas} identicas byte a byte\n`);
process.exit(movidas.length || nuevas.length || idas.length ? 0 : 0);
