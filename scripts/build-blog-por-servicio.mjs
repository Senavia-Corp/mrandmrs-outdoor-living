#!/usr/bin/env node
/**
 * `src/data/blog-por-servicio.json` — LOS 3 ARTICULOS DE CADA FICHA DE SERVICIO.
 *
 *     node scripts/build-blog-por-servicio.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA QUE RESUELVE, MEDIDO
 *
 * `CarruselBlog` pinta hoy los MISMOS 10 articulos en las 79 rutas donde aparece. Tiene una
 * prop `categoria` y nadie se la pasa, porque `blogs.json` emitia `categoria: null` en los 10
 * y el filtro no llegaba a aplicarse nunca. El encargo lo pide distinto: cada ficha de servicio
 * muestra **exactamente 3** articulos altamente relacionados. Ni los ultimos, ni al azar, ni
 * los mismos tres para todos.
 *
 * POR QUE POR RUTA Y NO POR PROP. Las 14 fichas de `/services/` son `.astro` DERIVADOS: no
 * pueden pedirle nada a Sanity y regenerarlas por esto costaria 220 KB de marcado duplicado.
 * El componente se autolocaliza por `Astro.url.pathname`, que es el mismo mecanismo que ya
 * usan `blog-heading-por-ruta.json` y `servicios-categoria.json`. Asi, cambiar los 3 articulos
 * de un servicio es editar el roadmap y reconstruir — sin tocar una linea de `.astro`.
 *
 * POR QUE EL TRIO SALE DEL ROADMAP Y NO DE UN NUMERO EN EL ARTICULO. `pergola-vs-louvered-roof`
 * esta en DOS fichas a proposito: es la guia compartida que el encargo pide que exista una sola
 * vez. Un `ordenEnServicio` guardado en el documento solo admite un puesto, asi que no puede
 * expresar eso. El reparto vive donde vive la decision editorial: en `contenido/roadmap-blog.json`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FALLA CERRADO, Y ESE ES EL PUNTO
 *
 * Si un servicio no reune sus 3 articulos publicados, este script NO ESCRIBE. La alternativa
 * —caer a los 10 genericos, que es lo que hace hoy el componente— es exactamente la familia de
 * fallo que este repo lleva siete casos matando: la pagina se ve bien, nadie se entera, y el
 * servicio lleva meses ensenando articulos que no son suyos.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ROADMAP = JSON.parse(fs.readFileSync(path.join(RAIZ, 'contenido/roadmap-blog.json'), 'utf8'));
const BLOGS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8'));
const DESTINO = path.join(RAIZ, 'src/data/blog-por-servicio.json');

const porSlug = Object.fromEntries(BLOGS.posts.map((p) => [p.enlace.replace('/blogs/', ''), p]));

let fallos = 0;
const mal = (m) => { console.error(`  🔴 ${m}`); fallos++; };

const salida = { _lee_esto: [
  'DERIVADO por scripts/build-blog-por-servicio.mjs desde contenido/roadmap-blog.json y',
  'src/data/blogs.json (que a su vez sale de Sanity). No editar a mano.',
  '',
  'Lo lee src/components/widgets/CarruselBlog.astro, que se autolocaliza por pathname. Una',
  'ruta de /services/ que no este aqui hace FALLAR el build: es preferible a que la ficha',
  'ensene 10 articulos genericos sin que nadie se entere.',
], rutas: {} };

for (const c of ROADMAP.clusters) {
  const ruta = `/services/${c.servicio}`;
  const trio = c.fichaServicio ?? [];
  if (trio.length !== 3) { mal(`${c.clave}: fichaServicio tiene ${trio.length} articulos, tienen que ser 3`); continue; }

  const posts = [];
  for (const s of trio) {
    const p = porSlug[s];
    if (!p) { mal(`${ruta}: "${s}" no esta publicado todavia (no aparece en blogs.json)`); continue; }
    posts.push(p);
  }
  if (posts.length !== 3) continue;

  salida.rutas[ruta] = { titulo: c.encabezadoFicha, entradilla: c.entradillaFicha, posts };
}

const n = Object.keys(salida.rutas).length;
if (n !== ROADMAP.clusters.length) mal(`${n} fichas resueltas de ${ROADMAP.clusters.length}`);

/* Los encabezados tienen que ser distintos entre si: catorce fichas con el mismo titular es
 * contenido duplicado y ademas no dice nada. */
const titulos = new Set(Object.values(salida.rutas).map((r) => r.titulo));
if (titulos.size !== n) mal(`${titulos.size} titulares distintos de ${n} — hay uno repetido`);

if (fallos) {
  console.error(`\n  🔴 ROJO — ${fallos} fallo(s). NO se escribe nada.`);
  console.error('       Una ficha sin sus 3 articulos caeria a los 10 genericos, y eso es');
  console.error('       justo lo que este fichero existe para impedir.\n');
  process.exit(1);
}

fs.writeFileSync(DESTINO, `${JSON.stringify(salida, null, 1)}\n`);
console.log(`\n  ${n} ficha(s) de servicio · 3 articulos cada una`);
for (const [ruta, r] of Object.entries(salida.rutas)) {
  console.log(`     ${ruta.replace('/services/', '').slice(0, 34).padEnd(36)} ${r.posts.map((p) => p.enlace.replace('/blogs/', '')).join(' · ').slice(0, 90)}`);
}
console.log(`\n  -> ${path.relative(RAIZ, DESTINO)}\n`);
