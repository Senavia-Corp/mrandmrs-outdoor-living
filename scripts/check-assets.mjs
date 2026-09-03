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

/**
 * ACTIVOS DERIVADOS A PROPÓSITO — el fichero servido YA NO es el que dio Webflow.
 *
 * El manifiesto guarda DOS entradas por activo: la `local:` (lo que se sirve) y la de su URL
 * de origen en el CDN de Webflow (el registro de paridad). Al editar un activo, la local y la
 * remota dejan de casar, y eso enciende las comprobaciones 3 y 7 — que es exactamente lo que
 * deben hacer: avisan de que lo desplegado se ha separado de su origen.
 *
 * La salida NO es igualar los dos hashes. Poner en la entrada remota el sha256 de nuestro
 * fichero afirmaría que el CDN de Webflow sirve nuestro recorte, que es falso, y borraría el
 * único rastro de que aquí hubo una decisión. La entrada remota se queda CONGELADA con el
 * hash del original, y la desviación se declara aquí con su motivo.
 *
 * Lo que se sigue exigiendo, y por eso la puerta no pierde fuerza: la entrada `local:` tiene
 * que casar con el disco (comprobación 3). Si el fichero servido se corrompe, sigue saltando.
 * Solo se perdona el desacuerdo entre la remota congelada y su gemela local.
 */
const DERIVADOS_A_PROPOSITO = {
  '/videos/bg-video-1-mp4.mp4':
    'Recorte del vídeo del héroe de la home, aprobado por Sebastian el 1-sep-2026. El original '
    + 'dura 39,93 s y de 8,57 s a 22,13 s enseña una obra en construcción —excavadora, encofrado, '
    + 'tierra—: el 34 % del bucle, detrás del titular «Licensed Custom Pool Builders». Los dos '
    + 'cortes caen en frontera de plano (detectadas con select=gt(scene,0.30)), así que se quitan '
    + 'cuatro planos enteros sin salto visible. Queda en 26,40 s, toda obra terminada. '
    + 'Reencodado a h264 2135 kbps, el mismo bitrate del original.',
  '/videos/bg-video-1-webm.webm':
    'La pista WebM del mismo recorte, VP8 a 2389 kbps como el original. 26,36 s. '
    + 'Mismo motivo y misma aprobación que el mp4.',

  /* ── R13-COLOR · los 23 tintes de diseno ──────────────────────────────────
   * NO entran aqui, y es la mitad de la decision: los logos de terceros (Sunbrella H14,
   * Alumawood H205, NPT H213, Zodiac H227), los folletos de fabricante, ni las fotos reales
   * de obra de projects/, residentials/ e images/. Retonar la marca de otro es falsificarla,
   * y retonar el trabajo del cliente es peor. Tampoco `design3`: mide H198, que es el tono
   * EXACTO de --mm-cian, o sea el acento frio deliberado del sistema, no una superficie de
   * marca que se hubiera desviado. */
  '/images/site/animateddivs-image-p-1080.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/animateddivs-image-p-1600.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/animateddivs-image-p-500.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/animateddivs-image-p-800.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/animateddivs-image.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/checked.png':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/cta-footer-image-p-1080.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/cta-footer-image-p-1600.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/cta-footer-image-p-500.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/cta-footer-image-p-800.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/cta-footer-image.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/design2-p-1080.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/design2-p-1600.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/design2-p-500.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/design2-p-800.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/design2.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/favicon.png':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/testimonial-image-p-1080.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/testimonial-image-p-1600.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/testimonial-image-p-500.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/testimonial-image-p-800.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/testimonial-image.webp':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
  '/images/site/webclip.png':
    'R13-COLOR (3-sep-2026): tinte de diseno llevado al eje de marca. El tinte de esta imagen '
    + 'estaba HORNEADO en el fichero, no en CSS, asi que ninguna regla lo alcanzaba y el sitio no '
    + 'podia verse uniforme por mucho token que se escribiera. Girado de su tono original al H223 '
    + 'del logo (#001C63) conservando luminancia, y reencodado a webp q95. Dimensiones y formato '
    + 'intactos, verificados uno a uno contra HEAD. La entrada REMOTA conserva el hash del original '
    + 'de Webflow —unica prueba de la migracion, no regenerable—; la LOCAL dice lo que se sirve.',
};
const derivado = (a) => Object.hasOwn(DERIVADOS_A_PROPOSITO, a.publico);
/** true solo para la entrada REMOTA congelada de un activo derivado (la clave es su URL). */
const remotaCongelada = (k, a) => derivado(a) && !k.startsWith('local:');

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
for (const [k, a] of A) {
  const f = path.join(ROOT, a.archivo);
  if (!fs.existsSync(f)) continue;
  if (remotaCongelada(k, a)) continue;   // ver DERIVADOS_A_PROPOSITO
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
  if (derivado(a)) continue;             // ver DERIVADOS_A_PROPOSITO
  if (porRuta.has(a.publico) && porRuta.get(a.publico) !== a.sha256) colision++;
  porRuta.set(a.publico, a.sha256);
}
check('0 colisiones sin resolver', colision === 0, `${colision}`);

// Y se ENSEÑAN, en vez de callarlas. Una excepción que no se ve por pantalla deja de ser una
// excepción declarada y pasa a ser un agujero: nadie revisa lo que no aparece en la salida.
const decl7 = Object.keys(DERIVADOS_A_PROPOSITO);
const vivos = decl7.filter((p) => A.some(([k, a]) => k.startsWith('local:') && a.publico === p));
check(`${decl7.length} activos derivados a propósito, todos con su entrada local`,
  vivos.length === decl7.length, `${decl7.length - vivos.length} declarados que ya no existen`);
for (const p of decl7) console.log(`     ${p}`);

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

console.log('\n── 10. cada destino es una carpeta que existe de verdad');
// La puerta salió VERDE con 11 assets en `public/images/css:outdoorliving-shared/sin-slug/`:
// todos sus checks miran coherencia CONTRA EL MANIFIESTO, y un destino absurdo es
// perfectamente coherente consigo mismo. Un `usos` con prefijo nuevo (`css:`) se colaba como
// si fuera una colección. Esto compara los destinos contra las colecciones que existen de
// verdad, que son los CSV de _source/cms.
const COLECCIONES = new Set(fs.readdirSync(path.join(ROOT, '_source/cms'))
  .filter(f => f.endsWith('.csv')).map(f => f.replace(/\.csv$/, '')));
COLECCIONES.add('site');
const destinosMal = [...new Set(A
  .map(([, a]) => a.publico)
  .filter(p => p.startsWith('/images/'))
  .map(p => p.split('/')[2])
  .filter(sub => !COLECCIONES.has(sub)))];
check(`${COLECCIONES.size} destinos válidos (site + ${COLECCIONES.size - 1} colecciones)`,
  destinosMal.length === 0, `${destinosMal.length} inventados: ${destinosMal.slice(0, 3).join(', ')}`);

console.log(`\n${fallos === 0 ? '✅ PUERTA VERDE' : `🔴 PUERTA ROJA — ${fallos} fallo(s)`}`);
process.exit(fallos ? 1 : 0);
