#!/usr/bin/env node
/**
 * PUERTA de la Fase 9 — el `<head>` de las 115 contra `baseline/seo.json`.
 *
 *     npm run check:seo
 *
 * Es ESTÁTICA a propósito: lee el HTML construido, no abre navegador. El `<head>` no lo toca
 * ningún JS en este sitio, así que meter un navegador solo añadiría 13 minutos y una fuente de
 * fallos que no aporta nada.
 *
 * QUÉ SE EXIGE IDÉNTICO
 *   · `<title>` y `meta description`, carácter a carácter
 *   · todos los `og:*` y `twitter:*` que el origen tenga
 *   · el JSON-LD, comparado con las CLAVES ORDENADAS para que el orden no cause falsos rojos
 *
 * QUÉ SE EXIGE DISTINTO, Y POR QUÉ
 *   · **La canónica.** El sitio vivo NO tiene ni una en las 115 — comprobado. La Fase 9 del
 *     encargo las pide, así que son una ADICIÓN DELIBERADA. Aquí se exige que existan y que
 *     apunten a la propia página; comparar contra el baseline daría rojo en las 115 por algo
 *     que hicimos a propósito.
 *   · **Las URLs de imagen** de `og:image`/`twitter:image` apuntan a este dominio, no al CDN
 *     de Webflow. Se comparan por el NOMBRE del fichero, que es lo que tiene que coincidir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { esPropia, conPropias } from './lib/rutas-propias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';

/**
 * M2 — los `<title>` que se apartan del origen, con su motivo. Tiene que casar con
 * `TITULO_PROPIO` de `build-paginas.mjs`, que es quien los escribe.
 */
const TITULO_PROPIO_M2 = new Map([
  ['/project/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida',
    'Luxury Pool with Motorized Pergola & Outdoor Kitchen | North Florida'],
  ['/project/luxury-pool-motorized-pergola-screen-enclosure-north-florida',
    'Luxury Pool with Motorized Pergola & Screen Enclosure | North Florida'],
  ['/project/luxury-pool-spa-screen-enclosure-north-florida',
    'Luxury Pool & Spa with Screen Enclosure & Outdoor Kitchen | North Florida'],
]);

/**
 * SEO-AEO-GEO F1 — las `meta` que se apartan del origen, con su motivo. Espejo de
 * `TITULO_PROPIO`, y por la misma razon: la paridad byte a byte con Webflow protegia tambien
 * los defectos del origen, y una description de 188 caracteres que el SERP corta a la mitad es
 * un defecto. Tiene que casar con `META_PROPIA` de `build-paginas.mjs`, que es quien las
 * escribe en las rutas derivadas; en las de `NO_REGENERAR` (`/`, las 53 de `/pool-builders/`
 * y las 2 de `/where-we-serve/`) la escribe su propio `.astro` o Sanity.
 *
 * Es un Map de ruta a un OBJETO por clave, no a una cadena: `og:description` y
 * `twitter:description` tambien viven en `baseline/seo.json` y se pondrian rojas igual si solo
 * se declarara `description`.
 *
 * La otra mitad de esta excepcion la pone `check-medicion.mjs`, que exige que las 122
 * descripciones sean UNICAS y no tiene mecanismo de declaracion: una description nueva que
 * choque con otra pagina sale roja alli aunque este declarada aqui.
 */
const META_PROPIA = new Map(
  Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/meta-propia.json'), 'utf8')))
    .filter(([r]) => r !== '_')
    .map(([r, v]) => [r, {
      ...(v.title ? { 'og:title': v.title, 'twitter:title': v.title } : {}),
      ...(v.description
        ? { description: v.description, 'og:description': v.description, 'twitter:description': v.description }
        : {}),
    }]),
);
/** Los `<title>` propios salen de la misma fuente, para que no haya dos listas que mantener. */
const TITULO_DE_META = new Map(
  Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/meta-propia.json'), 'utf8')))
    .filter(([r, v]) => r !== '_' && v.title)
    .map(([r, v]) => [r, v.title]),
);

/**
 * Las dos fuentes de `<title>` declarado, unidas: M2 (los que el origen repetia) y F1 (los que
 * el origen traia demasiado largos o apuntando a la intencion equivocada). El consumo es el
 * mismo para las dos; lo que cambia es el motivo, y cada una lo dice por pantalla por separado.
 */
const TITULO_PROPIO = new Map([...TITULO_PROPIO_M2, ...TITULO_DE_META]);
/** Todos los titulos vistos, para exigir que NINGUNO se repita. */
const titulosVistos = new Map();

const ref = JSON.parse(fs.readFileSync(path.join(RAIZ, 'baseline/seo.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

/**
 * El baseline guarda las URLs del CDN de Webflow; el build las tiene ya locales. Para
 * comparar peras con peras se traduce el BASELINE con el manifiesto — que es el mismo mapa
 * que uso el generador — en vez de recortar nombres a ojo. Si una URL del baseline no esta en
 * el manifiesto, se deja tal cual y la diferencia sale: eso es una URL que nadie migro.
 */
const aLocal = (t) => String(t).replace(
  /https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g,
  (u) => {
    while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1);
    // `industry-solutions` repite el id de sitio en la ruta (defecto del origen, ya anotado en
    // la Fase 2: la URL con el id duplicado da 403). El manifiesto guarda la normalizada.
    const norm = u.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/');
    return man[u]?.publico ?? man[norm]?.publico ?? u;
  });
const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));

/**
 * `/pool-investment-estimator` no es una página de Webflow: es la app de Webflow Cloud, con su
 * propio `<head>` de 4 etiquetas. No tiene og:* ni JSON-LD que comparar, ni en el origen.
 */
const SIN_HEAD_DE_WEBFLOW = new Set(['/pool-investment-estimator']);

/**
 * `/thank-you` LLEVA `noindex` TAMBIEN EN PRODUCCION, y es lo correcto: una pagina de gracias
 * indexada la alcanza gente que no ha enviado nada, y entonces o cuenta conversiones falsas o
 * —peor— sale en Google en vez de la pagina de servicio que si vende.
 *
 * Estaba sin declarar, asi que esta puerta la daba ROJA en cada pasada en modo produccion por
 * hacer exactamente lo que se le pide. Se declara aqui, y ademas al reves: si algun dia PIERDE
 * el noindex, tambien es rojo.
 */
const NOINDEX_A_PROPOSITO = new Set(['/thank-you']);

/**
 * EL HOST DE LAS CANONICAS, para cotejarlo despues con el del sitemap.
 *
 * POR QUE ES UNA PUERTA Y NO UN COMENTARIO. Las canonicas salen de `astro.config.mjs` y el
 * sitemap de `scripts/build-seo-ficheros.mjs`, y hasta hoy el segundo llevaba el host A FUEGO.
 * O sea: se podia cambiar el dominio en un sitio y dejar el otro atras sin que nada fallara,
 * y el sintoma —Google recibe dos hosts distintos para el mismo sitio y reparte la autoridad
 * entre ambos— no aparece en ningun rojo, solo semanas despues en Search Console.
 */
const hostsCanonicos = new Set();
/** Cuantos bloques de JSON-LD se inyectaron, para decirlo por pantalla al final. */
let ldInyectados = 0;

/**
 * ── PARTES DE JSON-LD ANADIDAS A PROPOSITO ────────────────────────────────────────────────
 *
 * `/projects` enseña 15 obras desde que se publicaron las 5 propias (3-sep-2026), y su
 * `hasPart` crece con ellas: dejarlo en 10 seria decirle a Google que la pagina tiene 10 partes
 * mientras muestra 15, o sea marcado que miente. El baseline tiene 10 y no se re-baseliniza —es
 * el `<head>` del Webflow de origen—, asi que la diferencia se DECLARA aqui.
 *
 * NO ES «IGNORA ESTE BLOQUE», y la diferencia importa. Se quitan EXACTAMENTE las N primeras
 * entradas de la clave declarada, exigiendo que sean ESTAS y EN ESTE ORDEN; a partir de ahi el
 * bloque entero —las 10 partes del origen, su orden y todas las demas claves— se compara
 * caracter a caracter como siempre. Si el origen pierde una parte, sigue saliendo rojo.
 *
 * A LAS PARTES ANADIDAS SE LES CAMBIA EL CRITERIO, NO SE LES QUITA. Es el mismo trato que esta
 * puerta da ya a una ruta propia: como no hay baseline contra el que compararlas, se exige que
 * ESTEN —`name`, `description` e `image.url` no vacios—. Una parte vacia es un `hasPart` que
 * ocupa sitio y no dice nada, y es justo lo que nadie iria a mirar.
 *
 * El orden tiene que ser el mismo que el de las tarjetas, y lo es por construccion: las dos
 * listas salen de `src/data/proyectos-propios.json` en `build-paginas.mjs` (§ OBRAS_PROPIAS).
 */
const PARTES_PROPIAS = {
  '/projects': {
    bloque: 0,
    clave: 'hasPart',
    urls: [
      '/project/luxury-pool-raised-spa-travertine-deck-south-florida',
      '/project/estate-pool-spa-sun-shelf-north-florida',
      '/project/pool-raised-spa-marble-deck-south-florida',
      '/project/luxury-pool-spa-aluminum-pergola-south-florida',
      '/project/aluminum-patio-cover-pool-deck-south-florida',
    ],
    motivo: 'Las 5 obras de autoria propia del 3-sep-2026. Las inserta `build-paginas.mjs` '
      + '(§ OBRAS_PROPIAS) al principio del `hasPart`, en el mismo orden que sus tarjetas.',
  },
};

/**
 * ── JSON-LD ARREGLADO A PROPOSITO (R17-CORE) ─────────────────────────────────────────────
 *
 * Esta puerta compara el JSON-LD del origen CARACTER A CARACTER, y hace bien: es lo que impide
 * que una regeneracion se lleve por delante un dato estructurado sin que nadie se entere. El
 * efecto secundario es que tambien replica fielmente los DEFECTOS del origen, y la landing de
 * pago del Core traia cinco:
 *
 *   · `about.serviceType` decia «Smart Soffit LED Lighting Installation» — el serviceType de
 *     OTRA ficha, dentro del dato estructurado de la pagina de piscinas;
 *   · `about.name` llevaba un doble espacio;
 *   · `about.image` llevaba un TEXTO ALT en un campo que espera una URL;
 *   · `dateModified` era ANTERIOR a `datePublished`;
 *   · la quinta `Question` del `FAQPage` se llamaba literalmente «construction», y su respuesta
 *     publicaba «$75,000 … $500,000+» — que la hoja 18 del libro de Ads marca DATA NOT
 *     AVAILABLE y que choca con la decision TILA/Reg Z del 2-sep-2026.
 *
 * NO ES «IGNORA ESTE BLOQUE», y esa es toda la diferencia. Se declara el valor VIEJO y el
 * NUEVO: si el origen deja de traer el viejo -porque alguien lo arreglo en Webflow, o porque
 * cambio otra cosa- la declaracion deja de casar y esto vuelve a ROJO. Y el valor nuevo se
 * exige tal cual en el build. Todo lo demas del bloque se sigue comparando caracter a caracter.
 */
const JSONLD_ARREGLADO = {
  '/services/custom-pool-spa-builders-in-north-south-florida': {
    bloque: 0,
    motivo: 'R17-CORE: cinco defectos del origen en la landing de pago del ad group «Pool '
      + 'Builders Core», mas las 3 preguntas anadidas para que el FAQPage siga coincidiendo con '
      + 'lo que se ve.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation', 'Custom Pool Construction'],
      ['about.name', 'Pool  Construction', 'Pool Construction'],
      ['about.image', 'New pool and spa construction in Florida by licensed custom pool builders',
        '/images/projects/estate-pool-spa-sun-shelf-north-florida/estate-pool-spa-sun-shelf-north-florida-project-2.avif'],
      ['dateModified', '2026-05-18T19:50:50.150Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:50:50.150Z'],
      ['mainEntity.mainEntity.4.name', 'construction', 'Can I finance a custom pool project in Florida?'],
    ],
    /* La respuesta 5 se sustituye entera y las tres nuevas se anaden al final. Se EXIGE que las
     * anadidas tengan nombre y respuesta no vacios y que no repitan cifras de dinero: una
     * declaracion que no comprueba nada es un agujero con comentario. */
    respuestaSustituida: { camino: 'mainEntity.mainEntity.4.acceptedAnswer.text', empiezaPor: 'We connect qualified Florida homeowners' },
    anadidas: { camino: 'mainEntity.mainEntity', n: 3 },
  },

  /* R19 — LAS 13 FICHAS RESTANTES. Los mismos tres defectos del origen, ficha por ficha y con
   * sus valores REALES, sacados de comparar el JSON-LD construido contra `baseline/seo.json`
   * y no de suponer que son iguales:
   *
   *   · `about.serviceType` dice otro servicio. En las catorce fichas pone el mismo texto,
   *     «Smart Soffit LED Lighting Installation», tambien en la de pergolas y en la de
   *     piscinas: es un valor pegado en el Webflow de origen.
   *   · `about.image` trae una FRASE donde va una URL. Un `ImageObject`/`image` con prosa no
   *     es una imagen para nadie que lea el marcado.
   *   · `dateModified` y `datePublished` van CAMBIADOS: el origen publica despues de modificar.
   *
   * Aqui NO hay `respuestaSustituida` ni `anadidas`: esta ficha no reescribe ni anade preguntas
   * -no se inventa una FAQ para rellenar-, asi que su `FAQPage` es el del origen intacto. */
  '/services/custom-aluminum-pergola-builders-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en la ficha de pergolas de aluminio.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Custom Aluminum Pergola Design & Installation'],
      ['about.image', 'Custom aluminum pergolas built by outdoor living contractors in Florida.',
        '/images/projects/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida-3.avif'],
      ['dateModified', '2026-05-19T13:22:48.310Z', '2026-05-19T13:23:24.377Z'],
      ['datePublished', '2026-05-19T13:23:24.377Z', '2026-05-19T13:22:48.310Z'],
    ],
  },
  '/services/custom-deck-builders-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Custom Deck Design & Construction'],
      ['about.image', 'Custom deck construction by professional outdoor living contractors in Florida.',
        '/images/projects/pool-raised-spa-marble-deck-south-florida/pool-raised-spa-marble-deck-south-florida-project-4.avif'],
      ['dateModified', '2026-05-18T19:51:19.984Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:51:19.984Z'],
    ],
  },
  '/services/custom-outdoor-kitchens-for-north-south-florida-homes': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Custom Outdoor Kitchen Design & Construction'],
      ['about.image', 'Custom outdoor kitchen built by professional outdoor kitchen builders in Florida.',
        '/images/projects/luxury-pool-pergola-outdoor-kitchen-south-florida/luxury-pool-pergola-outdoor-kitchen-south-florida-3.avif'],
      ['dateModified', '2026-05-18T19:49:53.727Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:49:53.727Z'],
    ],
  },
  '/services/motorized-louvered-roof-systems-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Motorized Louvered Roof Design & Installation'],
      ['about.image', 'Motorized louvered roof system installed by custom outdoor living contractors in Florida',
        '/images/projects/modern-pool-motorized-pergola-south-florida/modern-pool-motorized-pergola-south-florida-project-4.avif'],
      ['dateModified', '2026-05-18T19:52:59.092Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:52:59.092Z'],
    ],
  },
  '/services/motorized-retractable-screens-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Motorized Retractable Screen Installation'],
      ['about.image', 'Retractable screens installed by professional outdoor living contractors in Florida.',
        '/images/projects/luxury-pool-motorized-pergola-screens-south-florida/luxury-pool-motorized-pergola-screens-south-florida-4.avif'],
      ['dateModified', '2026-05-18T19:54:35.687Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:54:35.687Z'],
    ],
  },
  '/services/patio-screen-rooms-enclosures-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Patio Screen Room Design & Construction'],
      ['about.image', 'Screened patio enclosure creating a comfortable outdoor living space in Florida.',
        '/images/projects/luxury-pool-spa-with-screen-enclosure-north-florida/luxury-pool-spa-screen-enclosure-north-florida-project-2.avif'],
      ['dateModified', '2026-05-18T19:53:43.448Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:53:43.448Z'],
    ],
  },
  '/services/pool-screen-enclosures-for-north-south-florida-pools': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Pool Screen Enclosure Design & Installation'],
      ['about.image', 'Pool screen enclosures installed by licensed Florida enclosure contractors',
        '/images/projects/luxury-pool-spa-screen-enclosure-north-florida/luxury-pool-spa-screen-enclosure-outdoor-kitchen-florida-2.avif'],
      ['dateModified', '2026-05-18T19:49:53.691Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:49:53.691Z'],
    ],
  },
  '/services/pool-remodeling-renovation-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en la Final URL del ad group «Full Remodel».',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Pool Remodeling & Renovation'],
      ['about.image', 'Pool and spa renovation enhancing a Florida backyard outdoor living contractors space.',
        '/images/projects/estate-pool-spa-sun-shelf-north-florida/estate-pool-spa-sun-shelf-north-florida-project-3.avif'],
      ['dateModified', '2026-05-18T19:54:16.970Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:54:16.970Z'],
    ],
  },
  '/services/premium-outdoor-furniture-for-north-south-florida-homes': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Premium Outdoor Furniture Supply & Installation'],
      ['about.image', 'Teak dining set and wicker lounge chairs on Florida patio.',
        '/images/projects/residential-pool-pergola-outdoor-dining-north-florida/residential-pool-pergola-outdoor-dining-north-florida-3.avif'],
      ['dateModified', '2026-05-18T19:53:23.229Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:53:23.229Z'],
    ],
  },
  '/services/professional-landscaping-services-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Landscape Design & Installation'],
      ['about.image', 'Professional landscaping services designed for Florida residential properties.',
        '/images/projects/residential-pool-pergola-outdoor-dining-north-florida/residential-pool-pergola-outdoor-dining-north-florida-6.avif'],
      ['dateModified', '2026-05-18T19:49:53.745Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:49:53.745Z'],
    ],
  },
  '/services/smart-irrigation-system-installation-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Smart Irrigation System Installation'],
      ['about.image', 'Professional automated irrigation system installation for tropical landscapes in Florida. Efficient watering solutions designed to protect lawns, plants, and landscaping year-round',
        '/images/projects/estate-pool-spa-sun-shelf-north-florida/estate-pool-spa-sun-shelf-north-florida-project-4.avif'],
      ['dateModified', '2026-05-18T19:50:08.396Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:50:08.396Z'],
    ],
  },
  '/services/smart-soffit-led-lighting-installation-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Smart Soffit & LED Lighting Installation'],
      ['about.image', 'Smart soffit LED lighting installed by professional outdoor lighting contractors in Florida.',
        '/images/projects/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida-5.avif'],
      ['dateModified', '2026-05-18T19:55:20.436Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:55:20.436Z'],
    ],
  },
  '/services/steel-building-pole-barn-construction-in-north-south-florida': {
    bloque: 0,
    motivo: 'R19: los tres defectos del origen en esta ficha.',
    cambios: [
      ['about.serviceType', 'Smart Soffit LED Lighting Installation',
        'Steel Building & Pole Barn Construction'],
      ['about.image', 'Steel building construction providing durable structures for Florida properties.',
        '/images/projects/aluminum-patio-cover-pool-deck-south-florida/aluminum-patio-cover-pool-deck-south-florida-project-1.avif'],
      ['dateModified', '2026-05-18T19:54:59.712Z', '2026-05-18T19:55:49.094Z'],
      ['datePublished', '2026-05-18T19:55:49.094Z', '2026-05-18T19:54:59.712Z'],
    ],
  },
};

/** Lee/escribe por camino con puntos: `mainEntity.mainEntity.4.name`. */
const porCamino = (o, c) => c.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const ponCamino = (o, c, v) => {
  const ks = c.split('.');
  const ult = ks.pop();
  const padre = ks.reduce((x, k) => (x == null ? x : x[k]), o);
  if (padre != null) padre[ult] = v;
};
let partesCasadas = 0;
let arregladosCasados = 0;

/**
 * LAS RUTAS DE AUTORIA PROPIA no tienen entrada en `baseline/seo.json` y no pueden tenerla:
 * no existen en el origen. La tentacion es saltarlas enteras, y seria un error — la canonica
 * y el `noindex` son justo lo que hay que vigilar en una pagina nueva, porque es la que puede
 * colarse indexada desde una preview. Asi que se les cambia el criterio, no se les quita:
 * donde a las 115 se les exige que el `<head>` COINCIDA con el del origen, a estas se les
 * exige que ESTE — titulo y descripcion no vacios— y despues pasan por el mismo bloque de
 * canonica/noindex que todas. Ver `lib/rutas-propias.mjs`.
 */

let fallos = 0, ok = 0;
const rojos = [];
const nombre = (u) => String(u).split('/').pop().split('?')[0].toLowerCase();
const ordena = (v) => (Array.isArray(v) ? v.map(ordena)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordena(v[k])])) : v);

for (const ruta of conPropias(RUTAS)) {
  const f = [path.join(ESTATICO, ruta + '.html'), path.join(ESTATICO, ruta, 'index.html'),
    path.join(ESTATICO, ruta === '/' ? 'index.html' : '')].find((c) => c && fs.existsSync(c));
  if (!f) { rojos.push([ruta, ['no esta construida']]); fallos++; continue; }
  const propia = esPropia(ruta);
  const esperado = ref[ruta];
  if (!esperado && !propia) { rojos.push([ruta, ['no hay baseline de SEO']]); fallos++; continue; }

  const d = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  const problemas = [];

  const titulo = d.querySelector('title')?.textContent ?? '';
  if (propia) {
    // No hay con que comparar: se exige que EXISTAN, no que coincidan.
    if (!titulo.trim()) problemas.push('title vacio');
    if (!(d.querySelector('meta[name=description]')?.content ?? '').trim()) {
      problemas.push('meta description vacia');
    }
    /**
     * QUE EL JSON-LD ESTE Y PARSEE. Es lo unico exigible sin baseline, y tapa un agujero real:
     * el resto de este fichero NO corre para una ruta propia —se salta og/twitter y el JSON-LD
     * entero—, asi que si alguien clona una de las 8 fichas de `/project/` que emiten JSON-LD
     * roto (salto de linea literal sin escapar, heredado del scrape), la ficha nueva heredaria
     * el defecto Y la exencion, y no lo cazaria nadie.
     */
    const bl = [...d.head.querySelectorAll('script[type="application/ld+json"]')];
    if (!bl.length) problemas.push('sin JSON-LD');
    bl.forEach((b, i) => {
      try { JSON.parse(b.textContent); } catch { problemas.push(`JSON-LD ${i} NO PARSEA`); }
    });
  } else if (TITULO_PROPIO.has(ruta)) {
    /**
     * M2 — TRES TITULOS QUE SE APARTAN DEL ORIGEN A PROPOSITO.
     *
     * El origen repetia el mismo `<title>` en dos pares de fichas de `/project/`, asi que la
     * paridad estricta obligaba a repetirlo tambien aqui: dos paginas compitiendo por la misma
     * consulta, con el defecto blindado por la puerta que deberia protegerlo.
     *
     * Lo que se exige a estas tres NO se relaja, cambia de referencia: en vez de «igual al
     * origen», **el titulo declarado**, que ademas tiene que seguir siendo UNICO en el sitio.
     * Sin la segunda mitad, esta excepcion seria una puerta abierta.
     */
    const esperadoPropio = TITULO_PROPIO.get(ruta);
    if (titulo !== esperadoPropio) problemas.push(`title propio: "${esperadoPropio}" -> "${titulo}"`);
  } else if (titulo !== esperado.title) problemas.push(`title: "${esperado.title}" -> "${titulo}"`);
  titulosVistos.set(titulo, [...(titulosVistos.get(titulo) ?? []), ruta]);

  if (!propia && !SIN_HEAD_DE_WEBFLOW.has(ruta)) {
    const hay = {};
    for (const m of d.head.querySelectorAll('meta[property],meta[name]')) {
      const k = m.getAttribute('property') || m.getAttribute('name');
      if (/^(og:|twitter:|description$|robots$|keywords$)/.test(k)) hay[k] = m.content;
    }
    for (const [k, v] of Object.entries(esperado.meta ?? {})) {
      if (k === 'robots') continue;                    // lo gobierna el interruptor de indexacion
      const m = hay[k];
      if (m === undefined) { problemas.push(`falta ${k}`); continue; }
      const propioMeta = META_PROPIA.get(ruta);
      if (propioMeta && k in propioMeta) {
        // Declarada: la referencia deja de ser el origen y pasa a ser el valor declarado. La
        // regla NO se relaja, cambia de patron — igual que en `TITULO_PROPIO`.
        if (m !== propioMeta[k]) {
          problemas.push(`${k} propio: "${String(propioMeta[k]).slice(0, 50)}" -> "${String(m).slice(0, 50)}"`);
        }
        continue;
      }
      const esImagen = /^(og:image|twitter:image)/.test(k);
      if (esImagen ? nombre(m) !== nombre(aLocal(v)) : m !== v) {
        problemas.push(`${k}: "${String(v).slice(0, 50)}" -> "${String(m).slice(0, 50)}"`);
      }
    }
    /**
     * M18 (auditoria 5-sep-2026) — LA TARJETA SOCIAL, ADICION DELIBERADA.
     *
     * El origen no emitia og:image en sus 18 paginas estaticas, asi que al pegar /, /about,
     * /contact-us o /gallery en WhatsApp, Facebook o Slack la tarjeta salia sin foto — justo
     * en las paginas que mas se comparten a mano. `Base.astro` rellena ahora las tres claves
     * SOLO cuando la pagina no trae la suya, asi que las 104 que si la heredan del origen se
     * siguen comparando caracter a caracter.
     *
     * Se declara igual que la canonica, que tambien es una adicion que el origen no tenia.
     * Lo que NO se permite es cualquier otra meta inventada: la lista es cerrada.
     */
    const META_ANADIDAS = new Set(['og:image', 'twitter:image', 'twitter:card']);
    const sobra = Object.keys(hay).filter((k) => k !== 'robots'
      && !META_ANADIDAS.has(k) && !(k in (esperado.meta ?? {})));
    if (sobra.length) problemas.push(`meta de mas: ${sobra.join(', ')}`);

    // JSON-LD: mismo numero de bloques y mismo contenido con las claves ordenadas.
    const todos = [...d.head.querySelectorAll('script[type="application/ld+json"]')];
    /**
     * ── BLOQUES DE JSON-LD INYECTADOS A PROPOSITO (F3) ──────────────────────────────────
     *
     * `Base.astro` anade a TODAS las paginas el nodo del negocio (`#negocio`) y, donde procede,
     * la miga (`#miga`). El origen de Webflow no traia ninguno de los dos: `sameAs` valia 0 en
     * las 122 y `BreadcrumbList` salia en 1 de 122.
     *
     * Se separan por su `@id`, no por posicion ni por contarlos: asi los del origen se siguen
     * comparando caracter a caracter y esta excepcion no puede convertirse en un perdon
     * general. Y no basta con descontarlos — se EXIGE que esten y que lleven lo que los hace
     * utiles, porque un bloque inyectado vacio seria peor que ninguno.
     */
    const esInyectado = (b) => {
      try { return /#(negocio|miga)$/.test(JSON.parse(b.textContent)['@id'] ?? ''); }
      catch { return false; }
    };
    const inyectados = todos.filter(esInyectado);
    const bloques = todos.filter((b) => !esInyectado(b));
    const espLd = esperado.jsonLd ?? [];

    const neg = inyectados.map((b) => JSON.parse(b.textContent)).find((x) => x['@id'].endsWith('#negocio'));
    if (!neg) problemas.push('falta el bloque de negocio (#negocio) que Base.astro debe inyectar');
    else {
      if (neg['@type'] !== 'LocalBusiness') problemas.push(`#negocio: @type "${neg['@type']}", se esperaba LocalBusiness`);
      if (!Array.isArray(neg.sameAs) || !neg.sameAs.length) problemas.push('#negocio: sameAs vacio — es la pieza que sostiene la entidad');
      if (!neg.telephone || !neg.telephone.length) problemas.push('#negocio: sin telephone');
      if (!String(neg.name ?? '').trim()) problemas.push('#negocio: sin name');
      // Nada de campos vacios: un GeoCoordinates o un PostalAddress sin contenido es ruido.
      for (const c of ['address', 'geo', 'aggregateRating']) {
        if (c in neg && !Object.keys(neg[c] ?? {}).filter((k) => k !== '@type').length) {
          problemas.push(`#negocio: ${c} presente pero vacio — se omite o se rellena, no se deja a medias`);
        }
      }
    }
    const mig = inyectados.map((b) => JSON.parse(b.textContent)).find((x) => x['@id'].endsWith('#miga'));
    if (mig) {
      if (mig['@type'] !== 'BreadcrumbList') problemas.push(`#miga: @type "${mig['@type']}"`);
      if (!Array.isArray(mig.itemListElement) || mig.itemListElement.length < 2) problemas.push('#miga: menos de 2 escalones');
    } else if (ruta !== '/') {
      // Sin miga solo se acepta si la pagina ya traia una del origen.
      const propia = JSON.stringify(espLd).includes('BreadcrumbList');
      if (!propia) problemas.push('sin BreadcrumbList: ni inyectada ni del origen');
    }
    ldInyectados += inyectados.length;
    if (bloques.length !== espLd.length) {
      problemas.push(`JSON-LD: ${espLd.length} bloque(s) -> ${bloques.length}`);
    } else {
      for (const [i, b] of bloques.entries()) {
        let e = espLd[i];
        let mio; try { mio = ordena(JSON.parse(b.textContent)); } catch { problemas.push(`JSON-LD ${i} no parsea`); continue; }

        // Las partes anadidas a proposito (§ PARTES_PROPIAS): se exigen y se descuentan.
        const pp = PARTES_PROPIAS[ruta];
        if (pp && i === pp.bloque) {
          const arr = mio[pp.clave];
          const cabeza = Array.isArray(arr) ? arr.slice(0, pp.urls.length) : [];
          const malas = [];
          if (cabeza.length !== pp.urls.length) {
            malas.push(`${pp.clave}: ${cabeza.length} parte(s) propia(s) de ${pp.urls.length}`);
          }
          cabeza.forEach((x, k) => {
            if (x?.url !== pp.urls[k]) malas.push(`parte propia ${k}: url "${x?.url}" != "${pp.urls[k]}"`);
            for (const c of ['name', 'description']) {
              if (!String(x?.[c] ?? '').trim()) malas.push(`parte propia ${k}: ${c} vacio`);
            }
            if (!String(x?.image?.url ?? '').trim()) malas.push(`parte propia ${k}: image.url vacia`);
          });
          if (malas.length) { problemas.push(...malas); continue; }
          // `ordena` ya dejo las claves ordenadas; sustituir una existente conserva su sitio.
          mio = { ...mio, [pp.clave]: arr.slice(pp.urls.length) };
          partesCasadas++;
        }

        /* R17-CORE — se aplica la declaracion al BASELINE y se comprueba el build. */
        const ja = JSONLD_ARREGLADO[ruta];
        if (ja && i === ja.bloque) {
          const esperado = JSON.parse(JSON.stringify(e));
          const malas = [];
          for (const [camino, era, es] of ja.cambios) {
            const enBase = porCamino(esperado, camino);
            if (enBase !== era) malas.push(`arreglo "${camino}": el origen ya no dice "${era}" sino "${enBase}" — revisa la declaracion`);
            const enBuild = porCamino(mio, camino);
            if (enBuild !== es) malas.push(`arreglo "${camino}": el build dice "${enBuild}", se declaro "${es}"`);
            ponCamino(esperado, camino, es);
          }
          if (ja.respuestaSustituida) {
            const { camino, empiezaPor } = ja.respuestaSustituida;
            const enBase = String(porCamino(esperado, camino) ?? '');
            const enBuild = String(porCamino(mio, camino) ?? '');
            if (!enBase.startsWith(empiezaPor)) malas.push(`respuesta sustituida: el origen ya no empieza por "${empiezaPor}"`);
            if (!enBuild.trim()) malas.push('respuesta sustituida: el build la deja vacia');
            if (/\$\s?\d/.test(enBuild)) malas.push('respuesta sustituida: vuelve a traer una cifra de dinero');
            ponCamino(esperado, camino, enBuild);
          }
          if (ja.anadidas) {
            const arr = porCamino(mio, ja.anadidas.camino);
            const base = porCamino(esperado, ja.anadidas.camino);
            if (!Array.isArray(arr) || !Array.isArray(base)) malas.push('anadidas: el camino no es un array');
            else if (arr.length !== base.length + ja.anadidas.n) {
              malas.push(`anadidas: ${arr.length - base.length} de ${ja.anadidas.n} declarada(s)`);
            } else {
              for (const q of arr.slice(base.length)) {
                if (!String(q?.name ?? '').trim()) malas.push('anadida sin pregunta');
                if (!String(q?.acceptedAnswer?.text ?? '').trim()) malas.push('anadida sin respuesta');
                if (/\$\s?\d/.test(String(q?.acceptedAnswer?.text ?? ''))) malas.push('anadida con cifra de dinero');
              }
              base.push(...arr.slice(base.length));
            }
          }
          if (malas.length) { problemas.push(...malas); continue; }
          e = esperado;
          arregladosCasados++;
        }

        const a = JSON.stringify(mio);
        const c = aLocal(JSON.stringify(ordena(e)));
        if (a !== c) {
          const ja = JSON.parse(a), jc = JSON.parse(c);
          const claves = [...new Set([...Object.keys(ja), ...Object.keys(jc)])]
            .filter((k) => JSON.stringify(ja[k]) !== JSON.stringify(jc[k]));
          problemas.push(`JSON-LD ${i} difiere en: ${claves.slice(0, 4).join(', ') || '(anidado)'}`);
        }
      }
    }
  }

  // La canonica: adicion deliberada, solo en produccion.
  const can = d.querySelector('link[rel=canonical]')?.getAttribute('href');
  if (can) { try { hostsCanonicos.add(new URL(can).host); } catch { problemas.push(`canonica ilegible: ${can}`); } }
  if (PROD && !can) problemas.push('falta la canonica (PUBLIC_ES_PRODUCCION=1)');
  if (!PROD && can) problemas.push('hay canonica fuera de produccion: en preview no debe emitirse');
  const noindex = /noindex/.test(d.querySelector('meta[name=robots]')?.content ?? '');
  if (!PROD && !noindex) problemas.push('falta noindex fuera de produccion');
  if (PROD && noindex && !NOINDEX_A_PROPOSITO.has(ruta)) problemas.push('hay noindex EN PRODUCCION');
  if (PROD && !noindex && NOINDEX_A_PROPOSITO.has(ruta)) problemas.push('FALTA el noindex declarado');

  if (problemas.length) { rojos.push([ruta, problemas]); fallos++; } else ok++;
}

console.log(`\n  modo: ${PROD ? 'PRODUCCION (canonica si, noindex no)' : 'preview (noindex si, canonica no)'}`);
// La excepcion se DICE por pantalla. Una declaracion que no sale en la salida deja de estar
// declarada el dia que nadie abre el fichero.
for (const [r, d] of Object.entries(PARTES_PROPIAS)) {
  const bien = partesCasadas > 0;
  console.log(`  ${bien ? 'ok  ' : 'ROJO'} declarado ${r}: ${d.urls.length} parte(s) propia(s) `
    + `en ${d.clave}, descontadas antes de comparar con el baseline`);
  if (!bien) fallos++;
}
/* R17-CORE. Misma regla: si no sale por pantalla, deja de estar declarado el dia que nadie abre
 * el fichero. Y si el contador no sube, la declaracion no se aplico y hay que decirlo. */
for (const [r, d] of Object.entries(JSONLD_ARREGLADO)) {
  const bien = arregladosCasados > 0;
  console.log(`  ${bien ? 'ok  ' : 'ROJO'} declarado ${r}: ${d.cambios.length} arreglo(s) en el `
    + `JSON-LD del origen + ${d.anadidas?.n ?? 0} pregunta(s) anadida(s)`);
  console.log(`       ${d.motivo}`);
  if (!bien) fallos++;
}
// Se cuentan por separado a proposito: a las del origen se les exige el `<head>` IDENTICO, a
// las propias solo que este y que la indexacion sea correcta. Un unico total las mezclaria y
// diria «116/115», que ademas de raro sugiere que hay una pagina de mas.
const nPropias = conPropias(RUTAS).length - RUTAS.length;
console.log(`  ${ok - nPropias}/${RUTAS.length} paginas con el head identico al origen`);
console.log(`  ${nPropias} de autoria propia: head propio, indexacion vigilada igual\n`);
for (const [r, ps] of rojos.slice(0, 10)) {
  console.log(`  ROJO ${r}`);
  ps.slice(0, 5).forEach((p) => console.log(`       ${p}`));
}
if (rojos.length > 10) console.log(`  ... y ${rojos.length - 10} paginas mas`);

/**
 * M2 — NINGUN `<title>` SE REPITE. Es la otra mitad de `TITULO_PROPIO`: sin esto, la
 * excepcion seria una puerta abierta —bastaria declarar un titulo y volver a duplicarlo—, y
 * ademas el defecto que se acaba de arreglar podria reaparecer por otra ruta sin que nadie
 * lo viera. Se mide sobre las 122 construidas, no solo sobre las declaradas.
 */
{
  const repes = [...titulosVistos.entries()].filter(([, rs]) => rs.length > 1);
  if (repes.length) {
    fallos++;
    console.log(`  ROJO ${repes.length} titulo(s) repetido(s)`);
    repes.slice(0, 5).forEach(([t, rs]) => console.log(`       "${t.slice(0, 58)}"  ->  ${rs.join('  ')}`));
  } else console.log(`  ok   los ${titulosVistos.size} <title> son unicos — 0 repetidos`);
}
console.log('  ok   declarado: og:image / twitter:image / twitter:card se ANADEN cuando la pagina');
console.log('       no las trae del origen (M18). Las 104 que si las heredan se comparan igual.');
for (const r of TITULO_PROPIO_M2.keys()) {
  console.log(`  ok   declarado ${r}: <title> propio, distinto al del origen (el origen lo repetia)`);
}
console.log(`  ok   declarado: ${ldInyectados} bloque(s) de JSON-LD anadidos por Base.astro`);
console.log('       (#negocio en todas, #miga donde no habia una del origen). El origen no traia');
console.log('       ninguno de los dos: sameAs valia 0 en las 122 y BreadcrumbList salia en 1.');

for (const r of TITULO_DE_META.keys()) {
  console.log(`  ok   declarado ${r}: <title> propio (F1: longitud o intencion), via src/data/meta-propia.json`);
}

for (const [r, ms] of META_PROPIA) {
  console.log(`  ok   declarado ${r}: ${Object.keys(ms).join(', ')} propia(s), distinta(s) a la del origen`);
}

for (const r of NOINDEX_A_PROPOSITO) {
  console.log(`  ok   declarado ${r}: noindex TAMBIEN en produccion, a proposito`);
}

// ── EL HOST, UNO SOLO, EN LOS DOS SITIOS ──────────────────────────────────────
// Solo tiene sentido en produccion: fuera de ella no se emiten canonicas y el sitemap sale
// vacio a proposito.
if (PROD) {
  const sm = path.join(ESTATICO, 'sitemap.xml');
  const hostsSitemap = new Set(fs.existsSync(sm)
    ? [...fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).host)
    : []);
  const uno = (x) => [...x].sort().join(', ') || '(ninguno)';
  const coherente = hostsCanonicos.size === 1 && hostsSitemap.size === 1
    && [...hostsCanonicos][0] === [...hostsSitemap][0];
  console.log(`  ${coherente ? 'ok  ' : 'ROJO'} un solo host: canonicas [${uno(hostsCanonicos)}] `
    + `= sitemap [${uno(hostsSitemap)}]`);
  if (!coherente) {
    fallos++;
    console.log('       astro.config.mjs y scripts/build-seo-ficheros.mjs tienen que decir LO MISMO.');
  }
}

console.log(`\n${fallos === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${fallos} pagina(s)`}\n`);
process.exit(fallos ? 1 : 0);
