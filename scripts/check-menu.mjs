#!/usr/bin/env node
/**
 * PUERTA del menú y el pie — que TODOS sus enlaces lleven a algún sitio, y que en móvil se
 * puedan TOCAR de verdad.
 *
 *     npm run check:menu
 *
 * Existe porque `check:enlaces` sólo sabe si un `href` resuelve a un fichero, y eso deja pasar
 * el fallo que trajo este encargo: los enlaces del menú móvil existían, resolvían y estaban
 * en el HTML — y aun así el usuario no podía usarlos. Un enlace inalcanzable no es un enlace
 * roto para ninguna puerta estática, y es exactamente igual de inútil.
 *
 * Lo que se medía mal, medido bien (3-sep-2026, 390x844, tacto real):
 *   · el overlay perdía `top`, `left` y `z-index` por ESPECIFICIDAD contra `webflow.css` y
 *     computaba `width:0px` — un listón de cero píxeles pegado al borde derecho;
 *   · por eso el panel quedaba 85 px más alto que la ventana y sus 3 últimos enlaces caían
 *     fuera de pantalla, intocables;
 *   · y por eso tocar fuera no cerraba el menú y el toque llegaba a la página de detrás, que
 *     a 991 llegaba a NAVEGAR.
 *
 * ORÁCULO INDEPENDIENTE: esta puerta no comparte una línea con el CSS que arregla el fallo.
 * Mide geometría computada en un navegador real y toca con el dedo; si alguien deshace el
 * arreglo, o si `webflow.css` vuelve a ganar la cascada por cualquier otra vía, sale ROJA sin
 * saber nada de cómo estaba escrito el arreglo.
 *
 * Acota con un argumento si sólo quieres una ruta:  npm run check:menu -- /gallery
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 8) => { xs.slice(0, n).forEach((x) => console.log(`       ${x}`)); if (xs.length > n) console.log(`       ... y ${xs.length - n} mas`); };

/** El mínimo táctil. 44 CSS px es el suelo de WCAG 2.2 (2.5.8 Target Size, AA). */
const MINIMO_TACTIL = 44;

// ─── el cascarón, delimitado por sus etiquetas de apertura reales ───────────
const MARCA_MENU = '<section data-w-id="e3c56a53-53b3-cf11-d47d-21787c8c1068" class="menu">';
const MARCA_PIE = '<section class="footer">';

/** Recorta la sección que abre en `marca` equilibrando `<section>` / `</section>`. */
const seccion = (html, marca) => {
  const i = html.indexOf(marca);
  if (i < 0) return '';
  let n = 0, j = i;
  const re = /<\/?section\b[^>]*>/g;
  re.lastIndex = i;
  for (let m; (m = re.exec(html));) {
    n += m[0][1] === '/' ? -1 : 1;
    j = m.index + m[0].length;
    if (n === 0) break;
  }
  return html.slice(i, j);
};

const paginas = [];
(function barrer(d, base = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) barrer(path.join(d, e.name), `${base}/${e.name}`);
    else if (e.name === 'index.html') paginas.push([base || '/', path.join(d, e.name)]);
    else if (e.name.endsWith('.html')) paginas.push([`${base}/${e.name.replace(/\.html$/, '')}`, path.join(d, e.name)]);
  }
}(ESTATICO));

const REDIRECTS = new Map((JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'))
  .redirects || []).map((r) => [r.source, r]));

const existe = (rel) => {
  const limpio = decodeURIComponent(String(rel).split('?')[0].split('#')[0]);
  return [path.join(ESTATICO, limpio), path.join(ESTATICO, limpio + '.html'),
    path.join(ESTATICO, limpio, 'index.html')].some((c) => fs.existsSync(c));
};

// ════════════════════════════════════════════════════════════════════════════
// 1 · ESTÁTICA — ningún enlace del cascarón muere
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. enlaces del menu y del pie (estatico, sobre lo desplegado)');

const rotos = [], anclasVacias = [], conHtml = [];
let conMenu = 0, conPie = 0;
for (const [ruta, fichero] of paginas) {
  const html = fs.readFileSync(fichero, 'utf8');
  for (const [nombre, marca] of [['menu', MARCA_MENU], ['pie', MARCA_PIE]]) {
    const trozo = seccion(html, marca);
    if (!trozo) continue;
    if (nombre === 'menu') conMenu++; else conPie++;
    for (const m of trozo.matchAll(/href="([^"]*)"/g)) {
      const h = m[1];
      if (h === '#' || h.trim() === '') { anclasVacias.push(`${ruta} [${nombre}] href="${h}"`); continue; }
      if (!h.startsWith('/') || h.startsWith('//')) continue;
      if (/\.html($|[?#])/.test(h)) conHtml.push(`${ruta} [${nombre}] -> ${h}`);
      const limpio = decodeURIComponent(h.split('?')[0].split('#')[0]);
      if (!existe(h) && !REDIRECTS.has(limpio)) rotos.push(`${ruta} [${nombre}] -> ${h}`);
    }
  }
}
console.log(`     ${conMenu} paginas con menu, ${conPie} con pie, de ${paginas.length} del build`);
check('0 enlaces del cascaron sin destino (ni fichero ni 301)', rotos.length === 0, `${rotos.length}`);
lista(rotos);
check('0 anclas muertas (href="#") en el menu o el pie', anclasVacias.length === 0, `${anclasVacias.length}`);
lista(anclasVacias);
check('0 enlaces a .html en el cascaron', conHtml.length === 0, `${conHtml.length}`);
lista(conHtml);

// ════════════════════════════════════════════════════════════════════════════
// 2 · TÁCTIL — el menú móvil se puede usar con el dedo
// ════════════════════════════════════════════════════════════════════════════
const filtro = process.argv[2];
/** Una ruta por plantilla basta: el cascarón es compartido, y barrer las 115 cuesta una hora. */
const MUESTRA = (filtro ? [filtro] : [
  '/',
  '/services/custom-pool-spa-builders-in-north-south-florida',
  '/gallery',
  '/contact-us',
]);
const ANCHOS = [[390, 844], [991, 800]];

console.log(`\n── 2. menu movil con el dedo (${MUESTRA.length} rutas x ${ANCHOS.length} anchos)`);
console.log('     MUESTREO DECLARADO: el cascaron es identico en las 115 rutas (una sola');
console.log('     constante en Nav.astro), asi que se miden 4 plantillas, no las 115.');

const PUERTO = 4741;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const cand = [path.join(ESTATICO, url), path.join(ESTATICO, url + '.html'), path.join(ESTATICO, url, 'index.html')];
  const f = cand.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const { chromium } = await import('playwright');
await new Promise((r) => servidor.listen(PUERTO, r));

// Que sea ESTE sitio y no el del proyecto de al lado: hay gemelos en esta maquina.
const portada = await fetch(`http://localhost:${PUERTO}/`).then((r) => r.text());
if (!portada.includes('mrandmrsoutdoorliving')) {
  console.error('\nROJO el servidor de :' + PUERTO + ' no sirve Mr & Mrs\n');
  servidor.close(); process.exit(1);
}

const navegador = await chromium.launch();
const problemas = { fuera: [], pequenos: [], tapados: [], noNavega: [], noCierra: [], atraviesa: [], panel: [], encadenado: [] };
/** Cobertura: que se midio de verdad, para que un cero no se pueda confundir con «no mire». */
const medidosTotal = new Set();
const ocultosPorOrigen = new Set();

for (const [ancho, alto] of ANCHOS) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  for (const ruta of MUESTRA) {
    const pag = await ctx.newPage();
    await pag.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });

    const abre = async () => {
      // El nav se esconde solo al bajar (`.menu[data-oculto]`, translateY(-85px) + opacity 0),
      // y el navegador RESTAURA el scroll al recargar la misma URL: sin esto, el burger queda
      // literalmente fuera de la ventana y Playwright reintenta el toque hasta agotar el plazo.
      await pag.evaluate(() => window.scrollTo(0, 0));
      await pag.waitForFunction(() => {
        const m = document.querySelector('.menu');
        return m && !m.hasAttribute('data-oculto') && getComputedStyle(m).opacity === '1';
      }, null, { timeout: 10000 });
      await pag.tap('.w-nav-button');
      // Esperar a ESTADO, no a milisegundos: la transicion son 400ms pero el reloj miente.
      await pag.waitForFunction(() => {
        const p = document.querySelector('[data-nav-menu-open]');
        return p && getComputedStyle(p).transform === 'matrix(1, 0, 0, 1, 0, 0)';
      }, null, { timeout: 5000 });
    };
    await abre();

    // ── 2a · la caja del overlay y la del panel ────────────────────────────
    const caja = await pag.evaluate(() => {
      const ov = document.querySelector('.w-nav-overlay');
      const pa = document.querySelector('[data-nav-menu-open]');
      const c = getComputedStyle(ov);
      return { ov: ov.getBoundingClientRect().toJSON(), pa: pa.getBoundingClientRect().toJSON(), z: c.zIndex, vh: innerHeight, vw: innerWidth };
    });
    // El overlay tiene que cubrir el ancho: si mide menos, ha perdido la cascada otra vez.
    if (caja.ov.width < caja.vw - 1) {
      problemas.panel.push(`${ruta} @${ancho} overlay ancho=${Math.round(caja.ov.width)} de ${caja.vw} (perdio la cascada)`);
    }
    // Y el panel no puede salirse por abajo: ahi es donde se perdian los ultimos enlaces.
    if (caja.pa.bottom > caja.vh + 1) {
      problemas.panel.push(`${ruta} @${ancho} el panel se sale ${Math.round(caja.pa.bottom - caja.vh)}px por debajo del pliegue`);
    }

    // ── 2b/2c · UN DESPLEGABLE CADA VEZ, y medir lo que se ve ──────────────
    // Abrir uno cierra los demas (`cierraTodos` en Interacciones.astro): tocando los cuatro
    // seguidos solo queda abierto el ultimo, y los enlaces de los otros tres se miden con
    // rect 0x0 — o sea que la puerta los daria por buenos sin haberlos mirado nunca. Esa es
    // justo la forma de fallo que estas puertas existen para no tener.
    const toggles = await pag.$$('.w-nav-overlay .w-dropdown-toggle');
    const vistos = new Set();
    for (const grupo of [-1, ...toggles.map((_, k) => k)]) {
      if (grupo >= 0) {
        if (!(await toggles[grupo].isVisible())) { ocultosPorOrigen.add(`${ruta} @${ancho} desplegable #${grupo}`); continue; }
        await toggles[grupo].tap();
        // Si NO abre, esto es un fallo que hay que REPORTAR, no una excepcion que tumbe la
        // puerta: reventar aqui deja sin correr las otras siete comprobaciones y quien lea la
        // salida no sabe si el resto estaba bien. Lo descubrio la prueba de falsificacion.
        try {
          await pag.waitForFunction((k) => {
            const t = document.querySelectorAll('.w-nav-overlay .w-dropdown-toggle')[k];
            return t?.closest('.w-dropdown')?.querySelector('.w-dropdown-list')?.classList.contains('w--open');
          }, grupo, { timeout: 5000 });
        } catch {
          problemas.encadenado.push(`${ruta} @${ancho} el desplegable #${grupo} no llego a abrir`);
          continue;
        }
      }

      const medidos = await pag.evaluate(async (MIN) => {
        const pa = document.querySelector('[data-nav-menu-open]');
        // El panel tiene scroll propio, y `scrollIntoView` NO deja el rect bueno en el mismo
        // tick: leerlo de inmediato da coordenadas viejas. Costo tres medidas equivocadas.
        const quieto = async () => {
          let prev = -1;
          for (let i = 0; i < 40 && prev !== pa.scrollTop; i++) {
            prev = pa.scrollTop;
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          }
        };
        const salida = [];
        for (const a of pa.querySelectorAll('a[href]')) {
          let r = a.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;          // oculto en este turno
          const href = a.getAttribute('href');
          a.scrollIntoView({ block: 'center' });
          await quieto();
          r = a.getBoundingClientRect();
          let alcance;
          const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
          if (r.bottom > innerHeight || r.top < 0) alcance = 'FUERA';
          else {
            const el = document.elementFromPoint(cx, cy);
            alcance = !el ? 'NADA' : (el === a || a.contains(el)) ? 'OK'
              : `TAPADO:${el.tagName}.${String(el.className).slice(0, 40)}`;
          }
          // EL AREA TACTIL NO ES LA CAJA. Un `::after` fuera de la caja agranda lo que
          // responde al dedo sin cambiar `getBoundingClientRect`, y al reves: un ancestro
          // puede recortarlo. Asi que se PREGUNTA AL NAVEGADOR quien hay en los bordes de la
          // zona de 44 px centrada en el control, que es lo que el dedo va a encontrar.
          const suyo = (px, py) => {
            if (px < 0 || py < 0 || px > innerWidth || py > innerHeight) return false;
            const e = document.elementFromPoint(px, py);
            return !!e && (e === a || a.contains(e));
          };
          const d = MIN / 2 - 1;
          const altoOk = r.height >= MIN || (suyo(cx, cy - d) && suyo(cx, cy + d));
          const anchoOk = r.width >= MIN || (suyo(cx - d, cy) && suyo(cx + d, cy));
          const chico = alcance === 'OK' && !(altoOk && anchoOk);
          salida.push({ href, w: Math.round(r.width), h: Math.round(r.height), chico, alcance });
        }
        return salida;
      }, MINIMO_TACTIL);

      for (const e of medidos) {
        const clave = `${ancho}|${e.href}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        medidosTotal.add(clave);
        if (e.chico) problemas.pequenos.push(`${ruta} @${ancho} ${e.href} = ${e.w}x${e.h}`);
        if (e.href.startsWith('http') || e.href.startsWith('tel:')) continue;
        if (e.alcance === 'FUERA') problemas.fuera.push(`${ruta} @${ancho} ${e.href}`);
        else if (e.alcance !== 'OK') problemas.tapados.push(`${ruta} @${ancho} ${e.href} <- ${e.alcance}`);
      }
    }

    // ── 2d · tocar fuera cierra, y no atraviesa a la pagina de detras ──────
    const libre = Math.max(4, Math.round((caja.vw - caja.pa.width) / 2));
    const detras = await pag.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName}.${String(el.className).slice(0, 30)}` : 'NADA';
    }, { x: libre, y: Math.round(caja.vh / 2) });
    if (!/w-nav-overlay/.test(detras)) {
      problemas.atraviesa.push(`${ruta} @${ancho} tocar en (${libre},${Math.round(caja.vh / 2)}) alcanza ${detras}`);
    }
    await pag.touchscreen.tap(libre, Math.round(caja.vh / 2));
    const sigueAbierto = await pag.evaluate(() => !!document.querySelector('.w-nav-overlay[data-abierto]'));
    if (sigueAbierto) problemas.noCierra.push(`${ruta} @${ancho}`);

    // ── 2e · navega de verdad. La muestra es el ULTIMO enlace de servicios: es el que estaba
    // fuera de pantalla e intocable, o sea el peor caso conocido y el que el arreglo recupera.
    await pag.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await abre();
    // Abrir SU desplegable, no los cuatro: el ultimo en abrirse cierra a los demas.
    const iServicios = await pag.evaluate(() => [...document.querySelectorAll('.w-nav-overlay .w-dropdown')]
      .findIndex((d) => d.querySelector('a[href^="/services/"]')));
    if (iServicios >= 0) {
      const t = (await pag.$$('.w-nav-overlay .w-dropdown-toggle'))[iServicios];
      await t.tap();
      await pag.waitForFunction((k) => document.querySelectorAll('.w-nav-overlay .w-dropdown')[k]
        ?.querySelector('.w-dropdown-list')?.classList.contains('w--open'), iServicios, { timeout: 5000 });
    }
    const destino = await pag.evaluate(async () => {
      const pa = document.querySelector('[data-nav-menu-open]');
      const a = [...pa.querySelectorAll('a[href^="/services/"]')].pop();
      if (!a) return null;
      a.scrollIntoView({ block: 'center' });
      let prev = -1;
      for (let i = 0; i < 40 && prev !== pa.scrollTop; i++) {
        prev = pa.scrollTop;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const r = a.getBoundingClientRect();
      if (r.width === 0 || r.bottom > innerHeight || r.top < 0) return { href: a.getAttribute('href'), x: -1, y: -1 };
      return { href: a.getAttribute('href'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
    if (destino && destino.x < 0) {
      problemas.noNavega.push(`${ruta} @${ancho} ${destino.href} no se pudo ni situar en pantalla`);
      destino.saltar = true;
    }
    if (destino && !destino.saltar) {
      await pag.touchscreen.tap(destino.x, destino.y);
      // `waitForLoadState('load')` NO sirve aqui: si la pagina ya estaba cargada vuelve al
      // instante y se lee la URL vieja. Daba 18 falsos rojos seguidos. Hay que esperar A LA
      // URL, que es la condicion que de verdad importa.
      try {
        await pag.waitForURL((u) => new URL(u).pathname === destino.href, { timeout: 8000 });
      } catch {
        problemas.noNavega.push(`${ruta} @${ancho} toque en ${destino.href} -> quedo en ${new URL(pag.url()).pathname}`);
      }
    }
    await pag.close();

    // ── 2f · abrir un desplegable con otro ya abierto ──────────────────────
    // El fallo que trajo este encargo: con «Services» abierto, tocar «About Us» no abria nada.
    // El `focusout` cerraba el primero en el `touchstart`, su lista es `display:flex` EN FLUJO
    // en movil, la pagina pegaba un salto de cientos de pixeles y el `click` caia en el vacio.
    const pag2 = await ctx.newPage();
    await pag2.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    await pag2.evaluate(() => window.scrollTo(0, 0));
    await pag2.waitForFunction(() => {
      const m = document.querySelector('.menu');
      return m && !m.hasAttribute('data-oculto') && getComputedStyle(m).opacity === '1';
    }, null, { timeout: 10000 });
    await pag2.tap('.w-nav-button');
    try {
      await pag2.waitForFunction(() => {
        const p = document.querySelector('[data-nav-menu-open]');
        return p && getComputedStyle(p).transform === 'matrix(1, 0, 0, 1, 0, 0)';
      }, null, { timeout: 5000 });
    } catch { problemas.encadenado.push(`${ruta} @${ancho} el menu movil no llego a abrir`); }
    const tt = await pag2.$$('.w-nav-overlay .w-dropdown-toggle');
    for (let k = 0; k < tt.length; k++) {
      if (!(await tt[k].isVisible())) continue;
      await tt[k].tap().catch(() => {});
      const abierto = await pag2.evaluate((j) => document.querySelectorAll('.w-nav-overlay .w-dropdown')[j]
        ?.querySelector('.w-dropdown-list')?.classList.contains('w--open'), k);
      if (!abierto) problemas.encadenado.push(`${ruta} @${ancho} el desplegable #${k} no abre con otro abierto`);
    }
    await pag2.close();
  }
  await ctx.close();
}
await navegador.close();
servidor.close();

// COBERTURA PRIMERO: un cero de fallos solo vale si antes se dice cuantos se midieron.
console.log(`     medidos ${medidosTotal.size} pares enlace x ancho, desplegable a desplegable`);
if (ocultosPorOrigen.size) {
  console.log(`     ${ocultosPorOrigen.size} desplegables NO se pudieron abrir (ocultos por el origen):`);
  lista([...ocultosPorOrigen], 4);
}
check('el overlay cubre la ventana y el panel cabe en pantalla', problemas.panel.length === 0, `${problemas.panel.length}`);
lista(problemas.panel);
check('0 enlaces del menu inalcanzables', problemas.fuera.length === 0, `${problemas.fuera.length}`);
lista(problemas.fuera);
check('0 enlaces del menu tapados por otro elemento', problemas.tapados.length === 0, `${problemas.tapados.length}`);
lista(problemas.tapados);
check(`0 enlaces por debajo de ${MINIMO_TACTIL}x${MINIMO_TACTIL} (WCAG 2.2 AA 2.5.8)`, problemas.pequenos.length === 0, `${problemas.pequenos.length}`);
lista(problemas.pequenos, 12);
check('tocar fuera cierra el menu', problemas.noCierra.length === 0, `${problemas.noCierra.length}`);
lista(problemas.noCierra);
check('el toque NO atraviesa a la pagina de detras', problemas.atraviesa.length === 0, `${problemas.atraviesa.length}`);
lista(problemas.atraviesa);
check('el ultimo enlace de servicios navega al tocarlo', problemas.noNavega.length === 0, `${problemas.noNavega.length}`);
lista(problemas.noNavega);
check('cada desplegable abre aunque haya otro abierto', problemas.encadenado.length === 0, `${problemas.encadenado.length}`);
lista(problemas.encadenado);

console.log(fallos ? `\nPUERTA ROJA — ${fallos} fallos\n` : '\nPUERTA VERDE\n');
process.exit(fallos ? 1 : 0);
