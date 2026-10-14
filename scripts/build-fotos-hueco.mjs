#!/usr/bin/env node
/**
 * LA FOTO DE UN HUECO, A LA PROPORCION DEL HUECO (E10 · D-189).
 *
 *     node scripts/build-fotos-hueco.mjs            deriva lo que falte y reescribe `fuentes`
 *     node scripts/build-fotos-hueco.mjs --check    falla si falta una derivada o no mide lo que dice
 *
 * POR QUE. Desde 992 px la foto de seccion (que hacemos, proceso, FAQ, resenas) va en una caja
 * vertical 4:5 y la del hero en una casi cuadrada, con `object-fit: cover`. Casi todo lo que se
 * servia era apaisado y, a menudo, un recorte 16:9 de una foto 4:3: la caja tiraba el 40-50 % de
 * los pixeles bajados y se quedaba corta de alto (medido: 1,28x a densidad 2 donde la foto mayor
 * daba 1,76x). Aqui se recorta LA MISMA foto, desde la mayor que haya en el repo, a la proporcion
 * de la caja. Solo recorte y codificacion: nada generativo.
 *
 * `src/data/fotos-hueco.json` · `fotos["<src que se sirve>"].<hueco>` = { de, pos } a mano; este
 * guion le añade `ratio`, `fuentes` y `_hecha` (la receta con la que se hicieron). `src/lib/srcset-auto.mjs` las sirve en un `<source>` solo de
 * escritorio: tablet y movil siguen con el `<img>` de siempre, sin un byte de diferencia.
 *
 *   lam  · seccion y resenas · 4:5 · 560, 800 y 1100 px de ancho (la caja mide 547 x 683)
 *   hero · hero de ficha     · 4:3 · 960, 1280 y 1600 px (la caja va de 473 x 587 a 1040 x 720)
 *   serv · indice de servicios · 3:2 · 800, 1200 y 1530 px (la caja mide 765 x 510)
 *
 * Una receta puede llevar `recorte` ("8/9") si a esa foto le va otra proporcion que la del hueco.
 * Nunca amplia: si el recorte da menos que un ancho, ese ancho se queda en lo que da. Y dice a
 * cuanto queda cada foto en su caja a densidad 2: por debajo de 1,5x no merece derivada, es
 * candidata a otra foto.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DATOS = path.join(RAIZ, 'src/data/fotos-hueco.json');
const CHECK = process.argv.includes('--check');
const HUECOS = {
  lam: { ratio: 4 / 5, anchos: [560, 800, 1100], caja: [547, 683] },
  hero: { ratio: 4 / 3, anchos: [960, 1280, 1600], caja: [573, 648] },
  serv: { ratio: 3 / 2, anchos: [800, 1200, 1530], caja: [765, 510] },
};
const enDisco = (u) => path.join(RAIZ, 'public', decodeURI(u));
const datos = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
let fallos = 0, nuevas = 0, total = 0;

for (const [src, huecos] of Object.entries(datos.fotos)) for (const [tipo, d] of Object.entries(huecos)) {
  if (!HUECOS[tipo]) { console.error(`✗ ${src} · hueco «${tipo}» no existe`); fallos++; continue; }
  // `recorte: "8/9"` cambia la proporcion de esa foto: un hero que sale de una vertical rinde mas a la de la caja que a 4:3
  const H = { ...HUECOS[tipo], ...(d.recorte && { ratio: d.recorte.split('/').reduce((a, b) => a / b) }) };
  if (!fs.existsSync(enDisco(d.de))) { console.error(`✗ ${src} · su fuente no esta: ${d.de}`); fallos++; continue; }
  const m = await sharp(enDisco(d.de)).metadata();
  // el recorte `cover` a la proporcion del hueco, con `pos` como `object-position`
  let w = m.width, h = Math.round(w / H.ratio);
  if (h > m.height) { h = m.height; w = Math.round(h * H.ratio); }
  const [px, py] = d.pos.split(/\s+/).map((v) => parseFloat(v) / 100);
  const recorte = { left: Math.round((m.width - w) * px), top: Math.round((m.height - h) * py), width: w, height: h };
  const anchos = [...new Set(H.anchos.map((a) => Math.min(a, w)))].filter((a, i, l) => i === 0 || a - l[i - 1] >= 80);
  const fuentes = anchos.map((a) => [a, src.replace(/\.\w+$/, `-${tipo}${a}.avif`)]);
  // la receta con la que se hicieron los ficheros: si `de`, `pos` o `recorte` cambian, se rehacen (y `--check` lo dice)
  const receta = [d.de, d.pos, d.recorte].filter(Boolean).join(' · ');
  if (CHECK) {
    if (JSON.stringify(d.fuentes) !== JSON.stringify(fuentes) || d.ratio !== +H.ratio.toFixed(4) || d._hecha !== receta) { console.error(`✗ ${src} · ${tipo}: \`fuentes\` no es lo que sale de su receta: vuelve a correr el guion`); fallos++; continue; }
    for (const [a, u] of fuentes) {
      const v = fs.existsSync(enDisco(u)) && await sharp(enDisco(u)).metadata();
      if (!v) { console.error(`✗ falta ${u}`); fallos++; } else if (v.width !== a || v.height !== Math.round(a / H.ratio)) { console.error(`✗ ${u} mide ${v.width}x${v.height}, tenia que medir ${a}x${Math.round(a / H.ratio)}`); fallos++; }
    }
  } else {
    for (const [a, u] of fuentes) if (d._hecha !== receta || !fs.existsSync(enDisco(u))) { await sharp(enDisco(d.de)).rotate().extract(recorte).resize(a, Math.round(a / H.ratio)).avif({ quality: 52, effort: 5 }).toFile(enDisco(u)); nuevas++; }
    d.ratio = +H.ratio.toFixed(4); d.fuentes = fuentes; d._hecha = receta;
    const da = Math.min(w / H.caja[0], h / H.caja[1]);
    console.log(`${da < 1.5 ? '!!' : 'ok'} ${tipo.padEnd(4)} ${da.toFixed(2)}x a densidad 2 · ${w}x${h} de ${m.width}x${m.height} · ${path.basename(src)}${da < 1.5 ? ' — no llega a 1,5x: candidata a otra foto' : ''}`);
  }
  total += fuentes.length;
}
if (!CHECK) fs.writeFileSync(DATOS, JSON.stringify(datos, null, 1) + '\n');
if (fallos) { console.error(`\n✗ fotos de hueco: ${fallos} fallo(s)`); process.exit(1); }
console.log(`✓ fotos de hueco: ${Object.keys(datos.fotos).length} fotos, ${total} derivadas${CHECK ? ', todas en disco y a su medida' : ` · ${nuevas} nuevas`}`);
