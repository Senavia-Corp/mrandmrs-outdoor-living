#!/usr/bin/env node
/**
 * VERSIONES LIGERAS DE LOS LOGOS DE LA FRANJA DEL HERO (D-132). Ver `src/lib/logo-ligero.mjs`.
 *
 *     node scripts/build-logos-ligeros.mjs
 *
 * Para cada logo de `public/images/logos/` de mas de 108 px de alto escribe a su lado
 * `<nombre>-mmh108.webp` (misma imagen, 108 px de alto, con su transparencia). Solo se queda la
 * que pesa menos de la mitad que el original; si no ahorra, no se escribe y la franja sigue
 * pintando el original. No borra ni toca ningun original. Se puede correr las veces que haga falta.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ALTO_LOGO, rutaLigera } from '../src/lib/logo-ligero.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'public/images/logos');
let antes = 0, despues = 0, n = 0;
for (const e of fs.readdirSync(DIR, { recursive: true })) {
  const f = path.join(DIR, e);
  if (!/\.(png|jpe?g)$/i.test(f) || !fs.statSync(f).isFile()) continue;
  const md = await sharp(f).metadata();
  if (!md.height || md.height <= ALTO_LOGO) continue;
  const sale = rutaLigera(f);
  const buf = await sharp(f).resize({ height: ALTO_LOGO }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
  const orig = fs.statSync(f).size;
  if (buf.length > orig / 2) { if (fs.existsSync(sale)) fs.rmSync(sale); console.log(`  igual  ${e} (${Math.round(orig / 1024)} KB; la ligera no ahorra la mitad)`); continue; }
  fs.writeFileSync(sale, buf);
  antes += orig; despues += buf.length; n++;
  console.log(`  ligera ${e}: ${Math.round(orig / 1024)} KB -> ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log(`\n${n} logos con version ligera: ${Math.round(antes / 1024)} KB -> ${Math.round(despues / 1024)} KB`);
