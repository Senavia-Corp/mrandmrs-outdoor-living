#!/usr/bin/env node
/**
 * PUERTA de texto — el `innerText` de cada página construida contra el del sitio vivo.
 *
 *     npm run check:texto              todas las rutas que existan en el build
 *     npm run check:texto -- /about    solo las que casen
 *
 * UMBRAL: **100 % idéntico**. Sin tolerancia y sin porcentajes: si sobra o falta una palabra,
 * es contenido que se ha perdido o que nos hemos inventado. Es la puerta más severa de todas
 * y la que de verdad demuestra que no se cayó nada por el camino.
 *
 * Corre sobre `.vercel/output/static`, con el MISMO congelado que produjo el baseline
 * (scripts/lib/captura.mjs). Comparar texto sin ejecutar JS daría falsos rojos en todo lo
 * que Webflow pinta en cliente.
 *
 * Las rutas que aún no existen en el build se SALTAN y se cuentan aparte: mientras la Fase 6
 * no esté, no tiene sentido que las 101 de colección salgan en rojo. Lo que no se puede es
 * que una ruta que sí existe salga verde por casualidad.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ARGS_NAVEGADOR, aSlug, asentar, textoNormalizado } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  '.txt': 'text/plain', '.xml': 'application/xml' };

const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
// Puerto 0: uno fijo probaria el proyecto que haya al otro lado si esta ocupado, sin avisar.
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1))
  .filter((r) => !filtro.length || filtro.some((f) => r.includes(f)));

/**
 * Líneas del baseline que YA NO EXISTEN a propósito, con su motivo. Una a una: bajar el
 * umbral del 100 % convertiría esta puerta en un porcentaje que ya no avisa de nada.
 *
 * Todas vienen de la decisión D2 (los widgets de Elfsight se rehacen nativos): son chrome del
 * propio Elfsight, no contenido del cliente.
 */
const QUITADAS_A_PROPOSITO = [
  ['12', 'la paginación del widget de Elfsight en /videos: la galería nativa los pinta todos'],
  ['Free YouTube Video Gallery Widget', 'la marca de Elfsight en /videos. Se va con el widget'],
];

/**
 * Texto que APARECE a propósito, por ruta. Se declara un BLOQUE SEGUIDO, no unas líneas
 * sueltas ni la ruta entera.
 *
 * DECISIÓN D3 (Sebastian, 28-ago-2026): `/pool-cost-estimator` embebía el estimador en un
 * `<iframe>`, o sea en OTRO documento — y `innerText` no cruza documentos, así que su texto
 * nunca contó aquí. Ahora el estimador va montado en la página, y esas 13 líneas entran en el
 * `innerText`. Es exactamente el cambio que se pidió, y no se puede distinguir de un fallo si
 * no se declara.
 *
 * Por qué así y no de otra forma:
 *   · **el bloque se LEE de `baseline/text/pool-investment-estimator.txt`**, no se copia a
 *     mano: si el texto del paso 1 del estimador cambia algún día, la declaración deja de casar
 *     y esta puerta vuelve a rojo, que es justo lo que tiene que pasar;
 *   · se exige SEGUIDO y EN ORDEN. Quitar 13 líneas sueltas dejaría pasar un reordenamiento;
 *   · todo lo demás de la página se sigue comparando al 100 %. Declarar la ruta entera —o bajar
 *     el umbral— habría apagado la puerta en las otras 90 líneas.
 */
const ANADIDAS_A_PROPOSITO = {
  '/pool-cost-estimator': {
    bloque: '/pool-investment-estimator',
    motivo: 'D3: fuera el iframe, el estimador va montado en la pagina. Las 13 lineas son las '
      + 'del paso 1 del estimador, que antes vivian en otro documento.',
  },
};

/** Quita de `hay` el bloque declarado, EXIGIÉNDOLO seguido y en orden. `null` si no está. */
function sinElBloque(ruta, hay) {
  const d = ANADIDAS_A_PROPOSITO[ruta];
  if (!d) return hay;
  const f = path.join(RAIZ, 'baseline/text', `${aSlug(d.bloque)}.txt`);
  if (!fs.existsSync(f)) return hay;
  const bloque = fs.readFileSync(f, 'utf8').trimEnd().split('\n').filter(Boolean);
  const lineas = hay.split('\n');
  for (let i = 0; i + bloque.length <= lineas.length; i++) {
    if (bloque.every((l, j) => lineas[i + j] === l)) {
      return [...lineas.slice(0, i), ...lineas.slice(i + bloque.length)].join('\n');
    }
  }
  return null;   // declarado pero NO está seguido: eso es rojo, y con motivo
}

/** Diferencia legible entre dos textos, línea a línea. */
function diferencias(esperado, hay) {
  const a = esperado.split('\n'), b = hay.split('\n');
  const declaradas = new Set(QUITADAS_A_PROPOSITO.map(([l]) => l));
  const falta = a.filter((l) => !b.includes(l) && !declaradas.has(l));
  const sobra = b.filter((l) => !a.includes(l));
  const fuera = [];
  if (!falta.length && !sobra.length) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { fuera.push(`linea ${i + 1}: orden cambiado`); break; }
    }
  }
  return { falta, sobra, fuera };
}

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pag = await ctx.newPage();

let ok = 0, mal = 0, saltadas = 0;
const rojos = [];

for (const ruta of RUTAS) {
  const slug = aSlug(ruta);
  const ref = path.join(RAIZ, 'baseline/text', `${slug}.txt`);
  const resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  if (!resp?.ok()) { saltadas++; continue; }
  if (!fs.existsSync(ref)) { console.log(`  ROJO ${ruta} — no hay baseline de texto`); mal++; continue; }

  await pag.bringToFront();
  const est = await asentar(pag);
  if (!est.valida) { console.log(`  ROJO ${ruta} — medicion invalida ${JSON.stringify(est.sonda)}`); mal++; continue; }

  const declaradas = new Set(QUITADAS_A_PROPOSITO.map(([l]) => l));
  const esperado = fs.readFileSync(ref, 'utf8').trimEnd().split('\n')
    .filter((l) => !declaradas.has(l)).join('\n');
  const bruto = (await textoNormalizado(pag)).trimEnd();
  const hay = sinElBloque(ruta, bruto);
  if (hay === null) {
    mal++;
    console.log(`  ROJO ${ruta} — el bloque declarado de ${ANADIDAS_A_PROPOSITO[ruta].bloque} no aparece seguido`);
    rojos.push({ ruta, falta: [`bloque declarado ausente o desordenado`], sobra: [], fuera: [] });
    continue;
  }
  if (hay === esperado) {
    ok++;
    console.log(`  ok   ${ruta}${ANADIDAS_A_PROPOSITO[ruta] ? '   (con el bloque declarado de '
      + ANADIDAS_A_PROPOSITO[ruta].bloque + ')' : ''}`);
    continue;
  }

  mal++;
  const d = diferencias(esperado, hay);
  rojos.push({ ruta, ...d });
  console.log(`  ROJO ${ruta} — faltan ${d.falta.length} lineas, sobran ${d.sobra.length}`);
}
await nav.close();
servidor.close();

if (rojos.length) {
  console.log('\n── detalle\n');
  for (const r of rojos.slice(0, 6)) {
    console.log(`  ${r.ruta}`);
    r.falta.slice(0, 6).forEach((l) => console.log(`    FALTA  ${l.slice(0, 100)}`));
    r.sobra.slice(0, 6).forEach((l) => console.log(`    SOBRA  ${l.slice(0, 100)}`));
    r.fuera.forEach((l) => console.log(`    ${l}`));
    if (r.falta.length > 6 || r.sobra.length > 6) console.log('    ...');
    console.log('');
  }
}

console.log(`\n  ${ok} identicas · ${mal} con diferencias · ${saltadas} aun sin construir`);
for (const [r, d] of Object.entries(ANADIDAS_A_PROPOSITO)) {
  console.log(`     declarado ${r}: el bloque de ${d.bloque} — ${d.motivo}`);
}
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} pagina(s)`}\n`);
process.exit(mal ? 1 : 0);
