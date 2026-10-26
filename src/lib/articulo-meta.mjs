/**
 * S5 parte 2 (D-254, L5 de PUBLICAR, 26-oct-2026) · LA FIRMA Y LAS FECHAS DEL ARTICULO, A LA VISTA.
 * Una sola funcion para la plantilla (`[slug].astro`) y para `check-texto.mjs`: quien firma (la entidad, no una
 * persona: /about no nombra a nadie como autor) y cuando se publico y se actualizo, en ingles de EE. UU. y en
 * hora de Florida. «Updated» solo sale si cae en otro dia que la publicacion.
 */
export const AUTOR = 'Mr & Mrs Outdoor Living';
const FORMATO = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
const dia = (iso) => FORMATO.format(new Date(iso));
const fecha = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(iso));   // YYYY-MM-DD

export function metaArticulo(doc) {
  if (!doc?.publishedAt) throw new Error(`articulo-meta: ${doc?.slug ?? '?'} sin publishedAt`);
  const actualizado = doc.updatedAt && fecha(doc.updatedAt) !== fecha(doc.publishedAt) ? doc.updatedAt : null;
  return {
    autor: AUTOR,
    publicado: { iso: fecha(doc.publishedAt), texto: dia(doc.publishedAt) },
    actualizado: actualizado ? { iso: fecha(actualizado), texto: dia(actualizado) } : null,
    lineas: [`By ${AUTOR}`, `Published ${dia(doc.publishedAt)}`, ...(actualizado ? [`Updated ${dia(actualizado)}`] : [])],
  };
}

/** S5 parte 1 (L4) con la observacion de L5: el lede se repite si su PRIMERA FRASE es la del primer parrafo del cuerpo
 *  (en 4 de 47 comparten la frase sin ser identicos y se leian dos veces). La plantilla y check-texto usan esta misma regla. */
const nm = (t) => String(t ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const primeraFrase = (t) => (nm(t).match(/^(.+?[.!?])(\s|$)/)?.[1] ?? nm(t)).toLowerCase();
export function primerParrafo(doc) {
  const b = (doc.blog ?? []).find((x) => x?._type === 'block' && (x.style ?? 'normal') === 'normal' && !x.listItem);
  return b ? nm((b.children ?? []).map((c) => c.text ?? '').join('')) : null;
}
export function ledeRepetido(doc) {
  const p = primerParrafo(doc);
  return !!p && !!nm(doc.summary) && primeraFrase(p) === primeraFrase(doc.summary);
}
