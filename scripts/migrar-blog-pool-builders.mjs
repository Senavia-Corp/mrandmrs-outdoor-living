#!/usr/bin/env node
/**
 * R11-BLOG-02 — SCRIPT DE UN SOLO USO. Sustituye el HTML crudo del carrusel de blog, horneado
 * en `src/data/plantilla-pool-builders.json`, por el componente `CarruselBlog` (mismo cambio
 * que `build-paginas.mjs` ya hizo en Condado — ver ese script para el porque completo).
 *
 *     node scripts/migrar-blog-pool-builders.mjs           mide y verifica, NO escribe
 *     node scripts/migrar-blog-pool-builders.mjs --escribir  aplica el cambio
 *
 * POR QUE UN SCRIPT APARTE Y NO `build-plantillas.mjs`. Ese generador deriva la plantilla por
 * DIFF de las 53 paginas que habia antes de la Fase 6b — y esas 53 ya no existen (las borro la
 * propia Fase 6b al pasar la familia a Sanity). Hoy `npm run plantillas` sale con «0 paginas ·
 * ya convertida»: no hay nada de donde re-derivar. Este script no intenta revivir ese pipeline;
 * hace CIRUGIA puntual sobre el JSON que quedo congelado, una vez, con su propia
 * autocomprobacion antes de tocar disco — mismo principio que ya usa `build-plantillas.mjs`
 * (ver su cabecera): no se borra/reescribe nada hasta que lo nuevo se ha verificado igual de
 * bueno que lo viejo.
 *
 * QUE TOCA. Dos ficheros:
 *   1. `src/data/plantilla-pool-builders.json` — el array `LIT`. Su `LIT[1]` hoy es
 *      `[s0, null, s2, null, s4]`, con huecos en `CAMPOS[1]` para `headingBlog`/`paragraphBlog`
 *      (linea del `.astro`, no de este JSON). `s4` (15948 caracteres) trae, sin separacion, la
 *      rejilla de 10 tarjetas + nav + scrollbar del blog, y LUEGO `<section class="cta-footer">`
 *      hasta el final. Se separan en dos LIT nuevos: uno que descarta la rejilla entera (el
 *      componente ya la pinta) y otro que arranca justo en `cta-footer`.
 *   2. `src/pages/pool-builders/[slug].astro` — el array `CAMPOS` (JSON valido embebido en un
 *      `const`), que pierde los dos huecos de blog (pasan a props directas del componente,
 *      leidas de `d` igual que antes), y el bloque de render, que gana `<CarruselBlog />` entre
 *      los dos trozos nuevos de `B[]`.
 *
 * LA AUTOCOMPROBACION, ANTES DE ESCRIBIR NADA:
 *   - El trozo que se DESCARTA de `s4` tiene que traer EXACTAMENTE 10 tarjetas
 *     (`fs-slider-blog_slide`) y sus 10 `<h3>` tienen que casar, en orden y letra a letra
 *     -salvo `&amp;` vs `&`-, con los 10 titulos de `src/data/blogs.json`. Si no casa en las
 *     53 ciudades, para ahi mismo: es la misma logica que ya prueba `check-texto.mjs` para
 *     Condado, aplicada aqui antes de tocar el JSON en vez de despues sobre el sitio construido.
 *   - El bloque de render actual en `[slug].astro` tiene que ser BYTE A BYTE el que este script
 *     espera encontrar (que es el que hay hoy, verificado a mano) — si alguien lo edito desde
 *     entonces, mejor que el script pare a que sustituya algo que ya no es lo que cree que es.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESCRIBIR = process.argv.includes('--escribir');

const rutaJson = path.join(RAIZ, 'src/data/plantilla-pool-builders.json');
const rutaAstro = path.join(RAIZ, 'src/pages/pool-builders/[slug].astro');

const LIT = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));
if (LIT.length !== 3) {
  console.error(`ROJO: se esperaban 3 entradas de primer nivel en LIT, hay ${LIT.length}. `
    + 'La plantilla ya no tiene la forma que este script espera — no se toca nada.');
  process.exit(1);
}

const [s0, hueco1, s2, hueco2, s4] = LIT[1];
if (hueco1 !== null || hueco2 !== null || LIT[1].length !== 5) {
  console.error('ROJO: LIT[1] no tiene la forma [str,null,str,null,str] esperada. No se toca nada.');
  process.exit(1);
}

const iBlogSectionEnLIT10 = s0.indexOf('<section class="blog-section-page">');
if (iBlogSectionEnLIT10 === -1) {
  console.error('ROJO: no encuentro <section class="blog-section-page"> en LIT[1][0]. No se toca nada.');
  process.exit(1);
}
const nuevoB1 = s0.slice(0, iBlogSectionEnLIT10);

const iCtaFooter = s4.indexOf('<section class="cta-footer"');
if (iCtaFooter === -1) {
  console.error('ROJO: no encuentro <section class="cta-footer"> en LIT[1][4]. No se toca nada.');
  process.exit(1);
}
const descartado = s4.slice(0, iCtaFooter);
const nuevoB1b = s4.slice(iCtaFooter);

// ── Autocomprobacion: el trozo que se descarta trae EXACTAMENTE los 10 posts de blogs.json ──
const blogs = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8'));
const titulosEsperados = blogs.posts.map((p) => p.titulo);

const nTarjetas = (descartado.match(/fs-slider-blog_slide/g) ?? []).length;
const titulosHallados = [...descartado.matchAll(/<h3>(.*?)<\/h3>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

const fallos = [];
if (nTarjetas !== 10) fallos.push(`${nTarjetas} apariciones de fs-slider-blog_slide, se esperaban 10`);
if (titulosHallados.length !== titulosEsperados.length) {
  fallos.push(`${titulosHallados.length} titulos <h3>, se esperaban ${titulosEsperados.length}`);
} else {
  titulosEsperados.forEach((t, i) => {
    if (titulosHallados[i] !== t) fallos.push(`titulo ${i}: "${titulosHallados[i]}" !== "${t}"`);
  });
}
if (fallos.length) {
  console.error('ROJO: el contenido descartado de LIT[1][4] no casa con blogs.json:\n  '
    + fallos.join('\n  ') + '\nNo se toca nada.');
  process.exit(1);
}
console.log(`ok   los 10 posts descartados de la plantilla casan con blogs.json (${nTarjetas} tarjetas).`);

// ── Autocomprobacion: el render actual de [slug].astro es EXACTAMENTE el que se espera ──
// CAMPOS vive en UNA sola linea (verificado a mano) — se extrae por linea, no por regex de
// parentesis: contar corchetes a ciegas es fragil cuando el ultimo elemento es `[null]` y no
// `[]`, que es justo la forma que tiene hoy.
const astroFuente = fs.readFileSync(rutaAstro, 'utf8');
const lineaCampos = astroFuente.split('\n').find((l) => l.startsWith('const CAMPOS = '));
if (!lineaCampos) {
  console.error('ROJO: no encuentro una linea "const CAMPOS = ..." en [slug].astro. No se toca nada.');
  process.exit(1);
}
const CAMPOS_RE_LINEA = lineaCampos;
if (!CAMPOS_RE_LINEA.endsWith(';')) {
  console.error('ROJO: la linea de CAMPOS no acaba en ";" como se esperaba. No se toca nada.');
  process.exit(1);
}
const CAMPOS = JSON.parse(CAMPOS_RE_LINEA.slice('const CAMPOS = '.length, -1));
if (CAMPOS.length !== 3 || CAMPOS[1]?.[1]?.c !== 'headingBlog' || CAMPOS[1]?.[3]?.c !== 'paragraphBlog') {
  console.error('ROJO: CAMPOS[1] no tiene los huecos headingBlog/paragraphBlog esperados en los '
    + 'indices 1 y 3. No se toca nada.');
  process.exit(1);
}

const RENDER_VIEJO = `  <Fragment set:html={B[0]} />
  <ResenasGoogle />
  <Fragment set:html={B[1]} />
  <FeedInstagram />
  <Fragment set:html={B[2]} />
</Base>`;
if (!astroFuente.includes(RENDER_VIEJO)) {
  console.error('ROJO: el bloque de render de [slug].astro no es byte a byte el esperado — '
    + 'alguien lo edito desde que se escribio este script. No se toca nada.\n'
    + 'Bloque esperado:\n' + RENDER_VIEJO);
  process.exit(1);
}
console.log('ok   el bloque de render de [slug].astro es el esperado.');

if (!ESCRIBIR) {
  console.log('\nMedido y verificado, nada escrito todavia. Repite con --escribir para aplicar.');
  process.exit(0);
}

// ── Escribe el JSON ──
const LIT_NUEVO = [LIT[0], [nuevoB1], [nuevoB1b], LIT[2]];
fs.writeFileSync(rutaJson, JSON.stringify(LIT_NUEVO));
console.log(`\nescrito  ${rutaJson.replace(RAIZ + '/', '')}`);

// ── Escribe el .astro: CAMPOS sin los dos huecos de blog, import, guarda y render nuevo ──
const CAMPOS_NUEVO = [CAMPOS[0], [], [], CAMPOS[2]];
let astroNuevo = astroFuente.replace(lineaCampos, `const CAMPOS = ${JSON.stringify(CAMPOS_NUEVO)};`);

astroNuevo = astroNuevo.replace(
  "import FeedInstagram from '../../components/widgets/FeedInstagram.astro';",
  "import FeedInstagram from '../../components/widgets/FeedInstagram.astro';\n"
  + "import CarruselBlog from '../../components/widgets/CarruselBlog.astro';",
);

astroNuevo = astroNuevo.replace(
  'const { seo: SEO, ldCrudo: LD_CRUDO } = SEO_RUTAS[slug];',
  "// headingBlog/paragraphBlog ya no son huecos de CAMPOS (R11-BLOG-02, pasaron a props\n"
  + "// directas de CarruselBlog); esta guarda reemplaza la que perdian al salir de CAMPOS —\n"
  + "// un campo vacio en Sanity revienta el build en vez de dejar un carrusel mudo.\n"
  + "if (!d['headingBlog'] || !d['paragraphBlog']) throw new Error(`${slug}: falta headingBlog/paragraphBlog`);\n\n"
  + 'const { seo: SEO, ldCrudo: LD_CRUDO } = SEO_RUTAS[slug];',
);

const RENDER_NUEVO = `  <Fragment set:html={B[0]} />
  <ResenasGoogle />
  <Fragment set:html={B[1]} />
  <CarruselBlog titulo={d['headingBlog']} entradilla={d['paragraphBlog']} />
  <Fragment set:html={B[2]} />
  <FeedInstagram />
  <Fragment set:html={B[3]} />
</Base>`;
astroNuevo = astroNuevo.replace(RENDER_VIEJO, RENDER_NUEVO);

astroNuevo = astroNuevo.replace(
  '// DERIVADO - no editar a mano. Lo genera scripts/build-plantillas.mjs por diff de las\n'
  + '// 53 paginas que habia antes; la autocomprobacion las reprodujo 53/53 byte a byte.\n'
  + '// Regenerar: npm run plantillas',
  '// DERIVADO - no editar a mano. Lo genera scripts/build-plantillas.mjs por diff de las\n'
  + '// 53 paginas que habia antes; la autocomprobacion las reprodujo 53/53 byte a byte.\n'
  + '// Regenerar: npm run plantillas — SALVO el carrusel de blog: ese pipeline ya no puede\n'
  + '// re-derivarse (las 53 paginas de origen no existen desde la Fase 6b, `npm run plantillas`\n'
  + '// sale con «0 paginas · ya convertida»), asi que R11-BLOG-02 lo migro a mano, una vez, con\n'
  + '// scripts/migrar-blog-pool-builders.mjs. Ese cambio puntual SI hay que mantenerlo a mano.',
);

fs.writeFileSync(rutaAstro, astroNuevo);
console.log(`escrito  ${rutaAstro.replace(RAIZ + '/', '')}`);
