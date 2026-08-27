// GENERADO por scripts/gen-schemas.mjs desde _source/cms/brochures.csv
// Colección de Webflow: brochures (57 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'brochure',
  title: 'Folleto',
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
      name: 'cover',
      title: 'Cover',
      description: 'Webflow: Cover',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt' }],
    },
    {
      name: 'metadata',
      title: 'Metadata',
      description: 'Webflow: Metadata',
      type: 'string',
    },
    {
      name: 'file',
      title: 'File',
      description: 'Webflow: File',
      type: 'file',
    },
    {
      name: 'relatedService',
      title: 'Related Service',
      description: 'Webflow: Related Service',
      type: 'reference',
      to: [{ type: 'service' }],
    },
    {
      name: 'categoriesBrochure',
      title: 'Categories Brochure',
      description: 'Webflow: Categories Brochure',
      type: 'reference',
      to: [{ type: 'brochureCategory' }],
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
