// FUENTE ÚNICA del mapeo columna-CSV → campo-Sanity. La usan gen-schemas.mjs e import.mjs.
//
// Regla que sostiene todo: `mapear()` FALLA si alguna columna del CSV no acaba en ningún sitio.
// Un campo perdido en una migración de CMS no rompe el build: deja un hueco en una página que
// nadie mira hasta que el cliente lo ve. La aserción es lo único que lo impide.
import fs from 'node:fs';
import path from 'node:path';

export const CMS = path.resolve(import.meta.dirname, '../_source/cms');

export function parseCsv(t) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const h = rows.shift();
  return { cols: h, filas: rows.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? '']))) };
}
export const cargar = (col) => parseCsv(fs.readFileSync(path.join(CMS, col + '.csv'), 'utf8'));

// columnas de servicio de Webflow: no son contenido
export const META = new Set(['Collection ID', 'Locale ID', 'Archived', 'Draft', 'Created On', 'Updated On']);

const camel = (s) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
  .replace(/^./, c => c.toLowerCase());

// ─────────────────────────────────────────────────────────────────────────────
// Cada colección: tipo Sanity, si tiene página propia, y las reglas de sus campos.
// `ref` = a qué tipo apunta. `grupo` = columnas repetidas que se pliegan en un array.
// ─────────────────────────────────────────────────────────────────────────────
export const COLECCIONES = {
  'residentials':         { tipo: 'service',          titulo: 'Servicio (residencial)',   ruta: '/services' },
  'commercials':          { tipo: 'commercialService',titulo: 'Servicio comercial',       ruta: null },
  'pool-builders':        { tipo: 'poolBuilder',      titulo: 'Pool Builder (ciudad)',    ruta: '/pool-builders' },
  'countries':            { tipo: 'county',           titulo: 'Condado',                  ruta: '/country' },
  'where-we-serves':      { tipo: 'serviceRegion',    titulo: 'Región de servicio',       ruta: '/where-we-serves' },
  'projects':             { tipo: 'project',          titulo: 'Proyecto',                 ruta: '/project' },
  'blogs':                { tipo: 'blogPost',         titulo: 'Entrada de blog',          ruta: '/blogs' },
  'articles':             { tipo: 'article',          titulo: 'Artículo',                 ruta: '/articles' },
  'subservices':          { tipo: 'subservice',       titulo: 'Subservicio',              ruta: null },
  'procesos':             { tipo: 'processStep',      titulo: 'Paso de proceso',          ruta: null },
  'images':               { tipo: 'galleryImage',     titulo: 'Imagen de galería',        ruta: null },
  'brochures':            { tipo: 'brochure',         titulo: 'Folleto',                  ruta: null },
  'categories-brochures': { tipo: 'brochureCategory', titulo: 'Categoría de folleto',     ruta: null },
  'categories':           { tipo: 'category',         titulo: 'Categoría',                ruta: null },
  'industries':           { tipo: 'industry',         titulo: 'Industria',                ruta: null },
  'logos':                { tipo: 'logo',             titulo: 'Logo',                     ruta: null },
};

// referencias: columna → tipo destino. Derivadas del contenido, no supuestas.
export const REFS = {
  'brochures.Related Service':     'service',
  'brochures.Categories Brochure': 'brochureCategory',
  'countries.Region':              'serviceRegion',
  'images.Service':                'service',
  'pool-builders.Country':         'county',
  'procesos.Service-Reference':    'service',
  'residentials.Categories':       'category',
};
// columnas que son número, no texto
export const NUMEROS = new Set(['procesos.Step-Number', 'procesos.Display-Order']);
// columnas con HTML → Portable Text
export const RICH = new Set(['articles.Body', 'blogs.Blog', 'procesos.Process-Description', 'projects.Services Rendered']);
// columnas SEO → objeto `seo`
export const SEO = {
  'Title SEO': 'title', 'Meta Title': 'title',
  'Meta Descripcion SEO': 'description', 'Metadescription SEO': 'description',
  'Description SEO': 'description', 'Meta Description': 'description',
  'Metadescripcion SEO': 'description',
};
// grupos de columnas repetidas que se pliegan en un array (mismo render, CMS usable)
export const GRUPOS = [
  { col: 'residentials', campo: 'faqs',     patron: /^FAQ (\d)$/,             pares: { question: 'FAQ $1', answer: 'Answer $1' } },
  { col: 'commercials',  campo: 'faqs',     patron: /^FAQ (\d)$/,             pares: { question: 'FAQ $1', answer: 'Paragraph FAQ $1' } },
  { col: 'commercials',  campo: 'features', patron: /^Heading Feature (\d)$/, pares: { heading: 'Heading Feature $1', body: 'Paragraph Feature $1', image: 'Img Feature $1' } },
];

const PREF = /^(seo\s+)?(metadata|metadescription|metadatos|metada)\s*/i;
const canon = (s) => s.toLowerCase().replace(/\bimagen\b/g, 'image').replace(/[^a-z0-9]+/g, '');

/**
 * Devuelve, para una colección: los campos Sanity y de qué columna sale cada uno.
 * LANZA si alguna columna del CSV se queda sin destino.
 */
export function mapear(col) {
  const { cols, filas } = cargar(col);
  const usadas = new Set(META);
  const campos = [];
  const valorNoVacio = (c) => filas.some(f => f[c]);

  // 1. alt: un campo "Metadata X" solo es alt si existe una imagen llamada X
  const metas = cols.filter(c => PREF.test(c));
  const altDe = {};
  for (const c of cols) {
    if (PREF.test(c)) continue;
    const hit = metas.find(m => canon(m.replace(PREF, '').replace(/\bseo\b/gi, '')) === canon(c));
    if (hit) { altDe[c] = hit; usadas.add(hit); }
  }

  // 2. grupos plegados
  for (const g of GRUPOS.filter(g => g.col === col)) {
    const idx = cols.filter(c => g.patron.test(c)).map(c => c.match(g.patron)[1]);
    if (!idx.length) continue;
    const miembros = Object.entries(g.pares);
    for (const n of idx) for (const [, patron] of miembros) usadas.add(patron.replace('$1', n));
    campos.push({ nombre: g.campo, tipo: 'grupo', de: idx.map(n =>
      Object.fromEntries(miembros.map(([k, p]) => [k, p.replace('$1', n)]))) });
  }

  // 3. el resto, columna a columna
  for (const c of cols) {
    if (usadas.has(c)) continue;
    usadas.add(c);
    if (c === 'Item ID')      { campos.push({ nombre: 'legacyId', tipo: 'string', de: c, oculto: true }); continue; }
    if (c === 'Slug')         { campos.push({ nombre: 'slug', tipo: 'slug', de: c }); continue; }
    if (c === 'Published On') { campos.push({ nombre: 'publishedAt', tipo: 'datetime', de: c }); continue; }
    if (SEO[c])               { campos.push({ nombre: 'seo.' + SEO[c], tipo: 'string', de: c }); continue; }
    if (!valorNoVacio(c))     { campos.push({ nombre: camel(c), tipo: 'vacia', de: c }); continue; }
    const clave = `${col}.${c}`;
    const v = filas.find(f => f[c])[c];
    if (REFS[clave])                     campos.push({ nombre: camel(c), tipo: 'reference', ref: REFS[clave], multi: filas.some(f => f[c]?.includes(';')), de: c });
    else if (NUMEROS.has(clave))         campos.push({ nombre: camel(c), tipo: 'number', de: c });
    else if (RICH.has(clave))            campos.push({ nombre: camel(c), tipo: 'blockContent', de: c });
    else if (/^https?:/.test(v)) {
      const esPdf = /\.pdf(\?|$)/i.test(v.split(';')[0]);
      campos.push({ nombre: camel(c), tipo: esPdf ? 'file' : 'image', multi: filas.some(f => f[c]?.includes(';')), de: c, alt: altDe[c] || null });
    }
    else if (/^(true|false)$/.test(v))   campos.push({ nombre: camel(c), tipo: 'boolean', de: c });
    else                                 campos.push({ nombre: camel(c), tipo: filas.some(f => (f[c] || '').length > 200) ? 'text' : 'string', de: c });
  }

  const sinDestino = cols.filter(c => !usadas.has(c));
  if (sinDestino.length) throw new Error(`[${col}] columnas sin destino: ${sinDestino.join(', ')}`);
  return { ...COLECCIONES[col], col, campos, filas, cols };
}
