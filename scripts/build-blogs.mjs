#!/usr/bin/env node
/**
 * `src/data/blogs.json` — el carrusel de blog, como DATO. AHORA DESDE SANITY.
 *
 *     node scripts/build-blogs.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE CAMBIO Y POR QUE (BLOG-SANITY)
 *
 * Antes esto RASPABA `src/pages/index.astro` con JSDOM: buscaba `section.blog-section-page`,
 * desescapaba las comillas de la constante JS y leia las 10 tarjetas del marcado. Funcionaba,
 * pero era la «lista paralela hardcoded» que la regla critica del encargo manda eliminar: el
 * contenido del blog vivia en el marcado de la home, no en el CMS.
 *
 * Ahora sale de Sanity, que es la unica fuente de verdad del sistema editorial.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS 10 DEL CARRUSEL GENERICO SE DECLARAN, Y NO ES PEREZA
 *
 * Este fichero lo consumen **79 rutas**: la home, las 14 fichas de `/services/`, los 9 condados,
 * las 2 de Estado y las 53 ciudades. Sebastian acoto el cambio de carrusel A LAS 14 FICHAS
 * (decision del 18-sep-2026), asi que las otras 65 tienen que salir BYTE A BYTE IGUALES.
 *
 * Si esto emitiera «todos los blogPost», el dia que entren los articulos nuevos esas 65 rutas
 * pasarian de 10 tarjetas a 100 sin que nadie lo hubiera pedido — y `check:texto` lo cazaria,
 * pero despues de haberlo construido y desplegado.
 *
 * Por eso el carrusel generico es una lista ENUMERADA de slugs, en su orden actual, con su
 * motivo. Cuando otro encargo quiera cambiarlo, se cambia aqui y se ve en el diff.
 *
 * ⚠️ EL `cta` LLEVA EL TITULO DENTRO, Y ES UN DEFECTO QUE SE CONSERVA A PROPOSITO.
 *
 * Hoy en produccion cada enlace del carrusel dice, VISIBLE:
 *     «Read More: How Outdoor Living Spaces Increase Property Value in Florida»
 * mas un `<span class="mm-sr">` que REPITE el titulo, mas un `aria-label` que lo repite OTRA
 * vez. El titulo sale tres veces. Paso porque este script scrapeaba `a.textContent` DESPUES de
 * que se anadiera el `mm-sr` al marcado de la home, asi que se trago el span.
 *
 * NO se arregla aqui: cambiar `cta` a «Read More» mueve el texto visible de las 79 rutas, y
 * este encargo esta acotado a 14. El arreglo es una linea -`cta: 'Read More'`- y queda dicho
 * en el informe para que Sebastian lo acote cuando quiera.
 */
import fs from 'node:fs';
import path from 'node:path';
import { groq } from './lib/sanity.mjs';
import { CONSULTA_BLOG } from '../src/lib/blog-groq.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'src/data/blogs.json');

/**
 * EL CARRUSEL GENERICO: los 10 de siempre, en el orden de siempre.
 * Es el orden que tenia el marcado de la home, del que salio este fichero. Se enumera para que
 * las 65 rutas que Sebastian dejo fuera del encargo no se muevan.
 */
const GENERICO = [
  'how-outdoor-living-spaces-increase-property-value-in-florida',
  'outdoor-living-design-guide-for-florida-homes',
  'what-permits-are-required-for-pool-construction-in-florida',
  'common-pool-construction-mistakes-we-see-in-florida',
  'pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish',
  'residential-vs-commercial-pool-construction-in-florida',
  'new-pool-construction-vs-pool-remodeling-which-is-right-for-you',
  'commercial-pool-construction-in-florida-what-decision-makers-must-know',
  'complete-guide-to-pool-construction-in-florida-costs-timeline-process',
  'top-10-luxury-pool-designs-for-florida-homes',
];

/** El encabezado de la seccion. Estaba en el marcado de la home; ahora se declara aqui. */
const TITULO = 'Luxury Outdoor Living & Pool Design Insights in Florida';
const ENTRADILLA = 'Explore expert insights, guides, and tips on pool construction, spa design, '
  + 'and outdoor living design build Florida tailored for Florida homes.';

const docs = await groq(CONSULTA_BLOG);
const porSlug = new Map(docs.map((d) => [d.slug, d]));

const faltan = GENERICO.filter((s) => !porSlug.has(s));
if (faltan.length) {
  console.error(`\n  ROJO ${faltan.length} slug(s) del carrusel generico no estan en Sanity:`);
  for (const s of faltan) console.error(`       ${s}`);
  console.error('  No se escribe nada: 79 rutas se quedarian sin esa tarjeta.\n');
  process.exit(1);
}

const posts = GENERICO.map((slug) => {
  const d = porSlug.get(slug);
  const titulo = d.cardTitle?.trim() ? d.cardTitle.trim() : d.title;
  return {
    titulo,
    resumen: d.summary,
    enlace: `/blogs/${slug}`,
    /* Ver el aviso de la cabecera: el titulo dentro del `cta` es un defecto conservado. */
    cta: `Read More: ${titulo}`,
    imagen: {
      src: d.portada.src,
      srcset: d.portada.srcset,
      sizes: d.portada.sizes,
      alt: d.portada.alt,
    },
    categoria: d.categoria?.slug ?? null,
  };
});

const salida = {
  _lee_esto: [
    'DERIVADO de SANITY por scripts/build-blogs.mjs. No editar a mano:',
    'se regenera con `node scripts/build-blogs.mjs` y cualquier cambio manual se pierde.',
    '',
    'Estos 10 son el carrusel GENERICO, el que sale en 79 rutas. La lista esta enumerada en',
    'la cabecera del script con su motivo: Sebastian acoto el cambio de carrusel a las 14',
    'fichas de /services/, asi que las otras 65 no se mueven.',
    '',
    '`cta` lleva el titulo dentro y es un defecto conservado a proposito. Ver el script.',
  ],
  titulo: TITULO,
  entradilla: ENTRADILLA,
  posts,
};

const malos = posts.filter((p) => !p.titulo || !p.enlace || !p.imagen.src);
if (malos.length) {
  console.error(`\n  ROJO ${malos.length} post(s) sin titulo, enlace o imagen — no se escribe nada\n`);
  process.exit(1);
}

fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1) + '\n');
console.log(`\n  OK ${posts.length} posts -> ${path.relative(RAIZ, DESTINO)}   (fuente: Sanity)`);
console.log(`     ${posts.filter((p) => p.imagen.srcset).length} con srcset · `
  + `${posts.filter((p) => p.imagen.alt).length} con alt · `
  + `${posts.filter((p) => p.categoria).length} con categoria\n`);
