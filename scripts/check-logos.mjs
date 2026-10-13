#!/usr/bin/env node
/**
 * PUERTA · la franja de logos que desfila (E7, D-166).
 *
 *     npm run check:logos                      headless, sobre .vercel/output/static
 *     MM_MOTOR=webkit npm run check:logos      lo mismo en el motor de Safari
 *
 * DOS MITADES.
 *
 * ESTATICA, las 234 paginas: 146 llevan `.mm-logos` y ninguna la fila antigua; en cada una, la
 * lista de 14 logos y UNA copia identica con `aria-hidden`; la duracion de la vuelta es la que
 * sale de `logos-franja.mjs`.
 *
 * EN NAVEGADOR, una ruta por contexto (home, ficha, ciudad, /about, /request-estimated, estado):
 *   · VELOCIDAD a 390, 1440 y 1920: 60 px/s ± 5 %, medida leyendo el `transform` dos veces.
 *   · EL BUCLE NO SALTA: la primera lista mide exactamente la mitad de la pista, y la franja
 *     capturada al empezar la vuelta y un instante antes de cerrarla es la misma imagen.
 *   · A 1920 y a 2560: la pista cubre la ventana en todo el recorrido (ningun hueco), la ventana
 *     no se sale de su franja ni pasa del contenedor, la pagina no gana scroll horizontal, y
 *     donde el hero lleva foto al lado, la ventana acaba antes de que empiece la foto.
 *   · SE PARA con el raton encima y con el foco dentro, y vuelve a andar al salir.
 *   · `prefers-reduced-motion`: sin animacion, sin copia, y la fila se puede recorrer con scroll.
 *   · El rotulo no se mueve.
 *
 * No carga nada externo. La animacion se clava con la API de animaciones del navegador para
 * medir; no se espera por reloj mas que en la velocidad, que es justo lo que se mide.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';
import { medidaDeFranja, PX_POR_S } from '../src/lib/logos-franja.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const D = path.join(RAIZ, '.vercel/output/static');
const WEBKIT = process.env.MM_MOTOR === 'webkit';
const ESPERADAS = 146;
const RUTAS = ['/', '/services/pool-builders', '/services/pool-builders/alachua-fl', '/about', '/request-estimated', '/where-we-serve/north-florida'];
const CONTENEDOR = Number(/--mm-contenedor:\s*(\d+)px/.exec(fs.readFileSync(path.join(RAIZ, 'src/styles/disenio/tokens.css'), 'utf8'))[1]);

const rojos = [];
const ok = (cond, que, detalle = '') => { console.log(`  ${cond ? 'ok  ' : 'ROJO'} ${que}${detalle ? ' — ' + detalle : ''}`); if (!cond) rojos.push(que); return cond; };

// ── estatica ─────────────────────────────────────────────────────────────────────────────────
console.log('\n── las 234 paginas, en el HTML construido');
{
  const ficheros = [];
  (function anda(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) anda(f); else if (e.name === 'index.html') ficheros.push(f); } })(D);
  const con = []; const viejas = []; const mal = [];
  for (const f of ficheros) {
    const ruta = '/' + path.relative(D, path.dirname(f)); const t = fs.readFileSync(f, 'utf8');
    if (/mm-hero-a-logos|mm-hero-a-fila/.test(t)) viejas.push(ruta);
    const m = [...t.matchAll(/<div class="mm-logos" style="--mm-logos-dur:([\d.]+)s">([\s\S]*?)<\/div><\/div><\/div><\/div>/g)];
    if (!m.length) continue;
    con.push(ruta);
    if (m.length !== 1) { mal.push(`${ruta}: ${m.length} franjas`); continue; }
    const listas = [...m[0][2].matchAll(/<ul class="mm-logos-lista"([^>]*)>([\s\S]*?)<\/ul>/g)];
    const logos = [...(listas[0]?.[2] ?? '').matchAll(/<li style="width:\d+px"><img src="([^"]+)" alt="" width="(\d+)" height="(\d+)"/g)].map((x) => ({ src: x[1], w: +x[2], h: +x[3] }));
    if (logos.length !== 14) mal.push(`${ruta}: ${logos.length} logos`);
    if (listas.length < 2 || listas.length % 2) mal.push(`${ruta}: ${listas.length} listas; la pista necesita un numero par`);
    if (/aria-hidden/.test(listas[0]?.[1] ?? '') || listas.slice(1).some((l) => !/aria-hidden="true"/.test(l[1]))) mal.push(`${ruta}: la primera lista va oculta o una copia no lleva aria-hidden`);
    if (listas.some((l) => l[2] !== listas[0][2])) mal.push(`${ruta}: una copia no es identica a la lista`);
    if (logos.length && Math.abs(medidaDeFranja(logos).dur - Number(m[0][1])) > 0.01) mal.push(`${ruta}: la duracion ${m[0][1]} s no es la de sus logos (${medidaDeFranja(logos).dur.toFixed(2)} s)`);
    if (!/<h2 class="mm-etiqueta" id="mm-logos-t">[^<]+<\/h2>/.test(m[0][2])) mal.push(`${ruta}: sin rotulo`);
  }
  ok(con.length === ESPERADAS, `${ESPERADAS} rutas con \`.mm-logos\``, `hay ${con.length}`);
  ok(viejas.length === 0, 'ninguna con la fila antigua', viejas.slice(0, 3).join(', '));
  ok(mal.length === 0, '14 logos, su copia identica con aria-hidden, rotulo y duracion calculada, en todas', mal.slice(0, 3).join(' · '));
}

// ── en navegador ─────────────────────────────────────────────────────────────────────────────
const b = await (WEBKIT ? webkit : chromium).launch();
const abre = async (ruta, ancho, opciones = {}) => {
  const ctx = await b.newContext({ viewport: { width: ancho, height: ancho < 800 ? 844 : 1000 }, ...opciones });
  await ctx.route('**/*', (x) => {
    const u = new URL(x.request().url());
    if (u.hostname !== 'mm.test' || x.request().method() !== 'GET') return x.abort();
    let f = path.join(D, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    return fs.existsSync(f) ? x.fulfill({ path: f }) : x.fulfill({ status: 404, body: '' });
  });
  const p = await ctx.newPage();
  await p.goto('http://mm.test' + ruta, { waitUntil: 'load' });
  // Las fotos de los logos, cargadas todas antes de medir: una imagen que entra tarde no es un salto.
  await p.evaluate(async () => { const l = document.querySelector('.mm-logos'); l.scrollIntoView({ block: 'center' }); for (const i of l.querySelectorAll('img')) i.loading = 'eager';
    await Promise.all([...l.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })))); });
  return { ctx, p };
};
const tx = (p) => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mm-logos-pista')).transform).m41);
const clava = (p, ms) => p.evaluate(async (t) => { for (const a of document.querySelector('.mm-logos-pista').getAnimations()) { a.pause(); a.currentTime = t; } await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, ms);
const geo = (p) => p.evaluate(() => {
  const q = (s) => document.querySelector(s)?.getBoundingClientRect(); const f = q('.mm-logos'); const v = q('.mm-logos-vista'); const pi = q('.mm-logos-pista'); const foto = q('.mm-hero-a-medio'); const t = q('.mm-logos .mm-etiqueta');
  const r = (x) => (x ? { l: x.left, r: x.right, t: x.top, b: x.bottom, w: x.width } : null);
  return { franja: r(f), vista: r(v), pista: r(pi), foto: r(foto), rotulo: r(t), lista: document.querySelector('.mm-logos-lista').getBoundingClientRect().width, pistaAncho: document.querySelector('.mm-logos-pista').scrollWidth,
    scrollX: document.documentElement.scrollWidth - innerWidth, dur: parseFloat(getComputedStyle(document.querySelector('.mm-logos-pista')).animationDuration) };
});
const igual = (a, c) => { const A = PNG.sync.read(a); const C = PNG.sync.read(c); if (A.width !== C.width || A.height !== C.height) return 1; let n = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - C.data[i]) + Math.abs(A.data[i + 1] - C.data[i + 1]) + Math.abs(A.data[i + 2] - C.data[i + 2]) > 24) n++; return n / (A.data.length / 4); };

for (const ruta of RUTAS) {
  console.log(`\n── ${ruta} · ${WEBKIT ? 'WebKit' : 'Chromium'}`);
  // velocidad y bucle
  for (const ancho of [390, 1440, 1920]) {
    const { ctx, p } = await abre(ruta, ancho);
    // El reloj y la posicion se leen JUNTOS, dentro de la pagina y del MISMO fotograma: la posicion
    // que devuelve el navegador es la del ultimo fotograma pintado, asi que el reloj tiene que ser
    // el de ese fotograma (`document.timeline`), no el de pared. Con el reloj de fuera, o con
    // `performance.now()`, una pagina que carga —la home, con su video— salia un 6 % lenta en falso.
    const { x0, x1, dt } = await p.evaluate(async () => { const pi = document.querySelector('.mm-logos-pista'); const lee = () => [new DOMMatrixReadOnly(getComputedStyle(pi).transform).m41, document.timeline.currentTime];
      const [a, ta] = lee(); await new Promise((r) => setTimeout(r, 2000)); const [c, tc] = lee(); return { x0: a, x1: c, dt: (tc - ta) / 1000 }; });
    const g = await geo(p);
    // Si en esos dos segundos se cerro una vuelta, el transform ha vuelto atras: se le suma la vuelta.
    const recorrido = x0 - x1 < 0 ? x0 - x1 + g.pistaAncho / 2 : x0 - x1; const v = recorrido / dt;
    ok(Math.abs(v - PX_POR_S) <= PX_POR_S * 0.05, `@${ancho} velocidad ${PX_POR_S} px/s ± 5 %`, `${v.toFixed(1)} px/s · vuelta de ${g.dur.toFixed(2)} s y ${(g.pistaAncho / 2).toFixed(0)} px`);
    if (ancho === 1440) {
      ok(Math.abs(g.lista * 2 - g.pistaAncho) < 1, 'la primera lista mide exactamente la mitad de la pista', `${g.lista.toFixed(2)} × 2 frente a ${g.pistaAncho}`);
      const vista = p.locator('.mm-logos-vista');
      await clava(p, 0); const a = await vista.screenshot({ type: 'png' });
      await clava(p, g.dur * 1000 - 0.05); const c = await vista.screenshot({ type: 'png' });
      const dif = igual(a, c);
      ok(dif < 0.002, 'al cerrar la vuelta se ve lo mismo que al empezarla (sin salto)', `${(dif * 100).toFixed(3)} % de pixeles distintos`);
      await clava(p, 4000); const r0 = (await geo(p)).rotulo; await clava(p, 19000); const r1 = (await geo(p)).rotulo;
      ok(r0.l === r1.l && r0.t === r1.t, 'el rotulo no se mueve');
    }
    await ctx.close();
  }
  // sin huecos, sin desborde, sin pasar bajo la foto
  for (const ancho of [1920, 2560]) {
    const { ctx, p } = await abre(ruta, ancho);
    let hueco = 0; let g;
    for (const fase of [0, 0.25, 0.5, 0.75, 0.9999]) { await clava(p, (await geo(p)).dur * 1000 * fase); g = await geo(p); if (g.pista.l > g.vista.l + 0.5 || g.pista.r < g.vista.r - 0.5) hueco++; }
    ok(hueco === 0, `@${ancho} la pista cubre la ventana en todo el recorrido (ningun hueco)`, `ventana de ${Math.round(g.vista.w)} px, vuelta de ${Math.round(g.pistaAncho / 2)} px`);
    ok(g.vista.l >= g.franja.l - 0.5 && g.vista.r <= g.franja.r + 0.5 && g.vista.w <= CONTENEDOR + 1 && g.scrollX <= 0, `@${ancho} la ventana no sale de su franja, no pasa del contenedor (${CONTENEDOR} px) y la pagina no gana scroll horizontal`, `ventana [${Math.round(g.vista.l)}, ${Math.round(g.vista.r)}], franja [${Math.round(g.franja.l)}, ${Math.round(g.franja.r)}], scroll de mas ${g.scrollX}`);
    if (g.foto && g.foto.l > g.vista.l + 50) ok(g.vista.r <= g.foto.l, `@${ancho} la ventana acaba antes de que empiece la foto`, `ventana hasta ${Math.round(g.vista.r)}, foto desde ${Math.round(g.foto.l)}`);
    await ctx.close();
  }
  // se para y vuelve a andar
  {
    const { ctx, p } = await abre(ruta, 1440);
    const anda = async () => { const a = await tx(p); await p.waitForTimeout(350); return Math.abs((await tx(p)) - a) > 5; };
    const v = await p.locator('.mm-logos-vista').boundingBox();
    const antes = await anda();
    await p.mouse.move(v.x + v.width / 2, v.y + v.height / 2); await p.waitForTimeout(80); const conRaton = await anda();
    await p.mouse.move(5, 5); await p.waitForTimeout(80); const alSalir = await anda();
    ok(antes && !conRaton && alSalir, 'se para con el raton encima y sigue al salir', `anda ${antes} · con el raton ${conRaton} · al salir ${alSalir}`);
    // El anillo se MIRA, no solo se lee: se captura el marco de la ventana sin foco y con foco de
    // teclado, y tiene que cambiar. Una mascara puesta en la propia ventana se comia el contorno
    // y el `outline` calculado seguia diciendo «2 px». Se llega CON EL TECLADO —se enfoca lo que
    // va justo antes y se tabula—, porque un foco puesto por programa no siempre pinta anillo.
    const marco = async () => { const q = await p.locator('.mm-logos-vista').boundingBox(); return p.screenshot({ type: 'png', clip: { x: q.x - 6, y: q.y - 6, width: q.width + 12, height: q.height + 12 } }); };
    // (El marco queda fuera de la ventana: lo que se mueve dentro no entra en la comparacion. Y no
    // se para la animacion con la API: un `play()` posterior anularia la pausa del CSS que se mide.)
    const sinAnillo = await marco();
    await p.evaluate(() => { const v = document.querySelector('.mm-logos-vista');
      const tab = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex="0"]')].filter((e) => !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert], dialog:not([open]), details:not([open]) > :not(summary)'));
      const k = tab.indexOf(v); if (k > 0) tab[k - 1].focus(); });
    await p.keyboard.press(WEBKIT ? 'Alt+Tab' : 'Tab');
    const llego = await p.evaluate(() => document.activeElement === document.querySelector('.mm-logos-vista'));
    ok(llego, 'la ventana es una parada de tabulacion: se llega a ella con el teclado');
    await p.waitForTimeout(120);
    const conAnillo = await marco();
    { const A = PNG.sync.read(sinAnillo); const C = PNG.sync.read(conAnillo); let borde = 0;
      for (let y = 0; y < Math.min(A.height, C.height); y++) for (let x = 0; x < Math.min(A.width, C.width); x++) { if (x > 5 && x < A.width - 6 && y > 5 && y < A.height - 6) continue; const k = (y * A.width + x) * 4; const c = (y * C.width + x) * 4; if (Math.abs(A.data[k] - C.data[c]) + Math.abs(A.data[k + 1] - C.data[c + 1]) + Math.abs(A.data[k + 2] - C.data[c + 2]) > 60) borde++; }
      ok(borde > (A.width + A.height) * 2, 'con foco de teclado se VE un anillo alrededor de la ventana', `${borde} pixeles del marco cambian`); }
    const conFoco = await anda();
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(80); const sinFoco = await anda();
    ok(!conFoco && sinFoco, 'se para con el foco dentro y sigue al perderlo', `con el foco ${conFoco} · sin el ${sinFoco}`);
    await ctx.close();
  }
  // movimiento reducido
  {
    const { ctx, p } = await abre(ruta, 390, { reducedMotion: 'reduce' });
    const r = await p.evaluate(async () => { const pi = document.querySelector('.mm-logos-pista'); const v = document.querySelector('.mm-logos-vista'); const a = new DOMMatrixReadOnly(getComputedStyle(pi).transform).m41; await new Promise((x) => setTimeout(x, 300));
      const copias = [...document.querySelectorAll('.mm-logos-lista[aria-hidden="true"]')]; v.scrollLeft = 200;
      return { quieta: new DOMMatrixReadOnly(getComputedStyle(pi).transform).m41 === a, animacion: getComputedStyle(pi).animationName, copiasVisibles: copias.filter((c) => getComputedStyle(c).display !== 'none').length, rebosa: v.scrollWidth > v.clientWidth, desplaza: v.scrollLeft > 0, mascara: getComputedStyle(document.querySelector('.mm-logos-marco')).maskImage || getComputedStyle(document.querySelector('.mm-logos-marco')).webkitMaskImage }; });
    ok(r.quieta && r.animacion === 'none' && r.copiasVisibles === 0 && r.rebosa && r.desplaza && r.mascara === 'none', '`prefers-reduced-motion`: quieta, sin copia, sin mascara y con scroll', JSON.stringify(r));
    await ctx.close();
  }
}
await b.close();

if (rojos.length) { console.log(`\nPUERTA ROJA — ${rojos.length} comprobacion(es)\n`); process.exit(1); }
console.log('\nPUERTA VERDE — la franja desfila a 60 px/s, sin salto, sin huecos, se para y respeta el movimiento reducido\n');
