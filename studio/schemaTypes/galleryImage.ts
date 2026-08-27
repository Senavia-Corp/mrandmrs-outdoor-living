// GENERADO por scripts/gen-schemas.mjs desde _source/cms/images.csv
// Colección de Webflow: images (147 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'galleryImage',
  title: 'Imagen de galería',
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
      name: 'serviceID',
      title: 'Service I D',
      description: 'Webflow: Service ID',
      type: 'string',
    },
    {
      name: 'feature',
      title: 'Feature',
      description: 'Webflow: Feature',
      type: 'boolean',
    },
    {
      name: 'image',
      title: 'Image',
      description: 'Webflow: Image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt', description: 'Webflow: Metadata Image SEO' }],
    },
    {
      name: 'service',
      title: 'Service',
      description: 'Webflow: Service',
      type: 'reference',
      to: [{ type: 'service' }],
    },
    {
      name: 'type',
      title: 'Type',
      description: 'Webflow: Type',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
