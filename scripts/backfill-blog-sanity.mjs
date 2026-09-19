#!/usr/bin/env node
/**
 * BLOG-SANITY · lleva a Sanity todo lo que el blog ya tenia publicado pero el CMS no sabia.
 *
 *     node scripts/backfill-blog-sanity.mjs              SECO
 *     node scripts/backfill-blog-sanity.mjs --escribir   aplica
 *
 * Se corre UNA vez. Es idempotente (usa `patch`, no `createOrReplace`: el cuerpo es editorial y
 * no se pisa), pero re-correrlo sobreescribiria ediciones hechas en el Studio sobre los campos
 * que toca. Lo que hace, y de donde sale cada dato -NINGUNO se inventa-:
 *
 *   publishedAt / updatedAt   del `datePublished`/`dateModified` que el sitio YA SIRVE en su
 *                             JSON-LD (`src/pages/blogs/*.astro`, campo SEO). O sea: el dato ya
 *                             era publico; lo que faltaba era que Sanity lo supiera. Cero bytes
 *                             cambian en produccion por esto.
 *   portada                   de `src/data/imagenes-blog-por-ruta.json`, que emite
 *                             `build-imagenes-blog.mjs` (R22-BLOG-IMG). Son las fotos REALES que
 *                             sustituyeron a las 8 generadas por IA. Si esto no se trajera, la
 *                             migracion RESUCITARIA las imagenes de IA que R22 quito.
 *   3 figuras en `blog`       del mismo fichero, insertadas en las MISMAS posiciones que calcula
 *                             `figurasBlog()` en `build-paginas.mjs:650`: tras el primer h2,
 *                             tras el h2 central, y ANTES del ultimo (el de la FAQ).
 *   relatedPosts              del raíl «Most Read Articles» que ya sirve cada ficha, EN SU ORDEN
 *                             y TAL CUAL — incluidos los 7 articulos que se enlazan A SI MISMOS.
 *                             No se arregla aqui a proposito: este paso es una migracion fiel y
 *                             tiene que poder demostrar 0 bytes de diferencia. El defecto pasa a
 *                             ser CONTENIDO, y se arregla como contenido en el paso editorial.
 *   categoria / relatedServices  asignacion editorial. Es lo unico de aqui que es un juicio, y
 *                             por eso va en una tabla legible con el motivo al lado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { groq, mutar, SIN_BORRADORES } from './lib/sanity.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESCRIBIR = process.argv.includes('--escribir');

/* ── LA ASIGNACION EDITORIAL ──────────────────────────────────────────────────
 *
 * `categoria` es la primaria: la que agrupa el chip de /blogs-tips.
 * `servicios` va en orden: EL PRIMERO manda el CTA y decide en que ficha aparece.
 * `orden` es el del indice, y no es alfabetico: primero lo que decide una compra.
 */
const EDITORIAL = {
  'complete-guide-to-pool-construction-in-florida-costs-timeline-process': {
    categoria: 'new-pool-construction', orden: 0, destacado: true,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'la guia mas completa (131 bloques) y la intencion de mayor valor: coste + plazo + proceso',
  },
  'what-permits-are-required-for-pool-construction-in-florida': {
    categoria: 'new-pool-construction', orden: 1,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'permisos: la pregunta que para un proyecto antes de empezarlo',
  },
  'pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish': {
    categoria: 'new-pool-construction', orden: 2,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'plazos: la segunda pregunta de todo homeowner tras el precio',
  },
  'common-pool-construction-mistakes-we-see-in-florida': {
    categoria: 'new-pool-construction', orden: 3,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'errores: contenido de confianza, no de producto',
  },
  'new-pool-construction-vs-pool-remodeling-which-is-right-for-you': {
    categoria: 'pool-remodeling', orden: 4,
    servicios: ['pool-remodeling-renovation-in-north-south-florida',
      'custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'la pregunta la hace quien YA tiene piscina, asi que el servicio primario es remodelacion',
  },
  'top-10-luxury-pool-designs-for-florida-homes': {
    categoria: 'pool-design-planning', orden: 5,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'diseño, no construccion: se lee antes de decidir la forma, no el presupuesto',
  },
  'outdoor-living-design-guide-for-florida-homes': {
    categoria: 'outdoor-living', orden: 6,
    servicios: ['custom-outdoor-kitchens-for-north-south-florida-homes',
      'custom-aluminum-pergola-builders-in-north-south-florida',
      'patio-screen-rooms-enclosures-in-north-south-florida'],
    motivo: 'transversal; el primario es cocina exterior, que es lo que mas pesa en el texto y en las 4 fotos que le puso R22',
  },
  'how-outdoor-living-spaces-increase-property-value-in-florida': {
    categoria: 'outdoor-living', orden: 7,
    servicios: ['custom-deck-builders-in-north-south-florida',
      'custom-aluminum-pergola-builders-in-north-south-florida',
      'custom-outdoor-kitchens-for-north-south-florida-homes'],
    motivo: 'articulo de ROI; entra por deck y pergola, que es lo que ilustran sus fotos',
  },
  'commercial-pool-construction-in-florida-what-decision-makers-must-know': {
    categoria: 'commercial-multifamily', orden: 8,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'no habla a homeowners: por eso existe la categoria 12 y no cae en New Pool Construction',
  },
  'residential-vs-commercial-pool-construction-in-florida': {
    categoria: 'commercial-multifamily', orden: 9,
    servicios: ['custom-pool-spa-builders-in-north-south-florida'],
    motivo: 'idem: el eje del articulo es residencial contra comercial',
  },
};

const IMG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/imagenes-blog-por-ruta.json'), 'utf8')).rutas;

/** Las fechas que el sitio YA publica, leidas del `const SEO` de cada `.astro`. */
function fechasServidas(slug) {
  const f = path.join(RAIZ, 'src/pages/blogs', `${slug}.astro`);
  const m = fs.readFileSync(f, 'utf8').match(/^const SEO = (\{.*\});$/m);
  if (!m) throw new Error(`${slug}: no encuentro el const SEO`);
  const b = (JSON.parse(m[1]).jsonLd ?? []).find((x) => x['@type'] === 'BlogPosting');
  if (!b?.datePublished) throw new Error(`${slug}: el BlogPosting no trae datePublished`);
  return { publishedAt: b.datePublished, updatedAt: b.dateModified ?? b.datePublished };
}

/** El raíl «Most Read Articles» tal y como se sirve hoy, en su orden. */
function railServido(slug) {
  const f = path.join(RAIZ, '_source/vivo', `blogs_${slug}.html`);
  const rail = new JSDOM(fs.readFileSync(f, 'utf8')).window.document.querySelector('.cms-blogs-block');
  if (!rail) throw new Error(`${slug}: sin raíl`);
  const vistos = new Set();
  const orden = [];
  for (const a of rail.querySelectorAll('a[href^="/blogs/"]')) {
    const s = a.getAttribute('href').replace('/blogs/', '').replace(/[?#].*$/, '');
    if (!vistos.has(s)) { vistos.add(s); orden.push(s); }
  }
  return orden;
}

/** `_key` determinista, del estilo de `import.mjs:24`: re-correr no cambia las claves. */
const clave = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return `fig${Math.abs(h).toString(36)}`;
};

/**
 * Mete las 3 figuras donde las mete `figurasBlog()`. Se resuelven los TRES anclajes sobre el
 * array ORIGINAL antes de insertar nada: calcularlos sobre la marcha correria los indices y la
 * tercera figura acabaria en otro sitio.
 */
function conFiguras(bloquesEntrada, figuras, slug) {
  /* IDEMPOTENCIA. Sin esto, re-correr el backfill insertaria OTRAS tres figuras sobre las que
   * ya estan y el articulo acabaria con seis. Se limpian primero las que hubiera. */
  const bloques = bloquesEntrada.filter((b) => b._type !== 'image');
  const h2 = bloques.filter((b) => b._type === 'block' && b.style === 'h2');
  if (h2.length < 3) throw new Error(`${slug}: ${h2.length} h2, hacen falta 3 para repartir`);
  const anclas = [h2[0], h2[Math.floor((h2.length - 1) / 2)], h2[h2.length - 1]];
  const bloque = (f, i) => ({
    _type: 'image', _key: clave(`${slug}:${i}:${f.src}`),
    src: f.src, srcset: f.srcset, sizes: f.sizes, alt: f.alt, ancho: f.ancho, alto: f.alto,
  });
  const salida = [];
  for (const b of bloques) {
    /* La tercera va ANTES de su ancla (el h2 de la FAQ); las otras dos, detras del suyo. */
    if (b === anclas[2]) salida.push(bloque(figuras[2], 2));
    salida.push(b);
    if (b === anclas[0]) salida.push(bloque(figuras[0], 0));
    if (b === anclas[1] && anclas[1] !== anclas[0]) salida.push(bloque(figuras[1], 1));
  }
  return salida;
}

const main = async () => {
  const [posts, servicios, categorias] = await Promise.all([
    groq(`*[_type == "blogPost" && ${SIN_BORRADORES}]{_id, "slug": slug.current, blog}`),
    groq(`*[_type == "service" && ${SIN_BORRADORES}]{_id, "slug": slug.current}`),
    groq(`*[_type == "blogCategory" && ${SIN_BORRADORES}]{_id, "slug": slug.current}`),
  ]);
  const idServicio = Object.fromEntries(servicios.map((s) => [s.slug, s._id]));
  const idCategoria = Object.fromEntries(categorias.map((c) => [c.slug, c._id]));
  const idPost = Object.fromEntries(posts.map((p) => [p.slug, p._id]));

  const faltan = Object.keys(EDITORIAL).filter((s) => !idPost[s]);
  if (faltan.length) throw new Error(`no estan en el dataset: ${faltan.join(', ')}`);
  if (posts.length !== Object.keys(EDITORIAL).length) {
    throw new Error(`hay ${posts.length} blogPost y ${Object.keys(EDITORIAL).length} asignados: `
      + 'la tabla editorial tiene que cubrirlos TODOS o alguno se quedaria sin categoria');
  }

  const mutaciones = [];
  console.log('');
  for (const p of posts.sort((a, b) => EDITORIAL[a.slug].orden - EDITORIAL[b.slug].orden)) {
    const e = EDITORIAL[p.slug];
    const img = IMG[`/blogs/${p.slug}`];
    if (!img) throw new Error(`${p.slug}: sin entrada en imagenes-blog-por-ruta.json`);
    if (!idCategoria[e.categoria]) throw new Error(`${p.slug}: categoria ${e.categoria} no existe`);

    const fechas = fechasServidas(p.slug);
    const rail = railServido(p.slug);
    const set = {
      ...fechas,
      portada: {
        src: img.tarjeta.src, srcset: img.tarjeta.srcset, sizes: img.tarjeta.sizes,
        alt: img.tarjeta.alt, ancho: img.tarjeta.ancho, alto: img.tarjeta.alto,
      },
      categoria: { _type: 'reference', _ref: idCategoria[e.categoria] },
      relatedServices: e.servicios.map((s, i) => {
        if (!idServicio[s]) throw new Error(`${p.slug}: servicio ${s} no existe`);
        return { _type: 'reference', _ref: idServicio[s], _key: `svc${i}` };
      }),
      relatedPosts: rail.map((s, i) => {
        if (!idPost[s]) throw new Error(`${p.slug}: el raíl apunta a ${s}, que no existe`);
        return { _type: 'reference', _ref: idPost[s], _key: `rel${i}` };
      }),
      ordenIndice: e.orden,
      destacadoIndice: Boolean(e.destacado),
      blog: conFiguras(p.blog, img.figuras, p.slug),
    };
    mutaciones.push({ patch: { id: p._id, set } });

    const propio = rail.includes(p.slug) ? ' · SE ENLAZA A SI MISMO (se conserva, se arregla despues)' : '';
    console.log(`  ${String(e.orden).padStart(2)} ${p.slug.slice(0, 56).padEnd(58)}`);
    console.log(`     ${e.categoria} · ${e.servicios.length} servicio(s) · ${set.blog.length} bloques `
      + `(+3 figuras) · raíl ${rail.length}${propio}`);
    console.log(`     ${fechas.publishedAt.slice(0, 10)} pub · ${fechas.updatedAt.slice(0, 10)} mod`
      + `${fechas.updatedAt < fechas.publishedAt ? '  <<< INVERTIDA, tal cual la sirve hoy' : ''}`);
    if (e.destacado) console.log('     DESTACADO DEL INDICE');
  }
  console.log('');

  const dest = posts.filter((p) => EDITORIAL[p.slug].destacado);
  if (dest.length !== 1) throw new Error(`${dest.length} destacados: tiene que haber exactamente 1`);

  await mutar(mutaciones, { seco: !ESCRIBIR });

  if (ESCRIBIR) {
    const v = await groq(`{"conCategoria": count(*[_type=="blogPost" && defined(categoria)]),`
      + `"conPortada": count(*[_type=="blogPost" && defined(portada)]),`
      + `"conFecha": count(*[_type=="blogPost" && defined(publishedAt)]),`
      + `"conServicios": count(*[_type=="blogPost" && count(relatedServices) > 0]),`
      + `"destacados": count(*[_type=="blogPost" && destacadoIndice == true]),`
      + `"conFiguras": count(*[_type=="blogPost" && count(blog[_type=="image"]) == 3])}`);
    console.log(`\n  VERIFICACION sobre el dataset:`);
    for (const [k, n] of Object.entries(v)) console.log(`    ${k.padEnd(14)} ${n}`);
    const malo = v.conCategoria !== 10 || v.conPortada !== 10 || v.conFecha !== 10
      || v.conServicios !== 10 || v.destacados !== 1 || v.conFiguras !== 10;
    if (malo) { console.error('\n  ROJO: el dataset no quedo como se esperaba\n'); process.exit(1); }
    console.log('  VERDE\n');
  }
};

main().catch((e) => { console.error('\n  ROJO', e.message, '\n'); process.exit(1); });
