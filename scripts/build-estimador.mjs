#!/usr/bin/env node
/**
 * FASE 5 — porta `/pool-investment-estimator` a estático, sin Webflow.
 *
 *     npm run estimador
 *
 * QUÉ ES ESTA PÁGINA
 * No es una página de Webflow: es una app **Astro 5 + React `client:only`** servida por
 * **Webflow Cloud** desde `67ed3381-....wf-app-prod.cosmic.webflow.services`, montada bajo el
 * dominio real. Su HTML son 4,8 kB de cascarón y todo lo pinta React.
 *
 * POR QUÉ HAY QUE PORTARLA SÍ O SÍ
 * `/pool-cost-estimator` la embebe con un **iframe de URL ABSOLUTA** al dominio propio. Al
 * mover el DNS a Vercel, esa ruta deja de existir y la página pierde su función principal.
 *
 * POR QUÉ SE PUEDE
 * El bundle **no hace ni una llamada de red**: `fetch(`, `XMLHttpRequest`, `axios` y `/api/`
 * dan cero. Es una calculadora 100 % de cliente. Su único enlace saliente es
 * `/request-estimated`. Así que copiar los ficheros construidos y servirlos desde Vercel la
 * deja funcionando para siempre, sin depender de la suscripción de Webflow.
 *
 * LO QUE ESTO NO ES
 * Un port del CÓDIGO. Son 3 JS minificados sin fuentes: funciona, pero cambiar una fórmula o
 * un precio exigiría rehacer la app. Está anotado en la bitácora.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, '_source/estimator');
const DESTINO = path.join(RAIZ, 'public/pool-investment-estimator');
const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

const COSMIC = /https:\/\/[0-9a-f-]+\.wf-app-prod\.cosmic\.webflow\.services\/pool-investment-estimator/g;

const sinMapear = new Set();
const local = (url) => {
  const a = man[url] ?? man[url.replace(/\/([0-9a-f]{24})\/\1\//, '/$1/')];
  if (!a) { sinMapear.add(url); return url; }
  return a.publico;
};

fs.mkdirSync(path.join(DESTINO, '_astro'), { recursive: true });
let js = 0, css = 0;

for (const f of fs.readdirSync(ORIGEN)) {
  const bruto = fs.readFileSync(path.join(ORIGEN, f), 'utf8');
  if (f === 'index.html') continue;
  // El origen cosmic pasa a ruta relativa; el _astro/ se sirve bajo la propia ruta.
  let salida = bruto.replace(COSMIC, '');
  if (f.endsWith('.css')) {
    salida = salida.replace(/url\(\s*(['"]?)(https:\/\/cdn\.prod\.website-files\.com[^'")\s]+)\1\s*\)/g,
      (_, q, u) => `url(${local(u)})`);
    css++;
  } else js++;
  fs.writeFileSync(path.join(DESTINO, '_astro', f), salida);
}

const html = fs.readFileSync(path.join(ORIGEN, 'index.html'), 'utf8')
  .replace(COSMIC, '/pool-investment-estimator')
  .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" type="image/png" href="/images/site/favicon.png">');
fs.writeFileSync(path.join(DESTINO, 'index.html'), html);

if (sinMapear.size) {
  console.error(`\nROJO ${sinMapear.size} url() del CSS del estimador sin mapear:\n`);
  [...sinMapear].forEach((u) => console.error('   ' + u));
  process.exit(1);
}

const quedan = fs.readdirSync(path.join(DESTINO, '_astro'))
  .concat('index.html')
  .filter((f) => /wf-app-prod|website-files\.com/.test(
    fs.readFileSync(path.join(DESTINO, f === 'index.html' ? '' : '_astro', f), 'utf8')));

console.log(`\n  js  : ${js}   css : ${css}   html: 1`);
console.log(`  url() del CDN reescritas a local`);
console.log(`  ficheros con referencias a Webflow que quedan: ${quedan.length}`);
if (quedan.length) { console.error(`\nROJO quedan referencias: ${quedan.join(', ')}\n`); process.exit(1); }
console.log(`\n  OK public/pool-investment-estimator/\n`);
