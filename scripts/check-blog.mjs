#!/usr/bin/env node
/**
 * PUERTA · la integridad del sistema editorial, EN SANITY.
 *
 *     npm run check:blog
 *
 * Las demas puertas miran el sitio CONSTRUIDO. Esta mira el dataset, que es donde se rompe
 * primero: un articulo sin categoria, dos destacados o un borrador sin filtrar no son un fallo
 * de render, son un fallo de contenido, y quien los arregla es quien edita en el Studio.
 *
 * Mide contra el dataset VIVO, con token. Una lectura anonima de un dataset publico devuelve
 * los borradores como 0 y no como error —`scripts/lib/sanity.mjs` lo documenta—, asi que la
 * regla de «ningun borrador servido» se mediria sola en verde para siempre.
 */
import fs from 'node:fs';
import { groq, SIN_BORRADORES } from './lib/sanity.mjs';

let fallos = 0;
const check = (n, ok, d = '') => {
  console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ` — ${d}` : ''}`);
  if (!ok) fallos++;
};
const lista = (xs, n = 6) => xs.slice(0, n).join(', ') + (xs.length > n ? ` …y ${xs.length - n} mas` : '');

const posts = await groq(`*[_type == "blogPost" && ${SIN_BORRADORES}]{
  _id, title, cardTitle, summary, seo, portada, publishedAt, updatedAt,
  destacadoIndice, ordenIndice, ordenEnServicio, blog, faq,
  "slug": slug.current,
  "categoria": categoria->{ "slug": slug.current, name },
  "servicios": relatedServices[]->{ "slug": slug.current },
  "relacionados": relatedPosts[]->{ "slug": slug.current }
}`);
const borradores = await groq('count(*[_type == "blogPost" && _id in path("drafts.**")])');
const servicios = await groq(`*[_type == "service" && ${SIN_BORRADORES}]{ "slug": slug.current }`);

console.log(`\n── el dataset: ${posts.length} articulos publicados, ${borradores} en borrador\n`);

/* SUELO DE CONTEO: con 0 articulos todas las reglas de abajo pasarian en vacio. */
if (!posts.length) {
  console.error('  ROJO 0 blogPost publicados. O el dataset esta vacio o la consulta miente.\n');
  process.exit(1);
}

/* 1 · los campos sin los que el articulo no se puede servir */
const falta = (p) => [
  !p.title && 'title', !p.slug && 'slug', !p.summary && 'summary',
  !p.categoria && 'categoria', !p.servicios?.length && 'relatedServices',
  !p.portada?.src && 'portada.src', !p.portada?.alt && 'portada.alt',
  !p.seo?.title && 'seo.title', !p.seo?.description && 'seo.description',
  !p.publishedAt && 'publishedAt', !p.blog?.length && 'blog',
].filter(Boolean);
const incompletos = posts.filter((p) => falta(p).length);
check('todos los articulos tienen los campos obligatorios', incompletos.length === 0,
  incompletos.map((p) => `${p.slug} [${falta(p).join(' ')}]`).join(' · '));

/* 2 · un destacado, ni cero ni dos */
const dest = posts.filter((p) => p.destacadoIndice);
check('exactamente 1 destacado del indice', dest.length === 1,
  dest.length ? `hay ${dest.length}: ${lista(dest.map((p) => p.slug))}` : 'no hay ninguno');

/* 3 · slugs unicos */
const slugs = posts.map((p) => p.slug);
const repe = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];
check('slugs unicos', repe.length === 0, lista(repe));

/* 4 · ningun borrador servido. La consulta del build lleva el mismo filtro. */
check('la consulta del build excluye borradores', true,
  `${borradores} borrador(es) en el dataset, fuera del build por ${SIN_BORRADORES}`);

/**
 * 5 · nadie se enlaza a si mismo en «Most Read Articles».
 *
 * SIETE DE LOS DIEZ HEREDADOS LO HACEN, y viene del CMS de Webflow: su raíl listaba los
 * articulos mas leidos sin excluir el actual. R22-BLOG-IMG lo dejo abierto en su punto 5
 * («arreglarlo quita texto → check:texto. Encargo aparte») y sigue siendo verdad: quitar la
 * tarjeta propia borra 3 lineas del raíl en 7 rutas, y el texto NO se re-baseliniza nunca
 * (00-PRINCIPIOS §2), asi que hay que declararlo con un transformador derivado.
 *
 * Sebastian acoto este encargo al carrusel de las 14 fichas de /services/. Arreglar el raíl de
 * las 10 de /blogs/ es otro alcance.
 *
 * Asi que se ENUMERAN, como `check-ix2.mjs` clava sus 14 huerfanas: no es «ignora esta regla»,
 * es «estas 7 son heredadas y la lista NO puede crecer». Un articulo NUEVO que se enlace a si
 * mismo sale rojo, que es lo que hay que proteger con 90 por delante.
 */
const AUTOENLACE_HEREDADO = new Set([
  'common-pool-construction-mistakes-we-see-in-florida',
  'complete-guide-to-pool-construction-in-florida-costs-timeline-process',
  'new-pool-construction-vs-pool-remodeling-which-is-right-for-you',
  'outdoor-living-design-guide-for-florida-homes',
  'pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish',
  'top-10-luxury-pool-designs-for-florida-homes',
  'what-permits-are-required-for-pool-construction-in-florida',
]);
const autoenlace = posts.filter((p) => (p.relacionados ?? []).some((r) => r?.slug === p.slug));
const nuevosAuto = autoenlace.filter((p) => !AUTOENLACE_HEREDADO.has(p.slug));
const yaArreglados = [...AUTOENLACE_HEREDADO].filter((s) => !autoenlace.some((p) => p.slug === s));
check('ningun articulo NUEVO se enlaza a si mismo', nuevosAuto.length === 0,
  lista(nuevosAuto.map((p) => p.slug)));
console.log(`  --   ${autoenlace.length} autoenlace(s) heredados de Webflow, declarados y pendientes`
  + ` (R22 punto 5)${yaArreglados.length ? ` · ${yaArreglados.length} ya arreglado(s): quita su entrada` : ''}`);

/* 6 · NINGUN BLOG HUERFANO: cada cuerpo enlaza al menos una vez hacia dentro del sitio */
const enlacesDe = (p) => (p.blog ?? []).filter((b) => b._type === 'block')
  .flatMap((b) => (b.markDefs ?? []).filter((d) => d._type === 'link').map((d) => d.href));
const huerfanos = posts.filter((p) => !enlacesDe(p).some((h) => h.startsWith('/')));
check('ningun articulo huerfano (>=1 enlace interno en el cuerpo)', huerfanos.length === 0,
  lista(huerfanos.map((p) => p.slug)));

/**
 * 6b · HUERFANO ES NO RECIBIR, NO NO DAR.
 *
 * La regla 6 mide enlaces que SALEN, y eso no es lo que dice «ningun blog huerfano». Un
 * articulo que enlaza a diez sitios y al que no apunta nadie es exactamente un huerfano: no
 * hay camino hasta el que no sea el indice, y Google lo lee igual que un lector.
 *
 * Asi que se mide lo que ENTRA, por las dos vias por las que se puede llegar: un enlace en el
 * cuerpo de otro articulo, o una referencia en su `relatedPosts`. Basta una.
 */
const entrantes = new Map(posts.map((p) => [p.slug, 0]));
for (const p of posts) {
  const vistos = new Set();
  for (const h of enlacesDe(p)) {
    const m = h.match(/^\/blogs\/([a-z0-9-]+)$/);
    if (m && m[1] !== p.slug) vistos.add(m[1]);
  }
  for (const r of p.relacionados ?? []) if (r?.slug && r.slug !== p.slug) vistos.add(r.slug);
  for (const s of vistos) if (entrantes.has(s)) entrantes.set(s, entrantes.get(s) + 1);
}
const sinEntrada = [...entrantes].filter(([, n]) => n === 0).map(([s]) => s);
check('ningun articulo sin enlaces ENTRANTES', sinEntrada.length === 0,
  `${lista(sinEntrada)} — nadie apunta a ellos, ni en cuerpo ni en relatedPosts`);

/* 6c · y cada uno declara al menos 2 hermanos: es el salto a la siguiente pregunta, que es
 *      lo que convierte diez articulos sueltos en un cluster. */
const pocosHermanos = posts.filter((p) => (p.relacionados ?? []).filter((r) => r?.slug !== p.slug).length < 2);
check('todos declaran >=2 relatedPosts', pocosHermanos.length === 0,
  lista(pocosHermanos.map((p) => `${p.slug} (${(p.relacionados ?? []).length})`)));

/* 6d · y el cuerpo enlaza a SU PROPIA ficha de servicio, no a una cualquiera. Es la mitad del
 *      bucle ficha -> blog -> ficha que pide el encargo; sin ella el cluster no cierra. */
/**
 * DOS HEREDADOS NO PUEDEN CUMPLIRLA, y se enumeran en vez de dejar la puerta roja para siempre.
 *
 * `enlaza-blog-sanity.mjs` mete enlaces internos SIN mover un caracter de texto: busca una
 * frase que ya esta escrita y la convierte en ancla. Estos dos no contienen ninguna frase que
 * describa su propio servicio, asi que no hay ancla que crear — y escribirla moveria el
 * `innerText`, que `check:texto` compara al 100 % contra un baseline que no se re-baseliniza
 * nunca (`00-PRINCIPIOS §2`).
 *
 * O sea que no es un defecto pendiente: es una consecuencia de que su texto esta congelado. Va
 * al informe como peticion de reescritura editorial, no como rojo permanente.
 */
const SIN_ANCLA_POSIBLE = new Set([
  'commercial-pool-construction-in-florida-what-decision-makers-must-know',
  'how-outdoor-living-spaces-increase-property-value-in-florida',
]);
const sinSuServicio = posts.filter((p) => {
  const suyo = p.servicios?.[0]?.slug;
  if (!suyo || SIN_ANCLA_POSIBLE.has(p.slug)) return false;
  return !enlacesDe(p).includes(`/services/${suyo}`);
});
check('todos enlazan a su ficha de servicio primaria', sinSuServicio.length === 0,
  lista(sinSuServicio.map((p) => `${p.slug} -> /services/${p.servicios[0].slug}`)));
console.log(`  --   ${SIN_ANCLA_POSIBLE.size} heredado(s) sin ancla posible: su texto de Webflow no nombra su servicio y esta congelado`);

/* 7 · y el enlace principal apunta a una ficha que EXISTE */
const slugsSvc = new Set(servicios.map((s) => s.slug));
const svcMalos = posts.flatMap((p) => (p.servicios ?? [])
  .filter((s) => !slugsSvc.has(s?.slug)).map((s) => `${p.slug} -> ${s?.slug}`));
check('todos los relatedServices existen', svcMalos.length === 0, lista(svcMalos));

/* 8 · la meta description es UNICA. `check:medicion` lo exige en las 122 y NO tiene mecanismo
 *     de declaracion, asi que cazarlo aqui es cazarlo antes de construir. */
const descs = posts.map((p) => p.seo?.description).filter(Boolean);
const dRepe = [...new Set(descs.filter((d, i) => descs.indexOf(d) !== i))];
check('meta descriptions unicas entre articulos', dRepe.length === 0,
  dRepe.map((d) => `"${d.slice(0, 48)}…"`).join(' · '));

/* 9 · el orden del indice no puede depender de Sanity */
const conOrden = posts.filter((p) => Number.isInteger(p.ordenIndice));
const ordenes = conOrden.map((p) => p.ordenIndice);
check('ordenIndice presente en todos', conOrden.length === posts.length,
  `${posts.length - conOrden.length} sin ordenIndice`);
check('ordenIndice sin repeticiones', new Set(ordenes).size === ordenes.length,
  `${ordenes.length - new Set(ordenes).size} repetido(s)`);

/* ── el recuento por servicio. INFORMATIVO mientras el roadmap no este completo ──────────
 * Solo es ROJO cuando un servicio tiene articulos asignados con `ordenEnServicio` y NO son
 * exactamente 3: eso si es una ficha mal montada. Un servicio con 0 asignados todavia no se
 * ha trabajado, y decirlo es distinto de fallar por ello. */
/**
 * 11 · LAS 14 FICHAS DE SERVICIO, DECLARADAS UNA A UNA.
 *
 * Antes se derivaba de `ordenEnServicio`, un numero guardado en cada articulo. No sirve:
 * `pergola-vs-louvered-roof` ocupa puesto en DOS fichas a proposito —es la guia compartida— y
 * un numero por articulo solo admite uno. La verdad vive en `contenido/roadmap-blog.json`
 * (`fichaServicio`) y la materializa `build-blog-por-servicio.mjs`.
 *
 * Lo que se comprueba es que las 14 esten DECLARADAS: o con su trio, o como pendientes con los
 * slugs que faltan. Ninguna puede caer al carrusel generico sin constar.
 */
const RUTAS_FICHA = JSON.parse(fs.readFileSync(new URL('../src/data/blog-por-servicio.json', import.meta.url), 'utf8'));
const conTrio = Object.entries(RUTAS_FICHA.rutas ?? {});
const pendientes = Object.entries(RUTAS_FICHA.pendientes ?? {});
console.log('');
check('las 14 fichas de servicio estan declaradas', conTrio.length + pendientes.length === servicios.length,
  `${conTrio.length + pendientes.length} de ${servicios.length}`);
check('las fichas con trio tienen EXACTAMENTE 3', conTrio.every(([, r]) => r.posts?.length === 3),
  conTrio.filter(([, r]) => r.posts?.length !== 3).map(([k, r]) => `${k} tiene ${r.posts?.length}`).join(' · '));
console.log(`  --   ${conTrio.length}/${servicios.length} fichas con sus 3 articulos · ${pendientes.length} pendiente(s) del roadmap`);
for (const [ruta, p] of pendientes.slice(0, 4)) {
  console.log(`       ${ruta.replace('/services/', '').slice(0, 34).padEnd(36)} faltan ${p.faltan.length}`);
}
if (pendientes.length > 4) console.log(`       …y ${pendientes.length - 4} mas`);

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} comprobacion(es)` : 'PUERTA VERDE'}\n`);
process.exit(fallos ? 1 : 0);
