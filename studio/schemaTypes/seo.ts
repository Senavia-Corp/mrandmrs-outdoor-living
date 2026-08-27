import { defineType } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    { name: 'title', title: 'Title SEO', type: 'string' },
    { name: 'description', title: 'Meta description', type: 'text', rows: 3 },
  ],
})
