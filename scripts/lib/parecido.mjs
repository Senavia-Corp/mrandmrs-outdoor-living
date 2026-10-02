/**
 * PARECIDO VISUAL — la misma foto con otro nombre.
 *
 * Una foto puede estar a la vez en `/gallery` (`mm-construction-8`), en el banco (`bi-0504`) y en
 * una escalera heredada (`custom-pool-spa-builders-florida-02`). El nombre no lo delata; los
 * pixeles si. Lo usan la puerta de duplicados de `build-imagenes-blog.mjs` y el casting.
 *
 * dHash de 64 bits sobre el RECORTE 16:9 CENTRADO, que es lo que el blog publica. Medido el
 * 1-oct-2026 sobre las 90 fotos del blog y las 10 parejas de `publicada_como`:
 *
 *     misma foto (recodificada, graduada, de otra fuente)   0-5
 *     misma obra, otro recorte del mismo disparo             8
 *     fotos distintas                                        15 en adelante
 *
 * ponytail: un solo recorte centrado. Un recorte muy descentrado de la misma foto se escaparia;
 * la puerta lo vigila calibrandose en cada corrida contra las parejas conocidas.
 */
import sharp from 'sharp';

export const MISMA = 8;
export const DUDOSA = 12;

export async function dhash(fichero) {
  const m = await sharp(fichero).metadata();
  const w = Math.min(m.width, Math.floor((m.height * 16) / 9));
  const h = Math.round((w * 9) / 16);
  const px = await sharp(fichero)
    .extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h })
    .grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let v = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) v = (v << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return v;
}

export function distancia(a, b) {
  let x = a ^ b; let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}
