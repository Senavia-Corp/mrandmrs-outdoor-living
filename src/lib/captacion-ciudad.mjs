/**
 * LA CIRUGIA QUE LA CAPA DE CAPTACION HACE SOBRE EL BLOQUE DERIVADO DE UNA CIUDAD.
 *
 * `src/pages/pool-builders/[slug].astro` pinta las 53 ciudades desde UNA plantilla
 * (`src/data/plantilla-pool-builders.json`, bloques `B[0..3]`). R20-CIUDADES enciende la capa de
 * captacion de R17-CORE en DOS de esas 53 —las Final URL de los ad groups «Ocala» y
 * «Gainesville»—, y eso exige meter secciones EN MEDIO de `B[0]` y retocar el heroe.
 *
 * POR QUE SE PARTE POR UN MARCADOR Y NO SE CABLEAN LOS TROZOS. Mismo motivo que
 * `carrusel-proyectos.mjs` y `feed-social.mjs`: si un generador cambiara la forma del bloque,
 * esto TIRA el build con la ruta puesta en el mensaje, en vez de reordenar mal en silencio. El
 * heroe `.hero-glass-section` lo montan 57 rutas (las 53 ciudades + los 2 `where-we-serve` + la
 * home en su variante `-page` + el laboratorio): una cirugia sin guarda aqui se lleva por
 * delante paginas que nadie esta mirando.
 *
 * LAS OTRAS 51 NO PASAN POR AQUI. `[slug].astro` solo llama a estas funciones si la ruta tiene
 * entrada en `src/data/captacion-servicios.json`. Sin entrada el bloque sale intacto, byte a
 * byte, que es la garantia que sostiene todo el encargo.
 */

/**
 * Parte `cadena` justo ANTES de `marca`, que tiene que aparecer exactamente una vez.
 * Devuelve `[antes, desde_la_marca]`. `donde` es solo para el mensaje de error: sin el, un
 * fallo en 1 de las 53 Ciudades no dice cual.
 */
export function partirEn(cadena, marca, donde) {
  const t = String(cadena);
  const n = t.split(marca).length - 1;
  if (n !== 1) {
    throw new Error(`[captacion-ciudad] ${donde}: esperaba UNA «${marca}» y hay ${n}. `
      + 'El bloque derivado ha cambiado de forma — revisa scripts/build-plantillas.mjs antes '
      + 'de tocar la pagina.');
  }
  const i = t.indexOf(marca);
  return [t.slice(0, i), t.slice(i)];
}

/**
 * EL ANCLA DEL HEROE. Se busca la pareja ENTERA -el contenedor de botones mas el primer `href`-
 * y no `wrapper-buttons-center` a secas, porque esa clase sale DOS veces en `B[0]` (la otra es
 * la del carrusel de obra) y partir por la primera que aparezca es exactamente el tipo de
 * acierto por casualidad que deja de serlo al siguiente cambio de plantilla.
 */
const ANCLA_HEROE = '<div class="wrapper-buttons-center"><a href="/request-estimated"';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * EL HEROE DE UNA LANDING DE PAGO.
 *
 * Tres cambios, y los tres son de correspondencia de mensaje, no de estetica:
 *
 *   1. EL CTA ANCLA AL FORMULARIO DE ESTA PAGINA. Salia a `/request-estimated`: un segundo clic
 *      que el anuncio ya habia pagado. El camino a `/request-estimated` NO desaparece —sigue en
 *      el `.cta-footer`, que cierra 102 rutas—, asi que la regla 7 de `check:ads` («hay camino a
 *      un destino de conversion») sigue satisfecha.
 *   2. LOS DOS TELEFONOS, EL DE SU REGION PRIMERO. La pagina no tenia NI UNO en el cuerpo: el
 *      invariante de la regla 8 de `check:ads` («North Florida antes que South») lo cumplia solo
 *      el cromo —el nav y el boton flotante—, o sea un verde prestado. Salen de
 *      `src/data/telefonos.json`, que es la fuente unica.
 *   3. LAS LICENCIAS, que son el dato de confianza mas barato de leer y el unico verificable sin
 *      salir de la pagina (`src/lib/negocio.mjs`, y ya estan en el pie de las 122).
 *
 * El SEGUNDO boton del heroe («Project Gallery» -> `/gallery`) NO se toca: es la salida para
 * quien todavia no quiere dejar sus datos, y quitarla seria estrechar el embudo, no afinarlo.
 *
 * Las clases `svc-heroe__tel` y `svc-heroe__lic` ya existen en `servicio-core.css` y son
 * selectores PLANOS, sin ancestro de ruta, asi que esto no cuesta un solo byte de CSS.
 */
export function heroeDeCaptacion(cadena, cap, telefonos, donde) {
  const t = String(cadena);
  const n = t.split(ANCLA_HEROE).length - 1;
  if (n !== 1) {
    throw new Error(`[captacion-ciudad] ${donde}: esperaba UN «${ANCLA_HEROE}» en el heroe y hay `
      + `${n}. Ese marcado lo montan 57 rutas: revisa la plantilla antes de tocar la pagina.`);
  }
  /* EL ORDEN DE LAS ZONAS LO MANDA LA ENTRADA, NO EL FICHERO DE TELEFONOS. En North Florida el
   * de North va delante; el dia que haya una ciudad de Broward o Palm Beach (fase 2) tiene que
   * ir delante el suyo, y eso no se decide desde aqui. Sin `zonas` declaradas se mantiene el
   * orden del origen, que es el de `telefonos.json`. */
  /* LA GUARDA DEL MARCADOR NO BASTA: TAMBIEN SE COMPRUEBA LA CARGA.
   * `esc()` convierte `undefined` en cadena vacia, asi que una entrada a la que le falte
   * `licencias` o `ancla` no revienta: pinta un `<p>` mudo y un `href=""` en el CTA principal
   * de una landing de pago. Es el mismo criterio que `valor()` en `[slug].astro` —«un campo
   * vacio deja un hueco mudo en la pagina; mejor que reviente el build»— y aqui vale doble,
   * porque el campo que se queda vacio es el camino a la conversion. */
  for (const k of ['licencias', 'ancla']) {
    if (!String(cap.heroe?.[k] ?? '').trim()) {
      throw new Error(`[captacion-ciudad] ${donde}: falta heroe.${k} en `
        + 'captacion-servicios.json. Sin `ancla` el CTA de la landing apunta a ninguna parte.');
    }
  }
  const zonas = cap.heroe?.zonas ?? telefonos.map((x) => x.zona);
  const orden = zonas.map((z) => telefonos.find((x) => x.zona === z));
  if (orden.some((x) => !x)) {
    throw new Error(`[captacion-ciudad] ${donde}: heroe.zonas pide ${JSON.stringify(zonas)} y `
      + `src/data/telefonos.json solo trae ${JSON.stringify(telefonos.map((x) => x.zona))}.`);
  }
  const tel = orden
    .map((x) => `<a href="tel:${esc(x.tel)}">${esc(x.visible)}</a> ${esc(x.zona)}`)
    .join(' &middot; ');
  /* 🚨 EL REEMPLAZO VA POR FUNCION, NO POR CADENA, Y NO ES ESTILO.
   * `String.prototype.replace` interpreta `$&`, `$\``, `$'` y `$1` DENTRO del texto de
   * sustitucion. Ese texto sale de `captacion-servicios.json` —licencias y telefonos—, o sea de
   * datos que un dia escribe otra persona. Con un `$&` en el copy, el reemplazo insertaria el
   * marcador entero y el heroe saldria con el HTML duplicado, en produccion y sin ruido.
   * Hoy no hay ningun `$` en esos campos; la forma con funcion hace que no importe. */
  const trozo = `<p class="svc-heroe__tel">${tel}</p>`
    + `<p class="svc-heroe__lic">${esc(cap.heroe.licencias)}</p>`
    + `<div class="wrapper-buttons-center"><a href="${esc(cap.heroe.ancla)}"`;
  return t.replace(ANCLA_HEROE, () => trozo);
}
