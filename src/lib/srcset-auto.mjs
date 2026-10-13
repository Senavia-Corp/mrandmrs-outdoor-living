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
/* E5 (D-155): los AVIF de movil de la foto que pinta el LCP (`build-variantes-imagen.mjs`). */
const LCP = INDICE.lcp ?? {};
/* E5-SEO (punto 6): `width` y `height` de las `<img>` que llegan sin ellos. */
const MEDIDAS = INDICE.medidas ?? {};
const MEDIA_LCP = '(max-width: 767px)';

export function srcsetAuto(html) {
  let n = 0;
  const out = html.replace(/<img\b[^>]*>/g, (tag) => {
    const m0 = !(/\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag)) && MEDIDAS[tag.match(/\ssrc="([^"]+)"/)?.[1]];
    if (m0) tag = tag.replace(/\s(?:width|height)="[^"]*"/g, '').replace(/<img\b/, `<img width="${m0[0]}" height="${m0[1]}"`);
    if (/\ssrcset=/.test(tag)) return tag;
    const s = tag.match(/\ssrc="([^"]+)"/);
    const e = s && IMG[s[1]];
    if (!e?.variantes?.length) return tag;
    n++;
    const srcset = [...e.variantes.map(([w, u]) => `${u} ${w}w`), `${s[1]} ${e.ancho}w`].join(', ');
    const sizes = /\ssizes=/.test(tag) ? '' : ' sizes="100vw"';
    return tag.replace(/<img\b/, `<img srcset="${srcset}"${sizes}`);
  });
  /* LA FOTO DEL LCP. Por debajo de 768 px ocupa el ancho de la pantalla en todas las plantillas, asi
   * que su `<source>` va con `sizes="100vw"`. El `<img>` queda intacto dentro del `<picture>`:
   * respaldo sin AVIF y version de escritorio. La primera de la pagina se devuelve para precargarla. */
  let lcp = null;
  const conLcp = out.replace(/<img\b[^>]*fetchpriority="high"[^>]*>/g, (tag) => {
    const v = LCP[tag.match(/\ssrc="([^"]+)"/)?.[1]];
    if (!v?.length) return tag;
    const srcset = v.map(([w, u]) => `${u} ${w}w`).join(', ');
    lcp ??= { media: MEDIA_LCP, imagesrcset: srcset, imagesizes: '100vw' };
    return `<picture><source type="image/avif" media="${MEDIA_LCP}" srcset="${srcset}" sizes="100vw">${tag}</picture>`;
  });
  return { html: conLcp, n, lcp };
}
