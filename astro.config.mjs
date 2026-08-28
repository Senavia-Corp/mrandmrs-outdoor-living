// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

/**
 * Salida ESTÁTICA: 115 páginas de marketing y cero lógica de aplicación. Astro las hornea
 * en build y Vercel sirve HTML puro. El adaptador está para las rutas de API de la Fase 8
 * (los dos formularios), que son lo único que necesita servidor.
 *
 * `site` gobierna las canónicas y el sitemap. Ojo con el fallback: si cae en el dominio del
 * cliente mientras el sitio vive en una URL de preview, las 115 canónicas apuntan al sitio
 * VIEJO — ése fue el fallo real en Pergola Plus. La Fase 9 lo ata a PUBLIC_ES_PRODUCCION.
 */
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  site: process.env.PUBLIC_SITE_URL || 'https://mrandmrsoutdoorliving.com',
  trailingSlash: 'never',
  build: { format: 'file' },
});
