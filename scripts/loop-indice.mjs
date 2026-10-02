/** Indice compacto del banco para un servicio: node scripts/loop-indice.mjs <servicio> [etapa] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [serv, etapa] = process.argv.slice(2);
const b = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8')).filter((x) => (x.servicios ?? [])[0] === serv && String(x.estado).startsWith('aprobada') && (!etapa || x.etapa === etapa));
const n = {}; for (const x of b) n[x.etapa] = (n[x.etapa] ?? 0) + 1; console.log(b.length, JSON.stringify(n));
for (const x of b.sort((a, c) => a.etapa.localeCompare(c.etapa) || a.id.localeCompare(c.id)))
  console.log([x.id, x.etapa.slice(0, 4), x.estado === 'aprobada' ? 'A' : 'Ar', x.orientacion.slice(0, 4), x.vista ?? '', x.ancho + 'x' + x.alto, 't:' + (x.espacio_texto ?? '-'), (x.recortes_seguros ?? []).join(','), x.proyecto ?? '-', (x.usada_en ?? []).length ? 'U:' + x.usada_en.map((u) => u.split('/').pop().slice(0, 14)).join(',') : '', x.fase_obra ?? ''].join('|') + '\n   ' + x.descripcion + '\n   DEF: ' + ((x.defectos ?? []).join('; ') || '-'));
