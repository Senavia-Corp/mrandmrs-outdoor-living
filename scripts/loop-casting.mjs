/** Tiras actual/candidata por hueco + paquete A/B aleatorio para el juez.
 *  node scripts/loop-casting.mjs <unidad>   lee <unidad>/casting.json = {hueco: [id, pos]} e inventario.json */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unidad = process.argv[2]; const dir = path.join(RAIZ, 'banco/.trabajo/loop-imagenes', unidad);
const casting = JSON.parse(fs.readFileSync(path.join(dir, 'casting.json'), 'utf8'));
const inv = JSON.parse(fs.readFileSync(path.join(dir, 'inventario.json'), 'utf8'));
const banco = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8')).map((e) => [e.id, e]));
const cajaDe = (h) => h.startsWith('galeria') ? 'galeria' : h.startsWith('proceso') ? 'proceso' : h === 'faq[0]' ? 'faq0' : /^faq\[[12]\]/.test(h) ? 'faq1' : h.startsWith('faq') ? 'faq3' : h;
const enc = (src, caja, pos, out) => execFileSync('node', [path.join(RAIZ, 'scripts/encaje-foto.mjs'), src, caja, pos, '--out', out]);
const paquete = [], clave = [];
for (const [h, [id, pos]] of Object.entries(casting)) {
  const act = inv.find((x) => x.hueco === h); if (!act) throw new Error('hueco sin inventario: ' + h);
  const e = banco.get(id); if (!e) throw new Error('no esta en el banco: ' + id);
  const k = h.replace(/[\[\]]/g, '_'); const fa = path.join(dir, `${k}--actual.jpg`), fc = path.join(dir, `${k}--${id}.jpg`);
  enc(act.src, cajaDe(h), '50% 50%', fa); enc(e.src, cajaDe(h), pos, fc);
  const candEsA = Math.random() < 0.5;
  paquete.push({ hueco: h, A: candEsA ? fc : fa, B: candEsA ? fa : fc });
  clave.push({ hueco: h, candidata: id, pos, candidata_es: candEsA ? 'A' : 'B', actual: act.src, procedencia_actual: act.procedencia, selector: act.selector });
}
fs.writeFileSync(path.join(dir, 'juez-paquete.json'), JSON.stringify(paquete, null, 1));
fs.writeFileSync(path.join(dir, 'juez-clave.json'), JSON.stringify(clave, null, 1));
console.log(unidad, paquete.length, 'huecos al juez');
