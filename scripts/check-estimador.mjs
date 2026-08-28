#!/usr/bin/env node
/**
 * PUERTA — el estimador nuevo calcula EXACTAMENTE lo mismo que el original.
 *
 *     npm run check:estimador
 *
 * Reproduce los 384 casos MEDIDOS en `_source/estimator-casos.json` contra `src/lib/estimador.js`.
 * Por caso se comparan hasta 10 valores, no 1: el rango (min y max), su texto literal, el
 * subtítulo y las hasta 7 líneas del desglose, con sus etiquetas y con las que el original
 * ESCONDE a cero. La salida está redondeada al millar, así que un modelo equivocado puede
 * acertar un rango por casualidad; no puede acertar el desglose entero 384 veces.
 *
 * Corre EN NODE, sin navegador. Eso importa aquí: las otras puertas piden foco real y una cada
 * vez, y ésta se puede lanzar mientras se trabaja sin estropear ninguna medición.
 *
 * El día que el cliente apruebe cambiar un precio, esta puerta se pondrá roja en los casos
 * afectados. Eso es lo correcto: entonces se recaptura el oráculo — si el original aún vive — o
 * se anota el cambio como deliberado. Lo que no puede pasar es que un precio cambie sin que
 * nadie se entere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { calcula, rangoTexto, subtitulo, dolares, LINEAS_DESGLOSE } from '../src/lib/estimador.js';

const RAIZ = path.resolve(import.meta.dirname, '..');
const F = path.join(RAIZ, '_source/estimator-casos.json');
if (!fs.existsSync(F)) {
  console.error('\nROJO falta _source/estimator-casos.json — se captura con `node scripts/capturar-oraculo.mjs`');
  console.error('     y OJO: solo se puede capturar mientras exista el bundle original.\n');
  process.exit(1);
}
const oraculo = JSON.parse(fs.readFileSync(F, 'utf8'));

/** El desglose tal cual lo pinta el original: etiquetas legibles y las de valor 0 escondidas. */
const comoElOriginal = (d) => Object.fromEntries(LINEAS_DESGLOSE
  .filter(([k, , ocultaEnCero]) => !(ocultaEnCero && d[k] <= 0))
  .map(([k, etiqueta]) => [etiqueta, dolares(d[k])]));

let ok = 0;
const rojos = [];
const porBloque = {};

for (const [i, caso] of oraculo.casos.entries()) {
  const r = calcula(caso.entradas);
  const fallos = [];
  if (r.min !== caso.min) fallos.push(`min ${caso.min} -> ${r.min}`);
  if (r.max !== caso.max) fallos.push(`max ${caso.max} -> ${r.max}`);
  const texto = rangoTexto(r.min, r.max);
  if (texto !== caso.rango) fallos.push(`texto "${caso.rango}" -> "${texto}"`);
  const sub = subtitulo(caso.entradas.proyecto);
  if (sub !== caso.subtitulo) fallos.push(`subtitulo "${caso.subtitulo}" -> "${sub}"`);

  const mio = comoElOriginal(r.desglose);
  for (const k of new Set([...Object.keys(caso.desglose), ...Object.keys(mio)])) {
    if (caso.desglose[k] !== mio[k]) fallos.push(`${k}: ${caso.desglose[k] ?? '(no sale)'} -> ${mio[k] ?? '(no sale)'}`);
  }

  const b = porBloque[caso.bloque] ??= { ok: 0, mal: 0 };
  if (fallos.length) { rojos.push({ i, caso, fallos }); b.mal++; } else { ok++; b.ok++; }
}

console.log('');
for (const [b, n] of Object.entries(porBloque)) {
  console.log(`  ${n.mal ? 'ROJO' : 'ok  '} ${b.padEnd(12)} ${String(n.ok).padStart(3)}/${n.ok + n.mal}`);
}

if (rojos.length) {
  console.log('\n── detalle\n');
  for (const { i, caso, fallos } of rojos.slice(0, 8)) {
    const e = caso.entradas;
    console.log(`  caso ${i} (${caso.bloque}) — ${e.proyecto} · ${e.tamano}sqft ${e.estilo}/${e.acabado} · `
      + `deck ${e.deck} ${e.material} · spa ${e.spa} · ${e.luces} luces`);
    fallos.slice(0, 6).forEach((f) => console.log(`       ${f}`));
  }
  if (rojos.length > 8) console.log(`  ... y ${rojos.length - 8} casos mas`);
}

console.log(`\n  ${ok}/${oraculo.casos.length} casos reproducidos · oráculo capturado el ${oraculo.capturadoEl.slice(0, 10)}`);
console.log(`  el oráculo coincidió ${oraculo.contraElVivo?.ok ?? 0}/10 contra el dominio vivo`);
console.log(`\n${rojos.length === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${rojos.length} caso(s)`}\n`);
process.exit(rojos.length ? 1 : 0);
