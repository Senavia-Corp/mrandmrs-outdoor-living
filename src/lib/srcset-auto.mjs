/**
 * `srcset` PARA LAS IMAGENES GRANDES QUE NO LO TRAEN (SEO-REMEDIACION, 4-oct-2026).
 *
 * Se aplica en `Base.astro` sobre el HTML ya renderizado. Solo toca `<img>` SIN `srcset` cuyo
 * `src` figure en `src/data/variantes-imagen.json` (lo genera `scripts/build-variantes-imagen.mjs`
 * desde el build: imagenes de mas de 150 KB y 1000 px). Añade las variantes y el ORIGINAL como
 * candidato mayor, con `sizes="100vw"`: el navegador nunca elige menos que el ancho de pantalla,
 * asi que la calidad no baja; un movil deja de bajarse 1792 px para pintar 390.
 * Una imagen que no esta en el indice se queda exactamente como estaba.
 */
import INDICE from '../data/variantes-imagen.json';

const IMG = INDICE.imagenes ?? {};

export function srcsetAuto(html) {
  let n = 0;
  const out = html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/\ssrcset=/.test(tag)) return tag;
    const s = tag.match(/\ssrc="([^"]+)"/);
    const e = s && IMG[s[1]];
    if (!e?.variantes?.length) return tag;
    n++;
    const srcset = [...e.variantes.map(([w, u]) => `${u} ${w}w`), `${s[1]} ${e.ancho}w`].join(', ');
    const sizes = /\ssizes=/.test(tag) ? '' : ' sizes="100vw"';
    return tag.replace(/<img\b/, `<img srcset="${srcset}"${sizes}`);
  });
  return { html: out, n };
}
