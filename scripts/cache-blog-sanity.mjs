#!/usr/bin/env node
/**
 * CACHE DE `blogPost` PARA CONSTRUIR SIN RED.
 *
 *     node scripts/cache-blog-sanity.mjs
 *
 * Hermana de `cache-sanity.mjs`, que hace lo mismo para las 53 de `/pool-builders/` y NO cubre
 * este tipo (codifica `!== 53`). Misma disciplina:
 *
 *   · `src/pages/blogs/[slug].astro` falla CERRADO: sin datos no se construye media coleccion.
 *   · Esta cache SOLO se usa con `MM_SANITY_CACHE=1`, a mano. Si se activara sola, una caida de
 *     Sanity se serviria como si fuera el CMS vivo y nadie se enteraria.
 *   · La consulta es la MISMA, importada de `src/lib/blog-groq.mjs`, no copiada.
 *
 * El suelo de conteo NO va cableado: se lee del dataset. Cablear «10» aqui habria hecho que el
 * dia que entren los articulos nuevos este script se negara a correr sin decir por que.
 */
import fs from 'node:fs';
import path from 'node:path';
import { groq } from './lib/sanity.mjs';
import { CONSULTA_BLOG } from '../src/lib/blog-groq.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'src/data/blogs-sanity.json');

const docs = await groq(CONSULTA_BLOG);
const publicados = await groq('count(*[_type == "blogPost" && !(_id in path("drafts.**"))])');

if (!docs.length) {
  console.error('<<< Sanity devolvio 0 blogPost. No se escribe la cache.');
  process.exit(1);
}
if (docs.length !== publicados) {
  console.error(`<<< la consulta trae ${docs.length} y hay ${publicados} publicados: alguno no `
    + 'tiene slug y se quedaria fuera del sitio sin avisar. No se escribe la cache.');
  process.exit(1);
}
const sinPortada = docs.filter((d) => !d.portada?.src);
if (sinPortada.length) {
  console.error(`<<< ${sinPortada.length} sin portada: ${sinPortada.map((d) => d.slug).join(', ')}`);
  process.exit(1);
}

fs.writeFileSync(SALIDA, JSON.stringify(docs) + "\n");
const kb = (fs.statSync(SALIDA).size / 1024).toFixed(0);
console.log(`cache escrita: ${path.relative(RAIZ, SALIDA)} · ${docs.length} articulos · ${kb} KB`);
