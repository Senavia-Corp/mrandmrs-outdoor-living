#!/usr/bin/env node
/**
 * PUERTA DE MEDICION — lo que `check:seo` NO mira.
 *
 *     npm run check:medicion        (estatica, sin navegador, <2 s)
 *
 * `check:seo` compara el `<head>` con `baseline/seo.json` carácter a carácter, y eso cubre
 * titulo, descripcion, og:*, twitter:*, canonica y JSON-LD. Lo que NO cubre, y por eso existe
 * esta puerta:
 *
 *   · EL SNIPPET DE GTM. No esta en el baseline —el sitio de Webflow no lo tenia asi— asi que
 *     `check:seo` no lo echaria de menos. Una pagina sin contenedor no mide NADA y no rompe
 *     nada: es el fallo perfecto, invisible hasta que alguien pregunta por que el embudo no
 *     cuadra. Ya paso una vez: `/pool-investment-estimator` no pasa por `Base.astro` y fue
 *     durante un tiempo la unica de las 122 sin medir.
 *   · DOS SNIPPETS EN LA MISMA PAGINA. Duplica los `page_view` y todas las conversiones. Es
 *     peor que no medir, porque los numeros salen y parecen buenos.
 *   · TITULOS Y DESCRIPCIONES REPETIDOS. El baseline los exige IDENTICOS AL ORIGEN, asi que
 *     si el origen ya repetia un titulo en ocho paginas, `check:seo` sale verde. Aqui se
 *     cuenta la repeticion, que es un problema de posicionamiento aunque sea fiel.
 *   · `noindex` FUERA DE `/thank-you`. `check:seo` prohibe el noindex en produccion pagina a
 *     pagina; aqui se dice ademas CUAL es la unica que debe llevarlo, para que quitarselo
 *     tambien sea rojo.
 *   · EL RECUENTO DEL SITEMAP. 119, no 113.
 *
 * ⚠️ Esto mide `.vercel/output/static`, el artefacto CONSTRUIDO. Nunca `astro dev`.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';

const GTM = 'GTM-N9BWB3BV';
const PAGINAS_ESPERADAS = 122;
/**
 * 121 = 113 del sitemap del origen + 6 adiciones de autoria propia + 2 de la auditoria
 * (5-sep-2026). Las dos nuevas son rutas DEL ORIGEN que el sitemap del origen no listaba:
 * /where-we-serve/north-florida (M20) y /pool-investment-estimator (M7). Se replicaba esa
 * ausencia por paridad; Sebastian levanto esa proteccion. El motivo de cada una esta escrito
 * en el ADICIONES de build-seo-ficheros.mjs, que es quien las escribe.
 */
const LOCS_ESPERADAS = 121;
const SOLO_NOINDEX = new Set(['/thank-you']);

/**
 * LAS EXCEPCIONES, DECLARADAS POR SU NOMBRE Y CON SU MOTIVO.
 *
 * No se perdonan callando: se imprimen en cada pasada. Una excepcion que no sale por pantalla
 * deja de estar declarada el dia que nadie abre el fichero. Y al ser una lista cerrada, una
 * excepcion NUEVA —una pagina mas sin descripcion, un tercer titulo repetido— sale ROJA.
 */
const SIN_HEAD_DE_WEBFLOW = new Set(['/pool-investment-estimator']);

/**
 * Titulos repetidos que VIENEN DEL ORIGEN y que aqui NO se pueden arreglar: `check:seo` exige
 * el `<title>` identico a `baseline/seo.json` caracter a caracter, asi que cambiarlos pondria
 * roja una puerta mas fuerte que esta. Son cuatro fichas de `/project/` que el cliente publico
 * con titulo duplicado en Webflow.
 *
 * ⚠️ ES UN DEFECTO REAL DE POSICIONAMIENTO, no un falso positivo: Google elige una de las dos
 * y la otra compite consigo misma. Anotado para Sebastian; la decision de reescribirlos es
 * suya, porque implica separarse del origen.
 */
const DUPLICADOS_DEL_ORIGEN = new Set([
  // ARREGLADOS el 5-sep-2026 (M2). Estaban los dos pares que el cliente publico duplicados en
  // Webflow. Ya no hay ninguno: check-seo.mjs los declara en TITULO_PROPIO y ademas EXIGE que
  // ninguno de los 122 titulos se repita, que es una puerta mas dura que este perdon.
  // La lista se deja vacia a proposito, no se borra: si vuelve a aparecer un duplicado, esta
  // puerta lo cantara como excepcion NUEVA y saldra roja, que es justo lo que tiene que pasar.
]);

let fallos = 0;
const check = (n, cond, detalle = '') => {
  console.log(`  ${cond ? 'ok  ' : 'ROJO'} ${n}${detalle ? ` — ${detalle}` : ''}`);
  if (!cond) fallos++;
};

if (!fs.existsSync(ESTATICO)) {
  console.log(`\n  ROJO no existe ${path.relative(RAIZ, ESTATICO)} — construye antes (npm run build)\n`);
  process.exit(1);
}

/** Todas las .html del build, con su ruta publica. `build.format: 'file'` -> `/x.html` = `/x`. */
const htmls = [];
(function anda(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) anda(p);
    else if (e.name.endsWith('.html')) htmls.push(p);
  }
}(ESTATICO));

const ruta = (p) => '/' + path.relative(ESTATICO, p).replace(/\.html$/, '').replace(/\/?index$/, '');

console.log(`\n  ETIQUETADO — ${htmls.length} paginas construidas`);
check(`${PAGINAS_ESPERADAS} paginas`, htmls.length === PAGINAS_ESPERADAS, `hay ${htmls.length}`);

const sinGtm = [], dobleGtm = [], sinNoscript = [], dobleNoscript = [];
const titulos = new Map(), descripciones = new Map();
const noindexIndebido = [], sinNoindex = [];

for (const f of htmls) {
  const html = fs.readFileSync(f, 'utf8');
  const r = ruta(f);

  // El snippet sincrono. Se cuenta la URL del contenedor, no la cadena `GTM-` a secas: esa
  // aparece tambien en el <noscript> y en cualquier comentario que lo mencione.
  const n = (html.match(new RegExp(`gtm\\.js\\?id=('\\s*\\+\\s*i|${GTM})`, 'g')) || []).length
    + (html.match(new RegExp(`'${GTM}'`, 'g')) || []).length;
  // El snippet oficial pasa el id como argumento (`...,'GTM-XXXX')`) y arma la URL con `+i`,
  // asi que un snippet integro deja EXACTAMENTE una de cada: 2 coincidencias.
  if (n === 0) sinGtm.push(r); else if (n > 2) dobleGtm.push(`${r} (${n})`);

  const ns = (html.match(/googletagmanager\.com\/ns\.html/g) || []).length;
  if (ns === 0 && !SIN_HEAD_DE_WEBFLOW.has(r)) sinNoscript.push(r);
  else if (ns > 1) dobleNoscript.push(`${r} (${ns})`);

  const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
  if (t) titulos.set(t, [...(titulos.get(t) || []), r]);
  else fallos += (console.log(`  ROJO ${r} — <title> vacio`), 1);

  const dm = html.match(/<meta name="description" content="([^"]*)"/);
  const desc = dm ? dm[1].trim() : '';
  if (desc) descripciones.set(desc, [...(descripciones.get(desc) || []), r]);
  else if (!SIN_HEAD_DE_WEBFLOW.has(r)) fallos += (console.log(`  ROJO ${r} — meta description vacia o ausente`), 1);

  // El interruptor de indexacion gobierna el resto; aqui solo la excepcion declarada.
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (PROD) {
    if (noindex && !SOLO_NOINDEX.has(r)) noindexIndebido.push(r);
    if (!noindex && SOLO_NOINDEX.has(r)) sinNoindex.push(r);
  }
}

check(`las ${htmls.length} con el snippet de ${GTM}`, sinGtm.length === 0, sinGtm.slice(0, 5).join(', '));
check('cero doble etiquetado', dobleGtm.length === 0, dobleGtm.slice(0, 5).join(', '));
check(`${htmls.length - SIN_HEAD_DE_WEBFLOW.size} con el <noscript> heredado`, sinNoscript.length === 0, sinNoscript.slice(0, 5).join(', '));
check('el <noscript> no esta duplicado', dobleNoscript.length === 0, dobleNoscript.slice(0, 5).join(', '));

console.log('\n  METAETIQUETAS');
const repes = (m) => [...m.entries()].filter(([, rs]) => rs.length > 1);
const rd = repes(descripciones);
const rt = repes(titulos).filter(([t]) => !DUPLICADOS_DEL_ORIGEN.has(t));
check('titulos unicos (sin contar los declarados)', rt.length === 0,
  rt.slice(0, 3).map(([t, rs]) => `"${t.slice(0, 42)}" x${rs.length}`).join(' · '));
check('descripciones unicas', rd.length === 0,
  rd.slice(0, 3).map(([, rs]) => `${rs.length} paginas: ${rs.slice(0, 2).join(', ')}`).join(' · '));

if (PROD) {
  check('noindex SOLO en /thank-you', noindexIndebido.length === 0 && sinNoindex.length === 0,
    [...noindexIndebido.map((r) => `sobra en ${r}`), ...sinNoindex.map((r) => `falta en ${r}`)].slice(0, 5).join(', '));
} else {
  console.log('  --   noindex: no se mide fuera de produccion (lo lleva TODA la salida, a proposito)');
}

console.log('\n  SITEMAP');
const sm = path.join(ESTATICO, 'sitemap.xml');
if (!fs.existsSync(sm)) check('existe sitemap.xml', false);
else {
  const locs = [...fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (PROD) check(`${LOCS_ESPERADAS} <loc> (113 del origen + 6 propias + 2 de la auditoria)`, locs.length === LOCS_ESPERADAS, `hay ${locs.length}`);
  else check('vacio fuera de produccion', locs.length === 0, `hay ${locs.length}`);
}

console.log('\n  EXCEPCIONES DECLARADAS — se imprimen siempre, no se perdonan callando');
for (const r of SIN_HEAD_DE_WEBFLOW) {
  console.log(`  --   ${r}: sin <noscript> de GTM. No pasa por Base.astro. Desde el 5-sep-2026 SI`);
  console.log('       lleva description y tarjeta social propias (M7); el <noscript> sigue');
  console.log('       fuera porque su GTM va en linea. Mismo trato que en check:seo.');
}
for (const t of DUPLICADOS_DEL_ORIGEN) {
  const n = (titulos.get(t) || []).length;
  console.log(`  --   titulo repetido x${n} HEREDADO: "${t.slice(0, 56)}"`);
}
if (DUPLICADOS_DEL_ORIGEN.size) {
  console.log('       Son del origen y check:seo exige el <title> identico, asi que no se tocan');
  console.log('       aqui. Defecto real de posicionamiento anotado para Sebastian.');
} else {
  console.log('  ok   0 titulos duplicados heredados — los dos pares de /project/ se arreglaron');
  console.log('       el 5-sep-2026 (M2). check:seo los declara y ademas exige que NINGUNO de');
  console.log('       los 122 titulos se repita, que es mas duro que este perdon.');
}

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
