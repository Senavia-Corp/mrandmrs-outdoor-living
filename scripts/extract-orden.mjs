#!/usr/bin/env node
/**
 * RESCATE — el orden manual de las colecciones de Webflow, que caduca con el dominio.
 *
 *     npm run orden
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO ES URGENTE Y NO PUEDE ESPERAR
 *
 * Las listas de colección del sitio se pintan en el **orden manual** que alguien fijó dentro de
 * Webflow. Ese orden **no está en ningún dato exportable**: no es `name`, ni la fecha, ni el id,
 * ni el orden de filas del CSV —comprobado en `/country/…broward`, cuyos índices en el CSV salen
 * `52, 50, 44, 38, 40, 39, 37, 29…`, con inversiones—. Vive **solo en el HTML que sirve el sitio
 * vivo**, así que el día que se corte el dominio deja de existir.
 *
 * Sin él, las 6 familias que aún no leen de Sanity no se pueden convertir nunca sin cambiar el
 * orden en que el visitante ve las cosas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ HACE
 *
 * Lee `baseline/html/*.html` —que ES la copia del vivo, ya capturada y versionada— saca de cada
 * lista de colección la secuencia de slugs a los que enlaza, y **fusiona todas las secuencias en
 * un orden global por colección** con un topológico. Si dos páginas se contradicen, lo dice y no
 * se lo inventa: un orden global que no existe es peor que no tenerlo.
 *
 * Sale `_source/orden-listas.json`, versionado. Que se use o no para cablear el CMS es otra
 * decisión; lo que no se puede es dejar que caduque.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const HTML = path.join(RAIZ, 'baseline/html');

/** Prefijo de ruta → nombre de la colección a la que pertenecen esos slugs. */
const COLECCION = {
  '/pool-builders/': 'poolBuilder',
  '/services/': 'service',
  '/project/': 'project',
  '/blogs/': 'blogPost',
  '/country/': 'county',
  '/articles/': 'article',
  '/where-we-serves/': 'serviceRegion',
  '/brochures/': 'brochure',
};

const VACIOS = /^<(img|br|hr|input|meta|link|source|area|base|col|embed|param|track|wbr)\b/i;
const tok = (h) => h.split(/(<[^>]*>)/).filter((s) => s !== '');
const ES_ITEM = (t) => t.startsWith('<') && /class="[^"]*\bw-dyn-item\b/.test(t);

/** Cada RUN de items hermanos, como lista de secuencias de tokens. */
function listas(ts) {
  const salida = [];
  let i = 0;
  while (i < ts.length) {
    if (!ES_ITEM(ts[i])) { i++; continue; }
    const run = [];
    while (i < ts.length && ES_ITEM(ts[i])) {
      const item = [ts[i]]; let prof = 1; i++;
      while (i < ts.length && prof > 0) {
        const t = ts[i];
        if (t.startsWith('</')) prof--;
        else if (t.startsWith('<') && !t.endsWith('/>') && !VACIOS.test(t)) prof++;
        item.push(t); i++;
      }
      run.push(item.join(''));
    }
    salida.push(run);
  }
  return salida;
}

// ── recoger todas las secuencias ────────────────────────────────────────────
const secuencias = {};   // coleccion -> [{origen, slugs}]
for (const f of fs.readdirSync(HTML).filter((x) => x.endsWith('.html')).sort()) {
  const ts = tok(fs.readFileSync(path.join(HTML, f), 'utf8'));
  for (const run of listas(ts)) {
    // ¿a qué colección enlaza este run? el primer href que case manda, y se exige que TODOS
    // los items enlacen a la misma: una lista mezclada no dice nada de un orden global
    const slugs = run.map((it) => {
      const m = it.match(/href="(\/[a-z-]+\/)([^"#?]+)"/);
      return m ? [m[1], m[2]] : null;
    });
    if (slugs.some((s) => !s)) continue;
    const pref = slugs[0][0];
    if (!COLECCION[pref] || slugs.some((s) => s[0] !== pref)) continue;
    if (run.length < 2) continue;                       // una lista de 1 no ordena nada
    (secuencias[COLECCION[pref]] ??= []).push({ origen: f, slugs: slugs.map((s) => s[1]) });
  }
}

/**
 * Fusiona N secuencias en un orden global (topológico de Kahn sobre «a va antes que b»).
 * Devuelve `{orden, conflictos}`. Un ciclo = dos páginas que se contradicen.
 */
function fusionar(secs) {
  const nodos = new Set(secs.flatMap((s) => s.slugs));
  const antes = new Map([...nodos].map((n) => [n, new Set()]));   // n -> los que van DESPUÉS
  const grado = new Map([...nodos].map((n) => [n, 0]));
  const visto = new Set();
  for (const { slugs } of secs) {
    for (let i = 0; i + 1 < slugs.length; i++) {
      const [a, b] = [slugs[i], slugs[i + 1]];
      if (a === b || visto.has(`${a}>${b}`)) continue;
      visto.add(`${a}>${b}`);
      antes.get(a).add(b);
      grado.set(b, grado.get(b) + 1);
    }
  }
  const cola = [...nodos].filter((n) => grado.get(n) === 0).sort();
  const orden = [];
  while (cola.length) {
    const n = cola.shift(); orden.push(n);
    for (const m of antes.get(n)) {
      grado.set(m, grado.get(m) - 1);
      if (grado.get(m) === 0) { cola.push(m); cola.sort(); }
    }
  }
  const enCiclo = [...nodos].filter((n) => !orden.includes(n));
  return { orden, conflictos: enCiclo };
}

const salida = {};
console.log('\n── orden manual rescatado del HTML vivo ──\n');
for (const [col, secs] of Object.entries(secuencias)) {
  const { orden, conflictos } = fusionar(secs);
  const cobertura = new Set(secs.flatMap((s) => s.slugs)).size;
  /**
   * Se guardan TAMBIÉN las secuencias crudas, no solo la fusión.
   *
   * En `service`, `blogPost` y `project` las páginas se contradicen entre sí —una ficha lista
   * «relacionados» en un orden y otra en otro— así que NO existe un orden global. Guardar solo
   * la fusión perdería justamente el dato de las familias que más lo necesitan, y ese dato
   * caduca con el dominio. Con las secuencias se puede reconstruir cada lista tal cual estaba.
   */
  salida[col] = { orden, elementos: cobertura, conflictos, secuencias: secs };
  console.log(`  ${col.padEnd(14)} ${String(secs.length).padStart(3)} listas · ${String(cobertura).padStart(3)} elementos distintos`
    + ` · orden global de ${orden.length}${conflictos.length ? `  🔴 ${conflictos.length} en conflicto: ${conflictos.slice(0, 4).join(', ')}` : '  ✅ sin contradicciones'}`);
}

fs.writeFileSync(path.join(RAIZ, '_source/orden-listas.json'), JSON.stringify(salida, null, 1));
console.log('\n  escrito _source/orden-listas.json\n');
console.log('  NOTA: esto solo se puede regenerar mientras `baseline/html/` refleje el sitio vivo.');
console.log('        Tras el corte de dominio, este fichero es la unica copia que queda.\n');
