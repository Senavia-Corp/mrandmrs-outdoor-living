#!/usr/bin/env node
/**
 * FASE 12a — EL ORÁCULO. Se captura ANTES de tocar una línea de la app nueva.
 *
 *     node scripts/capturar-oraculo.mjs            local (por defecto)
 *     node scripts/capturar-oraculo.mjs --vivo     ademas, 10 casos contra el dominio real
 *
 * POR QUÉ ESTO VA PRIMERO, Y POR QUÉ CADUCA
 *
 * `/pool-investment-estimator` es una FUNCIÓN PURA: misma entrada, misma salida, y cero
 * llamadas de red (`fetch(`, `XMLHttpRequest`, `axios`, `/api/` dan cero en el bundle). Eso la
 * convierte en un oráculo con el que verificar que la app nueva calcula IGUAL.
 *
 * El oráculo desaparece en cuanto (a) se corte el dominio de Webflow o (b) se sustituya el
 * bundle. O sea, en cuanto empiece el trabajo. Este proyecto ya estuvo a punto de perder un
 * dato equivalente —el orden manual de las colecciones, rescatado in extremis en
 * `_source/orden-listas.json`—. No se repite.
 *
 * QUÉ SE MIDE, Y POR QUÉ NO SOLO EL RANGO
 *
 * Por caso se guardan 8 valores, no 1: el rango (min/max), su texto literal, el subtítulo y las
 * 7 líneas de «View Cost Breakdown». Un modelo equivocado puede acertar un rango por
 * casualidad —la salida está redondeada al millar— y no puede acertar el desglose entero.
 *
 * CÓMO SE MANEJAN LOS SLIDERS
 *
 * Son sliders de Radix: un `<span role="slider">`, no un `<input type=range>`. Se manejan por
 * TECLADO (Home/End/flechas) y se confirma el valor leyendo `aria-valuenow`. Clicar sobre la
 * pista a base de píxeles daría un valor aproximado y silenciosamente distinto del pedido.
 *
 * NO SE RECARGA LA PÁGINA ENTRE CASOS: el estado vive en React y recargar costaría una
 * rehidratación por caso. Se navega a los pasos que cambian y se toca solo lo que difiere.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const RAIZ = path.resolve(import.meta.dirname, '..');
/**
 * Se sirve DIRECTAMENTE de `_source/estimator/`, el insumo congelado, y no de
 * `public/pool-investment-estimator/`, que desapareció en la Fase 12c junto con
 * `build-estimador.mjs`. Así el oráculo se puede volver a capturar siempre, aunque el dominio
 * ya esté cortado: mientras esos 5 ficheros estén en git, el original se puede ejecutar.
 * Lo único que hay que deshacer al vuelo es el prefijo del host de Webflow Cloud.
 */
const APP = path.join(RAIZ, '_source/estimator');
const COSMIC = /https:\/\/[0-9a-f-]+\.wf-app-prod\.cosmic\.webflow\.services\/pool-investment-estimator/g;
const SALIDA = path.join(RAIZ, '_source/estimator-casos.json');
const REFERENCIA = path.join(RAIZ, '_source/estimator-referencia.json');
const VIVO = 'https://mrandmrsoutdoorliving.com/pool-investment-estimator';
const CON_VIVO = process.argv.includes('--vivo');

if (!fs.existsSync(path.join(APP, 'index.html'))) {
  console.error('\nROJO falta _source/estimator/ — sin el bundle original no hay oráculo que capturar\n');
  process.exit(1);
}

// ── el estado por defecto, leído del bundle (los useState del componente) ───────────────────
const POR_DEFECTO = {
  proyecto: 'new', tamano: 450, estilo: 'freeform', acabado: 'pebble',
  deck: 600, material: 'pavers', spa: 'none',
  calefaccion: true, sal: true, automatizacion: false, luces: 3,
  pergola: false, techoLamas: false, mosquitera: false, cocina: false, jardineria: true,
  accesoLimitado: false, roca: false, hoa: false,
};

/** Cada control: en qué paso vive, de qué tipo es y cómo se llama en el DOM. */
const CONTROLES = {
  proyecto:       { paso: 1, tipo: 'radio', ids: { new: 'new', remodel: 'remodel' } },
  tamano:         { paso: 2, tipo: 'slider', min: 250, max: 900, step: 25 },
  estilo:         { paso: 3, tipo: 'radio', ids: { standard: 'standard', freeform: 'freeform', luxury: 'luxury' } },
  acabado:        { paso: 4, tipo: 'radio', ids: { plaster: 'plaster', pebble: 'pebble', premium: 'premium' } },
  deck:           { paso: 5, tipo: 'slider', min: 200, max: 1500, step: 50 },
  material:       { paso: 5, tipo: 'radio', ids: { concrete: 'concrete', pavers: 'pavers', travertine: 'travertine' } },
  spa:            { paso: 6, tipo: 'radio', ids: { none: 'spa-none', integrated: 'spa-integrated', spillover: 'spa-spillover' } },
  calefaccion:    { paso: 6, tipo: 'check', id: 'heater' },
  sal:            { paso: 6, tipo: 'check', id: 'salt-system' },
  automatizacion: { paso: 6, tipo: 'check', id: 'automation' },
  luces:          { paso: 6, tipo: 'slider', min: 0, max: 12, step: 1 },
  pergola:        { paso: 7, tipo: 'check', id: 'pergola' },
  techoLamas:     { paso: 7, tipo: 'check', id: 'louvered-roof' },
  mosquitera:     { paso: 7, tipo: 'check', id: 'screen-enclosure' },
  cocina:         { paso: 7, tipo: 'check', id: 'outdoor-kitchen' },
  jardineria:     { paso: 7, tipo: 'check', id: 'landscaping' },
  accesoLimitado: { paso: 7, tipo: 'check', id: 'tight-access' },
  roca:           { paso: 7, tipo: 'check', id: 'rock-excavation' },
  hoa:            { paso: 7, tipo: 'check', id: 'hoa-approval' },
};

// ── los casos ──────────────────────────────────────────────────────────────────────────────
/** LCG con semilla fija: la tanda es REPRODUCIBLE. `Math.random()` daría un oráculo distinto
 *  en cada corrida y entonces «los 385 casos» no querría decir nada. */
let semilla = 20260828;
const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
const elige = (xs) => xs[Math.floor(rnd() * xs.length)];
const enRango = (c) => c.min + Math.floor(rnd() * ((c.max - c.min) / c.step + 1)) * c.step;

const BOOLEANOS = Object.keys(CONTROLES).filter((k) => CONTROLES[k].tipo === 'check');
const casos = [];
const mete = (bloque, e) => casos.push({ bloque, entradas: { ...POR_DEFECTO, ...e } });

mete('defecto', {});
// 1 · combinatoria categórica COMPLETA: 2 x 3 x 3 x 3 x 3 = 162
for (const proyecto of ['new', 'remodel'])
  for (const estilo of ['standard', 'freeform', 'luxury'])
    for (const acabado of ['plaster', 'pebble', 'premium'])
      for (const material of ['concrete', 'pavers', 'travertine'])
        for (const spa of ['none', 'integrated', 'spillover'])
          mete('categorico', { proyecto, estilo, acabado, material, spa });
// 2 · cada booleano volteado UNO A UNO desde el estado por defecto
for (const b of BOOLEANOS) mete('booleano', { [b]: !POR_DEFECTO[b] });
// 3 · todo encendido / todo apagado, con los extremos numéricos
mete('todo-si', { ...Object.fromEntries(BOOLEANOS.map((b) => [b, true])), spa: 'spillover',
  estilo: 'luxury', acabado: 'premium', material: 'travertine', tamano: 900, deck: 1500, luces: 12 });
mete('todo-no', { ...Object.fromEntries(BOOLEANOS.map((b) => [b, false])), spa: 'none',
  estilo: 'standard', acabado: 'plaster', material: 'concrete', tamano: 250, deck: 200, luces: 0 });
// 4 · extremos numéricos, los 8 vértices. Los sliders EN SU MÍNIMO Y EN SU MÁXIMO.
for (const tamano of [250, 900])
  for (const deck of [200, 1500])
    for (const luces of [0, 12]) mete('extremos', { tamano, deck, luces });
// 5 · 200 aleatorios con semilla fija sobre los 19 controles
for (let i = 0; i < 200; i++) {
  const e = { proyecto: elige(['new', 'remodel']), estilo: elige(['standard', 'freeform', 'luxury']),
    acabado: elige(['plaster', 'pebble', 'premium']), material: elige(['concrete', 'pavers', 'travertine']),
    spa: elige(['none', 'integrated', 'spillover']), tamano: enRango(CONTROLES.tamano),
    deck: enRango(CONTROLES.deck), luces: enRango(CONTROLES.luces) };
  for (const b of BOOLEANOS) e[b] = rnd() < 0.5;
  mete('aleatorio', e);
}

// ── servidor local del bundle ACTUAL ───────────────────────────────────────────────────────
const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
    .replace(/^\/pool-investment-estimator/, '').replace(/^\/_astro\//, '/');
  const f = [path.join(APP, p), path.join(APP, p, 'index.html')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  // El index.html apunta al host de Webflow Cloud; se le da la vuelta al vuelo para que el
  // navegador pida los tres JS y el CSS a este mismo servidor.
  if (f.endsWith('index.html')) {
    return res.end(fs.readFileSync(f, 'utf8').replace(COSMIC, '/pool-investment-estimator'));
  }
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const LOCAL = `http://localhost:${servidor.address().port}/pool-investment-estimator`;

// ── lo que se lee del panel, de una sola vez ───────────────────────────────────────────────
const LEER = () => {
  const textos = (s) => [...document.querySelectorAll(`#pool-estimator ${s}`)];
  // El paso: el UNICO span que dice «Step N of 7». `span.font-semibold` a secas tambien casa
  // con «View Cost Breakdown».
  // El numero sale del GRUPO de la expresion, no de quitarle las letras a la cadena:
  // `'Step 1 of 7'.replace(/\D+/g,'')` da «17», y con eso el asistente creia estar en el paso
  // 17 y pulsaba «Back» para siempre. Medido: la primera corrida murio en el caso 2.
  const paso = Number((textos('span').map((e) => e.textContent)
    .map((t) => /^Step (\d) of 7$/.exec(t)).find(Boolean) ?? [0, 0])[1]);
  /**
   * El rango se ancla al PANEL, no a `.text-5xl`: el paso 5 pinta los pies cuadrados del deck
   * con esa misma clase y va ANTES en el documento, asi que `querySelector('.text-5xl')`
   * devolvia «600» en vez del rango. Medido: reventó en el caso 4 de la primera corrida.
   */
  const rotulo = textos('p').find((e) => e.textContent.trim() === 'Estimated Investment Range');
  const rango = rotulo?.nextElementSibling?.textContent ?? '';
  const subtitulo = rotulo?.nextElementSibling?.nextElementSibling?.textContent ?? '';
  const desglose = {};
  const caja = [...document.querySelectorAll('#pool-estimator .mt-4.space-y-2')][0];
  for (const fila of caja ? [...caja.children] : []) {
    const [k, v] = [...fila.querySelectorAll('span')].map((s) => s.textContent.trim());
    if (k) desglose[k.replace(/:$/, '')] = v;
  }
  const abierto = Boolean(caja);
  const dolares = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
  const [min, max] = rango.split('–').map(dolares);
  return { paso, rango, min, max, subtitulo, desglose, abierto };
};

/** Estado real de los controles del paso visible, para no clicar lo que ya está bien. */
const ESTADO_CONTROL = (id) => {
  const e = document.getElementById(id);
  return e ? e.getAttribute('data-state') : null;
};

const nav = await chromium.launch({ headless: false,
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });

async function recorre(url, lista, etiqueta) {
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
  const pag = await ctx.newPage();
  await pag.goto(url, { waitUntil: 'load', timeout: 60000 });
  await pag.waitForSelector('#pool-estimator .text-5xl', { timeout: 30000 });
  await pag.bringToFront();

  // El desglose se abre UNA VEZ y se queda abierto: es estado del componente, no del caso.
  if (!(await pag.evaluate(LEER)).abierto) {
    await pag.getByText('View Cost Breakdown').click();
    await pag.waitForTimeout(120);
  }

  const irA = async (destino) => {
    for (let i = 0; i < 12; i++) {
      const { paso } = await pag.evaluate(LEER);
      if (paso === destino) return;
      await pag.locator('#pool-estimator button', { hasText: paso < destino ? /^Next$/ : /^Back$/ }).first().click();
      await pag.waitForTimeout(35);
    }
    throw new Error(`no llego al paso ${destino}`);
  };

  const pon = async (clave, valor) => {
    const c = CONTROLES[clave];
    await irA(c.paso);
    if (c.tipo === 'radio') {
      const id = c.ids[valor];
      if (await pag.evaluate(ESTADO_CONTROL, id) === 'checked') return;
      await pag.locator(`#${id}`).click();
    } else if (c.tipo === 'check') {
      const quiero = valor ? 'checked' : 'unchecked';
      if (await pag.evaluate(ESTADO_CONTROL, c.id) === quiero) return;
      await pag.locator(`#${c.id}`).click();
    } else {
      // slider: el del paso, por teclado. Se confirma leyendo aria-valuenow.
      const s = pag.locator('#pool-estimator [role=slider]').first();
      await s.focus();
      let actual = Number(await s.getAttribute('aria-valuenow'));
      if (actual === valor) return;
      const saltos = Math.round((valor - actual) / c.step);
      const total = Math.round((c.max - c.min) / c.step);
      if (Math.abs(saltos) > total / 2) {           // más barato ir al extremo y volver
        await s.press(valor - c.min < c.max - valor ? 'Home' : 'End');
        actual = valor - c.min < c.max - valor ? c.min : c.max;
      }
      const n = Math.round((valor - actual) / c.step);
      for (let i = 0; i < Math.abs(n); i++) await s.press(n > 0 ? 'ArrowRight' : 'ArrowLeft');
      const leido = Number(await s.getAttribute('aria-valuenow'));
      if (leido !== valor) throw new Error(`${clave}: pedí ${valor} y el slider dice ${leido}`);
    }
    await pag.waitForTimeout(30);
  };

  let previo = { ...POR_DEFECTO };
  const salida = [];
  const t0 = Date.now();
  for (const [i, caso] of lista.entries()) {
    // Solo lo que cambia, y en orden de paso ascendente: minimiza los viajes del asistente.
    const cambios = Object.keys(CONTROLES)
      .filter((k) => caso.entradas[k] !== previo[k])
      .sort((a, b) => CONTROLES[a].paso - CONTROLES[b].paso);
    for (const k of cambios) await pon(k, caso.entradas[k]);
    previo = { ...caso.entradas };

    const l = await pag.evaluate(LEER);
    if (!l.abierto) throw new Error('el desglose se ha cerrado: los casos quedarían sin desglose');
    if (!Number.isFinite(l.min) || !Number.isFinite(l.max)) throw new Error(`rango ilegible: "${l.rango}"`);
    salida.push({ bloque: caso.bloque, entradas: caso.entradas,
      rango: l.rango, min: l.min, max: l.max, subtitulo: l.subtitulo, desglose: l.desglose });
    if ((i + 1) % 25 === 0 || i === lista.length - 1) {
      const s = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ${etiqueta}  ${String(i + 1).padStart(3)}/${lista.length}  ${s}s   ultimo: ${l.rango}`);
    }
  }
  return { pag, ctx, salida };
}

console.log(`\n── capturando ${casos.length} casos del bundle ACTUAL (local)\n`);
const { pag, ctx, salida } = await recorre(LOCAL, casos, 'local');

// ── la referencia que TAMBIÉN caduca: tipografía efectiva y geometría del paso 1 ────────────
console.log('\n── referencia de maqueta del paso 1 (caduca con el bundle)');
const referencia = { capturadoEl: new Date().toISOString(), anchos: {} };
{
  // vuelta al estado por defecto y al paso 1
  const ctx2 = await nav.newContext({ viewport: { width: 1920, height: 1080 } });
  const p2 = await ctx2.newPage();
  await p2.goto(LOCAL, { waitUntil: 'load' });
  await p2.waitForSelector('#pool-estimator .text-5xl');
  await p2.bringToFront();
  referencia.tipografia = await p2.evaluate(() => {
    const c = getComputedStyle(document.querySelector('#pool-estimator'));
    const t = getComputedStyle(document.querySelector('#pool-estimator .text-5xl'));
    return { raiz: c.fontFamily, tamanoRaiz: c.fontSize, colorRaiz: c.color,
      rangoFamilia: t.fontFamily, rangoTamano: t.fontSize, rangoPeso: t.fontWeight };
  });
  for (const [w, h] of [[1920, 1080], [1440, 900], [991, 800], [479, 850]]) {
    await p2.setViewportSize({ width: w, height: h });
    await p2.waitForTimeout(400);
    referencia.anchos[w] = await p2.evaluate(() => {
      const vistos = new Map();
      return { alto: document.documentElement.scrollHeight,
        elementos: [...document.querySelectorAll('#pool-estimator, #pool-estimator *')].map((e) => {
          const cls = (e.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
          const k = `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
          const n = vistos.get(k) ?? 0; vistos.set(k, n + 1);
          const r = e.getBoundingClientRect();
          return { k: `${k}#${n}`, top: Math.round(r.top + scrollY), alto: Math.round(r.height), ancho: Math.round(r.width) };
        }) };
    });
    console.log(`  ${w}px  alto ${referencia.anchos[w].alto}  ${referencia.anchos[w].elementos.length} elementos`);
  }
  await ctx2.close();
}
await ctx.close();

// ── 10 casos contra el sitio VIVO, mientras exista ─────────────────────────────────────────
let vivo = { intentado: CON_VIVO, ok: 0, discrepancias: [], motivo: CON_VIVO ? null : 'no se pidió --vivo' };
if (CON_VIVO) {
  console.log('\n── 10 casos contra el dominio VIVO (el bundle portado contra el original)');
  const MUESTRA = [0, 1, 40, 90, 163, 174, 175, 180, 200, 330].filter((i) => casos[i]);
  const muestra = MUESTRA.map((i) => casos[i]);
  try {
    const r = await recorre(VIVO, muestra, 'vivo ');
    for (const [i, c] of r.salida.entries()) {
      const local = salida[MUESTRA[i]];
      if (c.rango === local.rango && JSON.stringify(c.desglose) === JSON.stringify(local.desglose)) vivo.ok++;
      else vivo.discrepancias.push({ i, vivo: c.rango, local: local.rango });
    }
    await r.ctx.close();
  } catch (e) {
    vivo.motivo = `el dominio no respondió: ${e.message.split('\n')[0].slice(0, 120)}`;
    console.log(`  aviso ${vivo.motivo}`);
  }
}
await nav.close();
servidor.close();

fs.writeFileSync(SALIDA, JSON.stringify({
  que: 'ORÁCULO del estimador. Entradas -> salidas MEDIDAS sobre el bundle original de Webflow '
     + 'Cloud, antes de sustituirlo. La app nueva tiene que reproducir los ' + salida.length
     + ' casos. Se mide con scripts/check-estimador.mjs.',
  capturadoEl: new Date().toISOString(),
  fuente: '_source/estimator/ (el bundle ORIGINAL de Webflow Cloud, congelado en la Fase 5)',
  contraElVivo: vivo,
  porDefecto: POR_DEFECTO,
  casos: salida,
}, null, 1) + '\n');
fs.writeFileSync(REFERENCIA, JSON.stringify(referencia, null, 1) + '\n');

const unicos = new Set(salida.map((c) => c.rango)).size;
console.log(`\n  ${salida.length} casos · ${unicos} rangos distintos`);
console.log(`  contra el vivo: ${vivo.intentado ? `${vivo.ok}/10 iguales${vivo.discrepancias.length ? ' — ' + JSON.stringify(vivo.discrepancias) : ''}` : 'no pedido'}`);
console.log(`  tipografía efectiva: ${referencia.tipografia.raiz}`);
console.log(`\n  OK _source/estimator-casos.json  ·  _source/estimator-referencia.json\n`);
