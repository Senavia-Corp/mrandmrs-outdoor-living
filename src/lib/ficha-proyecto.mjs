/**
 * LA FICHA DE PROYECTO (ASTRO-4 lote A, laminas «Proyecto» y «ProyectoDetalle»).
 *
 * El hero C y «Project Details» de las 15 fichas de `/project/`, en una sola funcion: las 10
 * que salen del origen las monta `scripts/build-paginas.mjs` y las 5 de autoria propia,
 * `FichaObra.astro`. Dos sitios que pintan lo mismo con dos marcados distintos es justo lo que
 * habia y lo que se quita.
 *
 * QUE CAMBIA DE COMPOSICION. La ficha era un titular sobre una foto oscurecida y, debajo, una
 * columna de fotos con los datos al lado. Ahora ensena la obra: titular y relato, la portada
 * grande, los tres datos en banda con la accion, y TODAS las fotos a la vista en un mosaico que
 * alterna 7/5 y 5/7. Ninguna foto se queda fuera del HTML.
 *
 * LAS FOTOS SON BOTONES (`data-mm-foto`): el visor de `Componentes.astro` las recorre en su
 * orden, portada incluida. La portada es la primera de la galeria y no se repite en el mosaico.
 *
 * EL TEXTO NO SE TOCA: titular, parrafo, «Project Details», los tres rotulos con su valor y el
 * boton son los del origen, en su mismo orden. Lo nuevo son los dos telefonos (T-56).
 */
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * E5-SEO (punto 6): 54 fotos de las fichas llegan del origen SIN `alt`. Ni el banco ni el registro
 * de galeria las describen, asi que se nombran por lo que si se sabe de ellas: la obra a la que
 * pertenecen y su posicion. No describe la foto, pero deja de ser una imagen muda.
 */
export const conAlt = (fotos, titulo) => fotos.map((f, k) => (f.alt ? f : { ...f, alt: `${String(titulo).replace(/\s+/g, ' ').trim()}, photo ${k + 1} of ${fotos.length}` }));

/** El nombre accesible de una foto pulsable: su `alt`, o su posicion si el origen no lo trae. */
const nombreDe = (f, k, n) => (f.alt ? `Open photo: ${f.alt}` : `Open photo ${k + 1} of ${n}`);

const boton = (f, k, n, clase, extra) => `<button type="button" class="${clase}" data-mm-foto="${esc(f.src)}" aria-label="${esc(nombreDe(f, k, n))}">`
  + `<img src="${esc(f.src)}" alt="${esc(f.alt)}" width="${f.w}" height="${f.h}" ${extra}></button>`;

/**
 * @param {{ tituloHtml: string, resumenHtml: string, fotos: {src:string, alt:string, w:number, h:number}[] }} p
 *   `fotos[0]` es la portada. `tituloHtml` y `resumenHtml` llegan ya como HTML del origen.
 */
export function heroProyectoHtml({ tituloHtml, resumenHtml, fotos, tramos = [] }) {
  const [portada] = fotos;
  if (!portada?.w || !portada?.h) throw new Error('ficha-proyecto: la portada no trae medidas');
  // S6 (D-254, L5 de PUBLICAR): la miga a la vista, con el titulo de la obra como ultimo escalon (miga-tramos.mjs).
  const escT = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const miga = tramos.length > 1 ? '<nav class="mm-miga" aria-label="Breadcrumb"><ol>'
    + tramos.map((t, k) => (k === tramos.length - 1 ? `<li aria-current="page">${escT(t.nombre)}</li>` : `<li><a href="${t.href}">${escT(t.nombre)}</a></li>`)).join('') + '</ol></nav>' : '';
  return '<section class="mm-hero-c"><div class="mm-hero-c-caja">'
    + `<div class="mm-hero-c-txt">${miga}<h1 class="mm-h1">${tituloHtml}</h1><p class="mm-p">${resumenHtml}</p></div>`
    + `<figure class="mm-hero-c-medio">${boton(portada, 0, fotos.length, 'mm-hero-c-foto',
      'sizes="(min-width: 1440px) 1312px, 100vw" loading="eager" fetchpriority="high" decoding="async"')}</figure>`
    + '</div></section>';
}

/**
 * @param {{ tituloHtml: string, datos: [string, string][], fotos: {src,alt,w,h}[],
 *           accion: {href: string, texto: string}, telefonos: {zona,tel,visible}[] }} p
 *   `fotos` es la galeria ENTERA; aqui se pinta de la segunda en adelante.
 */
export function detalleProyectoHtml({ tituloHtml, datos, fotos, accion, telefonos }) {
  if (datos.length !== 3) throw new Error(`ficha-proyecto: «Project Details» trae ${datos.length} datos y son 3`);
  const resto = fotos.slice(1);
  if (resto.some((f) => !f.w || !f.h)) throw new Error('ficha-proyecto: una foto de la galeria no trae medidas');
  // «Details» con rotulador, como en la lamina; si el titular del origen cambia, va sin el.
  const h2 = tituloHtml.trim().replace(/(Details)\s*$/, '<span class="mm-rot">$1</span>');
  return '<section class="mm-det"><div class="mm-sec-cab mm-det-cab">'
    + `<h2 class="mm-h2">${h2}</h2>`
    + '<div class="mm-det-lado"><div class="mm-datos mm-det-datos">'
    + datos.map(([rot, val]) => `<div class="mm-dato"><span class="mm-dato-rot">${esc(rot)}</span><span class="mm-dato-val">${esc(val)}</span></div>`).join('')
    + `</div><a class="mm-btn" href="${esc(accion.href)}">${esc(accion.texto)}</a></div></div>`
    + (resto.length ? `<div class="mm-det-fotos mm-det-fotos--${resto.length % 2 ? 'impar' : 'par'}">`
      + resto.map((f, k) => boton(f, k + 1, fotos.length, 'mm-det-foto',
        'sizes="(min-width: 768px) 58vw, 100vw" loading="lazy" decoding="async"')).join('') + '</div>' : '')
    + '<div class="mm-det-tel"><div class="mm-datos mm-datos--tel">'
    + telefonos.map((t) => `<a class="mm-dato" href="tel:${t.tel}"><span class="mm-dato-val">${t.visible}</span></a>`).join('')
    + '</div></div></section>';
}

/**
 * La banda de cierre de la ficha, fundida con el formulario que el componente monta detras
 * (D-82, D-77). Titular y parrafo son los de la banda de siempre; el boton sale porque debajo
 * hay formulario (T-57) y entran los dos telefonos. Sin foto: en la pagina de una obra, una foto
 * de OTRA obra sin pie encima del formulario se leeria como suya.
 */
export function cierreProyectoHtml({ tituloHtml, parrafoHtml, telefonos }) {
  return '<section class="mm-cierre mm-cierre--sin"><div class="mm-cierre-caja"><div class="mm-cierre-txt">'
    + `<h2 class="mm-h2">${tituloHtml.replace(/Design-Buil[dt]/g, '<span class="mm-nb">$&</span>')}</h2><p class="mm-p">${parrafoHtml}</p>`
    + '<div class="mm-datos mm-datos--tel">'
    + telefonos.map((t) => `<a class="mm-dato" href="tel:${t.tel}"><span class="mm-dato-val">${t.visible}</span></a>`).join('')
    + '</div></div></div></section>';
}
