#!/usr/bin/env node
/**
 * PUERTA de los carruseles `fs-slider-*` — el motor compartido de `Componentes.astro` §3.
 *
 *     npm run check:carrusel
 *     node scripts/check-carrusel.mjs /country      (filtro por subcadena de ruta, como check:texto)
 *
 * Nace de la auditoria del carrusel de blog (`CarruselBlog.astro`) al pasar de HTML horneado a
 * componente compartido en las 64 fichas de area de servicio (2 Estado + 9 Condado + 53 Ciudad).
 * El motor es GENERICO -engancha por `[fs-slider-instance]`, sin importar cual- asi que esta
 * puerta no mide solo el blog: mide el mecanismo, y de paso cubre `fs-slider-resenas`,
 * `fs-slider-projects` y `fs-slider-gallery`, que viven en las mismas paginas.
 *
 * 5 RUTAS FIJAS, NO 64. La regla dura del repo es no barrer las 115 (ni siquiera las 64 de
 * area de servicio) en una puerta que corre en cada `npm run check`: portada (el carrusel ya
 * existia ahi) + una de cada nivel nuevo -Estado, Condado, Ciudad- + `/industry-solutions`.
 * Estado es la unica con TRES instancias del motor en la misma pagina (`-projects`, `-resenas`,
 * `-blog`) mas las pestañas propias de `ServiciosPorCategoria`, asi que es donde un cruce de
 * instancias se veria primero. `/industry-solutions` se sumo el 3-sep-2026: es la UNICA ruta
 * de las 115 con la instancia `fs-slider-sliderindustries` (la 5a de las 5 `fs-slider-*` que
 * existen en el repo) y se habia quedado huerfana del gate -un defecto reportado ahi no lo
 * hubiera detectado ninguna corrida de `npm run check`-.
 *
 * LO QUE MIDE, y por que estos 8 numeros y no otros (medido en /country/…-marion-…, 3-sep-2026):
 *   1. la tarjeta entrante queda a <=2px del borde util tras un clic en «next»
 *   2. el paso del clic es el PASO REAL (medido entre 2 tarjetas, no adivinado) +-2px
 *   3. `prev` nace con `aria-disabled="true"` (NO existe el atributo `disabled` nativo: el
 *      motor marca los extremos por ARIA, `.mm-resenas__flecha[aria-disabled="true"]` y
 *      equivalentes ponen `pointer-events:none` por CSS) y `next` lo gana al final
 *   4. Home/End tras foco en la lista mueven la LISTA, no la pagina — regresion conocida:
 *      Chromium trata Home/End como atajo de documento salvo que el propio JS los intercepte;
 *      MEDIDO sin el arreglo: `End` dejaba `scrollLeft` en 0 y saltaba `scrollY` de 2347 a 6656
 *   5. un swipe tactil que supera la MITAD del paso real compromete el cambio de tarjeta
 *      (`scroll-snap-type:x mandatory`: por debajo de la mitad el snap devuelve al origen A
 *      PROPOSITO, eso no es un fallo — por eso el swipe se pide al 70% del paso, no a un valor
 *      fijo en px que en un carrusel de 1 tarjeta por vista siempre cae corto)
 *   6. no hay «dots»: la paginacion es una barra de scroll continua. Se comprueba lo
 *      equivalente — que el pulgar se pueda ARRASTRAR (regresion conocida: era solo visual,
 *      `refresca()` lo pintaba pero nada escuchaba el arrastre) y que tras soltar quede
 *      alineado a una tarjeta, no a medias
 *   7. `prefers-reduced-motion:reduce` dejaba el clic con una animacion de ~400ms en vuelo
 *      pese a la preferencia -la regla CSS perdia SIEMPRE contra el `scrollBehavior='smooth'`
 *      en linea que pone el script; sin `!important` un estilo en linea no lo gana nada mas
 *      que otro estilo en linea-. Se comprueba que el computed-style gana Y que el clic no dea
 *      trabajo pendiente
 *   8. cero long tasks >50ms durante un recorrido completo de "next" (jank de layout)
 *   9. el pulgar de la barra esta pegado al inicio en `scrollLeft 0` y al final en `max` — el
 *      suelo del 10 % de su anchura lo desincronizaba del recorrido y en la portada acababa
 *      647,4 px FUERA de la barra (21-sep-2026)
 *  10. sin nada que desplazar NO queda autoplay encendido; se pausa en hover Y en foco de
 *      teclado (WCAG 2.2.2, que es la mitigacion declarada del autoplay de 3000 ms); y
 *      `prefers-reduced-motion: reduce` no enciende ninguno. Seccion D, una sola ruta.
 *
 * ORACULO INDEPENDIENTE: no importa nada de `Componentes.astro`. Mide geometria y ARIA en un
 * navegador real, con touch de verdad via CDP -un mouse.move no dispara el pan nativo, asi que
 * el doble-scroll tactil sale en verde si se prueba con raton-.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

/** Mismos flags que `scripts/lib/captura.mjs`: sin ellos Chromium frena rAF/temporizadores
 *  de una pestaña que no esta en primer plano y el smooth-scroll no llega nunca a settle. */
const ARGS_NAVEGADOR = ['--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

/**
 * El filtro casa por subcadena, como `check:texto`. Y con `=` delante, EXACTO — la misma
 * convencion que `check:visual`, por el mismo motivo: `/` es subcadena de las cinco rutas, asi
 * que pedir la portada sin coincidencia exacta las corre todas creyendo que corres una.
 * Comillas obligatorias, que zsh se come `=/` suelto:  node scripts/check-carrusel.mjs '=/'
 */
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (r) => !filtro.length
  || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));

const RUTAS = [
  '/',
  '/where-we-serve/north-florida',
  '/country/custom-pool-builders-marion-county-fl',
  '/pool-builders/gainesville-florida',
  '/industry-solutions',
].filter(casa);
if (!RUTAS.length) { console.error(`\nROJO ninguna de las 5 rutas fijas casa el filtro "${filtro.join(' ')}"\n`); process.exit(1); }

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; return ok; };

const PUERTO = 4743;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const cand = [path.join(ESTATICO, url), path.join(ESTATICO, url + '.html'), path.join(ESTATICO, url, 'index.html')];
  const f = cand.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(PUERTO, r));

// Identidad: hay gemelos en esta maquina (otros proyectos de la misma familia) y un puerto
// libre no garantiza que sea ESTE sitio el que responde.
const portada = await fetch(`http://localhost:${PUERTO}/`).then((r) => r.text());
if (!portada.includes('mrandmrsoutdoorliving') && !portada.includes('Mr & Mrs')) {
  console.error(`\nROJO el servidor de :${PUERTO} no parece servir Mr & Mrs Outdoor Living\n`);
  servidor.close(); process.exit(1);
}

async function pollUntilStable(getter, { interval = 60, minReads = 3, maxWait = 3000 } = {}) {
  // 3 lecturas iguales seguidas, no 2: con solo 2, un smooth-scroll que todavia no ha
  // arrancado (el primer ~70ms de la curva ease-out no mueve nada visible, MEDIDO) se
  // confunde con "ya llego". Ver REPORTE.md, tabla de hallazgos, fila del propio harness.
  let vals = [await getter()];
  const t0 = Date.now();
  while (Date.now() - t0 < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    vals.push(await getter());
    if (vals.length >= minReads && vals.slice(-minReads).every((v) => v === vals[vals.length - 1])) {
      return { value: vals[vals.length - 1], settled: true };
    }
  }
  return { value: vals[vals.length - 1], settled: false };
}

async function resetInstant(page, sel) {
  await page.evaluate((s) => {
    const t = document.querySelector(s).querySelector('[fs-slider-element="list"]');
    const prevBehavior = t.style.scrollBehavior;
    t.style.scrollBehavior = 'auto';
    t.scrollLeft = 0;
    void t.offsetHeight;
    t.style.scrollBehavior = prevBehavior;
  }, sel);
  await page.waitForTimeout(80);
}

const navegador = await chromium.launch({ headless: true, args: ARGS_NAVEGADOR });
let cobertura = 0;

for (const ruta of RUTAS) {
  console.log(`\n── ${ruta}`);

  // ════════════════════════════════════════════════════════════════════════
  // A · 1280x800 desktop — pasos, aria-disabled, teclado, arrastre de la barra
  // ════════════════════════════════════════════════════════════════════════
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    const instancias = await page.evaluate(() =>
      [...document.querySelectorAll('[fs-slider-instance]')].map((i) => i.getAttribute('fs-slider-instance')));
    check(`al menos un carrusel fs-slider en la pagina`, instancias.length > 0, `${instancias.length}: ${instancias.join(', ')}`);

    for (const nombre of instancias) {
      const sel = `[fs-slider-instance="${nombre}"]`;
      cobertura++;
      await page.evaluate((s) => document.querySelector(s)?.querySelector('[fs-slider-element="list"]')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), sel); // para el autoplay si lo hay
      await resetInstant(page, sel);

      const base = await page.evaluate((s) => {
        const inst = document.querySelector(s);
        const track = inst.querySelector('[fs-slider-element="list"]');
        const cards = [...track.children];
        const prev = inst.querySelector('[fs-slider-element="previous"]');
        const next = inst.querySelector('[fs-slider-element="next"]');
        const drag = inst.querySelector('[fs-slider-element="scrollbar-drag"]');
        const barra = inst.querySelector('[fs-slider-element="scrollbar"]');
        return {
          cards: cards.length,
          pitch: cards.length > 1 ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left : (cards[0]?.getBoundingClientRect().width ?? 0),
          maxScroll: track.scrollWidth - track.clientWidth,
          prevAriaDisabled: prev?.getAttribute('aria-disabled'),
          nextAriaDisabled: next?.getAttribute('aria-disabled'),
          hasDrag: !!drag, hasBarra: !!barra,
          dragWidthPct: drag ? parseFloat(drag.style.width) : null,
        };
      }, sel);

      console.log(` · ${nombre} (${base.cards} tarjetas, paso ${base.pitch.toFixed(1)}px)`);
      check(`  ${nombre}: prev nace aria-disabled`, base.prevAriaDisabled === 'true', `valor: ${base.prevAriaDisabled}`);

      // 1+2: un clic en next, tarjeta alineada y paso correcto
      const before = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel);
      await page.click(`${sel} [fs-slider-element="next"]`);
      const s1 = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel));
      const misalign = await page.evaluate((s) => {
        const t = document.querySelector(s).querySelector('[fs-slider-element="list"]');
        const tl = t.getBoundingClientRect().left;
        return Math.min(...[...t.children].map((e) => Math.abs(e.getBoundingClientRect().left - tl)));
      }, sel);
      check(`  ${nombre}: settle tras «next»`, s1.settled, s1.settled ? '' : 'nunca se estabilizo en 3s');
      check(`  ${nombre}: tarjeta entrante <=2px del borde`, misalign <= 2, `${misalign.toFixed(1)}px`);
      const delta = s1.value - before;
      check(`  ${nombre}: paso del clic = paso real +-2px`, Math.abs(delta - base.pitch) <= 2, `delta ${delta.toFixed(1)}px vs paso ${base.pitch.toFixed(1)}px`);

      // 3: next se deshabilita al final
      let ultimo = s1.value;
      for (let i = 0; i < base.cards + 2; i++) {
        const disabled = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="next"]').getAttribute('aria-disabled'), sel);
        if (disabled === 'true') break;
        await page.click(`${sel} [fs-slider-element="next"]`);
        const s2 = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel));
        ultimo = s2.value;
      }
      const nextAlFinal = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="next"]').getAttribute('aria-disabled'), sel);
      check(`  ${nombre}: next aria-disabled al llegar al final`, nextAlFinal === 'true', `scrollLeft ${ultimo}/${base.maxScroll}`);

      // 4: Home/End mueven la LISTA, no la pagina
      await resetInstant(page, sel);
      await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').focus(), sel);
      await page.keyboard.press('End');
      const kEnd = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel));
      const pageYtrasEnd = await page.evaluate(() => scrollY);
      check(`  ${nombre}: End con foco en la lista llega al final DE LA LISTA`, Math.abs(kEnd.value - base.maxScroll) <= 3,
        `scrollLeft ${kEnd.value} vs max ${base.maxScroll} (scrollY de pagina: ${pageYtrasEnd})`);
      await page.keyboard.press('Home');
      const kHome = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel));
      check(`  ${nombre}: Home vuelve a 0`, kHome.value <= 3, `scrollLeft ${kHome.value}`);

      /**
       * 6b · LA BARRA DICE DONDE ESTAS — los dos extremos, que son los unicos puntos que se
       * pueden exigir sin adivinar. Los intermedios NO valen de oraculo: `scroll-snap-type:x
       * mandatory` reencarrila una escritura de `scrollLeft` al punto de snap mas cercano, asi
       * que pedir el 50 % devuelve el snap de al lado y el numero sale «mal» estando bien.
       *
       * El fallo que cierra: el ancho del pulgar tiene un suelo del 10 % y el desplazamiento
       * se calculaba con la fraccion SIN clampar. MEDIDO en la portada a 1280,
       * `fs-slider-projects` (6,59 % visible, por debajo del suelo): al final del carrusel el
       * pulgar quedaba 647,4 px FUERA de su barra, y a mitad de recorrido marcaba 0,788 donde
       * tocaba 0,5. Las instancias por encima del 10 % salian exactas, o sea que el defecto
       * solo aparece en los carruseles largos — justo los que mas necesitan la barra.
       */
      if (base.hasDrag && base.hasBarra && base.maxScroll > 0) {
        await resetInstant(page, sel);
        const extremos = await page.evaluate((s) => {
          const inst = document.querySelector(s);
          const l = inst.querySelector('[fs-slider-element="list"]');
          const b = inst.querySelector('[fs-slider-element="scrollbar"]');
          const d = inst.querySelector('[fs-slider-element="scrollbar-drag"]');
          const previo = l.style.scrollBehavior;
          l.style.scrollBehavior = 'auto';
          const max = l.scrollWidth - l.clientWidth;
          const mide = () => { const rb = b.getBoundingClientRect(), rd = d.getBoundingClientRect(); return { izq: rd.left - rb.left, der: rd.right - rb.right }; };
          l.scrollLeft = 0; l.dispatchEvent(new Event('scroll'));
          const inicio = mide();
          l.scrollLeft = max; l.dispatchEvent(new Event('scroll'));
          const fin = mide();
          l.scrollLeft = 0; l.dispatchEvent(new Event('scroll'));
          l.style.scrollBehavior = previo;
          return { inicio, fin, visiblePct: (l.clientWidth / l.scrollWidth) * 100 };
        }, sel);
        check(`  ${nombre}: en scrollLeft 0 el pulgar esta pegado al inicio de la barra`,
          Math.abs(extremos.inicio.izq) <= 2, `${extremos.inicio.izq.toFixed(1)}px`);
        check(`  ${nombre}: en el final el pulgar esta pegado al final de la barra`,
          Math.abs(extremos.fin.der) <= 2,
          `${extremos.fin.der.toFixed(1)}px fuera (pulgar al ${extremos.visiblePct.toFixed(2)}% visible)`);
      }

      // 6 (adaptado, desktop): el pulgar de la barra se puede arrastrar y queda alineado
      if (base.hasDrag && base.hasBarra) {
        await resetInstant(page, sel);
        await page.locator(`${sel} [fs-slider-element="scrollbar"]`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        const dr = await page.evaluate((s) => {
          const r = document.querySelector(s).querySelector('[fs-slider-element="scrollbar"]').getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }, sel);
        const thumbCenterX = dr.x + (dr.w * (base.dragWidthPct ?? 20) / 100) / 2;
        const y = dr.y + dr.h / 2;
        await page.mouse.move(thumbCenterX, y);
        await page.mouse.down();
        await page.mouse.move(dr.x + dr.w * 0.7, y, { steps: 15 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        const dragSettle = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel));
        check(`  ${nombre}: la barra de scroll se puede arrastrar`, dragSettle.value > 5, `scrollLeft tras arrastrar: ${dragSettle.value}`);
        const restoAlSoltar = base.pitch > 0 ? dragSettle.value % base.pitch : 0;
        const distAlSnap = Math.min(restoAlSoltar, base.pitch - restoAlSoltar);
        check(`  ${nombre}: al soltar la barra, queda alineado a una tarjeta`, distAlSnap <= 2, `${distAlSnap.toFixed(1)}px del snap mas cercano`);
      } else {
        console.log(`       (sin barra de scroll que arrastrar — se omite)`);
      }

      await resetInstant(page, sel);
    }

    // 8: cero long tasks >50ms durante un recorrido completo de la PRIMERA instancia
    if (instancias.length) {
      const sel = `[fs-slider-instance="${instancias[0]}"]`;
      await resetInstant(page, sel);
      const tareas = await page.evaluate(async (s) => {
        const largas = [];
        const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => largas.push(+e.duration.toFixed(1))));
        po.observe({ entryTypes: ['longtask'] });
        const t = document.querySelector(s).querySelector('[fs-slider-element="list"]');
        const max = t.scrollWidth - t.clientWidth;
        let x = 0;
        await new Promise((res) => {
          const id = setInterval(() => {
            x += 30; t.scrollLeft = x;
            if (x >= max) { clearInterval(id); setTimeout(res, 200); }
          }, 16);
        });
        po.disconnect();
        return largas;
      }, sel);
      const peor = Math.max(0, ...tareas);
      check(`  jank: 0 long tasks >50ms en un recorrido completo`, peor <= 50, `peor: ${peor}ms (${tareas.length} tareas largas)`);
      await resetInstant(page, sel);
    }

    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  // B · 390x844 tactil — swipe real via CDP, passthrough vertical, reduced-motion
  // ════════════════════════════════════════════════════════════════════════
  {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    const instancias = await page.evaluate(() =>
      [...document.querySelectorAll('[fs-slider-instance]')].map((i) => i.getAttribute('fs-slider-instance')));

    for (const nombre of instancias) {
      const sel = `[fs-slider-instance="${nombre}"]`;
      await page.evaluate((s) => document.querySelector(s)?.querySelector('[fs-slider-element="list"]')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), sel);
      await resetInstant(page, sel);

      const pitch = await page.evaluate((s) => {
        const cards = [...document.querySelector(s).querySelector('[fs-slider-element="list"]').children];
        return cards.length > 1 ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left : (cards[0]?.getBoundingClientRect().width ?? 0);
      }, sel);

      await page.locator(`${sel} [fs-slider-element="list"]`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const trackBox = await page.evaluate((s) => {
        const r = document.querySelector(s).querySelector('[fs-slider-element="list"]').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }, sel);

      // 5: swipe que SUPERA la mitad del paso real compromete el cambio (70% del paso; un
      // valor fijo en px falla en carruseles de 1 tarjeta/vista, ver cabecera del fichero).
      const SWIPE_PX = Math.max(20, Math.round(pitch * 0.7));
      const startX = trackBox.x + trackBox.w * 0.85, y = trackBox.y + trackBox.h / 2;
      const beforeSwipe = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
      for (let i = 1; i <= 20; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - (SWIPE_PX * i) / 20, y }] });
        await page.waitForTimeout(25);
      }
      await page.waitForTimeout(150); // dedo quieto antes de soltar: sin fling, mide el compromiso de snap, no el momentum
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const swipeSettle = await pollUntilStable(() => page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel), { maxWait: 2000 });
      const ratio = pitch > 0 ? (swipeSettle.value - beforeSwipe) / pitch : 0;
      check(`  ${nombre}: swipe >50% del paso compromete el cambio de tarjeta`, Math.abs(ratio - 1) <= 0.15,
        `movio ${(swipeSettle.value - beforeSwipe).toFixed(1)}px, ${(ratio * 100).toFixed(0)}% del paso (${pitch.toFixed(1)}px)`);

      /**
       * SIN resetInstant() AQUI — el reset era la causa del falso "no pasa", no un
       * atenuante de un artefacto de timing (esa era la teoria de la sesion anterior; medido
       * y descartada, ver abajo).
       *
       * MEDIDO (carrusel-out/_diag-vertical*.mjs, 3-sep-2026): en fs-slider-resenas -y SOLO
       * ahi, entre los 4 carruseles de esta puerta- un swipe vertical que sigue a
       * `resetInstant()` justo despues de un swipe HORIZONTAL por TOUCH deja el elemento
       * sordo al gesto siguiente: la pagina no se mueve un pixel, 8/8 corridas, INCLUSO con
       * hasta 1000ms de margen entre uno y otro. Eso ya descarta "es CDP encadenando gestos
       * muy seguidos": el margen no lo arregla, así que no era margen.
       *
       * Aislado ingrediente a ingrediente: ni el swipe horizontal solo, ni resetInstant() solo,
       * reproducen nada (los dos pasan limpio, movio >200px). Hace falta la PAREJA -swipe por
       * TOUCH seguido de `scrollLeft=0` + el reflow forzado de `void offsetHeight`- y solo en
       * resenas. Pero `resetInstant()` no existe en el sitio: ningun visitante real fuerza un
       * reflow sincrono entre dos gestos de touch. Quitandolo de aqui y dejando solo el swipe
       * horizontal real -que es lo que un visitante SI hace- el vertical pasa de forma
       * consistente, 6/6. O sea: el bug era de este arnes de pruebas, no del producto, y la
       * causa no era la que se penso la primera vez.
       *
       * Tampoco hacia falta el reset de scrollLeft para lo que este bloque mide: no comprueba
       * la posicion horizontal del carrusel, solo que un gesto vertical llegue a la pagina.
       */
      await page.locator(`${sel} [fs-slider-element="list"]`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(450);

      // vertical passthrough: la pagina tiene que poder scrollear con un gesto de deriva
      // horizontal pequeña sobre el carrusel — si el carrusel lo secuestra, es bug.
      const trackBox2 = await page.evaluate((s) => {
        const r = document.querySelector(s).querySelector('[fs-slider-element="list"]').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }, sel);
      const vx = trackBox2.x + trackBox2.w / 2, vy = trackBox2.y + trackBox2.h / 2;
      const pageYantes = await page.evaluate(() => scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vx, y: vy }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vx - (7 * i) / 10, y: vy - i * 15 }] });
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(300);
      const pageYdespues = await page.evaluate(() => scrollY);
      check(`  ${nombre}: un swipe vertical sobre el carrusel scrollea la PAGINA`, (pageYdespues - pageYantes) > 20,
        `scrollY se movio ${(pageYdespues - pageYantes).toFixed(0)}px`);

      await page.evaluate(() => scrollTo(0, 0));
      await resetInstant(page, sel);
    }

    await ctx.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  // C · reduced-motion, contexto aparte (Playwright fija `reducedMotion` por contexto)
  // ════════════════════════════════════════════════════════════════════════
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const instancias = await page.evaluate(() =>
      [...document.querySelectorAll('[fs-slider-instance]')].map((i) => i.getAttribute('fs-slider-instance')));

    for (const nombre of instancias) {
      const sel = `[fs-slider-instance="${nombre}"]`;
      const computado = await page.evaluate((s) => getComputedStyle(document.querySelector(s)
        .querySelector('[fs-slider-element="list"]')).scrollBehavior, sel);
      check(`  ${nombre}: reduced-motion gana el scroll-behavior en linea`, computado === 'auto', `computed: ${computado}`);

      await resetInstant(page, sel);
      const before = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel);
      await page.click(`${sel} [fs-slider-element="next"]`);
      await page.waitForTimeout(50);
      const inmediato = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel);
      await page.waitForTimeout(500);
      const despues = await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').scrollLeft, sel);
      check(`  ${nombre}: el clic llega a destino sin animacion pendiente`, inmediato === despues && despues !== before,
        `a 50ms: ${inmediato}, a 550ms: ${despues} (antes: ${before})`);
      await resetInstant(page, sel);
    }
    await ctx.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// D · EL AUTOPLAY: NI GIRA EN VACIO, NI SE SALTA LA PAUSA, NI IGNORA `reduced-motion`
//
// UNA SOLA RUTA -la primera de las que pasen el filtro- y no las 5. El autoplay es del
// MECANISMO, no de la instancia, y cada comprobacion de aqui cuesta una carga entera de
// pagina; repetirlo en 5 rutas mediria cinco veces el mismo codigo. La portada trae
// `fs-slider-blog`, que es la instancia con `autoplayMs: 3000`, asi que hay algo que medir.
//
// ORACULO SIN INTERNALS, como el resto de este fichero. No se busca un `setInterval` por su
// retardo (3000 ms es una decision de diseño que puede cambiar) ni por el nombre de la funcion
// que lo crea. Se cuenta cuantos TEMPORIZADORES VIVOS desaparecen cuando se toca el carrusel,
// porque eso es el contrato que el propio sitio declara -`disableOnInteraction: true` en la
// configuracion de Finsweet-: los que mueren al tocar son los autoplays. Sobre esa resta se
// arma todo lo demas, y por eso vale igual si mañana el motor se reescribe entero.
//
// LO QUE CIERRA. MEDIDO el 21-sep-2026 en `/services/custom-pool-spa-…` a 1440, con el
// carrusel del blog recortado a 3 tarjetas -el estado exacto de las 9 fichas que todavia no
// llegan a 5 articulos-:
//
//     max 0 · data-mm-sin-desplazar SI · flechas en display:none
//     temporizador de 3000 ms VIVO · 4 disparos en 12 s · scrollLeft 0 -> 0
//
// Cuatro despertares del hilo principal para mover cero pixeles, cada uno forzando un reflow
// (lee `scrollWidth`/`clientWidth`, escribe `scrollLeft`), y sin final posible: lo unico que
// apagaba el temporizador era la interaccion, y en ese estado las flechas estan OCULTAS.
// ══════════════════════════════════════════════════════════════════════════════════════════
{
  const ruta = RUTAS[0];
  console.log(`\n── ${ruta}  · autoplay`);

  /** Censo de temporizadores vivos. Se instala ANTES de que corra ningun script de la pagina. */
  const CENSO = () => {
    const vivos = new Set();
    const si = window.setInterval.bind(window);
    const ci = window.clearInterval.bind(window);
    window.__mmVivos = vivos;
    window.setInterval = function (...a) { const h = si(...a); vivos.add(h); return h; };
    window.clearInterval = function (h) { vivos.delete(h); return ci(h); };
  };
  const cuenta = (page) => page.evaluate(() => window.__mmVivos.size);
  /** Toca TODAS las listas: por el contrato del sitio, eso apaga todos los autoplays. */
  const tocaTodo = (page) => page.evaluate(() => {
    for (const l of document.querySelectorAll('[fs-slider-element="list"]')) {
      l.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }
  });
  const abre = async (extra = {}) => {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, ...extra });
    await ctx.addInitScript(CENSO);
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    return { ctx, page };
  };

  // d1 · cuantos autoplays tiene esta pagina cuando SI hay recorrido. Si sale 0, lo de abajo
  //      no comprueba nada y hay que decirlo en vez de pintarlo verde.
  let autoplaysConRecorrido = 0;
  {
    const { ctx, page } = await abre();
    const antes = await cuenta(page);
    await tocaTodo(page);
    await page.waitForTimeout(150);
    autoplaysConRecorrido = antes - (await cuenta(page));
    check(`  la pagina tiene autoplay que medir`, autoplaysConRecorrido >= 1,
      `${autoplaysConRecorrido} temporizador(es) se apagan al tocar los carruseles`);
    await ctx.close();
  }

  // d2 · SIN RECORRIDO, NINGUN AUTOPLAY ENCENDIDO.
  //      Se recortan las tarjetas hasta que el contenido cabe -que es lo que le pasa a una
  //      ficha con menos articulos de los que caben por vista- y se dispara `resize`, que es
  //      el flanco que reevalua la geometria. Luego se vuelve a preguntar lo mismo: si tocar
  //      no apaga NADA, es que no quedaba nada encendido.
  {
    const { ctx, page } = await abre();
    const geo = await page.evaluate(async () => {
      const esperar = () => new Promise((r) => setTimeout(r, 60));
      for (const l of document.querySelectorAll('[fs-slider-element="list"]')) {
        let guarda = 0;
        while (l.children.length > 1 && l.scrollWidth - l.clientWidth > 1 && guarda++ < 40) {
          l.lastElementChild.remove();
          dispatchEvent(new Event('resize'));
          await esperar();
        }
      }
      return [...document.querySelectorAll('[fs-slider-instance]')].map((i) => ({
        nombre: i.getAttribute('fs-slider-instance'),
        max: (() => { const l = i.querySelector('[fs-slider-element="list"]'); return l ? l.scrollWidth - l.clientWidth : null; })(),
        sinDesplazar: i.hasAttribute('data-mm-sin-desplazar'),
      }));
    });
    await page.waitForTimeout(300);
    const todosSinRecorrido = geo.every((g) => g.max === null || g.max <= 1);
    check(`  el recorte deja los ${geo.length} carruseles sin nada que desplazar`, todosSinRecorrido,
      geo.map((g) => `${g.nombre}:max=${g.max}${g.sinDesplazar ? '' : ' (SIN marcar)'}`).join(' · '));
    const antes = await cuenta(page);
    await tocaTodo(page);
    await page.waitForTimeout(150);
    const encendidos = antes - (await cuenta(page));
    check(`  sin nada que desplazar NO queda autoplay encendido`, encendidos === 0,
      `${encendidos} temporizador(es) seguian vivos girando en vacio`);
    await ctx.close();
  }

  // d3 · PAUSA EN HOVER Y EN FOCO — WCAG 2.2.2. Es la mitigacion declarada del autoplay de
  //      3000 ms, o sea que si se cae, se cae la justificacion entera. Se mide con la misma
  //      resta: pasar el raton (o tabular) tiene que apagar EXACTAMENTE los autoplays de esa
  //      instancia, y salir (o desenfocar) tiene que devolverlos.
  {
    const { ctx, page } = await abre();
    const instancias = await page.evaluate(() =>
      [...document.querySelectorAll('[fs-slider-instance]')].map((i) => i.getAttribute('fs-slider-instance')));
    for (const nombre of instancias) {
      const sel = `[fs-slider-instance="${nombre}"]`;
      await page.mouse.move(2, 2);
      await page.locator(`${sel} [fs-slider-element="list"]`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const v0 = await cuenta(page);

      const caja = await page.locator(`${sel} [fs-slider-element="list"]`).boundingBox();
      await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.waitForTimeout(200);
      const vHover = await cuenta(page);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(200);
      const vSalir = await cuenta(page);

      await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]').focus(), sel);
      await page.waitForTimeout(200);
      const vFoco = await cuenta(page);
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForTimeout(200);
      const vBlur = await cuenta(page);

      // cuantos autoplays son SUYOS: los que se apagan al tocar SOLO esta lista
      await page.evaluate((s) => document.querySelector(s).querySelector('[fs-slider-element="list"]')
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), sel);
      await page.waitForTimeout(150);
      const propios = vBlur - (await cuenta(page));

      check(`  ${nombre}: el hover pausa sus ${propios} autoplay(s)`, v0 - vHover === propios,
        `vivos ${v0} -> ${vHover}`);
      check(`  ${nombre}: al salir el raton vuelven`, vSalir === v0, `vivos ${vSalir} vs ${v0}`);
      check(`  ${nombre}: el foco de teclado pausa sus ${propios} autoplay(s)`, vSalir - vFoco === propios,
        `vivos ${vSalir} -> ${vFoco}`);
      check(`  ${nombre}: al perder el foco vuelven`, vBlur === vSalir, `vivos ${vBlur} vs ${vSalir}`);
    }
    await ctx.close();
  }

  // d4 · `prefers-reduced-motion: reduce` NO ENCIENDE NINGUNO. Un carrusel que se mueve solo
  //      es exactamente lo que esa preferencia pide evitar, y el §C de arriba solo comprueba
  //      el `scroll-behavior` del clic, que es otra cosa.
  {
    const { ctx, page } = await abre({ reducedMotion: 'reduce' });
    const antes = await cuenta(page);
    await tocaTodo(page);
    await page.waitForTimeout(150);
    const encendidos = antes - (await cuenta(page));
    check(`  con reduced-motion no se enciende ningun autoplay`, encendidos === 0,
      `${encendidos} encendido(s); sin la preferencia eran ${autoplaysConRecorrido}`);
    await ctx.close();
  }
}

await navegador.close();
servidor.close();

console.log(`\n${'─'.repeat(70)}`);
console.log(`cobertura: ${cobertura} instancias de carrusel medidas en ${RUTAS.length} rutas`);
if (fallos) {
  console.error(`\nROJO check:carrusel — ${fallos} fallo(s)\n`);
  process.exit(1);
}
console.log('\nOK  check:carrusel — mecanica, teclado, tactil y reduced-motion correctos\n');
