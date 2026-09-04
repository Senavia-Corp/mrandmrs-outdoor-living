/**
 * DESPEGAR LA APERTURA DE `section.social-media` DE UNA CADENA DERIVADA.
 *
 * Tres paginas traen el feed de Instagram dentro de cadenas `set:html` que los generadores
 * dejaron PEGADAS a otra seccion: la apertura `<section class="social-media">` viaja al final
 * del bloque anterior y su `</section>` es un bloque aparte de 10 bytes.
 *
 *   · `src/pages/where-we-serve/north-florida.astro`  (T4 = cierre de testimonial + apertura)
 *   · `src/pages/where-we-serve/south-florida.astro`  (idem)
 *   · `src/pages/pool-builders/[slug].astro`          (B[2] = `.cta-footer` + apertura, x53)
 *
 * Mientras `src/data/instagram.json` estuvo vacio daba igual donde cayera la seccion: medía
 * 0 px -`social.css` cuelga TODO su padding de `:has(.mm-ig)`- y nadie la veia. Poblado el
 * feed (R15-IG) hay que poder meter cosas EN MEDIO de esa pareja pegada -el carrusel de blog
 * en Estado, el CTA del pie en Ciudad- y para eso hay que separarlas primero.
 *
 * SE PARTE POR EL MARCADOR, NO SE CABLEAN LAS DOS MITADES A MANO. Si un generador cambiara la
 * forma del bloque, esto TIRA la pagina en el build con el nombre de la ruta puesto, en vez de
 * reordenar mal en silencio — que es el fallo que no ve nadie hasta que lo ve el cliente.
 *
 * Vive aqui y no copiado en las tres por el mismo motivo que `src/lib/estimador.js`: tres
 * copias empiezan iguales y dejan de serlo al primer arreglo que solo se aplica en un lado.
 */

/** La apertura literal que los dos generadores emiten. Un solo sitio donde escribirla. */
export const IG_APERTURA = '<section class="social-media">';

/**
 * Devuelve `cadena` SIN la apertura del feed, que tiene que estar al final y aparecer una vez.
 * `donde` es solo para el mensaje de error: sin el, un fallo en 1 de las 53 Ciudades no dice
 * cual.
 */
export function sinAperturaDelFeed(cadena, donde) {
  const trozos = String(cadena).split(IG_APERTURA);
  if (trozos.length !== 2) {
    throw new Error(`[feed-social] ${donde}: esperaba UNA «${IG_APERTURA}» y hay `
      + `${trozos.length - 1}. El bloque derivado ha cambiado de forma — revisa `
      + 'scripts/build-paginas.mjs o scripts/build-plantillas.mjs antes de tocar la pagina.');
  }
  if (trozos[1] !== '') {
    throw new Error(`[feed-social] ${donde}: la apertura del feed no esta al FINAL del bloque; `
      + `detras queda ${JSON.stringify(trozos[1].slice(0, 60))}.`);
  }
  return trozos[0];
}
