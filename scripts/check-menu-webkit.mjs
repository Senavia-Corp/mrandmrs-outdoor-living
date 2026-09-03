#!/usr/bin/env node
/**
 * PUERTA opcional (no está en `npm run check` — ver el porqué más abajo) — el mismo menú móvil
 * que mide `check-menu.mjs`, pero con el motor WebKit de Playwright en vez de Chromium.
 *
 *     node scripts/check-menu-webkit.mjs                 # local (build) + vivo, motor webkit
 *     node scripts/check-menu-webkit.mjs --solo-vivo      # solo la URL en producción
 *     node scripts/check-menu-webkit.mjs --chromium       # mismo diagnóstico, motor chromium (control)
 *
 * CUÁNDO CORRERLA: cualquier cambio a la lógica de foco/toque/viewport de
 * `src/components/Interacciones.astro`, o a `src/styles/webflow.css`. No es parte del `check`
 * por defecto — requiere `npx playwright install webkit` (un binario que las 9 sesiones
 * concurrentes de este repo no tienen instalado por defecto) y `check:visual` ya cuesta ~65 min
 * por sí solo; sumar un segundo motor al camino que corre todo el mundo antes de cada push tiene
 * un coste real para un caso que, una vez arreglado, es mucho menos probable que vuelva a romperse
 * que cualquier cambio normal de nav. Mismo patrón que `check:cascaron` (`MM_FIXTURES=1`, también
 * fuera del `check` por defecto).
 *
 * Por qué existe: `check-menu.mjs` daba VERDE (motor Chromium) mientras el usuario reportaba,
 * DESPUÉS del arreglo de `01a186b`, que el menú/desplegables seguían sin funcionar en su iPhone
 * real. Confirmado con este script (antes del arreglo actual: ROJO en `webkit`, VERDE en
 * `chromium`, mismos escenarios): en WebKit, `FocusEvent.relatedTarget` llega `null` en el
 * `focusout` al tocar un enlace DENTRO de un desplegable ya abierto — no solo al saltar a otro
 * desplegable distinto, que era todo lo que medía `01a186b`. Instrumentado con un script aparte
 * (no versionado) que confirmó la secuencia exacta en el iPhone/WebKit real:
 * `pointerdown` en el enlace -> `focusout` con `relatedTarget=null` -> el desplegable se cierra
 * -> el `click` sintetico llega tarde y aterriza en `.divider-navs-links`, no en el enlace.
 * El arreglo (`Interacciones.astro`, junto al bucle de desplegables) usa `pointerdown` como
 * respaldo — llega SIEMPRE antes que el cambio de foco, orden que garantiza la spec de UI Events,
 * no una carrera de tiempos.
 *
 * Cubre lo que `check-menu.mjs` NO cubre en ningún motor:
 *   B. un enlace PLANO del nav (no un desplegable) tocado con otro desplegable abierto — la
 *      reproducción literal del reporte original ("con Services abierto, tocar Contact Us no
 *      hacía nada"); `check-menu.mjs:352` solo itera `.w-dropdown-toggle`.
 *   D. `visualViewport.height` vs `innerHeight` y el borde inferior real del overlay.
 *   E. tocar la hamburguesa a mitad de la transición de "nav oculto -> visible" por scroll.
 * Y porta A/C (ya cubiertos en Chromium) al motor nuevo, para saber si WebKit los rompe también.
 *
 * CAVEAT que hay que decirle al usuario si esto da VERDE: el WebKit que empaqueta Playwright en
 * macOS es un WebKit de escritorio con viewport EMULADO (`isMobile`/`hasTouch`), sin una barra de
 * direcciones real que se colapse. Puede confirmar o no la hipótesis 1 (relatedTarget, un
 * comportamiento del motor/DOM que sí comparte con Safari real) pero NO puede confirmar del todo
 * ni descartar la hipótesis 2 (barra dinámica) — para esa, el iPhone real del usuario sigue siendo
 * la única prueba que cierra el caso.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { webkit, chromium } from 'playwright';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PUERTO = 4742;
const VIVA = 'https://mrandmrs-outdoor-living.vercel.app';

const SOLO_VIVO = process.argv.includes('--solo-vivo');
const NOMBRE_MOTOR = process.argv.includes('--chromium') ? 'chromium' : 'webkit';
const MOTOR = NOMBRE_MOTOR === 'chromium' ? chromium : webkit;

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };

let servidor = null;
if (!SOLO_VIVO) {
  if (!fs.existsSync(ESTATICO)) { console.error('\nfalta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }
  servidor = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const cand = [path.join(ESTATICO, url), path.join(ESTATICO, url + '.html'), path.join(ESTATICO, url, 'index.html')];
    const f = cand.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!f) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => servidor.listen(PUERTO, r));
}

const OBJETIVOS = [
  ...(SOLO_VIVO ? [] : [{ nombre: 'local', base: `http://localhost:${PUERTO}` }]),
  { nombre: 'vivo', base: VIVA },
];

console.log(`\nmotor: ${NOMBRE_MOTOR}`);
const navegador = await MOTOR.launch();

/** Igual que el `abre()` de check-menu.mjs: espera a ESTADO, no a milisegundos. */
const abre = async (pag) => {
  await pag.evaluate(() => window.scrollTo(0, 0));
  await pag.waitForFunction(() => {
    const m = document.querySelector('.menu');
    return m && !m.hasAttribute('data-oculto') && getComputedStyle(m).opacity === '1';
  }, null, { timeout: 10000 });
  await pag.tap('.w-nav-button');
  await pag.waitForFunction(() => {
    const p = document.querySelector('[data-nav-menu-open]');
    return p && getComputedStyle(p).transform === 'matrix(1, 0, 0, 1, 0, 0)';
  }, null, { timeout: 5000 });
};

for (const { nombre, base } of OBJETIVOS) {
  console.log(`\n=== ${nombre} (${base}) ===`);
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  // ── A. desplegable abierto + tocar OTRO desplegable (ya cubierto en Chromium) ──────────────
  {
    const pag = await ctx.newPage();
    await pag.goto(`${base}/`, { waitUntil: 'load' });
    await abre(pag).catch((e) => check(`[${nombre}] A: el menu movil abre`, false, String(e).slice(0, 100)));
    // Filtrar a VISIBLES: "Commercial" lleva la clase `hide` a proposito (oculto por diseño),
    // igual que ya filtra check-menu.mjs:204 — tocarlo por indice sin filtrar no es un fallo
    // del sitio, es un fallo del script.
    const todosToggles = await pag.$$('.w-nav-overlay .w-dropdown-toggle');
    const visibles = [];
    for (const t of todosToggles) { if (await t.isVisible()) visibles.push(t); }
    if (visibles[0] && visibles[1]) {
      await visibles[0].tap();
      await pag.waitForFunction((el) => el.closest('.w-dropdown')?.querySelector('.w-dropdown-list')?.classList.contains('w--open'), visibles[0], { timeout: 5000 }).catch(() => {});
      await visibles[1].tap();
      const abrioElSegundo = await visibles[1].evaluate((el) => el.closest('.w-dropdown')?.querySelector('.w-dropdown-list')?.classList.contains('w--open')).catch(() => false);
      check(`[${nombre}] A: el segundo desplegable abre con el primero ya abierto`, !!abrioElSegundo);
    } else {
      check(`[${nombre}] A: hay al menos dos desplegables visibles para probar`, false, `visibles: ${visibles.length} de ${todosToggles.length}`);
    }
    await pag.close();
  }

  // ── B. desplegable abierto + tocar un ENLACE PLANO del nav — el reporte original literal ──
  {
    const pag = await ctx.newPage();
    await pag.goto(`${base}/`, { waitUntil: 'load' });
    await abre(pag).catch(() => {});
    const primerToggle = await pag.$('.w-nav-overlay .w-dropdown-toggle');
    if (primerToggle) {
      await primerToggle.tap();
      await pag.waitForFunction(() => document.querySelector('.w-nav-overlay .w-dropdown-list.w--open'), null, { timeout: 5000 }).catch(() => {});
    }
    const contacto = await pag.$('.w-nav-overlay a.nav-link[href="/contact-us"]');
    if (contacto && await contacto.isVisible()) {
      await contacto.tap();
      try {
        await pag.waitForURL((u) => new URL(u).pathname === '/contact-us', { timeout: 8000 });
        check(`[${nombre}] B: "Contact Us" (enlace plano) navega con un desplegable abierto`, true);
      } catch {
        check(`[${nombre}] B: "Contact Us" (enlace plano) navega con un desplegable abierto`, false, `quedo en ${new URL(pag.url()).pathname}`);
      }
    } else {
      check(`[${nombre}] B: "Contact Us" visible para tocar`, false, 'no encontrado o tapado');
    }
    await pag.close();
  }

  // ── C. enlace DENTRO del desplegable ya abierto navega de verdad ───────────────────────────
  {
    const pag = await ctx.newPage();
    await pag.goto(`${base}/`, { waitUntil: 'load' });
    await abre(pag).catch(() => {});
    const iServicios = await pag.evaluate(() => [...document.querySelectorAll('.w-nav-overlay .w-dropdown')]
      .findIndex((d) => d.querySelector('a[href^="/services/"]')));
    if (iServicios >= 0) {
      const t = (await pag.$$('.w-nav-overlay .w-dropdown-toggle'))[iServicios];
      await t.tap();
      await pag.waitForFunction((k) => document.querySelectorAll('.w-nav-overlay .w-dropdown')[k]
        ?.querySelector('.w-dropdown-list')?.classList.contains('w--open'), iServicios, { timeout: 5000 }).catch(() => {});
    }
    const destino = await pag.evaluate(async () => {
      const pa = document.querySelector('[data-nav-menu-open]');
      const a = [...pa.querySelectorAll('a[href^="/services/"]')].pop();
      if (!a) return null;
      a.scrollIntoView({ block: 'center' });
      let prev = -1;
      for (let i = 0; i < 40 && prev !== pa.scrollTop; i++) { prev = pa.scrollTop; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }
      const r = a.getBoundingClientRect();
      if (r.width === 0 || r.bottom > innerHeight || r.top < 0) return { href: a.getAttribute('href'), x: -1, y: -1 };
      return { href: a.getAttribute('href'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    if (destino && destino.x >= 0) {
      await pag.touchscreen.tap(destino.x, destino.y);
      try {
        await pag.waitForURL((u) => new URL(u).pathname === destino.href, { timeout: 8000 });
        check(`[${nombre}] C: ultimo enlace de Services navega al tocarlo`, true);
      } catch {
        check(`[${nombre}] C: ultimo enlace de Services navega al tocarlo`, false, `quedo en ${new URL(pag.url()).pathname}`);
      }
    } else {
      check(`[${nombre}] C: enlace de Services alcanzable para tocar`, false, destino ? 'fuera de pantalla' : 'no encontrado');
    }
    await pag.close();
  }

  // ── D. visualViewport vs innerHeight, borde inferior real del overlay ──────────────────────
  {
    const pag = await ctx.newPage();
    await pag.goto(`${base}/`, { waitUntil: 'load' });
    await abre(pag).catch(() => {});
    const medida = await pag.evaluate(() => {
      const ov = document.querySelector('.w-nav-overlay');
      const r = ov.getBoundingClientRect();
      return { vv: window.visualViewport?.height ?? null, ih: window.innerHeight, bottom: r.bottom, top: r.top };
    });
    const objetivo = medida.vv ?? medida.ih;
    check(`[${nombre}] D: el overlay llega hasta el fondo visible`, Math.abs(medida.bottom - objetivo) < 2,
      `overlay.bottom=${Math.round(medida.bottom)} objetivo=${Math.round(objetivo)} (vv=${medida.vv} ih=${medida.ih})`);
    await pag.close();
  }

  // ── E. tocar la hamburguesa A MITAD de la transicion "nav oculto -> visible" ───────────────
  {
    const pag = await ctx.newPage();
    await pag.goto(`${base}/`, { waitUntil: 'load' });
    await pag.evaluate(() => window.scrollTo(0, 300));
    await pag.waitForFunction(() => document.querySelector('.menu')?.hasAttribute('data-oculto'), null, { timeout: 5000 }).catch(() => {});
    await pag.evaluate(() => window.scrollTo(0, 0));
    // SIN esperar a que la transicion de 500ms del nav termine — tocar ya, a proposito.
    await pag.tap('.w-nav-button').catch(() => {});
    await pag.waitForTimeout(600);
    const caja = await pag.evaluate(() => {
      const ov = document.querySelector('.w-nav-overlay');
      const r = ov.getBoundingClientRect();
      return { width: r.width, vw: innerWidth, abierto: ov.hasAttribute('data-abierto') };
    });
    if (caja.abierto) {
      check(`[${nombre}] E: overlay a ancho completo si se abre a mitad de la transicion del nav`, caja.width >= caja.vw - 1,
        `overlay.width=${Math.round(caja.width)} de ${caja.vw}`);
    } else {
      console.log(`       [${nombre}] E: el menu no llego a abrirse en esta ejecucion — no concluyente, repetir`);
    }
    await pag.close();
  }

  await ctx.close();
}
await navegador.close();
if (servidor) servidor.close();

console.log(fallos ? `\nROJO — ${fallos} fallos (motor ${NOMBRE_MOTOR})\n` : `\nVERDE (motor ${NOMBRE_MOTOR})\n`);
process.exit(fallos ? 1 : 0);
