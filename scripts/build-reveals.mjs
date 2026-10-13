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

/**
 * RETIRADAS POR EL REDISENO (ASTRO-1 y ASTRO-2, oct-2026). El elemento que llevaba cada uno de
 * estos `data-w-id` ya no se pinta en ninguna ruta: la seccion paso a las piezas `.mm-*`, que no
 * entran por scroll. Dejarlos seria declarar animaciones que no animan nada, y `check:ix2` los
 * cuenta como huerfanos (con ellos, 25; sin ellos, los 14 de siempre). Si un bloque de estos
 * volviera a pintarse con su `data-w-id`, se saca de aqui.
 */
const RETIRADAS = new Set([
  // pie heredado, en las 232 paginas (ASTRO-1: pie nuevo `.mm-zocalo`)
  'd04947c9-3ba7-2add-caaa-9414425e8391', 'd04947c9-3ba7-2add-caaa-9414425e83ec', 'd04947c9-3ba7-2add-caaa-9414425e83ed',
  // secciones de las 14 fichas de servicio (ASTRO-2)
  '983862a7-3688-6e3b-afeb-1962d292774b', 'f2721b05-6e5e-044b-b7c9-7a2a8bd783b4', 'dce80844-cc8a-923f-8fa1-aa91c1419f9a',
  'dce80844-cc8a-923f-8fa1-aa91c1419f9d', '9f159d33-eb67-9087-202c-bab1e4077bc3',
  // hero y cabeceras de las 9 paginas de condado (ASTRO-2)
  'e94ffec7-4812-fbc6-e930-59a019961ce9', '98524246-2fbc-e691-5ab8-2715913bd179', '98524246-2fbc-e691-5ab8-2715913bd17e',
  // cada foto de la galeria de las 15 fichas de proyecto (ASTRO-4: mosaico de «Project Details»)
  '333e7244-2382-3d5a-9f96-e9d5e0ad3eae',
  // el bloque de texto del hero antiguo de proyecto y de articulo (ASTRO-4: hero C)
  '4e3ac630-04d8-ebcf-c5f5-c24ea7e9ba56',
  // la home antigua (ASTRO-4): bloque del hero, cabecera y cuerpo de las pestanas de servicios,
  // las tres fotos y la columna de la intro, y la cabecera y el carrusel de articulos
  'bf5925c7-6577-ba84-77a6-25f8d09f7373', 'cf6e6112-50b1-b164-fee5-1e4b8c413043', 'cf6e6112-50b1-b164-fee5-1e4b8c413058',
  '29867a8a-c7e7-06a6-ef63-f3ef2789a898', '29867a8a-c7e7-06a6-ef63-f3ef2789a89b', '29867a8a-c7e7-06a6-ef63-f3ef2789a89d',
  '29867a8a-c7e7-06a6-ef63-f3ef2789a89f', 'c5943ea8-2479-0b18-7289-2e4baa1a48c8', 'c5943ea8-2479-0b18-7289-2e4baa1a48ce',
  // la cabecera y el bloque del formulario de `/request-estimated` (ASTRO-4 lote B)
  'd01628ed-7f34-9b3f-2b4a-9f22c92ec16a', '69e4df55-86c1-a89d-281e-f454cb25cb86',
  // la caja de contacto de `/contact-us` (ASTRO-4 lote B)
  '53096b5c-0f9c-8865-b9e9-f40105bfcddf',  // hero, bloque de publicos, galeria e industrias de `/industry-solutions` (ASTRO-4 lote C)
  'da22a66a-ad39-0d6d-2fa2-62cb4e178480', '1e09eb34-5dfa-c000-dc70-f8f9d5c27f43', '474f47ea-6325-34d5-2f9c-e6f5417b28fa',
  'cd6507e1-0ec2-bd3c-9308-2d1cad256861', '3e7b68e7-e033-ed34-b3a7-e87aed50972d', '7740b952-2d34-d915-8ab9-fb41fe6bef4f',
  'd211c388-c60a-576c-7bc5-bd0a69d515f2',
]);

const porId = {};
let arrancanEnCero = 0;
for (const f of filas) {
  if (!REVEALS.has(f.actionListId) || RETIRADAS.has(f.dataWId)) continue;
  const bps = f.mediaQueries.split('|').filter(Boolean);
  const prev = porId[f.dataWId];
  if (prev) {
    // Un mismo elemento puede tener DOS entradas con breakpoints distintos: slideIn en
    // escritorio y growIn en movil. Se guardan las dos, cada una con su rango.
    prev.push({ anim: f.actionListId, bps });
  } else {
    porId[f.dataWId] = [{ anim: f.actionListId, bps }];
  }
  if (f.arrancaEnOpacity0 === 'SI') arrancanEnCero++;
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
