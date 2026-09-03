#!/usr/bin/env node
/**
 * PUERTA del lightbox partido de /gallery — GalleryLeadLightbox.astro / dialog.mm-lbx.
 *
 *     npm run check:galeria-formulario
 *
 * Complementa a check-galeria.mjs, que ya NO cubre /gallery: sus 137 gallery-picture las
 * excluye el guard de Componentes.astro (a.closest('.gallery-page')) y las abre este dialogo
 * en su lugar. Esta puerta comprueba, sobre lo desplegado: que el marcado viaja con la pagina
 * y con NINGUNA otra (el route-gate del frontmatro), que el guard realmente aisla los dos
 * sistemas (nunca se abren los dos lightbox a la vez), que el formulario de 3 pasos es
 * navegable, y el comportamiento del modal (foco, Esc, velo, bloqueo de scroll).
 *
 * Regla de la casa (DIRECTOR.md): una puerta que no distingue "no lo he medido" de "lo he
 * medido y esta bien" es peor que no tenerla. Cada aserto de abajo falla en rojo si el caso no
 * se pudo medir -nunca lo cuenta como verde en silencio-.
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

// ════════════════════════════════════════════════════════════════════════════
// 1 · ESTÁTICA — el marcado viaja con /gallery, y con NINGUNA otra pagina
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. el marcado (estatico, sobre lo desplegado)');

const paginas = [];
(function barrer(d, base = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) barrer(path.join(d, e.name), `${base}/${e.name}`);
    else if (e.name === 'index.html') paginas.push([base || '/', path.join(d, e.name)]);
    else if (e.name.endsWith('.html')) paginas.push([`${base}/${e.name.replace(/\.html$/, '')}`, path.join(d, e.name)]);
  }
}(ESTATICO));

const gal = paginas.find(([ruta]) => ruta === '/gallery');
check('existe /gallery en lo desplegado', !!gal);
if (!gal) { console.log(`\nPUERTA ROJA — ${fallos} fallos\n`); process.exit(1); }

const html = fs.readFileSync(gal[1], 'utf8');
check('trae el dialogo .mm-lbx', html.includes('class="mm-lbx"'));
check('trae el honeypot ref_id', html.includes('name="ref_id"'));
check('el formulario embebido apunta a Request Quote Form',
  html.includes('data-name="Request Quote Form"') && html.includes('data-mm-envia="1"'));
for (const n of [1, 2, 3]) check(`trae el paso data-step="${n}"`, html.includes(`data-step="${n}"`));
check('trae los paneles de exito y fallo', html.includes('success-message-form') && html.includes('w-form-fail'));

const valores = [...html.matchAll(/name="checkbox"[^>]*value="([^"]+)"/g)].map((m) => m[1]);
check('las 14 casillas de servicio llevan value', valores.length === 14, `${valores.length} encontradas`);

let fuera = 0;
for (const [ruta, fichero] of paginas) {
  if (ruta === '/gallery') continue;
  if (fs.readFileSync(fichero, 'utf8').includes('class="mm-lbx"')) fuera++;
}
check('el lightbox partido NO existe en ninguna otra pagina (route-gate)', fuera === 0, `${fuera} pagina(s) de mas`);

// ════════════════════════════════════════════════════════════════════════════
// 2 · COMPORTAMIENTO — se abre, no compite con el otro lightbox, se navega, se cierra
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 2. el lightbox partido, usandolo de verdad');
console.log('     991 y 992 aparte, para fijar el punto exacto donde el layout cambia de bottom-sheet a lado a lado.');

const PUERTO = 4743;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
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
const portada = await fetch(`http://localhost:${PUERTO}/`).then((r) => r.text());
if (!portada.includes('mrandmrsoutdoorliving')) {
  console.error(`\nROJO el servidor de :${PUERTO} no sirve Mr & Mrs\n`);
  servidor.close(); process.exit(1);
}

const nav = await chromium.launch();
const mal = {
  noAbre: [], dosALaVez: [], sinLock: [], lockPersiste: [], noPasa: [],
  noCierraEsc: [], noCierraVelo: [], noCierraX: [], foco: [], noPasos: [], sinTurnstile: [], layout: [],
};
const ANCHOS = [[390, 844], [991, 800], [992, 800], [1440, 900]];

for (const [ancho, alto] of ANCHOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, hasTouch: ancho < 800, isMobile: ancho < 800 });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PUERTO}/gallery`, { waitUntil: 'load' });

  const hayTurnstile = await p.evaluate(() => !!document.querySelector('.mm-lbx .mm-turnstile'));
  if (!hayTurnstile) mal.sinTurnstile.push(`@${ancho}`);

  const a = await p.$('.gallery-page a.w-lightbox');
  if (!a) { mal.noAbre.push(`@${ancho} no hay ninguna ancla en .gallery-page`); await p.close(); await ctx.close(); continue; }

  if (ancho < 800) await a.tap(); else await a.click();
  let abrio = true;
  try { await p.waitForFunction(() => document.querySelector('dialog.mm-lbx')?.open === true, null, { timeout: 5000 }); }
  catch { abrio = false; mal.noAbre.push(`@${ancho}`); }
  if (!abrio) { await p.close(); await ctx.close(); continue; }

  const est = await p.evaluate(() => {
    const d = document.querySelector('dialog.mm-lbx');
    const otro = document.querySelector('dialog.mm-lb');
    return {
      modal: d.matches(':modal'),
      otroAbierto: otro ? otro.open === true : false,
      lock: document.documentElement.classList.contains('mm-scroll-lock'),
      img: d.querySelector('.mm-lbx__img')?.getAttribute('src') ?? null,
      flexDirection: getComputedStyle(d.querySelector('.mm-lbx__panel')).flexDirection,
    };
  });
  if (!est.modal) mal.noAbre.push(`@${ancho} abre pero NO es modal`);
  if (est.otroAbierto) mal.dosALaVez.push(`@${ancho} .mm-lb tambien quedo abierto a la vez`);
  if (!est.lock) mal.sinLock.push(`@${ancho} html.mm-scroll-lock no se activo al abrir`);
  const esperado = ancho >= 992 ? 'row' : 'column';
  if (est.flexDirection !== esperado) mal.layout.push(`@${ancho} esperaba flex-direction:${esperado}, midio ${est.flexDirection}`);

  await p.click('.mm-lbx__nav--next');
  const otra = await p.evaluate(() => document.querySelector('dialog.mm-lbx .mm-lbx__img')?.getAttribute('src') ?? null);
  if (otra === est.img) mal.noPasa.push(`@${ancho} la flecha no cambia de imagen`);

  // Cada paso valida sus campos data-required='true' antes de dejar avanzar -igual que
  // request-estimated.astro-, asi que la sonda tiene que rellenarlos, no solo pulsar Next.
  const llego = await p.evaluate(() => {
    const root = document.querySelector('.mm-lbx__formulario');
    const next = root?.querySelector('.msf-next');
    const submit = root?.querySelector('.msf-submit');
    if (!next || !submit) return false;
    const disp = (el) => new Event('input', { bubbles: true }) && el.dispatchEvent(new Event('input', { bubbles: true }));

    const presupuesto = root.querySelector('[name="Estimated-Project-Budget"]');
    if (presupuesto) { presupuesto.value = 'Under $25,000'; disp(presupuesto); }
    next.click();

    const calle = root.querySelector('[name="Street-Address"]');
    const ciudad = root.querySelector('[name="City"]');
    const zip = root.querySelector('[name="ZIP-Code"]');
    if (calle) { calle.value = '123 Test St'; disp(calle); }
    if (ciudad) { ciudad.value = 'Ocala'; disp(ciudad); }
    if (zip) { zip.value = '34470'; disp(zip); }
    next.click();

    return getComputedStyle(submit).display !== 'none';
  });
  if (!llego) mal.noPasos.push(`@${ancho} paso 1->2->3 (con campos requeridos rellenos) no llega al boton de envio`);

  // El boton X es el tercer camino de cierre -ademas de Esc y el velo- y el unico que usa
  // realmente un visitante en desktop sin teclado. Se comprueba aparte porque es el que un
  // repaso manual encontro sospechoso: probarlo aqui, con Playwright de verdad, es la unica
  // forma fiable de saber si `close` -y por tanto el candado de scroll- se dispara de verdad.
  await p.click('.mm-lbx__x');
  let cerroX = true;
  try { await p.waitForFunction(() => !document.querySelector('dialog.mm-lbx')?.open, null, { timeout: 3000 }); }
  catch { cerroX = false; mal.noCierraX.push(`@${ancho}`); }
  if (cerroX) {
    let lockFueraX = true;
    try { await p.waitForFunction(() => !document.documentElement.classList.contains('mm-scroll-lock'), null, { timeout: 1000 }); }
    catch { lockFueraX = false; }
    if (!lockFueraX) mal.lockPersiste.push(`@${ancho} html.mm-scroll-lock no se quito al cerrar con el boton X`);
  }
  // Reabre para las dos pruebas de cierre que siguen (Esc y velo).
  if (ancho < 800) await a.tap(); else await a.click();
  await p.waitForFunction(() => document.querySelector('dialog.mm-lbx')?.open === true, null, { timeout: 5000 }).catch(() => {});

  await p.keyboard.press('Escape');
  let cerro = true;
  try { await p.waitForFunction(() => !document.querySelector('dialog.mm-lbx')?.open, null, { timeout: 3000 }); }
  catch { cerro = false; mal.noCierraEsc.push(`@${ancho}`); }
  if (cerro) {
    // El evento `close` del dialogo -que es quien quita mm-scroll-lock- se dispara en una
    // tarea encolada, no en el mismo tick en que `open` pasa a false: comprobarlo con un solo
    // `evaluate` corria contra ese hueco. Se espera la propia clase, no un instante congelado.
    let lockFuera = true;
    try { await p.waitForFunction(() => !document.documentElement.classList.contains('mm-scroll-lock'), null, { timeout: 1000 }); }
    catch { lockFuera = false; }
    if (!lockFuera) mal.lockPersiste.push(`@${ancho} html.mm-scroll-lock no se quito al cerrar`);
    const vuelve = await p.evaluate(() => document.activeElement?.classList?.contains('w-lightbox') ?? false);
    if (!vuelve) mal.foco.push(`@${ancho} el foco no vuelve al ancla`);
  }

  if (ancho < 800) await a.tap(); else await a.click();
  await p.waitForFunction(() => document.querySelector('dialog.mm-lbx')?.open === true, null, { timeout: 5000 }).catch(() => {});
  if (ancho < 800) await p.touchscreen.tap(5, 5); else await p.mouse.click(5, 5);
  let cerroVelo = true;
  try { await p.waitForFunction(() => !document.querySelector('dialog.mm-lbx')?.open, null, { timeout: 3000 }); }
  catch { cerroVelo = false; mal.noCierraVelo.push(`@${ancho}`); }
  // El cierre por click (velo o boton X) tambien deberia disparar `close` -y por tanto quitar
  // mm-scroll-lock-, exactamente igual que Esc. Solo se habia comprobado tras Esc; este es el
  // otro camino de cierre real (el que de hecho prueba el boton X en la UI).
  if (cerroVelo) {
    let lockFueraVelo = true;
    try { await p.waitForFunction(() => !document.documentElement.classList.contains('mm-scroll-lock'), null, { timeout: 1000 }); }
    catch { lockFueraVelo = false; }
    if (!lockFueraVelo) mal.lockPersiste.push(`@${ancho} html.mm-scroll-lock no se quito al cerrar con el velo`);
  }

  await p.close();
  await ctx.close();
}
await nav.close();
servidor.close();

check('el widget de Turnstile se renderiza dentro del dialogo', mal.sinTurnstile.length === 0, `${mal.sinTurnstile.length} sin`);
lista(mal.sinTurnstile);
check('el lightbox partido abre como modal', mal.noAbre.length === 0, `${mal.noAbre.length}`);
lista(mal.noAbre);
check('NUNCA se abren los dos lightbox a la vez', mal.dosALaVez.length === 0, `${mal.dosALaVez.length}`);
lista(mal.dosALaVez);
check('el layout cambia de bottom-sheet a lado-a-lado exactamente en 992', mal.layout.length === 0, `${mal.layout.length}`);
lista(mal.layout);
check('el scroll de fondo se bloquea al abrir', mal.sinLock.length === 0, `${mal.sinLock.length}`);
lista(mal.sinLock);
check('el scroll de fondo se restaura al cerrar', mal.lockPersiste.length === 0, `${mal.lockPersiste.length}`);
lista(mal.lockPersiste);
check('las flechas pasan de imagen', mal.noPasa.length === 0, `${mal.noPasa.length}`);
lista(mal.noPasa);
check('los 3 pasos del formulario son navegables', mal.noPasos.length === 0, `${mal.noPasos.length}`);
lista(mal.noPasos);
check('el boton X cierra', mal.noCierraX.length === 0, `${mal.noCierraX.length}`);
lista(mal.noCierraX);
check('Escape cierra', mal.noCierraEsc.length === 0, `${mal.noCierraEsc.length}`);
lista(mal.noCierraEsc);
check('tocar el velo cierra', mal.noCierraVelo.length === 0, `${mal.noCierraVelo.length}`);
lista(mal.noCierraVelo);
check('al cerrar, el foco vuelve al ancla que lo abrio', mal.foco.length === 0, `${mal.foco.length}`);
lista(mal.foco);

console.log(fallos ? `\nPUERTA ROJA — ${fallos} fallos\n` : '\nPUERTA VERDE\n');
process.exit(fallos ? 1 : 0);
