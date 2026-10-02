#!/usr/bin/env node
/**
 * Las miniaturas de las tarjetas de categoria de `/gallery`.
 *
 *     node scripts/build-galeria-portadas.mjs
 *
 * Las tarjetas miden ~250 px de ancho y van ARRIBA de `/gallery`: servirles la foto de
 * 1600 px del banco serian diez descargas de galeria para pintar diez sellos. Se derivan a
 * 640x427 (3:2, el doble del ancho pintado) desde la `portada` de cada categoria de
 * `src/data/galeria-categorias.json`. Si cambia una portada, se vuelve a correr.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CATEGORIAS, portadaDe } from '../src/lib/galeria-categorias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');

for (const c of CATEGORIAS) {
  const origen = path.join(RAIZ, 'public', c.portada);
  const destino = path.join(RAIZ, 'public', portadaDe(c));
  if (!fs.existsSync(origen)) {
    console.error(`\n  ROJO ${c.slug}: no existe la portada ${c.portada}\n`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await sharp(origen).resize(640, 427, { fit: 'cover' }).webp({ quality: 72 }).toFile(destino);
  console.log(`  ${portadaDe(c)}  ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
}
