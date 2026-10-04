#!/usr/bin/env node
/**
 * PUERTA de la galeria de obra de las 53 ciudades — `GaleriaObra.astro` («Custom Pool Project
 * Gallery») sobre `/services/pool-builders/<city>-fl`.
 *
 *     npm run check:galeria-obra
 *
 * NACE DEL RECASTING DEL 4-OCT-2026 (`docs/encargos/GALERIA-CIUDADES-CASTING.md`). La galeria es
 * UN set para las 53 (`_defecto.fotos` de `src/data/galeria-obra-por-ruta.json`) y se presenta al
 * visitante como obra hecha por la casa. Eso obliga a dos cosas que ninguna otra puerta mira:
 *
 *   1 · DATOS (estatico). Cada foto traza a obra real aprobada, con su alt propio, sin ciudad
 *       inventada, y el orden respeta la jerarquia comercial: piscina primero, nunca dos seguidas
 *       de la misma casa, al menos un 70 % de piscina.
 *   2 · BUILD (`.vercel/output/static`, nunca dev). Las 53 pintan ESE set, entero y en orden, con
 *       los slides hijos directos de la lista (`check-carrusel` colapsa si no) y el lightbox
 *       apuntando a la misma URL que la `<img>`. Y ninguna foto de la galeria se repite en el
 *       cuerpo de la pagina.
 *
 * FALLA CERRADA: una ciudad sin galeria, sin HTML o con un slide de menos es ROJO, no un aviso.
 * Las rutas salen de `seo-pool-builders.json` (como `check-estructura-ciudades.mjs`), no de una
 * lista a mano. Y al reves: la ficha `/services/pool-builders` y los 9 condados NO la llevan; si
 * aparece ahi, alguien amplio el alcance sin decirlo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { rutaCiudad } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const leerJson = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

const DATOS = leerJson('src/data/galeria-obra-por-ruta.json');
const BANCO = new Map(leerJson('src/data/banco-imagenes.json').map((e) => [e.id, e]));
const CIUDADES = Object.keys(leerJson('src/data/seo-pool-builders.json')).map(rutaCiudad).sort();
const CONDADOS = fs.readdirSync(path.join(RAIZ, 'src/pages/services/pool-builders'))
  .filter((f) => /-county-fl\.astro$/.test(f))
  .map((f) => `/services/pool-builders/${f.replace(/\.astro$/, '')}`);

/**
 * LA EXCEPCION DEL BANCO VIEJO, ESCRITA A MANO A PROPOSITO. project-062 sale del banco del
 * cliente anterior (`MrMrs_Outdoor_Living_Image_Bank`, IDs `ag-…`) y no tiene registro en
 * `banco-imagenes.json`. Sebastian la admitio el 4-oct-2026 como excepcion: maximo 3 fotos y solo
 * estas. Meter otra `_asset` exige editar esta lista, que es justo la friccion que se busca.
 */
const LEGADO = new Map([
  ['ag-939d5f6462', '/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-16.webp'],
  ['ag-cd1064a0aa', '/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-18.webp'],
  ['ag-4dec9a66e4', '/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-25.webp'],
]);
const MAX_LEGADO = 3;

/**
 * Dos `proyecto` del banco que son LA MISMA CASA (misma valla, macetas, toldo y fachada; visto al
 * abrir las fotos el 4-oct-2026). Para «nunca dos seguidas de la misma casa» cuenta la casa, no
 * la etiqueta.
 */
const MISMA_CASA = new Map([['obra-100', 'obra-063']]);
const casa = (p) => MISMA_CASA.get(p) ?? p;

/** Servicios de la galeria. Los de piscina son los que cuentan para el 70 %. */
const PISCINA = new Set(['pool', 'pool-spa', 'patio-completo', 'remodelacion']);
const SECUNDARIOS = new Set(['pergola', 'cocina', 'deck']);
/* El encargo apuntaba a 16-18 y dejo dicho que calidad antes que cantidad: con el banco de hoy
 * salen 11 que aguantan la apertura a tamano completo. Por debajo de 10 el carrusel deja de leerse
 * como «muchas obras»; por encima de 18 pesa mas de lo que ensena. */
const MIN_FOTOS = 10;
const MAX_FOTOS = 18;
const CUOTA_PISCINA = 0.7;
/** Las seis primeras explican el servicio antes del cross-sell (piscina, patio completo o remodelacion). */
/**
 * LA TARJETA NO ES APAISADA, Y ESTO SE MIDIO (Playwright sobre el build, 4-oct-2026): 139x250 en un
 * movil real (viewport de 390 con tactil, dos por pantalla, 0,56:1), 384x350 a 1440 y 352x350 a
 * 1920 (~1:1), 688x450 a 768 (1,5:1). De los recortes que el banco declara, los que se parecen son
 * 4:5 y 1:1: una `aprobada_con_recorte` tiene que traer los dos.
 */
const RECORTES_TARJETA = ['4:5', '1:1'];
const CABEZA_PISCINA = 6;

/* Geografia que un alt NO puede afirmar: la foto es la misma en las 53 ciudades. */
const nombreCiudad = (r) => r.split('/').pop().replace(/-fl$/, '').replace(/-/g, ' ');
const GEO = [
  ...CIUDADES.map(nombreCiudad),
  ...CONDADOS.map((r) => nombreCiudad(r)),
  'north florida', 'south florida', 'central florida', 'florida',
];
const SPAM = /\b(best|top|#1|no\.? ?1|cheap|affordable|near me|company|contractors?|builders?|licensed)\b/i;
const GENERICO = /(^|[-_])(img|dsc|dscn|image|photo|pic|picture|untitled|copy|final)([-_]?\d+)?(\.|$)/i;

let fallos = 0;
const mal = (donde, msg) => { fallos++; console.log(`  ROJO ${donde}\n       ${msg}`); };

// ════════════════════════════════════════════════════════════════════════════
// 1 · DATOS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. el set de galeria-obra-por-ruta.json');

const fotos = DATOS._defecto?.fotos ?? [];
const porCiudad = Object.keys(DATOS).filter((k) => k.startsWith('/services/pool-builders/'));
if (porCiudad.length) {
  mal('galeria-obra-por-ruta.json', `${porCiudad.length} clave(s) por ruta (${porCiudad.slice(0, 3).join(', ')}…). `
    + 'El set es UNO para las 53; una clave propia necesita razon documentada en `_lee_esto` y en esta puerta.');
}
if (fotos.length < MIN_FOTOS || fotos.length > MAX_FOTOS) {
  mal('_defecto.fotos', `${fotos.length} fotos; el rango aceptado es ${MIN_FOTOS}-${MAX_FOTOS}.`);
}

const alts = new Map();
const srcs = new Set();
let legado = 0;
for (const [i, f] of fotos.entries()) {
  const n = `foto ${String(i + 1).padStart(2, '0')}`;
  const donde = `${n} ${f._banco ?? f._asset ?? '(sin traza)'}`;

  if (!f.src) { mal(donde, 'src vacio'); continue; }
  const fichero = path.join(RAIZ, 'public', f.src);
  if (!fs.existsSync(fichero)) { mal(donde, `falta el fichero public${f.src}`); continue; }
  if (srcs.has(f.src)) mal(donde, `src repetido en el set: ${f.src}`);
  srcs.add(f.src);
  if (GENERICO.test(path.basename(f.src))) mal(donde, `nombre de fichero generico: ${path.basename(f.src)}`);

  if (!(f.ancho > 0 && f.alto > 0)) mal(donde, `ancho/alto no validos (${f.ancho}x${f.alto}): sin ellos hay CLS`);
  const meta = await sharp(fichero).metadata();
  if (meta.width !== f.ancho || meta.height !== f.alto) {
    mal(donde, `declara ${f.ancho}x${f.alto} y el fichero mide ${meta.width}x${meta.height}`);
  }
  if (Math.max(meta.width, meta.height) > 2000) mal(donde, `${meta.width}x${meta.height}: eso es un original, no un derivado web`);

  const alt = String(f.alt ?? '').trim();
  if (!alt) mal(donde, 'alt vacio');
  else {
    const bajo = alt.toLowerCase();
    if (alts.has(bajo)) mal(donde, `alt identico al de la foto ${alts.get(bajo)}: «${alt}»`);
    alts.set(bajo, i + 1);
    const geo = GEO.find((g) => new RegExp(`\\b${g}\\b`, 'i').test(alt));
    if (geo) mal(donde, `el alt nombra «${geo}». La misma foto sale en las 53 ciudades: no puede situar la obra.`);
    if (SPAM.test(alt)) mal(donde, `el alt suena a keyword stuffing: «${alt}»`);
  }

  if (!f._proyecto) mal(donde, 'sin `_proyecto`: no se puede probar la variedad de casas');
  if (!PISCINA.has(f._servicio) && !SECUNDARIOS.has(f._servicio)) mal(donde, `\`_servicio\` desconocido: «${f._servicio}»`);
  if (f.pos && !/^\d{1,3}% \d{1,3}%$/.test(f.pos)) mal(donde, `\`pos\` no es «X% Y%»: «${f.pos}»`);

  if (f._banco && f._asset) mal(donde, 'lleva `_banco` y `_asset` a la vez: la procedencia tiene que ser una');
  if (f._banco) {
    const e = BANCO.get(f._banco);
    if (!e) { mal(donde, `${f._banco} no esta en banco-imagenes.json`); continue; }
    if (e.procedencia !== 'obra_real') mal(donde, `procedencia «${e.procedencia}»: solo obra_real se publica como obra`);
    if (!String(e.estado).startsWith('aprobada')) mal(donde, `estado «${e.estado}»: solo aprobada*`);
    if (e.etapa !== 'terminado') mal(donde, `etapa «${e.etapa}»: la galeria ensena obra TERMINADA`);
    const faltaRecorte = RECORTES_TARJETA.filter((r) => !(e.recortes_seguros ?? []).includes(r));
    if (e.estado === 'aprobada_con_recorte' && faltaRecorte.length) {
      mal(donde, `aprobada_con_recorte sin ${faltaRecorte.join(' ni ')} en recortes_seguros `
        + `(${(e.recortes_seguros ?? []).join(', ')}): la tarjeta va de 0,56:1 a ~1:1 y ese recorte no esta `
        + 'permitido (regla 2 del banco)');
    }
    if (e.src !== f.src || e.ancho !== f.ancho || e.alto !== f.alto) mal(donde, 'src/ancho/alto no casan con el indice del banco');
    if (e.proyecto && e.proyecto !== f._proyecto) mal(donde, `\`_proyecto\` ${f._proyecto} y el banco dice ${e.proyecto}`);
    const faltan = CIUDADES.filter((r) => !(e.usada_en ?? []).includes(r));
    if (faltan.length) mal(donde, `usada_en no lleva ${faltan.length} de las 53 ciudades (p. ej. ${faltan[0]})`);
  } else if (f._asset) {
    legado++;
    if (LEGADO.get(f._asset) !== f.src) mal(donde, `${f._asset} no esta en la lista blanca del banco viejo con ese src`);
  } else {
    mal(donde, 'sin `_banco` ni `_asset`: foto sin procedencia');
  }
}
if (legado > MAX_LEGADO) mal('_defecto.fotos', `${legado} fotos del banco viejo; la excepcion admite ${MAX_LEGADO}`);

/* La jerarquia comercial. */
if (fotos.length) {
  if (!['pool', 'pool-spa'].includes(fotos[0]._servicio)) mal('foto 01', `abre con «${fotos[0]._servicio}»: la primera es una piscina terminada`);
  const cabeza = fotos.slice(0, CABEZA_PISCINA).findIndex((f) => !PISCINA.has(f._servicio));
  if (cabeza >= 0) mal(`foto ${String(cabeza + 1).padStart(2, '0')}`, `«${fotos[cabeza]._servicio}» antes del puesto ${CABEZA_PISCINA + 1}: las seis primeras explican la piscina`);
  const cuota = fotos.filter((f) => PISCINA.has(f._servicio)).length / fotos.length;
  if (cuota < CUOTA_PISCINA) mal('_defecto.fotos', `piscina en el ${Math.round(cuota * 100)} % del set; el minimo es ${CUOTA_PISCINA * 100} %`);
  for (let i = 1; i < fotos.length; i++) {
    if (casa(fotos[i]._proyecto) === casa(fotos[i - 1]._proyecto)) {
      mal(`fotos ${i}-${i + 1}`, `dos seguidas de la misma casa (${fotos[i - 1]._proyecto} / ${fotos[i]._proyecto})`);
    }
  }
}
const casas = new Set(fotos.map((f) => casa(f._proyecto)));
const reparto = {};
for (const f of fotos) reparto[f._servicio] = (reparto[f._servicio] ?? 0) + 1;
console.log(`  ${fotos.length} fotos · ${casas.size} casas · ${legado} del banco viejo · `
  + Object.entries(reparto).map(([k, v]) => `${k} ${v}`).join(' · '));

// ════════════════════════════════════════════════════════════════════════════
// 2 · BUILD
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── 2. las 53 ciudades construidas (.vercel/output/static)');

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};
const urlLightbox = (s) => { try { return JSON.parse(s?.textContent ?? '').items?.[0]?.url ?? null; } catch { return null; } };
/* Cada foto con TODAS sus copias publicadas: la misma foto con otro nombre tambien es repetirla. */
const copias = fotos.map((f) => new Set([f.src, ...(BANCO.get(f._banco)?.publicada_como ?? [])]));
const CROMO = 'section.menu, section.footer, .w-nav, footer, nav';

if (!fs.existsSync(ESTATICO)) {
  mal('.vercel/output/static', 'no existe. Corre `npm run build`: sin build esta mitad no ha corrido, y eso no es verde.');
} else {
  if (CIUDADES.length !== 53) mal('seo-pool-builders.json', `declara ${CIUDADES.length} ciudades y son 53`);
  let ok = 0;
  const primeros = new Set();
  const ultimos = new Set();
  for (const ruta of CIUDADES) {
    const html = leer(ruta);
    if (!html) { mal(ruta, 'no se construyo'); continue; }
    const d = new JSDOM(html).window.document;
    const secciones = d.querySelectorAll('section.svc-galeria');
    if (secciones.length !== 1) { mal(ruta, `${secciones.length} section.svc-galeria; tiene que haber exactamente 1`); continue; }
    const lista = secciones[0].querySelector('[fs-slider-element="list"]');
    if (!lista) { mal(ruta, 'la galeria no tiene [fs-slider-element="list"]'); continue; }
    const hijos = [...lista.children];
    const slides = hijos.filter((h) => h.classList.contains('fs-slider-gallery_slide'));
    if (slides.length !== hijos.length) { mal(ruta, `${hijos.length - slides.length} hijo(s) de la lista no son slides: algo los envuelve`); continue; }
    if (slides.length !== fotos.length) { mal(ruta, `${slides.length} slides y el set trae ${fotos.length}`); continue; }

    let rutaMal = false;
    slides.forEach((s, i) => {
      const f = fotos[i];
      const img = s.querySelector(':scope > a.w-lightbox > img');
      const donde = `${ruta} slide ${i + 1}`;
      if (!img) { mal(donde, 'sin a.w-lightbox > img'); rutaMal = true; return; }
      const a = (k) => img.getAttribute(k);
      const errores = [];
      if (a('src') !== f.src) errores.push(`src ${a('src')} (se esperaba ${f.src})`);
      if (!a('alt') || a('alt') !== f.alt) errores.push('alt vacio o distinto del set');
      if (a('width') !== String(f.ancho) || a('height') !== String(f.alto)) errores.push(`width/height ${a('width')}x${a('height')}`);
      if (a('loading') !== 'lazy') errores.push(`loading=${a('loading')}`);
      if (a('decoding') !== 'async') errores.push(`decoding=${a('decoding')}`);
      if ((a('style') ?? '') !== (f.pos ? `object-position:${f.pos}` : '')) errores.push(`style «${a('style') ?? ''}»`);
      const lb = urlLightbox(img.parentElement.querySelector(':scope > script.w-json'));
      if (lb !== f.src) errores.push(`el lightbox abre ${lb}`);
      if (errores.length) { mal(donde, errores.join(' · ')); rutaMal = true; }
    });

    /* Ninguna foto del set se repite fuera de la galeria (sin contar menu ni pie). */
    for (const img of d.querySelectorAll('img')) {
      if (img.closest('section.svc-galeria') || img.closest(CROMO)) continue;
      const usadas = [img.getAttribute('src'), ...(img.getAttribute('srcset') ?? '').split(',').map((x) => x.trim().split(/\s+/)[0])];
      const k = copias.findIndex((c) => usadas.some((u) => u && c.has(u)));
      if (k >= 0) { mal(ruta, `la foto ${k + 1} del set (${fotos[k].src}) sale tambien fuera de la galeria`); rutaMal = true; }
    }
    if (!rutaMal) {
      ok++;
      primeros.add(slides[0].querySelector('img').getAttribute('src'));
      ultimos.add(slides.at(-1).querySelector('img').getAttribute('src'));
    }
  }
  if (primeros.size > 1 || ultimos.size > 1) mal('53 ciudades', `primer/ultimo slide no son los mismos en todas (${primeros.size}/${ultimos.size} variantes)`);
  console.log(`  ${ok}/${CIUDADES.length} ciudades con el set entero y en orden`
    + (ok ? ` · primero ${[...primeros][0]?.split('/').pop()} · ultimo ${[...ultimos][0]?.split('/').pop()}` : ''));

  /* Y el alcance: la ficha de servicio y los condados no son landings de ciudad. */
  let fuera = 0;
  for (const ruta of ['/services/pool-builders', ...CONDADOS]) {
    const html = leer(ruta);
    if (!html) { mal(ruta, 'no se construyo (se mira para comprobar que NO lleva la galeria)'); continue; }
    if (html.includes('svc-galeria')) mal(ruta, 'pinta la galeria de ciudad y no es una landing de ciudad: alcance ampliado sin declarar');
    else fuera++;
  }
  console.log(`  ${fuera}/${CONDADOS.length + 1} rutas fuera de alcance (ficha + condados) sin la galeria`);
}

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — un set, las 53 ciudades, obra real trazada'}\n`);
process.exit(fallos ? 1 : 0);
