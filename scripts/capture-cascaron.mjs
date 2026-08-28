#!/usr/bin/env node
/**
 * Congela la GEOMETRÍA y el TEXTO del nav y el pie del sitio vivo, en los 4 anchos.
 *
 *     npm run baseline:cascaron
 *
 * POR QUÉ NO BASTA CON PÍXELES
 * La puerta de la Fase 4 era «≥99 % de píxeles iguales» sobre la banda del nav. Medido: con
 * la tolerancia que hace que contenido IDÉNTICO llegue al 99 %, un nav con un enlace movido
 * 6 px daba **99,33 %** y también pasaba. No es un umbral mal elegido, es la métrica: la
 * banda del nav es casi toda blanca, así que mover un enlace cambia el 0,7 % de los píxeles.
 * Un check que no puede distinguir «igual» de «roto» no verifica nada.
 *
 * Lo que sí distingue es la CAJA de cada elemento. Un enlace 6 px a la derecha salta a la
 * primera, y además dice cuál. Los píxeles se siguen mirando, pero como señal secundaria.
 *
 * Se congela AHORA porque después del corte de dominio el vivo deja de existir.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { ANCHOS, ARGS_NAVEGADOR, asentar } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BASE = 'https://mrandmrsoutdoorliving.com';

/**
 * La caja se guarda RELATIVA a la sección, no absoluta: el pie del sitio vivo está a
 * y=7926 y el de una página de prueba a y=432, y esa diferencia no dice nada de la
 * maquetación. Lo que importa es dónde está cada cosa DENTRO del cascarón.
 */
export const sondaCascaron = (sel) => {
  const raiz = document.querySelector(sel);
  if (!raiz) return null;
  const base = raiz.getBoundingClientRect();
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    ancho: r1(base.width), alto: r1(base.height),
    texto: raiz.innerText.replace(/[ \t]+/g, ' ').split('\n').map((s) => s.trim()).filter(Boolean).join('\n'),
    elementos: [...raiz.querySelectorAll('*')].map((e) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return [
        e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().split(/\s+/)[0] : ''),
        r1(b.x - base.x), r1(b.y - base.y), r1(b.width), r1(b.height),
        s.display === 'none' ? 'none' : '',
      ].join('|');
    }),
  };
};

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const salida = { fecha: new Date().toISOString(), base: BASE, anchos: {} };

for (const [ancho, alto] of ANCHOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();
  await pag.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await pag.bringToFront();
  const est = await asentar(pag);
  if (!est.valida) throw new Error(`medición inválida a ${ancho}: ${JSON.stringify(est.sonda)}`);

  salida.anchos[ancho] = {
    menu: await pag.evaluate(sondaCascaron, '.menu'),
    footer: await pag.evaluate(sondaCascaron, '.footer'),
  };
  const m = salida.anchos[ancho];
  console.log(`  ${String(ancho).padStart(4)}  nav ${String(m.menu.elementos.length).padStart(3)} elementos`
    + ` (${m.menu.alto}px)   pie ${String(m.footer.elementos.length).padStart(3)} elementos (${m.footer.alto}px)`);
  await ctx.close();
}
await nav.close();
await fs.writeFile(path.join(RAIZ, 'baseline/cascaron.json'), JSON.stringify(salida, null, 1));
console.log('\n  ✅ baseline/cascaron.json\n');
