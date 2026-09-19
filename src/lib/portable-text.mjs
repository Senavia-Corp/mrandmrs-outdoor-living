/**
 * EL SERIALIZADOR DE PORTABLE TEXT DEL BLOG.
 *
 * Convierte el campo `blog` de un `blogPost` en el HTML que va dentro de `.w-richtext`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE ESTA ESCRITO A MANO Y NO ES `@portabletext/to-html`
 *
 * Porque el objetivo no es «pintar Portable Text»: es pintar EXACTAMENTE el marcado que
 * `src/styles/lectura.css` ya estila y que `baseline/text/blogs_*.txt` ya congelo. Dos
 * ejemplos de por que una libreria generica no vale:
 *
 *   · Webflow emite `<ul role="list">`, no `<ul>`. El rol es redundante pero esta en el
 *     baseline del HTML y en las 10 fichas.
 *   · Las `<figure>` llevan las clases de Webflow (`w-richtext-align-center
 *     w-richtext-figure-type-image`) porque `lectura.css:177` cuelga de ellas.
 *
 * Y porque la libreria, ante un tipo que no conoce, PINTA NADA. Este falla CERRADO.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FALLA CERRADO, Y ESA ES SU RAZON DE SER
 *
 * Un estilo, una marca o un tipo de bloque que no este declarado aqui NO se ignora: lanza, con
 * el tipo puesto y el slug del articulo. El modo de fallo que mata es el contrario -un editor
 * marca un parrafo como `blockquote`, el serializador no lo conoce, y el parrafo DESAPARECE del
 * sitio sin que ninguna puerta lo note-. `check:texto` no cubre las rutas nuevas (no tienen
 * baseline) y `check:visual` solo ve el 1% de los pixeles.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE HAY HOY EN EL DATASET, MEDIDO SOBRE LOS 1.112 BLOQUES DE LOS 10 ARTICULOS
 *
 *   estilos   normal 706 · h3 121 · h2 71
 *   listas    bullet 164 · number 50
 *   marcas    strong 1101 · em 103
 *   markDefs  CERO -- los 10 articulos no tienen un solo enlace en el cuerpo, medido
 *   imagenes  CERO bloques `image` dentro de `blog`
 *
 * O sea que la migracion desde el HTML horneado NO PIERDE NADA: no hay enlaces que perder.
 * Lo que anade son `link` y `image`, que es justo lo que el encargo viene a arreglar.
 */

/**
 * Escape de TEXTO. Solo `&`, `<` y `>`.
 *
 * `"` NO se escapa, y no es una omision: dentro de un nodo de texto la comilla no significa
 * nada, y escaparla cambia los BYTES del HTML sin cambiar lo que se ve. Se pillo comparando la
 * salida contra la que ya servia el sitio: `52-60" blades` salia como `52-60&quot; blades` y las
 * paginas con pulgadas en el cuerpo crecian entre 10 y 30 bytes. Dentro de un atributo si hace
 * falta, y de eso se ocupa `escAttr`.
 */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Escape de valor de atributo: ahi `"` y `'` SI cierran el valor. */
const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ESTILOS = { normal: 'p', h2: 'h2', h3: 'h3', h4: 'h4' };
const MARCAS = { strong: 'strong', em: 'em', underline: 'u', 'strike-through': 's', code: 'code' };
const LISTAS = { bullet: 'ul', number: 'ol' };

const revienta = (ctx, msg) => {
  throw new Error(`portable-text [${ctx}]: ${msg}\n`
    + '  El serializador falla CERRADO a proposito: un bloque que no sabe pintar no se pinta a '
    + 'medias\n  ni desaparece en silencio. Declara el tipo en src/lib/portable-text.mjs, con su '
    + 'motivo.');
};

/** Abre y cierra UNA marca alrededor de un HTML ya pintado. */
function envuelve(m, dentro, markDefs, ctx) {
  if (MARCAS[m]) return `<${MARCAS[m]}>${dentro}</${MARCAS[m]}>`;
  const def = (markDefs ?? []).find((d) => d._key === m);
  if (!def) revienta(ctx, `marca "${m}" sin declarar y sin markDef que la defina`);
  if (def._type !== 'link') revienta(ctx, `anotacion de tipo "${def._type}"; solo se sabe pintar "link"`);
  if (!def.href) revienta(ctx, 'un link sin href');
  /* Externo: `rel` por seguridad. Interno (empieza por `/`): nada, que es navegacion del sitio
   * y un `target=_blank` en un enlace interno rompe el boton de atras. */
  const externo = /^https?:\/\//i.test(def.href);
  const extra = externo ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escAttr(def.href)}"${extra}>${dentro}</a>`;
}

/**
 * Los `span` de un bloque, con sus marcas ANIDADAS y no repetidas.
 *
 * Portable Text guarda las marcas PLANAS, una lista por span. Pintar cada span por separado
 * daria `<em>A </em><em><a>x</a></em><em> B</em>`: mismo texto, pero tres `<em>` donde el
 * origen tenia uno.
 *
 * NO ES COSMETICA. Lo encontro `check-portable-text.mjs` al comparar el perfil de etiquetas
 * despues del enlazado interno: «em 7->8». El enlazador parte un span para envolver la frase y,
 * si ese span ya llevaba `em`, los tres trozos lo heredaban. El texto no se movia —por eso
 * `check:texto` seguia verde— pero el marcado se multiplicaba en silencio.
 *
 * Asi que se agrupa: se toma la primera marca del span actual, se busca hasta donde llega la
 * racha de spans contiguos que TAMBIEN la llevan, se envuelve la racha entera una sola vez y se
 * recurre con esa marca ya quitada. Es la forma en que se hace en cualquier serializador serio,
 * y ademas deja el anidamiento estable: el orden de marcas que da Sanity manda.
 */
function pintaSpans(spans, markDefs, ctx) {
  let html = '';
  let i = 0;
  while (i < spans.length) {
    const sp = spans[i];
    if (sp._type !== 'span') revienta(ctx, `hijo de bloque de tipo "${sp._type}", solo se espera "span"`);
    const marcas = sp.marks ?? [];
    if (!marcas.length) { html += esc(sp.text ?? ''); i++; continue; }
    const m = marcas[0];
    let j = i;
    while (j < spans.length && (spans[j].marks ?? []).includes(m)) j++;
    const racha = spans.slice(i, j).map((s) => ({ ...s, marks: (s.marks ?? []).filter((x) => x !== m) }));
    html += envuelve(m, pintaSpans(racha, markDefs, ctx), markDefs, ctx);
    i = j;
  }
  return html;
}

const pintaHijos = (b, ctx) => pintaSpans(b.children ?? [], b.markDefs, ctx);

/**
 * Una `<figure>` con la forma EXACTA que emite `figurasBlog()` en `build-paginas.mjs:650`, que
 * es la que R22-BLOG-IMG dejo en produccion y la que `lectura.css:177` estila. `width`/`height`
 * literales: sin ellos hay CLS, y las 4 figuras que habia no los traian.
 */
function pintaFigura(b, ctx) {
  const { src, srcset, sizes, alt, ancho, alto, pie } = b;
  if (!src) revienta(ctx, 'bloque `image` sin `src` resuelto');
  if (alt === undefined || alt === null) revienta(ctx, `la imagen ${src} no tiene alt`);
  if (!ancho || !alto) revienta(ctx, `la imagen ${src} no trae ancho/alto: habria CLS`);
  const attrs = [
    `src="${escAttr(src)}"`,
    srcset ? `srcset="${escAttr(srcset)}"` : '',
    sizes ? `sizes="${escAttr(sizes)}"` : '',
    `alt="${escAttr(alt)}"`,
    `width="${ancho}"`, `height="${alto}"`,
    'loading="lazy"', 'decoding="async"',
  ].filter(Boolean).join(' ');
  /**
   * `pie` — el texto VISIBLE bajo la imagen. Ninguna de las 40 figuras heredadas lo trae, asi
   * que su marcado no se mueve un byte; existe para lo que no puede publicarse sin decir lo
   * que es.
   *
   * El caso concreto: iluminacion soffit y mobiliario exterior no tienen ni una foto de obra
   * del cliente —el dueno lo confirmo: «No tengo»— y sus articulos se ilustran con material
   * generado. La linea roja del proyecto (`00-PRINCIPIOS §3`) prohibe publicar como obra del
   * cliente algo que no lo es; no prohibe ilustrar. La diferencia entre una cosa y la otra es
   * exactamente este texto, y por eso es visible y no solo un `alt`.
   *
   * Webflow ya lo estila: `.w-richtext figure.w-richtext-figure-type-image > figcaption` con
   * `display:table-caption` y `caption-side:bottom`. Cero CSS nuevo.
   */
  const leyenda = pie ? `<figcaption>${esc(pie)}</figcaption>` : '';
  return '<figure class="w-richtext-align-center w-richtext-figure-type-image">'
    + `<div><img ${attrs}></div>${leyenda}</figure>`;
}

/**
 * Una tabla de comparacion. Va envuelta en un contenedor con `tabindex="0"` y `role="region"`:
 * una tabla que scrollea horizontalmente y NO es alcanzable con teclado es una trampa de
 * accesibilidad, y a 375 px una tabla de 3 columnas desborda si nadie declara que hace.
 */
function pintaTabla(b, ctx) {
  const filas = b.filas ?? [];
  if (!filas.length) revienta(ctx, 'bloque `tabla` sin filas');
  const anchos = new Set(filas.map((f) => (f.celdas ?? []).length));
  if (anchos.size !== 1) revienta(ctx, `filas de anchos distintos (${[...anchos].join(', ')})`);
  const cab = filas[0].celdas.map((c) => `<th scope="col">${esc(c)}</th>`).join('');
  const cuerpo = filas.slice(1)
    .map((f) => `<tr>${f.celdas.map((c, i) => (i === 0
      ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`)
    .join('');
  const titulo = b.titulo ? `<caption>${esc(b.titulo)}</caption>` : '';
  return `<div class="mm-tabla" role="region" tabindex="0"${b.titulo ? ` aria-label="${escAttr(b.titulo)}"` : ''}>`
    + `<table>${titulo}<thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
}

/**
 * Portable Text -> HTML.
 *
 * NO mete espacios en blanco entre elementos. Webflow emite el richtext minificado y el
 * `innerText` de un bloque depende de su estructura, no del sangrado: anadir saltos es pedirle
 * a `check:texto` -que compara al 100% sin tolerancia- que encuentre una diferencia.
 */
export function aHtml(bloques, ctx = 'sin contexto') {
  if (!Array.isArray(bloques)) revienta(ctx, `se esperaba un array y llego ${typeof bloques}`);
  const salida = [];
  let lista = null;     // 'bullet' | 'number'
  let items = [];

  const cierra = () => {
    if (!lista) return;
    salida.push(`<${LISTAS[lista]} role="list">${items.join('')}</${LISTAS[lista]}>`);
    lista = null; items = [];
  };

  for (const b of bloques) {
    if (b._type === 'image') { cierra(); salida.push(pintaFigura(b, ctx)); continue; }
    if (b._type === 'tabla') { cierra(); salida.push(pintaTabla(b, ctx)); continue; }
    if (b._type !== 'block') revienta(ctx, `bloque de tipo "${b._type}"`);

    if (b.listItem) {
      if (!LISTAS[b.listItem]) revienta(ctx, `listItem "${b.listItem}"`);
      /* Un nivel. Si algun dia hacen falta anidadas, se declara aqui: hoy `level` es 1 en los
       * 214 items del dataset y fingir soporte que no se ha probado es peor que no tenerlo. */
      if (b.level && b.level > 1) revienta(ctx, `lista anidada (level ${b.level}), no soportada`);
      if (lista && lista !== b.listItem) cierra();
      lista = b.listItem;
      items.push(`<li>${pintaHijos(b, ctx)}</li>`);
      continue;
    }

    cierra();
    const estilo = b.style ?? 'normal';
    if (!ESTILOS[estilo]) revienta(ctx, `estilo "${estilo}"`);
    const t = ESTILOS[estilo];
    const dentro = pintaHijos(b, ctx);
    /* Un bloque vacio no se emite: Webflow no los emitia y un <p></p> mueve el innerText. */
    if (!dentro.trim()) continue;
    salida.push(`<${t}>${dentro}</${t}>`);
  }
  cierra();
  return salida.join('');
}

/** Minutos de lectura, redondeando hacia arriba a 225 palabras/min. Derivado, no almacenado. */
export function minutosDeLectura(bloques) {
  const palabras = (bloques ?? [])
    .filter((b) => b._type === 'block')
    .flatMap((b) => (b.children ?? []).map((s) => s.text ?? ''))
    .join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palabras / 225));
}
