/**
 * RUTAS RENOMBRADAS DESPUES DEL SCRAPE. `URL que salio de Webflow -> URL que servimos`.
 *
 * Tier 1 de `docs/encargos/SEO-URLS-PLAN.md` (3-sep-2026): las 2 regionales de `where-we-serves/`
 * se anidan bajo `/where-we-serve`. Y la MIGRACION DE URLs del 3-oct-2026
 * (`docs/seo/URL-MIGRATION-2026.md`): 14 fichas, 53 ciudades y 9 condados pasan al silo
 * `/services/`. Las 76 viven en `src/data/seo-url-migrations.json`; las 2 regionales siguen
 * aqui porque su origen no esta en esa tabla (son un renombrado de jerarquia, no de silo).
 *
 * POR QUE VIVE AQUI Y NO EN CADA SCRIPT. Lo necesitan varios generadores por motivos distintos:
 *   · `build-inventory.mjs` para escribir `_source/routes.csv` con la ruta nueva;
 *   · `build-paginas.mjs` para localizar `_source/vivo/<origen>.html` (`origen()`) y para
 *     reescribir los ENLACES, que en `_source/vivo/` siguen -y seguiran- apuntando a la vieja,
 *     porque `_source/vivo/` es el origen y no se toca;
 *   · `build-shell.mjs` por lo mismo, para el nav y el pie.
 * Con la tabla duplicada, arreglar una y olvidar la otra deja el sitio medio movido sin que
 * ninguna puerta lo diga: los enlaces volverian a la ruta vieja en el siguiente `npm run
 * paginas` y solo se veria como redirects de mas en produccion.
 *
 * Los 308 que cubren las viejas estan en `vercel.json` (los escribe `build-redirects.mjs`
 * desde la misma tabla), y `check-enlaces.mjs` los declara en `SIN_ENLACE_INTERNO` porque un
 * renombrado publico es justo el caso en el que NADIE de dentro debe enlazar el origen.
 *
 * La logica (biyeccion, `esFicha`/`esCiudad`/`esCondado`, `rutaCiudad`) vive en
 * `src/lib/rutas-seo.mjs`, que es lo que importa Astro: aqui solo se le suman las 2 regionales.
 */
import * as SEO from '../../src/lib/rutas-seo.mjs';

export const REGIONALES = new Map([
  ['/where-we-serves/custom-pool-builders-north-florida', '/where-we-serve/north-florida'],
  ['/where-we-serves/custom-pool-builders-south-florida', '/where-we-serve/south-florida'],
]);

/** `vieja -> nueva`, las 2 regionales mas las 76 de la migracion. */
export const RENOMBRADAS = new Map([...REGIONALES, ...SEO.MIGRACIONES.map((m) => [m.old, m.new])]);
const INVERSA = new Map([...RENOMBRADAS].map(([v, n]) => [n, v]));

/** Aplica el renombrado a una URL o ruta. Devuelve la misma si no hay nada que cambiar. */
export const renombra = (u) => SEO.renombra(u, RENOMBRADAS);
/**
 * La inversa: de la ruta servida a la que nombran `_source/vivo/`, `baseline/` y Sanity. SOLO las
 * 76 de la migracion: las 2 regionales ya tienen su `_source/vivo/where-we-serve_*.html` con el
 * nombre nuevo desde el 3-sep-2026 (se renombro el fichero, no la tabla), asi que su origen es
 * su propia ruta. `INVERSA` (las 78) queda para `check-redirects`, que mide sources de redirect.
 */
export const origen = (u) => SEO.origen(u);
export const INVERSA_COMPLETA = INVERSA;

export const {
  MIGRACIONES, LEGACY, FECHA_MIGRACION, rutaCiudad, slugCiudad,
  esFicha, esCiudad, esCondado, esLocal, PREFIJO_LOCAL, FICHA_POOL_BUILDERS,
} = SEO;
