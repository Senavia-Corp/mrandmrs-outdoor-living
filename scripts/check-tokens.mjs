#!/usr/bin/env node
/**
 * PUERTA de la fase R8 — la disciplina de la capa de diseño.
 *
 *     npm run check:tokens          (estática, sin navegador, <1 s)
 *
 * POR QUÉ EXISTE, Y POR QUÉ LA CORRE CADA TRABAJADOR. El Programa R reparte el CSS entre
 * tres chats que no se ven entre sí y que no construyen. Sin una puerta barata que cada uno
 * pueda correr en su sitio, la capa se pudre en silencio: un hex literal aquí, un
 * `!important` allá, y en dos semanas el sistema de diseño es una hoja de parches. Es la
 * puerta que más rinde de todo el programa precisamente porque es la más aburrida.
 *
 * DOS ÁMBITOS, Y NO SON EL MISMO. Lo aprendí midiendo antes de escribirla: una puerta que
 * nace roja se desactiva a la semana, así que cada regla se aplica donde de verdad está
 * limpio hoy.
 *
 *   1. LA CAPA DE DISEÑO — `src/styles/*.css` y `src/styles/disenio/*.css`, que es lo que
 *      escribe este programa. Medido el 1-sep-2026: 0 violaciones de las 6 reglas en los 15
 *      ficheros. Aquí se aplica TODO, sin excepciones y sin lista de perdonados.
 *
 *   2. LOS BLOQUES `<style>` DE `src/components/**` — solo las reglas de SEGURIDAD. Sus 81
 *      literales de color y su único `!important` (`.svc [hidden]{display:none!important}`,
 *      que es defensa legítima contra la cascada de Webflow) son de componentes anteriores al
 *      programa y se declaran aquí en vez de perdonarse en silencio.
 *
 * EXCLUIDOS, con su motivo:
 *   · `webflow.css` y `fuentes.css` — DERIVADOS, los genera `build-css.mjs`.
 *   · `estimador.css` — de la Fase 12c, anterior al programa. Hoy tiene 1 `!important` y 38
 *     literales de color. No se toca en R, así que perdonarlo es honesto; el día que alguien
 *     lo edite, se mueve a la capa y se limpia.
 *
 * LOS COMENTARIOS SE QUITAN ANTES DE MEDIR. No es cosmético: la cabecera de cada hoja de este
 * programa EXPLICA las prohibiciones, así que menciona `!important` y `#f4b248` en prosa. Sin
 * quitar comentarios, la puerta se pone roja por su propia documentación.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTILOS = path.join(RAIZ, 'src/styles');

/** DERIVADOS o anteriores al programa. Ver cabecera. */
const FUERA = new Set(['webflow.css', 'fuentes.css', 'estimador.css']);

/** Presupuesto de peso de la capa, sin comentarios. `webflow.css` son 167 KB: una capa de
 *  autor que pase de la mitad ya no está elevando Webflow, lo está reescribiendo. */
const TOPE_BYTES = 80 * 1024;

const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Divide en reglas de nivel superior conservando el contexto de la at-rule que las envuelve. */
function reglas(css) {
  const out = [];
  let prof = 0, sel = '', cuerpo = '', enCuerpo = false, pila = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      prof++;
      if (prof === 1) { enCuerpo = true; cuerpo = ''; }
      else cuerpo += c;
      if (prof === 1 && sel.trim().startsWith('@')) pila = [sel.trim()];
    } else if (c === '}') {
      prof--;
      if (prof === 0) { out.push({ sel: sel.trim(), cuerpo, dentroDe: pila[0] || '' }); sel = ''; enCuerpo = false; pila = []; }
      else cuerpo += c;
    } else if (enCuerpo) cuerpo += c;
    else sel += c;
  }
  // Las at-rules (@media, @keyframes) traen reglas anidadas: se aplanan conservando quién las envuelve.
  const plano = [];
  for (const r of out) {
    if (r.sel.startsWith('@')) {
      for (const h of reglas(r.cuerpo)) plano.push({ ...h, dentroDe: r.sel });
    } else plano.push(r);
  }
  return plano;
}

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 6) => { xs.slice(0, n).forEach((x) => console.log(`       ${x}`)); if (xs.length > n) console.log(`       ... y ${xs.length - n} mas`); };

// ── la capa ────────────────────────────────────────────────────────────────
const capa = [
  ...fs.readdirSync(path.join(ESTILOS, 'disenio')).filter((f) => f.endsWith('.css')).map((f) => `disenio/${f}`),
  ...fs.readdirSync(ESTILOS).filter((f) => f.endsWith('.css') && !FUERA.has(f)),
].map((rel) => ({ rel, txt: sinComentarios(fs.readFileSync(path.join(ESTILOS, rel), 'utf8')) }));

console.log(`\ncheck:tokens — ${capa.length} hojas en la capa de diseño\n`);

const hits = (re, filtro = () => true) => capa.flatMap(({ rel, txt }) =>
  [...txt.matchAll(re)].filter((m) => filtro(rel, m))
    .map((m) => `${rel}:${txt.slice(0, m.index).split('\n').length}  ${m[0].trim().slice(0, 60)}`));

// 1 · cero !important — si una regla lo necesita, está mal puesta
const imp = hits(/!important/g);
check('cero `!important` en la capa', imp.length === 0, `${imp.length}`); lista(imp);

// 2 · cero @layer — webflow.css son 167 KB SIN capa, y toda regla sin capa gana a toda regla
//     con capa: envolver esto en una la haría perder contra TODO Webflow.
const lay = hits(/@layer\b/g);
check('cero `@layer` en la capa', lay.length === 0, `${lay.length}`); lista(lay);

// 3 · los literales de color solo viven en disenio/tokens.css
const col = hits(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g, (rel) => rel !== 'disenio/tokens.css');
check('literales de color solo en disenio/tokens.css', col.length === 0, `${col.length} fuera`); lista(col);

// 4 · los ~66 tokens shadcn muertos de webflow.css no se consumen (solo 3 de los 81 se usan)
const apps = hits(/--_apps---[\w-]*/g);
check('cero referencias a los tokens shadcn muertos', apps.length === 0, `${apps.length}`); lista(apps);

// 5 · nunca `forwards` — deja `transform: matrix(1,0,0,1,0,0)` en vez de `none`, y eso crea
//     contexto de apilamiento que rompe los descendientes `fixed`/`absolute`.
const fwd = hits(/animation[^;{}]*\bforwards\b/g);
check('cero `animation-fill-mode: forwards`', fwd.length === 0, `${fwd.length}`); lista(fwd);

// 6 · selectores de `disenio/` bajo prefijo propio
const malSel = capa.filter(({ rel }) => rel.startsWith('disenio/') && rel !== 'disenio/tokens.css')
  .flatMap(({ rel, txt }) => reglas(txt).map((r) => r.sel).filter((s) => s && !s.startsWith('@'))
    .flatMap((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .filter((s) => !/^(:root|html|\.mm-|\.pe-|\.svc-)/.test(s))
    .map((s) => `${rel}  ${s.slice(0, 70)}`));
check('en disenio/, todo selector es :root/html/.mm-/.pe-/.svc-', malSel.length === 0, `${malSel.length}`); lista(malSel);

// ── seguridad, también en los <style> de componentes ────────────────────────
// Un `opacity: 0` ESTÁTICO e incondicional es como se rompió AMS: elementos invisibles para
// siempre. Los legítimos van dentro de @keyframes, cuelgan de `html[data-anim]` o de un
// atributo de estado — esos NO cuentan. Medido: los 9 de components/ son de los tres tipos.
const componentes = [];
(function barrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) barrer(p);
    else if (e.name.endsWith('.astro')) {
      for (const m of fs.readFileSync(p, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
        componentes.push({ rel: path.relative(RAIZ, p), txt: sinComentarios(m[1]) });
    }
  }
}(path.join(RAIZ, 'src/components')));

const opacos = [...capa, ...componentes].flatMap(({ rel, txt }) => {
  const todas = reglas(txt);
  // «Algo tiene que volver a encenderlo»: si otra regla del MISMO fichero menciona la misma
  // clase y sube la opacidad, el 0 es el estado de reposo de una transicion, no un elemento
  // perdido. Es el invariante de verdad; el resto de heuristicas (transition declarada, selector
  // con atributo) dan por bueno tambien lo que esta roto.
  const enciende = (sel) => {
    const clases = [...sel.matchAll(/\.[\w-]+/g)].map((m) => m[0]);
    if (!clases.length) return false;
    const ultima = clases[clases.length - 1];
    return todas.some((o) => o.sel !== sel && o.sel.includes(ultima)
      && /opacity\s*:\s*(?!0(\s*;|\s*$))[\d.]+/.test(o.cuerpo));
  };
  return todas.filter((r) => /(^|[;{\s])opacity\s*:\s*0(\s*;|\s*$)/.test(r.cuerpo))
    .filter((r) => !r.dentroDe.startsWith('@keyframes'))
    .filter((r) => !/data-anim/.test(r.sel))
    // Un selector con atributo de ESTADO (.menu[data-oculto]) se exime porque lo que
    // ensena el elemento es la AUSENCIA del atributo: no existe regla que lo encienda.
    .filter((r) => !/\[[\w-]+([~^|*$]?=|\])/.test(r.sel))
    .filter((r) => !enciende(r.sel))
    .map((r) => `${rel}  ${r.sel.slice(0, 64)}`);
});
check('cero `opacity: 0` estático fuera de html[data-anim]', opacos.length === 0,
  `${opacos.length} (${componentes.length} bloques <style> barridos)`); lista(opacos);

const fwdComp = componentes.flatMap(({ rel, txt }) => [...txt.matchAll(/animation[^;{}]*\bforwards\b/g)].map(() => rel));
check('cero `forwards` en los <style> de componentes', fwdComp.length === 0, `${fwdComp.length}`); lista(fwdComp);

// ── presupuesto de peso ────────────────────────────────────────────────────
const bytes = capa.reduce((n, { txt }) => n + txt.length, 0);
check(`la capa pesa ${(bytes / 1024).toFixed(1)} KB de ${(TOPE_BYTES / 1024).toFixed(0)} KB`, bytes <= TOPE_BYTES,
  bytes > TOPE_BYTES ? `${((bytes - TOPE_BYTES) / 1024).toFixed(1)} KB de mas` : `${((TOPE_BYTES - bytes) / 1024).toFixed(1)} KB libres`);

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} de 9 comprobaciones`}\n`);
process.exit(fallos === 0 ? 0 : 1);
