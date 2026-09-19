#!/usr/bin/env node
/**
 * NINGUN BLOG HUERFANO — la pasada que lo garantiza, sobre el Markdown.
 *
 *     node scripts/cierra-huerfanos.mjs                # SECO
 *     node scripts/cierra-huerfanos.mjs --escribir
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE ARREGLA
 *
 * `check-blog.mjs` mide los enlaces que ENTRAN a cada articulo, porque huerfano es no recibir,
 * no no dar. Un articulo al que nadie apunta solo se alcanza desde el indice, y eso lo recorre
 * Google igual que un lector: una vez.
 *
 * Cada redactor eligio sus 2-3 hermanos mirando su propio articulo, que es lo correcto. Pero
 * nadie miraba el GRAFO, y un grafo de 97 nodos construido por 97 decisiones locales deja
 * siempre algun nodo sin aristas entrantes. Esto lo cierra.
 *
 * ESCRIBE EN EL MARKDOWN, NO EN SANITY. El Markdown es el origen; parchear Sanity dejaria la
 * correccion fuera del fichero del que se vuelve a publicar, y la siguiente publicacion la
 * borraria sin avisar.
 *
 * COMO ELIGE QUIEN APUNTA. Al hermano del mismo cluster con menos enlaces salientes que aun no
 * apunte al huerfano — asi el enlace es editorialmente defendible (mismo tema) y de paso
 * reparte, en vez de colgar los huerfanos del mismo articulo. Si no hay ninguno en el cluster,
 * cae a la misma categoria. Si tampoco, NO inventa: lo deja en rojo y lo dice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { leeArticulos } from './lib/articulo.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'contenido/blog');
const ESCRIBIR = process.argv.includes('--escribir');
const ROADMAP = JSON.parse(fs.readFileSync(path.join(RAIZ, 'contenido/roadmap-blog.json'), 'utf8'));

const clusterDe = {}; const categoriaDe = {};
for (const c of ROADMAP.clusters) {
  for (const a of c.articulos) { clusterDe[a.slug] = c.clave; categoriaDe[a.slug] = c.categoria; }
}

const articulos = leeArticulos(DIR);
const porSlug = Object.fromEntries(articulos.map((a) => [a.frente.slug, a]));

/* Los 10 heredados no viven en Markdown pero SI cuentan como destino: tambien pueden quedarse
 * huerfanos, y de hecho tres lo estaban. Se sacan del cache de Sanity. */
const cache = path.join(RAIZ, 'src/data/blogs-sanity.json');
const publicados = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : [];
const heredados = publicados.map((p) => p.slug).filter((s) => !porSlug[s]);
/* Los heredados no estan en el roadmap y por tanto no tienen `clave` de cluster, pero SI tienen
 * categoria en Sanity. Sin esto, elegir quien les apunta caia siempre en «sin afinidad», que es
 * decir «no se por que este». Con esto, un articulo comercial recibe de otro comercial. */
for (const p of publicados) if (!categoriaDe[p.slug] && p.categoria?.slug) categoriaDe[p.slug] = p.categoria.slug;

const todos = [...Object.keys(porSlug), ...heredados];
const entrantes = Object.fromEntries(todos.map((s) => [s, new Set()]));
const salientes = Object.fromEntries(Object.keys(porSlug).map((s) => [s, new Set()]));

for (const a of articulos) {
  const yo = a.frente.slug;
  const destinos = new Set(a.frente.relacionados ?? []);
  for (const m of a.cuerpo.matchAll(/\]\(\/blogs\/([a-z0-9-]+)\)/g)) destinos.add(m[1]);
  for (const d of destinos) {
    if (d === yo) continue;
    salientes[yo].add(d);
    if (entrantes[d]) entrantes[d].add(yo);
  }
}

const huerfanos = todos.filter((s) => entrantes[s].size === 0);
console.log(`\n  ${todos.length} articulos (${Object.keys(porSlug).length} en Markdown + ${heredados.length} heredados)`);
console.log(`  huerfanos: ${huerfanos.length}${huerfanos.length ? ` -> ${huerfanos.join(', ')}` : ''}`);

if (!huerfanos.length) { console.log('\n  nada que cerrar\n'); process.exit(0); }

const cambios = [];
let sinPadrino = 0;
for (const h of huerfanos) {
  const mismoCluster = (s) => clusterDe[s] && clusterDe[s] === clusterDe[h];
  const mismaCategoria = (s) => categoriaDe[s] && categoriaDe[s] === categoriaDe[h];
  const candidatos = Object.keys(porSlug)
    .filter((s) => s !== h && !salientes[s].has(h))
    .sort((a, b) => {
      const pa = (mismoCluster(a) ? 0 : mismaCategoria(a) ? 1 : 2);
      const pb = (mismoCluster(b) ? 0 : mismaCategoria(b) ? 1 : 2);
      if (pa !== pb) return pa - pb;
      if (salientes[a].size !== salientes[b].size) return salientes[a].size - salientes[b].size;
      return a.localeCompare(b);
    });
  const padrino = candidatos[0];
  if (!padrino) {
    console.log(`  🔴 ${h}: no hay ningun articulo que pueda apuntarle sin repetirse`);
    sinPadrino++;
    continue;
  }
  const por = mismoCluster(padrino) ? 'mismo cluster' : mismaCategoria(padrino) ? 'misma categoria' : 'sin afinidad — REVISAR';
  cambios.push({ huerfano: h, padrino, por });
  salientes[padrino].add(h);
  entrantes[h].add(padrino);
}

console.log('');
for (const c of cambios) {
  console.log(`     ${c.padrino}\n        -> relacionados += ${c.huerfano}   (${c.por})`);
}

if (sinPadrino) { console.error(`\n  🔴 ${sinPadrino} sin resolver. No se escribe nada.\n`); process.exit(1); }
if (!ESCRIBIR) { console.log('\n  SECO. --escribir para aplicarlo.\n'); process.exit(0); }

for (const c of cambios) {
  const f = path.join(DIR, `${c.padrino}.md`);
  const bruto = fs.readFileSync(f, 'utf8');
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frente = JSON.parse(m[1]);
  frente.relacionados = [...frente.relacionados, c.huerfano];
  fs.writeFileSync(f, `---\n${JSON.stringify(frente, null, 2)}\n---\n${m[2]}`);
}
console.log(`\n  ✅ ${cambios.length} enlace(s) anadido(s) al frontmatter. Republica: node scripts/publica-blog.mjs --escribir\n`);
