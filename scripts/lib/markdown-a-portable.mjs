/**
 * MARKDOWN → PORTABLE TEXT, acotado a lo que sabe pintar `src/lib/portable-text.mjs`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE MARKDOWN Y NO PORTABLE TEXT A MANO
 *
 * Un articulo de 2.000 palabras son ~120 bloques de Portable Text, cada uno con su `_key`, sus
 * `children`, sus `marks` y sus `markDefs`. Escribir 90 asi es escribir 10.000 objetos JSON a
 * mano: el sitio donde un `_key` repetido o un `markDef` huerfano se cuela sin que nadie lo vea.
 *
 * En Markdown el articulo se lee como un articulo, que ademas es como se revisa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ACOTADO A PROPOSITO, Y FALLA CERRADO
 *
 * Solo se acepta lo que el serializador sabe pintar: h2, h3, h4, parrafo, listas de viñeta y
 * numeradas, negrita, cursiva, enlaces, figuras y tablas. Cualquier otra cosa —un `> cita`, un
 * `# h1`, una imagen de Markdown— LANZA con el numero de linea.
 *
 * Si aceptara de mas, el serializador reventaria el build despues; si lo ignorara en silencio,
 * el parrafo desapareceria del sitio. Las dos puntas cerradas.
 *
 * LAS FIGURAS NO SON `![alt](src)`. Una figura necesita `srcset`, `sizes`, `width` y `height`
 * medidos, y eso no cabe en Markdown ni debe inventarlo el que escribe. Se referencian por
 * NOMBRE y las resuelve quien publica:
 *
 *     {{figura: construction-3}}
 *
 * LAS `_key` SON DETERMINISTAS, derivadas del slug y del indice del bloque. Re-publicar un
 * articulo no cambia las claves, asi que Sanity no ve un cambio donde no lo hay.
 */

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

const revienta = (linea, n, msg) => {
  throw new Error(`markdown-a-portable [linea ${n}]: ${msg}\n    ${linea.slice(0, 90)}\n`
    + '  El conversor falla CERRADO: solo acepta lo que sabe pintar src/lib/portable-text.mjs.');
};

/** Texto en linea -> children + markDefs. Soporta **negrita**, *cursiva* y [texto](/href). */
function inline(txt, semilla, nLinea) {
  const children = [];
  const markDefs = [];
  let i = 0;
  let buf = '';
  const marcas = [];
  const empuja = () => {
    if (!buf) return;
    children.push({ _type: 'span', _key: `s${hash(`${semilla}:${children.length}:${buf}`)}`,
      text: buf, marks: [...marcas] });
    buf = '';
  };
  while (i < txt.length) {
    if (txt.startsWith('**', i)) {
      empuja();
      if (marcas.includes('strong')) marcas.splice(marcas.indexOf('strong'), 1);
      else marcas.push('strong');
      i += 2; continue;
    }
    if (txt[i] === '*' && txt[i + 1] !== '*') {
      empuja();
      if (marcas.includes('em')) marcas.splice(marcas.indexOf('em'), 1);
      else marcas.push('em');
      i += 1; continue;
    }
    if (txt[i] === '[') {
      const cierre = txt.indexOf('](', i);
      const fin = cierre >= 0 ? txt.indexOf(')', cierre) : -1;
      if (cierre < 0 || fin < 0) revienta(txt, nLinea, 'un `[` de enlace sin cerrar');
      const etiqueta = txt.slice(i + 1, cierre);
      const href = txt.slice(cierre + 2, fin);
      if (!href.startsWith('/') && !/^https?:\/\//i.test(href)) {
        revienta(txt, nLinea, `el enlace «${href}» no empieza por / ni por http(s)://`);
      }
      empuja();
      const k = `l${hash(`${semilla}:${href}:${etiqueta}`)}`;
      markDefs.push({ _key: k, _type: 'link', href });
      children.push({ _type: 'span', _key: `s${hash(`${semilla}:${k}`)}`, text: etiqueta,
        marks: [...marcas, k] });
      i = fin + 1; continue;
    }
    buf += txt[i]; i += 1;
  }
  empuja();
  if (marcas.length) revienta(txt, nLinea, `queda una marca sin cerrar: ${marcas.join(', ')}`);
  if (!children.length) children.push({ _type: 'span', _key: `s${hash(semilla)}`, text: '', marks: [] });
  return { children, markDefs };
}

const ESTILO = { '## ': 'h2', '### ': 'h3', '#### ': 'h4' };

export function markdownAPortable(md, slug) {
  const lineas = md.replace(/\r/g, '').split('\n');
  const bloques = [];
  const nuevo = (extra, semilla) => {
    const { children, markDefs } = inline(extra.texto, `${slug}:${bloques.length}:${semilla}`, extra.n);
    const b = { _type: 'block', _key: `b${hash(`${slug}:${bloques.length}`)}`,
      style: extra.style ?? 'normal', children };
    if (markDefs.length) b.markDefs = markDefs;
    if (extra.listItem) { b.listItem = extra.listItem; b.level = 1; }
    bloques.push(b);
  };

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const n = i + 1;
    if (!l.trim()) continue;

    if (l.startsWith('# ')) revienta(l, n, 'un `# h1`: el H1 es el titulo de la pagina, no del cuerpo');
    if (l.startsWith('>')) revienta(l, n, 'una cita `>`: el serializador no la pinta');
    if (/^!\[/.test(l)) revienta(l, n, 'una imagen de Markdown: usa {{figura: nombre}}');
    if (/^\s*```/.test(l)) revienta(l, n, 'un bloque de codigo: no se pinta en estos articulos');

    const fig = l.match(/^\{\{\s*figura:\s*([a-z0-9-]+)\s*\}\}$/i);
    if (fig) { bloques.push({ _type: 'figuraRef', _key: `f${hash(`${slug}:${bloques.length}`)}`, ref: fig[1] }); continue; }

    const est = Object.keys(ESTILO).find((p) => l.startsWith(p));
    if (est) { nuevo({ texto: l.slice(est.length).trim(), style: ESTILO[est], n }, 'h'); continue; }

    if (/^[-*]\s+/.test(l)) { nuevo({ texto: l.replace(/^[-*]\s+/, ''), listItem: 'bullet', n }, 'ul'); continue; }
    if (/^\d+[.)]\s+/.test(l)) { nuevo({ texto: l.replace(/^\d+[.)]\s+/, ''), listItem: 'number', n }, 'ol'); continue; }

    /* Tabla: cabecera, separador `|---|` y filas. Se lee de golpe. */
    if (l.trim().startsWith('|')) {
      const celdas = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(lineas[i + 1] ?? '')) {
        revienta(l, n, 'una tabla sin su fila separadora |---|---|');
      }
      const filas = [{ celdas: celdas(l) }];
      let j = i + 2;
      while (j < lineas.length && lineas[j].trim().startsWith('|')) { filas.push({ celdas: celdas(lineas[j]) }); j++; }
      const anchos = new Set(filas.map((f) => f.celdas.length));
      if (anchos.size !== 1) revienta(l, n, `filas de anchos distintos (${[...anchos].join(', ')})`);
      bloques.push({ _type: 'tabla', _key: `t${hash(`${slug}:${bloques.length}`)}`, filas });
      i = j - 1; continue;
    }

    nuevo({ texto: l.trim(), n }, 'p');
  }
  return bloques;
}

/** Comprobacion ejecutable. `node scripts/lib/markdown-a-portable.mjs` */
if (import.meta.url === `file://${process.argv[1]}`) {
  const assert = (c, m) => { if (!c) { console.error('  FALLA:', m); process.exitCode = 1; } else console.log('  ok  ', m); };
  const b = markdownAPortable([
    '## Seccion',
    'Un parrafo con **negrita**, *cursiva* y un [enlace](/services/x).',
    '- uno',
    '- dos',
    '1. primero',
    '{{figura: construction-3}}',
    '| Factor | Por que |',
    '|---|---|',
    '| A | B |',
  ].join('\n'), 'prueba');

  assert(b[0].style === 'h2', 'la cabecera ## da un h2');
  assert(b[1].children.some((c) => c.marks.includes('strong')), 'la negrita da marca strong');
  assert(b[1].children.some((c) => c.marks.includes('em')), 'la cursiva da marca em');
  assert(b[1].markDefs?.[0]?.href === '/services/x', 'el enlace guarda su href');
  assert(b[2].listItem === 'bullet' && b[3].listItem === 'bullet', 'las viñetas son bullet');
  assert(b[4].listItem === 'number', 'la lista numerada es number');
  assert(b[5]._type === 'figuraRef' && b[5].ref === 'construction-3', 'la figura se referencia por nombre');
  assert(b[6]._type === 'tabla' && b[6].filas.length === 2, 'la tabla lee cabecera y fila');
  const dos = markdownAPortable('## Seccion\nUn parrafo.', 'prueba');
  assert(JSON.stringify(dos.slice(0, 1)) === JSON.stringify(b.slice(0, 1)), 'las _key son deterministas');
  for (const [md, que] of [['# Titulo', 'un h1'], ['> cita', 'una cita'], ['![a](b)', 'una imagen'],
    ['Texto **sin cerrar', 'una marca sin cerrar'], ['[roto](sin-barra)', 'un href relativo malo']]) {
    let lanzo = false;
    try { markdownAPortable(md, 'p'); } catch { lanzo = true; }
    assert(lanzo, `falla cerrado ante ${que}`);
  }
}
