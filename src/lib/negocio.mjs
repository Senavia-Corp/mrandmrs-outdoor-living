/**
 * LA ENTIDAD DEL NEGOCIO — fuente única del `LocalBusiness` y del `BreadcrumbList`.
 *
 * POR QUE EXISTE. Antes de esto el sitio era técnicamente sólido y semánticamente mudo:
 * `sameAs` valía 0 en las 122 páginas, `telephone` dentro de JSON-LD valía 0, `BreadcrumbList`
 * salía en 1 de 122, y los 53 `LocalBusiness` de ciudad llevaban
 *
 *     "address": { "@type": "PostalAddress", "addressCountry": "US", "addressRegion": "FL" }
 *     "geo":     { "@type": "GeoCoordinates" }
 *
 * o sea: una dirección sin calle ni ciudad y unas coordenadas vacías, en 53 de 53. Para un
 * motor generativo eso no es «información parcial», es ruido — y sin `sameAs` no hay forma de
 * confirmar que la entidad del sitio y la del perfil de Google son la misma.
 *
 * 🚨 LA REGLA DE ESTE FICHERO: LO QUE NO ESTÁ VERIFICADO, SE OMITE. Nunca se emite un campo
 * vacío ni un valor inventado. Un `GeoCoordinates` vacío es peor que no ponerlo: le dice al
 * consumidor que hay un dato y que no vale nada. Cada campo de aquí abajo lleva de dónde sale.
 */

/** Los dos números y el correo salen de `src/data/telefonos.json`, copiados del sitio vivo. */
import TELEFONOS from '../data/telefonos.json';

export const SITIO = 'https://www.mrandmrsoutdoorliving.com';
export const ID_NEGOCIO = `${SITIO}/#negocio`;

/**
 * `sameAs` — LA PIEZA QUE MÁS PESA EN GEO, y hasta hoy valía 0.
 * Las tres son URLs REALES que ya vivían en el repo, no búsquedas ni suposiciones:
 *  · Google Business Profile — `src/data/resenas.json.enlacePerfil`, el CID desde el que se
 *    descargan las reseñas y que `check-resenas.mjs:24` verifica en cada pasada.
 *  · Instagram — `src/data/instagram.json.usuario`, de donde sale el feed.
 *  · YouTube — `src/data/youtube.json`, de donde salen los 8 vídeos de /videos.
 * Facebook, Houzz, BBB y Yelp NO están aquí porque no constan en ninguna fuente del repo.
 * Se piden a Sebastian; inventarlos sería peor que no tenerlos.
 */
const PERFILES = [
  'https://maps.google.com/?cid=2096358844840078377',
  'https://www.instagram.com/mrandmrsoutdoorliving/',
  'https://www.youtube.com/channel/UC3VGkVUUC1FmXhtn2CUofsA',
];

/** Los 9 condados con página propia bajo `/country/`. Verificable: son rutas construidas. */
const CONDADOS = ['Alachua', 'Broward', 'Columbia', 'Dixie', 'Gilchrist',
  'Levy', 'Marion', 'Palm Beach', 'Putnam'];

/**
 * Las dos licencias de contratista que el pie publica en las 122 páginas
 * (`src/components/Footer.astro`: «Licensed & Insured | CPC1461119 | CPC1460562»). Un número de
 * licencia es exactamente el tipo de dato que un motor generativo puede atribuir y verificar,
 * así que pasa al marcado en vez de quedarse solo como texto del pie.
 * Sigue pendiente que Sebastian confirme que las dos están VIGENTES.
 */
const LICENCIAS = ['CPC1461119', 'CPC1460562'];

/**
 * El nodo del negocio. `LocalBusiness` es subtipo de `Organization`, así que un solo nodo sirve
 * para las dos cosas y evita dos entidades compitiendo por el mismo `@id`.
 *
 * SIN `address`, Y ES DELIBERADO: no hay ninguna dirección postal en el repo. Un negocio de
 * área de servicio se marca con `areaServed` y sin dirección visible, que es exactamente lo que
 * queda aquí. Si Sebastian confirma que hay dirección publicable, se añade y deja de ser eso.
 * SIN `aggregateRating`: el perfil real está en 4,1 sobre 13 y el sitio publica una selección de
 * 8, todas de 5. Marcar 5,0/8 sería falso; ver `scripts/fetch-resenas.mjs:70-85`.
 * SIN `openingHours` ni `priceRange`: no constan.
 */
export function negocio() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': ID_NEGOCIO,
    name: 'Mr & Mrs Outdoor Living',
    url: SITIO,
    image: `${SITIO}/images/site/webclip.png`,
    logo: `${SITIO}/images/site/webclip.png`,
    telephone: TELEFONOS.items.map((t) => t.tel),
    email: TELEFONOS.correo,
    areaServed: [
      { '@type': 'State', name: 'Florida' },
      ...CONDADOS.map((c) => ({ '@type': 'AdministrativeArea', name: `${c} County, Florida` })),
    ],
    identifier: LICENCIAS.map((v) => ({
      '@type': 'PropertyValue', name: 'Florida Certified Pool Contractor License', value: v,
    })),
    sameAs: PERFILES,
  };
}

/** Cómo se lee cada tramo de URL en la miga. Lo que no esté aquí se titula por el slug. */
const NOMBRE_TRAMO = {
  'services': 'Services',
  'pool-builders': 'Service Areas',
  'where-we-serve': 'Where We Serve',
  'country': 'Counties',
  'project': 'Projects',
  'blogs': 'Blog',
  'articles': 'Articles',
};

const titula = (s) => (NOMBRE_TRAMO[s] ?? s.replace(/-/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase()));

/**
 * `BreadcrumbList` derivado de la ruta. Google lo pinta en el SERP en vez de la URL cruda, y
 * hasta hoy salía en 1 de 122 páginas.
 * Devuelve `null` en la home (una miga de un solo escalón no dice nada) y en cualquier ruta que
 * ya traiga la suya, que decide quien llama.
 */
export function miga(ruta) {
  const tramos = ruta.split('/').filter(Boolean);
  if (!tramos.length) return null;
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITIO }];
  let acum = '';
  tramos.forEach((t, i) => {
    acum += `/${t}`;
    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name: titula(t),
      item: `${SITIO}${acum}`,
    });
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${SITIO}${ruta}#miga`,
    itemListElement: items,
  };
}
