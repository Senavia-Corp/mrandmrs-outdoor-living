#!/usr/bin/env node
/**
 * PUERTA del mosaico de la galeria de obra de las fichas (ASTRO-2): cada celda es un `<button>`
 * que abre el visor (`<dialog class="mm-lb">`, `Componentes.astro`) en SU foto, el visor recorre
 * tambien las fotos que no caben en el mosaico, y Esc lo cierra devolviendo el foco a la celda.
 *
 *     npm run check:mosaico            # headless, sobre .vercel/output/static, 3 fichas fijas
 *
 * Tres fichas y no catorce: una con 6 celdas y segunda fila, la de 5 y la de 3.
 * Y una pagina de ciudad, donde ademas se prueba el panel de servicios (indice + ficha).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const D = path.resolve(import.meta.dirname, '../.vercel/output/static');
// + una pagina de ciudad (`GaleriaObra.astro`) y una de condado (`condadoStitch`): el mismo mosaico.
// + una ficha de proyecto (ASTRO-4): portada y mosaico de «Project Details» son botones del mismo visor.
const RUTAS = ['/services/pool-builders', '/services/retractable-screens', '/services/irrigation-systems', '/services/pool-builders/alachua-fl', '/services/pool-builders/marion-county-fl',
  '/project/modern-pool-motorized-pergola-south-florida'];
const rojos = [];
const b = await chromium.launch();
for (const ruta of RUTAS) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route('**/*', (x) => {
    const u = new URL(x.request().url());
    if (u.hostname !== 'mm.test') return x.abort();
    let f = path.join(D, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
  });
  await p.goto('http://mm.test' + ruta, { waitUntil: 'load' });
  const mal = (m) => rojos.push(`${ruta}: ${m}`);
  // En la ficha de proyecto las fotos del visor son la portada y las del mosaico de detalle, en ese orden.
  const SEL = ruta.startsWith('/project/') ? 'button[data-mm-foto]' : '.mm-mosaico > button.mm-celda';
  const celdas = p.locator(SEL);
  const n = await celdas.count();
  // D-117: las fotos que no caben en el mosaico van en una segunda fila, a la vista y en el HTML.
  const extras = await p.locator('.mm-mosaico-resto > button.mm-celda[data-mm-foto]').count();
  if (n < 3) { mal(`${n} celdas`); await p.close(); continue; }
  await celdas.nth(1).focus();
  await p.keyboard.press('Enter');
  const estado = () => p.evaluate(() => {
    const d = document.querySelector('dialog.mm-lb');
    return { abierto: d.open, src: new URL(d.querySelector('.mm-lb__img').src, location.href).pathname, cuenta: d.querySelector('.mm-lb__cuenta').textContent };
  });
  let e = await estado();
  const foto = (i) => celdas.nth(i).getAttribute('data-mm-foto');
  if (!e.abierto) mal('Enter sobre la celda 2 no abre el visor');
  if (e.src !== await foto(1)) mal(`el visor abre ${e.src} y la celda 2 es ${await foto(1)}`);
  if (e.cuenta !== `2 / ${n + extras}`) mal(`el contador dice «${e.cuenta}» y se esperaba «2 / ${n + extras}»`);
  await p.keyboard.press('ArrowRight');
  e = await estado();
  if (e.src !== await foto(2)) mal('flecha derecha no pasa a la celda 3');
  await p.keyboard.press('Escape');
  e = await estado();
  if (e.abierto) mal('Esc no cierra el visor');
  if (!await p.evaluate((sel) => document.activeElement === document.querySelectorAll(sel)[1], SEL)) mal('al cerrar, el foco no vuelve a la celda');
  const rotas = await p.evaluate(async () => {
    const out = [];
    for (const i of document.querySelectorAll('button[data-mm-foto] img')) {
      i.loading = 'eager';
      if (!i.complete) await new Promise((r) => { i.onload = i.onerror = r; });
      if (!i.naturalWidth) out.push(i.getAttribute('src'));
    }
    return out;
  });
  if (rotas.length) mal(`fotos que no cargan: ${rotas.join(', ')}`);
  /* EL PANEL DE SERVICIOS DE LA PAGINA DE CIUDAD (`ServiciosIndice.astro`): 14 filas y 14 fichas,
   * una sola a la vista; pulsar una fila ensena SU ficha y solo ella lleva `aria-current`. */
  let panel = '';
  if (await p.locator('.mm-serv').count()) {
    const lee = () => p.evaluate(() => ({
      filas: [...document.querySelectorAll('.mm-serv [data-mm-serv]')].map((x) => [x.dataset.mmServ, x.getAttribute('aria-current')]),
      fichas: [...document.querySelectorAll('.mm-serv [data-mm-serv-ficha]')].map((x) => [x.dataset.mmServFicha, !x.hidden && x.getClientRects().length > 0, !!x.querySelector('a[href^="/services/"]')]),
    }));
    let e = await lee();
    if (e.filas.length !== 14 || e.fichas.length !== 14) mal(`panel de servicios: ${e.filas.length} filas y ${e.fichas.length} fichas; son 14 y 14`);
    if (e.fichas.some((f) => !f[2])) mal('panel de servicios: una ficha no enlaza a su servicio');
    const abiertas = (x) => x.fichas.filter((f) => f[1]).map((f) => f[0]);
    const actuales = (x) => x.filas.filter((f) => f[1] === 'true').map((f) => f[0]);
    if (abiertas(e).length !== 1 || abiertas(e)[0] !== actuales(e)[0]) mal(`panel de servicios: al cargar, fichas a la vista ${abiertas(e)} y fila actual ${actuales(e)}`);
    const otra = e.filas.find((f) => f[1] !== 'true' && f[0] !== abiertas(e)[0])?.[0];
    await p.locator(`.mm-serv [data-mm-serv="${otra}"]`).click();
    e = await lee();
    if (abiertas(e).join() !== otra || actuales(e).join() !== otra) mal(`panel de servicios: tras pulsar «${otra}», a la vista ${abiertas(e)} y actual ${actuales(e)}`);
    panel = ' · panel de servicios: 14 filas, cambia de ficha';
  }
  console.log(`  ${rojos.some((r) => r.startsWith(ruta)) ? 'ROJO' : 'ok  '} ${ruta}   (${n} celdas + ${extras} en la segunda fila${panel})`);
  await p.close();
}
await b.close();
if (rojos.length) { for (const r of rojos) console.error(`  ROJO ${r}`); console.error(`\nPUERTA ROJA — ${rojos.length} fallo(s)\n`); process.exit(1); }
console.log('\nPUERTA VERDE\n');
