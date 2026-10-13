#!/usr/bin/env node
/**
 * PUERTA · los iconos de «Why homeowners pick us»: por dato, y de cuatro en cuatro.
 *
 *     npm run check:iconos-conf    estatica, sin navegador, sobre .vercel/output/static
 *
 * Cada razon lleva su clave (`icono`) en `src/data/captacion-servicios.json` y el dibujo es
 * `src/assets/iconos-conf/<clave>.svg`. `ConfianzaCore.astro` pinta los cuatro de una seccion o
 * ninguno. Esta puerta comprueba las tres cosas que eso promete:
 *
 *   1 · LOS DIBUJOS son lo que se pidio: un solo `<path>`, `fill="currentColor"`, `viewBox`, sin
 *       `width`/`height`, sin metadatos, y menos de 2 KB — o con su exceso declarado.
 *   2 · LAS CLAVES existen: toda clave del JSON tiene dibujo o esta en PENDIENTES. Una clave
 *       inventada o un dibujo borrado no dejan la seccion «sin iconos» callando: salen aqui.
 *   3 · EL BUILD: cada una de las secciones lleva cuatro iconos si sus cuatro claves tienen dibujo
 *       y ninguno si no. Ninguna mezclada. Cada `<svg>` en linea, `aria-hidden` y sin foco.
 *
 * ANADIR UN ICONO es un fichero y una linea: `src/assets/iconos-conf/<clave>.svg` y quitar la
 * clave de PENDIENTES. Las secciones que la esperaban se completan solas.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIST = path.join(RAIZ, '.vercel/output/static');
const DIBUJOS = path.join(RAIZ, 'src/assets/iconos-conf');
const TOPE = 2048;

/** Claves que el JSON ya usa y cuyo dibujo no ha llegado. Con dibujo y aqui a la vez, la puerta lo dice. */
const PENDIENTES = {
  florida: '«hecho para Florida» (materiales, viento, clima): el quinto icono de la familia, pedido el 13-oct-2026',
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
  if (PENDIENTES[clave]) mal.push('ya tiene dibujo: quitala de PENDIENTES');
  if (mal.length) rojo(`${clave}.svg · ${mal.join(' · ')}`); else ok(`${clave}.svg · ${peso} B${peso >= TOPE ? ` — pasa de ${TOPE}, declarado: ${PESADOS[clave]}` : ''}`);
}
for (const k of Object.keys(PESADOS)) if (!dibujos[k]) rojo(`PESADOS nombra «${k}», que no tiene dibujo`);

console.log('\n── 2 · las claves del JSON');
const datos = Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/captacion-servicios.json'), 'utf8'))).filter(([, v]) => v?.confianza);
const uso = new Map();
for (const [ruta, { confianza }] of datos) {
  if (confianza.tarjetas.length !== 4) rojo(`${ruta} · ${confianza.tarjetas.length} razones, tienen que ser cuatro`);
  for (const t of confianza.tarjetas) {
    if (!('icono' in t)) rojo(`${ruta} · «${t.titulo}» no dice su clave (\`icono\`): si no lleva, \`null\``);
    uso.set(t.icono ?? null, (uso.get(t.icono ?? null) ?? 0) + 1);
  }
}
for (const [clave, n] of [...uso].sort((a, b) => b[1] - a[1])) {
  if (clave === null) console.log(`  --   sin clave · ${n} razon(es): no tienen familia de icono, y su seccion no puede completarse`);
  else if (dibujos[clave]) ok(`${clave} · ${n} razon(es)`);
  else if (PENDIENTES[clave]) console.log(`  --   ${clave} · ${n} razon(es) · PENDIENTE: ${PENDIENTES[clave]}`);
  else rojo(`${clave} · ${n} razon(es) · ni tiene dibujo ni esta declarada pendiente`);
}
for (const k of Object.keys(PENDIENTES)) if (!uso.has(k)) rojo(`PENDIENTES nombra «${k}», que ninguna razon usa`);

console.log('\n── 3 · el build: cuatro o ninguno');
const cuenta = { cuatro: 0, ninguno: 0 };
for (const [ruta, { confianza }] of datos) {
  const f = path.join(DIST, ruta, 'index.html');
  if (!fs.existsSync(f)) { rojo(`${ruta} · no esta en el build`); continue; }
  const sec = fs.readFileSync(f, 'utf8').match(/<section class="svc-confianza[^>]*>.*?<\/section>/s)?.[0];
  if (!sec) { rojo(`${ruta} · sin la seccion`); continue; }
  const razones = sec.split('<li class="mm-razon"').slice(1);
  const svgs = razones.map((r) => r.match(/<span class="mm-razon-ico">(<svg [^>]*>)/)?.[1] ?? null);
  const completa = confianza.tarjetas.every((t) => dibujos[t.icono]);
  const n = svgs.filter(Boolean).length;
  if (razones.length !== 4) rojo(`${ruta} · ${razones.length} razones pintadas`);
  else if (n !== (completa ? 4 : 0)) rojo(`${ruta} · ${n} icono(s): ${completa ? 'sus cuatro claves tienen dibujo y tenian que salir los cuatro' : 'le falta algun dibujo y no tenia que salir ninguno'}`);
  else if (completa !== sec.includes('mm-razones--ico')) rojo(`${ruta} · la lista ${completa ? 'no lleva' : 'lleva'} \`mm-razones--ico\``);
  else cuenta[completa ? 'cuatro' : 'ninguno']++;
  for (const s of svgs.filter(Boolean)) if (!/aria-hidden="true"/.test(s) || !/focusable="false"/.test(s) || /xmlns|width=|height=/.test(s)) rojo(`${ruta} · un <svg> sin \`aria-hidden\`/\`focusable="false"\`, o con xmlns o medidas: ${s}`);
  completa && confianza.tarjetas.forEach((t, i) => { if (!razones[i]?.includes(dibujos[t.icono].match(/ d="([^"]+)"/)[1])) rojo(`${ruta} · la razon ${i + 1} («${t.titulo}») no lleva el dibujo de su clave, «${t.icono}»`); });
}
console.log(`  ${cuenta.cuatro + cuenta.ninguno === datos.length ? 'ok  ' : '--  '} ${datos.length} secciones · ${cuenta.cuatro} con sus cuatro iconos · ${cuenta.ninguno} sin ninguno · ${datos.length - cuenta.cuatro - cuenta.ninguno} mezcladas o rotas`);
const ind = fs.readFileSync(path.join(DIST, 'industry-solutions/index.html'), 'utf8');
if (ind.includes('mm-razon')) rojo('/industry-solutions lleva la pieza de las razones: queda fuera'); else ok('/industry-solutions sigue con su lista, sin iconos');
const png = fs.readdirSync(DIST, { recursive: true }).filter((f) => /iconos-conf|(?:plano-medidas|documento-sello|documento-llave)\.png$/.test(String(f)));
if (png.length) rojo(`los originales no van a public/: ${png.join(', ')}`); else ok('ningun PNG de origen en el build: los iconos van en linea, sin peticion');

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — cada seccion lleva sus cuatro iconos o ninguno, y toda clave tiene dibujo o esta declarada'}\n`);
process.exit(fallos ? 1 : 0);
