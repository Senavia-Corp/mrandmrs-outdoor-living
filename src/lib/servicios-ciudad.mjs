/**
 * LO QUE CAMBIA DE UN SERVICIO A OTRO EN LA LANDING DE CIUDAD (LOOP-CIUDADES, 5-oct-2026).
 *
 * `src/components/PaginaCiudad.astro` pinta las landings `/services/<servicio>/<ciudad>-fl` de
 * TODOS los servicios con las mismas secciones, en el mismo orden y con los mismos componentes.
 * Lo unico que varia por servicio vive aqui, y nada mas:
 *   · `schema`    — el `Service` del JSON-LD (nombre por ciudad y `serviceType`);
 *   · `categoria` — la pestana que abre el panel de servicios (`servicios-categoria.json["/"]`);
 *   · `galeria`   — la clave del set de `galeria-obra-por-ruta.json` (sin clave: `_defecto`);
 *   · `carrusel`  — el encabezado de «Project Showcase», que es el mismo carrusel en todas.
 *
 * LA ENTRADA DE POOL-BUILDERS ES LA DE SIEMPRE, LITERAL: son los valores que hasta hoy estaban
 * escritos a fuego en `[slug].astro`. Cambiar uno cambia las 53 ciudades de piscinas, que son
 * rutas existentes y no se tocan (linea roja del encargo).
 */
import { RUTAS_CIUDAD, CONDADO_DE_RUTA, NOMBRE_DE_RUTA, nombreCondado, zonaDeCondado } from './vecinas.mjs';

export const SERVICIOS_CIUDAD = {
  'pool-builders': {
    clave: 'pool-builders',
    nombre: 'Custom Pool Builders',
    porCiudad: 'Custom pool builders by city',
    schema: {
      nombre: (ciudad) => `Custom pool construction in ${ciudad}, FL`,
      tipo: 'Custom inground pool construction',
    },
    categoria: 'pool-spa',
    galeria: undefined,
    carrusel: {
      titulo: 'Featured Custom Pool Projects',
      entradilla: 'Selected custom pool and outdoor living projects from our Florida portfolio, to inspire your design.',
    },
  },
  /* LAS NUEVAS (LOOP-CIUDADES). `carrusel`: «Project Showcase» es el mismo carrusel de obra propia
   * en todas las landings —piscinas con pergolas, cocinas y cerramientos—, asi que el titular dice
   * lo que ensena y no promete obra del servicio que el carrusel no tiene. */
  'pool-remodeling': {
    clave: 'pool-remodeling',
    nombre: 'Pool Remodeling',
    porCiudad: 'Pool remodeling by city',
    schema: {
      nombre: (ciudad) => `Pool remodeling in ${ciudad}, FL`,
      tipo: 'Pool remodeling and renovation',
    },
    categoria: 'pool-spa',
    galeria: 'servicio:pool-remodeling',
    carrusel: {
      titulo: 'Featured Pool & Outdoor Living Projects',
      entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.',
    },
  },
  'pergola-builders': {
    sin3d: true,
    clave: 'pergola-builders', nombre: 'Pergola Builders', porCiudad: 'Pergola builders by city',
    schema: { nombre: (ciudad) => `Aluminum pergola design and installation in ${ciudad}, FL`, tipo: 'Aluminum pergola design and installation' },
    categoria: 'patio-cover', galeria: 'servicio:pergola-builders',
    carrusel: { titulo: 'Featured Pool & Outdoor Living Projects', entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.' },
  },
  'louvered-roofs': {
    sin3d: true,
    clave: 'louvered-roofs', nombre: 'Louvered Roofs', porCiudad: 'Louvered roofs by city',
    schema: { nombre: (ciudad) => `Motorized louvered roof installation in ${ciudad}, FL`, tipo: 'Motorized louvered roof installation' },
    categoria: 'patio-cover', galeria: 'servicio:louvered-roofs',
    carrusel: { titulo: 'Featured Pool & Outdoor Living Projects', entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.' },
  },
  'deck-builders': {
    sin3d: true,
    clave: 'deck-builders', nombre: 'Deck Builders', porCiudad: 'Deck builders by city',
    schema: { nombre: (ciudad) => `Custom deck design and construction in ${ciudad}, FL`, tipo: 'Custom deck design and construction' },
    categoria: 'outdoor-living', galeria: 'servicio:deck-builders',
    carrusel: { titulo: 'Featured Pool & Outdoor Living Projects', entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.' },
  },
  'outdoor-kitchens': {
    sin3d: true,
    clave: 'outdoor-kitchens', nombre: 'Outdoor Kitchens', porCiudad: 'Outdoor kitchens by city',
    schema: { nombre: (ciudad) => `Custom outdoor kitchen design and construction in ${ciudad}, FL`, tipo: 'Outdoor kitchen design and construction' },
    categoria: 'outdoor-living', galeria: 'servicio:outdoor-kitchens',
    carrusel: { titulo: 'Featured Pool & Outdoor Living Projects', entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.' },
  },
  landscaping: {
    sin3d: true,
    clave: 'landscaping', nombre: 'Landscaping', porCiudad: 'Landscaping by city',
    schema: { nombre: (ciudad) => `Landscape design and installation in ${ciudad}, FL`, tipo: 'Landscape design and installation' },
    categoria: 'outdoor-living', galeria: 'servicio:landscaping',
    carrusel: { titulo: 'Featured Pool & Outdoor Living Projects', entradilla: 'Selected pool and outdoor living projects from our Florida portfolio, to inspire your design.' },
  },
};

/**
 * EL BUSCADOR DE CIUDADES DE UNA FICHA (`CiudadesServicio.astro`; CIUDADES-BUSCADOR, 17-oct-2026).
 *
 * Una sola funcion para las 7 fichas con landings, piscina incluida: la pinta el componente, la
 * declara `check-texto.mjs` (`lineas`) y la lee `jsonld-propio.mjs` (`ciudades`), asi que no pueden
 * dejar de coincidir. Devuelve `null` si la ficha no tiene landings.
 *
 * `lineas` son las cadenas EXACTAS de `innerText` que pinta el componente CON JS en la vista «All»,
 * en el orden del DOM — que es lo que mide `check:texto`: titulo, apoyo, etiqueta del campo, un chip
 * por condado con su cuenta, y por cada condado su `<h3>` y, por ciudad, nombre y servicio; al pie,
 * los enlaces de zona. Sin JS el campo y los chips no se pintan (`hidden`) y el resto es identico.
 *
 * Condados en el orden de «Where We Serve»: los del norte, luego los del sur; ciudades por nombre.
 * Una ciudad sin condado resoluble iria en «Other», al final: hoy no hay ninguna.
 */
/* ponytail: por debajo de este numero de ciudades la pieza pinta solo la rejilla, sin campo ni chips
 * (landscaping tiene 4). Una constante, no un segundo componente. */
export const UMBRAL_BUSCADOR = 8;
export const TEXTOS_BUSCADOR = {
  todas: 'All',
  buscar: 'Search your city',
  vacio: 'No cities match.',
  filtro: 'Filter by county',   // nombre accesible del grupo de chips; no es innerText
  limpiar: 'Clear search',      // nombre accesible del boton que vacia el campo (solo icono); no es innerText
};
const ZONAS = [['North Florida', '/where-we-serve/north-florida'], ['South Florida', '/where-we-serve/south-florida']];

export function ciudadesDeFicha(ficha) {
  const servicio = ficha.split('/').pop();
  const sv = SERVICIOS_CIUDAD[servicio];
  const rutas = RUTAS_CIUDAD.filter((r) => r.startsWith(`${ficha}/`));
  if (!sv || !rutas.length) return null;
  if (!sv.porCiudad) throw new Error(`ciudadesDeFicha: «${servicio}» no tiene \`porCiudad\` en servicios-ciudad.mjs`);

  const grupos = new Map();
  for (const r of rutas) {
    const slug = CONDADO_DE_RUTA[r] ?? 'other';
    if (!grupos.has(slug)) grupos.set(slug, { slug, nombre: slug === 'other' ? 'Other' : nombreCondado(slug), zona: slug === 'other' ? null : zonaDeCondado(slug), ciudades: [] });
    grupos.get(slug).ciudades.push({ href: r, nombre: NOMBRE_DE_RUTA[r], condado: slug });
  }
  const orden = (g) => (g.zona === null ? 2 : g.zona === 'South Florida' ? 1 : 0);
  const condados = [...grupos.values()]
    .sort((a, b) => orden(a) - orden(b) || a.nombre.localeCompare(b.nombre))
    .map((g) => ({
      ...g,
      cuenta: g.ciudades.length,
      // Solo la ficha de piscina tiene pagina de condado (`/services/pool-builders/<condado>-county-fl`).
      href: servicio === 'pool-builders' && g.slug !== 'other' ? `/services/pool-builders/${g.slug}` : null,
      ciudades: g.ciudades.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }));
  const ciudades = condados.flatMap((c) => c.ciudades);
  const n = ciudades.length;
  const m = condados.filter((c) => c.slug !== 'other').length;
  const zonas = ZONAS.filter(([z]) => condados.some((c) => c.zona === z))
    .map(([zona, href]) => ({ zona, href, texto: `View ${zona} Service Areas` }));
  const buscador = n > UMBRAL_BUSCADOR;
  const apoyo = `${n} cities across ${m} Florida ${m === 1 ? 'county' : 'counties'}`;

  // El H2 lleva `.mm-h2`, que el sistema pinta con `text-transform: capitalize` (regla «mayusculas» de
  // sistema.css), y eso SI altera `innerText`: «Custom pool builders by city» se lee «Custom Pool
  // Builders By City». La misma regla que `capitalizaH2()` en check-texto.mjs.
  const capitaliza = (t) => t.replace(/(^|[\s(-])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());
  const lineas = [
    capitaliza(sv.porCiudad),
    apoyo,
    ...(buscador ? [TEXTOS_BUSCADOR.buscar, `${TEXTOS_BUSCADOR.todas} ${n}`, ...condados.map((c) => `${c.nombre} ${c.cuenta}`)] : []),
    ...condados.flatMap((c) => [`${c.nombre} ${c.cuenta}`, ...c.ciudades.flatMap((x) => [x.nombre, sv.nombre])]),
    ...zonas.map((z) => z.texto),
  ];
  return { servicio: sv.nombre, titulo: sv.porCiudad, apoyo, total: n, buscador, condados, ciudades, zonas, textos: TEXTOS_BUSCADOR, lineas };
}
