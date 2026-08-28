#!/usr/bin/env node
/**
 * Congela el HTML SERVIDO de las 115 rutas en `_source/vivo/`.
 *
 *     npm run vivo
 *
 * POR QUÉ NO VALE `baseline/html/`
 * Aquél es el DOM DESPUÉS de ejecutar JS: trae los `style="opacity:0"` que escribe IX2, los
 * clones que genera el marquee de Finsweet y los atributos que inyecta webflow.js. Sirve para
 * comparar píxeles y texto —es lo que ve el visitante—, pero como FUENTE DEL MARCADO metería
 * en las plantillas estado que no es del documento.
 *
 * Lo servido es el marcado de verdad, y es de donde salen las plantillas de las Fases 5 y 6.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BASE = 'https://mrandmrsoutdoorliving.com';
const DEST = path.join(RAIZ, '_source/vivo');

const aSlug = (r) => (r === '/' ? 'index' : r.replace(/^\//, '').replace(/\//g, '_'));
const csv = await fs.readFile(path.join(RAIZ, '_source/routes.csv'), 'utf8');
const RUTAS = csv.trim().split('\n').slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1));

await fs.mkdir(DEST, { recursive: true });
let ok = 0; const fallos = [];
const cola = [...RUTAS];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cola.length) {
    const r = cola.pop();
    try {
      const res = await fetch(BASE + r, { headers: { 'user-agent': 'Mozilla/5.0 (migracion mrandmrs)' } });
      if (!res.ok) { fallos.push(`${r} HTTP ${res.status}`); continue; }
      await fs.writeFile(path.join(DEST, `${aSlug(r)}.html`), await res.text());
      ok++;
    } catch (e) { fallos.push(`${r} ${e.message}`); }
  }
}));
console.log(`\n  ${ok}/${RUTAS.length} páginas congeladas en _source/vivo/`);
if (fallos.length) { console.error('\n🔴 fallos:'); fallos.forEach((f) => console.error('   ' + f)); process.exit(1); }
