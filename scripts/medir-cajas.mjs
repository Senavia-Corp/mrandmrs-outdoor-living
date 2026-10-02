/**
 * MEDIR LAS CAJAS DE FOTO — PROMPT-LOOP-IMAGENES F0.
 *
 * Mide, sobre `.vercel/output/static` y con Chromium HEADLESS, la caja real de cada hueco de
 * foto y la zona que le tapa texto, en los 4 anchos del casting (390, 768, 991, 1440). Todo el
 * casting del loop (`encaje-foto.mjs`, el juez) se hace contra estas cajas, no contra la foto
 * al 100 %.
 *
 *     node scripts/medir-cajas.mjs > banco/.trabajo/loop-imagenes/cajas.json
 *
 * Por hueco y ancho: `[ancho, alto]` de la <img> y `texto` = rectangulo que tapa texto, en
 * fraccion de la caja ({x,y,w,h} de 0 a 1), o null si no hay texto encima. Una caja que no se
 * pinta a ese ancho sale null (collage: solo 3 teselas por debajo de 992).
 *
 * ponytail: una ficha (kitchens) vale por las 14: misma plantilla, 70 img, verificado en
 * captacion-servicios.json `_lee_esto`.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { ARGS_NAVEGADOR } from './lib/captura.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const FICHA = '/services/custom-outdoor-kitchens-for-north-south-florida-homes';
const ANCHOS = [[390, 844], [768, 1024], [991, 800], [1440, 900]];

const PUERTO = 4743;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const cand = [path.join(ESTATICO, url), path.join(ESTATICO, url + '.html'), path.join(ESTATICO, url, 'index.html')];
  const f = cand.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(PUERTO, r));

const { chromium } = await import('playwright');
const nav = await chromium.launch({ headless: true, args: ARGS_NAVEGADOR });

// Lo que se ejecuta en la pagina: caja de la <img> y del texto que la tapa, en fraccion.
const MEDIR = ([selImg, selTexto, indice]) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; };
  const imgs = [...document.querySelectorAll(selImg)].filter(vis);
  const img = imgs[indice ?? 0];
  if (!img) return null;
  const b = img.getBoundingClientRect();
  let texto = null;
  if (selTexto) {
    // Union de todo lo que casa y pisa la caja: el titulo y la descripcion del megamenu son
    // dos <div> hermanos, no uno.
    const rs = [...document.querySelectorAll(selTexto)].filter(vis)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom);
    const t = rs.length && { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)),
      right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
    if (t) {
      const x0 = Math.max(t.left, b.left), y0 = Math.max(t.top, b.top);
      const x1 = Math.min(t.right, b.right), y1 = Math.min(t.bottom, b.bottom);
      texto = { x: +((x0 - b.left) / b.width).toFixed(3), y: +((y0 - b.top) / b.height).toFixed(3),
        w: +((x1 - x0) / b.width).toFixed(3), h: +((y1 - y0) / b.height).toFixed(3) };
    }
  }
  return { caja: [Math.round(b.width), Math.round(b.height)], texto, visibles: imgs.length };
};

const HUECOS = {
  heroe:     [FICHA, 'img.image-bg-hero-services', '.block-hero-services-page'],
  galeria:   [FICHA, 'section.gallery img.image-gallery', null],
  proceso:   [FICHA, 'img.img-process', null],
  inversion: [FICHA, 'img.svc-inversion__foto', null],
  faq0:      [FICHA, '.mm-collage img', null, 0],
  faq1:      [FICHA, '.mm-collage img', null, 1],
  faq3:      [FICHA, '.mm-collage img', null, 3],
  menu:      ['/', '.wrapper-picture-service.is-active img.picture-service', '.wrapper-picture-service.is-active .cover > div'],
  full:      ['/', 'article.svc-ficha:not([hidden]) img.svc-foto', 'article.svc-ficha:not([hidden]) .svc-barra'],
  full_contador: ['/', 'article.svc-ficha:not([hidden]) img.svc-foto', 'article.svc-ficha:not([hidden]) .svc-contador'],
};

const salida = { medido: new Date().toISOString().slice(0, 10), anchos: ANCHOS.map((a) => a[0]), huecos: {} };
for (const [ancho, alto] of ANCHOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const paginas = {};
  for (const [id, [ruta, selImg, selTexto, indice]] of Object.entries(HUECOS)) {
    if (!paginas[ruta]) {
      const p = await ctx.newPage();
      await p.goto(`http://localhost:${PUERTO}${ruta}`, { waitUntil: 'load' });
      await p.waitForTimeout(400);
      if (ruta === '/') {
        // Abrir el desplegable «Services» del megamenu (Interacciones.astro lo abre por click).
        await p.evaluate(() => {
          const t = [...document.querySelectorAll('.w-dropdown-toggle')]
            .find((x) => /services/i.test(x.textContent) && x.getBoundingClientRect().width > 0);
          t?.click();
        });
        await p.waitForTimeout(400);
      }
      paginas[ruta] = p;
    }
    const m = await paginas[ruta].evaluate(MEDIR, [selImg, selTexto, indice]);
    (salida.huecos[id] ??= {})[ancho] = m;
  }
  await ctx.close();
}
await nav.close();
servidor.close();
process.stdout.write(JSON.stringify(salida, null, 2) + '\n');
