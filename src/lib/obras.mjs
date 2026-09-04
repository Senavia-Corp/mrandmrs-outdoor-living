/**
 * EL `<head>` DE UNA OBRA DE AUTORIA PROPIA, derivado de `src/data/proyectos-propios.json`.
 *
 * Las 10 fichas migradas traen su SEO horneado desde el `<head>` de `_source/vivo/`, que es el
 * origen. Las nuestras no tienen origen: se construye aqui, en UN sitio, y no cinco veces a
 * mano en cinco `.astro` — cinco copias empiezan iguales y dejan de serlo al primer arreglo.
 *
 * SE DEVUELVE `jsonLd` COMO OBJETO, NUNCA COMO CADENA. `Base.astro:182` lo emite con
 * `JSON.stringify`, asi que no puede salir un bloque que no parsee. Ese es exactamente el
 * defecto que arrastran 8 de las 10 fichas del origen —un salto de linea literal sin escapar
 * dentro de la cadena, ver `docs/encargos/SEO-URLS-PLAN.md` hallazgo 2—, que se replica crudo
 * por contrato via `jsonLdCrudo`. Aqui `jsonLdCrudo` va vacio y no hay nada que replicar.
 *
 * Y EL `&` VA SIN ESCAPAR. El `name` del JSON-LD de las fichas del origen trae `&amp;amp;`
 * —doble escape, dentro de JSON, donde no pinta nada—; el `hasPart` de `/projects` del mismo
 * origen lo trae bien, con `&` a secas. Se copia el que esta bien.
 */

/** El `<head>` de la obra: los `meta` og/twitter y el bloque JSON-LD, listos para `<Base seo>`. */
export function seoDeObra(o) {
  const url = `/project/${o.slug}`;
  return {
    meta: {
      'og:title': o.seo.titulo,
      'og:description': o.seo.descripcion,
      'og:image': o.portada,
      'twitter:title': o.seo.titulo,
      'twitter:description': o.seo.descripcion,
      'twitter:image': o.portada,
      'og:type': 'website',
      'twitter:card': 'summary_large_image',
    },
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: o.titulo,
      description: o.resumen,
      url,
      inLanguage: 'en',
      datePublished: o.publicado,
      dateModified: o.publicado,
      image: { '@type': 'ImageObject', url: o.portada, description: o.alt },
      about: {
        '@type': 'Project',
        name: o.titulo,
        description: o.resumen,
        location: { '@type': 'Place', name: o.ubicacion },
        additionalType: o.tipo,
        image: o.portada,
        keywords: o.estilo,
      },
    }],
  };
}
