#!/usr/bin/env node
/**
 * PUERTA de las fotos de las 130 paginas de area de servicio (LOOP-AREAS, 16-oct-2026).
 *
 *     node scripts/check-fotos-areas.mjs                 las 130
 *     node scripts/check-fotos-areas.mjs weston-fl       subcadena de ruta (varias = o); `=/ruta` exacta
 *     node scripts/check-fotos-areas.mjs --autoprueba    rompe una pagina en memoria, regla a regla
 *     MM_ESTATICO=<carpeta> node scripts/...             mide una COPIA del build (D-127)
 *
 * Paginas: `/services/<servicio>/<ciudad|condado>-fl` de los 7 servicios con paginas locales,
 * `/where-we-serve` y sus dos zonas. Mira las `<img>` del `<main>` que caen en un hueco de foto
 * (hero, indice de servicios, seccion, resenas, cierre, proyectos destacados, galeria y teselas de
 * categorias; el poster del video no es foto de obra). Sale con 1 si, en una pagina:
 *
 *   1 · una foto no traza a obra real: banco `obra_real` + `aprobada*` (o una derivada con
 *       `_banco`), `gallery-procedencia.json` (usable, D-122; o no usable en galeria y seccion de su
 *       propio servicio y fuera de `excluidas` e `ilustraciones`, D-124), las obras propias de
 *       `proyectos-propios.json` (D-28/D-43) o el legado `_legado` de `galeria-obra-por-ruta.json`;
 *   2 · hero, seccion, resenas, indice o cierre llevan una foto del banco con `etapa` distinta de
 *       `terminado` (las registradas fuera del banco no guardan etapa: no cuentan, D-211);
 *   3 · la misma foto sale dos veces en el cuerpo: cuenta la foto, no el fichero (mismo id del
 *       banco, o un par de `casiIguales` / `duplicado_de`);
 *   4 · en un hueco en alcance, un `alt` vacio, que empieza por «image/photo/picture of», o que
 *       nombra ciudad, condado o zona sin que la foto este en `heroes-ciudad.json` → `lugar` (D-204)
 *       con ese mismo sitio. Las teselas y el poster llevan `alt=""` a proposito (D-211);
 *   5 · un fichero bajo `/images/obra/` no es kebab-case ASCII, pasa de 80 caracteres sin extension,
 *       lleva un id (`bi-`, `IMG_`, `DSC`, uuid), una fecha, una palabra vacia o un lugar
 *       («florida» si vale: es el estado entero);
 *   6 · el hero no tiene `width`/`height` o `fetchpriority="high"`, lleva `loading=lazy`, o ninguna
 *       precarga casa con su `srcset` ni con el de su `<source>` de movil (D-211).
 *
 * FALLA CERRADA: sin build, una pagina sin HTML o sin hero, un filtro que no casa ninguna ruta, o
 * las 130 que no son 130, es ROJO. Lee solo datos de `src/data/`: ninguna tabla de fuera del repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = process.env.MM_ESTATICO ? path.resolve(process.env.MM_ESTATICO) : path.join(RAIZ, '.vercel/output/static');
const J = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data', f), 'utf8'));
const SERVICIOS = { 'pool-builders': 'construction', 'pool-remodeling': 'remodeling', 'louvered-roofs': 'louvered',
  'pergola-builders': 'pergolas', 'outdoor-kitchens': 'kitchen', 'deck-builders': 'decks', landscaping: 'landscaping' };
const TOTAL = 130;

// ── de URL servida a foto ─────────────────────────────────────────────────────────────────────────
const banco = J('banco-imagenes.json');
const porId = new Map(banco.map((x) => [x.id, x]));
const directo = new Map(); // url -> id del banco
const receta = new Map(); // url -> url (o id) de la que sale
for (const x of banco) { directo.set(x.src, x.id); for (const u of x.publicada_como ?? []) if (!directo.has(u)) directo.set(u, x.id); }
const anda = (o) => {
  if (Array.isArray(o)) return o.forEach(anda);
  if (!o || typeof o !== 'object') return;
  const u = o.src ?? o.foto;
  if (typeof u === 'string') { if (o._banco && porId.has(o._banco)) { if (!directo.has(u)) directo.set(u, o._banco); } else if (o._ajuste?.de) receta.set(u, o._ajuste.de); }
  Object.values(o).forEach(anda);
};
for (const f of fs.readdirSync(path.join(RAIZ, 'src/data'))) if (f.endsWith('.json') && f !== 'banco-imagenes.json') anda(J(f));
for (const [k, t] of Object.entries(J('fotos-hueco.json').fotos)) for (const r of Object.values(t)) {
  if (r.de && r.de !== k) receta.set(k, r.de); for (const [, u] of r.fuentes ?? []) receta.set(u, k);
}
const vi = J('variantes-imagen.json');
for (const [k, r] of Object.entries(vi.imagenes)) for (const [, u] of r.variantes ?? []) receta.set(u, k);
for (const [k, l] of Object.entries(vi.lcp ?? {})) for (const [, u] of l) receta.set(u, k);
for (const c of J('galeria-categorias.json').categorias) if (c.panel?.bancoId) directo.set(`tesela:${c.slug}`, c.panel.bancoId);

const SUF = /-(?:mm|lcp|serv|lam|res|cierre|hero|heroe|p-|mmh)\d+(?=\.\w+$)/;
const sinSufijo = (u) => { let v = u; for (let k = 0, w; k < 4 && (w = v.replace(SUF, '')) !== v; k++) v = w; return v; };
const extensiones = (u) => ['.webp', '.avif', '.jpg', '.jpeg', '.png'].map((e) => u.replace(/\.\w+$/, e));
const limpia = (u) => decodeURIComponent(String(u).split('?')[0]);

/** id del banco de una URL servida, o null */
function idDe(url) {
  const u = limpia(url);
  const tes = u.match(/\/images\/obra\/teselas\/gallery-tile-(.+?)-\d+\.webp$/);
  if (tes && directo.has(`tesela:${tes[1]}`)) return directo.get(`tesela:${tes[1]}`);
  const visto = new Set(); let cola = [u];
  for (let n = 0; n < 8 && cola.length; n++) {
    const sig = [];
    for (const c of cola) {
      if (visto.has(c)) continue; visto.add(c);
      if (directo.has(c)) return directo.get(c);
      if (receta.has(c)) { const o = receta.get(c); if (porId.has(o)) return o; sig.push(o); }
      const s = sinSufijo(c); if (s !== c) sig.push(s);
      for (const e of extensiones(c)) if (e !== c && (directo.has(e) || receta.has(e))) sig.push(e);
      const sh = c.replace(/-(?:full|menu|heroe)(?=\.\w+$)/, ''); if (sh !== c) sig.push(sh);
    }
    cola = sig;
  }
  return null;
}

// registros de fuera del banco
const galeria = new Map(); // src -> { servicio, veredicto, usable }
for (const [s, l] of Object.entries(J('gallery-procedencia.json').servicios)) for (const x of l) galeria.set(x.src, { servicio: s, veredicto: x.veredicto, usable: x.usable });
const comp = J('galeria-complementaria.json');
const excluidas = new Set(comp.excluidas ?? []);
const ilustraciones = new Set(Object.keys(comp.ilustraciones ?? {}));
const legado = new Set();
for (const v of Object.values(J('galeria-obra-por-ruta.json'))) for (const f of v?.fotos ?? []) if (f._legado) legado.add(f.src);
const propios = new Set();
for (const o of J('proyectos-propios.json').obras) for (const g of o.galeria ?? []) propios.add(g.src);
const enRegistro = (reg, u) => { const r = sinSufijo(u); return [u, r, ...extensiones(r)].find((k) => reg.has(k)); };

const hc = J('heroes-ciudad.json');
const lugar = new Map(Object.entries(hc.lugar ?? {}).filter(([k]) => !k.startsWith('_')));
const casi = new Map();
const par = (a, b) => { for (const [x, y] of [[a, b], [b, a]]) (casi.get(x) ?? casi.set(x, new Set()).get(x)).add(y); };
for (const [a, b] of hc.casiIguales ?? []) par(a, b);
for (const x of banco) if (x.duplicado_de) par(x.id, x.duplicado_de);

// ── huecos ────────────────────────────────────────────────────────────────────────────────────────
const HUECOS = [['.mm-hero-a-medio', 'hero'], ['.mm-serv-medio', 'indice'], ['.mm-lam-medio', 'seccion'], ['.mm-res-medio', 'resenas'],
  ['.mm-cierre-medio', 'cierre'], ['.mm-ficha-foto', 'proyectos'], ['.mm-celda', 'galeria'], ['.mm-cat-foto', 'categorias'], ['.mm-video-poster-marco', 'video']];
const ETAPA = new Set(['hero', 'seccion', 'resenas', 'indice', 'cierre']);
const ALT = new Set(['hero', 'indice', 'seccion', 'resenas', 'cierre', 'proyectos', 'galeria']);
const srcset = (s) => (s ?? '').split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
const normSet = (s) => (s ?? '').split(',').map((p) => p.trim().replace(/\s+/g, ' ')).filter(Boolean).sort().join(',');

/** clave de la foto: id del banco o, fuera de el, su registro */
function clave(u, id) {
  if (id) return id; let m;
  if ((m = u.match(/^\/images\/images\/([^/]+)\//))) return 'wf:' + m[1];
  if ((m = u.match(/project-(\d{3})-(\d+)/))) return `p${m[1]}-${m[2]}`;
  if ((m = u.match(/^\/images\/projects\/([^/]+)\//))) return 'proy:' + m[1];
  return 'f:' + path.basename(sinSufijo(u)).replace(/\.\w+$/, '');
}

// ── lugares (regla 4) y ficheros (regla 5) ────────────────────────────────────────────────────────
let LUGARES = []; let TOKENS = [];
const NORTE = new Set(['alachua', 'columbia', 'dixie', 'gilchrist', 'levy', 'marion', 'putnam'].map((c) => `${c}-county-fl`));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function montaLugares(rutas) {
  const slugs = [...new Set(rutas.filter((r) => r.startsWith('/services/')).map((r) => r.split('/')[3]))];
  const nombre = (s) => s.replace(/-fl$/, '').split('-').map((w) => (w === 'mcintosh' ? 'McIntosh' : w[0].toUpperCase() + w.slice(1))).join(' ');
  for (const s of slugs) {
    if (s.endsWith('-county-fl')) LUGARES.push({ txt: nombre(s), tipo: 'condado', slug: s }, { txt: nombre(s).replace(/ County$/, ''), tipo: 'condado', slug: s, suelto: true });
    else LUGARES.push({ txt: nombre(s), tipo: 'ciudad', slug: s });
  }
  for (const t of ['Miami', 'Miami-Dade', 'Orlando', 'Tampa', 'Jacksonville', 'Naples', 'Sarasota', 'St. Augustine', 'Key West', 'Fort Myers',
    'Coral Springs', 'Coral Gables', 'Sunrise', 'Port St. Lucie', 'Stuart', 'Vero Beach', 'Martin County', 'St. Lucie']) LUGARES.push({ txt: t, tipo: 'ciudad', slug: null });
  for (const t of ['North & South Florida', 'North and South Florida', 'North Central Florida', 'North Florida', 'South Florida', 'Central Florida',
    'Southeast Florida', 'Southwest Florida', 'Treasure Coast', 'Gold Coast']) LUGARES.push({ txt: t, tipo: 'zona', slug: /&| and |Central|west|Treasure|Gold/.test(t) ? null : /North/.test(t) ? 'norte' : 'sur' });
  LUGARES.sort((a, b) => b.txt.length - a.txt.length);
  TOKENS = slugs.map((s) => s.replace(/-fl$/, '').replace(/-county$/, ''))
    .concat(['north-florida', 'south-florida', 'central-florida', 'miami', 'miami-dade', 'orlando', 'tampa', 'jacksonville', 'naples', 'sarasota']).sort((a, b) => b.length - a.length);
}
/** lugares que nombra un texto, el mas largo primero (West Palm Beach no cuenta como Palm Beach) */
function lugaresEn(txt) {
  let t = txt; const out = [];
  for (const l of LUGARES) {
    const re = new RegExp(`(?<![A-Za-z])${esc(l.txt)}(?![A-Za-z])`, l.tipo === 'zona' ? 'gi' : 'g');
    if (re.test(t)) { out.push(l); t = t.replace(re, '·'); }
  }
  return out.filter((l) => !(l.suelto && out.some((o) => o.tipo === 'ciudad' && o.txt === l.txt)));
}
const respalda = (id, l) => {
  const g = id && lugar.get(id); if (!g || !l.slug) return false;
  if (l.tipo === 'ciudad') return g.ciudad === l.slug;
  if (l.tipo === 'condado') return g.condado === l.slug;
  return !!g.condado && (NORTE.has(g.condado) ? 'norte' : 'sur') === l.slug;
};
function fallosFichero(u) {
  const b = path.basename(u).replace(/\.\w+$/, ''); const f = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b)) f.push('no es kebab-case ASCII');
  if (b.length > 80) f.push(`${b.length} caracteres`);
  if (/(?:^|-)bi-?\d{3,}/.test(b) || /img[-_]?\d/i.test(b) || /dsc[n_]?\d/i.test(b) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(b) || /[0-9a-f]{24,}/i.test(b)) f.push('lleva un id');
  if (/(?:^|-)(?:19|20)\d{2}-?[01]\d-?[0-3]\d(?:-|$)/.test(b)) f.push('lleva una fecha');
  if (/(?:^|-)(?:image|img|photo|picture|pic|final|copy|untitled)(?:-|$)/.test(b)) f.push('palabra vacia');
  let t = `-${b}-`; const lug = [];
  for (const k of TOKENS) if (t.includes(`-${k}-`)) { lug.push(k); t = t.split(`-${k}-`).join('-·-'); }
  if (lug.length) f.push(`lugar: ${lug.join(',')}`);
  return f;
}

// ── una pagina ────────────────────────────────────────────────────────────────────────────────────
/** Devuelve [{ regla, hueco, detalle }] de una pagina ya construida. */
function revisa(ruta, html) {
  const fallos = []; const mal = (regla, hueco, detalle) => fallos.push({ regla, hueco, detalle });
  const d = new JSDOM(html).window.document; const main = d.querySelector('main');
  if (!main) { mal(0, '-', 'sin <main>'); return fallos; }
  const servicio = SERVICIOS[ruta.split('/')[2]] ?? null;
  const cuenta = {}; const fotos = []; const heroes = [];
  for (const i of main.querySelectorAll('img')) {
    const hh = HUECOS.find(([sel]) => i.closest(sel)); if (!hh) continue;
    const tipo = hh[1]; const n = (cuenta[tipo] = (cuenta[tipo] ?? -1) + 1);
    const hueco = tipo === 'galeria' ? `galeria[${n}]` : ['indice', 'proyectos', 'categorias'].includes(tipo) || n ? `${tipo}[${n}]` : tipo;
    if (tipo === 'video') continue;
    const src = limpia(i.getAttribute('src') ?? '');
    const pic = i.closest('picture'); const fuentes = pic ? [...pic.querySelectorAll('source')] : [];
    const urls = [...new Set([src, ...srcset(i.getAttribute('srcset')), ...fuentes.flatMap((s) => srcset(s.getAttribute('srcset')))].filter(Boolean).map(limpia))];
    const id = idDe(src) ?? urls.map(idDe).find(Boolean) ?? null; const x = id && porId.get(id);
    const k = clave(src, id); fotos.push({ hueco, k });
    // 1 · procedencia
    if (x) {
      if (x.procedencia !== 'obra_real' || !String(x.estado).startsWith('aprobada') || /\/images\/banco\/(?:ia|render)\//.test(src)) mal(1, hueco, `${id}: ${x.procedencia} / ${x.estado}`);
    } else {
      const g = enRegistro(galeria, src); const r = g && galeria.get(g);
      const ok = r ? (r.veredicto === 'obra_real' && r.usable)
        || ((tipo === 'galeria' || tipo === 'seccion') && r.servicio === servicio && !excluidas.has(g) && !ilustraciones.has(g))
        : enRegistro(legado, src) || enRegistro(propios, src);
      if (!ok) mal(1, hueco, r ? `${src}: galeria ${r.servicio}, ${r.veredicto}${r.usable ? '' : ', no usable'}` : `${src}: no traza al banco ni a un registro`);
    }
    // 2 · etapa
    if (ETAPA.has(tipo) && x && x.etapa !== 'terminado') mal(2, hueco, `${id}: etapa ${x.etapa}`);
    // 4 · alt
    if (ALT.has(tipo)) {
      const a = i.getAttribute('alt');
      if (a == null || !a.trim()) mal(4, hueco, `${k}: alt vacio`);
      else {
        if (/^\s*(?:an?\s+)?(?:image|photo|picture|photograph)\b/i.test(a)) mal(4, hueco, `${k}: «${a.slice(0, 60)}»`);
        for (const l of lugaresEn(a)) if (!respalda(id, l)) mal(4, hueco, `${k}: nombra «${l.txt}» sin lugar en heroes-ciudad.json`);
      }
    }
    // 5 · ficheros
    for (const u of urls) if (u.startsWith('/images/obra/')) for (const f of fallosFichero(u)) mal(5, hueco, `${path.basename(u)}: ${f}`);
    if (tipo === 'hero') heroes.push({ i, fuentes, hueco });
  }
  // 3 · la misma foto dos veces
  const donde = new Map(); for (const f of fotos) (donde.get(f.k) ?? donde.set(f.k, []).get(f.k)).push(f.hueco);
  for (const [k, l] of donde) if (l.length > 1) mal(3, l[0], `${k} en ${l.join(' + ')}`);
  const vistos = new Set();
  for (const k of donde.keys()) for (const c of casi.get(k) ?? []) {
    const p = [k, c].sort().join('+'); if (donde.has(c) && !vistos.has(p)) { vistos.add(p); mal(3, donde.get(k)[0], `${k} y ${c} (casi iguales) en ${donde.get(k)[0]} + ${donde.get(c)[0]}`); }
  }
  // 6 · hero
  if (heroes.length !== 1) mal(6, 'hero', `${heroes.length} heros en el <main>`);
  const pre = [...d.querySelectorAll('link[rel=preload][as=image]')];
  for (const { i, fuentes, hueco } of heroes) {
    if (!i.getAttribute('width') || !i.getAttribute('height')) mal(6, hueco, 'sin width/height');
    if (i.getAttribute('loading') === 'lazy') mal(6, hueco, 'loading=lazy');
    if (i.getAttribute('fetchpriority') !== 'high') mal(6, hueco, `fetchpriority=${i.getAttribute('fetchpriority')}`);
    const sets = [i.getAttribute('srcset'), ...fuentes.map((s) => s.getAttribute('srcset'))].filter(Boolean).map(normSet);
    const casa = pre.some((p) => (p.getAttribute('imagesrcset') && sets.includes(normSet(p.getAttribute('imagesrcset'))))
      || (!i.getAttribute('srcset') && p.getAttribute('href') && limpia(p.getAttribute('href')) === limpia(i.getAttribute('src'))));
    if (!casa) mal(6, hueco, `ninguna de las ${pre.length} precargas casa con su srcset`);
  }
  return fallos;
}

// ── rutas ─────────────────────────────────────────────────────────────────────────────────────────
function rutasDelBuild() {
  const r = [];
  for (const s of Object.keys(SERVICIOS)) {
    const dir = path.join(ESTATICO, 'services', s); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (/-fl$/.test(f) && fs.existsSync(path.join(dir, f, 'index.html'))) r.push(`/services/${s}/${f}`);
  }
  const w = path.join(ESTATICO, 'where-we-serve');
  if (fs.existsSync(path.join(w, 'index.html'))) r.push('/where-we-serve');
  for (const z of ['north-florida', 'south-florida']) if (fs.existsSync(path.join(w, z, 'index.html'))) r.push(`/where-we-serve/${z}`);
  return r.sort();
}
const html = (ruta) => fs.readFileSync(path.join(ESTATICO, ruta, 'index.html'), 'utf8');
const NOMBRES = { 0: 'pagina', 1: 'procedencia', 2: 'etapa', 3: 'repetida', 4: 'alt', 5: 'fichero', 6: 'hero' };

if (process.argv[1] === import.meta.filename) {
  if (!fs.existsSync(ESTATICO)) { console.error(`\n🔴 falta ${ESTATICO} — corre \`npm run build\`${process.env.MM_ESTATICO ? ' o revisa MM_ESTATICO' : ''}\n`); process.exit(1); }
  const todas = rutasDelBuild(); montaLugares(todas);

  if (process.argv.includes('--autoprueba')) {
    // Una puerta que nunca ha salido roja no ha demostrado nada: cada mutacion tiene que subir su regla.
    const ruta = todas.find((r) => r === '/services/pergola-builders/weston-fl') ?? todas.find((r) => r.startsWith('/services/pergola-builders/'));
    const base = html(ruta); const d = new JSDOM(base).window.document; const m = d.querySelector('main');
    const img = (sel) => m.querySelector(`${sel} img`); const hero = img('.mm-hero-a-medio');
    const otraDe = (f) => banco.find((x) => f(x) && x.src && fs.existsSync(path.join(ESTATICO, x.src)))?.src ?? banco.find((x) => f(x) && x.src)?.src;
    const ajena = otraDe((x) => x.procedencia !== 'obra_real'); const obra = otraDe((x) => x.procedencia === 'obra_real' && x.estado.startsWith('aprobada') && x.etapa === 'construccion');
    const pon = (i, u) => { i.setAttribute('src', u); i.removeAttribute('srcset'); i.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove()); };
    const casos = [
      [1, 'seccion con una foto que no es obra real', (q) => pon(q.querySelector('.mm-lam-medio img'), ajena)],
      [1, 'galeria con un fichero sin registro', (q) => pon(q.querySelector('.mm-celda img'), '/images/obra/suelta/pool-deck-sin-registro.webp')],
      [2, 'cierre con obra en construccion', (q) => pon(q.querySelector('.mm-cierre-medio img'), obra)],
      [3, 'resenas con la foto del hero', (q) => pon(q.querySelector('.mm-res-medio img'), q.querySelector('.mm-hero-a-medio img').getAttribute('src'))],
      [3, 'seccion con la casi igual de otra foto de la pagina', (q) => { const [a, b] = (hc.casiIguales ?? [])[0]; pon(q.querySelector('.mm-hero-a-medio img'), porId.get(a).src); pon(q.querySelector('.mm-lam-medio img'), porId.get(b).src); }],
      [4, 'alt vacio en la galeria', (q) => q.querySelector('.mm-celda img').setAttribute('alt', '')],
      [4, 'alt que empieza por «Photo of»', (q) => q.querySelector('.mm-cierre-medio img').setAttribute('alt', 'Photo of a pergola over a pool deck')],
      [4, 'alt con una ciudad sin GPS', (q) => q.querySelector('.mm-lam-medio img').setAttribute('alt', 'Aluminum pergola over a travertine pool deck in Weston, FL')],
      [4, 'alt con «South Florida» sin GPS', (q) => q.querySelector('.mm-res-medio img').setAttribute('alt', 'White pergola over an outdoor kitchen in a South Florida backyard')],
      // control: una foto con su sitio en `lugar` puede nombrarlo; si esto saltara, la regla 4 seria un rojo a ciegas
      [-4, 'CONTROL · alt con la ciudad que respalda `lugar`', (q) => { const [id, g] = [...lugar].find(([, v]) => v.ciudad); const i = q.querySelector('.mm-lam-medio img'); pon(i, porId.get(id).src);
        i.setAttribute('alt', `Freeform pool with a travertine deck in ${g.ciudad.replace(/-fl$/, '').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}, FL`); }],
      [5, 'fichero con IMG_, mayusculas y fecha', (q) => pon(q.querySelector('.mm-celda img'), '/images/obra/suelta/IMG_2024-05-01 Final.webp')],
      [5, 'fichero con ciudad en el nombre', (q) => { const i = q.querySelector('.mm-hero-a-medio img'); i.setAttribute('srcset', `/images/obra/obra-063/aluminum-pergola-pool-deck-weston-heroe.webp 1600w`); }],
      [6, 'hero sin width/height', (q) => { const i = q.querySelector('.mm-hero-a-medio img'); i.removeAttribute('width'); i.removeAttribute('height'); }],
      [6, 'hero con loading=lazy', (q) => q.querySelector('.mm-hero-a-medio img').setAttribute('loading', 'lazy')],
      [6, 'hero sin precarga que case', (q) => q.ownerDocument.querySelectorAll('link[rel=preload][as=image]').forEach((l) => l.remove())],
    ];
    if (!hero) { console.error(`🔴 autoprueba: ${ruta} no tiene hero`); process.exit(1); }
    const clv = (x) => `${x.regla}|${x.hueco}|${x.detalle}`;
    const antes = revisa(ruta, base); const ya = new Set(antes.map(clv)); let mal = 0;
    console.log(`autoprueba sobre ${ruta} (de partida, ${antes.length} fallo(s): reglas ${[...new Set(antes.map((x) => x.regla))].join(', ') || 'ninguna'})`);
    for (const [regla, que, rompe] of casos) {
      // salta si aparece un fallo NUEVO de su regla: contar no vale, la mutacion puede quitar uno y poner otro
      const dd = new JSDOM(base).window.document; rompe(dd.querySelector('main'));
      const nuevos = revisa(ruta, dd.documentElement.outerHTML).filter((x) => x.regla === Math.abs(regla) && !ya.has(clv(x)));
      const bien = regla > 0 ? nuevos.length > 0 : nuevos.length === 0; if (!bien) mal++;
      console.log(`  ${bien ? '✅' : '🔴'} regla ${Math.abs(regla)} (${NOMBRES[Math.abs(regla)]}) · ${que}: ${nuevos.length ? `«${nuevos[0].hueco} · ${nuevos[0].detalle}»` : regla > 0 ? 'NO SALTA' : 'no salta, como debe'}`);
    }
    console.log(mal ? `\n🔴 autoprueba: ${mal} mutacion(es) no saltan` : `\n✅ autoprueba: las ${casos.filter(([r]) => r > 0).length} mutaciones saltan, una o mas por regla, y el control no`);
    process.exit(mal ? 1 : 0);
  }

  const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));
  const rutas = todas.filter(casa);
  let rojo = 0; const porRegla = {};
  if (!filtro.length && todas.length !== TOTAL) { console.log(`🔴 el build tiene ${todas.length} paginas de area, no ${TOTAL}`); rojo++; }
  if (!rutas.length) { console.log(`🔴 el filtro ${JSON.stringify(filtro)} no casa ninguna pagina de area`); process.exit(1); }
  for (const r of rutas) {
    const f = revisa(r, html(r)); if (!f.length) continue; rojo++;
    for (const x of f) (porRegla[x.regla] ??= []).push({ ruta: r, ...x });
  }
  const TODO = process.argv.includes('--todo');
  for (const [regla, l] of Object.entries(porRegla)) {
    console.log(`\n🔴 regla ${regla} · ${NOMBRES[regla]}: ${l.length} en ${new Set(l.map((x) => x.ruta)).size} pagina(s)`);
    for (const x of TODO ? l : l.slice(0, 12)) console.log(`   ${x.ruta}  ${x.hueco}  ${x.detalle}`);
    if (!TODO && l.length > 12) console.log(`   … y ${l.length - 12} mas (--todo)`);
  }
  console.log(rojo ? `\n🔴 fotos de areas: ${rojo} de ${rutas.length} pagina(s) en rojo` : `\n✅ fotos de areas: ${rutas.length} pagina(s), las seis reglas en verde`);
  process.exit(rojo ? 1 : 0);
}
