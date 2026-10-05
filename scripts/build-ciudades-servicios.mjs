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
const PLANTILLAS = {
  'pool-remodeling': {
    nombre: 'Pool Remodeling',
    schema: 'Pool remodeling and renovation',
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
    carrusel: null,
  },
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
      heading3DRendering: '3D Pool Design & Visualization',
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
