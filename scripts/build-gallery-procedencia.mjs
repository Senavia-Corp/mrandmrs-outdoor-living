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
/* ─────────────────────────────────────────────────────────────────────────────
 * EL CLIENTE RESOLVIO LAS 20 EN DISPUTA · 19-sep-2026
 *
 * El panel discrepaba en 20 fotos y el criterio conservador las dejo fuera, marcadas para que
 * las resolviera la unica persona que puede de verdad: el dueno reconoce su propia obra.
 *
 * Su respuesta, literal: «si las 11 son mias» —las de construction, screens, louvered,
 * landscaping, irrigation y decks— y, sobre las 9 de iluminacion soffit, «No tengo».
 *
 * Eso da la razon al refutador en las 11: miro el original a resolucion nativa y vio lo que la
 * miniatura de 340 px escondia (el labio del vertedero, el rodillo de la mosquitera dentro de
 * la ranura de la viga). Y CIERRA las 9 de `light` en la otra direccion: no son obra suya, asi
 * que no pueden publicarse como tal. `light` y `furniture` se quedan a cero fotos reales.
 *
 * Esta tabla MANDA sobre el panel. Tres agentes mirando pixeles no le ganan al dueno de la obra.
 * ──────────────────────────────────────────────────────────────────────────── */
const ADJUDICADO = {
  obra_real: {
    construction: [0, 2, 4, 6],
    screens: [8],
    louvered: [2, 4],
    landscaping: [0, 1],
    irrigation: [2],
    decks: [7],
  },
  no_es_del_cliente: {
    light: [0, 1, 2, 3, 4, 5, 6, 8, 9],
  },
};
const MOTIVO_CLIENTE = {
  obra_real:
    'ADJUDICADA POR EL CLIENTE (19-sep-2026): la reconoce como obra propia. Manda sobre el panel.',
  no_es_del_cliente:
    'ADJUDICADA POR EL CLIENTE (19-sep-2026): no tiene fotografia de soffit LED, asi que no es obra suya.',
};

/** Aplica la palabra del cliente sobre el veredicto del panel. Si una referencia no existe NO
 *  corrige a medias: se niega, porque una adjudicacion que cae en el indice equivocado es peor
 *  que no haberla aplicado. */
function aplicaAdjudicacion(servicios) {
  let n = 0;
  for (const [veredicto, porSvc] of Object.entries(ADJUDICADO)) {
    for (const [svc, indices] of Object.entries(porSvc)) {
      for (const i of indices) {
        const f = servicios[svc]?.find((x) => x.indice === i);
        if (!f) {
          console.error(`\n  ROJO adjudicacion del cliente: ${svc}[${i}] no existe. No se escribe nada.\n`);
          process.exit(1);
        }
        f.veredicto = veredicto;
        f.usable = veredicto === 'obra_real';
        f.adjudicadoPorElCliente = true;
        f.motivoPanel = f.motivoPanel ?? f.motivo;
        f.motivo = MOTIVO_CLIENTE[veredicto];
        n++;
      }
    }
  }
  return n;
}

function resumen(servicios, adjudicadas) {
  const todas = Object.values(servicios).flat();
  const n = (v) => todas.filter((x) => x.veredicto === v).length;
  console.log(`\n  ${todas.length} fotos · ${Object.keys(servicios).length} servicios`);
  console.log(`     USABLES ............ ${todas.filter((x) => x.usable).length}`);
  console.log(`     generada o stock ... ${n('generada_o_stock')}`);
  console.log(`     dudosa ............. ${n('dudosa')}`);
  console.log(`     no es del cliente .. ${n('no_es_del_cliente')}`);
  console.log(`     EN DISPUTA ......... ${n('en_disputa')}`);
  console.log(`     adjudicadas por el cliente: ${adjudicadas}`);
  console.log('');
  for (const [svc, fotos] of Object.entries(servicios)) {
    const ok = fotos.filter((f) => f.usable).map((f) => f.indice);
    const marca = ok.length === 0 ? '  <<< SIN FOTOGRAFIA REAL' : '';
    console.log(`     ${svc.padEnd(13)} ${String(ok.length).padStart(2)}/${fotos.length} usables [${ok.join(',')}]${marca}`);
  }
}

/* El fichero del panel es efimero —vive en el scratchpad de la sesion que lo produjo—; el
 * veredicto derivado no lo es: esta versionado. De ahi este modo, que re-aplica la palabra del
 * cliente sobre el JSON ya escrito sin necesitar ni el panel ni un build de /gallery. */
if (process.argv[2] === '--solo-adjudicar') {
  const actual = JSON.parse(fs.readFileSync(DESTINO, 'utf8'));
  const n = aplicaAdjudicacion(actual.servicios);
  fs.writeFileSync(DESTINO, `${JSON.stringify(actual, null, 1)}\n`);
  resumen(actual.servicios, n);
  console.log(`  -> ${path.relative(RAIZ, DESTINO)}   (solo adjudicacion del cliente)\n`);
  process.exit(0);
}


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
    /**
     * ── SOLO SE PUBLICA LO UNANIME ──────────────────────────────────────────────────────
     *
     * El panel discrepa en 11 de las 137, y en las DOS direcciones: en 5 los refutadores
     * dicen que el clasificador rechazo obra real (miraron el original a resolucion nativa,
     * no la miniatura de 340 px de la hoja), y en 6 dicen lo contrario.
     *
     * Quien escribe esto las miro tambien y no coincide del todo con ninguno de los dos. Eso
     * es la senal: cuando tres miradas expertas no se ponen de acuerdo, la respuesta no es
     * que una desempate.
     *
     * El coste de equivocarse es ASIMETRICO. Publicar una generada como obra del cliente es
     * publicidad enganosa y la linea roja del proyecto; no usar una foto real solo deja menos
     * fotos. Asi que la regla es la conservadora: **usable solo si el clasificador dice
     * obra_real Y ningun refutador lo contradice**.
     *
     * Las discutidas NO se tiran: quedan marcadas `en_disputa` con lo que dijo cada lente,
     * para que las resuelva quien puede hacerlo de verdad — el cliente reconoce su propia
     * obra, y ninguno de nosotros puede.
     */
    const contra = d?.discrepancias ?? [];
    const base = d?.veredicto ?? 'sin_clasificar';
    const disputada = contra.length > 0;
    return {
      indice: i,
      src: f.src,
      altGaleria: f.alt,
      veredicto: disputada ? 'en_disputa' : base,
      usable: !disputada && base === 'obra_real',
      confianza: d?.confianza ?? null,
      motivo: d?.motivo ?? 'el panel no devolvio veredicto para este indice',
      discrepancias: contra.map((c) => ({ lente: c.lente?.split(':')[0] ?? c.lente, veredicto: c.veredicto, motivo: c.motivo })),
    };
  });
}
if (faltan) { console.error('\n  no se escribe nada: hay servicios sin clasificar\n'); process.exit(1); }

const adjudicadas = aplicaAdjudicacion(salida.servicios);

const todas = Object.values(salida.servicios).flat();
const sinClasificar = todas.filter((x) => x.veredicto === 'sin_clasificar');
if (sinClasificar.length) {
  console.error(`\n  ROJO ${sinClasificar.length} foto(s) sin veredicto. No se escribe nada:`);
  console.error('       una foto sin clasificar es una foto publicable sin haberla mirado.\n');
  process.exit(1);
}

fs.writeFileSync(DESTINO, `${JSON.stringify(salida, null, 1)}\n`);
resumen(salida.servicios, adjudicadas);
console.log(`\n  -> ${path.relative(RAIZ, DESTINO)}\n`);
