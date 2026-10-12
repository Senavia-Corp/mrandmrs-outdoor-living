#!/usr/bin/env node
/**
 * PUERTA del mosaico de la galeria de obra de las fichas (ASTRO-2): cada celda es un `<button>`
 * que abre el visor (`<dialog class="mm-lb">`, `Componentes.astro`) en SU foto, el visor recorre
 * tambien las fotos que no caben en el mosaico, y Esc lo cierra devolviendo el foco a la celda.
 *
 *     npm run check:mosaico            # headless, sobre .vercel/output/static, 3 fichas fijas
 *
 * Tres fichas y no catorce: una con 6 celdas y segunda fila, la de 5 y la de 3.
 * Y una pagina de ciudad: su galeria es el mismo mosaico.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const D = path.resolve(import.meta.dirname, '../.vercel/output/static');
// + una pagina de ciudad: su galeria es el mismo mosaico desde ASTRO-2 (`GaleriaObra.astro`).
const RUTAS = ['/services/pool-builders', '/services/retractable-screens', '/services/irrigation-systems', '/services/pool-builders/alachua-fl'];
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
  const celdas = p.locator('.mm-mosaico > button.mm-celda');
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
  if (!await p.evaluate(() => document.activeElement === document.querySelectorAll('.mm-mosaico > button.mm-celda')[1])) mal('al cerrar, el foco no vuelve a la celda');
  const rotas = await p.evaluate(async () => {
    const out = [];
    for (const i of document.querySelectorAll('.mm-celda img')) {
      i.loading = 'eager';
      if (!i.complete) await new Promise((r) => { i.onload = i.onerror = r; });
      if (!i.naturalWidth) out.push(i.getAttribute('src'));
    }
    return out;
  });
  if (rotas.length) mal(`fotos que no cargan: ${rotas.join(', ')}`);
  console.log(`  ${rojos.some((r) => r.startsWith(ruta)) ? 'ROJO' : 'ok  '} ${ruta}   (${n} celdas + ${extras} en la segunda fila)`);
  await p.close();
}
await b.close();
if (rojos.length) { for (const r of rojos) console.error(`  ROJO ${r}`); console.error(`\nPUERTA ROJA — ${rojos.length} fallo(s)\n`); process.exit(1); }
console.log('\nPUERTA VERDE\n');
