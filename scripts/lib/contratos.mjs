/**
 * `disenio/contratos.json`, leido y VALIDADO en un solo sitio.
 *
 * Lo leen DOS consumidores: `check:visual` —para saber si una referencia que falta es roja o
 * saltada— y `aprobar-diseno.mjs` —el unico escritor de referencias, que se niega a re-baselinizar
 * una ruta que no figure aqui—. Va en un modulo compartido por el mismo motivo que
 * `lib/captura.mjs`: dos copias empiezan iguales y dejan de serlo al primer arreglo que solo se
 * aplica en un lado, y el sintoma seria una puerta que aprueba lo que la otra rechaza.
 *
 * FALLA CERRADO, a proposito. Una entrada mal rellenada NO degrada a `paridad`: aborta. Degradar
 * en silencio es exactamente el defecto §2.1 que esta fase viene a cerrar, y volveria a entrar por
 * la puerta de atras el dia que alguien escriba media entrada.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');
export const FICHERO = path.join(RAIZ, 'disenio/contratos.json');

const VALIDOS = new Set(['paridad', 'rediseno']);
/** Lo que exige una entrada `rediseno`. `motivo` no es adorno: es lo que hace auditable un
 *  re-baseline, que es el unico acto irreversible del sistema. */
const OBLIGATORIOS = ['fecha', 'sha', 'motivo'];

/** Devuelve el mapa `{ ruta: { contrato, fecha, sha, motivo } }`. Aborta si algo no cuadra. */
export function leerContratos() {
  let json;
  try { json = JSON.parse(fs.readFileSync(FICHERO, 'utf8')); }
  catch (e) { fatal([`no se puede leer ${path.relative(RAIZ, FICHERO)}: ${e.message}`]); }

  if (json.porDefecto !== 'paridad') {
    fatal(['`porDefecto` tiene que ser "paridad": una ruta sin declarar se mide contra Webflow.']);
  }
  const rutas = json.rutas ?? {};
  const malas = [];
  for (const [ruta, e] of Object.entries(rutas)) {
    if (!ruta.startsWith('/')) malas.push(`${ruta}: la clave tiene que ser la ruta, con barra inicial`);
    if (!VALIDOS.has(e?.contrato)) { malas.push(`${ruta}: contrato "${e?.contrato}" no es paridad|rediseno`); continue; }
    if (e.contrato !== 'rediseno') continue;
    for (const c of OBLIGATORIOS) if (!String(e[c] ?? '').trim()) malas.push(`${ruta}: contrato rediseno SIN ${c}`);
  }
  if (malas.length) fatal(malas);
  return rutas;
}

/** El contrato de una ruta. Lo que no esta declarado es `paridad`. */
export const contratoDe = (rutas, ruta) => rutas[ruta]?.contrato ?? 'paridad';

/** Las rutas con contrato `rediseno`, para los resumenes. */
export const redisenadas = (rutas) => Object.keys(rutas).filter((r) => rutas[r].contrato === 'rediseno');

function fatal(lineas) {
  console.error(`\nROJO ${path.relative(RAIZ, FICHERO)} invalido:\n`);
  for (const l of lineas) console.error(`   ${l}`);
  console.error('');
  process.exit(1);
}
