/** Informe de entrega del loop (cuerpo del PR, §8 del encargo): node scripts/loop-informe.mjs > docs/encargos/LOOP-IMAGENES-INFORME.md */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json'), 'utf8'));
const fichas = e.unidades.filter((u) => u.tipo === 'ficha'); const L = [];
const n = (u, s) => (u.huecos ?? []).filter((h) => h.estado === s).length;
const tot = (s) => e.unidades.reduce((a, u) => a + n(u, s), 0);
L.push(`# LOOP-IMAGENES — informe de entrega (2-oct-2026)\n`);
L.push(`Base \`${e.base}\` · 18 unidades, todas hechas · **${tot('canjeada')} canjes** y ${tot('se-queda')} huecos que se quedan en ${e.unidades.reduce((a, u) => a + (u.huecos?.length ?? 0), 0)} huecos. Puerta del loop: \`node scripts/check-fotos-servicios.mjs\` → 0.\n`);
L.push(`## 1 · Canjeadas\n\n| Unidad | Commit | Canjes | Héroe | Galería | Proceso | Inversión | FAQ | Hoja |\n|---|---|---|---|---|---|---|---|---|`);
const cnt = (u, p) => (u.huecos ?? []).filter((h) => h.estado === 'canjeada' && h.hueco.startsWith(p)).length;
for (const u of fichas) L.push(`| ${u.id} | \`${u.commit}\` | ${n(u, 'canjeada')}/${u.huecos.length} | ${cnt(u, 'heroe')} | ${cnt(u, 'galeria')} | ${cnt(u, 'proceso')} | ${cnt(u, 'inversion')} | ${cnt(u, 'faq')} | \`banco/.trabajo/loop-imagenes/${u.id}.jpg\` |`);
for (const id of ['MENU', 'FULL']) { const u = e.unidades.find((x) => x.id === id); L.push(`| ${id} | \`${u.commit}\` | ${n(u, 'canjeada')}/14 | | | | | | \`banco/.trabajo/loop-imagenes/${id}.jpg\` |`); }
L.push(`\nLas hojas antes|después están en \`banco/.trabajo/\` (gitignorado) del worktree \`loop-imagenes\`.\n`);
L.push(`## 2 · Se quedan, y la lista de fotos que hay que hacer\n`);
for (const u of fichas) {
  const q = (u.huecos ?? []).filter((h) => h.estado === 'se-queda' && !/ya es obra real/.test(h.falta ?? '')); if (!q.length) continue;
  const faltas = [...new Set(q.map((h) => h.falta).filter(Boolean))];
  const motivos = {}; for (const h of q) { const k = h.descartadas?.[0]?.clase ? `candidata cae por ${h.descartadas[0].clase}` : (h.motivo ?? ''); motivos[k] = (motivos[k] ?? 0) + 1; }
  L.push(`**${u.id}** (${q.length} huecos): ${Object.entries(motivos).map(([k, v]) => `${v} × ${k}`).join(' · ')}.`);
  for (const f of faltas) L.push(`- 📷 ${f}`);
  L.push('');
}
L.push(`## 3 · Auditoría de Intro y «What we do» (no se tocaron)\n\nMétodo: ${e.auditoria_ia.metodo}. De ${e.auditoria_ia.intocables_total} ficheros, **${e.auditoria_ia.intocables_con_marca.length} llevan marca de IA**:\n`);
for (const f of e.auditoria_ia.intocables_con_marca) L.push(`- \`${f}\``);
L.push(`\nPasos de proceso del origen: ${e.auditoria_ia.procesos_con_marca.length} de ${e.auditoria_ia.procesos_total} con marca (los PNG). ${e.auditoria_ia.nota}\n`);
L.push(`## 4 · Lo que espera a un humano\n\n- Aprobar las capturas nuevas con \`node scripts/aprobar-diseno.mjs <ruta> --si\`: \`check-visual\` sale roja en las 14 fichas, \`/\` y las dos de \`where-we-serve\` por la referencia anterior al rediseño (en cocinas, sin tocar, ya daba +141/+119/+176/+216). El alto de cada página se midió antes y después con la misma receta: 0 px de diferencia en todas (pole se corrigió en \`cb19add\`).\n- Decidir qué hacer con las 9 fotos de intro con marca de IA (bloque 3).\n- Las ${e.correcciones_al_encargo.length} correcciones al encargo están en \`correcciones_al_encargo\` del estado.\n`);
process.stdout.write(L.join('\n') + '\n');
