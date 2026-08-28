// FASE 2 — descarga TODOS los assets y los deja clasificados en public/.
//
// Invariantes que este script sostiene (cada uno costó una revisión en una migración anterior):
//  1. DETERMINISTA: se funde por URL antes de tocar la red (el inventario ya lo hace) y el
//     orden de escritura sale del orden del inventario, no del orden de llegada de la red.
//  2. REANUDABLE: si el fichero ya está y su sha256 coincide con el manifiesto, no se rebaja.
//  3. NUNCA BORRA EL DESTINO: escribe encima. Un `rm -rf` sobre public/ ya se llevó 20 ficheros
//     no regenerables en Pergola Plus.
//  4. Los AVIF llevan un máster JPEG aparte: Sanity NO procesa AVIF al subir.
//
// Salida: public/{images,videos,brochures}/** + _source/assets-manifest.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const EXPORT = path.join(ROOT, '_source/webflow-export');
const MANIFEST = path.join(ROOT, '_source/assets-manifest.json');
const SANITY = path.join(ROOT, '_source/sanity-masters');
const CONC = 8;              // Sanity corta a 25 en vuelo; el CDN de Webflow tampoco agradece más
const REINTENTOS = 3;

const log = (...a) => console.log(...a);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

function parseCsv(t) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const h = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}

// ─────────────────────────────────────────── destino de cada asset
const VIDEO = /\.(mp4|webm)$/i, PDF = /\.pdf$/i;
function destino(a) {
  const usos = a.usos.split(' | ');
  // `css:` cuenta como CROMO igual que `html:`. Sin esta línea, un asset referenciado solo
  // desde el CSS del sitio se tomaba por uso de colección y acababa en
  // `images/css:outdoorliving-shared/sin-slug/` — y la puerta salía VERDE, porque todos sus
  // checks miran coherencia contra el manifiesto, no si el destino tiene sentido. Lo cazó
  // el contador de cromo bajando de 226 a 208; ahora lo caza el check 10.
  const cms = usos.filter(u => !u.startsWith('html:') && !u.startsWith('css:'));
  if (PDF.test(a.nombreFinal)) return { dir: 'brochures', sub: '' };
  if (VIDEO.test(a.nombreFinal)) return { dir: 'videos', sub: '' };
  if (!cms.length) return { dir: 'images', sub: 'site' };        // solo referenciado desde el HTML → cromo
  const [campo, slug] = cms[0].split('#');                        // el primer uso manda: el inventario está ordenado
  const [col] = campo.split('.');
  return { dir: 'images', sub: `${col}/${slugify(slug || 'sin-slug')}` };
}

// La extensión sale de los BYTES, no del nombre: el export de Webflow trae 6 ficheros
// con extensión .avif cuyo contenido es WebP. Con el nombre mintiendo, Sanity los rechaza
// y la conversión avif->jpeg se aplica a algo que no es AVIF.
function extensionReal(buf, nombre) {
  const b = buf;
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (b[0] === 0x89 && b.slice(1, 4).toString() === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.slice(4, 8).toString() === 'ftyp') {
    const marca = b.slice(8, 12).toString();
    return /avif|avis|mif1|msf1/.test(marca) ? 'avif' : 'mp4';
  }
  if (b[0] === 0x1a && b[1] === 0x45) return 'webm';
  if (b.slice(0, 5).toString() === '%PDF-') return 'pdf';
  if (/<svg[\s>]/i.test(b.slice(0, 4096).toString('utf8'))) return 'svg';
  return path.extname(nombre).slice(1).toLowerCase();
}

// ─────────────────────────────────────────── dimensiones
function dimensiones(file) {
  if (/\.svg$/i.test(file)) {
    const s = fs.readFileSync(file, 'utf8').slice(0, 2000);
    const w = s.match(/\bwidth="([\d.]+)/), h = s.match(/\bheight="([\d.]+)/);
    if (w && h) return { w: Math.round(+w[1]), h: Math.round(+h[1]) };
    const vb = s.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
    return vb ? { w: Math.round(+vb[1]), h: Math.round(+vb[2]) } : null;
  }
  if (PDF.test(file) || VIDEO.test(file)) return null;
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
    const w = out.match(/pixelWidth:\s*(\d+)/), h = out.match(/pixelHeight:\s*(\d+)/);
    if (w && h) return { w: +w[1], h: +h[1] };
  } catch {}
  try { // respaldo: algunos AVIF los decodifica ffmpeg y sips no
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    const [w, h] = out.trim().split(',').map(Number);
    if (w && h) return { w, h };
  } catch {}
  return null;
}

// máster para Sanity: solo hace falta cuando el original es AVIF
function masterSanity(file, rel) {
  if (!/\.avif$/i.test(file)) return null;
  const out = path.join(SANITY, rel.replace(/\.avif$/i, '.jpg'));
  if (fs.existsSync(out)) return path.relative(ROOT, out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    fs.copyFileSync(file, out + '.tmp.avif');
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', out + '.tmp.avif', '--out', out], { stdio: 'pipe' });
    fs.unlinkSync(out + '.tmp.avif');
  } catch {
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-q:v', '2', out], { stdio: 'pipe' }); }
    catch { return null; }
  }
  return fs.existsSync(out) ? path.relative(ROOT, out) : null;
}

// ─────────────────────────────────────────── entradas
const inv = parseCsv(fs.readFileSync(path.join(ROOT, '_source/assets-inventory.csv'), 'utf8'));
const previo = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { assets: {} };

// locales del export: se tratan igual, pero sin red
const locales = [];
for (const d of ['images', 'videos']) {
  const dir = path.join(EXPORT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => !x.startsWith('.'))) {
    locales.push({ local: path.join(dir, f), nombre: f, dir: d });
  }
}

log(`entradas: ${inv.length} remotos + ${locales.length} locales del export`);
fs.mkdirSync(SANITY, { recursive: true });

// ─────────────────────────────────────────── descarga
async function bajar(url) {
  let ultimo;
  for (let i = 0; i < REINTENTOS; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (migracion mrandmrs)' } });
      if (!r.ok) { ultimo = `HTTP ${r.status}`; if (r.status === 404 || r.status === 403) break; continue; }
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { ultimo = e.message; }
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  throw new Error(ultimo || 'fallo');
}

const porSha = new Map();     // sha256 -> ruta relativa ya escrita (deduplicación real)
const usados = new Map();     // ruta relativa -> sha, para detectar colisión de nombre
const manifest = { generado: null, assets: {} };
const fallos = [];

async function procesar(entrada, idx, total) {
  const { url, nombreFinal, alt, usos, local } = entrada;
  const dst = destino(entrada);
  let buf;
  try {
    if (local) buf = fs.readFileSync(local);
    else {
      const yaHecho = previo.assets[url];
      const ruta = yaHecho && path.join(ROOT, yaHecho.archivo);
      if (yaHecho && ruta && fs.existsSync(ruta) && sha(fs.readFileSync(ruta)) === yaHecho.sha256) {
        buf = fs.readFileSync(ruta);                    // reanudable: no se rebaja
      } else buf = await bajar(url);
    }
  } catch (e) { fallos.push({ url, error: e.message }); return; }

  const h = sha(buf);
  const extOk = extensionReal(buf, nombreFinal);
  const nombre = nombreFinal.replace(/\.[^.]+$/, '') + '.' + extOk;
  let rel;
  if (porSha.has(h)) {
    rel = porSha.get(h);                                 // mismo contenido → un solo fichero
  } else {
    let base = nombre;
    rel = path.join(dst.dir, dst.sub, base);
    if (usados.has(rel) && usados.get(rel) !== h) {       // colisión REAL: mismo nombre, contenido distinto
      const ctx = (usos.split(' | ')[0] || '').replace(/^html:/, '').replace(/\.html$/, '').replace(/[.#]/g, '-');
      const ext = path.extname(base);
      rel = path.join(dst.dir, dst.sub, `${path.basename(base, ext)}--${slugify(ctx)}${ext}`);
    }
    const abs = path.join(PUB, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);                          // escribe encima, nunca borra el destino
    porSha.set(h, rel); usados.set(rel, h);
  }

  const abs = path.join(PUB, rel);
  manifest.assets[url || `local:${nombre}`] = {
    archivo: path.relative(ROOT, abs),
    publico: '/' + rel,
    sha256: h,
    bytes: buf.length,
    alt: alt || '',
    dim: dimensiones(abs),
    sanityMaster: masterSanity(abs, rel),
    usos: (usos || '').split(' | ').filter(Boolean),
  };
  if ((idx + 1) % 60 === 0) log(`  ${idx + 1}/${total}`);
}

// cola con concurrencia fija, pero el manifiesto se ordena al final → salida determinista
const tareas = [
  ...inv.map(a => ({ ...a })),
  ...locales.map(l => ({ url: '', nombreFinal: l.nombre.toLowerCase().replace(/[^a-z0-9.]+/g, '-'), alt: '', usos: `html:export/${l.dir}`, local: l.local })),
];
log(`descargando con concurrencia ${CONC}…`);
let cursor = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (cursor < tareas.length) { const i = cursor++; await procesar(tareas[i], i, tareas.length); }
}));

// orden estable
manifest.generado = 'ver git log';
manifest.assets = Object.fromEntries(Object.entries(manifest.assets).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// ─────────────────────────────────────────── resumen
const A = Object.values(manifest.assets);
const bytes = A.reduce((s, a) => s + a.bytes, 0);
const porDir = {}, porExt = {};
for (const a of A) {
  porDir[a.publico.split('/')[1]] = (porDir[a.publico.split('/')[1]] || 0) + 1;
  const e = path.extname(a.publico).slice(1); porExt[e] = (porExt[e] || 0) + 1;
}
log(`\n─────────── FASE 2`);
log(`referencias procesadas : ${A.length}`);
log(`ficheros en disco      : ${porSha.size}  (${(bytes / 1e6).toFixed(1)} MB de referencias, dedup incluido)`);
log(`por carpeta            : ${JSON.stringify(porDir)}`);
log(`por extensión          : ${JSON.stringify(porExt)}`);
log(`másters JPEG p/ Sanity : ${A.filter(a => a.sanityMaster).length}`);
log(`sin dimensiones        : ${A.filter(a => !a.dim && !/\.(pdf|mp4|webm)$/i.test(a.publico)).length}`);
log(`sin alt (no svg/pdf)   : ${A.filter(a => !a.alt && !/\.(svg|pdf)$/i.test(a.publico)).length}`);
if (fallos.length) { log(`\n🔴 FALLOS (${fallos.length}):`); fallos.forEach(f => log(`   ${f.error}  ${f.url}`)); }
else log(`\n✅ 0 fallos de descarga`);
