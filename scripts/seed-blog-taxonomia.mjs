#!/usr/bin/env node
/**
 * BLOG-SANITY · siembra la taxonomia editorial (`blogCategory`).
 *
 *     node scripts/seed-blog-taxonomia.mjs              SECO: dice que haria y no escribe
 *     node scripts/seed-blog-taxonomia.mjs --escribir   aplica
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE UN TIPO NUEVO Y NO EL `category` QUE YA HABIA
 *
 * `category` son las 3 que vinieron del Webflow -Outdoor Living, Patio Cover, Pool Solutions- y
 * las referencian los 14 documentos `service`. `ServiciosPorCategoria.astro:62-67` agrupa la
 * rejilla de subservicios leyendo esos slugs, con `defecto="pool-spa"`. Reutilizarla para el
 * blog cambiaria lo que esa rejilla agrupa en 14 fichas, que no es de este encargo.
 *
 * Conviven dos, y cada una manda en lo suyo. Esto va dicho en el informe.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SON 12 Y NO LAS 11 DEL ENCARGO. LA DOCE LA PIDE EL CONTENIDO QUE YA EXISTE
 *
 * Las 11 del encargo estan pensadas para homeowners. Pero dos de los 10 articulos heredados
 * -`commercial-pool-construction-...` y `residential-vs-commercial-...`- hablan a decisores
 * comerciales, y el sitio tiene ademas `/industry-solutions` y 3 documentos `commercialService`.
 * Meterlos en «New Pool Construction» haria que un homeowner que filtra por esa categoria se
 * encuentre un articulo sobre hoteles y multifamiliares.
 *
 * O sea: la doce no es una categoria especulativa, es contenido que YA esta publicado y hoy no
 * tiene donde caer. «No crear 30 categorias innecesarias» sigue respetado.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL ORDEN NO ES ALFABETICO: ES EL DEL DINERO
 *
 * Los chips se leen de izquierda a derecha y los primeros se pulsan mas. Van primero los dos
 * servicios con obra fotografiada real y mayor ticket -construccion y remodelacion-, y al final
 * las transversales. `orden` es explicito justamente para que no lo decida Sanity.
 */
import { groq, mutar, SIN_BORRADORES } from './lib/sanity.mjs';

const ESCRIBIR = process.argv.includes('--escribir');

/** `_id` estable derivado del slug: re-sembrar ACTUALIZA, nunca duplica. */
const idDe = (slug) => `blogCategory-${slug}`;

const CATEGORIAS = [
  ['new-pool-construction', 'New Pool Construction', 0,
    'Planning, budgeting and building a new custom pool in Florida.'],
  ['pool-remodeling', 'Pool Remodeling', 1,
    'Bringing an existing pool back to life, and deciding how far to go.'],
  ['pool-design-planning', 'Pool Design & Planning', 2,
    'The design decisions that make a pool look custom instead of standard.'],
  ['pergolas-louvered-roofs', 'Pergolas & Louvered Roofs', 3,
    'Shade structures, from fixed pergolas to motorized louvered roofs.'],
  ['outdoor-kitchens', 'Outdoor Kitchens', 4,
    'Layout, appliances and materials for cooking outdoors in Florida.'],
  ['screens-enclosures', 'Screens & Enclosures', 5,
    'Pool cages, screen rooms and motorized screens, and when each one fits.'],
  ['decks', 'Decks', 6,
    'Materials, layout and permits for custom decks that survive Florida weather.'],
  ['landscaping-irrigation', 'Landscaping & Irrigation', 7,
    'Planting, drainage and watering, planned together instead of one after the other.'],
  ['outdoor-living', 'Outdoor Living', 8,
    'Furniture, comfort and making a backyard feel like a room you use.'],
  ['structures-lighting', 'Structures & Lighting', 9,
    'Steel buildings, pole barns and permanent exterior lighting.'],
  ['florida-homeowner-guides', 'Florida Homeowner Guides', 10,
    'Permits, code, contracts and the questions worth asking before you sign.'],
  ['commercial-multifamily', 'Commercial & Multifamily', 11,
    'Pool projects for hotels, HOAs, multifamily and community properties.'],
];

const docs = CATEGORIAS.map(([slug, name, orden, description]) => ({
  _id: idDe(slug),
  _type: 'blogCategory',
  name,
  slug: { _type: 'slug', current: slug },
  orden,
  description,
}));

const main = async () => {
  const antes = await groq(`*[_type == "blogCategory" && ${SIN_BORRADORES}]{"s": slug.current}`);
  console.log(`\n  blogCategory en el dataset AHORA: ${antes.length}`);
  console.log(`  a sembrar: ${docs.length}\n`);
  for (const d of docs) console.log(`    ${String(d.orden).padStart(2)}  ${d.slug.current.padEnd(28)} ${d.name}`);
  console.log('');

  const res = await mutar(docs.map((d) => ({ createOrReplace: d })), { seco: !ESCRIBIR });

  if (!res.seco) {
    const despues = await groq(`*[_type == "blogCategory" && ${SIN_BORRADORES}] | order(orden asc){"s": slug.current, orden}`);
    console.log(`\n  VERIFICACION: ${despues.length} blogCategory en el dataset`);
    if (despues.length !== docs.length) {
      console.error(`  ROJO: se esperaban ${docs.length} y hay ${despues.length}`);
      process.exit(1);
    }
    const ordenes = despues.map((d) => d.orden);
    if (new Set(ordenes).size !== ordenes.length) {
      console.error('  ROJO: hay ordenes repetidos, los chips saldrian en orden indefinido');
      process.exit(1);
    }
    console.log('  VERDE: 12 categorias, ordenes unicos y consecutivos\n');
  }
};

main().catch((e) => { console.error('\n  ROJO', e.message, '\n'); process.exit(1); });
