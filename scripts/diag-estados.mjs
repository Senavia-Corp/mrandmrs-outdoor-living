#!/usr/bin/env node
/**
 * DIAGNOSTICO (no es una puerta) — LOS ESTADOS QUE NO SE VEN, y el acordeon.
 *
 *     node scripts/diag-estados.mjs /pool-builders/ocala-florida
 *     node scripts/diag-estados.mjs /pool-builders/ocala-florida 390 1440
 *
 * POR QUE EXISTE. `check:visual` compara capturas y `check:texto` compara innerText: los dos
 * miran la pagina EN REPOSO. Los estados que deciden si un lead se pierde no existen en reposo
 * —el banner de exito, el de fallo, el campo en error, el anillo de foco— y por eso este repo
 * ya se comio un «banner de exito a 1,35:1» que ninguna captura ensenaba (`PROMPT-R19` §4.bis:
 * «ese estado no existe hasta que se envia el formulario»). Aqui se FUERZAN y se miden.
 *
 * Sirve a las 17 rutas que montan `.svc-captacion`, no solo a las dos de R20-CIUDADES.
 *
 * UN SOLO CHROMIUM, a proposito: la regla de la casa es no tener dos abiertos a la vez.
 *
 * CONTRASTE: aqui se calcula sobre el color COMPUTADO, no sobre el pixel. No es una rebaja —
 * los elementos que mide van sobre fondos SOLIDOS, y sobre un fondo solido el color computado
 * ES el peor pixel. Para texto sobre foto sigue mandando `diag-contraste.mjs`, que muestrea.
 *
 * NO ENVIA EL FORMULARIO. Fuerza los paneles por CSS; un envio real crearia un lead de verdad.
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
const ANCHOS = argv.slice(1).map(Number).filter(Boolean);
if (!RUTA) { console.error('\n  uso: node scripts/diag-estados.mjs <ruta> [ancho...]\n'); process.exit(1); }
const MEDIDAS = ANCHOS.length ? ANCHOS : [390, 768, 1280, 1440];

/* El mismo servidor minimo que montan `diag-contraste` y `diag-velo`. Se repite a proposito:
 * son diagnosticos independientes y compartir un modulo por 12 lineas ataria tres scripts. */
const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, `${p}.html`), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

/** Lo nuevo de la capa de captacion. Lo heredado no es de este diagnostico. */
/* `:not([type=hidden]):not([name=ref_id])` NO es cosmetica: el honeypot mide 1x1 con
 * `opacity:0` A PROPOSITO —es una trampa para robots, no un control— y el `hidden` de
 * `service_interest` no se pinta. Medirlos daba «8x6» y «objetivo tactil» donde no hay nada
 * que tocar: un falso rojo enseña a ignorar los rojos. */
const NUEVO = ['p.svc-heroe__tel a', '.svc-cierre a', '.dropdown-faq .dropdown-toggle',
  '.svc-captacion input:not([type=hidden]):not([name=ref_id])',
  '.svc-captacion select', '.svc-captacion textarea',
  '.svc-captacion button, .svc-captacion [type=submit]', '.svc-inversion .mm-accion'];

/* El cromo repite a proposito: la marquesina pinta los 14 logos tres veces para el bucle, y
 * las flechas y los iconos de desplegable salen una vez por instancia. Lo que importa es si se
 * repite una FOTO DE OBRA, que es lo que el visitante lee como «esto lo construimos nosotros». */
const CROMO = /logo|icon|toggle|arrow|artboard|\.svg$/i;

let rojos = 0;
const mal = (m) => { rojos++; console.log(`  ROJO  ${m}`); };
const ok = (m) => console.log(`  ok    ${m}`);
const nota = (m) => console.log(`  --    ${m}`);

const nav = await chromium.launch({ args: ARGS_NAVEGADOR });

for (const w of MEDIDAS) {
  console.log(`\n═══ ${RUTA} · ${w}px ═══`);
  const ctx = await nav.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load' });
  if (!(await asentar(pag)).valida) { mal('medicion no valida'); await ctx.close(); continue; }

  // 1 · DESBORDAMIENTO HORIZONTAL
  const des = await pag.evaluate(() => ({
    doc: document.documentElement.scrollWidth, win: innerWidth,
    culpables: [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 3).map((e) => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]),
  }));
  des.doc > des.win
    ? mal(`desborda ${des.doc - des.win}px · primeros: ${des.culpables.join(', ') || '(?)'}`)
    : ok(`sin desbordamiento horizontal (${des.doc} = ${des.win})`);

  // 2 · ENCABEZADOS
  const enc = await pag.evaluate(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
    const saltos = hs.map((n, i) => (i && n > hs[i - 1] + 1 ? `${hs[i - 1]}->${n}` : null)).filter(Boolean);
    return { h1: document.querySelectorAll('h1').length, saltos };
  });
  enc.h1 === 1 ? ok('un solo <h1>') : mal(`${enc.h1} elementos <h1>`);
  enc.saltos.length ? mal(`saltos de nivel: ${enc.saltos.join(', ')}`) : ok('sin saltos de nivel');

  // 3 · OBJETIVOS TACTILES DE LO NUEVO
  const tac = await pag.evaluate((sels) => {
    const out = [];
    for (const s of sels) for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect();
      if (r.width && r.height && (r.height < 44 || r.width < 44)) {
        out.push(`${s} -> ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return out;
  }, NUEVO);
  tac.length ? tac.forEach((t) => mal(`objetivo tactil < 44px: ${t}`)) : ok('objetivos tactiles de lo nuevo >= 44px');

  // 4 · LOS ESTADOS QUE NO SE VEN
  const estados = await pag.evaluate(() => {
    const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const opaco = (e) => { // primer ancestro con fondo no transparente
      for (let n = e; n; n = n.parentElement) {
        const b = getComputedStyle(n).backgroundColor; const v = rgb(b);
        if (v.length === 3 && !/rgba\(.*,\s*0\)/.test(b)) return v;
      } return [255, 255, 255];
    };
    const ratio = (e) => {
      const f = lum(rgb(getComputedStyle(e).color)), b = lum(opaco(e));
      const L1 = Math.max(f, b), L2 = Math.min(f, b); return +((L1 + 0.05) / (L2 + 0.05)).toFixed(2);
    };
    const r = {};
    for (const [k, sel] of [['exito', '.svc-captacion .w-form-done'], ['fallo', '.svc-captacion .w-form-fail']]) {
      const d = document.querySelector(sel);
      if (!d) { r[k] = null; continue; }
      d.style.display = 'block';                      // FORZADO: no se envia nada
      const p = d.querySelector('p') || d;
      r[k] = { texto: p.textContent.trim().slice(0, 40), color: getComputedStyle(p).color, ratio: ratio(p) };
    }
    // campo en error
    const campo = document.querySelector('.svc-captacion input[required]');
    if (campo) {
      campo.setAttribute('aria-invalid', 'true');
      r.error = { ratio: ratio(campo), borde: getComputedStyle(campo).borderColor };
    }
    // anillo de foco
    if (campo) {
      campo.focus();
      const cs = getComputedStyle(campo);
      r.foco = { outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, sombra: cs.boxShadow.slice(0, 40) };
    }
    return r;
  });
  for (const [k, v] of Object.entries(estados)) {
    if (!v) { nota(`estado «${k}»: no existe en esta ruta`); continue; }
    if (v.ratio !== undefined) {
      v.ratio >= 4.5 ? ok(`estado «${k}» ${v.ratio}:1 ${v.color || ''} ${v.texto ? '· ' + v.texto : ''}`)
        : mal(`estado «${k}» ${v.ratio}:1 — umbral 4,5 ${v.color || ''}`);
    }
    if (v.outline !== undefined) {
      /none|0px/.test(v.outline) && /none/.test(v.sombra)
        ? mal('el campo enfocado no pinta ni outline ni box-shadow')
        : ok(`foco visible: outline ${v.outline}${/none/.test(v.sombra) ? '' : ' · sombra ' + v.sombra}`);
    }
  }

  // 5 · EL ACORDEON DE LA FAQ
  const tog = pag.locator('.dropdown-faq .dropdown-toggle').first();
  if (await tog.count()) {
    await tog.click();
    const abre = await pag.evaluate(() => {
      const t = document.querySelector('.dropdown-faq .dropdown-toggle');
      return { open: !!t.closest('.dropdown-faq').querySelector('.dropdown-list.w--open'), aria: t.getAttribute('aria-expanded') };
    });
    abre.open ? ok(`acordeon abre con clic · aria-expanded="${abre.aria}"`) : mal('el acordeon NO abre con clic');
    await tog.click();
    const cierra = await pag.evaluate(() => !document.querySelector('.dropdown-faq .dropdown-list.w--open'));
    cierra ? ok('acordeon cierra con clic') : mal('el acordeon NO cierra con clic');
    for (const tecla of ['Enter', 'Space']) {
      await tog.focus(); await pag.keyboard.press(tecla);
      const t = await pag.evaluate(() => !!document.querySelector('.dropdown-faq .dropdown-list.w--open'));
      t ? ok(`acordeon abre con ${tecla}`) : mal(`el acordeon NO abre con ${tecla}`);
      if (t) { await pag.keyboard.press(tecla); }
    }
  } else nota('esta ruta no monta acordeon de FAQ');

  // 6 · EL ANCLA #estimate Y DONDE QUEDA EL FOCO
  const anclas = await pag.locator('a[href="#estimate"]').count();
  if (anclas) {
    await pag.locator('a[href="#estimate"]').first().click();
    await pag.waitForTimeout(250);
    const f = await pag.evaluate(() => {
      const a = document.activeElement;
      const s = document.getElementById('estimate');
      return { activo: a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') : 'null',
        dentro: !!(s && a && (s === a || s.contains(a))),
        visible: s ? Math.round(s.getBoundingClientRect().top) : null };
    });
    console.log(`  --    ${anclas} ancla(s) a #estimate · seccion a ${f.visible}px del viewport`);
    f.dentro ? ok(`el foco llega a la seccion (activeElement = ${f.activo})`)
      : mal(`el foco se queda fuera: activeElement = ${f.activo}`);
  }

  // 7 · FOTOS REPETIDAS EN LA MISMA PAGINA
  const rep = await pag.evaluate(() => {
    const c = {}; for (const i of document.querySelectorAll('img[src]')) c[i.getAttribute('src')] = (c[i.getAttribute('src')] || 0) + 1;
    return Object.entries(c).filter(([, n]) => n > 1).map(([s, n]) => `${n}x ${s.split('/').pop()}`);
  });
  const repObra = rep.filter((r) => !CROMO.test(r));
  repObra.length ? repObra.forEach((r) => nota(`foto de obra repetida en la pagina: ${r}`))
    : ok('ninguna foto de obra repetida');
  if (rep.length > repObra.length) nota(`(${rep.length - repObra.length} repeticiones de cromo descontadas: marquesina, flechas, iconos)`);

  // 8 · EL SEPARADOR DEL PAR DE TELEFONOS
  const sep = await pag.evaluate(() => {
    const p = document.querySelector('p.svc-heroe__tel');
    if (!p) return null;
    const r = [...p.childNodes].filter((n) => n.nodeType === 3 && n.textContent.includes('·'));
    if (!r.length) return { lineas: p.getClientRects().length, cuelga: null };
    const rango = document.createRange(); rango.selectNode(r[0]);
    const caja = rango.getBoundingClientRect(), pc = p.getBoundingClientRect();
    return { lineas: p.getClientRects().length, cuelga: caja.right > pc.right - 24 };
  });
  if (sep) {
    sep.cuelga ? nota(`el separador «·» queda al final de linea (${sep.lineas} lineas) — PRE-EXISTING, 16 rutas`)
      : ok(`separador «·» sin colgar (${sep.lineas} lineas)`);
  }

  await ctx.close();
}

// 9 · REDUCED MOTION: el collage no puede quedarse invisible
{
  console.log('\n═══ prefers-reduced-motion: reduce ═══');
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const pag = await ctx.newPage();
  await pag.goto(BASE + RUTA, { waitUntil: 'load' });
  await asentar(pag);
  const inv = await pag.evaluate(() => [...document.querySelectorAll('.mm-collage > img')]
    .filter((i) => +getComputedStyle(i).opacity < 0.9).length);
  const total = await pag.evaluate(() => document.querySelectorAll('.mm-collage > img').length);
  inv ? mal(`${inv} de ${total} fotos del collage por debajo de opacity 0.9 con reduced-motion`)
    : ok(`las ${total} fotos del collage visibles con reduced-motion`);
  await ctx.close();
}

await nav.close(); servidor.close();
console.log(`\n${rojos ? `${rojos} HALLAZGO(S)` : 'SIN HALLAZGOS'}\n`);
process.exit(0);
