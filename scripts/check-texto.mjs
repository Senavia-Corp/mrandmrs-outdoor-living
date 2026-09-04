#!/usr/bin/env node
/**
 * PUERTA de texto — el `innerText` de cada página construida contra el del sitio vivo.
 *
 *     npm run check:texto              todas las rutas que existan en el build
 *     npm run check:texto -- /about    solo las que casen
 *
 * UMBRAL: **100 % idéntico**. Sin tolerancia y sin porcentajes: si sobra o falta una palabra,
 * es contenido que se ha perdido o que nos hemos inventado. Es la puerta más severa de todas
 * y la que de verdad demuestra que no se cayó nada por el camino.
 *
 * Corre sobre `.vercel/output/static`, con el MISMO congelado que produjo el baseline
 * (scripts/lib/captura.mjs). Comparar texto sin ejecutar JS daría falsos rojos en todo lo
 * que Webflow pinta en cliente.
 *
 * Las rutas que aún no existen en el build se SALTAN y se cuentan aparte: mientras la Fase 6
 * no esté, no tiene sentido que las 101 de colección salgan en rojo. Lo que no se puede es
 * que una ruta que sí existe salga verde por casualidad.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import { ARGS_NAVEGADOR, aSlug, asentar, textoNormalizado } from './lib/captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

/**
 * FILTRO POSICIONAL. Cada argumento es una SUBCADENA de la ruta, salvo que empiece por `=`,
 * que entonces es coincidencia EXACTA.
 *
 * El `=` existe por una razon concreta: la home es `/`, y `/` como subcadena casa las 115
 * rutas. O sea que la unica pagina del sitio que NO se podia acotar era justo la que mas veces
 * hay que medir durante el redisenio —y creerte que mides 1 mientras mides 115 son ~65 minutos
 * con la pantalla del usuario secuestrada. Con `=/` se mide solo la home.
 *
 *     node scripts/check-texto.mjs /services/ /pool-builders/     (subcadena, como siempre)
 *     node scripts/check-texto.mjs '=/'                           (SOLO la home; las comillas hacen
 *                                                          falta: zsh expande `=/` solo)
 */
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static — corre `npm run build`\n'); process.exit(1); }

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  '.txt': 'text/plain', '.xml': 'application/xml' };

const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
// Puerto 0: uno fijo probaria el proyecto que haya al otro lado si esta ocupado, sin avisar.
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1))
  .filter(casa);

/**
 * Líneas del baseline que YA NO EXISTEN a propósito, con su motivo. Una a una: bajar el
 * umbral del 100 % convertiría esta puerta en un porcentaje que ya no avisa de nada.
 *
 * Todas vienen de la decisión D2 (los widgets de Elfsight se rehacen nativos): son chrome del
 * propio Elfsight, no contenido del cliente.
 */
const QUITADAS_A_PROPOSITO = [
  ['12', 'la paginación del widget de Elfsight en /videos: la galería nativa los pinta todos'],
  ['Free YouTube Video Gallery Widget', 'la marca de Elfsight en /videos. Se va con el widget'],
];

/**
 * ── TEXTO TRADUCIDO A PROPÓSITO ──────────────────────────────────────────────────────────
 *
 * DECISIÓN (Sebastian, 3-sep-2026): **el sitio entero va en inglés.** El Webflow de origen
 * traía dos cadenas en español, y estaban en el baseline porque el baseline ES el Webflow de
 * origen. Barrido de las 115 rutas buscando acentos, `¿`, `¡` y palabras funcionales del
 * español: aparecieron EXACTAMENTE estas dos y ninguna más.
 *
 * POR QUÉ SE DECLARA AQUÍ Y NO SE RE-BASELINIZA `baseline/text/`.
 *
 * Es la única puerta al 100 % que no se re-baseliniza nunca (§1.1), y esa propiedad es lo que
 * da permiso de reescribir el markup de las 114 páginas. Re-baselinizarla por dos líneas
 * convertiría la barandilla en un fichero que se actualiza cuando molesta, y a partir de ahí
 * ya no demuestra nada. Declarando la sustitución, la puerta sigue exigiendo el 100 %: si
 * mañana se cae una palabra CUALQUIERA —incluidas estas dos— vuelve a rojo.
 *
 * Se declara la sustitución EXACTA, vieja -> nueva. No un «ignora esta línea»: si el texto
 * nuevo no aparece tal cual, sale rojo igual que cualquier otro.
 *
 * OJO AL `capitalize`: `webflow.css` lo pone en `h2` y en `.button-styles`, y **capitalize SÍ
 * altera `innerText`**. Las dos cadenas nuevas se escriben ya capitalizadas palabra a palabra
 * para que coincidan con lo que renderiza el navegador. Es la cuarta vez que esto muerde en
 * este repo; ver el comentario de `lineasBlog()`.
 */
const TRADUCIDAS_A_PROPOSITO = [
  ['Artículos Más Leídos', 'Most Read Articles',
    'el h2 del raíl de artículos relacionados, en las 10 fichas de /blogs/. Estaba en español '
    + 'en páginas escritas íntegramente en inglés: era una fuga del Webflow de origen'],
  ['¡View More!', 'View More!',
    'el botón de /brochures. El texto ya era inglés; lo que sobraba era el signo de apertura '
    + '«¡», que es puntuación exclusiva del español'],
];

/** Aplica las sustituciones declaradas a UNA línea del baseline. */
const traduce = (l) => {
  const t = TRADUCIDAS_A_PROPOSITO.find(([viejo]) => viejo === l);
  return t ? t[1] : l;
};

/**
 * Texto que APARECE a propósito, por ruta. Se declara un BLOQUE SEGUIDO, no unas líneas
 * sueltas ni la ruta entera.
 *
 * DECISIÓN D3 (Sebastian, 28-ago-2026): `/pool-cost-estimator` embebía el estimador en un
 * `<iframe>`, o sea en OTRO documento — y `innerText` no cruza documentos, así que su texto
 * nunca contó aquí. Ahora el estimador va montado en la página, y esas 13 líneas entran en el
 * `innerText`. Es exactamente el cambio que se pidió, y no se puede distinguir de un fallo si
 * no se declara.
 *
 * Por qué así y no de otra forma:
 *   · **el bloque se LEE de `baseline/text/pool-investment-estimator.txt`**, no se copia a
 *     mano: si el texto del paso 1 del estimador cambia algún día, la declaración deja de casar
 *     y esta puerta vuelve a rojo, que es justo lo que tiene que pasar;
 *   · se exige SEGUIDO y EN ORDEN. Quitar 13 líneas sueltas dejaría pasar un reordenamiento;
 *   · todo lo demás de la página se sigue comparando al 100 %. Declarar la ruta entera —o bajar
 *     el umbral— habría apagado la puerta en las otras 90 líneas.
 */
const ANADIDAS_A_PROPOSITO = {
  '/pool-cost-estimator': {
    bloque: '/pool-investment-estimator',
    motivo: 'D3: fuera el iframe, el estimador va montado en la pagina. Las 13 lineas son las '
      + 'del paso 1 del estimador, que antes vivian en otro documento.',
  },
};

/**
 * ── LINEAS SUELTAS ANADIDAS A PROPOSITO ──────────────────────────────────────────────────
 *
 * `ANADIDAS_A_PROPOSITO` solo sabe leer un bloque del baseline de OTRA ruta. Esto es para lo
 * otro: una o dos lineas que NO existen en ningun baseline porque son nuestras.
 *
 * NO ES UNA REBAJA DEL UMBRAL. Se quitan EXACTAMENTE esas lineas, SEGUIDAS y EN ORDEN, y todo
 * lo demas de la pagina se sigue comparando al 100 %. Si el texto cambia una coma, la
 * declaracion deja de casar y esto vuelve a rojo — que es justo lo que tiene que pasar.
 *
 * `tras` ancla la linea a la que la precede, y hace falta de verdad: «Accessibility» tambien es
 * el encabezado propio de `/articles/accessibility`, asi que sin ancla se quitaria ESE y el del
 * pie se quedaria, desordenando la comparacion de esa ruta. Con `tras` se quita el del pie, que
 * es el que hemos anadido. Sin `tras` se quita la primera aparicion, que basta cuando el texto
 * no existe en ninguna otra parte (comprobado: los dos h1 del estimador salen a 0 en el
 * baseline entero).
 */
const LINEAS_ANADIDAS = [
  {
    rutas: null,                                        // null = todas las que tengan pie
    tras: ['Terms of Service', 'Privacy Policy'],
    lineas: ['Accessibility'],
    motivo: 'D6: el pie enlaza `/articles/accessibility`, que antes no enlazaba nadie. Las otras '
      + 'dos legales solo cambian de href y no cuestan texto; esta es un enlace NUEVO.',
  },
  {
    rutas: ['/pool-cost-estimator'],
    tras: [],
    lineas: ['Custom Inground Pool Cost Estimator'],
    motivo: 'D7: la pagina salia de Webflow con 0 encabezados. El <h1> es semantico y va oculto '
      + 'a la vista, pero `innerText` incluye el texto recortado y por eso se declara aqui.',
  },
  {
    rutas: ['/pool-investment-estimator'],
    tras: [],
    lineas: ['Pool Investment Estimator'],
    motivo: 'D7: idem, la pagina desnuda del mismo estimador.',
  },
];

/**
 * ── LAS RESEÑAS DE GOOGLE (D2) — bloque DECLARADO, no absorbido ──────────────────────────
 *
 * La sección de reseñas es texto NUEVO en 83 rutas, y `baseline/text/` NO SE RE-BASELINIZA
 * NUNCA (§1.1): es la única puerta con esa propiedad y es lo que da permiso de reescribir
 * markup en las 114. Absorberla habría sido quedarnos sin barandilla.
 *
 * `ANADIDAS_A_PROPOSITO` no sirve para esto: lee el bloque del baseline de OTRA ruta, o sea
 * un fichero congelado, y caducaría cada vez que llegara una reseña nueva. Aquí el bloque se
 * DERIVA de `src/data/resenas.json` en cada corrida, así que 8 hoy y 14 en enero producen el
 * bloque correcto solos.
 *
 * POR QUE ESTA PUERTA FORMATEA POR SU CUENTA, Y NO LLAMA AL COMPONENTE.
 *
 * El frente de reseñas propuso un `src/lib/resenas.mjs` compartido por el componente y por
 * esta puerta, con el argumento —correcto para codigo de produccion— de que dos copias
 * divergen al primer arreglo. Para el ORACULO de una puerta se invierte, y hay prueba:
 *
 *   el bug de zona horaria de `ResenasGoogle.astro` (fecha sin `timeZone`, o sea el mes
 *   resuelto en la zona de quien renderiza) se encontro comparando la derivacion contra el
 *   HTML construido — DOS CAMINOS INDEPENDIENTES QUE DISCREPARON. Compartiendo `fmtMes`, la
 *   comparacion habria sido `fmtMes(x) === fmtMes(x)`: verde siempre, bug invisible.
 *
 * Una puerta que deriva lo que espera del codigo que mide es una tautologia con salida 0. Se
 * comparte el DATO —`resenas.json`, una sola fuente— y NO el formateo. Si el componente
 * cambia a nombres de mes completos, esto se pone ROJO: correcto, porque el texto visible de
 * 83 rutas ha cambiado y alguien tiene que aprobarlo.
 *
 * QUE SIGUE CAZANDO: tarjeta perdida, texto truncado, escape roto, reordenamiento y una
 * tarjeta en `display:none`. QUE NO: que las reseñas sean LAS DEL CLIENTE — si el JSON
 * trajera las de otro negocio, esto sale verde. Eso lo cubre `check:resenas` validando
 * `enlacePerfil` contra el CID, y es su razon de ser.
 */
const RESENAS_MARCADOR = 'See all reviews';

/** Mes corto y año en la zona del NEGOCIO. Declarado aquí, no importado del componente. */
const mesDelNegocio = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-US',
      { month: 'short', year: 'numeric', timeZone: 'America/New_York' })
  : '');

/** Las líneas de `innerText` que emite la sección de reseñas, en orden. Vacío si no publica. */
function lineasResenas() {
  const f = path.join(RAIZ, 'src/data/resenas.json');
  if (!fs.existsSync(f)) return [];
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const items = d.items ?? [];
  if (d.publicar === false || !items.length) return [];
  const norm = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  return [
    ...(d.valoracion != null ? [d.valoracion.toFixed(1)] : []),
    ...(d.total != null ? [`${d.total} Google reviews`] : []),
    RESENAS_MARCADOR,
    ...items.flatMap((r) => [norm(r.texto), norm(r.autor),
      ...(r.fecha ? [mesDelNegocio(r.fecha)] : [])]),
    ...(d.actualizado ? [`Updated ${mesDelNegocio(d.actualizado)}`] : []),
  ];
}

/**
 * ── EL CARRUSEL DE BLOG EN `services/`+`where-we-serves/` (R10+R11-BLOG-02) — bloque
 * DECLARADO, acotado POR RUTA ──────────────────────────────────────────────────────────
 *
 * La seccion se añade a las 14 fichas de `services/` y a las 2 de `where-we-serves/`, y aporta
 * 32 lineas de `innerText`: titulo, entradilla y 10 posts x 3 (titulo, resumen, «Read More»).
 * `baseline/text/` NO se re-baseliniza nunca (§1.1), asi que se DECLARA en vez de absorberse.
 *
 * SE ACOTA POR RUTA, y esta es la diferencia con el bloque de reseñas: en la HOME esta misma
 * seccion SI esta en el baseline —es contenido del Webflow de origen—, asi que descontarla
 * alli pondria `/` en rojo por 32 lineas que faltan. El de reseñas podia ir por marcador
 * porque las reseñas son nuevas en las 83; este no.
 *
 * CONDADO Y CIUDAD NO ESTAN AQUI A PROPOSITO. Esas 9+53 rutas YA traian la seccion en su
 * baseline -es contenido del Webflow de origen, R11-BLOG-02 solo cambio de donde sale el HTML,
 * no el texto-, asi que la comparacion normal contra `baseline/text/` ya las cubre sin declarar
 * nada. Si algun dia salen en rojo aqui, es señal real: el texto cambio de verdad.
 *
 * El formateo se escribe AQUI y no se importa de `CarruselBlog.astro`, por lo mismo que en
 * reseñas: una puerta que deriva lo que espera del codigo que mide es `f(x) === f(x)`, verde
 * siempre. Se comparte el DATO (`src/data/blogs.json` + `blog-heading-por-ruta.json`), no el
 * formateo.
 */
const BLOG_RUTAS = ['/services/', '/where-we-serve/'];

/**
 * Las lineas de `innerText` que emite CarruselBlog, en orden, para `ruta`.
 *
 * El encabezado (2 primeras lineas) es el GENERICO de `blogs.json` salvo que `ruta` tenga
 * entrada propia en `blog-heading-por-ruta.json` — que es justo lo que trae Estado (a mano,
 * "Outdoor Living Insights for North/South Florida") y lo que el componente mira primero. Los
 * 10 posts (30 lineas restantes) son SIEMPRE los mismos: nunca cambian por ruta.
 */
function lineasBlog(ruta) {
  const f = path.join(RAIZ, 'src/data/blogs.json');
  if (!fs.existsSync(f)) return [];
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const posts = d.posts ?? [];
  if (!posts.length) return [];
  const norm = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const encabezadosF = path.join(RAIZ, 'src/data/blog-heading-por-ruta.json');
  const propio = ruta && fs.existsSync(encabezadosF)
    ? JSON.parse(fs.readFileSync(encabezadosF, 'utf8'))[ruta]
    : null;
  const titulo = propio?.titulo ?? d.titulo;
  const entradilla = propio?.entradilla ?? d.entradilla;

  /**
   * ⚠️ LOS TITULOS VAN CAPITALIZADOS, Y NO ES UN CAPRICHO DEL DATO.
   *
   * `webflow.css` pone `text-transform: capitalize` en `h2` y en `h3`, y **capitalize SI
   * altera `innerText`** — es el hallazgo del frente del nav, y esta es la tercera vez que
   * muerde: primero el nav (`financing` -> `Financing`), luego el antetitulo de subservicios
   * (`What do we do!` -> `What Do We Do!`), y ahora esto.
   *
   * Medido sobre la pagina construida: 11 de las 32 lineas discrepaban, TODAS titulos, y
   * todas por palabras pequeñas — `in`->`In`, `for`->`For`, `to`->`To`, `vs`->`Vs`.
   * Aplicando la capitalizacion, 0 discrepancias.
   *
   * POR QUE SE MODELA AQUI Y NO SE GUARDA YA CAPITALIZADO EN `blogs.json`: el dato tiene que
   * ser el texto REAL del post -es lo que se publica, lo que se indexa y lo que veria un CMS-.
   * Guardar ahi el efecto de una regla CSS seria hornear la presentacion en el contenido, y
   * el dia que alguien quite el `capitalize` el dato quedaria mintiendo.
   *
   * Solo se aplica a los TITULOS (h2 y los h3 de tarjeta). La entradilla y el resumen van en
   * `<p>`, que no lleva capitalize — verificado: ninguna de esas lineas discrepaba.
   *
   * La aproximacion -mayuscula tras inicio, espacio o parentesis- no capitaliza tras guion,
   * que es lo que hace CSS: `Decision-Makers` se queda igual en los dos lados. Validada contra
   * el render real, no contra la especificacion.
   */
  // (la funcion vive en ambito de modulo: la usan dos derivaciones, blog y obras propias)

  return [
    capitaliza(norm(titulo)),
    norm(entradilla),
    ...posts.flatMap((p) => [capitaliza(norm(p.titulo)), norm(p.resumen), norm(p.cta)]),
  ];
}

/**
 * Quita `bloque` de `lineas`, EXIGIÉNDOLO seguido y en orden. `null` si está pero partido o
 * desordenado — y ese `null` es lo que hace que esto DECLARE en vez de absorber: un
 * reordenamiento de las tarjetas sale rojo aunque estén todas.
 */
function quitaBloque(lineas, bloque) {
  if (!bloque.length) return lineas;
  for (let i = 0; i + bloque.length <= lineas.length; i++) {
    if (bloque.every((l, j) => lineas[i + j] === l)) {
      return [...lineas.slice(0, i), ...lineas.slice(i + bloque.length)];
    }
  }
  return null;
}

/**
 * `text-transform: capitalize` de Webflow, aplicado al DATO para poder compararlo con el
 * `innerText` del build. Estaba dentro de `lineasBlog()`; se subio aqui al aparecer la segunda
 * derivacion que lo necesita (§ OBRAS_PROPIAS_EN). El razonamiento largo —por que capitalize SI
 * altera `innerText`, y por que la aproximacion «tras inicio, espacio o parentesis» coincide con
 * lo que hace el navegador— sigue donde estaba, en la cabecera de `lineasBlog()`.
 */
const capitaliza = (s) => s.replace(/(^|[\s(])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

/**
 * ── LAS OBRAS DE AUTORIA PROPIA EN `/projects` Y EN `/` — bloque DECLARADO y DERIVADO ──────
 *
 * 5 obras publicadas el 3-sep-2026 que el Webflow de origen nunca tuvo. Su TARJETA aporta 3
 * lineas a `/projects` (titulo, resumen y «View Full Project») y su SLIDE aporta 2 a `/`
 * (titulo y «See Project»): 15 y 10 lineas de `innerText` que no estan en `baseline/text/`.
 *
 * Y `baseline/text/` NO SE RE-BASELINIZA NUNCA (§1.1): es la unica puerta con esa propiedad, y
 * es lo que da permiso de reescribir marcado en las 114. Absorberlas habria sido quedarnos sin
 * barandilla justo para estrenarla.
 *
 * POR QUE NO VALE NINGUNO DE LOS MECANISMOS QUE YA HAY:
 *   · `TRADUCIDAS_A_PROPOSITO` sustituye UNA linea por OTRA. Cardinalidad 1->1: no puede
 *     producir una linea de mas.
 *   · `QUITADAS_A_PROPOSITO` va en la direccion contraria.
 *   · `ANADIDAS_A_PROPOSITO` lee el bloque del `baseline/text/` de OTRA ruta, o sea de un
 *     fichero congelado. Estas lineas no estan en el baseline de ninguna ruta: son nuestras.
 *   · `LINEAS_ANADIDAS` cablea el texto a mano. Serian 25 lineas de copy copiadas aqui, o sea
 *     una TERCERA copia del mismo texto —ya vive en `proyectos-propios.json` y sale de ahi al
 *     marcado—, y tres copias empiezan iguales y dejan de serlo al primer arreglo.
 *
 * ASI QUE SE HACE COMO RESEÑAS Y BLOG: se DERIVA del mismo JSON que genera el marcado, y el
 * FORMATEO se reescribe aqui. Eso ultimo no es descuido: es el parrafo de la tautologia de
 * § reseñas —una puerta que deriva lo que espera del codigo que mide siempre sale verde—. Se
 * comparte el DATO, nunca el formateo. Si el componente cambia el rotulo del boton o el orden
 * de las lineas, esto se pone ROJO, que es exactamente lo que tiene que pasar: ha cambiado el
 * texto visible de dos paginas y alguien tiene que aprobarlo.
 *
 * EL ANCLA `tras` HACE FALTA DE VERDAD. Las obras entran al PRINCIPIO de su lista, asi que sin
 * ancla `quitaBloque` podria casar mas abajo. El ancla es la linea que en el baseline precede a
 * la primera tarjeta/slide, copiada VERBATIM de `baseline/text/`.
 *
 * NO ES UNA REBAJA DEL UMBRAL: se quitan EXACTAMENTE esas lineas, SEGUIDAS, EN ORDEN y TRAS su
 * ancla. El resto de las dos paginas se sigue comparando al 100 %, y si el texto cambia una
 * coma la declaracion deja de casar y esto vuelve a rojo.
 */
const OBRAS_PROPIAS_EN = {
  '/projects': {
    forma: 'tarjeta',
    tras: ['Explore completed pool and outdoor living projects across Florida. Discover custom '
      + 'design, quality construction, and the craftsmanship of Mr & Mrs Outdoor Living.'],
    motivo: 'Las 5 obras propias entran al principio de la rejilla. Las inserta '
      + '`build-paginas.mjs` (§ OBRAS_PROPIAS) sobre el HTML del origen, que no las tiene.',
  },
  '/': {
    forma: 'slide',
    tras: ['Project Showcase',
      'Browse our completed residential & Commercial projects and transformations'],
    motivo: 'Las mismas 5, al principio del carrusel «Project Showcase». `/` esta en '
      + 'NO_REGENERAR desde R9 y se mantiene a mano; sus slides se derivan del mismo JSON.',
  },
};

/** Las lineas que aportan las obras propias en `ruta`, en orden. Vacio si la ruta no declara. */
function lineasObras(ruta) {
  const d = OBRAS_PROPIAS_EN[ruta];
  if (!d) return [];
  const f = path.join(RAIZ, 'src/data/proyectos-propios.json');
  if (!fs.existsSync(f)) return [];
  const obras = JSON.parse(fs.readFileSync(f, 'utf8')).obras ?? [];
  // El titulo pasa por `capitaliza` porque va en un h2/h3 con capitalize; el resumen no, va en
  // un <div> pelado; los rotulos de boton se escriben ya capitalizados, como en el origen.
  return obras.flatMap((o) => (d.forma === 'tarjeta'
    ? [capitaliza(o.titulo), o.resumen, 'View Full Project']
    : [capitaliza(o.titulo), 'See Project']));
}

/**
 * Quita `anadidas` solo donde vayan PRECEDIDAS por `contexto`. Con `contexto` vacio equivale a
 * `quitaBloque`. `null` si no casa, igual que su hermana: un declarado que no aplica es rojo.
 */
function quitaTras(lineas, contexto, anadidas) {
  if (!contexto.length) return quitaBloque(lineas, anadidas);
  const bloque = [...contexto, ...anadidas];
  for (let i = 0; i + bloque.length <= lineas.length; i++) {
    if (bloque.every((l, j) => lineas[i + j] === l)) {
      const k = i + contexto.length;
      return [...lineas.slice(0, k), ...lineas.slice(k + anadidas.length)];
    }
  }
  return null;
}

/** Cual de los bloques declarados fallo, para que el rojo diga la verdad. Antes el mensaje
 *  etiquetaba TODO fallo como «bloque de reseñas» y me mando a depurar el bloque equivocado. */
let bloqueQueFallo = null;

/** Quita de `hay` los bloques declarados para esa ruta. `null` si alguno falla. */
function sinElBloque(ruta, hay) {
  bloqueQueFallo = null;
  let lineas = hay.split('\n');

  // 1 · el bloque tomado del baseline de OTRA ruta (hoy solo /pool-cost-estimator)
  const d = ANADIDAS_A_PROPOSITO[ruta];
  if (d) {
    const f = path.join(RAIZ, 'baseline/text', `${aSlug(d.bloque)}.txt`);
    if (fs.existsSync(f)) {
      lineas = quitaBloque(lineas, fs.readFileSync(f, 'utf8').trimEnd().split('\n').filter(Boolean));
      if (lineas === null) { bloqueQueFallo = `el bloque declarado de ${d.bloque}`; return null; }
    }
  }

  // 2 · las reseñas, derivadas del JSON. Los dos bloques son disjuntos: /pool-cost-estimator
  //     no monta reseñas, así que no pueden solaparse.
  const res = lineasResenas();
  if (res.length && lineas.includes(RESENAS_MARCADOR)) {
    lineas = quitaBloque(lineas, res);
    if (lineas === null) { bloqueQueFallo = 'el bloque de reseñas (src/data/resenas.json)'; return null; }
  }

  // 3 · el carrusel de blog, SOLO en services/+where-we-serves/. Los tres bloques son disjuntos.
  if (BLOG_RUTAS.some((p) => ruta.startsWith(p))) {
    const bl = lineasBlog(ruta);
    if (bl.length) {
      lineas = quitaBloque(lineas, bl);
      if (lineas === null) { bloqueQueFallo = 'el bloque de blog (src/data/blogs.json)'; return null; }
    }
  }

  // 4 · las obras de autoria propia (§ OBRAS_PROPIAS_EN). Disjunto de los tres anteriores: ni
  //     `/projects` ni `/` reciben el carrusel de blog por insercion, y el marcador de reseñas
  //     de `/` cae muy por debajo del carrusel de proyectos.
  const ob = lineasObras(ruta);
  if (ob.length) {
    lineas = quitaTras(lineas, OBRAS_PROPIAS_EN[ruta].tras, ob);
    if (lineas === null) {
      bloqueQueFallo = `el bloque de ${OBRAS_PROPIAS_EN[ruta].forma}s de las obras propias `
        + '(src/data/proyectos-propios.json)';
      return null;
    }
    conObras++;
  }

  // 5 · las lineas sueltas declaradas (§ LINEAS_ANADIDAS). Van al final: las cuatro anteriores
  //     son bloques del origen y estas son nuestras, asi que quitarlas antes movería sus anclas.
  for (const d of LINEAS_ANADIDAS) {
    if (d.rutas && !d.rutas.includes(ruta)) continue;
    // El pie no esta en las rutas con `conPie={false}`; ahi no hay nada que quitar.
    if (!d.rutas && !d.lineas.every((l) => lineas.includes(l))) continue;
    lineas = quitaTras(lineas, d.tras, d.lineas);
    if (lineas === null) {
      bloqueQueFallo = `las lineas declaradas [${d.lineas.join(' / ')}]`
        + (d.tras.length ? ` tras [${d.tras.join(' / ')}]` : '');
      return null;
    }
  }

  return lineas.join('\n');
}

/** Diferencia legible entre dos textos, línea a línea. */
function diferencias(esperado, hay) {
  const a = esperado.split('\n'), b = hay.split('\n');
  const declaradas = new Set(QUITADAS_A_PROPOSITO.map(([l]) => l));
  const falta = a.filter((l) => !b.includes(l) && !declaradas.has(l));
  const sobra = b.filter((l) => !a.includes(l));
  const fuera = [];
  if (!falta.length && !sobra.length) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { fuera.push(`linea ${i + 1}: orden cambiado`); break; }
    }
  }
  return { falta, sobra, fuera };
}

const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pag = await ctx.newPage();

let ok = 0, mal = 0, noCargaron = 0, conResenas = 0, conBlog = 0, conObras = 0;
const rojos = [];

/**
 * CUANTAS RUTAS DEBEN PINTAR RESEÑAS. Fijado, no tolerado: si SUBE, alguien monto el
 * componente donde no tocaba; si BAJA, se cayo de una ruta. Un «las que sean» seria otra
 * puerta que no comprueba.
 *
 * Se DERIVA del estado y no se escribe a mano: con `publicar: false` el componente no emite
 * el bloque en ninguna, asi que esperar 83 fallaria solo al apagar. Apagar y encender no
 * puede exigir editar la puerta.
 */
const RESENAS_ESPERADAS = lineasResenas().length ? 83 : 0;

/** Las 14 fichas de `services/` + las 2 de `where-we-serves/`. Derivado del estado, igual que
 *  el de reseñas: si el dato se vacia, se esperan 0 y apagar la seccion no obliga a editar la
 *  puerta. */
const BLOG_ESPERADAS = lineasBlog().length ? 16 : 0;

for (const ruta of RUTAS) {
  const slug = aSlug(ruta);
  const ref = path.join(RAIZ, 'baseline/text', `${slug}.txt`);
  let resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  if (!resp?.ok()) {
    /* UN SEGUNDO INTENTO ANTES DE CANTAR ROJO. La objecion es de R9-BLOG-01 y es buena:
     * con «falla una vez -> rojo» a secas, un servidor que tarda en levantar pone las 115
     * en rojo de golpe y el rojo deja de significar nada. Lo que separa un fallo real de
     * un arranque lento es que la MISMA ruta falle DOS veces seguidas. No reabre el fallo
     * abierto —el segundo fallo sigue siendo rojo, nunca saltada— y cuesta un reintento
     * solo en el camino que ya iba mal. */
    await pag.waitForTimeout(1500).catch(() => {});
    resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  }
  if (!resp?.ok()) {
    /**
     * LA BARANDILLA FALLABA ABIERTA — defecto §2.4, hallado por el frente R9-BLOG-01 el
     * 31-ago-2026 y cerrado aqui.
     *
     * Esto era `{ saltadas++; continue; }`, y el resumen lo imprimia como «N aun sin
     * construir». Habia DOS mentiras en esa linea:
     *
     *   1. La causa casi nunca es que la pagina no este construida. `!resp.ok()` casa con
     *      CUALQUIER fallo de carga, y el que de verdad ocurre es que el navegador se
     *      MUERA: con dos Chromium a la vez el proceso no se degrada, se cierra
     *      («Target page, context or browser has been closed», desde asentar()). La
     *      etiqueta presuponia una causa benigna para el sintoma de una grave.
     *   2. `saltadas` NO entraba en `mal`, o sea que no tocaba ni el veredicto ni el
     *      `process.exit`. Una corrida de 115 rutas que perdiera el navegador en la 14
     *      imprimia «14 identicas · 0 con diferencias · 101 aun sin construir» y a
     *      continuacion PUERTA VERDE, con salida 0. Paso de verdad: 101 fantasmas.
     *
     * Por que importa mas aqui que en cualquier otra puerta: `check:texto` es la UNICA que
     * NO se re-baseliniza jamas (§1.1). Es la barandilla del programa entero, la que da
     * permiso de reescribir markup. Una barandilla que se calla lo que no pudo medir no es
     * una barandilla, es un adorno. Es el mismo fallo que R6 cerro en `check-visual.mjs`
     * para las referencias ausentes; esta era la hermana que quedaba viva, y el comentario
     * de aquel arreglo llegaba a citar esta linea como si ya estuviera cubierta.
     *
     * El contador desaparece en vez de renombrarse porque en esta puerta NO queda ningun
     * caso legitimo de «saltada»: la falta de baseline ya era roja en la linea siguiente.
     */
    mal++;
    noCargaron++;
    const causa = `NO SE PUDO CARGAR en 2 intentos — ${resp ? `HTTP ${resp.status()}` : 'sin respuesta (navegador caido o servidor parado)'}`;
    rojos.push({ ruta, falta: [], sobra: [], fuera: [causa] });
    console.log(`  ROJO ${ruta} — ${causa}`);
    continue;
  }
  if (!fs.existsSync(ref)) { console.log(`  ROJO ${ruta} — no hay baseline de texto`); mal++; continue; }

  /**
   * UNA RUTA NO PUEDE MATAR LA CORRIDA. `check-visual.mjs` ya envuelve esto y lo explica en
   * su propio comentario; esta puerta no lo hacia, y la diferencia se paga en tiempo:
   * `asentar()` lanzo «Target page, context or browser has been closed» en la ruta 22 de 115
   * y se llevo por delante los 21 «ok» que ya habia, sin imprimir resumen ni veredicto.
   *
   * El fallo NO era de la pagina: era que yo tenia un segundo navegador abierto —el panel de
   * inspeccion, mirando el mismo build— mientras corria la puerta. Es exactamente la
   * concurrencia que §3 prohibe, cometida por el director que la hace cumplir.
   *
   * Se envuelve igualmente, porque «no vuelvas a hacerlo» no es una salvaguarda: una corrida
   * de 20 minutos no puede depender de que nadie se equivoque. Muere la RUTA, en rojo y con
   * su causa; la corrida sigue y al final hay veredicto. Fallar cerrado y seguir contando.
   */
  let est;
  try {
    await pag.bringToFront();
    est = await asentar(pag);
  } catch (e) {
    mal++;
    const causa = `MURIO LA MEDICION — ${String(e.message ?? e).split('\n')[0]}`;
    rojos.push({ ruta, falta: [], sobra: [], fuera: [causa] });
    console.log(`  ROJO ${ruta} — ${causa}`);
    continue;
  }
  if (!est.valida) { console.log(`  ROJO ${ruta} — medicion invalida ${JSON.stringify(est.sonda)}`); mal++; continue; }

  const declaradas = new Set(QUITADAS_A_PROPOSITO.map(([l]) => l));
  const esperado = fs.readFileSync(ref, 'utf8').trimEnd().split('\n')
    .filter((l) => !declaradas.has(l)).map(traduce).join('\n');
  const bruto = (await textoNormalizado(pag)).trimEnd();
  if (bruto.includes(RESENAS_MARCADOR)) conResenas++;
  if (BLOG_RUTAS.some((p) => ruta.startsWith(p)) && lineasBlog(ruta).length
      && bruto.includes(lineasBlog(ruta)[0])) conBlog++;
  const hay = sinElBloque(ruta, bruto);
  if (hay === null) {
    mal++;
    /* Cual de los dos bloques fallo. Antes esto leia `ANADIDAS_A_PROPOSITO[ruta].bloque` a
     * secas y habria reventado con un TypeError en las 83 rutas de reseñas, que no figuran
     * en ese mapa: el rojo se habria convertido en una caida de la corrida. */
    const cual = bloqueQueFallo ?? 'un bloque declarado';
    console.log(`  ROJO ${ruta} — ${cual} esta, pero PARTIDO o DESORDENADO`);
    rojos.push({ ruta, falta: [`${cual}: presente pero no seguido y en orden`], sobra: [], fuera: [] });
    continue;
  }
  if (hay === esperado) {
    ok++;
    console.log(`  ok   ${ruta}${ANADIDAS_A_PROPOSITO[ruta] ? '   (con el bloque declarado de '
      + ANADIDAS_A_PROPOSITO[ruta].bloque + ')' : ''}`);
    continue;
  }

  mal++;
  const d = diferencias(esperado, hay);
  rojos.push({ ruta, ...d });
  console.log(`  ROJO ${ruta} — faltan ${d.falta.length} lineas, sobran ${d.sobra.length}`);
}
await nav.close();
servidor.close();

if (rojos.length) {
  console.log('\n── detalle\n');
  for (const r of rojos.slice(0, 6)) {
    console.log(`  ${r.ruta}`);
    r.falta.slice(0, 6).forEach((l) => console.log(`    FALTA  ${l.slice(0, 100)}`));
    r.sobra.slice(0, 6).forEach((l) => console.log(`    SOBRA  ${l.slice(0, 100)}`));
    r.fuera.forEach((l) => console.log(`    ${l}`));
    if (r.falta.length > 6 || r.sobra.length > 6) console.log('    ...');
    console.log('');
  }
}

/* Sin tercer cubo a proposito: todo lo que no es `ok` es `mal`, y `mal` manda en el
 * veredicto y en el codigo de salida. El motivo de cada rojo —diferencia, baseline
 * ausente, medicion invalida o pagina que no carga— va en el detalle de arriba. */
console.log(`\n  ${ok} identicas · ${mal} en rojo   (${ok + mal}/${RUTAS.length} rutas medidas)`);

/* DIAGNOSTICO, no puerta. `noCargaron` NO tiene camino propio en el veredicto —ya sumo en
 * `mal`—: esto solo separa «el sitio esta roto» de «el andamio esta roto», que es la
 * pregunta que uno se hace mirando una pantalla llena de rojo. Si fallan TODAS, no son las
 * paginas: es el servidor o el navegador, y casi siempre es otra sesion con Chromium
 * abierto a la vez (§3: las puertas de navegador las corre UNO, y de una en una). */
/* El contador de rutas con reseñas. Va como PUERTA, no como diagnostico: suma a `mal`.
 *
 * SOLO EN CORRIDA COMPLETA. Con filtro corren N rutas de 115, asi que el conteo no puede
 * llegar a 83 y el rojo seria SIEMPRE falso — y un rojo que salta siempre se aprende a
 * ignorar, que es como muere una puerta. Lo destapo la propia puerta en su primera corrida
 * acotada: 14 de 14 verdes y aun asi ROJA. */
if (filtro.length) {
  console.log(`\n  --   reseñas: contador de rutas OMITIDO (corrida acotada a ${RUTAS.length} de 115).`
    + `\n       Salio en ${conResenas}. El conteo solo significa algo en la barrida completa.`);
} else if (conResenas !== RESENAS_ESPERADAS) {
  mal++;
  console.log(`\n  ROJO reseñas: el bloque sale en ${conResenas} ruta(s) y se esperaban `
    + `${RESENAS_ESPERADAS}.\n       ${conResenas > RESENAS_ESPERADAS
      ? 'sube = se ha montado donde no tocaba'
      : 'baja = se ha caido de alguna ruta'}`);
} else if (RESENAS_ESPERADAS) {
  console.log(`\n  ok   reseñas: bloque declarado de ${lineasResenas().length} lineas, `
    + `descontado en las ${conResenas} rutas que lo montan`);
}

/* Contador de blog. Mismo criterio que el de reseñas y misma omision en corrida acotada. */
if (filtro.length) {
  if (conBlog) console.log(`\n  --   blog: contador OMITIDO (corrida acotada). Salio en ${conBlog}.`);
} else if (conBlog !== BLOG_ESPERADAS) {
  mal++;
  console.log(`\n  ROJO blog: el bloque sale en ${conBlog} ruta(s) y se esperaban ${BLOG_ESPERADAS}.`);
} else if (BLOG_ESPERADAS) {
  console.log(`  ok   blog: bloque declarado de ${lineasBlog().length} lineas, `
    + `descontado en las ${conBlog} fichas de services/+where-we-serves/`);
}

/**
 * Las obras propias salen en DOS rutas y en ninguna mas. Si sube, se ha montado el bloque donde
 * no tocaba; si baja, se ha caido de `/projects` o del carrusel de `/` sin que nadie lo note —
 * que es el fallo silencioso que este contador existe para cazar.
 */
const OBRAS_ESPERADAS = lineasObras('/projects').length ? Object.keys(OBRAS_PROPIAS_EN).length : 0;
if (filtro.length) {
  if (conObras) console.log(`\n  --   obras propias: contador OMITIDO (corrida acotada). Salio en ${conObras}.`);
} else if (conObras !== OBRAS_ESPERADAS) {
  mal++;
  console.log(`\n  ROJO obras propias: el bloque sale en ${conObras} ruta(s) y se esperaban ${OBRAS_ESPERADAS}`
    + ` (${Object.keys(OBRAS_PROPIAS_EN).join(' y ')}).`);
} else if (OBRAS_ESPERADAS) {
  console.log(`  ok   obras propias: bloque declarado de ${lineasObras('/projects').length}+`
    + `${lineasObras('/').length} lineas, descontado en ${conObras} rutas`);
}

if (noCargaron) {
  console.log(noCargaron === RUTAS.length
    ? `\n  OJO: no cargo NINGUNA de las ${RUTAS.length}. Eso no son las paginas, es el andamio:\n`
      + '       servidor caido, build ausente, u otra sesion con Chromium abierto a la vez.'
    : `\n  OJO: ${noCargaron} ruta(s) no cargaron tras 2 intentos y cuentan como ROJAS.`);
}
for (const [r, d] of Object.entries(ANADIDAS_A_PROPOSITO)) {
  console.log(`     declarado ${r}: el bloque de ${d.bloque} — ${d.motivo}`);
}
for (const d of LINEAS_ANADIDAS) {
  console.log(`     declarado ${d.rutas ? d.rutas.join(' ') : '(todas con pie)'}:`
    + ` [${d.lineas.join(' / ')}] — ${d.motivo}`);
}
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} pagina(s)`}\n`);
process.exit(mal ? 1 : 0);
