/** Inventario de huecos de una ficha sobre el HTML construido: selector, src, procedencia, repeticiones.
 *  node scripts/loop-inventario.mjs <ruta>  (imprime texto compacto y deja <unidad>/inventario.json si se pasa --unidad X) */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { JSDOM } from 'jsdom';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [ruta, , unidad] = process.argv.slice(2);
const d = new JSDOM(fs.readFileSync(path.join(RAIZ, '.vercel/output/static', ruta, 'index.html'), 'utf8')).window.document;
const gp = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/gallery-procedencia.json'), 'utf8'));
const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'));
const enBanco = new Map(); for (const b of banco) for (const s of [b.src, ...(b.publicada_como ?? [])]) enBanco.set(s, b.id);
const proc = {}; for (const arr of Object.values(gp.servicios)) for (const f of arr) proc[f.src] = f.veredicto;
const SEL = { heroe: 'img.image-bg-hero-services', galeria: 'section.gallery img.image-gallery', proceso: 'img.img-process', inversion: 'img.svc-inversion__foto', intro: 'section.trusted-section.svc-intro img.image', wwd: 'section.services img.svc-detalle__foto' };
const q = (s) => [...d.querySelectorAll(s)].map((i) => i.getAttribute('src'));
const sets = Object.fromEntries(Object.entries(SEL).map(([k, s]) => [k, q(s)]));
const todos = Object.values(sets).flat();
const out = [];
for (const [k, v] of Object.entries(sets)) v.forEach((s, i) => {
  const pr = s.includes('/procesos/') ? 'ia_probada' : enBanco.has(s) ? 'obra_real' : proc[s] ? (proc[s] === 'obra_real' ? 'obra_real' : 'no_real:' + proc[s]) : 'sin_verificar';
  out.push({ hueco: k + (['heroe', 'inversion'].includes(k) ? '' : `[${i}]`), selector: SEL[k], src: s, procedencia: pr, veces: todos.filter((x) => x === s).length, _banco: enBanco.get(s) ?? null });
  console.log(k.padEnd(9), String(i).padEnd(2), pr.padEnd(14), 'x' + todos.filter((x) => x === s).length, (enBanco.get(s) ?? '-').padEnd(8), s.split('/').slice(-2).join('/'));
});
console.log('PASOS:', [...d.querySelectorAll('section.process-section h2')].map((h) => h.textContent.trim()).slice(1).join(' | '));
if (unidad) { const dir = path.join(RAIZ, 'banco/.trabajo/loop-imagenes', unidad); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'inventario.json'), JSON.stringify(out, null, 1)); }
