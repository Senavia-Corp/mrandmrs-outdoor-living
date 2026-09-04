#!/usr/bin/env node
/**
 * El logo del AVISO DE LEAD, en PNG.
 *
 *     node scripts/build-logo-correo.mjs
 *
 * 🚨 GMAIL Y OUTLOOK NO RENDERIZAN SVG EN CORREO. El sitio solo tiene el logo en vectorial
 * (`logo-mr-mr.svg` y `logo-white.svg`), asi que el aviso necesita un raster propio. No vale
 * base64 —Gmail recorta el `<img>` con `src="data:"` en el cliente web— ni `background-image`
 * —Outlook la ignora sin VML—: tiene que ser un fichero servido por URL absoluta.
 *
 * EL NAVY VA HORNEADO DENTRO DEL PNG, no solo en el `bgcolor` del `<td>`. El logo es blanco
 * sobre transparente; si un cliente en modo oscuro invierte el fondo de la celda, un logo
 * blanco sobre transparente DESAPARECE. Con el navy dentro del propio fichero la teja se
 * defiende sola pase lo que pase con la celda que la rodea.
 *
 * ANCHO 2x. Se pinta a 240 CSS px y se genera a 480: sin eso se ve borroso en cualquier
 * pantalla Retina, que es donde se lee el 70% del correo.
 *
 * `density` y NO `.resize()` a secas: sharp rasteriza el SVG a 72 ppp por defecto y ampliar
 * DESPUES ese bitmap de 193 px da un logo emborronado. Subiendo la densidad se rasteriza ya
 * al tamano final, con los trazos limpios.
 *
 * ponytail: de un solo uso, NO se cablea en `npm run build`. El SVG de origen no cambia nunca
 * y meter sharp en la ruta critica del build no compra nada. El PNG se commitea.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ENTRADA = path.join(RAIZ, 'public/images/site/logo-white.svg');
const SALIDA = path.join(RAIZ, 'public/images/site/logo-correo.png');

const NAVY = { r: 0x00, g: 0x1c, b: 0x63, alpha: 1 };   // #001c63, el navy de marca
const ANCHO_LOGO = 400;                                  // 2x de los 200 de pintado
const AIRE = 40;                                         // margen navy alrededor, tambien 2x

const svg = fs.readFileSync(ENTRADA);
const nativo = await sharp(svg).metadata();
// 72 ppp es la densidad base con la que sharp lee un SVG. Se escala para que el rasterizado
// salga ya al ancho final en vez de ampliar un bitmap pequeno.
const densidad = Math.ceil(72 * (ANCHO_LOGO / nativo.width));

const info = await sharp(svg, { density: densidad })
  .resize({ width: ANCHO_LOGO })
  .flatten({ background: NAVY })
  .extend({ top: AIRE, bottom: AIRE, left: AIRE, right: AIRE, background: NAVY })
  .png({ compressionLevel: 9 })
  .toFile(SALIDA);

console.log(`\n  origen : ${path.relative(RAIZ, ENTRADA)}  (${nativo.width}x${nativo.height} SVG)`);
console.log(`  salida : ${path.relative(RAIZ, SALIDA)}  (${info.width}x${info.height} PNG, ${info.size} B)`);
console.log(`  pintado: width="${Math.round(info.width / 2)}" en el correo (2x para Retina)`);
console.log('');
