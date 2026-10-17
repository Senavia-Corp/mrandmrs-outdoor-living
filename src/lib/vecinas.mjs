/**
 * EL ENLAZADO DE UNA PAGINA DE SERVICIO × CIUDAD (E5-SEO, puntos 2 y 4).
 *
 * POR QUE. Medido sobre produccion: 51 de las 53 ciudades de piscina quedaban a tres clics de la
 * home y 37 tenian UN solo enlace entrante, el de su condado. Y una pagina de ciudad no enlazaba
 * ni a su condado ni a las ciudades de al lado.
 *
 * QUE DEVUELVE, para una ruta `/services/<servicio>/<ciudad>`:
 *   · `mas`     — su ficha, los otros servicios de la MISMA ciudad y su condado. Las 65 paginas que
 *                 no son de piscina ya lo traian escrito en `ciudades-servicios.json`; aqui se
 *                 deriva para las 53 de piscina, con las mismas tres formas de texto.
 *   · `vecinas` — hasta cinco ciudades del MISMO servicio: las de su condado y, si el condado tiene
 *                 menos de tres, las de su zona (norte o sur).
 *
 * DE DONDE SALE LA VECINDAD. No hay coordenadas en el repositorio, asi que la vecindad es el
 * condado, y el condado de cada ciudad se LEE de las nueve paginas de condado, que son las que ya
 * dicen que ciudad cuelga de cual. No es una lista escrita a mano: si una pagina de condado cambia,
 * esto cambia con ella. El nombre visible de cada ciudad sale del mismo sitio.
 *
 * EL REPARTO. Dentro del grupo se toman las cinco SIGUIENTES a la propia en orden alfabetico,
 * dando la vuelta. Asi cada ciudad recibe tantos enlaces como da, en vez de que todas enlacen a
 * las cinco primeras de la lista.
 *
 * Lo usan `PaginaCiudad.astro`, que lo pinta, y `scripts/check-texto.mjs`, que lo declara: una
 * sola funcion, para que no puedan dejar de coincidir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SERVICIOS_CIUDAD } from './servicios-ciudad.mjs';

const RAIZ = process.cwd();
const DIR_CONDADOS = path.join(RAIZ, 'src/pages/services/pool-builders');
const SUR = new Set(['broward-county-fl', 'palm-beach-county-fl']);
const MAX_VECINAS = 5;
const MIN_DEL_CONDADO = 3;

/** ciudad (ultimo tramo de la ruta) → condado, y → nombre visible. Leidos de las paginas de condado. */
const CONDADO_DE = {};
const NOMBRE_DE = {};
for (const f of fs.readdirSync(DIR_CONDADOS).filter((x) => x.endsWith('-county-fl.astro')).sort()) {
  const condado = f.replace(/\.astro$/, '');
  const fuente = fs.readFileSync(path.join(DIR_CONDADOS, f), 'utf8').replace(/\\"/g, '"');
  for (const m of fuente.matchAll(/href="\/services\/pool-builders\/([a-z-]+-fl)"[^>]*>([^<]+)</g)) {
    if (m[1].endsWith('-county-fl')) continue;
    if (CONDADO_DE[m[1]] && CONDADO_DE[m[1]] !== condado) throw new Error(`vecinas: ${m[1]} cuelga de dos condados (${CONDADO_DE[m[1]]} y ${condado})`);
    CONDADO_DE[m[1]] = condado;
    NOMBRE_DE[m[1]] = m[2].replace(/&amp;/g, '&').trim();
  }
}
if (Object.keys(CONDADO_DE).length < 40) throw new Error(`vecinas: solo ${Object.keys(CONDADO_DE).length} ciudades leidas de las paginas de condado; se esperaban 53`);

const OTRAS = Object.keys(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/ciudades-servicios.json'), 'utf8')).paginas);
/** Las 118 rutas de servicio × ciudad: las 53 de piscina y las 65 del resto. */
export const RUTAS_CIUDAD = [...Object.keys(CONDADO_DE).map((c) => `/services/pool-builders/${c}`), ...OTRAS].sort();

const tramo = (ruta) => ruta.split('/').pop();
const nombreCondado = (c) => `${c.replace(/-county-fl$/, '').split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ')} County`;
const zonaDe = (ruta) => (SUR.has(CONDADO_DE[tramo(ruta)]) ? 'South Florida' : 'North Florida');

export function enlazadoDeCiudad(ruta) {
  const [, , servicio, ciudad] = ruta.split('/');
  const sv = SERVICIOS_CIUDAD[servicio];
  const condado = CONDADO_DE[ciudad];
  if (!sv || !condado || !RUTAS_CIUDAD.includes(ruta)) return null;
  const nombre = NOMBRE_DE[ciudad];

  const hermanas = Object.keys(SERVICIOS_CIUDAD).filter((s) => s !== servicio && RUTAS_CIUDAD.includes(`/services/${s}/${ciudad}`))
    .map((s) => ({ href: `/services/${s}/${ciudad}`, nombre: `${SERVICIOS_CIUDAD[s].nombre} in ${nombre}` }));
  const mas = [
    { href: `/services/${servicio}`, nombre: `${sv.nombre} in Florida` },
    ...hermanas,
    { href: `/services/pool-builders/${condado}`, nombre: nombreCondado(condado) },
  ];

  const delServicio = RUTAS_CIUDAD.filter((r) => r.split('/')[2] === servicio);
  const delCondado = delServicio.filter((r) => r !== ruta && CONDADO_DE[tramo(r)] === condado);
  const enCondado = delCondado.length >= MIN_DEL_CONDADO;
  const grupo = enCondado ? delCondado : delServicio.filter((r) => r !== ruta && zonaDe(r) === zonaDe(ruta));
  const orden = [...grupo, ruta].sort();
  const i = orden.indexOf(ruta);
  const giro = [...orden.slice(i + 1), ...orden.slice(0, i)];
  // Sin condado suficiente, las de su condado van delante de las del resto de la zona.
  const elegidas = [...new Set([...(enCondado ? [] : delCondado), ...giro])].slice(0, MAX_VECINAS);
  const ambito = enCondado ? nombreCondado(condado) : zonaDe(ruta);
  const vecinas = elegidas.map((r) => ({ href: r, nombre: NOMBRE_DE[tramo(r)] }));

  return {
    ciudad: nombre,
    mas,
    vecinas,
    rotuloMas: `More for ${nombre} homeowners:`,
    rotuloVecinas: `${sv.nombre} across ${ambito}:`,
    lineaMas: `More for ${nombre} homeowners: ${mas.map((e) => e.nombre).join(' · ')}`,
    lineaVecinas: vecinas.length ? `${sv.nombre} across ${ambito}: ${vecinas.map((e) => e.nombre).join(' · ')}` : null,
  };
}

/**
 * E5-SEO, punto 3 · LAS CIUDADES DE LA FICHA DE PISCINA. Las otras seis fichas ya enlazan a todas
 * sus landings en una linea (`ciudadesDeFicha`); la de piscina, que tiene 53, no enlazaba a
 * ninguna y por eso quedaban a tres clics. Van en dos lineas, norte y sur, con la misma forma.
 */
export function ciudadesDePiscinaPorZona() {
  const rotulo = 'Custom pool builders by city';
  return ['North Florida', 'South Florida'].map((zona) => {
    const ciudades = Object.keys(CONDADO_DE).filter((c) => zonaDe(c) === zona)
      .map((c) => ({ href: `/services/pool-builders/${c}`, nombre: `${NOMBRE_DE[c]}, FL` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { rotulo, zona, ciudades, linea: `${rotulo} · ${zona}: ${ciudades.map((c) => c.nombre).join(' · ')}` };
  });
}

