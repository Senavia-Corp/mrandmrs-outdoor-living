#!/usr/bin/env node
/**
 * EL UNICO ESCRITOR DE `baseline/shots/`.
 *
 *     node scripts/aprobar-diseno.mjs / --si
 *     node scripts/aprobar-diseno.mjs /about /gallery --si
 *
 * Re-baselinizar es el UNICO acto irreversible del sistema: a partir de aqui `check:visual` deja
 * de defender la captura de Webflow y pasa a defender esta. Si la captura nueva lleva un defecto
 * dentro, el defecto se convierte en la verdad y la puerta lo protege — por eso esto lo corre solo
 * el director, y solo despues de que el humano haya aprobado la pagina MIRANDOLA (PROMPT-REDISENO
 * §5 y §8.5). El `--si` obligatorio existe para que no se pueda hacer sin querer.
 *
 * NO hay alias en package.json a proposito: el unico acto irreversible se escribe entero.
 *
 * LA RECETA ES LA MISMA, o la comparacion deja de significar nada. `ANCHOS`, `asentar()`,
 * `disparar()` y `aJpeg()` salen de `scripts/lib/captura.mjs`, que es de donde los saca tambien
 * `check:visual` y de donde los saco el baseline original. Reimplementar aqui el congelado haria
 * que la referencia y la medicion se tomaran con dos recetas que divergen al primer arreglo.
 *
 * SE NIEGA A CORRER SI:
 *   1. falta `--si`                     -> no se re-baseliniza de paso mientras haces otra cosa
 *   2. el arbol de git no esta limpio   -> no se sabria QUE codigo produjo esta referencia
 *   3. la ruta no figura en `disenio/contratos.json` con contrato `rediseno` (y su motivo)
 *   4. no hay build, o el build es mas viejo que `src/`+`public/`  -> capturaria el sitio de ayer
 *   5. la medicion no es valida, o queda un `[data-w-id]` invisible -> hornearia una seccion en
 *      blanco como si fuera el diseño aprobado. Es el §8.5 en su version peor: invisible.
 *
 * QUE HACE CON LA CAPTURA VIEJA: la MUEVE a `baseline/webflow-2026-08/shots/<ancho>/`. No la
 * borra — es la unica prueba de paridad con Webflow y no se puede regenerar una vez se corte el
 * dominio. Si ahi ya hay una, se DEJA la que ya estaba: esa es la de Webflow, y una segunda
 * aprobacion de la misma ruta no puede pisarla con la del rediseño anterior.
 *
 * Y ESCRIBE AL FINAL, NO SOBRE LA MARCHA: primero captura los 4 anchos de todas las rutas en
 * memoria y solo entonces toca el disco. Un fallo en el ancho 3 no puede dejar una ruta con dos
 * anchos nuevos y dos viejos, que es un estado que ninguna puerta sabe leer.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ANCHOS, ARGS_NAVEGADOR, aSlug, asentar, disparar, aJpeg } from './lib/captura.mjs';
import { leerContratos, contratoDe, FICHERO } from './lib/contratos.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const SHOTS = path.join(RAIZ, 'baseline/shots');
/** El archivo de la paridad. La fecha va en el nombre: retrata a Webflow en agosto de 2026. */
const ARCHIVO = path.join(RAIZ, 'baseline/webflow-2026-08/shots');

const rel = (p) => path.relative(RAIZ, p);
const niega = (motivo, detalle = '') => {
  console.error(`\nSE NIEGA — ${motivo}\n${detalle ? detalle + '\n' : ''}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const rutas = args.filter((a) => !a.startsWith('--'));

// 1 · el --si
if (!rutas.length) niega('no has dicho que ruta', '   node scripts/aprobar-diseno.mjs / --si');
if (!args.includes('--si')) {
  niega('falta --si', `   Vas a SUSTITUIR la referencia de ${rutas.length} ruta(s) x ${ANCHOS.length} anchos.\n`
    + '   A partir de ahi check:visual defiende la captura NUEVA, defectos incluidos.\n'
    + '   Si el humano ya la ha aprobado mirandola, repitelo con --si.');
}

// 2 · el arbol limpio
const sucio = execFileSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).trim();
if (sucio) {
  niega('el arbol de git no esta limpio',
    '   Una referencia aprobada tiene que poder atribuirse a un sha. Commitea primero.\n\n'
    + sucio.split('\n').slice(0, 15).map((l) => '   ' + l).join('\n'));
}
const SHA = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();

// 3 · el contrato
const CONTRATOS = leerContratos();
for (const r of rutas) {
  if (contratoDe(CONTRATOS, r) !== 'rediseno') {
    niega(`${r} no figura en ${rel(FICHERO)} con contrato "rediseno"`,
      '   Declararla ahi, con fecha, sha y motivo, es lo que deja constancia de POR QUE se\n'
      + '   rompio la paridad. Sin eso, dentro de tres meses la referencia nueva no se distingue\n'
      + '   de una regresion que alguien horneo sin darse cuenta.');
  }
}

// 4 · el build fresco
if (!fs.existsSync(ESTATICO)) niega(`no hay ${rel(ESTATICO)}`, '   npm run build');
const masReciente = (dir) => {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? masReciente(p) : fs.statSync(p).mtimeMs);
  }
  return t;
};
const tFuente = Math.max(masReciente(path.join(RAIZ, 'src')), masReciente(path.join(RAIZ, 'public')));
const tBuild = masReciente(ESTATICO);
if (tBuild < tFuente) {
  niega('el build es mas VIEJO que src/ o public/',
    `   build   ${new Date(tBuild).toISOString()}\n   fuente  ${new Date(tFuente).toISOString()}\n`
    + '   Capturarias el sitio de antes del ultimo cambio y lo hornearias como referencia.\n'
    + '   npm run build');
}

// ── el servidor estatico, el mismo que usa check:visual: las puertas miden sobre
//    .vercel/output/static, nunca sobre `astro dev`, que no hornea width/height igual.
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
const BASE = `http://localhost:${servidor.address().port}`;

console.log(`\n  aprobar-diseno · ${rutas.length} ruta(s) x ${ANCHOS.length} anchos · sha ${SHA}\n`);

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const pendientes = [];
try {
  for (const [ancho, alto] of ANCHOS) {
    console.log(`── ${ancho}px`);
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
      deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const pag = await ctx.newPage();
    for (const ruta of rutas) {
      const resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 40000 }).catch(() => null);
      if (!resp?.ok()) niega(`${ruta} a ${ancho}px responde HTTP ${resp?.status()}`);
      await pag.bringToFront();
      const est = await asentar(pag);
      if (!est.valida) niega(`medicion invalida en ${ruta} a ${ancho}px`, `   ${JSON.stringify(est.sonda)}`);
      if (est.invisibles.length) {
        niega(`${ruta} a ${ancho}px: ${est.invisibles.length} elemento(s) [data-w-id] en opacity:0`,
          est.invisibles.slice(0, 8).map((i) => `   ${i.id}  ${i.clase}`).join('\n')
          + '\n   Aprobar esto hornearia una seccion invisible como si fuera el diseño bueno.');
      }
      const { meta, buffer } = await aJpeg(sharp, await disparar(pag));
      pendientes.push({ ancho, ruta, buffer });
      console.log(`  capturada ${ruta.padEnd(52).slice(0, 52)} ${String(meta.height).padStart(6)}px`
        + ` ${(buffer.length / 1024).toFixed(0).padStart(4)}k`);
    }
    await ctx.close();
  }
} finally {
  await nav.close();
  servidor.close();
}

// ── y solo ahora, el disco
console.log('');
let movidas = 0, conservadas = 0;
for (const { ancho, ruta, buffer } of pendientes) {
  const slug = aSlug(ruta);
  const ref = path.join(SHOTS, String(ancho), `${slug}.jpg`);
  const arch = path.join(ARCHIVO, String(ancho), `${slug}.jpg`);
  fs.mkdirSync(path.dirname(ref), { recursive: true });
  if (fs.existsSync(ref)) {
    if (fs.existsSync(arch)) { conservadas++; }      // la del archivo es la de Webflow: no se pisa
    else { fs.mkdirSync(path.dirname(arch), { recursive: true }); fs.renameSync(ref, arch); movidas++; }
  }
  fs.writeFileSync(ref, buffer);
}

console.log(`  ${pendientes.length} referencia(s) escritas en ${rel(SHOTS)}`);
console.log(`  ${movidas} archivadas en ${rel(ARCHIVO)} · ${conservadas} ya estaban archivadas (se dejan)`);
console.log('\n  Repasa `git diff --stat -- baseline/` y commitea: la referencia y el sha que la');
console.log('  produjo tienen que viajar juntos.\n');
