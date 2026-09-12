#!/usr/bin/env node
/**
 * DIAGNÓSTICO (no es una puerta) — el RITMO VERTICAL de un bloque, y el PLIEGUE.
 *
 *     node scripts/diag-ritmo.mjs /services/custom-pool-spa-builders-in-north-south-florida \
 *          '.block-hero-services-page' 390 768 1440
 *     node scripts/diag-ritmo.mjs <ruta> <selector> --pliegue 390x844 --reserva 80
 *
 * Existe porque las dos medidas que gobiernan el héroe del rediseño no las daba ningún script y
 * se sacaron a mano en `docs/encargos/R19-CAMBIOS.md` §C5. Un número sin el comando que lo
 * produjo es una opinión (`00-PRINCIPIOS.md` §6), así que aquí está el comando.
 *
 * Mide dos cosas:
 *
 * 1 · RITMO — el hueco REAL entre hermanos consecutivos, no el `margin` declarado. El hueco
 *    real es `top(n+1) − (top(n) + alto(n))`, que es lo único que ve el ojo: absorbe el colapso
 *    de márgenes, el `gap` del flex y el `line-height`. Medirlo por `margin-top` computado es
 *    justo el error que hace creer que una caja con `margin: 0` está pegada cuando su padre le
 *    pone `gap`, y al revés.
 *
 * 2 · PLIEGUE — qué entra por encima de la línea de flotación a un viewport dado, DESCONTANDO
 *    una banda reservada abajo. En este sitio esa banda son los 80 px del botón flotante de
 *    llamada, que tapa contenido y no está en el flujo: sin descontarlo, el pliegue miente.
 *
 * Verifica sobre `.vercel/output/static`, nunca sobre `astro dev` — dev no hornea width/height.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ARGS_NAVEGADOR, asentar } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

const argv = process.argv.slice(2);
const RUTA = argv[0];
const SELECTOR = argv[1];
const iPliegue = argv.indexOf('--pliegue');
const iComp = argv.indexOf('--composicion');
const iReserva = argv.indexOf('--reserva');
const PLIEGUE = iPliegue > -1 ? argv[iPliegue + 1] : null;
const COMP = iComp > -1 ? argv[iComp + 1] : null;
const RESERVA = iReserva > -1 ? Number(argv[iReserva + 1]) : 0;
// Los valores de --pliegue/--reserva NO son anchos: se descuentan por posicion, o `--reserva 80`
// se colaria como un cuarto viewport (medido: salia una columna «80 px» fantasma).
const CONSUMIDOS = new Set([iPliegue, iPliegue + 1, iReserva, iReserva + 1, iComp, iComp + 1]
  .filter((i) => i > 0));
const ANCHOS = argv.slice(2)
  .map((a, i) => [a, i + 2])
  .filter(([a, i]) => /^\d+$/.test(a) && !CONSUMIDOS.has(i))
  .map(([a]) => Number(a));

if (!RUTA || !SELECTOR) {
  console.error('\n  uso: node scripts/diag-ritmo.mjs <ruta> <selector> [ancho...] [--pliegue 390x844] [--reserva 80]'
    + '\n       node scripts/diag-ritmo.mjs <ruta> <selector-seccion> --composicion 1440x900\n');
  process.exit(1);
}

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const nav = await chromium.launch({ args: ARGS_NAVEGADOR });
const etiqueta = (e) => e.tag + (e.clase ? '.' + e.clase.trim().split(/\s+/).join('.') : '');

/** Lee hijos directos del selector: posición, alto y márgenes computados. */
const leeHijos = (pag, sel) => pag.evaluate((sel) => {
  const cont = document.querySelector(sel);
  if (!cont) return null;
  const cs = getComputedStyle(cont);
  const hijos = [...cont.children].map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      clase: typeof el.className === 'string' ? el.className : '',
      texto: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 42),
      top: r.top + scrollY, alto: r.height,
      mt: s.marginTop, mb: s.marginBottom,
      oculto: s.display === 'none' || r.height === 0,
    };
  });
  const r = cont.getBoundingClientRect();
  return {
    contenedor: { top: r.top + scrollY, alto: r.height, gap: cs.rowGap, display: cs.display,
      padTop: cs.paddingTop, padBottom: cs.paddingBottom, justify: cs.justifyContent },
    hijos,
  };
}, sel);

for (const ancho of (ANCHOS.length ? ANCHOS : [])) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load' });
  const ok = await asentar(pag);
  if (!ok.valida) { console.log(`\n  ${ancho}: MEDICION NO VALIDA`); await ctx.close(); continue; }
  const d = await leeHijos(pag, SELECTOR);
  if (!d) { console.log(`\n  ${ancho}: no existe ${SELECTOR}`); await ctx.close(); continue; }

  console.log(`\n═══ ${ancho} px · ${SELECTOR}`);
  console.log(`    contenedor: display:${d.contenedor.display} · row-gap:${d.contenedor.gap}`
    + ` · justify:${d.contenedor.justify}`
    + ` · padding-block: ${d.contenedor.padTop} / ${d.contenedor.padBottom}`
    + ` · alto ${d.contenedor.alto.toFixed(0)}`);
  const vis = d.hijos.filter((h) => !h.oculto);
  let prev = null;
  for (const h of vis) {
    const hueco = prev ? h.top - (prev.top + prev.alto) : null;
    const marca = hueco !== null && hueco <= 0 ? '  <- PEGADOS' : '';
    console.log(`    ${hueco === null ? '    ' : String(Math.round(hueco)).padStart(4)} px  `
      + `${etiqueta(h).padEnd(34).slice(0, 34)} alto ${String(Math.round(h.alto)).padStart(4)}`
      + `  m:${h.mt}/${h.mb}  «${h.texto}»${marca}`);
    prev = h;
  }
  await ctx.close();
}

/**
 * COMPOSICION VERTICAL — cuanto aire queda arriba y abajo del contenido de una seccion,
 * DESCONTANDO lo que un nav superpuesto le tape.
 *
 * ⚠️ El nav de este sitio se reporta `position: relative` pero SI se superpone: la seccion
 * empieza en y=0 y el nav ocupa 0..85 encima. Por eso la superposicion NO se decide por el
 * valor de `position` —que miente— sino midiendo: si el borde inferior del nav cae por debajo
 * del borde superior de la seccion, tapa. Leer `padding-block: 85px / 0` y concluir «esta
 * apoyado arriba» es el error que esta medida existe para impedir.
 */
if (COMP) {
  const [w, hv] = COMP.split('x').map(Number);
  const ctx = await nav.newContext({ viewport: { width: w, height: hv }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load' });
  const ok = await asentar(pag);
  if (!ok.valida) { console.log('\n  COMPOSICION: MEDICION NO VALIDA'); }
  else {
    const d = await pag.evaluate((sel) => {
      const sec = document.querySelector(sel);
      if (!sec) return null;
      const rs = sec.getBoundingClientRect(), ss = getComputedStyle(sec);
      // la caja REAL del contenido: del primer al ultimo descendiente visible con texto o imagen
      const cajas = [...sec.querySelectorAll('*')]
        .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
          return r.height > 0 && s.position !== 'absolute' && s.position !== 'fixed'
            && (e.childElementCount === 0 || e.tagName === 'IMG') && e.tagName !== 'IMG'; })
        .map((e) => e.getBoundingClientRect());
      if (!cajas.length) return null;
      // lo que TAPA por arriba: cualquier elemento fuera de la seccion cuyo borde inferior
      // caiga dentro de ella. No se pregunta por `position`, se mide.
      let tapa = 0, quien = null;
      for (const e of document.body.querySelectorAll('*')) {
        if (sec.contains(e) || e.contains(sec)) continue;
        const r = e.getBoundingClientRect();
        if (r.height === 0 || r.width < window.innerWidth * 0.5) continue;
        if (r.top <= rs.top + 1 && r.bottom > rs.top && r.bottom - rs.top > tapa) {
          tapa = r.bottom - rs.top;
          quien = e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 30);
        }
      }
      return {
        secTop: rs.top + scrollY, secAlto: rs.height, padT: ss.paddingTop, padB: ss.paddingBottom,
        align: ss.alignItems,
        cTop: Math.min(...cajas.map((r) => r.top)) + scrollY,
        cBot: Math.max(...cajas.map((r) => r.bottom)) + scrollY,
        tapa: Math.round(tapa), quien,
      };
    }, SELECTOR);
    if (!d) console.log('\n  COMPOSICION: no existe ' + SELECTOR);
    else {
      const arriba = Math.round(d.cTop - d.secTop);
      const abajo = Math.round((d.secTop + d.secAlto) - d.cBot);
      const visible = Math.round(arriba - d.tapa);
      console.log(`\n═══ COMPOSICION ${w}x${hv} · ${SELECTOR}`);
      console.log(`    seccion alto ${Math.round(d.secAlto)} · padding-block ${d.padT} / ${d.padB} · align-items:${d.align}`);
      console.log(`    contenido ${Math.round(d.cTop)} .. ${Math.round(d.cBot)}`);
      console.log(`    superpuesto encima: ${d.tapa} px${d.quien ? ' (' + d.quien + ')' : ''}`);
      console.log(`    aire BRUTO   arriba ${arriba}  abajo ${abajo}  -> desequilibrio ${arriba - abajo} px`);
      console.log(`    aire VISIBLE arriba ${visible}  abajo ${abajo}  -> desequilibrio ${visible - abajo} px`
        + `${Math.abs(visible - abajo) <= 2 ? '   <- COMPUESTO' : '   <- DESCOMPENSADO'}`);
    }
  }
  await ctx.close();
}

if (PLIEGUE) {
  const [w, hv] = PLIEGUE.split('x').map(Number);
  const linea = hv - RESERVA;
  const ctx = await nav.newContext({ viewport: { width: w, height: hv }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load' });
  const ok = await asentar(pag);
  if (!ok.valida) { console.log('\n  PLIEGUE: MEDICION NO VALIDA'); }
  else {
    const dentro = await pag.evaluate((linea) => {
      const sel = ['h1', '.heading-deco-services', '.svc-heroe__tel', '.svc-heroe__lic',
        '.hero-services a.button', '.block-hero-services-page p'];
      // Un mismo elemento casa con varios selectores (`.svc-heroe__tel` es tambien
      // `.block-hero-services-page p`): se deduplica por nodo o el informe cuenta de mas.
      const vistos = new Map();
      for (const s of sel) {
        for (const el of document.querySelectorAll(s)) {
          const r = el.getBoundingClientRect();
          if (r.height === 0) continue;
          if (vistos.has(el)) continue;
          vistos.set(el, { sel: s, top: Math.round(r.top), bottom: Math.round(r.bottom),
            entero: r.bottom <= linea, texto: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34) });
        }
      }
      return [...vistos.values()].sort((a, b) => a.top - b.top);
    }, linea);
    console.log(`\n═══ PLIEGUE ${w}x${hv} · reserva ${RESERVA} px · linea de flotacion ${linea}`);
    for (const e of dentro) {
      console.log(`    ${e.entero ? '  ENTERO' : 'CORTADO '} ${String(e.bottom).padStart(5)} px  `
        + `${e.sel.padEnd(30)} «${e.texto}»`);
    }
    const fuera = dentro.filter((e) => !e.entero);
    console.log(`\n    ${fuera.length === 0 ? 'todo entra' : fuera.length + ' elemento(s) cortados por el pliegue'}`);
  }
  await ctx.close();
}

await nav.close();
servidor.close();
