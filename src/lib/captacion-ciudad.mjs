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

/**
 * EL ANCLA DEL GRUPO DEL HEROE. Envuelve H1 + H2 + `.text-divider-hero-city`, y sale UNA vez en
 * `B[0]`. Sirve para dos cosas de golpe y por eso no hay un segundo ancla: pone el modificador de
 * ruta y abre el hueco de la insignia ENCIMA del `<h1>`, que es donde se lee como credencial y no
 * como la quinta linea de un parrafo.
 *
 * 🚨 EL MODIFICADOR VA EN SEGUNDA POSICION, Y NO ES ESTILO.
 * `scripts/check-estructura-ciudades.mjs:92-102` identifica cada seccion por `classList[0]`. Una
 * clase delante de `hero-glass-section` no rompe la pagina: rompe la PUERTA, y encima con un rojo
 * que miente, porque `clases.indexOf('hero-glass-section')` daria -1 y el `slice` cortaria desde
 * el final. Aqui el ancla es el `div` interior, no la `section`, pero la regla se escribe igual
 * para el dia que alguien mueva el modificador de sitio.
 */
const ANCLA_BLOQUE = '<div class="wrapper-main-hero-page">';

/* LOS DOS PICTOGRAMAS VAN INLINE, NO COMO FICHERO EN `public/`. Dos motivos, y los dos son de
 * puerta, no de gusto: inline hereda `currentColor` —o sea que el color lo decide la capa y no el
 * activo, que es lo que permite medir el contraste contra el peor pixel del velo— y queda fuera
 * de la regla 3c de `check-tokens`, que a los SVG de `public/**` solo les deja cuatro hex.
 * Mismo patron que `src/components/widgets/ClickToCall.astro`. */
const ESCUDO = '<svg class="svc-heroe__escudo" viewBox="0 0 24 24" aria-hidden="true" '
  + 'focusable="false"><path d="M12 3 5 6v5.2c0 4.1 2.9 7.9 7 9.1 4.1-1.2 7-5 7-9.1V6l-7-3Z" '
  + 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
  + '<path d="m8.8 11.9 2.2 2.2 4.2-4.2" fill="none" stroke="currentColor" stroke-width="1.6" '
  + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';

const AURICULAR = '<svg class="svc-heroe__glifo" viewBox="0 0 24 24" aria-hidden="true" '
  + 'focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2-2a1 1 0 0 1 1-.25 11.4 11.4 '
  + '0 0 0 3.3.53 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 '
  + '1c0 1.15.18 2.26.53 3.3a1 1 0 0 1-.25 1l-2 2Z" fill="currentColor"/></svg>';

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
 * R21 ANADE UNA CUARTA COSA, Y ESTA SI ES DE FORMA: los cuatro trabajos del heroe se estaban
 * entregando con la MISMA forma —cuatro parrafos seguidos bajo el H1, seis lineas de prosa
 * plana—, asi que ninguno destacaba. Ahora cada uno tiene la suya: la licencia es una insignia
 * encima del H1, los telefonos son chips con glifo, y el resto se queda en prosa.
 *
 * OJO AL COSTE, QUE HA CAMBIADO. Hasta R20 esto no costaba «un solo byte de CSS» porque
 * `svc-heroe__tel` y `svc-heroe__lic` son selectores PLANOS que ya existian en
 * `servicio-core.css`. Ya no es verdad: la forma nueva se paga con reglas bajo
 * `.svc-heroe--ciudad`, y esas reglas entran en el presupuesto de 92 KB de `check:tokens`.
 */
export function heroeDeCaptacion(cadena, cap, telefonos, donde) {
  const t = String(cadena);
  const n = t.split(ANCLA_HEROE).length - 1;
  if (n !== 1) {
    throw new Error(`[captacion-ciudad] ${donde}: esperaba UN «${ANCLA_HEROE}» en el heroe y hay `
      + `${n}. Ese marcado lo montan 57 rutas: revisa la plantilla antes de tocar la pagina.`);
  }
  const m = t.split(ANCLA_BLOQUE).length - 1;
  if (m !== 1) {
    throw new Error(`[captacion-ciudad] ${donde}: esperaba UN «${ANCLA_BLOQUE}» y hay ${m}. `
      + 'Sin ese ancla la insignia se quedaria fuera del heroe y el modificador de ruta no se '
      + 'emitiria, o sea que las reglas de .svc-heroe--ciudad no pintarian nada. Revisa la '
      + 'plantilla antes de tocar la pagina.');
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
  /* CADA TELEFONO EN SU CHIP, Y EL `&middot;` SE QUEDA DONDE ESTABA.
   * El separador no es adorno que se pueda quitar: `innerText` lo ve, y `check:texto` compara la
   * linea entera sin tolerancia (`bloquesCaptacion`, que la deriva con `.join(' · ')`). Quitarlo
   * seria tocar el texto —Principio 2— para ganar un pixel. Se queda, y la capa lo separa.
   *
   * EL SEPARADOR VA EN UN `<span>` PARA PODER APAGARLO CUANDO LOS CHIPS SE APILAN. En movil los
   * dos chips no caben en una linea, y el `·` se quedaba HUERFANO a la derecha del primero, que
   * es justo lo que parece un fallo de maquetacion. Con el `<span>` la capa lo oculta por debajo
   * de 768, donde ya no une nada. `aria-hidden` porque unir dos chips es su unico trabajo: para
   * quien escucha la pagina no dice nada.
   *
   * Y ESTO NO ESQUIVA LA PUERTA, QUE ES LA PREGUNTA OBVIA: `check:texto` mide a 1920 y ahi el
   * separador ESTA, con su espacio a cada lado, o sea que la linea que compara es la misma de
   * siempre. Lo que se apaga es una union que a ese ancho no existe.
   *
   * EL CHIP ES `inline-block`, NUNCA `inline-flex`, Y ESO TAMPOCO ES ESTILO. En un contenedor
   * flex el nodo de texto ` North Florida` se vuelve item anonimo y el espacio de delante se
   * COME: `innerText` pasaria a decir «…740-3361North Florida» y la puerta se pondria roja por
   * un texto que en la pagina se lee bien. Con `inline-block` el espaciado sigue las reglas
   * normales de linea y el texto no se mueve. */
  const tel = orden
    .map((x) => `<span class="svc-heroe__chip">${AURICULAR}`
      + `<a href="tel:${esc(x.tel)}">${esc(x.visible)}</a> ${esc(x.zona)}</span>`)
    .join('<span class="svc-heroe__sep" aria-hidden="true"> &middot; </span>');
  /* 🚨 EL REEMPLAZO VA POR FUNCION, NO POR CADENA, Y NO ES ESTILO.
   * `String.prototype.replace` interpreta `$&`, `$\``, `$'` y `$1` DENTRO del texto de
   * sustitucion. Ese texto sale de `captacion-servicios.json` —licencias y telefonos—, o sea de
   * datos que un dia escribe otra persona. Con un `$&` en el copy, el reemplazo insertaria el
   * marcador entero y el heroe saldria con el HTML duplicado, en produccion y sin ruido.
   * Hoy no hay ningun `$` en esos campos; la forma con funcion hace que no importe. */
  const trozo = `<p class="svc-heroe__tel">${tel}</p>`
    + `<div class="wrapper-buttons-center"><a href="${esc(cap.heroe.ancla)}"`;
  /* LA INSIGNIA CONSERVA LA CLASE `svc-heroe__lic`, Y ES A PROPOSITO.
   * El texto es el mismo y el trabajo tambien —probar la licencia—: lo unico que cambia es la
   * FORMA en que se lee, y eso lo decide la capa bajo `.svc-heroe--ciudad`. Reusar la clase deja
   * las 14 fichas de `/services/` exactamente como estaban (alli el selector es plano y sigue
   * cayendo su regla de siempre) y ahorra un nombre nuevo que no explicaria nada mas. */
  const insignia = `<p class="svc-heroe__lic">${ESCUDO}`
    + `<span>${esc(cap.heroe.licencias)}</span></p>`;
  /* Los dos reemplazos van por FUNCION por el mismo motivo que el de arriba: el texto sale de
   * `captacion-servicios.json`, y un `$&` en el copy insertaria el marcador entero. */
  return t
    .replace(ANCLA_HEROE, () => trozo)
    .replace(ANCLA_BLOQUE, () => `<div class="wrapper-main-hero-page svc-heroe--ciudad">${insignia}`);
}
