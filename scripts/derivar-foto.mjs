/**
 * DERIVAR UNA FOTO DEL BANCO PARA UN HUECO — PROMPT-LOOP-IMAGENES §6.4.
 *
 * Recorte `cover` a una proporcion + `pos`, reescalado a un ancho, sin metadatos, en AVIF o JPEG.
 * Solo recorte y codificacion: nada generativo. El `.webp` del banco no se toca; el resultado va
 * a `public/images/obra/<obra-NNN>/<nombre>` y el JSON lleva `_banco` y `_ajuste` (esta receta).
 *
 *     node scripts/derivar-foto.mjs <src-banco> <ratio> <pos> <ancho> <salida> [--q 52]
 *     ratio: "1408/768" o "1.833" · pos: "50% 40%" · salida .avif o .jpg
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iq = args.indexOf('--q'); const q = iq >= 0 ? +args.splice(iq, 2)[1] : 52;
const [src, ratioTxt, pos, anchoTxt, salida] = args;
if (!salida) { console.error('uso: derivar-foto.mjs <src> <ratio> <pos> <ancho> <salida> [--q 52]'); process.exit(2); }
const ratio = ratioTxt.includes('/') ? ratioTxt.split('/').reduce((a, b) => +a / +b) : +ratioTxt;
const fichero = src.startsWith('/images/') ? path.join(RAIZ, 'public', src) : path.resolve(src);
const m = await sharp(fichero).metadata();
const [px, py] = pos.split(/\s+/).map((v) => parseFloat(v) / 100);
let w = m.width, h = Math.round(w / ratio);
if (h > m.height) { h = m.height; w = Math.round(h * ratio); }
const left = Math.round((m.width - w) * px), top = Math.round((m.height - h) * py);
const ancho = Math.min(+anchoTxt, w);
const alto = Math.round(ancho / ratio);
let img = sharp(fichero).extract({ left, top, width: w, height: h }).resize(ancho, alto);
const out = salida.startsWith('/images/') ? path.join(RAIZ, 'public', salida) : path.resolve(salida);
fs.mkdirSync(path.dirname(out), { recursive: true });
img = /\.avif$/i.test(out) ? img.avif({ quality: q }) : img.jpeg({ quality: Math.max(q, 80), mozjpeg: true });
await img.toFile(out); // sharp no copia EXIF/XMP salvo withMetadata(): sale limpio
const st = fs.statSync(out);
console.log(JSON.stringify({ salida: out.replace(RAIZ + '/public', ''), ancho, alto, bytes: st.size, _ajuste: { recorte: ratioTxt, pos, ancho, q, de: src } }));
