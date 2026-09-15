#!/usr/bin/env node
/**
 * PUERTA de estructura — las 53 ciudades de `/pool-builders/`, en DOS formas y solo dos.
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
 * datos, R19 C4-, e inversion y FAQ detras de la prueba social.
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
  'hero-glass-section', 'trusted-section', '_3d-section', 'animated-divs-section',
  'testimonial-section', 'projects-section', 'blog-section-page', 'social-media', 'cta-footer',
];
const CON = [
  'hero-glass-section', 'svc-confianza', 'trusted-section', 'appointment-section',
  '_3d-section', 'animated-divs-section', 'testimonial-section', 'projects-section',
  'svc-inversion', 'faq-section', 'blog-section-page', 'social-media', 'cta-footer',
];

const CAPTACION = leerJson('src/data/captacion-servicios.json');
const TODAS = Object.keys(leerJson('src/data/seo-pool-builders.json'))
  .map((s) => `/pool-builders/${s}`).sort();
const CON_CAPTACION = new Set(TODAS.filter((r) => CAPTACION[r]));

const leer = (ruta) => {
  for (const p of [path.join(ESTATICO, ruta, 'index.html'), path.join(ESTATICO, `${ruta}.html`)]) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

let fallos = 0;
const mal = (r, m) => { fallos++; console.log(`  ROJO ${r}\n       ${m}`); };

console.log('\n── estructura de las 53 ciudades de /pool-builders/ ──');
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
  const cuerpo = clases.slice(clases.indexOf('hero-glass-section'), clases.lastIndexOf('footer'));
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
    const forms = [...d.querySelectorAll('section.appointment-section form[data-mm-envia="1"]')];
    if (forms.length !== 1) {
      mal(ruta, `${forms.length} formulario(s) de envio dentro de la seccion de captacion; `
        + 'tiene que haber exactamente 1.');
      continue;
    }
    const fotos = d.querySelectorAll('section.faq-section .mm-collage > img').length;
    if (fotos !== 5) { mal(ruta, `el collage de la FAQ trae ${fotos} fotos y el bento pide 5.`); continue; }
    conCaptacion++;
  } else {
    /* Y AL REVES, QUE ES LA MITAD QUE IMPORTA: una ciudad sin entrada no puede haber ganado NADA.
     * Si un widget se monta sin su guarda, aqui se ve — y se ve sin capturas y sin baseline. */
    const restos = ['form[data-mm-envia="1"]', '.svc-confianza', '.svc-inversion',
      '.svc-captacion', '.faq-section', '.mm-collage', '.svc-cierre', '.svc-heroe__tel']
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
console.log(`${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — dos formas y solo dos'}\n`);
process.exit(fallos ? 1 : 0);
