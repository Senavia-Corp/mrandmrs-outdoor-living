#!/usr/bin/env node
/**
 * FASE 4 — deriva `src/styles/webflow.css` del CSS que sirve el sitio VIVO.
 *
 *     npm run css
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ SE PARTE DEL CSS DEL VIVO Y NO DEL EXPORT
 *
 * El del vivo (`…shared.efeeddf43.min.css`) es normalize + webflow + el CSS del sitio
 * fundidos en uno, y **es el que produjo las 460 capturas del baseline**. El del export son
 * tres ficheros distintos con rutas relativas. Partir del export sería perseguir deriva de
 * píxeles contra una referencia que se generó con otro CSS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ CAMBIA, Y NADA MÁS
 *
 *  1. Las 13 `url(https://…)` pasan a rutas locales, sacadas del manifiesto de la Fase 2.
 *     **Si alguna no se puede mapear, esto ABORTA.** Es el requisito duro del cliente (cero
 *     referencias a website-files.com) y un 404 en un `url()` de CSS no da error en ninguna
 *     consola: simplemente no se pinta el fondo.
 *  2. Las 2 variables con el nombre corrupto se sustituyen por su valor resuelto, en la
 *     declaración y en el uso. Son de verdad así en el origen:
 *         --_apps---colors--background\<deleted\|variable-d7d320f3-…\>: var(--white)
 *     Webflow serializó ahí el rastro de una variable borrada. Arrastrarlas significa que
 *     cualquiera que edite el CSS tenga que adivinar qué es eso; y las dos resuelven a
 *     `var(--white)`, que además ya está declarado limpio dos líneas más abajo.
 *  3. El `@import` de Google Fonts, si lo hubiera, se quita: las fuentes se auto-alojan.
 *
 * Todo lo demás se copia byte a byte. Cualquier otra cosa sería un cambio de diseño.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, '_source/webflow-css');
const DESTINO = path.join(RAIZ, 'src/styles/webflow.css');

const man = JSON.parse(fs.readFileSync(path.join(RAIZ, '_source/assets-manifest.json'), 'utf8')).assets;

const entradas = fs.readdirSync(ORIGEN).filter((f) => f.endsWith('.css')).sort();
if (entradas.length !== 1) throw new Error(`se esperaba 1 css en _source/webflow-css, hay ${entradas.length}`);

let css = fs.readFileSync(path.join(ORIGEN, entradas[0]), 'utf8');
const bytesAntes = css.length;

// ── 1 · url() al CDN -> rutas locales ───────────────────────────────────────
const sinMapear = [];
let reescritas = 0;
css = css.replace(/url\(\s*(['"]?)(https:\/\/[^'")\s]+)\1\s*\)/g, (todo, comilla, url) => {
  const a = man[url];
  if (!a) { sinMapear.push(url); return todo; }
  reescritas++;
  return `url(${a.publico})`;
});

if (sinMapear.length) {
  console.error(`\n🔴 ${sinMapear.length} url() del CSS sin entrada en el manifiesto:\n`);
  sinMapear.forEach((u) => console.error('   ' + u));
  console.error('\n   Añádelas al inventario (scripts/build-inventory.mjs escanea _source/webflow-css)');
  console.error('   y vuelve a correr `npm run assets`. NO se publica CSS apuntando al CDN.\n');
  process.exit(1);
}

// ── 2 · las 2 variables con el nombre corrupto ─────────────────────────────
// El nombre trae `\<deleted\|variable-<uuid>\>` con las barras de escape de CSS dentro.
const CORRUPTA = /--(_apps---colors--(?:background|card))\\<deleted\\\|variable-[0-9a-f-]+\\>/g;
const nombresCorruptos = [...new Set(css.match(CORRUPTA) ?? [])];
// primero el USO, que hay que redirigir al valor resuelto...
for (const nombre of nombresCorruptos) {
  const decl = css.match(new RegExp(`${nombre.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}\\s*:\\s*([^;}]+)`));
  const valor = decl?.[1]?.trim();
  if (!valor) throw new Error(`la variable corrupta ${nombre} no tiene valor que resolver`);
  css = css.split(`var(${nombre})`).join(valor);
  // ...y después la DECLARACIÓN, que ya no la referencia nadie
  css = css.replace(new RegExp(`${nombre.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}\\s*:\\s*[^;}]+;?`), '');
}

// ── 3 · Google Fonts fuera: se auto-alojan ─────────────────────────────────
const imports = (css.match(/@import[^;]+;/g) ?? []).filter((i) => /fonts\.googleapis/.test(i));
for (const i of imports) css = css.replace(i, '');

const cabecera = `/* DERIVADO — no editar a mano. Lo genera scripts/build-css.mjs desde\n`
  + ` * _source/webflow-css/${entradas[0]}, que es el CSS que sirve el sitio vivo\n`
  + ` * y con el que se capturaron las 460 imágenes del baseline.\n`
  + ` *\n`
  + ` * Cambios respecto al original, y ninguno más:\n`
  + ` *   · ${reescritas} url() del CDN de Webflow -> rutas locales\n`
  + ` *   · ${nombresCorruptos.length} variables con el nombre corrupto -> su valor resuelto\n`
  + ` *   · ${imports.length} @import de Google Fonts -> las fuentes se auto-alojan\n`
  + ` */\n`;

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, cabecera + css);

const quedan = (css.match(/website-files\.com|uploads-ssl\.webflow\.com|d3e54v103j8qbb/g) ?? []).length;
console.log(`\n  ${entradas[0]}`);
console.log(`  url() reescritas       : ${reescritas}`);
console.log(`  variables corruptas    : ${nombresCorruptos.length} resueltas`);
console.log(`  @import de Google Fonts: ${imports.length} quitados`);
console.log(`  referencias a Webflow   : ${quedan}`);
console.log(`  bytes                  : ${bytesAntes} -> ${css.length}`);
if (quedan) { console.error('\n🔴 quedan referencias a Webflow en el CSS\n'); process.exit(1); }
console.log(`\n  ✅ src/styles/webflow.css\n`);
