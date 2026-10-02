/** Apila tiras JPG en una sola imagen con rotulo, para mirar varias candidatas de un vistazo.
 *  node scripts/apilar-tiras.mjs salida.jpg [ancho_max] rotulo=fichero ... */
import sharp from 'sharp';
const [out, anchoMax = '2400', ...pares] = process.argv.slice(2);
const W = +anchoMax;
const partes = [];
for (const p of pares) {
  const i = p.indexOf('='); const rot = p.slice(0, i), f = p.slice(i + 1);
  const m = await sharp(f).metadata();
  const esc = Math.min(1, W / m.width); const w = Math.round(m.width * esc), h = Math.round(m.height * esc);
  const svg = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${Math.min(w, 20 + rot.length * 12)}" height="28" fill="#000" fill-opacity=".75"/><text x="8" y="20" font-family="Helvetica" font-size="18" font-weight="700" fill="#ffd166">${rot}</text></svg>`);
  partes.push({ buf: await sharp(f).resize(w, h).composite([{ input: svg }]).png().toBuffer(), w, h });
}
const H = partes.reduce((s, p) => s + p.h + 10, 0);
let y = 0; const comp = partes.map((p) => { const c = { input: p.buf, left: 0, top: y }; y += p.h + 10; return c; });
await sharp({ create: { width: Math.max(...partes.map((p) => p.w)), height: H, channels: 3, background: '#111' } }).composite(comp).jpeg({ quality: 80 }).toFile(out);
console.log(out);
