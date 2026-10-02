/**
 * LAS CATEGORIAS DE LA GALERIA, y el marcado de sus tarjetas, en un solo sitio.
 *
 * Lo cargan DOS mundos que no comparten nada mas: `scripts/build-paginas.mjs`, que inyecta las
 * tarjetas en `/gallery` (pagina DERIVADA, se escribe como cadena), y
 * `src/pages/gallery/[categoria].astro`, que las pinta al pie de cada categoria. Por eso el
 * marcado es una funcion que devuelve HTML y no un componente Astro: un componente no se puede
 * llamar desde el generador, y dos copias del mismo marcado dejan de ser iguales al primer
 * arreglo.
 *
 * `readFileSync` y no `import ... with { type: 'json' }`, por lo mismo que
 * `scripts/lib/rutas-propias.mjs`: lo cargan puertas, y un fallo de sintaxis de import
 * assertions las tiraria todas a la vez.
 */
import fs from 'node:fs';
import path from 'node:path';

// `process.cwd()` y no `import.meta.url`: dentro del build de Astro este modulo viaja en un
// chunk y su URL ya no cuelga de `src/lib`. Generador, puertas y build corren desde la raiz.
const FICHERO = path.resolve(process.cwd(), 'src/data/galeria-categorias.json');

export const CATEGORIAS = JSON.parse(fs.readFileSync(FICHERO, 'utf8')).categorias;

export const rutaDe = (c) => `/gallery/${c.slug}`;

/** La miniatura de la tarjeta: la escribe `scripts/build-galeria-portadas.mjs`. */
export const portadaDe = (c) => `/images/galeria-categorias/${c.slug}.webp`;

/** El texto del enlace de cada tarjeta. Lo lee tambien `check-texto.mjs`: una sola formula. */
export const enlaceDe = (c) => `See ${c.nombre.toLowerCase()}`;

export const TITULO_TARJETAS = 'Browse by service';
export const TITULO_OTRAS = 'More project galleries';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Las tarjetas. `sin` quita una categoria (la pagina en la que ya se esta).
 * La tarjeta entera es el enlace: el `::after` del «See …» la cubre (galeria.css §8), asi que
 * hay UNA parada de tabulador por tarjeta y la foto lleva `alt=""` — el nombre ya esta en el
 * titular de al lado, y repetirlo seria leerlo dos veces.
 */
export function tarjetasHtml({ titulo = TITULO_TARJETAS, sin = null, perezosa = false } = {}) {
  const items = CATEGORIAS.filter((c) => c.slug !== sin).map((c) => (
    '<li class="gal-cat">'
    + `<img class="gal-cat__foto" src="${portadaDe(c)}" alt="" width="640" height="427"`
    + ` loading="${perezosa ? 'lazy' : 'eager'}" decoding="async">`
    + `<h3 class="gal-cat__nombre">${esc(c.nombre)}</h3>`
    + `<p class="gal-cat__linea">${esc(c.linea)}</p>`
    + `<a class="gal-cat__mas" href="${rutaDe(c)}">${esc(enlaceDe(c))}</a>`
    + '</li>'
  )).join('');
  return '<nav class="gal-cats" aria-labelledby="gal-cats-tit">'
    + `<h2 class="gal-cats__tit" id="gal-cats-tit">${esc(titulo)}</h2>`
    + `<ul class="gal-cats__lista">${items}</ul>`
    + '</nav>';
}

/** Las lineas que las tarjetas anaden al `innerText`, en orden. Para `check-texto.mjs`. */
export const lineasTarjetas = () => [
  TITULO_TARJETAS,
  ...CATEGORIAS.flatMap((c) => [c.nombre, c.linea, enlaceDe(c)]),
];
