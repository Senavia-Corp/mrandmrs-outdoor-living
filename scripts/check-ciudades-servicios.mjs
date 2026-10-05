#!/usr/bin/env node
/**
 * PUERTA de las landings de ciudad de los demas servicios (LOOP-CIUDADES, 5-oct-2026).
 *
 *     npm run check:ciudades-servicios
 *
 * Estatica, sobre `.vercel/output/static` (construido con PUBLIC_ES_PRODUCCION=1). Existe porque
 * las rutas nuevas NO TIENEN REFERENCIA: `check-texto` y `check-visual` miden contra
 * `baseline/`, y estas rutas no estan alli, asi que esas dos puertas se las saltan —y eso no es
 * verde—. Esta puerta da de alta lo que cada ruta DECLARA (sale de `ciudades-servicios.json` y
 * de su entrada en `captacion-servicios.json`) y comprueba que la pagina construida lo dice, mas
 * lo que el encargo pide medir y dejar en el repo:
 *
 *   1. texto declarado: H1, H2, apoyo, intro, FAQ con sus fuentes, formulario e inversion, tal cual;
 *   2. SEO on-page: un H1, sin saltos de nivel, title/description/H1 UNICOS en todo el sitio,
 *      canonical a si misma, Open Graph, alt en todas las imagenes de contenido;
 *   3. SEO tecnico: JSON-LD que parsea, `Service` con `areaServed` de la ciudad, `FAQPage` = la
 *      FAQ visible, `BreadcrumbList` cuyos items existen; en sitemap.xml y en llms.txt;
 *   4. enlazado: enlaza a su ficha, a su condado (si lo tiene) y a sus hermanas de la misma
 *      ciudad; la ficha la enlaza de vuelta; ninguna huerfana;
 *   5. UNICIDAD. Entre dos paginas cualesquiera del mismo servicio, el texto que no es plantilla
 *      supera MINIMO_PALABRAS_PROPIAS; y ningun parrafo local (respuesta de la FAQ local) se repite
 *      en otra pagina del sitio, nueva o de piscina.
 *
 * EL MINIMO, Y POR QUE 60. «Texto que no es plantilla» = las frases de la pagina que no aparecen en
 * NINGUNA otra pagina del mismo servicio una vez cambiados ciudad y condado por un comodin. En estas
 * landings eso es, por diseno, el hecho local: la oficina que revisa el permiso, la norma o el
 * organismo, y lo que hacemos con ello. Escribirlo bien pide tres frases —quien, que exige, que
 * hacemos— y tres frases de ese tipo rondan las 60-90 palabras. Por debajo de 60 lo «local» es un
 * nombre cambiado en una frase de plantilla, que es justo la pagina puerta que no se publica.
 *
 * LO QUE ESTA PUERTA NO PUEDE MEDIR, Y LO DICE: que cada `fuentes[].url` responda 200. Necesita red
 * hacia esos dominios; las lista para que se comprueben donde la haya (`--fuentes` las imprime).
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const SITIO = 'https://www.mrandmrsoutdoorliving.com';
const MINIMO_PALABRAS_PROPIAS = 60;
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), 'utf8'));
const DATOS = leer('src/data/ciudades-servicios.json');
const CAPTA = leer('src/data/captacion-servicios.json');
const FILAS = leer('src/data/ciudades-servicios-filas.json');
const CIUDADES_PISCINA = leer('src/data/ciudades-captacion.json');

let rojos = 0;
const check = (msg, ok, detalle = '') => {
  if (!ok) rojos++;
  console.log(`  ${ok ? 'ok  ' : 'ROJO'} ${msg}${detalle ? ` — ${detalle}` : ''}`);
};
const html = (ruta) => {
  const f = path.join(ESTATICO, ruta, 'index.html');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};
const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const todasLasPaginas = (() => {
  const out = [];
  const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) anda(p); else if (e.name === 'index.html') out.push(p);
  } };
  anda(ESTATICO);
  return out.map((f) => '/' + path.relative(ESTATICO, path.dirname(f)).split(path.sep).join('/')).map((r) => (r === '/' ? '/' : r.replace(/\/$/, '')));
})();
const existe = (r) => todasLasPaginas.includes(r === '/' ? '/' : r.replace(/\/$/, ''));

if (!fs.existsSync(ESTATICO)) { console.error('No hay build: npm run build con PUBLIC_ES_PRODUCCION=1'); process.exit(1); }

/* ── titulos, descripciones y H1 de TODO el sitio, para la unicidad ─────────────────────────── */
const vistos = { title: new Map(), description: new Map(), h1: new Map() };
for (const r of todasLasPaginas) {
  const doc = new JSDOM(html(r)).window.document;
  if (doc.querySelector('meta[name="robots"][content*="noindex"]')) continue;
  const reg = (k, v) => { if (!v) return; const n = norm(v).toLowerCase(); vistos[k].set(n, [...(vistos[k].get(n) ?? []), r]); };
  reg('title', doc.title);
  reg('description', doc.querySelector('meta[name="description"]')?.content);
  for (const h of doc.querySelectorAll('h1')) reg('h1', h.textContent);
}

const sitemap = fs.readFileSync(path.join(ESTATICO, 'sitemap.xml'), 'utf8');
const llms = fs.readFileSync(path.join(ESTATICO, 'llms.txt'), 'utf8');
const RUTAS = Object.keys(DATOS.paginas);
const textos = {};   // ruta -> innerText aproximado del cuerpo
const fuentes = new Map();

console.log(`\n── landings de servicio por ciudad: ${RUTAS.length} ──`);
for (const ruta of RUTAS) {
  const P = DATOS.paginas[ruta];
  const C = CAPTA[ruta];
  const h = html(ruta);
  console.log(`\n  ${ruta}`);
  check('construida', Boolean(h));
  if (!h) continue;
  const doc = new JSDOM(h).window.document;
  const cuerpo = doc.querySelector('body');
  for (const n of cuerpo.querySelectorAll('script, style, noscript, section.menu, section.footer, section.code')) n.remove();
  const texto = norm(cuerpo.textContent);
  /* Para la UNICIDAD no cuentan las lineas que varian sin ser contenido: las listas de enlaces
   * (hermanas, fuentes) y los telefonos del heroe. Si contaran, una pagina «ganaria» palabras
   * propias solo por tener otra lista de hermanas. */
  const paraUnicidad = cuerpo.cloneNode(true);
  for (const n of paraUnicidad.querySelectorAll('.mm-faq-fuentes, .svc-heroe__tel, nav:not(.w-dropdown-list)')) n.remove();
  textos[ruta] = norm(paraUnicidad.textContent);
  const dice = (s) => texto.includes(norm(s));

  // 1 · texto declarado
  const declarado = [
    P.doc.h1Title, P.doc.h2Title, C.heroe.apoyo, C.heroe.licencias, P.doc.headingIntro, P.doc.paragraphIntro,
    C.faq.titulo, C.faq.entradilla, ...C.faq.anade.flatMap((q) => [q.pregunta, q.respuesta, ...(q.fuentes ?? []).map((f) => f.nombre)]),
    C.formulario.titulo, ...C.formulario.pasos, C.inversion.titulo, C.inversion.texto,
    ...C.confianza.tarjetas.flatMap((t) => [t.titulo, t.texto]),
  ];
  const faltan = declarado.filter((s) => !dice(s));
  check(`texto declarado presente (${declarado.length} piezas)`, !faltan.length, faltan.map((s) => `«${String(s).slice(0, 60)}»`).join(' · '));

  // 2 · SEO on-page
  const h1s = [...doc.querySelectorAll('h1')];
  check('un solo H1', h1s.length === 1, `hay ${h1s.length}`);
  const niveles = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((x) => Number(x.tagName[1]));
  const salto = niveles.findIndex((n, i) => i > 0 && n > niveles[i - 1] + 1);
  check('jerarquia de encabezados sin saltos', salto < 0, salto >= 0 ? `h${niveles[salto - 1]} -> h${niveles[salto]}` : '');
  const uno = (k, v) => (vistos[k].get(norm(v).toLowerCase()) ?? []);
  check('title unico en el sitio', uno('title', doc.title).length === 1, uno('title', doc.title).join(', '));
  const desc = doc.querySelector('meta[name="description"]')?.content;
  check('description unica en el sitio', Boolean(desc) && uno('description', desc).length === 1, uno('description', desc).join(', '));
  check('H1 unico en el sitio', uno('h1', h1s[0]?.textContent).length === 1, uno('h1', h1s[0]?.textContent).join(', '));
  check('title y H1 nombran servicio y ciudad', doc.title.includes(P.doc.name) && h1s[0]?.textContent.includes(P.doc.name));
  const canon = doc.querySelector('link[rel="canonical"]')?.href;
  check('canonical a si misma', canon === `${SITIO}${ruta}`, canon ?? 'sin canonical');
  for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) {
    const v = doc.querySelector(`meta[property="${k}"]`)?.content;
    check(`Open Graph ${k}`, Boolean(v), v ? '' : 'falta');
  }
  const sinAlt = [...doc.querySelectorAll('main img, section img')].filter((i) => !i.hasAttribute('alt'));
  check('todas las imagenes con atributo alt', !sinAlt.length, `${sinAlt.length} sin alt`);
  const galeria = [...doc.querySelectorAll('section.gallery img, section.trusted-section img, section.svc-inversion img, section.animated-divs-section img')]
    .map((i) => i.getAttribute('src')).filter(Boolean);
  const repetidas = galeria.filter((s, i) => galeria.indexOf(s) !== i);
  check('ninguna foto de obra repetida en la pagina', !repetidas.length, repetidas.join(', '));

  // 3 · SEO tecnico
  let ld = [];
  let parsea = true;
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { ld = ld.concat(JSON.parse(s.textContent)); } catch { parsea = false; }
  }
  check('JSON-LD parsea', parsea && ld.length > 0);
  const svc = ld.find((x) => x['@type'] === 'Service');
  check('Service con areaServed de la ciudad y proveedor #negocio',
    svc?.areaServed?.name === P.doc.name && svc?.provider?.['@id'] === `${SITIO}/#negocio` && svc?.url === `${SITIO}${ruta}`);
  const faqLd = ld.find((x) => x['@type'] === 'FAQPage');
  const faqVisible = C.faq.anade.map((q) => q.pregunta);
  check('FAQPage = la FAQ visible', JSON.stringify(faqLd?.mainEntity?.map((q) => q.name)) === JSON.stringify(faqVisible));
  const miga = ld.find((x) => x['@type'] === 'BreadcrumbList');
  const migaMal = (miga?.itemListElement ?? []).map((i) => i.item.replace(SITIO, '')).filter((r) => !existe(r));
  check('BreadcrumbList con items construidos', Boolean(miga) && !migaMal.length, migaMal.join(', '));
  check('en sitemap.xml', sitemap.includes(`<loc>${SITIO}${ruta}</loc>`));
  check('en llms.txt', llms.includes(`(${SITIO}${ruta})`));

  // 4 · enlazado
  const enlaces = new Set([...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  check('enlaza a su ficha', enlaces.has(P.enlaces.ficha));
  if (P.enlaces.condado) check('enlaza a su condado', enlaces.has(P.enlaces.condado) && existe(P.enlaces.condado));
  for (const hm of P.enlaces.hermanas) check(`enlaza a ${hm.href}`, enlaces.has(hm.href) && existe(hm.href));
  const ficha = html(P.enlaces.ficha) ?? '';
  check('su ficha la enlaza (no huerfana)', ficha.includes(`href="${ruta}"`));

  for (const q of C.faq.anade) for (const f of q.fuentes ?? []) fuentes.set(f.url, f.nombre);
}

/* ── 5 · unicidad ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── unicidad ──');
const comodin = (ruta, t) => {
  const P = DATOS.paginas[ruta];
  const fila = FILAS.ciudades[P.doc.slug];
  let x = t.split(P.doc.name).join('§C');
  if (fila?.condado) x = x.split(fila.condado).join('§K');
  return x;
};
const frases = (t) => t.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.split(' ').length >= 4);
const porServicio = {};
for (const r of RUTAS) (porServicio[DATOS.paginas[r].servicio] ??= []).push(r);
for (const [servicio, rutas] of Object.entries(porServicio)) {
  const fr = Object.fromEntries(rutas.map((r) => [r, new Set(frases(comodin(r, textos[r] ?? '')))]));
  let peor = Infinity; let quien = '';
  for (const r of rutas) {
    const otras = rutas.filter((o) => o !== r);
    const propias = [...fr[r]].filter((s) => !otras.some((o) => fr[o].has(s)));
    const palabras = propias.join(' ').split(/\s+/).filter(Boolean).length;
    if (!otras.length) continue;
    if (palabras < peor) { peor = palabras; quien = r; }
  }
  if (rutas.length < 2) {
    console.log(`  --   ${servicio}: 1 pagina, no hay otra con que compararla (no es verde: no se ha medido)`);
  } else {
    check(`${servicio}: texto propio >= ${MINIMO_PALABRAS_PROPIAS} palabras en cada una de ${rutas.length}`, peor >= MINIMO_PALABRAS_PROPIAS, `minimo ${peor} en ${quien}`);
  }
}
const locales = [];
// La pregunta local es la que lleva fuentes oficiales (las de plantilla no llevan).
for (const r of RUTAS) for (const q of CAPTA[r].faq.anade.filter((x) => x.fuentes?.length)) locales.push([r, norm(q.respuesta)]);
for (const c of CIUDADES_PISCINA.ciudades) for (const q of c.faqExtra ?? []) locales.push([`/services/pool-builders/${c.slug}`, norm(q.respuesta)]);
const repes = locales.filter(([r, t], i) => locales.findIndex(([r2, t2]) => t2 === t) !== i);
check(`ningun parrafo local repetido entre paginas (${locales.length} medidos)`, !repes.length, repes.map(([r]) => r).join(', '));

console.log(`\n── fuentes oficiales citadas: ${fuentes.size} (NO verificadas aqui: hace falta red hacia esos dominios) ──`);
if (process.argv.includes('--fuentes')) for (const [u, n] of fuentes) console.log(`     ${u}  (${n})`);

console.log(rojos ? `\nPUERTA ROJA — ${rojos} fallo(s)` : '\nPUERTA VERDE');
process.exit(rojos ? 1 : 0);
