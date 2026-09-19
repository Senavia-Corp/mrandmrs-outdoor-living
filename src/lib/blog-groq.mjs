/**
 * LA CONSULTA DEL BLOG, EN UN SOLO SITIO.
 *
 * La importan `src/pages/blogs/[slug].astro` (el build) y `scripts/cache-blog-sanity.mjs` (la
 * cache de escape). Tienen que ver EXACTAMENTE lo mismo, o la cache serviria un documento con
 * otra forma el dia que se usara — que es justo el dia en que nadie esta mirando.
 *
 * `cache-sanity.mjs:88` ya avisaba de este riesgo para `poolBuilder` y lo resolvia copiando la
 * cadena a mano. Copiar es lo que permite divergir: aqui se comparte.
 *
 * DOS COSAS QUE NO SE TOCAN:
 *   · `!(_id in path("drafts.**"))` — sin el, un articulo a medio escribir en el Studio se
 *     publica en el sitio.
 *   · La proyeccion es ACOTADA. `relatedPosts` NO se trae el Portable Text: para pintar una
 *     tarjeta hacen falta titulo, resumen y portada, y traerse 100 cuerpos completos engorda el
 *     build sin pintar un pixel mas.
 */
export const CONSULTA_BLOG = `*[_type == "blogPost" && defined(slug.current) && !(_id in path("drafts.**"))]{
    _id, title, cardTitle, titlePage, summary, blog, portada, seo, faq, fuentes,
    publishedAt, updatedAt, ordenIndice, destacadoIndice, ordenEnServicio, tags,
    "slug": slug.current,
    "categoria": categoria->{ "slug": slug.current, name, orden },
    "servicios": relatedServices[]->{ "slug": slug.current, name },
    "relacionados": relatedPosts[]->{ "slug": slug.current, title, cardTitle, summary, portada }
  } | order(slug asc)`;
