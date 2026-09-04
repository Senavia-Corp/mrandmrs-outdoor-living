#!/usr/bin/env node
/**
 * PUERTA de la Fase 9 — el `<head>` de las 115 contra `baseline/seo.json`.
 *
 *     npm run check:seo
 *
 * Es ESTÁTICA a propósito: lee el HTML construido, no abre navegador. El `<head>` no lo toca
 * ningún JS en este sitio, así que meter un navegador solo añadiría 13 minutos y una fuente de
 * fallos que no aporta nada.
 *
 * QUÉ SE EXIGE IDÉNTICO
 *   · `<title>` y `meta description`, carácter a carácter
 *   · todos los `og:*` y `twitter:*` que el origen tenga
 *   · el JSON-LD, comparado con las CLAVES ORDENADAS para que el orden no cause falsos rojos
 *
 * QUÉ SE EXIGE DISTINTO, Y POR QUÉ
 *   · **La canónica.** El sitio vivo NO tiene ni una en las 115 — comprobado. La Fase 9 del
 *     encargo las pide, así que son una ADICIÓN DELIBERADA. Aquí se exige que existan y que
 *     apunten a la propia página; comparar contra el baseline daría rojo en las 115 por algo
 *     que hicimos a propósito.
 *   · **Las URLs de imagen** de `og:image`/`twitter:image` apuntan a este dominio, no al CDN
 *     de Webflow. Se comparan por el NOMBRE del fichero, que es lo que tiene que coincidir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { esPropia, conPropias } from './lib/rutas-propias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';

const ref = JSON.parse(fs.readFileSync(path.join(RAIZ, 'baseline/seo.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

/**
 * El baseline guarda las URLs del CDN de Webflow; el build las tiene ya locales. Para
 * comparar peras con peras se traduce el BASELINE con el manifiesto — que es el mismo mapa
 * que uso el generador — en vez de recortar nombres a ojo. Si una URL del baseline no esta en
 * el manifiesto, se deja tal cual y la diferencia sale: eso es una URL que nadie migro.
 */
const aLocal = (t) => String(t).replace(
  /https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g,
  (u) => {
    while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1);
    // `industry-solutions` repite el id de sitio en la ruta (defecto del origen, ya anotado en
    // la Fase 2: la URL con el id duplicado da 403). El manifiesto guarda la normalizada.
    const norm = u.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/');
    return man[u]?.publico ?? man[norm]?.publico ?? u;
  });
const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));

/**
 * `/pool-investment-estimator` no es una página de Webflow: es la app de Webflow Cloud, con su
 * propio `<head>` de 4 etiquetas. No tiene og:* ni JSON-LD que comparar, ni en el origen.
 */
const SIN_HEAD_DE_WEBFLOW = new Set(['/pool-investment-estimator']);

/**
 * LAS RUTAS DE AUTORIA PROPIA no tienen entrada en `baseline/seo.json` y no pueden tenerla:
 * no existen en el origen. La tentacion es saltarlas enteras, y seria un error — la canonica
 * y el `noindex` son justo lo que hay que vigilar en una pagina nueva, porque es la que puede
 * colarse indexada desde una preview. Asi que se les cambia el criterio, no se les quita:
 * donde a las 115 se les exige que el `<head>` COINCIDA con el del origen, a estas se les
 * exige que ESTE — titulo y descripcion no vacios— y despues pasan por el mismo bloque de
 * canonica/noindex que todas. Ver `lib/rutas-propias.mjs`.
 */

let fallos = 0, ok = 0;
const rojos = [];
const nombre = (u) => String(u).split('/').pop().split('?')[0].toLowerCase();
const ordena = (v) => (Array.isArray(v) ? v.map(ordena)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordena(v[k])])) : v);

for (const ruta of conPropias(RUTAS)) {
  const f = [path.join(ESTATICO, ruta + '.html'), path.join(ESTATICO, ruta, 'index.html'),
    path.join(ESTATICO, ruta === '/' ? 'index.html' : '')].find((c) => c && fs.existsSync(c));
  if (!f) { rojos.push([ruta, ['no esta construida']]); fallos++; continue; }
  const propia = esPropia(ruta);
  const esperado = ref[ruta];
  if (!esperado && !propia) { rojos.push([ruta, ['no hay baseline de SEO']]); fallos++; continue; }

  const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  const problemas = [];

  const titulo = d.querySelector('title')?.textContent ?? '';
  if (propia) {
    // No hay con que comparar: se exige que EXISTAN, no que coincidan.
    if (!titulo.trim()) problemas.push('title vacio');
    if (!(d.querySelector('meta[name=description]')?.content ?? '').trim()) {
      problemas.push('meta description vacia');
    }
  } else if (titulo !== esperado.title) problemas.push(`title: "${esperado.title}" -> "${titulo}"`);

  if (!propia && !SIN_HEAD_DE_WEBFLOW.has(ruta)) {
    const hay = {};
    for (const m of d.head.querySelectorAll('meta[property],meta[name]')) {
      const k = m.getAttribute('property') || m.getAttribute('name');
      if (/^(og:|twitter:|description$|robots$|keywords$)/.test(k)) hay[k] = m.content;
    }
    for (const [k, v] of Object.entries(esperado.meta ?? {})) {
      if (k === 'robots') continue;                    // lo gobierna el interruptor de indexacion
      const m = hay[k];
      if (m === undefined) { problemas.push(`falta ${k}`); continue; }
      const esImagen = /^(og:image|twitter:image)/.test(k);
      if (esImagen ? nombre(m) !== nombre(aLocal(v)) : m !== v) {
        problemas.push(`${k}: "${String(v).slice(0, 50)}" -> "${String(m).slice(0, 50)}"`);
      }
    }
    const sobra = Object.keys(hay).filter((k) => k !== 'robots' && !(k in (esperado.meta ?? {})));
    if (sobra.length) problemas.push(`meta de mas: ${sobra.join(', ')}`);

    // JSON-LD: mismo numero de bloques y mismo contenido con las claves ordenadas.
    const bloques = [...d.head.querySelectorAll('script[type="application/ld+json"]')];
    const espLd = esperado.jsonLd ?? [];
    if (bloques.length !== espLd.length) {
      problemas.push(`JSON-LD: ${espLd.length} bloque(s) -> ${bloques.length}`);
    } else {
      for (const [i, b] of bloques.entries()) {
        const e = espLd[i];
        let mio; try { mio = ordena(JSON.parse(b.textContent)); } catch { problemas.push(`JSON-LD ${i} no parsea`); continue; }
        const a = JSON.stringify(mio);
        const c = aLocal(JSON.stringify(ordena(e)));
        if (a !== c) {
          const ja = JSON.parse(a), jc = JSON.parse(c);
          const claves = [...new Set([...Object.keys(ja), ...Object.keys(jc)])]
            .filter((k) => JSON.stringify(ja[k]) !== JSON.stringify(jc[k]));
          problemas.push(`JSON-LD ${i} difiere en: ${claves.slice(0, 4).join(', ') || '(anidado)'}`);
        }
      }
    }
  }

  // La canonica: adicion deliberada, solo en produccion.
  const can = d.querySelector('link[rel=canonical]')?.getAttribute('href');
  if (PROD && !can) problemas.push('falta la canonica (PUBLIC_ES_PRODUCCION=1)');
  if (!PROD && can) problemas.push('hay canonica fuera de produccion: en preview no debe emitirse');
  const noindex = /noindex/.test(d.querySelector('meta[name=robots]')?.content ?? '');
  if (!PROD && !noindex) problemas.push('falta noindex fuera de produccion');
  if (PROD && noindex) problemas.push('hay noindex EN PRODUCCION');

  if (problemas.length) { rojos.push([ruta, problemas]); fallos++; } else ok++;
}

console.log(`\n  modo: ${PROD ? 'PRODUCCION (canonica si, noindex no)' : 'preview (noindex si, canonica no)'}`);
// Se cuentan por separado a proposito: a las del origen se les exige el `<head>` IDENTICO, a
// las propias solo que este y que la indexacion sea correcta. Un unico total las mezclaria y
// diria «116/115», que ademas de raro sugiere que hay una pagina de mas.
const nPropias = conPropias(RUTAS).length - RUTAS.length;
console.log(`  ${ok - nPropias}/${RUTAS.length} paginas con el head identico al origen`);
console.log(`  ${nPropias} de autoria propia: head propio, indexacion vigilada igual\n`);
for (const [r, ps] of rojos.slice(0, 10)) {
  console.log(`  ROJO ${r}`);
  ps.slice(0, 5).forEach((p) => console.log(`       ${p}`));
}
if (rojos.length > 10) console.log(`  ... y ${rojos.length - 10} paginas mas`);

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} pagina(s)`}\n`);
process.exit(fallos ? 1 : 0);
