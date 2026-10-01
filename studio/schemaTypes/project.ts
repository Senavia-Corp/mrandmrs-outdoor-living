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
    /* ── SEO-SAFE (1-oct-2026): DONDE Y CUANDO SE HIZO LA OBRA, COMO DATO VERIFICABLE ────────
     * Cinco campos OPCIONALES y retrocompatibles. `location` (Webflow) sigue siendo el texto
     * que se ve; estos existen para que una obra pueda afirmar una ciudad SOLO cuando alguien
     * la verificó, y para que una landing de ciudad pueda enseñar obra de ESA ciudad en vez de
     * «Florida Project Showcase». Hoy ninguna obra publicada tiene ciudad verificada: todas
     * dicen region (REQUIRES_CLIENT_CONFIRMATION.md). Ningún render los lee todavía. */
    {
      name: 'verifiedCity',
      title: 'Ciudad verificada',
      description: 'Solo si el cliente confirma la ciudad de la obra. Vacío = se publica la región.',
      type: 'string',
    },
    {
      name: 'county',
      title: 'Condado',
      description: 'Uno de los 9 condados de `src/lib/negocio.mjs` (areaServed del LocalBusiness).',
      type: 'string',
      options: {
        list: ['Alachua', 'Broward', 'Columbia', 'Dixie', 'Gilchrist', 'Levy', 'Marion', 'Palm Beach', 'Putnam']
          .map((c) => ({ title: `${c} County`, value: c })),
      },
    },
    {
      name: 'completionYear',
      title: 'Año de entrega',
      type: 'number',
      validation: (Rule) => Rule.integer().min(2000).max(2100),
    },
    {
      name: 'classification',
      title: 'Clasificación',
      type: 'string',
      options: {
        list: [
          { title: 'Residential', value: 'residential' },
          { title: 'Commercial / multifamily', value: 'commercial' },
        ],
        layout: 'radio',
      },
    },
    {
      name: 'locationDisclosure',
      title: 'Aviso de ubicación',
      description:
        'Lo que se publica junto a la obra cuando NO hay ciudad verificada, p. ej. «Built in North '
        + 'Florida; exact location withheld at the homeowner\'s request».',
      type: 'string',
    },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
