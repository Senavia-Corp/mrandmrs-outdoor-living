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
];

// Van al final y no intercaladas: el orden de las 113 es el del origen y no se toca.
const locs = [...delOrigen, ...ADICIONES.map(([u]) => u)];

const sitemap = PROD
  ? `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${locs.map((u) => `    <url>\n        <loc>${u}</loc>\n    </url>`).join('\n')}
</urlset>
`
  : `<?xml version="1.0" encoding="UTF-8"?>
<!-- vacio a proposito: PUBLIC_ES_PRODUCCION no vale "1", asi que esto NO es produccion -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>
`;

// El original es una sola linea con `Sitemap:` y sin salto final. Se replica.
const robots = PROD
  ? `Sitemap: ${SITIO}/sitemap.xml`
  : 'User-agent: *\nDisallow: /\n';

fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(PUB, 'robots.txt'), robots);

console.log(`\n  modo      : ${PROD ? 'PRODUCCION' : 'preview (bloqueado)'}`);
console.log(`  sitemap   : ${PROD ? locs.length : 0} URLs`
  + `${PROD ? ` (${delOrigen.length} del origen + ${ADICIONES.length} propia(s))` : ''}`);
console.log(`  robots.txt: ${robots.split('\n')[0]}`);
console.log('');
