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
 * LAS LICENCIAS salen de `identidad.mjs` (SEO-REMEDIACION, 4-oct-2026). Antes aqui solo habia
 * las dos CPC, con un comentario que decia que el pie solo publica esas dos — y el pie publica
 * tambien SCC131153553 en las 169 paginas. Un numero de licencia es justo el tipo de dato que un
 * motor generativo puede atribuir y verificar, asi que van las tres, cada una con su descripcion
 * generica (la clase exacta de cada una esta pendiente del cliente).
 */
import { LICENCIAS } from './identidad.mjs';

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
    identifier: LICENCIAS.map((l) => ({
      '@type': 'PropertyValue', name: l.descripcion, value: l.numero,
    })),
    sameAs: PERFILES,
  };
}

import { tramosMiga } from './miga-tramos.mjs';

/**
 * `BreadcrumbList` derivado de la ruta. Google lo pinta en el SERP en vez de la URL cruda, y
 * hasta hoy salía en 1 de 122 páginas.
 * Devuelve `null` en la home (una miga de un solo escalón no dice nada) y en cualquier ruta que
 * ya traiga la suya, que decide quien llama.
 */
export function miga(ruta) {
  const tramos = tramosMiga(ruta);
  if (tramos.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${SITIO}${ruta}#miga`,
    itemListElement: tramos.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.nombre, item: `${SITIO}${t.href}`,
    })),
  };
}
