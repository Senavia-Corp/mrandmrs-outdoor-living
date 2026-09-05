#!/usr/bin/env node
/**
 * PUERTA de la Fase 9 — el `<head>` de las 115 contra `baseline/seo.json`.
 *
 *     npm run check:seo
 *
 * Es ESTÁTICA a propósito: lee el HTML construido, no abre navegador. El `<head>` no lo toca
 * ningún JS en este sitio, así que meter un navegador solo añadiría 13 minutos y una fuente de
 * fallos que no aporta nada.
 *
 * QUÉ SE EXIGE IDÉNTICO
 *   · `<title>` y `meta description`, carácter a carácter
 *   · todos los `og:*` y `twitter:*` que el origen tenga
 *   · el JSON-LD, comparado con las CLAVES ORDENADAS para que el orden no cause falsos rojos
 *
 * QUÉ SE EXIGE DISTINTO, Y POR QUÉ
 *   · **La canónica.** El sitio vivo NO tiene ni una en las 115 — comprobado. La Fase 9 del
 *     encargo las pide, así que son una ADICIÓN DELIBERADA. Aquí se exige que existan y que
 *     apunten a la propia página; comparar contra el baseline daría rojo en las 115 por algo
 *     que hicimos a propósito.
 *   · **Las URLs de imagen** de `og:image`/`twitter:image` apuntan a este dominio, no al CDN
 *     de Webflow. Se comparan por el NOMBRE del fichero, que es lo que tiene que coincidir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { esPropia, conPropias } from './lib/rutas-propias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';

/**
 * M2 — los `<title>` que se apartan del origen, con su motivo. Tiene que casar con
 * `TITULO_PROPIO` de `build-paginas.mjs`, que es quien los escribe.
 */
const TITULO_PROPIO = new Map([
  ['/project/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida',
    'Luxury Pool with Motorized Pergola & Outdoor Kitchen | North Florida'],
  ['/project/luxury-pool-motorized-pergola-screen-enclosure-north-florida',
    'Luxury Pool with Motorized Pergola & Screen Enclosure | North Florida'],
  ['/project/luxury-pool-spa-screen-enclosure-north-florida',
    'Luxury Pool & Spa with Screen Enclosure & Outdoor Kitchen | North Florida'],
]);
/** Todos los titulos vistos, para exigir que NINGUNO se repita. */
const titulosVistos = new Map();

const ref = JSON.parse(fs.readFileSync(path.join(RAIZ, 'baseline/seo.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

/**
 * El baseline guarda las URLs del CDN de Webflow; el build las tiene ya locales. Para
 * comparar peras con peras se traduce el BASELINE con el manifiesto — que es el mismo mapa
 * que uso el generador — en vez de recortar nombres a ojo. Si una URL del baseline no esta en
 * el manifiesto, se deja tal cual y la diferencia sale: eso es una URL que nadie migro.
 */
const aLocal = (t) => String(t).replace(
  /https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g,
  (u) => {
    while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1);
    // `industry-solutions` repite el id de sitio en la ruta (defecto del origen, ya anotado en
    // la Fase 2: la URL con el id duplicado da 403). El manifiesto guarda la normalizada.
    const norm = u.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/');
    return man[u]?.publico ?? man[norm]?.publico ?? u;
  });
const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));

/**
 * `/pool-investment-estimator` no es una página de Webflow: es la app de Webflow Cloud, con su
 * propio `<head>` de 4 etiquetas. No tiene og:* ni JSON-LD que comparar, ni en el origen.
 */
const SIN_HEAD_DE_WEBFLOW = new Set(['/pool-investment-estimator']);

/**
 * `/thank-you` LLEVA `noindex` TAMBIEN EN PRODUCCION, y es lo correcto: una pagina de gracias
 * indexada la alcanza gente que no ha enviado nada, y entonces o cuenta conversiones falsas o
 * —peor— sale en Google en vez de la pagina de servicio que si vende.
 *
 * Estaba sin declarar, asi que esta puerta la daba ROJA en cada pasada en modo produccion por
 * hacer exactamente lo que se le pide. Se declara aqui, y ademas al reves: si algun dia PIERDE
 * el noindex, tambien es rojo.
 */
const NOINDEX_A_PROPOSITO = new Set(['/thank-you']);

/**
 * EL HOST DE LAS CANONICAS, para cotejarlo despues con el del sitemap.
 *
 * POR QUE ES UNA PUERTA Y NO UN COMENTARIO. Las canonicas salen de `astro.config.mjs` y el
 * sitemap de `scripts/build-seo-ficheros.mjs`, y hasta hoy el segundo llevaba el host A FUEGO.
 * O sea: se podia cambiar el dominio en un sitio y dejar el otro atras sin que nada fallara,
 * y el sintoma —Google recibe dos hosts distintos para el mismo sitio y reparte la autoridad
 * entre ambos— no aparece en ningun rojo, solo semanas despues en Search Console.
 */
const hostsCanonicos = new Set();

/**
 * ── PARTES DE JSON-LD ANADIDAS A PROPOSITO ────────────────────────────────────────────────
 *
 * `/projects` enseña 15 obras desde que se publicaron las 5 propias (3-sep-2026), y su
 * `hasPart` crece con ellas: dejarlo en 10 seria decirle a Google que la pagina tiene 10 partes
 * mientras muestra 15, o sea marcado que miente. El baseline tiene 10 y no se re-baseliniza —es
 * el `<head>` del Webflow de origen—, asi que la diferencia se DECLARA aqui.
 *
 * NO ES «IGNORA ESTE BLOQUE», y la diferencia importa. Se quitan EXACTAMENTE las N primeras
 * entradas de la clave declarada, exigiendo que sean ESTAS y EN ESTE ORDEN; a partir de ahi el
 * bloque entero —las 10 partes del origen, su orden y todas las demas claves— se compara
 * caracter a caracter como siempre. Si el origen pierde una parte, sigue saliendo rojo.
 *
 * A LAS PARTES ANADIDAS SE LES CAMBIA EL CRITERIO, NO SE LES QUITA. Es el mismo trato que esta
 * puerta da ya a una ruta propia: como no hay baseline contra el que compararlas, se exige que
 * ESTEN —`name`, `description` e `image.url` no vacios—. Una parte vacia es un `hasPart` que
 * ocupa sitio y no dice nada, y es justo lo que nadie iria a mirar.
 *
 * El orden tiene que ser el mismo que el de las tarjetas, y lo es por construccion: las dos
 * listas salen de `src/data/proyectos-propios.json` en `build-paginas.mjs` (§ OBRAS_PROPIAS).
 */
const PARTES_PROPIAS = {
  '/projects': {
    bloque: 0,
    clave: 'hasPart',
    urls: [
      '/project/luxury-pool-raised-spa-travertine-deck-south-florida',
      '/project/estate-pool-spa-sun-shelf-north-florida',
      '/project/pool-raised-spa-marble-deck-south-florida',
      '/project/luxury-pool-spa-aluminum-pergola-south-florida',
      '/project/aluminum-patio-cover-pool-deck-south-florida',
    ],
    motivo: 'Las 5 obras de autoria propia del 3-sep-2026. Las inserta `build-paginas.mjs` '
      + '(§ OBRAS_PROPIAS) al principio del `hasPart`, en el mismo orden que sus tarjetas.',
  },
};
let partesCasadas = 0;

/**
 * LAS RUTAS DE AUTORIA PROPIA no tienen entrada en `baseline/seo.json` y no pueden tenerla:
 * no existen en el origen. La tentacion es saltarlas enteras, y seria un error — la canonica
 * y el `noindex` son justo lo que hay que vigilar en una pagina nueva, porque es la que puede
 * colarse indexada desde una preview. Asi que se les cambia el criterio, no se les quita:
 * donde a las 115 se les exige que el `<head>` COINCIDA con el del origen, a estas se les
 * exige que ESTE — titulo y descripcion no vacios— y despues pasan por el mismo bloque de
 * canonica/noindex que todas. Ver `lib/rutas-propias.mjs`.
 */

let fallos = 0, ok = 0;
const rojos = [];
const nombre = (u) => String(u).split('/').pop().split('?')[0].toLowerCase();
const ordena = (v) => (Array.isArray(v) ? v.map(ordena)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordena(v[k])])) : v);

for (const ruta of conPropias(RUTAS)) {
  const f = [path.join(ESTATICO, ruta + '.html'), path.join(ESTATICO, ruta, 'index.html'),
    path.join(ESTATICO, ruta === '/' ? 'index.html' : '')].find((c) => c && fs.existsSync(c));
  if (!f) { rojos.push([ruta, ['no esta construida']]); fallos++; continue; }
  const propia = esPropia(ruta);
  const esperado = ref[ruta];
  if (!esperado && !propia) { rojos.push([ruta, ['no hay baseline de SEO']]); fallos++; continue; }

  const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  const problemas = [];

  const titulo = d.querySelector('title')?.textContent ?? '';
  if (propia) {
    // No hay con que comparar: se exige que EXISTAN, no que coincidan.
    if (!titulo.trim()) problemas.push('title vacio');
    if (!(d.querySelector('meta[name=description]')?.content ?? '').trim()) {
      problemas.push('meta description vacia');
    }
    /**
     * QUE EL JSON-LD ESTE Y PARSEE. Es lo unico exigible sin baseline, y tapa un agujero real:
     * el resto de este fichero NO corre para una ruta propia —se salta og/twitter y el JSON-LD
     * entero—, asi que si alguien clona una de las 8 fichas de `/project/` que emiten JSON-LD
     * roto (salto de linea literal sin escapar, heredado del scrape), la ficha nueva heredaria
     * el defecto Y la exencion, y no lo cazaria nadie.
     */
    const bl = [...d.head.querySelectorAll('script[type="application/ld+json"]')];
    if (!bl.length) problemas.push('sin JSON-LD');
    bl.forEach((b, i) => {
      try { JSON.parse(b.textContent); } catch { problemas.push(`JSON-LD ${i} NO PARSEA`); }
    });
  } else if (TITULO_PROPIO.has(ruta)) {
    /**
     * M2 — TRES TITULOS QUE SE APARTAN DEL ORIGEN A PROPOSITO.
     *
     * El origen repetia el mismo `<title>` en dos pares de fichas de `/project/`, asi que la
     * paridad estricta obligaba a repetirlo tambien aqui: dos paginas compitiendo por la misma
     * consulta, con el defecto blindado por la puerta que deberia protegerlo.
     *
     * Lo que se exige a estas tres NO se relaja, cambia de referencia: en vez de «igual al
     * origen», **el titulo declarado**, que ademas tiene que seguir siendo UNICO en el sitio.
     * Sin la segunda mitad, esta excepcion seria una puerta abierta.
     */
    const esperadoPropio = TITULO_PROPIO.get(ruta);
    if (titulo !== esperadoPropio) problemas.push(`title propio: "${esperadoPropio}" -> "${titulo}"`);
  } else if (titulo !== esperado.title) problemas.push(`title: "${esperado.title}" -> "${titulo}"`);
  titulosVistos.set(titulo, [...(titulosVistos.get(titulo) ?? []), ruta]);

  if (!propia && !SIN_HEAD_DE_WEBFLOW.has(ruta)) {
    const hay = {};
    for (const m of d.head.querySelectorAll('meta[property],meta[name]')) {
      const k = m.getAttribute('property') || m.getAttribute('name');
      if (/^(og:|twitter:|description$|robots$|keywords$)/.test(k)) hay[k] = m.content;
    }
    for (const [k, v] of Object.entries(esperado.meta ?? {})) {
      if (k === 'robots') continue;                    // lo gobierna el interruptor de indexacion
      const m = hay[k];
      if (m === undefined) { problemas.push(`falta ${k}`); continue; }
      const esImagen = /^(og:image|twitter:image)/.test(k);
      if (esImagen ? nombre(m) !== nombre(aLocal(v)) : m !== v) {
        problemas.push(`${k}: "${String(v).slice(0, 50)}" -> "${String(m).slice(0, 50)}"`);
      }
    }
    const sobra = Object.keys(hay).filter((k) => k !== 'robots' && !(k in (esperado.meta ?? {})));
    if (sobra.length) problemas.push(`meta de mas: ${sobra.join(', ')}`);

    // JSON-LD: mismo numero de bloques y mismo contenido con las claves ordenadas.
    const bloques = [...d.head.querySelectorAll('script[type="application/ld+json"]')];
    const espLd = esperado.jsonLd ?? [];
    if (bloques.length !== espLd.length) {
      problemas.push(`JSON-LD: ${espLd.length} bloque(s) -> ${bloques.length}`);
    } else {
      for (const [i, b] of bloques.entries()) {
        const e = espLd[i];
        let mio; try { mio = ordena(JSON.parse(b.textContent)); } catch { problemas.push(`JSON-LD ${i} no parsea`); continue; }

        // Las partes anadidas a proposito (§ PARTES_PROPIAS): se exigen y se descuentan.
        const pp = PARTES_PROPIAS[ruta];
        if (pp && i === pp.bloque) {
          const arr = mio[pp.clave];
          const cabeza = Array.isArray(arr) ? arr.slice(0, pp.urls.length) : [];
          const malas = [];
          if (cabeza.length !== pp.urls.length) {
            malas.push(`${pp.clave}: ${cabeza.length} parte(s) propia(s) de ${pp.urls.length}`);
          }
          cabeza.forEach((x, k) => {
            if (x?.url !== pp.urls[k]) malas.push(`parte propia ${k}: url "${x?.url}" != "${pp.urls[k]}"`);
            for (const c of ['name', 'description']) {
              if (!String(x?.[c] ?? '').trim()) malas.push(`parte propia ${k}: ${c} vacio`);
            }
            if (!String(x?.image?.url ?? '').trim()) malas.push(`parte propia ${k}: image.url vacia`);
          });
          if (malas.length) { problemas.push(...malas); continue; }
          // `ordena` ya dejo las claves ordenadas; sustituir una existente conserva su sitio.
          mio = { ...mio, [pp.clave]: arr.slice(pp.urls.length) };
          partesCasadas++;
        }

        const a = JSON.stringify(mio);
        const c = aLocal(JSON.stringify(ordena(e)));
        if (a !== c) {
          const ja = JSON.parse(a), jc = JSON.parse(c);
          const claves = [...new Set([...Object.keys(ja), ...Object.keys(jc)])]
            .filter((k) => JSON.stringify(ja[k]) !== JSON.stringify(jc[k]));
          problemas.push(`JSON-LD ${i} difiere en: ${claves.slice(0, 4).join(', ') || '(anidado)'}`);
        }
      }
    }
  }

  // La canonica: adicion deliberada, solo en produccion.
  const can = d.querySelector('link[rel=canonical]')?.getAttribute('href');
  if (can) { try { hostsCanonicos.add(new URL(can).host); } catch { problemas.push(`canonica ilegible: ${can}`); } }
  if (PROD && !can) problemas.push('falta la canonica (PUBLIC_ES_PRODUCCION=1)');
  if (!PROD && can) problemas.push('hay canonica fuera de produccion: en preview no debe emitirse');
  const noindex = /noindex/.test(d.querySelector('meta[name=robots]')?.content ?? '');
  if (!PROD && !noindex) problemas.push('falta noindex fuera de produccion');
  if (PROD && noindex && !NOINDEX_A_PROPOSITO.has(ruta)) problemas.push('hay noindex EN PRODUCCION');
  if (PROD && !noindex && NOINDEX_A_PROPOSITO.has(ruta)) problemas.push('FALTA el noindex declarado');

  if (problemas.length) { rojos.push([ruta, problemas]); fallos++; } else ok++;
}

console.log(`\n  modo: ${PROD ? 'PRODUCCION (canonica si, noindex no)' : 'preview (noindex si, canonica no)'}`);
// La excepcion se DICE por pantalla. Una declaracion que no sale en la salida deja de estar
// declarada el dia que nadie abre el fichero.
for (const [r, d] of Object.entries(PARTES_PROPIAS)) {
  const bien = partesCasadas > 0;
  console.log(`  ${bien ? 'ok  ' : 'ROJO'} declarado ${r}: ${d.urls.length} parte(s) propia(s) `
    + `en ${d.clave}, descontadas antes de comparar con el baseline`);
  if (!bien) fallos++;
}
// Se cuentan por separado a proposito: a las del origen se les exige el `<head>` IDENTICO, a
// las propias solo que este y que la indexacion sea correcta. Un unico total las mezclaria y
// diria «116/115», que ademas de raro sugiere que hay una pagina de mas.
const nPropias = conPropias(RUTAS).length - RUTAS.length;
console.log(`  ${ok - nPropias}/${RUTAS.length} paginas con el head identico al origen`);
console.log(`  ${nPropias} de autoria propia: head propio, indexacion vigilada igual\n`);
for (const [r, ps] of rojos.slice(0, 10)) {
  console.log(`  ROJO ${r}`);
  ps.slice(0, 5).forEach((p) => console.log(`       ${p}`));
}
if (rojos.length > 10) console.log(`  ... y ${rojos.length - 10} paginas mas`);

/**
 * M2 — NINGUN `<title>` SE REPITE. Es la otra mitad de `TITULO_PROPIO`: sin esto, la
 * excepcion seria una puerta abierta —bastaria declarar un titulo y volver a duplicarlo—, y
 * ademas el defecto que se acaba de arreglar podria reaparecer por otra ruta sin que nadie
 * lo viera. Se mide sobre las 122 construidas, no solo sobre las declaradas.
 */
{
  const repes = [...titulosVistos.entries()].filter(([, rs]) => rs.length > 1);
  if (repes.length) {
    fallos++;
    console.log(`  ROJO ${repes.length} titulo(s) repetido(s)`);
    repes.slice(0, 5).forEach(([t, rs]) => console.log(`       "${t.slice(0, 58)}"  ->  ${rs.join('  ')}`));
  } else console.log(`  ok   los ${titulosVistos.size} <title> son unicos — 0 repetidos`);
}
for (const r of TITULO_PROPIO.keys()) {
  console.log(`  ok   declarado ${r}: <title> propio, distinto al del origen (el origen lo repetia)`);
}

for (const r of NOINDEX_A_PROPOSITO) {
  console.log(`  ok   declarado ${r}: noindex TAMBIEN en produccion, a proposito`);
}

// ── EL HOST, UNO SOLO, EN LOS DOS SITIOS ──────────────────────────────────────
// Solo tiene sentido en produccion: fuera de ella no se emiten canonicas y el sitemap sale
// vacio a proposito.
if (PROD) {
  const sm = path.join(ESTATICO, 'sitemap.xml');
  const hostsSitemap = new Set(fs.existsSync(sm)
    ? [...fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).host)
    : []);
  const uno = (x) => [...x].sort().join(', ') || '(ninguno)';
  const coherente = hostsCanonicos.size === 1 && hostsSitemap.size === 1
    && [...hostsCanonicos][0] === [...hostsSitemap][0];
  console.log(`  ${coherente ? 'ok  ' : 'ROJO'} un solo host: canonicas [${uno(hostsCanonicos)}] `
    + `= sitemap [${uno(hostsSitemap)}]`);
  if (!coherente) {
    fallos++;
    console.log('       astro.config.mjs y scripts/build-seo-ficheros.mjs tienen que decir LO MISMO.');
  }
}

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} pagina(s)`}\n`);
process.exit(fallos ? 1 : 0);
