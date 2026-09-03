# Mr & Mrs Outdoor Living — migración Webflow → Astro + Sanity + Vercel

Sitio de origen: <https://mrandmrsoutdoorliving.com> (Webflow, 115 páginas públicas).
**Objetivo: paridad exacta.** No es un rediseño.

El sitio sirve hoy **116**: las 115 de la migración más `/financing` (2-sep-2026), la primera
página de autoría propia — no existe en el origen, así que no se mide contra él. Las rutas de
esa clase se declaran en [`scripts/lib/rutas-propias.mjs`](scripts/lib/rutas-propias.mjs), que
explica qué puerta las mide y cuáles **no pueden** medirlas. La paridad sigue siendo el
contrato para las 115.

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
  orden-listas.json        EL ORDEN MANUAL de las colecciones de Webflow, rescatado del
                           HTML vivo. No está en el CSV ni en Sanity y CADUCA con el
                           dominio: tras el corte, esta es la única copia. `npm run orden`

baseline/                  el estado de origen contra el que se diffea (Fase 1)
  html/ text/ seo.json     versionados
  shots/                   460 capturas (115 x 4 anchos), JPEG q82 a 1/4  VERSIONADAS:
                           son la unica prueba de paridad y no se pueden regenerar
                           una vez se corte el dominio

scripts/                   generadores y puertas de verificación
src/ public/ studio/       el sitio nuevo
docs/                      entregables al cliente
```

## Regenerar los insumos

```bash
node scripts/extract-ix2.mjs && node scripts/build-inventory.mjs
```

## El orden de la tubería importa

`build-plantillas.mjs` deriva la plantilla de una colección **diffeando las páginas estáticas que
ya existen**, y al terminar las borra. O sea que una vez convertida una familia, para volver a
derivarla hay que reponerlas antes:

```bash
npm run paginas      # repone las 114 estáticas desde _source/vivo/
npm run plantillas   # las vuelve a fundir en una plantilla por familia
npm run build
```

Si se lanza `npm run plantillas` a secas sobre una familia ya convertida, lo dice y no hace nada.

Desde R6, `npm run paginas` **no regenera las rutas de `NO_REGENERAR`** (hoy solo `/`) y sale con
código 1 diciendo cuáles ha dejado en paz: su `.astro` deja de ser derivado en cuanto R9 lo toca, y
regenerarlo sería borrar el rediseño. Las otras 114 sí se reponen con normalidad.

## Las puertas de navegador: una cada vez y con foco — y `check:seo` NO es una de ellas

Abren Chromium en modo visible y **miden mal si la ventana pierde el foco** — hay una sonda que lo
detecta y aborta antes que dar un número falso. Son **cuatro**:

`check:texto` · `check:visual` · `check:ix2` · `check:cascaron`

Fuera de la cadena de `npm run check` también abren navegador `check:baseline`, la captura
(`npm run baseline`, `npm run baseline:cascaron`), `npm run oraculo`, los dos `diag-*` y
`scripts/aprobar-diseno.mjs`. Se cuentan igual para el reparto: **una cada vez**.

**`check:seo` NO abre navegador.** Es estática: lee el HTML ya construido con `jsdom`. Aquí ponía
lo contrario, y esa línea reservaba una puerta entera que en realidad puede correr en paralelo con
cualquier otra cosa. La evidencia son sus imports:

```bash
$ head -26 scripts/check-seo.mjs | grep '^import'
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
```

Correr dos de las de navegador a la vez (o un diagnóstico mientras corre la captura) las hace
competir por el foco: medido, la captura pasó de **9,2 s a 45 s por página** y las capturas de esa
tanda quedaron en duda. **Una cada vez.**
