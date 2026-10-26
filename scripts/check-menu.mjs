#!/usr/bin/env node
/**
 * PUERTA del menú — REESCRITA para el cascarón propio (REDISEÑO STITCH, ASTRO-1, 12-oct-2026).
 *
 *     npm run check:menu                 una ruta por plantilla
 *     npm run check:menu -- /gallery     solo las que casen
 *
 * La puerta anterior medía la geometría del overlay de Webflow (`.w-nav-overlay`), que ya no
 * existe: `Nav.astro` es componente propio, con <details> en escritorio y <dialog> en móvil.
 * Mide lo mismo que importaba entonces —que el menú se pueda USAR— con el menú nuevo:
 *
 *   1 · ENLAZADO: los 31 enlaces internos del menú están en el HTML SERVIDO (sin ejecutar JS),
 *       con su texto y su ruta, y cada ruta resuelve a un fichero del build.
 *   2 · TECLADO, escritorio: Enter abre «Services», el tabulador entra en el panel, Esc lo
 *       cierra y el foco VUELVE al botón. Un solo desplegable abierto a la vez.
 *   3 · TECLADO, móvil: el botón abre el <dialog> modal, el foco queda dentro, Esc lo cierra y
 *       el foco vuelve al botón. Los 31 enlaces se pueden tocar (≥ 44 px, dentro de la ventana
 *       tras desplazar su panel).
 *   4 · FOCO A LA VISTA: al tabular por el contenido, el elemento enfocado no queda debajo de
 *       la fila fija de la cabecera ni de la barra inferior móvil.
 *   5 · Las fotos del panel de Services no se piden hasta abrirlo.
 *
 * ORÁCULO INDEPENDIENTE: la lista de 31 está escrita AQUÍ, no se lee de `menu.json`. Si alguien
 * quita un enlace del dato, la puerta lo ve. Headless: no secuestra la pantalla.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };

/** Los 31 enlaces internos del menú: [ruta, texto]. El texto es el del HTML, no el pintado. */
const ENLACES = [
  ['/services/pool-builders', 'New Pool Construction'], ['/services/pool-remodeling', 'Pool Remodeling'],
  ['/services/pergola-builders', 'Aluminum Pergolas'], ['/services/louvered-roofs', 'Louvered Roof Systems'],
  ['/services/pool-screen-enclosures', 'Pool Screen Enclosures'], ['/services/outdoor-kitchens', 'Outdoor Kitchens'],
  ['/services/retractable-screens', 'Retractable Screens'], ['/services/patio-screen-rooms', 'Patio Screen Rooms'],
  ['/services/deck-builders', 'Custom Decks'], ['/services/landscaping', 'Landscaping'],
  ['/services/irrigation-systems', 'Automated Irrigation'],
  ['/services/steel-buildings-pole-barns', 'Pole Barn & Steel Buildings'], ['/services/outdoor-furniture', 'Outdoor Furniture'],
  ['/commercial-services/commercial-pool-construction-north-south-florida', 'Commercial Pool Construction'],
  ['/commercial-services/commercial-pool-renovations-north-south-florida', 'Commercial Pool Renovations'],
  ['/commercial-services/commercial-pool-contractors-north-south-florida', 'Commercial Pool Contractors'],
  ['/about', 'About Us'], ['/where-we-serve', 'Where We Serve'], ['/industry-solutions', 'Industry Solutions'],
  ['/testimonials', 'Customer Reviews'], ['/gallery', 'Project Gallery'], ['/brochures', 'brochures'],
  ['/videos', 'project Videos'], ['/pool-cost-estimator', 'Pool estimator online'], ['/blogs-tips', 'Blog & Tips'],
  ['/financing', 'financing'], ['/contact-us', 'Contact Us'], ['/request-estimated', 'Get a Free Estimate'],
  ['/', 'Home'], ['/', 'Mr & Mrs Outdoor Living — home'],
];
const PLANTILLAS = ['/', '/services/pool-builders', '/services/pool-builders/alachua-fl',
  '/blogs/how-much-does-a-custom-pool-cost-in-florida', '/project/estate-pool-spa-sun-shelf-north-florida',
  '/gallery', '/where-we-serve', '/contact-us', '/request-estimated', '/financing', '/thank-you', '/about'];
const filtro = process.argv[2];
const rutas = PLANTILLAS.filter((r) => !filtro || r.includes(filtro));
const fichero = (ruta) => path.join(ESTATICO, ruta, 'index.html');
const texto = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

console.log(`check:menu — ${rutas.length} plantilla(s)\n`);

// ── 1 · ENLAZADO en el HTML servido ────────────────────────────────────────────────────────
console.log('── 1. los 31 enlaces, en el HTML servido');
for (const ruta of rutas) {
  const html = fs.readFileSync(fichero(ruta), 'utf8');
  const ini = html.indexOf('<header class="mm-cab"');
  const fin = html.indexOf('</dialog>', ini);
  if (ini < 0 || fin < 0) { check(`${ruta}: trae la cabecera y el menu`, false, 'no encuentro <header class="mm-cab"> … </dialog>'); continue; }
  const zona = html.slice(ini, fin);
  const hay = [...zona.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => {
    const href = m[1].match(/href="([^"]*)"/)?.[1] ?? '';
    const nombre = m[1].match(/aria-label="([^"]*)"/)?.[1]?.replace(/&amp;/g, '&');
    return [href, nombre ?? texto(m[2])];
  });
  const faltan = ENLACES.filter(([r, t]) => !hay.some(([h, x]) => h === r && (x === t || x.startsWith(t + ' ') || x.startsWith(t))));
  check(`${ruta}: 31 de 31 con su texto y su ruta`, faltan.length === 0, faltan.map(([r, t]) => `${t} -> ${r}`).join(' · '));
}
// Una ruta resuelve si hay fichero en el build o si la sirve una redireccion de `config.json`
// (las tres de `/commercial-services/` son redirecciones declaradas, como en el menu anterior).
const CONFIG = JSON.parse(fs.readFileSync(path.join(RAIZ, '.vercel/output/config.json'), 'utf8'));
const redirige = (r) => (CONFIG.routes ?? []).some((x) => x.src && x.status >= 300 && x.status < 400 && new RegExp(x.src).test(r));
const rotos = [...new Set(ENLACES.map(([r]) => r))].filter((r) => !fs.existsSync(fichero(r)) && !redirige(r));
check('las rutas del menu resuelven (fichero o redireccion declarada)', rotos.length === 0, rotos.join(' '));

// ── Navegador, headless, sirviendo el build por intercepcion ───────────────────────────────
// `MM_MOTOR=webkit` (npm run check:menu:webkit): el mismo guion en el motor de Safari. Pide
// `npx playwright install webkit`; si no esta, la puerta lo dice y sale roja, no se salta.
const MOTOR = process.env.MM_MOTOR === 'webkit' ? webkit : chromium;
// Safari no lleva el foco a los enlaces con Tab (es su ajuste de fabrica): se recorren con
// Opcion+Tab. No es un fallo del menu; se mide con la tecla que usa de verdad ese navegador.
const TAB = MOTOR === webkit ? 'Alt+Tab' : 'Tab';
let nav;
try { nav = await MOTOR.launch(); } catch (e) { console.error(`\nROJO no puedo lanzar ${process.env.MM_MOTOR ?? 'chromium'}: ${String(e.message).split('\n')[0]}\n`); process.exit(1); }
const abre = async (ancho, ruta) => {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 800 }, hasTouch: ancho < 992 });
  const p = await ctx.newPage();
  const red = [];
  await p.route('**/*', (x) => {
    const u = new URL(x.request().url());
    if (u.hostname !== 'mm.test') return x.abort();
    let f = path.join(ESTATICO, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) return x.fulfill({ status: 404, body: '' });
    red.push(u.pathname);
    return x.fulfill({ path: f });
  });
  await p.goto('http://mm.test' + ruta, { waitUntil: 'load' });
  return { p, red, cierra: () => ctx.close() };
};
const activo = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]}|${(a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30)}` : ''; });

for (const ruta of rutas) {
  // ── 2 · teclado, escritorio ──────────────────────────────────────────────────────────────
  console.log(`\n── 2. teclado a 1440 · ${ruta}`);
  {
    const { p, red, cierra } = await abre(1440, ruta);
    const antes = red.filter((r) => r.includes('-menu.')).length;
    check('las fotos del panel no se piden al cargar', antes === 0, `${antes} peticion(es)`);
    await p.focus('.mm-cab-grupo > summary');
    await p.keyboard.press('Enter');
    const abierto = await p.evaluate(() => document.querySelector('.mm-cab-grupo').open);
    check('Enter abre «Services»', abierto);
    const caja = await p.evaluate(() => { const r = document.querySelector('.mm-cab-panel--servicios').getBoundingClientRect(); return { w: r.width, dentro: r.left >= 0 && r.right <= innerWidth && r.height > 100 }; });
    check('el panel se pinta dentro de la ventana', caja.dentro, JSON.stringify(caja));
    await p.keyboard.press(TAB);
    const primero = await activo(p);
    check('el tabulador entra en el panel', primero.startsWith('a.mm-cab-fila-s|New Pool Construction'), primero);
    await p.keyboard.press(TAB);
    const ficha = await p.evaluate(() => document.querySelector('[data-mm-ficha]:not([hidden]) .mm-cab-ficha-t')?.textContent);
    check('la ficha sigue al servicio enfocado', ficha === 'Pool Remodeling Services', String(ficha));
    await p.waitForTimeout(900);
    const tras = red.filter((r) => r.includes('-menu.')).length;
    check('al abrir se pide solo la foto que se ve', tras >= 1 && tras <= 3, `${tras} peticion(es)`);
    await p.keyboard.press('Escape');
    const cerrado = await p.evaluate(() => !document.querySelector('.mm-cab-grupo').open);
    const vuelve = await activo(p);
    check('Esc cierra el panel', cerrado);
    check('y el foco vuelve a «Services»', vuelve.startsWith('summary.mm-cab-item|Services'), vuelve);
    await p.evaluate(() => { const g = document.querySelectorAll('.mm-cab-grupo'); g[0].querySelector('summary').click(); g[1].querySelector('summary').click(); });
    const abiertos = await p.evaluate(() => [...document.querySelectorAll('.mm-cab-grupo')].filter((g) => g.open).length);
    check('un solo desplegable abierto a la vez', abiertos === 1, `${abiertos} abiertos`);
    await p.keyboard.press('Escape');
    // 4 · foco a la vista: tabular 25 veces por el contenido con la pagina desplazada
    await p.evaluate(() => { scrollTo(0, 600); document.querySelector('main a, main button')?.focus(); });
    let tapados = 0;
    for (let i = 0; i < 25; i++) {
      await p.keyboard.press(TAB);
      tapados += await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body || a.closest('.mm-cab')) return 0; const r = a.getBoundingClientRect(); const c = document.querySelector('.mm-cab-fila').getBoundingClientRect(); if (r.height > 0 && r.top < c.bottom - 1 && r.bottom > c.top) { (window.__tap ??= []).push(`${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]} «${(a.textContent || '').trim().slice(0, 24)}» top ${Math.round(r.top)}`); return 1; } return 0; });
    }
    check('el foco no queda bajo la fila fija (25 tabulaciones)', tapados === 0, `${tapados} tapado(s): ${(await p.evaluate(() => window.__tap ?? [])).join(' · ')}`);
    await cierra();
  }
  // ── 3 · teclado y tacto, móvil ───────────────────────────────────────────────────────────
  console.log(`── 3. menu a 390 · ${ruta}`);
  {
    const { p, cierra } = await abre(390, ruta);
    await p.focus('[data-mm-abrir]');
    await p.keyboard.press('Enter');
    const modal = await p.evaluate(() => { const d = document.querySelector('#mm-menu'); return d.open && d.matches(':modal'); });
    check('el boton abre el <dialog> como modal', modal);
    const dentro = await p.evaluate(() => document.querySelector('#mm-menu').contains(document.activeElement));
    check('el foco queda dentro del menu', dentro, await activo(p));
    const m = await p.evaluate(async () => {
      const d = document.querySelector('#mm-menu');
      const malos = [];
      for (const det of d.querySelectorAll('details')) det.open = true;   // `name` deja uno abierto: se recorren de uno en uno
      for (const det of [...d.querySelectorAll('details')]) {
        det.open = true;
        for (const a of det.querySelectorAll('a')) {
          a.scrollIntoView({ block: 'center' });
          const r = a.getBoundingClientRect();
          const arriba = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (r.height < 43.5 || r.left < 0 || r.right > innerWidth || !(arriba === a || a.contains(arriba))) malos.push(`${a.textContent.trim()} ${Math.round(r.height)}px`);
        }
      }
      const n = new Set([...d.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href') + '|' + a.textContent.trim())).size;
      return { malos, n };
    });
    check('los enlaces del menu se pueden tocar (≥ 44 px, a la vista, nada encima)', m.malos.length === 0, m.malos.slice(0, 5).join(' · '));
    await p.keyboard.press('Escape');
    const cerrado = await p.evaluate(() => !document.querySelector('#mm-menu').open);
    const vuelve = await p.evaluate(() => document.activeElement?.hasAttribute('data-mm-abrir'));
    check('Esc cierra el menu', cerrado);
    check('y el foco vuelve al boton', vuelve === true, await activo(p));
    // 4 · foco a la vista con la barra inferior
    await p.evaluate(() => { scrollTo(0, 900); document.querySelector('main a, main button')?.focus(); });
    let tapados = 0;
    /* SE JUZGA TRAS UNOS FOTOGRAMAS, NO EN EL MISMO INSTANTE. La barra se esconde desde un
     * `IntersectionObserver` (BarraMovil.astro), y sus avisos llegan con el siguiente pintado, no
     * dentro de la pulsacion. Medido: 9 ms en Chromium y 23-49 ms (3 fotogramas) en WebKit desde
     * que el formulario entra en pantalla. Mirando en el acto, WebKit daba por tapado el primer
     * campo de `/contact-us` con una barra que ya se estaba yendo. Seis fotogramas: lo que siga
     * tapado despues, lo esta de verdad para quien navega con teclado. */
    const SEIS_FOTOGRAMAS = () => new Promise((ok) => { let n = 0; const f = () => (++n < 6 ? requestAnimationFrame(f) : ok()); requestAnimationFrame(f); });
    for (let i = 0; i < 20; i++) {
      await p.keyboard.press(TAB);
      await p.evaluate(SEIS_FOTOGRAMAS);
      tapados += await p.evaluate(() => { const a = document.activeElement; const b = document.querySelector('.mm-barra'); if (!a || a === document.body || a.closest('.mm-cab, .mm-barra') || b.hasAttribute('data-oculta')) return 0; const r = a.getBoundingClientRect(); const q = b.getBoundingClientRect(); const c = document.querySelector('.mm-cab-fila').getBoundingClientRect(); if (r.height > 0 && ((r.bottom > q.top + 1 && r.top < q.bottom) || (r.top < c.bottom - 1 && r.bottom > c.top))) { (window.__tap ??= []).push(`${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]} «${(a.textContent || '').trim().slice(0, 24)}» ${Math.round(r.top)}-${Math.round(r.bottom)}`); return 1; } return 0; });
    }
    check('el foco no queda bajo la cabecera ni la barra (20 tabulaciones)', tapados === 0, `${tapados} tapado(s): ${(await p.evaluate(() => window.__tap ?? [])).join(' · ')}`);
    await cierra();
  }
}
await nav.close();

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE'}\n`);
process.exit(fallos ? 1 : 0);
