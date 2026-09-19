/**
 * TRAER EL BLOG DE SANITY. Un solo camino, para el indice y para las fichas.
 *
 * Lo usan `src/pages/blogs/[slug].astro` y `src/pages/blogs-tips.astro`. Si cada uno hiciera su
 * `fetch`, cada uno tendria su propia version de «que pasa si Sanity no responde» — y la que
 * fallara ABIERTA seria la que nadie mira.
 *
 * FALLA CERRADO. Sin datos, el build se para. N URLs que desaparecen en silencio son N errores
 * 404 con el despliegue en VERDE, y el indice quedaria vacio sin que ninguna puerta lo dijera:
 * `check:texto` no mide rutas nuevas y `check:visual` solo ve el 1% de los pixeles.
 *
 * La cache de escape se pide A MANO con `MM_SANITY_CACHE=1`. Si se activara sola, una caida de
 * Sanity se serviria como si fuera el CMS vivo.
 */
import { CONSULTA_BLOG } from './blog-groq.mjs';

export async function traeBlog() {
  const PID = import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? 'm273z6jc';
  const DS = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';

  let result; let error;
  try {
    const r = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}`
      + `?query=${encodeURIComponent(CONSULTA_BLOG)}`);
    ({ result, error } = await r.json());
  } catch (e) {
    error = { message: `no se pudo hablar con Sanity: ${e.message}` };
  }

  if ((error || !result?.length) && process.env.MM_SANITY_CACHE === '1') {
    const { default: cache } = await import('../data/blogs-sanity.json');
    console.warn(`>>> Sanity no responde y MM_SANITY_CACHE=1: se construyen los ${cache.length} `
      + 'articulos de la cache. Es una copia versionada, NO es el CMS vivo.');
    return cache;
  }
  if (error || !result?.length) {
    throw new Error('Sanity no devolvio blogPost: ' + JSON.stringify(error ?? 'vacio'));
  }
  return result;
}

/**
 * El orden del indice, determinista y sin depender de Sanity.
 *
 * Primero el destacado; despues por `ordenIndice` y, a igualdad, por slug. El desempate por
 * slug NO es adorno: sin el, dos articulos con el mismo `ordenIndice` saldrian en el orden que
 * devolviera la consulta, que puede cambiar entre builds y moveria `check:visual` sin que nadie
 * hubiera tocado nada.
 */
export const ordenaIndice = (posts) => [...posts].sort((a, b) => {
  if (Boolean(a.destacadoIndice) !== Boolean(b.destacadoIndice)) return a.destacadoIndice ? -1 : 1;
  const oa = a.ordenIndice ?? 9999; const ob = b.ordenIndice ?? 9999;
  return oa !== ob ? oa - ob : a.slug.localeCompare(b.slug);
});

/** El titulo que se lee en la tarjeta. `cardTitle` si lo hay; si no, el H1. */
export const tituloTarjeta = (p) => (p.cardTitle?.trim() ? p.cardTitle.trim() : p.title);
