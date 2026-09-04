#!/usr/bin/env node
/**
 * PUERTA — enlaces y acoplamiento git ↔ despliegue. Estática, sobre lo desplegado.
 *
 *     npm run check:enlaces
 *
 *   1. Ningún enlace interno roto, y ninguno a `.html`.
 *   2. Ningún `src`/`href`/`url()` local que apunte a un fichero que no existe.
 *   3. **Todo lo que `dist/` pide por ruta local está en `git ls-files`.**
 *
 * EL 3 ES LA PUERTA QUE FALTÓ EN PERGOLA PLUS, Y COSTÓ PRODUCCIÓN ROTA.
 * `public/cms-img/` y `public/videos/` estaban en `.gitignore` y el proyecto despliega por
 * `git push`: Vercel construía desde un clon donde esos 507 ficheros no existían. **429 URLs
 * rotas en producción con todas las puertas en verde en local.** La puerta de entonces miraba
 * si el fichero existía **en disco** — y el disco es esta máquina, justo donde el instalador
 * lo acaba de dejar todo, así que nunca pudo ver el fallo.
 *
 * Aquí se compara contra `git ls-files`, que es lo único que Vercel llega a ver.
 *
 * Y sí escanea los `url()` del CSS: el encargo avisa de que ninguna puerta lo hacía y ahí
 * puede quedar un 404 invisible — un fondo que no se pinta no da error en ninguna consola.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static\n'); process.exit(1); }

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 8) => xs.slice(0, n).forEach((x) => console.log(`       ${x}`))
  || (xs.length > n && console.log(`       ... y ${xs.length - n} mas`));

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = new Set(csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1)));

/**
 * AQUÍ HUBO UNA LISTA DE PERDONES, Y ERA UNA PUERTA QUE FALLABA ABIERTA.
 *
 * `ROTOS_EN_ORIGEN` perdonaba el prefijo `/commercial-services/` porque esas 3 fichas también
 * dan 404 en el Webflow del que se migró: se replicaba el fallo en vez de arreglarlo. El perdón
 * tenía dos problemas, los dos medidos el 3-sep-2026:
 *
 *   · Su motivo era FALSO en la mitad. Decía «desde el menú y el pie de las 114 páginas», y el
 *     pie no los enlaza: `Footer.astro` tiene 80 anclas y CERO `commercial`. Las 345 apariciones
 *     (no 342) salen todas de `Nav.astro`. Un perdón cuyo motivo nadie vuelve a medir envejece
 *     mal, y este ya había envejecido.
 *   · Perdonaba POR PREFIJO y para siempre. El día que el enlace se arreglara, el perdón
 *     quedaría huérfano tapando cualquier `/commercial-services/…` nuevo que se colara. Eso es
 *     la ausencia de señal leída como señal buena, que es justo lo que estas puertas existen
 *     para impedir.
 *
 * Lo sustituye una condición que se puede FALSAR: un enlace que no resuelve a fichero se acepta
 * SOLO si `vercel.json` declara su 301 y el destino de ese 301 sí existe. Si alguien borra el
 * redirect, el enlace vuelve a estar roto y la puerta lo dice. Si alguien deja un redirect que
 * ya no usa nadie, también lo dice: un redirect huérfano es la siguiente versión de este mismo
 * fallo.
 */
const REDIRECTS = new Map((JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'))
  .redirects || []).map((r) => [r.source, r]));
const usados = new Set();

const ficheros = [];
(function barrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) barrer(f); else ficheros.push(f);
  }
}(ESTATICO));

const existe = (rel) => {
  const limpio = decodeURIComponent(rel.split('?')[0].split('#')[0]);
  return [path.join(ESTATICO, limpio), path.join(ESTATICO, limpio + '.html'),
    path.join(ESTATICO, limpio, 'index.html')].some((c) => fs.existsSync(c));
};

// ── 1 · enlaces internos ────────────────────────────────────────────────────
console.log('\n── 1. enlaces internos');
const rotos = new Set(), conHtml = new Set();
for (const f of ficheros.filter((x) => x.endsWith('.html'))) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/href="(\/[^"#][^"]*)"/g)) {
    const h = m[1];
    if (/^\/\//.test(h)) continue;
    if (/\.html($|[?#])/.test(h)) conHtml.add(`${path.relative(ESTATICO, f)} -> ${h}`);
    if (!existe(h)) {
      const ruta = decodeURIComponent(h.split('?')[0].split('#')[0]);
      if (REDIRECTS.has(ruta)) usados.add(ruta);
      else rotos.add(`${path.relative(ESTATICO, f)} -> ${h}`);
    }
  }
}
check('0 enlaces internos rotos (sin contar los que tienen 301)', rotos.size === 0, `${rotos.size}`);
lista([...rotos]);

// Un 301 no vale por estar declarado: vale si lleva a algun sitio y si alguien lo usa.
const sinDestino = [...REDIRECTS.values()].filter((r) => !existe(r.destination));
check(`${REDIRECTS.size} redirects declarados, todos a un destino que existe`,
  sinDestino.length === 0, `${sinDestino.length} apuntan a la nada`);
lista(sinDestino.map((r) => `${r.source} -> ${r.destination} (NO EXISTE)`));

const noPermanentes = [...REDIRECTS.values()].filter((r) => r.permanent !== true);
check('todos los redirects son 301 permanentes', noPermanentes.length === 0,
  `${noPermanentes.length} son 307 temporales`);
lista(noPermanentes.map((r) => r.source));

/**
 * LOS 301 QUE NADIE ENLAZA A PROPOSITO. Un renombrado publico.
 *
 * La comprobacion de abajo asume que un redirect existe para tapar un enlace interno que no se
 * actualizo, y por eso un redirect sin enlaces es basura. Cierto — salvo cuando la URL vieja
 * ERA publica: entonces el 301 esta para el trafico externo y para el indice de Google, y lo
 * correcto es justo lo contrario, que ningun enlace interno lo use.
 *
 * Se declara ENUMERADO, ruta por ruta y con su motivo, NO por prefijo. La cabecera de este
 * fichero cuenta como la lista de perdones anterior fallaba precisamente por ser un prefijo
 * («/commercial-services/ para siempre») con un motivo que resulto ser falso a medias. Una
 * entrada de mas aqui es una linea que alguien puede leer y discutir; un prefijo, no.
 *
 * Sigue siendo falsable: si el destino desaparece, la comprobacion de arriba lo dice igual.
 */
const SIN_ENLACE_INTERNO = new Map([
  ['/where-we-serves/custom-pool-builders-north-florida',
    'Tier 1 de SEO-URLS-PLAN.md: renombrada a /where-we-serve/north-florida el 3-sep-2026. Los '
    + 'enlaces internos apuntan ya a la nueva; este 301 es para el indice de Google.'],
  ['/where-we-serves/custom-pool-builders-south-florida',
    'idem, renombrada a /where-we-serve/south-florida. Ademas estaba en el sitemap del Webflow '
    + 'vivo, o sea que tiene URL publica indexada.'],

  ['/pool-builders/pool-builders-southwest-ranches-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 4428 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-hallandale-beach-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 2072 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-ocala-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 1547 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-north-palm-beach-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 1390 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-micanopy-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 1235 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-west-palm-beach-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 353 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/pool-builders/pool-builders-mcintosh-florida',
    'Legacy de Webflow (slug con el prefijo repetido). Webflow la redirigia y vercel.json no, '
    + 'asi que al cortar el DNS empezo a dar 404. 146 impresiones en 6 meses en Search '
    + 'Console: es trafico externo, y lo correcto es que ningun enlace interno la use.'],
  ['/services/custom-aluminum-wood-pergola-builders-in-north-south-florida',
    'Slug viejo del servicio de pergolas, con «wood» en medio. Ya devolvia 404 en el Webflow '
    + 'vivo y aun asi rankea en POSICION 2,2 con 125 impresiones: este 301 es un arreglo, no '
    + 'paridad. Destino: el mismo servicio con el slug actual.'],
  ['/excavation',
    'Ruta heredada que ya devolvia 404 antes de la migracion. 11 impresiones en posicion 8,3. '
    + 'Destino a criterio: la excavacion es parte de la construccion de piscina. Si se decide '
    + 'que no procede, se borra la entrada y se deja el 404 — pero que sea una decision.'],
]);

// Huerfanos: la trampa que tenia la lista de perdones que habia aqui antes.
const huerfanos = [...REDIRECTS.keys()].filter((s) => !usados.has(s) && !SIN_ENLACE_INTERNO.has(s));
check('0 redirects huerfanos (declarados y que ya no enlaza nadie)', huerfanos.length === 0,
  `${huerfanos.length} sobran`);
lista(huerfanos);
// Y al reves: un declarado que SI resulta enlazado ya no es un renombrado limpio — o queda un
// enlace interno sin actualizar, o la declaracion sobra. Las dos cosas hay que mirarlas.
const declaradosEnlazados = [...SIN_ENLACE_INTERNO.keys()].filter((s) => usados.has(s));
check(`${SIN_ENLACE_INTERNO.size} renombrados declarados sin enlace interno, y asi siguen`,
  declaradosEnlazados.length === 0, `${declaradosEnlazados.length} SI estan enlazados`);
lista(declaradosEnlazados.map((s) => `${s} — queda algun enlace interno a la ruta vieja`));
for (const [s, m] of SIN_ENLACE_INTERNO) console.log(`     301 sin enlace interno ${s}
        ${m}`);
for (const s of usados) console.log(`     301 ${s} -> ${REDIRECTS.get(s).destination}`);
check('0 enlaces a .html', conHtml.size === 0, `${conHtml.size}`);
lista([...conHtml]);

// ── 2 · assets locales, incluidos los url() del CSS ─────────────────────────
console.log('\n── 2. assets locales (incluidos los url() del CSS)');
const faltan = new Set();
for (const f of ficheros.filter((x) => /\.(html|css)$/.test(x))) {
  const t = fs.readFileSync(f, 'utf8');
  const patrones = [/(?:src|poster|data-poster-url)="(\/[^"]+)"/g, /url\((\/[^)"']+)\)/g];
  for (const re of patrones) {
    for (const m of t.matchAll(re)) {
      if (!existe(m[1])) faltan.add(`${path.relative(ESTATICO, f)} -> ${m[1]}`);
    }
  }
  for (const m of t.matchAll(/srcset="([^"]+)"/g)) {
    for (const parte of m[1].split(',')) {
      const u = parte.trim().split(/\s+/)[0];
      if (u.startsWith('/') && !existe(u)) faltan.add(`${path.relative(ESTATICO, f)} -> ${u}`);
    }
  }
}
check('0 assets locales que no existen', faltan.size === 0, `${faltan.size}`);
lista([...faltan]);

// ── 3 · acoplamiento git ↔ despliegue ───────────────────────────────────────
console.log('\n── 3. lo que dist/ pide POR RUTA LOCAL esta en git ls-files');
let enGit = new Set();
try {
  enGit = new Set(execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean));
} catch { /* sin repo */ }

// Lo que se pide y sale de public/ (lo que Astro genera en _astro/ lo produce el build)
const pedidos = new Set();
for (const f of ficheros.filter((x) => /\.(html|css)$/.test(x))) {
  const t = fs.readFileSync(f, 'utf8');
  for (const re of [/(?:src|href|poster|data-poster-url)="(\/[^"]+)"/g, /url\((\/[^)"']+)\)/g]) {
    for (const m of t.matchAll(re)) {
      const u = decodeURIComponent(m[1].split('?')[0].split('#')[0]);
      if (u.startsWith('/_astro/')) continue;                  // lo genera el build
      if (RUTAS.has(u) || RUTAS.has(u.replace(/\/$/, ''))) continue;  // es una pagina
      if (fs.existsSync(path.join(RAIZ, 'public', u))) pedidos.add(`public${u}`);
    }
  }
}
const fuera = [...pedidos].filter((p) => !enGit.has(p));
check(`${pedidos.size - fuera.length}/${pedidos.size} ficheros de public/ pedidos por dist estan en git`,
  fuera.length === 0, `${fuera.length} fuera de git`);
lista(fuera);
console.log('     (git ls-files, no el disco: el disco es esta maquina, donde acaba de');
console.log('      dejarlo todo el instalador, y por eso nunca puede ver el fallo)');

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} fallo(s)`}\n`);
process.exit(fallos ? 1 : 0);
