#!/usr/bin/env node
/**
 * `src/data/gallery-procedencia.json` — QUE FOTO DE /gallery SE PUEDE PUBLICAR Y CUAL NO.
 *
 *     node scripts/build-gallery-procedencia.mjs <fichero-del-panel.json>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE EXISTE
 *
 * `/gallery` publica 137 fotos repartidas en los 14 servicios, y el sitio las presenta como
 * OBRA DEL CLIENTE. La linea roja del proyecto (`00-PRINCIPIOS §3`) prohibe publicar como obra
 * del cliente una imagen generada o de banco.
 *
 * Ninguna de las 137 lleva `trainedAlgorithmicMedia`. Eso NO prueba nada: R22-BLOG-IMG ya
 * demostro que el marcador FALLA ABIERTO —encontro 4 imagenes generadas sin marcador, y solo
 * se cazaron mirandolas—.
 *
 * Asi que se miraron. Un panel de agentes clasifico cada hoja de contactos y otros dos, con
 * lentes independientes (fisica de la luz y el agua · plausibilidad constructiva), intentaron
 * REFUTAR cada veredicto. Resultado: **37 de 137 son generadas o de stock**.
 *
 * ⚠️ Y CORRIGIO A QUIEN ESCRIBE ESTO. Yo mire la hoja de `construction` y la di por buena
 * entera; cuatro de sus diez son generadas. Dos de ellas ya estaban elegidas para el primer
 * articulo. Una sola mirada no basta, y por eso el veredicto vive en un fichero y no en la
 * cabeza de nadie.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE HACE ESTE FICHERO, QUE NO ES DOCUMENTAR
 *
 * Lo lee el casting de imagenes y RECHAZA cualquier referencia cuyo veredicto no sea
 * `obra_real`. O sea que no es una nota: es una guarda. Publicar una de las 37 deja de ser
 * posible por descuido.
 *
 * El `motivo` de cada rechazo es la observacion CONCRETA que lo justifica —«no hay skimmer,
 * retornos ni sumidero en ningun punto del vaso»— y no una etiqueta. Es lo que permite
 * revisarlo, y lo que hace falta para pedirle al cliente la foto que falta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'src/data/gallery-procedencia.json');
const PANEL = process.argv[2];

if (!PANEL || !fs.existsSync(PANEL)) {
  console.error('\n  uso: node scripts/build-gallery-procedencia.mjs <salida-del-panel.json>\n');
  process.exit(1);
}

/* El mapeo indice -> fichero sale del /gallery CONSTRUIDO, que es la misma fuente que vio el
 * panel: si se derivara de otro sitio, los indices podrian no casar y el veredicto se
 * aplicaria a la foto equivocada — el peor fallo posible aqui. */
const HTML = path.join(RAIZ, '.vercel/output/static/gallery/index.html');
if (!fs.existsSync(HTML)) {
  console.error('\n  ROJO no hay build de /gallery. `npm run build` primero.\n');
  process.exit(1);
}
const doc = new JSDOM(fs.readFileSync(HTML, 'utf8')).window.document;
const porSvc = {};
for (const it of doc.querySelectorAll('[data-service-id]')) {
  const s = it.getAttribute('data-service-id');
  const img = it.querySelector('img') ?? it;
  (porSvc[s] ??= []).push({ src: img.getAttribute('src'), alt: img.getAttribute('alt') ?? '' });
}

const panel = JSON.parse(fs.readFileSync(PANEL, 'utf8')).result;
/**
 * El panel devolvio el servicio como texto libre, y no siempre con su clave dentro: tres
 * volvieron como «Motorized retractable screens», «Patio screen rooms» y «Smart irrigation»,
 * cuyas claves son `screens`, `rooms` e `irrigation` — ni la primera palabra ni una subcadena.
 *
 * Se resuelve con una tabla EXPLICITA y se comprueba que casan las 14. La version anterior
 * adivinaba por el primer token y dejaba 3 servicios sin veredicto; la guarda de abajo se
 * nego a escribir, que es exactamente lo que tenia que pasar: un servicio sin clasificar es
 * un servicio publicable sin haberlo mirado.
 */
const NOMBRES = {
  construction: ['construction', 'custom pool'],
  remodeling: ['remodeling', 'remodel'],
  kitchen: ['kitchen'],
  pergolas: ['pergola'],
  screens: ['retractable'],
  light: ['soffit', 'led lighting'],
  louvered: ['louvered'],
  rooms: ['patio screen room'],
  enclosures: ['pool screen enclosure', 'enclosures'],
  pole: ['pole barn', 'steel building'],
  landscaping: ['landscaping'],
  irrigation: ['irrigation'],
  furniture: ['furniture'],
  decks: ['deck'],
};
const clave = (s) => {
  const dentro = s.match(/clave "([a-z]+)"/)?.[1];
  if (dentro) return dentro;
  const b = s.toLowerCase();
  const hit = Object.entries(NOMBRES).find(([, ns]) => ns.some((n) => b.includes(n)));
  return hit ? hit[0] : s.split(' ')[0].toLowerCase();
};
const veredictos = {};
for (const [svc, imgs] of Object.entries(panel.porServicio)) veredictos[clave(svc)] = imgs;

const salida = { _lee_esto: [
  'DERIVADO por scripts/build-gallery-procedencia.mjs desde la salida del panel de procedencia.',
  '',
  'Dice que foto de /gallery se puede publicar como obra del cliente y cual NO.',
  'Lo LEE el casting de imagenes y RECHAZA las que no sean obra_real: es una guarda,',
  'no una nota. 37 de las 137 son generadas o de stock.',
], servicios: {} };

let faltan = 0;
for (const [svc, fotos] of Object.entries(porSvc)) {
  const v = veredictos[svc];
  if (!v) { console.error(`  ROJO ${svc}: el panel no lo clasifico`); faltan++; continue; }
  salida.servicios[svc] = fotos.map((f, i) => {
    const d = v.find((x) => x.indice === i);
    return {
      indice: i,
      src: f.src,
      altGaleria: f.alt,
      veredicto: d?.veredicto ?? 'sin_clasificar',
      confianza: d?.confianza ?? null,
      motivo: d?.motivo ?? 'el panel no devolvio veredicto para este indice',
      refutado: Boolean(d?.discrepancias?.length),
    };
  });
}
if (faltan) { console.error('\n  no se escribe nada: hay servicios sin clasificar\n'); process.exit(1); }

const todas = Object.values(salida.servicios).flat();
const sinClasificar = todas.filter((x) => x.veredicto === 'sin_clasificar');
if (sinClasificar.length) {
  console.error(`\n  ROJO ${sinClasificar.length} foto(s) sin veredicto. No se escribe nada:`);
  console.error('       una foto sin clasificar es una foto publicable sin haberla mirado.\n');
  process.exit(1);
}

fs.writeFileSync(DESTINO, `${JSON.stringify(salida, null, 1)}\n`);
const n = (v) => todas.filter((x) => x.veredicto === v).length;
console.log(`\n  ${todas.length} fotos · ${Object.keys(salida.servicios).length} servicios`);
console.log(`     obra real .......... ${n('obra_real')}`);
console.log(`     generada o stock ... ${n('generada_o_stock')}`);
console.log(`     dudosa ............. ${n('dudosa')}`);
console.log('');
for (const [svc, fotos] of Object.entries(salida.servicios)) {
  const ok = fotos.filter((f) => f.veredicto === 'obra_real').map((f) => f.indice);
  const marca = ok.length === 0 ? '  <<< SIN FOTOGRAFIA REAL' : '';
  console.log(`     ${svc.padEnd(13)} ${String(ok.length).padStart(2)}/${fotos.length} usables [${ok.join(',')}]${marca}`);
}
console.log(`\n  -> ${path.relative(RAIZ, DESTINO)}\n`);
