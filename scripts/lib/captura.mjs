/**
 * El CONGELADO, en un solo sitio.
 *
 * Lo importan `capture-baseline.mjs` (Fase 1) y `check:visual` (Fase 10). Tiene que ser
 * un módulo compartido y no dos copias: la comparación de píxeles solo significa algo si
 * las dos capturas se toman con la MISMA receta. Dos copias que empiezan iguales dejan de
 * serlo al primer arreglo que solo se aplica en un lado, y el síntoma es una puerta que se
 * pone roja sin que nadie haya tocado el sitio.
 *
 * El porqué de cada paso está medido en la cabecera de capture-baseline.mjs.
 */

/** Los 4 breakpoints de Webflow: main >=992 · medium 768-991 · small 480-767 · tiny 0-479. */
export const ANCHOS = [[1920, 1080], [1440, 900], [991, 800], [479, 850]];

/** El ancho del que se saca HTML, texto y SEO. Uno solo: el DOM no depende del viewport. */
export const ANCHO_DOM = 1920;

/** 1/4 y JPEG q82. El porqué (WebP y AVIF revientan por encima de 16383 px) en el otro fichero. */
export const ESCALA = 1 / 4;
export const CALIDAD = 82;

/** Argumentos que impiden que Chromium frene rAF y los temporizadores de la pestaña. */
export const ARGS_NAVEGADOR = ['--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

/** Lo que se tapa, UNO A UNO con su motivo. Nunca se excluye una página entera. */
export const MASCARAS = [
  ['[class*="elfsight-app-"]',
    'los 3 widgets de Elfsight (click-to-call, Google Reviews, Instagram Feed). Su contenido '
    + 'es remoto y cambia solo, así que no puede ser la referencia de una puerta de píxeles. '
    + 'Hoy salen a altura 0 en navegador automatizado y la máscara no tapa nada; está puesta '
    + 'para el día en que sí pinten.'],
];

/** Lo que se clava por CSS antes de capturar. */
export const CONGELAR_CSS = [
  // El marquee de Finsweet lo mueve JS escribiendo transform en línea cada fotograma
  // (medido: animation-name:none, transform:matrix(1,0,0,1,-102.88,0)), así que
  // animations:'disabled' de Playwright NO lo toca. !important sí le gana al style en línea.
  '[class*="fs-marquee"] [class*="_list"]{transform:none!important}',
  // El cursor parpadeante de un <input> con foco entra en la captura.
  '*{caret-color:transparent!important}',
].join('');

/** Nombre de fichero de una ruta. `/` es `index`; el resto, la ruta sin la barra inicial. */
export const aSlug = (r) => (r === '/' ? 'index' : r.replace(/^\//, '').replace(/\//g, '_'));

/**
 * Deja la página quieta, revelada y reproducible. Devuelve `{ valida:false }` si la
 * medición no vale — nunca degrada a un informe parcial.
 */
export async function asentar(pag) {
  // 1 · LA SONDA. Antes de mirar nada.
  //
  // ⚠️ MEDIDO 27-08-2026, Y HAY QUE SABERLO: `document.hasFocus()` NO PUEDE dar false bajo
  // Playwright. Playwright activa la emulación de foco a propósito, para que los tests no
  // salgan flaky, y la página se reporta enfocada incluso lanzando el navegador en headless
  // (probado en los dos modos: foco true, hidden false, 26 y 50 fotogramas). O sea que esa
  // condición NO se puede romper aquí y no vale como prueba de nada.
  //
  // Lo que sí mide de verdad es el CONTADOR DE FOTOGRAMAS: si rAF estuviera frenado, bajaría.
  // Y el detector real del fallo que esto pretende evitar —revelados que no se disparan— es
  // el paso 6 de más abajo, que cuenta los [data-w-id] que se quedan invisibles. Ese sí se
  // probó en rojo: con un barrido rápido de un viewport por rAF salen 143 invisibles en 22
  // rutas. La sonda se queda porque en otro entorno (o si Playwright cambia) sí avisaría,
  // pero el que protege esta fase es el 6.
  const sonda = await pag.evaluate(async () => {
    let n = 0; const t = performance.now();
    await new Promise((r) => (function f() {
      n++; performance.now() - t < 400 ? requestAnimationFrame(f) : r();
    }()));
    return { foco: document.hasFocus(), oculto: document.hidden, fotogramas: n };
  });
  if (!sonda.foco || sonda.oculto || sonda.fotogramas < 8) return { sonda, valida: false };

  // 2 · dos barridos a medio viewport CON REPOSO. Uno rápido deja reveals a medias:
  //     medido en la home, 2 de 25 se quedaban en opacity:0 y con esto pasan a 0.
  for (let pase = 0; pase < 2; pase++) {
    await pag.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
        scrollTo(0, y); await new Promise((r) => setTimeout(r, 100));
      }
      scrollTo(0, document.body.scrollHeight);
    });
    await pag.waitForTimeout(700);
  }

  // 3 · fuentes y el último growIn (1000 ms)
  await pag.evaluate(() => document.fonts.ready);
  await pag.waitForTimeout(1300);

  // 4 · arriba, para que a-12 devuelva el nav que a-11 escondió al bajar
  await pag.evaluate(() => scrollTo(0, 0));
  await pag.waitForTimeout(900);

  /**
   * 4b · ESPERAR A QUE NADA SE MUEVA, en vez de esperar un número de milisegundos.
   *
   * Los 900 ms de arriba se eligieron porque el nav tarda 500. Pero al volver arriba vuelven a
   * entrar en pantalla los elementos de la primera pantalla, y sus revelados duran **1000 ms**:
   * la captura los pillaba a media transición. Como la opacidad a medias NO es 0, la
   * comprobación de invisibles del paso 6 los daba por buenos.
   *
   * Síntoma medido en `/country/…-broward-county-fl` a 479: la MISMA página contra el MISMO
   * baseline daba 98,67 % en una corrida y 99,65 % en la siguiente, con la diferencia siempre
   * en la misma banda (la sección de imágenes de la primera pantalla). Un umbral no distingue
   * eso de una regresión de verdad, y eso es justo lo que hace inútil una puerta.
   *
   * No se puede preguntar «¿ha acabado la animación?» sin saber qué motor la mueve —IX2 usa
   * estilos en línea y rAF, no transiciones CSS, así que `document.getAnimations()` no la ve—.
   * Así que se pregunta lo único que vale para cualquier motor: **¿ha cambiado algo entre dos
   * muestras?** Se muestrea opacidad y transform de todo lo animable y se repite hasta que dos
   * lecturas seguidas salen iguales.
   */
  const HUELLA = () => [...document.querySelectorAll('[data-w-id], [style*="opacity"], [style*="transform"]')]
    .map((e) => { const c = getComputedStyle(e); return `${c.opacity}|${c.transform}`; }).join(';');
  let previa = await pag.evaluate(HUELLA);
  let quieto = false;
  for (let i = 0; i < 12 && !quieto; i++) {          // techo de 3 s: si no para, que lo diga el paso 6
    await pag.waitForTimeout(250);
    const ahora = await pag.evaluate(HUELLA);
    quieto = ahora === previa;
    previa = ahora;
  }

  // 5a · EL CARRUSEL DE PASOS DEL PROCESO — la sexta fuente de no determinismo.
  //
  // Las 14 fichas de `/services` traen código propio del sitio que autoavanza los pasos cada
  // 5 s (`AUTOPLAY_DELAY`) y esconde los inactivos con `display:none`. Como `innerText` no ve
  // lo oculto, baseline y puerta leían PASOS DISTINTOS y `check:texto` salía en rojo con
  // «faltan 2 líneas, sobran 2» en 9 páginas. No era un defecto del sitio nuevo: el script es
  // el mismo en los dos lados; era la captura, que no lo paraba.
  //
  // Se para con SU PROPIO mecanismo, no con uno inventado: el sitio ya detiene el autoplay en
  // el `mouseenter` de `.process-section`. Antes se pulsa el primer paso para fijar cuál es
  // -pulsar reinicia el temporizador, por eso el `mouseenter` va DESPUÉS y no antes-.
  /**
   * ⚠️ EL CLIC SE DESCARTABA EN SILENCIO, y era la causa REAL — arreglado el 1-sep-2026.
   *
   * Un solo clic NO basta. El script del sitio empieza asi:
   *
   *     function goToStep(index) {
   *       if (isAnimating) return;      // <- se traga el clic, sin avisar
   *       isAnimating = true;
   *
   * Si el autoplay (5 s) tiene una transicion en vuelo cuando llega este paso, `goToStep()`
   * DESCARTA el clic y devuelve. El `mouseenter` de despues congela entonces el paso donde
   * estuviera el autoplay, no el primero. No es aleatorio: depende de en que fase del ciclo de
   * 5 s pilla la pagina, o sea de lo que haya tardado en cargar y asentarse — por eso aparece
   * y desaparece segun la carga de la maquina.
   *
   * LO QUE PROVOCABA, medido, y son tres sintomas del mismo fallo:
   *   · `check:texto` ROJO con «faltan 2 lineas, sobran 2» en 3 fichas de `/services`, que es
   *     exactamente el sintoma que este bloque decia haber arreglado. La MISMA puerta sobre el
   *     MISMO build dio 115/0 en una corrida y 112/3 en la siguiente;
   *   · `.process-section` midiendo 754 px o 1106 px en la misma ruta segun la pasada, o sea
   *     352 px reales de diferencia en el alto de la pagina;
   *   · 8 de las 14 de `/services` en rojo en `check:visual` por diferencia de ALTO contra unas
   *     referencias que habian congelado el otro paso.
   *
   * EL ARREGLO NO REESCRIBE `asentar()`: pregunta si el clic surtio efecto y reintenta. El
   * estado es observable porque el propio script lo pinta — el circulo del paso activo recibe
   * `background = '#0D1C3F'` en linea, o sea `rgb(13, 28, 63)` computado.
   *
   * Se reintenta cada 450 ms, muy por debajo de los 5 000 del autoplay, asi que el bucle gana
   * siempre que la pagina responda. Si tras 10 intentos no lo fija, LO DICE: un paso que no se
   * pudo fijar es una captura que no vale, y callarlo seria repetir el fallo que estamos
   * cerrando.
   */
  if (await pag.$('.process-section')) {
    const primeroActivo = () => pag.evaluate(() => {
      const d = document.querySelector('.process-step-item');
      const c = d?.querySelector('[class*="tab-circle"], [class*="Tab-Circle"]');
      return !!c && getComputedStyle(c).backgroundColor === 'rgb(13, 28, 63)';
    });
    let fijado = await primeroActivo();
    for (let i = 0; i < 10 && !fijado; i++) {
      await pag.evaluate(() => document.querySelector('.process-step-item')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await pag.waitForTimeout(450);
      fijado = await primeroActivo();
    }
    if (!fijado) {
      console.log('  ⚠️  el carrusel de pasos NO se pudo fijar en el primero tras 10 intentos'
        + ' — esta captura no es comparable');
    }
    await pag.waitForTimeout(900);   // 300 de salida + 420 de entrada, con margen
    await pag.evaluate(() => document.querySelector('.process-section')
      ?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })));
    await pag.waitForTimeout(200);
  }

  // 5 · congelar lo que se mueve solo
  await pag.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; });
    // LOS SLIDERS TAMBIEN SE MUEVEN SOLOS. El del blog tiene autoplay cada 3 s, y el baseline
    // lo capturaba SIEMPRE a translate3d(-625px) -dos diapositivas avanzadas-. Salia
    // reproducible por la casualidad de que el tiempo de asentado es constante, pero es
    // reproducible, no ESTABLE: comparar «por que diapositiva iba» no es comparar el diseño.
    // Se devuelven todos a la primera, en las dos formas de moverlos: transform (Finsweet) y
    // scrollLeft (la reimplementacion propia).
    // 5b · EL SLIDER DE GALERÍA DE `/services` — la SÉPTIMA fuente de no determinismo.
    //
    // Resetear estilos NO le vale: lo mueve Swiper, y Swiper escribe `transform` en LÍNEA
    // cuando acaba su transición. Un `setProperty(..., 'important')` no protege de eso —
    // `el.style.transform = '...'` reemplaza la propiedad Y su prioridad—, así que el reset se
    // hacía y la animación en vuelo lo deshacía medio segundo después.
    // Medido a 479 en `/services/pool-remodeling-renovation-…`: el vivo se quedaba en
    // `matrix(1,0,0,1,-1724,0)` -varias diapositivas avanzadas- y el sitio nuevo en `none`,
    // o sea 2179 px de diferencia en una banda y `check:visual` al 98,55 %.
    //
    // Se para con SU PROPIA API, como el resto de este fichero: el sitio ya expone la
    // instancia en `el.swiper`. En el sitio nuevo no hay Swiper, así que esto no hace nada
    // ahí y la comparación sigue siendo de lo mismo contra lo mismo.
    for (const w of document.querySelectorAll('.swiper-initialized, [fs-slider-element="list-wrapper"]')) {
      const sw = w.swiper;
      if (!sw) continue;
      sw.autoplay?.stop();
      sw.setTransition?.(0);
      sw.slideTo?.(0, 0, false);
    }
    for (const l of document.querySelectorAll('[fs-slider-element="list"]')) {
      // PRIMERO se para el autoplay, y se para con SU PROPIO mecanismo: la configuracion del
      // sitio dice `disableOnInteraction: true`, o sea que un pointerdown lo detiene. Sin
      // esto, resetear no sirve de nada -el temporizador lo vuelve a mover 3 s despues y la
      // captura lo pilla a media transicion: medido, `scrollLeft=71` en vez de 0-.
      l.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      l.style.setProperty('transform', 'none', 'important');
      l.style.setProperty('transition', 'none', 'important');
      l.style.setProperty('scroll-behavior', 'auto', 'important');
      l.scrollLeft = 0;
    }
  });
  await pag.addStyleTag({ content: CONGELAR_CSS });
  await pag.waitForTimeout(400);

  // 6 · LA COMPROBACIÓN OBLIGATORIA: nada revelable puede quedar invisible.
  //     Solo cuentan los que OCUPAN sitio: un [data-w-id] dentro de un dropdown cerrado
  //     está en display:none a propósito y su opacity no dice nada de nada.
  const invisibles = await pag.evaluate(() => [...document.querySelectorAll('[data-w-id]')]
    .filter((e) => {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      return parseFloat(s.opacity) === 0;
    })
    .map((e) => ({ id: e.dataset.wId, clase: String(e.className).slice(0, 60) })));

  return { sonda, valida: true, invisibles };
}

/** El PNG a pantalla completa, con las máscaras puestas. */
export const disparar = (pag) => pag.screenshot({
  fullPage: true, animations: 'disabled', timeout: 120000,
  mask: MASCARAS.map(([sel]) => pag.locator(sel)), maskColor: '#ff00ff',
});

/** El texto normalizado: espacios colapsados, un nodo por línea, sin líneas vacías. */
export const textoNormalizado = (pag) => pag.evaluate(() => document.body.innerText
  .replace(/ /g, ' ').split('\n')
  .map((s) => s.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n'));

/** PNG -> el JPEG que se versiona. Una sola definición para los dos lados de la comparación. */
export async function aJpeg(sharp, png) {
  const meta = await sharp(png, { limitInputPixels: false }).metadata();
  const buffer = await sharp(png, { limitInputPixels: false })
    .resize({ width: Math.max(1, Math.round(meta.width * ESCALA)), fit: 'inside', kernel: 'lanczos3' })
    .jpeg({ quality: CALIDAD, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  return { meta, buffer };
}

/**
 * Normaliza el HTML capturado ANTES de compararlo consigo mismo.
 *
 * El render del sitio es reproducible al 100,000 % de los píxeles, pero el DOM serializado
 * NO lo es: hay cuatro cosas que cambian en cada carga sin que cambie nada de lo que se ve.
 * Las cuatro están medidas comparando dos capturas de /about con la misma receta (mismo
 * número de bytes, 137 106, y 8 trozos distintos). Se declaran UNA A UNA con su motivo: un
 * «ignora el HTML» global convertiría el check de determinismo en un check que no comprueba.
 *
 * Nada de esto es contenido. Si algún día cambia el texto, el marcado o un atributo de
 * datos, el hash lo sigue cazando.
 */
export function normalizarHtml(html) {
  return html
    // 1 · El WebFont Loader de Google añade una clase por variante cargada
    //     (wf-montserrat-n1-active, wf-inter-n5-active…) al <html>. El CONJUNTO es siempre
    //     el mismo; el ORDEN depende de qué fichero de fuente gane la carrera de descarga.
    //     Se ordenan los tokens de la clase del <html>; en CSS el orden nunca importa.
    .replace(/(<html\b[^>]*\bclass=")([^"]*)(")/i,
      (_, a, cls, c) => a + cls.trim().split(/\s+/).sort().join(' ') + c)
    // 2 · Finsweet cachebustea su propio script con la hora en milisegundos.
    .replace(/(fs-components\.js\?v=)\d+/g, '$1<TS>')
    // 3 · Y genera un id aleatorio para el clon con el que mide el marquee.
    .replace(/(fs-marquee-templatecloneref=")measure-\d+-[a-z0-9]+/gi, '$1measure-<ID>')
    // 4 · El marquee lo mueve JS escribiendo transform en línea cada fotograma. El
    //     congelado le gana por !important —por eso los píxeles salen idénticos— pero el
    //     valor sigue estando en el atributo style y llega al outerHTML. Solo se normaliza
    //     DENTRO de una etiqueta de marquee: un transform residual en cualquier otro sitio
    //     sí es una señal y no se puede tapar.
    .replace(/<[^>]*\bfs-marquee-element="list"[^>]*>/g,
      (tag) => tag.replace(/translate3d\(-?[\d.]+px,/g, 'translate3d(<X>px,'))
    // 5 · GTM inyecta A VECES un script de health-check de Google Analytics
    //     (`gtag/js?id=…&gtg_health=1`) y a veces no. Medido en 5 pases seguidos de /about:
    //     dos estados estables, 137 080 y 136 951 bytes, y la única diferencia entre ellos
    //     eran esas dos etiquetas. Es un <script async> sin nada que pintar. Se quita SOLO
    //     ese: el gtag normal y el resto de GTM se quedan y se siguen comparando.
    .replace(/<script[^>]*gtg_health=1[^>]*>\s*<\/script>/g, '');
}
