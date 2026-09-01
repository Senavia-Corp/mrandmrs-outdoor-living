#!/usr/bin/env node
// PUERTA de reseñas — valida src/data/resenas.json. SIN red y SIN navegador.
//
//     npm run check:resenas
//
// Va la PRIMERA de la cadena: tarda 200 ms y si el JSON esta mal no tiene
// sentido gastar los ~80 minutos de Chromium que hay detras.
//
// Cubre justo los huecos que las otras puertas NO pueden ver:
//   · check:texto solo puede afirmar que el DOM transcribe este JSON. Si el JSON
//     trae las reseñas de OTRO negocio, sale verde. Por eso el CID se comprueba
//     aqui (regla 2), y es la razon principal de que esta puerta exista.
//   · check:visual enmascara la region a proposito, asi que no ve el contenido.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FICHERO = path.join(RAIZ, 'src/data/resenas.json');

/* La ficha del cliente, verificada 31-ago-2026 por nombre, telefono y dominio.
   Clavado aqui a proposito: si alguien autoriza con la cuenta equivocada -y la
   que va a autorizar administra TAMBIEN el perfil de Senavia Corp-, esta linea
   es lo unico que impide publicar las reseñas de otro negocio. */
const CID = '2096358844840078377';
const DIAS_MAX = 45;

const fallos = [];
const mal = (m) => fallos.push(m);

if (!fs.existsSync(FICHERO)) {
  console.error('ROJO no existe src/data/resenas.json — corre `npm run resenas:fetch`');
  process.exit(1);
}
const d = JSON.parse(fs.readFileSync(FICHERO, 'utf8'));

// 1 · el contrato que consume ResenasGoogle.astro
for (const k of ['enlacePerfil', 'actualizado', 'valoracion', 'total', 'items', 'publicar']) {
  if (!(k in d)) mal(`falta la clave "${k}" del contrato`);
}
if (!Array.isArray(d.items)) mal('items no es un array');

// 2 · ¿son las reseñas de ESTE negocio?
if (typeof d.enlacePerfil !== 'string' || !d.enlacePerfil.includes(`cid=${CID}`)) {
  mal(`enlacePerfil no apunta al CID ${CID} del cliente: "${d.enlacePerfil}"`);
}

const items = Array.isArray(d.items) ? d.items : [];
const publica = d.publicar !== false;

// 3 · el interruptor tiene que ser BOOLEANO. Un "false" de cadena es truthy y
//     publicaria sin que nadie lo hubiera decidido.
if ('publicar' in d && typeof d.publicar !== 'boolean') {
  mal(`publicar debe ser booleano, no ${typeof d.publicar}: ${JSON.stringify(d.publicar)}`);
}

// 4 · con 0 reseñas no se renderiza nada. Solo importa si de verdad se publica:
//     apagado a proposito, un JSON vacio es un estado legitimo.
if (publica && !items.length) {
  mal('items vacio con publicar=true: el componente no pinta nada en las 83 rutas que lo montan');
}

const vistas = new Set();
items.forEach((r, i) => {
  const en = `items[${i}]`;
  // 5 · texto
  if (typeof r.texto !== 'string' || !r.texto.trim()) {
    mal(`${en} sin texto: una reseña de solo estrellas es peso muerto aqui`);
  }
  // 6 · la trampa de v4, verificada contra el dato REAL y no solo con fixtures
  if (/\(Translated by Google\)|\(Original\)/.test(r.texto ?? '')) {
    mal(`${en} conserva un marcador de traduccion de Google`);
  }
  // 7 · doble codificacion: Astro escapa {r.texto}, asi que un &amp; se ve literal
  if (/&(?:[a-z]+|#\d+);/i.test(r.texto ?? '')) {
    mal(`${en} tiene entidades HTML sin decodificar: se veran crudas en pantalla`);
  }
  // 8 · el enum de estrellas llego convertido
  if (!Number.isInteger(r.estrellas) || r.estrellas < 1 || r.estrellas > 5) {
    mal(`${en} estrellas=${JSON.stringify(r.estrellas)} — se esperaba un entero 1..5`);
  }
  // 9 · autor
  if (typeof r.autor !== 'string' || !r.autor.trim()) mal(`${en} sin autor`);
  else if (r.autor !== r.autor.trim()) mal(`${en} autor con espacios sin recortar`);
  // 10 · paginacion mal hecha = la misma reseña dos veces
  const huella = `${r.autor} ${r.texto}`;
  if (vistas.has(huella)) mal(`${en} duplicada (mismo autor y texto)`);
  vistas.add(huella);
  // 11 · fecha parseable
  if (r.fecha != null && Number.isNaN(Date.parse(r.fecha))) mal(`${en} fecha ilegible: ${r.fecha}`);
  // 12 · cero peticiones a terceros (D2)
  if ('foto' in r) mal(`${en} lleva foto: seria una peticion a un tercero desde el navegador`);
});

// 13 · agregados coherentes
if (d.valoracion != null && (typeof d.valoracion !== 'number' || d.valoracion < 0 || d.valoracion > 5)) {
  mal(`valoracion fuera de rango: ${d.valoracion}`);
}
if (d.total != null && d.total < items.length) {
  mal(`total (${d.total}) menor que las reseñas publicadas (${items.length})`);
}

// 14 · orden por fecha descendente
const fechas = items.map((r) => r.fecha ?? '');
if ([...fechas].sort((a, b) => b.localeCompare(a)).join('|') !== fechas.join('|')) {
  mal('items no esta ordenado por fecha descendente');
}

// 15 · el cron semanal murio en silencio
//     Un workflow programado que falla no rompe ningun build, asi que no se ve.
//     45 dias y no 8: un lunes perdido no molesta, un job muerto si sale.
if (d.actualizado) {
  const dias = (Date.now() - Date.parse(d.actualizado)) / 86400000;
  if (Number.isNaN(dias)) mal(`actualizado ilegible: ${d.actualizado}`);
  else if (dias < -1) mal(`actualizado esta en el futuro: ${d.actualizado}`);
  else if (dias > DIAS_MAX) {
    mal(`el volcado tiene ${Math.round(dias)} dias (max ${DIAS_MAX}): el refresco semanal no esta corriendo`);
  }
}

if (fallos.length) {
  console.error(`ROJO check:resenas — ${fallos.length} fallo(s)`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
if (!publica) {
  console.log(`OK  check:resenas: ${items.length} reseñas validas, CID correcto`);
  console.log('    publicar=false — NO se estan mostrando en el sitio. Las 83 rutas que montan');
  console.log('    el componente salen sin la seccion, y check:texto las ve identicas al baseline.');
} else {
  console.log(`OK  check:resenas: ${items.length} reseñas PUBLICADAS, CID del cliente correcto`);
}
