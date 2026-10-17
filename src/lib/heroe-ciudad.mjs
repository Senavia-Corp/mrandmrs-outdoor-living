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

/* `porTabla`: la foto la eligio alguien en hoja de contactos para esa pagina (E13). En piscina nueva no se le
 * exige la etiqueta `construction` —una cubierta junto a una piscina no es «construccion de piscina» en el
 * banco, y etiquetarla asi seria afirmarlo—, sino que su alt diga que hay piscina. */
function valida(id, clave, donde, porTabla = false) {
  const e = POR_ID.get(id);
  const delServicio = porTabla && clave === 'construction' ? /\bpool\b/i.test(e?.alt ?? '') : e?.servicios.includes(clave);
  const falla = !e ? 'no esta en el banco'
    : e.procedencia !== 'obra_real' ? `procedencia «${e.procedencia}»`
      : !/^aprobada/.test(e.estado ?? '') ? `estado «${e.estado}»`
        : e.etapa !== 'terminado' ? `etapa «${e.etapa}»`
          : !(e.recortes_seguros ?? []).includes('4:5') ? 'sin recorte 4:5 seguro'
            : !delServicio ? (porTabla ? 'su alt no dice que haya piscina' : `no esta etiquetada como «${clave}»`)
              : !e.src || !e.alt ? 'sin fichero o sin alt' : null;
  if (falla) throw new Error(`[heroe-ciudad] ${donde}: ${id} no vale para el hero — ${falla}`);
  return e;
}

/** E13 (D-200): `ruta de ciudad -> { id, condado, servicio }` de la tabla por condado de piscina nueva. */
const sinNotas = (o) => Object.entries(o ?? {}).filter(([k]) => !k.startsWith('_'));
const CONDADO_DE = new Map(sinNotas(DATOS.porCondado).flatMap(([condado, ciudades]) => Object.keys(ciudades).map((c) => [c, condado])));
const TABLA = new Map([
  ...sinNotas(DATOS.porCondado)
    .flatMap(([condado, ciudades]) => Object.entries(ciudades).map(([c, id]) => [`/services/pool-builders/${c}`, { id, condado, servicio: 'pool-builders' }])),
  // E13 etapa 3: la pagina del condado, con su propia foto.
  ...sinNotas(DATOS.condados).map(([condado, id]) => [`/services/pool-builders/${condado}`, { id, condado, servicio: 'pool-builders' }]),
  // E13 etapa 4: los demas servicios, con el condado de cada ciudad sacado de `porCondado`.
  ...sinNotas(DATOS.porServicio).flatMap(([servicio, { tabla }]) => sinNotas(tabla).map(([c, id]) => {
    if (!CONDADO_DE.has(c)) throw new Error(`[heroe-ciudad] porServicio.${servicio}: ${c} no tiene condado en porCondado`);
    return [`/services/${servicio}/${c}`, { id, condado: CONDADO_DE.get(c), servicio }];
  })),
]);
const CASI = (DATOS.casiIguales ?? []).map(([a, b]) => [a, b]);
/** D-204: el alt (y el pie) del hero dice donde se hizo la foto solo en la pagina de ese mismo sitio, con el GPS
 *  del original detras (`lugar`). «fort-lauderdale-fl» -> «Fort Lauderdale, FL»; «broward-county-fl» -> «Broward County». */
const nombre = (slug) => slug.replace(/-fl$/, '').split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
function conLugar(e, ruta) {
  const l = DATOS.lugar?.[e.id]; const pag = ruta.split('/')[3];
  const sitio = !l ? null : pag === l.ciudad ? `${nombre(pag)}, FL` : pag === l.condado ? nombre(pag) : null;
  return sitio ? e.alt.replace(/(\.?)$/, ` in ${sitio}$1`) : e.alt;
}
let condadosComprobados = false;
/** LA REGLA DEL CONDADO, una vez por proceso y por servicio: ninguna foto repetida entre sus paginas (la del
 *  condado incluida, en piscina nueva) salvo lo declarado en `porServicio.<servicio>.repetidas`, y nunca juntas
 *  dos casi iguales. Falla cerrado, con el condado y las rutas en el mensaje. */
function compruebaCondados() {
  if (condadosComprobados) return;
  condadosComprobados = true;
  const grupos = new Map();
  for (const [ruta, { condado, servicio }] of TABLA) { const k = `${servicio}|${condado}`; (grupos.get(k) ?? grupos.set(k, []).get(k)).push(ruta); }
  for (const [k, rutas] of grupos) {
    const [servicio, condado] = k.split('|');
    const paginas = [...new Set([...(servicio === 'pool-builders' ? [`/services/pool-builders/${condado}`] : []), ...rutas])];
    const fotos = paginas.map((r) => [r, fotoDeHeroe(r).id]);
    const max = DATOS.porServicio?.[servicio]?.repetidas?.[condado]?.max ?? 1;
    const vistas = new Map();
    for (const [r, id] of fotos) {
      const ya = vistas.get(id) ?? [];
      if (ya.length >= max) throw new Error(`[heroe-ciudad] ${servicio} · ${condado}: ${r} y ${ya.join(', ')} comparten hero (${id})${max > 1 ? `, y se declararon ${max} como mucho` : ''}`);
      vistas.set(id, [...ya, r]);
    }
    for (const [a, b] of CASI) {
      if (vistas.has(a) && vistas.has(b)) throw new Error(`[heroe-ciudad] ${servicio} · ${condado}: ${vistas.get(a)[0]} (${a}) y ${vistas.get(b)[0]} (${b}) llevan dos fotos casi iguales`);
    }
  }
}

export function fotoDeHeroe(ruta, rutasDelServicio = rutasDeCiudad(ruta.split('/')[2])) {
  const servicio = ruta.split('/')[2];
  const clave = DATOS.clave[servicio];
  const fija = DATOS.fijas[ruta];
  if (fija) {
    const e = valida(fija.id, clave, ruta);
    return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt, pie: fija.pie };
  }
  const deTabla = TABLA.get(ruta);
  if (deTabla) {
    compruebaCondados();
    const e = valida(deTabla.id, clave, ruta, true);
    const alt = conLugar(e, ruta);
    return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt, pie: alt };
  }
  const bolsa = DATOS.bolsas[servicio];
  if (!bolsa?.length) return null;
  // El orden de la bolsa NO excluye las rutas de la tabla: asi las paginas que siguen con bolsa no cambian.
  const orden = [...rutasDelServicio].filter((r) => !DATOS.fijas[r]).sort();
  const i = orden.indexOf(ruta);
  if (i < 0) throw new Error(`[heroe-ciudad] ${ruta} no esta en la lista de rutas de «${servicio}»`);
  const e = valida(bolsa[i % bolsa.length], clave, ruta);
  return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt, pie: e.alt };
}

/**
 * Las fotos de seccion de una pagina de ciudad (FAQ, cierre y resenas, por ese orden): las
 * siguientes de la MISMA bolsa a partir de la del hero, sin repetir ninguna en la pagina. Con una
 * bolsa de 3 hay hero, FAQ y cierre; la que falte va en su variante sin foto. Sin pie: no dicen nada
 * de la ciudad.
 */
export function fotosDeSeccion(ruta, rutasDelServicio = rutasDeCiudad(ruta.split('/')[2])) {
  const servicio = ruta.split('/')[2];
  const deTabla = TABLA.has(ruta);
  // LOOP-AREAS L3: una ciudad puede fijar sus tres fotos (FAQ, cierre, resenas) en `porServicio.<servicio>.seccionPorCiudad`,
  // para no bajar de nota una que ya vende al rotar. Mismas reglas: distintas, ninguna es el hero.
  const fija = DATOS.porServicio?.[servicio]?.seccionPorCiudad?.[ruta.split('/')[3]];
  if (fija) {
    const hero = fotoDeHeroe(ruta, rutasDelServicio);
    if (new Set(fija).size !== fija.length || fija.includes(hero?.id)) throw new Error(`[heroe-ciudad] ${ruta}: seccionPorCiudad repite foto o el hero`);
    return fija.map((id) => { const e = valida(id, DATOS.clave[servicio], ruta, true); return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt }; });
  }
  // Una pagina por tabla sin lista de seccion propia (reforma, E13 etapa 4) sigue con la bolsa de su servicio.
  const bolsa = ((deTabla && DATOS.seccion?.[servicio]) || DATOS.bolsas[servicio]) ?? [];
  const hero = fotoDeHeroe(ruta, rutasDelServicio);
  // E13 etapa 3: un condado rota solo entre condados. Intercalados con las ciudades, cuatro caian en
  // la misma foto; asi cada foto de la lista sale como mucho dos veces en los nueve.
  const esCondado = ruta.endsWith('-county-fl');
  const orden = rutasDelServicio.filter((r) => !DATOS.fijas[r] && (!esCondado || r.endsWith('-county-fl'))).sort();
  const i = Math.max(0, orden.indexOf(ruta));
  const ids = [];
  for (let k = 1; k <= bolsa.length && ids.length < 3; k++) {
    const id = bolsa[(i + k) % bolsa.length];
    if (id !== hero?.id && !ids.includes(id)) ids.push(id);
  }
  return ids.map((id) => { const e = valida(id, DATOS.clave[servicio], ruta, deTabla); return { id: e.id, src: e.src, ancho: e.ancho, alto: e.alto, alt: e.alt }; });
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
