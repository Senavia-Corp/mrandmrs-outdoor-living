#!/usr/bin/env node
/**
 * FASE 5 — genera las páginas ESTÁTICAS desde el HTML servido del sitio vivo.
 *
 *     npm run paginas
 *
 * De dónde sale el marcado: `_source/vivo/*.html`, el HTML SERVIDO. No de `baseline/html/`,
 * que es el DOM después de ejecutar JS y trae estado que no es del documento.
 *
 * Qué cambia respecto al origen, y nada más:
 *   1. Las URLs del CDN de Webflow pasan a rutas locales (src, srcset, style, data-video-urls,
 *      poster). **Si alguna no se puede mapear, esto ABORTA**: el requisito del cliente es
 *      cero referencias a website-files.com, y un 404 en un `url()` no da error en consola.
 *   2. Los `<div class="elfsight-app-...">` con su `<script>` se sustituyen por los
 *      componentes nativos (decisión D2). El click-to-call vive en el layout: aquí se quita.
 *   3. Los `<script>` de Webflow y de los terceros que se retiran (jQuery, webflow.js, el
 *      config de Finsweet, showdown y el render de tablas markdown) se quitan.
 *
 * Lo que NO se toca: los `data-w-id` (los necesita la Fase 7), las clases de Webflow, el
 * orden de las secciones y los `<script>` en línea que son código de la propia página.
 *
 * SOBRE showdown Y EL RENDER DE TABLAS MARKDOWN: se quitan porque **no hacen nada**. El
 * script busca bloques `[markdown]...[/markdown]` dentro de `.w-richtext`, y no hay ni uno
 * en las 115 páginas. Medido, no supuesto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

/** Widgets de Elfsight -> componentes nativos. El click-to-call ya vive en el layout. */
const WIDGETS = {
  'ce5a93b9-7d28-40c9-8767-e211c9d09497': 'ResenasGoogle',
  'fdd09947-7c83-4b04-9694-2331de1a89a2': 'FeedInstagram',
  'e4536a7a-7d1e-4555-8d8c-e81075d084b0': '',   // click-to-call: está en Base.astro
  // El CUARTO widget, que PROMPT.md no conocía. Es el único de los 4 que SÍ pinta.
  '2dd65b70-1baf-4e76-86a4-a77acd88989d': 'GaleriaYouTube',
};

/** Scripts de terceros que se van, con el motivo. */
const SCRIPTS_FUERA = [
  [/jquery-3\.5\.1/, 'jQuery: solo lo pedia webflow.js'],
  [/\/js\/webflow\./, 'webflow.js: IX2 se reimplementa en la Fase 7'],
  [/finsweetcomponentsconfig/, 'config de Finsweet: filtrado, marquee y slider se rehacen en local'],
  [/showdown/, 'showdown: solo lo usa el render de tablas markdown, que no tiene nada que renderizar'],
  [/seo_ai_markdown_table_render/, 'busca bloques markdown y no hay ninguno en las 115 paginas'],
  [/elfsightcdn\.com/, 'Elfsight: los 3 widgets se rehacen nativos (D2)'],
  [/@finsweet\/attributes/, 'Finsweet: se reimplementa en local'],
  [/flowbase-co\/boosters-before-after-slider/, 'el antes/despues se reimplementa en local'],
];

const MARCA = '@@WIDGET@@';

const sinMapear = new Set();
function local(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  if (!/(website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb\.cloudfront\.net)/.test(url)) return url;
  const a = man[url] ?? man[url.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/')];
  if (!a) { sinMapear.add(url); return url; }
  return a.publico;
}

const aSlug = (r) => (r === '/' ? 'index' : r.replace(/^\//, '').replace(/\//g, '_'));

/** Reescribe TODO lo que puede llevar una URL del CDN. */
function localizar(raiz) {
  for (const el of raiz.querySelectorAll('[src]')) el.setAttribute('src', local(el.getAttribute('src')));
  // Tambien los href: los botones de descarga de los 54 PDF apuntaban al CDN. No son
  // imagenes, asi que no salian en ningun escaneo de src/srcset, y el sitio habria seguido
  // sirviendo sus folletos desde Webflow.
  for (const el of raiz.querySelectorAll('a[href]')) el.setAttribute('href', local(el.getAttribute('href')));
  for (const el of raiz.querySelectorAll('[poster]')) el.setAttribute('poster', local(el.getAttribute('poster')));
  for (const el of raiz.querySelectorAll('[data-poster-url]')) el.setAttribute('data-poster-url', local(el.getAttribute('data-poster-url')));
  for (const el of raiz.querySelectorAll('[srcset]')) {
    el.setAttribute('srcset', el.getAttribute('srcset').split(',')
      .map((p) => { const [u, d] = p.trim().split(/\s+/); return [local(u), d].filter(Boolean).join(' '); })
      .join(', '));
  }
  // Los videos de fondo llevan mp4 y webm separados por coma en un solo atributo.
  for (const el of raiz.querySelectorAll('[data-video-urls]')) {
    el.setAttribute('data-video-urls',
      el.getAttribute('data-video-urls').split(',').map((u) => local(u.trim())).join(','));
  }
  // Y dentro de los <script>: el JSON-LD de /gallery lleva 137 URLs de imagen del CDN, y el
  // codigo en linea de otras paginas alguna mas. No son atributos, asi que ningun escaneo de
  // src/srcset/href las veia, y el sitio habria seguido pidiendoselas a Webflow.
  for (const el of raiz.querySelectorAll('script')) {
    if (el.getAttribute('src')) continue;
    const t = el.textContent;
    if (!/website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb/.test(t)) continue;
    el.textContent = t.replace(/https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,)]+/g,
      (u) => local(u));
  }
  for (const el of raiz.querySelectorAll('[style]')) {
    const s = el.getAttribute('style');
    if (!/website-files|cloudfront/.test(s)) continue;
    el.setAttribute('style', s.replace(
      /url\(\s*(?:&quot;|["'])?(https:\/\/[^"')]+?)(?:&quot;|["'])?\s*\)/g, (_, u) => `url(${local(u)})`));
  }
}

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g).map((c) => c.slice(1, -1)))
  .filter(([, tipo]) => tipo === 'estatica');

const generadas = [];
for (const [ruta] of RUTAS) {
  const slug = aSlug(ruta);
  const fichero = path.join(RAIZ, '_source/vivo', `${slug}.html`);
  if (!fs.existsSync(fichero)) { console.error(`  ROJO falta _source/vivo/${slug}.html`); continue; }
  const doc = new JSDOM(fs.readFileSync(fichero, 'utf8')).window.document;

  const menu = doc.querySelector('section.menu');
  const pie = doc.querySelector('section.footer');
  if (!menu) { console.error(`  ROJO ${ruta}: no encuentro el nav`); continue; }

  const usados = new Set();
  const limpia = (n) => {
    localizar(n);
    for (const s of n.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src') ?? '';
      if (SCRIPTS_FUERA.some(([re]) => re.test(src))) s.remove();
    }
    if (n.tagName === 'SCRIPT' && SCRIPTS_FUERA.some(([re]) => re.test(n.getAttribute('src') ?? ''))) return '';
    for (const div of [...n.querySelectorAll('[class*="elfsight-app-"]')]) {
      const id = String(div.className).replace('elfsight-app-', '').trim();
      const comp = WIDGETS[id] ?? '';
      const envoltorio = div.closest('.w-embed') ?? div;
      envoltorio.replaceWith(doc.createTextNode(MARCA + comp + MARCA));
      if (comp) usados.add(comp);
    }
    // El iframe del estimador viene con URL ABSOLUTA al dominio de produccion. Se pasa a
    // relativa: si no, cualquier preview cargaria el sitio VIEJO de Webflow dentro del nuevo
    // -y el check:visual estaria comparando el original contra si mismo-. Tras el corte
    // apuntaria al sitio bueno igualmente, pero hasta entonces mentiria en cada verificacion.
    for (const f of n.querySelectorAll('iframe[src^="https://mrandmrsoutdoorliving.com/"]')) {
      f.setAttribute('src', f.getAttribute('src').replace('https://mrandmrsoutdoorliving.com', ''));
    }
    return n.outerHTML;
  };

  // /gallery lleva su hero ANTES del nav. Una sola página de las 115, pero si se ignora, esas
  // dos líneas salen en otro sitio del innerText y check:texto no perdona el orden.
  const code = doc.querySelector('section.code');
  let antesNav = '';
  for (let n = doc.body.firstElementChild; n && n !== menu; n = n.nextElementSibling) {
    const t = n.tagName.toLowerCase();
    if (n === code || t === 'script' || t === 'style') continue;
    if (String(n.className).includes('elfsight-app-')) continue;   // el click-to-call, ya en Base
    antesNav += limpia(n);
  }

  let acumulado = '';
  for (let n = menu.nextElementSibling; n && n !== pie; n = n.nextElementSibling) acumulado += limpia(n);

  // 2 páginas llevan un <script>+<style> DESPUÉS del pie (el redimensionador del iframe del
  // estimador). Si se ignoraran, esas páginas perderían código; si se pegaran arriba,
  // cambiaría el orden del documento.
  let trasPie = '';
  if (pie) for (let n = pie.nextElementSibling; n; n = n.nextElementSibling) trasPie += limpia(n);

  // Se parte por los marcadores para poder intercalar componentes de verdad.
  const partes = [];
  for (const [i, t] of acumulado.split(MARCA).entries()) {
    if (i % 2 === 0) { if (t) partes.push({ html: t }); }
    else if (t) partes.push({ componente: t });
  }

  const trocear = (txt) => {
    const out = [];
    for (const [i, t] of txt.split(MARCA).entries()) {
      if (i % 2 === 0) { if (t) out.push({ html: t }); }
      else if (t) out.push({ componente: t });
    }
    return out;
  };
  const partesTras = trocear(trasPie);
  const partesAntes = trocear(antesNav);

  const titulo = doc.querySelector('title')?.textContent ?? '';
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

  const imports = [...usados].map((c) => `import ${c} from '../components/widgets/${c}.astro';`).join('\n');
  const cuerpo = partes.map((p, i) => (p.componente ? `<${p.componente} />` : `<Fragment set:html={T${i}} />`)).join('\n  ');
  const consts = [...partes.map((p, i) => (p.componente ? null : `const T${i} = ${JSON.stringify(p.html)};`)),
    ...partesTras.map((p, i) => (p.componente ? null : `const P${i} = ${JSON.stringify(p.html)};`)),
    ...partesAntes.map((p, i) => (p.componente ? null : `const A${i} = ${JSON.stringify(p.html)};`))]
    .filter(Boolean).join('\n');
  const cuerpoAntes = partesAntes.map((p, i) => (p.componente
    ? `<${p.componente} slot="antes-nav" />`
    : `<Fragment slot="antes-nav" set:html={A${i}} />`)).join('\n  ');
  const cuerpoTras = partesTras.map((p, i) => (p.componente
    ? `<${p.componente} slot="tras-pie" />`
    : `<Fragment slot="tras-pie" set:html={P${i}} />`)).join('\n  ');

  const destino = ruta === '/' ? 'index' : ruta.slice(1);
  const salida = path.join(RAIZ, 'src/pages', `${destino}.astro`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, `---
// DERIVADO - no editar a mano. Lo genera scripts/build-paginas.mjs desde
// _source/vivo/${slug}.html (el HTML que sirve el sitio vivo). Regenerar: npm run paginas
import Base from '../layouts/Base.astro';
${imports}

${consts}
---
<Base titulo=${JSON.stringify(titulo)} descripcion=${JSON.stringify(desc)} ruta=${JSON.stringify(ruta)}${pie ? '' : ' conPie={false}'}>
  ${cuerpoAntes}
  ${cuerpo}
  ${cuerpoTras}
</Base>
`);
  generadas.push([ruta, partes.length, acumulado.length, [...usados].join('+')]);
}

if (sinMapear.size) {
  console.error(`\nROJO ${sinMapear.size} URLs del CDN sin entrada en el manifiesto:\n`);
  [...sinMapear].slice(0, 10).forEach((u) => console.error('   ' + u));
  console.error('\n   No se generan paginas que apunten al CDN de Webflow.\n');
  process.exit(1);
}

console.log('');
for (const [r, n, b, w] of generadas) {
  console.log(`  ${r.padEnd(28)} ${String(n).padStart(2)} trozos  ${String(Math.round(b / 1024)).padStart(4)} kB  ${w}`);
}
console.log(`\n  OK ${generadas.length} paginas estaticas\n`);
