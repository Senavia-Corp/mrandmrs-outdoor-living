#!/usr/bin/env node
/**
 * QA RESPONSIVE ACOTADA (SEO-REMEDIACION, 4-oct-2026) — no es una barrida: 6 rutas, 7 anchos.
 *
 *     node scripts/qa-responsive.mjs <base-url> <carpeta-salida>
 *
 * Por ruta y ancho: captura de la primera pantalla, desborde horizontal (scrollWidth > ancho),
 * errores de consola/pagina PROPIOS (se descartan los de hosts externos bloqueados en el
 * laboratorio: GTM, Ads, Turnstile), peticiones de video y el boton del menu en movil.
 * Resultado en <salida>/qa-responsive.json y las capturas en <salida>/*.jpg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [BASE = 'http://localhost:5057', OUT = 'seo-audit/qa'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RUTAS = ['/', '/services/pool-builders', '/services/pool-builders/gainesville-fl',
  '/services/pool-remodeling', '/about', '/request-estimated'];
const ANCHOS = [[360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
const EXTERNO = /googletagmanager|google|doubleclick|cloudflare|turnstile|ERR_TUNNEL|ERR_PROXY|instagram|facebook/i;

const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const filas = [];
for (const ruta of RUTAS) {
  for (const [w, h] of ANCHOS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    const p = await ctx.newPage();
    const errores = []; const videos = [];
    p.on('console', (m) => { if (m.type() === 'error' && !EXTERNO.test(m.text() + (m.location()?.url ?? ''))) errores.push(m.text().slice(0, 160)); });
    p.on('pageerror', (e) => errores.push('pageerror: ' + e.message.slice(0, 160)));
    p.on('request', (r) => { if (/\/videos\//.test(r.url())) videos.push(r.url().split('/').pop()); });
    await p.goto(BASE + ruta, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({
      desborde: document.documentElement.scrollWidth - innerWidth,
      h1: [...document.querySelectorAll('h1')].map((x) => x.innerText.trim()).slice(0, 2),
      burger: !!document.querySelector('.w-nav-button') && getComputedStyle(document.querySelector('.w-nav-button')).display !== 'none',
      main: !!document.querySelector('main'),
    }));
    const nombre = `${ruta.replace(/\//g, '_') || '_home'}-${w}`.replace(/^_/, '');
    await p.screenshot({ path: path.join(OUT, `${nombre}.jpg`), type: 'jpeg', quality: 60 });
    filas.push({ ruta, ancho: w, ...m, videos: [...new Set(videos)], errores });
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(path.join(OUT, 'qa-responsive.json'), JSON.stringify(filas, null, 1));
const malas = filas.filter((f) => f.desborde > 1 || f.errores.length || (f.ancho < 768 && f.videos.length));
console.log(`qa-responsive: ${filas.length} combinaciones · ${malas.length} con incidencias`);
for (const f of malas) console.log(`  ${f.ruta} @${f.ancho}: desborde ${f.desborde}px · videos ${f.videos.join(',') || '-'} · errores ${f.errores.join(' | ') || '-'}`);
