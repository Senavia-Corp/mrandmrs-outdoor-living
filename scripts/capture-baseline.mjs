#!/usr/bin/env node
/**
 * FASE 1 — el baseline congelado. Captura el sitio VIVO de Webflow antes de tocarlo.
 *
 *     npm run baseline                    todo: 115 rutas x 4 anchos, ~50 min
 *     npm run baseline -- --ruta /about   una sola, para probar
 *     npm run baseline -- --forzar        recaptura lo que ya está
 *
 * Es reanudable: lo que ya está en disco se salta. El navegador tiene que quedarse
 * DELANTE toda la corrida.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE
 *
 * `check:texto`, `check:seo` y `check:visual` miden contra esta carpeta. Sin ella las
 * tres son checks que no pueden fallar — el fallo exacto de comprobar-imagenes.mjs en
 * Pergola Plus. Y solo se puede capturar mientras Webflow sirva el sitio: tras el corte
 * de dominio quedan 30 días y se acabó.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA TRAMPA DEL FOCO, Y LAS OTRAS CUATRO
 *
 * Un navegador en pestaña oculta no dispara IntersectionObserver y congela rAF: el
 * baseline saldría con secciones enteras invisibles y nadie lo notaría. De ahí la sonda.
 * Pero midiendo sobre el vivo el 27-08-2026 aparecieron cuatro fuentes más de captura
 * irreproducible. Las cinco se neutralizan en scripts/lib/captura.mjs, que importan
 * ESTE fichero y check:visual — a propósito, para que no puedan divergir:
 *
 *  1. FOCO — sonda de hasFocus + !hidden + >=8 fotogramas reales.
 *  2. BARRIDO RÁPIDO — con un viewport por rAF, 2 de los 25 data-w-id de la home se
 *     quedaban en opacity:0 (`header-3d-section`, `wrapper-cta-page`). IX2 pide que el
 *     elemento esté en pantalla un momento, no que lo cruces. Dos pasadas a medio
 *     viewport con 100 ms de reposo: invisibles 2 -> 0.
 *  3. EL NAV SE ESCONDE AL BAJAR — `.menu` es fixed de 85 px y a-11 lo deja en
 *     translateY(-85px)+opacity:0. Capturar abajo = las 115 páginas sin nav.
 *  4. VÍDEOS EN autoplay loop — medido: uno en t=1.998 s. Fotograma al azar en cada corrida.
 *  5. EL MARQUEE LO MUEVE JS, NO CSS — animations:'disabled' de Playwright no lo toca.
 *
 * Con las cinco puestas, la misma ruta capturada 3 veces da el MISMO sha256 en PNG, en
 * JPEG y en texto. Eso es lo que hace que un umbral de 99 % signifique algo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOS COSAS QUE ESTE BASELINE NO RETRATA, Y HAY QUE SABERLO
 *
 *  · LOS TRES ELFSIGHT NO PINTAN. `PROMPT.md` solo conoce el click-to-call; hay tres, y
 *    dos pintan CONTENIDO (Google Reviews e Instagram Feed). Medido: en navegador
 *    automatizado los tres se quedan en altura 0 y sin hijos incluso tras 8,5 s y barrido
 *    completo. El sitio migrado conserva los mismos <script>+<div>, así que la comparación
 *    es de lo mismo contra lo mismo — pero un visitante real ve ahí dos secciones que
 *    ninguna captura de esta carpeta contiene.
 *
 *  · EL VIVO NO TIENE NI UN <link rel=canonical>. Comprobado en 0 de 115. La Fase 9 pide
 *    canónicas absolutas en las 115: eso es una ADICIÓN deliberada, no paridad, y
 *    `check:seo` tiene que tratarla como diferencia esperada en vez de exigir que case.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';
import {
  ANCHOS, ANCHO_DOM, ARGS_NAVEGADOR, ESCALA, CALIDAD,
  aSlug, asentar, disparar, textoNormalizado, aJpeg,
} from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BASE = 'https://mrandmrsoutdoorliving.com';
const SALIDA = path.join(RAIZ, 'baseline');

const args = process.argv.slice(2);
const opcion = (n, d = null) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const FORZAR = args.includes('--forzar');
const SOLO_RUTA = opcion('--ruta');
const SOLO_ANCHO = opcion('--ancho');

// ── las rutas ───────────────────────────────────────────────────────────────
const csv = await fs.readFile(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const TODAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g).map((c) => c.slice(1, -1)))
  .map(([ruta, tipo, coleccion, plantilla, enSitemap]) => ({ ruta, tipo, coleccion, plantilla, enSitemap }));
const RUTAS = TODAS.filter((r) => !SOLO_RUTA || r.ruta.includes(SOLO_RUTA));

if (new Set(TODAS.map((r) => aSlug(r.ruta))).size !== TODAS.length)
  throw new Error('dos rutas colisionan en el mismo slug de fichero');

const anchos = ANCHOS.filter(([w]) => !SOLO_ANCHO || String(w) === SOLO_ANCHO);
console.log(`\n  ${RUTAS.length} rutas x ${anchos.length} anchos · escala ${ESCALA.toFixed(2)} q${CALIDAD}\n`);

await fs.mkdir(path.join(SALIDA, 'html'), { recursive: true });
await fs.mkdir(path.join(SALIDA, 'text'), { recursive: true });
for (const [w] of ANCHOS) await fs.mkdir(path.join(SALIDA, 'shots', String(w)), { recursive: true });

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const leerJson = async (f, d) => JSON.parse(await fs.readFile(path.join(SALIDA, f), 'utf8').catch(() => d));

const seo = await leerJson('seo.json', '{}');
const informe = await leerJson('captura-informe.json', 'null') ?? {};
informe.base = BASE; informe.escala = ESCALA; informe.calidad = CALIDAD;
informe.anchos = ANCHOS.map(([w]) => w);
informe.abortadas ??= []; informe.errores ??= []; informe.paginas ??= {};
// Los invisibles se recuentan desde cero en cada corrida de la ruta+ancho tocados: si no,
// un fallo arreglado seguiría contando para siempre y la puerta no podría volver a verde.
informe.invisibles ??= [];

const volcar = async () => {
  informe.fecha = new Date().toISOString();
  informe.rutas = TODAS.length;
  informe.parcial = Boolean(SOLO_RUTA || SOLO_ANCHO);
  await fs.writeFile(path.join(SALIDA, 'seo.json'), JSON.stringify(seo, null, 1));
  await fs.writeFile(path.join(SALIDA, 'rutas.json'), JSON.stringify(
    Object.fromEntries(TODAS.map((r) => [r.ruta, aSlug(r.ruta)])), null, 1));
  await fs.writeFile(path.join(SALIDA, 'captura-informe.json'), JSON.stringify(informe, null, 1));
};

const navegador = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
let nuevas = 0;

for (const [ancho, alto] of anchos) {
  console.log(`\n── ${ancho}x${alto} ──────────────────────────────────────────────`);
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();

  for (const [i, r] of RUTAS.entries()) {
    const slug = aSlug(r.ruta);
    const jpg = path.join(SALIDA, 'shots', String(ancho), `${slug}.jpg`);
    const faltaDom = ancho === ANCHO_DOM && !seo[r.ruta];
    const hayJpg = await fs.access(jpg).then(() => true, () => false);
    if (!FORZAR && hayJpg && !faltaDom) continue;

    const t0 = Date.now();
    const marca = (l) => l.filter((x) => !(x.ruta === r.ruta && x.ancho === ancho));
    informe.abortadas = marca(informe.abortadas);
    informe.errores = marca(informe.errores);
    informe.invisibles = marca(informe.invisibles);

    let resp;
    try {
      resp = await pag.goto(BASE + r.ruta, { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      informe.errores.push({ ruta: r.ruta, ancho, error: e.message.slice(0, 140) });
      console.log(`  🔴 ${r.ruta} — ${e.message.slice(0, 60)}`); continue;
    }
    if (!resp?.ok()) {
      informe.errores.push({ ruta: r.ruta, ancho, estado: resp?.status() ?? 0 });
      console.log(`  🔴 ${r.ruta} — HTTP ${resp?.status()}`); continue;
    }
    await pag.bringToFront();

    const est = await asentar(pag);
    if (!est.valida) {
      informe.abortadas.push({ ruta: r.ruta, ancho, sonda: est.sonda });
      console.log(`  ⛔ ${r.ruta} — MEDICIÓN INVÁLIDA ${JSON.stringify(est.sonda)}`); continue;
    }
    for (const inv of est.invisibles) informe.invisibles.push({ ruta: r.ruta, ancho, ...inv });

    // HTML, texto y SEO: una sola vez por ruta. El DOM no depende del viewport.
    if (ancho === ANCHO_DOM && (FORZAR || faltaDom)) {
      const html = await pag.content();
      await fs.writeFile(path.join(SALIDA, 'html', `${slug}.html`), html);
      const texto = await textoNormalizado(pag);
      await fs.writeFile(path.join(SALIDA, 'text', `${slug}.txt`), texto + '\n');

      // El <head> viene minificado en UNA línea: una regex sobre <title> devuelve la
      // etiqueta vacía (comprobado). Se extrae con el DOM, que es lo único fiable aquí.
      seo[r.ruta] = await pag.evaluate(() => {
        const meta = {};
        for (const m of document.querySelectorAll('meta[property],meta[name]')) {
          const k = m.getAttribute('property') || m.getAttribute('name');
          if (/^(og:|twitter:|description$|robots$|keywords$)/.test(k)) meta[k] = m.content;
        }
        // El JSON-LD se parsea y se reserializa con las CLAVES ORDENADAS: si no, el orden
        // de claves haría fallar un diff que no tenía por qué fallar.
        const orden = (v) => (Array.isArray(v) ? v.map(orden)
          : v && typeof v === 'object'
            ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, orden(v[k])])) : v);
        return {
          title: document.title,
          canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
          lang: document.documentElement.lang || null,
          meta,
          h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()),
          jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')]
            // El texto se guarda largo Y con el mensaje del error: la primera versión
            // truncaba a 400 caracteres, así que al reparsear el trozo guardado TODOS los
            // bloques daban «Unterminated string at position 400» y el defecto real
            // quedaba tapado por el recorte.
            .map((s) => { try { return orden(JSON.parse(s.textContent)); }
              catch (e) { return { __sinParsear: s.textContent.slice(0, 2000), __error: e.message }; } }),
        };
      });
      informe.paginas[r.ruta] = { ...informe.paginas[r.ruta], slug,
        sha256Html: sha(html), sha256Texto: sha(texto) };
    }

    const png = await disparar(pag);
    const { meta, buffer } = await aJpeg(sharp, png);
    await fs.writeFile(jpg, buffer);
    nuevas++;
    const p = (informe.paginas[r.ruta] ??= { slug });
    (p.alto ??= {})[ancho] = meta.height;

    // Se vuelca en cada ruta, no al final: la corrida entera son ~65 min con el navegador
    // delante, y una interrupción a mitad dejaba el HTML y las capturas en disco pero
    // perdía seo.json y el informe — o sea, obligaba a rehacer los 115 DOM para nada.
    await volcar();

    console.log(`  ${String(i + 1).padStart(3)}/${RUTAS.length} ${r.ruta.padEnd(56).slice(0, 56)}`
      + ` ${String(meta.height).padStart(6)}px ${String((buffer.length / 1024).toFixed(0)).padStart(4)}k`
      + ` ${((Date.now() - t0) / 1000).toFixed(1)}s`
      + (est.invisibles.length ? `  ⚠️ ${est.invisibles.length} invisibles` : ''));
  }
  await ctx.close();
}
await navegador.close();

await volcar();

for (const u of ['robots.txt', 'sitemap.xml']) {
  const r = await fetch(`${BASE}/${u}`);
  if (r.ok) await fs.writeFile(path.join(SALIDA, u), await r.text());
}

console.log(`\n  nuevas: ${nuevas} · abortadas: ${informe.abortadas.length}`
  + ` · invisibles: ${informe.invisibles.length} · errores: ${informe.errores.length}\n`);
