#!/usr/bin/env node
/**
 * FASE 7 — extrae la configuración REAL de los sliders de Finsweet.
 *
 *     npm run sliders
 *
 * POR QUÉ EXISTE
 * Reimplementé el slider a ojo y las diapositivas salieron a `width: 33.333%` (3 por vista),
 * cuando el sitio muestra **4 de 312,5 px** en el blog y **1 de 1250** en proyectos. El
 * resultado: la home 64 px más corta y `check:visual` en 98,x % en 100 páginas.
 *
 * El ancho no es una decisión mía: está en `finsweetcomponentsconfig-1.0.24.js`, el fichero de
 * configuración que el sitio cargaba y que retiramos. De ahí salen `slidesPerView` y
 * `spaceBetween` **por instancia y por breakpoint**. Se traduce, no se inventa.
 *
 * El fichero queda congelado en `_source/finsweet/` porque vive en el CDN de Webflow y ese CDN
 * deja de estar garantizado en cuanto se corte el dominio.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, '_source/finsweet/componentsconfig-1.0.24.js');
const t = fs.readFileSync(ORIGEN, 'utf8');

/** Recorta el objeto `{...}` que empieza en `desde`, equilibrando llaves. */
function objeto(txt, desde) {
  let n = 0, i = desde;
  for (; i < txt.length; i++) {
    if (txt[i] === '{') n++;
    else if (txt[i] === '}') { n--; if (!n) return txt.slice(desde, i + 1); }
  }
  return null;
}

const sliders = {};
for (const m of t.matchAll(/"fs-slider-instance='([^']+)'"\s*:\s*\{/g)) {
  const bloque = objeto(t, m.index + m[0].length - 1);
  if (!bloque) continue;
  const bp = bloque.indexOf('breakpoints:{');
  if (bp < 0) continue;
  const crudo = objeto(bloque, bp + 'breakpoints:'.length);
  if (!crudo) continue;
  const puntos = {};
  for (const b of crudo.matchAll(/(\d+)\s*:\s*\{([^{}]*)\}/g)) {
    const conf = Object.fromEntries([...b[2].matchAll(/(\w+)\s*:\s*([\d.]+)/g)].map((x) => [x[1], Number(x[2])]));
    puntos[b[1]] = { slidesPerView: conf.slidesPerView ?? 1, spaceBetween: conf.spaceBetween ?? 0 };
  }
  // El autoplay tambien es del sitio: el del blog avanza cada 3 s. Sin el, el slider se queda
  // quieto y eso ES una diferencia de comportamiento, no de estilo.
  const auto = bloque.match(/autoplay:\{([^}]*)\}/);
  const delay = auto ? Number((auto[1].match(/delay:([\de.+]+)/) ?? [])[1] ?? 0) : 0;
  if (Object.keys(puntos).length) {
    sliders[m[1]] = { breakpoints: puntos, autoplayMs: Number.isFinite(delay) ? delay : 0 };
  }
}

fs.writeFileSync(path.join(RAIZ, 'src/data/sliders.json'), JSON.stringify({
  _lee_esto: 'DERIVADO de _source/finsweet/componentsconfig-1.0.24.js, el fichero de '
    + 'configuracion que cargaba el sitio. Regenerar: npm run sliders',
  sliders,
}, null, 1));

console.log('');
for (const [n, v] of Object.entries(sliders)) {
  console.log(`  ${n.padEnd(28)} ${Object.entries(v.breakpoints).map(([b, c]) => `${b}:${c.slidesPerView}/${c.spaceBetween}`).join('  ')}`
    + `   autoplay=${v.autoplayMs || 'no'}`);
}
console.log(`\n  OK ${Object.keys(sliders).length} sliders -> src/data/sliders.json\n`);
