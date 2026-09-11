/**
 * PUERTA DE LAS LANDING PAGES DE PAGO.
 *
 * NO finge un Quality Score de Google. Google no publica su formula y lo que pondera depende de
 * historico y de competencia, que este repo no ve. Lo que esta puerta hace es lo contrario y es
 * lo unico honesto: fijar los INVARIANTES CONTROLABLES de las 4 URLs finales de anuncio, para
 * que un cambio futuro no convierta en silencio
 *
 *     «Custom Pool Builders In Gainesville»  ->  «Outdoor Living Services»
 *
 * que es exactamente el fallo que destruye Landing Page Experience y Ad Relevance sin que nadie
 * se entere hasta ver la factura.
 *
 * Las 4 URLs son FINAL URLs de campanas activas. Una URL final que redirige es RECHAZO DE
 * ANUNCIO, no una molestia: por eso se comprueba que ninguna tenga redirect declarado.
 *
 * Corre sobre `.vercel/output/static`, como las demas. Con `PUBLIC_ES_PRODUCCION=1` exige
 * ademas canonica correcta y ausencia de noindex.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const PROD = process.env.PUBLIC_ES_PRODUCCION === '1';
const SITIO = process.env.PUBLIC_SITE_URL || 'https://www.mrandmrsoutdoorliving.com';

/** Las 4 landing pages, con la intencion que el anuncio promete y la que NO debe competir. */
const LANDINGS = [
  {
    grupo: 'Pool Builders Core',
    ruta: '/services/custom-pool-spa-builders-in-north-south-florida',
    exige: [/custom pool/i, /builders?/i],
    exigeCuerpo: [/pool/i, /north .{0,3}south florida|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /pole barn/i, /landscaping/i],
    /**
     * R17-CORE — LO QUE ESTA LANDING TIENE Y LAS OTRAS TRES TODAVIA NO.
     *
     * `formulario` y `heroe` se declaran POR LANDING y no se dan por supuestos para las cuatro:
     * hoy solo el Core tiene formulario propio y heroe con prioridad. Exigirselo a las otras
     * tres pondria la puerta roja por un trabajo que este encargo no hace — y una puerta roja
     * por algo que nadie va a arreglar hoy deja de leerse. Lo que SI se hace es DECIRLO: las
     * que no declaran salen con una linea PENDIENTE, medida, al final de la puerta. La ausencia
     * de senal no es senal buena.
     */
    formulario: {
      dataName: 'Pool Builders Core Form',
      campo: 'Project-Type',
      preseleccion: 'New Custom Pool',
    },
    heroe: 'img.image-bg-hero-services',
  },
  {
    grupo: 'Gainesville',
    ruta: '/pool-builders/gainesville-florida',
    exige: [/pool builders?/i, /gainesville/i],
    exigeCuerpo: [/inground|in-ground/i, /alachua|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /commercial/i],
  },
  {
    grupo: 'Ocala',
    ruta: '/pool-builders/ocala-florida',
    exige: [/pool builders?/i, /ocala/i],
    exigeCuerpo: [/inground|in-ground/i, /marion|north florida/i],
    prohibeArriba: [/pergola/i, /outdoor kitchen/i, /commercial/i],
  },
  {
    grupo: 'Full Remodel',
    ruta: '/services/pool-remodeling-renovation-in-north-south-florida',
    exige: [/remodel/i],
    exigeCuerpo: [/renovat|remodel/i, /pool/i],
    // Remodelacion NO es reparacion suelta ni limpieza: eso atrae el lead equivocado.
    prohibeArriba: [/leak repair/i, /pool cleaning/i, /weekly service/i, /pergola/i],
  },
];

/** Donde aterriza la conversion. Si alguna se cae, el trafico de pago no convierte. */
const DESTINOS = ['/contact-us', '/request-estimated', '/thank-you'];

/** Hoja 18 del libro de campana: prohibido sin confirmacion de Sebastian. */
const AFIRMACIONES_PROHIBIDAS = [
  [/\$55[Kk]\b/, '$55K como umbral de piscina nueva — DATA NOT AVAILABLE'],
  [/\$20[Kk]\+/, '$20K+ como umbral de remodelacion — DATA NOT AVAILABLE'],
  [/100\+\s*(5|five)[- ]?star/i, '«100+ reseñas de 5 estrellas» — DATA NOT AVAILABLE'],
  [/\b#1\b|\bbest in florida\b|\baward[- ]winning\b/i, 'superlativo sin evidencia'],
  [/\bguaranteed\b/i, 'garantia sin terminos confirmados'],
];

const TEL_NF = '(352) 740-3361';
const TEL_SF = '(954) 913-7112';

let fallos = 0;
const mal = (r, m) => { fallos++; console.log(`  ROJO ${r}\n       ${m}`); };
const bien = (m) => console.log(`  ok   ${m}`);

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

console.log('\n── las 4 URLs finales de anuncio ──');

const redirects = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')).redirects ?? [];
const titulos = new Map();

for (const L of LANDINGS) {
  const html = leer(L.ruta);
  if (!html) { mal(L.ruta, `no se construyo. Es URL final del grupo «${L.grupo}»: sin pagina, el anuncio manda trafico a un 404.`); continue; }
  const d = new JSDOM(html).window.document;
  /* DEFECTO ARREGLADO: esta linea usaba el contador GLOBAL `fallos`, asi que en cuanto una
   * landing fallaba, NINGUNA de las siguientes imprimia su `ok` aunque estuviera perfecta.
   * El veredicto seguia siendo correcto, pero la salida ocultaba que paso. */
  const fallosAntes = fallos;

  // 1 · redirect sobre una URL final = rechazo de anuncio
  const red = redirects.find((r) => r.source.replace(/\/$/, '') === L.ruta);
  if (red) mal(L.ruta, `tiene un redirect declarado hacia ${red.destination}. Una URL final que redirige es RECHAZO DE ANUNCIO.`);

  // 2 · un solo h1
  const h1s = [...d.querySelectorAll('h1')];
  if (h1s.length !== 1) mal(L.ruta, `${h1s.length} <h1>; tiene que haber exactamente 1.`);

  // 3 · title y description
  const titulo = d.querySelector('title')?.textContent?.trim() ?? '';
  const desc = d.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  if (!titulo) mal(L.ruta, 'sin <title>.');
  if (!desc) mal(L.ruta, 'sin meta description.');
  if (titulos.has(titulo)) mal(L.ruta, `<title> repetido con ${titulos.get(titulo)}: dos landings compitiendo por la misma consulta.`);
  titulos.set(titulo, L.ruta);

  // 4 · indexacion
  const robots = d.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (/noindex/i.test(robots)) mal(L.ruta, 'lleva noindex. Una landing de pago con noindex pierde Landing Page Experience.');
  if (PROD) {
    const can = d.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    if (can !== `${SITIO}${L.ruta}`) mal(L.ruta, `canonica «${can}», se esperaba «${SITIO}${L.ruta}».`);
  }

  // 5 · correspondencia de mensaje arriba del pliegue
  const arriba = [h1s[0]?.textContent ?? '', d.querySelector('h2')?.textContent ?? ''].join(' ');
  for (const re of L.exige) {
    if (!re.test(arriba)) mal(L.ruta, `el h1/h2 no dice ${re}. El anuncio del grupo «${L.grupo}» promete esa intencion; la pagina tiene que reconocerse en segundos.`);
  }
  for (const re of L.prohibeArriba) {
    if (re.test(arriba)) mal(L.ruta, `el h1/h2 mete ${re} arriba del pliegue, compitiendo con la intencion del anuncio. Ese contenido va MAS ABAJO, no se borra.`);
  }

  // 6 · cuerpo
  d.querySelectorAll('script,style,noscript,nav,header').forEach((e) => e.remove());
  const cuerpo = (d.body?.textContent ?? '').replace(/\s+/g, ' ');
  const primeras = cuerpo.split(' ').slice(0, 120).join(' ');
  for (const re of L.exigeCuerpo) {
    if (!re.test(primeras)) mal(L.ruta, `las primeras 120 palabras de contenido no dicen ${re}.`);
  }

  // 7 · conversion
  if (!/free estimate|request an estimate|schedule a consultation/i.test(cuerpo)) {
    mal(L.ruta, 'sin CTA de estimacion reconocible.');
  }
  const aDestino = [...d.querySelectorAll('a[href]')].some((a) => DESTINOS.some((x) => a.getAttribute('href').startsWith(x)));
  if (!aDestino) mal(L.ruta, `sin camino a conversion: ningun enlace a ${DESTINOS.join(' / ')}.`);

  // 8 · telefono de North Florida primero (hoja 24)
  const iNF = cuerpo.indexOf(TEL_NF); const iSF = cuerpo.indexOf(TEL_SF);
  if (iNF < 0) mal(L.ruta, `no aparece el telefono de North Florida ${TEL_NF}, que es el que debe ver el trafico de pago.`);
  else if (iSF >= 0 && iSF < iNF) mal(L.ruta, 'el telefono de South Florida sale antes que el de North Florida.');

  // 9 · JSON-LD valido
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.textContent); } catch (e) { mal(L.ruta, `JSON-LD que no parsea: ${e.message}`); }
  }

  // 10 · afirmaciones prohibidas
  for (const [re, por] of AFIRMACIONES_PROHIBIDAS) {
    if (re.test(cuerpo)) mal(L.ruta, `afirmacion prohibida — ${por}`);
  }

  /**
   * 11 · NI UNA CIFRA DE DINERO EN EL CUERPO (R17-CORE).
   *
   * Es el agujero por el que paso «$75,000 residential pools to $500,000+», que estuvo
   * publicado en el cuerpo Y dentro del `FAQPage` de la landing del Core mientras esta puerta
   * salia verde: las cinco `AFIRMACIONES_PROHIBIDAS` buscan `$55K` y `$20K+`, que son otras
   * cadenas. Una cifra de precio en una landing de pago es una afirmacion sobre el precio, y
   * la hoja 18 del libro de campana exige confirmacion para cualquiera de ellas.
   *
   * Los `<select>` se descuentan ANTES: las seis opciones del rango de inversion del formulario
   * llevan importes a proposito -son el cualificador aprobado en A1, y reutilizan los rangos
   * que ya existian- y no son una afirmacion de la pagina, sino una eleccion del visitante.
   */
  const sinSelects = new JSDOM(html).window.document;
  sinSelects.querySelectorAll('script,style,noscript,nav,header,select').forEach((e) => e.remove());
  const cifras = [...new Set((sinSelects.body?.textContent ?? '').match(/\$\s?[0-9][0-9,]*\+?/g) ?? [])];
  if (cifras.length) {
    mal(L.ruta, `cifra(s) de dinero en el cuerpo: ${cifras.join(', ')}. Un precio en una landing `
      + 'de pago es una afirmacion sobre el precio, y la hoja 18 exige confirmarla. Si es un '
      + 'cualificador del formulario, va dentro de un <select>.');
  }

  /**
   * 12 · EL HEROE NO ES DIFERIBLE (R17-CORE).
   *
   * La imagen de fondo del heroe ES el LCP de estas paginas, y la del Core llevaba
   * `loading="lazy"`: el navegador la trataba como algo que puede esperar. En todo el sitio
   * habia UNA sola imagen con `fetchpriority`. En trafico de pago, mayoritariamente movil, el
   * LCP entra directo en Landing Page Experience.
   */
  if (L.heroe) {
    const hi = d.querySelector(L.heroe);
    if (!hi) mal(L.ruta, `no encuentro la imagen del heroe (${L.heroe}).`);
    else {
      if (hi.getAttribute('loading') === 'lazy') {
        mal(L.ruta, 'la imagen del heroe lleva loading="lazy" y es el LCP de la pagina.');
      }
      if (hi.getAttribute('fetchpriority') !== 'high') {
        mal(L.ruta, 'la imagen del heroe no lleva fetchpriority="high".');
      }
      if (!hi.getAttribute('width') || !hi.getAttribute('height')) {
        mal(L.ruta, 'la imagen del heroe no declara width/height: reserva 0 px y desplaza el resto.');
      }
    }
  }

  /**
   * 13 · UN SOLO FORMULARIO, CUALIFICADO, Y CONTANDO COMO CAMINO A CONVERSION (R17-CORE).
   *
   * Es la deduccion «CTA/Conversion -4» de la matriz: sin formulario propio, el trafico de pago
   * hace un SEGUNDO clic que ya ha pagado. Y «uno solo» no es un capricho: dos formularios en
   * la misma pagina se disputan el envio y parten la medicion en dos.
   *
   * `preseleccion` es lo que la hoja 24 pide y a la vez correspondencia de mensaje: quien llega
   * desde un anuncio de piscina nueva no tiene que elegir «piscina nueva».
   */
  if (L.formulario) {
    const forms = [...d.querySelectorAll('form')].filter((f) => f.getAttribute('data-mm-envia') === '1');
    if (forms.length !== 1) {
      mal(L.ruta, `${forms.length} formulario(s) con data-mm-envia="1"; tiene que haber exactamente 1. `
        + 'Sin el, el trafico de pago hace un segundo clic que el anuncio ya pago.');
    } else {
      const f = forms[0];
      if (f.getAttribute('data-name') !== L.formulario.dataName) {
        mal(L.ruta, `el formulario dice data-name="${f.getAttribute('data-name')}", se esperaba `
          + `"${L.formulario.dataName}". Ese valor es la clave de FORMULARIOS en la API y el `
          + 'form_name de GA4: si no casa, el lead se pierde o se mezcla con otro formulario.');
      }
      const sel = f.querySelector(`select[name="${L.formulario.campo}"] option[selected]`);
      if (sel?.value !== L.formulario.preseleccion) {
        mal(L.ruta, `${L.formulario.campo} preseleccionado en "${sel?.value ?? '(nada)'}", se `
          + `esperaba "${L.formulario.preseleccion}".`);
      }
      // El formulario ES el camino a conversion de esta pagina: se comprueba que apunta a la API
      // y que el aterrizaje sigue existiendo.
      if (f.getAttribute('action') !== '/api/formulario') {
        mal(L.ruta, `el formulario no envia a /api/formulario sino a "${f.getAttribute('action')}".`);
      }
      if (!f.querySelector('[name="ref_id"]')) mal(L.ruta, 'el formulario no lleva el honeypot ref_id.');
      const padre = f.parentElement;
      if (!padre?.querySelector('.w-form-done') || !padre?.querySelector('.w-form-fail')) {
        mal(L.ruta, 'faltan los paneles .w-form-done/.w-form-fail HERMANOS del <form>: sin ellos '
          + 'el JS de Formularios.astro no puede conmutar el estado.');
      }
    }
  }

  if (fallos === fallosAntes) bien(`${L.grupo.padEnd(20)} ${L.ruta}`);
}

/**
 * LO QUE FALTA POR EXTENDER, DICHO EN VOZ ALTA (R17-CORE).
 *
 * Las reglas 12 y 13 son POR LANDING. Las tres que no las declaran no salen rojas -este encargo
 * no las toca- pero tampoco salen en silencio: una puerta que no midio algo no puede parecer
 * que lo midio y le dio el visto bueno. Esta es la lista de lo que queda, medida en cada pasada.
 */
console.log('\n── pendiente de extender (A1 / heroe) ──');
{
  let pendientes = 0;
  for (const L of LANDINGS) {
    if (L.formulario && L.heroe) continue;
    const html = leer(L.ruta) ?? '';
    const dd = new JSDOM(html).window.document;
    const nForms = [...dd.querySelectorAll('form')].filter((f) => f.getAttribute('data-mm-envia') === '1').length;
    const hi = dd.querySelector('img.image-bg-hero-services');
    const falta = [];
    if (!L.formulario) falta.push(`sin formulario propio declarado (${nForms} en la pagina)`);
    if (!L.heroe) {
      falta.push(hi
        ? `heroe: loading="${hi.getAttribute('loading') ?? '-'}" fetchpriority="${hi.getAttribute('fetchpriority') ?? '-'}"`
        : 'heroe: sin <img> de fondo que medir (plantilla distinta)');
    }
    console.log(`  --   ${L.grupo.padEnd(20)} ${falta.join(' · ')}`);
    pendientes++;
  }
  console.log(`       ${pendientes} de ${LANDINGS.length} landings sin la capa de captacion. `
    + 'No es un fallo de esta puerta: es trabajo que no se ha hecho todavia.');
}

console.log('\n── destinos de conversion ──');
for (const r of DESTINOS) {
  if (!leer(r)) mal(r, 'no se construyo. Es donde aterriza el trafico de pago.');
  else bien(`${r} construido`);
}

/**
 * ── EL EVENTO DE CONVERSION, LA MITAD QUE EL SITIO SI CONTROLA ────────────────────────────
 *
 * La conversion es determinista: el formulario valida en servidor, redirige a `/thank-you`, y
 * `/thank-you` empuja `generate_lead` al dataLayer. Un solo evento por envio valido, disparado
 * despues del servidor y no en el submit del cliente.
 *
 * 🚨 LO QUE ESTA PUERTA NO PUEDE VER, Y HAY QUE DECIRLO: que GTM convierta ese push en un
 * evento de GA4. Medido el 11-sep-2026 sobre `properties/506563956`, del 1-ene al 11-sep:
 * `/thank-you` tiene 18 paginas vistas —o sea que SI se llega— y `generate_lead` tiene CERO
 * eventos. Los cinco tags de evento personalizado de `gtm-container.json` estan los cinco a
 * cero. El push sale del sitio; el tag no lo recoge. Eso se arregla en la interfaz de GTM, no
 * aqui, y mientras siga asi Maximize Conversions no tiene de que aprender.
 */
console.log('\n── evento de conversion (lado del sitio) ──');
{
  const ty = leer('/thank-you') ?? '';
  if (!/dataLayer\.push/.test(ty) || !/generate_lead/.test(ty)) {
    mal('/thank-you', 'ya no empuja `generate_lead` al dataLayer. Es el unico evento de conversion del sitio: sin el, la campana optimiza a ciegas.');
  } else bien('/thank-you empuja generate_lead (un solo evento, tras validar en servidor)');

  // Nunca page_view ni scroll como conversion primaria: Maximize Conversions aprenderia de ruido.
  for (const L of LANDINGS) {
    const h = leer(L.ruta) ?? '';
    if (/event:\s*['"](page_view|scroll)['"]/.test(h)) {
      mal(L.ruta, 'empuja page_view o scroll como evento propio. Nunca deben ser conversion primaria.');
    }
  }
}

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE'}\n`);
console.log('  NOTA: esta puerta NO mide Quality Score. Mide los invariantes que el sitio SI');
console.log('  controla. Expected CTR y el historico del anuncio no se ven desde aqui.');
process.exit(fallos ? 1 : 0);
