#!/usr/bin/env node
/**
 * Las seis fotos de la banda «Project Gallery» (los paneles verticales de las 55 rutas).
 *
 *     node scripts/build-paneles-galeria.mjs                      # deriva las seis
 *     node scripts/build-paneles-galeria.mjs --hoja bi-0947 bi-0614:0.2 … > hoja.jpg
 *
 * El dato vive en `src/data/galeria-categorias.json` -> `categorias[].panel`
 * (`bancoId`, `x` = object-position horizontal en %, y `recorte` opcional). Se recorta la foto
 * del BANCO, no el original: ya viene sin EXIF y con los recortes de privacidad hechos
 * (BANCO-IMAGENES.md, regla 6). A toda la altura, al 9:16 de los paneles de siempre
 * (941x1672 + -p-800 + -p-500), centrado o desde `recorte` (fraccion del ancho sobrante).
 *
 * LA HOJA SE JUZGA POR LO QUE PINTA LA CELDA, no por la foto entera. Por cada candidata: el
 * fichero 9:16 con una regla cada 10 %, el panel EN REPOSO a 1440 (236x662) con x = 0/25/50/75/100,
 * el panel ABIERTO (~453x662, flex-grow 2,35) y el movil (390x384). El velo navy de
 * `caracteristicas.css` (.block-feature) va pintado encima: el titulo blanco tiene que caer en
 * zona tranquila.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CATEGORIAS } from '../src/lib/galeria-categorias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BANCO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'));
const porId = new Map(BANCO.map((e) => [e.id, e]));
const ANCHO = 941, ALTO = 1672;
const DESTINO = path.join(RAIZ, 'public/images/obra/paneles');

const entrada = (id) => {
  const e = porId.get(id);
  if (!e) throw new Error(`${id} no esta en el banco`);
  return e;
};

/** El 9:16 a toda la altura. `recorte` en 0..1 sobre el ancho que sobra; sin el, centrado. */
async function nueveDieciseis(e, recorte) {
  const ancho = Math.round(e.alto * ANCHO / ALTO);
  if (ancho > e.ancho) throw new Error(`${e.id}: ${e.ancho}x${e.alto} es mas estrecha que 9:16`);
  const left = Math.round((e.ancho - ancho) * (recorte ?? 0.5));
  return sharp(path.join(RAIZ, 'public', e.src))
    .extract({ left, top: 0, width: ancho, height: e.alto })
    .resize(ANCHO, ALTO)
    .toBuffer();
}

/** `object-fit: cover` + `object-position: x% 50%` de una celda w×h sobre el 9:16. */
async function celda(buf, w, h, x) {
  const k = Math.max(w / ANCHO, h / ALTO);
  const sw = Math.round(ANCHO * k), sh = Math.round(ALTO * k);
  const velo = Buffer.from(`<svg width="${w}" height="${h}"><defs><linearGradient id="v" x1="0" y1="1" x2="0" y2="0">`
    + '<stop offset="0.04" stop-color="#001c63"/><stop offset="0.42" stop-color="#001c63" stop-opacity="0.72"/>'
    + `<stop offset="0.68" stop-color="#001c63" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#v)"/></svg>`);
  return sharp(buf).resize(sw, sh)
    .extract({ left: Math.round((sw - w) * x / 100), top: Math.round((sh - h) / 2), width: w, height: h })
    .composite([{ input: velo }]).png().toBuffer();
}

const texto = (s, w, h, talla = 22) => Buffer.from(`<svg width="${w}" height="${h}"><text x="4" y="${talla}" `
  + `font-family="Helvetica" font-size="${talla}" fill="#fff">${s}</text></svg>`);

async function hoja(ids) {
  const E = 0.5, G = 12;   // la hoja va a media escala
  const filas = [];
  for (const arg of ids) {
    const [id, r] = arg.split(':');
    const e = entrada(id);
    const buf = await nueveDieciseis(e, r === undefined ? undefined : Number(r));
    const piezas = [];
    const regla = Buffer.from(`<svg width="${ANCHO}" height="${ALTO}">${[...Array(9)].map((_, i) =>
      `<line x1="${(i + 1) * ANCHO / 10}" y1="0" x2="${(i + 1) * ANCHO / 10}" y2="${ALTO}" stroke="#ff0" stroke-width="3"/>`).join('')}</svg>`);
    piezas.push(await sharp(await sharp(buf).composite([{ input: regla }]).png().toBuffer()).resize(Math.round(662 * E * ANCHO / ALTO), Math.round(662 * E)).png().toBuffer());
    for (const x of [0, 25, 50, 75, 100]) piezas.push(await sharp(await celda(buf, 236, 662, x)).resize(Math.round(236 * E)).png().toBuffer());
    piezas.push(await sharp(await celda(buf, 453, 662, 50)).resize(Math.round(453 * E)).png().toBuffer());
    piezas.push(await sharp(await celda(buf, 390, 384, 50)).resize(Math.round(390 * E)).png().toBuffer());
    const metas = await Promise.all(piezas.map((p) => sharp(p).metadata()));
    const alto = Math.max(...metas.map((m) => m.height)) + 30;
    const anchoFila = metas.reduce((s, m) => s + m.width + G, G);
    let xx = G;
    const comp = [{ input: texto(`${e.id} · ${e.proyecto ?? 'sin proyecto'} · ${e.servicios[0]} · ${e.estado}`
      + `${r ? ` · recorte ${r}` : ''}  |  9:16 · reposo x=0/25/50/75/100 · abierto · movil`, anchoFila, 28, 18), top: 0, left: 0 }];
    piezas.forEach((p, i) => { comp.push({ input: p, top: 30, left: xx }); xx += metas[i].width + G; });
    filas.push(await sharp({ create: { width: anchoFila, height: alto, channels: 3, background: '#333' } })
      .composite(comp).png().toBuffer());
  }
  const metas = await Promise.all(filas.map((f) => sharp(f).metadata()));
  const W = Math.max(...metas.map((m) => m.width));
  let y = 0;
  const comp = filas.map((f, i) => { const c = { input: f, top: y, left: 0 }; y += metas[i].height; return c; });
  process.stdout.write(await sharp({ create: { width: W, height: y, channels: 3, background: '#333' } })
    .composite(comp).jpeg({ quality: 82 }).toBuffer());
}

async function deriva() {
  const paneles = CATEGORIAS.filter((c) => c.panel);
  if (paneles.length !== 6) throw new Error(`hay ${paneles.length} categorias con panel, no 6`);
  for (const c of paneles) {
    const buf = await nueveDieciseis(entrada(c.panel.bancoId), c.panel.recorte);
    for (const [w, suf] of [[ANCHO, ''], [800, '-p-800'], [500, '-p-500']]) {
      const f = path.join(DESTINO, `gallery-panel-${c.slug}${suf}.webp`);
      await sharp(buf).resize(w).webp({ quality: 80 }).toFile(f);   // sharp no copia metadatos si no se le pide
      console.log(`  ${path.relative(RAIZ, f)}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
    }
  }
}

const args = process.argv.slice(2);
if (args[0] === '--hoja') await hoja(args.slice(1));
else await deriva();
