/**
 * LA PUERTA DEL LOOP DE IMAGENES — PROMPT-LOOP-IMAGENES §5 F0.
 *
 * «Hecho» es que esto salga 0. Mide sobre `.vercel/output/static` (nunca sobre dev) y sobre
 * `docs/encargos/LOOP-IMAGENES-ESTADO.json`. ROJO (sale 1) si:
 *
 *   · una unidad no esta `hecha`, o un hueco sigue `pendiente`
 *   · un hueco `canjeada` no pinta en el HTML el `despues` que dice el estado, o no trae `pos`
 *   · ese `despues` no traza a una entrada `obra_real` + `aprobada*` del banco (por `_banco`,
 *     con el mismo `src` o en `publicada_como`) que lleve la(s) ruta(s) en `usada_en`
 *   · en una galeria, la URL del `script.w-json` del lightbox no es la del `<img>`
 *   · un mismo fichero sale dos veces en el cuerpo de una ficha y una de las dos es una foto
 *     que el loop canjeo (el menu y el pie no cuentan)
 *   · un `se-queda` no trae `motivo`, `falta` y (`descartadas` o `consulta`); una `escalada`,
 *     sin `motivo`
 *   · alguna foto de intro o de «What we do» ha cambiado respecto a la linea base
 *
 *     node scripts/check-fotos-servicios.mjs            # todo: la meta del encargo
 *     node scripts/check-fotos-servicios.mjs kitchens   # solo esa unidad (tiene que estar hecha)
 *
 * ponytail: las repeticiones entre fotos que el loop NO toco (intro, What we do, un hueco que se
 * queda) se listan como aviso y no tumban: un hueco sin banco es un resultado, no un fallo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const ESTADO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/encargos/LOOP-IMAGENES-ESTADO.json'), 'utf8'));
const BANCO = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8')).map((e) => [e.id, e]));
const filtro = process.argv[2] ?? null;

const rojos = [];
const avisos = [];
const rojo = (u, msg) => rojos.push(`${u}: ${msg}`);
const docs = new Map();
const doc = (ruta) => {
  if (!docs.has(ruta)) {
    const f = path.join(ESTATICO, ruta === '/' ? 'index.html' : `${ruta}/index.html`);
    if (!fs.existsSync(f)) return null;
    docs.set(ruta, new JSDOM(fs.readFileSync(f, 'utf8')).window.document);
  }
  return docs.get(ruta);
};
const indice = (nombre) => { const m = nombre.match(/\[(\d+)\]$/); return m ? +m[1] : 0; };

const unidades = ESTADO.unidades.filter((u) => !filtro || u.id === filtro);
if (!unidades.length) { console.error(`\nROJO no hay unidad «${filtro}» en el estado\n`); process.exit(1); }

for (const u of unidades) {
  if (u.estado !== 'hecha') { rojo(u.id, `unidad ${u.estado}`); continue; }
  if (!u.huecos) continue;
  const d = doc(u.ruta);
  if (!d) { rojo(u.id, `no hay HTML construido para ${u.ruta}`); continue; }
  const canjeados = new Set();
  for (const h of u.huecos) {
    const id = `${u.id} ${h.hueco}`;
    if (h.estado === 'pendiente' || !h.estado) { rojo(id, 'hueco pendiente'); continue; }
    if (h.estado === 'se-queda') {
      if (!h.motivo || !h.falta || !(h.descartadas?.length || h.consulta)) rojo(id, 'se-queda sin motivo, falta y descartadas/consulta');
      continue;
    }
    if (h.estado === 'escalada') { if (!h.motivo) rojo(id, 'escalada sin motivo'); continue; }
    if (h.estado !== 'canjeada') { rojo(id, `estado desconocido «${h.estado}»`); continue; }
    if (!h.pos) rojo(id, 'canjeada sin pos');
    const img = d.querySelectorAll(h.selector)[indice(h.hueco)];
    if (!img) { rojo(id, `«${h.selector}»[${indice(h.hueco)}] no esta en el HTML`); continue; }
    if (img.getAttribute('src') !== h.despues) rojo(id, `el HTML pinta ${img.getAttribute('src')}, el estado dice ${h.despues}`);
    const lb = img.closest('a.w-lightbox')?.querySelector('script.w-json');
    if (lb) {
      let url = null; try { url = JSON.parse(lb.textContent).items?.[0]?.url; } catch {}
      if (url !== h.despues) rojo(id, `el lightbox abre ${url}, no ${h.despues}`);
    }
    const e = BANCO.get(h._banco);
    if (!e) { rojo(id, `${h._banco} no esta en el banco`); continue; }
    if (e.procedencia !== 'obra_real' || !String(e.estado).startsWith('aprobada')) rojo(id, `${h._banco} no es obra_real aprobada`);
    if (e.src !== h.despues && !(e.publicada_como ?? []).includes(h.despues)) rojo(id, `${h.despues} no es el src de ${h._banco} ni esta en su publicada_como`);
    for (const r of u.rutas ?? [u.ruta]) if (!(e.usada_en ?? []).includes(r)) rojo(id, `${h._banco} no lleva ${r} en usada_en`);
    canjeados.add(h.despues);
  }
  // Repeticiones en el cuerpo de la ficha (sin nav ni pie).
  if (u.tipo === 'ficha') {
    const vistos = new Map();
    for (const img of d.querySelectorAll('img[src]')) {
      if (img.closest('section.menu, section.footer, .w-nav, footer')) continue;
      const s = img.getAttribute('src');
      if (!s.startsWith('/images/') || /\/(site\/icon|subservices|logos?)\//.test(s) || s.endsWith('.svg')) continue;
      vistos.set(s, (vistos.get(s) ?? 0) + 1);
    }
    for (const [s, n] of vistos) if (n > 1) {
      if (canjeados.has(s)) rojo(u.id, `${s} sale ${n} veces en la ficha y es una foto canjeada`);
      else avisos.push(`${u.id}: ${s} sale ${n} veces (no la toco el loop)`);
    }
    // Intocables contra la linea base.
    const base = ESTADO.intocables[u.ruta];
    const intro = [...d.querySelectorAll('section.trusted-section.svc-intro img.image')].map((i) => i.getAttribute('src'));
    const wwd = [...d.querySelectorAll('section.services img.svc-detalle__foto')].map((i) => i.getAttribute('src'));
    if (!base) rojo(u.id, 'sin linea base de intocables');
    else if (JSON.stringify(intro) !== JSON.stringify(base.intro)) rojo(u.id, `la intro ha cambiado: ${JSON.stringify(intro)}`);
    else if (JSON.stringify(wwd) !== JSON.stringify(base.what_we_do)) rojo(u.id, `«What we do» ha cambiado: ${JSON.stringify(wwd)}`);
  }
}

const hechas = ESTADO.unidades.filter((u) => u.estado === 'hecha').length;
const huecos = ESTADO.unidades.flatMap((u) => u.huecos ?? []);
const cuenta = (e) => huecos.filter((h) => h.estado === e).length;
console.log(`\n  fotos-servicios: ${hechas}/${ESTADO.unidades.length} unidades hechas · huecos: ${cuenta('canjeada')} canjeados, ${cuenta('se-queda')} se quedan, ${cuenta('escalada')} escalados, ${cuenta('pendiente')} pendientes${filtro ? ` · filtro ${filtro}` : ''}`);
for (const a of avisos) console.log(`  aviso  ${a}`);
if (rojos.length) {
  for (const r of rojos) console.error(`  ROJO   ${r}`);
  console.error(`\n  ROJO ${rojos.length} fallo(s)\n`);
  process.exit(1);
}
console.log('  VERDE\n');
