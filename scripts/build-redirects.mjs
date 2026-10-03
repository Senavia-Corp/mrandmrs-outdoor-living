#!/usr/bin/env node
/**
 * ESCRIBE LOS `redirects` DE `vercel.json` DESDE `src/data/seo-url-migrations.json`.
 *
 *     npm run redirects            escribe vercel.json (idempotente)
 *     npm run redirects -- --check sale 1 si vercel.json no coincide con la tabla
 *
 * ── POR QUE SE DERIVAN Y NO SE ESCRIBEN A MANO (migracion de URLs, 3-oct-2026) ─────────────
 *
 * Son 90 reglas de ruta: 14 historicas y 76 de la migracion. Las mismas 76 las usan
 * `lib/renombradas.mjs` (generadores y puertas), `check-enlaces.mjs` (renombrados sin enlace
 * interno) y `check-redirects.mjs` (la puerta de cadenas y bucles). Con la lista escrita dos
 * veces, una entrada que se corrige en un sitio y no en el otro deja una URL vieja en 404 con
 * todas las puertas en verde — que es el fallo que `build-vercel-config.mjs` ya documenta.
 *
 * LO QUE SE CONSERVA TAL CUAL de `vercel.json`: `headers`, `trailingSlash`, `cleanUrls` y los
 * redirects de HOST (`has: [{type:'host'}]`, el alias de produccion hacia `www`). Aqui solo se
 * reescribe la lista de redirects de RUTA, en este orden: historicos, luego los 76.
 *
 * TODOS PERMANENTES. `permanent: true` es 308 en Vercel (`build-vercel-config.mjs` lo traduce
 * igual para `--prebuilt`), que conserva metodo y cuerpo y que Google trata como 301.
 *
 * SIN COMODINES. `/pool-builders/:city-florida -> /services/pool-builders/:city-fl` fallaria
 * en Hillsboro Beach (`beach-florida`) y se tragaria los 7 legacy `pool-builders-<x>-florida`.
 * Cada regla es literal; `build-vercel-config.mjs` aborta con cualquier otra forma.
 */
import fs from 'node:fs';
import path from 'node:path';
import { LEGACY, MIGRACIONES } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const VJSON = path.join(RAIZ, 'vercel.json');
const SOLO_CHECK = process.argv.includes('--check');

/** La lista de redirects de ruta que la tabla dicta, en orden. */
export function redirectsDeRuta() {
  const reglas = [
    ...LEGACY.map((l) => ({ source: l.source, destination: l.destination, permanent: true })),
    ...MIGRACIONES.map((m) => ({ source: m.old, destination: m.new, permanent: true })),
  ];
  const fuentes = new Set();
  const destinos = new Set(reglas.map((r) => r.destination));
  for (const r of reglas) {
    if (fuentes.has(r.source)) throw new Error(`build-redirects: source duplicado ${r.source}`);
    fuentes.add(r.source);
    if (!/^\/[a-z0-9\-/]*$/.test(r.source) || !/^\/[a-z0-9\-/]*$/.test(r.destination)) {
      throw new Error(`build-redirects: forma no literal en ${r.source} -> ${r.destination}`);
    }
  }
  for (const r of reglas) {
    // Un destino que a su vez es source es una CADENA (A -> B -> C). Se corta aqui, antes de escribir.
    if (fuentes.has(r.destination)) throw new Error(`build-redirects: cadena ${r.source} -> ${r.destination} -> ...`);
  }
  void destinos;
  return reglas;
}

const actual = JSON.parse(fs.readFileSync(VJSON, 'utf8'));
const deHost = (actual.redirects ?? []).filter((r) => Array.isArray(r.has) && r.has.some((h) => h?.type === 'host'));
const esperado = { ...actual, redirects: [...redirectsDeRuta(), ...deHost] };
const texto = JSON.stringify(esperado, null, 2) + '\n';
const igual = fs.readFileSync(VJSON, 'utf8') === texto;

if (SOLO_CHECK) {
  if (!igual) {
    console.error('\nROJO vercel.json no coincide con src/data/seo-url-migrations.json. Corre: npm run redirects\n');
    process.exit(1);
  }
  console.log(`  ok   vercel.json: ${redirectsDeRuta().length} redirects de ruta + ${deHost.length} de host, en sincronia con la tabla`);
  process.exit(0);
}
fs.writeFileSync(VJSON, texto);
console.log(`  vercel.json: ${redirectsDeRuta().length} redirects de ruta (${LEGACY.length} historicos + ${MIGRACIONES.length} de la migracion) + ${deHost.length} de host${igual ? ' (sin cambios)' : ''}`);
