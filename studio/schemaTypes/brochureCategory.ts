// GENERADO por scripts/gen-schemas.mjs desde _source/cms/categories-brochures.csv
// Colección de Webflow: categories-brochures (9 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'brochureCategory',
  title: 'Categoría de folleto',
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
      name: 'iDBrochure',
      title: 'I D Brochure',
      description: 'Webflow: ID Brochure',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
