/**
 * CACHE DE `poolBuilder` PARA CONSTRUIR SIN RED.
 *
 * POR QUE EXISTE. `src/pages/pool-builders/[slug].astro` pide los 53 documentos a
 * `m273z6jc.api.sanity.io` dentro de `getStaticPaths`, y falla CERRADO a proposito: sin datos no
 * se construye media coleccion, porque 53 URLs que desaparecen en silencio son 53 404 con el
 * despliegue en verde. Esa guarda es correcta y NO se toca.
 *
 * Pero hay entornos donde Sanity no se alcanza y aun asi hay que construir -por ejemplo un
 * contenedor con politica de egress cerrada-. Para eso esta esta cache: un volcado de los mismos
 * documentos a `src/data/pool-builders-sanity.json`, que `[slug].astro` usa SOLO si se le pide
 * explicitamente con `MM_SANITY_CACHE=1`. Sin esa variable el comportamiento es identico al de
 * siempre. Asi la cache nunca puede enmascarar una caida real de Sanity.
 *
 * DOS FUENTES, Y LA DE VERDAD ES SANITY:
 *   node scripts/cache-sanity.mjs              ← lo normal: consulta Sanity y vuelca
 *   node scripts/cache-sanity.mjs --desde-csv  ← sin red: deriva de `_source/cms/pool-builders.csv`
 *
 * El CSV es el export de Webflow que `scripts/import.mjs` cargo en Sanity, asi que deriva de el
 * los mismos valores. El mapeo columna→campo no se inventa aqui: es el `camel()` de
 * `scripts/schema-map.mjs:30` y la tabla `SEO` de `:71`, y esta comprobado campo a campo contra
 * el documento real de `alachua-florida`. La prueba de que la derivacion es fiel no es esta
 * cabecera: es `check:texto` sobre `/pool-builders/`, que compara el innerText construido contra
 * `baseline/text/`. Si la cache mintiera, las 53 saldrian rojas.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'src/data/pool-builders-sanity.json');
const DESDE_CSV = process.argv.includes('--desde-csv');

// `camel()` de schema-map.mjs:30-31, copiado a proposito: este script tiene que poder correr
// aunque el mapa cambie, y un cambio alli debe salir en el diff de aqui, no colarse en silencio.
const camel = (s) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
  .replace(/^./, (c) => c.toLowerCase());

/** Las columnas de imagen y su columna de `alt`, tal y como las pliega schema-map.mjs:97-103. */
const IMAGENES = [
  ['Imagen Intro 1', 'Metadata Imagen Intro 1'],
  ['Imagen Intro 2', 'Metadata Imagen Intro 2'],
  ['Imagen Intro 3', 'Metadata Imagen Intro 3'],
];
/** Columnas que se pliegan en el objeto `seo` (schema-map.mjs:71-76). */
const SEO = { 'Meta Title': 'title', 'Meta Description': 'description' };
/** Columnas que no son contenido: no viajan al documento. */
const ADMIN = new Set(['Collection ID', 'Locale ID', 'Item ID', 'Archived', 'Draft',
  'Created On', 'Updated On', 'Published On', 'Country', 'Slug']);

function leerCsv(texto) {
  const filas = []; let campo = ''; let fila = []; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = filas.shift();
  return filas.filter((f) => f.some((v) => v !== ''))
    .map((f) => Object.fromEntries(cab.map((c, i) => [c, f[i] ?? ''])));
}

function desdeCsv() {
  const csv = leerCsv(fs.readFileSync(path.join(RAIZ, '_source/cms/pool-builders.csv'), 'utf8'));
  const altDe = new Map(IMAGENES.map(([img, meta]) => [meta, camel(img)]));
  return csv.map((f) => {
    const doc = { _type: 'poolBuilder', slug: f['Slug'] };
    for (const [col, val] of Object.entries(f)) {
      if (ADMIN.has(col)) continue;
      if (SEO[col]) { (doc.seo ??= { _type: 'seo' })[SEO[col]] = val; continue; }
      if (altDe.has(col)) { (doc[altDe.get(col)] ??= { _type: 'image' }).alt = val; continue; }
      if (IMAGENES.some(([img]) => img === col)) continue;  // el src lo cablea la plantilla
      doc[camel(col)] = val;
    }
    return doc;
  });
}

async function desdeSanity() {
  const PID = process.env.PUBLIC_SANITY_PROJECT_ID ?? 'm273z6jc';
  const DS = process.env.PUBLIC_SANITY_DATASET ?? 'production';
  // La MISMA consulta que `[slug].astro`, para que la cache y el build vean lo mismo.
  const q = '*[_type=="poolBuilder" && defined(slug.current)]{..., "slug": slug.current}';
  const r = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent(q)}`);
  const { result, error } = await r.json();
  if (error || !result?.length) throw new Error('Sanity no devolvio poolBuilder: ' + JSON.stringify(error ?? 'vacio'));
  return result;
}

const docs = DESDE_CSV ? desdeCsv() : await desdeSanity();
if (docs.length !== 53) {
  console.error(`<<< SE ESPERABAN 53 poolBuilder, hay ${docs.length}. No se escribe la cache.`);
  process.exit(1);
}
docs.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(SALIDA, JSON.stringify(docs, null, 2) + '\n');
console.log(`cache escrita: ${path.relative(RAIZ, SALIDA)} · ${docs.length} documentos · fuente: ${DESDE_CSV ? 'CSV de _source/cms' : 'Sanity'}`);
if (DESDE_CSV) console.log('   OJO: derivada del CSV porque no habia red hacia Sanity. Verificar con check:texto sobre /pool-builders/.');
