/**
 * APLICAR LAS DECISIONES DE UNA UNIDAD DEL LOOP DE IMAGENES — PROMPT-LOOP-IMAGENES §4.6.
 *
 *     node scripts/loop-aplicar.mjs <unidad>
 *
 * Lee `banco/.trabajo/loop-imagenes/<unidad>/decisiones.json`:
 *   { ruta, huecos: [{ hueco, selector, antes, procedencia_antes, estado, _banco, pos, alt?,
 *                      derivar?: { ratio, ancho, formato, q? }, og?: true, juez, descartadas, motivo, falta, consulta }] }
 * y escribe, segun el hueco:
 *   heroe / proceso[i] / inversion  -> src/data/captacion-servicios.json
 *   galeria[i]                       -> src/data/fotos-por-ruta.json   (null = se queda)
 *   faq[i]                           -> src/data/collage-faq-por-ruta.json
 * Deriva ficheros a public/images/obra/<obra>/ cuando `derivar` lo pide (derivar-foto.mjs), anota
 * `usada_en`/`publicada_como` en el banco, y vuelca los huecos al estado del loop.
 * NO construye ni commitea: eso lo hace la iteracion despues de medir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const unidad = process.argv[2];
if (!unidad) { console.error('uso: loop-aplicar.mjs <unidad>'); process.exit(2); }
const J = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
const W = (f, o) => fs.writeFileSync(path.join(RAIZ, f), JSON.stringify(o, null, 2) + '\n');
const dec = J(`banco/.trabajo/loop-imagenes/${unidad}/decisiones.json`);
const ruta = dec.ruta;
const banco = J('src/data/banco-imagenes.json');
const porId = new Map(banco.map((e) => [e.id, e]));
const cap = J('src/data/captacion-servicios.json');
const fpr = J('src/data/fotos-por-ruta.json');
const faq = J('src/data/collage-faq-por-ruta.json');
const estado = J('docs/encargos/LOOP-IMAGENES-ESTADO.json');
const c = cap[ruta];
if (!c) { console.error(`ROJO ${ruta} no esta en captacion-servicios.json`); process.exit(1); }

const slugObra = (e) => e.proyecto || 'suelta';
const base = (e) => path.basename(e.src, '.webp').replace(/-\d+$/, '');
const alt = (h, e) => h.alt ?? e.alt;

function derivar(h, e, sufijo) {
  const d = h.derivar;
  const ext = d.formato === 'jpeg' ? 'jpg' : 'avif';
  const salida = `/images/obra/${slugObra(e)}/${base(e)}-${sufijo}.${ext}`;
  const r = JSON.parse(execFileSync('node', [path.join(RAIZ, 'scripts/derivar-foto.mjs'), e.src, d.ratio, h.pos ?? '50% 50%', String(d.ancho), salida, '--q', String(d.q ?? 52)], { encoding: 'utf8' }));
  e.publicada_como = [...new Set([...(e.publicada_como ?? []), salida])];
  return { src: salida, ancho: r.ancho, alto: r.alto, bytes: r.bytes, _ajuste: r._ajuste };
}

const usados = new Set();   // ids del banco que entran en la pagina
const huecosEstado = [];
let galeria = null;         // array de 10 para fotos-por-ruta
for (const h of dec.huecos) {
  const he = { hueco: h.hueco, selector: h.selector, antes: h.antes, procedencia_antes: h.procedencia_antes, estado: h.estado,
    despues: null, _banco: h._banco ?? null, pos: h.pos ?? null, _ajuste: null, juez: h.juez ?? null,
    descartadas: h.descartadas ?? [], motivo: h.motivo ?? null, falta: h.falta ?? null, consulta: h.consulta ?? null };
  const [tipo, idx] = (h.hueco.match(/^(\w+)(?:\[(\d+)\])?$/) ?? []).slice(1);
  const i = idx === undefined ? null : +idx;
  if (tipo === 'galeria' && !galeria) {
    const n = +dec.galeria_slides;
    galeria = fpr[ruta]?.[h.selector] ?? Array(n).fill(null);
  }
  if (h.estado !== 'canjeada') { huecosEstado.push(he); continue; }
  const e = porId.get(h._banco);
  if (!e) { console.error(`ROJO ${h.hueco}: ${h._banco} no esta en el banco`); process.exit(1); }
  if (e.procedencia !== 'obra_real' || !String(e.estado).startsWith('aprobada')) { console.error(`ROJO ${h.hueco}: ${h._banco} no es obra_real aprobada`); process.exit(1); }
  usados.add(e.id);
  e.usada_en = [...new Set([...(e.usada_en ?? []), ruta])];
  let foto = { src: e.src, ancho: e.ancho, alto: e.alto, _ajuste: null };
  if (h.derivar) foto = derivar(h, e, tipo + (i ?? ''));
  he.despues = foto.src; he._ajuste = foto._ajuste;
  if (tipo === 'heroe') {
    Object.assign(c.heroe, { foto: foto.src, alt: alt(h, e), ancho: foto.ancho, alto: foto.alto, _banco: e.id, _proyecto: e.proyecto ?? null, _ajuste: foto._ajuste });
    if (h.og) {
      const og = derivar({ pos: h.pos, derivar: { ratio: '1200/630', ancho: 1200, formato: 'jpeg', q: 82 } }, e, 'og');
      // nombre canonico del og: og/<slug-de-la-ficha>.jpg, como R24
      const canon = `/images/obra/og/${ruta.split('/').pop()}.jpg`;
      fs.renameSync(path.join(RAIZ, 'public', og.src), path.join(RAIZ, 'public', canon));
      e.publicada_como = e.publicada_como.map((p) => (p === og.src ? canon : p));
      c.heroe.og = canon;
    }
  } else if (tipo === 'inversion') {
    Object.assign(c.inversion, { foto: foto.src, alt: alt(h, e), ancho: foto.ancho, alto: foto.alto, pos: h.pos, _banco: e.id, _proyecto: e.proyecto ?? null, _ajuste: foto._ajuste });
  } else if (tipo === 'proceso') {
    c.proceso ??= { fotos: Array(+dec.proceso_pasos).fill(null) };
    c.proceso.fotos[i] = { foto: foto.src, alt: alt(h, e), ancho: foto.ancho, alto: foto.alto, ...(h.pos ? { pos: h.pos } : {}), _banco: e.id, _proyecto: e.proyecto ?? null, _ajuste: foto._ajuste };
  } else if (tipo === 'galeria') {
    galeria[i] = { src: foto.src, alt: alt(h, e), ancho: foto.ancho, alto: foto.alto, pos: h.pos, _banco: e.id, _por_que: h.por_que ?? null };
  } else if (tipo === 'faq') {
    faq[ruta].fotos[i] = { src: foto.src, srcset: `${foto.src} ${foto.ancho}w`, alt: alt(h, e), ancho: foto.ancho, alto: foto.alto, pos: h.pos, _banco: e.id };
  } else { console.error(`ROJO hueco desconocido ${h.hueco}`); process.exit(1); }
  huecosEstado.push(he);
}
if (galeria && galeria.some(Boolean)) { fpr[ruta] = { ...(fpr[ruta] ?? {}), [dec.huecos.find((h) => h.hueco.startsWith('galeria')).selector]: galeria }; }

// Las fotos que SALEN de la pagina pierden la ruta en usada_en (si ya no sale ninguna de sus copias).
const enPagina = new Set(dec.ficheros_en_pagina_despues ?? []);
for (const e of banco) {
  if (!(e.usada_en ?? []).includes(ruta) || usados.has(e.id)) continue;
  const copias = [e.src, ...(e.publicada_como ?? [])];
  if (!copias.some((f) => enPagina.has(f))) { e.usada_en = e.usada_en.filter((r) => r !== ruta); console.log(`  usada_en: ${e.id} deja ${ruta}`); }
}

W('src/data/captacion-servicios.json', cap);
W('src/data/fotos-por-ruta.json', fpr);
W('src/data/collage-faq-por-ruta.json', faq);
W('src/data/banco-imagenes.json', banco);
const u = estado.unidades.find((x) => x.id === unidad);
u.huecos = huecosEstado;
if (dec.portada_menu) u.portada_menu = dec.portada_menu;
if (dec.portada_full) u.portada_full = dec.portada_full;
W('docs/encargos/LOOP-IMAGENES-ESTADO.json', estado);
const n = (s) => huecosEstado.filter((h) => h.estado === s).length;
console.log(`  ${unidad}: ${n('canjeada')} canjeados, ${n('se-queda')} se quedan, ${n('escalada')} escalados; banco usados: ${[...usados].join(' ')}`);
