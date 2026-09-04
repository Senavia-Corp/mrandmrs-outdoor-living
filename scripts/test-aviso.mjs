#!/usr/bin/env node
/**
 * PUERTA del aviso de lead — la hora de Florida y las reglas duras del HTML de correo.
 *
 *     node scripts/test-aviso.mjs        (estatica, sin navegador, <1 s)
 *
 * POR QUE EXISTE. El correo de aviso no lo cubre NINGUNA otra puerta: no es una pagina, asi
 * que `check:texto`, `check:visual` y `check:seo` no lo miran. Sin esto, un `display:flex`
 * colado en el HTML del correo no falla en ningun sitio: simplemente Gmail lo tira y el aviso
 * llega descuadrado, y nadie se entera hasta que un lead se pierde por ilegible.
 *
 * LAS DOS COSAS QUE COMPRUEBA
 *
 *   1. LA HORA. Con dos epocas fijas, una en EDT y otra en EST, y ademas la HORA REPETIDA del
 *      cambio de horario. Un desfase fijo de -4 pasaria las dos primeras y fallaria la
 *      tercera; por eso la tercera esta aqui.
 *   2. EL LINT DE CORREO. Gmail y Outlook recortan en SILENCIO lo que no entienden, asi que
 *      el fallo no se ve hasta que alguien abre el correo. Se prohibe por adelantado.
 *
 * Y de paso escribe los fixtures que se abren en el navegador para las capturas de 375 px y
 * de imagenes bloqueadas.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { construyeAviso, enHoraDeFlorida, lineasDeOrigen } from '../src/lib/aviso-correo.ts';

let fallos = 0;
const ok = (n, fn) => {
  try { fn(); console.log(`  ✅ ${n}`); }
  catch (e) { console.log(`  🔴 ${n}\n       ${e.message.split('\n')[0]}`); fallos++; }
};

console.log('\n  LA HORA DE FLORIDA');

ok('verano -> EDT', () =>
  assert.equal(enHoraDeFlorida(new Date('2026-09-04T22:33:56.886Z')), 'Sep 4, 2026 · 6:33 PM EDT'));

ok('invierno -> EST', () =>
  assert.equal(enHoraDeFlorida(new Date('2026-01-15T14:05:00.000Z')), 'Jan 15, 2026 · 9:05 AM EST'));

// La 1:30 AM del 1-nov-2026 existe DOS VECES. Un desfase fijo de -4 h daria la misma cadena
// para las dos y esta puerta seguiria verde; con la zona real se distinguen.
ok('el salto de horario: la misma hora de pared, dos zonas', () => {
  const a = enHoraDeFlorida(new Date('2026-11-01T05:30:00.000Z'));
  const b = enHoraDeFlorida(new Date('2026-11-01T06:30:00.000Z'));
  assert.equal(a, 'Nov 1, 2026 · 1:30 AM EDT');
  assert.equal(b, 'Nov 1, 2026 · 1:30 AM EST');
  assert.notEqual(a, b);
});

console.log('\n  EL ORIGEN DEL LEAD');

ok('campana de pago', () => {
  const r = lineasDeOrigen({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'pool-remodel-fl', landing_page: '/' });
  assert.equal(r.titular, 'Google / cpc · campaign "pool-remodel-fl"');
});
ok('solo gclid -> Google Ads, y el id va entero', () => {
  const r = lineasDeOrigen({ gclid: 'Cj0KCQjw', landing_page: '/pool-builders/ocala-florida' });
  assert.equal(r.titular, 'Google Ads');
  assert.ok(r.detalle.some((l) => l.includes('gclid: Cj0KCQjw')));
});
ok('referido', () =>
  assert.equal(lineasDeOrigen({ referrer: 'houzz.com', landing_page: '/' }).titular, 'Referral from houzz.com'));
ok('directo', () =>
  assert.equal(lineasDeOrigen({ landing_page: '/' }).titular, 'Direct'));
// «Directo» y «no medimos» NO son lo mismo: confundirlos hace creer que el trafico directo
// sube cuando lo que se cayo es la medicion.
ok('sin datos != directo', () =>
  assert.equal(lineasDeOrigen({}).titular, 'Not captured'));

console.log('\n  LAS REGLAS DURAS DEL HTML DE CORREO');

const EJEMPLO = {
  formId: 'estimate',
  tituloRespaldo: 'Request a quote',
  campos: [
    { campo: 'Full-Name', etiqueta: 'Full name', valor: 'Jane Doe' },
    { campo: 'email', etiqueta: 'Email', valor: 'jane.doe@example.com' },
    { campo: 'Phone', etiqueta: 'Phone', valor: '(352) 555-0134' },
    { campo: 'Street-Address', etiqueta: 'Street address', valor: '1420 SE 17th St' },
    { campo: 'City', etiqueta: 'City', valor: 'Ocala' },
    { campo: 'State', etiqueta: 'State', valor: 'FL' },
    { campo: 'ZIP-Code', etiqueta: 'ZIP code', valor: '34471' },
    { campo: 'Estimated-Project-Budget', etiqueta: 'Budget', valor: '$50,000 – $75,000' },
    { campo: 'checkbox', etiqueta: 'Services of interest', valor: 'New Pool and Spa Construction, Outdoor Kitchens' },
  ],
  ruta: '/request-estimated',
  origen: {
    utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'pool-remodel-fl',
    gclid: 'Cj0KCQjwlOu2BhCCARIsAB', landing_page: '/pool-builders/ocala-florida',
    first_seen: '2026-09-04T22:12:04.000Z',
  },
  ip: '203.0.113.44',
  fecha: new Date('2026-09-04T22:33:56.886Z'),
};

const aviso = construyeAviso(EJEMPLO);

// Cada prohibicion con el motivo por el que existe, para que nadie la levante «porque estorba».
const PROHIBIDO = [
  [/display\s*:\s*flex/i, 'flexbox — Gmail lo ignora y las columnas se apilan mal'],
  [/display\s*:\s*grid/i, 'grid — idem'],
  [/<style[\s>]/i, '<style> — Gmail recorta la hoja entera del <head>'],
  [/\sclass\s*=/i, 'clases — sin <style> no significan nada, y con el se pierden'],
  [/<svg[\s>]/i, 'SVG — ni Gmail ni Outlook lo pintan en correo'],
  [/background-image/i, 'background-image — Outlook la ignora sin VML'],
  [/src\s*=\s*["'](?!https:\/\/)/i, 'src relativa o data: — el cliente de correo no resuelve rutas del sitio'],
  // Medido: con `white-space:nowrap` en las etiquetas, «SERVICES OF INTEREST» fijaba un ancho
  // minimo que la tabla no podia bajar y a 375 px el correo desbordaba 27 px. No se ve en una
  // captura de pagina completa —el lienzo se ensancha al contenido—, solo en una sonda de
  // desborde. Aqui se prohibe la CONSTRUCCION, que es lo unico comprobable sin navegador.
  [/white-space\s*:\s*nowrap/i, 'nowrap — fija un ancho minimo y desborda el movil en silencio'],
];
for (const [re, motivo] of PROHIBIDO) {
  ok(`sin ${motivo}`, () => assert.ok(!re.test(aviso.html), `encontrado: ${re}`));
}

ok('declara color-scheme light', () =>
  assert.match(aviso.html, /name="color-scheme"\s+content="light"/));
ok('el logo va por URL absoluta y con alt', () =>
  assert.match(aviso.html, /<img src="https:\/\/[^"]+\/images\/site\/logo-correo\.png"[^>]*alt="Mr &amp; Mrs Outdoor Living"/));
ok('ancho maximo 600', () => assert.match(aviso.html, /max-width:600px/));
// El oro da 1,86:1 sobre blanco. Puede ser FONDO; jamas color de texto.
// El `(?<!-)` no es adorno: sin el, `background-color:#f4b248` casa por su cola y la puerta
// se pone roja por el unico uso que SI esta permitido.
ok('el oro nunca es tinta', () =>
  assert.ok(!/(?<!-)color:\s*#f4b248/i.test(aviso.html), 'el oro aparece como color de texto'));

ok('telefono y correo son enlaces utilizables', () => {
  assert.ok(aviso.html.includes('href="mailto:jane.doe@example.com"'));
  assert.ok(aviso.html.includes('href="tel:+13525550134"'));
});

// Sin imagenes no puede perderse NADA: todo dato del formulario tiene que estar en el texto
// del HTML, no dentro de una imagen.
ok('se entiende con las imagenes bloqueadas', () => {
  const sinEtiquetas = aviso.html.replace(/<[^>]+>/g, ' ');
  for (const c of EJEMPLO.campos) {
    assert.ok(sinEtiquetas.includes(c.valor.replace(/&/g, '&amp;')) || sinEtiquetas.includes(c.valor),
      `falta en el texto: ${c.etiqueta}`);
  }
});

console.log('\n  LOS DOS CUERPOS');
ok('el texto plano lleva los mismos datos', () => {
  for (const c of EJEMPLO.campos) assert.ok(aviso.texto.includes(c.valor), `falta: ${c.etiqueta}`);
  assert.ok(aviso.texto.includes('Sep 4, 2026 · 6:33 PM EDT'));
  assert.ok(aviso.texto.includes('LEAD SOURCE: Google / cpc'));
});
ok('el asunto tria sin abrir', () =>
  assert.equal(aviso.asunto, 'New lead · Estimate request · Ocala 34471'));
// El formulario de contacto no pide ni ciudad ni ZIP: el asunto se queda en dos partes.
ok('sin ciudad ni ZIP el asunto no queda cojo', () => {
  const c = construyeAviso({ ...EJEMPLO, formId: 'contact', campos: [{ campo: 'Email', etiqueta: 'Email', valor: 'a@b.co' }] });
  assert.equal(c.asunto, 'New lead · Contact form');
});
ok('el lightbox de la galeria no se llama «Request a quote»', () =>
  assert.equal(construyeAviso({ ...EJEMPLO, formId: 'gallery' }).asunto, 'New lead · Gallery request · Ocala 34471'));

// ── FIXTURES para las capturas ────────────────────────────────────────────────
const DIR = path.join(os.tmpdir(), 'mm-aviso');
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'aviso-estimate.html'), aviso.html);
fs.writeFileSync(path.join(DIR, 'aviso-estimate.txt'), aviso.texto);
fs.writeFileSync(path.join(DIR, 'aviso-contact.html'), construyeAviso({
  ...EJEMPLO, formId: 'contact', ruta: '/contact-us', origen: {},
  campos: [
    { campo: 'First-Name', etiqueta: 'First name', valor: 'Marcus' },
    { campo: 'Last-Name', etiqueta: 'Last name', valor: 'Whitfield' },
    { campo: 'Email', etiqueta: 'Email', valor: 'marcus.whitfield@example.com' },
    { campo: 'Phone-Number', etiqueta: 'Phone', valor: '954-555-0177' },
    { campo: 'Project-Type', etiqueta: 'Project type', valor: 'Residential' },
    { campo: 'Type', etiqueta: 'Type', valor: 'homeowner' },
    { campo: 'Message', etiqueta: 'Message', valor: 'Looking to remodel a 1990s pool deck and add a screen enclosure before the summer.' },
  ],
}).html);

console.log(`\n  fixtures  : ${DIR}`);
console.log(`  resultado : ${fallos ? `🔴 ${fallos} fallo(s)` : '✅ todo verde'}\n`);
process.exit(fallos ? 1 : 0);
