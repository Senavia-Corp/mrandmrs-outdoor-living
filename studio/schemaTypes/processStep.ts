// GENERADO por scripts/gen-schemas.mjs desde _source/cms/procesos.csv
// Colección de Webflow: procesos (56 items) · sin página propia (solo datos)
import { defineType } from 'sanity'

export default defineType({
  name: 'processStep',
  title: 'Paso de proceso',
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
      name: 'stepImage',
      title: 'Step Image',
      description: 'Webflow: Step Image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt', description: 'Webflow: Metadata Step Image' }],
    },
    {
      name: 'serviceReference',
      title: 'Service Reference',
      description: 'Webflow: Service-Reference',
      type: 'reference',
      to: [{ type: 'service' }],
    },
    {
      name: 'processTitle',
      title: 'Process Title',
      description: 'Webflow: Process-Title',
      type: 'string',
    },
    {
      name: 'processDescription',
      title: 'Process Description',
      description: 'Webflow: Process-Description',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'stepNumber',
      title: 'Step Number',
      description: 'Webflow: Step-Number',
      type: 'number',
    },
    {
      name: 'displayOrder',
      title: 'Display Order',
      description: 'Webflow: Display-Order',
      type: 'number',
    },
    {
      name: 'status',
      title: 'Status',
      description: 'Webflow: Status',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
