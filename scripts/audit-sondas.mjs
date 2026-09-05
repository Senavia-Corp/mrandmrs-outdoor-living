#!/usr/bin/env node
/**
 * SONDA DE AUDITORIA — lo que ninguna de las 15 puertas mide.
 *
 *     node scripts/audit-sondas.mjs              # las 122 rutas x 6 anchos
 *     node scripts/audit-sondas.mjs '/services/' # acotada por subcadena
 *     node scripts/audit-sondas.mjs '=/'         # coincidencia EXACTA (la home)
 *
 * POR QUE EXISTE. Las puertas del repo defienden la PARIDAD (pixeles, texto, head, assets) a
 * los 4 anchos de Webflow. Nadie mide el comportamiento: si algo desborda, si se puede tocar
 * con el dedo, si el texto se lee sobre su fondo, si la consola grita o si una peticion se cae.
 * Y ninguna toca 375 / 390 / 768 / 1280, que es donde vive el trafico real.
 *
 * HEADLESS A PROPOSITO. No compara pixeles contra ninguna referencia, asi que no la ata la
 * receta congelada de `lib/captura.mjs` (`headless:false`, foco de ventana). Puede correr en
 * segundo plano sin secuestrar la pantalla, que es justo lo que `CLAUDE.md` §1 pide evitar.
 *
 * SIRVE POR HTTP, no por `file://`: el sitio usa rutas absolutas (`/_astro/...`, `/videos/...`)
 * y bajo `file://` ninguna resuelve — se mediria una pagina sin CSS y todo saldria «roto».
 * El servidor es el mismo de `check-visual.mjs:141`.
 *
 * NO ES UNA PUERTA. Sale siempre 0 e imprime un informe: su trabajo es levantar hallazgos para
 * el triage, no bloquear un build. Quien decide la severidad es el humano.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ARGS_NAVEGADOR } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const SALIDA = path.join(RAIZ, 'audit');
if (!fs.existsSync(ESTATICO)) { console.error('\nfalta .vercel/output/static — construye primero\n'); process.exit(1); }

/** Los 6 de la mision. Los 4 de las puertas (479/991/1440/1920) NO se repiten aqui. */
const ANCHOS = [[375, 812], [390, 844], [768, 1024], [1280, 800], [1440, 900], [1920, 1080]];

/** Filtro de argv. `=/ruta` es coincidencia exacta — `/` a secas se llevaria las 122. */
const arg = process.argv[2];
const casa = (r) => !arg || (arg.startsWith('=') ? r === arg.slice(1) : r.includes(arg));

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

/** Lo que se pide a internet y no al banco de pruebas. Abortan siempre aqui: no son fallos. */
const TERCEROS = /googletagmanager|google-analytics|doubleclick|googleadservices|facebook|elfsight|challenges\.cloudflare|gstatic|fonts\.googleapis|clarity\.ms|hotjar|youtube|ytimg|instagram/;
const externa = (u) => !u.startsWith(BASE) || TERCEROS.test(u);

/** Las rutas SON el build: 122 ficheros HTML. No se derivan de routes.csv, que solo tiene 115. */
const rutasDe = (d, a = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) rutasDe(p, a);
    else if (e.name.endsWith('.html')) {
      const r = '/' + path.relative(ESTATICO, p).replace(/\.html$/, '').replace(/(^|\/)index$/, '');
      a.push(r === '' ? '/' : r);
    }
  }
  return a;
};
const RUTAS = rutasDe(ESTATICO).sort().filter(casa);
if (!RUTAS.length) { console.error(`\nel filtro ${JSON.stringify(arg)} no casa con ninguna ruta\n`); process.exit(1); }

/**
 * LA SONDA, que corre DENTRO de la pagina. Todo lo que mide sale de geometria pintada y de
 * estilo computado: nada de heuristicas sobre el marcado.
 */
const SONDA = () => {
  const vw = document.documentElement.clientWidth;
  /**
   * VISIBLE DE VERDAD, ancestros incluidos.
   *
   * La primera version solo miraba el elemento. En la home, `.svc-cuerpo` es un panel plegado
   * con `opacity:0` cuyos hijos SI tienen tamaño y estilo propio: cada uno pasaba por visible,
   * y la sonda reportaba 94 objetivos tactiles y 2 contrastes de 1:1 que nadie puede ver.
   * Medido en `/` a 375 y corregido ANTES de barrer — 28 fichas x 122 rutas habrian sido
   * miles de hallazgos falsos, y un informe con ruido no lo lee nadie.
   */
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      /**
       * RECORTADO POR UN ANCESTRO = NO PINTADO.
       *
       * `div.mm-yt__desc` de /videos recorta la descripcion a 105 px con `overflow:hidden`.
       * El texto que sobra sigue teniendo caja, y esa caja cae sobre la tarjeta de al lado:
       * la sonda cantaba un solape que NADIE ve. Sin esta comprobacion eran 146 falsos
       * positivos de solape, ademas de tactiles y contrastes de texto ya recortado.
       * Solo se descarta cuando NO queda interseccion: un parrafo medio recortado sigue
       * medio a la vista, y ahi el hallazgo si valdria.
       */
      if (n !== el && getComputedStyle(n).overflow !== 'visible') {
        const c = n.getBoundingClientRect();
        if (Math.min(r.right, c.right) - Math.max(r.left, c.left) <= 0
          || Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) <= 0) return false;
      }
    }
    return true;
  };

  // ── 1. desbordamiento horizontal, y QUIEN lo causa
  const de = document.documentElement;
  const desborde = de.scrollWidth - de.clientWidth;
  const culpables = [];
  if (desborde > 1) {
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        // solo el mas externo de cada cadena: si el padre ya desborda, el hijo es consecuencia
        if (culpables.some((c) => c.el.contains(el))) continue;
        culpables.push({ el, sel: sel(el), right: Math.round(r.right), left: Math.round(r.left),
          w: Math.round(r.width) });
      }
    }
  }

  function sel(el) {
    const id = el.id ? `#${el.id}` : '';
    const cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  }

  // ── 2. objetivos tactiles < 44 px
  const SEL_TACTIL = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [onclick]';
  const tactiles = [];
  /**
   * EL OBJETIVO ES LA ETIQUETA, NO LA CASILLA.
   *
   * WCAG 2.2 2.5.8 mide el area que ACTIVA el control. En un `<label>` que envuelve un
   * `<input>` —o que lo apunta con `for`— pulsar la etiqueta entera conmuta la casilla, asi
   * que el objetivo es la etiqueta. Midiendo el `<input>` a secas salian 204 falsos:
   *
   *   /brochures ......... input 13x13 `position:absolute` (la casilla nativa que Webflow
   *                        esconde bajo su casilla dibujada) — label **157x44**
   *   /pool-cost-estimator input 16x16 — label **293x172**, la tarjeta entera
   *   /contact-us .......  input 24x24 — label 279x44, ya cumplia
   *
   * Ninguno era un fallo. Se mide la etiqueta cuando existe, que es lo que toca el dedo.
   */
  const objetivo = (el) => {
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return el.getBoundingClientRect();
    const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
    if (!lab) return el.getBoundingClientRect();
    const a = el.getBoundingClientRect(), b = lab.getBoundingClientRect();
    return b.width * b.height >= a.width * a.height ? b : a;
  };

  for (const el of document.querySelectorAll(SEL_TACTIL)) {
    if (!visible(el)) continue;
    const r = objetivo(el);
    if (r.width >= 44 && r.height >= 44) continue;
    /**
     * DOS CUBOS, y la diferencia importa.
     *   control -> boton, campo, o enlace pintado COMO boton (display no inline). Es el
     *             hallazgo accionable: un CTA de 36 px de alto se falla con el pulgar.
     *   enlace  -> enlace de texto en linea o en lista de navegacion. WCAG 2.2 2.5.8 los
     *             exime en texto corrido, y ademas se arreglan con espaciado, no agrandando
     *             la caja. Se cuentan aparte para que no entierren a los otros.
     */
    const disp = getComputedStyle(el).display;
    const control = el.tagName !== 'A' || !disp.startsWith('inline') || el.getAttribute('role') === 'button';
    tactiles.push({ sel: sel(el), w: Math.round(r.width), h: Math.round(r.height),
      texto: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      tipo: control ? 'control' : 'enlace' });
  }

  // ── 3. contraste real: color computado contra el fondo PINTADO que hay debajo
  /**
   * SOLO rgb()/rgba(). Lo que no sepa leer, NO lo evalua.
   *
   * La primera version sacaba los numeros con `/[\d.]+/g` sin mirar la funcion de color.
   * `oklch(0.446 0.043 257.281)` —los tokens shadcn muertos que quedan en `estimador.css`—
   * se leia como rgb(0.446, 0.043, 257.281) y salia un fondo azul puro inventado: 36
   * hallazgos de contraste de 1.05:1 en el estimador donde «Step 1 of 7» se lee perfecto.
   * Verificado con captura antes de tocar nada. Un numero inventado es peor que ninguno.
   */
  /**
   * COLORES QUE SE SABEN LEER, Y NADA MAS.
   *
   * Dos versiones anteriores fallaron aqui, las dos verificadas con captura antes de creerselas:
   *   1. `/[\\d.]+/g` a pelo leia `oklch(0.446 0.043 257.281)` como rgb(0.4, 0.04, 257) e
   *      inventaba un fondo azul: 36 contrastes falsos en el estimador, donde «Step 1 of 7»
   *      se lee perfecto.
   *   2. Exigir `rgb()` dejaba fuera `color(srgb 0 0 0 / 0.8)` —la placa de la insignia de
   *      duracion de /videos—, asi que la sonda comparaba el blanco del texto contra el fondo
   *      claro de la tarjeta: 48 contrastes de 1.09:1 sobre una placa negra bien visible.
   *
   * Ahora entran `rgb()/rgba()` y `color(srgb ...)`, con canales en 0-1 o 0-255 y alfa en
   * fraccion o porcentaje. Lo demas devuelve null y NO se evalua: sin fondo no hay veredicto,
   * y eso es preferible a un numero inventado.
   */
  const aRgb = (c) => {
    const num = (x, esc) => {
      if (typeof x !== 'string') return NaN;
      const v = parseFloat(x);
      if (!Number.isFinite(v)) return NaN;
      return x.trim().endsWith('%') ? v / 100 * esc : v;
    };
    let m = /^rgba?\(([^)]+)\)/.exec(c);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      const r = num(p[0], 255), g = num(p[1], 255), b = num(p[2], 255);
      const a = p[3] === undefined ? 1 : num(p[3], 1);
      return [r, g, b].some(Number.isNaN) || Number.isNaN(a) ? null : { r, g, b, a };
    }
    m = /^color\(srgb ([^)]+)\)/.exec(c);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean);
      const r = num(p[0], 1), g = num(p[1], 1), b = num(p[2], 1);
      const a = p[3] === undefined ? 1 : num(p[3], 1);
      // los canales de color(srgb ...) van en 0-1
      return [r, g, b].some(Number.isNaN) || Number.isNaN(a)
        ? null : { r: r * 255, g: g * 255, b: b * 255, a };
    }
    return null;
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const mezcla = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a) });

  const contraste = [];
  for (const el of document.querySelectorAll('body *')) {
    // solo nodos con texto PROPIO, no contenedores que heredan el de sus hijos
    const propio = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).
      map((n) => n.textContent.trim()).join(' ');
    if (!propio || propio.length < 2) continue;
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const fg = aRgb(s.color); if (!fg) continue;

    /**
     * FONDO EFECTIVO, COMPONIENDO LAS CAPAS SEMITRANSPARENTES.
     *
     * La primera version exigia `a > 0.95` y si no, seguia subiendo. Una placa de
     * `rgba(0,0,0,.7)` —el patron de la insignia de duracion del video, y de media web— se
     * saltaba entera: la sonda comparaba el texto BLANCO contra el blanco del contenedor de
     * mas arriba y cantaba 1.09:1 en 48 sitios donde en realidad se lee perfectamente.
     *
     * Ahora las capas se apilan de dentro a fuera y se componen sobre la primera opaca, que
     * es lo que hace el navegador al pintar.
     */
    let bg = null, sobreImagen = false, n = el;
    const capas = [];
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') { sobreImagen = true; break; }
      const c = aRgb(cs.backgroundColor);
      if (c && c.a > 0) {
        if (c.a >= 0.999) { bg = c; break; }
        capas.push(c);
      }
      n = n.parentElement;
    }
    if (bg) for (let i = capas.length - 1; i >= 0; i--) bg = mezcla(capas[i], bg);
    if (sobreImagen || !bg) {
      if (sobreImagen) contraste.push({ sel: sel(el), texto: propio.slice(0, 40), sobreImagen: true });
      continue;
    }
    const px = parseFloat(s.fontSize);
    const grande = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    const r = ratio(mezcla(fg, bg), bg);
    const min = grande ? 3 : 4.5;
    if (r < min) contraste.push({ sel: sel(el), texto: propio.slice(0, 40), ratio: +r.toFixed(2),
      min, px: Math.round(px), color: s.color, fondo: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
  }

  // ── 4. solapes ENTRE TEXTOS (dos hojas de texto pisandose: eso si es un defecto)
  /**
   * SOLO BLOQUES. `getBoundingClientRect()` de un elemento EN LINEA que ocupa varias lineas
   * devuelve la union de todas: dos `<strong>` del mismo parrafo dan cajas que se cruzan sin
   * que se pise un solo pixel. Eran 251 de los 397 «solapes» de la primera pasada.
   * Un solape que importa es entre dos cajas de bloque.
   */
  const hojas = [...document.querySelectorAll('body *')].filter((el) => {
    if (!visible(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (cs.display.startsWith('inline') && cs.display !== 'inline-block') return false;
    if (cs.float !== 'none') return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
      && !el.querySelector('*');
  });
  /** El rect RECORTADO por los ancestros que cortan. Es la caja que de verdad se pinta. */
  const rectVisto = (el) => {
    let r = el.getBoundingClientRect();
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let n = el.parentElement; n && n.nodeType === 1; n = n.parentElement) {
      if (getComputedStyle(n).overflow === 'visible') continue;
      const c = n.getBoundingClientRect();
      x1 = Math.max(x1, c.left); y1 = Math.max(y1, c.top);
      x2 = Math.min(x2, c.right); y2 = Math.min(y2, c.bottom);
    }
    return { left: x1, top: y1, right: x2, bottom: y2 };
  };

  const solapes = [];
  for (let i = 0; i < hojas.length && solapes.length < 12; i++) {
    for (let j = i + 1; j < hojas.length && solapes.length < 12; j++) {
      const a = rectVisto(hojas[i]), b = rectVisto(hojas[j]);
      const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ov > 2 && oh > 2) solapes.push({ a: sel(hojas[i]), b: sel(hojas[j]),
        px: Math.round(ov * oh), ta: hojas[i].textContent.trim().slice(0, 25),
        tb: hojas[j].textContent.trim().slice(0, 25) });
    }
  }

  // ── 5. imagenes sin width/height (CLS) y sin loading
  const imgs = [...document.images].filter((i) => visible(i));
  const sinDim = imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height'))
    .map((i) => ({ src: (i.currentSrc || i.src).split('/').pop().slice(0, 50), sel: sel(i) }));
  const rotas = imgs.filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => (i.currentSrc || i.src).slice(-70));

  return { desborde, culpables: culpables.map(({ el, ...c }) => c).slice(0, 6),
    tactiles, contraste: contraste.slice(0, 40), solapes, sinDim: sinDim.slice(0, 10), rotas };
};

// ─────────────────────────────────────────────────────────────────────────────
const nav = await chromium.launch({ headless: true, args: ARGS_NAVEGADOR });
const informe = { generado: new Date().toISOString(), anchos: ANCHOS.map(([w]) => w), rutas: {} };
let n = 0;
const t0 = Date.now();

for (const [ancho, alto] of ANCHOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  console.log(`\n── ${ancho}x${alto} · ${RUTAS.length} rutas`);

  for (const ruta of RUTAS) {
    const consola = [], red = [], terceros = [];
    const onErr = (e) => consola.push(`pageerror: ${String(e).slice(0, 160)}`);
    const onCon = (m) => { if (m.type() === 'error') consola.push(`console.error: ${m.text().slice(0, 160)}`); };
    /**
     * TERCEROS APARTE. GTM, Analytics, Turnstile y Elfsight se piden a internet; contra este
     * servidor local abortan SIEMPRE. Meterlos en la misma lista que un 404 propio convierte
     * la señal en ruido — pero tampoco se tiran: se cuentan, para no esconder nada.
     */
    const onFail = (r) => (externa(r.url()) ? terceros : red)
      .push(`FALLO ${r.failure()?.errorText ?? '?'} ${r.url().slice(-70)}`);
    const onRes = (r) => { if (r.status() >= 400) (externa(r.url()) ? terceros : red)
      .push(`HTTP ${r.status()} ${r.url().slice(-70)}`); };
    pag.on('pageerror', onErr); pag.on('console', onCon);
    pag.on('requestfailed', onFail); pag.on('response', onRes);

    let r;
    try {
      await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 45000 });
      await pag.waitForTimeout(400);          // que asiente el layout tras las fuentes
      r = await pag.evaluate(SONDA);
    } catch (e) {
      r = { error: String(e).slice(0, 200), desborde: 0, culpables: [], tactiles: [],
        contraste: [], solapes: [], sinDim: [], rotas: [] };
    }
    pag.off('pageerror', onErr); pag.off('console', onCon);
    pag.off('requestfailed', onFail); pag.off('response', onRes);

    r.consola = consola; r.red = red; r.terceros = terceros;
    (informe.rutas[ruta] ??= {})[ancho] = r;

    const t = r.tactiles.filter((x) => x.tipo === 'control').length;
    const tl = r.tactiles.filter((x) => x.tipo === 'enlace').length;
    const c = r.contraste.filter((x) => x.ratio !== undefined).length;
    const señal = [r.desborde > 1 && `desborde ${r.desborde}px`, t && `${t} control<44`,
      tl && `${tl} enlace<44`,
      c && `${c} contraste`, r.solapes.length && `${r.solapes.length} solape`,
      r.rotas.length && `${r.rotas.length} img rota`, consola.length && `${consola.length} consola`,
      red.length && `${red.length} red`, r.error && 'ERROR'].filter(Boolean).join(' · ');
    if (señal) console.log(`  ${ruta.padEnd(58).slice(0, 58)} ${señal}`);
    n++;
  }
  await ctx.close();
}
await nav.close();
servidor.close();

fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, 'sondas.json'), JSON.stringify(informe, null, 1));
console.log(`\n${n} mediciones (${RUTAS.length} rutas x ${ANCHOS.length} anchos) en ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(`informe: audit/sondas.json\n`);
