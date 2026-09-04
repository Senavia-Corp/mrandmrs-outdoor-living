#!/usr/bin/env node
/**
 * FASE 4 — extrae el cascarón (nav y pie) del HTML que SIRVE el sitio vivo.
 *
 *     npm run shell
 *
 * Genera `src/components/Nav.astro` y `src/components/Footer.astro`. Son 43 KB de marcado:
 * copiarlo a mano no es una opción, y derivarlo con un script hace que se pueda regenerar
 * cuando haga falta y que el diff diga algo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE EL MARCADO
 *
 * Del HTML **servido**, no del que hay en `baseline/html/`. El baseline es el DOM DESPUÉS de
 * ejecutar JS: trae los `style="opacity:0"` que escribe IX2, los clones del marquee y los
 * atributos que inyecta webflow.js. Eso es la referencia para comparar píxeles, no la fuente
 * del marcado.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NAV Y PIE SON LOS MISMOS EN LAS 115 PÁGINAS — Y EN LAS PROPIAS
 *
 * Desde el 2-sep-2026 el sitio sirve 116: las 115 de la migración más `/financing`, que
 * también monta este cascarón porque usa `Base.astro`. Lo que sigue valiendo es la frase: nav
 * y pie son UNO, no 116 variantes.
 *
 * Comprobado sobre 7 páginas de 6 tipos distintos: lo ÚNICO que cambia entre ellas es
 * `w--current` + `aria-current="page"` en el enlace que apunta a la página actual. Aquí se
 * quitan los dos y se vuelven a poner en tiempo de render con la prop `ruta`, que es lo que
 * hacía Webflow. Así hay un componente y no 115 variantes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

const html = await (await fetch('https://mrandmrsoutdoorliving.com/')).text();
const doc = new JSDOM(html).window.document;

const sinMapear = [];

/**
 * ENLACES EXTERNOS DEL CASCARON QUE YA TIENEN PAGINA PROPIA. `[destino de fuera, ruta nuestra]`.
 * Los aplica `limpiar()`; el motivo largo esta alli, junto al bucle.
 */
const CON_PAGINA_PROPIA = [
  ['https://your.acornfinance.com', '/financing'],
  /**
   * LAS DOS LEGALES DEL PIE (D6 en MIGRACION-LOG.md). El pie las enlazaba a
   * `mrandmrsoutdoorsliving.com` —con «s», otro dominio— mientras nuestras propias
   * `/articles/terms-conditions` y `/articles/privacy-policy` existian, estaban en el sitemap
   * y NO LAS ENLAZABA NADIE: 0 enlaces internos en las 116 paginas (SEO-URLS-PLAN.md
   * hallazgo 3). Dos dominios sirviendo el mismo contenido legal en paralelo.
   *
   * ESTO NO DECIDE QUE HACER CON EL DOMINIO CON «s» —301 o canonical cruzada, decision de
   * Sebastian y sigue pendiente—. El propio plan deja el pie enlazando la ruta local en LAS
   * DOS ramas de esa decision: una pagina sin ningun enlace interno no se arregla con una
   * canonical, se arregla enlazandola.
   *
   * Coste en texto visible: CERO. El rotulo no cambia, solo el `href` (y el `target`, que se
   * va solo: un enlace interno que abre pestana nueva rompe el boton de atras).
   */
  ['https://mrandmrsoutdoorsliving.com/terms-of-service', '/articles/terms-conditions'],
  ['https://mrandmrsoutdoorsliving.com/privacy-policy-page', '/articles/privacy-policy'],
];
/**
 * ANCLAS MUERTAS DEL CASCARON. `[selector, ruta a la que deberian ir]`.
 *
 * El logo del pie sale de Webflow con `href="#"`: en las 114 paginas con pie, pulsarlo salta
 * al principio de la pagina en vez de ir a la portada, que es lo que todo el mundo espera de
 * un logo. No es un enlace roto para ninguna puerta —`#` resuelve siempre— y por eso llevaba
 * ahi desde la migracion sin que nadie lo viera.
 *
 * Se declara por SELECTOR y no por destino, al reves que `CON_PAGINA_PROPIA`: todos los `#`
 * son iguales, lo que distingue a este es quien lo lleva.
 */
const ANCLAS_MUERTAS = [
  ['a.footer-brand[href="#"]', '/'],
];
/**
 * ENLACES QUE EL CASCARON NO TIENE Y HAY QUE ANADIR. `[selector del contenedor, href, texto]`.
 *
 * La tercera huerfana, `/articles/accessibility`, no tiene enlace de origen que reapuntar: el
 * pie de Webflow solo trae Terms y Privacy. Aqui no se reapunta, se ANADE — y por eso es la
 * unica de las tres que cuesta TEXTO VISIBLE NUEVO en las 115 rutas, declarado en
 * `check-texto.mjs` (D6). Va al final de `div.div-block-8`, que es flex con gap y donde
 * `.link-3` ya esta estilada: cero CSS nuevo.
 *
 * Comparte el contador `reapuntados` y por tanto el aborto duro de mas abajo: si el contenedor
 * desaparece del origen, esto para la corrida en vez de dejar la huerfana sin enlace en silencio.
 */
const ENLACES_ANADIDOS = [
  // El selector NO puede llevar `section.footer` delante: `limpiar()` recibe YA ese nodo y
  // `querySelectorAll` solo mira descendientes, nunca al propio elemento. `div-block-8` no
  // existe en el nav, comprobado, asi que no hay ambiguedad.
  ['div.div-block-8', '/articles/accessibility', 'Accessibility', 'link-3'],
];
/**
 * NOMBRE ACCESIBLE PARA LOS ENLACES QUE SOLO LLEVAN UN ICONO. `[selector, aria-label]`.
 *
 * Webflow saca nueve enlaces del cascaron SIN NOMBRE: los dos logos -su <img> lleva `alt=""`
 * a proposito, que es correcto para una imagen decorativa pero deja al <a> mudo-, el `tel:`
 * del nav y los tres sociales de nav y pie, que son SVG pelados. Con un lector de pantalla
 * eran seis «link» seguidos sin decir a donde van, y Lighthouse los cuenta en `link-name`:
 * 5 nodos en la home y 7 puntos enteros de Accessibility.
 *
 * Va aqui y no solo a mano en el .astro para que una regeneracion lo reproduzca en vez de
 * revertirlo, igual que `CON_PAGINA_PROPIA` y `ANCLAS_MUERTAS`. Comparte el contador
 * `reapuntados`, o sea el aborto duro: si el origen renombra una clase, esto para la corrida.
 *
 * `aria-label` NO es `innerText`: `check:texto` no lo ve y sigue midiendo al 100 %. Y no pinta
 * nada, asi que `check:visual` tampoco se entera. Por eso es la moneda barata aqui.
 *
 * El `&` va crudo: lo escapa el serializador de JSDOM al escribir el marcado.
 */
const MARCA = 'Mr & Mrs Outdoor Living';
const NOMBRES_ACCESIBLES = [
  ['a.navbar-logo', `${MARCA} — home`],
  ['a.footer-brand', `${MARCA} — home`],
  ['a.phone-link', 'Call (352) 740-3361'],
  ['a[href*="facebook.com/mrandmrsoutdoorliving"]', `${MARCA} on Facebook`],
  ['a[href*="instagram.com/mrandmrsoutdoorliving"]', `${MARCA} on Instagram`],
  ['a[href*="youtube.com/channel/"]', `${MARCA} on YouTube`],
];
/** Cuantos se reapuntaron, por destino. Si alguno sale a 0 el marcado de origen ha cambiado. */
const reapuntados = new Map();
/** URL del CDN -> ruta local, con el manifiesto de la Fase 2 como única fuente. */
function local(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  const a = man[url];
  if (!a) { sinMapear.push(url); return url; }
  return a.publico;
}

function limpiar(nodo) {
  // El estado «página actual» lo pone la prop `ruta` al renderizar, no el marcado.
  for (const a of nodo.querySelectorAll('.w--current, [aria-current]')) {
    a.classList.remove('w--current');
    a.removeAttribute('aria-current');
    if (a.getAttribute('class') === '') a.removeAttribute('class');
  }
  // Los enlaces internos ABSOLUTOS al dominio de produccion pasan a relativos: en una preview
  // cada clic del nav se saldria al sitio viejo de Webflow.
  for (const a of nodo.querySelectorAll('a[href^="https://mrandmrsoutdoorliving.com"]')) {
    a.setAttribute('href', a.getAttribute('href').replace('https://mrandmrsoutdoorliving.com', '') || '/');
  }
  /**
   * ENLACES DEL NAV QUE YA TIENEN PAGINA PROPIA. El origen manda «Financing» directo a
   * Acorn Finance con `target="_blank"`: desde las 115 rutas, cada clic salia del sitio sin
   * que nadie hubiera explicado nada. Desde el 2-sep-2026 hay `/financing`, y el enlace
   * externo vive solo en el CTA de esa pagina.
   *
   * ESTO NO ES COSMETICO NI OPCIONAL: sin esta transformacion, el dia que alguien regenere el
   * cascaron el nav volveria a apuntar fuera en las 116 rutas y `/financing` se quedaria
   * huerfana, accesible solo por el sitemap. No daria error en ninguna consola.
   *
   * El `target` se va con el `href`: un enlace interno que abre pestaña nueva es un tic de
   * Webflow, no una decision, y rompe el boton de atras.
   *
   * Se declara por DESTINO y no por texto: el rotulo del nav puede cambiar, la URL de Acorn
   * es la que identifica el enlace. Si algun dia no casa con nada, esta funcion no lo avisa
   * —`build-shell.mjs` solo aborta por imagenes sin mapear—, asi que el conteo se comprueba
   * abajo, junto al de `sinMapear`.
   */
  for (const [fuera, dentro] of CON_PAGINA_PROPIA) {
    for (const a of nodo.querySelectorAll(`a[href^="${fuera}"]`)) {
      a.setAttribute('href', dentro);
      a.removeAttribute('target');
      reapuntados.set(fuera, (reapuntados.get(fuera) ?? 0) + 1);
    }
  }
  for (const [selector, dentro] of ANCLAS_MUERTAS) {
    for (const a of nodo.querySelectorAll(selector)) {
      a.setAttribute('href', dentro);
      reapuntados.set(selector, (reapuntados.get(selector) ?? 0) + 1);
    }
  }
  for (const [selector, etiqueta] of NOMBRES_ACCESIBLES) {
    for (const a of nodo.querySelectorAll(selector)) {
      if (a.hasAttribute('aria-label')) continue;              // idempotente
      a.setAttribute('aria-label', etiqueta);
      reapuntados.set(selector, (reapuntados.get(selector) ?? 0) + 1);
    }
  }
  for (const [selector, href, rotulo, clase] of ENLACES_ANADIDOS) {
    for (const cont of nodo.querySelectorAll(selector)) {
      if (cont.querySelector(`a[href="${href}"]`)) continue;   // idempotente
      const a = cont.ownerDocument.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('class', clase);
      a.textContent = rotulo;
      cont.appendChild(a);
      reapuntados.set(selector, (reapuntados.get(selector) ?? 0) + 1);
    }
  }
  // LA TRAMPA DE AMS, y aqui estaba: el HTML servido trae `style="opacity:0"` EN LINEA en
  // los elementos que anima IX2 -270 repartidos por 35 paginas-. Es el anti-FOUC de Webflow:
  // «manten esto invisible hasta que arranque la interaccion». Sin webflow.js no arranca
  // nadie y se quedan invisibles PARA SIEMPRE. Ademas, un style en linea gana a cualquier
  // regla de autor, asi que tambien romperia el revelado propio.
  //
  // No lo caza check:texto -innerText incluye lo que tiene opacity:0-; lo caza check:ix2.
  for (const el of nodo.querySelectorAll('[style*="opacity"]')) {
    const limpio = el.getAttribute('style').replace(/(^|;)\s*opacity\s*:\s*0(?!\.)\s*(?=;|$)/gi, '$1')
    .replace(/^;+|;+$/g, '').trim();
    if (limpio) el.setAttribute('style', limpio); else el.removeAttribute('style');
  }
  for (const img of nodo.querySelectorAll('img[src]')) img.setAttribute('src', local(img.getAttribute('src')));
  for (const el of nodo.querySelectorAll('[srcset]')) {
    el.setAttribute('srcset', el.getAttribute('srcset')
      .split(',').map((p) => { const [u, d] = p.trim().split(/\s+/); return [local(u), d].filter(Boolean).join(' '); })
      .join(', '));
  }
  for (const el of nodo.querySelectorAll('[style*="website-files"]')) {
    el.setAttribute('style', el.getAttribute('style')
      .replace(/url\(["']?(https:\/\/[^"')]+)["']?\)/g, (_, u) => `url(${local(u)})`));
  }
  return nodo.outerHTML;
}

/**
 * `webflow.js` inyecta un `<div class="w-nav-overlay">` vacío como último hijo de
 * `.navbar.w-nav`, y ahí mueve el menú al abrirlo en móvil. Como el HTML SERVIDO no lo trae
 * (lo crea el JS que quitamos), sin esto el cascarón tiene 302 elementos donde el vivo tiene
 * 303, en los 4 anchos. Se hornea igual que lo inyectaba Webflow; el comportamiento de abrir
 * y cerrar es de la Fase 7.
 */
const navbar = doc.querySelector('section.menu .navbar.w-nav');
if (navbar && !navbar.querySelector('.w-nav-overlay')) {
  const ov = doc.createElement('div');
  ov.className = 'w-nav-overlay';
  ov.setAttribute('data-wf-ignore', '');
  ov.id = 'w-nav-overlay-0';
  navbar.appendChild(ov);
}

const piezas = {
  Nav: limpiar(doc.querySelector('section.menu')),
  Footer: limpiar(doc.querySelector('section.footer')),
};

if (sinMapear.length) {
  console.error(`\n🔴 ${sinMapear.length} imágenes del cascarón sin entrada en el manifiesto:\n`);
  [...new Set(sinMapear)].forEach((u) => console.error('   ' + u));
  console.error('\n   No se genera un cascarón que apunte al CDN de Webflow.\n');
  process.exit(1);
}

/**
 * Y ABORTA IGUAL SI UN REAPUNTADO NO CASÓ CON NADA. Una transformación declarada que no se
 * aplica es peor que no declararla: deja el cascarón apuntando fuera y no lo dice. El único
 * modo de que esto salte es que el marcado del origen haya cambiado —que el enlace ya no
 * exista, o que la URL de destino sea otra—, y entonces lo que hay que revisar es la
 * declaración, no silenciar la comprobación.
 */
const sinCasar = [...CON_PAGINA_PROPIA, ...ANCLAS_MUERTAS, ...ENLACES_ANADIDOS, ...NOMBRES_ACCESIBLES]
  .filter(([clave]) => !reapuntados.get(clave));
if (sinCasar.length) {
  console.error(`\n🔴 ${sinCasar.length} enlace(s) declarado(s) que no casaron con nada:\n`);
  sinCasar.forEach(([fuera, dentro]) => console.error(`   ${fuera} -> ${dentro}`));
  console.error('\n   El cascarón seguiría enlazando fuera. Revisa si el origen cambió el enlace.\n');
  process.exit(1);
}
for (const [fuera, n] of reapuntados) console.log(`  reapuntados ${n} enlace(s) de ${fuera}`);

/**
 * El marcado va en un `set:html` sobre una plantilla: el HTML de Webflow lleva atributos que
 * Astro no acepta tal cual en JSX-ish (`fs-marquee-element`, `data-w-id`, comillas anidadas),
 * y reescribirlos sería reescribir el diseño.
 */
const cabecera = (nombre) => `---
// DERIVADO — no editar a mano. Lo genera scripts/build-shell.mjs desde el HTML que sirve
// https://mrandmrsoutdoorliving.com/ . Regenerar: npm run shell
//
// El marcado es el del origen, byte a byte, salvo dos cosas:
//   · las imágenes apuntan a public/ en vez de al CDN de Webflow
//   · \`w--current\`/\`aria-current\` se quitan y los repone \`ruta\` al renderizar, que es
//     lo único que Webflow cambiaba entre páginas (comprobado en 7 páginas de 6 tipos)
interface Props { ruta?: string }
const { ruta = '' } = Astro.props;

const marcado = MARCADO.replace(
  new RegExp(\`<a([^>]*?)href="\${ruta.replace(/[.*+?^\${}()|[\\\\]\\\\\\\\]/g, '\\\\\\\\$&')}"([^>]*?)class="([^"]*)"\`, 'g'),
  (_m, a, b, cls) => \`<a\${a}href="\${ruta}"\${b}aria-current="page" class="\${cls} w--current"\`,
);
---
<Fragment set:html={marcado} />
`;

for (const [nombre, marcado] of Object.entries(piezas)) {
  const destino = path.join(RAIZ, 'src/components', `${nombre}.astro`);
  const cuerpo = cabecera(nombre).replace('MARCADO', JSON.stringify(marcado));
  fs.writeFileSync(destino, cuerpo);
  console.log(`  ${nombre.padEnd(8)} ${String(marcado.length).padStart(6)} bytes  -> src/components/${nombre}.astro`);
}
console.log(`\n  imágenes reescritas a local: ${doc.querySelectorAll('section.menu img, section.footer img').length}`);
console.log('  ✅ cascarón generado\n');
