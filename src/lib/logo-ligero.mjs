/**
 * LA VERSION LIGERA DE UN LOGO DE LA FRANJA DEL HERO (D-132, 12-oct-2026).
 *
 * La franja pinta cada logo a 36 px de alto, y los originales de Webflow llegan a 2637 x 752 y
 * 498 KB: 1,3 MB de logos en la primera pantalla de 141 paginas. `scripts/build-logos-ligeros.mjs`
 * deja junto a cada original un `<nombre>-mmh108.webp` (108 px de alto: 3x) cuando ahorra; aqui
 * se sirve ese si existe. El original no se borra ni deja de usarse en las demas plantillas.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ALTO_LOGO = 108;
export const rutaLigera = (src) => src.replace(/\.(png|jpe?g)$/i, `-mmh${ALTO_LOGO}.webp`);

/** `d` son las medidas del original. Devuelve `{ src, w, h }` del que hay que pintar. */
export function logoLigero(src, d) {
  const u = rutaLigera(src);
  if (u === src || !fs.existsSync(path.join(process.cwd(), 'public', u))) return { src, w: d.w, h: d.h };
  return { src: u, w: Math.round((d.w * ALTO_LOGO) / d.h), h: ALTO_LOGO };
}
