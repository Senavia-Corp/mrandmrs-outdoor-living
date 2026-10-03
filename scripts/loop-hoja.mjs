/**
 * HOJA DE REVISION DE UNA UNIDAD — PROMPT-LOOP-IMAGENES §4.8.
 * Una fila por hueco: antes | despues, recortadas a la caja real del hueco (el panel de 1440, o el
 * mayor que exista), con el veredicto. Sale en banco/.trabajo/loop-imagenes/<unidad>.jpg.
 *     node scripts/loop-hoja.mjs <unidad>
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unidad = process.argv[2];
const estado = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json'), 'utf8'));
const u = estado.unidades.find((x) => x.id === unidad);
const cajaDe = (h) => h.startsWith('galeria') ? 'galeria' : h.startsWith('proceso') ? 'proceso' : h === 'faq[0]' ? 'faq0' : /^faq\[[12]\]/.test(h) ? 'faq1' : h.startsWith('faq') ? 'faq3' : h;
const tmp = path.join(RAIZ, 'banco/.trabajo/loop-imagenes', unidad, 'hoja-tmp'); fs.mkdirSync(tmp, { recursive: true });
const ancho = (caja) => { const c = estado.cajas.huecos[caja]; return [1440, 991, 768, 390].find((a) => c[a]); };
const panel = async (src, caja, pos, nombre) => {
  const f = path.join(tmp, nombre + '.jpg');
  execFileSync('node', [path.join(RAIZ, 'scripts/encaje-foto.mjs'), src, caja, pos ?? '50% 50%', '--out', f]);
  const a = ancho(caja); const [W, H] = estado.cajas.huecos[caja][a].caja;
  // el panel de ese ancho es el ULTIMO de la tira (los anchos van en orden creciente)
  const m = await sharp(f).metadata();
  return sharp(f).extract({ left: m.width - W, top: 0, width: W, height: H }).png().toBuffer().then((b) => ({ b, W, H }));
};
const filas = [];
const ESC = 0.5; // la hoja se mira entera: a mitad de tamano cabe
for (const h of u.huecos) {
  if (h.estado !== 'canjeada') continue;
  const caja = cajaDe(h.hueco);
  const A = await panel(h.antes, caja, '50% 50%', h.hueco.replace(/[\[\]]/g, '_') + '-antes');
  const B = await panel(h.despues, caja, h.pos, h.hueco.replace(/[\[\]]/g, '_') + '-despues');
  const w = Math.round(A.W * ESC), hh = Math.round(A.H * ESC);
  const rot = Buffer.from(`<svg width="${w * 2 + 20}" height="${hh + 30}"><text x="4" y="20" font-family="Helvetica" font-size="16" font-weight="700" fill="#ffd166">${h.hueco}  ·  antes | despues  ·  ${h._banco} ${h.pos ?? ''}  ·  juez: ${h.juez ?? '-'}</text></svg>`);
  const fila = await sharp({ create: { width: w * 2 + 20, height: hh + 30, channels: 3, background: '#111' } })
    .composite([{ input: rot, left: 0, top: 0 }, { input: await sharp(A.b).resize(w, hh).png().toBuffer(), left: 0, top: 30 }, { input: await sharp(B.b).resize(w, hh).png().toBuffer(), left: w + 20, top: 30 }]).png().toBuffer();
  filas.push({ b: fila, w: w * 2 + 20, h: hh + 30 });
}
const Wt = Math.max(...filas.map((f) => f.w)), Ht = filas.reduce((s, f) => s + f.h + 8, 0);
let y = 0; const comp = filas.map((f) => { const c = { input: f.b, left: 0, top: y }; y += f.h + 8; return c; });
const out = path.join(RAIZ, 'banco/.trabajo/loop-imagenes', `${unidad}.jpg`);
await sharp({ create: { width: Wt, height: Ht, channels: 3, background: '#111' } }).composite(comp).jpeg({ quality: 82 }).toFile(out);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(out, filas.length, 'filas');
