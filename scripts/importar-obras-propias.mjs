#!/usr/bin/env node
/**
 * IMPORTA las fotos de las obras de autoria propia a `public/images/projects/<slug>/`.
 *
 *     node scripts/importar-obras-propias.mjs [--dry-run]
 *
 * Se queda en el arbol aunque sea de un solo uso: es la unica constancia de COMO se hicieron
 * los AVIF que si estan versionados —que recorte, que calidad y en que orden— y sin el, el dia
 * que haya que rehacer uno o anadir una obra, alguien tendria que adivinarlo.
 *
 * EL RECORTE NO ES AUTOMATICO Y NO PUEDE SERLO. El origen es 4:3 (2400x1792) y el destino 16:9
 * (1250x698): sobran 452 px de alto que hay que quitar de algun sitio. `top` va POR IMAGEN,
 * elegido MIRANDO la hoja de contactos (regla 6 de ~/Sites/CLAUDE.md), porque centrar por
 * defecto decapita pergolas y se come la linea de agua. `orden` tambien: el primero es la
 * PORTADA (tarjeta de /projects + slide del home + og:image + image del JSON-LD), y el nombre
 * del fichero de origen —`hf_2026...-uuid.png`— no dice nada del encuadre.
 *
 * LA CALIDAD ES 72, Y EL LISTON DE PESO ES SOLO POR ARRIBA. Estas fotos —cielo liso y laminas
 * de agua— comprimen mucho mejor que la media del sitio: a q62 salian de 59 a 130 KB, muy por
 * debajo de las 108 ya publicadas en /images/projects/ (79-272 KB, mediana 158). Quedarse corto
 * no es un defecto que arreglar inflando el fichero; pasarse SI, porque lo paga el visitante.
 * Por eso el aviso salta solo por encima de 260 KB, y la calidad se subio a 72 para tener
 * margen de nitidez, no para llegar a una cifra.
 *
 * ORDEN Y PORTADA VIVEN AQUI ABAJO y no en `src/data/proyectos-propios.json`: alli el dato es
 * el resultado —la lista de AVIF ya convertidos, con su alt—, aqui es la RECETA —que fichero de
 * origen, en que posicion y con que recorte—. Son dos cosas distintas y la receta no la
 * consume el sitio.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = '/Users/senavia/Downloads/Img website projects';
const SECO = process.argv.includes('--dry-run');

/** 16:9 exacto sobre el ancho del origen. 1792 - 1340 = 452 px de margen para elegir `top`. */
const ALTO_RECORTE = 1340;
const [W, H] = [1250, 698];

/**
 * `orden`: indices del listado ORDENADO de la carpeta, y el PRIMERO es la portada.
 * `top`: por indice de origen, el borde superior del recorte. Sin entrada -> centrado (226).
 */
const OBRAS = [
  { carpeta: 'Pool 1', slug: 'luxury-pool-raised-spa-travertine-deck-south-florida',
    orden: [2, 1, 3, 5, 4], top: {} },
  { carpeta: 'Pool 2', slug: 'estate-pool-spa-sun-shelf-north-florida',
    orden: [3, 2, 1, 4, 5], top: { 1: 300, 2: 260, 3: 300, 4: 240 } },
  { carpeta: 'Pool 3', slug: 'pool-raised-spa-marble-deck-south-florida',
    orden: [3, 1, 2, 5, 4], top: { 1: 200, 2: 200, 3: 180, 5: 200 } },
  { carpeta: 'Pool 4', slug: 'luxury-pool-spa-aluminum-pergola-south-florida',
    orden: [2, 3, 5, 4, 6, 1], top: { 3: 180, 4: 200, 5: 200 } },
  { carpeta: 'Pool 6', slug: 'aluminum-patio-cover-pool-deck-south-florida',
    orden: [5, 2, 1, 3, 4], top: { 1: 200, 2: 200, 3: 180, 4: 200, 5: 200 } },
];

let hechas = 0;
for (const o of OBRAS) {
  const fuente = path.join(ORIGEN, o.carpeta);
  const todas = fs.readdirSync(fuente).filter((f) => f.endsWith('.png')).sort();
  if (todas.length !== o.orden.length) {
    console.error(`  ROJO ${o.carpeta}: ${todas.length} ficheros y ${o.orden.length} en el orden`);
    process.exit(1);
  }
  const destino = path.join(RAIZ, 'public/images/projects', o.slug);
  if (!SECO) fs.mkdirSync(destino, { recursive: true });

  for (const [i, idx] of o.orden.entries()) {
    const src = path.join(fuente, todas[idx - 1]);
    const top = o.top[idx] ?? Math.round((1792 - ALTO_RECORTE) / 2);
    const fichero = `${o.slug}-project-${i + 1}.avif`;
    if (SECO) { console.log(`  ${o.slug}/${fichero}  <- ${todas[idx - 1]}  top=${top}`); continue; }
    await sharp(src)
      .extract({ left: 0, top, width: 2400, height: ALTO_RECORTE })
      .resize(W, H)
      .avif({ quality: o.calidad ?? 72, effort: 6 })
      .toFile(path.join(destino, fichero));
    const kb = Math.round(fs.statSync(path.join(destino, fichero)).size / 1024);
    console.log(`  ${o.slug}/${fichero}  top=${top}  ${kb} KB${kb > 260 ? '   <<< PESA DE MAS (>260 KB)' : ''}`);
    hechas++;
  }
}
console.log(`\n  ${SECO ? '(en seco) ' : ''}${hechas} imagen(es)`);
