// GENERADO por scripts/gen-schemas.mjs desde _source/cms/blogs.csv
// Colección de Webflow: blogs (10 items) · página propia: /blogs/{slug}
import { defineType } from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Entrada de blog',
  type: 'document',
  fields: [
    {
      name: 'title',
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
      name: 'feature',
      title: 'Feature',
      description: 'Webflow: Feature',
      type: 'boolean',
    },
    {
      name: 'date',
      title: 'Date',
      description: 'Webflow: Date — vacía en el export',
      type: 'string',
    },
    {
      name: 'titlePage',
      title: 'Title Page',
      description: 'Webflow: Title Page',
      type: 'string',
    },
    {
      name: 'summary',
      title: 'Summary',
      description: 'Webflow: Summary',
      type: 'text',
      rows: 4,
    },
    {
      name: 'blog',
      title: 'Blog',
      description: 'Webflow: Blog',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'image',
      title: 'Image',
      description: 'Webflow: Image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt', description: 'Webflow: Metada Image SEO' }],
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      description: 'Webflow: Title SEO / Metadescription SEO',
    },
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})
