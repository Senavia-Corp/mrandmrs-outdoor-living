#!/usr/bin/env node
/**
 * PUERTA de la fase R8 — la disciplina de la capa de diseño.
 *
 *     npm run check:tokens          (estática, sin navegador, <1 s)
 *
 * POR QUÉ EXISTE, Y POR QUÉ LA CORRE CADA TRABAJADOR. El Programa R reparte el CSS entre
 * tres chats que no se ven entre sí y que no construyen. Sin una puerta barata que cada uno
 * pueda correr en su sitio, la capa se pudre en silencio: un hex literal aquí, un
 * `!important` allá, y en dos semanas el sistema de diseño es una hoja de parches.
 *
 * DOS ÁMBITOS, Y NO SON EL MISMO. Una puerta que nace roja se desactiva a la semana, así que
 * cada regla se aplica donde de verdad está limpio hoy, medido antes de escribirla.
 *
 *   1. LA CAPA DE DISEÑO — `src/styles/**.css` menos los DERIVADOS. Es lo que escribe este
 *      programa: 0 violaciones de las reglas duras. Aquí se aplica TODO, sin perdonados.
 *   2. LOS BLOQUES `<style>` de `src/components`, `src/layouts`, `src/pages` y `src/data` —
 *      solo las reglas de SEGURIDAD. Sus literales de color y su `!important` heredado
 *      (`.svc [hidden]{display:none!important}`, defensa legítima contra la cascada de
 *      Webflow) son anteriores al programa y se declaran aquí en vez de perdonarse callando.
 *
 * EXCLUIDOS, con su motivo: `webflow.css` y `fuentes.css` son DERIVADOS (los genera
 * `build-css.mjs`); `estimador.css` es de la Fase 12c, anterior al programa —hoy con 1
 * `!important` y 38 literales de color, 5 de ellos `oklch()` de la paleta shadcn muerta—. El
 * día que alguien lo edite se mueve a la capa y se limpia.
 *
 * LOS COMENTARIOS SE QUITAN ANTES DE MEDIR. No es cosmético: la cabecera de cada hoja de este
 * programa EXPLICA las prohibiciones, así que menciona `!important` y `#f4b248` en prosa. Sin
 * quitarlos, la puerta se pondría roja por su propia documentación.
 *
 * ── ENDURECIDA el 1-sep-2026 tras una auditoría adversarial de cuatro lentes (parser,
 *    alcance, evasión de regex, rutas de error) con refutación de cada hallazgo. De 48
 *    propuestos sobrevivieron 35. Lo que cerró, y por qué cada uno importaba:
 *
 *   · `opacity: 0 !important`, `0%` y `0.0` pasaban verde. Es la variante MÁS difícil de
 *     revertir del desastre de AMS —invisible para siempre Y blindada contra la cascada— y
 *     esquivaba las dos únicas reglas que miran componentes.
 *   · `animation-fill-mode: both` hace exactamente lo que `forwards`, y solo se buscaba la
 *     palabra `forwards`. La puerta aplicaba la mitad de su propia regla declarada.
 *   · `enciende()` comparaba por SUBCADENA, así que cualquier clase derivada exculpaba a su
 *     raíz. Con BEM eso no es raro, es la norma: 5 clases raíz quedaban excusadas hoy mismo.
 *   · La capa se enumeraba con `readdirSync` PLANO y nada comprobaba cuántas hojas salían.
 *     Mover las hojas a una subcarpeta —gesto natural de orden— dejaba la puerta midiendo
 *     cero ficheros, con nueve `ok` y salida 0. El patrón exacto de §8 que ya falló abierto
 *     en `check-texto.mjs`.
 *   · El barrido de bloques `<style>` empezaba en `src/components`, o sea que vigilaba lo
 *     GENERADO (Nav y Footer los escribe `build-shell.mjs`) y dejaba fuera lo que se edita a
 *     mano: `Base.astro`, `index.astro` y el `plantilla-pool-builders.json` que `[slug]`
 *     inyecta con `set:html` en 53 rutas.
 *   · `reglas()` devolvía lista vacía cuando no sabía parsear, y eso se leía igual que
 *     «fichero limpio». Ausencia de señal como señal buena, otra vez.
 *
 *    Y dos FALSOS POSITIVOS, que son igual de graves porque son los que hacen que alguien
 *    desactive la puerta: un `@keyframes` envuelto en `@media` perdía su guarda, y el
 *    `split(',')` partía `:is(.mm-a, .mm-b)` por dentro.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTILOS = path.join(RAIZ, 'src/styles');

/** DERIVADOS o anteriores al programa. Ver cabecera. */
const FUERA = new Set(['webflow.css', 'fuentes.css', 'estimador.css']);

/** Raíces donde se buscan bloques `<style>`. `components` NO basta: ahí vive lo generado. */
const RAICES_BLOQUES = ['src/components', 'src/layouts', 'src/pages', 'src/data'];
const EXT_BLOQUES = new Set(['.astro', '.json', '.ts']);

/** Suelos. Una puerta que mide menos de lo que hay no debe poder salir verde. */
const MIN_HOJAS = 15;
const MIN_BLOQUES = 7;

/** Presupuesto de peso de la capa, sin comentarios. `webflow.css` son 167 KB: una capa de
 *  autor que pase de la mitad ya no está elevando Webflow, lo está reescribiendo. */
const TOPE_BYTES = 80 * 1024;

const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Parte CSS en reglas de nivel superior, aplanando las at-rules y conservando la PILA de las
 * que envuelven cada una. La pila importa: un `@keyframes` dentro de un `@media` seguía
 * siendo un `@keyframes`, y machacar el contexto con la at-rule exterior reportaba su
 * `from { opacity: 0 }` como violación.
 *
 * Devuelve `{ lista, ok }`. `ok:false` cuando las llaves no cierran o cuando hay `{` en el
 * texto y no sale ni una regla — porque una lista vacía por fallo de parseo se lee igual que
 * un fichero limpio, y ese es el modo de fallo que este repo ya ha tenido seis veces.
 */
function reglas(css, pila = []) {
  const out = [];
  let prof = 0, sel = '', cuerpo = '', enCuerpo = false;
  for (const c of css) {
    if (c === '{') {
      prof++;
      if (prof === 1) { enCuerpo = true; cuerpo = ''; } else cuerpo += c;
    } else if (c === '}') {
      prof--;
      if (prof === 0) { out.push({ sel: sel.trim(), cuerpo }); sel = ''; enCuerpo = false; }
      else cuerpo += c;
    } else if (enCuerpo) cuerpo += c;
    else sel += c;
  }
  const lista = [];
  for (const r of out) {
    if (r.sel.startsWith('@')) lista.push(...reglas(r.cuerpo, [...pila, r.sel]).lista);
    else lista.push({ ...r, pila });
  }
  const ok = prof === 0 && !(css.includes('{') && out.length === 0);
  return { lista, ok };
}

const enKeyframes = (r) => r.pila.some((a) => a.startsWith('@keyframes'));

/** Parte por comas de nivel superior: `:is(.mm-a, .mm-b) .mm-c` es UN selector, no dos. */
function porComas(sel) {
  const out = []; let prof = 0, act = '';
  for (const c of sel) {
    if (c === '(') prof++; else if (c === ')') prof--;
    if (c === ',' && prof === 0) { out.push(act.trim()); act = ''; } else act += c;
  }
  if (act.trim()) out.push(act.trim());
  return out;
}

let fallos = 0;
const check = (n, ok, d = '') => { console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const lista = (xs, n = 6) => { xs.slice(0, n).forEach((x) => console.log(`       ${x}`)); if (xs.length > n) console.log(`       ... y ${xs.length - n} mas`); };

// ── la capa, enumerada EN PROFUNDIDAD ───────────────────────────────────────
const hojas = [];
(function barrerCss(d, base = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) barrerCss(path.join(d, e.name), `${base}${e.name}/`);
    else if (e.name.endsWith('.css') && !FUERA.has(e.name)) hojas.push(`${base}${e.name}`);
  }
}(ESTILOS));
const capa = hojas.map((rel) => ({ rel, txt: sinComentarios(fs.readFileSync(path.join(ESTILOS, rel), 'utf8')) }));

// ── los bloques <style>, en las CUATRO raíces ───────────────────────────────
const componentes = [];
for (const raiz of RAICES_BLOQUES) {
  const dir = path.join(RAIZ, raiz);
  if (!fs.existsSync(dir)) continue;
  (function barrer(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { barrer(p); continue; }
      if (!EXT_BLOQUES.has(path.extname(e.name))) continue;
      // El CSS dentro de un .json o de una cadena JS viene escapado: sin desescapar, sus
      // at-rules no se aplanan y salen falsos positivos.
      const crudo = fs.readFileSync(p, 'utf8').replace(/\\n/g, '\n').replace(/\\"/g, '"');
      for (const m of crudo.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
        componentes.push({ rel: path.relative(RAIZ, p), txt: sinComentarios(m[1]) });
    }
  }(dir));
}

console.log(`\ncheck:tokens — ${capa.length} hojas en la capa · ${componentes.length} bloques <style>\n`);

const hits = (fuente, re, filtro = () => true) => fuente.flatMap(({ rel, txt }) =>
  [...txt.matchAll(re)].filter((m) => filtro(rel, m))
    .map((m) => `${rel}:${txt.slice(0, m.index).split('\n').length}  ${m[0].trim().slice(0, 60)}`));

// ── 0 · el parseo funcionó, en las dos fuentes ──────────────────────────────
// Va PRIMERA porque si esto falla, todo lo de abajo mide un fichero vacío y sale verde.
const ciegos = [...capa, ...componentes].filter(({ txt }) => !reglas(txt).ok).map(({ rel }) => rel);
check('todas las hojas y bloques se parsean', ciegos.length === 0, `${ciegos.length} sin parsear`); lista(ciegos);

// ── 1 · cero !important en la capa ──────────────────────────────────────────
const imp = hits(capa, /!\s*important/gi);
check('cero `!important` en la capa', imp.length === 0, `${imp.length}`); lista(imp);

// ── 2 · cero @layer ─────────────────────────────────────────────────────────
// webflow.css son 167 KB SIN capa, y toda regla sin capa gana a toda regla con capa.
const lay = hits(capa, /@layer\b/gi);
check('cero `@layer` en la capa', lay.length === 0, `${lay.length}`); lista(lay);

// ── 3 · literales de color solo en disenio/tokens.css ───────────────────────
// Se quita `var(...)` antes de mirar: `var(--mm-navy)` y `var(--grey, #ececec)` llevan la
// palabra dentro del NOMBRE DEL TOKEN, no como palabra clave de color. Medido: 20 casos así
// en el repo, y marcarlos habría puesto la puerta roja sobre CSS impecable.
const NOMBRES = 'white|black|red|blue|green|gray|grey|silver|navy|gold|orange|purple|yellow|teal|aqua|maroon|olive|lime|fuchsia|rebeccapurple';
const sinVar = (t) => t.replace(/var\([^()]*(\([^()]*\))?[^()]*\)/g, 'var(_)');
const colorLiteral = new RegExp(
  `#[0-9a-fA-F]{3,8}\\b`                                     // hex
  + `|\\brgba?\\([^)]*\\)|\\bhsla?\\([^)]*\\)`                // rgb / hsl
  + `|\\b(?:oklch|oklab|lab|lch|hwb|device-cmyk)\\s*\\(`      // las modernas
  + `|(?:^|[;{])\\s*(?:[\\w-]*color|background|border[\\w-]*|fill|stroke|outline)\\s*:[^;{}]*\\b(?:${NOMBRES})\\b`,
  'gi');
const col = capa.filter(({ rel }) => rel !== 'disenio/tokens.css')
  .flatMap(({ rel, txt }) => { const t = sinVar(txt); return [...t.matchAll(colorLiteral)]
    .map((m) => `${rel}:${t.slice(0, m.index).split('\n').length}  ${m[0].trim().slice(0, 56)}`); });
check('literales de color solo en disenio/tokens.css', col.length === 0, `${col.length} fuera`); lista(col);

// ── 4 · los ~66 tokens shadcn muertos no se consumen ────────────────────────
const apps = hits(capa, /--_apps---[\w-]*/g);
check('cero referencias a los tokens shadcn muertos', apps.length === 0, `${apps.length}`); lista(apps);

// ── 5 · ningún fill-mode que retenga el estado final ────────────────────────
// `forwards` Y `both`: los dos dejan `transform: matrix(1,0,0,1,0,0)` en vez de `none`, y eso
// crea contexto de apilamiento que rompe descendientes `fixed`/`absolute`.
const FILL = /animation[^;{}]*\b(forwards|both)\b|animation-fill-mode\s*:\s*(forwards|both)/gi;
const fwd = [...hits(capa, FILL), ...hits(componentes, FILL)];
check('cero fill-mode que retenga el estado final (`forwards`/`both`)', fwd.length === 0, `${fwd.length}`); lista(fwd);

// ── 6 · selectores de `disenio/` bajo prefijo propio ────────────────────────
// Se valida el selector ENTERO, no solo su arranque: `:root .hero-section .button` empieza
// bien y pisa Webflow globalmente, que es justo lo que la regla existe para impedir. `:root`
// y `html[...]` valen como raíz, pero lo que venga detrás tiene que llevar prefijo.
const PREFIJO = /^(\.mm-|\.pe-|\.svc-)/;
const RAIZ_OK = /^(:root|html)([.:[][^\s>+~]*)?$/;
const malSel = capa.filter(({ rel }) => rel.startsWith('disenio/'))
  .flatMap(({ rel, txt }) => reglas(txt).lista.filter((r) => !enKeyframes(r))
    .flatMap((r) => porComas(r.sel))
    .filter((s) => s && !/^(from|to|\d+%)$/.test(s))
    .filter((s) => {
      // Basta con que el PRIMER compuesto lleve prefijo: a partir de ahi el selector ya esta
      // acotado y descender a una clase de Webflow desde dentro de un ambito `.mm-` es
      // legitimo y deseado —son los ganchos del rediseno—. `.mm-pila > *` es correcto.
      // Lo que se cierra es `:root .hero-section .button`: arranca bien y pisa Webflow en
      // todo el sitio. `:root` y `html[...]` valen como raiz, pero lo siguiente lleva prefijo.
      const comp = s.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
      const resto = comp.filter((c, i) => !(i === 0 && RAIZ_OK.test(c)));
      return resto.length ? !PREFIJO.test(resto[0]) : false;
    })
    .map((s) => `${rel}  ${s.slice(0, 70)}`));
check('en disenio/, todo compuesto es .mm-/.pe-/.svc- (raiz :root/html permitida)',
  malSel.length === 0, `${malSel.length}`); lista(malSel);

// ── 7 · ningún `opacity: 0` estático ────────────────────────────────────────
// Así se rompió AMS: elementos invisibles para siempre. Legítimos: dentro de `@keyframes`,
// colgando de `html[data-anim]`, bajo un atributo de ESTADO (`data-*`/`aria-*`, donde lo que
// enseña el elemento es la AUSENCIA del atributo), o cuando otra regla vuelve a encenderlo.
// Se cubren `0`, `0.0`, `0%` y `0 !important` — esta última es la peor de todas: invisible
// para siempre Y blindada contra la cascada.
const OPACIDAD_CERO = /(^|[;{\s])opacity\s*:\s*(0|0?\.0+|0+%)\s*(!\s*important)?\s*(;|$)/i;
const ESTADO = /\[(data-|aria-)[\w-]+/;
const opacos = [...capa, ...componentes].flatMap(({ rel, txt }) => {
  const todas = reglas(txt).lista;
  // «Algo tiene que volver a encenderlo»: se compara por TOKEN de clase exacto, no por
  // subcadena — con BEM, `.mm-ig__velo` exculparía a `.mm-ig`— y se exige que suba a opacidad
  // de verdad. ponytail: el suelo es 0,5; si algún día hace falta un encendido a .3, se baja
  // aquí y se dice por qué.
  const enciende = (sel) => {
    const clases = [...sel.matchAll(/\.[\w-]+/g)].map((m) => m[0]);
    if (!clases.length) return false;
    const ultima = clases[clases.length - 1];
    const exacta = new RegExp(`${ultima.replace('.', '\\.')}(?![\\w-])`);
    return todas.some((o) => o.sel !== sel && exacta.test(o.sel)
      && [...o.cuerpo.matchAll(/opacity\s*:\s*([\d.]+)/g)].some((m) => parseFloat(m[1]) >= 0.5));
  };
  return todas.filter((r) => OPACIDAD_CERO.test(r.cuerpo))
    .filter((r) => !enKeyframes(r))
    .filter((r) => !/data-anim/.test(r.sel))
    .filter((r) => !ESTADO.test(r.sel))
    .filter((r) => !enciende(r.sel))
    .map((r) => `${rel}  ${r.sel.slice(0, 64)}`);
});
check('cero `opacity: 0` estático fuera de html[data-anim]', opacos.length === 0, `${opacos.length}`); lista(opacos);

// ── 8 · ningún `!important` sobre opacity, tampoco en componentes ───────────
// El `!important` general de los bloques `<style>` se perdona (ver cabecera), pero sobre
// `opacity` no: es lo que convierte un elemento oculto en un elemento IRRECUPERABLE.
const impOpacidad = hits(componentes, /opacity\s*:[^;{}]*!\s*important/gi);
check('cero `!important` sobre opacity en los bloques <style>', impOpacidad.length === 0, `${impOpacidad.length}`); lista(impOpacidad);

// ── 9 · suelos: la puerta no puede medir menos de lo que hay ────────────────
// Sin esto, mover las hojas a una subcarpeta dejaba la puerta en «0 hojas» y salida 0.
check(`la capa tiene al menos ${MIN_HOJAS} hojas`, capa.length >= MIN_HOJAS, `${capa.length}`);
check(`se barrieron al menos ${MIN_BLOQUES} bloques <style>`, componentes.length >= MIN_BLOQUES, `${componentes.length}`);

// ── 10 · presupuesto de peso ────────────────────────────────────────────────
const bytes = capa.reduce((n, { txt }) => n + txt.length, 0);
check(`la capa pesa ${(bytes / 1024).toFixed(1)} KB de ${(TOPE_BYTES / 1024).toFixed(0)} KB`, bytes <= TOPE_BYTES,
  bytes > TOPE_BYTES ? `${((bytes - TOPE_BYTES) / 1024).toFixed(1)} KB de mas` : `${((TOPE_BYTES - bytes) / 1024).toFixed(1)} KB libres`);

console.log(`\n     hojas: ${capa.map((h) => h.rel).join(' ')}`);
console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} de 11 comprobaciones`}\n`);
process.exit(fallos === 0 ? 0 : 1);
