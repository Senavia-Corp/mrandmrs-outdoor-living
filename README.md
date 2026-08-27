# Mr & Mrs Outdoor Living — migración Webflow → Astro + Sanity + Vercel

Sitio de origen: <https://mrandmrsoutdoorliving.com> (Webflow, 115 páginas públicas).
**Objetivo: paridad exacta.** No es un rediseño.

- **El prompt de trabajo es [`PROMPT.md`](PROMPT.md)** — pégalo en una sesión nueva de Claude Code abierta en esta carpeta.
- El registro de lo hecho va en [`MIGRACION-LOG.md`](MIGRACION-LOG.md), una entrada por fase.

## Mapa de la carpeta

```
_source/                   insumos congelados (no se editan a mano)
  webflow-export/          export original de Webflow          [gitignored, 138 MB]
  cms/                     los 16 CSV con nombres legibles
  animations/
    ix2.json               payload de interacciones extraído de webflow.js
    ix2-catalog.md         catálogo legible: 12 animaciones, 168 eventos
    ix2-targets.csv        data-w-id → animación → breakpoints → páginas
  live/sitemap.txt         el sitemap real del sitio (113 URLs; el sitio sirve 115)
  routes.csv               las 115 rutas públicas → colección → plantilla
  assets-inventory.csv     659 assets únicos, deduplicados por URL, con su alt

baseline/                  el estado de origen contra el que se diffea (Fase 1)
  html/ text/ seo.json     versionados
  shots/                   capturas por breakpoint                [gitignored]

scripts/                   generadores y puertas de verificación
src/ public/ studio/       el sitio nuevo
docs/                      entregables al cliente
```

## Regenerar los insumos

```bash
node scripts/extract-ix2.mjs && node scripts/build-inventory.mjs
```
