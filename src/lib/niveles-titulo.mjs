/**
 * NIVELES DE TITULO SIN SALTOS (SEO-REMEDIACION, 4-oct-2026).
 *
 * Lighthouse (`heading-order`) marcaba saltos en /about, /request-estimated y las dos fichas de
 * piscina: un `<h4 class="heading-logos">` justo detras del `<h1>`, y `<h4>` de tarjeta detras de
 * un `<h2>`. El ESTILO de Webflow cuelga de la etiqueta (`h4{…}`), asi que cambiarla moveria
 * pixeles en decenas de rutas. Se corrige el arbol de accesibilidad, que es lo que el audit y un
 * lector de pantalla leen: un titulo que salta mas de un nivel recibe `aria-level` = anterior + 1.
 * No toca el texto ni el aspecto, y no toca titulos que ya traen `aria-level`.
 */
export function nivelesSinSaltos(html) {
  let anterior = 0;
  let cambios = 0;
  const out = html.replace(/<h([1-6])(\s[^>]*)?>/g, (todo, n, attrs = '') => {
    const nivel = Number(n);
    if (/\saria-level=/.test(attrs) || /\srole=/.test(attrs)) {
      const m = attrs.match(/\saria-level="(\d)"/);
      anterior = m ? Number(m[1]) : nivel;
      return todo;
    }
    if (anterior && nivel > anterior + 1) {
      anterior += 1;
      cambios++;
      return `<h${n}${attrs} aria-level="${anterior}">`;
    }
    anterior = nivel;
    return todo;
  });
  return { html: out, cambios };
}
