// NACIO GENERADO por scripts/gen-schemas.mjs desde _source/cms/blogs.csv.
// DESDE BLOG-SANITY (18-sep-2026) SE EDITA A MANO. **NO vuelvas a correr `npm run schemas`**
// sin diffear despues: regenera este fichero desde `scripts/schema-map.mjs` y borraria sin
// avisar los 14 campos de abajo. La cabecera del propio generador ya lo dice: se corre UNA vez.
//
// Coleccion de Webflow: blogs · pagina propia: /blogs/{slug}, servida por
// `src/pages/blogs/[slug].astro` leyendo de Sanity. Sanity es la UNICA fuente de verdad del
// sistema editorial: no hay lista paralela en el repo.
//
// ─────────────────────────────────────────────────────────────────────────────
// LO QUE YA EXISTIA CON OTRO NOMBRE, Y POR ESO NO SE DUPLICA
//
// El encargo pedia `excerpt`, `heroImage`, `heroImageAlt`, `featured`, `seoTitle` y
// `metaDescription`. Los seis YA ESTAN, con el nombre que les puso la migracion:
//
//     excerpt         -> summary          heroImage    -> image
//     heroImageAlt    -> image.alt        featured     -> feature
//     seoTitle        -> seo.title        metaDescription -> seo.description
//
// Anadirlos otra vez crearia dos verdades para el mismo dato. Se conserva el nombre que ya
// esta y se extiende solo lo que de verdad falta.
//
// LO QUE NO SE AÑADE, Y POR QUE:
//   · `author` / `reviewer` -- no hay persona real detras de estos articulos. Inventar un autor
//     para rellenar un `Person` de schema.org es exactamente lo que el encargo prohibe. El
//     `publisher` es la Organization, que si es cierta.
//   · `canonicalUrl` -- cada articulo es su propia canonica y la emite `Base.astro`. Un campo
//     que casi siempre esta vacio es un campo que un dia alguien rellena mal.
//   · `recommendedCTA` -- se deriva de `relatedServices[0]`. Un campo redundante es una segunda
//     verdad esperando a desincronizarse.
//   · `readingTime` -- se calcula en build contando bloques. Guardarlo seria guardar un derivado.
//   · `primaryTopic` -- es `categoria` + `tags`. No hace falta un tercer eje.
import { defineType } from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Entrada de blog',
  type: 'document',
  groups: [
    { name: 'contenido', title: 'Contenido', default: true },
    { name: 'taxonomia', title: 'Taxonomía y enlaces' },
    { name: 'publicacion', title: 'Publicación' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    {
      name: 'title',
      title: 'Nombre',
      description: 'El H1 del artículo. Puede ser largo: es el que trabaja para la búsqueda.',
      type: 'string',
      group: 'contenido',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'cardTitle',
      title: 'Título de tarjeta',
      description:
        'El titular corto que se ve en la tarjeta de /blogs-tips y del carrusel. Vacío = se usa '
        + '`Nombre`. Sirve para que el H1 pueda ser explícito para SEO sin que la rejilla se '
        + 'llene de titulares de tres líneas.',
      type: 'string',
      group: 'contenido',
      validation: (Rule) => Rule.max(70),
    },
    {
      name: 'slug',
      title: 'Slug',
      // ARREGLADO en BLOG-SANITY: decia `source: 'name'` y este tipo no tiene campo `name`, sino
      // `title`. El boton «Generate» del Studio llevaba desconectado desde la migracion.
      description: 'Webflow: Slug. Cambiarlo cambia la URL y obliga a un redirect 301.',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      group: 'contenido',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'legacyId',
      title: 'Legacy Id',
      description: 'Webflow: Item ID',
      type: 'string',
      group: 'publicacion',
      readOnly: true,
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      description:
        'Fecha de publicación. En los 10 heredados se rellenó con el `datePublished` que el '
        + 'sitio YA servía en su JSON-LD, no con una fecha inventada.',
      type: 'datetime',
      group: 'publicacion',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'updatedAt',
      title: 'Updated At',
      description:
        'Última edición REAL. No se toca si no se ha editado el contenido: una fecha de '
        + 'frescura falsa es peor que ninguna. Va a `dateModified`.',
      type: 'datetime',
      group: 'publicacion',
    },
    {
      name: 'feature',
      title: 'Feature (Webflow)',
      description:
        'Heredado de Webflow y true en 7 de los 10, así que NO sirve para elegir destacado. '
        + 'Para eso está «Destacado del índice». Se conserva porque es dato del origen.',
      type: 'boolean',
      group: 'publicacion',
    },
    {
      name: 'destacadoIndice',
      title: 'Destacado del índice',
      description:
        'El artículo a ancho completo en la cabecera de /blogs-tips. Debe haber EXACTAMENTE uno: '
        + '`scripts/check-blog.mjs` sale rojo con cero o con dos. Si hubiera empate, el render '
        + 'desempata por «Orden en el índice» y luego por slug, nunca por el orden de Sanity.',
      type: 'boolean',
      group: 'publicacion',
      initialValue: false,
    },
    {
      name: 'ordenIndice',
      title: 'Orden en el índice',
      description: 'Menor primero, dentro de su categoría. Desempate determinista.',
      type: 'number',
      group: 'publicacion',
      validation: (Rule) => Rule.integer().min(0),
    },
    {
      name: 'date',
      title: 'Date',
      description: 'Webflow: Date — vacía en el export. Se conserva por fidelidad al origen.',
      type: 'string',
      group: 'publicacion',
      readOnly: true,
    },
    {
      name: 'titlePage',
      title: 'Title Page',
      description: 'Webflow: Title Page — el titular del héroe.',
      type: 'string',
      group: 'contenido',
    },
    {
      name: 'summary',
      title: 'Summary',
      description:
        'La entradilla. Es lo que se lee en la tarjeta, así que se escribe para decidir si '
        + 'entrar, no para resumir.',
      type: 'text',
      rows: 4,
      group: 'contenido',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'blog',
      title: 'Blog',
      description:
        'El cuerpo. Lo pinta `src/lib/portable-text.mjs`, que cubre h2, h3, párrafo, listas, '
        + 'strong, em, enlaces, figuras y tablas. Cualquier otro estilo NO se renderiza: el '
        + 'serializador falla cerrado y el build se para con el tipo puesto.',
      type: 'array',
      group: 'contenido',
      of: [
        {
          type: 'block',
          // Los estilos y marcas se declaran A PROPOSITO y son EXACTAMENTE los que sabe pintar
          // `src/lib/portable-text.mjs`. Si el Studio ofreciera un `blockquote` que el
          // serializador no conoce, el editor lo usaria y el build se pararia; peor aun seria
          // que el parrafo desapareciera. Los dos lados se declaran juntos o no se declaran.
          styles: [
            { title: 'Párrafo', value: 'normal' },
            { title: 'Sección (H2)', value: 'h2' },
            { title: 'Subsección (H3)', value: 'h3' },
            { title: 'Apartado (H4)', value: 'h4' },
          ],
          lists: [
            { title: 'Viñetas', value: 'bullet' },
            { title: 'Numerada', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Negrita', value: 'strong' },
              { title: 'Cursiva', value: 'em' },
            ],
            annotations: [{
              name: 'link',
              type: 'object',
              title: 'Enlace',
              fields: [{
                name: 'href',
                type: 'string',
                title: 'URL',
                description:
                  'Interna sin dominio: /services/custom-deck-builders-in-north-south-florida. '
                  + 'Es `string` y no `url` a propósito: el tipo `url` de Sanity RECHAZA las '
                  + 'relativas, y el enlazado interno es el objetivo de este sistema. '
                  + '`check:enlaces` valida después que la ruta existe de verdad.',
                validation: (Rule) => Rule.required().custom((v) =>
                  (typeof v === 'string' && (v.startsWith('/') || /^https?:\/\//i.test(v)))
                    ? true
                    : 'Tiene que empezar por / (interna) o por http(s):// (externa)'),
              }],
            }],
          },
        },
        { type: 'image', options: { hotspot: true } },
      ],
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: 'image',
      title: 'Image',
      description:
        'La portada. Obra REAL del cliente: nada generado por IA donde el visitante entienda '
        + '«esto lo construimos nosotros» (00-PRINCIPIOS §3).',
      type: 'image',
      options: { hotspot: true },
      group: 'contenido',
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt',
          description:
            'Describe lo que SE VE, no lo que se quiere posicionar. Bien: «Custom rectangular '
            + 'swimming pool with raised spa and light stone deck». Mal: «Best pool builder '
            + 'Gainesville Ocala Florida».',
          validation: (Rule) => Rule.required(),
        },
      ],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'categoria',
      title: 'Categoría',
      description: 'Una sola, la primaria. Es la que agrupa los chips de /blogs-tips.',
      type: 'reference',
      to: [{ type: 'blogCategory' }],
      group: 'taxonomia',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'relatedServices',
      title: 'Servicios relacionados',
      description:
        'EL PRIMERO es el servicio primario: manda el CTA y decide en qué ficha de /services/ '
        + 'aparece este artículo. Referencia al documento `service` real, no una cadena suelta.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
      group: 'taxonomia',
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: 'ordenEnServicio',
      title: 'Puesto en la ficha de servicio',
      description:
        '1, 2 o 3: qué lugar ocupa en los tres artículos de su servicio primario. Vacío = no '
        + 'entra en la ficha. Cada servicio necesita exactamente tres, o el build se para.',
      type: 'number',
      group: 'taxonomia',
      validation: (Rule) => Rule.integer().min(1).max(3),
    },
    {
      name: 'relatedLocations',
      title: 'Ubicaciones relacionadas',
      description:
        'SOLO cuando el artículo diga algo de verdad local. Si no, se deja vacío: afirmar una '
        + 'ciudad que el texto no sostiene es lo mismo que inventarla.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'poolBuilder' }, { type: 'county' }] }],
      group: 'taxonomia',
    },
    {
      name: 'relatedPosts',
      title: 'Artículos relacionados',
      description:
        'El salto a la siguiente pregunta. Dos o tres. NO se incluye a sí mismo: 7 de los 10 '
        + 'heredados lo hacían.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'blogPost' }] }],
      group: 'taxonomia',
    },
    {
      name: 'tags',
      title: 'Tags',
      description: 'Solo cuando aporten. Un tag que solo tiene un artículo no es un tag.',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      group: 'taxonomia',
    },
    {
      name: 'searchIntent',
      title: 'Intención de búsqueda',
      description: 'Lo que alimenta el cruce de canibalización contra las otras 115 rutas.',
      type: 'string',
      group: 'taxonomia',
      options: {
        list: [
          { title: 'Informational — quiere entender', value: 'informational' },
          { title: 'Commercial — está comparando', value: 'commercial' },
          { title: 'Transactional — está listo para pedir', value: 'transactional' },
        ],
        layout: 'radio',
      },
    },
    {
      name: 'funnelStage',
      title: 'Fase del embudo',
      type: 'string',
      group: 'taxonomia',
      options: {
        list: [
          { title: 'Awareness', value: 'awareness' },
          { title: 'Consideration', value: 'consideration' },
          { title: 'Decision', value: 'decision' },
        ],
        layout: 'radio',
      },
    },
    {
      name: 'faq',
      title: 'FAQ',
      description:
        'Solo si aporta. Misma forma que `service.faqs`. Lo que se declare aquí se PINTA y '
        + 'además se emite como FAQPage: el schema casa 1:1 con lo visible o la puerta sale roja.',
      type: 'array',
      group: 'contenido',
      of: [{
        type: 'object',
        fields: [
          { name: 'question', title: 'Question', type: 'text', rows: 3 },
          { name: 'answer', title: 'Answer', type: 'text', rows: 3 },
        ],
      }],
    },
    {
      name: 'fuentes',
      title: 'Fuentes',
      description:
        'Las oficiales que respaldan permisos, código, vientos o especificaciones. Si un dato '
        + 'no tiene fuente, no se publica como dato.',
      type: 'array',
      group: 'contenido',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Fuente', type: 'string' },
          { name: 'url', title: 'URL', type: 'url' },
        ],
      }],
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
      description:
        'Webflow: Title SEO / Metadescription SEO. La meta de estas rutas sale de AQUÍ, no de '
        + '`src/data/meta-propia.json` — misma regla que las 53 de /pool-builders/. La '
        + 'description tiene que ser ÚNICA en todo el sitio: `check:medicion` lo exige y no '
        + 'tiene mecanismo de declaración.',
      validation: (Rule) => Rule.required(),
    },
  ],
  orderings: [
    { name: 'reciente', title: 'Más reciente', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current', media: 'image' } },
})
