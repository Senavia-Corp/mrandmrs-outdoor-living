/**
 * EL CLIENTE MINIMO DE SANITY, en un solo sitio.
 *
 * Lo comparten `seed-blog-sanity.mjs`, `build-blogs.mjs`, `check-blog.mjs` y
 * `cache-sanity.mjs`. Antes cada uno abria `.env` a su manera -`check-sanity.mjs:10` con un
 * regex, `import.mjs:21` con `process.env`, `[slug].astro:65` con `import.meta.env` y un `??`
 * cableado-, y cuatro lecturas distintas del mismo secreto son cuatro sitios donde puede
 * desincronizarse.
 *
 * TRES COSAS QUE HAY QUE SABER ANTES DE USARLO:
 *
 * 1. UNA LECTURA ANONIMA DE UN DATASET PUBLICO DEVUELVE LOS BORRADORES COMO 0, NO COMO ERROR.
 *    Esa trampa ya puso `check-sanity.mjs` en rojo diciendo «0 borradores» con los 8 ahi. Por eso
 *    `groq()` exige token por defecto y hay que pedir el anonimo A PROPOSITO con `{anon:true}`.
 *
 * 2. `api.sanity.io` NO ES `apicdn.sanity.io`. El CDN cachea, y una puerta que mide contra una
 *    lectura cacheada mide el pasado. Aqui siempre `api`.
 *
 * 3. LAS MUTACIONES VAN EN LOTES DE 50 y con concurrencia 1. Sanity corta a 25 peticiones en
 *    vuelo (`import.mjs:284`) y un 429 a mitad de un backfill deja el dataset a medias.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');

/** Lee `.env` a mano: este repo no usa dotenv y los scripts corren con `node` a secas. */
const entorno = () => {
  const f = path.join(RAIZ, '.env');
  if (!fs.existsSync(f)) throw new Error(`no hay .env en ${RAIZ}`);
  const env = {};
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.includes('=') || l.trimStart().startsWith('#')) continue;
    const i = l.indexOf('=');
    env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

const ENV = entorno();
export const PID = ENV.SANITY_PROJECT_ID || 'm273z6jc';
export const DS = ENV.SANITY_DATASET || 'production';
const TOKEN = ENV.SANITY_WRITE_TOKEN;
const API = `https://${PID}.api.sanity.io/v2021-10-21`;

/** El filtro que impide servir un borrador. Se exporta para que nadie lo reescriba a ojo. */
export const SIN_BORRADORES = '!(_id in path("drafts.**"))';

export async function groq(query, { anon = false } = {}) {
  if (!anon && !TOKEN) {
    throw new Error('falta SANITY_WRITE_TOKEN en .env. Una lectura anonima NO VE los borradores '
      + 'y los cuenta como 0: pide `{anon:true}` a proposito si de verdad lo quieres.');
  }
  const r = await fetch(`${API}/data/query/${DS}?query=${encodeURIComponent(query)}`,
    { headers: anon || !TOKEN ? {} : { Authorization: `Bearer ${TOKEN}` } });
  const j = await r.json();
  if (j.error) throw new Error(`GROQ ${r.status}: ${JSON.stringify(j.error)}`);
  return j.result;
}

/**
 * Aplica mutaciones. `seco` es el valor por defecto A PROPOSITO: escribir en el dataset de
 * produccion del cliente no puede ser lo que pasa si te olvidas de una bandera.
 */
export async function mutar(mutaciones, { seco = true } = {}) {
  if (seco) {
    console.log(`  SECO: ${mutaciones.length} mutaciones NO enviadas. --escribir para aplicarlas.`);
    return { seco: true, n: mutaciones.length };
  }
  if (!TOKEN) throw new Error('falta SANITY_WRITE_TOKEN: no se puede escribir');
  let hechas = 0;
  for (let i = 0; i < mutaciones.length; i += 50) {
    const lote = mutaciones.slice(i, i + 50);
    const r = await fetch(`${API}/data/mutate/${DS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ mutations: lote }),
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(`mutate ${r.status}: ${JSON.stringify(j.error ?? j)}`);
    hechas += lote.length;
    console.log(`  lote ${i / 50 + 1}: ${lote.length} mutaciones OK (${hechas}/${mutaciones.length})`);
  }
  return { seco: false, n: hechas };
}
