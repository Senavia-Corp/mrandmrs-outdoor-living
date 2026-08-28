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

  // 5 · congelar lo que se mueve solo
  await pag.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; });
    // LOS SLIDERS TAMBIEN SE MUEVEN SOLOS. El del blog tiene autoplay cada 3 s, y el baseline
    // lo capturaba SIEMPRE a translate3d(-625px) -dos diapositivas avanzadas-. Salia
    // reproducible por la casualidad de que el tiempo de asentado es constante, pero es
    // reproducible, no ESTABLE: comparar «por que diapositiva iba» no es comparar el diseño.
    // Se devuelven todos a la primera, en las dos formas de moverlos: transform (Finsweet) y
    // scrollLeft (la reimplementacion propia).
    for (const l of document.querySelectorAll('[fs-slider-element="list"]')) {
      l.style.setProperty('transform', 'none', 'important');
      l.style.setProperty('transition', 'none', 'important');
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
