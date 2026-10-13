#!/usr/bin/env node
/**
 * PUERTA del formulario en dos pasos de las fichas y las paginas de ciudad (ASTRO-2, D-34).
 *
 *     npm run check:formulario        # headless, sobre .vercel/output/static
 *
 * NO ENVIA NADA A NADIE. La pagina se sirve por interceptacion bajo `mm.test`, toda peticion a
 * otro host se aborta y `POST /api/formulario` lo contesta esta puerta: lo que se comprueba es
 * QUE manda el navegador, no que hace el servidor con ello.
 *
 * Que mira, en cinco rutas (dos de piscina, pergolas, decks y una ciudad de otro servicio):
 *   · con JS: se ve el paso 1 y no el 2; «Continue» no avanza con campos vacios; Intro en un
 *     campo del paso 1 avanza en vez de enviar; «Back» vuelve sin perder lo escrito;
 *   · el envio lleva los MISMOS campos de siempre (lista escrita a mano mas abajo: es el
 *     contrato con el correo y el CRM), el nombre del formulario, el SERVICIO de la pagina en el
 *     campo oculto (D-125) y redirige a `/thank-you?f=`;
 *   · sin JS: los dos pasos a la vista, sin «Continue» ni «Back», y el envio nativo apunta al
 *     mismo sitio;
 *   · ASTRO-3, el interruptor del envio parcial APAGADO, que es como se construye por defecto:
 *     en todo el recorrido sale UNA peticion, la del envio; «Continue» no manda nada, el envio
 *     no lleva `etapa` ni `contacto_id` (los caza la lista de campos) y la frase del parcial no
 *     esta en la pagina. Con el interruptor encendido lo mira `check:parcial`.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const D = path.resolve(import.meta.dirname, '../.vercel/output/static');
/** Ruta -> el servicio que tiene que viajar en el campo oculto `checkbox` (D-125). Escrito a mano:
 *  si se derivase de `captacion-servicios.json` se compararia el dato consigo mismo. */
const SERVICIO = {
  '/services/pool-builders': 'New Pool and Spa Construction',
  '/services/pergola-builders': 'Aluminum and Wood Pergolas',
  '/services/deck-builders': 'Custom Decks',
  '/services/pool-builders/alachua-fl': 'New Pool and Spa Construction',
  '/services/louvered-roofs/weston-fl': 'Louvered Roof Systems',
  // ASTRO-4 (D-82): la ficha de proyecto monta el formulario de la ficha de piscinas.
  '/project/modern-pool-motorized-pergola-south-florida': 'New Pool and Spa Construction',
  // ASTRO-4 (D-82): la home monta el mismo formulario; la pagina viaja en `__ruta`.
  '/': 'New Pool and Spa Construction',
};
const RUTAS = Object.keys(SERVICIO);
/** Los campos que el formulario mandaba antes de ASTRO-2 (`FormularioCore.astro` en origin/main). */
const CAMPOS = ['Full-Name', 'Phone', 'email', 'ZIP-Code', 'Project-Type', 'Type', 'Estimated-Project-Budget', 'Timeline', 'Message', 'checkbox', 'ref_id'];
/** Los que anade `Formularios.astro` al enviar. `Checkbox` (SMS) solo viaja si se marca. */
const DEL_SCRIPT = /^(__form|__form_id|__ruta|elapsedMs|turnstileToken|origen_.+)$/;

const rojos = [];
const sirve = async (ctx, alEnviar) => ctx.route('**/*', (x) => {
  const u = new URL(x.request().url());
  if (u.hostname !== 'mm.test') return x.abort();
  if (u.pathname === '/api/formulario') { alEnviar?.(x.request()); return x.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"entregado":true}' }); }
  let f = path.join(D, decodeURIComponent(u.pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
});

const b = await chromium.launch();
for (const ruta of RUTAS) {
  const mal = (m) => rojos.push(`${ruta}: ${m}`);
  const antes = rojos.length;

  // ── con JS ────────────────────────────────────────────────────────────────────────────
  let enviado = null; let peticiones = 0;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await sirve(ctx, (req) => { peticiones++; enviado = req.postDataBuffer()?.toString('latin1') ?? ''; });
  const p = await ctx.newPage();
  await p.goto('http://mm.test' + ruta, { waitUntil: 'load' });
  p.setDefaultTimeout(6000);
  try {
    const form = p.locator('form[data-mm-pasos]');
    if (await form.count() !== 1) { mal(`hay ${await form.count()} formularios de dos pasos; se espera 1`); await ctx.close(); throw new Error('sin formulario'); }
    const paso = () => form.getAttribute('data-mm-paso');
    const visible = (sel) => form.locator(sel).first().isVisible();
    await p.waitForFunction(() => document.querySelector('form[data-mm-pasos]')?.dataset.mmPaso === '1', null, { timeout: 5000 }).catch(() => {});
    if (await paso() !== '1') mal('al cargar no esta en el paso 1');
    if (!await visible('[name="Full-Name"]') || await visible('[name="Timeline"]')) mal('en el paso 1 se ve el paso 2 o no se ve el 1');
    await form.locator('[data-mm-sig]').click();
    if (await paso() !== '1') mal('«Continue» avanza con el paso 1 vacio');
    await form.locator('[name="Full-Name"]').fill('Prueba de la puerta');
    await form.locator('[name="Phone"]').fill('3525550100');
    await form.locator('[name="email"]').fill('puerta@example.test');
    await form.locator('[name="ZIP-Code"]').fill('32601');
    await form.locator('[name="ZIP-Code"]').press('Enter');
    if (await paso() !== '2') mal('Intro en el paso 1 no pasa al paso 2');
    if (enviado !== null) mal('Intro en el paso 1 ENVIA el formulario');
    if (!await p.evaluate(() => document.querySelector('[data-paso="2"]').contains(document.activeElement))) mal('al pasar al paso 2 el foco no entra en el');
    await form.locator('[data-mm-atras]').click();
    if (await paso() !== '1' || await form.locator('[name="Phone"]').inputValue() !== '3525550100') mal('«Back» no vuelve al paso 1 o pierde lo escrito');
    await form.locator('[data-mm-sig]').click();
    await form.locator('[name="Type"]').selectOption({ index: 1 });
    await form.locator('[name="Estimated-Project-Budget"]').nth(2).check();
    await form.locator('[name="Timeline"]').nth(1).check();
    const nombre = await form.getAttribute('data-name');
    const porDefecto = await form.locator('[name="Project-Type"]:checked').inputValue().catch(() => '');
    if (!porDefecto) mal('«Project type» no trae opcion marcada por defecto');
    if (await form.locator('[data-mm-parcial-nota]').count().catch(() => 0)) mal('la frase del envio parcial esta en la pagina con el interruptor apagado');
    await form.locator('[type=submit]').click();
    await p.waitForURL(/\/thank-you\?f=/, { timeout: 8000 }).catch(() => mal(`tras enviar no redirige a /thank-you?f= (esta en ${p.url()})`));
    if (peticiones > 1) mal(`en todo el recorrido salen ${peticiones} peticiones a /api/formulario; con el envio parcial apagado es UNA`);
    if (enviado === null) mal('no se ha hecho ningun POST a /api/formulario');
    else {
      const par = new Map([...enviado.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)/g)].map((m) => [m[1], m[2]]));
      for (const c of CAMPOS) if (!par.has(c)) mal(`el envio no lleva el campo «${c}»`);
      for (const c of par.keys()) if (!CAMPOS.includes(c) && c !== 'Checkbox' && !DEL_SCRIPT.test(c)) mal(`el envio lleva un campo que no estaba: «${c}»`);
      if (par.get('__form') !== nombre) mal(`__form es «${par.get('__form')}» y el formulario se llama «${nombre}»`);
      if (par.get('Project-Type') !== porDefecto) mal('«Project-Type» no viaja con la opcion marcada');
      if (par.get('ref_id')) mal('el honeypot viaja relleno');
    // D-82: la pagina desde la que se envia viaja en `__ruta`; en una ficha de proyecto es lo que
    // dice que obra se estaba viendo.
    if (par.get('__ruta') !== ruta) mal(`\`__ruta\` viaja con «${par.get('__ruta')}» y la pagina es ${ruta}`);
    if (par.get('checkbox') !== SERVICIO[ruta]) mal(`el campo oculto «checkbox» viaja con «${par.get('checkbox')}» y esta pagina es de «${SERVICIO[ruta]}» (D-125)`);
    }
  } catch (e) { mal(`la prueba no pudo completarse: ${String(e.message ?? e).split('\n')[0]}`); }
  await ctx.close();

  // ── sin JS ────────────────────────────────────────────────────────────────────────────
  const sin = await b.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  await sirve(sin);
  const q = await sin.newPage();
  await q.goto('http://mm.test' + ruta, { waitUntil: 'load' });
  const f2 = q.locator('form[data-mm-pasos]');
  for (const n of ['Full-Name', 'Type', 'Timeline', 'Message']) if (!await f2.locator(`[name="${n}"]`).first().isVisible()) mal(`sin JS no se ve el campo «${n}»`);
  if (await f2.locator('[data-mm-sig]').isVisible() || await f2.locator('[data-mm-atras]').isVisible()) mal('sin JS se ven «Continue» o «Back», que no hacen nada');
  if (!await f2.locator('[type=submit]').isVisible()) mal('sin JS no se ve el boton de envio');
  if (await f2.getAttribute('action') !== '/api/formulario' || (await f2.getAttribute('method'))?.toLowerCase() !== 'post') mal('sin JS el envio nativo no apunta a POST /api/formulario');
  await sin.close();

  console.log(`  ${rojos.length > antes ? 'ROJO' : 'ok  '} ${ruta}`);
}
await b.close();
if (rojos.length) { for (const r of rojos) console.error(`  ROJO ${r}`); console.error(`\nPUERTA ROJA — ${rojos.length} fallo(s)\n`); process.exit(1); }
console.log('\nPUERTA VERDE — dos pasos, los mismos campos, mismo destino; ningun envio real\n');
