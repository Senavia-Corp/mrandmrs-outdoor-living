// PUERTA de la Fase 3. Comprueba contra el dataset REAL, no contra lo que el importador creyó subir.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://m273z6jc.apicdn.sanity.io/v2021-06-07/data/query/production';
// TRAMPA: una lectura ANÓNIMA de un dataset público devuelve los borradores como **0**, no como
// error. La puerta daba rojo diciendo «0 borradores» cuando los 8 estaban ahí. Los `drafts.*`
// solo se ven autenticado. Mismo patrón que el 200-con-result-vacío de un dataset privado.
const TOKEN = (fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/SANITY_WRITE_TOKEN=(.+)/) || [])[1];
const groq = async (q) => {
  const r = await fetch(`https://m273z6jc.api.sanity.io/v2021-06-07/data/query/production?query=${encodeURIComponent(q)}`,
    TOKEN ? { headers: { authorization: `Bearer ${TOKEN}` } } : undefined);
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
};
const local = JSON.parse(fs.readFileSync(path.join(ROOT, '_source/sanity-docs.json'), 'utf8'));

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? '✅' : '🔴'} ${n}${!ok && d ? ' — ' + d : ''}`); if (!ok) fallos++; };

console.log('\n── 1. conteo por tipo: dataset vs CSV');
const esperado = {};
for (const d of local) if (!d._draft) esperado[d._type] = (esperado[d._type] || 0) + 1;
const real = Object.fromEntries((await groq('*[!(_id in path("drafts.**")) && !(_type match "sanity.*") && !(_type match "system.*")]{_type}'))
  .reduce((m, d) => m.set(d._type, (m.get(d._type) || 0) + 1), new Map()));
let desc = 0;
for (const t of new Set([...Object.keys(esperado), ...Object.keys(real)])) {
  if ((esperado[t] || 0) !== (real[t] || 0)) { console.log(`     ${t}: esperado ${esperado[t] || 0}, hay ${real[t] || 0}`); desc++; }
}
check(`${Object.values(real).reduce((a, b) => a + b, 0)} documentos publicados en ${Object.keys(real).length} tipos`, desc === 0, `${desc} tipos descuadrados`);

console.log('\n── 2. borradores');
const drafts = await groq('count(*[_id in path("drafts.**")])');
check(`${drafts} borradores`, drafts === local.filter(d => d._draft).length, `esperados ${local.filter(d => d._draft).length}`);

console.log('\n── 3. referencias rotas (el dataset resuelve cada _ref)');
// se traen todos los ids y todos los _ref y se cruzan: GROQ no tiene un «dangling ref» directo
const ids = new Set(await groq('*[]._id'));
const todos = await groq('*[]');
const refsUsadas = [];
const recoge = (v, doc) => {
  if (Array.isArray(v)) return v.forEach(x => recoge(x, doc));
  if (v && typeof v === 'object') {
    if (v._ref) refsUsadas.push({ doc: doc._id, ref: v._ref });
    Object.values(v).forEach(x => recoge(x, doc));
  }
};
todos.forEach(d => recoge(d, d));
const refsRotas = refsUsadas.filter(r => !ids.has(r.ref));
check(`${refsUsadas.length} referencias, todas resuelven`, refsRotas.length === 0, `${refsRotas.length} rotas`);
refsRotas.slice(0, 5).forEach(r => console.log(`     ${r.doc} -> ${r.ref}`));

console.log('\n── 4. assets');
const imgs = await groq('count(*[_type=="sanity.imageAsset"])');
const files = await groq('count(*[_type=="sanity.fileAsset"])');
const cache = JSON.parse(fs.readFileSync(path.join(ROOT, '_source/sanity-assets.json'), 'utf8'));
check(`${imgs} imágenes + ${files} ficheros = ${imgs + files}`, imgs + files === new Set(Object.values(cache).map(c => c._id)).size,
  `la caché del importador dice ${new Set(Object.values(cache).map(c => c._id)).size}`);

console.log('\n── 5. ningún documento sin slug ni sin nombre');
// `system.**` = los 12 grupos ACL que Sanity crea con el dataset. No son contenido.
const cojos = await groq('*[!(_id in path("drafts.**")) && !defined(slug.current) && !(_type match "sanity.*") && !(_type match "system.*")]{_id,_type}');
check('todos con slug', cojos.length === 0, `${cojos.length} sin slug`);
cojos.slice(0, 5).forEach(c => console.log(`     ${c._type} ${c._id}`));

console.log('\n── 6. Portable Text: los bloques llegaron como bloques, no como texto plano');
const pt = await groq('count(*[defined(blog) && blog[0]._type == "block"])');
const ptEsp = local.filter(d => d.blog?.[0]?._type === 'block').length;
check(`${pt} blogPost con Portable Text`, pt === ptEsp, `esperados ${ptEsp}`);

console.log('\n── 7. idempotencia: una segunda corrida no crea nada nuevo');
// `_id` derivado del Item ID de Webflow -> createOrReplace ACTUALIZA. Si el conteo sube, el id
// no es estable y cada corrida duplicaría el CMS.
const antes = await groq('count(*)');
const { execSync } = await import('node:child_process');
execSync('node scripts/import.mjs', { cwd: ROOT, env: { ...process.env, SANITY_WRITE_TOKEN: TOKEN }, stdio: 'pipe' });
const despues = await groq('count(*)');
check(`count(*) ${antes} -> ${despues}`, antes === despues, 'la segunda corrida cambió el conteo');

console.log(`\n${fallos === 0 ? '✅ PUERTA VERDE' : `🔴 PUERTA ROJA — ${fallos} fallo(s)`}`);
process.exit(fallos ? 1 : 0);
