/**
 * ENCAJE DE UNA FOTO EN UN HUECO — PROMPT-LOOP-IMAGENES §5 F0.
 *
 * Recorta la foto como lo haria `object-fit: cover` + `object-position` en la caja real del
 * hueco en los 4 anchos del casting, sombrea la zona que tapa texto y deja una tira JPG. Es lo
 * que mira el casting y lo que mira el juez: la foto AL TAMANO DEL HUECO, no al 100 %.
 *
 *     node scripts/encaje-foto.mjs <src> <hueco> [pos] [--out fichero.jpg]
 *
 *     src    /images/banco/pergolas/x.webp  (relativo a public/)  o una ruta de disco
 *     hueco  heroe | galeria | proceso | inversion | faq0 | faq1 | faq3 | menu | full
 *     pos    object-position, por defecto "50% 50%"
 *
 * Las cajas salen de `docs/encargos/LOOP-IMAGENES-ESTADO.json` (`cajas`, medidas por
 * `medir-cajas.mjs`). Un ancho sin caja (menu <992, faq3 <1440) no se pinta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iOut = args.indexOf('--out');
const out = iOut >= 0 ? args.splice(iOut, 2)[1] : null;
const [src, hueco, pos = '50% 50%'] = args;
if (!src || !hueco) { console.error('uso: encaje-foto.mjs <src> <hueco> [pos] [--out f.jpg]'); process.exit(2); }

const ESTADO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json'), 'utf8'));
const cajas = ESTADO.cajas.huecos[hueco];
if (!cajas) { console.error(`hueco desconocido: ${hueco}. Hay: ${Object.keys(ESTADO.cajas.huecos).join(' ')}`); process.exit(2); }
// El contador «1 / 7» de Full-Service es una segunda zona de texto sobre la misma caja.
const extra = hueco === 'full' ? ESTADO.cajas.huecos.full_contador : null;

const fichero = src.startsWith('/images/') ? path.join(RAIZ, 'public', src) : path.resolve(src);
const meta = await sharp(fichero).metadata();
const [px, py] = pos.split(/\s+/).map((v) => parseFloat(v) / 100);

const GAP = 24;
const paneles = [];
for (const ancho of ESTADO.cajas.anchos) {
  const m = cajas[ancho];
  if (!m) continue;
  const [W, H] = m.caja;
  // cover: escala hasta cubrir, y object-position reparte el sobrante.
  const esc = Math.max(W / meta.width, H / meta.height);
  const sw = meta.width * esc, sh = meta.height * esc;
  const left = Math.round(((sw - W) * px) / esc), top = Math.round(((sh - H) * py) / esc);
  const w = Math.min(meta.width - left, Math.round(W / esc)), h = Math.min(meta.height - top, Math.round(H / esc));
  let img = sharp(fichero).extract({ left, top, width: w, height: h }).resize(W, H);
  const zonas = [m.texto, extra?.[ancho]?.texto].filter(Boolean);
  const rects = zonas.map((t) => `<rect x="${t.x * W}" y="${t.y * H}" width="${t.w * W}" height="${t.h * H}" fill="#0b1e3a" fill-opacity="0.55" stroke="#ffd166" stroke-width="2"/>`).join('');
  const rotulo = `<text x="8" y="22" font-family="Helvetica,Arial" font-size="18" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${ancho} · ${W}x${H}</text>`;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}${rotulo}</svg>`);
  paneles.push({ buf: await img.composite([{ input: svg }]).png().toBuffer(), W, H });
}
if (!paneles.length) { console.error(`el hueco ${hueco} no tiene caja en ningun ancho`); process.exit(2); }

const total = paneles.reduce((s, p) => s + p.W, 0) + GAP * (paneles.length - 1);
const alto = Math.max(...paneles.map((p) => p.H));
let x = 0;
const comp = paneles.map((p) => { const c = { input: p.buf, left: x, top: 0 }; x += p.W + GAP; return c; });
const destino = out ?? path.join(RAIZ, 'banco/.trabajo/loop-imagenes/encaje',
  `${path.basename(fichero).replace(/\.[^.]+$/, '')}--${hueco}--${pos.replace(/[%\s]+/g, '_')}.jpg`);
fs.mkdirSync(path.dirname(destino), { recursive: true });
await sharp({ create: { width: total, height: alto, channels: 3, background: '#222' } })
  .composite(comp).jpeg({ quality: 82 }).toFile(destino);
console.log(destino);
