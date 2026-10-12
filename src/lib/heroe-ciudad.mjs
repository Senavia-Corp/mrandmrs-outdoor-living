/**
 * LA FOTO DEL HERO DE UNA PAGINA DE SERVICIO x CIUDAD (ASTRO-2, D-112 a D-114).
 *
 * `fotoDeHeroe(ruta, rutasDelServicio)` devuelve `{ src, ancho, alto, alt, pie }` o `null` si el
 * servicio no tiene bolsa (entonces el hero va en su variante sin foto).
 *
 * EL REPARTO ES DETERMINISTA: el puesto de la ruta en la lista ORDENADA de ciudades de su servicio,
 * modulo el tamano de la bolsa. No depende del orden en que Astro construya las paginas.
 *
 * EL PIE (D-109, D-114) es el `alt` del banco, tal cual: describe lo que se ve y no situa la obra en
 * ninguna ciudad. Solo las rutas de `fijas` llevan un pie propio.
 *
 * FALLA CERRADO: una foto de la bolsa que no sea obra real, aprobada, terminada, con recorte 4:5
 * seguro, etiquetada con el servicio y con fichero tumba el build con su nombre.
 */
// `readFileSync` + `process.cwd()` y no `import … with { type: 'json' }`, como `galeria-categorias.mjs`:
// esto lo cargan la pagina (Astro) y la puerta de texto (Node), y asi vale en los dos.
import fs from 'node:fs';
import path from 'node:path';

const lee = (rel) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'));
const BANCO = lee('src/data/banco-imagenes.json');
const DATOS = lee('src/data/heroes-ciudad.json');

import { rutaCiudad } from './rutas-seo.mjs';

const POR_ID = new Map(BANCO.map((e) => [e.id, e]));

/** Todas las rutas de ciudad de un servicio, de las mismas fuentes que las construyen: Sanity
 *  (`seo-pool-builders.json`) y los 9 condados para piscina nueva; `ciudades-servicios.json` para
 *  los demas. Es la lista sobre la que se reparte la bolsa. */
const RUTAS = new Map();
export function rutasDeCiudad(servicio) {
  if (!RUTAS.has(servicio)) {
    const rutas = servicio === 'pool-builders'
      ? [...Object.keys(lee('src/data/seo-pool-builders.json')).filter((k) => !k.startsWith('_')).map(rutaCiudad),
        ...fs.readdirSync(path.resolve(process.cwd(), 'src/pages/services/pool-builders'))
          .filter((f) => /-county-fl\.astro$/.test(f)).map((f) => `/services/pool-builders/${f.replace(/\.astro$/, '')}`)]
      : Object.keys(lee('src/data/ciudades-servicios.json').paginas).filter((r) => r.split('/')[2] === servicio);
    RUTAS.set(servicio, rutas.sort());
  }
  return RUTAS.get(servicio);
}

function valida(id, clave, donde) {
  const e = POR_ID.get(id);
  const falla = !e ? 'no esta en el banco'
    : e.procedencia !== 'obra_real' ? `procedencia «${e.procedencia}»`
      : !/^aprobada/.test(e.estado ?? '') ? `estado «${e.estado}»`
        : e.etapa !== 'terminado' ? `etapa «${e.etapa}»`
          : !(e.recortes_seguros ?? []).includes('4:5') ? 'sin recorte 4:5 seguro'
            : !e.servicios.includes(clave) ? `no esta etiquetada como «${clave}»`
              : !e.src || !e.alt ? 'sin fichero o sin alt' : null;
  if (falla) throw new Error(`[heroe-ciudad] ${donde}: ${id} no vale para el hero — ${falla}`);
  return e;
}

export function fotoDeHeroe(ruta, rutasDelServicio = rutasDeCiudad(ruta.split('/')[2])) {
  const servicio = ruta.split('/')[2];
  const clave = DATOS.clave[servicio];
  const fija = DATOS.fijas[ruta];
  if (fija) {
    const e = valida(fija.id, clave, ruta);
    return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt, pie: fija.pie };
  }
  const bolsa = DATOS.bolsas[servicio];
  if (!bolsa?.length) return null;
  const orden = [...rutasDelServicio].filter((r) => !DATOS.fijas[r]).sort();
  const i = orden.indexOf(ruta);
  if (i < 0) throw new Error(`[heroe-ciudad] ${ruta} no esta en la lista de rutas de «${servicio}»`);
  const e = valida(bolsa[i % bolsa.length], clave, ruta);
  return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt, pie: e.alt };
}

/** Para el parte y para la puerta: cuantas ciudades comparten cada foto de cada bolsa. */
export function repartoDeBolsas(rutasPorServicio) {
  return Object.fromEntries(Object.entries(rutasPorServicio).map(([servicio, rutas]) => {
    const cuenta = {};
    for (const r of rutas) { const f = fotoDeHeroe(r, rutas); cuenta[f?.id ?? 'sin foto'] = (cuenta[f?.id ?? 'sin foto'] ?? 0) + 1; }
    return [servicio, cuenta];
  }));
}

/** Autocomprobacion: `node src/lib/heroe-ciudad.mjs` valida las bolsas y pinta el reparto. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const reparto = repartoDeBolsas(Object.fromEntries(Object.keys(DATOS.clave).map((s) => [s, rutasDeCiudad(s)])));
  for (const [s, c] of Object.entries(reparto)) {
    const n = Object.values(c);
    console.log(`  ${s.padEnd(18)} ${String(rutasDeCiudad(s).length).padStart(3)} ciudades · ${Object.keys(c).length} fotos · cada foto en ${Math.min(...n)}–${Math.max(...n)} paginas`);
  }
}
