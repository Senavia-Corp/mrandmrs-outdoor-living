// BANCO DE IMÁGENES — deriva lo aprobado, pinta las hojas de contactos y valida el índice.
//
//   node scripts/build-banco.mjs           deriva a public/images/banco/ lo aprobado que falte
//   node scripts/build-banco.mjs --hojas   regenera banco/hojas/<servicio>-<etapa>-NN.jpg
//   node scripts/build-banco.mjs --check   PUERTA: no escribe nada, sale con 1 si algo no cuadra
//
// La fuente de verdad es src/data/banco-imagenes.json. Los originales viven fuera del repo
// (BANCO_ORIGEN); solo hacen falta para derivar, no para --check ni --hojas.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const INDICE = path.join(ROOT, 'src/data/banco-imagenes.json');
const PUB = path.join(ROOT, 'public');
const BANCO = path.join(PUB, 'images/banco');
const ORIGEN = process.env.BANCO_ORIGEN || '/Users/senavia/Documents/Pictures Mr and Mrs Outdoor Living';

const SERVICIOS = ['construction', 'remodeling', 'pergolas', 'louvered', 'rooms', 'enclosures', 'screens',
  'kitchens', 'decks', 'landscaping', 'irrigation', 'lighting', 'furniture', 'pole'];
const ETAPAS = ['terminado', 'construccion', 'antes'];
const ESTADOS = ['aprobada', 'aprobada_con_recorte', 'rechazada', 'dudosa', 'duplicado'];
const PROCEDENCIAS = ['obra_real', 'generada_ia', 'stock', 'no_es_del_cliente', 'dudosa'];
const SLUG = /^\/images\/banco\/([a-z]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/;
const VETADO = /(^|-)(north|south|img|dsc|whatsapp)(-|$)/;

const banco = JSON.parse(fs.readFileSync(INDICE, 'utf8'));
const aprobada = (e) => e.estado.startsWith('aprobada');
const enDisco = (e) => path.join(PUB, e.src);

if (process.argv.includes('--check')) {
  let fallos = 0;
  const mal = (e, msg) => { console.log(`  🔴 ${e.id ?? '?'} — ${msg}`); fallos++; };
  const ids = new Set(), srcs = new Set();
  for (const e of banco) {
    if (ids.has(e.id)) mal(e, 'id repetido'); ids.add(e.id);
    if (!ESTADOS.includes(e.estado)) mal(e, `estado «${e.estado}»`);
    if (!PROCEDENCIAS.includes(e.procedencia)) mal(e, `procedencia «${e.procedencia}»`);
    if (!e.origen || !e.sha256) mal(e, 'sin origen o sin sha256');
    if (e.estado === 'duplicado' && !ids.has(e.duplicado_de) && !banco.some(x => x.id === e.duplicado_de)) mal(e, 'duplicado_de no existe');
    if (!aprobada(e) && e.estado !== 'dudosa') continue;
    // de aquí abajo: lo que una sesión futura puede llegar a publicar
    if (!ETAPAS.includes(e.etapa)) mal(e, `etapa «${e.etapa}»`);
    if (!e.servicios?.length || e.servicios.some(s => !SERVICIOS.includes(s))) mal(e, `servicios «${e.servicios}»`);
    if (!e.alt || e.alt.length > 125) mal(e, 'alt vacío o de más de 125 caracteres');
    const m = SLUG.exec(e.src ?? '');
    if (!m) mal(e, `src fuera de norma: ${e.src}`);
    else {
      if (m[1] !== e.servicios?.[0]) mal(e, 'la carpeta no es la del servicio protagonista');
      if (VETADO.test(m[2])) mal(e, `slug con palabra vetada: ${m[2]}`);
      if (m[2].length > 70) mal(e, 'slug de más de 70 caracteres');
    }
    if (srcs.has(e.src)) mal(e, `src repetido: ${e.src}`); srcs.add(e.src);
    if (!aprobada(e)) continue;
    if (e.procedencia !== 'obra_real') mal(e, `aprobada con procedencia «${e.procedencia}»`);
    if (!fs.existsSync(enDisco(e))) { mal(e, 'aprobada sin fichero en disco'); continue; }
    const md = await sharp(enDisco(e)).metadata();
    if (md.exif || md.xmp || md.iptc) mal(e, 'el derivado conserva metadatos (EXIF/XMP/IPTC)');
    if (md.width !== e.ancho || md.height !== e.alto) mal(e, `dimensiones ${md.width}×${md.height} ≠ índice`);
  }
  const servidos = new Set(banco.filter(aprobada).map(e => e.src));
  const huerfanos = fs.existsSync(BANCO)
    ? fs.readdirSync(BANCO, { recursive: true }).filter(f => f.endsWith('.webp')).map(f => '/images/banco/' + f.split(path.sep).join('/')).filter(u => !servidos.has(u))
    : [];
  for (const u of huerfanos) { console.log(`  🔴 fichero sin entrada aprobada: ${u}`); fallos++; }
  console.log(fallos ? `\n🔴 banco: ${fallos} fallo(s)` : `✅ banco: ${banco.length} entradas, ${servidos.size} aprobadas con fichero, sin metadatos`);
  process.exit(fallos ? 1 : 0);
}

if (process.argv.includes('--hojas')) {
  // 4 columnas, no 6: a 6 las fotos mienten sobre lo que enseñan
  const W = 480, H = 360, PAD = 8, LAB = 30, COLS = 4, ROWS = 3;
  const dir = path.join(ROOT, 'banco/hojas');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const grupos = Object.groupBy(banco.filter(aprobada), e => `${e.servicios[0]}-${e.etapa}`);
  for (const [g, lista] of Object.entries(grupos)) {
    for (let i = 0, h = 1; i < lista.length; i += COLS * ROWS, h++) {
      const comp = [];
      for (const [k, e] of lista.slice(i, i + COLS * ROWS).entries()) {
        const x = PAD + (k % COLS) * (W + PAD), y = PAD + Math.floor(k / COLS) * (H + LAB + PAD);
        comp.push({ input: await sharp(enDisco(e)).resize(W, H, { fit: 'contain', background: '#222' }).toBuffer(), left: x, top: y + LAB });
        const t = `${e.id} · ${e.proyecto ?? 'suelta'}${e.estado === 'aprobada_con_recorte' ? ' · RECORTE' : ''}`;
        comp.push({ input: Buffer.from(`<svg width="${W}" height="${LAB}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><text x="6" y="22" font-family="Helvetica" font-size="19" font-weight="bold" fill="#fff">${t}</text></svg>`), left: x, top: y });
      }
      await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + ROWS * (H + LAB + PAD), channels: 3, background: '#555' } })
        .composite(comp).jpeg({ quality: 72 }).toFile(path.join(dir, `${g}-${String(h).padStart(2, '0')}.jpg`));
    }
  }
  console.log(`hojas: ${fs.readdirSync(dir).length} en banco/hojas/`);
  process.exit(0);
}

// derivar: WebP, 1600 px de lado largo, q80. sharp re-codifica desde píxeles y no copia EXIF.
let hechos = 0;
for (const e of banco.filter(aprobada)) {
  const dst = enDisco(e);
  const medidas = (i) => {
    e.ancho = i.width; e.alto = i.height;
    e.orientacion = i.width > i.height * 1.05 ? 'horizontal' : i.height > i.width * 1.05 ? 'vertical' : 'cuadrada';
  };
  if (fs.existsSync(dst)) { medidas(await sharp(dst).metadata()); continue; }
  let src = path.join(ORIGEN, e.origen);
  if (!fs.existsSync(src)) { console.log(`  🔴 ${e.id}: falta el original ${e.origen}`); process.exitCode = 1; continue; }
  // el libvips de sharp no trae HEVC, y hay HEIC con extensión .jpg; sips es de macOS
  if (/\.heic$/i.test(src) || !(await sharp(src).stats().then(() => true, () => false))) {
    const tmp = path.join(os.tmpdir(), `banco-${e.id}.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '100', src, '--out', tmp], { stdio: 'ignore' });
    src = tmp;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  // `recorte` (fracciones del cuadro ya rotado): lo que deja fuera una cara, un número de portal o un cartel.
  // Va en el índice para que re-derivar nunca vuelva a servir el cuadro entero.
  if (e.recorte) {
    const buf = await sharp(src).rotate().toBuffer(), m = await sharp(buf).metadata(), r = e.recorte;
    const width = Math.min(m.width, Math.floor(r.width * m.width)), height = Math.min(m.height, Math.floor(r.height * m.height));
    src = await sharp(buf).extract({ left: Math.min(m.width - width, Math.round(r.left * m.width)), top: Math.min(m.height - height, Math.round(r.top * m.height)), width, height }).toBuffer();
  }
  const info = await sharp(src).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(dst);
  medidas(info);
  hechos++;
}
fs.writeFileSync(INDICE, JSON.stringify(banco, null, 2) + '\n');
console.log(`derivadas ${hechos}; aprobadas en total ${banco.filter(aprobada).length}`);
