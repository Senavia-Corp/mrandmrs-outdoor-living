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
import RETIRADO from '../data/blog-texto-retirado.json' with { type: 'json' };

/**
 * D-262 (25-oct-2026): lo que el CMS vivo aun dice del servicio retirado se quita AQUI, al cargar, por
 * dato (`src/data/blog-texto-retirado.json`): fuera los enlaces a su ruta y cada cadena declarada por
 * la suya, solo en su articulo. Cuando Sanity se corrija, esto no encuentra nada y no hace nada.
 */
const ENLACES_RETIRADOS = new Set(RETIRADO.enlaces_retirados);
function retiraTexto(post) {
  const slug = typeof post.slug === 'string' ? post.slug : post.slug?.current;
  const pares = RETIRADO.sustituciones[slug] ?? [];
  const anda = (o) => {
    if (Array.isArray(o)) return o.map(anda);
    if (o && typeof o === 'object') {
      if (o._type === 'block' && Array.isArray(o.markDefs)) {
        const fuera = new Set(o.markDefs.filter((m) => m._type === 'link' && ENLACES_RETIRADOS.has(m.href)).map((m) => m._key));
        if (fuera.size) {
          o.markDefs = o.markDefs.filter((m) => !fuera.has(m._key));
          for (const sp of o.children ?? []) if (Array.isArray(sp.marks)) sp.marks = sp.marks.filter((k) => !fuera.has(k));
        }
      }
      for (const k of Object.keys(o)) o[k] = anda(o[k]);
      return o;
    }
    if (typeof o === 'string') { let t = o; for (const [de, a] of pares) t = t.split(de).join(a); return t; }
    return o;
  };
  return anda(post);
}

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
    return cache.map(retiraTexto);
  }
  if (error || !result?.length) {
    throw new Error('Sanity no devolvio blogPost: ' + JSON.stringify(error ?? 'vacio'));
  }
  return result.map(retiraTexto);
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
