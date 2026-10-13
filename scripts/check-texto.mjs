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
import { JSDOM } from 'jsdom';
import { ARGS_NAVEGADOR, aSlug, asentar, textoNormalizado } from './lib/captura.mjs';
import { origen, rutaCiudad, esFicha, esCiudad, esCondado } from './lib/renombradas.mjs';
import { tramosMiga } from '../src/lib/miga-tramos.mjs';
import { AREAS_PIE, ORDEN_SERVICIOS_PIE, COPYRIGHT_ORIGEN, copyright } from '../src/lib/pie.mjs';
import { lineasTarjetas, lineasBanda, lineasSrBanda, CATEGORIAS as GAL_CATEGORIAS } from '../src/lib/galeria-categorias.mjs';
import { OCULTAS, lineasFiltro } from '../src/lib/filtro-proyectos.mjs';
import { fotoDeHeroe } from '../src/lib/heroe-ciudad.mjs';
import { ciudadesDeFicha, SERVICIOS_CIUDAD } from '../src/lib/servicios-ciudad.mjs';
import { zonasDeCondado } from '../src/lib/condados.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');

/* Se declara AQUI ARRIBA y no junto a la capa de captacion: el bucle de medicion lleva `await`
 * de nivel superior, asi que la evaluacion del modulo se suspende antes de llegar a un `const`
 * declarado mas abajo y `reordena()` lo encontraria en zona muerta. Costo un ReferenceError. */
const CAPTACION_JSON = (() => {
  const f = path.join(RAIZ, 'src/data/captacion-servicios.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
})();
/** La fuente unica de los dos telefonos, la misma que lee la pagina (R20-CIUDADES). */
const TELEFONOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/telefonos.json'), 'utf8'));
/**
 * ── EL INTRO DE LAS 51 CIUDADES: PAR VIEJO -> NUEVO, DECLARADO ───────────────────────────────
 *
 * R21 cambia `headingIntro` y `paragraphIntro` en las 53 para que nombren pergolas y cocinas
 * exteriores (peticion de Sebastian, 18-sep-2026). Las dos piloto se declararon a mano arriba;
 * estas 51 se derivan, y el valor VIEJO sale de `copy-intro-anterior.json`, que es una foto fija
 * tomada ANTES del cambio. No se lee del cache de Sanity a proposito: ese cache se refresca con el
 * copy nuevo y la declaracion se quedaria sin su mitad izquierda.
 *
 * El h2 viejo decia «Licensed Pool Builders & Outdoor living contractors In <Ciudad>», que ademas
 * duplicaba casi palabra por palabra el h1 de la propia pagina.
 */
const INTRO_ANTERIOR = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/copy-intro-anterior.json'), 'utf8')).ciudades;
const SEO_CIUDADES = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/seo-pool-builders.json'), 'utf8'));

/* `webflow.css` pone `text-transform: capitalize` en los h2, y ESO SI altera `innerText`: el
 * baseline guarda «Outdoor Living Contractors» mientras que Sanity tiene «Outdoor living
 * contractors». La regla es la misma que `capitaliza()` (definida mas abajo en este fichero), y se
 * repite aqui —en vez de reusarla— porque `TRADUCIDAS_A_PROPOSITO` se evalua ANTES de esa
 * definicion y una `const` en zona muerta temporal reventaria al arrancar. */
const capitalizaH2 = (t) => String(t).replace(/(^|[\s(-])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

const INTRO_CIUDAD = Object.entries(INTRO_ANTERIOR).flatMap(([slug, v]) => {
  const b = SEO_CIUDADES[slug]?.bloques ?? {};
  const ruta = rutaCiudad(slug);
  const pares = [];
  if (b.headingIntro && v.headingIntro && b.headingIntro !== v.headingIntro) {
    pares.push([capitalizaH2(v.headingIntro), capitalizaH2(b.headingIntro),
      `h2 de intro de ${v.name}: vuelven pergolas y cocinas, pero AQUI y no en el heroe (Principio 1 `
      + 'de A3). De paso deja de duplicar casi palabra por palabra el h1 de la pagina', [ruta]]);
  }
  if (b.paragraphIntro && v.paragraphIntro && b.paragraphIntro !== v.paragraphIntro) {
    pares.push([v.paragraphIntro, b.paragraphIntro,
      `parrafo de intro de ${v.name}: entra el alcance real del negocio, contrastado con los 14 `
      + 'servicios de servicios-categoria.json', [ruta]]);
  }
  return pares;
});

const SANITY_CIUDADES = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/pool-builders-sanity.json'), 'utf8'));

/**
 * ── EL APOYO DEL HEROE DE LAS 53 CIUDADES, DERIVADO ──────────────────────────────────────────
 *
 * R20 declaro a mano las dos landings piloto. R21 enciende la capa en las 53, y escribir 51
 * entradas identicas a mano es exactamente la lista paralela que se desincroniza al mes: el
 * `intro` viejo vive en Sanity y el nuevo lo genera `build-captacion-ciudades.mjs`, asi que se
 * cruzan las DOS FUENTES y se declara lo que realmente cambia, ruta por ruta.
 *
 * Si una ciudad no tiene capa de captacion, no aparece aqui y su texto se compara sin tocar.
 * Si el `intro` de Sanity cambiara, esta declaracion deja de casar y la puerta lo dice — que es
 * justo lo que se quiere de una declaracion.
 */
const APOYOS_CIUDAD = SANITY_CIUDADES
  .map((d) => [rutaCiudad(d.slug), d])
  .filter(([ruta]) => CAPTACION_JSON[ruta]?.heroe?.apoyo)
  .filter(([ruta, d]) => d.intro && d.intro !== CAPTACION_JSON[ruta].heroe.apoyo)
  .map(([ruta, d]) => [d.intro, CAPTACION_JSON[ruta].heroe.apoyo,
    `apoyo del heroe de ${d.name}: resuelve QUE, DONDE, PARA QUIEN y QUE HACER AHORA sin ofrecer `
    + 'la remodelacion, que compite con la intencion del anuncio arriba del pliegue',
    [ruta]]);

/**
 * ── SEO-REMEDIACION (4-oct-2026) · EL CARRUSEL DE OBRA DE LAS 53, DERIVADO ─────────────────────
 *
 * Sanity decia «Browse our <Ciudad> portfolio of … pools & outdoor spaces…» encima de un carrusel
 * que es el MISMO en las 53 y sin una sola obra con ciudad verificada. `[slug].astro` lo pisa con
 * un titular y una entradilla que no situan la obra en ninguna ciudad. Se cruza con la cache de
 * Sanity ciudad por ciudad: si el texto viejo cambiara, la declaracion deja de casar y lo dice.
 */
/* SEO-REMEDIACION (4-oct-2026): textos de paginas derivadas que corrige `build-paginas.mjs`
 * desde `src/data/textos-propios.json` (FAQ de /about, la licencia que faltaba, la errata «ok.»).
 * Se leen del MISMO fichero; el h2 y los h3 pasan por `capitalizaH2` por el `text-transform`. */
const TEXTOS_PROPIOS_DECL = Object.entries(JSON.parse(fs.readFileSync(
  path.join(RAIZ, 'src/data/textos-propios.json'), 'utf8')))
  .filter(([r]) => !r.startsWith('_'))
  .flatMap(([ruta, t]) => [
    ...(t.faq ? [[t.faq.tituloEra, capitalizaH2(t.faq.titulo), `SEO-REMEDIACION: titular de la FAQ de ${ruta}`, [ruta]]] : []),
    ...(t.faq?.preguntas ?? []).filter((q) => q.era !== q.pregunta)
      .map((q) => [capitalizaH2(q.era), capitalizaH2(q.pregunta), `SEO-REMEDIACION: pregunta de la FAQ de ${ruta}`, [ruta]]),
    ...(t.sustituye ?? []).map((x) => [x.era, x.es, `SEO-REMEDIACION: ${x.motivo}`, [ruta]]),
  ]).filter((x) => x[0]);

const CARRUSEL_TITULO = 'Featured Custom Pool Projects';
const CARRUSEL_TEXTO = 'Selected custom pool and outdoor living projects from our Florida portfolio, to inspire your design.';
const CARRUSEL_CIUDAD = SANITY_CIUDADES.flatMap((d) => [
  [d.headingPortfolio, CARRUSEL_TITULO,
    'SEO-REMEDIACION: el titular del carrusel de obra, igual en las 53', [rutaCiudad(d.slug)]],
  [d.paragraphPortfolio, CARRUSEL_TEXTO,
    `SEO-REMEDIACION: «Browse our ${d.name} portfolio» sobre obra sin ciudad verificada`, [rutaCiudad(d.slug)]],
]);

/**
 * ── LA BANDA «Project Gallery», DERIVADA (PANELES-GALERIA, 2-oct-2026) ─────────────────────────
 *
 * Los seis paneles de «Pool Features & Upgrades» pasan a ser las seis categorias de /gallery, en
 * las 55 rutas que llevan la banda. Son 14 lineas -titular, entradilla y seis pares nombre/parrafo-
 * que se sustituyen UNA A UNA, en el mismo orden, por las de `lineasBanda()`: la misma funcion que
 * escribe el marcado, asi que si mañana cambia un slug o una `linea` en galeria-categorias.json, la
 * pagina y esta declaracion se mueven juntas.
 *
 * Lo viejo sale del BASELINE, que no se mueve nunca: los seis pares nombre/parrafo, escritos aqui, y
 * el titular y la entradilla de cada ruta, que se LEEN de `baseline/text/<ruta>.txt` -las dos lineas
 * justo antes del primer panel-. No de la cache de Sanity: `headingFeature`/`paragraphFeatures` ya
 * no se pintan y se pueden limpiar alli, y una declaracion que leyera la cache se pondria roja en las
 * 53 por un texto correcto. Si el baseline no trae la banda donde se espera, revienta al arrancar.
 */
const PANELES_VIEJOS = [
  'Energy Efficient Systems',
  'Engineered energy-efficient systems include variable-speed pumps, saltwater systems, efficient '
    + 'heaters, and LED lighting—designed to reduce operating costs and improve long-term pool performance.',
  'Smart Automation',
  'Smart pool automation allows seamless control of filtration, heating, lighting, and water features '
    + 'from one system—improving efficiency, convenience, and the overall luxury pool experience.',
  'Water Features',
  'Custom water features such as sheer descents, scuppers, bubblers, and spillover spas are engineered '
    + 'to enhance visual impact, movement, and sound while integrating seamlessly into the pool design.',
  'Fire & Lighting Features',
  'Fire bowls, fire pits, and architectural lighting create dramatic outdoor environments, extending '
    + 'usability into the evening while enhancing ambiance, safety, and visual depth.',
  'Safety & Comfort',
  'Integrated safety and comfort features include slip-resistant surfaces, pool covers, handrails, and '
    + 'code-compliant barriers—designed to meet Florida regulations without sacrificing aesthetics.',
  'Outdoor Living Enhancements',
  'Outdoor living design-build enhancements include outdoor kitchens, pergolas, hardscaping, and '
    + 'architectural shade structures—fully integrated to create a cohesive, high-end outdoor environment.',
];
const RUTAS_BANDA = [
  ...SANITY_CIUDADES.map((d) => rutaCiudad(d.slug)),
  '/where-we-serve/north-florida',
  '/where-we-serve/south-florida',
];
/* Solo las rutas CON baseline: una ciudad que entre mañana en la cache de Sanity no tiene
 * referencia, no se mide, y no puede tumbar al arrancar una corrida de `/services/`. */
const baselineDe = (ruta) => path.join(RAIZ, 'baseline/text', `${aSlug(ruta)}.txt`);
const CABECERAS_BANDA = RUTAS_BANDA.filter((ruta) => fs.existsSync(baselineDe(ruta))).map((ruta) => {
  const lineas = fs.readFileSync(baselineDe(ruta), 'utf8').split('\n');
  const i = lineas.indexOf(PANELES_VIEJOS[0]);
  if (i < 2 || lineas.indexOf(PANELES_VIEJOS[0], i + 1) >= 0
    || PANELES_VIEJOS.some((v, k) => lineas[i + k] !== v)) {
    throw new Error(`BANDA_GALERIA: el baseline de ${ruta} no trae los seis paneles viejos seguidos`);
  }
  return [ruta, lineas.slice(i - 2, i)];
});
const BANDA_GALERIA = CABECERAS_BANDA.flatMap(([ruta, cabecera]) => {
  const viejas = [...cabecera, ...PANELES_VIEJOS];
  const nuevas = lineasBanda();
  if (viejas.length !== nuevas.length) {
    throw new Error(`BANDA_GALERIA: ${viejas.length} lineas viejas contra ${nuevas.length} nuevas`);
  }
  return viejas.map((v, i) => [v, nuevas[i],
    'PANELES-GALERIA: la banda de seis paneles pasa a ser la puerta a /gallery/<slug>', [ruta]]);
});

const SERVICIOS_CAT = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/servicios-categoria.json'), 'utf8'));
const GALERIA_OBRA = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'src/data/galeria-obra-por-ruta.json'), 'utf8'));
/* D-127 · `MM_ESTATICO=<carpeta>`: medir una COPIA del build en vez de `.vercel/output/static`, para
 * que una corrida larga no impida seguir construyendo. Se dice SIEMPRE que carpeta se ha medido y de
 * cuando es su `index.html`: una copia vieja no puede pasar por el build de ahora. */
const ESTATICO = process.env.MM_ESTATICO ? path.resolve(process.env.MM_ESTATICO) : path.join(RAIZ, '.vercel/output/static');
const fechaDelBuild = (dir) => {
  const f = path.join(dir, 'index.html');
  return fs.existsSync(f) ? fs.statSync(f).mtime.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).slice(0, 16) : 'sin index.html';
};

/**
 * FILTRO POSICIONAL. Cada argumento es una SUBCADENA de la ruta, salvo que empiece por `=`,
 * que entonces es coincidencia EXACTA.
 *
 * El `=` existe por una razon concreta: la home es `/`, y `/` como subcadena casa las 115
 * rutas. O sea que la unica pagina del sitio que NO se podia acotar era justo la que mas veces
 * hay que medir durante el redisenio —y creerte que mides 1 mientras mides 115 son ~65 minutos
 * con la pantalla del usuario secuestrada. Con `=/` se mide solo la home.
 *
 *     node scripts/check-texto.mjs /services/ /services/pool-builders/     (subcadena, como siempre)
 *     node scripts/check-texto.mjs '=/'                           (SOLO la home; las comillas hacen
 *                                                          falta: zsh expande `=/` solo)
 */
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));
if (!fs.existsSync(ESTATICO)) { console.error(`\nROJO falta ${ESTATICO} — corre \`npm run build\`${process.env.MM_ESTATICO ? ' o revisa MM_ESTATICO' : ''}\n`); process.exit(1); }
console.log(`  build medido: ${path.relative(RAIZ, ESTATICO) || ESTATICO} · de ${fechaDelBuild(ESTATICO)} (hora de Florida)`
  + (process.env.MM_ESTATICO ? `   ← COPIA por MM_ESTATICO; el build en curso es de ${fechaDelBuild(path.join(RAIZ, '.vercel/output/static'))}` : ''));

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
const RUTAS_CSV = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));
const RUTAS = RUTAS_CSV.filter(casa);

/**
 * ── LA BARANDILLA CUBRE TODO LO CONSTRUIDO (STITCH-E2-BARANDILLA, D-33/D-36, 12-oct-2026) ──────
 *
 * `routes.csv` son las 115 rutas que existian en Webflow. El sitio construye 234. Hasta hoy las
 * otras 119 no se abrian: ni verdes ni rojas. Se pidio `=/financing` y la puerta contesto
 * «3/3 rutas medidas» sobre cuatro pedidas (STITCH-PARTE-5 §3.0).
 *
 * Desde ahora la lista sale del BUILD: toda pagina `.html` construida se mide. Hay dos tipos de
 * referencia y no se mezclan:
 *
 *   baseline/text/         las 115. `innerText` del Webflow vivo + los ajustes declarados de
 *                          este fichero. NO se toca.
 *   baseline/text-propio/  las que nunca estuvieron en Webflow. `innerText` del propio build en
 *                          el commit que dice su ORIGEN.md. Se comparan EN CRUDO.
 *
 * Construida y sin referencia en ninguna de las dos = ROJO. Sin tercer cubo.
 *
 * A las propias solo les aplica una declaracion si NOMBRA la ruta (`rutas`/`ruta`). Las
 * declaraciones globales de este fichero describen la distancia entre Webflow y el build, y la
 * referencia propia ya ES el build: aplicarselas la falsearia.
 *
 * `--capturar-propio` escribe la referencia de las propias que no la tengan, con la misma
 * `asentar()` + `textoNormalizado()` y el mismo navegador que la medicion. SE NIEGA a
 * sobrescribir: una referencia que ya existe solo se cambia borrandola a mano, a la vista.
 */
const DIR_PROPIO = path.join(RAIZ, 'baseline/text-propio');
const CAPTURAR_PROPIO = process.argv.includes('--capturar-propio');
const htmlConstruidos = (function recorre(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) recorre(f, out);
    else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
})(ESTATICO);
const RUTAS_CONSTRUIDAS = htmlConstruidos.map((f) => {
  const r = '/' + path.relative(ESTATICO, f).split(path.sep).join('/');
  return r.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
}).sort();
const EN_CSV = new Set(RUTAS_CSV);
const RUTAS_PROPIAS = RUTAS_CONSTRUIDAS.filter((r) => !EN_CSV.has(r)).filter(casa);
const PROPIAS = new Set(RUTAS_PROPIAS);
const RUTAS_A_MEDIR = CAPTURAR_PROPIO ? RUTAS_PROPIAS : [...RUTAS, ...RUTAS_PROPIAS];

/** Lo esperado de una ruta propia: su referencia, con SOLO las declaraciones que la nombran. */
function esperadoPropio(ruta, lineas) {
  const quitadas = new Set(QUITADAS_A_PROPOSITO.filter(([, , rutas]) => rutas?.includes(ruta)).map(([l]) => l));
  let out = lineas.filter((l) => !quitadas.has(l)).map((l) => {
    const t = TRADUCIDAS_A_PROPOSITO.find(([viejo, , , rutas]) => viejo === l && rutas?.includes(ruta));
    return t ? t[1] : l;
  });
  for (const d of REORDENADAS_A_PROPOSITO) {
    if (d.ruta !== ruta && !d.rutas?.includes(ruta)) continue;
    const i = out.findIndex((_, k) => d.antes.every((l, j) => out[k + j] === l));
    if (i >= 0) out = [...out.slice(0, i), ...d.despues, ...out.slice(i + d.antes.length)];
  }
  // ASTRO-2 · HERO A DE CIUDAD: las referencias propias guardan el hero de Webflow (licencia, h1, h2,
  // parrafo, linea de telefonos, accion, «Project Gallery»). Se cambia ese tramo, EXACTO y seguido,
  // por el nuevo: mismos textos, la licencia y los telefonos en banda de datos detras de los
  // botones, y el pie de foto donde hay foto (T-66, T-67). Si no esta tal cual, no se toca.
  const ch = CAPTACION_JSON[ruta]?.heroe;
  if (ch && !esFicha(ruta) && ruta.startsWith('/services/')) {
    const zonas = (ch.zonas ?? TELEFONOS.items.map((x) => x.zona)).map((z) => TELEFONOS.items.find((x) => x.zona === z));
    const lineaTel = zonas.map((t) => `${t.visible} ${t.zona}`).join(' · ');
    const k = out.findIndex((l, x) => l === ch.licencias && out[x + 4] === lineaTel && out[x + 6] === 'Project Gallery');
    if (k >= 0) {
      const [rot, ...val] = ch.licencias.split(' · ');
      const pie = fotoDeHeroe(ruta)?.pie;
      out = [...out.slice(0, k), out[k + 1], out[k + 2], out[k + 3], out[k + 5], 'Project Gallery',
        ...zonas.flatMap((t) => [t.zona.toUpperCase(), t.visible]), rot.toUpperCase(), val.join(' · '),
        ...(pie ? ['PROJECT', pie] : []), ...out.slice(k + 7)];
    }
  }
  // La miga pasa de ir detras de la franja de logos a abrir el hero.
  if (ch && esCiudadA(ruta)) {
    const miga = tramosMiga(ruta).map((t) => t.nombre);
    const m = out.findIndex((_, x) => miga.every((l, y) => out[x + y] === l));
    const h = out.findIndex((l) => l === CAPTACION_JSON[ruta].heroe.licencias.split(' · ')[0].toUpperCase());
    // `h` es el rotulo de la licencia de la banda de datos; el h1 esta 9 lineas antes (h1, h2,
    // parrafo, accion, «Project Gallery», y los dos telefonos con su rotulo).
    if (m >= 0 && h >= 9 && m > h) {
      out.splice(m, miga.length);
      out.splice(h - 9, 0, ...miga);
    }
  }
  // ASTRO-2: las referencias propias de las paginas de ciudad guardan el formulario de un paso.
  // Se cambia ese tramo, EXACTO y seguido, por el de dos pasos; si no esta tal cual, no se toca.
  const cf = CAPTACION_JSON[ruta];
  if (cf?.formulario) {
    const viejo = formularioViejo(cf);
    const k = out.findIndex((_, x) => viejo.every((l, y) => out[x + y] === l));
    if (k >= 0) out = [...out.slice(0, k), ...formularioNuevo(cf), ...out.slice(k + viejo.length)];
  }
  out = ordenCiudadPropia(ruta, out);
  return cascaronStitch(out);   // las referencias propias se capturaron con el cascaron de Webflow
}
/**
 * ASTRO-2 · EL ORDEN DE LA LAMINA «Ciudad», sobre la REFERENCIA PROPIA de las 65 paginas de ciudad de
 * los demas servicios. La referencia es el texto entero de la pagina en su orden anterior:
 *     … · formulario · galeria (+3D) · banda de categorias · FAQ · inversion · servicios · resenas ·
 *     proyectos · articulos · banda final · …
 * y la lamina lo deja en
 *     … · galeria (+3D) · servicios · inversion · FAQ · banda de categorias · proyectos · articulos ·
 *     resenas · banda final (sin su boton, T-57) · formulario · …
 * Cada tramo se localiza por su PRIMERA linea, que sale de los mismos datos que pintan la pagina. Si
 * falta una sola marca o no van en el orden esperado, no se toca nada y la ruta sale roja.
 */
function ordenCiudadPropia(ruta, lineas) {
  const c = CAPTACION_JSON[ruta];
  const pag = PAGINAS_CIUDAD_SERVICIO[ruta];
  if (!c || !pag || !esCiudadA(ruta)) return lineas;
  const ci = (t) => lineas.findIndex((l) => l.toLowerCase() === String(t).toLowerCase());
  const marcas = {
    form: lineas.indexOf('Step 1 of 2'),
    banda: lineas.findIndex((l, k) => l === 'Project Gallery' && (lineas[k + 1] ?? '').startsWith('See pools, pergolas')),
    faq: ci(c.faq.titulo),
    inv: ci(c.inversion.titulo),
    serv: ci(SERVICIOS_CAT['/'].titulo.replace(/&amp;/g, '&')),
    res: lineas.indexOf('TESTIMONIALS'),
    blog: ci(pag.doc.headingBlog),
    cta: lineas.findIndex((l) => l.startsWith(CIERRE_CIUDAD)) - 1,
  };
  const nForm = formularioNuevo(c).length;
  const nRes = 3 + lineasResenas().length;   // rotulo, titular, parrafo + el bloque de siempre
  const gal = marcas.form + nForm;
  const proy = marcas.res + nRes;
  const fin = marcas.cta + 3;               // titular, parrafo y el boton que sale
  const orden = [marcas.form, gal, marcas.banda, marcas.faq, marcas.inv, marcas.serv, marcas.res, proy, marcas.blog, marcas.cta, fin];
  if (orden.some((x) => x < 0) || orden.some((x, k) => k && x <= orden[k - 1]) || lineas[fin - 1] !== 'Get A Free Estimate') return lineas;
  const tramo = (a, b) => lineas.slice(a, b);
  return [
    ...tramo(0, marcas.form),
    ...tramo(gal, marcas.banda),
    ...tramo(marcas.serv, marcas.res),
    ...tramo(marcas.inv, marcas.serv),
    ...tramo(marcas.faq, marcas.inv),
    ...tramo(marcas.banda, marcas.faq),
    ...tramo(proy, marcas.blog),
    ...tramo(marcas.blog, marcas.cta),
    ...tramo(marcas.res, proy),
    ...tramo(marcas.cta, fin - 1),
    ...tramo(marcas.form, gal),
    ...tramo(fin, lineas.length),
  ];
}
/** Lo medido de una ruta propia, sin las lineas que una declaracion con su nombre añade. */
function medidoPropio(ruta, lineas) {
  let out = listasStitch(ruta, marcaCabecera(lineas));
  // T-35: los rotulos del plano en linea de la inversion, en las rutas de piscina. En las rutas con
  // referencia de Webflow los descuenta `bloquesCaptacion`; las de referencia propia no pasan por ahi.
  if (/^\/services\/pool-(builders|remodeling)(\/|$)/.test(ruta)) out = quitaBloque(out, ['SIZE', 'DESIGN', 'FINISHES', 'SITE CONDITIONS']) ?? out;
  for (const d of LINEAS_ANADIDAS) {
    if (!d.rutas?.includes(ruta)) continue;
    for (const l of d.lineas) { const i = out.indexOf(l); if (i >= 0) out.splice(i, 1); }
  }
  return out;
}

/**
 * Líneas del baseline que YA NO EXISTEN a propósito, con su motivo. Una a una: bajar el
 * umbral del 100 % convertiría esta puerta en un porcentaje que ya no avisa de nada.
 *
 * Todas vienen de la decisión D2 (los widgets de Elfsight se rehacen nativos): son chrome del
 * propio Elfsight, no contenido del cliente.
 */
const QUITADAS_A_PROPOSITO = [
  /* ASTRO-2 · T-44: en las paginas de servicio × ciudad los articulos dejan de ser carrusel. Los
   * tres primeros conservan su resumen; del cuarto en adelante quedan el titulo y «Read More», y el
   * resumen sale de la vista. Leidos de `blogs.json`, que es de donde los pinta `CarruselBlog.astro`. */
  ...JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8')).posts.slice(3)
    .map((p) => [(p.resumen ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
      'ASTRO-2 (T-44): resumen de un articulo que pasa al indice de texto',
      RUTAS_A_MEDIR.filter((r) => r.startsWith('/services/') && !esFicha(r))]),
  ['12', 'la paginación del widget de Elfsight en /videos: la galería nativa los pinta todos'],
  ['Free YouTube Video Gallery Widget', 'la marca de Elfsight en /videos. Se va con el widget'],

  /* ── LAS 14 FICHAS DE `/services/` NO LLEVAN DECLARACIONES AQUI, Y ES A PROPOSITO ─────────
   * El antes/despues que pierden se quita del baseline crudo en `quitaAntesDespues()`, como
   * BLOQUE CONTIGUO. Declararlo linea a linea -nueve por ficha- estaba MAL por dos razones que
   * la puerta demostro:
   *
   *   · la ultima linea del bloque es «Get A Free Estimate», que sale CUATRO veces en la
   *     pagina; `QUITADAS_A_PROPOSITO` filtra por Set y habria borrado tambien la del heroe.
   *   · nueve lineas de copy ajeno copiadas a mano por ficha son nueve lineas que se
   *     desincronizan el dia que alguien toque el origen.
   *
   * 13-sep-2026: la ficha de piscina, que era el piloto, tambien sale de aqui. Sus nueve lineas
   * del antes/despues ya no quitaban nada -`quitaAntesDespues()` corre antes-, y las dos de su
   * `gallery` vuelven: la galeria vuelve a la pagina (§ `subeGaleria()`). */
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
  /* SEO-REMEDIACION (4-oct-2026): la errata de la primera insignia del heroe de la home. Que el
   * seguro este en vigor sigue pendiente de confirmar (`SEO_REQUIRES_CLIENT_DATA.md`); esto solo
   * arregla la palabra, que el pie ya escribe bien («Licensed & Insured»). */
  ['Licensed & Insurance', 'Licensed & Insured', 'errata de la insignia del heroe de la home', ['/']],
  /* SEO-REMEDIACION (4-oct-2026): dos resumenes de subservicio de la landing de remodelacion que
   * atraian leads de reparacion suelta («repairs addressing cracks, leaks»). Se reescriben como
   * parte de una remodelacion completa; el nuevo se lee de `servicios.textos` del JSON. */
  ['Professional pool repairs addressing cracks, leaks, and structural issues for lasting performance.',
    CAPTACION_JSON['/services/pool-remodeling'].servicios.textos['Structural Pool Repairs'],
    'SEO-REMEDIACION: resumen de «Structural Pool Repairs» en contexto de remodelacion completa',
    ['/services/pool-remodeling']],
  ['Modern pool equipment upgrades that improve circulation, filtration, and overall system efficiency.',
    CAPTACION_JSON['/services/pool-remodeling'].servicios.textos['Pool Equipment Upgrades'],
    'SEO-REMEDIACION: resumen de «Pool Equipment Upgrades» como sistema dentro de la remodelacion',
    ['/services/pool-remodeling']],
  ...TEXTOS_PROPIOS_DECL,
  ['¡View More!', 'View More!',
    'el botón de /brochures. El texto ya era inglés; lo que sobraba era el signo de apertura '
    + '«¡», que es puntuación exclusiva del español'],

  // SEO-AEO-GEO A3 — las 2 ciudades que son LANDING DE PAGO. El origen encabezaba con
  // «Outdoor Living Contractors» y «All In One - … Pergolas & Outdoor Kitchens», que compite
  // con la intención del anuncio (piscina nueva) justo arriba del pliegue. Se antepone la
  // piscina y se añade el condado, que es un dato local verificable. Sustitución 1→1, línea
  // entera: no se añade ni se quita texto, se cambia. Los servicios secundarios siguen abajo.
  // Escritas ya en Title Case palabra a palabra porque `capitalize` vive en h1/h2 y SÍ altera
  // innerText — la quinta vez que esto muerde en este repo.
  ['Luxury Pool Builders & Outdoor Living Contractors In Gainesville, Florida',
    'Custom Pool Builders In Gainesville, Florida',
    'h1 de /services/pool-builders/gainesville-fl, landing de pago del grupo Gainesville'],
  ['All In One - Custom Pools, Pergolas & Outdoor Kitchens Contractors For Your Backyard In Gainesville, Florida',
    'Custom Inground Pool Construction For Homes In Gainesville And Alachua County',
    'h2 del héroe de Gainesville: fuera pérgolas y cocinas de arriba del pliegue'],
  /**
   * ── R21 · EL PÁRRAFO DEL INTRO DE LAS DOS LANDINGS ───────────────────────────────────────
   *
   * Pedido de Sebastian (18-sep-2026): «mejorar el copy de las dos páginas para que también sepan
   * que se hacen pergolas, outdoor kitchens». El párrafo venía DEL BASELINE sin traducir y sólo
   * nombraba construcción y remodelación de piscina, así que un visitante que llega por «pool
   * builders» no se enteraba de que la casa hace el patio entero.
   *
   * SOLO SE NOMBRA LO QUE SE VENDE DE VERDAD, comprobado contra los 14 de
   * `servicios-categoria.json`: Pool Construction, Pool Remodeling, Aluminum Pergolas, Louvered
   * Roof Systems, Outdoor Kitchens, Custom Decks, Pool Screen Enclosures. Nada inventado.
   *
   * La última frase se conserva palabra por palabra: es la que ya cerraba el párrafo y no había
   * motivo para tocarla.
   */
  ['As premier outdoor living contractors in Ocala, FL, we design and execute elite residential and commercial projects. Our team of expert pool builders specializes in custom in-ground pool construction and luxury pool remodeling. From North to South Florida, we are the licensed contractors homeowners trust for high-end craftsmanship and lasting value.',
    'Every project starts with the pool: a 3D design drawn for your lot, engineering, permits and inspections, then excavation, steel and gunite, plumbing, finishes and start-up, all by one licensed design-build team. When the plan calls for more, the same crews build the pergola, outdoor kitchen, deck or screen enclosure around it for Ocala homeowners. From North to South Florida, we are the licensed contractors homeowners trust for high-end craftsmanship and lasting value.',
    'párrafo de intro de Ocala: entra el alcance real del negocio',
    ['/services/pool-builders/ocala-fl']],
  ['As premier outdoor living contractors in Gainesville, FL, we design and execute elite residential and commercial projects. Our team of expert pool builders specializes in custom in-ground pool construction and luxury pool remodeling. From North to South Florida, we are the licensed contractors homeowners trust for high-end craftsmanship and lasting value.',
    'Every project starts with the pool: a 3D design drawn for your lot, engineering, permits and inspections, then excavation, steel and gunite, plumbing, finishes and start-up, all by one licensed design-build team. When the plan calls for more, the same crews build the pergola, outdoor kitchen, deck or screen enclosure around it for Gainesville homeowners. From North to South Florida, we are the licensed contractors homeowners trust for high-end craftsmanship and lasting value.',
    'párrafo de intro de Gainesville: entra el alcance real del negocio',
    ['/services/pool-builders/gainesville-fl']],
  ['Licensed Pool Builders & Outdoor Living Contractors In Gainesville',
    'Custom Pool Design & Construction In Gainesville, Florida',
    'h2 de intro de Gainesville. R21 (Sebastian, 18-sep): vuelven pérgolas y cocinas, pero AQUÍ '
    + 'y no en el héroe. A3 las quitó «de arriba del pliegue» y el héroe sigue limpio; esta '
    + 'sección es el «más abajo» del Principio 1 de A3, donde los servicios secundarios sí '
    + 'viven. De paso deja de duplicar casi palabra por palabra el h1 de la página'],
  ['Luxury Pool Builders & Outdoor Living Contractors In Ocala, Florida',
    'Custom Pool Builders In Ocala, Florida',
    'h1 de /services/pool-builders/ocala-fl, landing de pago del grupo Ocala'],
  ['All In One - Custom Pools, Pergolas & Outdoor Kitchens Contractors For Your Backyard In Ocala, Florida',
    'Custom Inground Pool Construction For Homes In Ocala And Marion County',
    'h2 del héroe de Ocala: fuera pérgolas y cocinas de arriba del pliegue'],
  ['Licensed Pool Builders & Outdoor Living Contractors In Ocala',
    'Custom Pool Design & Construction In Ocala, Florida',
    'h2 de intro de Ocala. R21 (Sebastian, 18-sep): vuelven pérgolas y cocinas, pero AQUÍ '
    + 'y no en el héroe. A3 las quitó «de arriba del pliegue» y el héroe sigue limpio; esta '
    + 'sección es el «más abajo» del Principio 1 de A3, donde los servicios secundarios sí '
    + 'viven. De paso deja de duplicar casi palabra por palabra el h1 de la página'],

  /**
   * ── R20-CIUDADES · EL APOYO DEL HÉROE DE LAS DOS LANDINGS DE PAGO ─────────────────────────
   *
   * A3 arregló el h1 y el h2; la TERCERA línea de la primera pantalla seguía vendiendo «new
   * pool construction, pool remodeling, and luxury pool design» en la landing de un ad group
   * que compra CONSTRUCCIÓN NUEVA. La remodelación tiene su propia landing con su propio
   * formulario desde R19: ofrecerla aquí es abrir la puerta de al lado antes de que el
   * visitante haya entendido ésta.
   *
   * Lo pisa `[slug].astro` desde `heroe.apoyo` de `captacion-servicios.json`, por el mismo
   * mecanismo que `bloques`. Sustitución 1→1, línea entera: no se añade ni se quita texto.
   * NO lleva `rutas` porque no hace falta —cada una de estas dos líneas solo existe en su
   * propia página, igual que los encabezados de A3 de arriba—.
   */
  /* Las 53, derivadas arriba: el `intro` de Sanity -> el `apoyo` que genera la capa. */
  ...APOYOS_CIUDAD,
  ...CARRUSEL_CIUDAD,
  ...BANDA_GALERIA,
  /* Y el h2 + parrafo de la seccion de intro de las 51 (las 2 piloto van a mano, mas arriba). */
  ...INTRO_CIUDAD,

  /**
   * ── R17-CORE · LA LANDING DE PAGO DEL AD GROUP «POOL BUILDERS CORE» ───────────────────
   *
   * Las cuatro llevan `rutas`, y las dos ultimas LO NECESITAN: «What Do We Do!» esta en las 14
   * fichas de `/services/` y una sustitucion global pondria las otras trece en rojo.
   *
   * Escritas ya con la forma que RENDERIZA. `webflow.css` pone `text-transform: capitalize` en
   * `h1,h2,h3,h4,.button,.button-styles,.heading-deco` y **capitalize SI altera `innerText`**:
   * por eso el rotulo se declara «What We Do» y no «What we do». Es la sexta vez que esto
   * muerde en este repo.
   */
  /* SEO-SAFE (1-oct-2026): la landing de remodelacion dice QUE (remodelacion COMPLETA, que es la
   * intencion que la distingue de un resurfacing suelto), PARA QUIEN (North Florida delante, como
   * el anuncio) y QUE INCLUYE, igual que la de piscinas desde R17. */
  ['Pool remodeling contractors serving North & South Florida, upgrading pools with modern finishes, energy-efficient systems, and lasting results.',
    'Complete pool remodeling for North Florida homeowners — resurfacing, tile and coping, equipment and deck work in one permitted project, from one licensed team. We also remodel across South Florida.',
    'apoyo del heroe de la landing «Full Remodel»: remodelacion completa, North Florida delante, '
    + 'y el alcance en una frase', ['/services/pool-remodeling']],
  ['Custom pool and spa builders serving North & South Florida, delivering high-quality construction and long-term outdoor value.',
    'New custom inground pools for North Florida homeowners — 3D design, permits, construction and final start-up, from one licensed team. We also build across South Florida.',
    'apoyo del heroe: resuelve QUE, DONDE, PARA QUIEN y QUE HACER AHORA, con North Florida '
    + 'delante. El anterior decia «North & South Florida» en la landing cuyo anuncio promete '
    + 'North Florida', ['/services/pool-builders']],
  ['What Do We Do!', 'What We Do',
    'la errata del rotulo de la rejilla de subservicios: exclamacion por interrogacion. Se '
    + 'corrige SOLO en la landing de pago; en las otras 13 fichas sigue igual', ['/services/pool-builders']],
  ['Custom pool redesigns engineered for Florida homes and code compliance.',
    'Custom pool design engineered for Florida homes and code compliance.',
    '«redesigns» en la PRIMERA tarjeta de una ficha cuyo h1 es «Custom Pool BUILDERS»: es la '
    + 'intencion de la ficha hermana de remodelacion', ['/services/pool-builders']],
  ['Plumbing and circulation upgrades for proper water flow and filtration.',
    'Plumbing and circulation built for proper water flow and filtration.',
    '«upgrades» es lenguaje de remodelacion en una ficha de obra nueva', ['/services/pool-builders']],
  ['Tile and coping upgrades that improve pool safety, durability, and modern design.',
    'Tile and coping that improve pool safety, durability, and modern design.',
    'idem', ['/services/pool-builders']],
];

/**
 * Aplica las sustituciones declaradas a UNA línea del baseline, PARA UNA RUTA.
 *
 * 🚨 EL PARAMETRO `ruta` ES NUEVO (R17-CORE). Antes esta funcion no lo recibia, asi que toda
 * sustitucion era GLOBAL. Funcionaba porque las que habia -dos cadenas en espanol y los
 * encabezados de Gainesville y Ocala- solo existen en una pagina cada una. Deja de funcionar en
 * cuanto hay que cambiar una linea que EXISTE EN VARIAS: «What Do We Do!» esta en las 14 fichas
 * de `/services/`, y declararla global dejaria las otras trece esperando un texto que no van a
 * tener. El cuarto elemento de la tupla acota la sustitucion; sin el, global como siempre.
 */
const traduce = (ruta, l) => {
  const t = TRADUCIDAS_A_PROPOSITO.find(([viejo, , , rutas]) =>
    viejo === l && (!rutas || rutas.includes(ruta)));
  return t ? t[1] : l;
};

/**
 * ── SEO-REMEDIACION (Sebastian, 4-oct-2026) · EL CTA PRINCIPAL DEL HEROE ────────────────────
 *
 * En la home y en las landings de piscina con `heroe.cta` (las 2 fichas de piscina y las 53
 * ciudades) el boton del heroe pasa de «Get a Free Estimate» a «Request a Design-Build Project
 * Evaluation». `TRADUCIDAS_A_PROPOSITO` no sirve: sustituye TODAS las apariciones de la linea, y
 * «Get A Free Estimate» sale tambien en el nav y en el pie, que NO cambian. Se ancla por la
 * linea de DETRAS, que es la que solo tiene el heroe: «Trusted By Florida's Finest Homeowners»
 * (la banda de logos). Solo la PRIMERA pareja; si no esta, no se toca nada y la ruta sale roja,
 * que es lo que tiene que pasar.
 */
/**
 * ── SEO-REMEDIACION (4-oct-2026) · EL PIE ───────────────────────────────────────────────────
 * Las tres cosas que `Footer.astro` cambia, leidas de la MISMA fuente (`src/lib/pie.mjs`):
 *   · tras «Residential Services», los mismos 14 servicios en otro orden (piscina primero);
 *   · tras «Areas We Serve», las 53 ciudades se cambian por las 5 entradas de `AREAS_PIE`;
 *   · el año del copyright.
 * Con GUARDA: si el baseline no trae exactamente esos tramos, no se toca nada y sale rojo.
 */
/**
 * ── REDISEÑO STITCH · ASTRO-1 (12-oct-2026) · EL CASCARON NUEVO ─────────────────────────────
 * `Nav.astro` y `Footer.astro` dejan de ser el marcado de Webflow. Lo que cambia de texto esta
 * en docs/encargos/STITCH-TEXTO.md y se declara AQUI, de una vez para todas las rutas, sobre lo
 * ESPERADO (el baseline no se toca). Los telefonos, los servicios y las zonas salen de las
 * mismas fuentes que pinta la pagina (`telefonos.json`, `src/lib/pie.mjs`).
 *
 *   CABECERA
 *   · T-01  `Home` sale de la barra de escritorio (el logo enlaza a `/`).
 *   · T-03/T-04/T-05  entran la licencia y los dos telefonos con su zona, en la franja.
 *   · `Financing` y `Contact Us` pasan a la franja: mismo texto, ANTES de `Services`.
 *   · T-62  `Skip to content`, el enlace de salto (nuevo; visible solo con el foco).
 *   · T-02  los tres iconos de redes del menu no tenian texto: nada que declarar aqui.
 *   PIE
 *   · T-23  «Mr. & Mrs. Outdoor Living - Licensed & Insured | CPC… | CPC… | SCC…» pasa a ser
 *           el rotulo `Licensed & Insured` y las tres licencias como dato.
 *   · T-63  los dos telefonos con su zona, nuevos en el pie.
 *   · Los tres rotulos de columna salen en MAYUSCULAS: es `text-transform` en CSS, el texto
 *     del HTML es el de siempre. Y «Residential Services» va antes que «Quick Links».
 *
 * CON GUARDA, como `piePropio`: si lo esperado no trae EXACTAMENTE el tramo viejo, no se toca
 * nada y la ruta sale roja. Va DESPUES de `piePropio`, que es quien ordena servicios y zonas.
 */
/** Las 118 paginas de servicio × ciudad que monta `PaginaCiudad.astro` (no los 9 condados). */
const esCiudadA = (r) => /^\/services\/[^/]+\/[^/]+$/.test(r) && !/-county-fl$/.test(r);
/** El `alt` del banco por id: es el pie de foto del Hero A (D-109). Misma fuente que el generador. */
const BANCO_ALT = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/banco-imagenes.json'), 'utf8'))
  .filter((e) => e.procedencia === 'obra_real').map((e) => [e.id, e.alt]));
/**
 * ASTRO-2 · lo que el Hero A cambia en lineas que SI vienen del baseline, en las 14 fichas:
 *   · el antetitulo («Licensed & Insured Contractors») sale en MAYUSCULAS: es `.mm-etiqueta`,
 *     `text-transform` en CSS; el texto del HTML es el mismo;
 *   · «Trusted By Florida's Finest Homeowners» salia DOS veces (la marquesina tras el hero y la
 *     repetida junto al pie). Queda una, dentro del hero y en mayusculas por lo mismo; la segunda
 *     se retira (D-53, T-22 y T-43).
 * CON GUARDA: si la ficha no trae exactamente esas lineas, no se toca nada y sale roja.
 */
const ANTETITULO_FICHA = 'Licensed & Insured Contractors';
const LOGOS_TITULO = "Trusted By Florida's Finest Homeowners";
function heroAStitch(ruta, lineas) {
  if (!esFicha(ruta)) return lineas;
  const out = [...lineas];
  const a = out.indexOf(ANTETITULO_FICHA);
  const l1 = out.indexOf(LOGOS_TITULO);
  const l2 = out.lastIndexOf(LOGOS_TITULO);
  if (a < 0 || l1 < 0 || l2 === l1) return lineas;
  out[a] = ANTETITULO_FICHA.toUpperCase();
  out[l1] = LOGOS_TITULO.toUpperCase();
  out.splice(l2, 1);
  return out;
}
const MENU_VIEJO = ['Home', 'Services', 'About Us', 'Project Gallery', 'Resources', 'Financing', 'Contact Us', 'Get A Free Estimate'];
const MENU_NUEVO = ['Skip to content', 'Florida certified pool contractor · CPC1461119 · CPC1460562',
  ...TELEFONOS.items.flatMap((t) => [t.zona, t.visible]),
  'Financing', 'Contact Us', 'Services', 'About Us', 'Project Gallery', 'Resources', 'Get A Free Estimate'];
const PIE_LICENCIA_VIEJA = 'Mr. & Mrs. Outdoor Living - Licensed & Insured | CPC1461119 | CPC1460562 | SCC131153553';
const PIE_RAPIDOS = ['Home', 'About Us', 'Our Feature Projects', 'Customer Reviews', 'Blog & Tips', 'Contact Us'];
/* La cabecera se compara como UNA marca, no linea a linea: su licencia («Florida certified pool
 * contractor · …») es la MISMA cadena que ya pinta el hero de las fichas, y los descuentos de
 * bloques de mas abajo (`sinElBloque`) buscan por primera aparicion: se llevaban la de la
 * cabecera y dejaban la del hero. En lo medido, `marcaCabecera` cambia el tramo nuevo, EXACTO y
 * seguido, por la marca; en lo esperado, `cascaronStitch` cambia el viejo por la misma marca.
 * Si la pagina no trae el tramo nuevo tal cual, no hay marca y la ruta sale roja. */
const MARCA_CABECERA = '\u27e6cabecera G1: ' + MENU_NUEVO.join(' | ') + '\u27e7';
function marcaCabecera(lineas) {
  const out = [...lineas];
  const m = out.findIndex((_, k) => MENU_NUEVO.every((l, j) => out[k + j] === l));
  // La ultima linea («Get A Free Estimate») se queda fuera de la marca: hay declaraciones de
  // mas abajo ancladas `tras` ella (/gallery, /projects).
  if (m >= 0) out.splice(m, MENU_NUEVO.length - 1, MARCA_CABECERA);
  return out;
}
function cascaronStitch(lineas) {
  let out = [...lineas];
  const m = out.findIndex((_, k) => MENU_VIEJO.every((l, j) => out[k + j] === l));
  if (m >= 0) out.splice(m, MENU_VIEJO.length - 1, MARCA_CABECERA);
  const servicios = ORDEN_SERVICIOS_PIE.map((x) => x.texto);
  const zonas = AREAS_PIE.map((x) => x.texto);
  const viejo = [PIE_LICENCIA_VIEJA, 'Quick Links', ...PIE_RAPIDOS, 'Residential Services', ...servicios, 'Areas We Serve', ...zonas];
  const p = out.findIndex((_, k) => viejo.every((l, j) => out[k + j] === l));
  if (p >= 0) {
    out.splice(p, viejo.length,
      ...TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]),
      'LICENSED & INSURED', 'CPC1461119 · CPC1460562 · SCC131153553',
      'RESIDENTIAL SERVICES', ...servicios, 'QUICK LINKS', ...PIE_RAPIDOS, 'AREAS WE SERVE', ...zonas);
  }
  return out;
}
function piePropio(lineas) {
  const out = [...lineas];
  const s = out.indexOf('Residential Services');
  if (s >= 0) {
    const n = ORDEN_SERVICIOS_PIE.length;
    const tramo = out.slice(s + 1, s + 1 + n);
    const nuevo = ORDEN_SERVICIOS_PIE.map((x) => x.texto);
    if ([...tramo].sort().join('|') === [...nuevo].sort().join('|')) out.splice(s + 1, n, ...nuevo);
  }
  const a = out.indexOf('Areas We Serve');
  const c = out.indexOf(COPYRIGHT_ORIGEN);
  if (a >= 0 && c > a && c - a - 1 === 53) out.splice(a + 1, 53, ...AREAS_PIE.map((x) => x.texto));
  const c2 = out.indexOf(COPYRIGHT_ORIGEN);
  if (c2 >= 0) out[c2] = copyright();
  return out;
}

const CTA_HEROE_HOME = 'Request a Design-Build Project Evaluation';
function ctaHeroe(ruta, lineas) {
  const cta = ruta === '/' ? CTA_HEROE_HOME : CAPTACION_JSON[ruta]?.heroe?.cta;
  if (!cta) return lineas;
  const i = lineas.findIndex((l, k) => l === 'Get A Free Estimate'
    && lineas[k + 1] === "Trusted By Florida's Finest Homeowners");
  if (i < 0) return lineas;
  return [...lineas.slice(0, i), capitaliza(cta), ...lineas.slice(i + 1)];
}

/**
 * ── ORDEN CAMBIADO A PROPÓSITO ───────────────────────────────────────────────────────────
 *
 * DECISIÓN (Sebastian, 11-sep-2026): el desplegable de /gallery sigue el orden comercial de la
 * rejilla, piscinas primero. Son las mismas 15 opciones en otro orden, y por eso la puerta daba
 * «faltan 0, sobran 0» + «orden cambiado».
 *
 * Se declara el bloque EXACTO, antes -> después, y solo puede REORDENAR: si las dos listas no
 * tienen las mismas líneas, esto revienta al arrancar. Si el baseline deja de traer `antes`
 * seguido, no se aplica y la ruta vuelve a rojo. Todo lo demás se sigue comparando al 100 %.
 */
/**
 * ── BLOG-SANITY · EL INDICE REORDENA SUS TARJETAS ───────────────────────────────────────────
 *
 * El orden del baseline es el que tenia la coleccion en Webflow, que no responde a nada. El
 * indice nuevo ordena por CATEGORIA, en el mismo orden en que salen los chips: construccion
 * nueva, remodelacion, diseño, outdoor living y comercial. Asi la rejilla y la fila de filtros
 * cuentan la misma historia, y quien baja sin filtrar recorre las categorias en orden de
 * decision de compra en vez de en orden de importacion.
 *
 * ES UNA PERMUTACION, NO UNA EDICION: las mismas 10 tarjetas, las mismas 30 lineas. La guarda
 * de arranque de este fichero lo exige (`antes` y `despues` ordenados tienen que coincidir) y
 * por eso esta declaracion no puede colar un cambio de texto disfrazado de reordenamiento.
 *
 * SE DERIVA, y el texto SE LEE DEL BASELINE en vez de copiarse: los titulos salen capitalizados
 * por `text-transform: capitalize` y transcribirlos a mano es como se cuelan las erratas. Las
 * tarjetas se emparejan por su RESUMEN, que es unico y no lo toca la capitalizacion.
 *
 * Si manana se publica un articulo nuevo, sus lineas NO estan en el baseline y esta declaracion
 * no las toca: las declara `INDICE_BLOG` como añadidas. Las dos cosas son disjuntas.
 */
const INDICE_BLOG_ORDEN = (() => {
  const ref = path.join(RAIZ, 'baseline/text/blogs-tips.txt');
  const cache = path.join(RAIZ, 'src/data/blogs-sanity.json');
  if (!fs.existsSync(ref) || !fs.existsSync(cache)) return [];
  const base = fs.readFileSync(ref, 'utf8').trimEnd().split('\n');

  /* Las tarjetas del baseline: [titulo, resumen, «Read More»], leidas hacia atras desde cada
   * «Read More». Si el baseline cambiara de forma, `bloques` sale vacio y no se declara nada. */
  const bloques = [];
  base.forEach((l, i) => { if (l === 'Read More' && i >= 2) bloques.push(base.slice(i - 2, i + 1)); });
  if (bloques.length < 2) return [];

  const posts = JSON.parse(fs.readFileSync(cache, 'utf8'));
  const orden = [...posts].sort((a, b) => {
    if (Boolean(a.destacadoIndice) !== Boolean(b.destacadoIndice)) return a.destacadoIndice ? -1 : 1;
    const oa = a.ordenIndice ?? 9999; const ob = b.ordenIndice ?? 9999;
    return oa !== ob ? oa - ob : a.slug.localeCompare(b.slug);
  });

  const porResumen = new Map(bloques.map((b) => [b[1], b]));
  const despuesBloques = orden.map((p) => porResumen.get(p.summary)).filter(Boolean);
  /* Solo se declara si TODAS las tarjetas del baseline se emparejaron. Con una sin emparejar el
   * `antes`/`despues` no serian el mismo conjunto y la guarda de arranque abortaria el fichero
   * entero — mejor no declarar nada y que la puerta hable. */
  if (despuesBloques.length !== bloques.length) return [];

  const antes = bloques.flat();
  const despues = despuesBloques.flat();
  if (antes.join('\n') === despues.join('\n')) return [];   // ya estaban en ese orden
  return [{
    ruta: '/blogs-tips',
    antes,
    despues,
    motivo: 'BLOG-SANITY: el indice ordena por categoria, en el mismo orden que los chips, en vez '
      + 'de por el orden de importacion de Webflow. Mismas 10 tarjetas: solo cambia el orden.',
  }];
})();

/**
 * ── R22-DETALLE · EL REORDEN DE LOS SUBSERVICIOS EN LAS 14 FICHAS, DERIVADO ──────────────
 *
 * Las cuatro filas de `servicios.detalle` AGRUPAN los ocho subservicios por lo que va junto en
 * la obra, y agrupar es reordenar: sus dieciseis renglones -titulo y resumen de cada uno-
 * salen en otro orden que en el origen. No se pierde ni se inventa texto, asi que es
 * EXACTAMENTE un reorden y va aqui.
 *
 * SE DERIVA, NO SE COPIA. Escribir doce entradas a mano serian 12 x 16 = 192 renglones de
 * copy ajeno duplicados, y se desincronizarian el dia que alguien toque un resumen en el
 * origen. Las dos mitades salen de las dos fuentes que ya mandan:
 *
 *   `antes`   del MISMO `_source/vivo/services_*.html` que lee `build-paginas.mjs`
 *   `despues` del orden de `servicios.detalle[].items` en `captacion-servicios.json`
 *
 * Si alguien anade un subservicio en el origen o cambia un titulo en el JSON, esto se entera
 * solo. Y si dejan de ser una permutacion -si falta un titulo o sobra uno-, ABORTA aqui en vez
 * de dejar pasar una declaracion que miente.
 *
 * LA FICHA DE PISCINA SE EXCLUYE A PROPOSITO: su reorden ya lo declara R17-CORE mas abajo, con
 * los tres resumenes reescritos incluidos. Declararlo dos veces no rompe nada -el segundo no
 * encontraria su `antes` y seria un no-op- pero deja en el fichero una entrada que no hace
 * nada, que es justo como se pudre una tabla de declaraciones.
 */
const YA_DECLARADA = '/services/pool-builders';
const ORDEN_SUBSERVICIOS = Object.entries(CAPTACION_JSON)
  .filter(([ruta, c]) => esFicha(ruta) && ruta !== YA_DECLARADA
    && Array.isArray(c?.servicios?.detalle))
  .map(([ruta, c]) => {
    const f = path.join(RAIZ, `_source/vivo/${aSlug(origen(ruta))}.html`);   // el origen se nombra por la ruta VIEJA
    if (!fs.existsSync(f)) throw new Error(`check-texto: falta el origen de ${ruta}`);
    const sec = new JSDOM(fs.readFileSync(f, 'utf8')).window.document.querySelector('section.services');
    const limpia = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    /* EL TITULO VA CAPITALIZADO Y EL RESUMEN NO, y la diferencia la pone el CSS, no el dato.
     * `webflow.css` tiene `text-transform: capitalize` en `h1`-`h4` —el titulo es un `h3` en el
     * origen— y NO en `div`, que es lo que es `.paragraph-mini`. Como el baseline es `innerText`
     * REAL, ahi el titulo ya viene capitalizado y aqui hay que modelarlo.
     *
     * Solo mordio en UNA de las catorce: `smart-irrigation`, que es la unica con una palabra
     * funcional en minuscula en un titulo («Irrigation Rerouting for Pools & Hardscapes» ->
     * «... For ...»). En las otras trece el capitalize es un no-op y por eso pasaron. Es la
     * cuarta vez que esto muerde en este repo; ver la cabecera de `lineasBlog()`.
     *
     * Se usa `capitalizaH2` y no `capitaliza`: esta constante se evalua ANTES de la definicion
     * de `capitaliza`, y una `const` en zona muerta temporal revienta al arrancar. */
    /* SEO-REMEDIACION (4-oct-2026): el resumen es el FINAL —`servicios.textos` lo sustituye por
     * titulo (§ TRADUCIDAS)—, porque `reordena()` corre despues de `traduce()`. */
    const pares = [...sec.querySelectorAll('.item-subservice')].map((el) => [
      capitalizaH2(limpia(el.querySelector('h3'))),
      c.servicios.textos?.[limpia(el.querySelector('h3'))] ?? limpia(el.querySelector('.paragraph-mini')),
    ]);
    const resumen = new Map(pares);
    const orden = c.servicios.detalle.flatMap((fila) => fila.items).map(capitalizaH2);
    const antes = pares.flat();
    const despues = orden.flatMap((t) => {
      if (!resumen.has(t)) {
        throw new Error(`check-texto: ${ruta} declara el subservicio «${t}» y no esta en el origen`);
      }
      return [t, resumen.get(t)];
    });
    if ([...antes].sort().join('\n') !== [...despues].sort().join('\n')) {
      throw new Error(`check-texto: el reorden de ${ruta} NO es una permutacion`);
    }
    return { ruta, antes, despues,
      motivo: 'R22-DETALLE: las 4 filas agrupan los 8 subservicios, y agrupar los reordena. '
        + 'Mismos 16 renglones: solo cambia el orden. Derivado del origen y del JSON.' };
  })
  .filter((d) => d.antes.join('\n') !== d.despues.join('\n'));

const REORDENADAS_A_PROPOSITO = [
  ...ORDEN_SUBSERVICIOS,
  ...INDICE_BLOG_ORDEN,
  {
    ruta: '/gallery',
    antes: ['All', 'New Pool and Spa Construction', 'Pool Remodeling and Renovation',
      'Aluminum and Wood Pergolas', 'Louvered Roof Systems', 'Pool Screen Enclosures',
      'Patio Screen Rooms', 'Pole Barn and Steel Buildings', 'Landscaping', 'Automated Irrigation',
      'Custom Decks', 'Outdoor Furniture', 'Outdoor Kitchens', 'Retractable Screens',
      'Smart Soffit LED Lighting'],
    despues: ['All', 'New Pool and Spa Construction', 'Pool Remodeling and Renovation',
      'Outdoor Kitchens', 'Aluminum and Wood Pergolas', 'Retractable Screens',
      'Smart Soffit LED Lighting', 'Louvered Roof Systems', 'Pool Screen Enclosures',
      'Patio Screen Rooms', 'Pole Barn and Steel Buildings', 'Landscaping', 'Automated Irrigation',
      'Custom Decks', 'Outdoor Furniture'],
    motivo: 'el filtro de la galeria sigue el orden comercial de la rejilla (piscinas primero). '
      + 'Mismas 15 opciones: solo cambia el orden',
  },

  /**
   * R17-CORE — LOS SUBSERVICIOS DE LA LANDING DE PAGO. Seis de los ocho hablaban de
   * remodelacion en la ficha de obra NUEVA. Se reordenan: construccion delante, remodelacion
   * detras. No se borra ninguno (Principio 1) y el texto de los tres que se movieron no cambia,
   * asi que esto es EXACTAMENTE un reorden — si no lo fuera, la guarda de arriba reventaria al
   * arrancar. Los tres textos que SI cambian van declarados en TRADUCIDAS, y por eso aqui
   * aparecen ya con su forma nueva: `reordena()` corre DESPUES de `traduce()`.
   */
  {
    ruta: '/services/pool-builders',
    antes: [
      'Custom Pool Design & Engineering',
      'Custom pool design engineered for Florida homes and code compliance.',
      'Inground Pool Remodeling',
      'Complete inground pool renovations focused on performance and aesthetics.',
      'Integrated Spa Remodeling',
      'Spa remodeling seamlessly integrated into existing pools for comfort and style.',
      'Pool Plumbing & Circulation Systems Installation',
      'Plumbing and circulation built for proper water flow and filtration.',
      'Pool Equipment Installation & Automation',
      'Modern pumps, filters, heaters, and automation systems for efficient pool use.',
      'Pool Finishes & Interior Surface Installation',
      'Interior pool finishes including plaster, quartz, and pebble for lasting beauty.',
      'Pool Tile & Coping Installation',
      'Tile and coping that improve pool safety, durability, and modern design.',
      'Pool Deck & Hardscape Remodeling',
      'Pool deck remodeling using pavers or concrete for safety and durability.',
    ],
    despues: [
      'Custom Pool Design & Engineering',
      'Custom pool design engineered for Florida homes and code compliance.',
      'Pool Plumbing & Circulation Systems Installation',
      'Plumbing and circulation built for proper water flow and filtration.',
      'Pool Equipment Installation & Automation',
      'Modern pumps, filters, heaters, and automation systems for efficient pool use.',
      'Pool Finishes & Interior Surface Installation',
      'Interior pool finishes including plaster, quartz, and pebble for lasting beauty.',
      'Pool Tile & Coping Installation',
      'Tile and coping that improve pool safety, durability, and modern design.',
      'Inground Pool Remodeling',
      'Complete inground pool renovations focused on performance and aesthetics.',
      'Integrated Spa Remodeling',
      'Spa remodeling seamlessly integrated into existing pools for comfort and style.',
      'Pool Deck & Hardscape Remodeling',
      'Pool deck remodeling using pavers or concrete for safety and durability.',
    ],
    motivo: 'obra nueva delante, remodelacion detras, en la Final URL del ad group «Pool '
      + 'Builders Core». Mismos 8 subservicios: solo cambia el orden',
  },

  /**
   * R17-CORE — `location`. La seccion ponia South Florida DELANTE en la landing cuyo anuncio
   * promete North Florida y cuyo `<title>` dice «Custom Pool Builders in North Florida».
   * Medido sobre el cuerpo antes de tocar nada: la primera «South Florida» estaba en el
   * caracter 97 y la primera «North Florida» suelta en el 6053.
   */
  {
    ruta: '/services/pool-builders',
    antes: [
      'South Florida',
      'Licensed luxury pool builders in South Florida specializing in custom inground pools and outdoor living design-build projects, engineered, permitted, and built for high-end residential properties.',
      'View South Florida Service Areas',
      'North Florida',
      'Licensed luxury pool builders in North Florida specializing in custom inground pools and outdoor living design-build projects, engineered for structural integrity and long-term durability.',
      'View North Florida Service Areas',
    ],
    despues: [
      'North Florida',
      'Licensed luxury pool builders in North Florida specializing in custom inground pools and outdoor living design-build projects, engineered for structural integrity and long-term durability.',
      'View North Florida Service Areas',
      'South Florida',
      'Licensed luxury pool builders in South Florida specializing in custom inground pools and outdoor living design-build projects, engineered, permitted, and built for high-end residential properties.',
      'View South Florida Service Areas',
    ],
    motivo: 'North Florida delante en la landing de pago. Mismas 6 lineas: solo cambia el orden',
  },
];
for (const d of REORDENADAS_A_PROPOSITO) {
  if (!d.ruta && !d.rutas?.length) {
    throw new Error('REORDENADAS_A_PROPOSITO: una declaracion sin `ruta` ni `rutas`');
  }
  if ([...d.antes].sort().join('\n') !== [...d.despues].sort().join('\n')) {
    throw new Error(`REORDENADAS_A_PROPOSITO ${d.ruta ?? d.rutas.join(' ')}: `
      + 'antes y despues no son las mismas lineas');
  }
}

/**
 * Aplica el reorden declarado de UNA ruta sobre sus líneas del baseline.
 *
 * R19: una declaracion puede traer `ruta` (una) o `rutas` (varias). Las catorce fichas de
 * `/services/` comparten LITERALMENTE las seis lineas del bloque `location` -es el mismo copy
 * pegado en las catorce-, y el generador las reordena igual en todas. Con una sola entrada por
 * ruta habria que repetir catorce veces el mismo bloque de seis lineas, y una lista repetida
 * es una lista que se desincroniza.
 */
const reordena = (ruta, lineas) => {
  const casa = (x) => x.ruta === ruta || x.rutas?.includes(ruta);
  for (const d of REORDENADAS_A_PROPOSITO.filter(casa)) {
    const i = lineas.findIndex((_, k) => d.antes.every((l, j) => lineas[k + j] === l));
    if (i >= 0) lineas.splice(i, d.antes.length, ...d.despues);
  }
  return bajaBandaCiudad(ruta, ordenaZonas(ruta, subeResenasCiudad(ruta, bajaResenas(ruta, subeGaleria(ruta, lineas)))));
};

/**
 * SEO-REMEDIACION (Sebastian, 4-oct-2026) — LA BANDA «Project Gallery» BAJA EN LAS 53 CIUDADES.
 * `[slug].astro` la pinta detras de la FAQ en vez de delante de los testimonios. En el texto
 * esperado (el baseline, sin las lineas de la capa de captacion) eso es: el bloque de la banda
 * —las lineas de `lineasBanda()`, la funcion que escribe el marcado— sale de donde estaba y entra
 * justo detras de «See All Projects», el cierre del carrusel de obra. Es una permutacion: mismas
 * lineas. Si el bloque no esta entero o el ancla no esta, no se toca nada y la ruta sale roja.
 */
function bajaBandaCiudad(ruta, lineas) {
  if (!esCiudad(ruta)) return lineas;
  const banda = lineasBanda();
  const i = lineas.findIndex((_, k) => banda.every((l, j) => lineas[k + j] === l));
  if (i < 0) return lineas;
  const sin = [...lineas.slice(0, i), ...lineas.slice(i + banda.length)];
  const ancla = sin.indexOf('See All Projects');
  if (ancla < 0) return lineas;
  return [...sin.slice(0, ancla + 1), ...banda, ...sin.slice(ancla + 1)];
}

/** Las 14 fichas de `/services/`. Explicito, y NO `CAPTACION_JSON[ruta]`: ese mapa trae TAMBIEN
 *  las 53 ciudades, asi que como guarda de «solo las fichas» siempre fue PRESTADA — funcionaba
 *  porque las anclas no existen en las ciudades, no porque la guarda lo dijera. */
const ES_FICHA = esFicha;   // un solo tramo: /services/pool-builders/ocala-fl NO es una ficha

/**
 * LA GALERIA SUBE DELANTE DE LA REJILLA DE SUBSERVICIOS — derivado (Sebastian, 21-sep-2026).
 *
 * Hasta hoy `captacion()` la bajaba detras de `section.faq-section` y esto se llamaba
 * `bajaGaleria`. El canje 1:1 con las reseñas la manda al hueco que ocupaban ellas: entre el
 * formulario y la rejilla de subservicios (`build-paginas.mjs`, bloque 8b).
 *
 * 🚨 LO QUE **NO** CAMBIA ES COMO SE ENCUENTRA LA GALERIA, y no es un descuido. En el BASELINE
 * —que no se re-baseliniza nunca— la galeria SIGUE siendo las DOS lineas pegadas encima del
 * titulo de la FAQ. La pareja `/Gallery$/` + `/FAQs$/` en `k+2` describe el ORIGEN de Webflow,
 * no el orden que construimos, asi que mover la seccion en el generador no la invalida.
 * «Actualizarla para que case con el orden nuevo» es el error que hay que NO cometer.
 *
 * Y ES LA PAREJA LO QUE IDENTIFICA, no el sufijo: `/Gallery$/` casa TAMBIEN «Project Gallery»
 * del MENU en las catorce. Sin el `/FAQs$/` de `k+2` hay DOS candidatas y esto se queda quieto
 * — o, peor, mueve la del menu.
 *
 * Barandilla: UN solo candidato, el ancla de la rejilla DELANTE —pasada por `traduce()`, porque
 * `reordena()` corre DESPUES— y el resultado tiene que ser una PERMUTACION de la entrada. Si
 * algo falla no se toca nada y la puerta se pone roja sola.
 */
const subeGaleria = (ruta, lineas) => {
  if (!ES_FICHA(ruta)) return lineas;
  const candidatas = lineas.flatMap((l, k) =>
    (/Gallery$/.test(l) && /FAQs$/.test(lineas[k + 2] ?? '') ? [k] : []));
  if (candidatas.length !== 1) return lineas;
  const g = candidatas[0];
  const destino = lineas.indexOf(traduce(ruta, 'What Do We Do!'));
  if (destino < 0 || g <= destino) return lineas;
  /* `g > destino`, asi que quitar la galeria NO desplaza `destino`. */
  const resto = [...lineas.slice(0, g), ...lineas.slice(g + 2)];
  const salida = [...resto.slice(0, destino), lineas[g], lineas[g + 1], ...resto.slice(destino)];
  if ([...salida].sort().join('\n') !== [...lineas].sort().join('\n')) return lineas;
  return salida;
};

/**
 * NORTH FLORIDA DELANTE DE SOUTH — derivado.
 *
 * `captacion()` reordena los dos `item-country` de `section.location` (bloque 7). Las catorce
 * fichas traen LITERALMENTE las mismas seis lineas -es copy de piscina pegado en todas-, asi
 * que declararlas por ruta seria repetir catorce veces el mismo bloque.
 *
 * Barandilla: los dos bloques tienen que existir, ser de tres lineas, estar pegados y en el
 * orden South->North. Si no, no se toca nada y la puerta se pone roja por su cuenta.
 */
const ordenaZonas = (ruta, lineas) => {
  if (!CAPTACION_JSON[ruta]) return lineas;
  const s = lineas.indexOf('South Florida');
  if (s < 0 || lineas[s + 2] !== 'View South Florida Service Areas') return lineas;
  const nrt = s + 3;
  if (lineas[nrt] !== 'North Florida' || lineas[nrt + 2] !== 'View North Florida Service Areas') return lineas;
  return [...lineas.slice(0, s), ...lineas.slice(nrt, nrt + 3), ...lineas.slice(s, s + 3),
    ...lineas.slice(nrt + 3)];
};

/**
 * EL ANTES/DESPUES SE VA ENTERO — derivado, y se quita del BASELINE CRUDO.
 *
 * `captacion()` elimina `section.before-after-section` en todas las rutas de captacion: el
 * «Before» es una foto de un listado del MLS de Miami -marca de agua visible- y el «After» es
 * otro patio. Vuelve cuando exista el par honesto (`R17-CORE.md` §10).
 *
 * 🚨 POR QUE NO VALE `QUITADAS_A_PROPOSITO` PARA LA ULTIMA LINEA. El bloque acaba en «View All
 * Projects» y «Get A Free Estimate», y esa segunda cadena SALE CUATRO VECES en la pagina (nav,
 * heroe, antes/despues y el formulario nuevo). `QUITADAS_A_PROPOSITO` filtra por Set, o sea que
 * declararla borraria LAS CUATRO, incluida la del heroe. Se quita el BLOQUE CONTIGUO, que es lo
 * unico que distingue una ocurrencia de otra. La puerta lo cazo: «faltan 0, sobran 0» con
 * «orden cambiado», porque el conteo por conjunto no ve que sobre una ocurrencia de cuatro.
 *
 * Barandilla: «Before» tiene que ir seguido de «After», el bloque tiene que cerrar en «View All
 * Projects» dentro de una ventana corta, y solo se quita en rutas de captacion.
 *
 * Donde la entrada declara `antesDespues` (R24-FOTO-PISCINAS: la de remodelacion, con el par real
 * del banco) el generador NO lo quita: solo canjea las dos fotos. El texto es el del origen y el
 * baseline ya lo trae en su sitio, asi que aqui no se descuenta nada.
 */
const quitaAntesDespues = (ruta, lineas) => {
  if (!CAPTACION_JSON[ruta] || CAPTACION_JSON[ruta].antesDespues) return lineas;
  const i = lineas.indexOf('Before');
  if (i < 0 || lineas[i + 1] !== 'After') return lineas;
  let j = -1;
  for (let k = i + 2; k < Math.min(lineas.length, i + 16); k++) {
    if (lineas[k] === 'View All Projects') { j = k; break; }
  }
  if (j < 0) return lineas;
  if (lineas[j + 1] === 'Get A Free Estimate') j++;
  return [...lineas.slice(0, i), ...lineas.slice(j + 1)];
};

/**
 * LAS TARJETAS QUE SEBASTIAN QUITO DE `/projects` (PROMPT-PROYECTOS-BANCO §2, 2-oct-2026).
 *
 * Se quitan del BASELINE, como el antes/despues de arriba, y por el mismo motivo no valen
 * `QUITADAS_A_PROPOSITO`: «View Full Project» sale una vez por tarjeta y dos tarjetas comparten
 * titulo. Se quita el GRUPO CONTIGUO titulo · resumen · «View Full Project» de cada oculta, y el
 * titulo se deriva de `obras-migradas.json` por slug (las ocultas son migradas: las propias se
 * descuentan en `lineasObras`). Si una oculta no casa, ROJO: una declaracion que ya no quita
 * nada es una puerta que dejo de medir sin decirlo.
 */
let ocultasFallo = null;
const quitaOcultasDelIndice = (ruta, lineas) => {
  if (ruta !== '/projects') return lineas;
  const migradas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/obras-migradas.json'), 'utf8')).obras;
  let out = lineas;
  for (const slug of OCULTAS) {
    const o = migradas.find((m) => m.slug === slug);
    if (!o) continue;                       // oculta propia: la descuenta `lineasObras`
    const titulo = capitaliza(o.tituloHtml.replace(/&amp;/g, '&'));
    const i = out.findIndex((l, k) => l === titulo && out[k + 2] === 'View Full Project');
    if (i < 0) { ocultasFallo = `la tarjeta oculta «${titulo}» no esta en el baseline de /projects`; return null; }
    out = [...out.slice(0, i), ...out.slice(i + 3)];
  }
  return out;
};

/**
 * LAS RESEÑAS BAJAN AL CIERRE DEL BLOQUE CENTRAL — derivado, no copiado a mano.
 *
 * Hasta el 21-sep-2026 `captacion()` solo las subia detras de `logos-section` y esto se llamaba
 * `subeResenas`. El bloque 3 SIGUE subiendolas ahi —hace falta para que el hueco a nivel de
 * `<body>` exista donde toca—, pero el bloque 8b las baja despues al hueco que dejo la galeria:
 * ultima hija del `<div>`, entre la FAQ y «Where We Serve». Contra el BASELINE, que es lo unico
 * que mide esta funcion, el neto es un descenso corto: de DETRAS de `location` a DELANTE.
 *
 * El CONTENIDO de las reseñas ya se descuenta aparte (`lineasResenas`, que las busca esten
 * donde esten), asi que lo unico que queda desordenado son las TRES lineas de cabecera de la
 * seccion, que salen del baseline. Expresarlo con `REORDENADAS_A_PROPOSITO` obligaria a
 * declarar el bloque contiguo que va desde el destino hasta el origen: 57 lineas por ficha,
 * ~740 en las trece, y una lista copiada a mano es una lista que se desincroniza. Se deriva,
 * que es lo que esta misma hoja ya hace con las reseñas, el blog, el feed y la capa de
 * captacion, y por la misma razon.
 *
 * 🚨 LA ASERCION DE `cabecera[1]` ES NUEVA Y NO ES ADORNO. La version vieja solo comprobaba
 * `cabecera.length !== 3`, y ese `if` NO SALTA NUNCA: `slice` devuelve menos de 3 solo si
 * «TESTIMONIALS» cae a dos lineas del final, y cae a ~15. O sea que arrastraba `i+1` e `i+2`
 * fueran lo que fueran. El dia que dejaran de ser el h2 y la entradilla se llevaria la primera
 * linea del `cta-footer` SIN DECIR NADA: conjunto intacto, «faltan 0, sobran 0» y un «orden
 * cambiado» apuntando lejos de la causa. Se cierra como ya lo tenia `subeResenasCiudad`.
 *
 * LA BARANDILLA, ENTERA: las dos anclas existen —pasadas por `traduce()`, porque `reordena`
 * corre DESPUES—, la cabecera trae sus 3 lineas con su h2 en medio, las reseñas van HOY detras
 * de «Where We Serve» (si ya estuvieran delante no habria nada que mover) y la salida es una
 * PERMUTACION de la entrada. Si algo de eso falla no se toca nada, y la puerta se pone roja por
 * su cuenta — que es lo correcto: un reorden que no se puede demostrar no se perdona.
 */
const H2_RESENAS_FICHA = 'What Our Clients Say About Mr & Mrs Outdoor Living';

const bajaResenas = (ruta, lineas) => {
  if (!ES_FICHA(ruta)) return lineas;
  const i = lineas.indexOf(traduce(ruta, 'TESTIMONIALS'));
  /**
   * EL ANCLA SE PASA POR `traduce()`, y no es cosmetico — arreglado el 13-sep-2026.
   *
   * `reordena()` corre DESPUES de `traduce()`, y en la landing de pago —y SOLO en ella— el
   * rotulo ya viene sustituido: «What Do We Do!» -> «What We Do» (TRADUCIDAS, R17-CORE). Con el
   * literal a pelo, `indexOf` devolvia -1, la barandilla hacia lo que debe —no tocar nada— y la
   * ficha salia «faltan 0 lineas, sobran 0» + «linea 17: orden cambiado», que es exactamente el
   * sintoma de un reorden declarado que no se aplico.
   *
   * No se habia visto nunca porque esa ficha ya estaba roja por otra cosa: el carrusel del
   * proceso (`lib/captura.mjs` §5a) le cambiaba dos lineas, y `diferencias()` solo mira el orden
   * cuando no falta ni sobra ninguna. Al arreglar el carrusel salio esto debajo.
   *
   * Se DERIVA de la tabla de traducciones en vez de escribir las dos formas: asi la siguiente
   * correccion de copy no puede volver a dejar el ancla vieja.
   */
  /* `indexOf` SIN offset de arranque, y esto muerde al copiar de la version vieja: alli el
   * destino iba DEBAJO del origen y se buscaba desde `g + 2`. Ahora el destino va ENCIMA; con
   * offset saldria -1, el helper no tocaria nada y habria que depurar un rojo por la razon
   * equivocada. «Where We Serve» es unico en los 14 baselines (comprobado). */
  const destino = lineas.indexOf(traduce(ruta, 'Where We Serve'));
  if (i < 0 || destino < 0 || i <= destino) return lineas;
  const cabecera = lineas.slice(i, i + 3);
  if (cabecera.length !== 3 || cabecera[1] !== traduce(ruta, H2_RESENAS_FICHA)) return lineas;
  /* `i > destino`, asi que quitar la cabecera NO desplaza `destino`. */
  const resto = [...lineas.slice(0, i), ...lineas.slice(i + 3)];
  const salida = [...resto.slice(0, destino), ...cabecera, ...resto.slice(destino)];
  if ([...salida].sort().join('\n') !== [...lineas].sort().join('\n')) return lineas;
  return salida;
};

/**
 * LAS RESEÑAS SUBEN DELANTE DE «PROJECT SHOWCASE» EN LAS 53 CIUDADES — derivado
 * (R20-CIUDADES F2, Sebastian 14-sep-2026).
 *
 * POR QUE DERIVADO Y NO 53 ENTRADAS EN `REORDENADAS_A_PROPOSITO`. La tercera linea de la
 * cabecera lleva la ciudad dentro («…in Ocala. Read our reviews.»), asi que una declaracion
 * literal serian 53 entradas con su propio array de lineas — y 53 listas escritas a mano es
 * una lista que se desincroniza, el mismo motivo por el que `subeGaleria` es derivado para las
 * catorce fichas. Aqui se ancla por las DOS lineas que NO cambian de ciudad a ciudad y la
 * tercera se arrastra con `slice`, sin nombrarla.
 *
 * POR QUE NO VALE `bajaResenas`, que hace justo esto. Aquel esta acotado a `/services/` y aqui
 * hacen falta las 53, incluidas las 51 que NO llevan capa de captacion: el reorden lo pidio
 * Sebastian para todas («las 53 deben tener la misma estructura»). Y desde el canje del
 * 21-sep-2026 su ancla de destino es «Where We Serve», que estas 53 tampoco tienen —comprobado
 * sobre `baseline/text/pool-builders_*.txt`— asi que alli saldria por `destino < 0` aunque la
 * guarda de ruta no estuviera. Los dos movimientos no se pisan.
 *
 * LA BARANDILLA ES LA MISMA QUE LA DE `bajaResenas`, ENTERA: las dos anclas tienen que existir —pasadas por
 * `traduce()`, porque `reordena` corre DESPUES—, la cabecera tiene que traer sus 3 lineas con
 * «What Our Clients Say» en medio, las reseñas tienen que ir HOY detras (si ya estuvieran
 * delante no habria nada que mover) y la salida tiene que ser una PERMUTACION de la entrada.
 * Si algo de eso falla no se toca nada y la puerta se pone roja por su cuenta, que es lo
 * correcto: un reorden que no se puede demostrar no se perdona.
 */
const ES_CIUDAD = esCiudad;   // /services/pool-builders/<x>-fl que no es condado

const subeResenasCiudad = (ruta, lineas) => {
  if (!ES_CIUDAD(ruta)) return lineas;
  const i = lineas.indexOf(traduce(ruta, 'TESTIMONIALS'));
  const destino = lineas.indexOf(traduce(ruta, 'Project Showcase'));
  if (i < 0 || destino < 0 || i <= destino) return lineas;
  const cabecera = lineas.slice(i, i + 3);
  if (cabecera.length !== 3 || cabecera[1] !== traduce(ruta, 'What Our Clients Say')) return lineas;
  /* `i > destino`, asi que quitar la cabecera NO desplaza `destino`. */
  const resto = [...lineas.slice(0, i), ...lineas.slice(i + 3)];
  const salida = [...resto.slice(0, destino), ...cabecera, ...resto.slice(destino)];
  if ([...salida].sort().join('\n') !== [...lineas].sort().join('\n')) return lineas;
  return salida;
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
/**
 * ── BLOG-SANITY · LO QUE AÑADE EL INDICE EDITORIAL ──────────────────────────────────────────
 *
 * `/blogs-tips` pasa de ser una rejilla de 10 tarjetas horneadas en el HTML de Webflow a una
 * biblioteca servida desde Sanity, con buscador, chips de categoria y «Load more». Eso añade
 * texto que NO existe en `baseline/text/blogs-tips.txt`:
 *
 *     el recuento («10 articles»), el chip «All», un chip por categoria CON ARTICULOS,
 *     y la categoria de cada tarjeta.
 *
 * SE DERIVA, NO SE ENUMERA. Es la misma decision que `APOYOS_CIUDAD` y que `BLOQUES_PROPIOS`
 * de `check-seo.mjs`: una lista escrita a mano se desincroniza con el dato. Aqui ademas es
 * obligatorio — con ~100 articulos serian ~100 entradas que habria que editar cada vez que se
 * publica uno, y la primera que alguien olvidara dejaria la puerta roja sin motivo real.
 *
 * LA FUENTE ES `src/data/blogs-sanity.json`, que es la cache versionada del dataset. Si alguien
 * publica en Sanity y no la regenera (`node scripts/cache-blog-sanity.mjs`), esta declaracion
 * deja de casar y la puerta sale ROJA. Es lo correcto: falla CERRADO.
 *
 * ANCLAJE. La categoria de la tarjeta `i` se ancla al RESUMEN de la tarjeta `i-1` mas su «Read
 * More», que es un par unico. No vale anclar solo en «Read More» (sale 10 veces) ni quitar por
 * primera aparicion: «Pool Remodeling» YA EXISTE en el baseline —una vez, en el menu— y una
 * eliminacion sin ancla se llevaria ESA y descuadraria el resto. Medido.
 */
const INDICE_BLOG = (() => {
  const f = path.join(RAIZ, 'src/data/blogs-sanity.json');
  if (!fs.existsSync(f)) return [];
  const posts = JSON.parse(fs.readFileSync(f, 'utf8'));
  /* El MISMO orden que `ordenaIndice()` en `src/lib/blog-datos.mjs`: destacado primero, luego
   * `ordenIndice` y, a igualdad, slug. Si divergiera, las anclas caerian en otra tarjeta. */
  const orden = [...posts].sort((a, b) => {
    if (Boolean(a.destacadoIndice) !== Boolean(b.destacadoIndice)) return a.destacadoIndice ? -1 : 1;
    const oa = a.ordenIndice ?? 9999; const ob = b.ordenIndice ?? 9999;
    return oa !== ob ? oa - ob : a.slug.localeCompare(b.slug);
  });
  const cats = [...new Map(orden.filter((x) => x.categoria?.slug)
    .map((x) => [x.categoria.slug, x.categoria])).values()]
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

  const INTRO = 'Explore expert insights, project tips, and industry updates on pool construction'
    + ' and outdoor living across Florida, written to help property owners and professionals make'
    + ' informed decisions.';
  const MOTIVO = 'BLOG-SANITY: el indice pasa a biblioteca servida desde Sanity. Derivado de '
    + 'src/data/blogs-sanity.json, no escrito a mano.';

  const entradas = [{
    rutas: ['/blogs-tips'],
    tras: [INTRO],
    lineas: [`${orden.length} article${orden.length === 1 ? '' : 's'}`, 'All', ...cats.map((c) => c.name)],
    motivo: `${MOTIVO} Recuento + chip «All» + ${cats.length} categorias con articulos.`,
  }];

  orden.forEach((p, i) => {
    if (!p.categoria?.name) return;
    const prev = orden[i - 1];
    entradas.push({
      rutas: ['/blogs-tips'],
      tras: i === 0 ? [INTRO] : [prev.summary, 'Read More'],
      lineas: [p.categoria.name],
      motivo: `${MOTIVO} La categoria de la tarjeta de «${p.slug}».`,
    });
  });
  return entradas;
})();

/* LOOP-CIUDADES (5-oct-2026): la linea «<Servicio> by city: …» que `CiudadesServicio.astro` pinta en
 * la ficha detras de «Where We Serve». Derivada de la MISMA funcion que la pinta (`ciudadesDeFicha`)
 * y del mismo JSON, asi que cada ciudad nueva la mueve sola y una errata la pone roja. */
const PAGINAS_CIUDAD_SERVICIO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/ciudades-servicios.json'), 'utf8')).paginas;
const LINEAS_CIUDADES_FICHA = [...new Set(Object.keys(PAGINAS_CIUDAD_SERVICIO).map((r) => r.split('/').slice(0, 3).join('/')))]
  .map((ficha) => ({ ficha, l: ciudadesDeFicha(ficha, PAGINAS_CIUDAD_SERVICIO) }))
  .filter(({ l }) => l)
  .map(({ ficha, l }) => ({ rutas: [ficha], tras: ['View South Florida Service Areas'], lineas: [l.linea],
    motivo: 'LOOP-CIUDADES: la ficha enlaza a sus landings de ciudad, detras de «Where We Serve»' }));

const LINEAS_ANADIDAS = [
  ...LINEAS_CIUDADES_FICHA,
  /* ASTRO-2 · T-29: junto al FAQ de las 14 fichas, la tarjeta de accion: el boton de la pagina (oro,
   * D-76) y los dos telefonos. Cinco lineas seguidas, detras de las preguntas. Va DELANTE de la
   * declaracion de «What we do» porque esta lleva la accion pegada a los telefonos y aquella no. */
  ...Object.keys(CAPTACION_JSON).filter(esFicha).map((r) => ({
    rutas: [r], tras: [],
    lineas: [capitalizaH2(CAPTACION_JSON[r].heroe.cta ?? 'Get a Free Estimate'), ...TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible])],
    motivo: 'ASTRO-2 (T-29): tarjeta de accion del FAQ.',
  })),
  /* ASTRO-2 · T-47: en las resenas de las 14 fichas, la accion de la pagina en la cabecera (delante
   * de «See all reviews») y los dos telefonos detras de la lista. Cuando esto corre el bloque de
   * resenas ya se ha descontado (§ sinElBloque, paso 2), asi que las cinco lineas quedan seguidas:
   * las mismas cinco que la tarjeta del FAQ, y por eso es una segunda declaracion identica. */
  ...Object.keys(CAPTACION_JSON).filter(esFicha).map((r) => ({
    rutas: [r], tras: [],
    lineas: [capitalizaH2(CAPTACION_JSON[r].heroe.cta ?? 'Get a Free Estimate'), ...TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible])],
    motivo: 'ASTRO-2 (T-47): accion en la cabecera de las resenas y telefonos al pie.',
  })),
  /* ASTRO-2 · T-47: los dos telefonos al pie de «What we do», en banda de datos (rotulo de zona en
   * mayusculas por CSS). El hero lleva las mismas cuatro lineas, pero su bloque ya se ha descontado
   * (§ bloquesCaptacion) cuando esto corre, asi que la primera aparicion es esta. */
  {
    rutas: Object.keys(CAPTACION_JSON).filter(esFicha), tras: [],
    lineas: TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]),
    motivo: 'ASTRO-2 (T-47): telefonos al pie de «What we do».',
  },
  /* ASTRO-2 · T-28 y T-47: la cabecera de la galeria de obra de las 14 fichas lleva la accion de
   * la pagina en boton de linea (D-76; el mismo texto que el boton del hero) y el enlace
   * «Project Gallery». Van seguidas y solo ahi, asi que el par se quita sin ancla. */
  ...Object.keys(CAPTACION_JSON).filter(esFicha).map((r) => ({
    rutas: [r], tras: [],
    // D-119: `/services/pool-builders` recupera ahi su enlace a `/projects` («View All Projects»), que
    // iba en el antes/despues que la ficha pierde.
    lineas: [capitalizaH2(CAPTACION_JSON[r].heroe.cta ?? 'Get a Free Estimate'), 'Project Gallery',
      ...(r === '/services/pool-builders' ? ['View All Projects'] : [])],
    motivo: 'ASTRO-2 (T-28, T-47, D-119): accion y enlaces en la cabecera de la galeria de obra.',
  })),
  /* SEO-REMEDIACION (4-oct-2026): los cualificadores opcionales de `/request-estimated`, leidos
   * del mismo JSON que los inserta (`src/data/textos-propios.json`). */
  ...Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/textos-propios.json'), 'utf8')))
    .filter(([r, t]) => !r.startsWith('_') && t.lineasAnadidas)
    .map(([r, t]) => ({ rutas: [r], tras: [t.lineasAnadidas.tras], lineas: t.lineasAnadidas.lineas,
      motivo: `SEO-REMEDIACION: ${t._motivo.slice(0, 120)}…` })),
  ...INDICE_BLOG,
  /* GALERIA-HUB · ajustes 2 (4-oct-2026): el boton de cada panel dice «See photos» y lleva el resto
   * en un `.mm-sr`, que `innerText` saca como linea propia («of pool remodeling») detras de la del
   * parrafo. Una por panel, derivadas de `lineasSrBanda()`: la misma funcion que escribe el marcado. */
  ...lineasSrBanda().map(({ tras, linea }) => ({
    rutas: RUTAS_BANDA,
    tras: [tras],
    lineas: [linea],
    motivo: 'GALERIA-HUB: sufijo .mm-sr del boton del panel (texto visible «See photos»).',
  })),
  {
    /**
     * GALERIA-CATEGORIAS (2-oct-2026, encargo de Sebastian) — las tarjetas de categoria de
     * `/gallery`, delante del filtro. Una por pagina `/gallery/<slug>`: titular, nombre, una
     * linea y el enlace. DERIVADO de `src/data/galeria-categorias.json` por la misma funcion
     * que escribe el marcado, asi que anadir una categoria no exige tocar esta puerta.
     * Ancla: el CTA del nav, que es la ultima linea antes de `.gallery-page` (la 10 del
     * baseline; la 11 es «All», la primera opcion del filtro).
     */
    rutas: ['/gallery'],
    tras: ['Get A Free Estimate'],
    lineas: lineasTarjetas(),
    motivo: 'GALERIA-CATEGORIAS: tarjetas de categoria delante del filtro, derivadas de galeria-categorias.json.',
  },
  {
    /**
     * AUDITORIA 5-sep-2026 — EL SEGUNDO CTA DEL HEROE, QUE NADIE HABIA DECLARADO.
     *
     * Esta puerta NO se habia corrido entera nunca: el ultimo cierre solo midio una muestra de
     * 4 rutas y dejo el resto «sin medir». Al correrla completa salen **56 paginas rojas**, las
     * 53 de /services/pool-builders/, las 2 de /where-we-serve/ y la home, todas con el mismo sintoma:
     * «faltan 0 lineas, sobran 0» + «linea 13 (o 16): orden cambiado».
     *
     * Diagnosticado comparando linea a linea contra `baseline/text/`: el heroe del rediseño
     * lleva DOS botones —«Get A Free Estimate» y «Project Gallery»— y el origen solo llevaba el
     * primero. «Project Gallery» ya existia en el baseline, pero en el MENU (linea 4), asi que
     * el conjunto de lineas no cambia y por eso ni faltan ni sobran: lo que cambia es el orden,
     * porque hay una linea nueva insertada en medio y todo lo de debajo baja un puesto.
     *
     * MEDIDO QUE ES ANTERIOR A ESTA AUDITORIA: se construyo el estado previo (33baf7e) en un
     * worktree aparte y /services/pool-builders/ocala-fl, /where-we-serve/north-florida y / salen
     * rojas exactamente igual. No lo introduce ningun cambio de esta sesion.
     *
     * Se declara, no se perdona: se quita EXACTAMENTE esa linea y solo cuando va detras de
     * «Get A Free Estimate». Todo lo demas de las 56 paginas se sigue comparando al 100 %.
     */
    /**
     * LA LISTA VA CERRADA, NO `null`. Con `null` la declaracion se aplica a las 122 y pone
     * ROJAS las 26 que tienen «Get A Free Estimate» seguido de otra cosa: la puerta exige que
     * la secuencia declarada case EXACTA, y hace bien. Son las 56 medidas, ni una mas.
     */
    rutas: [
      '/',
      '/services/pool-builders/alachua-fl',
      '/services/pool-builders/archer-fl',
      '/services/pool-builders/atlantis-fl',
      '/services/pool-builders/hillsboro-beach-fl',
      '/services/pool-builders/boca-raton-fl',
      '/services/pool-builders/boynton-beach-fl',
      '/services/pool-builders/cedar-key-fl',
      '/services/pool-builders/chiefland-fl',
      '/services/pool-builders/cross-city-fl',
      '/services/pool-builders/dania-beach-fl',
      '/services/pool-builders/davie-fl',
      '/services/pool-builders/deerfield-beach-fl',
      '/services/pool-builders/delray-beach-fl',
      '/services/pool-builders/fanning-springs-fl',
      '/services/pool-builders/fort-lauderdale-fl',
      '/services/pool-builders/gainesville-fl',
      '/services/pool-builders/gulf-stream-fl',
      '/services/pool-builders/hallandale-beach-fl',
      '/services/pool-builders/hawthorne-fl',
      '/services/pool-builders/high-springs-fl',
      '/services/pool-builders/hollywood-fl',
      '/services/pool-builders/hypoluxo-fl',
      '/services/pool-builders/juno-beach-fl',
      '/services/pool-builders/jupiter-fl',
      '/services/pool-builders/lake-city-fl',
      '/services/pool-builders/lighthouse-point-fl',
      '/services/pool-builders/manalapan-fl',
      '/services/pool-builders/mcintosh-fl',
      '/services/pool-builders/micanopy-fl',
      '/services/pool-builders/miramar-fl',
      '/services/pool-builders/newberry-fl',
      '/services/pool-builders/north-palm-beach-fl',
      '/services/pool-builders/ocala-fl',
      '/services/pool-builders/ocean-ridge-fl',
      '/services/pool-builders/old-town-fl',
      '/services/pool-builders/palatka-fl',
      '/services/pool-builders/palm-beach-gardens-fl',
      '/services/pool-builders/parkland-fl',
      '/services/pool-builders/pembroke-pines-fl',
      '/services/pool-builders/plantation-fl',
      '/services/pool-builders/pompano-beach-fl',
      '/services/pool-builders/reddick-fl',
      '/services/pool-builders/royal-palm-beach-fl',
      '/services/pool-builders/south-palm-beach-fl',
      '/services/pool-builders/southwest-ranches-fl',
      '/services/pool-builders/tequesta-fl',
      '/services/pool-builders/trenton-fl',
      '/services/pool-builders/waldo-fl',
      '/services/pool-builders/wellington-fl',
      '/services/pool-builders/west-palm-beach-fl',
      '/services/pool-builders/weston-fl',
      '/services/pool-builders/williston-fl',
      '/services/pool-builders/wilton-manors-fl',
      '/where-we-serve/north-florida',
      '/where-we-serve/south-florida',
    ],
    tras: ['Get A Free Estimate'],
    lineas: ['Project Gallery'],
    motivo: 'AUDITORIA: el heroe del rediseño lleva un segundo CTA que el origen no tenia. '
      + '«Project Gallery» ya estaba en el baseline pero en el MENU, asi que el conjunto no '
      + 'cambia y solo se desordena. Verificado que es anterior a la auditoria (33baf7e).',
  },
  {
    rutas: null,                                        // null = todas las que tengan pie
    tras: ['Terms of Service', 'Privacy Policy'],
    lineas: ['Accessibility'],
    motivo: 'D6: el pie enlaza `/articles/accessibility`, que antes no enlazaba nadie. Las otras '
      + 'dos legales solo cambian de href y no cuestan texto; esta es un enlace NUEVO.',
  },
  /* ASTRO-2: aqui iba el CTA de cierre de la rejilla de `/services/pool-builders`. El boton sube a
   * la cabecera de la seccion, como en las otras trece (§ listasStitch). */
  {
    rutas: ['/pool-cost-estimator'],
    tras: [],
    lineas: [
      'Custom Inground Pool Cost Estimator',
      'Answer 7 quick questions to see what your custom pool in Florida could cost.',
    ],
    motivo: 'D8: la pagina salia de Webflow con 0 encabezados. D7 le puso un <h1> oculto; D8 lo '
      + 'pinta, con una linea de intro debajo. Las dos lineas son nuestras y no estan en ningun baseline.',
  },
  {
    rutas: ['/pool-investment-estimator'],
    tras: [],
    lineas: ['Pool Investment Estimator'],
    motivo: 'D7: idem, la pagina desnuda del mismo estimador.',
  },

  /**
   * ── R22-DETALLE · LAS CUATRO FILAS DE LA REJILLA DE SUBSERVICIOS ────────────────────────
   *
   * La rejilla de ocho tarjetas pasa a ser cuatro filas foto/texto (`servicios.detalle` en
   * `captacion-servicios.json`). Los OCHO SUBSERVICIOS NO SE TOCAN: siguen siendo los mismos
   * dieciseis renglones, con el mismo texto y en el mismo orden que ya declara
   * `REORDENADAS_A_PROPOSITO` para esta ruta. Medido linea a linea contra el estado anterior:
   * sobran 8, faltan 0. Lo unico nuevo es el encabezado y la entradilla de cada fila.
   *
   * POR QUE CUATRO ENTRADAS Y NO UNA DE OCHO LINEAS. Las ocho NO van seguidas: cada par abre
   * su fila y detras van los subservicios de esa fila. Una sola entrada de ocho exige el
   * bloque contiguo y no casaria nunca.
   *
   * EL ANCLA DE CADA UNA es el ULTIMO renglon de la fila anterior, o la entradilla de la
   * seccion en la primera. Con ancla y no sin ella porque ninguna de las cuatro cabeceras es
   * unica por accidente: si manana una de estas frases aparece en otro sitio de la ficha, sin
   * `tras` se quitaria la equivocada y el desorden saldria en otra parte.
   *
   * LAS CUATRO CABECERAS VAN EN TITLE CASE PALABRA A PALABRA, y no es estilo: `webflow.css`
   * pone `text-transform: capitalize` en `h1`-`h4` y eso SI altera `innerText`. Estan escritas
   * sin conjunciones ni articulos justamente para que el capitalize sea un no-op. COMPROBADO
   * EN EL NAVEGADOR sobre el HTML construido, no deducido: es la sexta vez que esto muerde.
   */
  {
    rutas: ['/services/pool-builders'],
    tras: ['We design and build custom inground pools, spas, and hardscapes for discerning '
      + 'homeowners across North and South Florida.'],
    lineas: [
      'Designed Around Your Lot',
      'Every pool starts with your lot, not a catalog shape. We survey the site, model the pool '
        + 'in 3D against setbacks, soil conditions and the Florida Building Code, and you '
        + 'approve the rendering before we pull a permit.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de la fila 1 (diseno e ingenieria).',
  },
  {
    rutas: ['/services/pool-builders'],
    tras: ['Custom pool design engineered for Florida homes and code compliance.'],
    lineas: [
      'Plumbing, Equipment, Automation',
      'What keeps the water clear is buried before the plaster goes in. Lines are sized to your '
        + 'pool rather than to habit, and the pumps, filters and heaters come back to one app '
        + 'instead of a wall of valves.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de la fila 2 (hidraulica y automatizacion).',
  },
  {
    rutas: ['/services/pool-builders'],
    tras: ['Modern pumps, filters, heaters, and automation systems for efficient pool use.'],
    lineas: [
      'Finishes, Tile & Coping',
      'The finish is what you touch and what you look at for the next twenty years. We build in '
        + 'plaster, quartz and pebble, and match tile and coping to the deck so the pool reads '
        + 'as part of the house.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de la fila 3 (acabados, gresite y remate).',
  },
  {
    rutas: ['/services/pool-builders'],
    tras: ['Tile and coping that improve pool safety, durability, and modern design.'],
    lineas: [
      'Remodeling & Spa Additions',
      'If the shell is sound, a remodel gets you there faster than a new build. Same licensed '
        + 'crew and the same permits, applied to the pool you already own.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de la fila 4, la que recoge los tres '
      + 'subservicios de remodelacion y los manda a su landing.',
  },


  /* ── R22-DETALLE · LAS OTRAS TRECE FICHAS ───────────────────────────────────────────────
   *
   * Mismo cambio que arriba, extendido: cada ficha estrena 4 encabezados y 4 entradillas, y
   * sus 8 subservicios siguen intactos, con el mismo texto y en el mismo orden que ya tenian.
   * Son 52 pares, uno por fila, y van EN ORDEN de aparicion dentro de cada ficha.
   *
   * LAS ANCLAS NO SE ESCRIBIERON A MANO: se leyeron del `innerText` REAL de la pagina
   * construida, en Chromium, y se comprobo una a una que la linea aparece EXACTAMENTE UNA VEZ
   * en la ruta y que va seguida del encabezado y de la entradilla. 52 de 52 verdes.
   *
   * IGUAL QUE ARRIBA, LOS 52 ENCABEZADOS SE COMPROBARON CONTRA `text-transform: capitalize`
   * en el navegador: ninguno cambia al renderizar. Estan escritos sin conjunciones ni
   * articulos en minuscula precisamente para eso.
   */
  // /services/pool-remodeling
  {
    rutas: ['/services/pool-remodeling'],
    tras: ['We remodel and renovate pools across North & South Florida, upgrading finishes, '
        + 'equipment, and features for safety and efficiency.'],
    lineas: [   // SEO-REMEDIACION (4-oct-2026): reescrita (contexto de remodelacion completa); se lee del JSON
      capitalizaH2(CAPTACION_JSON['/services/pool-remodeling'].servicios.detalle[0].titulo),
      CAPTACION_JSON['/services/pool-remodeling'].servicios.detalle[0].parrafo,
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-remodeling'],
    // SEO-REMEDIACION (4-oct-2026): el ancla es el resumen REESCRITO (§ TRADUCIDAS), leido del JSON.
    tras: [CAPTACION_JSON['/services/pool-remodeling'].servicios.textos['Structural Pool Repairs']],
    lineas: [
      'Resurfacing, Tile & Coping',
      'We strip the old interior down to sound gunite and apply plaster, quartz, or '
        + 'pebble finishes rated for Florida sun and salt systems. We replace waterline tile '
        + 'and coping in the same pass, sealing the bond beam and leaving an edge that stays '
        + 'cool underfoot.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-remodeling'],
    tras: ['Tile and coping upgrades that enhance pool safety, aesthetics, and long-term '
        + 'structural protection.'],
    lineas: [   // SEO-REMEDIACION (4-oct-2026): reescrita (contexto de remodelacion completa); se lee del JSON
      capitalizaH2(CAPTACION_JSON['/services/pool-remodeling'].servicios.detalle[2].titulo),
      CAPTACION_JSON['/services/pool-remodeling'].servicios.detalle[2].parrafo,
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-remodeling'],
    tras: ['Energy-efficient LED pool lighting designed to enhance visibility, ambiance, and '
        + 'nighttime safety.'],
    lineas: [
      'Pool Decks & Spa Integration',
      'A renovated pool beside a cracked, slick deck still looks tired. We resurface '
        + 'decks with textured, UV-stable coatings or pavers that stay walkable in South '
        + 'Florida heat, and we tie a new or remodeled spa into the pool so both share one '
        + 'plumbing and heating system.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/retractable-screens
  {
    rutas: ['/services/retractable-screens'],
    tras: ['We install motorized MaestroShield retractable screens for North and South Florida '
        + 'estates with smart automation and UV-blocking fabrics.'],
    lineas: [
      'Motorized Openings & Automation',
      'We install MaestroShield motorized screens on patios and lanais, with side tracks '
        + 'and housings anchored into the existing structure. Broward openings sit in the '
        + 'High-Velocity Hurricane Zone, so we match tracks, fasteners and motors to the '
        + 'product approval covering that opening. Wall switches, remotes or a smart hub '
        + 'handle daily operation.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/retractable-screens'],
    tras: ['Installers integrate remote controls or smart devices to operate retractable '
        + 'screens seamlessly.'],
    lineas: [
      'Manual Screens, Lanais, Garages',
      'Not every opening needs a motor. We fit hand-operated retractable screens on '
        + 'lanais, porches and entry openings, and we screen garage bays so the space '
        + 'ventilates with the door up. All of them run in the same guided tracks and close '
        + 'on an insect-tight bottom seal.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/retractable-screens'],
    tras: ['Builders install retractable screens for garages to improve airflow and keep '
        + 'insects out.'],
    lineas: [
      'Custom Frames, Mesh Options',
      'We build each screen to the measured opening and powder-coat frames to match the '
        + 'trim already on the house. Mesh is the decision that matters: tight weaves stop '
        + 'no-see-ums, solar fabrics cut UV and afternoon glare on west-facing lanais, and '
        + 'clear vinyl blocks wind-driven rain.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/retractable-screens'],
    tras: ['Renovation experts replace screen mesh with upgraded, durable fabrics for improved '
        + 'visibility and protection.'],
    lineas: [
      'Repairs, Motors & Rescreening',
      'Salt air and UV finish off mesh, motors and hardware long before the tracks give '
        + 'out. We rescreen torn fabric, replace corroded rollers and burned-out motors, and '
        + 'service systems other contractors installed, moving coastal openings onto '
        + 'stainless fasteners that survive the exposure.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/outdoor-furniture
  {
    rutas: ['/services/outdoor-furniture'],
    tras: ['We curate and install premium outdoor furniture in teak, aluminum, and wicker for '
        + 'North and South Florida homes and estates.'],
    lineas: [
      'Custom Layouts, Modular Seating',
      'We size dining sets, sectionals, and chaises to the lanai, pool deck, or terrace '
        + 'they will sit on, so walkways, door swings, and screen enclosure posts stay clear. '
        + 'Modular sections rearrange for a family dinner or a twenty-person party, so one '
        + 'set covers both.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-furniture'],
    tras: ['Installers create modular seating arrangements to maximize patio space and flexibility'],
    lineas: [
      'Teak, Hardwood & Aluminum',
      'Teak and dense tropical hardwoods hold up to Florida humidity and weather down to '
        + 'a gray patina you can leave alone or re-oil. Powder-coated aluminum stays light '
        + 'enough to carry indoors and resists salt-air corrosion. We use stainless hardware '
        + 'on both, since plated fasteners corrode first.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-furniture'],
    tras: ['Contractors install lightweight, rust‑resistant aluminum furniture for '
        + 'long‑lasting outdoor use.'],
    lineas: [
      'Wicker Lounges, Sustainable Sourcing',
      'All-weather resin wicker woven over aluminum frames keeps its color under Florida '
        + 'UV instead of turning brittle like natural rattan. We cover cushions in '
        + 'solution-dyed acrylic that sheds an afternoon downpour and resists mildew, and we '
        + 'source FSC-certified teak and recycled-content frames on request.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-furniture'],
    tras: ['Designers recommend eco‑friendly materials and accessories for environmentally '
        + 'conscious homeowners'],
    lineas: [
      'Refinishing, Delivery & Placement',
      'Good frames outlast their finish, so we sand and re-oil teak, re-strap aluminum, '
        + 'and rebuild cushions rather than replace a set that still fits. Our crews deliver, '
        + 'assemble, and place each piece, keep egress paths clear, and leave lightweight '
        + 'items easy to stow when a storm watch goes up.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/deck-builders
  {
    rutas: ['/services/deck-builders'],
    tras: ['Our team designs and builds composite and wood decks across North & South Florida, '
        + 'combining durability with modern outdoor style.'],
    lineas: [
      'Composite & Treated Wood Decking',
      'We frame decks in pressure-treated pine rated for ground contact and surface them '
        + 'in capped composite or sealed wood. Salt air and UV punish fasteners first, so we '
        + 'specify hot-dipped galvanized or stainless hardware and hidden clips that hold '
        + 'through Florida\'s wet season.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/deck-builders'],
    tras: ['Contractors build pressure‑treated pine decks, sealing and staining for natural beauty'],
    lineas: [
      'Multi-Level & Rooftop Decks',
      'Multi-level decks split the grill, the table and the lounge across platforms '
        + 'instead of crowding one. A rooftop deck sits over living space, so it gets a '
        + 'waterproof membrane, flashed edges, and guardrails and attachments engineered for '
        + 'the design wind speed the code assigns your address, which rises inside Broward\'s '
        + 'High-Velocity Hurricane Zone.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/deck-builders'],
    tras: ['Contractors build rooftop decks that maximize outdoor space with privacy and '
        + 'scenic views'],
    lineas: [
      'Pool Decks & Railings',
      'Around a pool we lay slip-resistant surfaces that stay cool underfoot and slope '
        + 'drainage away from the house. Railings come in powder-coated aluminum, stainless '
        + 'cable or tempered glass, sized and spaced to meet guard and pool-barrier '
        + 'requirements, and set in anchors that resist chlorine and salt.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/deck-builders'],
    tras: ['Builders install wood, metal, cable, or glass railings to enhance safety and style'],
    lineas: [
      'Lighting, Remodels & Expansions',
      'Low-voltage LEDs in posts, stair risers and rail caps keep the deck usable after '
        + 'dark, on GFCI circuits with wet-rated fixtures that survive Florida humidity. On '
        + 'older decks we open the framing, replace what has rotted, and extend the footprint '
        + 'your setbacks allow.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/landscaping
  {
    rutas: ['/services/landscaping'],
    tras: ['We provide full-service landscaping in North & South Florida, using native plants '
        + 'and sustainable designs to enhance curb appeal.'],
    lineas: [
      'Site Design & Plant Selection',
      'Our designs set the planting beds, lawn areas and sight lines to scale, with plant '
        + 'palettes built on Florida natives, xeriscape groupings and rain gardens. Those '
        + 'species take the salt drift, UV and summer downpours of a coastal lot, so the yard '
        + 'fills in instead of thinning out.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/landscaping'],
    tras: ['Designers incorporate native plants, xeriscaping, and rain gardens for '
        + 'eco‑friendly, low‑maintenance yards'],
    lineas: [
      'Sod, Trees & Planting Beds',
      'We lay certified sod over graded, amended soil so roots knit into the base instead '
        + 'of sitting on loose sand. Trees and shrubs go in at nursery depth, staked against '
        + 'Florida wind, and beds get defined edges plus mulch that holds moisture through '
        + 'the dry season.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/landscaping'],
    tras: ['Landscape teams apply mulch and define edges to retain moisture and polish planting beds'],
    lineas: [
      'Pavers, Patios & Walkways',
      'We build paver patios, walkways and retaining walls on a compacted limerock base '
        + 'with aluminum edge restraint and polymeric sand, so the surface holds its line '
        + 'after heavy rain. Wall heights, drainage behind the wall and soil loads follow the '
        + 'Florida Building Code.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/landscaping'],
    tras: ['Builders install paver patios, walkways, and retaining walls to enhance outdoor '
        + 'living spaces'],
    lineas: [
      'Drainage & Night Lighting',
      'French drains, catch basins and regrading pull water off the lawn and away from '
        + 'the slab, which matters on flat lots where the water table sits close to the '
        + 'surface. Low-voltage LED path lights, uplights and security fixtures use '
        + 'marine-grade wire and sealed housings that survive salt air.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/pool-screen-enclosures
  {
    rutas: ['/services/pool-screen-enclosures'],
    tras: ['We build pool screen enclosures in North & South Florida, protecting pools from '
        + 'debris, insects, and harsh sun exposure.'],
    lineas: [
      'Cage Framing & Roof Profiles',
      'We frame pool cages from extruded aluminum sized to the deck, the roofline, and '
        + 'the setbacks on the lot. Mansard, gable, and hip screen roofs shed water '
        + 'differently, so we pick the profile that suits the house and keeps the clear span '
        + 'within what the framing carries.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-screen-enclosures'],
    tras: ['Licensed contractors design and construct pool screen enclosures that blend with '
        + 'residential architecture'],
    lineas: [
      'Lanais, Patios, Screen Rooms',
      'Screening a lanai or converting an open patio adds usable square footage without '
        + 'adding walls. We tie new framing into the existing columns and slab, add '
        + 'kickplates where foot traffic lands, and hang self-closing, self-latching doors so '
        + 'the enclosure holds up as a pool barrier.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-screen-enclosures'],
    tras: ['Contractors convert patios into enclosed screen rooms, creating multi‑use outdoor '
        + 'spaces.'],
    lineas: [
      'Wind Load, Engineering, Permits',
      'Every cage is engineered to the design wind speed the Florida Building Code '
        + 'assigns its address, rising inside Broward\'s High-Velocity Hurricane Zone and '
        + 'easing farther north. Heavier uprights, tighter beam spacing, and larger concrete '
        + 'anchors follow from that, with sealed drawings for the permit file.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pool-screen-enclosures'],
    tras: ['Professionals handle permits and engineering for pool cage installations and '
        + 'renovations.'],
    lineas: [
      'Rescreening, Repairs & Remodels',
      'Florida sun and salt air break down screen mesh and fasteners long before the '
        + 'aluminum frame gives out. We rescreen whole cages in 18/14 or no-see-um mesh, swap '
        + 'corroded screws and torn panels, rehang sagging doors, and rebuild dated frames '
        + 'with new uprights and color.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/patio-screen-rooms
  {
    rutas: ['/services/patio-screen-rooms'],
    tras: ['We install custom patio screen rooms in North & South Florida using aluminum '
        + 'frames and fine mesh for comfort and airflow.'],
    lineas: [
      'Sized To Your Slab',
      'We size every screen room to your slab, your roofline and the setbacks on your '
        + 'lot, then pick a frame gauge that matches the wind load at your address. In '
        + 'Broward that means High-Velocity Hurricane Zone framing and anchors. Mesh runs '
        + '18/14 insect screen or tighter no-see-um cloth.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/patio-screen-rooms'],
    tras: ['Licensed pros offer free consultations and custom designs for patio screen room projects'],
    lineas: [
      'Insulated & Screen Roofs',
      'Insulated panels sandwich a foam core between aluminum skins, holding heat off the '
        + 'room through an August afternoon and carrying the live load the Florida Building '
        + 'Code requires. When you want daylight and airflow instead, we frame a '
        + 'non-insulated screen roof on lighter beams and the same anchored posts.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/patio-screen-rooms'],
    tras: ['Contractors install cost‑effective, non‑insulated patio roofs that still offer '
        + 'bug‑free outdoor living'],
    lineas: [
      'Converting Porches & Decks',
      'An existing porch or deck becomes a screen room without new footings when the slab '
        + 'measures thick enough and the framing underneath carries the load. We tie the '
        + 'enclosure into your fascia or block wall with through-bolted anchors, then match '
        + 'posts, gutter line and finish color to the house.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/patio-screen-rooms'],
    tras: ['Contractors tie screen rooms into existing structures and match the home’s '
        + 'architectural style'],
    lineas: [
      'Remodels By Licensed Crews',
      'On an older enclosure we replace torn screen, add a swing door or vinyl windows, '
        + 'and re-anchor framing that salt air and UV have chalked. Aluminum pitted past '
        + 'repair gets swapped for new extrusion, and the whole job carries our Florida '
        + 'license and liability coverage.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/louvered-roofs
  {
    rutas: ['/services/louvered-roofs'],
    tras: ['We design and install motorized louvered roof systems in North & South Florida, '
        + 'offering adjustable shade and rain protection year-round.'],
    lineas: [
      'Motorized & Manual Louvers',
      'We build extruded aluminum louvered roofs that rotate closed against rain and open '
        + 'for airflow. We engineer every frame to Florida Building Code wind loads, with '
        + 'High-Velocity Hurricane Zone product approval where Broward requires it. '
        + 'Powder-coated finishes and stainless fasteners resist salt air and UV.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/louvered-roofs'],
    tras: ['Builders construct manual louvered roofs that tilt for sun control and ventilation'],
    lineas: [
      'Automation, Lighting, Fans',
      'Rain sensors close the louvers on their own when a storm moves in, so the '
        + 'furniture underneath stays dry. We run low-voltage wiring inside the beams for LED '
        + 'lighting, ceiling fans, and motorized screens, and a licensed electrician ties the '
        + 'wet-rated fixtures into your panel.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/louvered-roofs'],
    tras: ['Contractors integrate LED lights, ceiling fans, and privacy screens into louvered '
        + 'roof systems'],
    lineas: [
      'Layouts, Finishes, Approvals',
      'Post spacing, beam spans, and blade direction all change with your roof line, so '
        + 'we draw each layout to the house you already have. Wood-grain aluminum reads like '
        + 'cypress and will not rot in Florida humidity, which is why HOA architectural '
        + 'boards clear it when real timber gets rejected.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/louvered-roofs'],
    tras: ['Professionals handle HOA approvals and city permits for louvered roof construction'],
    lineas: [
      'Ongoing Service & Repairs',
      'Louvers ride on gearboxes and pivot bearings that collect salt, pollen, and sand. '
        + 'We clean the tracks, flush the integrated gutters, re-torque hardware, and swap '
        + 'worn motors so the roof still closes when the afternoon storm arrives. After '
        + 'hurricane season we check the blades and seals.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/outdoor-kitchens
  {
    rutas: ['/services/outdoor-kitchens'],
    tras: ['We design and construct custom outdoor kitchens in North & South Florida, '
        + 'integrating durable finishes and modern cooking appliances.'],
    lineas: [
      'Layout, Design & Modules',
      'We build outdoor kitchens two ways. Modular cabinetry drops into a straight run '
        + 'along a lanai or pool deck; full masonry handles L-shapes, curves, and tight '
        + 'setbacks against a screen enclosure. Either layout keeps the grill venting away '
        + 'from the house and the prep space within reach of it.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-kitchens'],
    tras: ['Contractors install prefabricated outdoor kitchen modules for quick, '
        + 'cost‑effective setups.'],
    lineas: [
      'Grill Islands & Pizza Ovens',
      'Built-in grills need code clearance to combustibles, a rated hood where the island '
        + 'sits under a solid roof, and gas and electrical runs sized for the appliance. '
        + 'Wood-fired and gas ovens weigh hundreds of pounds, so they land on a slab that '
        + 'carries the load or on footings we pour.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-kitchens'],
    tras: ['Builders install wood‑fired or gas pizza ovens, adding artisan cooking options to '
        + 'outdoor kitchens'],
    lineas: [
      'Bars, Beverages & Remodels',
      'Bars and beverage centers add plumbing and power to the island: a sink, a drain '
        + 'line, GFCI circuits in weatherproof covers, refrigeration rated for outdoor use. '
        + 'Remodels run the same trades through an existing shell, and salt air has usually '
        + 'gone after its fasteners and framing.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/outdoor-kitchens'],
    tras: ['Renovation experts upgrade existing outdoor kitchens with new finishes, '
        + 'appliances, and layouts'],
    lineas: [
      'Materials, Permits & Trades',
      'Coastal exposure ruins ordinary cabinetry, so we build with marine-grade polymer, '
        + '316 stainless, and quartzite or porcelain tops that hold color under Florida UV. '
        + 'We pull the gas, electrical, and plumbing permits under our own license, and the '
        + 'licensed trades on site answer to us.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/irrigation-systems
  {
    rutas: ['/services/irrigation-systems'],
    tras: ['We install smart irrigation systems in North & South Florida, optimizing water '
        + 'usage with automated schedules tailored to your landscape.'],
    lineas: [
      'Controllers, Sensors & Scheduling',
      'We install Wi-Fi controllers that pull local weather data and skip a cycle when a '
        + 'storm moves through. Florida law requires a working rain shutoff device, so we '
        + 'wire rain and soil-moisture sensors into the valve circuit and set run times that '
        + 'match your water management district\'s watering days.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/irrigation-systems'],
    tras: ['Contractors retrofit systems with soil moisture sensors and rain sensors to '
        + 'optimize watering'],
    lineas: [
      'Sprinklers & Drip Lines',
      'Pipe, heads, and zone count follow the pressure and flow at your point of '
        + 'connection, where a backflow preventer protects the potable line. Rotors and spray '
        + 'heads overlap head to head instead of leaving dry rings, and drip tubing runs '
        + 'under mulch to feed beds, hedges, and palms at the root.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/irrigation-systems'],
    tras: ['Installers design drip systems that deliver water directly to roots, saving up to '
        + '90% efficiency'],
    lineas: [
      'Zoning, Rerouting & Redesign',
      'St. Augustine turf, tropical beds, and potted color each drink differently, so '
        + 'each one gets its own valve, heads, and run time instead of a single blanket '
        + 'schedule. When a new pool deck or paver patio cuts a lateral, we reroute the line, '
        + 'cap orphaned heads, and rebalance the zone.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/irrigation-systems'],
    tras: ['North Florida experts reroute irrigation lines around new pools or hardscapes to '
        + 'maintain even coverage'],
    lineas: [
      'Leak Repair & Seasonal Service',
      'Salt air and UV crack fittings, roots tilt heads, and a buried break shows up as a '
        + 'soft spot in the lawn or a spike on the meter. We pressure-test zone by zone, '
        + 'rebuild valves with new diaphragms and solenoids, and reset schedules for the dry '
        + 'season and the summer rains.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/steel-buildings-pole-barns
  {
    rutas: ['/services/steel-buildings-pole-barns'],
    tras: ['We construct steel buildings and pole barns in North & South Florida, engineered '
        + 'for hurricane resistance and long-term durability.'],
    lineas: [
      'Pole Barns & Livestock Shelters',
      'We frame pole barns on treated posts or steel columns, then sheet them with ribbed '
        + 'panels and fasteners that carry Florida Building Code product approval. For horses '
        + 'and livestock we detail open bays, ridge vents and kickboards, and we specify '
        + 'galvanized hardware that survives salt air and daily washdowns.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/steel-buildings-pole-barns'],
    tras: ['Contractors construct metal barns for horses and livestock, using durable, '
        + 'pest‑resistant materials.'],
    lineas: [
      'Garages, Workshops, Storage Buildings',
      'Steel garages and workshops sit on a slab we pour with thickened edges, with '
        + 'anchor bolts set to the column layout. Insulated panels and a vented ridge hold '
        + 'down the radiant heat these buildings trap in a Florida summer, and we size doors '
        + 'around the trucks, boats or equipment going inside.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/steel-buildings-pole-barns'],
    tras: ['South Florida builders design custom steel workshops and storage buildings with '
        + 'energy‑efficient insulation.'],
    lineas: [
      'Engineered Kits, Wind Ratings',
      'Pre-engineered kits arrive with sealed engineering, and we erect them to those '
        + 'drawings exactly, with no field substitutions on connections or anchor bolts. We '
        + 'match each building to the design wind speed at its address, and inside Broward\'s '
        + 'High-Velocity Hurricane Zone we use approved assemblies, bracing and hold-downs.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/steel-buildings-pole-barns'],
    tras: ['Builders install hurricane‑rated steel buildings engineered to handle heavy winds '
        + 'and rain.'],
    lineas: [
      'Commercial Builds & Renovations',
      'For home businesses and equipment yards we build commercial-grade frames with '
        + 'taller eaves, wider bays and slabs rated for loaders and trailers. On an existing '
        + 'barn we replace corroded purlins and rusted skin, add a lean-to or enclose open '
        + 'bays, and bring the older structure up to current code.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/soffit-led-lighting
  {
    rutas: ['/services/soffit-led-lighting'],
    tras: ['We install smart soffit and LED lighting systems in North & South Florida, '
        + 'boosting curb appeal, security, and energy efficiency.'],
    lineas: [
      'Custom Runs & Concealed Channels',
      'We mount the LED run tight to the soffit line in aluminum channel finished to '
        + 'match your fascia, so the diodes stay out of sight and only the light shows. Crews '
        + 'pull low-voltage wire inside the soffit, seal every penetration against water, and '
        + 'mount the transformer where you can reach it.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/soffit-led-lighting'],
    tras: ['Custom installers conceal wiring in color‑matched aluminum channels for a sleek '
        + 'residential finish.'],
    lineas: [
      'Sealed Housings & LED Retrofits',
      'Salt air and UV break down open fixtures, so we install IP68-rated channel and '
        + 'stainless fasteners anchored into framing rather than bare soffit panel, which is '
        + 'what holds a run together in coastal Florida wind. Retrofits pull aging halogen '
        + 'strands and put LED diodes on a low-voltage circuit.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/soffit-led-lighting'],
    tras: ['South Florida installers retrofit existing soffit lighting with energy‑efficient '
        + 'LED technology.'],
    lineas: [
      'Controllers, Zones & RGBW Color',
      'Each node on the track carries its own RGBW diode, so one run gives you warm white '
        + 'for a regular night and full color when you want it. The controller mounts by the '
        + 'panel and talks to your phone, and we split the run into zones that follow the '
        + 'elevations of the house.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/soffit-led-lighting'],
    tras: ['Builders install LED systems offering millions of colors and patterns for '
        + 'personalized illumination.'],
    lineas: [
      'Security Lighting & Holiday Color',
      'Soffit LEDs wash the walls, entry, and driveway, which removes the dark corners a '
        + 'camera cannot resolve and keeps light off your neighbor\'s windows. The same '
        + 'permanent track carries holiday color, so nobody is on a ladder in December '
        + 'stapling strands to the fascia.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  // /services/pergola-builders
  {
    rutas: ['/services/pergola-builders'],
    tras: ['We design and build custom aluminum pergolas for Florida homes, delivering shade, '
        + 'durability, and elevated outdoor living.'],
    lineas: [
      'Designed For Homes & Businesses',
      'Every pergola starts from the space it has to cover. We set column positions, beam '
        + 'depth and rafter spacing around your patio dimensions, door swings and sightlines, '
        + 'whether the structure shades a backyard in Gainesville or a restaurant terrace in '
        + 'Fort Lauderdale.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pergola-builders'],
    tras: ['Pergola solutions designed for residential homes and commercial outdoor environments.'],
    lineas: [
      'Aluminum & Treated Wood',
      'Aluminum handles most of what we build here: it will not rot, swell or feed '
        + 'termites, and a powder-coated finish stands up to salt air and Florida UV. When a '
        + 'client wants wood grain overhead, we frame in treated lumber and detail the '
        + 'connections to shed water.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pergola-builders'],
    tras: ['Custom pergolas crafted with treated materials for natural beauty and structural '
        + 'reliability.'],
    lineas: [
      'Standalone Structures & Roofline Extensions',
      'A freestanding pergola sits on its own footings, anchored against uplift, so it '
        + 'can stand out by the pool or in the middle of the yard. An attached one carries a '
        + 'ledger into the wall framing, and we flash that joint so the roofline extension '
        + 'does not trap water.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
  {
    rutas: ['/services/pergola-builders'],
    tras: ['Attached pergolas designed to seamlessly extend patios and covered outdoor spaces.'],
    lineas: [
      'Louvered Roofs & Night Lighting',
      'Louvered roofs rotate from open sky to a closed, water-shedding ceiling, so an '
        + 'afternoon storm does not clear the patio. We run wiring through the beams and '
        + 'columns for wet-rated downlights and fan boxes, which keeps conduit off the '
        + 'finished surfaces and the space usable after dark.',
    ],
    motivo: 'R22-DETALLE: cabecera y entradilla de una fila de la rejilla de subservicios.',
  },
];

/* SEO-REMEDIACION (4-oct-2026): en la home y en las landings con `heroe.cta`, el CTA del heroe ya
 * no dice «Get A Free Estimate» (§ ctaHeroe), asi que el ancla de «Project Gallery» —el segundo
 * boton del heroe— pasa a ser el CTA nuevo. Se parte la declaracion de la AUDITORIA en vez de
 * duplicarla: mismas rutas, misma linea, ancla segun la ruta. */
{
  const i = LINEAS_ANADIDAS.findIndex((d) => d.lineas?.[0] === 'Project Gallery'
    && d.tras?.[0] === 'Get A Free Estimate' && Array.isArray(d.rutas));
  if (i < 0) throw new Error('check-texto: no encuentro la declaracion del segundo CTA del heroe');
  const d = LINEAS_ANADIDAS[i];
  const cta = (r) => (r === '/' ? CTA_HEROE_HOME : CAPTACION_JSON[r]?.heroe?.cta);
  const porCta = new Map();
  for (const r of d.rutas.filter(cta)) porCta.set(cta(r), [...(porCta.get(cta(r)) ?? []), r]);
  d.rutas = d.rutas.filter((r) => !cta(r));
  for (const [c, rutas] of porCta) {
    LINEAS_ANADIDAS.push({ ...d, rutas, tras: [capitalizaH2(c)],
      motivo: `${d.motivo} · SEO-REMEDIACION: el CTA del heroe es ahora «${c}».` });
  }
}

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
function lineasResenas(ruta) {
  const f = path.join(RAIZ, 'src/data/resenas.json');
  if (!fs.existsSync(f)) return [];
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const items = d.items ?? [];
  if (d.publicar === false || !items.length) return [];
  const norm = (s) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  /* ASTRO-2: en las 14 fichas las resenas van en lista (`ResenasGoogle.astro`, rama `enLista`). El
   * enlace «See all reviews» sube a la cabecera, delante; el nombre va como esta escrito (D-142; hasta
   * entonces, en versalitas por CSS); y en las filas de la lista el nombre y la fecha se pintan a la izquierda
   * de la cita, pero en el HTML van detras, como siempre. Las mismas ocho, las mismas lineas. */
  if (ruta && (esFicha(ruta) || esCiudadA(ruta) || esCondado(ruta) || ruta === '/')) {   // y la home (ASTRO-4)
    return [
      RESENAS_MARCADOR,
      ...(d.valoracion != null ? [d.valoracion.toFixed(1)] : []),
      ...(d.total != null ? [`${d.total} Google reviews`] : []),
      ...items.flatMap((r) => [norm(r.texto), norm(r.autor),   // D-142: el autor, como esta escrito
        ...(r.fecha ? [mesDelNegocio(r.fecha)] : [])]),
      ...(d.actualizado ? [`Updated ${mesDelNegocio(d.actualizado)}`] : []),
    ];
  }
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
 * ── EL FEED DE INSTAGRAM (R15-IG) — bloque DECLARADO, derivado del JSON ─────────────────
 *
 * `FeedInstagram` monta `section.social-media` en 79 rutas y, una vez poblado, aporta DOS
 * lineas de `innerText`: el `@usuario` y el boton `Follow` (`FeedInstagram.astro:35-36`). Ni
 * una mas: los `alt` de las 8 fotos NO entran en `innerText` y el glifo del velo es
 * `aria-hidden`.
 *
 * HASTA HOY ESTA PUERTA NO HABIA MEDIDO EL FEED NI UNA VEZ, y no por descuido: con
 * `src/data/instagram.json` vacio el componente tiene guarda de vacio y emite CERO nodos, asi
 * que las 79 salian verdes sin que hubiera nada que comparar (`docs/encargos/R10-SEC.md:47-48`
 * ya lo avisaba: «el feed tiene 0 nodos .mm-ig en las 115 construidas»). Al poblarlo empieza a
 * medirse de verdad.
 *
 * SE DECLARA, NO SE RE-BASELINIZA: `baseline/text/` no se toca jamas (§1.1), y estas dos lineas
 * son NUESTRAS —el Webflow de origen traia un widget de Elfsight que no pintaba, asi que el
 * baseline retrata el hueco vacio—.
 *
 * VA POR MARCADOR Y NO POR RUTA, al reves que el bloque de blog. Puede: las dos lineas no
 * existen en NINGUN baseline como linea suelta —medido: 0 coincidencias de `^@…$` y de
 * `^Follow$` en las 115—, asi que no hay ruta donde descontarlas de mas. El de blog no podia
 * porque en la home esa seccion SI esta en el baseline.
 *
 * EL FORMATEO SE ESCRIBE AQUI y no se importa del componente, por el mismo motivo que en
 * reseñas y en blog: una puerta que deriva lo que espera del codigo que mide es
 * `f(x) === f(x)`, verde siempre. Se comparte el DATO (`instagram.json`), no el formateo. Si
 * el componente cambiara el texto visible —`Follow` a `Follow us`, por ejemplo— esto se pone
 * ROJO en 79 rutas: correcto, porque el texto visible de 79 paginas ha cambiado y alguien
 * tiene que aprobarlo.
 */
const FEED_MARCADOR_PREFIJO = '@';

/** Las lineas de `innerText` que emite el feed, en orden. Vacio si no hay publicaciones. */
function lineasFeed() {
  const f = path.join(RAIZ, 'src/data/instagram.json');
  if (!fs.existsSync(f)) return [];
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!(d.items ?? []).length || !d.usuario) return [];
  return [`${FEED_MARCADOR_PREFIJO}${d.usuario}`, 'Follow'];
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
const BLOG_RUTAS = ['/where-we-serve/'];
/* Las 14 fichas (`esFicha`) y las 2 regionales: espejo de `conBlogInsertado()` en build-paginas.
 * NO el silo `/services/pool-builders/<x>`: ciudades y condados pintan su carrusel por otra via. */
const enBlogRutas = (r) => esFicha(r) || BLOG_RUTAS.some((p) => r.startsWith(p));

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

  /**
   * ── LAS 5 FICHAS CON SU TRIO SIRVEN OTRO BLOQUE, Y SE DECLARA DERIVANDOLO ─────────────────
   *
   * BLOG-SANITY 6b: una ficha de servicio con sus 3 articulos deja de pintar el carrusel
   * generico de 10. Eso mueve el `innerText` de esa ruta —encabezado propio y 3 tarjetas en
   * vez de 10—, y `check:texto` compara al 100 %.
   *
   * Se declara DERIVANDOLO de `src/data/blog-por-servicio.json`, que es la misma fuente que
   * pinta la pagina, en vez de escribir 5 bloques a mano: asi el dia que se escriban los 63
   * articulos que faltan y las otras 9 fichas reunan su trio, esto las cubre sin tocar nada.
   * Si la fuente y la pagina divergieran, sale rojo — que es lo que debe pasar.
   *
   * Las 9 fichas pendientes NO entran aqui: siguen sirviendo los 10 genericos y su bloque es
   * el de siempre.
   */
  const fFicha = path.join(RAIZ, 'src/data/blog-por-servicio.json');
  if (ruta && fs.existsSync(fFicha)) {
    const ficha = JSON.parse(fs.readFileSync(fFicha, 'utf8')).rutas?.[ruta];
    if (ficha) {
      const n = (x) => (x ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      return articulosEnLista(ruta, n(ficha.titulo), n(ficha.entradilla), ficha.posts, n);
    }
  }

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

  if (ruta?.startsWith('/services/')) return articulosEnLista(ruta, norm(titulo), norm(entradilla), posts, norm);
  return [
    capitaliza(norm(titulo)),
    norm(entradilla),
    /* El CTA va CAPITALIZADO igual que los titulos: vive en un `.button-styles` y
     * `webflow.css` le aplica `text-transform: capitalize`. Medido: la pagina sirve
     * «…Property Value In Florida» y la declaracion decia «…in Florida». El resumen NO, que
     * va en un `<p>` y no lleva la regla. */
    ...posts.flatMap((p) => [capitaliza(norm(p.titulo)), norm(p.resumen), capitaliza(norm(p.cta))]),
  ];
}
/** ASTRO-2 · la seccion de articulos de las 141 rutas de `/services/` (`CarruselBlog.astro`, rama
 *  `enLista`): titular y titulos sin `capitalize`, la accion de la pagina en la cabecera (T-47), los
 *  tres primeros con su resumen y el resto en indice de titulo + «Read More», sin resumen (T-44). */
function articulosEnLista(ruta, titulo, entradilla, posts, n) {
  return [
    capitaliza(titulo), entradilla, capitaliza(CAPTACION_JSON[ruta]?.heroe?.cta ?? 'Get a Free Estimate'),
    // D-135: los titulos de articulo (`.mm-art-t`, `.mm-art-linea-t`) se pintan con `capitalize`.
    ...posts.slice(0, 3).flatMap((p) => [capitaliza(n(p.titulo)), n(p.resumen), n(p.cta)]),
    ...posts.slice(3).flatMap((p) => [capitaliza(n(p.titulo)), n(p.cta)]),
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
/**
 * EL GUION ENTRA EN LA CLASE, Y NO ES COSMETICA (R17-CORE).
 *
 * `text-transform: capitalize` del navegador pone en mayuscula la primera letra de cada
 * PALABRA, y para el navegador el guion separa palabras: «design-build» se pinta
 * «Design-Build». Esta aproximacion solo miraba inicio, espacio y parentesis, asi que derivaba
 * «Design-build» y la declaracion no casaba. Salio midiendo, con la franja de confianza:
 *
 *     FALTA  el bloque de captacion que empieza en "Why Homeowners Pick Us"
 *     derivado: One Design-build Team   ·   real: One Design-Build Team
 *
 * COMPROBADO ANTES DE TOCARLO que no mueve nada de lo que ya estaba declarado: se recorrieron
 * los titulos de `proyectos-propios`, `obras-migradas`, `blogs.json` y los dos
 * `*-heading-por-ruta.json` -que son los UNICOS sitios donde se aplica `capitaliza`, nunca a un
 * `resumen`- y el guion cambia el resultado en 0 de ellos.
 */
const capitaliza = (s) => s.replace(/(^|[\s(-])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

/**
 * ── EL SUFIJO OCULTO DE LOS CTA GENERICOS (`.mm-sr`) — DECLARADO, NO ABSORBIDO ───────────
 *
 * DE DONDE SALE. El audit SEO `link-text` de Lighthouse compara el texto del ancla contra una
 * lista negra cerrada -«read more», «see more», «learn more»...- y **no mira `aria-label`**:
 * comprobado en la fuente, `anchor-elements.js` recoge `text: node.innerText`. Los CTA de
 * blog y de servicios ya llevaban un `aria-label` descriptivo desde hace frentes, o sea que
 * el NOMBRE ACCESIBLE ya era correcto y el audit seguia rojo igual: 24 nodos en la home.
 *
 * La unica salida sin tocar lo que se ve es que el TEXTO deje de ser generico sin que cambie
 * el pixel: un `<span class="mm-sr">` fuera de flujo con el titulo detras del rotulo. Se ve
 * igual, se lee mejor, y `innerText` SI lo incluye -por eso esta este bloque-.
 *
 * SE DECLARA, NO SE RE-BASELINIZA: `baseline/text/` no se toca jamas (§1.1).
 *
 * POR QUE NO VALE NINGUN MECANISMO DE LOS QUE YA HAY:
 *   · `LINEAS_ANADIDAS` cablea el texto a mano: serian ~25 titulos copiados aqui, o sea una
 *     TERCERA copia de un texto que ya vive en dos sitios.
 *   · `TRADUCIDAS_A_PROPOSITO` es 1->1 y esto produce una linea de MAS.
 *   · `quitaBloque` no sirve tal cual: en las 16 rutas de `BLOG_RUTAS` el sufijo cae DENTRO
 *     del bloque que declara `lineasBlog()`, y lo partiria. Por eso esto va de PRIMERO, antes
 *     que los demas bloques: los quita y deja el bloque de blog otra vez contiguo.
 *
 * SE DERIVA DEL MISMO DATO Y SE FORMATEA AQUI, como reseñas y blog. Si el componente cambia
 * el separador o el orden, esto se pone ROJO — que es lo que tiene que pasar.
 *
 * ⚠️ CAPITALIZE OTRA VEZ. Los titulos de blog salen capitalizados palabra a palabra porque el
 * `capitalize` de `.button-styles` alcanza al span heredado; los de servicios NO, porque
 * `.svc-cta` no lleva esa clase. Medido, no supuesto: 10 lineas de blog discrepaban sin
 * capitalizar y las de servicios discrepaban CON. Por eso la lista lleva las dos formas y se
 * acepta cualquiera de ellas para el mismo dato.
 *
 * NO ES UNA REBAJA DEL UMBRAL. Solo se quita una linea si es EXACTAMENTE `: <titulo>` de un
 * titulo conocido Y la de encima es su propio rotulo. Un sufijo inventado, un titulo que ya
 * no existe o un rotulo que cambio dejan la linea puesta y la ruta se pone roja.
 */
function sufijosSr() {
  const norm = (s) => (s ?? '').replace(/ /g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const lee = (rel) => {
    const f = path.join(RAIZ, rel);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  };
  const pares = [];
  const anota = (cta, titulo) => {
    const c = norm(cta); const t = norm(titulo);
    if (!c || !t) return;
    /* CUATRO variantes, no dos. `capitalize` no pinta solo el sufijo: el CTA vive en un
     * `.button-styles`, que Webflow tambien capitaliza, asi que la linea anterior que hay que
     * reconocer llega como «Read More: … Value In Florida» y no como «… in Florida». Con la
     * clave sin capitalizar el sufijo no se quitaba NUNCA en estas rutas, y el bloque de blog
     * salia «PARTIDO o DESORDENADO» en las 14 fichas — por una mayuscula. */
    for (const clave of new Set([c, capitaliza(c)])) {
      pares.push([clave, `: ${t}`]);
      pares.push([clave, `: ${capitaliza(t)}`]);
    }
  };

  for (const p of lee('src/data/blogs.json')?.posts ?? []) anota(p.cta, p.titulo);
  /* SEO-REMEDIACION (4-oct-2026): las tarjetas de «Most Read Articles» de cada articulo
   * (`src/pages/blogs/[slug].astro`) llevan el mismo sufijo oculto, con el titulo de Sanity. */
  for (const p of lee('src/data/blogs-sanity.json') ?? []) anota('Read More', p.title);

  /* Y los de las fichas con su trio: sus tarjetas NO salen de `blogs.json`, asi que sin esto
   * sus tres sufijos ocultos se quedaban en la pagina y partian el bloque igual. */
  for (const f of Object.values(lee('src/data/blog-por-servicio.json')?.rutas ?? {})) {
    for (const x of f.posts ?? []) anota(x.cta, x.titulo);
  }

  const svc = lee('src/data/servicios-categoria.json') ?? {};
  const recorre = (o) => {
    if (Array.isArray(o)) { o.forEach(recorre); return; }
    if (!o || typeof o !== 'object') return;
    if (o.cta && o.titulo) anota(o.cta, o.titulo);
    else Object.values(o).forEach(recorre);
  };
  recorre(svc);
  return pares;
}

/** Quita las lineas de sufijo oculto. Devuelve `[lineas, cuantas]`. */
function quitaSufijosSr(lineas) {
  const pares = sufijosSr();
  if (!pares.length) return [lineas, 0];
  const esperado = new Map();
  for (const [cta, suf] of pares) {
    if (!esperado.has(suf)) esperado.set(suf, new Set());
    esperado.get(suf).add(cta);
  }
  const out = []; let n = 0;
  for (let i = 0; i < lineas.length; i++) {
    const ctas = esperado.get(lineas[i]);
    if (ctas && out.length && ctas.has(out[out.length - 1])) { n++; continue; }
    out.push(lineas[i]);
  }
  return [out, n];
}


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

/**
 * ── R16-PROY: LAS MISMAS 5 OBRAS, PERO EN LAS 66 RUTAS DEL CARRUSEL ──────────────────────
 *
 * Hasta R16 el carrusel «Project Showcase» no era un componente: era el mismo bloque de HTML
 * pegado en siete sitios, y solo la copia de `/` se actualizo cuando entraron las 5 obras. Por
 * eso arriba solo estaban declaradas `/` y `/projects`: eran las dos unicas paginas donde las
 * obras salian. Ahora salen en las 66, o sea que las otras 65 ganan las MISMAS 10 lineas
 * (5 titulos + 5 «See Project») y necesitan la misma declaracion.
 *
 * SE DECLARAN EN BLOQUE, PERO NO A CIEGAS. Escribir 65 entradas a mano seria copiar 130 lineas
 * de texto que ya viven en otro sitio —justo lo que el § de arriba rechaza para `LINEAS_ANADIDAS`—
 * asi que la lista de rutas se deriva de dos ficheros de CODIGO, nunca del build:
 *   · `src/data/proyectos-heading-por-ruta.json`  las 12 estaticas (+ `/`, ya declarada)
 *   · `src/data/seo-pool-builders.json`           las 53 de Ciudad
 * Si una ruta empieza a pintar el carrusel y no esta en ninguno de los dos, no se declara y
 * sale ROJA. Fallar cerrado es la unica forma de que esto no se convierta en un perdon general.
 *
 * Y EL ANCLA SIGUE SALIENDO DEL BASELINE CONGELADO, ruta a ruta. No se copia a mano porque son
 * 65 encabezados distintos —los de Ciudad vienen de Sanity y ni siquiera estan en el repo—,
 * pero tampoco se lee del HTML recien construido, que seria la tautologia que este fichero
 * lleva tres parrafos rechazando: se leen las DOS LINEAS QUE PRECEDEN al primer slide migrado
 * en `baseline/text/<ruta>.txt`, que es un fichero de agosto que nadie re-baseliniza. Si el
 * encabezado de una ruta cambiara, el ancla dejaria de casar y la ruta se pondria roja.
 *
 * El titulo del primer slide migrado se deriva de `obras-migradas.json` y se capitaliza AQUI,
 * como todo lo demas en este fichero: se comparte el dato, nunca el formateo.
 */
const PRIMER_SLIDE_MIGRADO = (() => {
  const f = path.join(RAIZ, 'src/data/obras-migradas.json');
  if (!fs.existsSync(f)) return null;
  const o = JSON.parse(fs.readFileSync(f, 'utf8')).obras?.[0];
  return o ? capitaliza(o.tituloHtml.replace(/&amp;/g, '&')) : null;
})();

/** Las dos lineas que preceden al carrusel en el baseline CONGELADO de `ruta`. `null` si no
 *  se pueden leer: entonces la ruta NO se declara y sale roja, que es el fallo correcto. */
function anclaCarrusel(ruta) {
  if (!PRIMER_SLIDE_MIGRADO) return null;
  const f = path.join(RAIZ, 'baseline/text', aSlug(ruta) + '.txt');
  if (!fs.existsSync(f)) return null;
  const lineas = fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim());
  const i = lineas.indexOf(PRIMER_SLIDE_MIGRADO);
  return i >= 2 ? [lineas[i - 2], lineas[i - 1]] : null;
}

const RUTAS_CARRUSEL = (() => {
  const lee = (rel) => {
    const f = path.join(RAIZ, rel);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  };
  const estaticas = Object.keys(lee('src/data/proyectos-heading-por-ruta.json'))
    .filter((k) => k.startsWith('/'));
  const ciudad = Object.keys(lee('src/data/seo-pool-builders.json'))
    .map((s) => rutaCiudad(s));
  return [...estaticas, ...ciudad];
})();

for (const ruta of RUTAS_CARRUSEL) {
  if (OBRAS_PROPIAS_EN[ruta]) continue;           // `/` ya viene declarada arriba
  /* SEO-REMEDIACION (4-oct-2026): el ancla sale del baseline congelado y se pasa por `traduce`,
   * porque en las 53 ciudades el titular y la entradilla del carrusel se sustituyen a proposito
   * (§ CARRUSEL_CIUDAD). Si no hay sustitucion declarada, `traduce` la devuelve igual. */
  const tras = anclaCarrusel(ruta)?.map((l) => traduce(ruta, l));
  if (!tras) continue;                            // sin ancla no se declara -> roja
  OBRAS_PROPIAS_EN[ruta] = {
    forma: 'slide',
    tras,
    motivo: 'R16-PROY: el carrusel pasa a componente y esta ruta gana las 5 obras propias que '
      + 'antes solo tenia la home. Ancla leida de su baseline congelado.',
  };
}

/** Las lineas que aportan las obras propias en `ruta`, en orden. Vacio si la ruta no declara. */
function lineasObras(ruta) {
  const d = OBRAS_PROPIAS_EN[ruta];
  if (!d) return [];
  const f = path.join(RAIZ, 'src/data/proyectos-propios.json');
  if (!fs.existsSync(f)) return [];
  // En el indice no salen las ocultas; en el carrusel no salen las que dicen `enCarrusel: false`
  // (las obras del banco de PROMPT-PROYECTOS-BANCO). Mismos dos filtros que `build-paginas.mjs` y
  // `CarruselProyectos.astro`.
  const obras = (JSON.parse(fs.readFileSync(f, 'utf8')).obras ?? [])
    .filter((o) => (d.forma === 'tarjeta' ? !OCULTAS.has(o.slug) : o.enCarrusel !== false));
  // El titulo pasa por `capitaliza` porque va en un h2/h3 con capitalize; el resumen no, va en
  // un <div> pelado; los rotulos de boton se escriben ya capitalizados, como en el origen.
  return obras.flatMap((o) => (d.forma === 'tarjeta'
    ? [capitaliza(o.titulo), o.resumen, 'View Full Project']
    // D-135: tambien en la lista de ciudad y de condado (`.mm-ficha-t`, `.mm-linea-t`) van con `capitalize`.
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
/* Espejo del formulario de `FormularioCore.astro` (a nivel de modulo: lo usan `sinElBloque` y
 * `esperadoPropio`). El porque de cada lista, en § bloquesCaptacion. */
const SMS_CAPTACION = 'I agree to receive SMS messages related to project updates, promotions, and company '
  + 'communications from Mr. & Mrs. Outdoor Living. This is optional and is not required to get '
  + 'an estimate. I understand that I may opt out at any time by replying STOP. Message and data '
  + 'rates may apply.';
const camposCaptacion = (c) => {
  const [rotLic, ...valLic] = c.heroe.licencias.split(' · ');
  const lic = [rotLic.toUpperCase(), valLic.join(' · ')];
  return [
    'Step 1 of 2', 'Full name', 'Phone', 'Email', 'ZIP code', 'Continue', ...lic,
    'Step 2 of 2',
    'Project type', ...(c.formulario.proyectos ?? ['New Custom Pool', 'Complete Pool Remodel']),
    'Do you own this property?', 'Select one...', 'Yes, I own this property', 'No', 'Other',
    'Investment range',
    'Under $25,000', '$25,000 – $50,000', '$50,000 – $75,000',
    '$75,000 – $100,000', '$100,000 – $150,000', '$150,000+',
    'Timeline',
    'As soon as possible', '1-3 months', '3-6 months', '6-12 months', 'Just exploring',
    'Project details (optional)',
    SMS_CAPTACION,
    'Back', ...lic,
  ];
};
/** El formulario ANTES de ASTRO-2, tal como lo guardan las referencias propias de las paginas de
 *  ciudad (`baseline/text-propio/`): sirve para cambiar ese tramo por el nuevo en lo esperado. */
const formularioViejo = (c) => [
  capitaliza(c.formulario.pasosTitulo),
  ...c.formulario.pasos.flatMap((p, i) => [String(i + 1), p]),
  capitaliza(c.formulario.titulo),
  c.formulario.entradilla,
  'Full name', 'Phone', 'Email', 'ZIP code',
  'Project type', ...(c.formulario.proyectos ?? ['New Custom Pool', 'Complete Pool Remodel']),
  'Do you own this property?', 'Select one...', 'Yes, I own this property', 'No', 'Other',
  'Investment range', 'Select one...',
  'Under $25,000', '$25,000 – $50,000', '$50,000 – $75,000',
  '$75,000 – $100,000', '$100,000 – $150,000', '$150,000+',
  'Timeline', 'Select one...',
  'As soon as possible', '1-3 months', '3-6 months', '6-12 months', 'Just exploring',
  'Project details (optional)',
  SMS_CAPTACION,
];
/** El formulario de hoy: el panel de dos pasos y, detras, el titular (rotulo en mayusculas por CSS),
 *  la entradilla y los tres pasos de «que pasa despues», cuyos numeros son ya contadores de CSS. */
const formularioNuevo = (c) => [
  ...camposCaptacion(c),
  c.formulario.titulo.toUpperCase(),
  c.formulario.entradilla,
  capitaliza(c.formulario.pasosTitulo),   // D-135: `.mm-form-pasos-t` con `capitalize`
  ...c.formulario.pasos,
];

let bloqueQueFallo = null;

/** Cuantas lineas de sufijo oculto (§ .mm-sr) se quitaron en toda la corrida, para el resumen. */
let sufijosQuitados = 0;
/** Bloques de la capa de captacion descontados (R17-CORE), para el resumen. */
let conCaptacion = 0;

/** `MM_TEXTO_DIFF=1`: de un bloque declarado que no casa, que lineas no estan tal cual y cual es
 *  la que mas se le parece (igual salvo mayusculas). Solo diagnostico; no cambia el veredicto. */
function diagnosticaBloque(lineas, bloque) {
  if (!process.env.MM_TEXTO_DIFF) return;
  const porMin = new Map(lineas.map((l) => [l.toLowerCase(), l]));
  for (const l of bloque) {
    if (lineas.includes(l)) continue;
    console.log(`     bloque: «${l.slice(0, 80)}» no esta` + (porMin.has(l.toLowerCase()) ? ` · en la pagina: «${porMin.get(l.toLowerCase()).slice(0, 80)}»` : ''));
  }
}

/** Quita de `hay` los bloques declarados para esa ruta. `null` si alguno falla. */
function sinElBloque(ruta, hay) {
  bloqueQueFallo = null;
  let lineas = hay.split('\n');

  // 0 · los sufijos ocultos de los CTA genericos (§ .mm-sr). VAN LOS PRIMEROS a proposito:
  //     en las 16 rutas de BLOG_RUTAS caen DENTRO del bloque que declara `lineasBlog()` y lo
  //     partirian. Quitandolos aqui, ese bloque vuelve a ser contiguo para `quitaBloque`.
  {
    const [sinSuf, n] = quitaSufijosSr(lineas);
    lineas = sinSuf; sufijosQuitados += n;
  }

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
  const res = lineasResenas(ruta);
  if (res.length && lineas.includes(RESENAS_MARCADOR)) {
    lineas = quitaBloque(lineas, res);
    if (lineas === null) { bloqueQueFallo = 'el bloque de reseñas (src/data/resenas.json)'; return null; }
  }

  // 3 · el carrusel de blog, SOLO en services/+where-we-serves/. Los tres bloques son disjuntos.
  if (enBlogRutas(ruta)) {
    const bl = lineasBlog(ruta);
    if (bl.length) {
      const antesDelBlog = lineas;
      lineas = quitaBloque(lineas, bl);
      if (lineas === null) { diagnosticaBloque(antesDelBlog, bl); bloqueQueFallo = 'el bloque de blog (src/data/blogs.json)'; return null; }
    }
  }

  // 4 · el feed de Instagram, derivado del JSON. Disjunto de los tres anteriores: sus dos
  //     lineas no salen en ningun baseline ni las produce ningun otro bloque declarado.
  const fd = lineasFeed();
  if (fd.length && lineas.includes(fd[0])) {
    lineas = quitaBloque(lineas, fd);
    if (lineas === null) { bloqueQueFallo = 'el bloque del feed (src/data/instagram.json)'; return null; }
  }

  // 4.bis · el filtro de `/projects` (PROMPT-PROYECTOS-BANCO §5): etiqueta y opciones del
  //     `<select>`, entre el ancla y la primera tarjeta. Va ANTES del 5 porque se interpone entre
  //     los dos; derivado de `lineasFiltro()`, la misma formula que pinta el componente.
  if (ruta === '/projects') {
    lineas = quitaTras(lineas, OBRAS_PROPIAS_EN[ruta].tras, lineasFiltro());
    if (lineas === null) {
      bloqueQueFallo = 'el filtro de /projects (src/lib/filtro-proyectos.mjs)';
      return null;
    }
  }

  // 5 · las obras de autoria propia (§ OBRAS_PROPIAS_EN). Disjunto de los cuatro anteriores: ni
  //     `/projects` ni `/` reciben el carrusel de blog por insercion, y el marcador de reseñas
  //     de `/` cae muy por debajo del carrusel de proyectos.
  const ob = lineasObras(ruta);
  if (ob.length) {
    const antesDeObras = lineas;
    lineas = quitaTras(lineas, OBRAS_PROPIAS_EN[ruta].tras, ob);
    if (lineas === null) diagnosticaBloque(antesDeObras, [...OBRAS_PROPIAS_EN[ruta].tras, ...ob]);
    if (lineas === null) {
      bloqueQueFallo = `el bloque de ${OBRAS_PROPIAS_EN[ruta].forma}s de las obras propias `
        + '(src/data/proyectos-propios.json)';
      return null;
    }
    conObras++;
  }

/**
 * ── LA CAPA DE CAPTACION DE LAS FICHAS DE `/services/` (R17-CORE) ────────────────────────
 *
 * Tres bloques de texto que NO existen en ningun baseline porque son nuestros: la franja de
 * confianza, el formulario con sus pasos y la banda de inversion, mas las dos lineas del heroe
 * y las preguntas nuevas de la FAQ.
 *
 * SE DERIVAN DEL JSON, NO SE COPIAN A MANO. Es lo que ya hacen `lineasResenas()`,
 * `lineasBlog()` y `lineasFeed()`, y por la misma razon: `LINEAS_ANADIDAS` cablea el texto
 * aqui, y serian ~90 lineas duplicadas de `src/data/captacion-servicios.json`. Derivandolas, el
 * dia que cambie una frase alli esta puerta sigue midiendo sin tocarla — y si el componente
 * deja de pintar lo que el JSON dice, sale ROJA, que es justo lo que tiene que pasar.
 *
 * `capitaliza()` NO ES ADORNO: `webflow.css` pone `text-transform: capitalize` en h1..h4 y en
 * `.button-styles`, y capitalize SI altera `innerText`. Los titulos se declaran ya capitalizados
 * palabra a palabra; los parrafos y las etiquetas, no.
 *
 * LO QUE NO SALE DEL JSON son las etiquetas y las opciones del formulario, que viven en
 * `FormularioCore.astro`. Se declaran aqui como espejo, a proposito: si alguien cambia una
 * etiqueta alli y no aqui, esta puerta se pone roja. Esa es la deteccion de deriva, no un
 * descuido.
 */

/** Espejo de `src/components/widgets/FormularioCore.astro`. Un cambio alli sin cambio aqui = ROJA. */
/* R19: los tipos de proyecto DEPENDEN DE LA FICHA (`formulario.proyectos`), asi que esto deja
 * de ser una lista y pasa a ser una funcion de la ficha. Lo demas es identico en las catorce
 * porque lo pinta un solo componente. El respaldo es el par de la ruta piloto. */
/* ASTRO-2 (D-34): el formulario va en dos pasos y los dos estan en el HTML; `textoNormalizado()`
 * los ensena antes de leer. Mismos campos y mismas opciones; cambia la forma: «Investment range» y
 * «Timeline» son tarjetas (sin «Select one...», T-20), cada paso lleva su pastilla (T-15), sus
 * botones (T-16, T-18; «Continue» y «Back» en `.mm-btn`, que no los altera) y la licencia (T-19).
 * El boton de envio es un `<input>`: su texto no sale en `innerText`, igual que antes. */

/** Los bloques contiguos que aporta la capa de captacion en `ruta`. Vacio si no la lleva. */
/**
 * EL CTA QUE CIERRA UN BLOQUE DE LA CAPA DE CAPTACION (`.svc-cierre`). Un solo sitio donde
 * escribirlo: sale dos veces en las landings de ciudad -tras «Pool Features» y tras la FAQ- y
 * `webflow.css` lo pinta con `capitalize`, asi que se declara pasando por `capitaliza()`.
 */
/* SEO-REMEDIACION (4-oct-2026): el cierre repite el CTA del heroe de la entrada (`heroe.cta`),
 * igual que lo pinta `[slug].astro`; sin `heroe.cta`, el de siempre. */
const ctaCierre = (c) => c?.heroe?.cta ?? 'Get a Free Estimate';

function bloquesCaptacion(ruta) {
  const c = CAPTACION_JSON[ruta];
  /* ASTRO-2 · CONDADOS (T-84). No tienen entrada de captacion, pero su Hero A anade lo mismo que
   * el de la ciudad: la miga visible (D-118, de `miga-tramos.mjs`) y, detras del boton, la banda
   * de datos —los dos telefonos y la licencia de piscinas (T-66)— y el pie de la foto de obra
   * (T-80, de `heroe-ciudad.mjs`). Dos bloques, cada uno contiguo. */
  if (!c && esCondado(ruta)) {
    const lic = CAPTACION_JSON['/services/pool-builders'].heroe.licencias.split(' · ');
    const pie = fotoDeHeroe(ruta)?.pie;
    return [
      tramosMiga(ruta).map((t) => t.nombre),
      // D-134: en Broward y Palm Beach, «South Florida» primero (`condados.mjs`).
      [...zonasDeCondado(ruta).map((z) => TELEFONOS.items.find((t) => t.zona === z)).flatMap((t) => [t.zona.toUpperCase(), t.visible]), lic[0].toUpperCase(), lic.slice(1).join(' · '),
        ...(pie ? ['PROJECT', pie] : [])],
    ];
  }
  if (!c) return [];
  const bloques = [];

  /* 1 · las dos lineas del heroe, detras del apoyo (que ya viene sustituido por `traduce`).
   *
   * EL ORDEN DE LOS TELEFONOS SE DERIVA, NO SE CABLEA. Estaba escrito «North primero» a pelo,
   * y la pagina lo saca de `heroe.zonas` (`src/lib/captacion-ciudad.mjs`). Mientras las unicas
   * rutas con captacion fueron las 14 fichas y 2 ciudades de North Florida los dos coincidian.
   * En cuanto la fase 2 encienda una ciudad de Broward o Palm Beach —que lleva el suyo delante—
   * la puerta se pondria roja por un texto CORRECTO, y una puerta que da rojo por lo que debe
   * pasar se acaba desactivando. Se lee de la misma fuente unica que la pagina. */
  /* 🚨 R21 PARTIO ESTE BLOQUE EN DOS, Y ES EL MISMO CASO QUE R19 C4 DE MAS ABAJO.
   * Hasta R20 los telefonos y las licencias salian SEGUIDOS, los dos detras del apoyo, y por eso
   * eran un bloque contiguo de dos lineas. R21 sube la licencia a insignia ENCIMA del `<h1>`
   * (`src/lib/captacion-ciudad.mjs`, ancla `.wrapper-main-hero-page`) y deja los telefonos donde
   * estaban, junto a los CTA. Entre las dos lineas quedan ahora el h1, el h2 y el apoyo, que
   * salen del baseline. Como `quitaBloque` exige que las lineas de un bloque salgan SEGUIDAS,
   * dejarlo entero daria exactamente «esta, pero PARTIDO o DESORDENADO».
   *
   * NO hace falta `REORDENADAS_A_PROPOSITO`: esa lista es para reordenar lineas que vienen del
   * BASELINE, y estas dos no vienen de ningun baseline — las declara esta funcion entera. El
   * residuo que se compara caracter a caracter (h1, h2, apoyo y los dos CTA) no se ha movido.
   *
   * Y el ` · ` de los telefonos SIGUE AHI. La forma nueva son dos chips, pero el separador no se
   * quita: `innerText` lo ve y el texto no se toca (Principio 2). */
  const zonas = c.heroe.zonas ?? TELEFONOS.items.map((x) => x.zona);
  // D-118: la miga visible en el hero de las 14 fichas, de la misma funcion que la pinta y que da
  // el `BreadcrumbList` del JSON-LD (`miga-tramos.mjs`). Las barras van en `::before`.
  if (esFicha(ruta)) bloques.push(tramosMiga(ruta).map((t) => t.nombre));
  // ASTRO-2: el Hero A lo llevan las 14 fichas y las 118 paginas de servicio × ciudad de `PaginaCiudad.astro`.
  if (ruta.startsWith('/services/')) {
    /* REDISEÑO STITCH · ASTRO-2 · HERO A de las 14 fichas. Los dos telefonos y la licencia pasan
     * de dos renglones sueltos a la banda de datos `.mm-datos`: mismo contenido, otra forma. Cada
     * dato son dos lineas (rotulo en MAYUSCULAS por CSS + valor), y los tres van seguidos. Detras,
     * el pie de foto cuando el hero esta en el banco (D-109): `Project` + el `alt` del banco, tal
     * cual. T-11, T-12 y T-66 de STITCH-TEXTO.md. Derivado de las mismas fuentes que el generador. */
    const [rotLic, ...valLic] = c.heroe.licencias.split(' · ');
    // El pie de la ciudad lo da la MISMA funcion que reparte la foto (`heroe-ciudad.mjs`, D-112 a D-114).
    const pie = esFicha(ruta) ? (c.heroe._banco && BANCO_ALT.get(c.heroe._banco)) : fotoDeHeroe(ruta)?.pie;
    bloques.push([
      ...zonas.flatMap((z) => {
        const tel = TELEFONOS.items.find((x) => x.zona === z);
        if (!tel) throw new Error(`check-texto: heroe.zonas pide «${z}» y telefonos.json no lo trae`);
        return [tel.zona.toUpperCase(), tel.visible];
      }),
      rotLic.toUpperCase(), valLic.join(' · '),
      ...(pie ? ['PROJECT', pie] : []),
    ]);
  } else {
  bloques.push([
    zonas.map((z) => {
      const tel = TELEFONOS.items.find((x) => x.zona === z);
      if (!tel) throw new Error(`check-texto: heroe.zonas pide «${z}» y telefonos.json no lo trae`);
      return `${tel.visible} ${tel.zona}`;
    }).join(' · '),
  ]);
  bloques.push([c.heroe.licencias]);
  }

  // 2 · franja de confianza. SOLA, y esto es el cambio de R19 C4.
  //     R18: los pasos van DELANTE del formulario desde el rediseno de la seccion. No hace
  //     falta declararlo en REORDENADAS_A_PROPOSITO porque estas lineas no salen de ningun
  //     baseline: son de la capa de captacion y se declaran aqui enteras. Lo unico que cambia
  //     es el orden de ESTA lista, que es la que dice que se espera ver y en que orden.
  //
  //     🚨 R19 C4 PARTIO ESTE BLOQUE EN DOS, Y NO ES COSMETICO. Antes confianza y formulario
  //     eran UN bloque contiguo; ahora entre los dos va la intro («Custom Pool & Spa
  //     Builders…»), que se subio ahi para que se vea obra ANTES de pedir los datos. Como
  //     `quitaBloque` exige que las lineas del bloque salgan SEGUIDAS, dejarlo entero daba
  //     exactamente el error que dio: «esta, pero PARTIDO o DESORDENADO». Son dos bloques
  //     contiguos cada uno por su lado, y asi se declaran. El texto de la intro que ahora
  //     queda en medio sale del baseline, no de aqui, y su reorden va en
  //     REORDENADAS_A_PROPOSITO.
  bloques.push([
    // ASTRO-2 (T-69): rotulo en `.mm-etiqueta` (mayusculas por CSS) y titulares sin `capitalize`.
    c.confianza.rotulo.toUpperCase(),
    // D-135: el titulo de cada tarjeta (`.mm-conf-t`) se pinta con `capitalize`.
    ...c.confianza.tarjetas.flatMap((t) => [capitaliza(t.titulo), t.texto]),
  ]);

  // 2.bis · «what happens» + formulario, detras de la intro.
  bloques.push(formularioNuevo(c));

  // 3 · banda de inversion. Desde el 13-sep-2026 ninguna ficha pinta `CarruselProyectos` detras:
  //     las catorce llevan su `gallery`, y sus dos lineas salen del baseline (§ `subeGaleria`).
  bloques.push([
    // ASTRO-2: titular en `.mm-h2` (sin `capitalize`) y los dos botones en `.mm-btn` (con el).
    capitaliza(c.inversion.titulo),   // D-135: `.mm-h2` con `capitalize`
    c.inversion.texto,
    // D-135: los dos botones del panel se pintan como estan escritos (`.mm-min`), igual que en produccion.
    ...c.inversion.ctas.map((x) => x.texto),
    // T-35: los cuatro rotulos del plano en linea, solo en las rutas de piscina (`InversionCore.astro`).
    // Son `<text>` de un SVG con `aria-hidden`, pero `innerText` los lee.
    ...(/^\/services\/pool-(builders|remodeling)(\/|$)/.test(ruta) ? ['SIZE', 'DESIGN', 'FINISHES', 'SITE CONDITIONS'] : []),
  ]);

  /* 3.bis · EL PANEL DE SERVICIOS DE LA HOME (R21, pedido de Sebastian 18-sep-2026).
   *
   * Solo en `/services/pool-builders/`: las 14 fichas de `/services/` tambien pasan por esta funcion y
   * NO montan el panel. Se distingue por la ruta y no por un campo nuevo en
   * `captacion-servicios.json`, porque el panel no lleva ni una linea propia de la ciudad —es
   * literalmente la entrada `/` de `servicios-categoria.json`— y meterle un campo por ruta seria
   * declarar 53 veces lo que es uno.
   *
   * 🚨 EL TEXTO NO ES EL DE `/`, Y ESA ES LA TRAMPA. Parecia que si —mismo componente, misma
   * entrada del JSON—, pero `innerText` NO VE lo que lleva `hidden`, y el componente oculta los
   * servicios que no son de la pestana abierta y todas las fichas menos la activa. La home abre
   * por «Outdoor Living» y la landing por «Pool Solutions», asi que el conjunto VISIBLE es
   * distinto. Por eso se deriva con el mismo `defecto` que pasa `[slug].astro`, y no se copia.
   *
   * EL ORDEN ES EL ENTRELAZADO DEL DOM, no «primero las filas y luego las fichas»: boton,
   * ficha activa, boton, boton… Esta razonado en la cabecera del propio componente.
   *
   * La ultima linea es el `.svc-cierre` que devuelve al `#estimate`, gemelo del de la FAQ. */
  if (esCiudad(ruta)) {
    /* SEO-REMEDIACION (4-oct-2026): la miga visible (`MigaVisible.astro`), entre el heroe y la
     * franja de confianza. De la misma funcion que la pinta; el «/» va en `::before`. */
    bloques.push(tramosMiga(ruta).map((t) => t.nombre));
    const dp = SERVICIOS_CAT['/'];
    const DEFECTO = 'pool-spa';
    const nm = (x) => (x ?? '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
    const visibles = dp.servicios.filter((sv) => sv.categorias.includes(DEFECTO));
    const activo = visibles[0]?.id;
    bloques.push([
      capitaliza(nm(dp.titulo)),
      nm(dp.subtitulo),
      ...dp.categorias.map((c) => nm(c.nombre)),
      ...visibles.flatMap((sv) => (sv.id === activo
        ? [nm(sv.nombre), capitaliza(nm(sv.titulo)), nm(sv.texto), nm(sv.cta)]
        : [nm(sv.nombre)])),
      capitaliza(ctaCierre(c)),
    ]);

    /* 3.ter · LA GALERIA DE OBRA, entre el formulario y el 3D. Solo dos lineas: el `<h2>` y su
     * entradilla. Las 12 fotos no aportan `innerText` —su texto vive en `alt`, que `innerText` no
     * ve— y el lightbox se monta en un `<dialog>` que nace cerrado. */
    const g = { ...GALERIA_OBRA._defecto, ...(GALERIA_OBRA[ruta] ?? {}) };
    bloques.push([capitaliza(nm(g.titulo)), nm(g.entradilla)]);
  }

  // 4 · las preguntas nuevas. Solo el `<h3>`: la respuesta vive en un desplegable cerrado y
  //     `innerText` no la ve. Una ficha puede no anadir ninguna -no se inventa una pregunta
  //     para rellenar-, y entonces no hay bloque que descontar.
  //
  //     R20-CIUDADES: en `/services/pool-builders/` la FAQ no existia, asi que la seccion ENTERA es
  //     nuestra -titulo, entradilla, las 3 preguntas y el CTA de cierre- y sale contigua. Se
  //     distingue por `faq.titulo`, que solo traen las entradas que montan su propia seccion:
  //     en las 14 fichas de `/services/` el titulo y la entradilla salen del baseline, porque
  //     la FAQ ya venia del origen y alli solo se ANADEN preguntas.
  if (c.faq?.anade?.length) {
    bloques.push(c.faq.titulo
      // ASTRO-2: `section.mm-faq` con `<details>`: titular y preguntas sin `capitalize`; el boton
      // de la tarjeta de accion (`.mm-btn`) si lo lleva. Los telefonos de la tarjeta los quita
      // `listasStitch`.
      ? [capitaliza(c.faq.titulo), c.faq.entradilla,
        ...c.faq.anade.map((q) => capitaliza(q.pregunta)), capitaliza(ctaCierre(c))]
      : c.faq.anade.map((q) => capitaliza(q.pregunta)));   // D-135: titular y preguntas con `capitalize`, como en la referencia
  }

  return bloques;
}

  // 5.bis · la capa de captacion (§ bloquesCaptacion). Disjunta de las cinco anteriores: sus
  //          lineas no salen en ningun baseline ni las produce ningun otro bloque declarado.
  for (const bl of bloquesCaptacion(ruta)) {
    const antesDelBloque = lineas;
    lineas = quitaBloque(lineas, bl);
    if (lineas === null) {
      diagnosticaBloque(antesDelBloque, bl);
      bloqueQueFallo = `el bloque de captacion que empieza en "${bl[0]}" `
        + '(src/data/captacion-servicios.json + FormularioCore.astro)';
      return null;
    }
    conCaptacion++;
  }

  // 6 · las lineas sueltas declaradas (§ LINEAS_ANADIDAS). Van al final: los cinco anteriores
  //     son bloques enteros y estas son lineas sueltas, asi que quitarlas antes movería sus anclas.
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

/**
 * ── SEO-SAFE (1-oct-2026) · LOS ARTICULOS HEREDADOS REESCRITOS, DERIVADOS DE SANITY ─────────
 *
 * Los 10 articulos migrados de Webflow publicaban cifras y hechos sin fuente, varios falsos
 * (SEO_IMPLEMENTATION_AUDIT.md P0-2/P0-3). Se reescribieron desde `contenido/blog/*.md`, con
 * la MISMA URL y el MISMO h1, y se publicaron en Sanity. Su `baseline/text/` sigue trayendo el
 * texto viejo, y `baseline/text/` NO SE RE-BASELINIZA NUNCA (§1.1).
 *
 * POR QUE NO VALE NINGUN MECANISMO DE LOS QUE YA HAY: cambian ~100 lineas por ruta, el resumen
 * del heroe, el cuerpo entero, la FAQ y las fuentes (que antes no existian) y las tarjetas de
 * «Most Read Articles». `TRADUCIDAS_A_PROPOSITO` es 1->1, `LINEAS_ANADIDAS` seria copiar aqui
 * el articulo entero por triplicado, y `REORDENADAS_A_PROPOSITO` exige una permutacion.
 *
 * ASI QUE SE HACE COMO RESEÑAS, BLOG Y CAPTACION: se DERIVA del mismo dato que pinta la pagina
 * —`src/data/blogs-sanity.json`— y el FORMATEO se reescribe aqui: `capitalize` de h1..h4 (el
 * de `webflow.css`), las celdas de una tabla en una linea separadas por espacio (asi lo da
 * `innerText`), `Common questions` y `Sources` como los emite `[slug].astro`, y las tarjetas
 * como titulo capitalizado + resumen + «Read More». Si el componente cambia una etiqueta o el
 * orden, esto se pone ROJO — que es lo que tiene que pasar.
 *
 * NO ES «IGNORA ESTAS RUTAS», y la diferencia esta en dos cosas: (1) la lista de rutas es
 * EXPLICITA y vive en `src/data/blog-reescritos.json` con su motivo; un heredado que cambie en
 * Sanity y no este declarado sigue saliendo rojo. (2) Solo se sustituye el tramo entre el h1 y
 * el CTA de cierre; el menu, el CTA, el pie y todo lo demas se siguen comparando contra el
 * baseline congelado caracter a caracter. Y los dos anclajes tienen que casar EXACTAMENTE una
 * vez, o la ruta sale roja en vez de declararse a medias.
 */
const REESCRITOS = (() => {
  const f = path.join(RAIZ, 'src/data/blog-reescritos.json');
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')).rutas ?? {}) : {};
})();
const CACHE_BLOG_REESCRITOS = (() => {
  const f = path.join(RAIZ, 'src/data/blogs-sanity.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
})();
/** La misma normalizacion que `textoNormalizado()`: nbsp -> espacio, blancos colapsados, trim. */
const normLinea = (s) => String(s ?? '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
/** El `innerText` del cuerpo de un articulo, bloque a bloque, como lo emite `portable-text.mjs`. */
function lineasCuerpoArticulo(bloques, ruta) {
  const out = [];
  for (const b of bloques ?? []) {
    if (b._type === 'image') { if (b.pie) out.push(normLinea(b.pie)); continue; }
    if (b._type === 'tabla') {
      for (const f of b.filas ?? []) { const l = normLinea((f.celdas ?? []).join(' ')); if (l) out.push(l); }
      continue;
    }
    if (b._type !== 'block') throw new Error(`check-texto: ${ruta} trae un bloque "${b._type}" que no se sabe modelar`);
    const texto = normLinea((b.children ?? []).map((s) => s.text ?? '').join(''));
    if (!texto) continue;
    const estilo = b.style ?? 'normal';
    out.push(!b.listItem && /^h[1-4]$/.test(estilo) ? capitaliza(texto) : texto);
  }
  return out;
}
/** Las lineas que la pagina reescrita pinta entre el h1 y el CTA de cierre, derivadas del cache. */
function lineasArticuloReescrito(ruta) {
  const p = CACHE_BLOG_REESCRITOS.find((x) => `/blogs/${x.slug}` === ruta);
  if (!p) throw new Error(`check-texto: ${ruta} esta en blog-reescritos.json y no en blogs-sanity.json`);
  const faq = (p.faq ?? []).filter((f) => f?.question?.trim() && f?.answer?.trim());
  const fuentes = (p.fuentes ?? []).filter((f) => f?.label?.trim() && f?.url?.trim());
  const rel = (p.relacionados ?? []).filter((r) => r?.slug && r?.portada);
  return [
    capitaliza(normLinea(p.title)), normLinea(p.summary),
    ...lineasCuerpoArticulo(p.blog, ruta),
    ...(faq.length ? [capitaliza('Common questions'), ...faq.flatMap((f) => [capitaliza(normLinea(f.question)), normLinea(f.answer)])] : []),
    ...(fuentes.length ? ['Sources', ...fuentes.map((f) => normLinea(f.label))] : []),
    'Most Read Articles',
    ...rel.flatMap((r) => [capitaliza(normLinea(r.title)), normLinea(r.summary), 'Read More']),
  ];
}
let reescritosCasados = 0;
let reescritoFallo = null;
const CIERRE_ARTICULO = 'Request A Design-Build Project Evaluation';
/** Sustituye en el baseline el tramo h1..CTA por el derivado. `null` si los anclajes no casan. */
function reescribeArticulo(ruta, lineas) {
  const d = REESCRITOS[ruta];
  if (!d) return lineas;
  reescritoFallo = null;
  const p = CACHE_BLOG_REESCRITOS.find((x) => `/blogs/${x.slug}` === ruta);
  const h1 = p ? capitaliza(normLinea(p.title)) : null;
  /* El h1 se busca por PRIMERA aparicion: 7 de los 10 heredados se enlazaban a si mismos en
   * «Most Read Articles», asi que su titulo sale dos veces en el baseline, y la segunda cae
   * dentro del tramo que se sustituye. Lo que no puede pasar es que salga DESPUES del cierre:
   * entonces el anclaje no seria el h1 y la ruta sale roja en vez de declararse a medias. */
  const ini = h1 === null ? -1 : lineas.indexOf(h1);
  const fin = ini < 0 ? -1 : lineas.indexOf(CIERRE_ARTICULO, ini + 1);
  if (ini < 0) { reescritoFallo = `articulo reescrito: el h1 «${h1}» no esta en el baseline`; return null; }
  if (fin < 0) { reescritoFallo = `articulo reescrito: no esta el cierre «${CIERRE_ARTICULO}» tras el h1`; return null; }
  if (lineas.indexOf(h1, fin) >= 0) {
    reescritoFallo = `articulo reescrito: el h1 «${h1}» vuelve a salir DESPUES del cierre; el anclaje no es fiable`;
    return null;
  }
  reescritosCasados++;
  return [...lineas.slice(0, ini), ...lineasArticuloReescrito(ruta), ...lineas.slice(fin)];
}

/** Diferencia legible entre dos textos, línea a línea. */
/**
 * T-69 · LOS ROTULOS EN VERSALITAS (D-135, 12-oct-2026). `.mm-etiqueta` y `.mm-dato-rot` pintan su
 * texto en mayusculas por CSS (`uppercase`, D-31) y eso altera `innerText`: «Trusted by Florida's
 * finest homeowners» se mide «TRUSTED BY FLORIDA'S FINEST HOMEOWNERS». Una linea medida que es la
 * esperada ENTERA en mayusculas, en su misma posicion, se da por la misma — solo en las 141 rutas
 * de `/services/`, contandola y listandola a la vista.
 *
 * Hasta D-135 esta funcion daba por iguales dos lineas que solo cambiaran de mayusculas, fueran
 * lo que fueran: 4 839 lineas en la corrida de las 141, casi todas titulares que el rediseno
 * habia dejado de capitalizar. Eso ya no vale: los titulares se pintan como en la referencia
 * (`text-transform: capitalize`, al final de `sistema.css`) y aqui tienen que salir IGUALES.
 */
let soloMayusculas = 0;
/** Que lineas son, para que el recuento de T-69 se pueda leer y no solo contar (D-135). */
const rotulosT69 = new Map();
function sinMayusculasDeCss(ruta, esperado, hay) {
  // Las rutas ya migradas a las piezas nuevas: las 141 de servicio y, desde ASTRO-4, las 15 de
  // proyecto y los 47 articulos (las cabeceras de sus tablas).
  if (!/^\/(services|project|blogs)\//.test(ruta) && ruta !== '/') return esperado;
  const medidas = hay.split('\n');
  const esperadas = esperado.split('\n');
  /* POR POSICION cuando las dos listas miden lo mismo, que es el caso de una ruta en verde: la
   * misma cadena sale a veces con dos formas en la pagina («Request A Design-Build…» en un boton y
   * «Request a Design-Build…» en un titular), y casar por contenido las cruzaba. */
  if (medidas.length === esperadas.length) {
    return esperadas.map((l, k) => {
      // D-135: solo los rotulos en VERSALITAS (`.mm-etiqueta`, `.mm-dato-rot`: `uppercase` por
      // CSS). La linea medida tiene que ser la esperada entera en mayusculas; un titular que
      // cambie de mayusculas ya no se da por bueno.
      if (l === medidas[k] || medidas[k] !== l.toUpperCase()) return l;
      soloMayusculas++;
      rotulosT69.set(medidas[k], (rotulosT69.get(medidas[k]) ?? 0) + 1);
      return medidas[k];
    }).join('\n');
  }
  // Si no miden lo mismo la ruta sale roja igual, y sin posicion no se sabe que linea es un rotulo:
  // no se da nada por bueno (casar por contenido cruzaba «Get a free estimate» con el rotulo del formulario).
  return esperado;
}

/**
 * ASTRO-2 · PROCESO Y «WHAT WE DO» EN LISTA DE PLANO, sobre LO MEDIDO de las 14 fichas.
 *
 * PROCESO (T-46, T-32). El baseline trae `linea, 1, 2, 3, 4, titulo 1, texto 1`: en Webflow solo
 * se veia el paso activo. Ahora se ven los cuatro, cada numero con su paso, y la cabecera lleva
 * la accion de la pagina. Lo medido tiene que ser EXACTAMENTE
 *     linea, accion, 1, titulo 1, texto 1, 2, titulo 2, texto 2, 3, …, 4, …
 * con los ocho textos leidos del origen (`_source/vivo`), y entonces se devuelve a la forma del
 * baseline. Si un paso no casa con el origen, no se toca nada y la ruta sale roja.
 *
 * «WHAT WE DO» (T-47). La accion va tras la linea de cabecera, delante del titulo de la fila 1; se
 * quita. Y los titulos de fila se devuelven a la forma capitalizada con la que estan declarados
 * (R22-DETALLE, § LINEAS_ANADIDAS): el HTML no ha cambiado, el `capitalize` de Webflow si (T-69).
 */
/**
 * ASTRO-2 · EL ORDEN DE LAS LAMINAS Y EL CIERRE FUNDIDO, sobre LO ESPERADO de las 14 fichas.
 * Tres cosas cambian de sitio o salen respecto a como dejan el baseline las funciones de arriba:
 *   · el proceso sube delante de «What we do» (va justo detras de la galeria);
 *   · la cabecera de las resenas baja detras de «Where We Serve» (va justo delante del cierre);
 *   · la banda final pierde su boton «Get A Free Estimate» (T-57): tiene el formulario pegado.
 * Los tramos se localizan por el texto del ORIGEN (`_source/vivo`), no por posicion. Si alguno no
 * esta tal cual, no se toca nada de ese paso y la ruta sale roja.
 */
const ORIGEN_FICHA = new Map();
function origenDeFicha(ruta) {
  if (!ORIGEN_FICHA.has(ruta)) {
    const f = path.join(RAIZ, `_source/vivo/${aSlug(origen(ruta))}.html`);
    const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
    const t = (q) => (d.querySelector(q)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    ORIGEN_FICHA.set(ruta, {
      galeria: t('section.gallery .header-gallery h2 + div'),
      procesoTit: t('section.process-section .process-header h2'),
      resenas: [t('section.testimonial-section .header-reviews .label'), t('section.testimonial-section .header-reviews h2'), t('section.testimonial-section .header-reviews p')],
      cierre: [t('section.cta-footer .wrapper-vertical-text h2'), t('section.cta-footer .text-block-3')],
    });
  }
  return ORIGEN_FICHA.get(ruta);
}
function ordenFicha(ruta, lineas) {
  if (esCiudadA(ruta)) {
    /* CIUDADES (lamina «Ciudad»). De lo que sale del baseline solo cambia de sitio la cabecera de las
     * resenas (rotulo, titular, parrafo), que baja justo delante de la banda final; y la banda pierde
     * su boton (T-57). Lo demas que se mueve son bloques declarados, que se descuentan esten donde
     * esten. */
    const out = [...lineas];
    const t = out.indexOf('TESTIMONIALS');
    let c = out.findIndex((l) => l.startsWith(CIERRE_CIUDAD)) - 1;
    if (t >= 0 && c > t + 2) {
      const cab = out.splice(t, 3);
      c -= 3;
      out.splice(c, 0, ...cab);
      c += 3;
    }
    if (c >= 0 && out[c + 2] === 'Get A Free Estimate') out.splice(c + 2, 1);
    return out;
  }
  if (esCondado(ruta)) {
    /* CONDADOS (ASTRO-2, lamina «Ciudad»). Del baseline cambian de sitio tres bloques, sin perder
     * ni una linea: la galeria sube delante del 3D; y de la cola —banda, proyectos, resenas,
     * articulos— la cabecera de resenas baja detras de los articulos y la banda (titular,
     * parrafo y su boton, que aqui se conserva) cierra la pagina. Cada bloque por su ancla
     * exacta; si alguna no esta, no se toca nada y la puerta sale roja por orden. */
    const out = [...lineas];
    const { titulo: proc, tresD } = pasosDelOrigen(ruta);
    const d3 = out.findIndex((l) => l.toLowerCase() === tresD.toLowerCase());
    if (d3 >= 0 && out[d3 + 4]?.toLowerCase() === proc.toLowerCase()) out.splice(d3, 0, ...out.splice(d3 + 2, 2));
    const b = out.findIndex((l) => l.startsWith(CIERRE_CIUDAD)) - 1;
    const t = out.indexOf('TESTIMONIALS');
    // Los articulos son lo ultimo del contenido: su ultimo «Read More» es el final del bloque.
    if (b >= 0 && t > b && out.lastIndexOf('Read More') > t && out[b + 2] === 'Get A Free Estimate') {
      const cab = out.splice(t, 3);
      const banda = out.splice(b, 3);
      out.splice(out.lastIndexOf('Read More') + 1, 0, ...cab, ...banda);
    }
    return out;
  }
  if (!esFicha(ruta)) return lineas;
  const o = origenDeFicha(ruta);
  let out = [...lineas];
  const mueve = (bloque, destinoDe) => {
    const i = out.findIndex((_, k) => bloque.every((l, j) => out[k + j].toLowerCase() === l.toLowerCase()));
    if (i < 0) return;
    const tramo = out.splice(i, bloque.length);
    const d = destinoDe();
    if (d < 0) { out.splice(i, 0, ...tramo); return; }
    out.splice(d, 0, ...tramo);
  };
  const { linea, pasos } = pasosDelOrigen(ruta);
  mueve([o.procesoTit, linea, '1', '2', '3', '4', ...pasos[0]], () => out.indexOf(o.galeria) + 1 || -1);
  mueve(o.resenas, () => out.findIndex((l, k) => l.toLowerCase() === o.cierre[0].toLowerCase() && out[k + 1] === o.cierre[1]));
  const c = out.indexOf(o.cierre[1]);
  if (c >= 0 && out[c + 1] === 'Get A Free Estimate') out.splice(c + 1, 1);
  /* ANTES/DESPUES LADO A LADO (D-96, D-120; solo `/services/pool-remodeling`). El bloque del baseline
   * es «Before, After, titular, parrafo, tarjeta 1 (2 lineas), tarjeta 2 (2 lineas), View All
   * Projects, Get A Free Estimate». Ahora van titular, parrafo y los dos enlaces en la cabecera, las
   * dos fotos con su rotulo y las dos tarjetas. Las mismas diez lineas. */
  const ia = out.findIndex((l, k) => l === 'Before' && out[k + 1] === 'After' && out[k + 8] === 'View All Projects' && out[k + 9] === 'Get A Free Estimate');
  if (ia >= 0) {
    const [antes, despues, tit, par, t1, p1, t2, p2, ver, pedir] = out.slice(ia, ia + 10);
    out.splice(ia, 10, tit, par, pedir, ver, antes, despues, t1, p1, t2, p2);
  }
  return out;
}

const PASOS_ORIGEN = new Map();
function pasosDelOrigen(ruta) {
  if (!PASOS_ORIGEN.has(ruta)) {
    const f = path.join(RAIZ, `_source/vivo/${aSlug(origen(ruta))}.html`);
    const doc = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
    const limpia = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    // Las fichas traen `process-section`; los condados, el mismo proceso en pestanas (`stepbystep-section`).
    const sec = doc.querySelector('section.process-section');
    const tab = sec ? null : doc.querySelector('section.stepbystep-section');
    PASOS_ORIGEN.set(ruta, sec ? {
      linea: limpia(sec.querySelector('.process-header p')),
      pasos: [...sec.querySelectorAll('.process-content-item')].map((it) => [
        limpia(it.querySelector('.content-step-tab h2')),
        ...[...it.querySelectorAll('.w-richtext p')].map(limpia).filter(Boolean),
      ]),
    } : {
      titulo: limpia(tab.querySelector('.wrapper-vertical-text h2')),
      // El titular del 3D cambia de un condado a otro («… & Visualization», «… & Planning»).
      tresD: limpia(doc.querySelector('section._3d-section h2')),
      linea: limpia(tab.querySelector('.wrapper-vertical-text p')),
      pasos: [...tab.querySelectorAll('.w-tab-pane')].map((it) => [
        limpia(it.querySelector('.content-step-tab h2')),
        ...[...it.querySelectorAll('.text-divider p')].map(limpia).filter(Boolean),
      ]),
    });
  }
  return PASOS_ORIGEN.get(ruta);
}
const PRIMER_ARTICULO = (JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8')).posts[0]?.titulo ?? '')
  .replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const TEXTO_BANDA_CAT = 'See pools, pergolas and outdoor kitchens we have built for Florida homeowners.';   // `TEXTO_BANDA` de galeria-categorias.mjs
/** Como empieza el parrafo de la banda final de las paginas de ciudad (texto fijo de la plantilla). */
const CIERRE_CIUDAD = 'Share your property details, project scope, and investment range.';
/**
 * ASTRO-4 · LA FICHA DE PROYECTO (laminas «Proyecto» y «ProyectoDetalle»), sobre LO MEDIDO de las
 * 15 rutas de `/project/`. El texto de la obra no cambia —titular, relato, «Project Details» con
 * sus tres datos y su boton, y la banda final—; lo que la ficha GANA se comprueba entero y en su
 * sitio, y solo entonces se descuenta (T-87):
 *   · los dos telefonos, detras del boton de «Project Details» (T-56);
 *   · «More Projects» (T-60, D-86): titular, entradilla, «See All Projects», las tres obras
 *     destacadas y el indice de las demas, sin la obra de la propia ruta y en el orden en que las
 *     pinta `CarruselProyectos.astro`;
 *   · en la banda final, los dos telefonos EN LUGAR del boton, que sale porque debajo hay
 *     formulario (T-57, D-82): se devuelve el boton a su sitio para casar con la referencia;
 *   · el formulario en dos pasos de la ficha de piscinas (D-82), con sus mismas lineas.
 * Si un tramo no esta tal cual, no se toca y la ruta sale roja.
 */
const SOLO_EN_INDICE_PROYECTOS = 'luxury-pool-spa-screen-enclosure-north-florida';
/** El titulo de una obra como texto: las propias traen `titulo`; las migradas, solo `tituloHtml`. */
const tituloObra = (o) => o.titulo ?? o.tituloHtml.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function fichaProyectoTexto(ruta, lineas) {
  const out = [...lineas];
  const tels = TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]);
  const hayTels = (k) => tels.every((l, x) => out[k + x] === l);
  /* Lo declarado es OBLIGATORIO: un tramo que falta mete una linea que no casa con nada y la ruta
   * sale roja diciendo cual. Sin esto la puerta fallaba ABIERTA. */
  const faltas = [];
  const quita = (bloque, que) => {
    const i = out.findIndex((_, k) => bloque.every((l, j) => out[k + j] === l));
    if (i >= 0) out.splice(i, bloque.length); else faltas.push(que);
  };
  const d = out.indexOf('Project Details');
  const b = d < 0 ? -1 : out.indexOf('Get A Free Estimate', d);
  if (b > d && hayTels(b + 1)) out.splice(b + 1, tels.length); else faltas.push('los dos telefonos de «Project Details» (T-56)');
  const lee = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data', f), 'utf8')).obras;
  const lista = [...lee('proyectos-propios.json').filter((o) => o.enCarrusel !== false), ...lee('obras-migradas.json')]
    .filter((o) => o.slug !== ruta.split('/')[2]);
  const destacadas = lista.filter((o) => o.slug !== SOLO_EN_INDICE_PROYECTOS).slice(0, 3);
  quita(['More Projects',
    'Selected custom pool and outdoor living projects from our Florida portfolio, to inspire your design.',
    'See All Projects',
    ...[...destacadas, ...lista.filter((o) => !destacadas.includes(o))].flatMap((o) => [capitaliza(tituloObra(o)), 'See Project'])],
  '«More Projects» con sus obras, en el orden del componente (T-60)');
  const c = out.findIndex((l) => l.startsWith(CIERRE_CIUDAD));
  if (c >= 0 && hayTels(c + 1)) out.splice(c + 1, tels.length, 'Get A Free Estimate'); else faltas.push('los dos telefonos de la banda final (T-57)');
  quita(formularioNuevo(CAPTACION_JSON['/services/pool-builders']), 'el formulario en dos pasos (D-82)');
  return [...out, ...faltas.map((f) => `⟦FALTA: ${f}⟧`)];
}

/**
 * ASTRO-4 · EL ARTICULO (laminas «Articulo», «CuerpoArticulo» y «Relacionados»), sobre LO MEDIDO de
 * las 47 rutas de `/blogs/`. Titular, resumen, cuerpo, FAQ, fuentes, «Most Read Articles» con sus
 * tarjetas y la banda final son los de la referencia, en su orden. Lo que el articulo GANA se
 * comprueba entero y en su sitio, y solo entonces se descuenta (T-88):
 *   · la tarjeta de accion (T-49, D-84, D-97), entre el cuerpo y «Most Read Articles»: su rotulo,
 *     sus dos botones y los dos telefonos;
 *   · los dos telefonos de la banda final, detras de su boton (T-56).
 * Las cabeceras de las tablas se pintan en versalitas (S11) y las cuenta T-69.
 * Si un tramo no esta tal cual, no se toca y la ruta sale roja.
 */
function articuloTexto(ruta, lineas) {
  const out = [...lineas];
  const tels = TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]);
  const tarjeta = ['POOL COST ESTIMATOR', 'Request A Design-Build Project Evaluation', 'Try The Pool Cost Estimator', ...tels];
  /* Lo declarado es OBLIGATORIO: si un tramo falta o no esta en su sitio, entra una linea que no
   * casa con nada y la ruta sale roja diciendo cual. Sin esto la puerta fallaba ABIERTA. */
  const m = out.indexOf('Most Read Articles') - tarjeta.length;
  if (m >= 0 && tarjeta.every((l, j) => out[m + j] === l)) out.splice(m, tarjeta.length);
  else out.push('⟦FALTA: la tarjeta de accion del articulo (T-49), delante de «Most Read Articles»⟧');
  const c = out.findIndex((l) => l.startsWith(CIERRE_CIUDAD));
  if (c >= 0 && out[c + 1] === 'Get A Free Estimate' && tels.every((l, x) => out[c + 2 + x] === l)) out.splice(c + 2, tels.length);
  else out.push('⟦FALTA: los dos telefonos de la banda final (T-56), detras de su boton⟧');
  return out;
}

/**
 * ASTRO-4 · LA HOME (lamina «Home»), sobre LO MEDIDO de `/`. Ninguna cadena cambia; cambian de
 * sitio, de forma o de numero, y cada cosa se comprueba ENTERA y en su orden antes de devolver lo
 * medido a la forma de la referencia (T-89). Lo que falte mete una linea que no casa con nada.
 *   · hero: los cuatro sellos pasan de delante del titular a detras de los botones;
 *   · servicios: de pestanas a indice (D-69, como T-82): la ficha abierta delante y los 14
 *     nombres a la vista bajo el rotulo de su grupo (7 que antes escondia la pestana);
 *   · antes/despues: baja detras de las zonas, con sus enlaces en la cabecera (D-96);
 *   · 3D, obras, articulos y resenas ganan la accion de la pagina en su cabecera; la banda
 *     repetida a media pagina sale (T-50: su parrafo y su boton), y las obras y las resenas
 *     ganan los dos telefonos (T-56);
 *   · obras: «See All Projects» sube a la cabecera;
 *   · zonas: suben detras de las obras, norte delante, cada una con su telefono;
 *   · articulos: los tres primeros con resumen y los otros siete en indice, sin el (T-44);
 *   · cierre: los telefonos en lugar del boton (T-57) y, detras, el formulario (D-82).
 */
function homeTexto(lineas) {
  let out = [...lineas];
  const faltas = [];
  const ACC = 'Request A Design-Build Project Evaluation';
  const GFE = 'Get A Free Estimate';
  const tels = TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]);
  const son = (k, bloque) => bloque.every((l, j) => out[k + j] === l);
  const nm = (x) => (x ?? '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  // 1 · hero
  const SELLOS = ['Licensed & Insured', 'Financing Available', '3D Design', 'North & South Florida'];
  const s0 = out.findIndex((_, k) => son(k, SELLOS) && out[k - 1] === 'Project Gallery' && out[k - 2] === ACC);
  if (s0 >= 4) { out.splice(s0, 4); out.splice(s0 - 4, 0, ...SELLOS); } else faltas.push('los cuatro sellos del hero, detras de sus dos botones');
  // 2 · servicios
  {
    const dp = SERVICIOS_CAT['/'];
    const visto = new Set();
    const porGrupo = dp.categorias.map((c) => { const suyos = dp.servicios.filter((sv) => sv.categorias.includes(c.slug) && !visto.has(sv.id)); suyos.forEach((sv) => visto.add(sv.id)); return suyos; });
    const act = porGrupo[0][0];
    const ficha = [nm(act.titulo), nm(act.texto), nm(act.cta), `: ${nm(act.titulo)}`];
    const nuevo = [nm(dp.titulo), nm(dp.subtitulo), ...ficha, ...dp.categorias.flatMap((c, k) => [nm(c.nombre), ...porGrupo[k].map((sv) => nm(sv.nombre))])];
    const igual = (x, y) => x !== undefined && x.toLowerCase() === y.toLowerCase();
    const i = out.findIndex((_, k) => nuevo.every((l, j) => igual(out[k + j], l)));
    const deLaPestana = dp.servicios.filter((sv) => sv.categorias.includes(dp.categorias[0].slug));
    if (i >= 0) out.splice(i, nuevo.length, out[i], out[i + 1], ...dp.categorias.map((c) => nm(c.nombre)), ...deLaPestana.flatMap((sv) => (sv.id === act.id ? [nm(sv.nombre), ...ficha] : [nm(sv.nombre)])));
    else faltas.push('el indice de los 14 servicios con la primera ficha abierta (D-69)');
  }
  // 3 · el orden de las secciones del final: zonas, antes/despues, articulos, resenas, cierre
  const posts = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/blogs.json'), 'utf8')).posts;
  const zi = out.indexOf('WHERE WE SERVE');
  const bai = out.indexOf('Before & After Transformations');
  const bli = out.findIndex((l, k) => k > bai && out[k + 2] === ACC && out[k + 3] === capitaliza(nm(posts[0].titulo)));
  const ri = out.findIndex((l, k) => k > bli && l === 'TESTIMONIALS');
  const ci = out.findIndex((l, k) => k > ri && l === ACC && (out[k + 1] ?? '').startsWith(CIERRE_CIUDAD));
  const d3 = out.indexOf('3D Pool Design & Visualization');
  if (!(d3 > 0 && d3 < zi && zi < bai && bai < bli && bli < ri && ri < ci)) return [...out, ...faltas.map((f) => `⟦FALTA: ${f}⟧`), '⟦FALTA: el orden de la home (3D, obras, zonas, antes/despues, articulos, resenas, cierre)⟧'];
  const Z = out.slice(zi, bai); const BA = out.slice(bai, bli); const BL = out.slice(bli, ri); const R = out.slice(ri, ci); const FIN = out.slice(ci);
  const parrafoBanda = FIN[1];
  // zonas: rotulo, lema y dos zonas de titulo, parrafo, telefono (rotulo + numero) y enlace; norte delante
  let Zv = null;
  if (Z.length === 12 && Z[2] === 'North Florida' && Z[4] === 'NORTH FLORIDA' && Z[7] === 'South Florida' && Z[9] === 'SOUTH FLORIDA'
    && Z[5] === TELEFONOS.items.find((t) => t.zona === 'North Florida').visible && Z[10] === TELEFONOS.items.find((t) => t.zona === 'South Florida').visible) {
    Zv = ['Where We Serve', Z[1], Z[7], Z[8], Z[11], Z[2], Z[3], Z[6]];
  } else faltas.push('las dos zonas con su telefono, norte delante');
  // antes/despues: titular, parrafo, los dos enlaces, los dos rotulos de foto y las dos tarjetas
  let BAv = null;
  if (BA.length === 10 && BA[2] === GFE && BA[3] === 'View All Projects' && BA[4] === 'Before' && BA[5] === 'After' && BA[6] === 'DESIGN-BUILD AUTHORITY' && BA[8] === 'LICENSED & ENGINEERED') {
    BAv = ['Before', 'After', BA[0], BA[1], 'Design-Build Authority', BA[7], 'Licensed & Engineered', BA[9], 'View All Projects', GFE];
  } else faltas.push('el antes/despues lado a lado con sus enlaces en la cabecera (D-96)');
  // articulos: cabecera con la accion, tres con resumen y siete en indice
  let BLv = null;
  {
    const t = (p) => capitaliza(nm(p.titulo));
    const nuevo = [BL[0], BL[1], ACC, ...posts.slice(0, 3).flatMap((p) => [t(p), nm(p.resumen), 'Read More', `: ${t(p)}`]), ...posts.slice(3).flatMap((p) => [t(p), 'Read More', `: ${t(p)}`])];
    if (BL.length === nuevo.length && nuevo.every((l, k) => BL[k] === l)) BLv = [BL[0], BL[1], ...posts.flatMap((p) => [t(p), nm(p.resumen), 'Read More', `: ${t(p)}`])];
    else faltas.push('los articulos: tres con resumen y siete en indice, con la accion en la cabecera (T-44)');
  }
  // resenas: la accion delante de «See all reviews» y los telefonos al final
  let Rv = null;
  {
    const m = R.indexOf(RESENAS_MARCADOR);
    if (m > 0 && R[m - 1] === ACC && tels.every((l, k) => R[R.length - tels.length + k] === l)) Rv = [...R.slice(0, m - 1), ...R.slice(m, R.length - tels.length)];
    else faltas.push('las resenas con la accion en la cabecera y los dos telefonos al final');
  }
  // cierre: telefonos en lugar del boton y, detras, el formulario
  let FINv = null;
  {
    const form = formularioNuevo(CAPTACION_JSON['/services/pool-builders']);
    if (tels.every((l, k) => FIN[2 + k] === l) && form.every((l, k) => FIN[2 + tels.length + k] === l)) FINv = [FIN[0], FIN[1], GFE, ...FIN.slice(2 + tels.length + form.length)];
    else faltas.push('el cierre con los dos telefonos y el formulario en dos pasos (T-57, D-82)');
  }
  // cabeza: hasta las zonas. El 3D gana la accion y pierde detras la banda repetida (T-50); las
  // obras, como en las paginas de ciudad (accion y «See All Projects» arriba, telefonos tras las tres).
  let cab = out.slice(0, zi);
  {
    const k = cab.indexOf('3D Pool Design & Visualization');
    if (cab[k + 2] === ACC && cab[k + 3] === 'Project Showcase') cab.splice(k + 3, 0, parrafoBanda, GFE);
    else faltas.push('la accion de la pagina en la cabecera del 3D');
    if (BAv) cab.splice(k, 0, ...BAv);
    const sap = cab.findIndex((l, x) => l === 'See All Projects' && cab[x - 1] === ACC);
    if (sap > 0) {
      cab.splice(sap - 1, 2);
      let x = sap - 1; let vistos = 0;
      const hayTels = (y) => tels.every((l, j) => cab[y + j] === l);
      while (cab[x + 1] === 'See Project' || hayTels(x)) { if (hayTels(x)) { cab.splice(x, tels.length); vistos++; } else x += 2; }
      cab.splice(x, 0, 'See All Projects');
      if (vistos !== 1) faltas.push('los dos telefonos detras de las tres obras destacadas');
    } else faltas.push('la accion y «See All Projects» en la cabecera de las obras');
  }
  return [...cab, ...(Rv ?? R), ...(Zv ?? Z), ...(BLv ?? BL), ...(FINv ?? FIN), ...faltas.map((f) => `⟦FALTA: ${f}⟧`)];
}

/**
 * ASTRO-4 lote B · LA GALERIA (laminas «Galeria» y «GaleriaCategoria»), sobre LO MEDIDO de `/gallery`
 * y de sus diez categorias. Ninguna cadena cambia; lo que entra se comprueba entero y en su sitio
 * antes de descontarlo, y lo que falte pone la ruta en rojo (T-90):
 *   · la tesela de accion (D-100): «Seen something you like?», su boton y los dos telefonos. En el
 *     indice va una, detras de la sexta categoria; en cada categoria, una cada dos bloques del muro;
 *   · los dos telefonos junto a «More project galleries» y en la banda final (T-56);
 *   · en el indice, el hero deja de ir encima de la cabecera y entra en la pagina: se devuelve
 *     delante de ella, que es donde lo trae la referencia.
 */
function galeriaTexto(ruta, lineas) {
  const out = [...lineas];
  const faltas = [];
  const tels = TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]);
  const tesela = ['Seen something you like?', 'Get a free estimate', ...tels];
  const son = (k, bloque) => bloque.every((l, j) => out[k + j] === l);
  if (ruta === '/gallery') {
    const t = out.findIndex((l) => l.startsWith('Explore real custom pool and outdoor living projects'));
    const c = out.findIndex((l) => l === 'Skip to content' || l.startsWith('⟦cabecera'));
    if (t > 0 && c >= 0 && c < t && out[t - 1] === 'Project Gallery' && out[t + 1] === 'Browse by service') out.splice(c, 0, ...out.splice(t - 1, 2));
    else faltas.push('el hero del indice (titular y entradilla), justo delante de «Browse by service»');
    const k = out.indexOf('See decks');
    if (k >= 0 && son(k + 1, tesela) && out[k + 1 + tesela.length] === 'Landscaping') out.splice(k + 1, tesela.length);
    else faltas.push('la tesela de accion detras de la sexta categoria (D-100)');
    const b = out.findIndex((l, x) => l.startsWith(CIERRE_CIUDAD) && out[x + 1] === 'Get A Free Estimate');
    if (b >= 0 && son(b + 2, tels)) out.splice(b + 2, tels.length);
    else faltas.push('los dos telefonos de la banda final (T-56)');
  } else {
    const c = GAL_CATEGORIAS.find((x) => `/gallery/${x.slug}` === ruta);
    // Las mismas cuentas que `[categoria].astro`: bloque par, foto grande + tesela; impar, dos fotos; y tres detras.
    let teselas = 0;
    for (let i = 0, bloque = 0; i < c.fotos.length; bloque++) {
      if (bloque % 2 === 0) { i += 1; teselas++; } else i += Math.min(2, c.fotos.length - i);
      i += Math.min(3, c.fotos.length - i);
    }
    const m = out.indexOf('More project galleries');
    const ini = m - teselas * tesela.length;
    if (m > 0 && ini > 0 && Array.from({ length: teselas }, (_, j) => son(ini + j * tesela.length, tesela)).every(Boolean) && out[ini - 1] !== tesela.at(-1)) out.splice(ini, teselas * tesela.length);
    else faltas.push(`las ${teselas} teselas de accion del muro, delante de «More project galleries» (D-100)`);
    const m2 = out.indexOf('More project galleries');
    if (m2 >= 0 && son(m2 + 1, tels)) out.splice(m2 + 1, tels.length);
    else faltas.push('los dos telefonos junto a «More project galleries» (T-56)');
    const w = out.findIndex((l) => l.startsWith('Want the details first?'));
    if (w >= 0 && son(w + 1, tels)) out.splice(w + 1, tels.length);
    else faltas.push('los dos telefonos de la banda final (T-56)');
  }
  return [...out, ...faltas.map((f) => `⟦FALTA: ${f}⟧`)];
}

function listasStitch(ruta, lineas) {
  if (ruta === '/') return homeTexto(lineas);
  if (ruta === '/gallery' || ruta.startsWith('/gallery/')) return galeriaTexto(ruta, lineas);
  if (ruta.startsWith('/project/')) return fichaProyectoTexto(ruta, lineas);
  if (ruta.startsWith('/blogs/')) return articuloTexto(ruta, lineas);
  if (!ruta.startsWith('/services/')) return lineas;
  if (!esFicha(ruta)) {
    /* PAGINAS DE CIUDAD (T-47): la cabecera de articulos lleva la accion de la pagina, justo delante
     * del primer articulo. Se quita solo si esta ahi. (En las fichas el bloque de articulos es
     * declarado entero: § articulosEnLista.) */
    const out = [...lineas];
    const accion = capitalizaH2(CAPTACION_JSON[ruta]?.heroe?.cta ?? 'Get a Free Estimate');
    const j = out.indexOf(capitaliza(PRIMER_ARTICULO));   // D-135: `.mm-art-t` con `capitalize`
    if (j > 0 && out[j - 1] === accion) out.splice(j - 1, 1);
    /* PIEZAS COMPARTIDAS CON LA FICHA (T-29, T-47), cada una por su ancla exacta:
     *   · resenas: la accion de la cabecera va justo delante de «See all reviews»; los telefonos,
     *     justo detras de «Updated …»;
     *   · FAQ: los telefonos de la tarjeta, justo detras de su boton (que ya estaba al pie de la FAQ);
     *   · cierre: los telefonos, justo detras del parrafo de la banda final. */
    // En el orden de zonas de la ruta: las ciudades del sur pintan «South Florida» delante.
    const zonasRuta = CAPTACION_JSON[ruta]?.heroe?.zonas ?? (esCondado(ruta) ? zonasDeCondado(ruta) : TELEFONOS.items.map((x) => x.zona));
    const tels = zonasRuta.map((z) => TELEFONOS.items.find((x) => x.zona === z)).flatMap((t) => [t.zona.toUpperCase(), t.visible]);
    const hayTels = (k) => tels.every((l, x) => out[k + x] === l);
    const r = out.indexOf(RESENAS_MARCADOR);
    if (r > 0 && out[r - 1] === accion) out.splice(r - 1, 1);
    const u = out.findIndex((l) => /^Updated [A-Z][a-z]{2} \d{4}$/.test(l));
    if (u >= 0 && hayTels(u + 1)) out.splice(u + 1, tels.length);
    const ci = out.findIndex((l) => l.startsWith(CIERRE_CIUDAD));
    if (ci >= 0 && hayTels(ci + 1)) out.splice(ci + 1, tels.length);
    // GALERIA POR CATEGORIAS (D-79, D-100) y RENDER 3D: la accion de la pagina en la cabecera, justo
    // detras del parrafo de la banda y del parrafo del 3D.
    const pb = out.indexOf(TEXTO_BANDA_CAT);
    if (pb >= 0 && out[pb + 1] === accion) out.splice(pb + 1, 1);
    const p3 = out.findIndex((l) => l.toLowerCase() === (esCondado(ruta) ? pasosDelOrigen(ruta).tresD.toLowerCase() : '3d pool design & visualization'));
    if (p3 >= 0 && out[p3 + 2] === accion) out.splice(p3 + 2, 1);
    /* PROYECTOS (T-33, T-47): la cabecera lleva la accion y «See all Projects», que antes cerraba
     * el carrusel; detras de los tres destacados van los telefonos. Lo medido se devuelve a la
     * forma de siempre: sin la accion, sin los telefonos y con «See all Projects» al final de la
     * lista. Solo si el par esta en la cabecera y la lista es una sucesion de titulo + «See Project». */
    // D-135: el enlace se pinta «See All Projects», como en la referencia (`.mm-may`).
    const sap = out.findIndex((l, k) => l === 'See All Projects' && out[k - 1] === accion);
    if (sap > 0) {
      out.splice(sap - 1, 2);
      let k = sap - 1;
      while (out[k + 1] === 'See Project' || hayTels(k)) {
        if (hayTels(k)) out.splice(k, tels.length); else k += 2;
      }
      out.splice(k, 0, 'See All Projects');
    }
    /* GALERIA DE OBRA EN MOSAICO (T-81): su cabecera lleva la accion de la pagina y el enlace
     * «Project Gallery», justo detras de la entradilla. Se quitan solo si estan ahi, los dos. */
    const svCiudad = SERVICIOS_CIUDAD[ruta.split('/')[2]];
    {
      const g = { ...GALERIA_OBRA._defecto, ...(GALERIA_OBRA[ruta] ?? GALERIA_OBRA[svCiudad?.galeria] ?? {}) };
      // En condado la entradilla es la de su propia pagina: el par va justo delante del 3D.
      const tresD = esCondado(ruta) ? pasosDelOrigen(ruta).tresD.toLowerCase() : null;
      const k = out.findIndex((l, x) => (l === g.entradilla || (tresD && (out[x + 3] ?? '').toLowerCase() === tresD))
        && out[x + 1] === accion && out[x + 2] === 'Project Gallery');
      if (k >= 0) out.splice(k + 1, 2);
    }
    /* PROCESO DE CONDADO (T-85, D-134): las pestanas —un paso a la vista— pasan a lista con los
     * cuatro, y la cabecera lleva la accion de la pagina. Los rotulos `1` `2` `3` `4` de las
     * pestanas salen: el titulo de cada paso ya trae su «1. » y el circulo lo repetia. Se
     * comprueba el tramo nuevo ENTERO (linea, accion y los cuatro pasos con su titulo y su texto,
     * leidos del origen) y solo entonces se devuelve a lo que se veia: los cuatro rotulos y el
     * primer paso. */
    if (esCondado(ruta)) {
      const { linea, pasos } = pasosDelOrigen(ruta);
      const nuevo = [linea, accion, ...pasos.flat()];
      const i = out.findIndex((_, k) => nuevo.every((l, j) => out[k + j] === l));
      if (i >= 0) out.splice(i, nuevo.length, linea, ...pasos.map((_, k) => String(k + 1)), ...pasos[0]);
    }
    /* SERVICIOS (T-82, D-69; lamina «Servicios»). El panel pasa de pestanas a indice: los 14
     * nombres a la vista bajo el rotulo de su categoria (antes solo los de la pestana abierta),
     * la ficha abierta delante del indice, y la accion de la pagina en la cabecera en vez de al
     * pie. Se comprueba el tramo nuevo ENTERO y en su orden —titular, parrafo, accion, ficha y
     * los tres grupos con sus nombres— y solo si esta tal cual se devuelve a la forma de siempre
     * (pestanas, filas de la categoria por defecto con la ficha tras la primera, accion). Un
     * nombre que falte, uno de mas o una ficha distinta lo dejan sin tocar: sale rojo.
     *
     * D-129 (T-83): la ficha ABIERTA es la del servicio de la pagina, no la primera de su
     * categoria. En piscinas, pergolas y cocinas es la misma de antes; en remodelacion, techos
     * de lamas, decks y jardineria cambia: se exige la del servicio (`propia`) y lo que se
     * devuelve a la referencia es la que habia (`act`). */
    {
      const dp = SERVICIOS_CAT['/'];
      const nm = (x) => (x ?? '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      const act = dp.servicios.find((sv) => sv.categorias.includes(svCiudad?.categoria));
      if (act) {
        const visto = new Set();
        const grupos = dp.categorias.flatMap((c) => {
          const suyos = dp.servicios.filter((sv) => sv.categorias.includes(c.slug) && !visto.has(sv.id));
          suyos.forEach((sv) => visto.add(sv.id));
          return [nm(c.nombre), ...suyos.map((sv) => nm(sv.nombre))];
        });
        const fichaDe = (sv) => [nm(sv.titulo), nm(sv.texto), nm(sv.cta), `: ${nm(sv.titulo)}`];
        const propia = dp.servicios.find((sv) => sv.enlace === `/services/${ruta.split('/')[2]}`) ?? act;
        const ficha = fichaDe(act);
        const nuevo = [nm(dp.titulo), nm(dp.subtitulo), accion, ...fichaDe(propia), ...grupos];
        const igual = (x, y) => x !== undefined && x.toLowerCase() === y.toLowerCase();
        const i = out.findIndex((_, k) => nuevo.every((l, j) => igual(out[k + j], l)));
        if (i >= 0) {
          const deLaPestana = dp.servicios.filter((sv) => sv.categorias.includes(svCiudad.categoria));
          out.splice(i, nuevo.length, out[i], out[i + 1], ...dp.categorias.map((c) => nm(c.nombre)),
            ...deLaPestana.flatMap((sv) => (sv.id === act.id ? [nm(sv.nombre), ...ficha] : [nm(sv.nombre)])), accion);
        }
      }
    }
    const faq = CAPTACION_JSON[ruta]?.faq;
    if (faq?.titulo) {
      const f0 = out.findIndex((l) => l.toLowerCase() === faq.titulo.toLowerCase());
      const fb = f0 < 0 ? -1 : out.findIndex((l, k) => k > f0 && l === accion && hayTels(k + 1));
      if (fb >= 0) out.splice(fb + 1, tels.length);
    }
    return out;
  }
  const c = CAPTACION_JSON[ruta];
  const accion = capitalizaH2(c.heroe.cta ?? 'Get a Free Estimate');
  let out = [...lineas];
  const { linea, pasos } = pasosDelOrigen(ruta);
  const nuevo = [linea, accion, ...pasos.flatMap((p, k) => [String(k + 1), ...p])];
  const i = out.findIndex((_, k) => nuevo.every((l, j) => out[k + j] === l));
  if (i >= 0) {
    out.splice(i, nuevo.length, linea, ...pasos.map((_, k) => String(k + 1)), capitalizaH2(pasos[0][0]), ...pasos[0].slice(1));
  }
  // CIERRE (T-47): la banda final lleva los dos telefonos detras de su parrafo.
  {
    const tels = TELEFONOS.items.flatMap((t) => [t.zona.toUpperCase(), t.visible]);
    const z = out.indexOf(origenDeFicha(ruta).cierre[1]);
    if (z >= 0 && tels.every((l, j) => out[z + 1 + j] === l)) out.splice(z + 1, tels.length);
  }
  // ZONAS (T-70): cada zona lleva su telefono entre el parrafo y el enlace. Se quita el par
  // solo si va justo delante del enlace de ESA zona.
  for (const t of TELEFONOS.items) {
    const z = out.findIndex((l, j) => l === t.zona.toUpperCase() && out[j + 1] === t.visible
      && out[j + 2] === `View ${t.zona} Service Areas`);
    if (z >= 0) out.splice(z, 2);
  }
  const filas = c.servicios?.detalle ?? [];
  const k = filas.length ? out.indexOf(filas[0].titulo) : -1;
  if (k > 0 && out[k - 1] === accion) out.splice(k - 1, 1);
  for (const f of filas) { const j = out.indexOf(f.titulo); if (j >= 0) out[j] = capitalizaH2(f.titulo); }
  return out;
}

function diferencias(ruta, esperado, hay) {
  const a = esperado.split('\n'), b = hay.split('\n');
  const declaradas = new Set(QUITADAS_A_PROPOSITO
    .filter(([, , rutas]) => !rutas || rutas.includes(ruta))
    .map(([l]) => l));
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

/**
 * ── ORDEN-CIUDADES-2 (27179ce, 6-oct-2026): REORDENADO YA EN PRODUCCION, DECLARADO AQUI ────────
 *
 * Ese commit subio la banda «Project Gallery» de `PaginaCiudad.astro` delante de los
 * testimonios y actualizo `check-estructura-ciudades.mjs`, pero no esta puerta: las 55 rutas del
 * CSV con la plantilla de ciudad salian ROJAS en `origin/main` con «faltan 0, sobran 0 · linea
 * 19: orden cambiado» (STITCH-PARTE-5 §3.0, medido en /services/pool-builders/alachua-fl).
 *
 * Medido en STITCH-PARTE-7: es una ROTACION limpia de dos bloques contiguos. A = 26 lineas, de
 * «TESTIMONIALS» a «See All Projects»; B = las 14 de la banda de galeria, que empiezan en
 * «Project Gallery». El origen dice A+B; el build dice B+A. Mismas 40 lineas.
 *
 * Se deriva, no se enumera: la banda lleva el nombre de la ciudad, asi que 55 entradas a mano
 * serian 55 sitios donde equivocarse. Si una ruta de ciudad no tiene los dos bloques donde se
 * esperan, no se toca y sale roja por su propio pie.
 */
const BANDA_GALERIA_CIUDAD = 14;
function subeGaleriaCiudad(ruta, lineas) {
  if (!esCiudad(ruta)) return lineas;
  const i = lineas.indexOf('TESTIMONIALS');
  const j = i < 0 ? -1 : lineas.indexOf('Project Gallery', i);
  if (i < 0 || j < 0 || lineas[j - 1] !== 'See All Projects') return lineas;
  const b = lineas.slice(j, j + BANDA_GALERIA_CIUDAD);
  if (b.length !== BANDA_GALERIA_CIUDAD) return lineas;
  return [...lineas.slice(0, i), ...b, ...lineas.slice(i, j), ...lineas.slice(j + BANDA_GALERIA_CIUDAD)];
}

/* `--headless` (o MM_TEXTO_HEADLESS=1): la misma medicion sin ventana. OPCION EXPLICITA; por
 * defecto sigue siendo visible, que es como se capturo el baseline (ver `lib/captura.mjs`: con
 * ventana hay un puntero real y eventos que en headless no existen). Se anadio en ASTRO-1
 * (12-oct-2026) tras comprobar, en una ruta por familia, que da el mismo veredicto que la
 * visible; sirve para la corrida completa sin secuestrar la pantalla. */
const HEADLESS = process.argv.includes('--headless') || process.env.MM_TEXTO_HEADLESS === '1';
const nav = await chromium.launch({ headless: HEADLESS, args: ARGS_NAVEGADOR });
const ctx = await nav.newContext({ viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pag = await ctx.newPage();

let ok = 0, mal = 0, noCargaron = 0, conResenas = 0, conBlog = 0, conObras = 0, conFeed = 0;
let okPropias = 0, capturadas = 0, yaExistian = 0;
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

/** Las 79 rutas que montan `section.social-media`: home + 53 Ciudad + 14 servicios + 9 Condado
 *  + 2 Estado. Derivado del estado igual que los otros dos: con `items: []` se esperan 0, asi
 *  que vaciar el feed no obliga a editar la puerta. */
// ASTRO-2 (T-42): las 14 fichas de `/services/` ya no montan el feed de Instagram: 79 - 14.
const FEED_ESPERADAS = lineasFeed().length ? 65 : 0;

for (const ruta of RUTAS_A_MEDIR) {
  const slug = aSlug(ruta);
  const ref = path.join(RAIZ, 'baseline/text', `${slug}.txt`);
  const refPropia = path.join(DIR_PROPIO, `${slug}.txt`);
  /* Construida y sin referencia: ROJO antes de abrir nada. No hace falta cargar la pagina
   * para saber que no hay con que compararla. */
  if (PROPIAS.has(ruta) && !CAPTURAR_PROPIO && !fs.existsSync(refPropia)) {
    mal++;
    const causa = 'CONSTRUIDA Y SIN REFERENCIA DE TEXTO — no esta en baseline/text ni en baseline/text-propio';
    rojos.push({ ruta, falta: [], sobra: [], fuera: [causa] });
    console.log(`  ROJO ${ruta} — ${causa}`);
    continue;
  }
  if (PROPIAS.has(ruta) && CAPTURAR_PROPIO && fs.existsSync(refPropia)) {
    yaExistian++;
    console.log(`  --   ${ruta} — ya tiene referencia propia; NO se sobrescribe`);
    continue;
  }
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
  if (PROPIAS.has(ruta)) {
    let estP;
    try {
      await pag.bringToFront();
      estP = await asentar(pag);
    } catch (e) {
      mal++;
      const causa = `MURIO LA MEDICION — ${String(e.message ?? e).split('\n')[0]}`;
      rojos.push({ ruta, falta: [], sobra: [], fuera: [causa] });
      console.log(`  ROJO ${ruta} — ${causa}`);
      continue;
    }
    if (!estP.valida) { console.log(`  ROJO ${ruta} — medicion invalida ${JSON.stringify(estP.sonda)}`); mal++; continue; }
    const medido = (await textoNormalizado(pag)).trimEnd();
    if (CAPTURAR_PROPIO) {
      fs.mkdirSync(DIR_PROPIO, { recursive: true });
      fs.writeFileSync(refPropia, medido + '\n', { flag: 'wx' });   // 'wx': falla si existe
      capturadas++;
      console.log(`  capt ${ruta} — ${medido.split('\n').length} lineas`);
      continue;
    }
    const hayP = medidoPropio(ruta, medido.split('\n')).join('\n');
    const esperadoP = sinMayusculasDeCss(ruta, esperadoPropio(ruta, fs.readFileSync(refPropia, 'utf8').trimEnd().split('\n')).join('\n'), hayP);
    if (hayP === esperadoP) { ok++; okPropias++; console.log(`  ok   ${ruta}   (referencia propia)`); continue; }
    mal++;
    // `MM_TEXTO_VOLCAR=<dir>`: tambien las rutas de referencia propia (solo diagnostico).
    if (process.env.MM_TEXTO_VOLCAR) {
      fs.mkdirSync(process.env.MM_TEXTO_VOLCAR, { recursive: true });
      fs.writeFileSync(path.join(process.env.MM_TEXTO_VOLCAR, aSlug(ruta) + '.esperado.txt'), esperadoP);
      fs.writeFileSync(path.join(process.env.MM_TEXTO_VOLCAR, aSlug(ruta) + '.medido.txt'), hayP);
    }
    const dP = diferencias(ruta, esperadoP, hayP);
    rojos.push({ ruta, ...dP });
    console.log(`  ROJO ${ruta} — faltan ${dP.falta.length} lineas, sobran ${dP.sobra.length}   (referencia propia)`);
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

  const declaradas = new Set(QUITADAS_A_PROPOSITO
    .filter(([, , rutas]) => !rutas || rutas.includes(ruta))
    .map(([l]) => l));
  // SEO-SAFE: en los heredados reescritos el tramo h1..CTA del baseline se sustituye por el
  // derivado de Sanity (§ reescribeArticulo). Lo demas sigue saliendo del baseline congelado.
  const baseReescrita = reescribeArticulo(ruta, fs.readFileSync(ref, 'utf8').trimEnd().split('\n'));
  if (baseReescrita === null) {
    mal++;
    console.log(`  ROJO ${ruta} — ${reescritoFallo}`);
    rojos.push({ ruta, falta: [reescritoFallo], sobra: [], fuera: [] });
    continue;
  }
  const sinOcultas = quitaOcultasDelIndice(ruta, quitaAntesDespues(ruta, baseReescrita));
  if (sinOcultas === null) {
    mal++;
    console.log(`  ROJO ${ruta} — ${ocultasFallo}`);
    rojos.push({ ruta, falta: [ocultasFallo], sobra: [], fuera: [] });
    continue;
  }
  const esperadoCrudo = ordenFicha(ruta, subeGaleriaCiudad(ruta, reordena(ruta, heroAStitch(ruta, cascaronStitch(piePropio(ctaHeroe(ruta,
    sinOcultas
      .filter((l) => !declaradas.has(l)).map((l) => traduce(ruta, l))))))))).join('\n');
  const bruto = (await textoNormalizado(pag)).trimEnd();
  if (bruto.includes(RESENAS_MARCADOR)) conResenas++;
  if (enBlogRutas(ruta) && lineasBlog(ruta).length
      && bruto.includes(lineasBlog(ruta)[0])) conBlog++;
  /* POR LINEA, NO POR SUBCADENA, y no es purismo: `bruto` es una cadena y el marcador es
   * `@mrandmrsoutdoorliving`, que vive DENTRO de `info@mrandmrsoutdoorliving.com` en el pie
   * de /contact-us, /articles/terms-conditions y /articles/accessibility — tres rutas que no
   * montan el feed. Con `bruto.includes` el contador daba 82 y esta puerta salia ROJA
   * acusando de «se ha colado en alguna ruta de mas». El descuento de `sinElBloque` nunca
   * estuvo afectado: alli se compara sobre el ARRAY, o sea linea completa. */
  if (lineasFeed().length && bruto.split('\n').includes(lineasFeed()[0])) conFeed++;
  const hay = sinElBloque(ruta, listasStitch(ruta, marcaCabecera(bruto.split('\n'))).join('\n'));
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
  const esperado = sinMayusculasDeCss(ruta, esperadoCrudo, hay);
  if (hay === esperado) {
    ok++;
    console.log(`  ok   ${ruta}${ANADIDAS_A_PROPOSITO[ruta] ? '   (con el bloque declarado de '
      + ANADIDAS_A_PROPOSITO[ruta].bloque + ')' : ''}`);
    continue;
  }

  mal++;
  const d = diferencias(ruta, esperado, hay);
  rojos.push({ ruta, ...d });
  /* `MM_TEXTO_DIFF=1`: vuelca esperado/medido alrededor de la primera linea distinta. Solo
   * diagnostico (SEO-REMEDIACION, 4-oct-2026); no cambia el veredicto. */
  /* `MM_TEXTO_VOLCAR=<dir>`: escribe esperado y medido enteros de cada ruta en rojo. Solo
   * diagnostico (REDISEÑO STITCH, ASTRO-1); no cambia el veredicto. */
  if (process.env.MM_TEXTO_VOLCAR) {
    fs.mkdirSync(process.env.MM_TEXTO_VOLCAR, { recursive: true });
    fs.writeFileSync(path.join(process.env.MM_TEXTO_VOLCAR, aSlug(ruta) + '.esperado.txt'), esperado);
    fs.writeFileSync(path.join(process.env.MM_TEXTO_VOLCAR, aSlug(ruta) + '.medido.txt'), hay);
  }
  if (process.env.MM_TEXTO_DIFF) {
    const a = esperado.split('\n'); const b = hay.split('\n');
    const k = a.findIndex((l, i) => l !== b[i]);
    for (let i = Math.max(0, k - 2); i < k + Number(process.env.MM_TEXTO_DIFF_N ?? 6); i++) console.log(`     ${i + 1}  esp: ${(a[i] ?? '').slice(0, 90)}\n         hay: ${(b[i] ?? '').slice(0, 90)}`);
  }
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
if (soloMayusculas) {
  console.log(`\n  --   T-69: ${soloMayusculas} linea(s) de rotulo en VERSALITAS (\`uppercase\` de CSS: .mm-etiqueta, .mm-dato-rot, cabeceras de .mm-tabla), dadas por la misma.`);
  console.log(`       Solo cuenta la linea medida que es la esperada ENTERA en mayusculas (D-135). Son ${rotulosT69.size} rotulo(s) distinto(s):`);
  for (const [l, n] of [...rotulosT69].sort((a, b) => b[1] - a[1])) console.log(`         ${String(n).padStart(4)} × ${l.slice(0, 70)}`);
}
if (CAPTURAR_PROPIO) {
  console.log(`\n  CAPTURA DE REFERENCIA PROPIA: ${capturadas} escritas · ${yaExistian} ya existian y no se tocaron`
    + ` · ${mal} fallidas   (${RUTAS_PROPIAS.length} rutas propias)\n`);
  process.exit(mal ? 1 : 0);
}
console.log(`\n  ${ok} identicas · ${mal} en rojo   (${ok + mal}/${RUTAS_A_MEDIR.length} rutas medidas:`
  + ` ${RUTAS.length} con referencia de Webflow + ${RUTAS_PROPIAS.length} con referencia propia, ${okPropias} de ellas en verde)`);

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
if (reescritosCasados) {
  console.log(`\n  ok   articulos reescritos (SEO-SAFE): ${reescritosCasados} ruta(s) con el tramo h1..CTA `
    + 'derivado de src/data/blogs-sanity.json; declaradas por su nombre en src/data/blog-reescritos.json');
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

/* Contador del sufijo oculto. No hay numero esperado: depende de cuantos CTA genericos monte
 * cada ruta y de cual sea la ficha de servicios abierta. Lo que si esta cerrado es el otro
 * lado — un sufijo que no case se queda puesto y pone la ruta roja. */
if (sufijosQuitados) {
  console.log(`  ok   sufijos: ${sufijosQuitados} linea(s) de \`.mm-sr\` descontadas `
    + '(derivadas de blogs.json + servicios-categoria.json)');
}

/* Contador del feed. Mismo criterio que los dos anteriores y misma omision en corrida acotada. */
if (filtro.length) {
  if (conFeed) console.log(`\n  --   feed: contador OMITIDO (corrida acotada). Salio en ${conFeed}.`);
} else if (conFeed !== FEED_ESPERADAS) {
  mal++;
  console.log(`\n  ROJO feed: el bloque sale en ${conFeed} ruta(s) y se esperaban ${FEED_ESPERADAS}.`
    + `\n       ${conFeed > FEED_ESPERADAS
      ? 'se ha colado en alguna ruta de mas'
      : 'alguna de las 79 ha dejado de montar el feed'}.`);
} else if (FEED_ESPERADAS) {
  console.log(`  ok   feed: bloque declarado de ${lineasFeed().length} lineas, `
    + `descontado en las ${conFeed} rutas que lo montan`);
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
for (const d of REORDENADAS_A_PROPOSITO) {
  console.log(`     declarado ${d.ruta ?? d.rutas.join(' ')}: orden de [${d.despues.length} lineas]`
    + ` — ${d.motivo}`);
}
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} pagina(s)`}\n`);
process.exit(mal ? 1 : 0);
