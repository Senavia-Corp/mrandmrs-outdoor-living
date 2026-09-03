#!/usr/bin/env node
/**
 * PUERTA de la galería — que las 433 anclas de lightbox ABRAN algo, y que se puedan usar.
 *
 *     npm run check:galeria
 *
 * NACE DE UN DIAGNÓSTICO EQUIVOCADO, y ese es justo el motivo de existir.
 *
 * Una auditoría dio por muertas las 433 anclas «porque `Interacciones.astro` no implementa
 * `w-lightbox`». Y es verdad que no lo implementa: lo implementa `Componentes.astro`. La
 * auditoría dedujo la ausencia de una implementación de NO ENCONTRARLA DONDE ESPERABA, en vez
 * de probar el comportamiento. Al probarlo, el lightbox abría perfectamente en las 35 páginas.
 *
 * Esta puerta existe para que esa pregunta no se vuelva a contestar leyendo: la contesta
 * ABRIENDO. Y de paso vigila lo que sí estaba roto de verdad y nadie había medido — los
 * botones de Anterior/Siguiente a 40×40 en móvil, por debajo del suelo táctil de 44.
 *
 * Acota con un argumento si sólo quieres una ruta:  npm run check:galeria -- /gallery
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

/** WCAG 2.2 AA, 2.5.8 Target Size (Minimum). */
const MINIMO_TACTIL = 44;

// ════════════════════════════════════════════════════════════════════════════
// 1 · ESTÁTICA — ninguna ancla se queda sin implementación ni sin datos
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. las anclas y su implementacion (estatico, sobre lo desplegado)');

const paginas = [];
(function barrer(d, base = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) barrer(path.join(d, e.name), `${base}/${e.name}`);
    else if (e.name === 'index.html') paginas.push([base || '/', path.join(d, e.name)]);
    else if (e.name.endsWith('.html')) paginas.push([`${base}/${e.name.replace(/\.html$/, '')}`, path.join(d, e.name)]);
  }
}(ESTATICO));

const sinImplementacion = [], sinJson = [], jsonMalo = [], sinAlt = [];
const clases = new Map();
let anclas = 0, conAnclas = 0;

for (const [ruta, fichero] of paginas) {
  const html = fs.readFileSync(fichero, 'utf8');
  const trozos = [...html.matchAll(/<a[^>]*class="([^"]*\bw-lightbox\b[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
  if (!trozos.length) continue;
  conAnclas++;
  anclas += trozos.length;

  // La implementacion tiene que viajar CON la pagina: el dialogo y el guion que lo abre.
  const hayDialogo = html.includes('class="mm-lb"');
  const hayGuion = html.includes('a.w-lightbox');
  if (!hayDialogo || !hayGuion) {
    sinImplementacion.push(`${ruta} (${trozos.length} anclas) dialogo=${hayDialogo} guion=${hayGuion}`);
  }

  for (const [, cls, dentro] of trozos) {
    const clave = cls.split(/\s+/).find((c) => c !== 'w-inline-block' && c !== 'w-lightbox') || '(sin clase)';
    clases.set(clave, (clases.get(clave) ?? 0) + 1);
    const m = /<script type="application\/json" class="w-json">([\s\S]*?)<\/script>/.exec(dentro);
    if (!m) { sinJson.push(`${ruta} ${clave}`); continue; }
    try {
      const j = JSON.parse(m[1]);
      if (!Array.isArray(j.items) || !j.items.length || !j.items.every((i) => i.url)) {
        jsonMalo.push(`${ruta} ${clave} items=${JSON.stringify(j.items).slice(0, 60)}`);
      }
    } catch { jsonMalo.push(`${ruta} ${clave} JSON invalido`); }
    // El nombre accesible del enlace sale del `alt` de su imagen. Sin `alt`, el lector
    // anuncia la URL del fichero.
    const alt = /<img[^>]*\salt="([^"]*)"/.exec(dentro);
    if (!alt || !alt[1].trim()) sinAlt.push(`${ruta} ${clave}`);
  }
}

console.log(`     ${anclas} anclas en ${conAnclas} paginas — ${[...clases].map(([c, n]) => `${c}:${n}`).join(', ')}`);
check('todas las paginas con anclas embarcan el dialogo Y el guion', sinImplementacion.length === 0, `${sinImplementacion.length} sin`);
lista(sinImplementacion);
check('todas las anclas llevan su w-json', sinJson.length === 0, `${sinJson.length} sin`);
lista(sinJson);
check('todos los w-json traen al menos un item con url', jsonMalo.length === 0, `${jsonMalo.length} malos`);
lista(jsonMalo);
// El nombre accesible NO se puede juzgar aqui: 59 anclas traen `alt=""` del origen y quien
// las nombra es el guion, en tiempo de ejecucion. Medirlo sobre el HTML servido daria una
// puerta ciega a su propio arreglo — el mismo fallo que ya costo una version de check:menu.
// Aqui solo se DECLARA cuantas dependen de esa etiqueta; quien las juzga es la parte 2.
console.log(`     ${sinAlt.length} anclas llegan con alt="" y dependen del aria-label del guion`);

// ════════════════════════════════════════════════════════════════════════════
// 2 · COMPORTAMIENTO — se abre, se navega, se cierra
// ════════════════════════════════════════════════════════════════════════════
const filtro = process.argv[2];
/** Una ruta por CLASE de ancla: son tres marcados distintos, no tres copias del mismo. */
// /gallery salio de la muestra: sus 137 gallery-picture ya no abren dialog.mm-lb -las excluye
// el guard de Componentes.astro (a.closest('.gallery-page'))-, las abre el lightbox partido de
// GalleryLeadLightbox.astro/.mm-lbx en su lugar. Cubierto por check-galeria-formulario.mjs.
const MUESTRA = filtro ? [filtro] : [
  '/country/custom-pool-builders-alachua-county-fl',             // lightbox-link, grupo «images»
  '/project/luxury-pool-spa-screen-enclosure-north-florida',     // lightbox-link-2, grupo «Gallery»
];
const ANCHOS = [[390, 844], [1440, 900]];

console.log(`\n── 2. el lightbox, abriendolo de verdad (${MUESTRA.length} rutas x ${ANCHOS.length} anchos)`);
console.log('     MUESTREO DECLARADO: una ruta por clase de ancla. El dialogo es UNO y compartido,');
console.log('     asi que lo que cambia entre paginas es el marcado del ancla, no el visor.');

const PUERTO = 4742;
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
const mal = { noAbre: [], salto: [], chicos: [], noPasa: [], noCierraEsc: [], noCierraVelo: [], foco: [], mudas: [] };
let nombradas = 0;
let medidas = 0;

for (const [ancho, alto] of ANCHOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, hasTouch: ancho < 800, isMobile: ancho < 800 });
  for (const ruta of MUESTRA) {
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
    const a = await p.$('a.w-lightbox');
    if (!a) { mal.noAbre.push(`${ruta} @${ancho} no hay ninguna ancla`); await p.close(); continue; }

    // Situar PRIMERO y medir el scroll DESPUES: si se apunta antes, el desplazamiento de la
    // propia sonda se cuenta como salto de la pagina. Aqui costo un falso positivo de 1858 px.
    await a.scrollIntoViewIfNeeded();
    await p.waitForFunction(() => true);
    const y0 = await p.evaluate(() => window.scrollY);

    if (ancho < 800) await a.tap(); else await a.click();
    let abrio = true;
    try {
      await p.waitForFunction(() => document.querySelector('dialog.mm-lb')?.open === true, null, { timeout: 5000 });
    } catch { abrio = false; mal.noAbre.push(`${ruta} @${ancho}`); }
    if (!abrio) { await p.close(); continue; }
    medidas++;

    const est = await p.evaluate(() => {
      const d = document.querySelector('dialog.mm-lb');
      return {
        y: window.scrollY,
        modal: d.matches(':modal'),
        img: d.querySelector('img')?.getAttribute('src') ?? null,
        // Nombre accesible efectivo de CADA ancla de la pagina, resuelto como lo haria un
        // lector: `aria-label` primero, luego el `alt` de la imagen que envuelve, luego texto.
        mudas: [...document.querySelectorAll('a.w-lightbox')]
          .filter((x) => !(x.getAttribute('aria-label')?.trim()
            || x.querySelector('img')?.alt?.trim() || x.textContent.trim())).length,
        totalAnclas: document.querySelectorAll('a.w-lightbox').length,
        botones: [...d.querySelectorAll('button')]
          .filter((b) => !b.hidden && b.getBoundingClientRect().width > 0)
          .map((b) => { const r = b.getBoundingClientRect(); return { n: b.getAttribute('aria-label') || b.className, w: Math.round(r.width), h: Math.round(r.height) }; }),
      };
    });
    // `href="#"` sin `preventDefault` manda la pagina al principio. Cero, o esta roto.
    if (est.y !== y0) mal.salto.push(`${ruta} @${ancho} salto de ${est.y - y0}px`);
    if (!est.modal) mal.noAbre.push(`${ruta} @${ancho} abre pero NO es modal (sin foco atrapado)`);
    if (est.mudas) mal.mudas.push(`${ruta} @${ancho} ${est.mudas} de ${est.totalAnclas} anclas sin nombre accesible`);
    nombradas += est.totalAnclas - est.mudas;
    for (const b of est.botones) {
      if (b.w < MINIMO_TACTIL || b.h < MINIMO_TACTIL) mal.chicos.push(`${ruta} @${ancho} «${b.n}» ${b.w}x${b.h}`);
    }

    await p.keyboard.press('ArrowRight');
    const otra = await p.evaluate(() => document.querySelector('dialog.mm-lb img')?.getAttribute('src') ?? null);
    if (otra === est.img) mal.noPasa.push(`${ruta} @${ancho} la flecha no cambia de imagen`);

    await p.keyboard.press('Escape');
    let cerro = true;
    try { await p.waitForFunction(() => !document.querySelector('dialog.mm-lb')?.open, null, { timeout: 3000 }); }
    catch { cerro = false; mal.noCierraEsc.push(`${ruta} @${ancho}`); }

    if (cerro) {
      const vuelve = await p.evaluate(() => document.activeElement?.classList?.contains('w-lightbox') ?? false);
      if (!vuelve) mal.foco.push(`${ruta} @${ancho} el foco no vuelve al ancla`);
    }

    // y el velo tambien cierra
    if (ancho < 800) await a.tap(); else await a.click();
    await p.waitForFunction(() => document.querySelector('dialog.mm-lb')?.open === true, null, { timeout: 5000 }).catch(() => {});
    if (ancho < 800) await p.touchscreen.tap(5, 5); else await p.mouse.click(5, 5);
    try { await p.waitForFunction(() => !document.querySelector('dialog.mm-lb')?.open, null, { timeout: 3000 }); }
    catch { mal.noCierraVelo.push(`${ruta} @${ancho}`); }

    await p.close();
  }
  await ctx.close();
}
await nav.close();
servidor.close();

console.log(`     abiertos y medidos ${medidas} de ${MUESTRA.length * ANCHOS.length} casos`);
check(`las ${nombradas} anclas medidas tienen nombre accesible`, mal.mudas.length === 0, `${mal.mudas.length} paginas con anclas mudas`);
lista(mal.mudas);
check('el lightbox abre como modal', mal.noAbre.length === 0, `${mal.noAbre.length}`);
lista(mal.noAbre);
check('abrirlo NO mueve la pagina (el href="#" no salta)', mal.salto.length === 0, `${mal.salto.length}`);
lista(mal.salto);
check(`0 controles por debajo de ${MINIMO_TACTIL}x${MINIMO_TACTIL} (WCAG 2.2 AA 2.5.8)`, mal.chicos.length === 0, `${mal.chicos.length}`);
lista(mal.chicos, 12);
check('las flechas pasan de imagen', mal.noPasa.length === 0, `${mal.noPasa.length}`);
lista(mal.noPasa);
check('Escape cierra', mal.noCierraEsc.length === 0, `${mal.noCierraEsc.length}`);
lista(mal.noCierraEsc);
check('tocar el velo cierra', mal.noCierraVelo.length === 0, `${mal.noCierraVelo.length}`);
lista(mal.noCierraVelo);
check('al cerrar, el foco vuelve al ancla que lo abrio', mal.foco.length === 0, `${mal.foco.length}`);
lista(mal.foco);

console.log(fallos ? `\nPUERTA ROJA — ${fallos} fallos\n` : '\nPUERTA VERDE\n');
process.exit(fallos ? 1 : 0);
