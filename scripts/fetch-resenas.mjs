#!/usr/bin/env node
// Vuelca las reseñas de Google del perfil de Mr & Mrs en src/data/resenas.json,
// que el build hornea como HTML estatico.
//
// POR QUE un volcado en build y no un widget de JS: Google IGNORA el markup de
// reseñas que un negocio publica sobre si mismo (LocalBusiness/Organization son
// "ineligible for star review feature" cuando la entidad reseñada controla las
// reseñas), asi que no hay estrellas que ganar en el SERP. El valor es que el
// TEXTO exista en el HTML servido: indexable por crawlers y legible por
// AI Overviews / ChatGPT / Perplexity, que no ejecutan el JS de un widget.
// Un iframe saca cero en todos esos frentes. Ademas la D2 pide cero peticiones
// a terceros en el navegador del visitante.
//
//     node scripts/fetch-resenas.mjs
//
// Variables (de .env.local en local, o secretos del repo en CI):
//   GOOGLE_PLACES_API_KEY  clave de Places API (New)          -> 5 reseñas
//   GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN     -> TODAS
//   GBP_LOCATION           opcional, accounts/{a}/locations/{l}
//
// Los dos adaptadores y la seleccion automatica son a proposito: hoy no hay
// acceso al Perfil de Empresa del cliente (medido 31-ago-2026: el token de
// Senavia solo ve la ficha de Senavia Corp), asi que corre por Places con tope
// de 5. El dia que el cliente conceda acceso de administrador y aparezcan las
// tres GBP_*, salta solo a las 13 SIN tocar una linea de codigo.
import fs from 'node:fs';
import path from 'node:path';
import { desdeBusinessProfile, desdePlaces } from './lib/resenas-normalize.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'src/data/resenas.json');

// Mismo lector minimo de .env.local que el resto de scripts: sin dependencia de
// dotenv y sin suponer version de node para --env-file. En CI no hay .env.local
// y cae a process.env.
function leeEnv() {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
    );
  } catch { return {}; }
}
const env = { ...leeEnv(), ...process.env };

/* La ficha del cliente. Verificada 31-ago-2026 por nombre, telefono
   (352) 740-3361 y dominio mrandmrsoutdoorliving.com:
     place  ChIJo8zESQOC4k0RKexwLEPDFx0
     CID    2096358844840078377
     1831 E Wade St #102, Trenton, FL 32693

   OJO: el CID 13592496939047920063 que traia MIGRACION-LOG.md y resenas.json
   NO es el de este negocio -no casa con ninguna busqueda del perfil-, asi que
   el enlace "See all reviews" apuntaba fuera. Corregido aqui.
   Va en el codigo y no en un secreto porque un place ID es publico y permanente. */
const PLACE_POR_DEFECTO = 'ChIJo8zESQOC4k0RKexwLEPDFx0';
const PERFIL = 'https://maps.google.com/?cid=2096358844840078377';

// `||` y no `??`: un secreto de GitHub sin definir llega como '' y no undefined.
const PLACE_ID = env.GOOGLE_PLACE_ID || PLACE_POR_DEFECTO;
const CLAVE = env.GOOGLE_PLACES_API_KEY;

const GBP = {
  clientId: env.GBP_CLIENT_ID,
  clientSecret: env.GBP_CLIENT_SECRET,
  refreshToken: env.GBP_REFRESH_TOKEN,
  location: env.GBP_LOCATION,
};

/* DECISION DE NEGOCIO (Sebastian, 31-ago-2026): solo se publican las reseñas de
   4 y 5 estrellas. El perfil esta hoy en 4,1 sobre 13 y tiene al menos dos de
   1 estrella.

   Se le advirtio del riesgo y decidio asi. La mitigacion que SI queda aplicada:
   cuando el filtro descarta alguna, `valoracion` y `total` se escriben a null,
   de modo que la pagina NO muestra el 4,1 ni "13 Google reviews". Enseñar una
   seleccion favorable bajo un recuento total daria a entender que son todas las
   que hay, que es justo lo que persigue la regla de la FTC de octubre de 2024.
   El enlace "See all reviews" al perfil sigue puesto: quien quiera todas, las
   tiene a un clic y en la fuente.

   Poner esto a 1 publica todas y devuelve el rating y el total a la pagina. */
const MIN_ESTRELLAS = 4;

/* Exclusiones UNA A UNA, con su motivo. Esto NO es lo mismo que el filtro de
   estrellas: aqui no se esconde una opinion, se quita una reseña que no habla de
   este negocio.

   AUTO-CADUCAN a proposito: la exclusion solo se aplica si el texto SIGUE casando
   con `contiene`. Si el autor edita su reseña o Google la reasigna, deja de casar
   y la reseña vuelve a entrar sola. Una lista de exclusiones permanente por nombre
   de autor seria una lista negra silenciosa; esta se desarma sola. */
const EXCLUIDAS = [
  {
    autor: 'Derek',
    contiene: 'MR Concrete',
    motivo: 'No habla de este negocio: describe una extension de driveway hecha por '
      + '"MR Concrete" y la recomienda dos veces por su nombre. Es una reseña mal '
      + 'asignada en el perfil (Sebastian, 31-ago-2026), no una opinion que se oculte.',
  },
];

const estaExcluida = (r) =>
  EXCLUIDAS.find((e) => e.autor === r.autor && r.texto.includes(e.contiene));

/* ────────────────────────────────────────────────────────────────────────────
   Places API (New) — como mucho 5 reseñas, las elige Google.
   No hay paginacion ni forma de pedir mas. Ese tope es el motivo de que este
   script normalice a una forma comun: cambiar a Business Profile es sustituir
   esta funcion, no el contrato ni nada de src/.
   ──────────────────────────────────────────────────────────────────────────── */
async function desdeApiPlaces() {
  if (!CLAVE) throw new Error('Falta GOOGLE_PLACES_API_KEY (y no hay credenciales GBP_*).');

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}`, {
    headers: {
      'X-Goog-Api-Key': CLAVE,
      'X-Goog-FieldMask': 'id,rating,userRatingCount,googleMapsUri,reviews',
    },
  });
  if (!res.ok) throw new Error(`Places devolvio ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const sitio = await res.json();

  return {
    fuente: 'places-api',
    valoracion: sitio.rating ?? null,
    total: sitio.userRatingCount ?? 0,
    items: (sitio.reviews ?? []).map(desdePlaces),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Business Profile API v4 — todas las reseñas de un perfil que administras.
   ──────────────────────────────────────────────────────────────────────────── */

/** Canje del refresh token. Sin clave de API: v4 es solo OAuth. */
async function tokenDeAcceso() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GBP.clientId, client_secret: GBP.clientSecret,
      refresh_token: GBP.refreshToken, grant_type: 'refresh_token',
    }),
  });
  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(`El refresco de OAuth fallo (${res.status}): ${cuerpo.error_description ?? cuerpo.error ?? '?'}`);
  }
  return cuerpo.access_token;
}

const conToken = (t) => ({ headers: { Authorization: `Bearer ${t}` } });

/**
 * Resuelve accounts/{a}/locations/{l}, el padre que necesita v4.
 *
 * La ambiguedad es un ERROR que lista las candidatas, nunca una adivinanza:
 * elegir mal publicaria las reseñas de otro negocio en este sitio. Y aqui el
 * riesgo es real, no teorico — la cuenta que probablemente autorice administra
 * tambien el perfil de Senavia Corp.
 */
async function resuelveUbicacion(token) {
  if (GBP.location) return GBP.location;

  const rc = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', conToken(token));
  if (!rc.ok) throw new Error(`accounts.list devolvio ${rc.status}: ${(await rc.text()).slice(0, 300)}`);
  const cuentas = (await rc.json()).accounts ?? [];
  if (!cuentas.length) throw new Error('La cuenta autorizada no administra ningun Perfil de Empresa.');

  const encontradas = [];
  for (const cuenta of cuentas) {
    // readMask es OBLIGATORIO en este endpoint: sin el, 400.
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${cuenta.name}/locations?readMask=name,title&pageSize=100`;
    const rl = await fetch(url, conToken(token));
    if (!rl.ok) continue; // una cuenta sin acceso a ubicaciones no es fatal
    for (const u of (await rl.json()).locations ?? []) {
      encontradas.push({ name: `${cuenta.name}/${u.name}`, title: u.title });
    }
  }

  if (encontradas.length === 1) return encontradas[0].name;
  if (!encontradas.length) {
    throw new Error(
      'Ninguna ubicacion en las cuentas autorizadas.\n' +
      'Suele ser CUENTA EQUIVOCADA y no falta de permisos: el propietario de GCP\n' +
      'y el del Perfil de Empresa son sistemas distintos.',
    );
  }
  throw new Error(
    `${encontradas.length} ubicaciones — pon GBP_LOCATION con la correcta:\n` +
      encontradas.map((u) => `  ${u.name}  (${u.title})`).join('\n'),
  );
}

async function desdeBusinessProfileApi() {
  const token = await tokenDeAcceso();
  const padre = await resuelveUbicacion(token);

  const crudas = [];
  let pagina, valoracion = null, total = 0;
  do {
    const qs = new URLSearchParams({ pageSize: '50' });
    if (pagina) qs.set('pageToken', pagina);
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${padre}/reviews?${qs}`, conToken(token));
    if (!res.ok) {
      const cuerpo = (await res.text()).slice(0, 400);
      throw new Error(
        `reviews devolvio ${res.status}: ${cuerpo}\n` +
        (res.status === 403
          ? 'Un 403 aqui suele ser que el acceso a la API no esta aprobado todavia.\n' +
            'Ojo al falso negativo: "insufficient authentication scopes" es de SCOPE,\n' +
            'no de aprobacion — el token tiene que llevar business.manage.'
          : ''),
      );
    }
    const p = await res.json();
    crudas.push(...(p.reviews ?? []));
    valoracion = p.averageRating ?? valoracion;
    total = p.totalReviewCount ?? total;
    pagina = p.nextPageToken;
    // Se pagina aunque hoy 13 quepan de sobra en una pagina: el dia que el perfil
    // pase de 50, un fetch sin paginar publicaria un subconjunto en silencio.
  } while (pagina);

  return { fuente: 'business-profile-api', valoracion, total, items: crudas.map(desdeBusinessProfile) };
}

/* ──────────────────────────────────────────────────────────────────────────── */

const usaGbp = Boolean(GBP.clientId && GBP.clientSecret && GBP.refreshToken);
const datos = usaGbp ? await desdeBusinessProfileApi() : await desdeApiPlaces();

// Una reseña de solo estrellas, sin texto, es peso muerto en una seccion cuyo
// valor entero es el texto: nunca llega al JSON.
const conTexto = datos.items.filter((r) => r.texto.length > 0);
const porEstrellas = conTexto.filter((r) => (r.estrellas ?? 0) >= MIN_ESTRELLAS);
const excluidas = porEstrellas.filter(estaExcluida);
const publicables = porEstrellas.filter((r) => !estaExcluida(r));
const filtradas = conTexto.length - porEstrellas.length;

/* `publicar` es un INTERRUPTOR HUMANO y se PRESERVA entre corridas: refrescar las
   reseñas no puede encender la publicacion como efecto secundario. Si el fichero no
   existia todavia, nace en false — que nadie publique por el mero hecho de correr
   esto por primera vez. Encenderlo es editar el JSON a mano, a proposito. */
let publicar = false;
try {
  const previo = JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
  if (typeof previo.publicar === 'boolean') publicar = previo.publicar;
} catch { /* sin fichero previo: se queda en false */ }

const salida = {
  _lee_esto: 'GENERADO por scripts/fetch-resenas.mjs — no editar a mano, SALVO `publicar`. Refresco: npm run resenas:fetch',
  _publicar: 'INTERRUPTOR HUMANO, no derivado. En false el componente no pinta NADA y las 83 rutas '
    + 'quedan como estaban. El fetch lo preserva entre corridas: ponerlo a true es una decision, '
    + 'no un efecto secundario de refrescar.',
  publicar,
  fuente: `Google Business Profile · CID 2096358844840078377 · ${datos.fuente}`,
  enlacePerfil: PERFIL,
  actualizado: new Date().toISOString(),
  // Con filtro activo NO se publica el agregado: enseñar una seleccion favorable
  // junto al recuento total daria a entender que son todas las que hay.
  valoracion: filtradas > 0 ? null : (datos.valoracion ?? null),
  total: filtradas > 0 ? null : (datos.total ?? null),
  items: publicables.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')),
};

fs.writeFileSync(SALIDA, `${JSON.stringify(salida, null, 2)}\n`);

console.log(`${datos.fuente}: ${publicables.length} reseñas escritas (de ${datos.total} en el perfil)`);
if (!publicar) {
  console.log('  publicar=false — el sitio NO las muestra. Escritas, pero no publicadas.');
}
for (const r of excluidas) {
  console.log(`  EXCLUIDA a mano: "${r.autor}" — ${estaExcluida(r).motivo.slice(0, 60)}…`);
}
if (filtradas > 0) {
  console.log(`  ${filtradas} descartadas por debajo de ${MIN_ESTRELLAS} estrellas (decision de negocio).`);
  console.log('  valoracion y total van a null: no se enseña un agregado junto a una seleccion.');
}
if (conTexto.length < datos.items.length) {
  console.log(`  ${datos.items.length - conTexto.length} sin texto, descartadas.`);
}
if (datos.fuente === 'places-api' && datos.total > datos.items.length) {
  console.log(`  AVISO Places topa en 5 — quedan ${datos.total - datos.items.length} reseñas fuera.`);
  console.log('  Para todas hacen falta las GBP_* con acceso al perfil del cliente.');
}
