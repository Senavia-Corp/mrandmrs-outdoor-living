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
 * Y `zoom` (1.4) para cerrar el encuadre sobre `pos` cuando el cuadro entero ensena algo que sobra.
 * La fuente puede ser el propio JPEG que se sirve (mismo encuadre, en AVIF y sin lo que la caja tira);
 * de un AVIF ya servido no se deriva: recomprimirlo resta y no añade.
 * Con `origen` (la ruta del original dentro de BANCO_ORIGEN, como en el banco) deriva del original y
 * guarda sus medidas en `mide`: el original no entra en el repo y `--check` no lo necesita.
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
const ORIGEN = process.env.BANCO_ORIGEN;   // solo para las recetas con `origen`: el original, que no entra en el repo
const HUECOS = {
  lam: { ratio: 4 / 5, anchos: [560, 800, 1100], caja: [547, 683] },
  hero: { ratio: 4 / 3, anchos: [960, 1280, 1600], caja: [573, 648], altoMin: 560 },   // la caja del hero nunca baja de 560 px de alto
  serv: { ratio: 3 / 2, anchos: [800, 1200, 1530], caja: [765, 510] },
};
const enDisco = (u) => path.join(RAIZ, 'public', decodeURI(u));
const datos = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
let fallos = 0, nuevas = 0, total = 0;
const esperadas = new Set();

for (const [src, huecos] of Object.entries(datos.fotos)) for (const [tipo, d] of Object.entries(huecos)) {
  if (!HUECOS[tipo]) { console.error(`✗ ${src} · hueco «${tipo}» no existe`); fallos++; continue; }
  // `recorte: "8/9"` cambia la proporcion de esa foto: un hero que sale de una vertical rinde mas a la de la caja que a 4:3
  const H = { ...HUECOS[tipo], ...(d.recorte && { ratio: d.recorte.split('/').reduce((a, b) => a / b) }) };
  // `origen` (ruta dentro de BANCO_ORIGEN, la misma del banco): se deriva del ORIGINAL, que da para 2x donde el `.webp`
  // del banco (1600 px) no llega. El original no esta en el repo: la receta guarda `mide` y `--check` no lo necesita.
  const fuente = d.origen ? (ORIGEN ? path.join(ORIGEN, d.origen) : null) : enDisco(d.de);
  const hay = fuente && fs.existsSync(fuente);
  if (!hay && !(d.origen && d.mide)) { console.error(`✗ ${src} · su fuente no esta: ${d.origen ? `${d.origen} (BANCO_ORIGEN=${ORIGEN ?? 'sin poner'})` : d.de}`); fallos++; continue; }
  const meta = hay ? await sharp(fuente).metadata() : null;
  const m = !hay ? { width: d.mide[0], height: d.mide[1] } : meta.orientation >= 5 ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
  // el recorte `cover` a la proporcion del hueco, con `pos` como `object-position`
  let w = m.width, h = Math.round(w / H.ratio);
  if (h > m.height) { h = m.height; w = Math.round(h * H.ratio); }
  // `zoom: 1.4` cierra el recorte sobre `pos` para dejar fuera lo que estorba en los bordes; cuesta nitidez, y se dice
  if (d.zoom > 1) { w = Math.round(w / d.zoom); h = Math.round(w / H.ratio); }
  const [px, py] = d.pos.split(/\s+/).map((v) => parseFloat(v) / 100);
  const recorte = { left: Math.round((m.width - w) * px), top: Math.round((m.height - h) * py), width: w, height: h };
  // el mayor siempre es todo lo que da el recorte; un ancho que quede a menos de 80 px del siguiente sobra
  const anchos = [...new Set(H.anchos.map((a) => Math.min(a, w)))].filter((a, i, l) => i === l.length - 1 || (l[i + 1] - a >= 80 && a / H.ratio >= (H.altoMin ?? 0)));
  const fuentes = anchos.map((a) => [a, src.replace(/\.\w+$/, `-${tipo}${a}.avif`)]);
  // la receta con la que se hicieron los ficheros: si `de`, `pos` o `recorte` cambian, se rehacen (y `--check` lo dice)
  const receta = [d.origen ?? d.de, d.pos, d.recorte, d.zoom && `zoom ${d.zoom}`].filter(Boolean).join(' · ');
  if (CHECK) {
    if (JSON.stringify(d.fuentes) !== JSON.stringify(fuentes) || d.ratio !== +H.ratio.toFixed(4) || d._hecha !== receta) { console.error(`✗ ${src} · ${tipo}: \`fuentes\` no es lo que sale de su receta: vuelve a correr el guion`); fallos++; continue; }
    for (const [a, u] of fuentes) {
      const v = fs.existsSync(enDisco(u)) && await sharp(enDisco(u)).metadata();
      if (!v) { console.error(`✗ falta ${u}`); fallos++; } else if (v.width !== a || v.height !== Math.round(a / H.ratio)) { console.error(`✗ ${u} mide ${v.width}x${v.height}, tenia que medir ${a}x${Math.round(a / H.ratio)}`); fallos++; }
    }
  } else {
    for (const [a, u] of fuentes) if (d._hecha !== receta || !fs.existsSync(enDisco(u))) {
      if (!hay) { console.error(`✗ ${src} · hay que derivar ${path.basename(u)} y falta el original: BANCO_ORIGEN=<carpeta de originales>`); fallos++; break; }
      await sharp(await sharp(fuente).rotate().toBuffer()).extract(recorte).resize(a, Math.round(a / H.ratio)).avif({ quality: 52, effort: 5 }).toFile(enDisco(u)); nuevas++; }
    d.ratio = +H.ratio.toFixed(4); d.fuentes = fuentes; d._hecha = receta; if (d.origen) d.mide = [m.width, m.height];
    const da = Math.min(w / H.caja[0], h / H.caja[1]);
    console.log(`${da < 1.5 ? '!!' : 'ok'} ${tipo.padEnd(4)} ${da.toFixed(2)}x a densidad 2 · ${w}x${h} de ${m.width}x${m.height} · ${path.basename(src)}${da < 1.5 ? ' — no llega a 1,5x: candidata a otra foto' : ''}`);
  }
  total += fuentes.length;
  for (const [, u] of fuentes) esperadas.add(u);
}
// derivadas que ya no pide ninguna receta: se borran (y `--check` las canta), que el repo no acumule ficheros sin uso
const carpetas = new Set(Object.keys(datos.fotos).map((u) => path.dirname(u)));
for (const c of carpetas) for (const f of fs.existsSync(enDisco(c)) ? fs.readdirSync(enDisco(c)) : []) {
  const u = `${c}/${f}`;
  if (!/-(?:lam|hero|serv)\d+\.avif$/.test(f) || esperadas.has(u)) continue;
  if (CHECK) { console.error(`✗ derivada sin receta: ${u}`); fallos++; } else { fs.unlinkSync(enDisco(u)); console.log(`   borrada, ya sin receta: ${u}`); }
}
if (!CHECK) fs.writeFileSync(DATOS, JSON.stringify(datos, null, 1) + '\n');
if (fallos) { console.error(`\n✗ fotos de hueco: ${fallos} fallo(s)`); process.exit(1); }
console.log(`✓ fotos de hueco: ${Object.keys(datos.fotos).length} fotos, ${total} derivadas${CHECK ? ', todas en disco y a su medida' : ` · ${nuevas} nuevas`}`);
