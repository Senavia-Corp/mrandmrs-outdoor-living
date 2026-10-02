/**
 * SEO-SAFE (1-oct-2026) — LA CACHE DEL BLOG, DERIVADA EN LOCAL DE LO EMITIDO.
 *
 * `cache-blog-sanity.mjs` escribe `src/data/blogs-sanity.json` consultando Sanity con
 * `CONSULTA_BLOG`. Desde una maquina sin red hacia `*.sanity.io` eso no es posible, y sin cache
 * al dia `check:seo` compara contra un indice viejo y `MM_SANITY_CACHE=1` construye articulos
 * viejos. Aqui se reproduce la PROYECCION de `CONSULTA_BLOG` sobre los documentos que emitio
 * `publica-blog.mjs --emitir`, fusionados con la cache anterior:
 *
 *   · `categoria`  -> { slug, name, orden }       de src/data/sanity-ids.json
 *   · `servicios`  -> [{ slug, name }]            de src/data/sanity-ids.json, en el orden del doc
 *   · `relacionados` -> [{ slug, title, cardTitle, summary, portada }]  resueltos contra el conjunto
 *   · los campos opcionales ausentes salen `null`, como los devuelve GROQ
 *   · orden por slug ascendente, como `| order(slug asc)`
 *
 * Es una copia DERIVADA y lo dice: en cuanto haya red, `node scripts/cache-blog-sanity.mjs`
 * la reescribe desde el CMS vivo y las dos tienen que coincidir. Si no coinciden, lo que esta
 * mal es lo que se empujo por el MCP, no esta proyeccion.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');

const CAMPOS = ['_id', 'title', 'cardTitle', 'titlePage', 'summary', 'blog', 'portada', 'seo', 'faq', 'fuentes',
  'publishedAt', 'updatedAt', 'ordenIndice', 'destacadoIndice', 'ordenEnServicio', 'tags'];

export function proyectaLocal(emitidos, cacheAnterior) {
  const IDS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/sanity-ids.json'), 'utf8'));
  const porId = new Map(cacheAnterior.map((d) => [d._id, d]));
  const crudos = new Map(); // _id -> doc emitido (para resolver relacionados con datos nuevos)
  for (const d of emitidos) crudos.set(d._id, d);

  const resumen = (id) => {
    const e = crudos.get(id);
    if (e) return { slug: e.slug.current, title: e.title, cardTitle: e.cardTitle ?? null, summary: e.summary, portada: e.portada };
    const c = porId.get(id);
    if (c) return { slug: c.slug, title: c.title, cardTitle: c.cardTitle ?? null, summary: c.summary, portada: c.portada };
    throw new Error(`cache-local: relatedPosts apunta a ${id}, que no esta ni en lo emitido ni en la cache`);
  };

  for (const d of emitidos) {
    const catSlug = d.categoria._ref.replace(/^blogCategory-/, '');
    const cat = IDS.categorias[catSlug];
    if (!cat) throw new Error(`cache-local: categoria ${catSlug} no esta en sanity-ids.json`);
    const porIdServicio = Object.fromEntries(Object.entries(IDS.servicios).map(([s, v]) => [v._id, { slug: s, name: v.name }]));
    const servicios = (d.relatedServices ?? []).map((r) => {
      const s = porIdServicio[r._ref];
      if (!s) throw new Error(`cache-local: servicio ${r._ref} no esta en sanity-ids.json`);
      return s;
    });
    const doc = { ...Object.fromEntries(CAMPOS.map((k) => [k, d[k] === undefined ? null : d[k]])) };
    doc.slug = d.slug.current;
    doc.categoria = { slug: catSlug, name: cat.name, orden: cat.orden };
    doc.servicios = servicios;
    doc.relacionados = (d.relatedPosts ?? []).length ? d.relatedPosts.map((r) => resumen(r._ref)) : null;
    porId.set(d._id, doc);
  }
  /* Y los que ya estaban y RELACIONAN a uno emitido ven su tarjeta nueva (titulo, resumen, portada). */
  for (const c of porId.values()) {
    if (!Array.isArray(c.relacionados)) continue;
    c.relacionados = c.relacionados.map((r) => {
      const nuevo = [...crudos.values()].find((e) => e.slug.current === r.slug);
      return nuevo ? { slug: r.slug, title: nuevo.title, cardTitle: nuevo.cardTitle ?? null, summary: nuevo.summary, portada: nuevo.portada } : r;
    });
  }
  return [...porId.values()].map(canon).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/**
 * COMO LO DEVUELVE GROQ, no como lo emite el script: claves en orden alfabetico en cada objeto
 * y `marks: []` en todo span que no lleve marcas. Sin esto `blogs-sanity.json` cambiaria de forma
 * sin cambiar de contenido y `check:seo` (que deriva de el) veria un diff que no existe.
 */
export function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = { ...v };
    if (o._type === 'span' && !Array.isArray(o.marks)) o.marks = [];
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])]));
  }
  return v;
}
