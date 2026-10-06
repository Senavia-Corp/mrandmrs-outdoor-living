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
export const SERVICIOS_CIUDAD = {
  'pool-builders': {
    clave: 'pool-builders',
    nombre: 'Custom Pool Builders',
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
 * LA LINEA DE CIUDADES DE UNA FICHA (`CiudadesServicio.astro`), en una sola funcion: la pinta el
 * componente y la declara `check-texto.mjs`, asi que no pueden dejar de coincidir.
 * Devuelve `null` si la ficha no tiene landings. `paginas` es `ciudades-servicios.json > paginas`.
 */
export function ciudadesDeFicha(ficha, paginas) {
  const servicio = ficha.split('/').pop();
  const ciudades = Object.entries(paginas)
    .filter(([r]) => r.startsWith(`${ficha}/`))
    .map(([r, p]) => ({ href: r, nombre: `${p.doc.name}, FL` }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (!ciudades.length) return null;
  const rotulo = SERVICIOS_CIUDAD[servicio]?.porCiudad;
  if (!rotulo) throw new Error(`ciudadesDeFicha: «${servicio}» no tiene \`porCiudad\` en servicios-ciudad.mjs`);
  return { rotulo, ciudades, linea: `${rotulo}: ${ciudades.map((c) => c.nombre).join(' · ')}` };
}
