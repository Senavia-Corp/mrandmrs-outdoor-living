# R9-HERO-AJUSTE — que el texto encaje en los héroes con vídeo

**Lee antes `00-PRINCIPIOS.md` y `R9-HERO-CONTEXTO.md`.** Este encargo es la continuación del
rediseño del héroe (commit `d35b260`, ya desplegado): la composición es correcta —texto a la
izquierda, anclado abajo, velo en degradado, vídeo visible— pero **el texto no cabe en la caja
que se le dio**. Es ajuste de tipografía y espaciado, no un rediseño.

Diagnóstico: **una sola causa raíz** explica las tres quejas. Medido con
`getBoundingClientRect` + `canvas.measureText` sobre producción
(`https://mrandmrs-outdoor-living.vercel.app`), a 1112×746 en home y 1209×869 en zona.

## La causa raíz

`.hero-home-block` tiene **`max-width: 800px`** (880 px en `min-width:992px`). Ese número se
copió tal cual del héroe de Pergola Plus **sin comprobar que sus titulares son mucho más
cortos**: «Live Outdoors. Beautifully.» son 26 caracteres, y aquí el h1 tiene 69 (home) y 80
(zona, ciudad larga).

La columna además **no crece con el viewport**. En una pantalla de 1920 px eso da las dos cosas
a la vez: **hueco muerto a la derecha** (la queja de «amontonado a la izquierda») y **el titular
partido en 3 líneas** (la queja de «se ve apretado»). Falla por los dos lados con el mismo
valor.

### Lo que eso rompe, medido

**HOME** (`.hero-glass-section-page.mm-hero`) — columna real 880 px:

| # | Síntoma | Medida |
|---|---|---|
| H1 | Titular en **3 líneas** | 60 px / interlineado 66 px. El texto en una línea mide **2056 px** → para 2 líneas hace falta **1028 px** de columna. Hay 880. |
| H2 | Alternativa por tamaño | A 880 px de ancho, el h1 entra en 2 líneas a **51,4 px** de fuente (medido, no estimado). |
| H3 | **Las badges parten su etiqueta** | `.text-divider-hero` hereda `width:80%` de Webflow → **704 px**. Las 4 pastillas miden 191+177+120+191 = 679 px, **+24 px de gaps = 703 px**: están a 1 px del límite. Y el contenedor es `flex-wrap:nowrap`, así que en vez de envolverse enteras **se encogen y rompen su propio texto** («Licensed &» / «Insurance»). Por eso miden 56 px de alto en vez de ~32. |
| H4 | El bloque ocupa demasiado | De **20,1 %** (badges) a **89,3 %** (botones) = **69 % del alto del héroe**. |

**ZONA** (`.hero-glass-section`, 55 rutas) — medido en `palm-beach-gardens-florida`, la ciudad
de nombre más largo:

| # | Elemento | Medida |
|---|---|---|
| Z1 | h1, 80 caracteres | 45 px, **3 líneas**. Una línea mide 1793 px → necesita **896 px** para 2. Hay 880 (renderiza a 816). |
| Z2 | h2 `.yellow`, **115 caracteres** | 35 px, **3 líneas**. Necesita **979 px** para 2. |
| Z3 | p `.paragraph-2`, 178 caracteres | 18 px, 3 líneas a 653 px. **Este está bien**: es una medida legible, no lo toques por tocarlo. |
| Z4 | El bloque ocupa demasiado | De **32,9 %** a **94,5 %** = **61,6 % del alto**. |

**Z2 es el peor de los seis.** A 35 px compite en peso visual con un h1 de 45 px: no hay
jerarquía, son dos bloques grandes apilados, y entre h1 y h2 suman **6 líneas** de texto grande
antes de llegar al párrafo.

## Objetivo

Pedido por Sebastian el 3-sep-2026, viendo el sitio ya desplegado:

1. Titular en **2 líneas**, no 3. Subtítulo compacto. En **los dos** héroes.
2. Las badges de home, **una línea cada una**, sin partir la etiqueta.
3. Que el bloque se vea **en la mitad inferior** del héroe.
4. Que la composición se vea **equilibrada**, no amontonada a la izquierda.

Autoriza explícitamente **reducir el tamaño de letra** si hace falta.

**El punto 3 sale gratis y conviene entenderlo antes de mover nada:** el bloque ya está anclado
abajo (`align-items:flex-end`). No hay que desplazarlo — hay que **acortarlo**. Al pasar el h1
de 3 a 2 líneas y las badges de 2 a 1, home baja de empezar en 20 % a ~32 %, y zona de 33 % a
~50 %. Mover el bloque a mano además desalinearía el velo (ver `R9-HERO-CONTEXTO.md` §3).

## Lo que hace este encargo difícil: el contenido cambia de largo

Las 53 páginas de ciudad comparten plantilla pero **no comparten texto**. El h1 va de ~67
caracteres («…In Ocala, Florida») a ~80 («…In Palm Beach Gardens, Florida»), y el h2 sale de
Sanity, también variable.

Una solución con píxeles fijos afinada contra **una** página se rompe en las otras 52. Exigencia
del encargo:

- `clamp()` para los tamaños, no valores fijos por breakpoint.
- Ancho de columna que **crezca con el viewport**, con tope (p. ej. `min(1100px, 76vw)`).
- `text-wrap: balance` en los titulares: reparte las líneas parejas, que es literalmente lo que
  Sebastian pide con «simétrico». El h1 de home ya lo lleva; el de zona no.
- Medida del párrafo en `ch`, para que siga al tamaño de fuente en vez de pelearse con él.
- **Validar contra la ciudad más larga Y la más corta**, no contra una.

## Punto de partida — calibrar, no aplicar a ciegas

Números derivados de las medidas de arriba. Son el sitio por donde empezar, no el resultado:
hay que verlos en el build y ajustar.

| Qué | De | A | Por qué |
|---|---|---|---|
| `.hero-home-block` (los 2 héroes, cada uno en su fichero) | 880 px | ~**1080-1120 px**, fluido | 1028 px es el mínimo teórico para 2 líneas en home; hace falta holgura porque no se parte a mitad de palabra |
| h1 de home | 60 px | ~**52-56 px** fluido | Con 1080 px de columna, 52 px entra en 2 líneas con margen |
| `.text-divider-hero` (badges) | `width:80%`, `nowrap`, gap 8 px | `width:auto`, **`flex-wrap:wrap`**, pastillas que no encojan (`flex-shrink:0` o `white-space:nowrap` en la etiqueta), gap ~**12 px** | Es el bug más claro. Si aun así no caben en una fila, que envuelvan **como pastillas enteras** (2+2): se lee como decisión, no como error |
| h1 de zona | 45 px | ~**38-42 px** fluido | 896 px es el mínimo para la ciudad más larga |
| h2 `.yellow` de zona | 35 px | ~**22-26 px** (`--mm-paso-5` es `clamp(20px,…,25px)`) | **El cambio de mayor impacto**: arregla la jerarquía y ahorra ~2 líneas de alto de golpe |
| `.paragraph-2` | 653 px / 18 px | dejar | Ya es una medida correcta. Si al ensanchar la columna se ve estrecho, subir a ~70 `ch` como mucho |
| Ritmo vertical | márgenes heredados sueltos | pasos del sistema (`--mm-e-*`) entre badges → h1 → subtítulo → botones | Consistencia; hoy mezcla valores de Webflow con los nuevos |

Sobre el subtítulo de home (`.subheading-hero`, 25 px, `max-width:650px` = `--mm-medida`): con
una columna de 1080 px puede verse estrecho debajo del h1. Subirlo o dejarlo es **decisión de
diseño**: 650 px es una medida tipográficamente correcta, así que si lo dejas, que sea a
propósito y escrito, no por olvido.

## Plan

| Fase | Qué | Dónde | Riesgo |
|---|---|---|---|
| 1 | Medir el estado actual con los snippets de `R9-HERO-CONTEXTO.md` §3, en home + ciudad larga + ciudad corta | — | ninguno |
| 2 | Badges: quitar `width:80%`, permitir envoltura de pastillas enteras | `home.css` | ninguno fuera de `.mm-hero` |
| 3 | Columna fluida + tamaños con `clamp()` + `text-wrap:balance` en los dos héroes | `home.css`, `hero-zona.css` | mueve píxeles en 56 rutas — esperado |
| 4 | h2 de zona a escala de subtítulo | `hero-zona.css` | mueve píxeles en 55 rutas — esperado |
| 5 | **Re-medir dónde cae el texto y RE-CALIBRAR las paradas del velo** | `home.css`, `hero-zona.css` | 🚨 si se salta, el contraste se rompe en silencio |
| 6 | Re-verificar contraste ≥4,5:1 con canvas sobre el fotograma en vivo, en varios segundos del bucle | — | — |
| 7 | `npm run check:tokens` (PUERTA VERDE) + `check:rutas` + `check:visual` | — | — |
| 8 | Commit acotado por ruta explícita y `git show --stat HEAD` | — | ver `R9-HERO-CONTEXTO.md` §8 |

## Criterios de aceptación

En **home + ciudad de nombre corto (`ocala-florida`) + ciudad de nombre largo
(`palm-beach-gardens-florida`) + las 2 de `where-we-serves/`**, a **1920 / 1440 / 1280 / 991 /
768 / 390**:

- [ ] Titular en 2 líneas. 3 solo si es inevitable en la ciudad más larga, y dicho en el informe.
- [ ] Ninguna badge parte su etiqueta. Si envuelven, envuelven pastillas enteras.
- [ ] El bloque de texto empieza por debajo del 45 % de la altura del héroe.
- [ ] Sin hueco muerto raro a la derecha en 1920.
- [ ] Contraste medido ≥4,5:1 sobre el peor píxel real, **con el número y el método escritos**.
- [ ] Las paradas del velo vuelven a coincidir con la posición nueva del texto.
- [ ] `check:tokens` en PUERTA VERDE.
- [ ] `check:visual` marca las 56 rutas del alcance y **ninguna fuera**.

## Fuera de alcance — se reporta, no se toca

- **Los 14 héroes de `services/*`** (imagen estática, no vídeo). Sufren el mismo problema de
  encaje de texto sobre medio, pero Sebastian acotó este encargo a los de vídeo. Si al medirlos
  confirmas que están igual de mal, **dilo en el informe**: es decisión suya ampliarlo.
- El texto visible. Este encargo es de tamaño y espaciado, no de copy (`00-PRINCIPIOS.md` §2).
- El rojo de `check:texto` por el botón «Project Gallery»: ver `R9-HERO-CONTEXTO.md` §6. No lo
  re-baselinices por tu cuenta.
- `webflow.css`, que es generado.
