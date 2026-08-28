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
// Dentro de una cadena JSON o de un <script> el delimitador es la comilla, NO el parentesis:
// parar en `)` truncaba 3 og:image en `...florida%2520(1` y las dejaba sin mapear. Es el mismo
// bug que ya aparecio en el inventario. Se admite `)` y despues se recorta el que sobra.
const reUrlGlobal = /https:\/\/(?:cdn\.prod\.website-files|uploads-ssl\.webflow)\.com\/[^"'\s\\<>,]+/g;
const equilibra = (u) => { while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1); return u; };

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
  const reUrl = reUrlGlobal;
  for (const el of raiz.querySelectorAll('script')) {
    if (el.getAttribute('src')) continue;
    const t = el.textContent;
    // Webflow guarda la plantilla de lista vacia (`text/x-wf-template`) URL-CODIFICADA, asi
    // que la URL de dentro no casa ningun patron literal. Hay que decodificar, reescribir y
    // volver a codificar, o esas 20 referencias se publican apuntando al CDN.
    if (el.getAttribute('type') === 'text/x-wf-template') {
      let dec;
      try { dec = decodeURIComponent(t); } catch { continue; }
      if (!reUrl.test(dec)) continue;
      reUrl.lastIndex = 0;
      el.textContent = encodeURIComponent(dec.replace(reUrl, (u) => local(equilibra(u))));
      continue;
    }
    if (!/website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb/.test(t)) continue;
    el.textContent = t.replace(reUrl, (u) => local(equilibra(u)));
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
  // FASE 6: tambien las 101 de coleccion. Es el mismo camino -el marcado sale del HTML
  // servido de cada una-, asi que no hay una segunda implementacion que pueda divergir.
  .filter(([, tipo]) => tipo === 'estatica' || tipo === 'coleccion' || tipo === 'estatica-oculta');

const generadas = [];
const porColeccion = {};
for (const [ruta] of RUTAS) {
  const slug = aSlug(ruta);
  const fichero = path.join(RAIZ, '_source/vivo', `${slug}.html`);
  if (!fs.existsSync(fichero)) { console.error(`  ROJO falta _source/vivo/${slug}.html`); continue; }
  const doc = new JSDOM(fs.readFileSync(fichero, 'utf8')).window.document;

  const menu = doc.querySelector('section.menu');
  const pie = doc.querySelector('section.footer');
  // /pool-investment-estimator no tiene cascaron porque NO ES una pagina de Webflow: es la
  // app Astro+React de Webflow Cloud. La sirve public/, la porta scripts/build-estimador.mjs.
  if (ruta === '/pool-investment-estimator') continue;
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
    /**
     * DECISION D3 (Sebastian, 28-ago-2026) — FUERA EL IFRAME de /pool-cost-estimator.
     *
     * Esa pagina embebia `/pool-investment-estimator` en un `<iframe>` con altura FIJA
     * (900/1400/1600 px segun el ancho) porque el estimador era una app de Webflow Cloud que
     * vivia en otro servidor. Desde la Fase 12c es un componente de este mismo sitio, asi que
     * el iframe ya no compra nada: cuesta un documento entero, un juego de CSS y JS repetido, y
     * unas alturas fijas que o sobran o cortan.
     *
     * Se sustituye por el MISMO mecanismo con el que ya se cambian los 4 widgets de Elfsight:
     * un marcador que mas abajo se convierte en `<Estimador />`. Por eso el componente vive en
     * `components/widgets/`: asi el generador de imports no necesita ningun caso especial.
     *
     * La ruta `/pool-investment-estimator` NO desaparece: sigue siendo una de las 115 y sigue
     * sirviendo el estimador desnudo. Las dos comparten el componente.
     */
    for (const emb of [...n.querySelectorAll('.code-embed-cost')]) {
      (emb.closest('.w-embed') ?? emb).replaceWith(doc.createTextNode(MARCA + 'Estimador' + MARCA));
      usados.add('Estimador');
    }
    // El iframe del estimador viene con URL ABSOLUTA al dominio de produccion. Se pasa a
    // relativa: si no, cualquier preview cargaria el sitio VIEJO de Webflow dentro del nuevo
    // -y el check:visual estaria comparando el original contra si mismo-. Tras el corte
    // apuntaria al sitio bueno igualmente, pero hasta entonces mentiria en cada verificacion.
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
    // FASE 8: los formularios de Webflow mueren al salir de Webflow -enviaban a
    // webflow.com/api/v1/form-. Se reapuntan al endpoint propio y se les anaden las dos capas
    // que van en el cliente. El comportamiento vive en src/components/Formularios.astro.
    for (const form of n.querySelectorAll('form[data-name]')) {
      /**
       * SOLO LOS DOS FORMULARIOS DE LEAD. No todo `<form>` de Webflow envía nada.
       *
       * `/gallery` tiene un `form[data-name="service-filter"]` que es el FILTRO de Finsweet: un
       * `<select>` que no se envía a ninguna parte. Reapuntarlo a `/api/formulario` le colgaba
       * el honeypot y hacía que `Formularios.astro` le montara un widget de Turnstile encima —
       * en una página que no recoge datos de nadie.
       *
       * Medido con `diag-geometria.mjs` contra el vivo: `div.gallery-filter-form` salía **2 px
       * más alta** y eso desplazaba las 181 fotos de la galería. `check:visual` lo veía como
       * «98,7 %, diferencia repartida por toda la página», que es justo lo que parece medio
       * píxel de desfase al reescalar a 1/4, y no señalaba nada.
       *
       * La lista es la MISMA que conoce `src/pages/api/formulario.ts`: si un formulario no está
       * ahí, el endpoint lo rechaza con «formulario desconocido», así que cablearlo era además
       * mandar al visitante a un 400.
       */
      // El endpoint conoce un TERCERO, `Pool Estimator Form` (Fase 12d), que NO va aquí: no
      // sale del HTML de Webflow, lo escribe `components/widgets/Estimador.astro` con su
      // `data-mm-envia` y su honeypot puestos a mano. Esta lista es solo la de los formularios
      // DERIVADOS; el invariante que importa sigue siendo el mismo -si un `data-name` no está
      // en `FORMULARIOS` de `api/formulario.ts`, el envío es un 400-.
      const LEADS = new Set(['Contact Page Form', 'Request Quote Form']);
      if (!LEADS.has(form.getAttribute('data-name'))) continue;
      form.setAttribute('method', 'post');
      form.setAttribute('action', '/api/formulario');
      form.dataset.mmEnvia = '1';
      // HONEYPOT. Se llama `ref_id` a proposito: `company_url` o parecidos los autorellenan
      // los gestores de contrasenas y tiran usuarios de verdad. Oculto sin `display:none`,
      // que algunos bots detectan, y fuera del orden de tabulacion.
      if (!form.querySelector('[name="ref_id"]')) {
        const hp = doc.createElement('input');
        hp.type = 'text'; hp.name = 'ref_id'; hp.tabIndex = -1;
        hp.setAttribute('autocomplete', 'off');
        hp.setAttribute('aria-hidden', 'true');
        hp.setAttribute('style', 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0');
        form.appendChild(hp);
      }
    }
    for (const f of n.querySelectorAll('iframe[src^="https://mrandmrsoutdoorliving.com/"]')) {
      f.setAttribute('src', f.getAttribute('src').replace('https://mrandmrsoutdoorliving.com', ''));
    }
    // Y los 1482 enlaces internos ABSOLUTOS al dominio de produccion, repartidos por 114
    // paginas. En una preview, cada clic se sale al sitio VIEJO de Webflow: navegar el sitio
    // nuevo seria imposible y cualquier verificacion estaria mirando el original. Despues del
    // corte funcionarian, pero hasta entonces mienten en todo.
    for (const a of n.querySelectorAll('a[href^="https://mrandmrsoutdoorliving.com"]')) {
      a.setAttribute('href', a.getAttribute('href').replace('https://mrandmrsoutdoorliving.com', '') || '/');
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

  // Todo lo demas del <head> que es SEO, tal cual lo sirve el origen. `description` va aparte
  // porque Base ya la emite; repetirla daria dos etiquetas.
  const metaSeo = {};
  for (const m of doc.head.querySelectorAll('meta[property],meta[name]')) {
    const k = m.getAttribute('property') || m.getAttribute('name');
    if (!/^(og:|twitter:|robots$|keywords$)/.test(k)) continue;
    if (k === 'description') continue;
    metaSeo[k] = local(m.getAttribute('content') ?? '');
  }
  // El JSON-LD se reserializa con las claves ORDENADAS para que un diff no falle por el orden.
  // Los 8 bloques que NO parsean se dejan CRUDOS: son un defecto del origen (un salto de linea
  // literal dentro de la cadena) y el contrato dice replicarlo, no arreglarlo.
  const ordena = (v) => (Array.isArray(v) ? v.map(ordena)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordena(v[k])])) : v);
  const jsonLd = [];
  const jsonLdCrudo = [];
  for (const sc of doc.head.querySelectorAll('script[type="application/ld+json"]')) {
    const t = sc.textContent.replace(reUrlGlobal, (u) => local(equilibra(u)));
    try { jsonLd.push(ordena(JSON.parse(t))); } catch { jsonLdCrudo.push(t); }
  }

  // La profundidad importa: /blogs/{slug} vive en src/pages/blogs/, asi que necesita ../../
  const arriba = '../'.repeat((ruta.match(/\//g) ?? []).length);
  const imports = [...usados].map((c) => `import ${c} from '${arriba}components/widgets/${c}.astro';`).join('\n');
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
import Base from '${arriba}layouts/Base.astro';
${imports}

${consts}
const SEO = ${JSON.stringify({ meta: metaSeo, jsonLd })};
${jsonLdCrudo.length ? `// ${jsonLdCrudo.length} bloque(s) de JSON-LD del origen NO parsean (salto de linea literal
// dentro de la cadena). Se emiten CRUDOS, byte a byte, porque el contrato dice replicar.
const LD_CRUDO = ${JSON.stringify(jsonLdCrudo)};` : 'const LD_CRUDO = [];'}
---
<Base titulo=${JSON.stringify(titulo)} descripcion=${JSON.stringify(desc)} ruta=${JSON.stringify(ruta)}${pie ? '' : ' conPie={false}'} seo={SEO} jsonLdCrudo={LD_CRUDO}>
  ${cuerpoAntes}
  ${cuerpo}
  ${cuerpoTras}
</Base>
`);
  generadas.push([ruta, partes.length, acumulado.length, [...usados].join('+')]);
  const col = ruta.split('/')[1] && RUTAS.find(([r]) => r === ruta)?.[2];
  porColeccion[col || 'estatica'] = (porColeccion[col || 'estatica'] ?? 0) + 1;
}

if (sinMapear.size) {
  console.error(`\nROJO ${sinMapear.size} URLs del CDN sin entrada en el manifiesto:\n`);
  [...sinMapear].slice(0, 10).forEach((u) => console.error('   ' + u));
  console.error('\n   No se generan paginas que apunten al CDN de Webflow.\n');
  process.exit(1);
}

console.log('');
for (const [k, v] of Object.entries(porColeccion).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(20)} ${String(v).padStart(3)} paginas`);
}
const kb = generadas.reduce((a, [, , b]) => a + b, 0) / 1024;
console.log(`\n  OK ${generadas.length} paginas · ${Math.round(kb)} kB de marcado\n`);
