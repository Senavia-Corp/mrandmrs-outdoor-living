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
import HUECO from '../data/fotos-hueco.json';

const IMG = INDICE.imagenes ?? {};
/* E5 (D-155): los AVIF de movil de la foto que pinta el LCP (`build-variantes-imagen.mjs`). */
const LCP = INDICE.lcp ?? {};
/* E5-SEO (punto 6): `width` y `height` de las `<img>` que llegan sin ellos. */
const MEDIDAS = INDICE.medidas ?? {};
const MEDIA_LCP = '(max-width: 767px)';

/* E10 (D-189) · LOS HUECOS QUE RECORTAN. Desde 992 px la foto de seccion va en una caja VERTICAL 4:5 y
 * la del hero en una casi cuadrada, las dos con `object-fit: cover`, y casi todas las fotos son
 * apaisadas. Para cubrir la caja manda el ALTO, pero `sizes` solo sabe decir un ancho: con «42vw» un
 * escritorio de 1440 a densidad 1 elegia la variante de 640 px y la ampliaba al doble (0,5x medido).
 * Dos arreglos, los dos solo desde 992 px (por debajo la caja es apaisada y `100vw` ya dice la verdad):
 *
 *  1 · `sizes` dice el ancho que hace falta de verdad para cubrir: el de la caja por lo que sobra de
 *      foto a los lados, que sale de `width`/`height`. Vale para toda foto en uno de estos huecos.
 *  2 · Si la foto tiene derivadas A LA PROPORCION DEL HUECO (`fotos-hueco.json`, las hace
 *      `scripts/build-fotos-hueco.mjs` desde la foto mayor que haya), van en un `<source>` de
 *      escritorio: mas nitidez donde el fichero servido era un recorte, y menos peso siempre.
 *
 * Las cajas estan medidas con `docs/encargos/referencias/herramientas/build-huecos.mjs`: seccion y
 * resenas, 38vw de ancho y 547 px desde 1440, a 4:5; hero, ~41vw (48vw de 992 a 1199) y hasta 720 px
 * de alto (700 por debajo de 1200); ficha del indice de servicios, 53vw y 765 px desde 1440, a 3:2.
 * Si esas cajas cambian en `sistema.css`, cambian aqui. */
const DESDE = 992;
const FOTOS_HUECO = HUECO.fotos ?? {};
const SIZES_HUECO = {
  lam: (r) => { const k = Math.max(1, 1.25 * r); return `(min-width: 1440px) ${Math.ceil(547 * k)}px, (min-width: ${DESDE}px) ${Math.ceil(38 * k)}vw, 100vw`; },
  hero: (r) => `(min-width: 1200px) max(41vw, ${Math.ceil(720 * r)}px), (min-width: ${DESDE}px) max(48vw, ${Math.ceil(700 * r)}px), 100vw`,
  serv: (r) => { const k = Math.max(1, r / 1.5); return `(min-width: 1440px) ${Math.ceil(765 * k)}px, (min-width: ${DESDE}px) ${Math.ceil(53 * k)}vw, 100vw`; },
};
const attr = (tag, n) => tag.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
function enHueco(tipo, img, antes = '') {
  const w = +attr(img, 'width'), h = +attr(img, 'height');
  if (!(w && h)) return antes ? `<picture>${antes}${img}</picture>` : img;
  const sizes = SIZES_HUECO[tipo](w / h);
  const conSizes = /\ssizes=/.test(img) ? img.replace(/\ssizes="[^"]*"/, ` sizes="${sizes}"`) : img.replace(/<img\b/, `<img sizes="${sizes}"`);
  const d = FOTOS_HUECO[attr(img, 'src')]?.[tipo];
  if (!d?.fuentes?.length) return antes ? `<picture>${antes}${conSizes}</picture>` : conSizes;
  const fuente = `<source type="image/avif" media="(min-width: ${DESDE}px)" srcset="${d.fuentes.map(([a, u]) => `${u} ${a}w`).join(', ')}" sizes="${SIZES_HUECO[tipo](d.ratio).replace(/, 100vw$/, '')}">`;
  return `<picture>${antes}${fuente}${conSizes}</picture>`;
}
/** Las derivadas de escritorio de la foto de un paso: el guion del proceso las pone en la figura fija al cambiar de paso. */
/** La foto de un paso: por debajo de 992 se pinta ella; desde 992 el guion del proceso copia su `srcset` y su `sizes` a
 *  la figura fija (y sus derivadas de escritorio, si las tiene, al `<source>`). Por eso lleva el `sizes` del hueco. */
const pasoConHueco = (tag) => { const w = +attr(tag, 'width'), h = +attr(tag, 'height'); const d = FOTOS_HUECO[attr(tag, 'src')]?.lam;
  const conSizes = w && h && /\ssizes=/.test(tag) ? tag.replace(/\ssizes="[^"]*"/, ` sizes="${SIZES_HUECO.lam(w / h)}"`) : tag;
  return d?.fuentes?.length ? conSizes.replace(/<img\b/, `<img data-mm-hueco="${d.fuentes.map(([a, u]) => `${u} ${a}w`).join(', ')}"`) : conSizes; };

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
  const conHuecos = conLcp
    .replace(/(<figure class="mm-(?:lam|res)-medio[^"]*"[^>]*>)(<img\b[^>]*>)/g, (_, fig, img) => fig + enHueco('lam', img))
    .replace(/(<section class="mm-hero-a">(?:(?!<\/section>)[\s\S])*?<figure class="mm-hero-a-medio"[^>]*>)(?:<picture>(<source\b[^>]*>))?(<img\b[^>]*>)(?:<\/picture>)?/g, (_, antes, movil, img) => antes + enHueco('hero', img, movil ?? ''))
    .replace(/(<div class="mm-serv-medio">)(<img\b[^>]*>)/g, (_, caja, img) => caja + enHueco('serv', img))
    .replace(/<img\b[^>]*\sclass="mm-paso-foto"[^>]*>/g, pasoConHueco);
  return { html: conHuecos, n, lcp };
}
