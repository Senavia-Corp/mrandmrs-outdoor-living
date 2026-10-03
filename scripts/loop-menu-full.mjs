/** MENU + FULL del loop: deriva las fotos (menu 680 px WebP, Full 1500x800 AVIF), edita Nav.astro,
 *  escribe fotos-megamenu.json y fotos-servicios-categoria.json, anota el banco y el estado.
 *     node scripts/loop-menu-full.mjs   (lee banco/.trabajo/loop-imagenes/menu-full.json: {serv: {_banco, posMenu, posFull}}) */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8')); const W = (f, o) => fs.writeFileSync(path.join(RAIZ, f), JSON.stringify(o, null, 2) + '\n');
const picks = J('banco/.trabajo/loop-imagenes/menu-full.json');
const banco = J('src/data/banco-imagenes.json'); const porId = new Map(banco.map((e) => [e.id, e]));
const estado = J('docs/encargos/LOOP-IMAGENES-ESTADO.json');
const RUTAS_FULL = ['/', '/where-we-serve/north-florida', '/where-we-serve/south-florida'];
// data-service del menu -> id de Full-Service
const ID_FULL = { steel: 'pole', patiorooms: 'rooms' };
const nav = path.join(RAIZ, 'src/components/Nav.astro'); let navSrc = fs.readFileSync(nav, 'utf8');
const m = navSrc.match(/const marcado = ("[\s\S]*?")\.replace/); let html = JSON.parse(m[1]);
const menuJson = {}, fullJson = {}; const hMenu = [], hFull = [];
const derivar = (e, ratio, pos, ancho, salida, q) => JSON.parse(execFileSync('node', [path.join(RAIZ, 'scripts/derivar-foto.mjs'), e.src, ratio, pos, String(ancho), salida, '--q', String(q)], { encoding: 'utf8' }));
for (const [serv, p] of Object.entries(picks)) {
  const e = porId.get(p._banco); if (!e) throw new Error('no esta en el banco: ' + p._banco);
  const obra = e.proyecto || 'suelta'; const base = path.basename(e.src, '.webp').replace(/-\d+$/, '');
  const re = new RegExp(`(<div data-service="${serv}" class="wrapper-picture-service[^"]*"><img loading="lazy" src=")([^"]+)(" alt=")([^"]*)(")( width="\\d+" height="\\d+")?`);
  const mm = html.match(re); if (!mm) throw new Error('menu: no encuentro ' + serv);
  const antesMenu = mm[2];
  // MENU: 680x682 AVIF (objetivo <= 60 KB; el menu sale en las 115 rutas)
  const rm = derivar(e, '339/340', p.posMenu, 680, `/images/obra/${obra}/${base}-menu.avif`, 46);
  html = html.replace(re, `$1${rm.salida}$3${e.alt}$5 width="${rm.ancho}" height="${rm.alto}"`);
  menuJson[serv] = { src: rm.salida, alt: e.alt, ancho: rm.ancho, alto: rm.alto, _banco: e.id, _ajuste: rm._ajuste };
  hMenu.push({ hueco: `menu[${serv}]`, selector: `.wrapper-picture-service[data-service="${serv}"] img.picture-service`, antes: antesMenu, procedencia_antes: 'sin_verificar', estado: 'canjeada', despues: rm.salida, _banco: e.id, pos: p.posMenu, _ajuste: rm._ajuste, juez: 'conjunto', bytes: rm.bytes });
  // FULL: 1500x800 AVIF
  const id = ID_FULL[serv] ?? serv;
  const rf = derivar(e, '750/400', p.posFull, 1500, `/images/obra/${obra}/${base}-full.avif`, 50);
  fullJson[id] = { foto: rf.salida, alt: e.alt, ancho: rf.ancho, alto: rf.alto, pos: p.posFull, _banco: e.id, _ajuste: rf._ajuste };
  hFull.push({ hueco: `full[${id}]`, selector: `article.svc-ficha[data-id="${id}"] img.svc-foto`, antes: null, procedencia_antes: 'sin_verificar', estado: 'canjeada', despues: rf.salida, _banco: e.id, pos: p.posFull, _ajuste: rf._ajuste, juez: 'conjunto', bytes: rf.bytes });
  e.usada_en = [...new Set([...(e.usada_en ?? []), 'megamenu', ...RUTAS_FULL])];
  e.publicada_como = [...new Set([...(e.publicada_como ?? []).filter((x) => !x.endsWith('-menu.webp')), rm.salida, rf.salida])];
}
navSrc = navSrc.replace(m[1], JSON.stringify(html)); fs.writeFileSync(nav, navSrc);
W('src/data/fotos-megamenu.json', menuJson); W('src/data/fotos-servicios-categoria.json', fullJson); W('src/data/banco-imagenes.json', banco);
const uM = estado.unidades.find((u) => u.id === 'MENU'); uM.rutas = ['megamenu']; uM.huecos = hMenu;
const uF = estado.unidades.find((u) => u.id === 'FULL'); uF.huecos = hFull;
W('docs/encargos/LOOP-IMAGENES-ESTADO.json', estado);
console.log('menu:', hMenu.map((h) => `${h.hueco.slice(5, -1)}=${Math.round(h.bytes / 1024)}KB`).join(' '));
console.log('full:', hFull.map((h) => `${h.hueco.slice(5, -1)}=${Math.round(h.bytes / 1024)}KB`).join(' '));
