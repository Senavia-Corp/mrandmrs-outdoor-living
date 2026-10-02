#!/usr/bin/env node
/**
 * R22-BLOG-IMG · BLOG-BANCO — deriva la imagen de los blogs y emite `src/data/imagenes-blog-por-ruta.json`.
 *
 *     node scripts/build-imagenes-blog.mjs           deriva y escribe
 *     node scripts/build-imagenes-blog.mjs --check    no escribe: falla si el dato no cuadra
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL CASTING VIVE EN CADA ARTICULO
 *
 * `contenido/blog/<slug>.md` declara su `portada.ref`, sus `figuras[].ref` y su `alt`, junto al
 * texto que ilustran. Desde BLOG-BANCO (1-oct-2026) van por ahi los 47, los 10 heredados de
 * Webflow incluidos: el objeto `CASTING` de R22 murio con el banco de `~/Downloads` que lo
 * alimentaba, y que desaparecio del disco.
 *
 * CUATRO FORMAS DE REF, Y LA LINEA QUE NO SE CRUZA (solo obra real del cliente, `00-PRINCIPIOS §3`):
 *
 *   · `bi-0504`              banco nuevo (`src/data/banco-imagenes.json`, BANCO-IMAGENES.md).
 *                            `porBanco()` se niega si no es aprobada y obra real, o si el
 *                            recorte 16:9 no es seguro.
 *   · `construction-7`       foto de `/gallery`; el veredicto es `gallery-procedencia.json`.
 *   · `<base de escalera>`   escalera heredada de R22/R23, ya publicada en
 *                            `public/images/blog/<slug-heredado>/`. Se sirve tal cual.
 *   · `diagrama-…`           dibujo, nunca foto; exige `pie`.
 *
 * Y NINGUNA FOTO DOS VECES. La puerta del final compara por PARECIDO VISUAL, no por nombre: la
 * misma foto vive a la vez en `/gallery`, en el banco y en una escalera heredada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS TAMAÑOS SALEN DE LA MEDIDA DE LECTURA, NO DE LO QUE HABIA
 *
 * `src/styles/lectura.css:103-105` topa la columna en `min(--mm-medida, 37em)`, que medido son
 * 650 px de 992 para arriba, 518 px de 991 para abajo y ~423 px a 479. La tarjeta pinta ~380 px.
 * De ahi los dos peldaños de cada uso y ni uno mas. Lo que habia eran 69 ficheros y 23,5 MB para
 * pintar 380 px, con la escalera llegando a 2752.
 *
 * TODO A 16:9. Mezclar relaciones de aspecto en una fila de tarjetas hace que la altura la fije
 * la mas alta y deje hueco en las demas (`CLAUDE.md` regla 4). Del banco solo entran como portada
 * las que declaran `16:9` en `recortes_seguros`; las de galeria se recortan centradas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { leeArticulos } from './lib/articulo.mjs';
import { graduarPortada } from './lib/grado-portada.mjs';
import { dhash, distancia, MISMA, DUDOSA } from './lib/parecido.mjs';
import { ordenaIndice } from '../src/lib/blog-datos.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'public/images/blog');
const DATO = path.join(RAIZ, 'src/data/imagenes-blog-por-ruta.json');
const SOLO_CHECK = process.argv.includes('--check');

/* Dos peldaños por uso: 1x y 2x de lo que se pinta de verdad. */
const TARJETA = [400, 800];
const FIGURA = [704, 1280];
const SIZES_TARJETA = '(min-width: 768px) 400px, 100vw';
const SIZES_FIGURA = '(min-width: 992px) 650px, (min-width: 768px) 518px, 100vw';
const ALTO = (w) => Math.round((w * 9) / 16);

let fallos = 0;
/** Las que reciben el levantado de sombra, para ENSEÑARLAS al final y no callarlas. */
const ajustadas = [];
/** R23 · las portadas, con su medida antes y despues. Tambien se enseñan. */
const graduadas = [];
/** Figuras del banco sin `16:9` seguro: pasan, pero se dicen. */
const avisos = [];
const mal = (m) => { console.log(`  🔴 ${m}`); fallos++; };

/* ── EL BANCO DE /gallery, POR REFERENCIA ────────────────────────────────────
 *
 * Los 90 articulos nuevos no tienen obra en el banco aprobado: se ilustran con las fotos que
 * `/gallery` ya publica, que es lo decidido («foto real del sitio, repitiendo» dentro del
 * cluster). Se nombran `servicio-indice` —`construction-7`— porque es como las vio el panel de
 * procedencia y como las escribe quien redacta.
 *
 * Y se RECHAZA lo que no sea obra del cliente. El veredicto vive en
 * `src/data/gallery-procedencia.json`: 137 fotos miradas una a una por un panel, 20 discutidas
 * y resueltas por el dueno de la obra. Aqui no se re-juzga nada; se obedece.
 *
 * UNA SOLA ESCALERA POR FOTO, COMPARTIDA. Una foto reutilizada en cinco articulos del cluster
 * derivaria cinco copias identicas si la carpeta fuera la del slug: ~22 MB de duplicado y cinco
 * descargas distintas para el visitante que lee dos articulos. Van a `public/images/blog/banco/`
 * y se sirven las mismas. Los 10 heredados NO se mueven: su salida es byte a byte la que ya
 * esta publicada, y moverla seria un cambio sin motivo.
 */
const PROCEDENCIA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/gallery-procedencia.json'), 'utf8')).servicios;
const BANCO_COMPARTIDO = 'banco';

/* ── DIAGRAMAS: LO QUE SE PUBLICA CUANDO NO HAY FOTO Y NO PUEDE HABERLA ─────
 *
 * Dos servicios no tienen ni una fotografia de obra propia: `light` (soffit LED) y `furniture`.
 * El dueno lo confirmo por escrito — «No tengo» — y pidio generar lo que hiciera falta. La
 * generacion por IA no esta disponible (Higgsfield responde `not_enough_credits`, y el unico
 * otro motor conectado solo edita), asi que sus articulos se ilustran con DIAGRAMAS dibujados:
 * donde caen los focos en un alero, que holgura pide una mesa, como es la seccion de un
 * material.
 *
 * Y es mejor asi, no un apano. Una figura que explica una decision gana siendo exacta: un SVG
 * mide 4 KB, escala a cualquier ancho sin escalera de imagenes, y —lo que importa aqui— NADIE
 * lo confunde con una foto de obra del cliente. La linea roja no se roza siquiera.
 *
 * Por eso un diagrama EXIGE `pie`: el texto visible bajo la figura que dice lo que es. Sin el,
 * `articulo.mjs` se niega a leer el articulo. Un `alt` no basta porque la mayoria no lo lee.
 */
const esDiagrama = (ref) => ref.startsWith('diagrama-');

const diagrama = (ref, alt, pie) => {
  const rel = `blog/diagramas/${ref.replace('diagrama-', '')}.svg`;
  const abs = path.join(RAIZ, 'public/images', rel);
  if (!fs.existsSync(abs)) throw new Error(`diagrama "${ref}": falta public/images/${rel}`);
  if (!pie || !pie.trim()) {
    throw new Error(`diagrama "${ref}" sin \`pie\`. Un diagrama se publica DICIENDO que es un diagrama.`);
  }
  const svg = fs.readFileSync(abs, 'utf8');
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!vb) throw new Error(`diagrama "${ref}": el SVG no declara viewBox="0 0 W H"; sin medidas hay CLS`);
  return {
    src: `/images/${rel}`, srcset: '', sizes: '', alt, pie,
    ancho: Math.round(Number(vb[1])), alto: Math.round(Number(vb[2])), _origen: 'diagrama',
  };
};

const porRef = (ref, alt, esPortada = false) => {
  const m = ref.match(/^([a-z]+)-(\d+)$/);
  if (!m) throw new Error(`ref "${ref}" no tiene la forma servicio-indice (p. ej. construction-7)`);
  const [, svc, i] = m;
  const fotos = PROCEDENCIA[svc];
  if (!fotos) throw new Error(`ref "${ref}": el servicio "${svc}" no existe en gallery-procedencia.json (hay: ${Object.keys(PROCEDENCIA).join(', ')})`);
  const f = fotos.find((x) => x.indice === Number(i));
  if (!f) throw new Error(`ref "${ref}": el servicio "${svc}" solo tiene ${fotos.length} fotos (0-${fotos.length - 1})`);
  if (!f.usable) {
    throw new Error(`🔴 ref "${ref}" NO ES PUBLICABLE como obra del cliente.\n`
      + `        veredicto: ${f.veredicto}\n`
      + `        motivo:    ${f.motivo}`);
  }
  const abs = path.join(RAIZ, 'public', f.src.replace(/^\//, ''));
  if (!fs.existsSync(abs)) throw new Error(`ref "${ref}": ${f.src} no existe en disco`);
  return { origen: 'gallery', fuente: abs, base: `mm-${ref}${esPortada ? '-p' : ''}`, alt, _fuente_publica: f.src, _ref: ref };
};

/* ── EL BANCO NUEVO, POR ID ──────────────────────────────────────────────────
 *
 * `bi-NNNN` es la entrada de `src/data/banco-imagenes.json`. La fuente es el WebP de 1600 px que
 * ya sirve `/images/banco/`; aqui se recorta a 16:9 centrado y se escalona como las demas.
 *
 * FALLA CERRADO en las reglas de BANCO-IMAGENES.md:
 *   · solo `aprobada*` y `procedencia: obra_real` (reglas 4 y 5);
 *   · una portada exige `16:9` en `recortes_seguros`;
 *   · `aprobada_con_recorte` solo vale en sus recortes seguros (regla 2), y aqui todo es 16:9.
 * Una `aprobada` sin `16:9` pasa como figura AVISANDO: el recorte centrado puede comerse el
 * sujeto, y eso se decide mirando la hoja de casting, no aqui.
 */
const BANCO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'));
const BANCO_ID = new Map(BANCO.map((e) => [e.id, e]));

const porBanco = (ref, alt, esPortada = false) => {
  const e = BANCO_ID.get(ref);
  if (!e) throw new Error(`ref "${ref}": no existe en banco-imagenes.json`);
  if (!e.estado.startsWith('aprobada') || e.procedencia !== 'obra_real') {
    throw new Error(`🔴 ref "${ref}" NO ES PUBLICABLE: estado ${e.estado}, procedencia ${e.procedencia}`);
  }
  const seguros = e.recortes_seguros ?? [];
  if (!seguros.includes('16:9')) {
    if (esPortada) throw new Error(`🔴 ref "${ref}": una portada exige 16:9 en recortes_seguros (tiene ${seguros.join(', ') || 'ninguno'})`);
    if (e.estado === 'aprobada_con_recorte') throw new Error(`🔴 ref "${ref}": aprobada_con_recorte y 16:9 no esta entre sus recortes seguros`);
    avisos.push(`${ref}: figura sin 16:9 seguro (${e.estado}) — mirar su recorte en la hoja`);
  }
  const abs = path.join(RAIZ, 'public', e.src);
  if (!fs.existsSync(abs)) throw new Error(`ref "${ref}": ${e.src} no existe en disco`);
  return { origen: 'banco', fuente: abs, base: `mm-${ref}${esPortada ? '-p' : ''}`, alt,
    _fuente_publica: e.src, _ref: ref, _proyecto: e.proyecto ?? null };
};

/* ── LAS ESCALERAS HEREDADAS, POR NOMBRE BASE ────────────────────────────────
 *
 * Los 10 articulos de Webflow se publicaron en R22/R23 con fotos del banco de `~/Downloads` y de
 * la galeria. Sus escaleras siguen en `public/images/blog/<slug>/` y SON lo publicado: se sirven
 * byte a byte, sin re-derivar (la fuente del banco viejo ya no existe). La ref es el nombre base
 * (`mrandmrs-pool-spa-a2-blog-project-062-04`), como las escribio SEO-SAFE en los `.md`.
 *
 * Una escalera de portada (400/800, graduada) no sirve de figura ni al reves: a la otra clase le
 * faltan los peldaños y no hay de donde sacarlos. Rojo.
 *
 * La casa: el banco nuevo reconoce dos de las tres del viejo (medido por dHash y mirado a ojo el
 * 1-oct-2026): project-059 = obra-046, project-061 = obra-088. La 062 no esta en el banco nuevo.
 */
const LEGADO_PROYECTO = { 'project-059': 'obra-046', 'project-061': 'obra-088', 'project-062': 'legado-062' };
const LEGADO = new Map();
for (const carpeta of fs.readdirSync(SALIDA)) {
  if (['banco', 'diagramas'].includes(carpeta) || !fs.statSync(path.join(SALIDA, carpeta)).isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(SALIDA, carpeta))) {
    const m = f.match(/^(.+)-(\d+)\.webp$/);
    if (!m) continue;
    if (!LEGADO.has(m[1])) LEGADO.set(m[1], { carpetas: new Set(), anchos: [] });
    LEGADO.get(m[1]).carpetas.add(carpeta);
    LEGADO.get(m[1]).anchos.push(Number(m[2]));
  }
}

const porLegado = (ref, alt, esPortada = false) => {
  const l = LEGADO.get(ref);
  if (!l) throw new Error(`ref "${ref}": no es bi-NNNN, ni servicio-indice, ni una escalera heredada de public/images/blog/`);
  if (l.carpetas.size !== 1) throw new Error(`ref "${ref}": la escalera esta en ${l.carpetas.size} carpetas heredadas`);
  const [carpeta] = l.carpetas;
  const anchos = [...l.anchos].sort((a, b) => a - b);
  const dePortada = anchos.every((w) => TARJETA.includes(w));
  /* Completa o rojo: sin un peldaño, el srcset se queda cojo y la portada (og:image) baja a 400. */
  const completa = anchos.length === 2 && (dePortada ? anchos[1] === 800 : anchos[0] === 704 && anchos[1] >= 1200);
  if (!completa) throw new Error(`ref "${ref}": escalera heredada incompleta (${anchos.join(', ')}); se esperan 400/800 o 704/12xx`);
  if (dePortada !== esPortada) {
    throw new Error(`ref "${ref}": es una escalera de ${dePortada ? 'portada' : 'figura'} y se usa como ${esPortada ? 'portada' : 'figura'}`);
  }
  const url = (w) => `/images/blog/${carpeta}/${ref}-${w}.webp`;
  const mayor = anchos[anchos.length - 1];
  return {
    src: url(mayor), srcset: anchos.map((w) => `${url(w)} ${w}w`).join(', '), alt,
    ancho: mayor, alto: ALTO(mayor), _origen: 'legado', _ref: ref,
    _proyecto: Object.entries(LEGADO_PROYECTO).find(([k]) => ref.includes(k))?.[1] ?? null,
  };
};

/* ── derivar ─────────────────────────────────────────────────────────────── */

const slugDe = (ruta) => ruta.split('/').pop();

async function peldanos(im, ruta, anchos, esPortada = false, carpeta = null) {
  const slug = carpeta ?? slugDe(ruta);
  const dir = path.join(SALIDA, slug);
  if (!SOLO_CHECK) fs.mkdirSync(dir, { recursive: true });
  const src = await sharp(im.fuente).metadata();
  /* TECHO REAL: el mayor 16:9 que cabe DENTRO del master, sin ampliar en ninguno de los dos ejes.
   * Los masters del banco son 1600x900 -16:9 exacto, no topan-. Los de galeria son 1250 de ancho
   * y 682-933 de alto: recortar a 16:9 desde 1250x698 pediria 703 px de alto y `fit:cover` los
   * inventaria. Por eso el techo mira tambien el alto. Sale un peldaño de 1241 en vez de 1280;
   * es feo de leer y es la medida real. */
  const techo = Math.min(src.width, Math.floor((src.height * 16) / 9));
  const anchosReales = [...new Set(anchos.map((w) => Math.min(w, techo)))].sort((a, b) => a - b);

  /* ── EXPOSICION: SE LEVANTA LA SOMBRA DE LAS SUBEXPUESTAS ────────────────────────────────
   *
   * Varias fotos del banco estan medidas para el cielo y dejan el sujeto en sombra. Se corrigen,
   * y la decision es POR MEDIDA, no a ojo, sobre el RECORTE ya hecho -el encuadre cambia la
   * media, asi que medir el master daria otro numero-.
   *
   * LOS DOS FILTROS. `media < 105` sola no vale: `059-08` da 92 y NO esta subexpuesta -es una
   * piscina azul brillante rodeada de seto en sombra, y subirla la lava-. Por eso ademas
   * `saturacion < 30`, que es lo que distingue «todo apagado» de «sujeto vivo, fondo oscuro».
   *
   * LA RECETA: `linear(0.90, 26)` + 8 % de saturacion. Es una RECTA de pendiente <1, o sea que
   * levanta los negros y comprime un poco las altas luces: 255 -> 255. Medido contra la
   * alternativa obvia -`modulate({lightness})`, que es una subida global-:
   *
   *     062-23   sin tocar  media  79  quemado 0,01 %
   *              L+6        media  94  quemado 4,61 %   <- revienta el cielo
   *              a.90 b26   media  97  quemado 0,01 %   <- y el negro baja de 4,75 % a 0 %
   *
   * Se probo tambien `a.86 b34`: sube mas, pero deja un velo gris en la lanai. Visto en hoja
   * comparativa de las tres, no deducido.
   *
   * 🚨 NO SE TOCA EL TONO. `R13-COLOR` dejo fuera a proposito las fotos reales de obra
   * (`check-assets.mjs`: «retonar el trabajo del cliente es peor»). Esto es exposicion y
   * saturacion, no rotacion de tono: la foto sigue diciendo el color que tenia. */
  const AJUSTE = { a: 0.90, b: 26, sat: 1.08 };
  /**
   * 🚨 EL DESPLAZAMIENTO VA EN LA ESCALA DEL PIPELINE, NO EN 0-255. Los `.avif` de galeria entran
   * como `depth=ushort` / `space=rgb16`, asi que un `+26` se aplica sobre 0-65535 y DESAPARECE:
   * queda solo la pendiente 0,90, que OSCURECE. Medido en la cocina exterior:
   *
   *     sin tocar            media 104,0
   *     linear(0.90, 26)     media  93,7   <- mas oscura que antes, justo lo contrario
   *     linear(0.90, 26*257) media 119,6   <- lo que se buscaba
   *
   * 257 = 65535/255. Cazado midiendo el RESULTADO, no leyendo el codigo: la puerta de este
   * script solo cuenta ficheros, y 64 webp mas oscuros de lo que estaban habrian salido verdes.
   */
  const escala = src.depth === 'ushort' ? 257 : 1;
  const muestra = await sharp(im.fuente)
    .resize(400, ALTO(400), { fit: 'cover', position: 'centre' }).toBuffer();
  const [cr, cg, cb] = (await sharp(muestra).stats()).channels;
  const media = 0.2126 * cr.mean + 0.7152 * cg.mean + 0.0722 * cb.mean;
  const sat = (Math.abs(cr.mean - cg.mean) + Math.abs(cg.mean - cb.mean) + Math.abs(cr.mean - cb.mean)) / 3;
  const subexpuesta = media < 105 && sat < 30;
  if (subexpuesta && !esPortada) ajustadas.push(`${im.base}  media ${media.toFixed(0)} sat ${sat.toFixed(0)}`);

  const partes = [];
  for (const w of anchosReales) {
    const destino = path.join(dir, `${im.base}-${w}.webp`);
    /* Sin banco se reutiliza lo ya derivado: re-derivar movería bytes versionados sin motivo. */
    /* ponytail: lo que ya existe no se re-deriva — la base lleva la ref, asi que mismo nombre es misma
     * foto. Para re-graduar una escalera, se borran sus ficheros y se vuelve a correr. */
    if (!SOLO_CHECK && !fs.existsSync(destino)) {
      if (esPortada) {
        /* R23 — grado fotografico completo. Sustituye al levantado de sombra: lo incluye y
         * ademas fija niveles, medios, contraste local y saturacion. Solo las portadas. */
        const g = await graduarPortada(im.fuente, w, ALTO(w), 86);
        fs.writeFileSync(destino, g.out);
        if (w === anchosReales[anchosReales.length - 1]) {
          graduadas.push(`${im.base}  media ${g.antes.media.toFixed(0)}->${g.despues.media.toFixed(0)}`
            + `  sat ${g.antes.sat.toFixed(0)}->${g.despues.sat.toFixed(0)}`
            + `  quemado ${g.antes.quemado.toFixed(2)}->${g.despues.quemado.toFixed(2)}%`
            + `  negro ${g.antes.negro.toFixed(2)}->${g.despues.negro.toFixed(2)}%`);
        }
      } else {
        let t = sharp(im.fuente).resize(w, ALTO(w), { fit: 'cover', position: 'centre' });
        if (subexpuesta) t = t.linear(AJUSTE.a, AJUSTE.b * escala).modulate({ saturation: AJUSTE.sat });
        await t.webp({ quality: 82 }).toFile(destino);
      }
    }
    if (!fs.existsSync(destino)) { mal(`falta ${path.relative(RAIZ, destino)}`); continue; }
    partes.push(`/images/blog/${slug}/${im.base}-${w}.webp ${w}w`);
  }
  const mayor = anchosReales[anchosReales.length - 1];
  return {
    src: `/images/blog/${slug}/${im.base}-${mayor}.webp`,
    srcset: partes.join(', '),
    alt: im.alt,
    ancho: mayor,
    alto: ALTO(mayor),
    _origen: im.origen,
    _ref: im._ref, _proyecto: im._proyecto ?? null, _fuente: im._fuente_publica,
  };
}


const salida = {
  _lee_esto: [
    'DERIVADO por scripts/build-imagenes-blog.mjs. No editar a mano: cada articulo declara sus',
    'imagenes en contenido/blog/<slug>.md, y cualquier cambio aqui se pierde al rederivar.',
    '',
    'Lo consume scripts/publica-blog.mjs, que escribe portada y figuras en el documento de Sanity.',
    '`_ref` es la ref declarada en el .md y `_proyecto` la casa (obra-NNN) cuando se sabe.',
  ],
  rutas: {},
};

const ARTICULOS = leeArticulos(path.join(RAIZ, 'contenido/blog'));

/* Una foto que aparece como portada y como figura deriva DOS escaleras (graduada y no, de ahi el
 * sufijo `-p`), pero nunca dos veces la misma. Todas van a `public/images/blog/banco/`. */
const yaDerivadas = new Map();
const peldanosCache = async (im, anchos, esPortada) => {
  const k = `${im.base}|${anchos.join(',')}|${esPortada}`;
  if (!yaDerivadas.has(k)) yaDerivadas.set(k, await peldanos(im, null, anchos, esPortada, BANCO_COMPARTIDO));
  return yaDerivadas.get(k);
};

/** La ref decide la fuente. El orden importa: `bi-0504` casaria con la forma de `/gallery`. */
const resuelve = async (ref, alt, esPortada, pie) => {
  if (esDiagrama(ref)) return diagrama(ref, alt, pie);
  const anchos = esPortada ? TARJETA : FIGURA;
  if (/^bi-\d{4}$/.test(ref)) return peldanosCache(porBanco(ref, alt, esPortada), anchos, esPortada);
  if (/^[a-z]+-\d+$/.test(ref)) return peldanosCache(porRef(ref, alt, esPortada), anchos, esPortada);
  return porLegado(ref, alt, esPortada);
};

for (const a of ARTICULOS) {
  const ruta = `/blogs/${a.frente.slug}`;
  try {
    const p = a.frente.portada;
    const portada = await resuelve(p.ref, p.alt, true, p.pie);
    const figuras = [];
    /* EN EL ORDEN DEL CUERPO, no en el del frontmatter: `publica-blog.mjs` resuelve cada
     * `{{figura: ref}}` por nombre, pero el indice de esta lista es lo que ve quien depura. */
    for (const ref of a.usadas) {
      const d = a.figuras.find((f) => f.ref === ref);
      const f = await resuelve(ref, d.alt, false, d.pie);
      figuras.push(esDiagrama(ref) ? f : { ...f, sizes: SIZES_FIGURA, alt: d.alt });
    }
    salida.rutas[ruta] = {
      tarjeta: esDiagrama(p.ref) ? portada : { ...portada, alt: p.alt, sizes: SIZES_TARJETA },
      figuras,
    };
  } catch (e) {
    mal(`${ruta}: ${e.message}`);
  }
}

/* ── invariantes: un numero sin comando es una opinion ─────────────────────
 *
 * DERIVADAS, no escritas: lo que se comprueba es la FORMA. Cada articulo tiene portada, al menos
 * una figura, y ningun alt vacio ni repetido dentro de si mismo.
 */
const rutas = Object.entries(salida.rutas);
const nImg = rutas.reduce((n, [, r]) => n + 1 + r.figuras.length, 0);
if (rutas.length !== ARTICULOS.length) mal(`${rutas.length} articulos derivados de ${ARTICULOS.length} ficheros en contenido/blog/`);
for (const [ruta, r] of rutas) {
  if (!r.figuras.length) mal(`${ruta}: ningun articulo se publica sin al menos una figura`);
  const suyos = [r.tarjeta.alt, ...r.figuras.map((f) => f.alt)];
  if (new Set(suyos).size !== suyos.length) mal(`${ruta}: tiene un alt repetido dentro del mismo articulo`);
  if (suyos.some((x) => !x || !x.trim())) mal(`${ruta}: hay un alt vacio`);
}

/* ── PUERTA DE DUPLICADOS (BLOG-BANCO, 1-oct-2026) ──────────────────────────
 *
 * «La idea es no tener fotos duplicadas en los blogs y portadas» (Sebastian). Rojo si:
 *
 *   1. dos portadas son la misma foto;
 *   2. una foto sale en dos articulos, tambien como portada de uno y cuerpo de otro;
 *   3. dos huecos con nombre distinto se parecen a <= MISMA (es la misma foto con otro fichero),
 *      o entre MISMA y DUDOSA sin estar mirados y declarados en DISTINTAS_A_OJO;
 *   4. la puerta no reconoce las parejas conocidas de `publicada_como`: descalibrada;
 *   5. dos portadas seguidas son de la misma casa en `/blogs-tips` o en el carrusel generico
 *      (`blogs.json`, que es tambien el orden de la home), o lo son dos de las 5 de una ficha
 *      (`contenido/roadmap-blog.json`). Una portada sin casa conocida no se da por buena: o se
 *      reconoce en el banco, o se declara en CASA_DECLARADA despues de mirarla;
 *   6. `usada_en` del banco no dice la verdad sobre el blog (regla 3 de BANCO-IMAGENES.md).
 *
 * UNA IDENTIDAD ES UNA FOTO: misma ref, o pixeles a <= MISMA. Se cuenta por identidades y no por
 * nombres porque 12 heredadas eran fotos de /gallery con otro nombre, y por nombre no salia.
 */
const DISTINTAS_A_OJO = {
  /* 'refA|refB': 'por que son fotos distintas aunque se parezcan (quien lo miro y cuando)', */
};
const CASA_DECLARADA = {
  /* 'construction-3': 'obra-NNN — mirado a ojo, fecha'   → es esa casa
   * 'construction-7': 'sola — mirado a ojo, fecha'       → casa propia: no coincide con ninguna otra */
};

const enLotes = async (xs, fn, n = 8) => { for (let i = 0; i < xs.length; i += n) await Promise.all(xs.slice(i, i + n).map(fn)); };
const huella = new Map();
const huellaDe = async (abs) => { if (!huella.has(abs) && fs.existsSync(abs)) huella.set(abs, await dhash(abs)); return huella.get(abs); };

const huecos = [];
for (const [ruta, r] of rutas) {
  for (const [rol, f] of [['portada', r.tarjeta], ...r.figuras.map((x) => ['figura', x])]) {
    if (f._origen === 'diagrama') continue;
    huecos.push({ slug: ruta.split('/').pop(), rol, ref: f._ref, abs: path.join(RAIZ, 'public', f.src), proyecto: f._proyecto });
  }
}
const elegibles = BANCO.filter((e) => e.estado.startsWith('aprobada') && e.procedencia === 'obra_real');
await enLotes([...huecos.map((h) => h.abs), ...elegibles.map((e) => path.join(RAIZ, 'public', e.src))], huellaDe);

/* 4 · calibracion: lo que se sabe que es la misma foto tiene que salir como la misma foto. */
let parejas = 0;
for (const e of elegibles) {
  for (const p of [].concat(e.publicada_como ?? [])) {
    const otra = path.join(RAIZ, 'public', p);
    if (!fs.existsSync(otra)) { mal(`calibracion: ${e.id} dice publicada_como ${p} y ese fichero no existe`); continue; }
    const d = distancia(await huellaDe(path.join(RAIZ, 'public', e.src)), await huellaDe(otra));
    parejas++;
    if (d > MISMA) mal(`puerta DESCALIBRADA: ${e.id} y ${p} son la misma foto y dan d=${d} (> ${MISMA})`);
  }
}
if (!parejas) mal('puerta sin calibrar: ninguna pareja de publicada_como con fichero servido');

/* Identidades: union de huecos por ref y por parecido. */
const padre = huecos.map((_, i) => i);
const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
const une = (i, j) => { padre[raiz(i)] = raiz(j); };
const dudosas = [];
for (let i = 0; i < huecos.length; i++) {
  for (let j = i + 1; j < huecos.length; j++) {
    const [a, b] = [huecos[i], huecos[j]];
    if (a.ref === b.ref) { une(i, j); continue; }
    const [ha, hb] = [huella.get(a.abs), huella.get(b.abs)];
    if (ha === undefined || hb === undefined) continue;
    const d = distancia(ha, hb);
    if (d <= MISMA) une(i, j);
    else if (d <= DUDOSA && !DISTINTAS_A_OJO[[a.ref, b.ref].sort().join('|')]) dudosas.push(`${a.ref} ~ ${b.ref} d=${d}`);
  }
}
const ident = new Map();
huecos.forEach((h, i) => {
  const k = raiz(i);
  if (!ident.has(k)) ident.set(k, { refs: new Set(), usos: [], bancos: new Set(), proyectos: new Set() });
  const x = ident.get(k);
  x.refs.add(h.ref); x.usos.push(h); h.id = k;
  if (/^bi-\d{4}$/.test(h.ref)) x.bancos.add(h.ref);
  if (h.proyecto) x.proyectos.add(h.proyecto);
});
/* El banco reconoce la foto aunque entre con otro nombre: casa y `usada_en` salen de ahi. */
for (const x of ident.values()) {
  const hs = [...new Set(x.usos.map((u) => huella.get(u.abs)).filter((v) => v !== undefined))];
  for (const e of elegibles) {
    const he = huella.get(path.join(RAIZ, 'public', e.src));
    if (he !== undefined && hs.some((h) => distancia(h, he) <= MISMA)) {
      x.bancos.add(e.id);
      if (e.proyecto) x.proyectos.add(e.proyecto);
    }
  }
}

const nombre = (x) => [...x.refs].join(' = ');
const articulosDe = (x) => [...new Set(x.usos.map((u) => u.slug))];

/* 1 y 2 · ninguna foto en dos articulos, ni dos portadas iguales. */
for (const x of ident.values()) {
  const arts = articulosDe(x);
  if (arts.length > 1) mal(`misma foto en ${arts.length} articulos — ${nombre(x)}: ${x.usos.map((u) => `${u.slug} (${u.rol})`).join(', ')}`);
  else if (x.usos.length > 1) mal(`misma foto ${x.usos.length} veces en ${arts[0]}: ${nombre(x)} (${x.usos.map((u) => u.rol).join(', ')})`);
}
/* 3 · lo que se parece sin ser igual se mira; mientras no se mire, no pasa. */
for (const d of dudosas) mal(`parecidas sin mirar (${MISMA}<d<=${DUDOSA}): ${d} — mirarlas y declararlas en DISTINTAS_A_OJO si son distintas`);

/* 5 · la misma casa no va seguida. */
const portadaDe = new Map(huecos.filter((h) => h.rol === 'portada').map((h) => [h.slug, ident.get(h.id)]));
const casas = new Map();
const casaDe = (slug) => {
  if (casas.has(slug)) return casas.get(slug);
  const x = portadaDe.get(slug);
  const dr = x && [...x.refs].find((r) => CASA_DECLARADA[r]);
  const decl = dr && (/^obra-\d+/.test(CASA_DECLARADA[dr]) ? CASA_DECLARADA[dr].match(/^obra-\d+/)[0] : `sola:${dr}`);
  const cs = !x ? [] : x.proyectos.size ? [...x.proyectos] : decl ? [decl] : [];
  if (cs.length > 1) mal(`${slug}: su portada aparece como dos casas (${cs.join(', ')})`);
  casas.set(slug, cs[0] ?? null);
  return casas.get(slug);
};
const sinCasa = new Set();
const seguidas = (donde, slugs) => {
  for (let i = 1; i < slugs.length; i++) {
    const [ca, cb] = [casaDe(slugs[i - 1]), casaDe(slugs[i])];
    for (const [s, c] of [[slugs[i - 1], ca], [slugs[i], cb]]) if (!c && portadaDe.has(s)) sinCasa.add(s);
    if (ca && ca === cb) mal(`${donde}: dos portadas seguidas de la misma casa (${ca}) — ${slugs[i - 1]} · ${slugs[i]}`);
  }
};
const frentes = ARTICULOS.map((a) => ({ slug: a.frente.slug, ordenIndice: a.frente.ordenIndice, destacadoIndice: a.frente.destacadoIndice === true }));
const indice = ordenaIndice(frentes).map((f) => f.slug);
seguidas('/blogs-tips', indice);
const categoriaDe = Object.fromEntries(ARTICULOS.map((a) => [a.frente.slug, a.frente.categoria]));
for (const cat of new Set(Object.values(categoriaDe))) seguidas(`/blogs-tips · chip ${cat}`, indice.filter((s) => categoriaDe[s] === cat));
const GENERICO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8')).posts.map((p) => p.enlace.split('/').pop());
seguidas('carrusel generico y home', GENERICO);
for (const c of JSON.parse(fs.readFileSync(path.join(RAIZ, 'contenido/roadmap-blog.json'), 'utf8')).clusters) {
  if (!c.fichaServicio?.length) continue;
  const vistas = new Map();
  for (const s of c.fichaServicio) {
    const casa = casaDe(s);
    if (!casa) { if (portadaDe.has(s)) sinCasa.add(s); continue; }
    if (vistas.has(casa)) mal(`ficha ${c.servicio ?? c.clave}: dos de sus 5 tarjetas son de la misma casa (${casa}) — ${vistas.get(casa)} · ${s}`);
    vistas.set(casa, s);
  }
}
for (const s of sinCasa) mal(`${s}: su portada no tiene casa conocida, asi que «no van seguidas de la misma casa» no se puede comprobar — reconocerla en el banco o declararla en CASA_DECLARADA`);

/* 6 · `usada_en` dice la verdad sobre el blog, en los dos sentidos. */
for (const x of ident.values()) {
  for (const id of x.bancos) {
    const usada = BANCO_ID.get(id).usada_en ?? [];
    for (const s of articulosDe(x)) if (!usada.includes(`/blogs/${s}`)) mal(`usada_en: ${id} sale en /blogs/${s} y no lo dice`);
  }
}
for (const e of BANCO) {
  for (const r of (e.usada_en ?? []).filter((u) => u.startsWith('/blogs/'))) {
    const s = r.split('/').pop();
    if (![...ident.values()].some((x) => x.bancos.has(e.id) && articulosDe(x).includes(s))) mal(`usada_en: ${e.id} dice ${r} y ese articulo no la usa`);
  }
}

/* Las tres cifras de BLOG-BANCO §0, contadas por identidad. Se imprimen siempre: son el antes y el
 * despues del informe. */
const xs = [...ident.values()];
const enPortada = xs.filter((x) => x.usos.some((u) => u.rol === 'portada'));
const cuerpoRepetido = xs.filter((x) => new Set(x.usos.filter((u) => u.rol === 'figura').map((u) => u.slug)).size > 1);
const portadaEnOtroCuerpo = xs.filter((x) => x.usos.some((p) => p.rol === 'portada'
  && x.usos.some((f) => f.rol === 'figura' && f.slug !== p.slug)));

/* Lo que se publica, sin los campos de depuracion: si el JSON commiteado no es esto, publica-blog y
 * check-seo leerian otra cosa que lo que la puerta acaba de aprobar. */
const publicado = (rs) => JSON.stringify(Object.fromEntries(Object.entries(rs).sort().map(([k, r]) => [k,
  [r.tarjeta, ...r.figuras].map(({ src, srcset, sizes, alt, ancho, alto, pie }) => ({ src, srcset, sizes, alt, ancho, alto, pie }))])));
if (SOLO_CHECK && fallos === 0 && fs.existsSync(DATO) && publicado(JSON.parse(fs.readFileSync(DATO, 'utf8')).rutas) !== publicado(salida.rutas)) {
  mal(`${path.relative(RAIZ, DATO)} no es lo que se deriva hoy: correr sin --check y commitearlo`);
}
if (!SOLO_CHECK && fallos === 0) fs.writeFileSync(DATO, `${JSON.stringify(salida, null, 1)}\n`);

const ficheros = fs.existsSync(SALIDA)
  ? execFileSync('bash', ['-c', `find ${SALIDA} -name '*.webp' | wc -l`]).toString().trim() : '0';
const peso = fs.existsSync(SALIDA)
  ? execFileSync('bash', ['-c', `du -sk ${SALIDA} | cut -f1`]).toString().trim() : '0';
console.log(`\n  R23 · portadas graduadas en esta corrida: ${graduadas.length}`);
for (const g of graduadas) console.log(`     ${g}`);
console.log(`\n  exposicion levantada en ${ajustadas.length} figuras derivadas en esta corrida (media <105 y sat <30):`);
for (const a of ajustadas) console.log(`     ${a}`);
if (avisos.length) console.log(`\n  ⚠️  ${avisos.length} aviso(s):\n${avisos.map((a) => `     ${a}`).join('\n')}`);
/* ── LEYENDA ref -> FICHERO ─────────────────────────────────────────────────
 *
 * Se imprime porque en `/gallery` el indice y el numero del fichero VAN AL REVES
 * —`construction-0` es `…-florida-10.jpg`— y eso ya escribio cuatro alt correctos sobre cuatro
 * fotos equivocadas. Con la leyenda delante, comprobar un articulo es leer dos columnas. */
const leyenda = {};
for (const [, r] of rutas) {
  for (const f of [r.tarjeta, ...r.figuras]) {
    if (!/^[a-z]+-\d+$/.test(f._ref ?? '') || f._ref.startsWith('bi-')) continue;
    const svc = f._ref.replace(/-\d+$/, '');
    (leyenda[svc] ??= new Set()).add(`${f._ref} = ${(f._fuente ?? '').replace(/^.*-(\d+)\.(jpg|webp|avif|png)$/, '$1')}`);
  }
}
if (Object.keys(leyenda).length) {
  console.log('\n  leyenda ref -> fichero de /gallery (el indice y el numero del fichero van AL REVES):');
  for (const [svc, v] of Object.entries(leyenda)) console.log(`     ${svc.padEnd(13)} ${[...v].sort().join('  ')}`);
}

console.log(`\n  ${rutas.length} articulos · ${nImg} imagenes · ${huecos.length} fotos · ${xs.length} fotos distintas`);
console.log(`     portadas distintas ................. ${enPortada.length} de ${rutas.length}`);
console.log(`     fotos de cuerpo en >1 articulo ..... ${cuerpoRepetido.length}`);
console.log(`     portadas reusadas en otro cuerpo ... ${portadaEnOtroCuerpo.length}`);
console.log(`     puerta calibrada con ${parejas} parejas conocidas (misma foto <= ${MISMA}, a mirar <= ${DUDOSA})`);
console.log(`  ${yaDerivadas.size} escaleras en public/images/blog/${BANCO_COMPARTIDO}/ · ${ficheros} ficheros webp · ${(peso / 1024).toFixed(1)} MB en public/images/blog/`);
console.log(fallos === 0 ? '\n✅ VERDE\n' : `\n🔴 ROJO — ${fallos} fallo(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
