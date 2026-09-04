# 001 — El mosaico de .trusted-section: de snappy-UI a slow-motion natural

- **Status**: TODO
- **Commit**: 6ce84d6
- **Severity**: HIGH
- **Category**: Easing & duration (secundaria: Cohesion & tokens)
- **Estimated scope**: 1 fichero (`src/styles/intro.css`), ~10 líneas — 2 valores de custom property + 4 reglas `@keyframes` reescritas. Cero ficheros nuevos, cero JS.

## Problem

El cliente (dueño del sitio), mirando la home ya en producción, describe el bucle del mosaico
como **"muy rápido y brusco"**, "no natural", y pide que se sienta más "slow motion" para que el
efecto se aprecie mejor — sin perder el carácter del efecto (las 3 fotos reacomodándose).

La causa raíz es una curva de easing mal elegida para lo que la sección realmente es. El easing
actual, `cubic-bezier(0.22, 1, 0.36, 1)`, es una curva ease-out FUERTE y muy asimétrica: el
control point `(0.22, 1)` hace que la animación alcance casi toda su velocidad en el primer 22%
del tiempo y luego se deslice el resto — es el perfil correcto para feedback de UI que tiene que
sentirse instantáneo (un botón, un tooltip), no para un morph ambiental continuo en una sección
de marketing. Sobre eso, el ciclo entero dura 5,2s repartido en 4 tramos de 1300ms cada uno, de
los cuales solo ~200ms (15%) son de reposo — el ojo apenas registra una composición antes de que
ya esté cambiando a la siguiente. La combinación (curva que acelera de golpe + casi sin pausa)
es exactamente lo que se lee como "brusco".

Código actual, verbatim:

```css
/* src/styles/intro.css:210-211 — actual */
.trusted-section {
  --mosaico-dur: 5.2s;
  --mosaico-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

```css
/* src/styles/intro.css:214-217 — actual */
@keyframes mm-mosaico-c1 { 0%, 21% { flex-basis: 50% } 25%, 46% { flex-basis: 70% } 50%, 75% { flex-basis: 30% } 96%, 100% { flex-basis: 50% } }
@keyframes mm-mosaico-c2 { 0%, 21% { flex-basis: 50% } 25%, 46% { flex-basis: 30% } 50%, 75% { flex-basis: 70% } 96%, 100% { flex-basis: 50% } }
@keyframes mm-mosaico-r1 { 0%, 25% { height: 50% } 46%, 50% { height: 70% } 71%, 75% { height: 30% } 96%, 100% { height: 50% } }
@keyframes mm-mosaico-r2 { 0%, 25% { height: 50% } 46%, 50% { height: 30% } 71%, 75% { height: 70% } 96%, 100% { height: 50% } }
```

```css
/* src/styles/intro.css:219-222 — actual, NO TOCAR (ya usa los custom properties de arriba) */
.trusted-section .grid-column.column1 { animation: mm-mosaico-c1 var(--mosaico-dur) var(--mosaico-ease) infinite; animation-play-state: paused }
.trusted-section .grid-column.column2 { animation: mm-mosaico-c2 var(--mosaico-dur) var(--mosaico-ease) infinite; animation-play-state: paused }
.trusted-section .grid-row.row1 { animation: mm-mosaico-r1 var(--mosaico-dur) var(--mosaico-ease) infinite; animation-play-state: paused }
.trusted-section .grid-row.row2 { animation: mm-mosaico-r2 var(--mosaico-dur) var(--mosaico-ease) infinite; animation-play-state: paused }
```

Este bloque se renderiza UNA vez, en `src/components/MosaicoConfianza.astro` vía
`src/layouts/Base.astro`, y aplica a las 80 rutas que tienen `.trusted-section` — el arreglo en
este único fichero corrige las 80 a la vez.

## Target

Dos cambios, ambos dentro de AUDIT.md categoría 2 (Easing & duration):

1. **Easing**: de una curva ease-out fuerte y asimétrica a una ease-in-out suave y simétrica —
   decisión de la propia guía de audit ("Moving / morphing on screen → ease-in-out"), pero MÁS
   suave que el `--ease-in-out` de ejemplo de AUDIT.md (`cubic-bezier(0.77,0,0.175,1)`, que es
   dramático — arranca casi parado, acelera de golpe en el medio: bueno para una transición de
   UI deliberada, demasiado abrupto en el medio para un morph continuo). Se usa
   `cubic-bezier(0.45, 0, 0.55, 1)`: casi simétrica, muy cercana a una curva seno — el perfil de
   aceleración/deceleración más "natural" que existe, literalmente la física de un movimiento
   armónico simple. Sin tirones ni arranques bruscos en ningún punto del recorrido.
2. **Duración y reparto**: el ciclo pasa de 5,2s a **12s** (×2,3 más lento) — dentro del
   presupuesto que la propia AUDIT.md deja abierto para "Marketing / explanatory: can be longer".
   Dentro de cada tramo de 3000ms (12000/4), la transición pasa de 1100ms a **2250ms** y la pausa
   de 200ms a **750ms** — de un reparto ~85%/15% (transición/reposo) a uno 75%/25%: no solo se
   mueve más despacio, también se queda más tiempo quieto en cada composición para que se
   aprecie antes de que cambie.

```css
/* target — src/styles/intro.css:210-211 */
.trusted-section {
  --mosaico-dur: 12s;
  --mosaico-ease: cubic-bezier(0.45, 0, 0.55, 1);
}
```

```css
/* target — src/styles/intro.css:214-217 */
@keyframes mm-mosaico-c1 { 0%, 18.75% { flex-basis: 50% } 25%, 43.75% { flex-basis: 70% } 50%, 75% { flex-basis: 30% } 93.75%, 100% { flex-basis: 50% } }
@keyframes mm-mosaico-c2 { 0%, 18.75% { flex-basis: 50% } 25%, 43.75% { flex-basis: 30% } 50%, 75% { flex-basis: 70% } 93.75%, 100% { flex-basis: 50% } }
@keyframes mm-mosaico-r1 { 0%, 25% { height: 50% } 43.75%, 50% { height: 70% } 68.75%, 75% { height: 30% } 93.75%, 100% { height: 50% } }
@keyframes mm-mosaico-r2 { 0%, 25% { height: 50% } 43.75%, 50% { height: 30% } 68.75%, 75% { height: 70% } 93.75%, 100% { height: 50% } }
```

Los `93.75%`/`43.75%`/`18.75%`/`68.75%` salen de dividir 2250ms de transición entre 12000ms de
ciclo (18,75 puntos porcentuales por tramo de transición); no son arbitrarios, no los redondees.
El resto de la estructura (qué propiedad no cambia en qué tramo — `c1`/`c2` no-op en 50-75%,
`r1`/`r2` no-op en 0-25%) es idéntica a la actual: son los mismos 4 estados reales
(50/50/50/50 → 70/30/50/50 → 30/70/70/30 → 30/70/30/70 → vuelta a 50/50/50/50), solo con más
tiempo y una curva distinta. **No cambies los valores de `flex-basis`/`height` en sí (50/70/30),
solo sus paradas de tiempo.**

## Repo conventions to follow

- El tiempo y la curva del bucle ya viven en dos custom properties locales sobre
  `.trusted-section` (`--mosaico-dur`, `--mosaico-ease`, `intro.css:210-211`) — así se afinan en
  un solo sitio y las 4 reglas `animation:` (`intro.css:219-222`) no se tocan, porque ya las
  consumen por `var()`. Sigue ese patrón: cambia los DOS valores de las custom properties, no
  las 4 declaraciones `animation:`.
- Cero `!important`, cero literales de color (aquí no aplica, no hay color de por medio), cero
  `@layer` — regla de toda la capa de diseño de este repo (`src/styles/intro.css:1-33`, cabecera
  del fichero).
- No animes `.image` ni toques `border-radius` — fuera de alcance, ya está fuera de alcance de
  esta sección desde la ronda anterior (`intro.css`, comentario de la sección 5).

## Steps

1. En `src/styles/intro.css`, dentro de la regla `.trusted-section { ... }` que declara
   `--mosaico-dur` y `--mosaico-ease` (línea 210-211), cambia los dos valores:
   - `--mosaico-dur: 5.2s;` → `--mosaico-dur: 12s;`
   - `--mosaico-ease: cubic-bezier(0.22, 1, 0.36, 1);` → `--mosaico-ease: cubic-bezier(0.45, 0, 0.55, 1);`
2. Reemplaza las 4 reglas `@keyframes` (líneas 214-217) por las 4 del bloque "target" de arriba,
   verbatim — mismos nombres (`mm-mosaico-c1/c2/r1/r2`), mismas propiedades animadas
   (`flex-basis` en c1/c2, `height` en r1/r2), solo cambian las paradas porcentuales.
3. No toques nada más de la sección 5 de `intro.css` (el comentario explicativo por encima puede
   quedarse tal cual, o actualizarse para reflejar los números nuevos si quieres — no es
   obligatorio para que el fix funcione).

## Boundaries

- Do NOT tocar `src/components/MosaicoConfianza.astro` (el `IntersectionObserver` que
  arranca/para el bucle) — el mecanismo de gateo no cambia, solo la velocidad y la curva.
- Do NOT tocar `scripts/build-paginas.mjs` ni ningún `.astro` de `src/pages/` — el fix vive
  entero en un fichero CSS compartido, ya alcanza las 80 rutas sin tocar generadores.
- Do NOT cambiar los valores `50%`/`70%`/`30%` de `flex-basis`/`height` — son la coreografía del
  efecto (qué foto crece y cuánto), no el timing. Este plan es solo timing + easing.
- Do NOT migrar a `transform`/`clip-path` — decisión ya tomada y documentada en `intro.css`
  sección 5 (el embed original nunca tocó `.image` a propósito, y las parejas de porcentajes
  siempre suman 100%, así que no hace falta `overflow` extra). No la reabras aquí.
- Do NOT tocar el bucle infinito en sí (seguir/parar en `IntersectionObserver`, sin acotar a
  1-2 vueltas) — decisión de producto ya confirmada con el cliente en la ronda anterior.
- Si al abrir `src/styles/intro.css` las líneas citadas no coinciden con lo que este plan cita
  verbatim (alguien más tocó el fichero entre medias), PARA y repórtalo en vez de improvisar
  sobre una base distinta.

## Verification

- **Mecánica**: `npm run build` (tiene que completar sin error) y luego
  `npm run check:tokens` (puerta verde — este cambio no toca colores ni añade `!important`, así
  que no debería mover ningún número de esa puerta). Verifica sobre `.vercel/output/static`
  después del build, nunca sobre `astro dev` (regla dura de este repo).
- **Feel check**: abre `npm run dev` y ve a `/lab/mosaico` (banco de pruebas ya existente, panel
  "PROPUESTA" a la derecha) o directamente a `/country/custom-pool-builders-marion-county-fl` en
  local, y confirma:
  - El primer cambio de composición tarda notablemente más en llegar (arranca en vista, el
    primer movimiento visible debería sentirse gradual, no un salto).
  - Cada composición se queda quieta un rato perceptible (~0,75s) antes de que empiece la
    siguiente transición — no debería sentirse como si estuviera siempre en movimiento.
  - La transición en sí no tiene una "arrancada" brusca ni un frenazo al final — el movimiento
    acelera y desacelera de forma pareja, sin tirón perceptible al empezar o al terminar cada
    tramo.
  - En DevTools → Animations panel, baja el playback al 25% y confirma que la curva se ve
    simétrica (mismo tiempo acelerando que decelerando), sin el arranque-rápido-luego-planea que
    tenía la curva vieja.
  - Desplázate fuera de la sección y vuelve a entrar: el bucle debe seguir arrancando/parando
    igual que antes (el `IntersectionObserver` no cambia).
  - `prefers-reduced-motion: reduce` (Rendering panel) sigue quitando el movimiento por completo
    (la regla en `intro.css` que hace `animation: none` bajo ese media query no se toca en este
    plan — confírmalo, no lo asumas).
- **Done when**: el build pasa, `check:tokens` sigue en verde, y a ojo (siguiendo los puntos de
  arriba) el bucle se lee como un movimiento lento y deliberado en vez de un cambio brusco —
  ajusta `--mosaico-dur`/`--mosaico-ease` si 12s/la curva propuesta no terminan de sentirse bien
  una vez lo veas correr; son el punto de partida razonado de este plan, no un número que no se
  pueda tocar. Si tocas esos dos valores, mantén las 4 `@keyframes` con las MISMAS proporciones
  (18,75% de cada tramo de 25% es transición, el resto reposo) — o recalcúlalas con la misma
  fórmula: `%transición = (ms_transición / ms_ciclo_total) × 100`.

## Missed opportunity (opcional, no forma parte de este plan)

AUDIT.md categoría 7 sugiere enmascarar transiciones que "doble-exponen" dos estados con un
`filter: blur(2px)` breve durante el movimiento — podría suavizar aún más la sensación de
recomposición. No lo incluyas en este plan (añade coste de rendimiento y una propiedad más que
gobernar); si el cliente lo sigue viendo brusco después de este cambio, es la siguiente palanca
a probar, en un plan aparte.
