# INFORME R10-SEC · PULIDOR-2 — render 3D, zona de servicio y feed

Commit `7649cb8`. `check:tokens` VERDE (12/12). Todos los números salen de medir; el comando
va al lado. Medido sobre `astro dev` en `/lab/secciones` y **re-verificado a especificidad de
producción sobre la ruta real `/`**, más el píxel renderizado con `sharp` para los velos.

```
FICHEROS  src/styles/render3d.css   ._3d-section    65 rutas
          src/styles/ubicacion.css  .location       17 rutas
          src/styles/social.css     .social-media   79 rutas
          src/pages/_lab-secciones.astro · src/pages/lab/[v].astro   (banco, 0 HTML en build)
```

---

## R10-3D · `._3d-section` (65 rutas)

| métrica | antes | después |
|---|---|---|
| recorte del vídeo @1920/1440/992/991/767/600/479 | 13,5 / 13,5 / **20,4** / 14,4 / **25,0** / 2,0 / 15,9 % | **0 % en los siete** |
| canal (caja h2 / párrafo / vídeo) @1920 | 585 / 585 / 460 | **335 / 335 / 335** |
| canal @1440 · @992 · @479 | 345/345/220 · 121/121/36 · 28/28/28 | **95/95/95 · 32/32/32 · 24/24/24** |
| aire lateral | `2em` → 36 px @1440, 28 @991 | `--mm-canal` → 32 / 24 px |
| banda arriba/abajo @991 | 48 / 48 | 64 / 64 |
| anillo de foco del botón de vídeo | `#3b79c3` (Webflow) | `rgb(255,255,255)`, 2 px, offset 2 px |
| botón de play/pausa | 44×44 | 44×44 — **sin tocar** |

`aspect-ratio: 16/9` **con `height: auto` explícito**: sin él, con la altura aún declarada,
`aspect-ratio` calcula el ANCHO y desborda la columna. Fuente 1280×720 (`ffprobe`).
El 20,4 % de 992 y el 25,0 % de 767 no los ve ninguna puerta.
El botón **no** lleva receta táctil: ya medía 44×44 porque sus dos SVG son nativos de 44×44;
declararla habría sido una declaración inerte.

---

## R10-UBI · `.location` (17 rutas)

**El velo, medido sobre el píxel renderizado** (captura del área útil con el texto oculto,
`sharp` + fórmula de luminancia WCAG 2.x):

| ancho | SUR peor píxel | NORTE peor píxel | área < 4,5:1 |
|---|---|---|---|
| 1920 | 6,48:1 | 6,86:1 | **0,00 %** |
| 1440 | 6,31:1 | 7,17:1 | **0,00 %** |
| 991 | 6,57:1 | 6,83:1 | **0,00 %** |
| 479 | 6,59:1 | 6,81:1 | **0,00 %** |

Modelo analítico sobre las `.avif` completas (cota conservadora): navy 68 % → 5,83:1 y 6,16:1.
Hoy es negro al 50 % → 4,04:1 y 4,34:1. **Copiar el navy al 50 % de `.trusted-section` lo
empeoraría a 3,34:1 y 3,58:1**, tal como avisaba el criterio.

| métrica | antes | después |
|---|---|---|
| banda arriba / abajo | 96 / **0** px (48 / 0 a ≤991) | 96/96 · 64/64 · 48/48 |
| canal (h2 / párrafo / tarjeta) | 0 / 0 / 0 | **367/367/367** @1920 · **127/127/127** @1440 · **32/32/32** @992 |
| alturas de las dos tarjetas | iguales solo por `min-height:450px` | iguales, diferencia **0,0 px** |
| bases de los dos CTA | — | diferencia **0,0 px** @1920/1440/992/991 |
| aire muerto por tarjeta | 116,8 @1440 · **166,8 @600 y @767** · 147,2 @991 | **0 / 0 en todos** |
| alto del CTA | 36,4 px | **44 px** |
| CTA hover | ninguno | `#f4b248` → `#d99933` |
| CTA foco | navy (`propio.css:62`) sobre velo navy | **blanco**, 2 px, offset 2 px |

**Prueba forzada** (una línea de más en UNA tarjeta, `.lab--b`): altura, base de CTA **y top de
h3** con diferencia 0,0 px en los cuatro anchos. La igualdad es estructural, no casualidad.
`align-items: center` era lo único que tapaba la desigualdad; ahora es `stretch`.

**El CTA aplana el degradado de 5 paradas al oro del token.** Su parada más oscura `#d99933` da
6,35:1 con el navy encima; plano son 8,40:1 en toda la superficie. Y su límite contra el peor
píxel del velo sube de 2,38:1 a **3,14:1** (SUR) y **3,32:1** (NORTE) — el mínimo de WCAG 1.4.11.

🚨 **Trampa cerrada y anotada en el CSS**: la foto es un `<img class="full-image-background">` a
`z-index:-1`. Pinta debajo del velo **solo mientras `.item-country` no cree contexto de
apilamiento**. Un `transform`, `filter`, `opacity<1`, `will-change` o `isolation` en un hover de
esa regla sube la foto por encima y el blanco cae a 1,64:1 — sin mover un píxel en reposo.
Comprobado: 0 de esas propiedades en la regla.

---

## R10-SOC · `.social-media` (79 rutas)

**Cascada demostrada, no supuesta.** El `<style>` del componente carga después (offset 1602
contra 1546) con `[data-astro-cid-d6k336wr]`:

| regla | rival | peso rival | mío | peso mío |
|---|---|---|---|---|
| velo en hover/foco | `.mm-ig__celda[cid] a[cid]:hover .mm-ig__velo[cid]` | (0,6,1) | `section.social-media .mm-ig .mm-ig__rejilla .mm-ig__celda a[href]:is(:hover,:focus-visible) .mm-ig__velo` | **(0,7,2)** |
| chip de móvil | idem | (0,6,1) | `… a[href] .mm-ig__velo` | **(0,6,2)** |
| rejilla | `.mm-ig__rejilla[cid]` | (0,2,0) | `section.social-media .mm-ig .mm-ig__rejilla` | (0,3,1) |
| foco de celda | `.mm-ig__celda[cid] a[cid]:focus-visible` | (0,4,1) | `… a[href]:focus-visible` | (0,5,2) |
| foco de cabecera | `.mm-ig__seguir[cid]:focus-visible` | (0,3,0) | `… .mm-ig__cabecera .mm-ig__seguir:focus-visible` | (0,5,1) |

`a[href]` es cierto —toda celda es un enlace—, no un truco para inflar. **Cero `!important`.**

| métrica | antes | después |
|---|---|---|
| columnas @1920/991/767/479 | 6 / 5 / 3 / 2 (`auto-fill`) | **4 / 4 / 3 / 2** (divisores de 12) |
| huecos con 12 fotos | **3 huecos de 184,12 px** @991 | **0 en los siete anchos** |
| salto de celda 991→992 | — | 219,8 → 220,0 px (**0,2 px**) |
| escritorio vs tablet | tablet 22,5 % MÁS grande | 300,5 vs 219,8 px (escritorio mayor) |
| velo del hover | `#001c6373` = navy 45,1 % → **2,85:1** | navy 68 % → **5,83:1**, y también con teclado |
| foco | `#1cadeb` (prohibido) | `--mm-foco` navy, anillo FUERA de la foto → 15,60:1 contra sus dos vecinos |
| `Follow` / `@usuario` | 79,5×**28** / 217,2×**12** | **44** px de alto los dos |
| sección con `items: []` | 0 px (sin declaraciones) | **0 px en los siete anchos** |

**Guarda de vacío**: todo el aire vive en `.social-media:has(.mm-ig)`. Con `items: []` los 79
HTML no mueven un píxel — verificado sobre `/` construido.

**Qué ve un dedo** (`@media (hover: none)`, verificado con contexto móvil real): el velo deja de
ser velo y se convierte en **chip de esquina de 32×32, navy sólido, radio 8, con el glifo a
opacidad 1 y 16×16**. Blanco sobre navy sólido = **15,60:1**, sin dejar la foto turbia.
El `opacity: 0` del glifo se queda en el componente con su encendedor al lado, así que
`check:tokens` no se pone roja: esta hoja no escribe ningún `opacity: 0`.

**Prueba de pintado**: hoy hay **0 nodos `.mm-ig`** en las 115 (las 1975 apariciones de `mm-ig`
son el `<style>` del componente). El feed se fotografió con `datosDemo` y **12 fotos reales** de
`public/images/projects/` — obra propia del cliente, nada generado.

---

## Declaraciones emitidas vs con efecto medido

| fichero | emite | con efecto |
|---|---|---|
| `render3d.css` | 27 | 27 |
| `ubicacion.css` | 53 | 53 |
| `social.css` | 29 | 29 |

**Se retiraron 6 declaraciones inertes** al medirlas: `.cms-country{margin-top}` y
`.cms-list-country{gap}` (Webflow ya pone 2rem y 1rem, que coinciden con los tokens),
`.button-styles{color}` (`propio.css:36` ya lo pone en toda la casa), y en el feed
`.mm-ig{max-width}`, `.mm-ig__seguir{border-radius}` y `{color}` (el componente ya los pone).
La dependencia de esos valores ajenos queda escrita en comentario donde estaba la declaración.

Los estados (5 anillos de foco, 2 hover y el chip de móvil) se midieron provocando el estado:
`getComputedStyle` en reposo no los ve y los habría contado como inertes en falso.

## Autovigilancia — lo que `check:tokens` NO comprueba

`grep max-width scripts/check-tokens.mjs` → **0**. No hay ni una regex de longitudes. O sea que
dos de las cuatro cosas que `CRITERIO.md:28-31` le atribuye **no las comprueba nadie**. Medido a
mano sobre mis tres hojas, con los comentarios fuera:

```
!important 0 · @layer 0 · @media con max-width 0 · opacity:0 0 · literales de color 0 · url( 0
breakpoints: min-width 480 / 768 / 992  (+ prefers-reduced-motion y hover:none)
longitudes literales: `44px` x2 — el número de WCAG 2.2, sin token en la casa (igual que intro.css:165)
```

## RIESGO A OTRAS RUTAS

`check:visual` se pone roja en **63 rutas** (65 ∪ 17 ∪ 79 = 63 únicas, no 161: las tres
secciones se solapan). Hay que re-baselinizar por lotes, no de una corrida.

⚠️ **`/about` sigue en contrato `paridad`** — la única de las 63. `aprobar-diseno.mjs:82` la
rechaza hasta que se declare con `fecha`, `sha` y `motivo`.

## ABIERTO

1. **`/about` en `paridad`** (arriba). 16 de 17 rutas de `.location` ya están en `rediseno`.
2. **El póster del vídeo es el peor fotograma de los 30 s.** `bg-video-3d-poster.0000000.jpg`
   es el segundo 0: el CAD en negro. El vídeo alterna CAD y render, y los renders (12 s, 15 s,
   21 s) son el argumento de venta. Es lo que se ve con conexión lenta y con `reduced-motion`.
   Es un activo, no CSS: decisión de dirección.
3. **`img.design-bg` está en `display:none`** en las 65 rutas: `design2.webp` más 4 del
   `srcset`, descargadas y nunca pintadas. Es markup.
4. **Existe un máster 2560×1440 huérfano**: `public/videos/bg-video-3d.mp4`, 24 MB, que no
   referencia ninguna página. Lo mismo con `bg-video.mp4` (21 MB) y `bg-video-1.mp4` (26 MB).
   La fuente servida es la de 1280×720.
5. **`id="530cbcaa-…-video"` y los `data-w-id` se repiten** en las 65 rutas.
6. **`.block-item-country` no existe en ninguna de las 115**: 3 reglas muertas en `webflow.css`
   (`height:650px`, `padding:4em 6em`). La clase viva es `.block-info-country`.
7. **La foto de la tarjeta North es un mapa de cobertura y la de South un dron de proyecto.**
   No son pareja visual. Hay 54 fotos reales en `public/images/projects/` si se quiere cambiar.
