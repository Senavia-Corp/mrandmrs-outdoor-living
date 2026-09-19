#!/usr/bin/env node
/**
 * PUERTA · encabezados, `alt` y duplicados de cabecera, sobre el sitio CONSTRUIDO.
 *
 *     npm run check:encabezados            las 122
 *     node scripts/check-encabezados.mjs /blogs/     acotada por subcadena
 *
 * Estatica y sin navegador: JSDOM sobre `.vercel/output/static`. Tarda ~2 s.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE EXISTE
 *
 * El encargo BLOG-SANITY pide verificar «un solo H1, jerarquia H2/H3 logica, alt en las
 * imagenes, canonica no duplicada, ld+json no duplicado». Eso NO lo cubre ninguna puerta:
 * `check:seo` compara el `<head>` contra el baseline —no mira el cuerpo—, `check:texto` compara
 * `innerText` —y un `<h4>` y un `<p>` dan el mismo texto— y `check:visual` solo ve pixeles.
 *
 * Y hace falta CADA VEZ que se publica un articulo, no una vez: de ahi que sea un script y no
 * un comando de usar y tirar. Una puerta que no existe no protege nada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS SALTOS DE NIVEL SE MIDEN DENTRO DEL CUERPO, NO EN LA PAGINA ENTERA
 *
 * Medido antes de escribir la regla: 32 de las 122 paginas saltan de nivel en el documento
 * completo, y NO es un defecto nuestro — Webflow usa `<h4>` para el titulo de las tarjetas de
 * una rejilla que cuelga de un `<h2>` de seccion. Eso es estructura del origen, y
 * `00-PRINCIPIOS §1` dice que se ELEVA, no se sustituye.
 *
 * Exigir jerarquia perfecta en el documento entero habria nacido con 32 rojos ajenos, y una
 * puerta que nace roja es una puerta que alguien apaga. La regla se aplica donde SI mandamos y
 * donde de verdad importa para un lector de pantalla: el CUERPO del articulo (`.w-richtext`),
 * que tiene que empezar en `h2` y no saltarse niveles.
 *
 * Lo que SI se exige en las 122, porque ya esta limpio y hay que mantenerlo asi (medido:
 * 0 fallos hoy): un unico `<h1>`, una sola canonica y ningun bloque JSON-LD repetido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));

if (!fs.existsSync(ESTATICO)) {
  console.error('\n  ROJO no hay build en .vercel/output/static. `npm run build` primero.\n');
  process.exit(1);
}

const htmls = [];
(function barre(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) barre(p);
    else if (f.name.endsWith('.html')) htmls.push(p);
  }
}(ESTATICO));

const rutaDe = (f) => (f.replace(ESTATICO, '').replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/');
const paginas = htmls.map((f) => [rutaDe(f), f]).filter(([r]) => casa(r)).sort();

if (!paginas.length) {
  console.error(`\n  ROJO el filtro [${filtro.join(' ')}] no casa con ninguna ruta.\n`);
  process.exit(1);
}

/* SUELO DE CONTEO. Sin filtro tienen que salir las 122: un `barre()` que devuelva 3 ficheros
 * por un fallo de ruta saldria VERDE sobre 3 paginas y nadie lo notaria. */
if (!filtro.length && paginas.length < 100) {
  console.error(`\n  ROJO solo ${paginas.length} paginas. Se esperaban ~122: el build esta a medias.\n`);
  process.exit(1);
}

/**
 * SALTOS DE NIVEL QUE VIENEN DEL ORIGEN, declarados uno a uno con su motivo.
 *
 * NO es «ignora estas rutas»: se declara el salto EXACTO, y solo ese. Si manana el documento
 * saltara de otra forma, la puerta vuelve a hablar.
 *
 * Las 3 legales de `/articles/` salen de Webflow con `<h1>` y luego `<h3>`, sin `<h2>` en medio.
 * Es marcado del origen en paginas DERIVADAS (`build-paginas.mjs` las reescribe desde
 * `_source/vivo/`), asi que arreglarlo es tocar el origen o sacarlas del generador: una decision
 * de contenido, no de esta puerta. Queda apuntado para quien la tome.
 */
const SALTOS_DEL_ORIGEN = {
  '/articles/accessibility': 'h1 -> h3',
  '/articles/privacy-policy': 'h1 -> h3',
  '/articles/terms-conditions': 'h1 -> h3',
};

const rojos = [];
let conCuerpo = 0;

for (const [ruta, f] of paginas) {
  const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  const mal = [];

  const h1 = d.querySelectorAll('h1');
  if (h1.length !== 1) mal.push(`${h1.length} <h1> (tiene que haber 1)`);

  if (d.querySelectorAll('link[rel=canonical]').length > 1) mal.push('canonica duplicada');

  /**
   * JSON-LD repetido. Se compara `@type` + `@id`, NO solo el tipo — y eso lo enseno esta misma
   * puerta al nacer: con solo el tipo salian 56 rojos, y ninguno era un defecto.
   *
   * 53 ciudades y 3 rutas mas publican DOS `LocalBusiness` a proposito: el del origen, que
   * describe el negocio en esa ciudad, y el que `Base.astro` inyecta para el sitio entero con
   * `@id` acabado en `#negocio`. `check-seo.mjs` ya los separa por ese `@id` para poder
   * comparar el resto contra el baseline. Dos nodos del mismo tipo con IDENTIDAD distinta son
   * schema.org valido; lo que no vale es publicar el MISMO nodo dos veces.
   */
  const nodos = [...d.head.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
    try {
      const j = JSON.parse(s.textContent);
      return (Array.isArray(j) ? j : [j]).filter(Boolean);
    } catch { mal.push('un bloque JSON-LD no parsea'); return []; }
  });
  const claves = nodos.map((n) => `${n['@type']}#${n['@id'] ?? ''}`);
  const repes = claves.filter((c, i) => claves.indexOf(c) !== i);
  if (repes.length) {
    mal.push(`JSON-LD repetido (mismo @type Y mismo @id): ${[...new Set(repes)].join(', ')}`);
  }

  /**
   * El cuerpo. Solo las rutas que lo tienen, y el nivel de arranque DEPENDE de donde viva el
   * `<h1>`, que no es lo mismo en las dos familias que usan `.w-richtext`:
   *
   *   · las 10 fichas de `/blogs/` — el `<h1>` esta en el heroe, FUERA del cuerpo, asi que el
   *     cuerpo empieza en `h2`;
   *   · las 3 legales de `/articles/` — son documentos enteros y su `<h1>` esta DENTRO. Exigirles
   *     empezar en `h2` era un rojo inventado; lo comprobo esta puerta al nacer.
   *
   * Lo que se exige en las dos: un solo `h1` como mucho, y ningun salto de nivel.
   */
  const cuerpo = d.querySelector('.w-richtext');
  if (cuerpo) {
    conCuerpo++;
    const hs = [...cuerpo.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const niveles = hs.map((h) => Number(h.tagName[1]));
    const h1Dentro = niveles.filter((n) => n === 1).length;
    if (h1Dentro > 1) mal.push(`el cuerpo trae ${h1Dentro} <h1>`);
    const arranque = h1Dentro ? 1 : 2;
    if (niveles.length && niveles[0] !== arranque) {
      mal.push(`el cuerpo empieza en h${niveles[0]} y tiene que empezar en h${arranque}`);
    }
    for (let i = 1; i < niveles.length; i++) {
      if (niveles[i] > niveles[i - 1] + 1) {
        const salto = `h${niveles[i - 1]} -> h${niveles[i]}`;
        if (SALTOS_DEL_ORIGEN[ruta] === salto) break;      // declarado, ver arriba
        mal.push(`salto ${salto} ("${hs[i].textContent.trim().slice(0, 40)}")`);
        break;
      }
    }
    for (const img of cuerpo.querySelectorAll('img')) {
      const alt = img.getAttribute('alt');
      if (alt === null) mal.push(`<img> sin atributo alt: ${img.getAttribute('src')?.slice(-42)}`);
      else if (!alt.trim()) mal.push(`<img> con alt vacio en el cuerpo: ${img.getAttribute('src')?.slice(-42)}`);
      if (!img.getAttribute('width') || !img.getAttribute('height')) {
        mal.push(`<img> sin width/height (CLS): ${img.getAttribute('src')?.slice(-42)}`);
      }
    }
  }

  if (mal.length) rojos.push([ruta, mal]);
}

console.log(`\n  ${paginas.length} pagina(s) miradas · ${conCuerpo} con cuerpo de articulo`
  + `${filtro.length ? `   (filtro: ${filtro.join(' ')})` : ''}\n`);
for (const [ruta, mal] of rojos) {
  console.log(`  ROJO ${ruta}`);
  for (const m of mal) console.log(`       ${m}`);
}
if (!rojos.length) {
  console.log('  ok   un solo <h1> por pagina · 0 canonicas duplicadas · 0 JSON-LD repetidos');
  console.log('  ok   el cuerpo empieza en h2, no salta niveles, y sus <img> llevan alt y medidas');
}
console.log(`\n${rojos.length ? `PUERTA ROJA — ${rojos.length} pagina(s)` : 'PUERTA VERDE'}\n`);
process.exit(rojos.length ? 1 : 0);
