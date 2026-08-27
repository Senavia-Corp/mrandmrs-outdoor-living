// FASE 3 — construye los documentos de Sanity desde los CSV y (con token) los sube.
//
//   node scripts/import.mjs --dry-run    valida todo SIN tocar la red   ← por defecto seguro
//   SANITY_WRITE_TOKEN=... node scripts/import.mjs
//
// Invariantes:
//  1. `_id` derivado del Item ID de Webflow -> re-ejecutar ACTUALIZA, no duplica.
//  2. `_key` de Portable Text DETERMINISTA (sha1 de slug:índice). Regenerar sin tocar texto
//     es un no-op byte a byte; si el diff sale enorme, es que algo se rompió.
//  3. Las imágenes AVIF se suben desde `sanityMaster` (JPEG): Sanity no procesa AVIF.
//  4. Orden topológico: un documento no se escribe antes que aquello a lo que referencia.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { htmlToBlocks } from '@portabletext/block-tools';
import { Schema } from '@sanity/schema';
import { COLECCIONES, mapear } from './schema-map.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry-run') || !process.env.SANITY_WRITE_TOKEN;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '_source/assets-manifest.json'), 'utf8')).assets;

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const idDe = (tipo, itemId) => `${tipo}-${itemId}`;

// ── Portable Text ────────────────────────────────────────────────────────────
const blockSchema = Schema.compile({
  name: 'x',
  types: [{ name: 'blockContent', type: 'array', of: [{ type: 'block' }] }],
}).get('blockContent');

function aPortableText(html, semilla) {
  if (!html || !html.trim()) return undefined;
  const bloques = htmlToBlocks(html, blockSchema, { parseHtml: (h) => new JSDOM(h).window.document });
  // _key determinista: sin esto, cada corrida produce claves nuevas y el diff es siempre enorme
  return bloques.map((b, i) => {
    const k = { ...b, _key: hash(`${semilla}:${i}`) };
    if (Array.isArray(k.children)) k.children = k.children.map((c, j) => ({ ...c, _key: hash(`${semilla}:${i}:${j}`) }));
    if (Array.isArray(k.markDefs)) k.markDefs = k.markDefs.map((m, j) => ({ ...m, _key: hash(`${semilla}:${i}:m${j}`) }));
    return k;
  });
}

// ── assets ───────────────────────────────────────────────────────────────────
// El manifiesto está indexado por URL de Webflow; el CSV trae la URL cruda.
function assetLocal(url) {
  const a = manifest[url] || manifest[url.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/')];
  if (!a) return null;
  // Sanity NO procesa AVIF: si hay máster JPEG, ese es el que se sube
  const rel = a.sanityMaster || a.archivo;
  return { ruta: path.join(ROOT, rel), alt: a.alt || '', sha: a.sha256, publico: a.publico };
}

// ── construcción ─────────────────────────────────────────────────────────────
// Orden topológico: lo referenciado va antes que quien lo referencia.
const ORDEN = ['categories', 'categories-brochures', 'industries', 'logos', 'subservices',
  'where-we-serves', 'residentials', 'commercials', 'countries', 'pool-builders',
  'procesos', 'images', 'brochures', 'projects', 'blogs', 'articles'];

const porSlug = new Map();   // `${tipo}:${slug}` -> _id
const docs = [];
const usados = new Set();    // assets realmente referenciados
const problemas = [];

for (const col of ORDEN) {
  const m = mapear(col);
  for (const fila of m.filas) {
    if (fila['Archived'] === 'true') continue;
    porSlug.set(`${m.tipo}:${fila['Slug']}`, idDe(m.tipo, fila['Item ID']));
  }
}

for (const col of ORDEN) {
  const m = mapear(col);
  const nombreTitulo = m.cols.includes('Title') ? 'title' : 'name';
  for (const fila of m.filas) {
    if (fila['Archived'] === 'true') continue;
    const doc = {
      _id: idDe(m.tipo, fila['Item ID']),
      _type: m.tipo,
      [nombreTitulo]: fila[m.cols.includes('Title') ? 'Title' : 'Name'],
    };
    if (fila['Draft'] === 'true') doc._draft = true;   // se convierte en drafts.<id> al subir
    const semilla = `${m.tipo}:${fila['Slug']}`;

    for (const c of m.campos) {
      if (c.nombre === nombreTitulo) continue;
      const crudo = c.tipo === 'grupo' ? null : (fila[c.de] || '').trim();

      if (c.nombre.startsWith('seo.')) {
        if (crudo) (doc.seo ??= { _type: 'seo' })[c.nombre.slice(4)] = crudo;
        continue;
      }
      if (c.tipo === 'grupo') {
        const items = c.de.map((mapa, i) => {
          const o = { _key: hash(`${semilla}:${c.nombre}:${i}`) };
          let algo = false;
          for (const [k, columna] of Object.entries(mapa)) {
            const v = (fila[columna] || '').trim();
            if (!v) continue;
            algo = true;
            if (k === 'image') { const a = assetLocal(v); if (a) { usados.add(a.publico); o.image = { _sanityAsset: a.ruta, alt: a.alt }; } }
            else o[k] = v;
          }
          return algo ? o : null;
        }).filter(Boolean);
        if (items.length) doc[c.nombre] = items;
        continue;
      }
      if (!crudo) continue;

      switch (c.tipo) {
        case 'slug':         doc.slug = { _type: 'slug', current: crudo }; break;
        case 'datetime':     doc[c.nombre] = new Date(crudo).toISOString(); break;
        case 'boolean':      doc[c.nombre] = crudo === 'true'; break;
        case 'number':       doc[c.nombre] = Number(crudo); break;
        case 'blockContent': doc[c.nombre] = aPortableText(crudo, `${semilla}:${c.nombre}`); break;
        case 'reference': {
          const slugs = crudo.split(';').map(s => s.trim()).filter(Boolean);   // el trim es obligatorio: el separador es "; "
          const refs = slugs.map((s, i) => {
            const id = porSlug.get(`${c.ref}:${s}`);
            if (!id) { problemas.push(`referencia rota  ${m.tipo}/${fila['Slug']}.${c.nombre} -> ${c.ref}:${s}`); return null; }
            return { _type: 'reference', _ref: id, _key: hash(`${semilla}:${c.nombre}:${i}`) };
          }).filter(Boolean);
          if (refs.length) doc[c.nombre] = c.multi ? refs : { _type: 'reference', _ref: refs[0]._ref };
          break;
        }
        case 'image': case 'file': {
          const urls = crudo.split(';').map(s => s.trim()).filter(Boolean);
          const items = urls.map((u, i) => {
            const a = assetLocal(u);
            if (!a) { problemas.push(`asset ausente    ${m.tipo}/${fila['Slug']}.${c.nombre} -> ${u.slice(0, 80)}`); return null; }
            usados.add(a.publico);
            return { _sanityAsset: a.ruta, alt: a.alt, _key: hash(`${semilla}:${c.nombre}:${i}`) };
          }).filter(Boolean);
          if (items.length) doc[c.nombre] = c.multi ? items : { _sanityAsset: items[0]._sanityAsset, alt: items[0].alt };
          break;
        }
        default: doc[c.nombre] = crudo;
      }
    }
    docs.push(doc);
  }
}

// ── informe ──────────────────────────────────────────────────────────────────
const porTipo = {};
for (const d of docs) porTipo[d._type] = (porTipo[d._type] || 0) + 1;
const conPT = docs.filter(d => Object.values(d).some(v => Array.isArray(v) && v[0]?._type === 'block')).length;
const assetsDistintos = usados.size;

console.log('\n─────────── FASE 3  ' + (DRY ? '(ENSAYO — no toca la red)' : '(SUBIENDO)'));
console.log(`documentos construidos : ${docs.length}`);
console.log('por tipo               :');
for (const [t, n] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)}  ${t}`);
console.log(`con Portable Text      : ${conPT}`);
console.log(`assets referenciados   : ${assetsDistintos} de ${Object.keys(manifest).length} del manifiesto`);
console.log(`borradores (Draft=true): ${docs.filter(d => d._draft).length}`);

if (problemas.length) {
  console.log(`\n🔴 ${problemas.length} problema(s):`);
  problemas.slice(0, 25).forEach(p => console.log('   ' + p));
  if (problemas.length > 25) console.log(`   … y ${problemas.length - 25} más`);
} else console.log('\n✅ 0 referencias rotas · 0 assets ausentes');

// salida determinista para poder diffear entre corridas
const salida = path.join(ROOT, '_source/sanity-docs.json');
fs.writeFileSync(salida, JSON.stringify(docs.sort((a, b) => a._id.localeCompare(b._id)), null, 2) + '\n');
console.log(`\ndocumentos escritos en ${path.relative(ROOT, salida)}`);

if (DRY) {
  console.log('\nENSAYO. Para subir de verdad:  SANITY_WRITE_TOKEN=<token Editor> npm run import');
  process.exit(problemas.length ? 1 : 0);
}
