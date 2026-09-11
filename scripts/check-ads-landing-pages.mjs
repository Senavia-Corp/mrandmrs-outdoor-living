/**
 * PUERTA DE LAS LANDING PAGES DE PAGO.
 *
 * NO finge un Quality Score de Google. Google no publica su formula y lo que pondera depende de
 * historico y de competencia, que este repo no ve. Lo que esta puerta hace es lo contrario y es
 * lo unico honesto: fijar los INVARIANTES CONTROLABLES de las 4 URLs finales de anuncio, para
 * que un cambio futuro no convierta en silencio
 *
 *     «Custom Pool Builders In Gainesville»  ->  «Outdoor Living Services»
 *
 * que es exactamente el fallo que destruye Landing Page Experience y Ad Relevance sin que nadie
 * se entere hasta ver la factura.
 *
 * Las 4 URLs son FINAL URLs de campanas activas. Una URL final que redirige es RECHAZO DE
 * ANUNCIO, no una molestia: por eso se comprueba que ninguna tenga redirect declarado.
 *
 * Corre sobre `.vercel/output/static`, como las demas. Con `PUBLIC_ES_PRODUCCION=1` exige
 * ademas canonica correcta y ausencia de noindex.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';
const SITIO = process.env.PUBLIC_SITE_URL || 'https://www.mrandmrsoutdoorliving.com';

/** Las 4 landing pages, con la intencion que el anuncio promete y la que NO debe competir. */
const LANDINGS = [
  {
    grupo: 'Pool Builders Core',
    ruta: '/services/custom-pool-spa-builders-in-north-south-florida',
    exige: [/custom pool/i, /builders?/i],
    exigeCuerpo: [/pool/i, /north .{0,3}south florida|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /pole barn/i, /landscaping/i],
  },
  {
    grupo: 'Gainesville',
    ruta: '/pool-builders/gainesville-florida',
    exige: [/pool builders?/i, /gainesville/i],
    exigeCuerpo: [/inground|in-ground/i, /alachua|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /commercial/i],
  },
  {
    grupo: 'Ocala',
    ruta: '/pool-builders/ocala-florida',
    exige: [/pool builders?/i, /ocala/i],
    exigeCuerpo: [/inground|in-ground/i, /marion|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /commercial/i],
  },
  {
    grupo: 'Full Remodel',
    ruta: '/services/pool-remodeling-renovation-in-north-south-florida',
    exige: [/remodel/i],
    exigeCuerpo: [/renovat|remodel/i, /pool/i],
    // Remodelacion NO es reparacion suelta ni limpieza: eso atrae el lead equivocado.
    prohibeArriba: [/leak repair/i, /pool cleaning/i, /weekly service/i, /pergola/i],
  },
];

/** Donde aterriza la conversion. Si alguna se cae, el trafico de pago no convierte. */
const DESTINOS = ['/contact-us', '/request-estimated', '/thank-you'];

/** Hoja 18 del libro de campana: prohibido sin confirmacion de Sebastian. */
const AFIRMACIONES_PROHIBIDAS = [
  [/\$55[Kk]\b/, '$55K como umbral de piscina nueva — DATA NOT AVAILABLE'],
  [/\$20[Kk]\+/, '$20K+ como umbral de remodelacion — DATA NOT AVAILABLE'],
  [/100\+\s*(5|five)[- ]?star/i, '«100+ reseñas de 5 estrellas» — DATA NOT AVAILABLE'],
  [/\b#1\b|\bbest in florida\b|\baward[- ]winning\b/i, 'superlativo sin evidencia'],
  [/\bguaranteed\b/i, 'garantia sin terminos confirmados'],
];

const TEL_NF = '(352) 740-3361';
const TEL_SF = '(954) 913-7112';

let fallos = 0;
const mal = (r, m) => { fallos++; console.log(`  ROJO ${r}\n       ${m}`); };
const bien = (m) => console.log(`  ok   ${m}`);

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

console.log('\n── las 4 URLs finales de anuncio ──');

const redirects = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')).redirects ?? [];
const titulos = new Map();

for (const L of LANDINGS) {
  const html = leer(L.ruta);
  if (!html) { mal(L.ruta, `no se construyo. Es URL final del grupo «${L.grupo}»: sin pagina, el anuncio manda trafico a un 404.`); continue; }
  const d = new JSDOM(html).window.document;

  // 1 · redirect sobre una URL final = rechazo de anuncio
  const red = redirects.find((r) => r.source.replace(/\/$/, '') === L.ruta);
  if (red) mal(L.ruta, `tiene un redirect declarado hacia ${red.destination}. Una URL final que redirige es RECHAZO DE ANUNCIO.`);

  // 2 · un solo h1
  const h1s = [...d.querySelectorAll('h1')];
  if (h1s.length !== 1) mal(L.ruta, `${h1s.length} <h1>; tiene que haber exactamente 1.`);

  // 3 · title y description
  const titulo = d.querySelector('title')?.textContent?.trim() ?? '';
  const desc = d.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  if (!titulo) mal(L.ruta, 'sin <title>.');
  if (!desc) mal(L.ruta, 'sin meta description.');
  if (titulos.has(titulo)) mal(L.ruta, `<title> repetido con ${titulos.get(titulo)}: dos landings compitiendo por la misma consulta.`);
  titulos.set(titulo, L.ruta);

  // 4 · indexacion
  const robots = d.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (/noindex/i.test(robots)) mal(L.ruta, 'lleva noindex. Una landing de pago con noindex pierde Landing Page Experience.');
  if (PROD) {
    const can = d.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    if (can !== `${SITIO}${L.ruta}`) mal(L.ruta, `canonica «${can}», se esperaba «${SITIO}${L.ruta}».`);
  }

  // 5 · correspondencia de mensaje arriba del pliegue
  const arriba = [h1s[0]?.textContent ?? '', d.querySelector('h2')?.textContent ?? ''].join(' ');
  for (const re of L.exige) {
    if (!re.test(arriba)) mal(L.ruta, `el h1/h2 no dice ${re}. El anuncio del grupo «${L.grupo}» promete esa intencion; la pagina tiene que reconocerse en segundos.`);
  }
  for (const re of L.prohibeArriba) {
    if (re.test(arriba)) mal(L.ruta, `el h1/h2 mete ${re} arriba del pliegue, compitiendo con la intencion del anuncio. Ese contenido va MAS ABAJO, no se borra.`);
  }

  // 6 · cuerpo
  d.querySelectorAll('script,style,noscript,nav,header').forEach((e) => e.remove());
  const cuerpo = (d.body?.textContent ?? '').replace(/\s+/g, ' ');
  const primeras = cuerpo.split(' ').slice(0, 120).join(' ');
  for (const re of L.exigeCuerpo) {
    if (!re.test(primeras)) mal(L.ruta, `las primeras 120 palabras de contenido no dicen ${re}.`);
  }

  // 7 · conversion
  if (!/free estimate|request an estimate|schedule a consultation/i.test(cuerpo)) {
    mal(L.ruta, 'sin CTA de estimacion reconocible.');
  }
  const aDestino = [...d.querySelectorAll('a[href]')].some((a) => DESTINOS.some((x) => a.getAttribute('href').startsWith(x)));
  if (!aDestino) mal(L.ruta, `sin camino a conversion: ningun enlace a ${DESTINOS.join(' / ')}.`);

  // 8 · telefono de North Florida primero (hoja 24)
  const iNF = cuerpo.indexOf(TEL_NF); const iSF = cuerpo.indexOf(TEL_SF);
  if (iNF < 0) mal(L.ruta, `no aparece el telefono de North Florida ${TEL_NF}, que es el que debe ver el trafico de pago.`);
  else if (iSF >= 0 && iSF < iNF) mal(L.ruta, 'el telefono de South Florida sale antes que el de North Florida.');

  // 9 · JSON-LD valido
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.textContent); } catch (e) { mal(L.ruta, `JSON-LD que no parsea: ${e.message}`); }
  }

  // 10 · afirmaciones prohibidas
  for (const [re, por] of AFIRMACIONES_PROHIBIDAS) {
    if (re.test(cuerpo)) mal(L.ruta, `afirmacion prohibida — ${por}`);
  }

  if (!fallos) bien(`${L.grupo.padEnd(20)} ${L.ruta}`);
}

console.log('\n── destinos de conversion ──');
for (const r of DESTINOS) {
  if (!leer(r)) mal(r, 'no se construyo. Es donde aterriza el trafico de pago.');
  else bien(`${r} construido`);
}

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE'}\n`);
console.log('  NOTA: esta puerta NO mide Quality Score. Mide los invariantes que el sitio SI');
console.log('  controla. Expected CTR y el historico del anuncio no se ven desde aqui.');
process.exit(fallos ? 1 : 0);
