#!/usr/bin/env node
/**
 * PUERTA · los iconos de «Why homeowners pick us»: cuatro en cada seccion, y el que toca.
 *
 *     npm run check:iconos-conf    estatica, sin navegador, sobre .vercel/output/static
 *
 * Cada razon lleva su clave (`icono`) en `src/data/captacion-servicios.json` y el dibujo es
 * `src/assets/iconos-conf/<clave>.svg`. Si la clave no tiene dibujo, o la razon no tiene clave,
 * sale el de su posicion en la fila (`src/lib/iconos-conf.mjs`). Esta puerta comprueba:
 *
 *   1 · LOS DIBUJOS son lo que se pidio: un solo `<path>`, `fill="currentColor"`, `viewBox`, sin
 *       `width`/`height`, sin metadatos, y menos de 2 KB — o con su exceso declarado.
 *   2 · LAS CLAVES: toda clave del JSON tiene dibujo o esta en SIN_DIBUJO. Una clave inventada o
 *       un dibujo borrado no caen al respaldo callando: salen aqui.
 *   3 · EL BUILD: las cuatro razones de cada seccion llevan icono, y cada una el suyo — el de su
 *       clave, o el de su posicion si su clave no tiene dibujo. Cada `<svg>` en linea,
 *       `aria-hidden` y sin foco.
 *
 * DAR DIBUJO A UNA CLAVE es un fichero y una linea: `src/assets/iconos-conf/<clave>.svg` y quitar
 * la clave de SIN_DIBUJO. Las razones que la llevan dejan de usar el respaldo solas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RESPALDO, dibujoDe } from '../src/lib/iconos-conf.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, '.vercel/output/static');
const DIBUJOS = path.join(RAIZ, 'src/assets/iconos-conf');
const TOPE = 2048;

/** Claves que el JSON usa y que no tienen dibujo propio: salen con el de su posicion. Con dibujo y aqui a la vez, la puerta lo dice. */
const SIN_DIBUJO = {
  florida: '«hecho para Florida» (materiales, viento, clima): no hay quinto icono',
};
/** Dibujos que pasan de 2 KB, con el porque. Uno que deje de pasarse y siga aqui, tambien se dice. */
const PESADOS = {
  licencia: 'dos hojas, cinco renglones, una firma y un engranaje de ocho dientes: 173 tramos. A 2 KB hay que redondearle las esquinas',
};

let fallos = 0;
const rojo = (m) => { console.log(`  ROJO ${m}`); fallos++; };
const ok = (m) => console.log(`  ok   ${m}`);

console.log('\n── 1 · los dibujos');
const dibujos = Object.fromEntries(fs.readdirSync(DIBUJOS).filter((f) => f.endsWith('.svg')).map((f) => [f.slice(0, -4), fs.readFileSync(path.join(DIBUJOS, f), 'utf8')]));
for (const [clave, svg] of Object.entries(dibujos)) {
  const mal = [];
  if ((svg.match(/<path\b/g) ?? []).length !== 1 || /<(?!\/?(?:svg|path)\b)[a-z]/i.test(svg)) mal.push('no es un solo <path>');
  if (!/<path fill="currentColor" d="[^"]+"\/>/.test(svg)) mal.push('el <path> no es `fill="currentColor"` y nada mas');
  if (!/<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/.test(svg)) mal.push('sin viewBox');
  if (/<svg [^>]*\b(?:width|height)=/.test(svg)) mal.push('con width/height fijos');
  if (/<!--|<\?xml|<title|<desc|<metadata|\bid=|\bstyle=|#[0-9a-f]{3,8}\b/i.test(svg)) mal.push('con metadatos o color fijo');
  const peso = Buffer.byteLength(svg);
  if (peso >= TOPE && !PESADOS[clave]) mal.push(`pesa ${peso} B, el tope son ${TOPE}`);
  if (peso < TOPE && PESADOS[clave]) mal.push(`ya pesa ${peso} B: su entrada en PESADOS sobra, borrala`);
  if (SIN_DIBUJO[clave]) mal.push('ya tiene dibujo: quitala de SIN_DIBUJO');
  if (mal.length) rojo(`${clave}.svg · ${mal.join(' · ')}`); else ok(`${clave}.svg · ${peso} B${peso >= TOPE ? ` — pasa de ${TOPE}, declarado: ${PESADOS[clave]}` : ''}`);
}
for (const k of Object.keys(PESADOS)) if (!dibujos[k]) rojo(`PESADOS nombra «${k}», que no tiene dibujo`);
for (const k of RESPALDO) if (!dibujos[k]) rojo(`el respaldo por posicion nombra «${k}», que no tiene dibujo`);

console.log('\n── 2 · las claves del JSON');
const datos = Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'))).filter(([, v]) => v?.confianza);
const tiene = (k) => k in dibujos;
const uso = new Map();   // clave -> { n, posiciones }
for (const [ruta, { confianza }] of datos) {
  if (confianza.tarjetas.length !== 4) rojo(`${ruta} · ${confianza.tarjetas.length} razones, tienen que ser cuatro`);
  confianza.tarjetas.forEach((t, i) => {
    if (!('icono' in t)) rojo(`${ruta} · «${t.titulo}» no dice su clave (\`icono\`): si no tiene familia, \`null\``);
    const u = uso.get(t.icono ?? null) ?? uso.set(t.icono ?? null, { n: 0, pos: new Set() }).get(t.icono ?? null);
    u.n++; u.pos.add(i);
  });
}
const sale = (u) => [...u.pos].sort().map((i) => `${i + 1}.a → ${RESPALDO[i]}`).join(', ');
for (const [clave, u] of [...uso].sort((a, b) => b[1].n - a[1].n)) {
  if (clave === null) console.log(`  --   sin clave · ${u.n} razon(es) sin familia de icono · por posicion: ${sale(u)}`);
  else if (dibujos[clave]) ok(`${clave} · ${u.n} razon(es) · por dato`);
  else if (SIN_DIBUJO[clave]) console.log(`  --   ${clave} · ${u.n} razon(es) · ${SIN_DIBUJO[clave]} · por posicion: ${sale(u)}`);
  else rojo(`${clave} · ${u.n} razon(es) · ni tiene dibujo ni esta declarada en SIN_DIBUJO`);
}
for (const k of Object.keys(SIN_DIBUJO)) if (!uso.has(k)) rojo(`SIN_DIBUJO nombra «${k}», que ninguna razon usa`);

console.log('\n── 3 · el build: cuatro en cada seccion, y cada uno el suyo');
const cuenta = { cuatro: 0, ninguno: 0, respaldo: 0, repetido: [] };
const trazo = (k) => dibujos[k]?.match(/ d="([^"]+)"/)?.[1];
for (const [ruta, { confianza }] of datos) {
  const f = path.join(DIST, ruta, 'index.html');
  if (!fs.existsSync(f)) { rojo(`${ruta} · no esta en el build`); continue; }
  const sec = fs.readFileSync(f, 'utf8').match(/<section class="svc-confianza[^>]*>.*?<\/section>/s)?.[0];
  if (!sec) { rojo(`${ruta} · sin la seccion`); continue; }
  const razones = sec.split('<li class="mm-razon"').slice(1);
  const svgs = razones.map((r) => r.match(/<span class="mm-razon-ico">(<svg [^>]*>)/)?.[1] ?? null);
  const n = svgs.filter(Boolean).length;
  const toca = confianza.tarjetas.map((t, i) => dibujoDe(t.icono, i, tiene));
  let bien = true;
  if (razones.length !== 4) { rojo(`${ruta} · ${razones.length} razones pintadas`); bien = false; }
  else if (n !== 4) { rojo(`${ruta} · ${n} icono(s): tienen que ser los cuatro`); bien = false; }
  else if (!sec.includes('mm-razones--ico')) { rojo(`${ruta} · la lista no lleva \`mm-razones--ico\``); bien = false; }
  for (const s of svgs.filter(Boolean)) if (!/aria-hidden="true"/.test(s) || !/focusable="false"/.test(s) || /xmlns|width=|height=/.test(s)) { rojo(`${ruta} · un <svg> sin \`aria-hidden\`/\`focusable="false"\`, o con xmlns o medidas: ${s}`); bien = false; }
  toca.forEach((k, i) => { if (!trazo(k) || !razones[i]?.includes(trazo(k))) { rojo(`${ruta} · la razon ${i + 1} («${confianza.tarjetas[i].titulo}») no lleva el dibujo que le toca, «${k}»`); bien = false; } });
  if (bien) cuenta.cuatro++; else if (n === 0) cuenta.ninguno++;
  cuenta.respaldo += confianza.tarjetas.filter((t, i) => toca[i] !== t.icono).length;
  if (new Set(toca).size < 4) cuenta.repetido.push(`${ruta} (${toca.join(', ')})`);
}
console.log(`  ${cuenta.cuatro === datos.length ? 'ok  ' : '--  '} ${datos.length} secciones · ${cuenta.cuatro} con sus cuatro iconos · ${cuenta.ninguno} sin ninguno · ${datos.length - cuenta.cuatro - cuenta.ninguno} mezcladas o rotas`);
console.log(`  --   ${cuenta.respaldo} razon(es) llevan el dibujo de su posicion y no el de su clave`);
for (const r of cuenta.repetido) console.log(`  --   un mismo dibujo dos veces en ${r}: dos de sus razones tienen la misma clave`);
const ind = fs.readFileSync(path.join(DIST, 'industry-solutions/index.html'), 'utf8');
if (ind.includes('mm-razon')) rojo('/industry-solutions lleva la pieza de las razones: queda fuera'); else ok('/industry-solutions sigue con su lista, sin iconos');
const png = fs.readdirSync(DIST, { recursive: true }).filter((f) => /iconos-conf|(?:plano-medidas|documento-sello|documento-llave)\.png$/.test(String(f)));
if (png.length) rojo(`los originales no van a public/: ${png.join(', ')}`); else ok('ningun PNG de origen en el build: los iconos van en linea, sin peticion');

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — las cuatro razones de cada seccion llevan icono, cada una el que le toca'}\n`);
process.exit(fallos ? 1 : 0);
