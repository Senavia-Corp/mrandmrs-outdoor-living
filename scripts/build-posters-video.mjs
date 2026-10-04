/**
 * POSTERS DE LOS VÍDEOS DE FONDO — la imagen que pinta el LCP en lugar del vídeo.
 *
 * Por qué existe (SEO-REMEDIACIÓN, 4-oct-2026): el héroe de la home autorreproducía un MP4 de
 * 7,07 MB sin `poster` ni `preload`, y Lighthouse móvil medía el LCP en ese `<video>`: 10,5 s en
 * local (11,7 s en el informe de producción). El póster solo existía como `background-image`
 * en línea del `<video>`, sin prioridad y sin variantes.
 *
 * Origen: los tres `bg-video*-poster.0000000.jpg` que Webflow sacó del primer fotograma de cada
 * vídeo. Son EXACTAMENTE el fotograma con el que arranca el vídeo, así que el cambio póster →
 * vídeo en escritorio no salta. No se extrae otro fotograma: elegir uno «más bonito» sería
 * cambiar el diseño, y eso no es de este encargo.
 *
 * Salida en `public/images/site/posters/`:
 *   <nombre>-<ancho>.{avif,webp}     escritorio, 16:9 (o el formato del original), 640/960/1280
 *   <nombre>-m-<ancho>.{avif,webp}   móvil: recorte CENTRAL vertical 9:16 a resolución nativa.
 *     El vídeo en un móvil vertical se ve con `object-fit: cover` centrado, o sea exactamente
 *     ese recorte; servir el 16:9 entero obligaría a bajar 1280 px para pintar ~400 de ancho.
 *
 * Determinista: misma entrada, mismos bytes. `--check` falla si falta algún derivado.
 *   node scripts/build-posters-video.mjs [--check]
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const RAIZ = new URL('..', import.meta.url).pathname;
const ORIGEN = join(RAIZ, 'public/images/site');
const DESTINO = join(ORIGEN, 'posters');

import { POSTERS, ANCHOS, anchoMovil } from '../src/lib/video-fondo.mjs';

const CHECK = process.argv.includes('--check');
mkdirSync(DESTINO, { recursive: true });
const faltan = [];

for (const [nombre, { fichero, heroe }] of Object.entries(POSTERS)) {
  const src = join(ORIGEN, fichero);
  const { width, height } = await sharp(src).metadata();
  const trabajos = [];
  for (const w of ANCHOS.filter((a) => a <= width)) {
    trabajos.push({ out: `${nombre}-${w}`, fn: (s) => s.resize({ width: w }) });
  }
  // Recorte central 9:16 a resolución nativa, SOLO para los héroes (a 390 px el héroe mide
  // 390×761: vertical). La sección 3D es un bloque apaisado también en móvil (342×192).
  const mw = anchoMovil(height);
  if (heroe) trabajos.push({
    out: `${nombre}-m-${mw}`,
    fn: (s) => s.extract({ left: Math.round((width - mw) / 2), top: 0, width: mw, height }),
  });
  for (const t of trabajos) {
    for (const [ext, opts] of [['avif', { quality: 55, effort: 6 }], ['webp', { quality: 78, effort: 6 }]]) {
      const ruta = join(DESTINO, `${t.out}.${ext}`);
      if (CHECK) { if (!existsSync(ruta)) faltan.push(ruta); continue; }
      const info = await t.fn(sharp(src))[ext](opts).toFile(ruta);
      console.log(`  ${t.out}.${ext}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
    }
  }
}

if (CHECK) {
  if (faltan.length) { console.error(`✗ faltan ${faltan.length} posters:\n  ${faltan.join('\n  ')}`); process.exit(1); }
  console.log('✓ posters de vídeo completos');
}
