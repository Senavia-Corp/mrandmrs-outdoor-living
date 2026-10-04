/**
 * EL PIE — lo que cambia respecto al Webflow de origen (SEO-REMEDIACION, 4-oct-2026).
 *
 * Fuente unica para `Footer.astro`, que lo pinta, y para `check-texto.mjs`, que lo declara. Sin
 * imports: lo leen Astro y Node por igual.
 *
 *   1 · «Areas We Serve» publicaba las 53 ciudades en las 167 paginas con pie, en un orden sin
 *       criterio (Alachua, Wilton Manors, Williston…). 53 enlaces iguales en cada pagina le dicen
 *       a Google que las 53 pesan lo mismo, y no es verdad: Gainesville y Ocala son los dos
 *       mercados prioritarios. Pasan a ser los dos unicos enlaces de ciudad del pie, mas los tres
 *       hubs de zona. Ninguna ciudad se queda sin camino de rastreo: las 53 siguen enlazadas desde
 *       el cuerpo de su pagina de condado (medido: 53/53), y los condados desde `/where-we-serve`.
 *   2 · La columna de servicios pone primero lo que de verdad vende la casa: construccion y
 *       remodelacion de piscina. Los catorce siguen, solo cambia el orden.
 *   3 · El año del copyright sale del build: decia «© 2025».
 */
export const AREAS_PIE = [
  { texto: 'Gainesville, FL', href: '/services/pool-builders/gainesville-fl' },
  { texto: 'Ocala, FL', href: '/services/pool-builders/ocala-fl' },
  { texto: 'All North Florida Areas', href: '/where-we-serve/north-florida' },
  { texto: 'All South Florida Areas', href: '/where-we-serve/south-florida' },
  { texto: 'All Service Areas', href: '/where-we-serve' },
];

/** Orden de la columna de servicios: los catorce, ninguno nuevo ni quitado. `texto` es la
 *  etiqueta visible del origen (la que lee `check-texto.mjs`); el pie empareja por `href`. */
export const ORDEN_SERVICIOS_PIE = [
  { href: '/services/pool-builders', texto: 'Pool Construction' },
  { href: '/services/pool-remodeling', texto: 'Pool Remodeling' },
  { href: '/services/pool-screen-enclosures', texto: 'Pool Screen Enclosures' },
  { href: '/services/pergola-builders', texto: 'Aluminum Pergolas' },
  { href: '/services/louvered-roofs', texto: 'Louvered Roof Systems' },
  { href: '/services/outdoor-kitchens', texto: 'Outdoor Kitchens' },
  { href: '/services/deck-builders', texto: 'Custom Decks' },
  { href: '/services/patio-screen-rooms', texto: 'Patio Screen Rooms' },
  { href: '/services/retractable-screens', texto: 'Retractable Screens' },
  { href: '/services/landscaping', texto: 'Landscaping' },
  { href: '/services/irrigation-systems', texto: 'Automated Irrigation' },
  { href: '/services/outdoor-furniture', texto: 'Outdoor Furniture' },
  { href: '/services/soffit-led-lighting', texto: 'Smart Soffit LED Lighting' },
  { href: '/services/steel-buildings-pole-barns', texto: 'Pole Barn and Steel Buildings' },
];

export const ANIO = new Date().getFullYear();
export const COPYRIGHT_ORIGEN = '© 2025 | Mr. and Mrs. Outdoor Living All Rights Reserved.';
export const copyright = () => COPYRIGHT_ORIGEN.replace('2025', String(ANIO));
