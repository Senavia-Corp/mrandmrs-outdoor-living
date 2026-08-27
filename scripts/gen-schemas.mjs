// Emite studio/schemaTypes/*.ts desde scripts/schema-map.mjs.
// Se corre UNA vez; a partir de ahí los .ts son la fuente. Si cambia el mapa, se vuelve a correr
// y se diffea: cualquier campo que desaparezca sale en el diff.
import fs from 'node:fs';
import path from 'node:path';
import { COLECCIONES, mapear } from './schema-map.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'studio/schemaTypes');
fs.mkdirSync(OUT, { recursive: true });

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
const titulo = (n) => n.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

function campoTs(c) {
  const base = `      name: ${q(c.nombre)},\n      title: ${q(titulo(c.nombre))},`;
  const desc = c.de ? `\n      description: ${q('Webflow: ' + c.de)},` : '';
  switch (c.tipo) {
    case 'slug':
      return `    {\n${base}${desc}\n      type: 'slug',\n      options: { source: 'name', maxLength: 96 },\n      validation: (Rule) => Rule.required(),\n    },`;
    case 'image':
      return `    {\n${base}${desc}\n      type: ${c.multi ? q('array') : q('image')},${c.multi
        ? `\n      of: [{ type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt' }] }],`
        : `\n      options: { hotspot: true },\n      fields: [{ name: 'alt', type: 'string', title: 'Alt'${c.alt ? `, description: ${q('Webflow: ' + c.alt)}` : ''} }],`}\n    },`;
    case 'file':
      return `    {\n${base}${desc}\n      type: 'file',\n    },`;
    case 'reference':
      return c.multi
        ? `    {\n${base}${desc}\n      type: 'array',\n      of: [{ type: 'reference', to: [{ type: ${q(c.ref)} }] }],\n    },`
        : `    {\n${base}${desc}\n      type: 'reference',\n      to: [{ type: ${q(c.ref)} }],\n    },`;
    case 'blockContent':
      return `    {\n${base}${desc}\n      type: 'array',\n      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],\n    },`;
    case 'grupo': {
      const claves = Object.keys(c.de[0]);
      const of = claves.map(k => k === 'image'
        ? `        { name: 'image', title: 'Image', type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt' }] },`
        : `        { name: ${q(k)}, title: ${q(titulo(k))}, type: 'text', rows: 3 },`).join('\n');
      return `    {\n${base}\n      description: ${q('Plegado desde ' + c.de.length + ' grupos de columnas de Webflow')},\n      type: 'array',\n      of: [{\n        type: 'object',\n        fields: [\n${of}\n        ],\n      }],\n    },`;
    }
    case 'vacia':
      // el paréntesis iba FUERA de la cadena y rompía el .ts generado
      return `    {\n${base}\n      description: ${q('Webflow: ' + c.de + ' — vacía en el export')},\n      type: 'string',\n    },`;
    case 'number':   return `    {\n${base}${desc}\n      type: 'number',\n    },`;
    case 'boolean':  return `    {\n${base}${desc}\n      type: 'boolean',\n    },`;
    case 'datetime': return `    {\n${base}${desc}\n      type: 'datetime',\n    },`;
    case 'text':     return `    {\n${base}${desc}\n      type: 'text',\n      rows: 4,\n    },`;
    default:         return `    {\n${base}${desc}\n      type: 'string',\n    },`;
  }
}

const tipos = [];
for (const col of Object.keys(COLECCIONES)) {
  const m = mapear(col);
  const seo = m.campos.filter(c => c.nombre.startsWith('seo.'));
  const resto = m.campos.filter(c => !c.nombre.startsWith('seo.'));
  const nombreTitulo = m.cols.includes('Title') ? 'title' : 'name';
  const campos = [
    `    {\n      name: ${q(nombreTitulo)},\n      title: 'Nombre',\n      type: 'string',\n      validation: (Rule) => Rule.required(),\n    },`,
    ...resto.filter(c => c.nombre !== nombreTitulo).map(campoTs),
  ];
  if (seo.length) campos.push(`    {\n      name: 'seo',\n      title: 'SEO',\n      type: 'seo',\n      description: ${q('Webflow: ' + seo.map(s => s.de).join(' / '))},\n    },`);

  tipos.push(m.tipo);
  fs.writeFileSync(path.join(OUT, m.tipo + '.ts'), `// GENERADO por scripts/gen-schemas.mjs desde _source/cms/${col}.csv
// Colección de Webflow: ${col} (${m.filas.length} items)${m.ruta ? ` · página propia: ${m.ruta}/{slug}` : ' · sin página propia (solo datos)'}
import { defineType } from 'sanity'

export default defineType({
  name: ${q(m.tipo)},
  title: ${q(m.titulo)},
  type: 'document',
  fields: [
${campos.join('\n')}
  ],
  preview: { select: { title: ${q(nombreTitulo)}, subtitle: 'slug.current' } },
})
`);
}

// tipos compartidos
fs.writeFileSync(path.join(OUT, 'seo.ts'), `import { defineType } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    { name: 'title', title: 'Title SEO', type: 'string' },
    { name: 'description', title: 'Meta description', type: 'text', rows: 3 },
  ],
})
`);
fs.writeFileSync(path.join(OUT, 'index.ts'), `// GENERADO por scripts/gen-schemas.mjs
import seo from './seo'
${tipos.map(t => `import ${t} from './${t}'`).join('\n')}

export const schemaTypes = [seo, ${tipos.join(', ')}]
`);
console.log(`${tipos.length} tipos + seo → studio/schemaTypes/`);
