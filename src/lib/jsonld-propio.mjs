/**
 * TRES BLOQUES DE JSON-LD PROPIOS (E5-SEO, D-156). Cada uno describe algo que la pagina YA ensena
 * y enlaza, y sale del mismo dato que lo pinta: si el dato cambia, el marcado cambia con el.
 *
 *   · las 7 fichas con landings de ciudad — `Service` con `areaServed`: las ciudades que la ficha
 *     enlaza (`CiudadesServicio.astro`). Su `@id` acaba en `#servicio`, como el del `Service`
 *     que ya lleva cada pagina de ciudad;
 *   · `/projects` — `ItemList` de las obras del indice, en su orden. Sale del `hasPart` que la
 *     pagina ya trae del origen, que es la misma lista que las tarjetas;
 *   · `/videos` — `ItemList` de `VideoObject`, uno por video de `youtube.json`, que es el dato
 *     real del canal. Titulo, fecha y duracion se contrastaron con YouTube el 13-oct-2026: los 8
 *     coinciden. Una fecha que no se pueda leer rompe el build: no se inventa ninguna.
 *
 * LOS BLOQUES QUE YA EXISTIAN NO SE TOCAN. Estos se AÑADEN al final, como `#negocio` y `#miga`, y
 * `check-seo.mjs` los separa por su `@id` (`#servicio`, `#obras`, `#videos`) y les exige que
 * digan lo mismo que la pagina. Sin `AggregateRating` (ver `negocio.mjs`).
 *
 * `readFileSync` + `process.cwd()` por lo mismo que `vecinas.mjs`: lo cargan tambien las puertas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SITIO, ID_NEGOCIO } from './negocio.mjs';
import { SERVICIOS_CIUDAD, ciudadesDeFicha } from './servicios-ciudad.mjs';
import { ciudadesDePiscinaPorZona } from './vecinas.mjs';

const lee = (rel) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'));
const CTX = 'https://schema.org';

/** Las ciudades que la ficha enlaza, igual que las reune `CiudadesServicio.astro`. */
export function ciudadesEnlazadas(ruta) {
  if (!/^\/services\/[^/]+$/.test(ruta)) return [];
  const linea = ciudadesDeFicha(ruta, lee('src/data/ciudades-servicios.json').paginas)?.ciudades ?? [];
  const zonas = ruta === '/services/pool-builders' ? ciudadesDePiscinaPorZona().flatMap((z) => z.ciudades) : [];
  return [...linea, ...zonas];
}

/** «26/1/2026» (dia/mes/año, como lo da el canal) → «2026-01-26». Si no se puede leer, falla. */
const fechaIso = (f, id) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(f ?? '');
  if (!m || +m[2] > 12 || +m[1] > 31) throw new Error(`jsonld-propio: la fecha «${f}» del video ${id} no es dia/mes/año; no se inventa`);
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
/** «01:10» o «1:02:03» → «PT1M10S» / «PT1H2M3S». */
const duracionIso = (d, id) => {
  const p = String(d ?? '').split(':').map(Number);
  if (p.length < 2 || p.length > 3 || p.some((n) => !Number.isInteger(n))) throw new Error(`jsonld-propio: la duracion «${d}» del video ${id} no se entiende`);
  const [s, m, h = 0] = p.reverse();
  return `PT${h ? `${h}H` : ''}${m}M${s}S`;
};

/**
 * Los bloques propios de una ruta (0 o 1). `ldOrigen` son los bloques que la pagina trae del
 * origen, ya como objetos: de ahi sale la lista de `/projects`.
 */
export function bloquesPropios(ruta, ldOrigen = []) {
  const ciudades = ciudadesEnlazadas(ruta);
  if (ciudades.length) {
    return [{
      '@context': CTX,
      '@type': 'Service',
      '@id': `${SITIO}${ruta}#servicio`,
      name: SERVICIOS_CIUDAD[ruta.split('/').pop()].nombre,
      url: `${SITIO}${ruta}`,
      provider: { '@id': ID_NEGOCIO },
      // La misma forma que el `Service` de cada pagina de ciudad: el nombre sin «, FL», que lo
      // dice `containedInPlace`.
      areaServed: ciudades.map((c) => ({
        '@type': 'City', name: c.nombre.replace(/, FL$/, ''), containedInPlace: { '@type': 'State', name: 'Florida' },
      })),
    }];
  }
  if (ruta === '/projects') {
    const obras = ldOrigen.find((b) => Array.isArray(b?.hasPart))?.hasPart ?? [];
    if (!obras.length) return [];
    return [{
      '@context': CTX,
      '@type': 'ItemList',
      '@id': `${SITIO}/projects#obras`,
      numberOfItems: obras.length,
      itemListElement: obras.map((o, i) => ({
        '@type': 'ListItem', position: i + 1, url: new URL(o.url, SITIO).href, name: o.name,
      })),
    }];
  }
  if (ruta === '/videos') {
    const { videos } = lee('src/data/youtube.json');
    if (!videos.length) return [];
    return [{
      '@context': CTX,
      '@type': 'ItemList',
      '@id': `${SITIO}/videos#videos`,
      numberOfItems: videos.length,
      itemListElement: videos.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'VideoObject',
          name: v.titulo,
          // La descripcion es la primera linea de la del canal. Dos videos no tienen: va sin ella.
          ...(v.descripcion?.[0] ? { description: v.descripcion[0] } : {}),
          ...(v.miniatura ? { thumbnailUrl: [`${SITIO}${v.miniatura}`] } : {}),
          uploadDate: fechaIso(v.fecha, v.id),
          duration: duracionIso(v.duracion, v.id),
          embedUrl: `https://www.youtube.com/embed/${v.id}`,
          url: v.enlace,
        },
      })),
    }];
  }
  return [];
}
