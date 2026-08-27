// GENERADO por scripts/gen-schemas.mjs desde _source/cms/subservices.csv
// Colección de Webflow: subservices (113 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'subservice',
  title: 'Subservicio',
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
      name: 'service',
      title: 'Service',
      description: 'Webflow: Service',
      type: 'string',
    },
    {
      name: 'icon',
      title: 'Icon',
      description: 'Webflow: Icon',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt' }],
    },
    {
      name: 'summary',
      title: 'Summary',
      description: 'Webflow: Summary',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
