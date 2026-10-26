/**
 * EL ORDEN DE LOS DOS TELEFONOS EN LAS PAGINAS DE CONDADO (D-134).
 *
 * Las ciudades lo declaran en su entrada de captacion (`heroe.zonas`); los condados no tienen
 * entrada. Los dos del sur pintan «South Florida» primero, como sus ciudades; los demas, Norte.
 * Lo usan `build-paginas.mjs`, `CarruselProyectos.astro` y `check-texto.mjs`: un solo sitio.
 */
const SUR = new Set(['broward-county-fl', 'palm-beach-county-fl']);
export const zonasDeCondado = (ruta) => (SUR.has(ruta.split('/').pop())
  ? ['South Florida', 'North Florida'] : ['North Florida', 'South Florida']);
