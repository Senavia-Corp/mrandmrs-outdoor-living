#!/usr/bin/env node
/**
 * `src/data/blogs.json` — los 10 posts del carrusel de blog, como DATO.
 *
 *     node scripts/build-blogs.mjs
 *
 * DE DONDE SALEN, Y POR QUE DE AHI. Del `S_BLOG` de `src/pages/index.astro`, que es la
 * seccion de blog de la home: marcado ya localizado (rutas `/images/...`, no el CDN de
 * Webflow), versionado, y en `NO_REGENERAR` — o sea estable.
 *
 * NO se leen de `_source/cms/blogs.csv` aunque parezca lo obvio: ese CSV trae `Title`,
 * `Slug` y `Summary` pero NO trae el `alt` de la foto ni el `srcset`. Reconstruirlos a mano
 * seria inventar dos cosas que ya existen bien resueltas en el marcado de la home, y ademas
 * divergirian de ella al primer cambio.
 *
 * PARA QUE. Las 14 fichas de `services/` montan el mismo carrusel via
 * `components/widgets/CarruselBlog.astro`. Al pasar por un dato en vez de duplicar 15,7 KB de
 * marcado en 14 ficheros:
 *   · el dia que existan categorias es añadir un campo aqui y una prop alli, no regenerar;
 *   · `check-texto.mjs` puede DECLARAR el bloque derivandolo de este fichero, que es lo que
 *     mantiene intacta la barandilla (§1.1: `baseline/text/` no se re-baseliniza nunca).
 *
 * `categoria` se emite SIEMPRE, hoy en `null`. Un campo que aparece despues obliga a tocar
 * todos los consumidores; uno que nace vacio no.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, 'src/pages/index.astro');
const DESTINO = path.join(RAIZ, 'src/data/blogs.json');

const src = fs.readFileSync(ORIGEN, 'utf8');

/* El marcado vive dentro de constantes JS de UNA sola linea con las comillas escapadas.
 * Se desescapa lo justo para poder parsear: `\"` y `\\`. */
const html = src.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const i = html.indexOf('<section class="blog-section-page');
if (i < 0) { console.error('\n  ROJO no encuentro section.blog-section-page en index.astro\n'); process.exit(1); }

const doc = new JSDOM(html.slice(i)).window.document;
const slides = [...doc.querySelectorAll('.fs-slider-blog_slide')];
if (!slides.length) { console.error('\n  ROJO 0 tarjetas en la seccion\n'); process.exit(1); }

const posts = slides.map((s) => {
  const img = s.querySelector('img');
  const a = s.querySelector('a[href]');
  return {
    titulo: s.querySelector('h3')?.textContent.trim() ?? '',
    resumen: s.querySelector('.paragraph-mini')?.textContent.trim() ?? '',
    enlace: a?.getAttribute('href') ?? '',
    cta: a?.textContent.trim() ?? 'Read More',
    imagen: {
      src: img?.getAttribute('src') ?? '',
      srcset: img?.getAttribute('srcset') ?? '',
      sizes: img?.getAttribute('sizes') ?? '',
      alt: img?.getAttribute('alt') ?? '',
    },
    categoria: null,
  };
});

const cabecera = doc.querySelector('.header-blog');
const salida = {
  _lee_esto: [
    'DERIVADO de src/pages/index.astro por scripts/build-blogs.mjs. No editar a mano:',
    'se regenera con `node scripts/build-blogs.mjs` y cualquier cambio manual se pierde.',
    '',
    '`categoria` va en null a proposito. Cuando existan categorias de servicio se rellena',
    'aqui y CarruselBlog.astro filtra por su prop; no hay que tocar el generador de paginas',
    'ni regenerar las 14 fichas.',
  ],
  titulo: cabecera?.querySelector('h2')?.textContent.trim() ?? '',
  entradilla: cabecera?.querySelector('p')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  posts,
};

const malos = posts.filter((p) => !p.titulo || !p.enlace || !p.imagen.src);
if (malos.length) {
  console.error(`\n  ROJO ${malos.length} post(s) sin titulo, enlace o imagen — no se escribe nada\n`);
  process.exit(1);
}

fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1) + '\n');
console.log(`\n  OK ${posts.length} posts -> ${path.relative(RAIZ, DESTINO)}`);
console.log(`     ${posts.filter((p) => p.imagen.srcset).length} con srcset · `
  + `${posts.filter((p) => p.imagen.alt).length} con alt\n`);
