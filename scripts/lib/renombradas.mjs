/**
 * RUTAS RENOMBRADAS DESPUES DEL SCRAPE. `URL que salio de Webflow -> URL que servimos`.
 *
 * Tier 1 de `docs/encargos/SEO-URLS-PLAN.md` (3-sep-2026): `/where-we-serve` (singular,
 * estatica, la que esta en el nav) y `where-we-serves/` (plural, 2 rutas de coleccion) eran dos
 * raices sin relacion jerarquica visible y con nombres casi identicos. Las 2 regionales se
 * anidan bajo la singular.
 *
 * POR QUE VIVE AQUI Y NO EN CADA SCRIPT. Lo necesitan dos generadores por motivos distintos:
 *   · `build-inventory.mjs` para escribir `_source/routes.csv` con la ruta nueva;
 *   · `build-paginas.mjs` para reescribir los ENLACES a esa ruta, que en `_source/vivo/` siguen
 *     -y seguiran- apuntando a la vieja, porque `_source/vivo/` es el origen y no se toca.
 * Con la tabla duplicada, arreglar una y olvidar la otra deja el sitio medio movido sin que
 * ninguna puerta lo diga: los enlaces volverian a la ruta vieja en el siguiente `npm run
 * paginas` y solo se veria como 44 redirects de mas en produccion.
 *
 * Los 301 que cubren las viejas estan en `vercel.json`, y `check-enlaces.mjs` los declara en
 * `SIN_ENLACE_INTERNO` porque un renombrado publico es justo el caso en el que NADIE de dentro
 * debe enlazar el origen.
 */
export const RENOMBRADAS = new Map([
  ['/where-we-serves/custom-pool-builders-north-florida', '/where-we-serve/north-florida'],
  ['/where-we-serves/custom-pool-builders-south-florida', '/where-we-serve/south-florida'],
]);

/** Aplica el renombrado a una URL o ruta. Devuelve la misma si no hay nada que cambiar. */
export const renombra = (u) => {
  if (!u) return u;
  for (const [vieja, nueva] of RENOMBRADAS) {
    if (u === vieja || u.endsWith(vieja)) return u.slice(0, u.length - vieja.length) + nueva;
  }
  return u;
};
