// PUERTA de la Fase 2. Falla si algo de lo que la migración necesita no está o no es lo que dice ser.
// Probada en rojo: ver la bitácora.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, '_source/assets-manifest.json'), 'utf8'));
const A = Object.entries(man.assets);
let fallos = 0;
const mal = (msg) => { console.log(`  🔴 ${msg}`); fallos++; };
const check = (n, cond, detalle = '') => console.log(`  ${cond ? '✅' : '🔴'} ${n}${detalle ? ' — ' + detalle : ''}`) || (cond || fallos++);

// firmas reales: un 403 guardado como .webp es un fichero de 0 dimensiones que parece existir
const MAGIC = {
  png: b => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: b => b[0] === 0xff && b[1] === 0xd8, jpeg: b => b[0] === 0xff && b[1] === 0xd8,
  webp: b => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP',
  avif: b => b.slice(4, 8).toString() === 'ftyp',
  svg: b => /<svg[\s>]/i.test(b.slice(0, 4096).toString('utf8')),
  pdf: b => b.slice(0, 5).toString() === '%PDF-',
  mp4: b => b.slice(4, 8).toString() === 'ftyp',
  webm: b => b[0] === 0x1a && b[1] === 0x45,
};

console.log('\n── 1. todo lo referenciado existe en disco');
const faltan = A.filter(([, a]) => !fs.existsSync(path.join(ROOT, a.archivo)));
check('0 ficheros ausentes', faltan.length === 0, `${faltan.length} ausentes`);

console.log('\n── 2. cada fichero ES lo que su extensión dice');
let corruptos = 0, vacios = 0;
for (const [, a] of A) {
  const f = path.join(ROOT, a.archivo);
  if (!fs.existsSync(f)) continue;
  const b = fs.readFileSync(f);
  if (b.length === 0) { vacios++; continue; }
  const ext = path.extname(f).slice(1).toLowerCase();
  if (MAGIC[ext] && !MAGIC[ext](b)) { corruptos++; if (corruptos <= 5) console.log(`     ${a.archivo}`); }
}
check('0 ficheros vacíos', vacios === 0, `${vacios}`);
check('0 con cabecera que no casa', corruptos === 0, `${corruptos}`);

console.log('\n── 3. el sha256 del manifiesto casa con el disco');
let desfase = 0;
for (const [, a] of A) {
  const f = path.join(ROOT, a.archivo);
  if (!fs.existsSync(f)) continue;
  if (crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== a.sha256) desfase++;
}
check('0 desfases sha256', desfase === 0, `${desfase}`);

console.log('\n── 4. dimensiones para cada imagen (hacen falta para width/height)');
const sinDim = A.filter(([, a]) => !a.dim && !/\.(pdf|mp4|webm)$/i.test(a.publico));
check('0 imágenes sin dimensiones', sinDim.length === 0, `${sinDim.length}`);

console.log('\n── 5. Sanity: ningún AVIF sin su máster JPEG (Sanity no procesa AVIF)');
const avif = A.filter(([, a]) => /\.avif$/i.test(a.publico));
const sinMaster = avif.filter(([, a]) => !a.sanityMaster || !fs.existsSync(path.join(ROOT, a.sanityMaster)));
check(`${avif.length} AVIF, todos con máster`, sinMaster.length === 0, `${sinMaster.length} sin máster`);
let mastersMal = 0;
for (const [, a] of avif) {
  if (!a.sanityMaster) continue;
  const b = fs.readFileSync(path.join(ROOT, a.sanityMaster));
  if (!(b[0] === 0xff && b[1] === 0xd8)) mastersMal++;
}
check('0 másters que no son JPEG válido', mastersMal === 0, `${mastersMal}`);

console.log('\n── 6. ningún nombre de fichero conserva basura de Webflow');
const sucios = A.filter(([, a]) => /[0-9a-f]{24}|%[0-9a-f]{2}|\s/i.test(path.basename(a.publico)));
check('0 nombres con hash, %-escape o espacio', sucios.length === 0, `${sucios.length}`);
sucios.slice(0, 5).forEach(([, a]) => console.log(`     ${a.publico}`));

console.log('\n── 7. colisiones: mismo destino, contenido distinto');
const porRuta = new Map(); let colision = 0;
for (const [, a] of A) {
  if (porRuta.has(a.publico) && porRuta.get(a.publico) !== a.sha256) colision++;
  porRuta.set(a.publico, a.sha256);
}
check('0 colisiones sin resolver', colision === 0, `${colision}`);

console.log('\n── 8. cobertura: el inventario entero está en el manifiesto');
const inv = fs.readFileSync(path.join(ROOT, '_source/assets-inventory.csv'), 'utf8').split('\n').length - 2;
const remotos = A.filter(([u]) => u.startsWith('http')).length;
check(`${remotos}/${inv} remotos del inventario`, remotos >= inv, `faltan ${inv - remotos}`);

console.log('\n── 9. acoplamiento git ↔ despliegue (la puerta que faltó en Pergola Plus)');
// Vercel construye desde el clon de git: lo que no esté versionado no existe en el build.
// Aquí solo se puede comprobar el cromo, porque las páginas aún no existen. En la Fase 10,
// `check:git` tiene que barrer dist/ y exigir que TODO lo que pida por ruta local esté en
// `git ls-files` — nunca en el disco.
import { execSync } from 'node:child_process';
let enGit = new Set();
try { enGit = new Set(execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)); } catch {}
const cromo = A.filter(([, a]) => a.publico.startsWith('/images/site/') || a.publico.startsWith('/videos/'));
const referenciados = cromo.filter(([, a]) => !/\/videos\/bg-video(-1|-3d)?\.mp4$/.test(a.publico));
const fuera = referenciados.filter(([, a]) => !enGit.has(a.archivo));
check(`${referenciados.length} assets de cromo, todos versionados`, fuera.length === 0, `${fuera.length} fuera de git`);
fuera.slice(0, 5).forEach(([, a]) => console.log(`     ${a.archivo}`));
console.log('     nota: el resto de public/ está ignorado a propósito — su destino es Sanity (Fase 3).');

console.log(`\n${fallos === 0 ? '✅ PUERTA VERDE' : `🔴 PUERTA ROJA — ${fallos} fallo(s)`}`);
process.exit(fallos ? 1 : 0);
