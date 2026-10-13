#!/usr/bin/env node
/**
 * PUERTA DEL ENVIO PARCIAL DEL PASO 1 (ASTRO-3). NO ENVIA NADA A NADIE.
 *
 *     npm run check:parcial                               el servidor, con el correo simulado a disco
 *     MM_ESTATICO_PARCIAL=<build> npm run check:parcial   y ademas el navegador, sobre un build hecho
 *                                                         con PUBLIC_FORM_PARCIAL=1
 *
 * EL SERVIDOR se prueba cargando el endpoint de verdad (`src/pages/api/formulario.ts`) con Vite y
 * llamando a su `POST` con peticiones construidas aqui. El correo no sale: con
 * `LEAD_SIMULADO_DIR` el endpoint escribe cada mensaje en una carpeta temporal, y esta puerta
 * los lee. Turnstile va sin clave secreta (el endpoint entonces no valida), salvo en el caso
 * que usa las claves de PRUEBA publicas de Cloudflare, que necesita red y lo dice si no la hay.
 *
 * EL NAVEGADOR se prueba en headless sobre un build con el interruptor encendido. Toda peticion a
 * otro host se aborta y `POST /api/formulario` lo contesta esta puerta: se comprueba QUE manda
 * el navegador y cuando.
 *
 * Que el interruptor APAGADO deja todo como estaba lo prueban dos cosas: el caso «apagado» de
 * aqui (un parcial no produce correo y el completo no gana cabeceras) y `check:formulario`, que
 * corre sobre el build por defecto y falla si «Continue» manda algo o si el envio lleva un campo
 * que no estaba.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const RAIZ = path.resolve(import.meta.dirname, '..');
const rojos = [];
const ok = (cond, que, detalle = '') => { console.log(`  ${cond ? 'ok  ' : 'ROJO'} ${que}${cond || !detalle ? '' : ' — ' + detalle}`); if (!cond) rojos.push(que); return cond; };

// ── el servidor ──────────────────────────────────────────────────────────────────────────────
const CORREOS = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-parcial-'));
for (const k of ['SMTP_USER', 'SMTP_PASS', 'TURNSTILE_SECRET', 'VERCEL', 'LEAD_TO']) delete process.env[k];
process.env.LEAD_SIMULADO_DIR = CORREOS;

const vite = await createServer({ configFile: false, root: RAIZ, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
const { POST } = await vite.ssrLoadModule('/src/pages/api/formulario.ts');
console.log('\n── antes de nada');
ok(!process.env.SMTP_USER && !process.env.SMTP_PASS && !process.env.VERCEL && process.env.LEAD_SIMULADO_DIR === CORREOS, 'el proceso no tiene credenciales SMTP y el transporte es el simulado: no hay con que enviar un correo');

const PASO_1 = { 'Full-Name': 'Prueba De La Puerta', Phone: '3525550100', email: 'puerta@example.test', 'ZIP-Code': '32601' };
const PASO_2 = { Type: 'Yes', 'Project-Type': 'New pool', 'Estimated-Project-Budget': '$75,000 – $100,000', Timeline: '3-6 months', Message: 'Prueba, no es un cliente.', checkbox: 'New Pool and Spa Construction', Checkbox: 'true' };
const FORM = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'))['/services/pool-builders'].formulario.nombre;
const META = { __form: FORM, __form_id: 'core', __ruta: '/services/pool-builders', elapsedMs: '9000', ref_id: '' };
const pide = async (ip, campos) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...META, ...campos })) fd.append(k, v);
  const r = await POST({ request: new Request('http://mm.test/api/formulario', { method: 'POST', body: fd }), clientAddress: ip });
  return { estado: r.status, j: await r.json() };
};
const palabra = (s) => s.replace(/=\?UTF-8\?([QB])\?([^?]*)\?=(\s+(?==\?))?/gi, (_, c, t) => (c.toUpperCase() === 'B' ? Buffer.from(t, 'base64') : Buffer.from(t.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))), 'latin1')).toString('utf8'));
const lee = (f) => {
  const crudo = fs.readFileSync(path.join(CORREOS, f), 'utf8');
  const [cab] = crudo.split(/\n\n/);
  const plano = cab.replace(/\n[ \t]+/g, ' ');
  const de = (n) => palabra((plano.match(new RegExp(`^${n}: (.*)$`, 'mi')) ?? [])[1] ?? '');
  const qp = (t) => Buffer.from(t.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
  const texto = qp((crudo.match(/Content-Type: text\/plain[^\n]*\n(?:[A-Za-z-]+: [^\n]*\n)*\n([\s\S]*?)\n--/) ?? [])[1] ?? '');
  return { asunto: de('Subject'), id: de('Message-ID'), respuestaA: de('In-Reply-To'), referencias: de('References'), texto, crudo };
};
const correos = () => fs.readdirSync(CORREOS).sort();
const nuevos = (antes) => correos().filter((f) => !antes.includes(f));
const ID = (n) => `contacto-prueba-${n}-0000`;

console.log('\n── servidor · interruptor APAGADO (sin PUBLIC_FORM_PARCIAL)');
{
  delete process.env.PUBLIC_FORM_PARCIAL;
  const antes = correos();
  const p = await pide('10.0.0.1', { ...PASO_1, etapa: 'parcial', contacto_id: ID(1) });
  ok(p.estado === 200 && p.j.entregado === false && nuevos(antes).length === 0, 'un parcial no existe: 200 en silencio y ningun correo', JSON.stringify(p));
  const c = await pide('10.0.0.1', { ...PASO_1, ...PASO_2, contacto_id: ID(1) });
  const m = nuevos(antes).map(lee);
  ok(c.estado === 200 && c.j.entregado === true && m.length === 1, 'el completo sale, y justo detras del parcial ignorado: el parcial no toco el limite por IP', JSON.stringify(c));
  ok(m[0] && !m[0].respuestaA && !m[0].referencias && !/PARTIAL/i.test(m[0].asunto) && !/PARTIAL/i.test(m[0].texto), 'el completo no gana cabeceras de hilo ni marca, aunque traiga un identificador');
  globalThis.__asuntoApagado = m[0]?.asunto;
}

console.log('\n── servidor · ENCENDIDO, camino feliz (parcial y completo)');
process.env.PUBLIC_FORM_PARCIAL = '1';
{
  const antes = correos();
  const p = await pide('10.0.0.2', { ...PASO_1, etapa: 'parcial', contacto_id: ID(2) });
  const c = await pide('10.0.0.2', { ...PASO_1, ...PASO_2, contacto_id: ID(2) });
  const m = nuevos(antes).map(lee);
  ok(p.estado === 200 && p.j.parcial === true && c.estado === 200 && c.j.entregado === true && !c.j.parcial, 'parcial 200 y, segundos despues, completo 200: el limite por IP no lo corta', `${p.estado} / ${c.estado} ${JSON.stringify(c.j)}`);
  ok(m.length === 2, 'dos mensajes en disco', String(m.length));
  const [par, com] = m;
  if (par && com) {
    ok(par.asunto.startsWith('[PARTIAL CONTACT] ') && par.asunto.endsWith(ID(2)), 'el asunto del parcial empieza por la marca y acaba en el identificador', par.asunto);
    ok(par.texto.split('\n')[0].startsWith('PARTIAL CONTACT') && /NO SMS CONSENT: reach out by phone call or email only/.test(par.texto.split('\n')[0]), 'su PRIMERA linea dice que no hay consentimiento de SMS', par.texto.split('\n')[0]);
    ok(par.texto.includes(`Contact ID: ${ID(2)}`) && !/SMS consent/i.test(par.texto.split('\n').slice(2).join('\n')) && !par.texto.includes('Timeline'), 'lleva el identificador y solo los campos del paso 1');
    ok(par.id === `<parcial.${ID(2)}@mrandmrsoutdoorliving.com>`, 'su Message-ID se deriva del identificador', par.id);
    ok(com.respuestaA === par.id && com.referencias === par.id, 'el completo va en su hilo: In-Reply-To y References al parcial', `${com.respuestaA} / ${com.referencias}`);
    ok(com.asunto === globalThis.__asuntoApagado && !/PARTIAL/i.test(com.texto), 'el asunto y el cuerpo del completo son los de siempre', com.asunto);
    console.log(`       parcial  · Subject: ${par.asunto}\n                · Message-ID: ${par.id}\n       completo · Subject: ${com.asunto}\n                · In-Reply-To: ${com.respuestaA}\n                · References: ${com.referencias}`);
  }
}

console.log('\n── servidor · ENCENDIDO, corrige el paso 1 y vuelve a avanzar (segundo parcial)');
{
  const antes = correos();
  await pide('10.0.0.14', { ...PASO_1, etapa: 'parcial', contacto_id: ID(14), parcial_n: '1' });
  await pide('10.0.0.15', { ...PASO_1, Phone: '3525550199', etapa: 'parcial', contacto_id: ID(14), parcial_n: '2' });
  const [uno, dos] = nuevos(antes).map(lee);
  ok(uno && dos && dos.id && dos.id !== uno.id, 'el segundo parcial NO repite el Message-ID del primero: un buzon lo descartaria por duplicado', `${uno?.id} / ${dos?.id}`);
  ok(dos?.respuestaA === uno?.id && dos.asunto === uno.asunto && dos.texto.includes('3525550199'), 'cuelga del primero, con la misma marca y el dato corregido', `${dos?.respuestaA} · ${dos?.asunto}`);
}

console.log('\n── servidor · ENCENDIDO, el limite por IP sigue vivo');
{
  const a = await pide('10.0.0.3', { ...PASO_1, etapa: 'parcial', contacto_id: ID(3) });
  const b = await pide('10.0.0.3', { ...PASO_1, etapa: 'parcial', contacto_id: ID(4) });
  ok(a.estado === 200 && b.estado === 429, 'dos parciales seguidos de la misma IP con identificadores distintos: el segundo, 429', `${a.estado} / ${b.estado}`);
  const g = await pide('10.0.0.12', { ...PASO_1, etapa: 'parcial', contacto_id: ID(12) });
  const h = await pide('10.0.0.12', { ...PASO_1, Phone: '3525550199', etapa: 'parcial', contacto_id: ID(12) });
  ok(g.estado === 200 && h.estado === 429, 'y con el MISMO identificador tambien: el segundo parcial, 429', `${g.estado} / ${h.estado}`);
  const d = await pide('10.0.0.4', { ...PASO_1, ...PASO_2 });
  const e = await pide('10.0.0.4', { ...PASO_1, ...PASO_2 });
  ok(d.estado === 200 && e.estado === 429, 'un completo sin parcial se comporta como hoy: el segundo seguido, 429', `${d.estado} / ${e.estado}`);
  const i = await pide('10.0.0.12', { ...PASO_1, ...PASO_2, contacto_id: ID(12) });
  const j = await pide('10.0.0.12', { ...PASO_1, ...PASO_2, contacto_id: ID(12) });
  ok(i.estado === 200 && j.estado === 429, 'tras un parcial pasa UN completo, no dos: el segundo con el mismo identificador, 429', `${i.estado} / ${j.estado}`);
  // El parcial de OTRA persona detras de la misma IP (una oficina, una red movil) no puede
  // tumbar un envio completo: es el unico camino por el que llega un cliente.
  const k = await pide('10.0.0.13', { ...PASO_1, etapa: 'parcial', contacto_id: ID(13) });
  const l = await pide('10.0.0.13', { ...PASO_1, ...PASO_2, email: 'otra@example.test' });
  ok(k.estado === 200 && l.estado === 200, 'el parcial de otra persona en la misma IP no tumba un completo', `${k.estado} / ${l.estado}`);
}

console.log('\n── servidor · ENCENDIDO, bots y peticiones mal formadas');
{
  const antes = correos();
  const h = await pide('10.0.0.5', { ...PASO_1, etapa: 'parcial', contacto_id: ID(5), ref_id: 'https://spam.example' });
  const t = await pide('10.0.0.6', { ...PASO_1, etapa: 'parcial', contacto_id: ID(6), elapsedMs: '300' });
  ok(h.estado === 200 && h.j.entregado === false && t.estado === 200 && t.j.entregado === false && nuevos(antes).length === 0, 'honeypot relleno o menos de un segundo: 200 en silencio y ningun mensaje', `${JSON.stringify(h)} ${JSON.stringify(t)}`);
  const s = await pide('10.0.0.7', { ...PASO_1, etapa: 'parcial' });
  ok(s.estado === 400, 'un parcial sin identificador: 400', String(s.estado));
  const x = await pide('10.0.0.8', { ...PASO_1, etapa: 'parcial', contacto_id: ID(8), email: 'no-es-un-correo' });
  ok(x.estado === 400, 'un parcial con el correo mal: 400, como el completo', String(x.estado));
  ok(nuevos(antes).length === 0, 'ninguno de los cuatro dejo un mensaje');
}

console.log('\n── servidor · ENCENDIDO, Turnstile con las claves de PRUEBA de Cloudflare (necesita red)');
{
  const antes = correos();
  process.env.TURNSTILE_SECRET = '2x0000000000000000000000000000000AA';   // la que SIEMPRE rechaza
  const mal = await pide('10.0.0.9', { ...PASO_1, etapa: 'parcial', contacto_id: ID(9), turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' });
  const sinToken = await pide('10.0.0.10', { ...PASO_1, etapa: 'parcial', contacto_id: ID(10) });
  process.env.TURNSTILE_SECRET = '1x0000000000000000000000000000000AA';   // la que SIEMPRE acepta
  const bien = await pide('10.0.0.11', { ...PASO_1, etapa: 'parcial', contacto_id: ID(11), turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' });
  delete process.env.TURNSTILE_SECRET;
  ok(sinToken.estado === 403, 'con clave secreta, un parcial SIN token: 403', String(sinToken.estado));
  if (mal.estado === 200) console.log('  --   sin red hasta Cloudflare: el endpoint falla abierto y este caso NO ha podido comprobarse');
  else ok(mal.estado === 403 && bien.estado === 200 && nuevos(antes).length === 1, 'clave que rechaza, 403 y sin mensaje; clave que acepta, 200 y un mensaje', `${mal.estado} / ${bien.estado} / ${nuevos(antes).length}`);
}
await vite.close();

// ── el navegador ─────────────────────────────────────────────────────────────────────────────
const D = process.env.MM_ESTATICO_PARCIAL && path.resolve(process.env.MM_ESTATICO_PARCIAL);
if (!D) console.log('\n  --   el navegador NO se ha probado: falta MM_ESTATICO_PARCIAL=<build con PUBLIC_FORM_PARCIAL=1>');
else {
  const { chromium } = await import('playwright');
  const b = await chromium.launch();
  const campos = (cuerpo) => new Map([...cuerpo.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)/g)].map((m) => [m[1], m[2]]));
  /* Un Turnstile DE MENTIRA, servido en lugar del script de Cloudflare: da un token distinto cada
   * vez (`ficha-1`, `ficha-2`…), tarda 300 ms en dar el primero y 900 ms en renovarlo tras un
   * `reset`, y cuenta los reinicios. Sirve para ver que el parcial y el completo llevan cada uno
   * el suyo; la clave de sitio de la pagina no se usa ni sale de aqui. */
  const TURNSTILE_SIMULADO = `(() => { let n = 0; const w = {}; window.__reinicios = 0;
    const da = (id, ms) => setTimeout(() => { w[id] = 'ficha-' + (++n); }, ms);
    window.turnstile = { render() { const id = 'w' + Object.keys(w).length; w[id] = ''; da(id, 300); return id; },
      getResponse: (id) => w[id] ?? '', reset(id) { window.__reinicios++; w[id] = ''; da(id, 900); }, remove() {} };
    const cb = new URL(document.currentScript.src).searchParams.get('onload'); if (cb && window[cb]) window[cb](); })();`;
  const abre = async (estadoParcial, turnstile = false) => {
    const posts = []; const gracias = [];
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route('**/*', (x) => {
      const u = new URL(x.request().url());
      if (turnstile && u.hostname === 'challenges.cloudflare.com' && u.pathname.endsWith('/api.js')) return x.fulfill({ contentType: 'text/javascript', body: TURNSTILE_SIMULADO });
      if (u.hostname !== 'mm.test') return x.abort();
      if (u.pathname === '/api/formulario') {
        const c = campos(x.request().postDataBuffer()?.toString('latin1') ?? '');
        posts.push(c);
        return c.get('etapa') === 'parcial'
          ? x.fulfill({ status: estadoParcial, contentType: 'application/json', body: estadoParcial === 200 ? '{"ok":true,"entregado":true,"parcial":true}' : '{"ok":false}' })
          : x.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"entregado":true}' });
      }
      if (u.pathname.replace(/\/$/, '') === '/thank-you') gracias.push(u.href);
      let f = path.join(D, decodeURIComponent(u.pathname));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(6000);
    await p.goto('http://mm.test/services/pool-builders', { waitUntil: 'load' });
    const form = p.locator('form[data-mm-pasos]');
    await p.waitForFunction(() => document.querySelector('form[data-mm-pasos]')?.dataset.mmPaso === '1');
    return { ctx, p, form, posts, gracias };
  };
  const rellena1 = async (form) => {
    await form.locator('[name="Full-Name"]').fill('Prueba de la puerta');
    await form.locator('[name="Phone"]').fill('3525550100');
    await form.locator('[name="email"]').fill('puerta@example.test');
    await form.locator('[name="ZIP-Code"]').fill('32601');
  };
  const rellena2 = async (form) => {
    await form.locator('[name="Type"]').selectOption({ index: 1 });
    await form.locator('[name="Estimated-Project-Budget"]').nth(2).check();
    await form.locator('[name="Timeline"]').nth(1).check();
  };

  console.log(`\n── navegador · ENCENDIDO (build: ${D})`);
  {
    const { ctx, p, form, posts, gracias } = await abre(200);
    ok(await form.locator('[data-mm-parcial-nota]').isVisible(), 'la frase «Your contact details are saved when you continue» se ve junto a «Continue»');
    await rellena1(form);
    await form.locator('[data-mm-sig]').click();
    await p.waitForTimeout(400);
    const paso = await form.getAttribute('data-mm-paso');
    const par = posts[0];
    ok(paso === '2' && posts.length === 1 && par?.get('etapa') === 'parcial', '«Continue» pasa al paso 2 y manda UN parcial', `paso ${paso}, ${posts.length} peticiones`);
    ok(/^[A-Za-z0-9-]{8,64}$/.test(par?.get('contacto_id') ?? ''), 'con un identificador de contacto valido', par?.get('contacto_id'));
    const esperados = ['Full-Name', 'Phone', 'email', 'ZIP-Code', 'etapa', 'contacto_id', 'parcial_n', '__form', '__form_id', '__ruta', 'elapsedMs', 'ref_id'];
    ok(par && [...par.keys()].every((k) => esperados.includes(k) || /^origen_/.test(k) || k === 'turnstileToken') && esperados.every((k) => par.has(k)), 'y solo los campos del paso 1', par ? [...par.keys()].join(' ') : '');
    ok(!gracias.length && !p.url().includes('thank-you') && await p.evaluate(() => sessionStorage.getItem('mm_lead')) === null, 'el parcial no redirige a /thank-you ni deja la llave de conversion');
    await form.locator('[data-mm-atras]').click();
    ok(await form.locator('[name="Phone"]').inputValue() === '3525550100', '«Back» conserva lo escrito');
    await form.locator('[data-mm-sig]').click();
    await p.waitForTimeout(300);
    ok(posts.length === 1, 'volver a avanzar sin cambios NO reenvia', String(posts.length));
    await form.locator('[data-mm-atras]').click();
    await form.locator('[name="Phone"]').fill('3525550199');
    await form.locator('[data-mm-sig]').click();
    await p.waitForTimeout(300);
    ok(posts.length === 2 && posts[1].get('etapa') === 'parcial' && posts[1].get('Phone') === '3525550199' && posts[1].get('contacto_id') === par.get('contacto_id') && par.get('parcial_n') === '1' && posts[1].get('parcial_n') === '2',
      'corregir el telefono y avanzar SI reenvia: mismo identificador, ordinal 2 y el dato nuevo', `${posts.length} peticiones, ordinales ${posts.map((c) => c.get('parcial_n')).join(' ')}`);
    await rellena2(form);
    await form.locator('[type=submit]').click();
    await p.waitForURL(/\/thank-you\?f=/, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
    const com = posts[2];
    ok(posts.length === 3 && com && !com.has('etapa') && !com.has('parcial_n') && com.get('contacto_id') === par.get('contacto_id') && com.get('Phone') === '3525550199', 'el completo sale con el MISMO identificador, sin `etapa` y con el dato corregido', `${posts.length} peticiones`);
    ok(com?.has('Timeline') && com?.has('Estimated-Project-Budget') && com?.get('Full-Name') === par.get('Full-Name'), 'y con todos sus campos');
    const conversiones = await p.evaluate(() => (window.dataLayer ?? []).filter((e) => e && e.event === 'generate_lead').length);
    ok(gracias.length === 1 && conversiones === 1, '/thank-you se carga UNA vez y la conversion se dispara UNA vez', `${gracias.length} cargas, ${conversiones} conversiones`);
    await ctx.close();
  }
  console.log('\n── navegador · ENCENDIDO, el parcial FALLA (500)');
  {
    const { ctx, p, form, posts, gracias } = await abre(500);
    const errores = [];
    p.on('pageerror', (e) => errores.push(String(e)));
    await rellena1(form);
    await form.locator('[data-mm-sig]').click();
    await p.waitForTimeout(400);
    ok(await form.getAttribute('data-mm-paso') === '2' && !(await p.locator('.w-form-fail').first().isVisible().catch(() => false)), 'el usuario llega al paso 2 y no ve ningun error');
    await rellena2(form);
    await form.locator('[type=submit]').click();
    await p.waitForURL(/\/thank-you\?f=/, { timeout: 8000 }).catch(() => {});
    ok(posts.length === 2 && !posts[1].has('etapa') && gracias.length === 1 && !errores.length, 'completa, el completo sale y llega a /thank-you', `peticiones: ${posts.map((c) => c.get('etapa') ?? 'completo').join(' → ')}, errores de pagina: ${errores.length}`);
    console.log(`       traza · POST parcial → 500 · paso 2 a la vista · POST completo → 200 · ${gracias[0] ?? 'sin /thank-you'}`);
    await ctx.close();
  }
  console.log('\n── navegador · ENCENDIDO, con un Turnstile simulado (un token por envio)');
  {
    const { ctx, p, form, posts, gracias } = await abre(200, true);
    await rellena1(form);
    await p.waitForFunction(() => window.turnstile?.getResponse('w0'));
    await form.locator('[data-mm-sig]').click();
    await rellena2(form);
    await form.locator('[type=submit]').click();   // antes de los 900 ms que tarda el token nuevo
    await p.waitForURL(/\/thank-you\?f=/, { timeout: 12000 }).catch(() => {});
    const [par, com] = posts;
    ok(posts.length === 2 && par.get('turnstileToken') === 'ficha-1' && com.get('turnstileToken') === 'ficha-2', 'el parcial gasta un token y el completo ESPERA al siguiente: cada uno lleva el suyo', posts.map((c) => `${c.get('etapa') ?? 'completo'}=${c.get('turnstileToken')}`).join(' · '));
    ok(gracias.length === 1, 'y llega a /thank-you');
    await ctx.close();
  }
  {
    const { ctx, p, form, posts } = await abre(200, true);
    await p.waitForFunction(() => !!window.turnstile);
    await p.evaluate(() => { const f = document.querySelector('form[data-mm-pasos]'); const v = { 'Full-Name': 'Prueba de la puerta', Phone: '3525550100', email: 'puerta@example.test', 'ZIP-Code': '32601' }; for (const k in v) f.querySelector(`[name="${k}"]`).value = v[k]; f.querySelector('[data-mm-sig]').click(); });
    await p.waitForTimeout(200);
    const reinicios = await p.evaluate(() => window.__reinicios);
    ok(posts.length === 1 && posts[0].get('turnstileToken') === '' && reinicios === 0, 'un «Continue» mas rapido que Turnstile manda el parcial sin token y NO reinicia el reto en curso', `${posts.length} peticiones, token «${posts[0]?.get('turnstileToken')}», ${reinicios} reinicios`);
    await rellena2(form);
    await form.locator('[type=submit]').click();
    await p.waitForURL(/\/thank-you\?f=/, { timeout: 12000 }).catch(() => {});
    ok(posts.length === 2 && posts[1].get('turnstileToken') === 'ficha-1', 'y el completo sale con el primer token, que nadie ha gastado', posts[1]?.get('turnstileToken'));
    await ctx.close();
  }
  console.log('\n── navegador · ENCENDIDO, sin JavaScript');
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const posts = [];
    await ctx.route('**/*', (x) => {
      const u = new URL(x.request().url());
      if (u.hostname !== 'mm.test') return x.abort();
      if (u.pathname === '/api/formulario') { posts.push(campos(x.request().postDataBuffer()?.toString('latin1') ?? x.request().postData() ?? '')); return x.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"entregado":true}' }); }
      let f = path.join(D, decodeURIComponent(u.pathname));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
    });
    const p = await ctx.newPage(); p.setDefaultTimeout(6000);
    await p.goto('http://mm.test/services/pool-builders', { waitUntil: 'load' });
    const form = p.locator('form[data-mm-pasos]');
    ok(!(await form.locator('[data-mm-parcial-nota]').isVisible()) && !(await form.locator('[data-mm-sig]').isVisible()), 'ni «Continue» ni la frase del parcial: sin JS nadie lo manda, y la frase no lo promete');
    await rellena1(form); await rellena2(form);
    await form.locator('[type=submit]').click();
    await p.waitForTimeout(600);
    ok(posts.length === 1, 'el formulario se envia entero, en UN solo envio nativo, como hoy', String(posts.length));
    await ctx.close();
  }
  await b.close();
}

fs.rmSync(CORREOS, { recursive: true, force: true });
if (rojos.length) { console.error(`\nPUERTA ROJA — ${rojos.length} comprobacion(es)\n`); process.exit(1); }
console.log(`\nPUERTA VERDE — envio parcial: servidor${D ? ' y navegador' : ' (el navegador no se ha probado)'}; ningun correo ha salido\n`);
