/**
 * LOS ESCALONES DE LA MIGA — una sola fuente para el `BreadcrumbList` (`negocio.mjs`) y para la
 * miga VISIBLE (`MigaVisible.astro`), que Google pide que coincidan.
 *
 * Fichero sin imports a proposito: lo leen tambien las puertas (`check-texto.mjs`) desde Node,
 * y `negocio.mjs` importa un JSON que Node no carga sin atributos de importacion.
 * (SEO-REMEDIACION, 4-oct-2026: extraido de `negocio.mjs` sin cambiar una sola regla.)
 */
/** Cómo se lee cada tramo de URL en la miga. Lo que no esté aquí se titula por el slug. */
const NOMBRE_TRAMO = {
  'where-we-serve': 'Where We Serve',
  'project': 'Projects',
  'blogs': 'Blog',
  'articles': 'Articles',
  // Las 14 fichas de `/services/` (migracion de URLs del 3-oct-2026): el slug es corto y el
  // nombre lleva siglas o ampersand que `capitaliza()` no sabe poner.
  'pool-builders': 'Pool Builders',
  'pool-remodeling': 'Pool Remodeling',
  'pergola-builders': 'Pergola Builders',
  'outdoor-kitchens': 'Outdoor Kitchens',
  'louvered-roofs': 'Louvered Roofs',
  'retractable-screens': 'Retractable Screens',
  'patio-screen-rooms': 'Patio Screen Rooms',
  'pool-screen-enclosures': 'Pool Screen Enclosures',
  'deck-builders': 'Deck Builders',
  'landscaping': 'Landscaping',
  'irrigation-systems': 'Irrigation Systems',
  'outdoor-furniture': 'Outdoor Furniture',
  'steel-buildings-pole-barns': 'Steel Buildings & Pole Barns',
  'soffit-led-lighting': 'Soffit LED Lighting',
};

/**
 * TRAMOS SIN PAGINA. `/services` no existe como ruta navegable (no hay hub de servicios: las
 * 14 fichas cuelgan del megamenu y de la home), y un `ListItem` cuyo `item` responde 404 es
 * marcado que miente. Se OMITE el escalon en vez de inventarle una URL: la miga de una ficha
 * es `Home -> Pool Builders`, y la de una ciudad `Home -> Pool Builders -> Ocala, FL`, que es
 * exactamente la jerarquia de URLs (`/services/pool-builders/ocala-fl`) sin el tramo mudo.
 * El dia que exista `/services`, se quita de aqui y la miga lo pinta solo.
 */
const SIN_PAGINA = new Set(['services', 'articles']);

/**
 * TRAMOS CUYO HUB VIVE EN OTRA URL. `/blogs` no existe: el indice del blog es `/blogs-tips`; y el
 * indice de las fichas de `/project/` es `/projects`. Sin esto la miga de 90 articulos y 15 obras
 * apuntaba a dos 404 (medido por `check:redirects`, punto 9).
 */
const ITEM_DE = { blogs: '/blogs-tips', project: '/projects' };

const capitaliza = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
/** `ocala-fl` -> «Ocala, FL»; `palm-beach-county-fl` -> «Palm Beach County, FL». */
const titula = (s) => NOMBRE_TRAMO[s]
  ?? (/-fl$/.test(s) ? `${capitaliza(s.replace(/-fl$/, ''))}, FL` : capitaliza(s));

/** `[{ nombre, href }]` desde la home hasta la pagina. Vacio en la home. */
export function tramosMiga(ruta) {
  const tramos = ruta.split('/').filter(Boolean);
  if (!tramos.length) return [];
  const items = [{ nombre: 'Home', href: '/' }];
  let acum = '';
  for (const t of tramos) {
    acum += `/${t}`;
    if (SIN_PAGINA.has(t)) continue;
    items.push({ nombre: titula(t), href: ITEM_DE[t] ?? acum });
  }
  return items;
}
