# 002 — Los dos lightbox aparecen de golpe: darles entrada y salida

- **Status**: TODO
- **Commit**: 370f684
- **Severity**: HIGH
- **Category**: Purpose & physicality (secundarias: Cohesion & tokens, Accessibility)
- **Estimated scope**: 2 ficheros (`src/components/GalleryLeadLightbox.astro`,
  `src/components/Componentes.astro`), solo sus bloques `<style is:global>`. Cero JS nuevo, cero
  markup, cero ficheros nuevos.

## Problem

El cliente dice que al **abrir una foto** el movimiento es brusco. No lo es por una curva mal
elegida: es que **no hay ninguna animación**. Los dos lightbox del sitio son `<dialog>` nativos
que se abren con `showModal()` y aparecen en un solo frame.

Peor en móvil: `.mm-lbx` está estilado como **bottom sheet** (`margin: auto 0 0`, radios solo
arriba, `max-height: 90dvh`) y un sheet que no desliza es el ejemplo de manual de aparición
brusca. Y el `::backdrop` es un velo al **90 % de opacidad** que entra igual de golpe — un
fogonazo que acompaña cada apertura.

En todo el repo no hay ni un `@starting-style` ni un `transition-behavior: allow-discrete`, que
es justo el mecanismo que falta.

Código actual, verbatim:

```css
/* src/components/GalleryLeadLightbox.astro:113-114 — actual */
  .mm-lbx { border: 0; padding: 0; background: transparent; max-width: 100vw }
  .mm-lbx::backdrop { background-color: color-mix(in srgb, var(--mm-tinta-cuerpo) 90%, transparent) }
```

```css
/* src/components/GalleryLeadLightbox.astro:117-127 — actual (sheet móvil) */
  .mm-lbx[open] {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 90dvh;
    margin: auto 0 0;
    border-radius: var(--mm-r-24) var(--mm-r-24) 0 0;
    background-color: var(--mm-superficie);
    box-shadow: var(--mm-sombra-3);
    overflow: hidden;
  }
```

```css
/* src/components/GalleryLeadLightbox.astro:254-260 — actual (escritorio) */
  @media (min-width: 992px) {
    .mm-lbx[open] {
      width: min(92vw, 1200px);
      max-height: 88vh;
      margin: auto;
      border-radius: var(--mm-r-24);
    }
```

```css
/* src/components/Componentes.astro:56, 61-62 — actual (el otro lightbox) */
  .mm-lb { border: 0; padding: 0; background: transparent; max-width: 100vw; max-height: 100vh; width: 100%; height: 100% }
  .mm-lb::backdrop { background-color: color-mix(in srgb, var(--mm-tinta-cuerpo) 90%, transparent) }
  .mm-lb[open] { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1rem }
```

`.mm-lbx` sirve las páginas de galería (`a.w-lightbox` dentro de `.gallery-page`);
`.mm-lb` sirve **el resto del sitio**. Los dos tienen el mismo defecto, así que arreglar solo uno
deja al cliente viéndolo brusco en la mitad de las páginas.

## Target

Valores sacados de `AUDIT.md`, no aproximados:

| Qué | Valor | De dónde |
|---|---|---|
| Duración de apertura | **400 ms** | AUDIT.md §2, banda "Modals, drawers: 200–500ms" — se elige el extremo lento a propósito, el cliente pide slow motion |
| Duración de cierre | **300 ms** | AUDIT.md §4, timing asimétrico: la respuesta del sistema va algo más rápida que la acción deliberada |
| Curva del sheet móvil | **`cubic-bezier(0.32, 0.72, 0, 1)`** | AUDIT.md §2, `--ease-drawer` (curva de drawer tipo iOS) |
| Curva de velo y escala | **`cubic-bezier(0.23, 1, 0.32, 1)`** | AUDIT.md §2, `--ease-out` fuerte — entrar/salir siempre es ease-out |
| Escala en escritorio | **`scale(0.96)` → `scale(1)`** | AUDIT.md §3: nunca `scale(0)`, la banda válida es 0.9–0.97 |
| Sheet móvil | **`translateY(100%)` → `0`** | El sheet entra desde fuera de la pantalla, no aparece a medio camino |

Un modal es **exento** de `transform-origin` anclado al disparador (AUDIT.md §3): aparecen
centrados y `center` es lo correcto. No lo toques.

Mecanismo: `@starting-style` + `transition-behavior: allow-discrete`, todo en CSS. **Sin JS y
sin `animation-fill-mode`** (el gate `check:tokens` prohíbe `forwards`/`both`, línea 305 de
`scripts/check-tokens.mjs`).

**Gotcha que hay que entender antes de escribir nada**: con `transition`, la duración que manda
es la del estado **destino**. Por eso la duración de CIERRE se declara en la regla base
(`.mm-lbx`, que es el destino al cerrar) y la de APERTURA en la regla `[open]` (destino al
abrir). Si pones las dos en el mismo sitio, el timing asimétrico no ocurre.

## Repo conventions to follow

- **Afinar por custom properties locales**, como ya hace el mosaico
  (`src/styles/intro.css:209-211`, `--mosaico-dur` / `--mosaico-ease`): declara las duraciones y
  curvas una vez sobre el elemento y consúmelas por `var()`. Ese es el exemplar a copiar.
- **`::backdrop` lleva los valores literales, no `var()`**. La herencia de custom properties
  desde el elemento originante hacia `::backdrop` es reciente y desigual entre motores; con dos
  reglas y cuatro números no merece el riesgo. Si algún día ajustas la duración, son dos sitios
  — está anotado aquí a propósito.
- Cero `!important`, cero `@layer`, cero literales de color (usa los tokens `--mm-*` que ya están
  en esas reglas). Reglas de toda la capa de diseño.
- `prefers-reduced-motion` se escribe **en el mismo bloque**, no se deja para después: el repo ya
  lo hace así en `src/components/Componentes.astro:149` y en `src/styles/intro.css:227-230`.

## Steps

### 1 · `src/components/GalleryLeadLightbox.astro` — sustituye las líneas 113-114 por:

```css
  .mm-lbx {
    border: 0; padding: 0; background: transparent; max-width: 100vw;
    --lbx-abrir: 400ms;
    --lbx-cerrar: 300ms;
    --lbx-sheet: cubic-bezier(0.32, 0.72, 0, 1);
    --lbx-salida: cubic-bezier(0.23, 1, 0.32, 1);
    opacity: 0;
    transform: translateY(100%);
    transition:
      opacity var(--lbx-cerrar) var(--lbx-sheet),
      transform var(--lbx-cerrar) var(--lbx-sheet),
      overlay var(--lbx-cerrar) allow-discrete,
      display var(--lbx-cerrar) allow-discrete;
  }
  .mm-lbx::backdrop {
    background-color: color-mix(in srgb, var(--mm-tinta-cuerpo) 90%, transparent);
    opacity: 0;
    transition:
      opacity 300ms cubic-bezier(0.23, 1, 0.32, 1),
      overlay 300ms allow-discrete,
      display 300ms allow-discrete;
  }
  .mm-lbx[open]::backdrop {
    opacity: 1;
    transition:
      opacity 400ms cubic-bezier(0.23, 1, 0.32, 1),
      overlay 400ms allow-discrete,
      display 400ms allow-discrete;
  }
  @starting-style {
    .mm-lbx[open]::backdrop { opacity: 0 }
  }
```

### 2 · Dentro de la regla `.mm-lbx[open]` existente (líneas 117-127), añade al final, sin quitar nada de lo que ya hay:

```css
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity var(--lbx-abrir) var(--lbx-sheet),
      transform var(--lbx-abrir) var(--lbx-sheet),
      overlay var(--lbx-abrir) allow-discrete,
      display var(--lbx-abrir) allow-discrete;
```

E **inmediatamente después** de esa regla (el orden importa: `@starting-style` tiene que ir
después de la regla `[open]`), añade:

```css
  @starting-style {
    .mm-lbx[open] { opacity: 0; transform: translateY(100%) }
  }
```

### 3 · Dentro del `@media (min-width: 992px)` (línea 254), el sheet se cambia por fundido + escala. Añade dentro del media query, junto a la regla `.mm-lbx[open]` que ya está allí:

```css
    .mm-lbx {
      transform: scale(0.96);
      transition:
        opacity var(--lbx-cerrar) var(--lbx-salida),
        transform var(--lbx-cerrar) var(--lbx-salida),
        overlay var(--lbx-cerrar) allow-discrete,
        display var(--lbx-cerrar) allow-discrete;
    }
```

y dentro de la regla `.mm-lbx[open]` de ese media query, al final:

```css
      transform: scale(1);
      transition:
        opacity var(--lbx-abrir) var(--lbx-salida),
        transform var(--lbx-abrir) var(--lbx-salida),
        overlay var(--lbx-abrir) allow-discrete,
        display var(--lbx-abrir) allow-discrete;
```

y justo después de esa regla, todavía dentro del media query:

```css
    @starting-style {
      .mm-lbx[open] { opacity: 0; transform: scale(0.96) }
    }
```

### 4 · `src/components/Componentes.astro` — el otro lightbox. Sustituye la línea 56 por:

```css
  .mm-lb {
    border: 0; padding: 0; background: transparent; max-width: 100vw; max-height: 100vh; width: 100%; height: 100%;
    --lb-abrir: 400ms;
    --lb-cerrar: 300ms;
    --lb-salida: cubic-bezier(0.23, 1, 0.32, 1);
    opacity: 0;
    transform: scale(0.96);
    transition:
      opacity var(--lb-cerrar) var(--lb-salida),
      transform var(--lb-cerrar) var(--lb-salida),
      overlay var(--lb-cerrar) allow-discrete,
      display var(--lb-cerrar) allow-discrete;
  }
```

La línea 61 (`.mm-lb::backdrop`) **conserva su comentario de contraste de las líneas 57-60 tal
cual** — ahí está medido el 90 % y por qué; no lo borres. Sustituye solo la declaración:

```css
  .mm-lb::backdrop {
    background-color: color-mix(in srgb, var(--mm-tinta-cuerpo) 90%, transparent);
    opacity: 0;
    transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1), overlay 300ms allow-discrete, display 300ms allow-discrete;
  }
  .mm-lb[open]::backdrop {
    opacity: 1;
    transition: opacity 400ms cubic-bezier(0.23, 1, 0.32, 1), overlay 400ms allow-discrete, display 400ms allow-discrete;
  }
  @starting-style {
    .mm-lb[open]::backdrop { opacity: 0 }
  }
```

Y la línea 62 (`.mm-lb[open]`) pasa a:

```css
  .mm-lb[open] {
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1rem;
    opacity: 1;
    transform: scale(1);
    transition:
      opacity var(--lb-abrir) var(--lb-salida),
      transform var(--lb-abrir) var(--lb-salida),
      overlay var(--lb-abrir) allow-discrete,
      display var(--lb-abrir) allow-discrete;
  }
  @starting-style {
    .mm-lb[open] { opacity: 0; transform: scale(0.96) }
  }
```

### 5 · `prefers-reduced-motion`, en los dos ficheros

En `GalleryLeadLightbox.astro`, **después** del `@media (min-width: 992px)` (para que gane por
orden de fuente, ya que los media queries no suben especificidad) y antes del `@media print`:

```css
  @media (prefers-reduced-motion: reduce) {
    .mm-lbx, .mm-lbx::backdrop, .mm-lbx[open], .mm-lbx[open]::backdrop { transition: none }
    .mm-lbx, .mm-lbx[open] { transform: none }
  }
```

En `Componentes.astro`, dentro del `@media (prefers-reduced-motion: reduce)` que ya existe en la
línea 149, añade:

```css
    .mm-lb, .mm-lb::backdrop, .mm-lb[open], .mm-lb[open]::backdrop { transition: none }
    .mm-lb, .mm-lb[open] { transform: none }
```

## Boundaries

- **Do NOT tocar el JS.** `showModal()` / `dlg.close()` (`GalleryLeadLightbox.astro:310, 313-320`
  y `Componentes.astro:247, 250-252`) se quedan exactamente como están: `allow-discrete` hace que
  el elemento siga pintado durante la salida sin que el JS tenga que esperar a nada. Si acabas
  añadiendo un `setTimeout` antes de `close()`, te has salido del plan.
- **Do NOT tocar el markup** de ninguno de los dos `<dialog>`, ni el motor de 3 pasos del
  formulario (`GalleryLeadLightbox.astro:326-346`).
- **Do NOT animar el cambio de foto** con ‹ › (`img.src = …`, línea 291) ni la transición entre
  los 3 pasos del formulario (línea 343). Son hallazgos reales pero van en su propio plan; aquí
  quedan fuera a propósito.
- **Do NOT cambiar el 90 % del velo** ni el comentario de contraste de `Componentes.astro:57-60`
  — ese porcentaje está medido contra WCAG, no elegido a ojo. Solo se le añade una `opacity` que
  lo lleva de 0 a 1; el color no se toca.
- **Do NOT añadir `transform-origin`.** Los modales son exentos (AUDIT.md §3): centrado es lo
  correcto.
- **Do NOT usar `animation`/`@keyframes`** para esto. Con keyframes harían falta `forwards`/`both`
  para retener el estado final, y el gate los prohíbe. `transition` + `@starting-style` no los
  necesita.

## Verification

- **Mecánica**: `npm run build` y `npm run check:tokens`. Verifica sobre `.vercel/output/static`,
  nunca sobre `astro dev` (regla dura del repo).

- **Riesgo conocido del gate, léelo antes de dar por fallado el plan**: la comprobación 7 de
  `scripts/check-tokens.mjs` (línea 362, "cero `opacity: 0` estático") escanea reglas y exime las
  que están dentro de `@keyframes`, bajo `[data-*]`/`[aria-*]`, o cuando otra regla con el mismo
  token de clase vuelve a subir la opacidad a ≥ 0.5 (`enciende()`, líneas 347-355). Las reglas
  base (`.mm-lbx`, `.mm-lb`, y sus `::backdrop`) quedan eximidas porque las `[open]`
  correspondientes ponen `opacity: 1`. Lo que **no está claro** es cómo parsea el gate los
  bloques `@starting-style` anidados: no conoce esa at-rule. Si la puerta se pone roja señalando
  las reglas de `@starting-style`, **la solución correcta es enseñarle la at-rule** —añadir
  `@starting-style` a la exención al lado de la que ya existe para `@keyframes`— y **no** quitar
  el `@starting-style` del CSS ni relajar la regla. Si llegas ahí, párate y dilo: es un cambio en
  una puerta, y eso se decide, no se aplica de tapadillo.

- **Feel check** (`npm run dev`, puerto 4325):
  - `/gallery` → clic en una foto. En una ventana **estrecha** (< 992px) el panel tiene que
    **subir desde abajo**, no aparecer. En ancha, entrar creciendo levemente desde el 96 %.
  - El velo oscuro tiene que **fundir**, no encender de golpe. Es la mitad de la sensación.
  - Cierra con la ✕, con Esc y clicando fuera: las tres tienen que **salir animadas**, no
    desaparecer. Si alguna desaparece de golpe, falta el `allow-discrete` en esa regla.
  - Abre y cierra **rápido, varias veces seguidas**: al ser `transition` y no `@keyframes`, debe
    reencaminar desde donde esté (AUDIT.md §4), sin saltos ni parpadeos.
  - Repite en una página que **no** sea de galería (p. ej. `/project/...`) para ejercitar
    `.mm-lb`, que es el otro componente.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: el lightbox tiene que abrir y cerrar
    **instantáneo y sin transform**, pero perfectamente visible y utilizable. Que se vea, no que
    se anime.
  - DevTools → Animations, playback al 25 %: la entrada no debe tener frenazo al final ni
    arrancada seca al principio.

- **Done when**: build verde, `check:tokens` verde (o el cambio de gate discutido y decidido), y
  abrir una foto se lee como algo que **llega**, no como algo que **aparece** — en los dos
  lightbox, en ancho y en estrecho.

## Missed opportunity (opcional, fuera de este plan)

La foto podría crecer **desde su miniatura** en la rejilla hasta el visor (elemento compartido,
vía View Transitions), que convierte el corte en continuidad espacial y es el techo de calidad de
este patrón. Es bastante más trabajo que este plan y toca JS; si después de esto el cliente
sigue queriendo más, es la siguiente palanca, en un plan aparte.
