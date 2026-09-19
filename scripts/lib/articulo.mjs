/**
 * `contenido/blog/<slug>.md` — LEER UN ARTICULO Y NEGARSE SI NO ESTA COMPLETO.
 *
 * Lo usan los DOS extremos del pipeline y por eso vive aqui: `build-imagenes-blog.mjs` para
 * fundir las escaleras de imagen, y `publica-blog.mjs` para escribir el documento en Sanity.
 * Si cada uno parseara su propio frontmatter, el dia que discreparan el fallo saldria como una
 * imagen que no existe en una pagina publicada — tarde y lejos de la causa.
 *
 * FORMATO
 *
 *     ---
 *     { …JSON… }
 *     ---
 *
 *     Cuerpo en Markdown.
 *
 * El frontmatter es JSON y no YAML a proposito: `JSON.parse` falla con numero de caracter ante
 * una coma de mas, mientras que YAML se traga una indentacion torcida y devuelve otra cosa.
 * Aqui un `alt` que silenciosamente se convierta en `null` es una imagen sin texto alternativo
 * publicada.
 *
 * FALLA CERRADO. Cualquier campo obligatorio ausente LANZA con el fichero y el campo puestos.
 * La regla de la casa es que la ausencia de senal no es senal buena.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Campos sin los cuales el articulo no puede publicarse, con lo que significa cada uno. */
const OBLIGATORIOS = {
  slug: 'la URL bajo /blogs/. Cambiarla despues obliga a un 301',
  title: 'el H1, que es el que trabaja para la busqueda',
  cardTitle: 'el titular corto de la tarjeta (<= 70 car.)',
  categoria: 'slug de blogCategory — de el sale el chip de /blogs-tips',
  servicios: 'array de slugs de /services/; el PRIMERO es el servicio primario',
  searchIntent: 'informational | commercial | transactional | local',
  funnelStage: 'awareness | consideration | decision',
  summary: 'el extracto de la tarjeta',
  seo: '{ title, description }',
  portada: '{ ref, alt } — ref del banco de /gallery',
  relacionados: 'slugs de 2-3 articulos hermanos. NINGUN BLOG HUERFANO: sin esto no se publica',
};

const INTENCIONES = ['informational', 'commercial', 'transactional', 'local'];
const ETAPAS = ['awareness', 'consideration', 'decision'];

export function leeArticulo(fichero) {
  const bruto = fs.readFileSync(fichero, 'utf8').replace(/\r/g, '');
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(fichero)}: no tiene frontmatter ---…--- al principio`);

  let frente;
  try {
    frente = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`${path.basename(fichero)}: el frontmatter no es JSON valido — ${e.message}`);
  }

  for (const [campo, para] of Object.entries(OBLIGATORIOS)) {
    if (frente[campo] === undefined || frente[campo] === null || frente[campo] === '') {
      throw new Error(`${path.basename(fichero)}: falta \`${campo}\` — ${para}`);
    }
  }

  const esperado = path.basename(fichero, '.md');
  if (frente.slug !== esperado) {
    throw new Error(`${path.basename(fichero)}: el slug del frontmatter es "${frente.slug}" y el del fichero "${esperado}". Deben coincidir: de ahi sale la URL.`);
  }
  if (!Array.isArray(frente.servicios) || frente.servicios.length === 0) {
    throw new Error(`${esperado}: \`servicios\` tiene que ser un array con al menos el servicio primario`);
  }
  if (!INTENCIONES.includes(frente.searchIntent)) {
    throw new Error(`${esperado}: searchIntent "${frente.searchIntent}" no esta en ${INTENCIONES.join(' | ')}`);
  }
  if (!ETAPAS.includes(frente.funnelStage)) {
    throw new Error(`${esperado}: funnelStage "${frente.funnelStage}" no esta en ${ETAPAS.join(' | ')}`);
  }
  if (!frente.portada?.ref || !frente.portada?.alt) {
    throw new Error(`${esperado}: \`portada\` necesita { ref, alt }. Un alt vacio es una imagen invisible para quien no ve.`);
  }
  if (frente.cardTitle.length > 70) {
    throw new Error(`${esperado}: cardTitle de ${frente.cardTitle.length} caracteres; el maximo del esquema es 70`);
  }
  if (!frente.seo?.title || !frente.seo?.description) {
    throw new Error(`${esperado}: \`seo\` necesita { title, description }; check:seo exige las dos no vacias`);
  }

  if (!Array.isArray(frente.relacionados) || frente.relacionados.length < 2) {
    throw new Error(`${esperado}: \`relacionados\` necesita al menos 2 slugs hermanos. Un articulo al que no llega nadie no lo lee nadie.`);
  }
  if (frente.relacionados.includes(frente.slug)) {
    throw new Error(`${esperado}: se relaciona consigo mismo`);
  }

  const figuras = frente.figuras ?? [];
  for (const [i, f] of figuras.entries()) {
    if (!f?.ref || !f?.alt) throw new Error(`${esperado}: figuras[${i}] necesita { ref, alt }`);
  }

  /* Toda figura invocada en el cuerpo tiene que estar declarada, y al reves. Una `{{figura:}}`
   * sin declarar deja un hueco en la pagina; una declarada sin usar deriva un webp que nadie
   * sirve. Las dos son errores silenciosos si no se comprueban aqui. */
  const cuerpo = m[2];
  const usadas = [...cuerpo.matchAll(/\{\{\s*figura:\s*([a-z0-9-]+)\s*\}\}/gi)].map((x) => x[1]);
  const declaradas = new Set(figuras.map((f) => f.ref));
  for (const u of usadas) {
    if (!declaradas.has(u)) throw new Error(`${esperado}: el cuerpo usa {{figura: ${u}}} pero no esta en \`figuras\``);
  }
  for (const d of declaradas) {
    if (!usadas.includes(d)) throw new Error(`${esperado}: \`figuras\` declara "${d}" y el cuerpo no la usa`);
  }

  return { frente, cuerpo, fichero, figuras, usadas };
}

/** Todos los articulos de `contenido/blog/`, ordenados por slug para que la salida sea estable. */
export function leeArticulos(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => leeArticulo(path.join(dir, f)));
}
