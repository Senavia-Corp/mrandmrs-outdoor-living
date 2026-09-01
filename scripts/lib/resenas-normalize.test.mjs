#!/usr/bin/env node
// Self-check de la normalizacion de reseñas. SIN red, SIN OAuth, ~50 ms.
//
// Existe porque la ruta de Business Profile v4 necesita aprobacion manual de
// Google: no se puede ejercitar a demanda, y sin esto el adaptador se enviaria
// sin haber convertido una sola reseña.
import assert from 'node:assert/strict';
import { aNumeroEstrellas, comentarioOriginal, desdeBusinessProfile, desdePlaces }
  from './resenas-normalize.mjs';

// ── el enum de estrellas ──────────────────────────────────────────────────
assert.equal(aNumeroEstrellas('FIVE'), 5);
assert.equal(aNumeroEstrellas('ONE'), 1);
assert.equal(aNumeroEstrellas('THREE'), 3);
assert.equal(aNumeroEstrellas('STAR_RATING_UNSPECIFIED'), null, 'el enum sin definir es null, no 0');
assert.equal(aNumeroEstrellas('SEIS'), null, 'un enum nuevo de Google no puede colarse como numero');
assert.equal(aNumeroEstrellas(4), 4, 'Places ya da numeros y tienen que pasar tal cual');
assert.equal(aNumeroEstrellas(NaN), null);

// ── la traduccion pegada ──────────────────────────────────────────────────
assert.equal(
  comentarioOriginal('(Translated by Google) Great work!\n\n(Original) Excelente trabajo!'),
  'Excelente trabajo!',
  'se queda el ORIGINAL: publicar la traduccion es poner palabras en boca del cliente',
);
assert.equal(comentarioOriginal('(Translated by Google) Great work!'), 'Great work!',
  'sin bloque (Original) se quita al menos el marcador');
assert.equal(comentarioOriginal('Sin marcadores'), 'Sin marcadores');
assert.equal(comentarioOriginal(null), '');
assert.equal(comentarioOriginal(''), '');
// Un "(Original)" dentro del texto del cliente: gana el ULTIMO, que es el separador real.
assert.equal(
  comentarioOriginal('(Translated by Google) The (Original) plan\n\n(Original) El plan (Original) de verdad'),
  'El plan (Original) de verdad',
);

// ── reviewer anonimo ──────────────────────────────────────────────────────
const anon = desdeBusinessProfile({
  reviewer: { isAnonymous: true, displayName: 'No usar', profilePhotoUrl: 'https://x/y.jpg' },
  starRating: 'FOUR', comment: 'Bien', createTime: '2026-01-02T03:04:05Z',
});
assert.equal(anon.autor, 'Google user', 'a un anonimo no se le atribuye nombre');
assert.equal(anon.foto, undefined, 'el contrato no lleva foto: cero peticiones a terceros');

// ── contrato exacto: ni un campo de mas ni de menos ───────────────────────
const CLAVES = ['autor', 'estrellas', 'fecha', 'texto'];
const gbp = desdeBusinessProfile({
  reviewer: { displayName: '  Ana Garcia  ' }, starRating: 'FIVE',
  comment: 'Todo   perfecto\ncon saltos', createTime: '2026-04-22T00:49:48Z',
});
assert.deepEqual(Object.keys(gbp).sort(), CLAVES);
assert.equal(gbp.autor, 'Ana Garcia', 'el nombre viene con espacios de Google');
assert.equal(gbp.texto, 'Todo perfecto con saltos',
  'los blancos se colapsan: si no, el JSON y el innerText de la pagina no casan');

const places = desdePlaces({
  authorAttribution: { displayName: 'Derek' }, rating: 5,
  originalText: { text: 'Excelente' }, text: { text: 'TRADUCCION QUE NO DEBE SALIR' },
  publishTime: '2026-07-08T00:00:00Z',
});
assert.deepEqual(Object.keys(places).sort(), CLAVES, 'los dos adaptadores dan la MISMA forma');
assert.equal(places.texto, 'Excelente', 'gana originalText, nunca text');

// Sin originalText se cae a text, que es mejor que quedarse sin reseña.
assert.equal(desdePlaces({ rating: 5, text: { text: 'Solo hay text' } }).texto, 'Solo hay text');
assert.equal(desdePlaces({ rating: 5 }).autor, 'Google user');

console.log('OK  resenas-normalize: 20 comprobaciones');
