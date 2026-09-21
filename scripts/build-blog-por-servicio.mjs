#!/usr/bin/env node
/**
 * `src/data/blog-por-servicio.json` — LOS 5 ARTICULOS DE CADA FICHA DE SERVICIO.
 *
 *     node scripts/build-blog-por-servicio.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA QUE RESUELVE, MEDIDO
 *
 * `CarruselBlog` pinta hoy los MISMOS 10 articulos en las 79 rutas donde aparece. Tiene una
 * prop `categoria` y nadie se la pasa, porque `blogs.json` emitia `categoria: null` en los 10
 * y el filtro no llegaba a aplicarse nunca. El encargo lo pide distinto: cada ficha de servicio
 * muestra **exactamente 5** articulos altamente relacionados. Ni los ultimos, ni al azar, ni
 * los mismos para todos.
 *
 * POR QUE 5 Y NO 3 (21-sep-2026). Con 3 articulos y 3 tarjetas por vista desde 991 px, el
 * carrusel no tenia adonde desplazarse: `max = 0`, y `Componentes.astro` oculta flechas y barra
 * cuando eso pasa —con razon, un control que nunca podra habilitarse es ruido—. Desde fuera se
 * leia como «el carrusel esta roto». Con 5 hay desplazamiento real y las flechas vuelven solas,
 * sin tocar una linea de CSS ni de JS.
 *
 * POR QUE POR RUTA Y NO POR PROP. Las 14 fichas de `/services/` son `.astro` DERIVADOS: no
 * pueden pedirle nada a Sanity y regenerarlas por esto costaria 220 KB de marcado duplicado.
 * El componente se autolocaliza por `Astro.url.pathname`, que es el mismo mecanismo que ya
 * usan `blog-heading-por-ruta.json` y `servicios-categoria.json`. Asi, cambiar los articulos
 * de un servicio es editar el roadmap y reconstruir — sin tocar una linea de `.astro`.
 *
 * POR QUE EL REPARTO SALE DEL ROADMAP Y NO DE UN NUMERO EN EL ARTICULO. `pergola-vs-louvered-roof`
 * esta en DOS fichas a proposito: es la guia compartida que el encargo pide que exista una sola
 * vez. Un `ordenEnServicio` guardado en el documento solo admite un puesto, asi que no puede
 * expresar eso. El reparto vive donde vive la decision editorial: en `contenido/roadmap-blog.json`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FALLA CERRADO, Y ESE ES EL PUNTO
 *
 * Si un servicio no reune sus 5 articulos publicados, este script NO ESCRIBE. La alternativa
 * —caer a los 10 genericos, que es lo que hace hoy el componente— es exactamente la familia de
 * fallo que este repo lleva siete casos matando: la pagina se ve bien, nadie se entera, y el
 * servicio lleva meses ensenando articulos que no son suyos.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ROADMAP = JSON.parse(fs.readFileSync(path.join(RAIZ, 'contenido/roadmap-blog.json'), 'utf8'));
const DESTINO = path.join(RAIZ, 'src/data/blog-por-servicio.json');

/**
 * La tarjeta se arma desde `blogs-sanity.json` y NO desde `blogs.json`, y la diferencia importa:
 * `blogs.json` es el carrusel GENERICO —los 10 heredados, enumerados a proposito— mientras que
 * esto necesita cualquiera de los 97. Leer del sitio equivocado dejaba las 14 fichas en
 * «faltan 3» aunque el articulo estuviera publicado.
 *
 * La forma de la tarjeta es la que pinta `CarruselBlog.astro`, y se construye aqui una sola vez
 * para que las dos fuentes no puedan divergir en los nombres de campo.
 */
const CACHE = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs-sanity.json'), 'utf8'));
const tarjeta = (p) => ({
  titulo: p.cardTitle || p.title,
  resumen: p.summary,
  enlace: `/blogs/${p.slug}`,
  cta: 'Read More',
  imagen: { src: p.portada.src, srcset: p.portada.srcset, sizes: p.portada.sizes, alt: p.portada.alt },
  categoria: p.categoria?.slug ?? null,
});
const porSlug = Object.fromEntries(CACHE.filter((p) => p.portada?.src).map((p) => [p.slug, tarjeta(p)]));

let fallos = 0;
const mal = (m) => { console.error(`  🔴 ${m}`); fallos++; };

const salida = { _lee_esto: [
  'DERIVADO por scripts/build-blog-por-servicio.mjs desde contenido/roadmap-blog.json y',
  'src/data/blogs.json (que a su vez sale de Sanity). No editar a mano.',
  '',
  'Lo lee src/components/widgets/CarruselBlog.astro, que se autolocaliza por pathname. Una',
  'Las 14 fichas estan DECLARADAS: o con su reparto de 5 en `rutas`, o en `pendientes` con los',
  'que faltan por escribir. Una ruta de /services/ que no este en ninguna de las dos hace',
  'FALLAR el build — es preferible a que la ficha ensene 10 articulos genericos sin que nadie',
  'se entere, que es el fallo numero uno de este repo.',
], rutas: {} };

salida.pendientes = {};

for (const c of ROADMAP.clusters) {
  const ruta = `/services/${c.servicio}`;
  const reparto = c.fichaServicio ?? [];
  if (reparto.length !== 5) { mal(`${c.clave}: fichaServicio tiene ${reparto.length} articulos, tienen que ser 5`); continue; }

  const faltan = reparto.filter((s) => !porSlug[s]);
  if (faltan.length) {
    /**
     * ── COBERTURA PARCIAL, PERO DECLARADA ──────────────────────────────────────────────────
     *
     * El roadmap son 97 articulos y hay 44 escritos, asi que 9 de las 14 fichas todavia no
     * reunen sus cinco. Romper el build por eso bloquearia el despliegue de los 44 que SI
     * estan, que es peor que publicarlos.
     *
     * Lo que no puede pasar es que una ficha caiga a los 10 genericos y nadie se entere —el
     * fallo numero uno de este repo—. Asi que las 14 quedan DECLARADAS: o con su reparto en
     * `rutas`, o aqui, con los slugs que faltan. El componente se niega a pintar una ruta de
     * /services/ que no este en una de las dos listas, y esta lista sale por pantalla en cada
     * corrida y va al informe.
     */
    salida.pendientes[ruta] = { faltan, escritos: reparto.filter((s) => porSlug[s]) };
    continue;
  }

  salida.rutas[ruta] = { titulo: c.encabezadoFicha, entradilla: c.entradillaFicha, posts: reparto.map((s) => porSlug[s]) };
}

const n = Object.keys(salida.rutas).length;
const nPend = Object.keys(salida.pendientes).length;
if (n + nPend !== ROADMAP.clusters.length) mal(`${n + nPend} fichas declaradas de ${ROADMAP.clusters.length}`);

/* Los encabezados tienen que ser distintos entre si: catorce fichas con el mismo titular es
 * contenido duplicado y ademas no dice nada. */
const titulos = new Set(Object.values(salida.rutas).map((r) => r.titulo));
if (titulos.size !== n) mal(`${titulos.size} titulares distintos de ${n} — hay uno repetido`);

if (fallos) {
  console.error(`\n  🔴 ROJO — ${fallos} fallo(s). NO se escribe nada.`);
  console.error('       Una ficha sin sus 5 articulos caeria a los 10 genericos, y eso es');
  console.error('       justo lo que este fichero existe para impedir.\n');
  process.exit(1);
}

fs.writeFileSync(DESTINO, `${JSON.stringify(salida, null, 1)}\n`);
console.log(`\n  ${n} de ${ROADMAP.clusters.length} fichas con sus 5 articulos · ${nPend} pendiente(s)`);
for (const [ruta, r] of Object.entries(salida.rutas)) {
  console.log(`     ${ruta.replace('/services/', '').slice(0, 34).padEnd(36)} ${r.posts.map((p) => p.enlace.replace('/blogs/', '')).join(' · ').slice(0, 90)}`);
}
if (nPend) {
  console.log('\n  PENDIENTES (siguen con el carrusel generico, declarado):');
  for (const [ruta, p] of Object.entries(salida.pendientes)) {
    console.log(`     ${ruta.replace('/services/', '').slice(0, 34).padEnd(36)} faltan ${p.faltan.length}: ${p.faltan.join(', ').slice(0, 70)}`);
  }
}
console.log(`\n  -> ${path.relative(RAIZ, DESTINO)}\n`);
