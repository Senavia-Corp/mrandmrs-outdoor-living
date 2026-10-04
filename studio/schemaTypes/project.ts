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
    /* ── SEO-REMEDIACION (4-oct-2026): LA OBRA COMO CASO, NO SOLO COMO GALERIA ─────────────────
     * Campos OPCIONALES para que una ficha de proyecto pueda contar experiencia real —que queria
     * el propietario, que lo complico, que se decidio y con que— en vez de ser solo fotos. Ninguno
     * es obligatorio (no hay datos todavia) y NINGUN render los lee: cuando haya obras rellenas,
     * la plantilla de `/project/` se amplia para pintarlos y su JSON-LD los recoge. Rellenarlos
     * solo con lo que el cliente confirme (SEO_REQUIRES_CLIENT_DATA.md). */
    {
      name: 'projectType',
      title: 'Tipo de proyecto',
      type: 'string',
      options: {
        list: [
          { title: 'New custom pool', value: 'new-pool' },
          { title: 'Complete pool remodel', value: 'remodel' },
          { title: 'Pool + outdoor living', value: 'pool-outdoor-living' },
          { title: 'Outdoor living only', value: 'outdoor-living' },
        ],
      },
    },
    { name: 'projectStatus', title: 'Estado', type: 'string',
      options: { list: [{ title: 'Completed', value: 'completed' }, { title: 'In progress', value: 'in-progress' }], layout: 'radio' } },
    { name: 'relatedService', title: 'Servicio principal', type: 'reference', to: [{ type: 'service' }] },
    { name: 'relatedLocation', title: 'Página de ciudad', description: 'Solo si `verifiedCity` está confirmado.',
      type: 'reference', to: [{ type: 'poolBuilder' }] },
    { name: 'permittingJurisdiction', title: 'Jurisdicción del permiso',
      description: 'P. ej. «City of Gainesville» o «Unincorporated Alachua County». Solo si consta en el permiso.', type: 'string' },
    { name: 'projectSummary', title: 'Resumen del caso', type: 'text', rows: 3 },
    { name: 'homeownerGoal', title: 'Objetivo del propietario', type: 'text', rows: 3 },
    { name: 'challenge', title: 'Reto del proyecto', description: 'Terreno, acceso, caliza, septic, HOA, plazos…', type: 'text', rows: 3 },
    { name: 'designDecision', title: 'Decisión de diseño', type: 'text', rows: 3 },
    { name: 'scope', title: 'Alcance', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } },
    { name: 'materials', title: 'Materiales', description: 'Acabado, alicatado, coronación, deck…', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } },
    { name: 'features', title: 'Elementos', description: 'Spa, sun shelf, cascada, iluminación, automatización…', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' } },
    { name: 'beforeImages', title: 'Fotos — antes', type: 'array', of: [{ type: 'image', fields: [{ name: 'alt', type: 'string', title: 'Alt' }] }] },
    { name: 'progressImages', title: 'Fotos — obra (excavación, acero, gunita…)', type: 'array', of: [{ type: 'image', fields: [{ name: 'alt', type: 'string', title: 'Alt' }] }] },
    { name: 'afterImages', title: 'Fotos — terminado', type: 'array', of: [{ type: 'image', fields: [{ name: 'alt', type: 'string', title: 'Alt' }] }] },
    { name: 'video', title: 'Vídeo del proyecto', description: 'URL de YouTube del recorrido o del proceso.', type: 'url' },
  ],
  preview: { select: { title: 'name', subtitle: 'slug.current' } },
})
