#!/usr/bin/env node
/**
 * R22-BLOG-IMG — deriva la imagen de los blogs y emite `src/data/imagenes-blog-por-ruta.json`.
 *
 *     node scripts/build-imagenes-blog.mjs           deriva y escribe
 *     node scripts/build-imagenes-blog.mjs --check    no escribe: falla si el dato no cuadra
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE EL CASTING VIVE AQUI Y NO EN EL JSON
 *
 * El JSON es DERIVADO y lo dice en su cabecera. La decision -que foto va en que hueco- es esto
 * de abajo, con su motivo al lado. Asi el dato no se edita a mano y el porque no se pierde.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DONDE SALEN LAS FOTOS, Y LA LINEA QUE NO SE CRUZA
 *
 * Dos fuentes, y ninguna de las dos se elige por el nombre del fichero (`00-PRINCIPIOS §4`):
 *
 *   · BANCO -- `~/Downloads/MrMrs_Outdoor_Living_Image_Bank`, derivado `blog` (1600x900).
 *     421 activos, 74 publicables, de TRES propiedades. Casting hecho sobre las 7 hojas de
 *     `07_contact_sheets/by-service/`.
 *   · GALERIA -- lo que el sitio ya sirve en `public/images/images/`. Casting hecho sobre hojas
 *     de contactos fabricadas para esto, no sobre los nombres.
 *
 * 🚨 `galeria()` RECHAZA cualquier fichero con `trainedAlgorithmicMedia`. No es paranoia: las 10
 * de `images/commercial-*` lo llevan LAS DIEZ, y las 10 tarjetas de blog que hay hoy en
 * produccion tambien. Publicar eso como obra del cliente es lo que prohibe `00-PRINCIPIOS §3`.
 *
 * ⚠️ Y EL MARCADOR FALLA ABIERTO, comprobado: los 4 `-tccm-` que ilustran hoy `top-10` NO lo
 * llevan y son IA sin discusion -infinity pools frente al mar con puestas de sol imposibles, en
 * una empresa que construye patios traseros tierra adentro-. La ausencia de marcador no prueba
 * nada; por eso ademas se MIRAN. Lo que el marcador da es un rechazo automatico, no un permiso.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS TAMAÑOS SALEN DE LA MEDIDA DE LECTURA, NO DE LO QUE HABIA
 *
 * `src/styles/lectura.css:103-105` topa la columna en `min(--mm-medida, 37em)`, que medido son
 * 650 px de 992 para arriba, 518 px de 991 para abajo y ~423 px a 479. La tarjeta pinta ~380 px.
 * De ahi los dos peldaños de cada uso y ni uno mas. Lo que habia eran 69 ficheros y 23,5 MB para
 * pintar 380 px, con la escalera llegando a 2752.
 *
 * TODO A 16:9. Mezclar relaciones de aspecto en una fila de tarjetas hace que la altura la fije
 * la mas alta y deje hueco en las demas (`CLAUDE.md` regla 4). El banco declara `16:9` seguro en
 * las 74. Las de galeria se recortan centradas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { leeArticulos } from './lib/articulo.mjs';
import { graduarPortada } from './lib/grado-portada.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BANCO = path.join(process.env.HOME, 'Downloads/MrMrs_Outdoor_Living_Image_Bank');
const SALIDA = path.join(RAIZ, 'public/images/blog');
const DATO = path.join(RAIZ, 'src/data/imagenes-blog-por-ruta.json');
const SOLO_CHECK = process.argv.includes('--check');

/* Dos peldaños por uso: 1x y 2x de lo que se pinta de verdad. */
const TARJETA = [400, 800];
const FIGURA = [704, 1280];
const SIZES_TARJETA = '(min-width: 768px) 400px, 100vw';
const SIZES_FIGURA = '(min-width: 992px) 650px, (min-width: 768px) 518px, 100vw';
const ALTO = (w) => Math.round((w * 9) / 16);

let fallos = 0;
/** Las que reciben el levantado de sombra, para ENSEÑARLAS al final y no callarlas. */
const ajustadas = [];
/** R23 · las portadas, con su medida antes y despues. Tambien se enseñan. */
const graduadas = [];
const mal = (m) => { console.log(`  🔴 ${m}`); fallos++; };

/* ── las fuentes ─────────────────────────────────────────────────────────── */

const idxBanco = () => {
  const db = path.join(BANCO, '08_ai_index/image_bank.sqlite');
  if (!fs.existsSync(db)) {
    console.error(`\n  El banco no esta en ${BANCO}.`);
    console.error('  Los .webp ya derivados estan versionados; esto solo hace falta para REDERIVAR.\n');
    process.exit(2);
  }
  const sql = `select a.project_id, a.asset_id, d.seo_filename, d.local_path
               from assets a join derivatives d using(asset_id)
               where a.publish_status like 'approved%'
                 and a.asset_class = 'real_completed_project' and d.format = 'blog'`;
  const m = new Map();
  for (const l of execFileSync('sqlite3', ['-separator', '\t', db, sql]).toString().trim().split('\n')) {
    const [proy, asset, seo, local] = l.split('\t');
    m.set(`${proy}:${seo.replace('.webp', '').split('-').pop()}`, { asset, seo, local });
  }
  return m;
};
const BCO = idxBanco();

/** Foto del banco. El token de region sale del nombre: estas rutas no dicen region
 *  y afirmarla en la URL seria decir algo que el articulo no dice (igual que R21). */
const banco = (proy, n, alt) => {
  const v = BCO.get(`${proy}:${n}`);
  if (!v) throw new Error(`banco: no hay ${proy}:${n} aprobada con derivado blog`);
  return { origen: 'banco', fuente: v.local, base: v.seo.replace('-south-fl', '').replace('.webp', ''),
    alt, _asset: v.asset, _proyecto: proy };
};

/** Foto que el sitio ya sirve. Se RECHAZA si lleva el marcador de medio generado. */
const galeria = (rel, alt) => {
  const abs = path.join(RAIZ, 'public/images', rel);
  if (!fs.existsSync(abs)) throw new Error(`galeria: no existe ${rel}`);
  if (fs.readFileSync(abs).includes('trainedAlgorithmicMedia')) {
    throw new Error(`🔴 ${rel} lleva trainedAlgorithmicMedia — no se publica como obra del cliente`);
  }
  return { origen: 'galeria', fuente: abs, base: path.basename(rel).replace(/\.(avif|jpg|webp|png)$/, ''),
    alt, _fuente_publica: `/images/${rel}` };
};


/* ── EL BANCO DE /gallery, POR REFERENCIA ────────────────────────────────────
 *
 * Los 90 articulos nuevos no tienen obra en el banco aprobado: se ilustran con las fotos que
 * `/gallery` ya publica, que es lo decidido («foto real del sitio, repitiendo» dentro del
 * cluster). Se nombran `servicio-indice` —`construction-7`— porque es como las vio el panel de
 * procedencia y como las escribe quien redacta.
 *
 * Y se RECHAZA lo que no sea obra del cliente. El veredicto vive en
 * `src/data/gallery-procedencia.json`: 137 fotos miradas una a una por un panel, 20 discutidas
 * y resueltas por el dueno de la obra. Aqui no se re-juzga nada; se obedece.
 *
 * UNA SOLA ESCALERA POR FOTO, COMPARTIDA. Una foto reutilizada en cinco articulos del cluster
 * derivaria cinco copias identicas si la carpeta fuera la del slug: ~22 MB de duplicado y cinco
 * descargas distintas para el visitante que lee dos articulos. Van a `public/images/blog/banco/`
 * y se sirven las mismas. Los 10 heredados NO se mueven: su salida es byte a byte la que ya
 * esta publicada, y moverla seria un cambio sin motivo.
 */
const PROCEDENCIA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/gallery-procedencia.json'), 'utf8')).servicios;
const BANCO_COMPARTIDO = 'banco';

/* ── DIAGRAMAS: LO QUE SE PUBLICA CUANDO NO HAY FOTO Y NO PUEDE HABERLA ─────
 *
 * Dos servicios no tienen ni una fotografia de obra propia: `light` (soffit LED) y `furniture`.
 * El dueno lo confirmo por escrito — «No tengo» — y pidio generar lo que hiciera falta. La
 * generacion por IA no esta disponible (Higgsfield responde `not_enough_credits`, y el unico
 * otro motor conectado solo edita), asi que sus articulos se ilustran con DIAGRAMAS dibujados:
 * donde caen los focos en un alero, que holgura pide una mesa, como es la seccion de un
 * material.
 *
 * Y es mejor asi, no un apano. Una figura que explica una decision gana siendo exacta: un SVG
 * mide 4 KB, escala a cualquier ancho sin escalera de imagenes, y —lo que importa aqui— NADIE
 * lo confunde con una foto de obra del cliente. La linea roja no se roza siquiera.
 *
 * Por eso un diagrama EXIGE `pie`: el texto visible bajo la figura que dice lo que es. Sin el,
 * `articulo.mjs` se niega a leer el articulo. Un `alt` no basta porque la mayoria no lo lee.
 */
const esDiagrama = (ref) => ref.startsWith('diagrama-');

const diagrama = (ref, alt, pie) => {
  const rel = `blog/diagramas/${ref.replace('diagrama-', '')}.svg`;
  const abs = path.join(RAIZ, 'public/images', rel);
  if (!fs.existsSync(abs)) throw new Error(`diagrama "${ref}": falta public/images/${rel}`);
  if (!pie || !pie.trim()) {
    throw new Error(`diagrama "${ref}" sin \`pie\`. Un diagrama se publica DICIENDO que es un diagrama.`);
  }
  const svg = fs.readFileSync(abs, 'utf8');
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) throw new Error(`diagrama "${ref}": el SVG no declara viewBox="0 0 W H"; sin medidas hay CLS`);
  return {
    src: `/images/${rel}`, srcset: '', sizes: '', alt, pie,
    ancho: Math.round(Number(vb[1])), alto: Math.round(Number(vb[2])), _origen: 'diagrama',
  };
};

const porRef = (ref, alt, esPortada = false) => {
  const m = ref.match(/^([a-z]+)-(\d+)$/);
  if (!m) throw new Error(`ref "${ref}" no tiene la forma servicio-indice (p. ej. construction-7)`);
  const [, svc, i] = m;
  const fotos = PROCEDENCIA[svc];
  if (!fotos) throw new Error(`ref "${ref}": el servicio "${svc}" no existe en gallery-procedencia.json (hay: ${Object.keys(PROCEDENCIA).join(', ')})`);
  const f = fotos.find((x) => x.indice === Number(i));
  if (!f) throw new Error(`ref "${ref}": el servicio "${svc}" solo tiene ${fotos.length} fotos (0-${fotos.length - 1})`);
  if (!f.usable) {
    throw new Error(`🔴 ref "${ref}" NO ES PUBLICABLE como obra del cliente.\n`
      + `        veredicto: ${f.veredicto}\n`
      + `        motivo:    ${f.motivo}`);
  }
  const abs = path.join(RAIZ, 'public', f.src.replace(/^\//, ''));
  if (!fs.existsSync(abs)) throw new Error(`ref "${ref}": ${f.src} no existe en disco`);
  return { origen: 'gallery', fuente: abs, base: `mm-${ref}${esPortada ? '-p' : ''}`, alt, _fuente_publica: f.src, _ref: ref };
};

/* ── EL CASTING ──────────────────────────────────────────────────────────────
 *
 * Reparto por propiedad, y no es estetica: cada una tiene una firma que se reconoce.
 *   · project-062 -- casa crema con teja roja, piscina geometrica, spa elevado en mosaico perla,
 *     deck de marmol blanco. Es el material premium -> los articulos de diseño.
 *   · project-059 -- REMODELACION. Spa en mosaico azul oscuro, travertino, cesped artificial y
 *     CANASTA DE BALONCESTO en casi todos los cuadros -> los articulos de remodelacion, donde el
 *     sujeto es honesto y la firma no canta por estar fuera de sitio.
 *   · project-061 -- piscina lap, cubierta de aluminio, lago. La malla negra de seguridad y el
 *     tobogan amarillo dominan el encuadre: es el material mas flojo -> un solo articulo.
 *
 * Y se alternan en el orden de `/blogs-tips`, que es donde se ven las diez juntas:
 * 062, 061, 059, 062, 059 — sin dos seguidas de la misma casa.
 *
 * FUERA DEL ENCARGO, con motivo: `commercial-pool-construction-...` y
 * `residential-vs-commercial-...` necesitan imagen comercial. El banco tiene CERO comerciales
 * aprobadas y las 10 de `images/commercial-*` son IA. Ver el bloque del final: entran con obra
 * real de sujeto residencial y `alt` que no afirma nada comercial.
 */
const CASTING = {
  '/blogs/top-10-luxury-pool-designs-for-florida-homes': {
    /* Sustituye ademas los 4 `-tccm-` del cuerpo: son IA (mar, atardecer, arquitectura imposible). */
    reemplaza_figuras: true,
    tarjeta: banco('project-062', '04', 'Aerial view of a rectangular pool with a raised mosaic-clad spa and a wide white stone deck in a fenced Florida backyard.'),
    figuras: [
      banco('project-062', '28', 'Raised square spa clad in pale mosaic tile spilling into a rectangular pool, seen from the pool deck.'),
      /* El `alt` de 062-21 y 062-23 NO dice «dusk» ni «late afternoon» aunque el banco las marque
       * `golden_hour_or_twilight`: miradas, son midday SUBEXPUESTAS -cielo medido, sujeto en
       * sombra-, y ademas aqui se les levanta la sombra. Un `alt` que dijera atardecer describiria
       * una foto que no es la que se publica. El metadato del banco se equivoca; la hoja no. */
      banco('project-062', '11', 'Two-storey Florida home with a geometric pool, raised spa and white stone deck running the width of the backyard.'),
      banco('project-062', '21', 'Pool and raised spa seen across the lawn, with palms and the rear of the house behind.'),
    ],
  },
  '/blogs/complete-guide-to-pool-construction-in-florida-costs-timeline-process': {
    tarjeta: banco('project-061', '12', 'Lap pool behind a Florida home, enclosed by a removable black mesh safety fence, with a dark-framed aluminium patio cover over the lanai.'),
    figuras: [
      banco('project-061', '09', 'Aerial view of a narrow lap pool set in a lawn, with stepping-stone pavers and a covered lanai along the back of the house.'),
      banco('project-061', '11', 'Lap pool and covered lanai seen from the lawn, with a mesh safety fence around the water.'),
      banco('project-061', '07', 'View from under an aluminium patio cover toward the lap pool and the lake behind the property.'),
    ],
  },
  '/blogs/pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish': {
    /* La tarjeta NO es la aerea 062-05 aunque sea la de mas puntuacion: en `/blogs-tips` cae a
     * cuatro sitios de la de `top-10` (062-04) y es casi el mismo encuadre. Visto en la hoja de
     * las 32 derivadas, no en el metadato. La aerea baja a figura, donde no compite con nada. */
    tarjeta: banco('project-062', '17', 'Finished pool and raised spa alongside the rear of the house, with loungers on the stone deck.'),
    figuras: [
      banco('project-062', '23', 'Pool and raised spa beside a covered lanai, with loungers on the stone deck and trees behind.'),
      banco('project-062', '29', 'Close view of the raised spa mosaic cladding and the spillway into the pool.'),
      banco('project-062', '05', 'Aerial view of a finished pool and raised spa, showing the full deck layout and the surrounding fence line.'),
    ],
  },
  '/blogs/common-pool-construction-mistakes-we-see-in-florida': {
    tarjeta: banco('project-059', '08', 'Remodelled rectangular pool with a raised spa clad in deep-blue mosaic, a pale travertine deck and a poolside basketball hoop.'),
    figuras: [
      banco('project-059', '02', 'Aerial view of a remodelled pool and raised spa framed by a travertine deck, clipped hedge and artificial turf.'),
      banco('project-059', '19', 'Remodelled pool seen from the deck, with the raised spa spilling into the main body of water.'),
      banco('project-059', '24', 'Rear of a Florida home with the remodelled pool, raised spa and stepping-stone pavers across the turf.'),
    ],
  },
  '/blogs/new-pool-construction-vs-pool-remodeling-which-is-right-for-you': {
    /* El unico que alterna DOS propiedades a proposito: el banco tiene los dos servicios y el
     * articulo compara justo eso. 059 remodelacion, 062 obra nueva. */
    tarjeta: banco('project-059', '09', 'Remodelled pool with a deep-blue mosaic spa and resurfaced interior, finished with a travertine deck.'),
    figuras: [
      banco('project-062', '10', 'Aerial view of a newly built pool and raised spa, with the deck and fence laid out around fresh lawn.'),
      banco('project-059', '27', 'Remodelled pool and raised spa seen from the corner of the deck, with mature hedge behind.'),
      banco('project-062', '08', 'Newly built pool and raised spa from above, showing the finished stone deck and planting.'),
    ],
  },
  '/blogs/what-permits-are-required-for-pool-construction-in-florida': {
    /* Sin foto posible de un permiso. Obra residencial identificable, que es lo que el articulo
     * explica que hay que permisar. No se inventa la foto de una inspeccion. */
    tarjeta: galeria('images/pool-construction-2/custom-pool-spa-builders-florida-02.jpg', 'Overhead view of a rectangular pool with an inset spa, bordered by a stone deck, clipped hedge and palms.'),
    figuras: [
      galeria('images/pool-construction-4/custom-pool-spa-builders-florida-04.jpg', 'Pool with a raised spa and dark tile detail beside a covered patio, with stepping-stone pavers over turf.'),
      galeria('images/pool-construction-8/custom-pool-spa-builders-florida-08.jpg', 'Pool and spa on a stone deck with loungers, overlooking a lake at the rear of the property.'),
      galeria('images/pool-construction-10/custom-pool-spa-builders-florida-10.jpg', 'Rectangular pool with a raised spa clad in blue tile, set in turf behind a screening hedge.'),
    ],
  },
  '/blogs/outdoor-living-design-guide-for-florida-homes': {
    /* `kitchen-7` es 1250x698 (ar 1,79), asi que el recorte a 16:9 no le quita nada: la foto ya
     * viene cerrada sobre la encimera y a ~380 px de tarjeta se lee oscura y confusa. Se cambia
     * por `kitchen-2`, que es la misma cocina de exterior con aire y luz. Visto, no supuesto. */
    tarjeta: galeria('images/kitchen-2/custom-outdoor-kitchen-poolside-florida.avif', 'Poolside outdoor kitchen with a built-in grill and stainless cabinetry under a covered patio.'),
    figuras: [
      galeria('images/pergolas-6/custom-pergola-patio-cover-builders-florida-06.jpg', 'Dark aluminium pergola over a paved pool deck, with palms and water beyond.'),
      galeria('images/patio-screen-8/patio-screen-enclosure-builders-contractors-north-south-florida-08.jpg', 'Furnished lanai behind retractable screens, with a sofa, armchairs and a dining table overlooking the pool.'),
      galeria('images/kitchen-7/modern-custom-outdoor-kitchen-design-florida.avif', 'Outdoor kitchen with stainless appliances and a stone pizza oven, built under cover beside a pool.'),
    ],
  },
  '/blogs/how-outdoor-living-spaces-increase-property-value-in-florida': {
    tarjeta: galeria('images/pergolas-5/custom-pergola-patio-cover-builders-florida-05.jpg', 'Timber pavilion with a vaulted roof and ceiling fan, sheltering an outdoor kitchen and bar seating.'),
    figuras: [
      galeria('images/deck-6/custom-deck-builders-contractors-north-south-florida-06.jpg', 'Hardwood deck stepping down from a house toward a pool, with planting along the edge.'),
      galeria('images/kitchen-4/custom-outdoor-kitchen-with-grill-florida.avif', 'Outdoor kitchen island with a built-in grill and stone cladding, under a covered patio beside palms.'),
      galeria('images/pergolas-2/custom-pergola-patio-cover-builders-florida-02.jpg', 'Glass-topped aluminium pergola beside a pool, with a slatted privacy screen at one end.'),
    ],
  },

  /* ── LOS DOS QUE PEDIAN IMAGEN COMERCIAL ────────────────────────────────────────────────
   *
   * NO EXISTE FOTOGRAFIA COMERCIAL REAL. Comprobado sobre los 421 activos del banco, por
   * `primary_service`, `archetypes`, `service_modules`, `feature_tags` y
   * `base_visual_description`: CERO coincidencias de commercial/hotel/resort/multifamily/
   * community. Y las 10 de `images/commercial-*` llevan `trainedAlgorithmicMedia`.
   *
   * Asi que la eleccion real era: dejar una imagen GENERADA en produccion, o poner obra real
   * cuyo sujeto es residencial. Se pone obra real, y el `alt` describe EXACTAMENTE lo que se ve
   * sin afirmar nada comercial — ni «hotel», ni «resort», ni «commercial». El titular del
   * articulo habla de obra comercial; la foto no dice que lo sea. Lo que se quita es una
   * afirmacion falsa sobre el trabajo del cliente; lo que queda es una ilustracion floja, y esta
   * dicho en la bitacora.
   *
   * SE ELIGE `project-061` -la piscina lap con cubierta de aluminio y lago- porque es lo mas
   * parecido que hay de verdad: una lamina larga de nado, no un patio trasero con spa. Sigue
   * siendo residencial y por eso el `alt` no lo disfraza.
   *
   * PENDIENTE PARA SEBASTIAN: pedirle al cliente fotografia de sus obras comerciales. Es el
   * unico arreglo de verdad, y hasta que llegue estas dos quedan por debajo del resto. */
  '/blogs/commercial-pool-construction-in-florida-what-decision-makers-must-know': {
    tarjeta: banco('project-061', '08', 'Aerial view of a long lap pool alongside a covered lanai, with stepping-stone pavers across the lawn.'),
    figuras: [
      banco('project-061', '01', 'Lap pool seen from above, with a dark-framed aluminium patio cover running along the rear of the building.'),
      banco('project-061', '14', 'Covered lanai with an aluminium patio cover, looking out over the lap pool toward the lake.'),
      banco('project-061', '04', 'Lap pool and lawn from above, bordered by a removable mesh safety fence.'),
    ],
  },
  '/blogs/residential-vs-commercial-pool-construction-in-florida': {
    /* El unico que alterna DOS propiedades por el contenido y no por variedad: el articulo
     * compara dos cosas, asi que se ensenan dos obras distintas -un patio trasero con spa y una
     * lamina de nado-, una en cada figura. */
    tarjeta: banco('project-062', '06', 'Aerial view of a rectangular backyard pool with a raised spa and a wide stone deck.'),
    figuras: [
      banco('project-061', '10', 'Long lap pool from above, set in a lawn beside a covered lanai and a lake.'),
      banco('project-062', '25', 'Backyard pool and raised spa seen from the deck, with the house and palms behind.'),
      banco('project-061', '13', 'Lap pool seen from under the aluminium patio cover, with loungers on the paved deck.'),
    ],
  },
};

/* ── derivar ─────────────────────────────────────────────────────────────── */

const slugDe = (ruta) => ruta.split('/').pop();

async function peldanos(im, ruta, anchos, esPortada = false, carpeta = null) {
  const slug = carpeta ?? slugDe(ruta);
  const dir = path.join(SALIDA, slug);
  if (!SOLO_CHECK) fs.mkdirSync(dir, { recursive: true });
  const src = await sharp(im.fuente).metadata();
  /* TECHO REAL: el mayor 16:9 que cabe DENTRO del master, sin ampliar en ninguno de los dos ejes.
   * Los masters del banco son 1600x900 -16:9 exacto, no topan-. Los de galeria son 1250 de ancho
   * y 682-933 de alto: recortar a 16:9 desde 1250x698 pediria 703 px de alto y `fit:cover` los
   * inventaria. Por eso el techo mira tambien el alto. Sale un peldaño de 1241 en vez de 1280;
   * es feo de leer y es la medida real. */
  const techo = Math.min(src.width, Math.floor((src.height * 16) / 9));
  const anchosReales = [...new Set(anchos.map((w) => Math.min(w, techo)))].sort((a, b) => a - b);

  /* ── EXPOSICION: SE LEVANTA LA SOMBRA DE LAS SUBEXPUESTAS ────────────────────────────────
   *
   * Varias fotos del banco estan medidas para el cielo y dejan el sujeto en sombra. Se corrigen,
   * y la decision es POR MEDIDA, no a ojo, sobre el RECORTE ya hecho -el encuadre cambia la
   * media, asi que medir el master daria otro numero-.
   *
   * LOS DOS FILTROS. `media < 105` sola no vale: `059-08` da 92 y NO esta subexpuesta -es una
   * piscina azul brillante rodeada de seto en sombra, y subirla la lava-. Por eso ademas
   * `saturacion < 30`, que es lo que distingue «todo apagado» de «sujeto vivo, fondo oscuro».
   *
   * LA RECETA: `linear(0.90, 26)` + 8 % de saturacion. Es una RECTA de pendiente <1, o sea que
   * levanta los negros y comprime un poco las altas luces: 255 -> 255. Medido contra la
   * alternativa obvia -`modulate({lightness})`, que es una subida global-:
   *
   *     062-23   sin tocar  media  79  quemado 0,01 %
   *              L+6        media  94  quemado 4,61 %   <- revienta el cielo
   *              a.90 b26   media  97  quemado 0,01 %   <- y el negro baja de 4,75 % a 0 %
   *
   * Se probo tambien `a.86 b34`: sube mas, pero deja un velo gris en la lanai. Visto en hoja
   * comparativa de las tres, no deducido.
   *
   * 🚨 NO SE TOCA EL TONO. `R13-COLOR` dejo fuera a proposito las fotos reales de obra
   * (`check-assets.mjs`: «retonar el trabajo del cliente es peor»). Esto es exposicion y
   * saturacion, no rotacion de tono: la foto sigue diciendo el color que tenia. */
  const AJUSTE = { a: 0.90, b: 26, sat: 1.08 };
  /**
   * 🚨 EL DESPLAZAMIENTO VA EN LA ESCALA DEL PIPELINE, NO EN 0-255. Los `.avif` de galeria entran
   * como `depth=ushort` / `space=rgb16`, asi que un `+26` se aplica sobre 0-65535 y DESAPARECE:
   * queda solo la pendiente 0,90, que OSCURECE. Medido en la cocina exterior:
   *
   *     sin tocar            media 104,0
   *     linear(0.90, 26)     media  93,7   <- mas oscura que antes, justo lo contrario
   *     linear(0.90, 26*257) media 119,6   <- lo que se buscaba
   *
   * 257 = 65535/255. Cazado midiendo el RESULTADO, no leyendo el codigo: la puerta de este
   * script solo cuenta ficheros, y 64 webp mas oscuros de lo que estaban habrian salido verdes.
   */
  const escala = src.depth === 'ushort' ? 257 : 1;
  const muestra = await sharp(im.fuente)
    .resize(400, ALTO(400), { fit: 'cover', position: 'centre' }).toBuffer();
  const [cr, cg, cb] = (await sharp(muestra).stats()).channels;
  const media = 0.2126 * cr.mean + 0.7152 * cg.mean + 0.0722 * cb.mean;
  const sat = (Math.abs(cr.mean - cg.mean) + Math.abs(cg.mean - cb.mean) + Math.abs(cr.mean - cb.mean)) / 3;
  const subexpuesta = media < 105 && sat < 30;
  if (subexpuesta && !esPortada) ajustadas.push(`${im.base}  media ${media.toFixed(0)} sat ${sat.toFixed(0)}`);

  const partes = [];
  for (const w of anchosReales) {
    const destino = path.join(dir, `${im.base}-${w}.webp`);
    if (!SOLO_CHECK) {
      if (esPortada) {
        /* R23 — grado fotografico completo. Sustituye al levantado de sombra: lo incluye y
         * ademas fija niveles, medios, contraste local y saturacion. Solo las portadas. */
        const g = await graduarPortada(im.fuente, w, ALTO(w), 86);
        fs.writeFileSync(destino, g.out);
        if (w === anchosReales[anchosReales.length - 1]) {
          graduadas.push(`${im.base}  media ${g.antes.media.toFixed(0)}->${g.despues.media.toFixed(0)}`
            + `  sat ${g.antes.sat.toFixed(0)}->${g.despues.sat.toFixed(0)}`
            + `  quemado ${g.antes.quemado.toFixed(2)}->${g.despues.quemado.toFixed(2)}%`
            + `  negro ${g.antes.negro.toFixed(2)}->${g.despues.negro.toFixed(2)}%`);
        }
      } else {
        let t = sharp(im.fuente).resize(w, ALTO(w), { fit: 'cover', position: 'centre' });
        if (subexpuesta) t = t.linear(AJUSTE.a, AJUSTE.b * escala).modulate({ saturation: AJUSTE.sat });
        await t.webp({ quality: 82 }).toFile(destino);
      }
    }
    if (!fs.existsSync(destino)) { mal(`falta ${path.relative(RAIZ, destino)}`); continue; }
    partes.push(`/images/blog/${slug}/${im.base}-${w}.webp ${w}w`);
  }
  const mayor = anchosReales[anchosReales.length - 1];
  return {
    src: `/images/blog/${slug}/${im.base}-${mayor}.webp`,
    srcset: partes.join(', '),
    alt: im.alt,
    ancho: mayor,
    alto: ALTO(mayor),
    _origen: im.origen,
    ...(im._asset ? { _asset: im._asset, _proyecto: im._proyecto } : { _fuente: im._fuente_publica }),
  };
}

const salida = {
  _lee_esto: [
    'DERIVADO por scripts/build-imagenes-blog.mjs. No editar a mano: el casting y su motivo',
    'viven en la cabecera de ese script, y cualquier cambio aqui se pierde al rederivar.',
    '',
    'Lo consume scripts/build-paginas.mjs, que (a) sustituye la foto de las tarjetas de blog y',
    '(b) inserta las 3 <figure> dentro de .w-richtext. Las 11 rutas de blog son DERIVADAS: un',
    'hand-edit sobre src/pages/blogs/*.astro se pierde en el siguiente `npm run paginas`.',
    '',
    'Faltan 2 de los 10 articulos a proposito -commercial-pool-construction y',
    'residential-vs-commercial-: piden imagen comercial, el banco tiene 0 comerciales aprobadas',
    'y las 10 de images/commercial-* llevan trainedAlgorithmicMedia. Conservan la suya.',
  ],
  rutas: {},
};

for (const [ruta, c] of Object.entries(CASTING)) {
  salida.rutas[ruta] = {
    ...(c.reemplaza_figuras ? { reemplaza_figuras: true } : {}),
    tarjeta: { ...(await peldanos(c.tarjeta, ruta, TARJETA, true)), sizes: SIZES_TARJETA },
    figuras: [],
  };
  for (const f of c.figuras) {
    salida.rutas[ruta].figuras.push({ ...(await peldanos(f, ruta, FIGURA)), sizes: SIZES_FIGURA });
  }
}


/* ── LOS ARTICULOS NUEVOS ────────────────────────────────────────────────────
 *
 * No hay tabla de casting para ellos: cada articulo declara SUS imagenes en su propio
 * frontmatter, junto al texto que ilustran. Es lo unico que escala a noventa — una tabla
 * central de 90 entradas se desincroniza del cuerpo el dia que alguien mueve una figura.
 *
 * El reparto sigue siendo auditable: `contenido/blog/<slug>.md` dice que `ref` usa y con que
 * `alt`, y `porRef()` se niega si esa foto no es obra del cliente.
 */
const ARTICULOS = leeArticulos(path.join(RAIZ, 'contenido/blog'));

/* Una foto reutilizada en cinco articulos deriva UNA escalera, no cinco. La clave incluye el
 * ancho y el tratamiento: una portada va graduada y una figura no, asi que aunque compartan
 * `ref` no comparten fichero (de ahi el sufijo `-p`). */
const yaDerivadas = new Map();
const peldanosCache = async (im, anchos, esPortada) => {
  const k = `${im.base}|${anchos.join(',')}|${esPortada}`;
  if (!yaDerivadas.has(k)) yaDerivadas.set(k, await peldanos(im, null, anchos, esPortada, BANCO_COMPARTIDO));
  return yaDerivadas.get(k);
};

for (const a of ARTICULOS) {
  const ruta = `/blogs/${a.frente.slug}`;
  if (salida.rutas[ruta]) { mal(`${ruta}: ya existe en el CASTING heredado`); continue; }
  try {
    const pRef = a.frente.portada.ref;
    const portada = esDiagrama(pRef)
      ? diagrama(pRef, a.frente.portada.alt, a.frente.portada.pie)
      : await peldanosCache(porRef(pRef, a.frente.portada.alt, true), TARJETA, true);
    const figuras = [];
    /* EN EL ORDEN DEL CUERPO, no en el del frontmatter: `publica-blog.mjs` resuelve cada
     * `{{figura: ref}}` por nombre, pero el indice de esta lista es lo que ve quien depura. */
    for (const ref of a.usadas) {
      const d = a.figuras.find((f) => f.ref === ref);
      figuras.push(esDiagrama(ref)
        ? diagrama(ref, d.alt, d.pie)
        : { ...(await peldanosCache(porRef(ref, d.alt), FIGURA, false)), sizes: SIZES_FIGURA, alt: d.alt });
    }
    salida.rutas[ruta] = { _articulo: true,
      tarjeta: esDiagrama(pRef) ? portada : { ...portada, alt: a.frente.portada.alt, sizes: SIZES_TARJETA },
      figuras };
  } catch (e) {
    mal(`${ruta}: ${e.message}`);
  }
}

/* ── invariantes: un numero sin comando es una opinion ─────────────────────
 *
 * DERIVADAS, no escritas. La version anterior codificaba `!== 10` y `!== 40`: con 90 articulos
 * mas, esos dos numeros habrian puesto la puerta en rojo para siempre o —peor— habrian tenido
 * que subirse a mano cada vez, que es exactamente como un numero deja de comprobar nada.
 *
 * Lo que se comprueba ahora es la FORMA, que si es invariante: los 10 heredados siguen siendo
 * 10 con 3 figuras y 40 alt distintos (su salida esta publicada y no puede moverse), y cada
 * articulo nuevo tiene portada, al menos una figura, y ningun alt repetido dentro de si mismo.
 */
const heredadas = Object.entries(salida.rutas).filter(([, r]) => !r._articulo);
const articulos = Object.entries(salida.rutas).filter(([, r]) => r._articulo);
const nRutas = Object.keys(salida.rutas).length;
const nImg = Object.values(salida.rutas).reduce((a, r) => a + 1 + r.figuras.length, 0);

if (heredadas.length !== 10) mal(`${heredadas.length} rutas heredadas, se esperaban 10`);
const altsHeredados = new Set(heredadas.flatMap(([, r]) => [r.tarjeta.alt, ...r.figuras.map((f) => f.alt)]));
if (altsHeredados.size !== 40) mal(`${altsHeredados.size} alt distintos en las heredadas, se esperaban 40`);
for (const [ruta, r] of heredadas) {
  if (r.figuras.length !== 3) mal(`${ruta}: ${r.figuras.length} figuras, las heredadas llevan 3`);
}
if (articulos.length !== ARTICULOS.length) {
  mal(`${articulos.length} articulos derivados de ${ARTICULOS.length} ficheros en contenido/blog/`);
}
for (const [ruta, r] of articulos) {
  if (!r.figuras.length) mal(`${ruta}: ningun articulo se publica sin al menos una figura`);
  const suyos = [r.tarjeta.alt, ...r.figuras.map((f) => f.alt)];
  if (new Set(suyos).size !== suyos.length) mal(`${ruta}: tiene un alt repetido dentro del mismo articulo`);
  if (suyos.some((x) => !x || !x.trim())) mal(`${ruta}: hay un alt vacio`);
}

if (!SOLO_CHECK && fallos === 0) fs.writeFileSync(DATO, `${JSON.stringify(salida, null, 1)}\n`);

const ficheros = fs.existsSync(SALIDA)
  ? execFileSync('bash', ['-c', `find ${SALIDA} -name '*.webp' | wc -l`]).toString().trim() : '0';
const peso = fs.existsSync(SALIDA)
  ? execFileSync('bash', ['-c', `du -sk ${SALIDA} | cut -f1`]).toString().trim() : '0';
console.log(`\n  R23 · portadas graduadas: ${graduadas.length} de ${nRutas}`);
for (const g of graduadas) console.log(`     ${g}`);
console.log(`\n  exposicion levantada en ${ajustadas.length} figuras de cuerpo (media <105 y sat <30):`);
for (const a of ajustadas) console.log(`     ${a}`);
console.log(`\n  ${nRutas} rutas · ${nImg} imagenes`);
console.log(`     ${heredadas.length} heredadas (casting de R22/R23) · ${articulos.length} articulos de contenido/blog/`);
console.log(`     ${yaDerivadas.size} escaleras distintas en public/images/blog/${BANCO_COMPARTIDO}/ para ${articulos.reduce((a, [, r]) => a + 1 + r.figuras.length, 0)} usos`);
console.log(`  ${ficheros} ficheros webp · ${(peso / 1024).toFixed(1)} MB en public/images/blog/`);
console.log(fallos === 0 ? '\n✅ VERDE\n' : `\n🔴 ROJO — ${fallos} fallo(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
