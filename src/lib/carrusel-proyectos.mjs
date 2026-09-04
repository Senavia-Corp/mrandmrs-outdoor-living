/**
 * PARTIR UNA CADENA DERIVADA POR LA SECCION «Project Showcase».
 *
 * Lo usa `src/pages/pool-builders/[slug].astro` (x53). Alli el carrusel viaja DENTRO de
 * `B[0]`, una cadena que sale de zipear `plantilla-pool-builders.json` con los campos de
 * Sanity, y para poner el componente en su sitio hay que abrir esa cadena en dos por donde
 * estaba la seccion.
 *
 * POR QUE SE CORTA EN EL RENDER Y NO SE OPERA EL JSON. `plantilla-pool-builders.json` es un
 * artefacto DERIVADO que ya no se puede re-derivar: `build-plantillas.mjs` saco la plantilla
 * por diff de las 53 paginas estaticas y luego las borro, asi que `npm run plantillas` dice
 * hoy «0 paginas · ya convertida». Quitarle la seccion a mano obliga a renumerar los 16
 * huecos de `CAMPOS` —los indices 25 y 27 son `headingPortfolio` y `paragraphPortfolio`— y a
 * correr los indices de `B[]` en todo el fichero. Cortar en el render no mueve un indice, deja
 * el derivado como estaba y usa el mismo patron que ya vive 20 lineas mas abajo en esa misma
 * pagina (`sinAperturaDelFeed`, R15-IG). El precio, dicho para que no sorprenda: los ~8 KB de
 * los 10 slides viejos siguen en el JSON, se construyen y se tiran. No se sirven: lo que se
 * pinta son los 15 del componente.
 *
 * Y SE PARTE POR EL MARCADOR, NO POR UN OFFSET. Si la plantilla cambiara de forma, esto TIRA
 * el build con el nombre de la ruta puesto en vez de servir media seccion en silencio.
 */

const INICIO = '<section class="projects-section">';
const FIN = '<div class="wrapper-buttons-center-page">'
  + '<a href="/projects" class="button button-styles w-button">See all Projects</a>'
  + '</div></div></section>';

/** Cuantos slides tiene que traer el tramo que se descarta. Son los 10 de Webflow, que hoy
 *  emite `src/data/obras-migradas.json` — si la plantilla trajera otra cifra, es que ya no es
 *  el mismo bloque y no se puede dar por equivalente. */
const SLIDES_ESPERADOS = 10;

/**
 * Devuelve `[antes, despues]`: la cadena partida por donde estaba la seccion, que se descarta.
 * `donde` es solo para el mensaje de error — sin el, un fallo en 1 de las 53 no dice cual.
 */
export function partirPorElCarrusel(cadena, donde) {
  const t = String(cadena);
  const aperturas = t.split(INICIO).length - 1;
  if (aperturas !== 1) {
    throw new Error(`[carrusel-proyectos] ${donde}: esperaba UNA «${INICIO}» y hay ${aperturas}. `
      + 'El bloque derivado ha cambiado de forma — revisa scripts/build-plantillas.mjs antes de '
      + 'tocar la pagina.');
  }
  const a = t.indexOf(INICIO);
  const b = t.indexOf(FIN, a);
  if (b === -1) {
    throw new Error(`[carrusel-proyectos] ${donde}: encuentro la apertura de la seccion pero no `
      + 'su cierre («See all Projects» + </section>). Cortar aqui serviria media seccion.');
  }
  const fin = b + FIN.length;
  const descartado = t.slice(a, fin);
  const slides = (descartado.match(/fs-slider-projects_slide/g) ?? []).length;
  if (slides !== SLIDES_ESPERADOS) {
    throw new Error(`[carrusel-proyectos] ${donde}: la seccion que se descarta trae ${slides} `
      + `slides y se esperaban ${SLIDES_ESPERADOS}. Alguien la edito: comprueba que el `
      + 'componente sigue emitiendo lo mismo antes de tirarla.');
  }
  return [t.slice(0, a), t.slice(fin)];
}
