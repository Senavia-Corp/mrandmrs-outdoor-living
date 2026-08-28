#!/usr/bin/env node
/**
 * FASE 7 — deriva `src/data/reveals.json` del catálogo de IX2.
 *
 *     npm run reveals
 *
 * Cada entrada dice: qué `data-w-id` lleva qué animación y **en qué breakpoints**. El reparto
 * no es decorativo: 20 eventos corren SOLO en `main` (>=992) y 17 SOLO en `medium+small+tiny`.
 * Es el patrón clásico —los mismos elementos deslizan en horizontal en escritorio y hacen
 * fade+scale en móvil— y aplicar el deslizamiento lateral en móvil mete **barra de scroll
 * horizontal**. En LTR el desbordamiento por la izquierda no genera barra; solo el positivo,
 * así que `slideInRight` es el peligroso.
 *
 * Aquí no se decide nada: se traduce lo que ya midió `extract-ix2.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CSV = path.join(RAIZ, '_source/animations/ix2-targets.csv');

const lineas = fs.readFileSync(CSV, 'utf8').trim().split('\n');
const cab = lineas[0].match(/"((?:[^"]|"")*)"/g).map((c) => c.slice(1, -1));
const filas = lineas.slice(1).map((l) => {
  const c = l.match(/"((?:[^"]|"")*)"/g).map((x) => x.slice(1, -1));
  return Object.fromEntries(cab.map((k, i) => [k, c[i]]));
});

/** Las 4 entradas por scroll. Duraciones y easing salen del catálogo, no de la memoria. */
const REVEALS = new Set(['growIn', 'slideInLeft', 'slideInRight', 'slideInBottom']);

const porId = {};
let arrancanEnCero = 0;
for (const f of filas) {
  if (!REVEALS.has(f.actionListId)) continue;
  const bps = f.mediaQueries.split('|').filter(Boolean);
  const prev = porId[f.dataWId];
  if (prev) {
    // Un mismo elemento puede tener DOS entradas con breakpoints distintos: slideIn en
    // escritorio y growIn en movil. Se guardan las dos, cada una con su rango.
    prev.push({ anim: f.actionListId, bps, cero: f.arrancaEnOpacity0 === 'si' });
  } else {
    porId[f.dataWId] = [{ anim: f.actionListId, bps, cero: f.arrancaEnOpacity0 === 'si' }];
  }
  if (f.arrancaEnOpacity0 === 'si') arrancanEnCero++;
}

const salida = {
  _lee_esto: 'DERIVADO de _source/animations/ix2-targets.csv. Regenerar: npm run reveals',
  breakpoints: { main: [992, null], medium: [768, 991], small: [480, 767], tiny: [0, 479] },
  easing: { outQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)', easeInOut: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' },
  duracion: 1000,
  /** Medido en AMS: 20px es la amplitud lateral segura. 100px mete barra horizontal en movil. */
  amplitudLateral: 100,
  porId,
};
fs.writeFileSync(path.join(RAIZ, 'src/data/reveals.json'), JSON.stringify(salida, null, 1));

const cuenta = {};
for (const v of Object.values(porId)) for (const e of v) cuenta[e.anim] = (cuenta[e.anim] ?? 0) + 1;
const soloMain = Object.values(porId).flat().filter((e) => e.bps.length === 1 && e.bps[0] === 'main').length;
const sinMain = Object.values(porId).flat().filter((e) => !e.bps.includes('main')).length;
console.log(`\n  elementos con entrada por scroll : ${Object.keys(porId).length}`);
console.log(`  entradas por animacion           : ${JSON.stringify(cuenta)}`);
console.log(`  solo en main (>=992)             : ${soloMain}`);
console.log(`  sin main (solo movil/tablet)     : ${sinMain}`);
console.log(`  arrancan en opacity:0 en el origen: ${arrancanEnCero}`);
console.log('\n  OK src/data/reveals.json\n');
