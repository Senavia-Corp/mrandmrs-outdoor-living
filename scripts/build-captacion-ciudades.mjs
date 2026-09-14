#!/usr/bin/env node
/**
 * EXPANDE LAS FILAS DE `src/data/ciudades-captacion.json` A ENTRADAS COMPLETAS.
 *
 *     npm run captacion:ciudades            escribe
 *     npm run captacion:ciudades -- --check comprueba y sale 1 si algo no cuadra
 *
 * Escribe en DOS ficheros, las claves `/pool-builders/<slug>` y solo esas:
 *   · `src/data/captacion-servicios.json`  -> heroe, confianza, formulario, inversion, faq
 *   · `src/data/collage-faq-por-ruta.json` -> las 5 fotos del bento de la FAQ
 *
 * POR QUE UN GENERADOR Y NO COPY A MANO. Son 53 ciudades de UNA plantilla. Si encender la capa
 * cuesta un bloque de copy por ciudad, la ciudad 2 se escribe distinta de la 1 y la 53 ya no se
 * parece a ninguna. Aqui una ciudad cuesta UNA FILA: nombre, condado, region y que fotos le
 * tocan. Lo que se repite se escribe una vez, en las plantillas de abajo.
 *
 * POR QUE ESCRIBE ENTRADAS LITERALES Y NO EXPANDE AL PINTAR. `scripts/check-texto.mjs` lee
 * `captacion-servicios.json` con `readFileSync` y `src/pages/api/formulario.ts` con `import`:
 * los dos ven el fichero CRUDO. Una expansion en `src/lib/` seria invisible justo para los dos
 * consumidores que dan de alta el texto declarado y la lista blanca del correo del lead, y el
 * fallo se veria en produccion, en el correo que no llega.
 *
 * LO QUE NO SE ESCRIBE AQUI, Y POR QUE. Ni garantias, ni anos de experiencia, ni numero de
 * obras, ni «5-star», ni una sola cifra de precio o plazo (decision de Sebastian del 2-sep-2026,
 * TILA/Reg Z), ni urgencia, ni barrios u obras «en <ciudad>» sin fuente. Cada frase de las
 * plantillas de abajo lleva su fuente al lado; si una fuente desaparece, la frase se cae con
 * ella. Es la misma regla de `_lee_esto` de `captacion-servicios.json`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P_FILAS = path.join(RAIZ, 'src/data/ciudades-captacion.json');
const P_CAPTA = path.join(RAIZ, 'src/data/captacion-servicios.json');
const P_COLLAGE = path.join(RAIZ, 'src/data/collage-faq-por-ruta.json');
const P_NEGOCIO = path.join(RAIZ, 'src/lib/negocio.mjs');

const SOLO_COMPROBAR = process.argv.includes('--check');
const leer = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/**
 * LOS 9 CONDADOS SE LEEN DE `negocio.mjs`, NO SE COPIAN. Esa constante alimenta el `areaServed`
 * del `LocalBusiness` de las 122 paginas: si alguien anade o quita un condado alli y aqui
 * hubiera una copia, el copy de las ciudades afirmaria una cobertura que el dato estructurado
 * ya no dice. Se extrae del fuente porque `CONDADOS` no se exporta.
 */
function condadosVerificados() {
  const src = fs.readFileSync(P_NEGOCIO, 'utf8');
  const m = src.match(/const CONDADOS\s*=\s*\[([^\]]*)\]/);
  if (!m) {
    throw new Error('[captacion-ciudades] no encuentro `const CONDADOS` en src/lib/negocio.mjs. '
      + 'Es la fuente unica de los 9 condados: sin ella no se escribe un solo condado en el copy.');
  }
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

/* ── LAS PLANTILLAS DE COPY, CON SU FUENTE ───────────────────────────────────────────────────
 *
 * Ingles de EE. UU. Lo que no esta verificado no se publica. Las fuentes son, por frase:
 *
 *   «New custom inground pools»              el `<h1>` y el `<h2>` vigentes de la propia ruta
 *                                            (`seo-pool-builders.json`, bloques de A3)
 *   «3D design»                              `heading3DRendering` de la propia pagina («3D Pool
 *                                            Design & Visualization») + R17-CORE §8.6 VERIFICADO
 *   «permits» / «county inspections»         R17-CORE §8.6 VERIFICADO; el condado sale de
 *                                            `negocio.mjs`, que es quien lo publica en el schema
 *   «final start-up»                         R17-CORE §8.6
 *   «from one licensed team» / design-build   R17-CORE §8.6 (tarjeta del antes/despues)
 *   «CPC1461119 · CPC1460562»                `src/lib/negocio.mjs`, en el pie de las 122
 *   «We call you back within 24 hours»       confirmado por Sebastian el 11-sep-2026 (R17-CORE)
 *   «3D design on paper» / «fixed price»     `src/pages/financing.astro`, pasos del proceso
 *   «Free Estimate»                          terminologia aprobada, hoja 18 VERIFICADO
 *   lista de «what is included»              paso 4 del proceso y FAQ 4, ya en el sitio
 */
const LICENCIAS = 'Florida certified pool contractor · CPC1461119 · CPC1460562';

function entradaCaptacion(c) {
  /* El condado solo entra en el copy si esta verificado. Sin el, la frase se escribe sin el
   * condado: una ciudad sin condado publicado es correcta; una con el condado equivocado, no. */
  const conCondado = !!c.condado;
  const cond = conCondado ? `${c.condado} County` : 'county';
  return {
    heroe: {
      /* Sustituye al apoyo de Sanity, que vendia «new pool construction, pool remodeling, and
       * luxury pool design» en la landing de un ad group de CONSTRUCCION NUEVA: la remodelacion
       * tiene su propia landing y compite con la intencion del anuncio arriba del pliegue. No se
       * repiten ni la ciudad ni «pool builders», que ya estan en el h1 y en el h2. */
      apoyo: `New custom inground pools for ${c.ciudad} homeowners — 3D design, permits, `
        + 'construction and final start-up, from one licensed team.',
      licencias: LICENCIAS,
      ancla: '#estimate',
      /* El de SU region primero. En North Florida coincide con el orden de `telefonos.json`;
       * en una ciudad de Broward o Palm Beach (fase 2) no, y ahi esta la razon de la clave. */
      zonas: c.region === 'South Florida'
        ? ['South Florida', 'North Florida']
        : ['North Florida', 'South Florida'],
    },
    confianza: {
      rotulo: 'Why homeowners pick us',
      tarjetas: [
        { icono: 'manos', titulo: 'One design-build team',
          texto: 'Design, engineering, permits and construction under one roof.' },
        { icono: 'escudo', titulo: 'Florida licensed pool contractor',
          texto: 'CPC1461119 and CPC1460562, published on every page of this site.' },
        { icono: 'plano', titulo: '3D design before you commit',
          texto: 'You review a 3D design of your pool before anything is dug.' },
        { icono: 'contrato', titulo: 'Permits and code handled',
          texto: `We pull the permits and coordinate the ${cond} inspections.` },
      ],
    },
    formulario: {
      titulo: 'Get a Free Estimate',
      entradilla: 'Tell us about your project and we will come back with next steps. '
        + 'No cost, no obligation.',
      proyectoPorDefecto: 'New Custom Pool',
      /* CADA CIUDAD, SU PROPIO CUBO DE LEADS. R19 ya pago el error contrario: con un `data-name`
       * compartido, catorce servicios llegaban al correo con el mismo asunto e indistinguibles en
       * GA4. `ga4` es ademas la `action` de Turnstile, que solo admite [a-zA-Z0-9_-]. */
      nombre: `${c.ciudad} Pool Builders Form`,
      aviso: `${c.ciudad} pool builders lead`,
      ga4: c.slug.replace(/-florida$/, ''),
      pasosTitulo: 'What happens after you reach out',
      pasos: [
        'We call you back within 24 hours.',
        'We walk your property and put a 3D design on paper.',
        'You get the scope in writing and a fixed project price before you commit.',
      ],
    },
    inversion: {
      titulo: 'What will my pool cost?',
      /* NI UNA CIFRA. No es prudencia: es la decision TILA/Reg Z del 2-sep-2026, y la regla 11
       * de `check:ads` la vigila. Las dos salidas son reales y ya existen. */
      texto: 'Every pool is priced from its own design, size, finishes and site conditions. '
        + 'Answer a few questions to see the range for a custom pool in Florida, then review '
        + 'how it can be paid for.',
      ctas: [
        { texto: 'Try the pool cost estimator', href: '/pool-cost-estimator', principal: true },
        { texto: 'Financing available', href: '/financing', principal: false },
      ],
    },
    faq: {
      titulo: `${c.ciudad} pool construction FAQs`,
      entradilla: conCondado
        ? `Cost, permits and scope: the three things worth settling before you start a custom `
          + `pool in ${cond}.`
        : 'Cost, permits and scope: the three things worth settling before you start a custom pool.',
      anade: [
        { pregunta: `How much does a custom pool cost in ${c.ciudad}?`,
          respuesta: 'There is no single number: a custom pool is priced from its own design, '
            + 'size, finishes and site conditions. Our estimator walks you through the choices '
            + 'that move the price, and you get a fixed project price in writing before you commit.' },
        { pregunta: conCondado
            ? `Who pulls the permits for a pool in ${cond}?`
            : 'Who pulls the permits for a pool in Florida?',
          respuesta: 'We do. Permitting and code compliance are part of the build: we prepare '
            + `the submittal, pull the permits and coordinate the ${cond} inspections through to `
            + 'final start-up.' },
        { pregunta: 'What is included in a custom pool project?',
          respuesta: 'Design and 3D rendering, engineering, permitting, excavation, the gunite '
            + 'shell, plumbing and circulation, electrical and equipment, interior finish, tile '
            + 'and coping, the deck, and final start-up.' },
      ],
    },
  };
}

function entradaCollage(c, fotos) {
  const elegidas = c.collage.map((k) => {
    const f = fotos.construccion[k];
    if (!f) {
      throw new Error(`[captacion-ciudades] ${c.slug}: la foto "${k}" no esta en `
        + 'ciudades-captacion.json > fotos.construccion.');
    }
    /* 🚨 SIN `srcset` NO PASA. La celda mas grande del bento mide 395 px y la mas pequena 81 px
     * en movil: sin `srcset` el navegador se baja el original de 1250w -y hasta 1 MB- para
     * pintarla. Es invisible en la pagina y carisimo en un movil que llega desde un anuncio.
     * Paso una vez: `/gallery` no emite `srcset` para dos de las diez, y esas dos entraron en el
     * collage con `undefined`. El `sizes` que calcula `CollageFaq` queda inerte y nadie avisa. */
    for (const k2 of ['src', 'srcset', 'alt', 'ancho', 'alto', 'pos']) {
      if (!f[k2]) {
        throw new Error(`[captacion-ciudades] ${c.slug}: la foto "${k}" no trae "${k2}". `
          + 'Sin `srcset` el navegador se baja el original de 1250w para una celda de 81-395 px.');
      }
    }
    return { src: f.src, srcset: f.srcset, alt: f.alt, ancho: f.ancho, alto: f.alto, pos: f.pos };
  });
  if (new Set(elegidas.map((f) => f.src)).size !== 5) {
    throw new Error(`[captacion-ciudades] ${c.slug}: el bento pide 5 fotos DISTINTAS y hay `
      + 'repetidas. Una foto dos veces en la misma seccion es un descuido que se ve.');
  }
  return { fotos: elegidas };
}

// ── EJECUCION ────────────────────────────────────────────────────────────────────────────────
const filas = leer(P_FILAS);
const CONDADOS = condadosVerificados();
const captacion = leer(P_CAPTA);
const collage = leer(P_COLLAGE);

/* SE RETIRAN LAS DERIVADAS ANTES DE VOLVER A ESCRIBIRLAS, Y ESA ES LA MITAD QUE FALTABA.
 * Escribir sin borrar hace que el generador solo sepa ANADIR: quitar una ciudad de
 * `ciudades-captacion.json` dejaria su entrada viva en los dos JSON y la pagina seguiria
 * publicando el formulario, el collage y la FAQ de una ciudad que ya nadie declara — y
 * `--check` saldria VERDE, porque lo que compara es que las filas que hay coincidan.
 * Se borran solo las que llevan la marca `_derivado`: una entrada escrita a mano (las 14 de
 * `/services/`) no se toca ni por error. */
const esDerivada = (v) => typeof v?._derivado === 'string';
const nuevoCaptacion = Object.fromEntries(
  Object.entries(captacion).filter(([k, v]) => !(k.startsWith('/pool-builders/') && esDerivada(v))));
const RUTAS_FILA = new Set(filas.ciudades.map((c) => `/pool-builders/${c.slug}`));
const nuevoCollage = Object.fromEntries(
  Object.entries(collage).filter(([k]) => !k.startsWith('/pool-builders/') || RUTAS_FILA.has(k)));
const avisos = [];
let n = 0;

/* EL SLUG SE VALIDA CONTRA LAS RUTAS QUE EXISTEN DE VERDAD. Una errata —`ocla-florida`— no
 * rompe nada visible: escribe una entrada para una ruta que no existe, nadie la pinta, y la
 * ciudad que se queria encender se queda apagada con el generador en verde. Las 53 claves de
 * `seo-pool-builders.json` son la lista de rutas reales de esta familia. */
const RUTAS_REALES = new Set(Object.keys(leer(path.join(RAIZ, 'src/data/seo-pool-builders.json'))));

for (const c of filas.ciudades) {
  const ruta = `/pool-builders/${c.slug}`;
  if (!RUTAS_REALES.has(c.slug)) {
    throw new Error(`[captacion-ciudades] "${c.slug}" no es una de las 53 ciudades de `
      + 'src/data/seo-pool-builders.json. Una errata aqui apaga la ciudad en silencio.');
  }
  if (c.condado && !CONDADOS.includes(c.condado)) {
    throw new Error(`[captacion-ciudades] ${c.slug}: condado "${c.condado}" NO esta en los 9 de `
      + `src/lib/negocio.mjs (${CONDADOS.join(', ')}). No se inventa un condado: se deja la fila `
      + 'sin `condado` y se marca para Sebastian.');
  }
  if (!c.condado) avisos.push(`${c.slug}: sin condado verificado — el copy sale sin condado`);
  const inv = filas.fotos.inversion[c.inversion];
  if (!inv) {
    throw new Error(`[captacion-ciudades] ${c.slug}: la foto de inversion "${c.inversion}" no `
      + 'esta en ciudades-captacion.json > fotos.inversion.');
  }
  if (inv.region !== c.region) {
    throw new Error(`[captacion-ciudades] ${c.slug}: es de ${c.region} y la foto de inversion `
      + `"${c.inversion}" es de ${inv.region}. Una obra de otra region en una landing local es `
      + 'justo la afirmacion que no se puede sostener.');
  }
  const e = entradaCaptacion(c);
  e.inversion.foto = inv.src;
  e.inversion.alt = inv.alt;
  e.inversion.ancho = inv.ancho;
  e.inversion.alto = inv.alto;
  e._derivado = 'src/data/ciudades-captacion.json — no editar a mano: npm run captacion:ciudades';

  nuevoCaptacion[ruta] = e;
  nuevoCollage[ruta] = entradaCollage(c, filas.fotos);
  n++;
}

const comoEstaba = { capta: JSON.stringify(captacion), coll: JSON.stringify(collage) };
const comoQueda = { capta: JSON.stringify(nuevoCaptacion), coll: JSON.stringify(nuevoCollage) };
const cambia = comoEstaba.capta !== comoQueda.capta || comoEstaba.coll !== comoQueda.coll;

if (SOLO_COMPROBAR) {
  if (cambia) {
    console.error('🔴 PUERTA ROJA — las entradas de /pool-builders/ no coinciden con lo que sale '
      + 'de src/data/ciudades-captacion.json. Alguien las edito a mano, o cambio una plantilla '
      + 'sin regenerar. Se arregla con: npm run captacion:ciudades');
    process.exit(1);
  }
  console.log(`  ok   ${n} ciudad(es) de /pool-builders/ coinciden con su fila`);
  for (const a of avisos) console.log(`  aviso  ${a}`);
  console.log('\nPUERTA VERDE');
  process.exit(0);
}

fs.writeFileSync(P_CAPTA, `${JSON.stringify(nuevoCaptacion, null, 2)}\n`);
fs.writeFileSync(P_COLLAGE, `${JSON.stringify(nuevoCollage, null, 2)}\n`);
console.log(`  escritas ${n} ciudad(es) en captacion-servicios.json y collage-faq-por-ruta.json`);
for (const a of avisos) console.log(`  aviso  ${a}`);
