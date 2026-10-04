/**
 * VÍDEOS DE FONDO: el póster pinta el LCP y el vídeo llega después, solo en escritorio.
 *
 * SEO-REMEDIACIÓN, 4-oct-2026. Medido en local sobre `.vercel/output/static` con Lighthouse 13
 * (móvil): Performance 59, LCP 10,5 s, 17,7 MB transferidos en `/`. El LCP era el `<video>` del
 * héroe: Webflow lo dejó con `autoplay`, sin `preload` y sin `poster`, así que el navegador
 * bajaba los 7,07 MB del MP4 para pintar el primer fotograma. Y la sección 3D, muy por debajo
 * del pliegue, bajaba otros 6,34 MB nada más cargar. Igual en las 55 de zona y las 65 con 3D.
 *
 * Decisión de Sebastian (4-oct-2026): en el móvil, SOLO póster. En escritorio, póster primero
 * y el vídeo cuando la página ya ha cargado.
 *
 * Qué hace la transformación con cada `div.w-background-video` del HTML ya renderizado:
 *   · inserta un `<picture>` + `<img class="mm-video-poster">` con AVIF/WebP y `srcset`. En
 *     los héroes lleva `fetchpriority="high"` (y la página precarga la misma imagen, ver
 *     `Base.astro`); en la 3D, `loading="lazy"`.
 *   · el `<video>` pierde `autoplay` y el `background-image` en línea (descargaba el mismo
 *     fotograma otra vez), gana `preload="none"`, y su `<source>` pasa a `data-src`: sin `src`
 *     no hay petición. Las dos fuentes se conservan en su orden y con `type` (MP4 primero, WebM
 *     de reserva para un navegador sin H.264): el navegador elige una sin bajar la otra.
 *   · el `<noscript>` con el póster de reserva sobra: el póster ahora es una imagen de verdad.
 *   · el botón de pausa nace `hidden`; lo destapa el cargador cuando hay vídeo que pausar.
 *
 * El cargador vive en `Interacciones.astro` (§5). El CSS, en `src/styles/video-fondo.css`.
 *
 * 🚨 El `<img>` va DENTRO de `.w-background-video` y con el mismo `z-index:-100` que el vídeo,
 * DELANTE de él en el DOM: el vídeo, cuando llega, pinta encima. No se toca el apilamiento de
 * la sección (R9-HERO-CONTEXTO §2: el vídeo solo se ve porque escapa a la raíz).
 */

/** nombre → { póster de Webflow, ancho y alto del fotograma, ¿héroe? }. Lo lee también
 *  `scripts/build-posters-video.mjs`, que genera los derivados en `/images/site/posters/`. */
export const POSTERS = {
  'bg-video-1': { fichero: 'bg-video-1-poster.0000000.jpg', w: 1280, h: 720, heroe: true }, // home
  'bg-video': { fichero: 'bg-video-poster.0000000.jpg', w: 1280, h: 534, heroe: true }, // 55 de zona
  'bg-video-3d': { fichero: 'bg-video-3d-poster.0000000.jpg', w: 1280, h: 720, heroe: false }, // 3D
};
export const ANCHOS = [640, 960, 1280];
/** Ancho del recorte móvil 9:16 a resolución nativa (no se escala hacia arriba). */
export const anchoMovil = (h) => Math.round((h * 9) / 16);

const DIR = '/images/site/posters';
const srcset = (n, ext) => ANCHOS.map((w) => `${DIR}/${n}-${w}.${ext} ${w}w`).join(', ');

/**
 * `sizes` de un héroe a sangre: con `object-fit: cover` el ancho pintado es el del viewport
 * mientras el viewport sea MÁS apaisado que el fotograma; si es más alto, manda la altura
 * (≈100vh × proporción). Sin esto, a 768×644 el navegador elegía 960 px para pintar 1145.
 */
const sizesHeroe = ({ w, h }) =>
  `(max-aspect-ratio: ${w}/${h}) ${Math.round((w / h) * 100)}vh, 100vw`;
/** La 3D es un bloque dentro del contenedor: 342 px a 390, 704 a 768, 1250 a 1440 (medido). */
const SIZES_3D = '(max-width: 991px) 92vw, 1250px';

/** Atributos de la imagen que el héroe precarga en el `<head>` (misma URL que pinta). */
export function precargaPoster(nombre) {
  const p = POSTERS[nombre];
  const m = anchoMovil(p.h);
  return [
    { media: '(max-width: 767px)', imagesrcset: `${DIR}/${nombre}-m-${m}.avif ${m}w`, imagesizes: '100vw' },
    { media: '(min-width: 768px)', imagesrcset: srcset(nombre, 'avif'), imagesizes: sizesHeroe(p) },
  ];
}

function picture(nombre) {
  const p = POSTERS[nombre];
  const fuentes = [];
  if (p.heroe) {
    const m = anchoMovil(p.h);
    fuentes.push(`<source media="(max-width: 767px)" type="image/avif" srcset="${DIR}/${nombre}-m-${m}.avif ${m}w" sizes="100vw">`);
    fuentes.push(`<source media="(max-width: 767px)" type="image/webp" srcset="${DIR}/${nombre}-m-${m}.webp ${m}w" sizes="100vw">`);
  }
  const sizes = p.heroe ? sizesHeroe(p) : SIZES_3D;
  fuentes.push(`<source type="image/avif" srcset="${srcset(nombre, 'avif')}" sizes="${sizes}">`);
  // El del heroe es el LCP: sin `decoding="async"`, que puede retrasar su primer pintado.
  const carga = p.heroe ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture class="mm-video-poster-marco">${fuentes.join('')}`
    + `<img class="mm-video-poster" src="${DIR}/${nombre}-1280.webp" srcset="${srcset(nombre, 'webp')}" sizes="${sizes}"`
    + ` width="${p.w}" height="${p.h}" alt="" ${carga}></picture>`;
}

/* El `<noscript>` y el boton de pausa son OPCIONALES: los heroes de las 55 de zona no los traen
 * (medido en el build: solo `<video>` con sus dos `<source>`). */
const RE_BLOQUE = /(<div data-poster-url="\/images\/site\/([a-z0-9-]+)-poster\.0000000\.jpg"[^>]*class="[^"]*w-background-video[^"]*"[^>]*>)(<video[^>]*>)((?:<source[^>]*>)+)<\/video>(?:<noscript>[\s\S]*?<\/noscript>)?(<div aria-live="polite">)?/g;

/**
 * Transforma el HTML de una página. Devuelve `{ html, heroe }`: `heroe` es el nombre del
 * póster del primer vídeo de héroe (para la precarga del `<head>`) o `null`.
 */
export function videoFondo(html) {
  let heroe = null;
  const out = html.replace(RE_BLOQUE, (todo, div, nombre, video, fuentes, control) => {
    const p = POSTERS[nombre];
    if (!p) return todo; // un vídeo que no conocemos se queda como estaba: falla abierto
    if (p.heroe && !heroe) heroe = nombre;
    const v = video
      .replace(/\sautoplay=""/, '')
      .replace(/\sstyle="background-image:url\([^)]*\)"/, '')
      .replace(/<video/, '<video preload="none" data-mm-video="' + (p.heroe ? 'heroe' : 'diferido') + '"');
    // Las dos fuentes, en su orden, con `type` para que el navegador elija sin descargar: el MP4
    // primero (lo reproducen todos los que llevan H.264) y el WebM de reserva (Chromium sin
    // codecs propietarios). Ninguna se pide hasta que el cargador copia `data-src` a `src`.
    const src = [...fuentes.matchAll(/<source src="([^"]+)"[^>]*>/g)]
      .map(([, u]) => `<source data-src="${u}" type="video/${u.endsWith('.webm') ? 'webm' : 'mp4'}">`).join('');
    return `${div}${picture(nombre)}${v}${src}</video>${control ? '<div aria-live="polite" hidden>' : ''}`;
  });
  return { html: out, heroe };
}
