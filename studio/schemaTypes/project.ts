// GENERADO por scripts/gen-schemas.mjs desde _source/cms/projects.csv
// Colección de Webflow: projects (10 items) · página propia: /project/{slug}
import { defineType } from 'sanity'

export default defineType({
  name: 'project',
  title: 'Proyecto',
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
      name: 'featuredProject',
      title: 'Featured Project',
      description: 'Webflow: Featured Project?',
      type: 'boolean',
    },
    {
      name: 'type',
      title: 'Type',
      description: 'Webflow: Type',
      type: 'string',
    },
    {
      name: 'titlePage',
      title: 'Title Page',
      description: 'Webflow: Title Page',
      type: 'string',
    },
    {
      name: 'projectSummary',
      title: 'Project Summary',
      description: 'Webflow: Project Summary',
      type: 'text',
      rows: 4,
    },
    {
      name: 'mainProjectImage',
      title: 'Main Project Image',
      description: 'Webflow: Main Project Image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt', description: 'Webflow: Metadata SEO Main Project Image' }],
    },
    {
      name: 'gallery',
      title: 'Gallery',
      description: 'Webflow: Gallery',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt' }] }],
    },
    {
      name: 'servicesRendered',
      title: 'Services Rendered',
      description: 'Webflow: Services Rendered',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'designStyle',
      title: 'Design Style',
      description: 'Webflow: Design Style',
      type: 'string',
    },
    {
      name: 'location',
      title: 'Location',
      description: 'Webflow: Location',
      type: 'string',
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      description: 'Webflow: Title SEO / Metadescripcion SEO',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
