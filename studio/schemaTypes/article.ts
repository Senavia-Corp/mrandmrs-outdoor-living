// GENERADO por scripts/gen-schemas.mjs desde _source/cms/articles.csv
// Colección de Webflow: articles (3 items) · página propia: /articles/{slug}
import { defineType } from 'sanity'

export default defineType({
  name: 'article',
  title: 'Artículo',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      description: 'Webflow: Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'legacyId',
      title: 'Legacy Id',
      description: 'Webflow: Item ID',
      type: 'string',
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      description: 'Webflow: Published On',
      type: 'datetime',
    },
    {
      name: 'body',
      title: 'Body',
      description: 'Webflow: Body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      description: 'Webflow: Title SEO / Meta Descripcion SEO',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
