#!/usr/bin/env node
/**
 * `src/data/blogs-rutas.json` — LAS RUTAS DE BLOG QUE NO VIENEN DE WEBFLOW.
 *
 *     node scripts/build-blogs-rutas.mjs              escribe
 *     node scripts/build-blogs-rutas.mjs --check      no escribe: falla si el dato no cuadra
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE EXISTE ESTE FICHERO
 *
 * En este repo cada URL nueva cuesta CUATRO declaraciones enumeradas, y no hay comodines en
 * ninguna: el prefijo se quito a proposito porque fallaba ABIERTO (`check-enlaces.mjs:42-120`).
 *
 *   scripts/lib/rutas-propias.mjs   sin entrada -> `check:rutas` ROJA («N de mas»)
 *   disenio/contratos.json          sin contrato `rediseno` -> `check:visual` la SALTA EN SILENCIO
 *   build-seo-ficheros.mjs ADICIONES sin entrada -> no entra en el sitemap (es allowlist)
 *   check-medicion.mjs PAGINAS_ESPERADAS  sin subir -> ROJA por numero de paginas
 *
 * Con 90 articulos eso son 360 entradas escritas a mano. Escribirlas a mano no es «mas
 * auditable»: es la garantia de que la numero 47 se olvide y nadie lo vea.
 *
 * Asi que se DERIVAN de aqui, que es el patron que el repo ya usa para esto mismo:
 * `check-texto.mjs` deriva `APOYOS_CIUDAD` de `pool-builders-sanity.json`, y `check-seo.mjs`
 * deriva `BLOQUES_PROPIOS` de `captacion-servicios.json`. Una lista y un solo sitio donde mirar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOLO LAS QUE NO TIENEN ORIGEN
 *
 * Los 10 articulos heredados YA ESTAN en `_source/routes.csv` con su baseline de texto, de SEO
 * y sus capturas. Meterlos aqui los declararia como «propios» y `check:seo` dejaria de
 * compararlos contra el origen: perderia cobertura sobre las 10 rutas que mas la necesitan.
 * Por eso se cruza contra `routes.csv` y solo entran las que no estan.
 *
 * El MOTIVO de cada una no es adorno: es lo que hace auditable la excepcion, y se compone del
 * cluster y del servicio al que sirve el articulo, que es exactamente por que existe la URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { groq, SIN_BORRADORES } from './lib/sanity.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'src/data/blogs-rutas.json');
const SOLO_CHECK = process.argv.includes('--check');

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const DEL_ORIGEN = new Set(csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1)));

const posts = await groq(`*[_type == "blogPost" && ${SIN_BORRADORES}] | order(slug.current asc){
  "slug": slug.current, title, publishedAt,
  "categoria": categoria->{ "slug": slug.current, name },
  "servicio": relatedServices[0]->{ "slug": slug.current, name }
}`);

if (!posts.length) {
  console.error('\n  ROJO Sanity devolvio 0 blogPost. No se escribe nada.\n');
  process.exit(1);
}

const nuevas = posts.filter((p) => !DEL_ORIGEN.has(`/blogs/${p.slug}`));
const heredadas = posts.length - nuevas.length;

const incompletas = nuevas.filter((p) => !p.categoria?.name || !p.servicio?.name || !p.publishedAt);
if (incompletas.length) {
  console.error(`\n  ROJO ${incompletas.length} articulo(s) nuevos sin categoria, servicio o fecha:`);
  for (const p of incompletas) console.error(`       ${p.slug}`);
  console.error('  El motivo de la declaracion se compone de esos campos: sin ellos no es auditable.\n');
  process.exit(1);
}

const rutas = {};
for (const p of nuevas) {
  rutas[`/blogs/${p.slug}`] = {
    titulo: p.title,
    categoria: p.categoria.slug,
    servicio: p.servicio.slug,
    fecha: p.publishedAt.slice(0, 10),
    motivo: `BLOG-SANITY: articulo del cluster «${p.categoria.name}», escrito para la ficha de `
      + `${p.servicio.name}. No existe en el Webflow de origen: es contenido nuevo.`,
  };
}

const salida = {
  _lee_esto: [
    'DERIVADO de Sanity por scripts/build-blogs-rutas.mjs. No editar a mano.',
    '',
    'Son las rutas de /blogs/ que NO vienen de Webflow. De aqui derivan sus CUATRO',
    'declaraciones: rutas-propias.mjs, disenio/contratos.json, el sitemap y PAGINAS_ESPERADAS.',
    '',
    'Los 10 articulos heredados NO estan aqui a proposito: ya tienen baseline de texto, de SEO',
    'y capturas, y declararlos «propios» haria que check:seo dejara de compararlos con el origen.',
  ],
  rutas,
};

if (SOLO_CHECK) {
  const enDisco = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8') : '';
  const esperado = JSON.stringify(salida, null, 1) + '\n';
  if (enDisco !== esperado) {
    console.error('\n  ROJO src/data/blogs-rutas.json no coincide con Sanity.');
    console.error('       Corre `node scripts/build-blogs-rutas.mjs` y revisa el diff.\n');
    process.exit(1);
  }
  console.log(`\n  ok   blogs-rutas.json al dia: ${nuevas.length} ruta(s) propia(s) de blog\n`);
  process.exit(0);
}

fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 1) + '\n');
console.log(`\n  OK ${nuevas.length} ruta(s) propia(s) -> ${path.relative(RAIZ, DESTINO)}`);
console.log(`     ${heredadas} heredada(s) de Webflow, fuera de este fichero a proposito`);
if (nuevas.length) {
  const porCat = {};
  for (const p of nuevas) porCat[p.categoria.name] = (porCat[p.categoria.name] ?? 0) + 1;
  for (const [c, n] of Object.entries(porCat).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(3)} · ${c}`);
  }
}
console.log('');
