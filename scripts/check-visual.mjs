#!/usr/bin/env node
/**
 * PUERTA — diff de píxeles contra el baseline, en los 4 anchos.
 *
 *     npm run check:visual                  las 115 (unos 65 min, navegador con foco)
 *     npm run check:visual -- /about /gallery   solo las que casen
 *
 * Usa el MISMO congelado y la MISMA escala que produjo el baseline
 * (`scripts/lib/captura.mjs`). Si esto reimplementara la receta, la comparación dejaría de ser
 * de lo mismo contra lo mismo el día que una de las dos copias se arregle sola.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOBRE EL UMBRAL, QUE NO ES OBVIO
 *
 * En la Fase 4 se midió que «≥99 % de píxeles iguales» **no discrimina** sobre una banda casi
 * vacía: el nav con un enlace movido 6 px daba 99,33 % y pasaba. Sobre una PÁGINA ENTERA sí
 * discrimina —el contenido ocupa casi todo— pero el umbral hay que leerlo sabiendo eso: mide
 * bien un bloque que se mueve o una imagen que falta, y mide mal un detalle pequeño.
 *
 * La tolerancia POR PÍXEL es 0.3, no 0.1. Medido: el reescalado a 1/4 hace que una diferencia
 * de antialiasing de 1 px a tamaño completo se reparta entre los 16 que promedia cada píxel de
 * salida. Con 0.1, contenido IDÉNTICO daba 97,7 %; con 0.3 da 100 %.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DIFERENCIAS DECLARADAS
 *
 * La decisión D2 rehace los widgets de Elfsight en nativo, así que hay páginas donde el sitio
 * nuevo **tiene que verse distinto a propósito**. Se declaran UNA A UNA con su motivo; bajar el
 * umbral global convertiría la puerta en un número que ya no avisa de nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ANCHOS, ARGS_NAVEGADOR, aSlug, asentar, disparar, aJpeg } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const UMBRAL = 99;
const TOLERANCIA = 0.3;
/**
 * Tolerancia de ALTO, en pixeles del JPEG a 1/4 (o sea ~12 px reales). Medido: paginas
 * identicas salen con 1-3 px de diferencia por el redondeo de la captura a pagina completa.
 * Por encima de eso ya no es redondeo: es contenido que crece o encoge, y eso tiene que salir
 * en rojo. Nunca se convierte en porcentaje: un recorte silencioso haria que una pagina que
 * pierde una seccion entera puntuara bien en la parte que queda.
 */
const TOL_ALTO = 3;
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** Páginas que se ven distinto A PROPÓSITO, con su motivo. */
const DISTINTAS_A_PROPOSITO = {
  '/contact-us': 'el widget de Turnstile NO renderiza fuera del dominio registrado. Medido: el '
    + 'script carga y `window.turnstile` existe, pero `render()` no pinta nada en localhost, '
    + 'asi que la pagina sale ~16 px mas corta que el baseline, donde SI estaba pintado. '
    + 'HAY QUE VOLVER A MEDIRLO contra la preview, con el dominio de Vercel dado de alta en el '
    + 'widget de Cloudflare.',
  '/request-estimated': 'lo mismo que /contact-us: es el otro formulario.',
  '/videos': 'la galeria de YouTube era el CUARTO widget de Elfsight y es el unico que SI '
    + 'pintaba. Ahora es nativa (D2), con el diseño del sitio en vez del de Elfsight: mismos 8 '
    + 'videos y mismo texto -check:texto lo exige al 100%- pero otra maqueta.',
};

if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static\n'); process.exit(1); }

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

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1))
  .filter((r) => !filtro.length || filtro.some((f) => r.includes(f)));

const cruda = (s) => s.ensureAlpha().raw().toBuffer();
const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });

let ok = 0, mal = 0, declaradas = 0, saltadas = 0;
const rojos = [];

for (const [ancho, alto] of ANCHOS) {
  console.log(`\n── ${ancho}px`);
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();

  for (const ruta of RUTAS) {
    const ref = path.join(RAIZ, 'baseline/shots', String(ancho), `${aSlug(ruta)}.jpg`);
    if (!fs.existsSync(ref)) { saltadas++; continue; }
    const resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 40000 }).catch(() => null);
    if (!resp?.ok()) { rojos.push([ancho, ruta, `HTTP ${resp?.status()}`]); mal++; continue; }
    await pag.bringToFront();
    const est = await asentar(pag);
    if (!est.valida) { rojos.push([ancho, ruta, `medicion invalida ${JSON.stringify(est.sonda)}`]); mal++; continue; }

    const { buffer } = await aJpeg(sharp, await disparar(pag));
    const ma = await sharp(ref, { limitInputPixels: false }).metadata();
    const mb = await sharp(buffer, { limitInputPixels: false }).metadata();

    const deltaAlto = mb.height - ma.height;
    if (ma.width !== mb.width || Math.abs(deltaAlto) > TOL_ALTO) {
      // Una diferencia de alto GRANDE no se compara a la fuerza recortando: eso daria un
      // porcentaje que parece bueno mientras la pagina crece o encoge. Se reporta como lo que es.
      const dif = `alto ${ma.height} -> ${mb.height} (${deltaAlto > 0 ? '+' : ''}${deltaAlto}px)`;
      if (DISTINTAS_A_PROPOSITO[ruta]) { declaradas++; console.log(`  decl ${ruta} — ${dif}`); }
      else { rojos.push([ancho, ruta, dif]); mal++; }
      continue;
    }

    // Con una diferencia de 1-3 px se compara la parte comun. Es redondeo subpixel de la
    // captura a pagina completa -medido: /gallery +1px y /contact-us +2px sobre paginas de
    // 3527 y 904 px-, no maqueta que se mueve. El delta se IMPRIME siempre, para que 2px
    // repetidos en muchas paginas no pasen desapercibidos.
    const h = Math.min(ma.height, mb.height);
    const recorta = (src) => sharp(src, { limitInputPixels: false })
      .extract({ left: 0, top: 0, width: ma.width, height: h });
    const [pa, pb] = await Promise.all([cruda(recorta(ref)), cruda(recorta(buffer))]);
    const dist = pixelmatch(pa, pb, null, ma.width, h, { threshold: TOLERANCIA });
    const igual = 100 * (1 - dist / (ma.width * h));
    const nota = deltaAlto ? ` (alto ${deltaAlto > 0 ? '+' : ''}${deltaAlto}px)` : '';

    if (igual >= UMBRAL) { ok++; console.log(`  ok   ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
    else if (DISTINTAS_A_PROPOSITO[ruta]) { declaradas++; console.log(`  decl ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
    else { mal++; rojos.push([ancho, ruta, `${igual.toFixed(2)} % (umbral ${UMBRAL} %)${nota}`]); console.log(`  ROJO ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
  }
  await ctx.close();
}
await nav.close();
servidor.close();

if (rojos.length) {
  console.log('\n── detalle\n');
  for (const [a, r, d] of rojos.slice(0, 20)) console.log(`  ${String(a).padStart(4)} ${r.padEnd(56).slice(0, 56)} ${d}`);
  if (rojos.length > 20) console.log(`  ... y ${rojos.length - 20} mas`);
}
console.log(`\n  ${ok} iguales · ${mal} distintas · ${declaradas} declaradas · ${saltadas} sin baseline`);
for (const [r, m] of Object.entries(DISTINTAS_A_PROPOSITO)) console.log(`     declarada ${r}: ${m.slice(0, 92)}...`);
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} comparacion(es)`}\n`);
process.exit(mal ? 1 : 0);
