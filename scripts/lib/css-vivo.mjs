/**
 * ¿PUEDE CASAR UNA REGLA CON ALGUN ELEMENTO DEL SITIO? Criterio por clases, compartido por
 * `build-css-vivas.mjs` (que lista las clases que existen) y `build-css.mjs` (que poda con ellas).
 *
 * Un selector esta vivo si TODAS sus clases existen. `:is()`, `:where()` y `:has()` son
 * alternativas —basta con que una viva— y `:not()` se ignora. Un selector sin clases (de
 * elemento, de atributo, `:root`) cuenta como vivo: no se puede descartar mirando clases.
 * La primera version de este criterio trataba `:is(.a, .b) x` como muerto si `.a` lo estaba y
 * borro reglas vivas; se cazo en el diff. Por eso las alternativas se resuelven de dentro afuera.
 */

/** Parte por `sep` solo a profundidad cero de parentesis y corchetes. */
export function parte(txt, sep = ',') {
  const out = [];
  let prof = 0;
  let ini = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (ch === '(' || ch === '[') prof++;
    else if (ch === ')' || ch === ']') prof--;
    else if (ch === sep && prof === 0) { out.push(txt.slice(ini, i)); ini = i + 1; }
  }
  out.push(txt.slice(ini));
  return out.map((x) => x.trim()).filter(Boolean);
}

const cierre = (sel, desde) => {
  let i = desde;
  let prof = 1;
  while (prof && i < sel.length) { if (sel[i] === '(') prof++; else if (sel[i] === ')') prof--; i++; }
  return i;
};

/** @param {string} sel  un selector, sin comas de nivel superior  @param {Set<string>} C clases que existen */
export function vivo(sel, C) {
  for (let m = /:not\(/.exec(sel); m; m = /:not\(/.exec(sel)) sel = sel.slice(0, m.index) + sel.slice(cierre(sel, m.index + m[0].length));
  for (let m = /:(is|where|has)\(/.exec(sel); m; m = /:(is|where|has)\(/.exec(sel)) {
    const fin = cierre(sel, m.index + m[0].length);
    const ok = parte(sel.slice(m.index + m[0].length, fin - 1)).some((a) => vivo(a, C));
    sel = sel.slice(0, m.index) + (ok ? '' : '.__MUERTA__') + sel.slice(fin);
  }
  return [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].every((m) => C.has(m[1]));
}

/** Las reglas de estilo de una hoja, a cualquier profundidad de `@media`: `[{ pre, ini, fin }]`. */
export function reglas(css) {
  const t = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const out = [];
  const anda = (a, b) => {
    let i = a;
    while (i < b) {
      const j = t.indexOf('{', i);
      if (j < 0 || j >= b) return;
      const preIni = Math.max(t.lastIndexOf('}', j), t.lastIndexOf(';', j), a - 1) + 1;
      let prof = 1;
      let k = j + 1;
      while (prof) { if (t[k] === '{') prof++; else if (t[k] === '}') prof--; k++; }
      const pre = t.slice(Math.max(preIni, a), j).trim();
      if (pre.startsWith('@')) { if (/^@(media|supports|container|layer)/.test(pre)) anda(j + 1, k - 1); }
      else out.push({ pre, ini: Math.max(preIni, a), fin: k });
      i = k;
    }
  };
  anda(0, t.length);
  return out;
}

/** Quita de `css` las reglas que no pueden casar con `C`, y los `@media` que se queden vacios. */
export function poda(css, C) {
  const muertas = reglas(css).filter((r) => !parte(r.pre).some((s) => vivo(s, C)));
  let out = '';
  let i = 0;
  for (const r of muertas) { out += css.slice(i, r.ini); i = r.fin; }
  out += css.slice(i);
  for (let antes = ''; antes !== out;) { antes = out; out = out.replace(/@(media|supports|container)[^{};]*\{\s*\}/g, ''); }
  return { css: out, quitadas: muertas.length };
}
