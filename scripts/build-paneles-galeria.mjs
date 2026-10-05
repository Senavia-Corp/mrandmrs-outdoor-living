#!/usr/bin/env node
/**
 * Las seis fotos de la banda «Project Gallery» (las teselas 4:3 de las 55 rutas).
 *
 *     node scripts/build-paneles-galeria.mjs                          # deriva las seis
 *     node scripts/build-paneles-galeria.mjs --hoja bi-0633 bi-0520:50:20 … > hoja.jpg
 *
 * El dato vive en `src/data/galeria-categorias.json` -> `categorias[].panel`
 * (`bancoId`, y `x`/`y` = object-position en %). Se recorta la foto del BANCO, no el original:
 * ya viene sin EXIF y con los recortes de privacidad hechos (BANCO-IMAGENES.md, regla 6).
 *
 * GALERIA-REJILLA (5-oct-2026): antes era un 9:16 a toda la altura para el acordeon vertical;
 * ahora es un 4:3 apaisado, el formato de la tesela desde 768. Las cuentas del recorte y de las
 * variantes (480/800/1200/1600 hasta el ancho del recorte) son `recorteTesela()` de
 * `src/lib/galeria-categorias.mjs`: el `srcset` que pinta la banda y los ficheros que salen de
 * aqui son la misma lista por construccion. WebP q78, sin metadatos.
 *
 * LA HOJA SE JUZGA POR LO QUE PINTA LA TESELA, no por la foto entera. Por cada candidata: la
 * tesela de escritorio (4:3, 640x480 = 1920/3) y la de movil (3:2, 479x319) con `x`/`y`, las
 * dos con el degradado de `caracteristicas.css` pintado y la caja donde cae el texto marcada:
 * el texto blanco tiene que caer en zona tranquila, y lo que mande el contraste es el pixel
 * MAS CLARO de esa caja, no la media.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PANELES, recorteTesela, fotoTesela } from '../src/lib/galeria-categorias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'public/images/obra/teselas');
const CALIDAD = 78;

/** El 4:3 centrado en (x, y) % sobre lo que sobre; en las fotos 4:3 del banco no sobra nada. */
async function cuatroTercios(c) {
  const { ficha: e, ancho, alto } = recorteTesela(c);
  const left = Math.round((e.ancho - ancho) * (c.panel.x ?? 50) / 100);
  const top = Math.round((e.alto - alto) * (c.panel.y ?? 50) / 100);
  return sharp(path.join(RAIZ, 'public', e.src)).extract({ left, top, width: ancho, height: alto }).toBuffer();
}

/** `object-fit: cover` + `object-position: x% y%` de una tesela w×h, con el degradado y la caja del texto. */
async function tesela(buf, w, h, x, y) {
  const m = await sharp(buf).metadata();
  const k = Math.max(w / m.width, h / m.height);
  const sw = Math.round(m.width * k), sh = Math.round(m.height * k);
  const pie = Math.round(h * 0.42);
  const capa = Buffer.from(`<svg width="${w}" height="${h}"><defs><linearGradient id="v" x1="0" y1="1" x2="0" y2="0">`
    + '<stop offset="0" stop-color="#001c63" stop-opacity="0.9"/><stop offset="0.3" stop-color="#001c63" stop-opacity="0.72"/>'
    + '<stop offset="0.6" stop-color="#001c63" stop-opacity="0"/></linearGradient></defs>'
    + `<rect width="${w}" height="${h}" fill="url(#v)"/>`
    + `<rect x="16" y="${h - pie}" width="${Math.round(w * 0.8)}" height="${pie - 16}" fill="none" stroke="#ff0" stroke-dasharray="6 4"/></svg>`);
  return sharp(buf).resize(sw, sh)
    .extract({ left: Math.round((sw - w) * x / 100), top: Math.round((sh - h) * y / 100), width: w, height: h })
    .composite([{ input: capa }]).png().toBuffer();
}

const rotulo = (s, w) => Buffer.from(`<svg width="${w}" height="28"><text x="4" y="20" `
  + `font-family="Helvetica" font-size="18" fill="#fff">${s}</text></svg>`);

async function hoja(args) {
  const G = 12, filas = [];
  for (const arg of args) {
    const [id, x = 50, y = 50] = arg.split(':');
    const c = { slug: id, panel: { bancoId: id, x: +x, y: +y } };
    const buf = await cuatroTercios(c);
    const piezas = [await tesela(buf, 640, 480, +x, +y), await tesela(buf, 479, 319, +x, +y)];
    const metas = await Promise.all(piezas.map((p) => sharp(p).metadata()));
    const anchoFila = metas.reduce((s, m) => s + m.width + G, G);
    const comp = [{ input: rotulo(`${id} · ${recorteTesela(c).ficha.estado} · x ${x} y ${y}  |  escritorio 640x480 · movil 479x319`, anchoFila), top: 0, left: 0 }];
    let xx = G;
    piezas.forEach((p, i) => { comp.push({ input: p, top: 30, left: xx }); xx += metas[i].width + G; });
    filas.push(await sharp({ create: { width: anchoFila, height: 30 + 480 + G, channels: 3, background: '#333' } }).composite(comp).png().toBuffer());
  }
  const metas = await Promise.all(filas.map((f) => sharp(f).metadata()));
  let y = 0;
  const comp = filas.map((f, i) => { const c = { input: f, top: y, left: 0 }; y += metas[i].height; return c; });
  process.stdout.write(await sharp({ create: { width: Math.max(...metas.map((m) => m.width)), height: y, channels: 3, background: '#333' } })
    .composite(comp).jpeg({ quality: 82 }).toBuffer());
}

async function deriva() {
  if (PANELES.length !== 6) throw new Error(`hay ${PANELES.length} categorias con panel, no 6`);
  fs.mkdirSync(DESTINO, { recursive: true });
  for (const c of PANELES) {
    const { anchos, alto, ancho } = recorteTesela(c);
    const buf = await cuatroTercios(c);
    for (const w of anchos) {
      const f = path.join(RAIZ, 'public', fotoTesela(c, w));
      await sharp(buf).resize(w, Math.round(w * alto / ancho)).webp({ quality: CALIDAD }).toFile(f);   // sin metadatos: sharp no los copia si no se le pide
      console.log(`  ${path.relative(RAIZ, f)}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
    }
  }
}

const args = process.argv.slice(2);
if (args[0] === '--hoja') await hoja(args.slice(1));
else await deriva();
