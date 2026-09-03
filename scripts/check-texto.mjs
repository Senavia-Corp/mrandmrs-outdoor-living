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
 * ── EL CARRUSEL DE BLOG EN `services/` (R10) — bloque DECLARADO, acotado POR RUTA ──────
 *
 * La seccion se añade a las 14 fichas de `services/` y aporta 32 lineas de `innerText`:
 * titulo, entradilla y 10 posts x 3 (titulo, resumen, «Read More»). `baseline/text/` NO se
 * re-baseliniza nunca (§1.1), asi que se DECLARA en vez de absorberse.
 *
 * SE ACOTA POR RUTA, y esta es la diferencia con el bloque de reseñas: en la HOME esta misma
 * seccion SI esta en el baseline —es contenido del Webflow de origen—, asi que descontarla
 * alli pondria `/` en rojo por 32 lineas que faltan. El de reseñas podia ir por marcador
 * porque las reseñas son nuevas en las 83; este no.
 *
 * El formateo se escribe AQUI y no se importa de `CarruselBlog.astro`, por lo mismo que en
 * reseñas: una puerta que deriva lo que espera del codigo que mide es `f(x) === f(x)`, verde
 * siempre. Se comparte el DATO (`src/data/blogs.json`), no el formateo.
 */
const BLOG_RUTA = '/services/';

/** Las lineas de `innerText` que emite CarruselBlog, en orden. */
function lineasBlog() {
  const f = path.join(RAIZ, 'src/data/blogs.json');
  if (!fs.existsSync(f)) return [];
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const posts = d.posts ?? [];
  if (!posts.length) return [];
  const norm = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

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
  const capitaliza = (s) => s.replace(/(^|[\s(])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

  return [
    capitaliza(norm(d.titulo)),
    norm(d.entradilla),
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

  // 3 · el carrusel de blog, SOLO en las fichas de services/. Los tres bloques son disjuntos.
  if (ruta.startsWith(BLOG_RUTA)) {
    const bl = lineasBlog();
    if (bl.length) {
      lineas = quitaBloque(lineas, bl);
      if (lineas === null) { bloqueQueFallo = 'el bloque de blog (src/data/blogs.json)'; return null; }
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

let ok = 0, mal = 0, noCargaron = 0, conResenas = 0, conBlog = 0;
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

/** Las 14 fichas de `services/`. Derivado del estado, igual que el de reseñas: si el dato se
 *  vacia, se esperan 0 y apagar la seccion no obliga a editar la puerta. */
const BLOG_ESPERADAS = lineasBlog().length ? 14 : 0;

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
  if (ruta.startsWith(BLOG_RUTA) && lineasBlog().length
      && bruto.includes(lineasBlog()[0])) conBlog++;
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
    + `descontado en las ${conBlog} fichas de services/`);
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
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} pagina(s)`}\n`);
process.exit(mal ? 1 : 0);
