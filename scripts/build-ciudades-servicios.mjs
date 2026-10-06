#!/usr/bin/env node
/**
 * LAS LANDINGS DE CIUDAD DE LOS DEMAS SERVICIOS (LOOP-CIUDADES, 5-oct-2026).
 *
 *     npm run ciudades:servicios            escribe
 *     npm run ciudades:servicios -- --check comprueba y sale 1 si algo no cuadra
 *
 * Hermano de `build-captacion-ciudades.mjs`, que hace lo mismo para `/services/pool-builders/` y
 * NO se toca. Lee `src/data/ciudades-servicios-filas.json` —lo unico que se escribe a mano: que
 * paginas existen, que fotos del banco lleva cada servicio y el hecho local de cada ciudad con su
 * fuente oficial— y escribe, siempre igual:
 *
 *   · `src/data/ciudades-servicios.json` — el «documento» de cada pagina, con la misma forma que un
 *     `poolBuilder` de Sanity (h1Title, h2Title, intro, seo…), porque la plantilla es la misma
 *     (`src/components/PaginaCiudad.astro`). Sanity NO se toca: estas paginas no existen alli.
 *   · `src/data/captacion-servicios.json` — la entrada de cada ruta nueva (heroe, confianza,
 *     formulario, inversion, faq). Va ahi y no en otro fichero por lo mismo que las ciudades de
 *     piscina: `check-texto.mjs` y `src/pages/api/formulario.ts` leen ESE fichero crudo.
 *   · `src/data/galeria-obra-por-ruta.json` — el set de 11 fotos de cada servicio, clave
 *     `servicio:<servicio>` (las ciudades de un servicio lo comparten, como las 53 de piscina).
 *   · `src/data/banco-imagenes.json` — `usada_en` de cada foto elegida (regla 3 del banco).
 *
 * LO QUE NO SE ESCRIBE AQUI (la misma regla que el generador hermano y que `_lee_esto` de
 * `captacion-servicios.json`): ni garantias, ni anos de experiencia, ni numero de obras, ni
 * «5-star», ni una cifra de precio o plazo, ni urgencia, ni obras «en <ciudad>». Cada frase de las
 * plantillas lleva al lado de donde sale: casi todas son frases que la FICHA del servicio ya
 * publica (su entrada en `captacion-servicios.json`); lo local sale de la fila, con URL oficial y
 * fecha de comprobacion. Una ciudad sin hecho local verificado NO tiene pagina.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (r) => path.join(RAIZ, r);
const P_FILAS = P('src/data/ciudades-servicios-filas.json');
const P_DATOS = P('src/data/ciudades-servicios.json');
const P_CAPTA = P('src/data/captacion-servicios.json');
const P_GALERIA = P('src/data/galeria-obra-por-ruta.json');
const P_BANCO = P('src/data/banco-imagenes.json');
const P_NEGOCIO = P('src/lib/negocio.mjs');

const SOLO_COMPROBAR = process.argv.includes('--check');
const leer = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
const falla = (m) => { throw new Error(`[ciudades-servicios] ${m}`); };

/** Los 9 condados, leidos de `negocio.mjs` como hace el generador hermano (no se copian). */
function condadosVerificados() {
  const m = fs.readFileSync(P_NEGOCIO, 'utf8').match(/const CONDADOS\s*=\s*\[([^\]]*)\]/);
  if (!m) falla('no encuentro `const CONDADOS` en src/lib/negocio.mjs');
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}
const slugCondado = (c) => `/services/pool-builders/${c.toLowerCase().replace(/\s+/g, '-')}-county-fl`;
const rutaDe = (servicio, slug) => `/services/${servicio}/${slug.replace(/-florida$/, '-fl')}`;

/* ── LAS PLANTILLAS POR SERVICIO, CON SU FUENTE ─────────────────────────────────────────────────
 *
 * `F` es la entrada de la FICHA del servicio en captacion-servicios.json: todo lo que se copia de
 * ahi ya esta publicado en `/services/<servicio>` y tiene su fuente en R17-CORE §8.6 / R19.
 * `c` es la ciudad: { ciudad, condado|null, region }.
 */
/** Region -> condado en el copy: «<ciudad> And <condado> County» solo con condado verificado. */
const enCiudad = (c) => (c.condado ? `${c.ciudad} And ${c.condado} County` : `${c.ciudad}, Florida`);

/**
 * FABRICA DE PLANTILLAS para los servicios cuyas fichas NO tienen `faq.anade` (todas menos
 * pool-remodeling). Cada campo dice de donde sale:
 *   · `apoyo`/`descripcion`: el `heroe.apoyo` de la ficha con la ciudad en vez de «North & South Florida»;
 *   · `intro`: el parrafo de `trusted-section` de la ficha, igual, con la ciudad;
 *   · `faq`: el coste es la `inversion.texto` de la ficha; las otras dos son preguntas de la FAQ
 *     PUBLICADA de la ficha, palabra por palabra, elegidas entre las que no tienen cifra, plazo,
 *     garantia ni porcentaje (las que si los tienen se quedan fuera: linea roja);
 *   · `local.cierre`: la tarjeta 4 de `confianza` de la ficha (o su FAQ), palabra por palabra.
 */
const fabrica = (o) => ({
  nombre: o.nombre,
  tema: o.tema,
  titulo: (c) => `${o.nombreSeo} in ${c.ciudad}, FL | Mr & Mrs Outdoor Living`,
  // La description es el `heroe.apoyo` de la ficha con la ciudad, palabra por palabra.
  descripcion: (c) => o.apoyo(c).replace(/ serving (.+?)( homeowners)?( with| delivering| offering| providing|,)/, (m, ciudad, h, resto) => ` serving ${ciudad}, FL${h ?? ''}${resto}`),
  h1: (c) => `${o.h1} In ${c.ciudad}, Florida`,
  // El H2 de `trusted-section` de la ficha, con la ciudad (y el condado verificado) en vez de
  // «North & South Florida» / «Florida».
  h2: (c) => `${o.h2} ${enCiudad(c)}`,
  apoyo: (c) => o.apoyo(c),
  headingIntro: (c) => `${o.headingIntro} In ${c.ciudad}`,
  // El parrafo de `trusted-section` de la ficha, con la ciudad. Sin la frase de cierre de las ciudades
  // de piscina: la ficha del servicio no la publica.
  paragraphIntro: (c) => o.intro(c),
  // El parrafo de la seccion de resenas de la ficha, palabra por palabra.
  paragraphReviews: () => o.resenas,
  // La misma formula que el `paragraphBlog` de las 53 ciudades de piscina (Sanity), sin servicio:
  // el carrusel es el blog general, no el del servicio.
  paragraphBlog: (c) => `Explore tips and insights on outdoor living in ${c.ciudad}, FL.`,
  // La seccion 3D se titula con el paso 2 del formulario de la ficha («We design the pergola for
  // that space…»): el titular de piscina («3D Pool Design») no es de este servicio.
  heading3D: () => o.disenio,
  formulario: (c) => ({ nombre: `${c.ciudad} ${o.form}`, aviso: `${c.ciudad} ${o.form.replace(/ Form$/, '').toLowerCase()} lead` }),
  // Titular y entradilla de la FAQ de la ficha, con la ciudad.
  faqTitulo: (c) => `${c.ciudad} ${o.faqTitulo}`,
  faqEntradilla: (c) => o.faqEntradilla.replace(/in (North or South )?Florida\?/, `in ${c.ciudad}, Florida?`),
  faqBase: (c, F) => [
    { pregunta: `How much does ${o.coste} cost in ${c.ciudad}?`, respuesta: F.inversion.texto },
    ...o.faqFicha,
  ],
  local: { pregunta: o.pregunta, cierre: o.cierre },
});

const PLANTILLAS = {
  'pool-remodeling': {
    nombre: 'Pool Remodeling',
    tema: 'piscina',
    // seo.title / H1: el H1 de la ficha es «Pool Remodeling & Renovation Services».
    titulo: (c) => `Pool Remodeling in ${c.ciudad}, FL | Mr & Mrs Outdoor Living`,
    // La descripcion es el `heroe.apoyo` de la ficha con la ciudad: «resurfacing, tile and
    // coping, equipment and deck work in one permitted project, from one licensed team».
    descripcion: (c) => `Pool remodeling in ${c.ciudad}, FL: resurfacing, tile and coping, equipment and deck work in one permitted project, from one licensed Florida pool contractor.`,
    h1: (c) => `Pool Remodeling & Renovation In ${c.ciudad}, Florida`,
    h2: (c) => (c.condado
      ? `Complete Pool Renovations For Homes In ${c.ciudad} And ${c.condado} County`
      : `Complete Pool Renovations For Homes In ${c.ciudad}, Florida`),
    apoyo: (c) => `Complete pool remodeling for ${c.ciudad} homeowners — resurfacing, tile and coping, equipment and deck work in one permitted project, from one licensed team.`,
    headingIntro: (c) => `Pool Remodeling & Renovation Contractors In ${c.ciudad}`,
    // FAQ 3 de la ficha («What is included in a complete pool remodel?») + pasos 2-3 de su
    // formulario + la frase de cierre que ya publican las 53 ciudades de piscina (Sanity).
    paragraphIntro: (c) => `A remodel starts with the pool as it is today: we assess the shell, the plumbing and the equipment, then put the scope on paper — interior finish, waterline tile and coping, equipment and lighting, a spa added or rebuilt, the deck and a code-compliant barrier. One licensed team takes it through permits, demolition and finishing to start-up for ${c.ciudad} homeowners. From North to South Florida, we are the licensed contractors homeowners trust for high-end craftsmanship and lasting value.`,
    paragraphReviews: () => 'Florida homeowners trust us with their pool renovations and outdoor living. Read our reviews.',
    paragraphBlog: (c) => `Explore tips and insights on pool remodeling and outdoor living for ${c.ciudad}, FL homeowners.`,
    formulario: (c) => ({ nombre: `${c.ciudad} Pool Remodel Form`, aviso: `${c.ciudad} pool remodel lead` }),
    faqTitulo: (c) => `${c.ciudad} pool remodeling FAQs`,
    faqEntradilla: (c) => `Cost, permits and scope: what is worth settling before you renovate a pool in ${c.condado ? `${c.condado} County` : c.ciudad}.`,
    // Las tres preguntas de la ficha (`faq.anade` de /services/pool-remodeling), con la ciudad en
    // la pregunta y la respuesta de la ficha palabra por palabra.
    faqBase: (c, F) => [
      { pregunta: `How much does a pool remodel cost in ${c.ciudad}?`, respuesta: F.faq.anade[0].respuesta },
      { pregunta: `Does a pool remodel in ${c.ciudad} need a permit?`, respuesta: F.faq.anade[1].respuesta },
      { pregunta: F.faq.anade[2].pregunta, respuesta: F.faq.anade[2].respuesta },
    ],
    // LA PREGUNTA LOCAL: el parrafo de la ciudad (`ciudades.<slug>.local`, con fuente oficial y
    // fecha) + el `extra` del tema + este cierre, que es la FAQ 2 de la ficha.
    local: {
      pregunta: (c) => `Which office permits a pool remodel in ${c.ciudad}?`,
      cierre: 'Remodel work that touches the structure, plumbing, electrical, equipment or the safety barrier is permitted and inspected under the Florida Building Code, so we confirm which office has jurisdiction before demolition and pull the permit under our license.',
    },
  },
  'pergola-builders': fabrica({
    nombre: 'Pergola Builders', nombreSeo: 'Pergola Builders', tema: 'estructura',
    descripcion: (c) => `Custom aluminum pergola builders in ${c.ciudad}, FL: durable pergolas that enhance outdoor comfort and style, designed, permitted and installed by one licensed Florida team.`,
    h1: 'Custom Aluminum Pergola Builders', h2: 'Custom Pergola Builders Serving',
    faqTitulo: 'Pergola Installation FAQs', faqEntradilla: 'Have questions about custom aluminum pergola installation in Florida? Our licensed outdoor living specialists answer the top questions here.',
    apoyo: (c) => `Custom pergola builders and installation company serving ${c.ciudad} homeowners, delivering durable designs that enhance outdoor comfort and style.`,
    headingIntro: 'Custom Pergola Builders',
    intro: (c) => `Our pergola builders design and install custom aluminum pergolas for ${c.ciudad} homes, combining expert craftsmanship, durable materials, and stylish shade solutions that elevate outdoor living spaces year-round.`,
    resenas: 'Read reviews from North & South Florida homeowners who trust our pergola builders for durable installations, modern design, and outdoor comfort.',
    disenio: 'We Design The Pergola For Your Space',
    blog: 'pergola', articulo: 'a pergola', coste: 'a pergola', form: 'Aluminum Pergola Form',
    faqFicha: [
      { pregunta: 'Are aluminum pergolas rust-proof for Florida outdoor use?', respuesta: "Yes. Powder-coated aluminum pergolas resist rust, corrosion, and UV damage — making them ideal for Florida's humid, salt-air coastal environments and sun-intense inland climates. Licensed under aluminum contractor license SCC131153553, Mr. & Mrs. Outdoor Living engineers every structure to local wind-load specifications." },
    ],
    pregunta: (c) => `Who reviews a pergola permit in ${c.ciudad}?`,
    cierre: 'We manage the permits and the HOA or ARB review, and coordinate inspections.',
  }),
  'louvered-roofs': fabrica({
    nombre: 'Louvered Roofs', nombreSeo: 'Louvered Roofs', tema: 'estructura',
    descripcion: (c) => `Motorized louvered roof installation in ${c.ciudad}, FL: adjustable shade and weather protection, sized, permitted and installed by one licensed Florida team.`,
    h1: 'Motorized Louvered Roof Systems', h2: 'Motorized Louvered Roof Installation Experts In',
    faqTitulo: 'Louvered Roof System FAQs', faqEntradilla: 'Have questions about motorized louvered roof system installation in Florida? Our licensed outdoor living specialists answer your top questions here.',
    apoyo: (c) => `Motorized louvered roof builders and installation contractors serving ${c.ciudad}, offering adjustable shade and weather protection.`,
    headingIntro: 'Louvered Roof Installation',
    intro: (c) => `We specialize in louvered roof installation for ${c.ciudad} homes, building motorized bioclimatic systems that allow homeowners to fully control sunlight, ventilation, and rain protection for true year-round outdoor comfort.`,
    resenas: 'Read reviews from Florida homeowners who enjoy year-round outdoor living, enabled by our precision-engineered motorized louvered roof systems.',
    disenio: 'We Size The System For Your Opening',
    blog: 'louvered roof', articulo: 'a louvered roof', coste: 'a louvered roof', form: 'Louvered Roof Form',
    faqFicha: [
      { pregunta: 'Are louvered roof systems hurricane-rated in Florida?', respuesta: "Yes. Louvered roof systems use reinforced extruded aluminum and marine-grade stainless steel hardware, engineered to withstand Florida's high winds. Our systems carry wind-load engineering documentation and are installed to meet local building codes — including HVHZ requirements where applicable in South Florida." },
      { pregunta: 'Can lighting and fans be added to a louvered roof?', respuesta: 'Yes. Motorized louvered roof systems can integrate recessed LED lighting, ceiling fans, and radiant heating elements directly into the structure. Electrical work is coordinated during installation, and all additions are permitted through local Florida building departments and HOA architectural review boards where required.' },
    ],
    pregunta: (c) => `Which office permits a louvered roof in ${c.ciudad}?`,
    cierre: 'We install to local building codes, and the electrical additions are permitted too.',
  }),
  'deck-builders': fabrica({
    nombre: 'Deck Builders', nombreSeo: 'Deck Builders', tema: 'deck',
    descripcion: (c) => `Custom deck builders in ${c.ciudad}, FL: composite, wood, travertine and paver decks designed, permitted and built by one licensed Florida team.`,
    h1: 'Custom Deck Builders', h2: 'Custom Deck Builders & Contractors In',
    faqTitulo: 'Custom Deck FAQs', faqEntradilla: 'Have questions about composite or wood deck installation in Florida? Our licensed deck builders answer the most common questions from Florida homeowners.',
    apoyo: (c) => `Professional deck builders and installation contractors serving ${c.ciudad} with durable, stylish outdoor deck solutions.`,
    headingIntro: 'Custom Deck Builders & Contractors',
    intro: (c) => `Our deck builders design and construct composite and wood decks for ${c.ciudad} homes, delivering long-lasting outdoor structures tailored to your home's layout, lifestyle, and Florida's demanding climate.`,
    resenas: 'Read testimonials from Florida homeowners who value the durability, comfort, and lasting property value delivered by our experienced deck builders.',
    disenio: 'We Design The Deck For Your Layout',
    blog: 'deck', articulo: 'a deck', coste: 'a deck', form: 'Custom Deck Form',
    faqFicha: [
      { pregunta: 'Which decking materials are best for Florida homes?', respuesta: "We use composite decking, pressure-treated lumber, and fiberglass-reinforced boards engineered for long-lasting performance in Florida's heat, humidity, and seasonal rain. These materials resist warping, rot, and pest damage — delivering a surface that maintains its appearance and structural integrity across North and South Florida climates." },
      { pregunta: 'Can you match my home’s existing design style?', respuesta: "Yes. Our deck builders fully customize shapes, levels, railing styles, and surface finishes to complement your home's architecture. From straight-line pool decks in travertine or pavers to multi-level composite platforms with built-in lighting, every deck integrates seamlessly with your Florida outdoor living environment." },
    ],
    pregunta: (c) => `Who permits a new deck in ${c.ciudad}?`,
    cierre: 'One team takes the design through permits, engineering and construction.',
  }),
  'outdoor-kitchens': fabrica({
    nombre: 'Outdoor Kitchens', nombreSeo: 'Outdoor Kitchens', tema: 'cocina',
    descripcion: (c) => `Custom outdoor kitchens in ${c.ciudad}, FL: layouts for entertaining and daily use, with outdoor-rated appliances and utilities, designed, permitted and built by one licensed team.`,
    h1: 'Custom Outdoor Kitchens', h2: 'Outdoor Kitchen Builders & Contractors In',
    faqTitulo: 'Outdoor Kitchen FAQs', faqEntradilla: 'Have questions about custom outdoor kitchen construction in Florida? Our licensed contractors answer the top questions from Florida homeowners below.',
    apoyo: (c) => `Outdoor kitchen builders and installation contractors serving ${c.ciudad} with custom layouts for entertaining and daily use.`,
    headingIntro: 'Outdoor Kitchen Builders & Contractors',
    intro: (c) => `Our outdoor kitchen contractors design and build custom outdoor kitchens for ${c.ciudad} homes, integrating durable materials, modern appliances, and functional layouts for effortless entertaining.`,
    resenas: 'Hear from Florida clients who enjoy cooking and entertaining year-round in custom outdoor kitchens designed and built by our licensed contractors.',
    disenio: 'We Lay Out The Kitchen Around How You Cook',
    blog: 'outdoor kitchen', articulo: 'an outdoor kitchen', coste: 'an outdoor kitchen', form: 'Outdoor Kitchen Form',
    faqFicha: [
      { pregunta: 'What materials are best for outdoor kitchens in Florida?', respuesta: "We install outdoor kitchens using weatherproof polymer cabinets, marine-grade stainless steel hardware, and natural stone countertops — all selected for resistance to Florida's heat, humidity, and coastal salt air. Every material choice is engineered to maintain its appearance and structural integrity over the long term." },
      { pregunta: 'Can I add a bar, pizza oven, or smoker to my kitchen?', respuesta: 'Absolutely. Custom outdoor kitchens can be designed around any combination of cooking equipment including built-in bars, pizza ovens, smokers, kamado grills, and beverage refrigerators. Each specialty appliance is engineered into the layout with proper utility routing, ventilation, and structural support to meet Florida building code requirements.' },
    ],
    pregunta: (c) => `Which office permits an outdoor kitchen in ${c.ciudad}?`,
    cierre: 'We manage the full permitting process, including HOA and ARB submissions.',
  }),
  landscaping: fabrica({
    nombre: 'Landscaping', nombreSeo: 'Landscaping', tema: 'paisajismo',
    descripcion: (c) => `Landscaping in ${c.ciudad}, FL: landscape design and installation with native plants and drainage sorted first, from one licensed Florida outdoor living team.`,
    h1: 'Professional Landscaping Services', h2: 'Professional Landscaping Contractors In',
    faqTitulo: 'Landscaping Services FAQs', faqEntradilla: 'Have questions about professional landscaping installation in North or South Florida? Our expert team answers the top questions from Florida homeowners.',
    apoyo: (c) => `Landscaping design and installation company serving ${c.ciudad}, providing complete outdoor solutions that improve curb appeal.`,
    headingIntro: 'Professional Landscaping Contractors',
    intro: (c) => `Our landscaping company offers full-service landscape design, installation, and maintenance for ${c.ciudad} homes, using native plants and sustainable practices to enhance curb appeal and property value.`,
    resenas: 'Hear from Florida clients who love how our landscaping company transformed their properties with native plants, refined hardscaping, and lasting beauty.',
    disenio: 'We Put A Planting Plan On Paper',
    blog: 'landscaping', articulo: 'a landscaping project', coste: 'landscaping', form: 'Landscaping Form',
    faqFicha: [
      { pregunta: 'Do landscaping contractors use native Florida plants?', respuesta: 'Yes. Our landscaping contractors prioritize native and Florida-Friendly plant selections that require less irrigation, resist local pests, and thrive without heavy chemical inputs. This approach delivers landscapes that look beautiful year-round while meaningfully reducing your long-term water consumption and maintenance requirements.' },
      { pregunta: 'Can landscaping help reduce water usage in Florida?', respuesta: 'Yes. Landscapes designed with drought-tolerant native plants, strategic mulching, and smart irrigation significantly reduce water consumption. Our team creates designs that meet local water restriction guidelines while maintaining a lush, well-maintained appearance year-round for homeowners across North and South Florida.' },
    ],
    pregunta: (c) => `What local rules apply to landscaping work in ${c.ciudad}?`,
    cierre: 'Our team creates designs that meet local water restriction guidelines.',
  }),
};

/* ── EJECUCION ──────────────────────────────────────────────────────────────────────────────── */
const FILAS = leer(P_FILAS);
const CAPTA = leer(P_CAPTA);
const GALERIA = leer(P_GALERIA);
const BANCO = leer(P_BANCO);
const CONDADOS = condadosVerificados();
const porId = new Map(BANCO.map((x) => [x.id, x]));

/* LO QUE YA PINTA EL CUERPO DE LA PAGINA Y NO PUEDE REPETIRSE (regla de galeria-obra-por-ruta):
 * los seis paneles de la banda «Project Gallery» y las 14 fotos del panel de servicios. */
const BANDA = new Set(leer(P('src/data/galeria-categorias.json')).categorias
  .filter((c) => c.panel).map((c) => c.panel.bancoId));
const PANEL = new Set(leer(P('src/data/servicios-categoria.json'))['/'].servicios.map((s) => s.foto));
const fichero = (s) => String(s ?? '').split('/').pop().replace(/\.[a-z]+$/, '').replace(/-(full|\d+)$/, '');
const PANEL_BASES = new Set([...PANEL].map(fichero));

/** Una foto del banco, comprobada contra las reglas del banco y la del servicio. */
function foto(id, servicioBanco, donde) {
  const x = porId.get(id);
  if (!x) falla(`${donde}: ${id} no esta en banco-imagenes.json`);
  if (!String(x.estado).startsWith('aprobada')) falla(`${donde}: ${id} esta «${x.estado}» (regla 5 del banco)`);
  if (x.procedencia !== 'obra_real') falla(`${donde}: ${id} es «${x.procedencia}»: solo obra_real se publica como obra`);
  if (!x.servicios?.includes(servicioBanco)) falla(`${donde}: ${id} no es de «${servicioBanco}» (${x.servicios})`);
  if (BANDA.has(id)) falla(`${donde}: ${id} ya sale en la banda «Project Gallery» de la misma pagina`);
  if (PANEL_BASES.has(fichero(x.src)) || (x.publicada_como && PANEL_BASES.has(fichero(x.publicada_como)))) {
    falla(`${donde}: ${id} ya sale en el panel de servicios de la misma pagina`);
  }
  return x;
}

const rutasNuevas = new Set();
const paginas = {};
const servicios = {};
const nuevaGaleria = {};
const entradas = {};
const usadas = new Map();   // id -> Set(rutas)
const usar = (id, ruta) => { if (!usadas.has(id)) usadas.set(id, new Set()); usadas.get(id).add(ruta); };

for (const [servicio, cfg] of Object.entries(FILAS.servicios)) {
  const T = PLANTILLAS[servicio] ?? falla(`no hay plantilla para «${servicio}»`);
  const F = CAPTA[`/services/${servicio}`] ?? falla(`la ficha /services/${servicio} no tiene entrada en captacion-servicios.json`);
  const ids = [...Object.values(cfg.fotos.intro).map((f) => f.banco), cfg.fotos.inversion.banco, ...cfg.fotos.galeria];
  if (new Set(ids).size !== ids.length) falla(`${servicio}: una foto se repite entre intro, inversion y galeria`);
  if (cfg.fotos.galeria.length !== 11) falla(`${servicio}: la galeria lleva 11 fotos, como la de piscina (hay ${cfg.fotos.galeria.length})`);

  const intro = {};
  for (const [k, f] of Object.entries(cfg.fotos.intro)) {
    const x = foto(f.banco, cfg.banco, `${servicio} intro ${k}`);
    intro[k] = { src: x.src, alt: x.alt, ancho: x.ancho, alto: x.alto, pos: f.pos ?? '50% 50%', _banco: x.id };
  }
  const xi = foto(cfg.fotos.inversion.banco, cfg.banco, `${servicio} inversion`);
  const galeria = cfg.fotos.galeria.map((id, i) => {
    const x = foto(id, cfg.banco, `${servicio} galeria ${i + 1}`);
    return { src: x.src, alt: x.alt, ancho: x.ancho, alto: x.alto, pos: cfg.fotos.pos?.[id] ?? '50% 50%', _banco: x.id, _proyecto: x.proyecto ?? null };
  });
  nuevaGaleria[`servicio:${servicio}`] = {
    titulo: cfg.galeria.titulo,
    entradilla: cfg.galeria.entradilla,
    fotos: galeria,
    _derivado: 'src/data/ciudades-servicios-filas.json — no editar a mano: npm run ciudades:servicios',
  };
  servicios[servicio] = { fotosCiudad: { fotos: { intro }, ciudades: [] } };

  const paginasServicio = FILAS.paginas.filter((p) => p.servicio === servicio);
  if (paginasServicio.length > cfg.fotosLibres) {
    falla(`${servicio}: ${paginasServicio.length} paginas y ${cfg.fotosLibres} fotos reales libres. `
      + 'Linea roja del loop: menos fotos que paginas es PARADA.');
  }
  for (const p of paginasServicio) {
    const c = FILAS.ciudades[p.ciudad] ?? falla(`${servicio}: la ciudad «${p.ciudad}» no tiene fila en ciudades`);
    if (c.condado && !CONDADOS.includes(c.condado)) falla(`${p.ciudad}: condado «${c.condado}» fuera de los 9 de negocio.mjs`);
    if (c.condado && !c.condadoFuente?.url) falla(`${p.ciudad}: condado sin fuente oficial`);
    /* La FAQ local se escribe entera en la pagina (`faqLocal`) o se compone: parrafo de la ciudad
     * + `extra` de la pagina + cierre del servicio. Sin parrafo verificado no hay pagina. */
    if (!p.faqLocal) {
      if (!c.local?.texto) falla(`${servicio} ${p.ciudad}: la ciudad no tiene parrafo local verificado: no hay pagina`);
      const extra = c.extras?.[T.tema];
      const regional = c.condado ? FILAS.regional?.[c.condado]?.[T.tema] : null;
      const piezas = [c.local, extra, regional].filter(Boolean);
      const fuentes = piezas.flatMap((x) => x.fuentes);
      p.faqLocal = [{
        pregunta: T.local.pregunta(c),
        respuesta: [...piezas.map((x) => x.texto), T.local.cierre].join(' '),
        fuentes: fuentes.filter((f, i) => fuentes.findIndex((g) => g.url === f.url) === i),
        comprobado: piezas.map((x) => x.comprobado).sort()[0],
      }];
    }
    if (!p.faqLocal?.length) falla(`${servicio} ${p.ciudad}: sin hecho local verificado no hay pagina`);
    for (const q of p.faqLocal) {
      if (!q.fuentes?.length || q.fuentes.some((f) => !/^https:\/\//.test(f.url))) falla(`${servicio} ${p.ciudad}: «${q.pregunta}» sin fuente https`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(q.comprobado ?? '')) falla(`${servicio} ${p.ciudad}: «${q.pregunta}» sin fecha de comprobacion`);
    }
    const ruta = rutaDe(servicio, p.ciudad);
    if (rutasNuevas.has(ruta)) falla(`${ruta} declarada dos veces`);
    rutasNuevas.add(ruta);
    servicios[servicio].fotosCiudad.ciudades.push({ slug: p.ciudad, condado: c.condado ?? null });

    const doc = {
      _type: 'ciudadServicio',
      slug: p.ciudad,
      name: c.ciudad,
      seo: { title: T.titulo(c), description: T.descripcion(c) },
      h1Title: T.h1(c),
      h2Title: T.h2(c),
      intro: T.apoyo(c),
      headingIntro: T.headingIntro(c),
      paragraphIntro: T.paragraphIntro(c),
      imagenIntro1: { alt: intro['1'].alt },
      imagenIntro2: { alt: intro['2'].alt },
      imagenIntro3: { alt: intro['3'].alt },
      // La seccion 3D es la misma de las 53 de piscina (mismo video, mismo titular).
      heading3DRendering: T.heading3D?.() ?? '3D Pool Design & Visualization',
      headingFeature: '',
      paragraphFeatures: '',
      headingPortfolio: '',
      paragraphPortfolio: '',
      headingReviews: 'What Our Clients Say',
      paragraphReviews: T.paragraphReviews(c),
      headingBlog: 'Outdoor Living & Pool Blog',
      paragraphBlog: T.paragraphBlog(c),
    };
    const og = xi.src;
    paginas[ruta] = {
      servicio,
      doc,
      seoRuta: {
        seo: {
          meta: {
            'og:title': doc.seo.title,
            'og:description': doc.seo.description,
            'og:image': og,
            // og:url: el sitio no lo emite en ninguna ruta; aqui si, porque es la URL canonica.
            'og:url': `https://www.mrandmrsoutdoorliving.com${ruta}`,
            'twitter:title': doc.seo.title,
            'twitter:description': doc.seo.description,
            'twitter:image': og,
            'og:type': 'website',
            'twitter:card': 'summary_large_image',
          },
          // Un solo nodo, que `PaginaCiudad` sustituye por el `Service` de la ciudad: de aqui solo
          // lee el nombre de la ciudad y la descripcion. No es un negocio por ciudad.
          jsonLd: [{ '@type': 'LocalBusiness', name: c.ciudad, areaServed: { name: c.ciudad }, description: doc.seo.description }],
        },
        ldCrudo: [],
      },
      // El fondo del heroe: la foto de heroe de la FICHA del servicio (`heroe.foto`), no el reel de
      // piscina de las ciudades de pool-builders. Solo para los servicios que no son de piscina.
      heroeFoto: T.tema === 'piscina' ? null : { src: F.heroe.foto, ancho: F.heroe.ancho, alto: F.heroe.alto },
      enlaces: {
        ficha: `/services/${servicio}`,
        condado: c.condado ? slugCondado(c.condado) : null,
      },
    };

    const zonas = c.region === 'South Florida' ? ['South Florida', 'North Florida'] : ['North Florida', 'South Florida'];
    entradas[ruta] = {
      heroe: {
        apoyo: T.apoyo(c),
        licencias: F.heroe.licencias,
        ancla: '#estimate',
        cta: F.heroe.cta ?? 'Get a Free Estimate',
        zonas,
      },
      confianza: structuredClone(F.confianza),
      formulario: { ...structuredClone(F.formulario), ...T.formulario(c) },
      inversion: { ...structuredClone(F.inversion), foto: xi.src, alt: xi.alt, ancho: xi.ancho, alto: xi.alto },
      faq: {
        titulo: T.faqTitulo(c),
        entradilla: T.faqEntradilla(c),
        anade: [
          ...T.faqBase(c, F),
          ...p.faqLocal.map((q) => ({ pregunta: q.pregunta, respuesta: q.respuesta, fuentes: q.fuentes })),
        ],
      },
      _derivado: 'src/data/ciudades-servicios-filas.json — no editar a mano: npm run ciudades:servicios',
    };
    for (const id of ids) usar(id, ruta);
  }
}

/* LOS ENLACES ENTRE HERMANAS: cada pagina enlaza a los otros servicios de la MISMA ciudad
 * (los nuevos y la de piscina, que existe para las 53). */
for (const [ruta, pg] of Object.entries(paginas)) {
  const tramo = ruta.split('/').pop();
  pg.enlaces.hermanas = [
    { href: `/services/pool-builders/${tramo}`, nombre: 'Custom Pool Builders' },
    ...Object.entries(paginas)
      .filter(([r, o]) => r !== ruta && r.endsWith(`/${tramo}`))
      .map(([r, o]) => ({ href: r, nombre: PLANTILLAS[o.servicio].nombre })),
  ];
}

/* ── ESCRITURA: cada fichero solo en sus claves ────────────────────────────────────────────── */
const esMia = (k, v) => typeof v?._derivado === 'string' && v._derivado.startsWith('src/data/ciudades-servicios-filas.json');
/* EL ORDEN DE captacion-servicios.json NO ES LIBRE: `build-captacion-ciudades.mjs` borra sus 53
 * y las vuelve a escribir AL FINAL, y su `--check` compara el fichero entero. Para que los dos
 * generadores den el mismo fichero corra el que corra, las nuevas van DELANTE de las 53. */
const esPiscina = (k) => /^\/services\/pool-builders\/[a-z0-9-]+$/.test(k);
const base = Object.entries(CAPTA).filter(([k, v]) => !esMia(k, v));
const nuevoCapta = Object.fromEntries([
  ...base.filter(([k]) => !esPiscina(k)),
  ...Object.entries(entradas),
  ...base.filter(([k]) => esPiscina(k)),
]);
const nuevoGaleria = Object.fromEntries([
  ...Object.entries(GALERIA).filter(([k, v]) => !esMia(k, v)),
  ...Object.entries(nuevaGaleria),
]);
const nuevoBanco = BANCO.map((x) => {
  const antes = (x.usada_en ?? []).filter((r) => !/^\/services\/(?!pool-builders\/)[a-z0-9-]+\/[a-z0-9-]+-fl$/.test(r));
  const mias = [...(usadas.get(x.id) ?? [])];
  if (!mias.length && antes.length === (x.usada_en ?? []).length) return x;
  return { ...x, usada_en: [...antes, ...mias] };
});
const datos = {
  _lee_esto: [
    'DERIVADO de src/data/ciudades-servicios-filas.json por scripts/build-ciudades-servicios.mjs.',
    'No editar a mano: `npm run ciudades:servicios`; `--check` sale rojo si este fichero no coincide.',
    'Cada `paginas[ruta].doc` tiene la forma de un poolBuilder de Sanity porque lo pinta la misma',
    'plantilla (src/components/PaginaCiudad.astro). Sanity no tiene estas paginas y no se toca.',
  ],
  servicios,
  paginas,
};

const salidas = [
  [P_DATOS, json(datos)],
  [P_CAPTA, json(nuevoCapta)],
  [P_GALERIA, json(nuevoGaleria)],
  [P_BANCO, json(nuevoBanco)],
];
const distintos = salidas.filter(([p, txt]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== txt);

if (SOLO_COMPROBAR) {
  if (distintos.length) {
    console.error('🔴 PUERTA ROJA — no coinciden con lo que sale de ciudades-servicios-filas.json:');
    for (const [p] of distintos) console.error(`     ${path.relative(RAIZ, p)}`);
    console.error('   Se arregla con: npm run ciudades:servicios');
    process.exit(1);
  }
  console.log(`  ok   ${rutasNuevas.size} landing(s) de servicio por ciudad coinciden con su fila`);
  console.log('\nPUERTA VERDE');
  process.exit(0);
}
for (const [p, txt] of distintos) fs.writeFileSync(p, txt);
console.log(`  escritas ${rutasNuevas.size} landing(s); ficheros tocados: ${distintos.map(([p]) => path.relative(RAIZ, p)).join(', ') || 'ninguno'}`);
