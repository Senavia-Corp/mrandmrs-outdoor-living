#!/usr/bin/env node
/**
 * FASE 6b — convierte las N páginas estáticas de una colección en UNA plantilla que lee de Sanity.
 *
 *     npm run plantillas              todas las familias que se puedan
 *     npm run plantillas -- --dry-run mide y no escribe
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PLANTILLA NO SE ESCRIBE A MANO: SE DERIVA POR DIFF
 *
 * Escribir a mano una plantilla de 800 tokens de marcado de Webflow es la vía rápida a un
 * sitio «casi igual». Aquí se hace al revés: se tokenizan las N páginas ya generadas de la
 * familia y **lo que coincide en las N es literal; lo que varía es un hueco**. No hay criterio
 * humano que se pueda equivocar sobre qué era plantilla y qué era contenido.
 *
 * Después, cada hueco se le busca dueño: un campo de Sanity cuyo valor —escapado igual que lo
 * escapa el sitio— sea EXACTAMENTE el del hueco **en las N páginas**. Un campo que case en 52
 * de 53 no vale: sería una coincidencia, no una correspondencia.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA AUTOCOMPROBACIÓN ES LA PARTE IMPORTANTE
 *
 * Antes de borrar una sola página, la plantilla se renderiza para las N y se compara
 * **byte a byte** con la página que ya existía. Si no salen las N idénticas, no se borra nada
 * y esto sale en rojo. `check:texto` volvería a cazarlo después, pero para entonces ya se
 * habrían borrado los originales — y una red que solo avisa cuando ya no puedes volver atrás
 * no es una red.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS LISTAS SE SACAN DEL ESQUELETO ANTES DE ALINEAR
 *
 * El número de items de una lista de CMS es justo lo que cambia entre fichas, así que cada RUN
 * de `w-dyn-item` hermanos se sustituye por UN marcador antes de comparar. Con eso, cuatro de
 * las seis familias restantes alinean exactas. Una lista que sale IGUAL en las N no se toca:
 * es marcado, no contenido —las 53 ciudades listan las mismas entradas de blog—.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA VERSIÓN NO CONVIERTE, Y POR QUÉ (medido 28-ago-2026)
 *
 *   `blogs` (10) y `articles` (3) — el cuerpo es texto enriquecido: 529..1739 tokens y una
 *      estructura distinta por ficha. No hay diff posicional que alinee eso; necesitan
 *      renderizar Portable Text, y un Portable Text renderizado NO se puede demostrar idéntico
 *      byte a byte al HTML que produjo Webflow.
 *
 *   `project` (10) — un nodo de texto acaba con `\n` en nueve fichas y sin él en la décima.
 *      Ese byte no sale de ningún campo del CMS, así que la plantilla no lo puede reproducir.
 *
 *   `project`, `services`, `country`, `where-we-serves` — el
 *      `<script type="text/x-wf-template">` de Webflow lleva el HTML del primer item de la
 *      lista URL-codificado. Se sabe reconstruir (es la unidad de repetición codificada), pero
 *      hoy no se hace: sería la única pieza derivada de otra derivada.
 *
 * Convertirlas a medias sería peor que no convertirlas: cada familia entra entera y con las N
 * fichas reproducidas byte a byte, o no entra.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SECO = process.argv.includes('--dry-run');

/** Carpeta de páginas → tipo de documento en Sanity. */
const FAMILIAS = {
  'pool-builders': 'poolBuilder',
  services: 'service',
  project: 'project',
  blogs: 'blogPost',
  country: 'county',
  articles: 'article',
  'where-we-serves': 'serviceRegion',
};

// ── Sanity, en lectura y sin token ──────────────────────────────────────────
// El dataset es público (comprobado: estas consultas van sin cabecera de autorización). Por
// eso el build de Vercel no necesita el token de escritura, que es lo que se quiere: un
// secreto que no hace falta en producción no debe existir en producción.
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(RAIZ, '.env'), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const { SANITY_PROJECT_ID: PID, SANITY_DATASET: DS } = ENV;
const consulta = (q) => fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent(q)}`)
  .then((r) => r.json()).then((j) => { if (j.error) throw new Error(JSON.stringify(j.error)); return j.result; });

/**
 * El MISMO escapado que produce el sitio. Se comprueba, no se supone: si un campo de Sanity no
 * reproduce el hueco byte a byte con esto, ese hueco se queda sin mapear y sale en el informe.
 */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tok = (h) => h.split(/(<[^>]*>)/).filter((s) => s !== '');

/**
 * Puente activo → ruta local, que emite `import.mjs`. Sin él, de Sanity solo se puede sacar la
 * URL de su CDN, que es OTRA url: las páginas dejarían de pedir `/images/site/foo.avif` y la
 * comparación byte a byte contra lo que hay hoy fallaría por diseño.
 */
const RUTAS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/assets-locales.json'), 'utf8'));

/** Todos los documentos, por `_id`, para poder resolver las referencias de dentro de una lista. */
/**
 * Aplana el documento a `ruta.con.puntos -> texto`, hasta 3 niveles.
 *
 * Hace falta porque los huecos no viven solo en campos de primer nivel: el `alt` de una imagen
 * es `imagenIntro1.alt`, y el título es `seo.title`. Sin aplanar, esos huecos se quedaban sin
 * dueño y la familia entera se caía.
 */
function aplanar(d, pref = '', prof = 0, salida = {}) {
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('_')) continue;
    const ruta = pref ? `${pref}.${k}` : k;
    if (typeof v === 'string') salida[ruta] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && prof < 3) {
      // `@ruta` es la ruta LOCAL del activo, la que la pagina pide hoy. De Sanity solo se llega
      // a la URL de su CDN, que es otra, y entonces el `src` de un `<img>` se queda sin dueno y
      // la familia entera no se convierte. El puente lo emite `import.mjs`.
      if (v.asset?._ref && RUTAS[v.asset._ref]) salida[`${ruta}.@ruta`] = RUTAS[v.asset._ref];
      aplanar(v, ruta, prof + 1, salida);
    }
  }
  return salida;
}

/**
 * Las dos formas en que el valor de un campo aparece dentro del marcado.
 *
 * `url` hace falta por el `<script type="text/x-wf-template">` de Webflow, que lleva el HTML del
 * primer item de una lista **URL-codificado**: ahí dentro `/images/site/foo.avif` se escribe
 * `%2Fimages%2Fsite%2Ffoo.avif` y no casa con nada si solo se prueba el valor tal cual.
 */
const TX = [
  { n: '', f: (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') },
  { n: 'url', f: (v) => encodeURIComponent(v) },
];

/**
 * Busca el campo que explica las N versiones de un token.
 *
 * No exige que el token SEA el valor del campo: exige que, al **partir** las N cadenas por ese
 * valor, salgan los mismos trozos literales. Así se cubre de una vez el caso exacto
 * (`partes = ['','']`), el valor con un `\n` detrás, el valor incrustado en un JSON, y el valor
 * que aparece DOS veces en el mismo token —que es justo lo que pasa en la plantilla del
 * repetidor: la URL de la imagen sale en el `src` y otra vez en el JSON del lightbox—.
 */
function casarCampo(vals, campos, valorDe) {
  const candidatos = [];
  for (const k of campos) {
    for (const tx of TX) {
      let ref = null, ok = true, largo = 0;
      for (let j = 0; j < vals.length && ok; j++) {
        const v = valorDe(j, k);
        if (typeof v !== 'string' || !v) { ok = false; break; }
        const partes = vals[j].split(tx.f(v));
        if (partes.length < 2) { ok = false; break; }
        if (ref === null) ref = partes;
        else if (partes.length !== ref.length || partes.some((p, i) => p !== ref[i])) ok = false;
        largo += v.length;
      }
      if (ok && ref) candidatos.push({ campo: k, tx: tx.n, partes: ref, largo });
    }
  }
  if (!candidatos.length) return null;
  /**
   * SE ELIGE EL MÁS LARGO, Y ANTES EL QUE CASA ENTERO.
   *
   * Sin esto la partición encuentra campos cortos que «también encajan»: en `pool-builders`, el
   * párrafo «Homeowners trust us for custom pools & outdoor living in **Alachua**. Read our
   * reviews.» lo explicaba `name` = «Alachua» con el resto de literal, en vez de
   * `paragraphReviews`. Reproducía la página byte a byte y aun así era **falso**: editar ese
   * párrafo en el CMS no habría cambiado nada. Byte-exacto no implica bien mapeado.
   */
  const entero = (c) => (c.partes.length === 2 && !c.partes[0] && !c.partes[1] ? 1 : 0);
  candidatos.sort((a, b) => entero(b) - entero(a) || b.largo - a.largo);
  return candidatos[0];
}

/** Un hueco se renderiza como `partes.join(valor)`: eso reconstruye también las apariciones repetidas. */
const aPiezas = (m) => [m];

/**
 * Parte un token en piezas literales y huecos, comparando las N versiones.
 *
 * Un nodo de texto que varía es un hueco entero. Una ETIQUETA que varía casi nunca lo es: de
 * `<img src="…" loading="lazy" alt="…" class="image">` solo cambia el `alt`, y meter la
 * etiqueta entera como hueco obligaría a guardar en el CMS el `data-w-id` de Webflow y las
 * clases. Así que se compara **atributo a atributo** y solo se abre hueco donde el VALOR varía.
 *
 * Devuelve `null` si la estructura de la etiqueta no es la misma en las N — eso ya no es un
 * hueco, es otra plantilla, y hay que verlo, no taparlo.
 */
function trocear(vals, buscarCampo) {
  if (!vals[0].startsWith('<')) {
    const c = buscarCampo(vals);
    return c ? aPiezas(c) : null;
  }
  // Un solo campo puede explicar la etiqueta entera si solo cambia un valor dentro.
  const entera = buscarCampo(vals);
  if (entera) return aPiezas(entera);
  const RE = /([a-zA-Z_:][\w:.-]*)="([^"]*)"/g;
  const attrs = vals.map((v) => [...v.matchAll(RE)]);
  // el esqueleto es la etiqueta con los VALORES borrados: si no coincide en las N, la
  // estructura cambia y esto no es un hueco de contenido
  const esqueleto = vals.map((v, j) => {
    let s = '', ult = 0;
    for (const m of attrs[j]) { s += v.slice(ult, m.index + m[0].length - m[2].length - 1) + ' '; ult = m.index + m[0].length - 1; }
    return s + v.slice(ult);
  });
  if (new Set(esqueleto).size !== 1) return null;

  const piezas = [];
  let ult = 0;
  for (let a = 0; a < attrs[0].length; a++) {
    const valores = attrs.map((x) => x[a][2]);
    if (valores.every((x) => x === valores[0])) continue;      // atributo constante: literal
    const c = buscarCampo(valores);
    if (!c) return null;
    const ini = attrs[0][a].index + attrs[0][a][0].length - valores[0].length - 1;
    piezas.push(vals[0].slice(ult, ini), c);
    ult = ini + valores[0].length;
  }
  if (!piezas.length) return null;                              // varía algo que no es un valor
  piezas.push(vals[0].slice(ult));
  return piezas;
}

/**
 * Elementos que no anidan. Sin esta lista, contar `<img>` o `<br>` como apertura deja el
 * emparejado de etiquetas desbocado y el colapsado se come media página — medido: `services`
 * pasaba de 837 tokens a 31.
 */
const VACIOS = /^<(img|br|hr|input|meta|link|source|area|base|col|embed|param|track|wbr)\b/i;

/**
 * Saca las listas de colección del esqueleto.
 *
 * Cada RUN de `w-dyn-item` hermanos se sustituye por UN marcador `@@LISTAk@@`, no uno por item:
 * el número de items es justo lo que cambia entre fichas, así que un marcador por item volvería
 * a desalinear el esqueleto. Con el run colapsado, `services`, `project`, `country` y
 * `where-we-serves` alinean exactas.
 *
 * El límite de palabra en `\bw-dyn-item\b` es obligatorio: sin él casa también con
 * `w-dyn-items`, que es la clase del CONTENEDOR de la lista, y el colapsado se traga la lista
 * entera en vez de sus items.
 */
const ES_ITEM = (t) => t.startsWith('<') && /class="[^"]*\bw-dyn-item\b/.test(t);
function colapsar(ts) {
  const esqueleto = [], listas = [];
  let i = 0;
  while (i < ts.length) {
    if (!ES_ITEM(ts[i])) { esqueleto.push(ts[i++]); continue; }
    const run = [];
    while (i < ts.length && ES_ITEM(ts[i])) {
      const item = [ts[i]]; let prof = 1; i++;
      while (i < ts.length && prof > 0) {
        const t = ts[i];
        if (t.startsWith('</')) prof--;
        else if (t.startsWith('<') && !t.endsWith('/>') && !VACIOS.test(t)) prof++;
        item.push(t); i++;
      }
      run.push(item);
    }
    esqueleto.push(`@@LISTA${listas.length}@@`);
    listas.push(run);
  }
  return { esqueleto, listas };
}

/** Lee una página generada y la parte en sus piezas. Devuelve null si no tiene la forma esperada. */
function despiezar(txt) {
  const bloques = [...txt.matchAll(/^const (T\d+) = (".*");$/gm)].map((m) => [m[1], JSON.parse(m[2])]);
  const base = txt.match(/^<Base ([^\n]*?)>$/m);
  const seo = txt.match(/^const SEO = (\{.*\});$/m);
  const ld = txt.match(/^const LD_CRUDO = (\[.*\]);$/m);
  const cuerpo = txt.slice(txt.indexOf('<Base '));
  if (!bloques.length || !base || !seo || !ld) return null;
  return {
    bloques,
    props: base[1],
    seo: JSON.parse(seo[1]),
    ldCrudo: JSON.parse(ld[1]),
    // el orden de <Fragment/> y widgets, que hay que reproducir tal cual
    montaje: [...cuerpo.matchAll(/<(Fragment set:html=\{(T\d+)\}|[A-Z][A-Za-z]*) \/>/g)].map((m) => m[2] ?? m[1]),
    imports: [...txt.matchAll(/^import .*;$/gm)].map((m) => m[0]),
  };
}

const TODOS = new Map((await consulta('*[!(_id in path("drafts.**"))]{...}')).map((d) => [d._id, d]));

/**
 * Aplana un elemento de lista a `campo -> texto`, resolviendo lo que el marcado necesita:
 *
 *  - una **referencia** se sustituye por el documento al que apunta (una lista de subservicios
 *    guarda referencias, y el marcado pinta el nombre y el slug del destino);
 *  - `@ruta` es la ruta LOCAL del activo, la que la página pide hoy.
 */
function aplanarElemento(el, RUTAS, TODOS) {
  const base = el?._type === 'reference' ? TODOS.get(el._ref) : el;
  if (!base) return {};
  const salida = aplanar(base);
  const ref = base.asset?._ref ?? el?.asset?._ref;
  if (ref && RUTAS[ref]) salida['@ruta'] = RUTAS[ref];
  // el alt vive en el USO, no en el destino de la referencia
  if (typeof el?.alt === 'string') salida.alt = el.alt;
  return salida;
}

/**
 * Deriva la plantilla de UNA lista: la unidad que se repite, y el array de Sanity que la llena.
 *
 * Devuelve `undefined` si la unidad no es uniforme (los items no tienen el mismo número de
 * tokens) y `null` si ningún array de Sanity tiene la longitud correcta en TODAS las fichas.
 * Se distinguen porque son dos problemas distintos y el informe tiene que decir cuál es.
 */
function derivarLista(runsPorPagina, slugs, C, RUTAS, TODOS) {
  const items = runsPorPagina.flatMap((r, j) => r.map((it, i) => ({ it, j, i })));
  if (!items.length) return null;
  const L = items[0].it.length;
  if (items.some((x) => x.it.length !== L)) return undefined;

  // ¿qué array de Sanity tiene, en cada ficha, tantos elementos como items hay?
  const doc0 = C.get(slugs[0]) ?? {};
  const candidatos = Object.keys(doc0).filter((k) => !k.startsWith('_') && Array.isArray(doc0[k]));
  const campoArray = candidatos.find((k) => slugs.every((s, j) => (C.get(s)?.[k]?.length ?? 0) === runsPorPagina[j].length));
  if (!campoArray) return null;

  const elems = items.map((x) => aplanarElemento(C.get(slugs[x.j])[campoArray][x.i], RUTAS, TODOS));
  const clavesElem = [...new Set(elems.flatMap(Object.keys))];
  const buscar = (vals) => casarCampo(vals, clavesElem, (n, k) => elems[n]?.[k]);

  const trozos = [];
  let buf = '';
  for (let i = 0; i < L; i++) {
    const vals = items.map((x) => x.it[i]);
    if (vals.every((v) => v === vals[0])) { buf += vals[0]; continue; }
    const piezas = trocear(vals, buscar);
    if (!piezas) return undefined;
    for (const p of piezas) {
      if (typeof p === 'string') buf += p;
      else { trozos.push(buf, p); buf = ''; }
    }
  }
  trozos.push(buf);
  const refs = elems.some((e) => e['@ruta']) || runsPorPagina.flat().length === 0;
  return { campoArray, trozos, deref: (C.get(slugs[0])?.[campoArray] ?? []).some((x) => x?._type === 'reference'), conRuta: refs };
}

const informe = [];
/**
 * `fallos` es ROTO: la autocomprobación no reproduce las páginas, una ficha no tiene documento,
 * una página no tiene la forma esperada. `pendientes` es NO CONVERTIDA TODAVÍA: la familia sigue
 * estática y funcionando, solo que su plantilla aún no se sabe derivar. Mezclarlos haría que
 * este script saliera siempre en rojo y dejara de significar nada.
 */
let fallos = 0, pendientes = 0;

for (const [dir, tipo] of Object.entries(FAMILIAS)) {
  const D = path.join(RAIZ, 'src/pages', dir);
  const ficheros = fs.readdirSync(D).filter((f) => f.endsWith('.astro') && !f.startsWith('[')).sort();
  if (!ficheros.length) {
    // La familia ya esta convertida: sus paginas estaticas se borraron al escribir la plantilla.
    // Se dice, porque si no este script parece no hacer nada y no se sabe por que.
    if (fs.existsSync(path.join(D, '[slug].astro'))) {
      informe.push([dir, 0, 'ya convertida — para rederivarla: `npm run paginas` primero (repone las estaticas desde _source/vivo)']);
    }
    continue;
  }
  const slugs = ficheros.map((f) => f.replace(/\.astro$/, ''));
  const piezas = ficheros.map((f) => despiezar(fs.readFileSync(path.join(D, f), 'utf8')));

  if (piezas.some((p) => !p)) {
    informe.push([dir, ficheros.length, 'una o mas paginas no tienen la forma esperada']); fallos++; continue;
  }
  const nombresBloque = new Set(piezas.map((p) => p.bloques.map((b) => b[0]).join('+')));
  const montajes = new Set(piezas.map((p) => p.montaje.join('+')));
  const importes = new Set(piezas.map((p) => p.imports.join('\n')));
  if (nombresBloque.size !== 1 || montajes.size !== 1 || importes.size !== 1) {
    informe.push([dir, ficheros.length, 'el montaje de la pagina varia entre fichas']); fallos++; continue;
  }

  // ── tokens, bloque a bloque, con las listas fuera del esqueleto ───────────
  const nBloques = piezas[0].bloques.length;
  const porBloque = [];       // porBloque[b][j] = tokens del ESQUELETO
  const listasBloque = [];    // listasBloque[b][j] = [ [itemTokens,…], … ] por lista
  let uniforme = true;
  for (let b = 0; b < nBloques; b++) {
    const c = piezas.map((p) => colapsar(tok(p.bloques[b][1])));
    if (new Set(c.map((x) => x.esqueleto.length)).size !== 1
      || new Set(c.map((x) => x.listas.length)).size !== 1) { uniforme = false; break; }
    porBloque.push(c.map((x) => x.esqueleto));
    listasBloque.push(c.map((x) => x.listas));
  }
  if (!uniforme) {
    const largos = piezas.map((p) => colapsar(tok(p.bloques.map((b) => b[1]).join(''))).esqueleto.length);
    informe.push([dir, ficheros.length,
      `NO uniforme sin contar las listas (${Math.min(...largos)}..${Math.max(...largos)} tokens): `
      + 'el cuerpo cambia de estructura, no solo de contenido (texto enriquecido)']);
    pendientes++; continue;
  }

  // ── los documentos ────────────────────────────────────────────────────────
  const crudos = await consulta(`*[_type=="${tipo}"]{..., "slug": slug.current}`);
  const docs = crudos.map((d) => aplanar(d));
  const P = new Map(docs.map((d) => [d.slug, d]));
  const C = new Map(crudos.map((d) => [d.slug.current ?? d.slug, d]));
  const sinDoc = slugs.filter((s) => !P.has(s));
  if (sinDoc.length) {
    informe.push([dir, ficheros.length, `${sinDoc.length} pagina(s) sin documento en Sanity: ${sinDoc.slice(0, 3).join(', ')}`]);
    fallos++; continue;
  }
  const campos = [...new Set(docs.flatMap(Object.keys))];

  /** Un hueco tiene dueño solo si UN campo casa en las N fichas. En 52 de 53 no vale. */
  const buscarCampo = (vals) => casarCampo(vals, campos, (j, k) => P.get(slugs[j])?.[k]);

  const plantilla = [];   // por bloque: [literal, {campo}|{lista}, literal, ...]
  const sinMapear = [];
  const listas = [];      // metadatos de cada lista derivada
  for (let b = 0; b < nBloques; b++) {
    const t = porBloque[b];
    const trozos = [];
    let buf = '';
    for (let i = 0; i < t[0].length; i++) {
      const vals = slugs.map((s, j) => t[j][i]);

      // un marcador de lista es igual en las N -por eso el esqueleto alinea-, así que hay que
      // interceptarlo ANTES de darlo por literal
      const mLista = vals[0].match(/^@@LISTA(\d+)@@$/);
      if (mLista && vals.every((v) => v === vals[0])) {
        const k = Number(mLista[1]);
        const runs = listasBloque[b].map((L) => L[k]);

        // Una lista que sale IGUAL en las N fichas no es contenido variable: es marcado. Las 53
        // ciudades de `pool-builders` listan las mismas entradas de blog, y tratarlas como lista
        // obligaría a buscarles un array de Sanity que no existe. Se vuelve a poner tal cual.
        const plano = runs.map((r) => r.map((it) => it.join('')).join(''));
        if (plano.every((x) => x === plano[0])) { buf += plano[0]; continue; }

        const derivada = derivarLista(runs, slugs, C, RUTAS, TODOS);
        if (!derivada) { sinMapear.push([b, i, `lista ${k}: ${derivada === null ? 'sin array en Sanity que case' : 'unidad no uniforme'}`]); continue; }
        trozos.push(buf, { lista: listas.length }); buf = '';
        listas.push(derivada);
        continue;
      }

      if (vals.every((v) => v === vals[0])) { buf += vals[0]; continue; }
      const piezas = trocear(vals, buscarCampo);
      if (!piezas) {
        sinMapear.push([b, i, vals[0].slice(0, 100)]);
        buf += vals[0];   // se queda el de la primera ficha: la autocomprobación lo cazará
        continue;
      }
      for (const p of piezas) {
        if (typeof p === 'string') buf += p;
        else { trozos.push(buf, p); buf = ''; }
      }
    }
    trozos.push(buf);
    plantilla.push(trozos);
  }

  if (sinMapear.length) {
    informe.push([dir, ficheros.length, `${sinMapear.length} hueco(s) sin dueno en Sanity: ${sinMapear.map((x) => `#${x[1]}`).join(' ')}`]);
    pendientes++;
    for (const [b, i, v] of sinMapear.slice(0, 5)) console.log(`      T${b} #${i}  ${v}`);
    continue;
  }

  /**
   * SEGUNDA PASADA — los campos que valen LO MISMO en las N fichas.
   *
   * El diff, por definición, solo abre hueco donde algo cambia. Pero `headingReviews` vale
   * «What Our Clients Say» en las 53 ciudades, así que quedaba como literal: el campo existe en
   * Sanity, se ve en el estudio, y editarlo **no habría cambiado nada en la página**. Un CMS con
   * campos que no hacen nada es peor que no tenerlos, porque nadie se entera hasta que alguien
   * edita uno y se pregunta por qué no pasa nada.
   *
   * Se convierte a hueco solo si el valor aparece **exactamente una vez** en toda la plantilla y
   * mide 8 caracteres o más: con menos, una palabra corriente casaría en cualquier sitio y el
   * hueco quedaría en un trozo de marcado que no es ese campo. Sigue pasando por la
   * autocomprobación byte a byte igual que todo lo demás.
   */
  const usados = new Set(plantilla.flat().filter((x) => typeof x !== 'string').map((x) => x.campo));
  let constantes = 0;
  for (const k of campos) {
    if (usados.has(k)) continue;
    const v = P.get(slugs[0])?.[k];
    if (typeof v !== 'string' || v.length < 8) continue;
    if (!slugs.every((s) => P.get(s)?.[k] === v)) continue;      // no es constante: ya lo vio el diff
    const aguja = esc(v);
    const total = plantilla.flat().filter((x) => typeof x === 'string')
      .reduce((n, s) => n + s.split(aguja).length - 1, 0);
    if (total !== 1) continue;                                    // 0 = no está; >1 = ambiguo
    for (const trozos of plantilla) {
      const i = trozos.findIndex((x) => typeof x === 'string' && x.includes(aguja));
      if (i < 0) continue;
      const [pre, post] = [trozos[i].slice(0, trozos[i].indexOf(aguja)), trozos[i].slice(trozos[i].indexOf(aguja) + aguja.length)];
      trozos.splice(i, 1, pre, { campo: k, tx: '', partes: ['', ''] }, post);
      usados.add(k); constantes++;
      break;
    }
  }

  // ── la autocomprobación: renderizar las N y comparar byte a byte ──────────
  const valor = (x, obj) => x.partes.join((TX.find((t) => t.n === x.tx) ?? TX[0]).f(obj[x.campo]));
  const pinta = (tr, obj) => tr.map((x) => (typeof x === 'string' ? x : valor(x, obj))).join('');
  const render = (slug) => {
    const d = P.get(slug), c = C.get(slug);
    return plantilla.map((trozos) => trozos.map((x) => {
      if (typeof x === 'string') return x;
      if (x.campo !== undefined) return valor(x, d);
      const L = listas[x.lista];
      return (c[L.campoArray] ?? []).map((el) => pinta(L.trozos, aplanarElemento(el, RUTAS, TODOS))).join('');
    }).join(''));
  };
  let iguales = 0;
  const distintas = [];
  for (const [j, s] of slugs.entries()) {
    const esperado = piezas[j].bloques.map((b) => b[1]);
    const salida = render(s);
    if (esperado.every((e, k) => e === salida[k])) iguales++; else distintas.push(s);
  }
  const huecos = plantilla.flat().filter((x) => typeof x !== 'string');
  if (iguales !== slugs.length) {
    informe.push([dir, ficheros.length, `ROJO autocomprobacion ${iguales}/${slugs.length}: ${distintas.slice(0, 3).join(', ')}`]);
    fallos++; continue;
  }

  informe.push([dir, ficheros.length,
    `OK ${iguales}/${slugs.length} identicas byte a byte · ${huecos.filter((h) => h.campo).length} huecos`
    + `${constantes ? ` (+${constantes} constantes)` : ''}`
    + `${listas.length ? ` + ${listas.length} lista(s) [${listas.map((L) => L.campoArray).join(', ')}]` : ''}`
    + ` → ${[...new Set(huecos.filter((h) => h.campo).map((h) => h.campo))].join(', ')}`]);

  if (SECO) continue;

  // ── el SEO por ruta ───────────────────────────────────────────────────────
  // `SEO.meta` y `SEO.jsonLd` NO salen de Sanity: son el `<head>` medido del sitio vivo, y
  // `check:seo` los compara byte a byte contra el baseline. Meterlos por el CMS ahora
  // significaria regenerarlos, y un JSON-LD regenerado es un JSON-LD distinto.
  const seoPorSlug = Object.fromEntries(slugs.map((s, j) => [s, { seo: piezas[j].seo, ldCrudo: piezas[j].ldCrudo }]));
  fs.writeFileSync(path.join(RAIZ, 'src/data', `seo-${dir}.json`), JSON.stringify(seoPorSlug, null, 1));

  // ── la plantilla ──────────────────────────────────────────────────────────
  const prof = '../'.repeat(dir.split('/').length + 1);
  // La plantilla viaja como dos listas paralelas: los trozos literales y, donde hay `null`, el
  // NOMBRE del campo que va ahí. Sin `eval` y sin plantillas de texto: los literales llevan
  // marcado de Webflow con comillas, llaves y acentos graves, y meterlos en un template string
  // sería pedir que un backtick suelto rompiera el fichero.
  const LIT = plantilla.map((tr) => tr.map((x) => (typeof x === 'string' ? x : null)));
  // en cada hueco va o el NOMBRE de un campo, o `{lista:k}` para repetir la unidad k
  const hueco = (x) => (x.campo !== undefined ? { c: x.campo, tx: x.tx, p: x.partes } : { lista: x.lista });
  const CAMPOS = plantilla.map((tr) => tr.map((x) => (typeof x === 'string' ? null : hueco(x))));
  const LISTAS = listas.map((L) => ({
    campoArray: L.campoArray,
    lit: L.trozos.map((x) => (typeof x === 'string' ? x : null)),
    campos: L.trozos.map((x) => (typeof x === 'string' ? null : hueco(x))),
  }));

  const propsBase = piezas[0].props
    .replace(/titulo="[^"]*"/, 'titulo={d["seo.title"]}')
    .replace(/descripcion="[^"]*"/, 'descripcion={d["seo.description"]}')
    .replace(/ruta="[^"]*"/, `ruta={\`/${dir}/\${slug}\`}`);

  const salida = `---
// DERIVADO - no editar a mano. Lo genera scripts/build-plantillas.mjs por diff de las
// ${slugs.length} paginas que habia antes; la autocomprobacion las reprodujo ${iguales}/${slugs.length} byte a byte.
// Regenerar: npm run plantillas
${piezas[0].imports.join('\n')}
import SEO_RUTAS from '${prof}data/seo-${dir}.json';
import LIT from '${prof}data/plantilla-${dir}.json';${LISTAS.length
  ? `\nimport RUTAS from '${prof}data/assets-locales.json';` : ''}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Aplana el documento a rutas con puntos, igual que hizo el generador al derivar la plantilla. */
function aplanar(o, pref = '', prof = 0, salida = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    if (k.startsWith('_')) continue;
    const ruta = pref ? \`\${pref}.\${k}\` : k;
    if (typeof v === 'string') salida[ruta] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && prof < 3) {
      if (v.asset?._ref && RUTAS[v.asset._ref]) salida[\`\${ruta}.@ruta\`] = RUTAS[v.asset._ref];
      aplanar(v, ruta, prof + 1, salida);
    }
  }
  return salida;
}

export async function getStaticPaths() {
  // El proyecto y el dataset van AQUI DENTRO, no en una constante del modulo: Astro extrae
  // \`getStaticPaths\` a su propio modulo para el prerender y alli no existe nada de fuera.
  // El sintoma era \`PID is not defined\` al construir, no al escribir el codigo.
  const PID = import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? ${JSON.stringify(PID)};
  const DS = import.meta.env.PUBLIC_SANITY_DATASET ?? ${JSON.stringify(DS)};
  // Las listas se piden con su proyeccion: las de REFERENCIAS con \`->\` para traer el documento
  // destino, porque el marcado pinta su nombre y su slug, no el identificador.
  const q = '*[_type=="${tipo}" && defined(slug.current)]{..., "slug": slug.current${
  LISTAS.map((L, k) => `, "@L${k}": ${L.campoArray}[]${listas[k].deref ? '->' : ''}{...}`).join('')}}';
  const r = await fetch(\`https://\${PID}.api.sanity.io/v2024-01-01/data/query/\${DS}?query=\${encodeURIComponent(q)}\`);
  const { result, error } = await r.json();
  // Sin datos no se construye media coleccion: se para el build. ${slugs.length} URLs que
  // desaparecen en silencio son ${slugs.length} 404 con el despliegue en verde.
  if (error || !result?.length) throw new Error('Sanity no devolvio ${tipo}: ' + JSON.stringify(error ?? 'vacio'));
  return result.map((doc) => ({ params: { slug: doc.slug }, props: { doc } }));
}

const { slug } = Astro.params;
${LISTAS.length ? 'const doc = Astro.props.doc;\nconst d = aplanar(doc);' : 'const d = aplanar(Astro.props.doc);'}
const CAMPOS = ${JSON.stringify(CAMPOS)};${LISTAS.length ? `\nconst LISTAS = ${JSON.stringify(LISTAS)};` : ''}

${LISTAS.length ? `/** Un elemento de lista, aplanado igual que en el generador, con la ruta local del activo. */
function elemento(el) {
  const f = aplanar(el);
  const ref = el?.asset?._ref;
  if (ref && RUTAS[ref]) f['@ruta'] = RUTAS[ref];
  return f;
}` : ''}
const TX = { '': esc, url: encodeURIComponent };
const valor = (h, o) => {
  const v = o[h.c];
  // Un campo vacio deja un hueco mudo en la pagina. Mejor que reviente el build.
  if (typeof v !== 'string') throw new Error(\`\${slug}: falta el campo \${h.c}\`);
  return h.p.join(TX[h.tx](v));
};
${LISTAS.length ? "const pinta = (lit, campos, o) => lit.map((x, i) => (x === null ? valor(campos[i], o) : x)).join('');" : ''}

const B = LIT.map((tr, b) => tr.map((x, i) => {
  if (x !== null) return x;
  const h = CAMPOS[b][i];${LISTAS.length ? `
  if (h.lista !== undefined) {
    const L = LISTAS[h.lista];
    return (doc['@L' + h.lista] ?? []).map((el) => pinta(L.lit, L.campos, elemento(el))).join('');
  }` : ''}
  return valor(h, d);
}).join(''));

const { seo: SEO, ldCrudo: LD_CRUDO } = SEO_RUTAS[slug];
---
<Base ${propsBase}>
${piezas[0].montaje.map((m) => (/^T\d+$/.test(m)
    ? `  <Fragment set:html={B[${piezas[0].bloques.findIndex((b) => b[0] === m)}]} />`
    : `  <${m} />`)).join('\n')}
</Base>
`;
  fs.mkdirSync(path.join(RAIZ, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'src/data', `plantilla-${dir}.json`), JSON.stringify(LIT));
  fs.writeFileSync(path.join(D, '[slug].astro'), salida);
  for (const f of ficheros) fs.unlinkSync(path.join(D, f));
}

console.log('\n── plantillas ──\n');
for (const [dir, n, msg] of informe) console.log(`  ${dir.padEnd(16)} ${String(n).padStart(3)} paginas · ${msg}`);
console.log(`\n${fallos === 0 ? 'OK' : `ROJO — ${fallos} familia(s) ROTA(S)`}`
  + `${pendientes ? ` · ${pendientes} familia(s) aun sin convertir (siguen estaticas y funcionando)` : ''}`
  + `${SECO ? '  (dry-run: no se ha escrito nada)' : ''}\n`);
process.exit(fallos ? 1 : 0);
