/**
 * S2 / S3 (D-254, L3a de PUBLICAR, 25-oct-2026) · EL BLOQUE LOCAL DE LAS RUTAS DE PISCINA.
 *
 * Una funcion para las tres piezas que lo usan: `PaginaCiudad.astro` (las 53 ciudades de piscina),
 * `build-paginas.mjs` (los 9 condados) y `check-texto.mjs` (las lineas que emite). Lo que afirma
 * sale de datos del repo y de nada mas (D-258):
 *   · condado y zona           `vecinas.mjs`
 *   · obra con ubicacion       `src/data/obra-ubicacion.json` (D-253) + `banco-imagenes.json`
 *   · parrafo y FAQ local      `src/data/texto-local.json` (filas T-247… de STITCH-TEXTO.md)
 * Donde no hay obra ubicada no hay fotos; donde no hay parrafo no hay parrafo. Nunca se rellena.
 *
 * Solo rutas de piscina (`/services/pool-builders/<ciudad>-fl` y `<condado>-county-fl`): las 65
 * landings de los otros servicios quedan como estan (L3c-L3f, D-251).
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUTAS_CIUDAD, CONDADO_DE_RUTA, NOMBRE_DE_RUTA, nombreCondado, zonaDeCondado } from './vecinas.mjs';
import { fotoDeHeroe, fotosDeSeccion } from './heroe-ciudad.mjs';

const RAIZ = process.cwd();
const lee = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));
const BANCO = lee('src/data/banco-imagenes.json');
const UBICACION = Object.fromEntries(Object.entries(lee('src/data/obra-ubicacion.json')).filter(([k]) => !k.startsWith('_')));
export const TEXTO_LOCAL = Object.fromEntries(Object.entries(lee('src/data/texto-local.json')).filter(([k]) => !k.startsWith('_')));
const GALERIA = new Set((lee('src/data/galeria-obra-por-ruta.json')._defecto?.fotos ?? []).map((f) => f.src));

const FOTOS_MAX = 3;
const esPiscina = (r) => /^\/services\/pool-builders\/[a-z-]+-fl$/.test(r);
const esCondadoRuta = (r) => r.endsWith('-county-fl');
const CIUDADES_PISCINA = RUTAS_CIUDAD.filter(esPiscina).sort();

/** Donde se hizo una foto, segun D-253: por su obra o, si no tiene, por su propio id. */
const lugarDe = (f) => UBICACION[f.proyecto] ?? UBICACION[f.id] ?? null;
const prioridad = (f) => ((f.servicios ?? []).some((s) => s === 'construction' || s === 'remodeling') ? 0 : 1);
const aprobada = (f) => String(f.estado ?? '').startsWith('aprobada') && f.src && f.ancho && f.alto && f.alt;

/**
 * Las fotos de obra cerca de una ruta (D-269): primero las de piscina (`servicios` construction o
 * remodeling), ciudad antes que condado; si no llegan a tres, se completan con obra ubicada de otros
 * servicios, cada una con su `alt` del banco y su rotulo «In <Ciudad>» / «In <Condado> County». Las
 * del condado se reparten por turno entre sus ciudades, para que dos ciudades del mismo condado no
 * enseñen las mismas tres. Nunca repiten el hero, las de seccion ni las de la galeria de obra.
 */
function fotosDeObra(ruta, slug, condado) {
  const fuera = new Set([fotoDeHeroe(ruta)?.id, ...fotosDeSeccion(ruta).map((f) => f.id)].filter(Boolean));
  const candidatas = BANCO.filter((f) => aprobada(f) && !fuera.has(f.id) && !GALERIA.has(f.src) && lugarDe(f));
  const porId = (a, b) => a.id.localeCompare(b.id);
  const hermanas = CIUDADES_PISCINA.filter((r) => CONDADO_DE_RUTA[r] === condado);
  const turno = esCondadoRuta(ruta) ? 0 : Math.max(0, hermanas.indexOf(ruta)) + 1;
  const gira = (xs) => { if (!xs.length) return xs; const d = (turno * FOTOS_MAX) % xs.length; return [...xs.slice(d), ...xs.slice(0, d)]; };
  const enCiudad = (f) => !esCondadoRuta(ruta) && lugarDe(f).ciudad === slug;
  const enCondado = (f) => !enCiudad(f) && lugarDe(f).condado === condado;
  const piscina = (f) => prioridad(f) === 0;
  const bolsas = [
    [candidatas.filter((f) => enCiudad(f) && piscina(f)).sort(porId), `In ${NOMBRE_DE_RUTA[ruta]}`],
    [gira(candidatas.filter((f) => enCondado(f) && piscina(f)).sort(porId)), `In ${nombreCondado(condado)}`],
    [candidatas.filter((f) => enCiudad(f) && !piscina(f)).sort(porId), `In ${NOMBRE_DE_RUTA[ruta]}`],
    [gira(candidatas.filter((f) => enCondado(f) && !piscina(f)).sort(porId)), `In ${nombreCondado(condado)}`],
  ];
  const fotos = []; const vistas = new Set();
  for (const [bolsa, donde] of bolsas) {
    for (const f of bolsa) {
      if (fotos.length === FOTOS_MAX) break;
      if (vistas.has(f.id)) continue;
      vistas.add(f.id); fotos.push({ ...sinNada(f), donde });
    }
  }
  return fotos;
}
const sinNada = (f) => ({ id: f.id, src: f.src, alt: f.alt, ancho: f.ancho, alto: f.alto });

/** El bloque de una ruta de piscina, o null si la ruta no lo lleva. */
export function bloqueLocal(ruta) {
  if (!esPiscina(ruta)) return null;
  const esCondado = esCondadoRuta(ruta);
  const slug = ruta.split('/').pop();
  const condado = esCondado ? slug : CONDADO_DE_RUTA[ruta];
  if (!condado) return null;
  const nombre = esCondado ? nombreCondado(slug) : NOMBRE_DE_RUTA[ruta];
  const zona = zonaDeCondado(condado);
  const ciudades = CIUDADES_PISCINA.filter((r) => CONDADO_DE_RUTA[r] === condado);
  const texto = TEXTO_LOCAL[ruta] ?? {};
  const frase = esCondado
    ? { antes: `${nombre} is in ${zona}; ${ciudades.length} of its cities have their own custom pool page.`, enlace: null }
    : { antes: `${nombre} is in `, enlace: { href: `/services/pool-builders/${condado}`, texto: nombreCondado(condado) }, despues: `, in ${zona}.` };
  return {
    ruta, esCondado, nombre, zona, condado,
    titulo: esCondado ? `Where we build in ${nombre}` : `Where we build around ${nombre}`,
    frase,
    parrafo: texto.parrafo ?? null,
    obra: fotosDeObra(ruta, slug, condado),
    faq: esCondado ? (texto.faq ?? []) : [],   // la FAQ de ciudad va por captacion-servicios.json
  };
}

/** Las lineas de `innerText` que el bloque emite, en orden. `cap` capitaliza como `.mm-h2` y `summary h3`. */
export function lineasLocal(b, cap = (t) => t) {
  if (!b) return [];
  const fraseLinea = b.frase.enlace ? `${b.frase.antes}${b.frase.enlace.texto}${b.frase.despues}` : b.frase.antes;
  return [
    cap(b.titulo),
    ...(b.parrafo ? [b.parrafo] : []),
    fraseLinea,
    ...b.faq.map((q) => cap(q.pregunta)),   // la FAQ va en la columna de texto, delante de las fotos
    ...b.obra.flatMap((f) => [f.donde.toUpperCase(), f.alt]),
  ];
}

/** El HTML del bloque. `esc`/`escAttr` son los del que lo pinta; `chevron` el icono del acordeon. */
export function htmlLocal(b, { esc, escAttr, chevron }) {
  if (!b) return '';
  const frase = b.frase.enlace
    ? `${esc(b.frase.antes)}<a href="${b.frase.enlace.href}">${esc(b.frase.enlace.texto)}</a>${esc(b.frase.despues)}`
    : esc(b.frase.antes);
  const fotos = b.obra.map((f, i) => `<figure class="mm-local-foto"><img src="${escAttr(f.src)}" alt="${escAttr(f.alt)}" width="${f.ancho}" height="${f.alto}"`
    + ` sizes="${i === 0 ? '(min-width: 992px) 46vw, 100vw' : '(min-width: 992px) 22vw, 50vw'}" loading="lazy" decoding="async">`
    + `<figcaption class="mm-local-pie"><span class="mm-local-rot">${esc(f.donde)}</span><span>${esc(f.alt)}</span></figcaption></figure>`).join('');
  const faq = b.faq.length
    ? `<div class="mm-faq-lista mm-local-faq">${b.faq.map((q) => `<details class="mm-faq-item"><summary><h3>${esc(q.pregunta)}</h3>${chevron}</summary>`
      + `<div class="mm-faq-r"><p>${esc(q.respuesta)}</p>${q.enlace ? `<p class="mm-faq-fuentes mm-faq-enlace"><a href="${escAttr(q.enlace.href)}">${esc(q.enlace.texto)}</a></p>` : ''}</div></details>`).join('')}</div>`
    : '';
  return `<section class="mm-local${b.obra.length ? '' : ' mm-local--sin'}"><div class="mm-local-caja"><div class="mm-local-txt">`
    + `<h2 class="mm-h2">${esc(b.titulo)}</h2>`
    + (b.parrafo ? `<p class="mm-p mm-local-lead">${esc(b.parrafo)}</p>` : '')
    + `<p class="mm-local-dato">${frase}</p>${faq}</div>`
    + (b.obra.length ? `<div class="mm-local-obra">${fotos}</div>` : '')
    + '</div></section>';
}
