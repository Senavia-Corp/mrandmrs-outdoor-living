#!/usr/bin/env node
/**
 * PUERTA · el serializador de Portable Text reproduce el cuerpo que HOY sirve el sitio.
 *
 *     node scripts/check-portable-text.mjs            los 10
 *     node scripts/check-portable-text.mjs permits    acotado por subcadena del slug
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE PRUEBA, Y POR QUE ESTA ESCRITA ANTES DE MIGRAR NADA
 *
 * Los 10 articulos se sirven hoy desde HTML horneado de Webflow (`_source/vivo/blogs_*.html`) y
 * van a pasar a servirse desde el Portable Text que ya esta en Sanity. Si el serializador no
 * reproduce el mismo texto, `check:texto` -que compara `innerText` al 100% sin tolerancia- se
 * pondra roja en 10 rutas, y la tentacion sera re-baselinizar para taparlo.
 *
 * Re-baselinizar es el unico acto irreversible del sistema. Esta puerta existe para que esa
 * decision se tome MIRANDO EL DIFF, no a ciegas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL EXTRACTOR ES EL MISMO EN LOS DOS LADOS, Y ESO ES EL TRUCO
 *
 * JSDOM no implementa `innerText` (solo `textContent`, que no mete saltos en los limites de
 * bloque). Levantar Chromium para esto costaria un minuto por ruta y secuestraria la pantalla.
 *
 * No hace falta: lo que se compara son DOS HTML que deberian dar el mismo `innerText`. Si se
 * les aplica el MISMO extractor, cualquier rareza del extractor se cancela en los dos lados y
 * solo sobreviven las diferencias de verdad. Lo que esta puerta NO puede probar es que el
 * extractor case con el de Chromium -eso lo prueba `check:texto` despues, sobre el build-.
 *
 * Las `<figure>` no aportan `innerText` (el `alt` no lo es), asi que la comparacion es neutral
 * a que R22 quitara 4 figuras de `top-10` y metiera 3 en cada uno.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y ADEMAS SE COMPARA EL PERFIL DE ETIQUETAS, PORQUE EL TEXTO SOLO NO BASTA
 *
 * Roto a proposito al escribirla: cambiar la marca `em` para que pintara `<ii>` en vez de
 * `<em>` dejo la puerta VERDE. Es correcto que el texto no se moviera -un elemento inline no
 * mete salto de linea- pero significa que perder todos los `<strong>` de un articulo pasaba sin
 * que nadie se enterara, y en estos cuerpos hay 1.101 `<strong>`.
 *
 * Asi que se comparan las dos cosas: el texto Y el recuento de etiquetas. La segunda es la que
 * cubre el marcado inline, que es justo lo que `check:texto` tampoco ve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { groq, SIN_BORRADORES } from './lib/sanity.mjs';
import { aHtml } from '../src/lib/portable-text.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (s) => !filtro.length || filtro.some((f) => s.includes(f));

const BLOQUE = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI',
  'DIV', 'FIGURE', 'TABLE', 'TR', 'BLOCKQUOTE', 'SECTION', 'ARTICLE']);

/** `innerText` aproximado: texto con salto en cada limite de bloque, espacios colapsados. */
function comoInnerText(nodo) {
  const lineas = [];
  let actual = '';
  const empuja = () => { const t = actual.replace(/\s+/g, ' ').trim(); if (t) lineas.push(t); actual = ''; };
  (function anda(n) {
    for (const h of n.childNodes) {
      if (h.nodeType === 3) { actual += h.nodeValue; continue; }
      if (h.nodeType !== 1) continue;
      if (h.tagName === 'BR') { empuja(); continue; }
      if (BLOQUE.has(h.tagName)) { empuja(); anda(h); empuja(); } else anda(h);
    }
  }(nodo));
  empuja();
  return lineas;
}

/** El recuento de etiquetas que importan. Cubre lo que el texto no ve: el marcado inline. */
const ETIQUETAS = ['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'A', 'FIGURE', 'TABLE'];
const perfil = (nodo) => Object.fromEntries(
  ETIQUETAS.map((t) => [t, nodo.querySelectorAll(t.toLowerCase()).length]).filter(([, n]) => n));
const difPerfil = (a, b) => ETIQUETAS
  .filter((t) => (a[t] ?? 0) !== (b[t] ?? 0))
  .map((t) => `${t.toLowerCase()} ${a[t] ?? 0}->${b[t] ?? 0}`);

const cuerpoDeOrigen = (slug) => {
  const f = path.join(RAIZ, '_source/vivo', `blogs_${slug}.html`);
  if (!fs.existsSync(f)) return null;
  const rt = new JSDOM(fs.readFileSync(f, 'utf8')).window.document.querySelector('.w-richtext');
  if (!rt) return null;
  /* Las `<figure>` del origen se van: R22 las sustituyo, y su recuento no es comparable. */
  for (const f2 of rt.querySelectorAll('figure')) f2.remove();
  return { lineas: comoInnerText(rt), perfil: perfil(rt) };
};

const cuerpoDeSanity = (doc) => {
  const html = aHtml(doc.blog, doc.slug);
  const rt = new JSDOM(`<div class="w-richtext">${html}</div>`)
    .window.document.querySelector('.w-richtext');
  for (const f of rt.querySelectorAll('figure')) f.remove();
  return { lineas: comoInnerText(rt), perfil: perfil(rt) };
};

const main = async () => {
  const docs = await groq(`*[_type == "blogPost" && ${SIN_BORRADORES}] | order(slug.current asc)`
    + '{ "slug": slug.current, blog }');
  const mirados = docs.filter((d) => casa(d.slug));
  console.log(`\n  ${mirados.length} articulo(s) de ${docs.length}`
    + `${filtro.length ? ` (filtro: ${filtro.join(' ')})` : ''}\n`);

  let mal = 0; let sinOrigen = 0;
  for (const d of mirados) {
    const orig = cuerpoDeOrigen(d.slug);
    if (!orig) {
      /* Una ruta nueva no tiene origen. NO es verde: es que no se ha medido. */
      console.log(`  ---- ${d.slug.slice(0, 62).padEnd(62)} sin origen en _source/vivo: NO MEDIDA`);
      sinOrigen++;
      continue;
    }
    const nuevo = cuerpoDeSanity(d);
    const mismoTexto = orig.lineas.join('\n') === nuevo.lineas.join('\n');
    const dif = difPerfil(orig.perfil, nuevo.perfil);
    if (mismoTexto && !dif.length) {
      console.log(`  OK   ${d.slug.slice(0, 62).padEnd(62)} ${String(orig.lineas.length).padStart(3)} lineas`
        + `  ${ETIQUETAS.filter((t) => orig.perfil[t]).map((t) => `${t.toLowerCase()}:${orig.perfil[t]}`).join(' ')}`);
      continue;
    }
    mal++;
    console.log(`\n  ROJO ${d.slug}`);
    if (dif.length) console.log(`       ETIQUETAS que no casan: ${dif.join(' · ')}`);
    if (!mismoTexto) console.log(`       origen ${orig.lineas.length} lineas · sanity ${nuevo.lineas.length} lineas`);
    const n = mismoTexto ? 0 : Math.max(orig.lineas.length, nuevo.lineas.length);
    let enseñadas = 0;
    for (let i = 0; i < n && enseñadas < 6; i++) {
      if (orig.lineas[i] === nuevo.lineas[i]) continue;
      console.log(`       linea ${i}`);
      console.log(`         origen: ${JSON.stringify((orig.lineas[i] ?? '(no hay)').slice(0, 130))}`);
      console.log(`         sanity: ${JSON.stringify((nuevo.lineas[i] ?? '(no hay)').slice(0, 130))}`);
      enseñadas++;
    }
    console.log('');
  }

  console.log(`\n  ${mirados.length - mal - sinOrigen} identicas · ${mal} en rojo`
    + `${sinOrigen ? ` · ${sinOrigen} SIN MEDIR (sin origen)` : ''}\n`);
  process.exit(mal ? 1 : 0);
};

main().catch((e) => { console.error('\n  ROJO', e.message, '\n'); process.exit(1); });
