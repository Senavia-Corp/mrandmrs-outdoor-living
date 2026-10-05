#!/usr/bin/env node
/**
 * FASE 9 — `robots.txt` y `sitemap.xml`, con el interruptor de indexación.
 *
 *     npm run seo:ficheros
 *
 * EL INTERRUPTOR FALLA CERRADO
 * Solo se indexa con `PUBLIC_ES_PRODUCCION` exactamente igual a `"1"`. Cualquier otro valor
 * —vacío, `true`, `0`, sin definir— deja el sitio bloqueado. Mientras esto viva en una URL de
 * preview no puede indexarse, y el modo por defecto tiene que ser el seguro.
 *
 * Y GOBIERNA LAS TRES COSAS A LA VEZ: `robots.txt`, el `sitemap.xml` y el `noindex` +
 * canónica de cada página (eso lo hace `Base.astro`). Si una sola se queda fuera del
 * interruptor, el sitio de preview acaba en Google.
 *
 * EL SITEMAP LLEVA LAS 113 DEL ORIGEN, NO LAS 115
 * `/pool-investment-estimator` y `/where-we-serve/north-florida` están
 * vivas y responden 200, pero el sitemap del origen no las lista. Se replica: meterlas sería
 * cambiar lo que el sitio le dice a Google.
 *
 * MÁS LAS ADICIONES DELIBERADAS — hoy 6, así que son 119. La regla de arriba dice «no
 * inventes URLs del origen», y sigue vigente: lo que NO cubre es una página que el origen
 * nunca tuvo. `/financing` la escribimos nosotros el 2-sep-2026 y existe para captar
 * búsquedas de financiación; dejarla fuera del sitemap sería quitarle la mitad de su razón
 * de ser. Va declarada abajo, con su motivo, y no mezclada con las 113: el día que alguien
 * compare este fichero con `baseline/sitemap.xml` tiene que poder ver de un vistazo qué es
 * del origen y qué hemos añadido nosotros.
 *
 * NO se usa `X-Robots-Tag` en vercel.json: es estático, no lee la variable, y o lo hereda
 * producción o hay que acordarse de quitarlo justo en el despliegue que más caro sale olvidar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { esFicha, esCiudad, esCondado } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUB = path.join(RAIZ, 'public');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';
/**
 * MISMA EXPRESION, PALABRA POR PALABRA, QUE `astro.config.mjs`. Estaba A FUEGO y con el apex,
 * mientras las canonicas salian de `astro.config.mjs`: dos ficheros que tenian que decir lo
 * mismo y solo uno leia la variable. `check:seo` compara ahora el host del sitemap con el de
 * las canonicas, asi que separarlos pone la puerta roja en vez de irse en silencio a Google.
 */
const SITIO = process.env.PUBLIC_SITE_URL || 'https://www.mrandmrsoutdoorliving.com';

// Las 113 del sitemap del origen, tal cual, para no inventarse el orden ni el conjunto.
const original = fs.readFileSync(path.join(RAIZ, 'baseline/sitemap.xml'), 'utf8');
/**
 * SE REESCRIBE EL HOST, Y NADA MAS. El baseline guarda las 113 con el APEX, que es lo que
 * publicaba Webflow. Al unificar las canonicas a `www` el sitemap se quedaba con 113 en apex
 * y 6 en www: dos hosts en el mismo fichero, que es peor que cualquiera de los dos solo.
 *
 * La regla de arriba —«tal cual, para no inventarse el orden ni el conjunto»— sigue intacta:
 * el conjunto y el orden son los del origen; lo unico que cambia es el nombre del servidor,
 * que es un dato de despliegue y no del contenido. Lo caza `check:seo`, que compara el host
 * del sitemap con el de las canonicas.
 */
const delOrigen = [...original.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/^https?:\/\/[^/]+/, SITIO));

/**
 * ADICIONES DELIBERADAS: rutas de autoría propia, que por definición no están en el sitemap
 * del origen. La lista de verdad vive en `scripts/lib/rutas-propias.mjs`; aquí solo se decide
 * cuáles se indexan, que es otra decisión y puede no coincidir.
 */
const ADICIONES = [
  [`${SITIO}/financing`, 'La página propia de financiación. Existe para que las búsquedas de '
    + '«pool financing florida» aterricen en el sitio en vez de en Acorn.'],

  // Las 5 obras propias del 3-sep-2026. Las 10 fichas de `/project/` del origen SÍ están en
  // `baseline/sitemap.xml`, así que dejar estas fuera sería publicar cinco proyectos y
  // esconderlos justo de quien los busca. La lista de verdad de rutas propias vive en
  // `scripts/lib/rutas-propias.mjs`; aquí solo se decide cuáles se indexan.
  [`${SITIO}/project/luxury-pool-raised-spa-travertine-deck-south-florida`,
    'Obra propia: piscina con spa elevado y terraza de travertino, sur de Florida.'],
  [`${SITIO}/project/estate-pool-spa-sun-shelf-north-florida`,
    'Obra propia: piscina geométrica con banco solar sobre finca, norte de Florida.'],
  [`${SITIO}/project/pool-raised-spa-marble-deck-south-florida`,
    'Obra propia: piscina con spa elevado y terraza de mármol, sur de Florida.'],
  [`${SITIO}/project/luxury-pool-spa-aluminum-pergola-south-florida`,
    'Obra propia: piscina y spa con pérgola de aluminio de lamas, sur de Florida.'],
  [`${SITIO}/project/aluminum-patio-cover-pool-deck-south-florida`,
    'Obra propia: cubierta de aluminio y terraza de mármol, sur de Florida.'],

  /**
   * ── AUDITORIA 5-sep-2026: dos rutas del ORIGEN que el sitemap del origen tampoco listaba.
   *
   * Hasta hoy se replicaba esa ausencia por paridad. Sebastian levanto esa proteccion: el
   * sitio es producto propio, no espejo, y estas dos responden 200, son indexables y no
   * llevan noindex. Dejarlas fuera del sitemap no las esconde de Google —las encuentra por
   * enlaces igual— solo les quita prioridad de rastreo sin ganar nada a cambio.
   */
  [`${SITIO}/where-we-serve/north-florida`,
    'M20: zona de servicio entera. Responde 200, esta en el menu y es indexable, pero el '
    + 'sitemap del origen no la listaba mientras SI listaba su gemela south-florida. La '
    + 'asimetria no tenia motivo: media zona de negocio quedaba sin declarar.'],
  [`${SITIO}/pool-investment-estimator`,
    'M7: en el origen era el iframe que embebia /pool-cost-estimator, no una pagina. '
    + 'Migrada, el iframe ya no existe y quedo indexable, sin descripcion y sin que la '
    + 'enlazara nadie (0 entrantes de las 122). Sebastian decidio darle cabecera completa '
    + 'y hacerla descubrible en vez de mandarla a noindex.'],
];

/**
 * Y LAS DE BLOG, DERIVADAS de `src/data/blogs-rutas.json`.
 *
 * El sitemap es una ALLOWLIST: lo que no se anade, no sale. Con 90 articulos, enumerarlos aqui
 * a mano garantiza que el numero 47 se quede fuera de Google sin que nadie lo note — no hay
 * puerta que avise de una URL que falta en un sitemap, porque falta en silencio.
 *
 * Se derivan del MISMO fichero del que sale su entrada en `rutas-propias.mjs`, asi que una
 * ruta no puede existir sin estar en el sitemap ni al reves.
 */
const ADICIONES_BLOG = (() => {
  const f = path.join(RAIZ, 'src/data/blogs-rutas.json');
  if (!fs.existsSync(f)) return [];
  const { rutas } = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Object.entries(rutas).map(([r, d]) => [`${SITIO}${r}`, d.motivo]);
})();


// Van al final y no intercaladas: el orden de las 113 es el del origen y no se toca.
/** Y LAS DE LA GALERIA POR SERVICIO, derivadas de `src/data/galeria-categorias.json` por lo mismo. */
const ADICIONES_GALERIA = (() => {
  const f = path.join(RAIZ, 'src/data/galeria-categorias.json');
  if (!fs.existsSync(f)) return [];
  return JSON.parse(fs.readFileSync(f, 'utf8')).categorias.map((c) => `${SITIO}/gallery/${c.slug}`);
})();

/** Y LAS LANDINGS DE CIUDAD DE LOS DEMAS SERVICIOS (LOOP-CIUDADES), derivadas de
 *  `src/data/ciudades-servicios.json`, el mismo fichero del que salen sus rutas propias. */
const PAGINAS_CIUDAD_SERVICIO = (() => {
  const f = path.join(RAIZ, 'src/data/ciudades-servicios.json');
  if (!fs.existsSync(f)) return {};
  return JSON.parse(fs.readFileSync(f, 'utf8')).paginas;
})();
const ADICIONES_CIUDAD_SERVICIO = Object.keys(PAGINAS_CIUDAD_SERVICIO).map((r) => `${SITIO}${r}`);

const locs = [...delOrigen, ...ADICIONES.map(([u]) => u), ...ADICIONES_BLOG.map(([u]) => u), ...ADICIONES_GALERIA,
  ...ADICIONES_CIUDAD_SERVICIO];

/**
 * SITEMAP DE IMAGENES, SOLO DONDE TODA LA FOTO DE DATOS ES OBRA REAL (R24-FOTO-PISCINAS, 1-oct-2026).
 *
 * `<image:image>` le dice a Google que fotos son de cada pagina. Se declara por ruta y a mano,
 * no para las 14 fichas: en las otras doce siguen fotos generadas (`residentials/`, `procesos/`)
 * y meterlas aqui seria anunciar como obra lo que no lo es. Las imagenes salen de los MISMOS
 * datos que las pintan —heroe, filas, pasos, inversion y antes/despues—, asi que una
 * foto canjeada en el JSON se canjea aqui sola. La intro (que se queda como esta, decision de
 * Sebastian) y la galeria (viene del origen, no de datos) no entran.
 */
const IMAGENES_EN = [
  '/services/pool-builders',
  '/services/pool-remodeling',
];
const imagenes = (() => {
  const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data', f), 'utf8'));
  const cap = leer('captacion-servicios.json');
  return new Map(IMAGENES_EN.map((r) => {
    const c = cap[r];
    const fotos = [
      c.heroe.foto, ...c.servicios.detalle.map((d) => d.foto), ...(c.proceso?.fotos ?? []).map((f) => f.foto),
      c.inversion?.foto, c.antesDespues?.antes.src, c.antesDespues?.despues.src,
    ].filter(Boolean);
    return [`${SITIO}${r}`, [...new Set(fotos)].map((f) => `${SITIO}${f}`)];
  }));
})();
for (const u of imagenes.keys()) {
  if (!locs.includes(u)) throw new Error(`sitemap de imagenes: ${u} no esta en el sitemap`);
}
const conImagenes = (u) => (imagenes.get(u) ?? [])
  .map((i) => `\n        <image:image>\n            <image:loc>${i}</image:loc>\n        </image:image>`).join('');

const sitemap = PROD
  ? `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${locs.map((u) => `    <url>\n        <loc>${u}</loc>${conImagenes(u)}\n    </url>`).join('\n')}
</urlset>
`
  : `<?xml version="1.0" encoding="UTF-8"?>
<!-- vacio a proposito: PUBLIC_ES_PRODUCCION no vale "1", asi que esto NO es produccion -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>
`;

// El original es una sola linea con `Sitemap:` y sin salto final. Se replica.
/**
 * M14 (auditoria 5-sep-2026) — EL robots.txt DE PRODUCCION NO TENIA NINGUN User-agent.
 *
 * Se replicaba el del origen, que es una sola linea con Sitemap:. Segun la RFC 9309 eso es
 * valido —Sitemap es un campo fuera de grupo, y un fichero sin reglas significa «todo
 * permitido»— asi que no rompia nada. Pero es un fichero que leen validadores, auditorias
 * de cliente y rastreadores de terceros, y varios se quejan de un robots.txt sin grupo.
 * Declararlo dice lo mismo, explicitamente y sin coste.
 *
 * El de preview NO se toca: sigue siendo Disallow: /, y esa es la red de seguridad del
 * repo — lo COMMITEADO en public/robots.txt es la version bloqueada, asi que un build de
 * preview no puede publicar un sitio abierto por descuido.
 */
const robots = PROD
  ? `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n';

/**
 * ── SEO-SAFE (1-oct-2026) · `llms.txt` ───────────────────────────────────────────────────────
 *
 * Un indice en Markdown para los agentes y motores generativos que lo piden (la convencion
 * llmstxt.org): que es el negocio, que paginas importan y que guias hay, con la URL de cada
 * una. No sustituye a nada —el sitemap sigue siendo el sitemap— y no cuesta rastreo.
 *
 * SE DERIVA, NO SE ESCRIBE A MANO: los titulos y descripciones salen de `baseline/seo.json`
 * (los del origen) pisados por `src/data/meta-propia.json` (los propios), exactamente como
 * los emite `Base.astro`; las guias salen de `src/data/blogs-sanity.json`. Lo UNICO escrito
 * aqui es la frase de presentacion, y cada dato de esa frase tiene fuente: las licencias son
 * las del pie (`src/lib/negocio.mjs`), los servicios son las 14 fichas de `/services/`, y la
 * cobertura es `areaServed` del mismo `negocio.mjs`. Ni cifras, ni anos, ni «#1».
 *
 * Mismo interruptor que el sitemap: fuera de produccion se escribe vacio, para que una
 * preview no se presente como el sitio.
 */
const llms = PROD ? (() => {
  const lee = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const base = lee('baseline/seo.json');
  const propia = lee('src/data/meta-propia.json');
  /* Una ruta propia sin entrada en `meta-propia.json` (hoy solo /financing) lleva su titulo
   * en su propio `.astro`; se lee de ahi en vez de inventarlo o de dejar la URL como titulo. */
  const tituloAstro = (r) => {
    const f = path.join(RAIZ, 'src/pages', `${r.replace(/^\//, '')}.astro`);
    const m = fs.existsSync(f) && fs.readFileSync(f, 'utf8').match(/\btitulo=(?:"([^"]+)"|\{"([^"]+)"\})/);
    return m ? (m[1] ?? m[2]) : r;
  };
  const titulo = (r) => propia[r]?.title ?? base[r]?.title ?? tituloAstro(r);
  const desc = (r) => propia[r]?.description ?? base[r]?.meta?.description ?? '';
  const linea = (r, t = titulo(r), d = desc(r)) => `- [${t}](${SITIO}${r})${d ? `: ${d}` : ''}`;
  const servicios = Object.keys(base).filter(esFicha).sort();
  const condados = Object.keys(base).filter(esCondado).sort();
  const posts = fs.existsSync(path.join(RAIZ, 'src/data/blogs-sanity.json'))
    ? lee('src/data/blogs-sanity.json') : [];
  const guias = [...posts].sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => linea(`/blogs/${p.slug}`, p.title, p.seo?.description ?? ''));
  return [
    '# Mr & Mrs Outdoor Living',
    '',
    '> Florida-licensed design-build contractor (pool contractor licenses CPC1461119 and '
      + 'CPC1460562) building custom inground pools and spas, complete pool remodels, aluminum '
      + 'pergolas, louvered roofs, screen enclosures, outdoor kitchens, decks and landscaping for '
      + 'homeowners across North and South Florida.',
    '',
    `Site: ${SITIO} · Sitemap: ${SITIO}/sitemap.xml`,
    '',
    '## Key pages',
    linea('/'),
    linea('/services/pool-builders'),
    linea('/services/pool-remodeling'),
    linea('/pool-cost-estimator'),
    linea('/financing'),
    linea('/projects'),
    linea('/contact-us'),
    '',
    '## Services',
    ...servicios.map((r) => linea(r)),
    '',
    '## Where we serve',
    linea('/where-we-serve'),
    linea('/where-we-serve/north-florida'),
    linea('/where-we-serve/south-florida'),
    ...condados.map((r) => linea(r)),
    `- City pages (${Object.keys(base).filter(esCiudad).length}) are linked from ${SITIO}/where-we-serve`,
    '',
    ...(Object.keys(PAGINAS_CIUDAD_SERVICIO).length ? [
      `## Services by city (${Object.keys(PAGINAS_CIUDAD_SERVICIO).length})`,
      ...Object.entries(PAGINAS_CIUDAD_SERVICIO).sort(([a], [b]) => a.localeCompare(b))
        .map(([r, p]) => linea(r, p.doc.seo.title, p.doc.seo.description)),
      '',
    ] : []),
    `## Guides and articles (${guias.length})`,
    linea('/blogs-tips'),
    ...guias,
    '',
  ].join('\n');
})() : '# vacio a proposito: PUBLIC_ES_PRODUCCION no vale "1", asi que esto NO es produccion\n';

fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(PUB, 'robots.txt'), robots);
fs.writeFileSync(path.join(PUB, 'llms.txt'), llms);

console.log(`\n  modo      : ${PROD ? 'PRODUCCION' : 'preview (bloqueado)'}`);
console.log(`  sitemap   : ${PROD ? locs.length : 0} URLs`
  + `${PROD ? ` (${delOrigen.length} del origen + ${ADICIONES.length} propia(s))` : ''}`);
console.log(`  imagenes  : ${PROD ? [...imagenes.values()].flat().length : 0} en ${imagenes.size} ruta(s)`);
console.log(`  robots.txt: ${robots.split('\n')[0]}`);
console.log(`  llms.txt  : ${PROD ? `${llms.split('\n').length} lineas` : 'vacio (preview)'}`);
console.log('');
