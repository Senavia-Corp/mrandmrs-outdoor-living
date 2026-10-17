#!/usr/bin/env node
/**
 * PUERTA de estructura — las 53 ciudades de `/services/pool-builders/`, en DOS formas y solo dos.
 *
 *     npm run check:estructura:ciudades
 *
 * NACE DEL MISMO SITIO QUE SU HERMANA DE `/services/`: una desviacion que ninguna puerta veia.
 * Las 53 salen de UNA plantilla, y desde R20-CIUDADES dos de ellas -las Final URL de los ad
 * groups «Ocala» y «Gainesville»- montan ademas la capa de captacion. O sea que a partir de hoy
 * hay dos formas legitimas, y exactamente dos:
 *
 *   · CON captacion   las que tienen entrada en `captacion-servicios.json`
 *   · SIN captacion   las otras, que tienen que salir EXACTAMENTE como salian antes
 *
 * QUE PROBLEMA RESUELVE DE VERDAD. La garantia de este encargo es «las otras 51 no se mueven», y
 * hoy eso se demuestra con `diag-identidad`, que compara contra un `/tmp/*.json` de una sesion
 * concreta. Eso no sobrevive a la sesion. Esta puerta lo comprueba SIN referencia externa: si un
 * dia alguien monta un widget sin guarda, o una ciudad pierde su formulario, sale rojo aqui,
 * estatico y en menos de un segundo, sin capturas y sin navegador.
 *
 * Y es lo que hace que la FASE 2 no dependa de mirar 51 paginas: encender las 51 restantes solo
 * cambia de que lado de la tabla cae cada una.
 *
 * QUE CUENTA COMO SECCION: las `<section>` sin otra `<section>` por encima -`ResenasGoogle` y el
 * feed cuelgan de la suya- y por su PRIMERA clase. Se corta del heroe al pie, porque el cromo
 * (`code`, `menu`, `footer`) no es de la pagina. Mismo criterio que `check-estructura-servicios`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { rutaCiudad } from './lib/renombradas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const leerJson = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

/**
 * Los dos ordenes, escritos A MANO a proposito: derivarlos de la plantilla que los produce seria
 * comparar la salida consigo misma, que es como se cuela una regresion con la puerta en verde.
 *
 * El orden CON captacion no es libre: replica el de la ficha Core, que se decidio midiendo el
 * recorrido del comprador (R17-CORE §5). Confianza ANTES del formulario -responde «¿por que
 * vosotros?» antes de pedir datos-, formulario detras de la intro -se ve obra antes de dar los
 * datos, R19 C4-, e inversion y FAQ detras de la prueba social. (Ese tramo lo han reordenado
 * despues ORDEN-CIUDADES y ORDEN-CIUDADES-2: el orden vigente es el de `CON`, abajo.)
 *
 * R20-CIUDADES F2 (Sebastian, 14-sep-2026) mueve la prueba social DELANTE del carrusel de obra
 * en LOS DOS ordenes: `testimonial-section` pasa por delante de `projects-section`. Quien acaba
 * de leer las mejoras de la piscina lee la opinion de otros antes de ponerse a mirar fotos, y el
 * carrusel -cuya unica salida lleva fuera de la pagina- deja de ser lo primero tras las mejoras.
 * Va en las 53 y no solo en las 2 porque «las 53 deben tener la misma estructura»: por eso
 * cambian las dos listas, no una.
 *
 * Y en el orden CON desaparece `svc-cierre`: el «Get a Free Estimate» que iba entre las mejoras
 * y la obra se quito a peticion de Sebastian. OJO, `.svc-cierre` SIGUE en la lista de selectores
 * prohibidos de SIN mas abajo, y no es contradiccion: el gemelo de la FAQ -un `<p>`, no una
 * `<section>`- sigue vivo en las rutas con captacion, y esta puerta solo enumera `<section>`.
 */
const SIN = [
  /* `gallery` ENTRA TAMBIEN AQUI (encargo de galeria de ciudades, 4-oct-2026). La galeria de obra
   * deja de ir acotada con `CAP` en `[slug].astro`: «las 53 con la misma galeria» no puede depender
   * de que una ciudad tenga fila en `captacion-servicios.json`. Sin captacion `FormularioCore` no
   * pinta nada, asi que la galeria cae entre `trusted-section` y `_3d-section`: el mismo punto
   * logico que en `CON`, donde va detras del formulario. Hoy ninguna ciudad cae en esta forma
   * (53/53 tienen entrada); la lista es la red para la que llegue sin ella. */
  /* SEO-REMEDIACION (4-oct-2026): la banda baja detras de la obra aqui tambien; sin captacion
   * no hay FAQ, asi que cae justo antes del blog. */
  /* ORDEN-CIUDADES (5-oct-2026): la plantilla es una, asi que aqui tambien la banda queda delante
   * de resenas y obra. */
  /* ORDEN-CIUDADES-2 (6-oct-2026): esta lista NO cambia, y no es olvido. Sin captacion no hay
   * FAQ ni `svc-inversion` (`InversionCore` lee el mismo `captacion-servicios.json` y sin entrada
   * no pinta), asi que la banda ya estaba pegada al 3D, que es donde la pone el orden nuevo. */
  'mm-hero-a', 'trusted-section', 'gallery', '_3d-section',
  'animated-divs-section', 'testimonial-section', 'projects-section', 'blog-section-page',
  'social-media', 'cta-footer',
];
/* ASTRO-2 (12-oct-2026): el orden de la lamina «Ciudad», con el formulario al final, fundido con la
 * banda de cierre (D-77), sin el feed de Instagram (T-42) y con la miga dentro del hero. */
const CON = [
  'mm-hero-a', 'svc-confianza', 'svc-intro', 'mm-gal', 'mm-3d', 'mm-serv',
  'svc-inversion', 'mm-faq', 'mm-cat', 'mm-proy', 'blog-section-page',
  'mm-res', 'mm-cierre', 'mm-form-sec',
];

const CAPTACION = leerJson('src/data/captacion-servicios.json');
const TODAS = Object.keys(leerJson('src/data/seo-pool-builders.json'))
  .map(rutaCiudad).sort();
const CON_CAPTACION = new Set(TODAS.filter((r) => CAPTACION[r]));

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

let fallos = 0;
const mal = (r, m) => { fallos++; console.log(`  ROJO ${r}\n       ${m}`); };

console.log('\n── estructura de las 53 ciudades de /services/pool-builders/ ──');
if (TODAS.length !== 53) mal('seo-pool-builders.json', `declara ${TODAS.length} ciudades y son 53`);

let conCaptacion = 0;
let sinCaptacion = 0;

for (const ruta of TODAS) {
  const html = leer(ruta);
  if (!html) { mal(ruta, 'no se construyo. Son 53 URLs indexadas: sin pagina son 53 404.'); continue; }
  const d = new JSDOM(html).window.document;
  const clases = [...d.querySelectorAll('section')]
    .filter((s) => !s.parentElement?.closest('section'))
    .map((s) => s.classList[0]);
  // ASTRO-1 (12-oct-2026): el pie es <footer class="mm-zocalo">, ya no un <section class="footer">,
  // asi que deja de salir en `clases`. Sin pie-seccion, el cuerpo llega hasta la ultima seccion.
  const finPie = clases.lastIndexOf('footer');
  const cuerpo = clases.slice(clases.indexOf('mm-hero-a'), finPie >= 0 ? finPie : clases.length);
  const esperado = CON_CAPTACION.has(ruta) ? CON : SIN;
  const etiqueta = CON_CAPTACION.has(ruta) ? 'con captacion' : 'sin captacion';

  if (cuerpo.join(' ') !== esperado.join(' ')) {
    const i = esperado.findIndex((c, k) => cuerpo[k] !== c);
    mal(ruta, `(${etiqueta}) puesto ${i + 1}: se esperaba «${esperado[i] ?? '(nada)'}» y hay `
      + `«${cuerpo[i] ?? '(nada)'}»\n       orden: ${cuerpo.join(' · ')}`);
    continue;
  }

  /* EL FORMULARIO NO SE DA POR PUESTO PORQUE ESTE LA SECCION. `appointment-section` en su sitio
   * y sin `<form data-mm-envia="1">` dentro es una pagina que PARECE que capta y no capta: la
   * forma correcta y el lead perdido. Es justo el fallo que una puerta de estructura no ve si
   * solo mira nombres de clase. */
  if (CON_CAPTACION.has(ruta)) {
    const forms = [...d.querySelectorAll('section.mm-form-sec form[data-mm-envia="1"]')];
    if (forms.length !== 1) {
      mal(ruta, `${forms.length} formulario(s) de envio dentro de la seccion de captacion; `
        + 'tiene que haber exactamente 1.');
      continue;
    }
    /* LA FAQ, EN UNA COLUMNA Y SIN FOTOS (FAQ-UNA-COLUMNA, 5-oct-2026). Aqui se exigian las 5
     * fotos del collage. Borrar la linea a secas dejaba la FAQ sin vigilar; se INVIERTE: la seccion
     * tiene que traer sus acordeones y ninguna imagen que no sea la flecha de cada uno. Asi el
     * collage no puede volver por un generador olvidado sin que esto se ponga rojo. */
    // ASTRO-2: la FAQ es `section.mm-faq` con sus preguntas en `<details>`.
    const faq = d.querySelector('section.mm-faq');
    if (!faq?.querySelector('.mm-faq-lista > details.mm-faq-item > summary h3')) {
      mal(ruta, 'la FAQ no trae ni un acordeon dentro de .wrapper-faq-components.'); continue;
    }
    // ASTRO-2: la FAQ lleva, como mucho, UNA foto: la de la tarjeta de accion (`.mm-faq-medio`).
    const fotosFaq = [...faq.querySelectorAll('img')].filter((i) => !i.closest('.mm-faq-medio'));
    if (fotosFaq.length || faq.querySelectorAll('.mm-faq-medio img').length > 1 || faq.querySelector('.mm-collage')) {
      mal(ruta, `la FAQ vuelve a pintar ${fotosFaq.length} foto(s) fuera de las flechas `
        + '(o un .mm-collage). Es una columna sin collage desde el 5-oct-2026.'); continue;
    }
    conCaptacion++;
  } else {
    /* Y AL REVES, QUE ES LA MITAD QUE IMPORTA: una ciudad sin entrada no puede haber ganado NADA.
     * Si un widget se monta sin su guarda, aqui se ve — y se ve sin capturas y sin baseline. */
    const restos = ['form[data-mm-envia="1"]', '.svc-confianza', '.svc-inversion',
      '.svc-captacion', '.faq-section', '.svc-cierre', '.svc-heroe__tel',
      /* R21: el modificador del heroe. Es la prueba mas barata — es UNA clase, la emite
       * `captacion-ciudad.mjs` sobre `.wrapper-main-hero-page`, y de el cuelgan TODAS las reglas
       * nuevas del heroe: si apareciera aqui, la insignia, los chips y el ritmo se habrian ido a
       * 51 paginas. `.svc-galeria` SALIO de esta lista el 4-oct-2026: la galeria de obra va en las
       * 53 sin guarda, y su presencia la exige `SIN` arriba y `check-galeria-obra.mjs`. */
      '.svc-heroe--ciudad', '.products-section']
      .filter((s) => d.querySelector(s));
    if (restos.length) {
      mal(ruta, `no tiene entrada en captacion-servicios.json y sin embargo pinta ${restos.join(', ')}. `
        + 'Un widget montado sin guarda mueve 51 paginas que nadie esta mirando.');
      continue;
    }
    sinCaptacion++;
  }
}

console.log(`\n  ${conCaptacion} con capa de captacion · ${sinCaptacion} exactamente como estaban`);

/* ── E13 (D-200): EL HERO, POR CONDADO ─────────────────────────────────────────────────────────
 * `heroes-ciudad.json` → `porCondado` dice que ciudades son de cada condado y que foto lleva cada una.
 * `heroe-ciudad.mjs` ya tumba el build si dos comparten foto; esto lo mira en lo DESPLEGADO y comprueba
 * el dato del que depende la regla: que las ciudades de la tabla son EXACTAMENTE las que enlaza la
 * pagina del condado. Si la tabla pusiera una ciudad en otro condado, la regla se cumpliria en el papel
 * y no en el mapa. La foto se compara por su nombre sin sufijo de variante: dos derivadas de la misma
 * foto son la misma foto. */
console.log('\n── el hero de cada ciudad, por condado (E13) ──');
const HEROES = leerJson('src/data/heroes-ciudad.json');
const sinVariante = (u) => decodeURIComponent(u).split('/').pop().replace(/\.\w+$/, '').replace(/-(?:mm|lcp|hero|lam|serv)\d+$/, '');
let condadosOk = 0;
for (const [condado, ciudades] of Object.entries(HEROES.porCondado ?? {}).filter(([k]) => !k.startsWith('_'))) {
  const html = leer(`/services/pool-builders/${condado}`);
  if (!html) { mal(condado, 'la pagina del condado no esta en el build'); continue; }
  const main = new JSDOM(html).window.document.querySelector('main') ?? new JSDOM(html).window.document;
  const enlazadas = new Set([...main.querySelectorAll('a[href^="/services/pool-builders/"]')].map((a) => a.getAttribute('href').split('/').pop())
    .filter((s) => /-fl$/.test(s) && !/-county-fl$/.test(s)));
  const tabla = new Set(Object.keys(ciudades));
  const sobran = [...tabla].filter((c) => !enlazadas.has(c)); const faltan = [...enlazadas].filter((c) => !tabla.has(c));
  if (sobran.length || faltan.length) { mal(condado, `la tabla no casa con la pagina del condado — en la tabla y no enlazadas: ${sobran.join(', ') || '—'} · enlazadas y no en la tabla: ${faltan.join(', ') || '—'}`); continue; }
  // D-234 (LOOP-AREAS): como en los demas servicios, una foto puede repetir en el condado si esta DECLARADA en
  // `porServicio.pool-builders.repetidas.<condado>` (max 2 y motivo «calidad (D-206)»). Lo no declarado sigue en rojo.
  const decl = HEROES.porServicio?.['pool-builders']?.repetidas?.[condado];
  const max = decl?.max ?? 1;
  // D-235: hasta 3 solo para corregir el foco del hero, con el motivo «foco (D-220)»; para lo demas, 2 y «calidad (D-206)».
  const porFoco = /foco \(D-220/.test(decl?.motivo ?? '');
  if (decl && (max > 3 || (max === 3 && !porFoco) || (!porFoco && !/calidad \(D-206/.test(decl.motivo ?? ''))))
    mal(condado, `repetidas: max ${max} con motivo «${decl.motivo ?? ''}» (D-234: 2 con «calidad (D-206)»; D-235: 3 solo con «foco (D-220)»)`);
  const vistas = new Map(); let repetida = false;
  for (const c of [condado, ...tabla]) {
    const h = leer(`/services/pool-builders/${c}`);
    const img = h && new JSDOM(h).window.document.querySelector('.mm-hero-a-medio img');
    if (!img) { mal(c, 'sin foto de hero'); repetida = true; continue; }
    const f = sinVariante(img.getAttribute('src'));
    const ya = vistas.get(f) ?? [];
    if (ya.length >= max) { mal(c, `comparte hero con ${ya.join(', ')} (${f}), las dos de ${condado}${max > 1 ? `, y se declararon ${max} como mucho` : ''}`); repetida = true; }
    vistas.set(f, [...ya, c]);
  }
  if (!repetida) condadosOk++;
}
console.log(`  ${condadosOk} condado(s) cerrados: sus ciudades son las que enlaza el condado y ningun hero se repite sin declarar (D-234, D-235)`);

/* E13 etapa 4: los demas servicios por tabla. La tabla cubre EXACTAMENTE las ciudades del servicio (si falta una,
 * esa pagina vuelve a la bolsa sin que nadie lo vea) y, en lo desplegado, ninguna foto sale en un condado mas
 * veces de las que declara `repetidas`. */
const CONDADO_DE = new Map(Object.entries(HEROES.porCondado ?? {}).filter(([k]) => !k.startsWith('_')).flatMap(([co, cs]) => Object.keys(cs).map((c) => [c, co])));
const PAGINAS_SERVICIO = Object.keys(leerJson('src/data/ciudades-servicios.json').paginas);
for (const [servicio, { tabla, repetidas = {} }] of Object.entries(HEROES.porServicio ?? {}).filter(([k]) => !k.startsWith('_'))) {
  const enTabla = Object.keys(tabla).filter((k) => !k.startsWith('_'));
  const delServicio = PAGINAS_SERVICIO.filter((r) => r.split('/')[2] === servicio).map((r) => r.split('/')[3]);
  const sobran = enTabla.filter((c) => !delServicio.includes(c)); const faltan = delServicio.filter((c) => !enTabla.includes(c));
  if (sobran.length || faltan.length) { mal(servicio, `la tabla no casa con las paginas del servicio — sobran: ${sobran.join(', ') || '—'} · faltan: ${faltan.join(', ') || '—'}`); continue; }
  const cuenta = new Map();
  for (const c of enTabla) {
    const h = leer(`/services/${servicio}/${c}`);
    const img = h && new JSDOM(h).window.document.querySelector('.mm-hero-a-medio img');
    if (!img) { mal(`${servicio}/${c}`, 'sin foto de hero'); continue; }
    const k = `${CONDADO_DE.get(c)}|${sinVariante(img.getAttribute('src'))}`;
    cuenta.set(k, [...(cuenta.get(k) ?? []), c]);
  }
  // D-235/D-236: el tercer uso en un condado solo con «foco (D-220)», o con «reservada (D-209)» en reforma; nunca mas de 3.
  for (const [co, d] of Object.entries(repetidas).filter(([k]) => !k.startsWith('_'))) {
    const ok3 = /foco \(D-220/.test(d.motivo ?? '') || (servicio === 'pool-remodeling' && /reservada \(D-209/.test(d.motivo ?? ''));
    if (d.max > 3 || (d.max === 3 && !ok3)) mal(`${servicio} · ${co}`, `repetidas: max ${d.max} con motivo «${d.motivo ?? ''}» (3 solo con «foco (D-220)», o «reservada (D-209)» en reforma)`);
  }
  let declaradas = 0;
  for (const [k, cs] of cuenta) {
    const [co, f] = k.split('|'); const max = repetidas[co]?.max ?? 1;
    if (cs.length > max) mal(`${servicio} · ${co}`, `${f} es el hero de ${cs.join(', ')}: ${cs.length} veces y se declararon ${max}`);
    else if (cs.length > 1) declaradas++;
  }
  console.log(`  ${servicio}: ${enTabla.length} ciudades por tabla · ${declaradas} foto(s) repetida(s) en su condado, todas declaradas`);
}
console.log(`${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — dos formas y solo dos'}\n`);
process.exit(fallos ? 1 : 0);
