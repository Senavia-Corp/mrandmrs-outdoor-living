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
 * NAV Y PIE SON LOS MISMOS EN LAS 115 PÁGINAS
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
  // LA TRAMPA DE AMS, y aqui estaba: el HTML servido trae `style="opacity:0"` EN LINEA en
  // los elementos que anima IX2 -270 repartidos por 35 paginas-. Es el anti-FOUC de Webflow:
  // «manten esto invisible hasta que arranque la interaccion». Sin webflow.js no arranca
  // nadie y se quedan invisibles PARA SIEMPRE. Ademas, un style en linea gana a cualquier
  // regla de autor, asi que tambien romperia el revelado propio.
  //
  // No lo caza check:texto -innerText incluye lo que tiene opacity:0-; lo caza check:ix2.
  for (const el of n.querySelectorAll('[style*="opacity"]')) {
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
