/**
 * LA MIGRACION DE URLs (3-oct-2026), EN UN SOLO SITIO — `src/data/seo-url-migrations.json`.
 *
 * 76 rutas cambian de URL: 14 fichas de `/services/`, 53 ciudades de `/pool-builders/` y 9
 * condados de `/country/`, todas al silo `/services/` (`docs/seo/URL-MIGRATION-2026.md`). Este
 * modulo es la UNICA traduccion entre lo que hay en el origen (Webflow, `_source/vivo/`,
 * `baseline/`, los slugs de Sanity) y lo que se sirve. Lo importan Astro (`[slug].astro`,
 * `negocio.mjs`) y, a traves de `scripts/lib/renombradas.mjs`, los generadores y las puertas.
 *
 * CUATRO REGLAS, Y LAS CUATRO SE MIDEN EN `check:redirects`:
 *   · `renombra(old) === new` y `origen(new) === old`: la tabla es biyectiva.
 *   · ninguna `new` es a la vez `old` de otra fila (seria una cadena de redirects).
 *   · `/services/<x>` con UN tramo es una ficha; `/services/pool-builders/<x>` es una ciudad o
 *     un condado. `startsWith('/services/')` YA NO distingue las 14 fichas: usa `esFicha()`.
 *   · el slug de Sanity de una ciudad (`ocala-florida`) es la identidad del documento y NO es
 *     su URL: `rutaCiudad('ocala-florida') === '/services/pool-builders/ocala-fl'`.
 */
import MIG from '../data/seo-url-migrations.json' with { type: 'json' };

export const FECHA_MIGRACION = MIG.fecha;
/** Las 76 filas `{ old, new, type, sanitySlug? }`, en el orden del fichero. */
export const MIGRACIONES = MIG.migraciones;
/** Los redirects historicos `{ source, destination, motivo }`, ya apuntando al destino final. */
export const LEGACY = MIG.legacy;

const A_NUEVA = new Map(MIGRACIONES.map((m) => [m.old, m.new]));
const A_VIEJA = new Map(MIGRACIONES.map((m) => [m.new, m.old]));

/** Traduce una ruta o URL vieja a la nueva. Devuelve la misma si no hay nada que cambiar. */
export function renombra(u, tabla = A_NUEVA) {
  if (!u || typeof u !== 'string') return u;
  // Exacta, o con sufijo (`#estimate`, `?f=`) o como cola de una URL absoluta.
  for (const [vieja, nueva] of tabla) {
    if (u === vieja) return nueva;
    const i = u.indexOf(vieja);
    if (i < 0) continue;
    const antes = u.slice(0, i); const despues = u.slice(i + vieja.length);
    // Antes: nada, o un host (`https://dominio`). Despues: nada, o `?`/`#`.
    if ((antes === '' || /^https?:\/\/[^/]+$/.test(antes)) && (despues === '' || /^[?#]/.test(despues))) {
      return antes + nueva + despues;
    }
  }
  return u;
}

/** La inversa: de la ruta servida a la del origen (la que nombran `_source/vivo/` y Sanity). */
export const origen = (u) => renombra(u, A_VIEJA);

/** Ruta publica de una ciudad a partir del `slug.current` de su documento poolBuilder. */
export function rutaCiudad(slugSanity) {
  const fila = MIGRACIONES.find((m) => m.type === 'city' && m.sanitySlug === slugSanity);
  if (fila) return fila.new;
  // Una ciudad nueva en Sanity, sin fila: `<ciudad>-florida` -> `<ciudad>-fl`. Nada mas.
  if (!/^[a-z0-9-]+-florida$/.test(slugSanity)) {
    throw new Error(`rutaCiudad: el slug «${slugSanity}» no es «<ciudad>-florida» y no esta en `
      + 'seo-url-migrations.json. Declara su fila antes de publicarla.');
  }
  return `/services/pool-builders/${slugSanity.replace(/-florida$/, '-fl')}`;
}
/** Y el tramo final de esa ruta: lo que `[slug].astro` usa como `params.slug`. */
export const slugCiudad = (slugSanity) => rutaCiudad(slugSanity).split('/').pop();

const UN_TRAMO = /^\/services\/[a-z0-9-]+$/;
const BAJO_POOL_BUILDERS = /^\/services\/pool-builders\/([a-z0-9-]+)$/;

/** Una de las 14 fichas de servicio (`/services/<x>`, un solo tramo). */
export const esFicha = (ruta) => UN_TRAMO.test(ruta);
/** Un condado (`/services/pool-builders/<x>-county-fl`). */
export const esCondado = (ruta) => /-county-fl$/.test(ruta.match(BAJO_POOL_BUILDERS)?.[1] ?? '');
/** Una ciudad (`/services/pool-builders/<x>-fl` que no es condado). */
export const esCiudad = (ruta) => BAJO_POOL_BUILDERS.test(ruta) && !esCondado(ruta);
/** Ciudad o condado: la familia que pinta `src/pages/services/pool-builders/[slug].astro` + las 9 estaticas. */
export const esLocal = (ruta) => BAJO_POOL_BUILDERS.test(ruta);

/** El prefijo bajo el que cuelgan ciudades y condados, con barra final. */
export const PREFIJO_LOCAL = '/services/pool-builders/';
/** La ficha madre de ese silo. */
export const FICHA_POOL_BUILDERS = '/services/pool-builders';
