#!/usr/bin/env node
/**
 * INYECTA `vercel.json` EN EL BUILD OUTPUT API. Corre al final de `npm run build`.
 *
 * ── EL FALLO QUE CIERRA (auditoria 5-sep-2026, M40) ──────────────────────────────────────
 *
 * Este proyecto despliega con `vercel deploy --prebuilt --prod`. Con `--prebuilt`, Vercel NO
 * lee `vercel.json`: sirve tal cual lo que hay en `.vercel/output/`, y el enrutado sale
 * ENTERO de `.vercel/output/config.json`, que escribe el adaptador de Astro y que no sabe
 * nada de `vercel.json`.
 *
 * Consecuencia MEDIDA en produccion antes de este arreglo:
 *
 *     GET /excavation                                        -> 404
 *     GET /where-we-serves/custom-pool-builders-north-florida -> 404
 *     GET /pool-builders/pool-builders-ocala-florida          -> 404
 *
 * Los **14 redirects permanentes** de `vercel.json` llevaban muertos desde que el sitio salio,
 * y son justo las URLs viejas de Webflow que Google todavia tiene indexadas: cada una es un
 * 404 servido a trafico organico real. Las **5 cabeceras de seguridad** estaban igual de
 * ausentes: `curl -I` solo devolvia `strict-transport-security`.
 *
 * Nadie lo vio porque `check:enlaces` valida que los redirects esten DECLARADOS y que nadie
 * enlace a la URL vieja — que es cierto y sigue siendolo—, pero ninguna puerta comprobaba que
 * el redirect LLEGARA al servidor. Un fallo de acoplamiento build↔despliegue, de la misma
 * familia que el de Pergola Plus que documenta `check-enlaces.mjs`.
 *
 * ── POR QUE AQUI Y NO CAMBIANDO EL DESPLIEGUE ────────────────────────────────────────────
 *
 * La alternativa era dejar de usar `--prebuilt` y que Vercel construya desde git, que si lee
 * `vercel.json`. Se descarta: obligaria a que las variables de Sanity y `PUBLIC_ES_PRODUCCION`
 * esten completas en el scope de Vercel, y ya hay constancia de que el scope Preview no las
 * tiene. Un build remoto a medio configurar publica canonicas al host equivocado — el fallo de
 * Pergola Plus que documenta `astro.config.mjs`. Inyectar aqui es determinista y se verifica
 * en local antes de subir.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CONF = path.join(RAIZ, '.vercel/output/config.json');
const VJSON = path.join(RAIZ, 'vercel.json');

if (!fs.existsSync(CONF)) { console.error('\nROJO falta .vercel/output/config.json — construye primero\n'); process.exit(1); }

const vercel = JSON.parse(fs.readFileSync(VJSON, 'utf8'));
const config = JSON.parse(fs.readFileSync(CONF, 'utf8'));

/**
 * `source` de Vercel usa path-to-regexp. Aqui solo hay dos formas, y se convierten a mano:
 * la ruta literal y el comodin `/(.*)`. Cualquier otra cosa —`:param`, `*`, `(a|b)`— ABORTA
 * en vez de traducirse mal: un redirect que casa de menos es un 404, y uno que casa de mas se
 * lleva el sitio entero. Si algun dia hace falta un patron nuevo, se anade aqui a proposito.
 */
const aRegex = (source) => {
  if (source === '/(.*)') return '^/(.*)$';
  if (/^\/[A-Za-z0-9\-._~/]*$/.test(source)) return `^${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  console.error(`\nROJO no se como traducir el source ${JSON.stringify(source)}.`);
  console.error('   Anade el patron a aRegex() en scripts/build-vercel-config.mjs, a proposito.\n');
  process.exit(1);
};

const redirects = (vercel.redirects ?? []).map((r) => ({
  src: aRegex(r.source),
  headers: { Location: r.destination },
  status: r.permanent === false ? 307 : 308,
}));

const cabeceras = (vercel.headers ?? []).map((h) => ({
  src: aRegex(h.source),
  headers: Object.fromEntries(h.headers.map(({ key, value }) => [key, value])),
  continue: true,
}));

/**
 * EL ORDEN IMPORTA, y es el unico sitio donde puede romperse algo.
 *
 *   1. las cabeceras van con `continue: true`, asi que anotan y siguen: tienen que ir las
 *      PRIMERAS para alcanzar tambien a lo que responda el filesystem.
 *   2. los redirects van ANTES de `handle: filesystem`. Despues nunca llegarian: la ruta
 *      comodin final `^/.*$ -> _render 404` se los comeria.
 *   3. lo que ya habia se conserva tal cual y en su orden.
 */
const previas = config.routes.filter((r) => !r.handle);
const desdeFilesystem = config.routes.slice(config.routes.findIndex((r) => r.handle === 'filesystem'));
const antesDelFilesystem = previas.slice(0, config.routes.findIndex((r) => r.handle === 'filesystem'));

config.routes = [...cabeceras, ...redirects, ...antesDelFilesystem, ...desdeFilesystem];
fs.writeFileSync(CONF, JSON.stringify(config, null, 1));

console.log(`  vercel-config: ${redirects.length} redirect(s) y ${cabeceras.length} bloque(s) de cabeceras inyectados en config.json`);
console.log(`                 (--prebuilt NO lee vercel.json; sin esto van al vacio)`);
