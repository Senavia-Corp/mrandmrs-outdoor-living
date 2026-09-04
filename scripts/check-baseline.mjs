#!/usr/bin/env node
/**
 * PUERTA de la Fase 1. Falla si el baseline no sirve para demostrar la paridad.
 *
 *     npm run check:baseline              los 8 checks
 *     npm run check:baseline -- --rapido  se salta el 7 (el único que abre navegador)
 *
 * Qué vigila, y por qué cada uno:
 *
 *  1. Que estén las 115 de cada cosa. Una ruta que no se capturó no da error en ningún
 *     sitio: simplemente deja de compararse, y check:texto sale verde sobre 114.
 *  2. Que las 460 capturas existan Y SEAN JPEG DECODIFICABLE del ancho esperado. Un
 *     fichero de 0 bytes existe y pasa un `-f`; eso ya pasó en la Fase 2 con los 403
 *     guardados como .webp.
 *  3. Que ninguna captura se abortara por la sonda y que ninguna ruta fallara al cargar.
 *     OJO: al probarlo en rojo se descubrió que la mitad de «foco» de la sonda NO PUEDE
 *     fallar bajo Playwright —emula el foco a propósito, ver el comentario en lib/captura.mjs—.
 *     La mitad de «errores de carga» sí se forzó en rojo (una ruta 404). El detector real
 *     del fallo que esto pretende evitar es el check 4.
 *  4. Que no quede un solo [data-w-id] invisible.
 *  5. Que el SEO capturado tenga sentido, y que siga siendo VERDAD lo que se midió del
 *     origen (0 canónicas en 115).
 *  6. Que ningún texto esté vacío o sea absurdamente corto.
 *  7. DETERMINISMO. Recaptura 3 arquetipos y exige el mismo sha256 en HTML y texto y
 *     >=99,5 % de píxeles iguales. Sin esto, el umbral de 99 % de check:visual no
 *     significa nada: mediría el ruido de la captura, no la migración.
 *  8. Que el baseline esté en `git ls-files`, no solo en el disco de esta máquina. Es la
 *     regla que faltó en Pergola Plus: una puerta que lee el disco local no dice nada
 *     sobre lo desplegado, y estas capturas no se pueden regenerar tras el corte.
 *
 * PROBADA EN ROJO — las roturas están pegadas en MIGRACION-LOG.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { ANCHOS, ANCHO_DOM, ESCALA, aSlug, normalizarHtml } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const B = path.join(RAIZ, 'baseline');
const RAPIDO = process.argv.includes('--rapido');

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`  ${ok ? '✅' : '🔴'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
  return ok;
};
const lista = (xs, n = 6) => xs.slice(0, n).forEach((x) => console.log(`       ${x}`))
  || (xs.length > n && console.log(`       … y ${xs.length - n} más`));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const leer = (f, d = null) => (fs.existsSync(path.join(B, f))
  ? JSON.parse(fs.readFileSync(path.join(B, f), 'utf8')) : d);

/**
 * Textos que SÍ pueden ser cortos, uno a uno con su motivo. Nunca se baja el umbral
 * global: eso convertiría el check en un número que ya no avisa de nada.
 */
const TEXTO_CORTO_PERMITIDO = {
  '/pool-investment-estimator':
    'no es una página de Webflow: es una app Astro+React client:only servida por Webflow '
    + 'Cloud, sin nav ni pie. Todo su texto lo pinta React y no tiene cuerpo de marketing.',
};

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));
const N = RUTAS.length;

// ── 1 ───────────────────────────────────────────────────────────────────────
console.log(`\n── 1. están las ${N} de cada cosa`);
const informe = leer('captura-informe.json');
const seo = leer('seo.json', {});
const mapa = leer('rutas.json', {});
if (!check('hay informe de captura', informe !== null,
  informe === null ? 'falta baseline/captura-informe.json — la captura no ha corrido' : '')) {
  console.log('\n🔴 PUERTA ROJA — sin informe no se puede comprobar nada más\n');
  process.exit(1);
}
// Se mide la COBERTURA en vez de mirar un flag: tras una recaptura puntual de unas pocas
// rutas, el flag `parcial` diría que el informe no vale cuando sí vale. Lo que importa es
// que estén las 115 rutas con sus 4 anchos, y eso se cuenta.
const sinCobertura = RUTAS.filter((r) => ANCHOS.some(([w]) => !informe.paginas?.[r]?.alto?.[w]));
check(`el informe cubre ${N} rutas x ${ANCHOS.length} anchos`, sinCobertura.length === 0,
  `${sinCobertura.length} sin medir en algún ancho`);
lista(sinCobertura);
const sinHtml = RUTAS.filter((r) => !fs.existsSync(path.join(B, 'html', `${aSlug(r)}.html`)));
const sinTxt = RUTAS.filter((r) => !fs.existsSync(path.join(B, 'text', `${aSlug(r)}.txt`)));
const sinSeo = RUTAS.filter((r) => !seo[r]);
check(`${N - sinHtml.length}/${N} HTML`, sinHtml.length === 0, `${sinHtml.length} sin capturar`);
lista(sinHtml);
check(`${N - sinTxt.length}/${N} textos`, sinTxt.length === 0, `${sinTxt.length} sin capturar`);
lista(sinTxt);
check(`${N - sinSeo.length}/${N} entradas de SEO`, sinSeo.length === 0, `${sinSeo.length} sin capturar`);
lista(sinSeo);
check(`rutas.json con las ${N}`, Object.keys(mapa).length === N, `${Object.keys(mapa).length}`);
for (const f of ['robots.txt', 'sitemap.xml'])
  check(`${f} del origen`, fs.existsSync(path.join(B, f)));

// ── 2 ───────────────────────────────────────────────────────────────────────
console.log(`\n── 2. las ${N * ANCHOS.length} capturas existen y SON un JPEG del ancho esperado`);
const rotas = []; let vistas = 0;
for (const [ancho] of ANCHOS) {
  const esperado = Math.round(ancho * ESCALA);
  for (const r of RUTAS) {
    const f = path.join(B, 'shots', String(ancho), `${aSlug(r)}.jpg`);
    if (!fs.existsSync(f)) { rotas.push(`${ancho} ${r} — no existe`); continue; }
    const b = fs.readFileSync(f);
    if (b.length === 0) { rotas.push(`${ancho} ${r} — 0 bytes`); continue; }
    // firma real: un fichero puede existir, pesar y no ser un JPEG
    if (!(b[0] === 0xff && b[1] === 0xd8)) { rotas.push(`${ancho} ${r} — no es JPEG`); continue; }
    vistas++;
  }
}
check(`${vistas}/${N * ANCHOS.length} capturas`, rotas.length === 0, `${rotas.length} mal`);
lista(rotas);
// el ancho se comprueba decodificando, sobre una muestra: decodificar 460 JPEG cuesta minutos
const muestra = RUTAS.filter((_, i) => i % 17 === 0);
const anchoMal = [];
for (const [ancho] of ANCHOS) {
  for (const r of muestra) {
    const f = path.join(B, 'shots', String(ancho), `${aSlug(r)}.jpg`);
    if (!fs.existsSync(f)) continue;
    // En try/catch a propósito: al probar la puerta en rojo, un .jpg que no era un JPEG
    // hacía REVENTAR el script con una excepción de sharp en vez de dar un fallo. Una puerta
    // que se cae no te dice el resto de fallos, y el crash se confunde con un problema de
    // entorno.
    try {
      const m = await sharp(f, { limitInputPixels: false }).metadata();
      if (Math.abs(m.width - Math.round(ancho * ESCALA)) > 1)
        anchoMal.push(`${ancho} ${r} — ${m.width}px, se esperaba ${Math.round(ancho * ESCALA)}`);
    } catch (e) {
      anchoMal.push(`${ancho} ${r} — no se puede decodificar: ${e.message.slice(0, 60)}`);
    }
  }
}
check(`muestra de ${muestra.length * ANCHOS.length} decodifica al ancho correcto`,
  anchoMal.length === 0, `${anchoMal.length} mal`);
lista(anchoMal);

// ── 3 ───────────────────────────────────────────────────────────────────────
console.log('\n── 3. ninguna medición abortada por la sonda de foco');
check('mediciones abortadas', informe.abortadas.length === 0, `${informe.abortadas.length}`);
lista(informe.abortadas.map((a) => `${a.ancho} ${a.ruta} ${JSON.stringify(a.sonda)}`));
check('errores de carga', informe.errores.length === 0, `${informe.errores.length}`);
lista(informe.errores.map((e) => `${e.ancho} ${e.ruta} ${e.estado ?? e.error}`));

// ── 4 ───────────────────────────────────────────────────────────────────────
console.log('\n── 4. ningún [data-w-id] visible se quedó en opacity:0');
check('elementos invisibles', informe.invisibles.length === 0, `${informe.invisibles.length}`);
lista(informe.invisibles.map((i) => `${i.ancho} ${i.ruta} ${i.id} .${i.clase}`));

// ── 5 ───────────────────────────────────────────────────────────────────────
console.log('\n── 5. el SEO capturado tiene sentido');
const sinTitulo = RUTAS.filter((r) => !seo[r]?.title?.trim());
check(`${N - sinTitulo.length}/${N} con <title>`, sinTitulo.length === 0, `${sinTitulo.length} sin título`);
lista(sinTitulo);
// El JSON-LD de estas 8 fichas de proyecto NO parsea EN EL ORIGEN, y el defecto es de Webflow:
// el campo `description` del CMS acaba en salto de línea y lo interpola crudo dentro de la
// cadena JSON. Error real, medido sobre el HTML servido:
//     Bad control character in string literal in JSON at position 443
// O sea que esas 8 páginas publican structured data que ningún parser acepta, Google incluido.
//
// SE REPARAN DESDE EL 3-SEP-2026 (D4 en MIGRACION-LOG.md). `build-paginas.mjs` escapa el
// carácter de control antes de parsear, y `baseline/seo.json` guarda ya el objeto parseado en
// vez del envoltorio `{__sinParsear, __error}`. Por eso el conjunto esperado es VACÍO.
//
// No se baja el listón — se invierte: antes se exigía que fueran EXACTAMENTE esas 8; ahora se
// exige que NO HAYA NINGUNA. Si el capturador vuelve a traer un bloque que no parsea, esto sale
// rojo igual que antes, y ademas `check-seo.mjs` ya no se salta ningún bloque.
const LD_ROTO_EN_ORIGEN = new Set([]);
const ldMal = RUTAS.filter((r) => (seo[r]?.jsonLd ?? []).some((x) => x.__sinParsear));
const ldNuevas = ldMal.filter((r) => !LD_ROTO_EN_ORIGEN.has(r));
const ldArregladas = [...LD_ROTO_EN_ORIGEN].filter((r) => !ldMal.includes(r));
check(`JSON-LD roto: ninguno (las ${8} del origen, reparadas — D4)`,
  ldNuevas.length === 0 && ldArregladas.length === 0,
  `${ldNuevas.length} nuevas · ${ldArregladas.length} que ya no lo están`);
lista([...ldNuevas.map((r) => `NUEVA ${r}`), ...ldArregladas.map((r) => `YA NO ${r}`)]);
const conLd = RUTAS.filter((r) => (seo[r]?.jsonLd ?? []).length > 0).length;
console.log(`     (${conLd}/${N} llevan JSON-LD · ${RUTAS.filter((r) => seo[r]?.meta?.description).length} con description)`);
// El origen NO tiene canónicas: 0 de 115, comprobado. La Fase 9 las añade a propósito,
// así que esto no exige que existan: exige que siga siendo cierto lo que se midió. Si un
// día aparecen, el baseline ya no describe el mismo sitio y hay que recapturar.
const conCanonical = RUTAS.filter((r) => seo[r]?.canonical);
check('el origen sigue sin canónicas (0 esperadas)', conCanonical.length === 0,
  conCanonical.length ? `han aparecido ${conCanonical.length}: el origen cambió, hay que recapturar` : '');
lista(conCanonical);

// ── 6 ───────────────────────────────────────────────────────────────────────
console.log('\n── 6. ningún texto vacío ni absurdamente corto');
const cortos = [];
for (const r of RUTAS) {
  const f = path.join(B, 'text', `${aSlug(r)}.txt`);
  if (!fs.existsSync(f)) continue;
  const n = fs.readFileSync(f, 'utf8').trim().length;
  if (n < 200 && !TEXTO_CORTO_PERMITIDO[r]) cortos.push(`${r} — ${n} caracteres`);
}
check('textos sospechosamente cortos', cortos.length === 0, `${cortos.length}`);
lista(cortos);
for (const [r, motivo] of Object.entries(TEXTO_CORTO_PERMITIDO))
  console.log(`     permitido ${r}: ${motivo.slice(0, 88)}…`);

// ── 7 ───────────────────────────────────────────────────────────────────────
console.log('\n── 7. determinismo: recapturar da lo mismo');
if (RAPIDO) {
  console.log('     ⏭  saltado por --rapido (NO cuenta como verde)');
  fallos++;
} else {
  const { chromium } = await import('playwright');
  const { ARGS_NAVEGADOR, asentar, disparar, textoNormalizado, aJpeg } = await import('./lib/captura.mjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const ARQUETIPOS = ['/', '/about', '/services/custom-deck-builders-in-north-south-florida'];
  const desvios = [];
  const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
  const ctx = await nav.newContext({ viewport: { width: ANCHO_DOM, height: 1080 },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();
  for (const r of ARQUETIPOS) {
    await pag.goto(informe.base + r, { waitUntil: 'load', timeout: 60000 });
    await pag.bringToFront();
    const est = await asentar(pag);
    if (!est.valida) { desvios.push(`${r} — sonda inválida ${JSON.stringify(est.sonda)}`); continue; }

    const html = await pag.content();
    const texto = await textoNormalizado(pag);
    const p = informe.paginas[r];
    // Se compara el HTML NORMALIZADO contra el del baseline normalizado igual: el sha
    // guardado es del crudo, y el crudo trae 4 cosas que cambian en cada carga sin cambiar
    // nada visible (ver normalizarHtml). El fichero en disco se queda crudo, que es la
    // evidencia; lo que se compara es lo que de verdad tiene que ser estable.
    const guardado = fs.readFileSync(path.join(B, 'html', `${aSlug(r)}.html`), 'utf8');
    if (sha(normalizarHtml(html)) !== sha(normalizarHtml(guardado)))
      desvios.push(`${r} — el HTML no coincide con el baseline (ya normalizado)`);
    if (sha(texto) !== p?.sha256Texto) desvios.push(`${r} — el TEXTO no coincide con el baseline`);

    const { buffer } = await aJpeg(sharp, await disparar(pag));
    const viejo = sharp(path.join(B, 'shots', String(ANCHO_DOM), `${aSlug(r)}.jpg`), { limitInputPixels: false });
    const mv = await viejo.metadata();
    const mn = await sharp(buffer, { limitInputPixels: false }).metadata();
    if (mv.width !== mn.width || mv.height !== mn.height) {
      desvios.push(`${r} — la captura cambió de tamaño: ${mv.width}x${mv.height} -> ${mn.width}x${mn.height}`);
      continue;
    }
    const cruda = (s) => s.ensureAlpha().raw().toBuffer();
    const [a, b] = await Promise.all([
      cruda(sharp(path.join(B, 'shots', String(ANCHO_DOM), `${aSlug(r)}.jpg`), { limitInputPixels: false })),
      cruda(sharp(buffer, { limitInputPixels: false })),
    ]);
    const distintos = pixelmatch(a, b, null, mv.width, mv.height, { threshold: 0.1 });
    const igual = 100 * (1 - distintos / (mv.width * mv.height));
    console.log(`     ${r.padEnd(52).slice(0, 52)} ${igual.toFixed(3)} % de píxeles iguales`);
    if (igual < 99.5) desvios.push(`${r} — solo ${igual.toFixed(2)} % de píxeles iguales`);
  }
  await nav.close();
  check(`${ARQUETIPOS.length} arquetipos reproducen`, desvios.length === 0, `${desvios.length} desvíos`);
  lista(desvios);
}

// ── 8 ───────────────────────────────────────────────────────────────────────
console.log('\n── 8. el baseline está en git, no solo en este disco');
let enGit = new Set();
try {
  enGit = new Set(execSync('git ls-files baseline', { cwd: RAIZ, encoding: 'utf8' })
    .split('\n').filter(Boolean));
} catch { /* sin repo */ }
const enDisco = [];
(function barrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) barrer(f);
    else if (e.name !== '.DS_Store') enDisco.push(path.relative(RAIZ, f));
  }
}(B));
const fuera = enDisco.filter((f) => !enGit.has(f));
check(`${enDisco.length - fuera.length}/${enDisco.length} ficheros del baseline versionados`,
  fuera.length === 0, `${fuera.length} fuera de git`);
lista(fuera);
console.log('     (Vercel construye desde el clon de git; y estas capturas no se pueden');
console.log('      regenerar cuando Webflow deje de servir el sitio)');

console.log(`\n${fallos === 0 ? '✅ PUERTA VERDE' : `🔴 PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
