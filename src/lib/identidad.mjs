/**
 * IDENTIDAD DEL NEGOCIO — las licencias, en UN sitio (SEO-REMEDIACION, 4-oct-2026).
 *
 * Los tres numeros salian escritos a mano en ~20 ficheros (pie, fichas de `/services/`, `/about`,
 * capa de captacion, generadores) con tres variantes de linea distintas, y `negocio.mjs` solo
 * conocia dos: el JSON-LD del negocio no publicaba la SCC que el pie si publica en las 169.
 *
 * Esta lista es la autoridad. `check-identidad.mjs` falla si cualquier pagina construida (o
 * cualquier fuente de `src/`) publica un numero de licencia que no este aqui, y dice que pagina
 * ensena cual. Fichero SIN imports para que lo lean igual Astro, los generadores y las puertas.
 *
 * 🚨 NADA DE ESTO ESTA VERIFICADO CONTRA DBPR DESDE ESTE CONTENEDOR (myfloridalicense.com no
 * responde aqui; una busqueda publica el 4-oct-2026 encontro CPC1461119 y CPC1460562 como
 * licencias de pool contractor y no encontro SCC131153553). Que las tres esten VIGENTES y a nombre
 * de quien esta en `SEO_REQUIRES_CLIENT_DATA.md`. Por eso `descripcion` es generica: no se
 * inventa la clase exacta de la SCC (Webflow la llama «Structural» en /about y la ficha de
 * pergolas «aluminum contractor»; esa contradiccion tambien esta en la lista del cliente).
 */
export const LICENCIAS = [
  { numero: 'CPC1461119', clase: 'piscina', descripcion: 'Florida Certified Pool/Spa Contractor License' },
  { numero: 'CPC1460562', clase: 'piscina', descripcion: 'Florida Certified Pool/Spa Contractor License' },
  { numero: 'SCC131153553', clase: 'especialidad', descripcion: 'Florida Specialty Contractor License' },
];

export const NUMEROS = LICENCIAS.map((l) => l.numero);
export const DE_PISCINA = LICENCIAS.filter((l) => l.clase === 'piscina').map((l) => l.numero);

/** La linea de licencia de las landings de piscina (heroe y franja de confianza). */
export const LINEA_PISCINA = `Florida certified pool contractor · ${DE_PISCINA.join(' · ')}`;

/** Cualquier numero con forma de licencia de contratista de Florida. Lo usa la puerta. */
export const RE_LICENCIA = /\b(?:CPC|CGC|CBC|CRC|SCC|CCC|CFC|CMC|EC|ES)\d{6,}\b/g;
