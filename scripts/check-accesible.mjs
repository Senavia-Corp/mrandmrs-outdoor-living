#!/usr/bin/env node
/**
 * PUERTA · accesibilidad medida por la casa, sin auditoria externa (E6).
 *
 *     npm run check:accesible                        headless, Chromium, 25 rutas x 390 y 1440
 *     MM_MOTOR=webkit npm run check:accesible        lo mismo en el motor de Safari (sin contraste)
 *     node scripts/check-accesible.mjs '=/contact-us'      acotada: `=` es ruta exacta
 *     MM_SIN_CONTRASTE=1 …                           todo menos el contraste, que es lo lento
 *
 * UNA RUTA POR PLANTILLA, las 25 de D-128, sobre `.vercel/output/static`. Solo GET; lo externo se
 * corta. No sustituye a nadie mirando la pagina: mide lo que se puede medir.
 *
 *   1 · un solo `<main>`.
 *   2 · todo `<img>` lleva el atributo `alt` (vacio si es decoracion; ausente, nunca).
 *   3 · todo control tiene NOMBRE ACCESIBLE: enlaces, botones, campos, desplegables, `summary`.
 *       El nombre se calcula aqui —`aria-labelledby`, `aria-label`, su `<label>`, su texto, el
 *       `alt` de lo que envuelve, `title`—. El `placeholder` NO cuenta.
 *   4 · el FAQ en `<details>` se abre y se cierra, y al abrirse ensena su respuesta.
 *   5 · FOCO VISIBLE con teclado: de cada clase de control a la vista se enfoca uno y se exige
 *       un `outline` de 2 px o mas, en el o —si es una casilla o un radio escondido— en su tarjeta.
 *   6 · CONTRASTE POR EL PEOR PIXEL (`CRITERIO.md`), nunca por promedio. La pagina se recorre a
 *       pantallazos; en cada uno se captura dos veces, con los glifos y con los glifos
 *       transparentes. Donde las dos capturas difieren hay tinta; lo que queda debajo en la
 *       segunda es su respaldo REAL —el fondo, la foto, el velo—. Cada texto se queda con su peor
 *       pixel (descontado el 1 % de motas: un filete que roza una letra no es legibilidad):
 *       4,5:1, o 3:1 si es texto grande (24 px, o 18,66 px en negrita). Solo se mide la linea
 *       que esta ARRIBA de verdad en ese pantallazo; lo que tapa una capa fija se mide en otro.
 *       No se mide lo que va en `aria-hidden` ni los controles deshabilitados.
 *
 * Sale la tabla por fondo y color de texto, que es lo que pide el sistema: sus fondos son blanco,
 * azul-50, azul-100 y navy; todo lo demas es «foto u otro».
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const D = path.join(RAIZ, '.vercel/output/static');
const WEBKIT = process.env.MM_MOTOR === 'webkit';
const SIN_CONTRASTE = WEBKIT || process.env.MM_SIN_CONTRASTE === '1';
const TAB = WEBKIT ? 'Alt+Tab' : 'Tab';
const ANCHOS = [390, 1440];
const TODAS = ['/', '/services/pool-builders', '/services/pool-builders/alachua-fl', '/services/louvered-roofs/weston-fl',
  '/services/pool-builders/alachua-county-fl', '/blogs/aluminum-vs-wood-pergolas-in-florida', '/blogs-tips',
  '/project/modern-pool-motorized-pergola-south-florida', '/projects', '/gallery', '/gallery/aluminum-pergolas', '/videos',
  '/about', '/contact-us', '/request-estimated', '/financing', '/industry-solutions', '/where-we-serve',
  '/where-we-serve/north-florida', '/brochures', '/testimonials', '/articles/privacy-policy', '/thank-you',
  '/pool-investment-estimator', '/pool-cost-estimator'];
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RUTAS = TODAS.filter((r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f))));

// ── los fondos del sistema, leidos de los tokens ─────────────────────────────────────────────
const tokens = fs.readFileSync(path.join(RAIZ, 'src/styles/disenio/tokens.css'), 'utf8');
/** El hex de un token, siguiendo un `var(--mm-otro)` si lo hay (`--mm-navy` es `--mm-azul-900`). */
const hex = (n) => {
  const m = new RegExp(`--mm-${n}:\\s*(#[0-9a-fA-F]{6}|var\\(--mm-([\\w-]+)\\))`).exec(tokens);
  if (!m) throw new Error(`check:accesible: no encuentro --mm-${n} en tokens.css`);
  return m[2] ? hex(m[2]) : [1, 3, 5].map((i) => parseInt(m[1].slice(i, i + 2), 16));
};
const FONDOS = { blanco: [255, 255, 255], 'azul-50': hex('azul-50'), 'azul-100': hex('azul-100'), navy: hex('navy'), oro: hex('oro') };
const fondoDe = ([r, g, b]) => { for (const [n, c] of Object.entries(FONDOS)) if (Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) <= 12) return n; return 'foto u otro'; };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const razon = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const rojos = [];
const mal = (m) => rojos.push(m);
const b = await (WEBKIT ? webkit : chromium).launch();
const sirve = (ctx) => ctx.route('**/*', (x) => {
  const u = new URL(x.request().url());
  if (u.hostname !== 'mm.test' || x.request().method() !== 'GET') return x.abort();
  let f = path.join(D, decodeURIComponent(u.pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
});

/** Lo que se mide leyendo el DOM: landmarks, alt y nombre accesible. */
const leeDom = () => {
  const oculto = (e) => !!e.closest('[aria-hidden="true"]');
  const txt = (e) => {
    if (!e) return '';
    if (e.nodeType === 3) return e.nodeValue;
    if (e.nodeType !== 1 || e.getAttribute('aria-hidden') === 'true' || /^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)) return '';
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al;
    if (e.tagName === 'IMG') return e.getAttribute('alt') ?? '';
    if (e.tagName.toLowerCase() === 'svg') return e.querySelector('title')?.textContent ?? '';
    return [...e.childNodes].map(txt).join(' ');
  };
  const nombre = (e) => {
    const lb = e.getAttribute('aria-labelledby');
    if (lb) { const s = lb.split(/\s+/).map((id) => txt(document.getElementById(id))).join(' ').trim(); if (s) return s; }
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) {
      if (e.tagName === 'INPUT' && /^(submit|button|reset)$/.test(e.type)) return (e.value || '').trim();
      if (e.tagName === 'INPUT' && e.type === 'image') return (e.alt || '').trim();
      const porFor = e.id ? [...document.querySelectorAll(`label[for="${CSS.escape(e.id)}"]`)].map(txt).join(' ').trim() : '';
      if (porFor) return porFor;
      const env = e.closest('label'); if (env && txt(env).trim()) return txt(env).trim();
      return (e.getAttribute('title') || '').trim();
    }
    return txt(e).replace(/\s+/g, ' ').trim() || (e.getAttribute('title') || '').trim();
  };
  const firma = (e) => e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? `[${e.type}]` : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') + (e.name ? `[name=${e.name}]` : '');
  const controles = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab]')]
    .filter((e) => !oculto(e) && e.getAttribute('tabindex') !== '-1' && !e.disabled);
  return {
    mains: document.querySelectorAll('main').length,
    sinAlt: [...document.querySelectorAll('img:not([alt])')].map((i) => (i.getAttribute('src') ?? '').split('/').pop().slice(0, 50)),
    imgs: document.querySelectorAll('img').length,
    decorativas: document.querySelectorAll('img[alt=""]').length,
    controles: controles.length,
    mudos: controles.filter((e) => !nombre(e)).map((e) => firma(e) + (e.getAttribute('href') ? ` → ${e.getAttribute('href').slice(0, 40)}` : '')),
  };
};

/** De cada clase de control A LA VISTA, uno: se enfoca y se mira su anillo. */
const mideFoco = () => {
  // Sin clase propia, el control se nombra por su ancestro con clase: «a < .mm-form-legal».
  const conClase = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) if (typeof x.className === 'string' && x.className.trim()) return ' < .' + x.className.trim().split(/\s+/)[0]; return ''; };
  const firma = (e) => e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? `[${e.type}]` : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : conClase(e));
  const vistos = new Set(); const sin = []; let medidos = 0; let sinModalidad = 0;
  for (const e of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary')) {
    if (e.closest('[aria-hidden="true"], [inert], dialog:not([open])') || e.disabled || e.getAttribute('tabindex') === '-1') continue;
    const cs0 = getComputedStyle(e); if (cs0.visibility === 'hidden' || cs0.display === 'none' || !e.getClientRects().length) continue;
    const f = firma(e) + '|' + (e.closest('header, footer, main, dialog')?.tagName ?? ''); if (vistos.has(f)) continue; vistos.add(f);
    e.focus({ preventScroll: true });
    if (document.activeElement !== e) continue;
    if (!e.matches(':focus-visible')) { sinModalidad++; continue; }
    medidos++;
    const anillo = (x) => { const c = getComputedStyle(x); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2 && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c.outlineColor); };
    const r = e.getBoundingClientRect(); const escondido = r.width <= 2 || r.height <= 2 || cs0.opacity === '0' || /rect\(0|inset\(50%/.test(cs0.clip + cs0.clipPath);
    const tarjeta = e.closest('label, .mm-opcion, .mm-check, .mm-casilla');
    if (!(anillo(e) || ((escondido || /^(radio|checkbox)$/.test(e.type ?? '')) && tarjeta && anillo(tarjeta)))) sin.push(firma(e));
  }
  document.activeElement?.blur?.();
  return { medidos, sin, sinModalidad };
};

/** Las cajas de tinta de cada texto que hay AHORA en pantalla, con su color. */
const leeTextos = () => {
  const out = []; const vh = innerHeight; const vw = innerWidth;
  /* LA FRANJA DESPEJADA. La fila fija de la cabecera y la barra inferior echan sombra sobre lo que
   * pasa por debajo: una linea a 10 px de ellas se mide oscurecida y da un contraste que nadie ve
   * en reposo (una fecha a 5,26:1 sobre blanco salia a 4,25). Lo que no es de esas capas solo se
   * mide a 24 px o mas de ellas; como el recorrido avanza de media pantalla en media pantalla,
   * toda linea pasa por la franja despejada en algun pantallazo. */
  const fila = document.querySelector('.mm-cab-fila')?.getBoundingClientRect();
  const barra = document.querySelector('.mm-barra:not([data-oculta])')?.getBoundingClientRect();
  const techo = fila && fila.height ? fila.bottom + 24 : 0; const suelo = barra && barra.height ? barra.top - 24 : vh;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const porEl = new Map();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|TITLE)$/.test(e.tagName)) continue;
    if (e.closest('[aria-hidden="true"], [inert], :disabled, svg')) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    /* SOLO LO QUE ESTA ARRIBA DE VERDAD. Una linea que tapa la cabecera fija, la barra inferior o
     * un panel cerrado tiene caja pero no se ve: la tinta que cae dentro es de la capa de encima,
     * y medirla contra el color de ESTE texto da 1,00:1 en falso. Se pregunta al navegador quien
     * pinta en tres puntos de la linea; si no es este elemento, esa linea no se mide aqui (se
     * medira en otro pantallazo, cuando quede libre). */
    const etq = e.closest('label');
    const arriba = (x, y) => { const q = document.elementFromPoint(x, y); return !!q && (q === e || e.contains(q) || (etq && q.closest('label') === etq)); };
    const capa = !!e.closest('.mm-cab, .mm-barra, dialog');
    const cajas = [...rg.getClientRects()].filter((r) => r.width > 1 && r.height > 1 && r.top >= (capa ? 0 : techo) && r.bottom <= (capa ? vh : suelo) && r.left >= 0 && r.right <= vw)
      .filter((r) => [0.2, 0.5, 0.8].every((k) => arriba(r.left + r.width * k, r.top + r.height / 2)))
      .map((r) => [Math.floor(r.left), Math.floor(r.top), Math.ceil(r.right), Math.ceil(r.bottom)]);
    if (!cajas.length) continue;
    if (!porEl.has(e)) porEl.set(e, { cajas: [], texto: '' });
    porEl.get(e).cajas.push(...cajas); porEl.get(e).texto += n.nodeValue.trim().slice(0, 40) + ' ';
  }
  for (const [e, v] of porEl) {
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    let op = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity);
    if (op < 0.05) continue;
    const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(cs.color); if (!m) continue;
    const px = parseFloat(cs.fontSize); const peso = parseInt(cs.fontWeight, 10) || 400;
    const r = e.getBoundingClientRect();
    out.push({ cajas: v.cajas, color: [+m[1], +m[2], +m[3]], alfa: (m[4] === undefined ? 1 : +m[4]) * op, grande: px >= 24 || (px >= 18.66 && peso >= 700), px,
      quien: e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : (e.parentElement && typeof e.parentElement.className === 'string' && e.parentElement.className.trim() ? ' < .' + e.parentElement.className.trim().split(/\s+/)[0] : '')),
      texto: v.texto.trim().slice(0, 36), clave: Math.round(r.left) + ':' + Math.round(r.top + scrollY) + ':' + v.texto.slice(0, 12) });
  }
  return out;
};

const GLIFOS_FUERA = '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } ::placeholder { color: transparent !important; } ::marker { color: transparent !important; }';

const tabla = new Map();     // fondo|color -> { n, min, ej }
const bajos = new Map();     // quien|color|fondo -> { n, min, umbral, ej }
let textosMedidos = 0; const invisibles = [];
const resumen = [];

for (const ruta of RUTAS) {
  for (const ancho of ANCHOS) {
    const ctx = await b.newContext({ viewport: { width: ancho, height: ancho < 800 ? 844 : 900 }, reducedMotion: 'reduce', hasTouch: ancho < 800 });
    await sirve(ctx);
    const p = await ctx.newPage();
    const donde = `${ruta} @${ancho}`;
    try {
      await p.goto('http://mm.test' + ruta, { waitUntil: 'load', timeout: 60000 });
      await p.evaluate(() => document.fonts.ready);
      // Recorre la pagina para que carguen las fotos diferidas, y la deja arriba y quieta.
      const alto = await p.evaluate(async () => { for (const v of document.querySelectorAll('video')) { try { v.pause(); } catch { /* nada */ } }
        const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 1500); })));
        scrollTo(0, 0); return document.documentElement.scrollHeight; });

      // 1-3 · el DOM
      const d = await p.evaluate(leeDom);
      if (d.mains !== 1) mal(`${donde}: ${d.mains} <main>; tiene que haber uno`);
      if (d.sinAlt.length) mal(`${donde}: ${d.sinAlt.length} <img> sin atributo alt — ${d.sinAlt.slice(0, 3).join(', ')}`);
      if (d.mudos.length) mal(`${donde}: ${d.mudos.length} control(es) sin nombre accesible — ${[...new Set(d.mudos)].slice(0, 4).join(' · ')}`);

      // 4 · el FAQ
      let faq = '—';
      const item = p.locator('main details').first();
      if (await item.count()) {
        const sum = item.locator('summary').first();
        await sum.scrollIntoViewIfNeeded(); await sum.click();
        const abierto = await item.evaluate((e) => e.open && [...e.children].some((c) => c.tagName !== 'SUMMARY' && c.getBoundingClientRect().height > 0));
        await sum.click();
        const cerrado = await item.evaluate((e) => !e.open);
        faq = abierto && cerrado ? 'ok' : 'ROJO';
        if (faq === 'ROJO') mal(`${donde}: el primer <details> ${abierto ? 'no se cierra' : 'no se abre o no ensena su respuesta'}`);
        await p.evaluate(() => scrollTo(0, 0));
      }

      // 5 · foco visible. Una tabulacion primero: el anillo solo se pinta en modalidad de teclado.
      await p.keyboard.press(TAB);
      const f = await p.evaluate(mideFoco);
      if (f.sin.length) mal(`${donde}: ${f.sin.length} clase(s) de control sin anillo de foco — ${f.sin.slice(0, 5).join(' · ')}`);
      await p.evaluate(() => scrollTo(0, 0));

      // 6 · contraste, a pantallazos
      let peor = null; let nRuta = 0;
      if (!SIN_CONTRASTE) {
        const vh = ancho < 800 ? 844 : 900; const paso = Math.round(vh / 2); const hechos = new Map(); const sinTinta = new Map();
        /* SIN TRANSICIONES mientras se mide. Los botones y las tarjetas llevan `transition` en el
         * color: al volver transparentes los glifos, la segunda captura los cogia A MEDIO
         * DESVANECER, y ese gris intermedio se tomaba por el respaldo. Un boton navy sobre oro
         * (8,40:1) salia a 3,91, y una cita sobre navy a 1,00. Con las transiciones quitadas el
         * cambio es instantaneo en los dos sentidos. De las animaciones solo se para la franja
         * de logos, que se mueve entre una captura y la siguiente. */
        await p.addStyleTag({ content: '*, *::before, *::after { transition: none !important; } .mm-logos-pista { animation: none !important; }' });
        await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        for (let y = 0; y < alto; y += paso) {
          await p.evaluate((yy) => scrollTo(0, yy), y);
          await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          const textos = await p.evaluate(leeTextos);
          const A = PNG.sync.read(await p.screenshot({ type: 'png' }));
          const estilo = await p.addStyleTag({ content: GLIFOS_FUERA });
          const B = PNG.sync.read(await p.screenshot({ type: 'png' }));
          await estilo.evaluate((e) => e.remove());
          const esc = A.width / ancho;
          for (const t of textos) {
            const pix = [];   // [razon, r, g, b] de cada pixel de tinta
            let tinta = 0;
            for (const [x0, y0, x1, y1] of t.cajas) {
              for (let yy = Math.floor(y0 * esc); yy < Math.min(A.height, Math.ceil(y1 * esc)); yy++) {
                for (let xx = Math.floor(x0 * esc); xx < Math.min(A.width, Math.ceil(x1 * esc)); xx++) {
                  const i = (yy * A.width + xx) * 4;
                  // Umbral BAJO a proposito: un texto casi del color de su fondo cambia muy poco al
                  // volverse transparente, y es justo el que hay que cazar. Dos capturas seguidas
                  // de una pagina quieta son identicas; lo que difiera es tinta.
                  if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) < 6) continue;
                  tinta++;
                  const bg = [B.data[i], B.data[i + 1], B.data[i + 2]];
                  const fg = t.alfa >= 0.999 ? t.color : t.color.map((c, k) => c * t.alfa + bg[k] * (1 - t.alfa));
                  pix.push([razon(fg, bg), bg[0], bg[1], bg[2]]);
                }
              }
            }
            if (tinta < 12) { if (t.texto.length > 2) sinTinta.set(t.clave, `${donde} ${t.quien} «${t.texto}»`); continue; }   // arriba, y sin tinta: se cuenta aparte
            /* EL PEOR PIXEL, SIN EL 1 % DE RUIDO. Un filete de 1 px que roza una letra, o el borde
             * redondeado de una tarjeta, dan uno o dos pixeles con otro respaldo: eso mide geometria,
             * no legibilidad (`diag-contraste.mjs` cuenta el mismo tropiezo). Se ordenan los pixeles
             * de tinta de peor a mejor y se toma el del percentil 1: el peor que no es una mota. */
            pix.sort((x, y) => x[0] - y[0]);
            const [min, ...fondo] = pix[Math.floor(pix.length * 0.01)];
            const previo = hechos.get(t.clave);
            if (!previo || min < previo.min) hechos.set(t.clave, { ...t, min, fondo });
          }
        }
        for (const k of hechos.keys()) sinTinta.delete(k);
        for (const v of sinTinta.values()) invisibles.push(v);
        for (const t of hechos.values()) {
          textosMedidos++; nRuta++;
          const fam = fondoDe(t.fondo); const col = `rgb(${t.color.join(',')})${t.alfa < 0.999 ? ` al ${Math.round(t.alfa * 100)} %` : ''}`;
          const k = `${fam}|${col}`; const c = tabla.get(k) ?? { n: 0, min: Infinity, ej: '' };
          c.n++; if (t.min < c.min) { c.min = t.min; c.ej = `${donde} ${t.quien} «${t.texto}»`; } tabla.set(k, c);
          const umbral = t.grande ? 3 : 4.5;
          if (t.min < umbral) { const kb = `${t.quien}|${col}|${fam}`; const x = bajos.get(kb) ?? { n: 0, min: Infinity, umbral, ej: '', px: t.px }; x.n++; if (t.min < x.min) { x.min = t.min; x.ej = `${donde} «${t.texto}» sobre rgb(${t.fondo.join(',')})`; } bajos.set(kb, x); }
          if (!peor || t.min < peor.min) peor = t;
        }
      }
      resumen.push(`${ruta.padEnd(52)} ${String(ancho).padStart(4)}  main ${d.mains} · img ${String(d.imgs).padStart(3)} (${d.sinAlt.length} sin alt) · controles ${String(d.controles).padStart(3)} (${d.mudos.length} mudos) · FAQ ${faq.padEnd(4)} · foco ${f.sin.length ? 'ROJO' : 'ok'} (${f.medidos} clases${f.sinModalidad ? `, ${f.sinModalidad} sin medir` : ''})${SIN_CONTRASTE ? '' : ` · contraste: ${nRuta} textos, peor ${peor ? peor.min.toFixed(2) : '—'}`}`);
    } catch (e) { mal(`${donde}: la medicion no pudo completarse — ${String(e.message ?? e).split('\n')[0].slice(0, 120)}`); }
    await ctx.close();
  }
}
await b.close();

console.log(`\n── ${RUTAS.length} ruta(s) x ${ANCHOS.join(' y ')} · ${WEBKIT ? 'WebKit' : 'Chromium'} · build de ${fs.statSync(path.join(D, 'index.html')).mtime.toISOString().slice(0, 16)}Z`);
for (const l of resumen) console.log('  ' + l);

if (!SIN_CONTRASTE) {
  console.log(`\n── contraste por el peor pixel · ${textosMedidos} textos medidos · fondo | color del texto | textos | peor razon | donde`);
  for (const [k, c] of [...tabla.entries()].sort((x, y) => x[0].localeCompare(y[0]))) {
    const [fam, col] = k.split('|');
    console.log(`  ${fam.padEnd(12)} ${col.padEnd(26)} ${String(c.n).padStart(5)}  ${c.min.toFixed(2).padStart(6)}:1  ${c.ej.slice(0, 90)}`);
  }
  console.log(`\n  --   ${invisibles.length} texto(s) que estan arriba y no dejan tinta en ningun pantallazo (transparentes, o del color exacto de su fondo)${invisibles.length ? ': ' + invisibles.slice(0, 6).join(' · ') : ''}`);
  for (const [k, x] of [...bajos.entries()].sort((a, c) => a[1].min - c[1].min)) {
    const [quien, col, fam] = k.split('|');
    mal(`contraste ${x.min.toFixed(2)}:1 < ${x.umbral}:1 — ${quien} (${x.px} px) ${col} sobre ${fam} · ${x.n} texto(s) · p. ej. ${x.ej}`);
  }
} else console.log(`\n  --   contraste: NO medido${WEBKIT ? ' en WebKit (no depende del motor; se mide en Chromium)' : ' (MM_SIN_CONTRASTE=1)'}. No cuenta como verde.`);

if (rojos.length) { console.log(''); for (const r of rojos) console.log(`  ROJO ${r}`); console.log(`\nPUERTA ROJA — ${rojos.length} hallazgo(s)\n`); process.exit(1); }
console.log(`\nPUERTA VERDE — un <main>, alt en toda imagen, todo control con nombre, FAQ operable, foco visible${SIN_CONTRASTE ? '' : ' y contraste por el peor pixel'}\n`);
