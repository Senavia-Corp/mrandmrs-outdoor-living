// GENERADO por scripts/gen-schemas.mjs desde _source/cms/industries.csv
// Colección de Webflow: industries (10 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'industry',
  title: 'Industria',
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
      name: 'image',
      title: 'Image',
      description: 'Webflow: Image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt', description: 'Webflow: Metadata SEO Image' }],
    },
    {
      name: 'shortDescription',
      title: 'Short Description',
      description: 'Webflow: Short Description',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
