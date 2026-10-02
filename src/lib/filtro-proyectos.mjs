/**
 * EL INDICE `/projects`: que obras salen, en que filtro, y que texto añade el desplegable.
 *
 * Lo cargan cuatro sitios que no comparten nada mas: `scripts/build-paginas.mjs` (quita las
 * ocultas y pone `data-servicios`), `src/components/widgets/FiltroProyectos.astro` (pinta las
 * opciones), `scripts/check-texto.mjs` y `scripts/check-seo.mjs` (declaran lo quitado y lo
 * añadido). Una sola formula para el marcado y para las puertas, como `galeria-categorias.mjs`.
 *
 * `readFileSync` + `process.cwd()` por lo mismo que `galeria-categorias.mjs`: lo cargan puertas,
 * y dentro del build de Astro este modulo viaja en un chunk que ya no cuelga de `src/lib`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIAS } from './galeria-categorias.mjs';

const lee = (rel) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'));
const INDICE = lee('src/data/proyectos-indice.json');
const PROPIAS = lee('src/data/proyectos-propios.json').obras;

export const OCULTAS = new Set(INDICE.ocultas.map((o) => o.slug));

export const ETIQUETA = 'Filter projects by service';
export const TODAS = 'All';

/** Las obras propias que salen en `/projects`, en su orden. */
export const propiasEnIndice = () => PROPIAS.filter((o) => !OCULTAS.has(o.slug));

/** Los servicios de una tarjeta: los de la obra propia, o los declarados para la migrada. */
export function serviciosDe(slug) {
  return PROPIAS.find((o) => o.slug === slug)?.servicios ?? INDICE.servicios[slug] ?? [];
}

/** Las opciones del desplegable: solo las categorias con al menos una obra visible. */
export function opcionesFiltro() {
  const visibles = [...PROPIAS.map((o) => o.slug), ...Object.keys(INDICE.servicios)]
    .filter((s) => !OCULTAS.has(s));
  const usados = new Set(visibles.flatMap(serviciosDe));
  return CATEGORIAS.filter((c) => usados.has(c.id)).map((c) => ({ id: c.id, nombre: c.nombre }));
}

/** Las lineas que el desplegable añade al `innerText`, en orden. El contador nace vacio. */
export const lineasFiltro = () => [ETIQUETA, TODAS, ...opcionesFiltro().map((o) => o.nombre)];
