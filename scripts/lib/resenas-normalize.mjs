// Normalizacion pura de reseñas de Google al contrato de src/data/resenas.json.
//
// Separado de fetch-resenas.mjs para poder probarlo SIN red y SIN OAuth: la ruta
// de Business Profile necesita que Google conceda acceso a mano, o sea que no se
// puede ejercitar a demanda, y estas tres conversiones son justo donde saldria
// una respuesta mal en silencio.
//
// El contrato es el que YA consume ResenasGoogle.astro en 83 rutas, en español:
//   { autor, estrellas, texto, fecha }
// No se añade `foto`: la decision D2 pide cero peticiones a terceros en el
// navegador del visitante, y un <img> a lh3.googleusercontent.com es exactamente
// eso. El componente ya pinta la inicial en circulo dorado cuando no hay foto.

/** En v4 `starRating` es un ENUM STRING — ONE..FIVE, no 1..5. */
const ESTRELLAS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function aNumeroEstrellas(valor) {
  // Defensivo con number: Places ya devuelve numeros, y confundir los dos
  // adaptadores dejaria todas las valoraciones a null sin avisar.
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  return ESTRELLAS[valor] ?? null; // STAR_RATING_UNSPECIFIED y lo que venga nuevo -> null
}

/**
 * Devuelve lo que el cliente escribio DE VERDAD.
 *
 * Cuando la reseña no esta en el idioma del perfil, v4 mete LAS DOS versiones en
 * `comment`: "(Translated by Google) <traduccion>\n\n(Original) <original>".
 * Publicarlo tal cual pone la traduccion automatica de Google en boca del cliente
 * y ademas imprime los marcadores en la pagina.
 */
export function comentarioOriginal(comment) {
  if (!comment) return '';

  // El separador REAL de v4 es estructural: linea en blanco + "(Original) ".
  // Buscarlo asi y no por `lastIndexOf('(Original)')` -como hace el script de
  // senavia-corp- importa: si el cliente escribio "(Original)" DENTRO de su
  // reseña, el ultimo marcador no es el separador y se perderia texto suyo.
  const SEP = '\n\n(Original) ';
  const i = comment.indexOf(SEP);
  if (i !== -1) return comment.slice(i + SEP.length).trim();

  // Respaldo por si Google cambia el empaquetado: se corta por el ultimo
  // marcador, que es lo peor que puede pasar sin dejar de quitar la traduccion.
  const j = comment.lastIndexOf('(Original)');
  if (j !== -1) return comment.slice(j + '(Original)'.length).trim();

  return comment.replace(/^\(Translated by Google\)\s*/, '').trim();
}

/** Colapsa blancos. Un salto de linea dentro de una reseña se renderiza como
 *  espacio en `white-space: normal`, asi que guardarlo crudo haria que el texto
 *  del JSON y el innerText de la pagina dejaran de coincidir. */
const limpia = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** Reseña de v4 (Business Profile) -> contrato de resenas.json */
export function desdeBusinessProfile(r) {
  const anonima = r.reviewer?.isAnonymous === true;
  const nombre = r.reviewer?.displayName?.trim();
  return {
    // A un reseñador anonimo no se le atribuye ni nombre ni foto.
    autor: anonima ? 'Google user' : nombre || 'Google user',
    estrellas: aNumeroEstrellas(r.starRating),
    texto: limpia(comentarioOriginal(r.comment)),
    fecha: r.createTime ?? null,
  };
}

/** Reseña de Places API (New) -> contrato de resenas.json */
export function desdePlaces(r) {
  return {
    autor: r.authorAttribution?.displayName?.trim() || 'Google user',
    estrellas: aNumeroEstrellas(r.rating),
    // `originalText` y NUNCA `text`: `text` puede ser la traduccion de Google.
    texto: limpia(r.originalText?.text ?? r.text?.text ?? ''),
    fecha: r.publishTime ?? null,
  };
}
