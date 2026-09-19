// ESCRITO A MANO (BLOG-SANITY, 18-sep-2026). NO lo genera scripts/gen-schemas.mjs y no tiene
// columna equivalente en _source/cms/: es taxonomia editorial nueva, no migrada de Webflow.
//
// POR QUE NO SE REUTILIZA EL TIPO `category`
//
// `category` son las 3 categorias que vinieron del Webflow -Outdoor Living, Patio Cover, Pool
// Solutions- y las REFERENCIAN los 14 documentos `service` por su campo `categories`.
// `ServiciosPorCategoria.astro` lee de ahi con `defecto="pool-spa"`, que es un SLUG de esa
// taxonomia. Reutilizar `category` para las 11 categorias editoriales del blog cambiaria lo que
// esa rejilla agrupa en 14 fichas.
//
// Asi que conviven dos taxonomias y cada una manda en lo suyo:
//   · `category`      -> agrupacion de SERVICIOS. Intacta. La leen service.categories y la rejilla.
//   · `blogCategory`  -> taxonomia EDITORIAL. Solo blog: la categoria primaria de cada articulo,
//                        los chips de /blogs-tips y el filtro del carrusel por ficha.
import { defineType } from 'sanity'

export default defineType({
  name: 'blogCategory',
  title: 'Categoría del blog',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      description: 'Lo que se lee en el chip de /blogs-tips. En inglés americano.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      description: 'No crea URL: el filtro de /blogs-tips es de cliente y no usa query params.',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Descripción',
      description: 'Una línea: qué decide el lector que llega a esta categoría.',
      type: 'text',
      rows: 2,
    },
    {
      name: 'orden',
      title: 'Orden',
      description: 'El orden de los chips. Menor primero. Sin él, el orden lo decidiría Sanity.',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(0),
    },
    {
      name: 'seoTitle',
      title: 'Title SEO',
      description: 'Solo si algún día la categoría tiene página propia. Hoy no la tiene.',
      type: 'string',
    },
    {
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
    },
  ],
  orderings: [{ name: 'orden', title: 'Orden', by: [{ field: 'orden', direction: 'asc' }] }],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
