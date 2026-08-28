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
 * Enlaces que YA ESTÁN ROTOS EN EL ORIGEN. Se replican, no se arreglan: el contrato dice que
 * el sitio nuevo queda exactamente igual, y arreglarlos sería inventarse páginas.
 *
 * Comprobado contra el sitio vivo, no supuesto:
 *     GET https://mrandmrsoutdoorliving.com/commercial-services/...  -> 404
 *
 * Está anotado como mejora candidata: son 342 enlaces en el pie y en los menús que llevan a
 * ninguna parte, y cada uno es un visitante perdido.
 */
const ROTOS_EN_ORIGEN = [
  ['/commercial-services/', '404 en el sitio vivo. `commercial-services` es una coleccion SIN '
    + 'pagina propia -PROMPT.md lo dice y se ha verificado-, pero el sitio enlaza sus 3 fichas '
    + 'desde el menu y el pie de las 114 paginas'],
];

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
    if (!existe(h) && !ROTOS_EN_ORIGEN.some(([pref]) => h.startsWith(pref))) {
      rotos.add(`${path.relative(ESTATICO, f)} -> ${h}`);
    }
  }
}
check('0 enlaces internos rotos (sin contar los del origen)', rotos.size === 0, `${rotos.size}`);
lista([...rotos]);
for (const [pref, motivo] of ROTOS_EN_ORIGEN) {
  console.log(`     declarado ${pref} — ${motivo.slice(0, 96)}...`);
}
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
