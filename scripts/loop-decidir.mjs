/** Veredictos del juez + clave A/B + inventario -> decisiones.json (regla §6.5 del encargo).
 *  node scripts/loop-decidir.mjs <unidad> "<falta galeria>" "<falta faq>"
 *  Canje si la candidata no tiene bloqueante ni dentro-del-recorte Y (la actual no es obra_real O el juez prefiere la candidata). */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import sharp from 'sharp';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [unidad, faltaGal = 'Obra terminada, de día, patio recogido, el sujeto entero en cuadro', faltaFaq = 'Detalle de cerca de la obra terminada, con fondo limpio'] = process.argv.slice(2);
const dir = path.join(RAIZ, 'banco/.trabajo/loop-imagenes', unidad);
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const clave = J('juez-clave.json'), vered = J('juez-veredictos.json').veredictos, inv = J('inventario.json');
const estado = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json'), 'utf8'));
const u = estado.unidades.find((x) => x.id === unidad);
// La proporcion de los pasos es la del ORIGEN de cada ficha (1408/768 en las de PNG, 1450/1088 en pole/louvered/rooms):
// a 768/991 el paso se pinta entero y otra proporcion mueve el alto de la pagina.
const paso0 = inv.find((x) => x.hueco === 'proceso[0]');
const mp = paso0 ? await sharp(path.join(RAIZ, 'public', paso0.src)).metadata() : { width: 1408, height: 768 };
const ratioPasos = mp.width / mp.height < 1.5 ? '1450/1088' : '1408/768';
const derivar = { heroe: { ratio: '16/9', ancho: 1600, formato: 'avif', q: 50 }, inversion: { ratio: '1250/698', ancho: 1600, formato: 'avif' }, proceso: { ratio: ratioPasos, ancho: 1600, formato: 'avif' } };
const falta = { galeria: faltaGal, faq: faltaFaq, heroe: faltaGal, inversion: faltaGal, proceso: 'Obra en curso de este servicio, cuadrilla trabajando, sin basura ni trastos' };
const huecos = [];
for (const k of clave) {
  const j = vered.find((v) => v.hueco === k.hueco); if (!j) throw new Error('sin veredicto: ' + k.hueco);
  const cand = k.candidata_es, act = cand === 'A' ? 'B' : 'A'; const tipo = k.hueco.replace(/\[.*/, '');
  const tumba = (j[cand].defectos ?? []).filter((d) => d.clase === 'bloqueante' || d.clase === 'dentro-del-recorte');
  const pref = j.prefiere === cand; const actualReal = k.procedencia_actual === 'obra_real';
  const h = { hueco: k.hueco, selector: k.selector, antes: k.actual, procedencia_antes: k.procedencia_actual, juez: pref ? 'candidata' : j.prefiere === act ? 'actual' : 'iguales', descartadas: [] };
  if (!tumba.length && (pref || !actualReal)) Object.assign(h, { estado: 'canjeada', _banco: k.candidata, pos: k.pos, derivar: derivar[tipo] ?? null, og: tipo === 'heroe' });
  else { h.estado = 'se-queda'; h.descartadas = [{ _banco: k.candidata, clase: tumba[0]?.clase ?? 'juez-prefiere-actual', motivo: tumba[0]?.que ?? (j.motivo ?? 'el juez prefiere la actual') }];
    h.motivo = tumba.length ? `la candidata cae por ${tumba[0].clase}; la actual es ${k.procedencia_actual}` : 'juez prefiere la actual' + (actualReal ? ', que ya es obra real' : ''); h.falta = falta[tipo]; }
  huecos.push(h);
}
// huecos del inventario sin casting
for (const x of inv) {
  if (['intro', 'wwd'].some((p) => x.hueco.startsWith(p)) || huecos.some((h) => h.hueco === x.hueco)) continue;
  const tipo = x.hueco.replace(/\[.*/, '');
  const real = x.procedencia === 'obra_real';
  huecos.push({ hueco: x.hueco, selector: x.selector, antes: x.src, procedencia_antes: x.procedencia, estado: 'se-queda', descartadas: [],
    consulta: real ? 'obra real ya publicada y sin repeticion con intro/What we do: prioridad 4 de §6.1, no se abrio casting' : 'el banco no tiene candidata que encaje para este hueco (indice + hojas de contactos)',
    motivo: real ? 'ya es obra real y no se repite con las secciones intocables' : 'sin candidata en el banco', falta: real ? 'ninguna: ya es obra real' : falta[tipo] });
}
huecos.sort((a, b) => a.hueco.localeCompare(b.hueco, undefined, { numeric: true }));
const gal = inv.filter((x) => x.hueco.startsWith('galeria')).length, proc = inv.filter((x) => x.hueco.startsWith('proceso')).length;
const intoc = estado.intocables[u.ruta];
const quedan = huecos.filter((h) => h.estado === 'se-queda').map((h) => h.antes).concat(intoc.intro, intoc.what_we_do);
const cast = J('casting.json');
fs.writeFileSync(path.join(dir, 'decisiones.json'), JSON.stringify({ ruta: u.ruta, galeria_slides: gal, proceso_pasos: proc, portada_menu: cast._menu ?? null, portada_full: cast._full ?? null, ficheros_en_pagina_despues: quedan, huecos }, null, 1));
const n = (s) => huecos.filter((h) => h.estado === s).length;
console.log(`${unidad}: ${huecos.length} huecos, ${n('canjeada')} canjeados, ${n('se-queda')} se quedan · candidatas tumbadas ${clave.length - huecos.filter((h) => h.estado === 'canjeada').length - huecos.filter((h) => h.juez === 'actual' && h.descartadas[0]?.clase === 'juez-prefiere-actual').length}/${clave.length}`);
