// GENERADO por scripts/gen-schemas.mjs desde _source/cms/logos.csv
// Colección de Webflow: logos (20 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'logo',
  title: 'Logo',
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
      name: 'logo',
      title: 'Logo',
      description: 'Webflow: Logo',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt' }],
    },
    {
      name: 'metadata',
      title: 'Metadata',
      description: 'Webflow: Metadata — vacía en el export',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
