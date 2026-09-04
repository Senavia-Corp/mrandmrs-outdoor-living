# Planes de animación

Generados por la skill `improve-animations`, a partir del feedback directo del cliente sobre el
sitio ya en producción.

| # | Título | Severidad | Categoría | Estado |
|---|---|---|---|---|
| [001](001-mosaico-slow-motion-easing.md) | El mosaico: de snappy-UI a slow-motion natural | HIGH | Easing & duration | **DONE** |
| [002](002-lightbox-apertura-sin-movimiento.md) | Los dos lightbox aparecen de golpe: darles entrada y salida | HIGH | Purpose & physicality | TODO |

## Orden de ejecución

Sin dependencias entre ellos — 001 toca `src/styles/intro.css`, 002 toca los bloques
`<style is:global>` de dos componentes. No se pisan.

**001 — aplicado.** Ciclo a 12s con `cubic-bezier(0.45, 0, 0.55, 1)`. Verificado contra
`.vercel/output/static`; `check:tokens` verde. Salvedad medida al aplicarlo, anotada abajo.

## Hallazgos vistos y NO convertidos en plan (de la ronda del lightbox)

Están confirmados en el código; se dejaron fuera a propósito para que 002 no creciera.

- **Cambiar de foto con ‹ › es un corte seco** — `GalleryLeadLightbox.astro:291` hace
  `img.src = …` sin crossfade, y con imagen no cacheada parpadea en blanco. MEDIUM.
- **Los 3 pasos del formulario saltan con `display`** — `GalleryLeadLightbox.astro:343`
  alterna `block`/`none` sin transición, dentro del propio lightbox. MEDIUM.
- **El mosaico no se ralentizó de forma uniforme** — medido sobre el build tras aplicar 001: las
  columnas se mueven en 750 ms y las filas en 2250 ms (3:1). Viene de la estructura original
  (que era 208 ms contra 1092 ms) y 001 la preservó a propósito. Igualarlo son dos paradas en
  `intro.css:214-215`, pero convierte el relevo —primero columnas, luego filas— en un solapamiento
  de 1500 ms: cambia el carácter del efecto, así que es decisión de producto, no de timing. LOW.

## Fuera de alcance a propósito (no generar planes para esto sin pedirlo)

- Acotar el bucle del mosaico a 1-2 vueltas en vez de infinito — decisión de producto ya tomada
  con el cliente (prefiere que siga en bucle mientras la sección esté en pantalla).
- Migrar el mosaico de `flex-basis`/`height` a `transform`/`clip-path` — decisión ya tomada,
  documentada en `src/styles/intro.css` sección 5.
- El hueco de WCAG 2.2.2 (contenido en movimiento automático sin pausa) — anotado como abierto
  en `MIGRACION-LOG.md`, pendiente de que el cliente decida, no de un plan de animación.
- El blur de máscara en la transición del mosaico (AUDIT.md §7) — missed opportunity al final
  de 001, deliberadamente no convertido en plan.
- La foto creciendo desde su miniatura al abrir el lightbox (elemento compartido / View
  Transitions) — missed opportunity al final de 002; es el techo de calidad del patrón, pero toca
  JS y es bastante más trabajo.
