#!/usr/bin/env node
/**
 * `contenido/blog/*.md` → documentos `blogPost` en Sanity.
 *
 *     node scripts/publica-blog.mjs                  # SECO: dice que haria y no escribe
 *     node scripts/publica-blog.mjs --escribir       # escribe
 *     node scripts/publica-blog.mjs <slug> …         # solo esos
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE EL ARTICULO VIVE EN MARKDOWN Y NO EN SANITY
 *
 * Sanity es la fuente de verdad de lo PUBLICADO —eso no se discute, es el encargo—. Pero un
 * articulo se escribe, se revisa y se corrige, y hacerlo a mano en Portable Text es escribir
 * JSON: un `_key` repetido rompe el documento y una marca mal cerrada desaparece sin avisar.
 *
 * Asi que el borrador vive en Markdown, versionado junto al codigo, y este script lo convierte
 * y lo empuja. El Markdown no es una segunda verdad: es el ORIGEN, y Sanity el destino. Quien
 * edite en el Studio y no aqui vera su cambio sobrescrito en la siguiente publicacion — por eso
 * el script lo dice en pantalla antes de escribir.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE RESUELVE, Y POR QUE NINGUNO SE PUEDE SALTAR
 *
 *   figuras     `{{figura: construction-7}}` → el bloque `image` con su srcset ya derivado por
 *               `build-imagenes-blog.mjs`. Si la escalera no existe, NO publica: un articulo con
 *               un hueco donde va una foto se ve roto y nadie lo mira otra vez.
 *   categoria   slug → referencia a `blogCategory`. Sin ella el articulo no sale en ningun chip.
 *   servicios   slugs → referencias a `service`. El PRIMERO es el primario y es el que decide
 *               en que ficha aparece el articulo.
 *   relacionados slugs → referencias a `blogPost`, incluidos los que aun no existen en el
 *               dataset: el `_id` es determinista, asi que un articulo puede apuntar a su
 *               hermano del mismo lote sin importar cual se publique antes.
 *   fechas      `publishedAt` se CONSERVA si el documento ya existe. Reescribirla cada vez
 *               convertiria cada correccion de una coma en un articulo «nuevo» para Google.
 *               `updatedAt` si se actualiza: es un hecho, esta edicion existio.
 *
 * FALLA CERRADO en todo. Y `mutar()` es seco por defecto.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { leeArticulos } from './lib/articulo.mjs';
import { markdownAPortable } from './lib/markdown-a-portable.mjs';
import { groq, mutar } from './lib/sanity.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESCRIBIR = process.argv.includes('--escribir');
const SOLO = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const IMAGENES = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/imagenes-blog-por-ruta.json'), 'utf8')).rutas;

let fallos = 0;
const mal = (m) => { console.error(`  🔴 ${m}`); fallos++; };

/** `_id` determinista a partir del slug: el mismo articulo cae siempre en el mismo documento,
 *  asi que republicar ACTUALIZA en vez de duplicar, y un hermano puede referenciarlo antes de
 *  que exista. Los 10 heredados conservan su `_id` de Webflow — se busca, no se deriva. */
const idDerivado = (slug) => `blogPost-${crypto.createHash('sha1').update(slug).digest('hex').slice(0, 24)}`;
const clave = (s) => `k${crypto.createHash('sha1').update(s).digest('hex').slice(0, 10)}`;

const existentes = Object.fromEntries(
  (await groq('*[_type=="blogPost"]{ "slug": slug.current, _id, publishedAt }'))
    .map((d) => [d.slug, d]),
);
const categorias = new Set((await groq('*[_type=="blogCategory"].slug.current')));
const servicios = Object.fromEntries(
  (await groq('*[_type=="service"]{ "slug": slug.current, _id }')).map((d) => [d.slug, d._id]),
);

const idDe = (slug) => existentes[slug]?._id ?? idDerivado(slug);

const TODOS = leeArticulos(path.join(RAIZ, 'contenido/blog'));
const ARTICULOS = SOLO.length ? TODOS.filter((a) => SOLO.includes(a.frente.slug)) : TODOS;
if (SOLO.length && ARTICULOS.length !== SOLO.length) {
  const hay = new Set(ARTICULOS.map((a) => a.frente.slug));
  mal(`no existen en contenido/blog/: ${SOLO.filter((s) => !hay.has(s)).join(', ')}`);
}

const AHORA = new Date().toISOString();
const documentos = [];

for (const a of ARTICULOS) {
  const { frente, cuerpo } = a;
  const slug = frente.slug;
  const ruta = `/blogs/${slug}`;
  const ctx = (m) => mal(`${slug}: ${m}`);

  const img = IMAGENES[ruta];
  if (!img) { ctx('no tiene escalera de imagenes. Corre `node scripts/build-imagenes-blog.mjs` antes.'); continue; }
  if (!categorias.has(frente.categoria)) { ctx(`la categoria "${frente.categoria}" no existe en blogCategory`); continue; }

  const refsServicio = [];
  for (const s of frente.servicios) {
    if (!servicios[s]) { ctx(`el servicio "${s}" no existe en Sanity`); continue; }
    refsServicio.push({ _type: 'reference', _ref: servicios[s], _key: clave(`svc:${slug}:${s}`) });
  }
  if (refsServicio.length !== frente.servicios.length) continue;

  /* Las figuras se resuelven POR NOMBRE contra la escalera derivada, no por posicion: si algun
   * dia el cuerpo reordena sus figuras, el articulo sigue siendo correcto. */
  const porRef = Object.fromEntries(img.figuras.map((f) => [f.src.match(/mm-([a-z]+-\d+)-\d+\.webp$/)?.[1] ?? f.src, f]));
  const bloques = [];
  let roto = false;
  for (const b of markdownAPortable(cuerpo, slug)) {
    if (b._type === 'figuraRef') {
      const f = porRef[b.ref];
      if (!f) { ctx(`{{figura: ${b.ref}}} no tiene escalera derivada`); roto = true; break; }
      bloques.push({
        _type: 'image', _key: b._key,
        src: f.src, srcset: f.srcset, sizes: f.sizes, alt: f.alt, ancho: f.ancho, alto: f.alto,
      });
      continue;
    }
    if (b._type === 'tabla') {
      /* Sanity exige `_key` en todo item de array de objetos; sin el, el Studio muestra la
       * tabla vacia y el editor cree que se perdio. */
      bloques.push({ ...b, filas: b.filas.map((f, i) => ({ _key: clave(`${slug}:fila:${i}`), _type: 'fila', celdas: f.celdas })) });
      continue;
    }
    bloques.push(b);
  }
  if (roto) continue;
  if (!bloques.length) { ctx('el cuerpo esta vacio'); continue; }

  const relacionados = (frente.relacionados ?? []).filter((r) => {
    if (r === slug) { ctx('se relaciona consigo mismo'); return false; }
    return true;
  });

  const previo = existentes[slug];
  documentos.push({
    _id: idDe(slug),
    _type: 'blogPost',
    title: frente.title,
    cardTitle: frente.cardTitle,
    slug: { _type: 'slug', current: slug },
    summary: frente.summary,
    blog: bloques,
    portada: {
      src: img.tarjeta.src, srcset: img.tarjeta.srcset, sizes: img.tarjeta.sizes,
      alt: img.tarjeta.alt, ancho: img.tarjeta.ancho, alto: img.tarjeta.alto,
    },
    categoria: { _type: 'reference', _ref: `blogCategory-${frente.categoria}` },
    relatedServices: refsServicio,
    ...(frente.ordenEnServicio ? { ordenEnServicio: frente.ordenEnServicio } : {}),
    ...(relacionados.length
      ? { relatedPosts: relacionados.map((r) => ({ _type: 'reference', _ref: idDe(r), _key: clave(`rel:${slug}:${r}`) })) }
      : {}),
    ...(frente.tags?.length ? { tags: frente.tags } : {}),
    ...(frente.faq?.length
      ? { faq: frente.faq.map((f, i) => ({ _key: clave(`faq:${slug}:${i}`), question: f.question, answer: f.answer })) }
      : {}),
    ...(frente.fuentes?.length
      ? { fuentes: frente.fuentes.map((f, i) => ({ _key: clave(`src:${slug}:${i}`), label: f.label, url: f.url })) }
      : {}),
    searchIntent: frente.searchIntent,
    funnelStage: frente.funnelStage,
    ordenIndice: frente.ordenIndice ?? 100,
    destacadoIndice: frente.destacadoIndice === true,
    feature: false,
    publishedAt: previo?.publishedAt ?? AHORA,
    updatedAt: AHORA,
    seo: { _type: 'seo', title: frente.seo.title, description: frente.seo.description },
  });
}

/* La description tiene que ser UNICA en todo el sitio: `check:medicion` lo exige y no tiene
 * mecanismo de declaracion, asi que una repetida sale roja sin decir por que. */
const vistas = new Map();
for (const d of documentos) {
  const k = d.seo.description.trim().toLowerCase();
  if (vistas.has(k)) mal(`meta description repetida entre "${vistas.get(k)}" y "${d.slug.current}"`);
  vistas.set(k, d.slug.current);
}

const nuevos = documentos.filter((d) => !existentes[d.slug.current]).length;
console.log(`\n  ${documentos.length} articulo(s) · ${nuevos} nuevo(s) · ${documentos.length - nuevos} actualizacion(es)`);
for (const d of documentos) {
  const est = existentes[d.slug.current] ? 'actualiza' : 'CREA     ';
  console.log(`     ${est} /blogs/${d.slug.current}  ${d.blog.length} bloques, ${d.blog.filter((b) => b._type === 'image').length} figuras`);
}

if (fallos) { console.error(`\n  🔴 ROJO — ${fallos} fallo(s). No se escribe nada.\n`); process.exit(1); }
if (!documentos.length) { console.log('\n  nada que publicar\n'); process.exit(0); }

if (!ESCRIBIR) {
  console.log('\n  SECO. Nada se ha escrito. Anade --escribir para publicar.');
  console.log('  Ojo: al publicar, lo editado en el Studio para estos slugs se SOBRESCRIBE.\n');
  process.exit(0);
}

const r = await mutar(documentos.map((d) => ({ createOrReplace: d })), { seco: false });
console.log(`\n  ✅ escritos ${documentos.length} documento(s) en Sanity`, r?.results ? `(${r.results.length} resultados)` : '');
console.log('     ahora: node scripts/build-blogs-rutas.mjs && node scripts/cache-blog-sanity.mjs\n');
