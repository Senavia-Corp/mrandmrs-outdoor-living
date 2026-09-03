# R13-COLOR — la línea gráfica de color, unificada sobre el navy del logo

> **Encargo del director**, 3-sep-2026. Lo pidió Sebastian mirando la home: «arreglar toda la
> tonalidad de colores y línea gráfica del sitio usando el color del logo como principal, que se
> vea uniforme desde el menú hasta el pie».
>
> Manda `00-PRINCIPIOS.md`. Esto **no es un rediseño**: es la disciplina de color del §5 aplicada
> al sitio entero, que hasta hoy solo la cumplían las hojas que pasaron por el Programa R.

## §0 · El color de la marca, medido

```
$ grep -ohiE 'fill="[^"]*"' public/images/site/logo-mr-mr.svg | sort | uniq -c
  19 fill="#001C63"
   1 fill="white"
   1 fill="none"
```

**El logo es un solo navy: `#001C63`.** En HSL, **H 223 · S 100 · L 19,4**. Ya es `--mm-navy` en
`disenio/tokens.css` y `--blue_dark` en Webflow, con 71 usos. No se elige color de marca: **ya
estaba elegido**. Lo que falta es que el resto del sitio viva en su eje.

## §1 · El diagnóstico

```
$ grep -rhoE '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' src/ | tr 'A-F' 'a-f' | sort -u | wc -l
     138
```

138 hex distintos. Repartidos: **125** en `src/styles`, **26** en `src/pages`, **17** en
`src/components`, **0** en `src/layouts` y `src/data`.

El desorden no es «muchos colores»: es **muchos HUES**. Medido con la fórmula de luminancia
relativa de WCAG 2.x y conversión a HSL:

| Color | H | S | L | /blanco | Veredicto |
|---|---|---|---|---|---|
| `#001c63` | **223** | 100 | 19 | 15,60 | el logo |
| `#1d4bbf` | **223** | 74 | 43 | 7,47 | mismo eje. El único azul que pasa AA como texto |
| `#0d1c3f` | 222 | **66** | 15 | 16,73 | eje correcto, **saturación rota**. Se ve apagado al lado del logo |
| `#1f77ea` | **214** | 83 | 52 | 4,30 | fuera de eje |
| `#3898ec` | **208** | 83 | 57 | 3,06 | fuera de eje — es el azul **por defecto de Webflow** |
| `#1cadeb` | **198** | 84 | 52 | 2,55 | el cian del agua |
| `#31c2f6` | **196** | 92 | 58 | 2,06 | segundo cian |
| `#f4b248` `#d99933` `#edb660` | 37 | — | — | 1,86 / 2,45 / 1,83 | la familia del oro |
| `#c9a84c` | **44** | 54 | 54 | 2,29 | oro fuera de familia |

**Cuatro cianes en cuatro hues distintos (196, 198, 208, 214)**, más `#5acef8`, `#0cace5`,
`#54abd9`, `#3185ca`, `#3b79c3`, `#1173b5`. Eso es lo que hace que el sitio no «case» consigo
mismo aunque cada sección esté bien por separado.

### 🚨 El foco que el CSS no puede arreglar: el tinte está en las IMÁGENES

**Corrección al diagnóstico inicial.** La banda CTA que Sebastian tenía en pantalla **no tiene
degradado**: `.cta-footer` declara `background-color:#15699900` —alfa `00`, transparente— sobre
`background-image:url(/images/site/cta-footer-image.webp)`. El azul que se ve está **horneado en
la imagen**, así que ninguna regla CSS lo alcanza.

Y no es un caso aislado. Censadas las 838 imágenes de `public/images` y separadas las que llevan
tinte de un solo tono (que no son fotos naturales), aparece el mismo mal que en el CSS: **el
mismo gesto de diseño ejecutado a cuatro tonos distintos.**

| activo | tono | alcance |
|---|---|---|
| `design2*.webp` | H220 | `.whatsetus-section`, 80 rutas |
| `cta-footer-image*.webp` | **H208** | `.cta-footer` 103 + `.cta-page-section` 12 = **112 rutas** |
| `testimonial-image*.webp` | H209 | `.testimonial-section` |
| `animateddivs-image*.webp` | H209 | `.trusted-section` 80, `.gallery` 24, y 3 más |
| `design3*.webp` | H198 | **se queda**: H198 es el tono exacto de `--mm-cian` |
| `favicon.png` · `webclip.png` | **H216** | 116 y 115 rutas |
| `checked.png` | **H260** | morado puro (`#6c33da`), 2 rutas |

**El favicon no era el color de la marca.** Su dominante es `#091f40` (H216, L14) y el logo es
`#001C63` (H223, L19,4) — el icono de la pestaña no coincidía con el logo en 116 rutas.

**Lo que NO se toca, y es la mitad del trabajo:** logos de terceros (Sunbrella H14, Alumawood
H205, NPT H213, Zodiac H227), folletos de fabricante, y las fotos reales de obra de
`projects/`, `residentials/` e `images/`. Retonar la marca de otro es falsificarla; retonar la
obra real del cliente es peor.

### Los tres focos concretos

1. **Las 14 fichas de `src/pages/services/`** llevan una paleta paralela entera: `#0d1c3f` +
   `#c9a84c`. Ni el navy ni el oro de la casa.
2. **La banda CTA** —la que Sebastian tenía en pantalla— es
   `linear-gradient(#1cadeb,#1d4bbf)` y existe en **cuatro variantes**: las dos direcciones, una
   a `90deg` y una cuarta con otros dos cianes (`#5acef8`,`#0cace5`). `.cta-footer` se pinta en
   **102 rutas**.
3. **Impureza dentro del propio sistema**: `--mm-azul-tenue: #e9f1fd` está en **H216**, heredado
   de `--blue-50-2` de Webflow, y `--mm-gris: #ececec` es un gris **neutro** (S0) rodeado de
   grises que son navy rebajado (H220-224, S24-27).

## §2 · La rampa

Hue **223 bloqueado**. Anclada en dos colores que el sitio **ya usa**: el 500 es el único azul de
la casa que pasa AA como texto, el 900 es el logo. Ratios medidos, no estimados.

| token | hex | /blanco | /navy | papel |
|---|---|---|---|---|
| `--mm-azul-50` | `#f4f6fa` | 1,08 | 14,42 | fondo de sección claro |
| `--mm-azul-100` | `#e4e9f6` | 1,21 | 12,84 | fondo alterno — **sustituye `#e9f1fd`** |
| `--mm-azul-200` | `#c5d2f1` | 1,51 | 10,30 | borde decorativo |
| `--mm-azul-300` | `#86a2ea` | 2,51 | 6,22 | relleno sobre navy. **NO texto** |
| `--mm-azul-400` | `#3767e1` | **5,01** ✅AA | 3,11 | texto secundario, borde de control |
| `--mm-azul-500` | `#1d4bbf` | **7,47** ✅AA | 2,09 | enlace en texto corrido *(ya existe)* |
| `--mm-azul-600` | `#0e37a0` | 10,13 | 1,54 | hover de enlace |
| `--mm-azul-700` | `#062984` | 12,67 | 1,23 | superficie oscura levantada |
| `--mm-azul-800` | `#002175` | 14,24 | 1,10 | superficie oscura |
| `--mm-azul-900` | `#001c63` | 15,60 | 1,00 | **el logo**. Tinta, nav, pie |
| `--mm-azul-950` | `#00113d` | 18,30 | 1,17 | fondo hondo |

**El cian sobrevive, reducido a dos.** Es una marca de piscinas: el agua es un gesto legítimo, y
198 contra 223 lee como «misma familia, más clara», no como otro color. Quedan `--mm-cian`
(`#1cadeb`) y `--mm-cian-claro` (`#31c2f6`), que ya son tokens. **Mueren** `#3898ec`, `#1f77ea`,
`#5acef8`, `#0cace5`, `#54abd9`, `#3185ca`, `#3b79c3`, `#1173b5`.

**El oro se queda en tres**, los que ya son tokens. Mueren `#c9a84c` y `#f4aa2a`.

**Hues del sitio al terminar: dos de marca (223 y 37) más un cian de acento (198). Nada más.**

Sigue en pie el §5 de PRINCIPIOS y no se rediscute: **el oro nunca marca estado** (1,86:1 sobre
blanco), y **el cian tampoco es texto sobre blanco** (2,55:1). Ambos viven en fondos con navy
encima.

## §3 · Las dos clases de cambio — y por qué importa la distinción

| | qué es | ¿mueve píxeles? | ¿toca `baseline/`? |
|---|---|---|---|
| **A · refactor** | `#001c63` → `var(--mm-navy)`. El valor resuelto es idéntico | **no** | no |
| **B · retonado** | `#0d1c3f` → `#001c63`. El valor **cambia** | **sí** | sí |

Casi todo el volumen es **A** y es gratis. El **B** es lo que Sebastian pidió ver, y es lo que
obliga a re-baselinizar. Separarlas permite que si algo sale mal, se sepa cuál de las dos lo hizo.

## §4 · La deuda que me encuentro, y que NO es mía

El ancla correcta es **el último commit que escribió `baseline/shots`** —que es contra lo que
compara `check:visual`—, no el último que tocó `baseline/` entero. Ese fue un cambio del cascarón
y no aprobó ni una captura:

```
$ git log -1 --format='%h %ci %s' -- baseline/shots
bd871b2  2026-08-31 23:20:14 -0400  R11: re-baseline lote 5/5 — los 26 de pool-builders/ que faltaban
$ git rev-list --count bd871b2..HEAD                     # TODOS los commits
      61
$ git log --oneline bd871b2..HEAD -- src/styles src/components src/layouts src/pages | wc -l
      38
$ git log --oneline bd871b2..HEAD -- src/styles src/components src/layouts src/pages public | wc -l
      39                                                  # <- la cifra buena
```

Las tres son correctas y miden cosas distintas. **39** es la que importa: son los commits que
tocan algo que pinta. El 61 incluye `docs/`, `scripts/` y `_source/`, que no mueven un píxel; y
dejar fuera `public/` era un error mío, porque **ahí viven las imágenes** y este encargo retinta
23 de ellas.

**`check:visual` ya está rojo antes de que yo escriba una línea**: **39 commits de render** desde la
última captura aprobada. El frente del menú midió la corrida completa y le dio **395
comparaciones rojas**, repartidas en 212 `/pool-builders/*`, 56 `/services/*`, 40 `/blogs/*`,
36 `/country/*` y 12 `/articles/*`.

🚨 **Consecuencia que hay que decir en voz alta:** re-baselinizar ahora **no aprueba mi color —
aprueba los 39 commits de golpe**. Es literalmente el fallo que avisa la cabecera de
`aprobar-diseno.mjs`: *«si la captura nueva lleva un defecto dentro, el defecto se convierte en la
verdad y la puerta lo protege»*. Sebastian autorizó el re-baseline pensando en el cambio de color.
**No se toca `baseline/` hasta que sepa que está aprobando 39 encargos y no uno.**

## §5 · Propiedad de escritura en este encargo

**Míos:** `src/styles/disenio/tokens.css` · `src/styles/*.css` · `scripts/check-tokens.mjs` ·
`disenio/contratos.json` · `baseline/` · `MIGRACION-LOG.md` · los commits y el despliegue.

**Que NO se tocan, y por qué:**

- `src/components/Nav.astro`, `Footer.astro`, `scripts/build-shell.mjs` — del frente del menú.
- **`npm run shell` NO se ejecuta.** Está arreglado en el árbol pero sin correr **a propósito**:
  hace `fetch` al sitio vivo y arrastraría al cascarón cualquier deriva que Webflow haya tenido
  desde la migración. Quien lo corra «para ver», rompe la migración.
- `src/styles/webflow.css` y `fuentes.css` — derivados de `build-css.mjs`.
- Las 62 páginas con `// DERIVADO` — derivadas de `build-paginas.mjs`.

## §6 · Las fases

| | qué | paralelizable | puertas |
|---|---|---|---|
| **F1** | Ampliar `tokens.css`: los 11 pasos con su ratio medido, `--mm-degradado-cta`, y limpiar `--mm-azul-tenue` y `--mm-gris` | no — dueño único | `check:tokens` |
| **F2** | Migrar la capa de autor: ~22 hojas de `src/styles` | **sí**, una por hoja (disjuntas) | `check:tokens` |
| **F3** | Bloques `<style>` de componentes y las 9 páginas no derivadas | **sí** | `check:tokens` |
| **F4** | Las 62 derivadas, por la vía que decida el panel de jueces | según la vía | `check:texto` |
| **F5** | Cerrar el agujero de `check:tokens` — ver la corrección de abajo, el diagnóstico de este encargo era **falso** | no | ella misma |
| **F6** | Verificación: estáticas completas, navegador acotado, atribución A vs B | **NO** — dos Chromium a la vez se matan | todas |
| **F7** | Re-baseline por lotes con commit entre lote y lote, y despliegue | no | — |

## §6bis · Dos correcciones al propio encargo, y las dos importan

**1. El agujero de `check:tokens` no estaba donde dije.** Escribí que la puerta «perdona los
literales de color de los bloques `<style>`». Falso: **las 14 fichas de servicio tienen CERO
bloques `<style>`.** La paleta paralela entró por un `<script>` en línea que pinta con
`element.style.background = '#0D1C3F'`, y `check-tokens.mjs` **no miraba los `<script>` en
absoluto**. Era el único sitio del proyecto donde el color podía pudrirse sin que nada lo viera
*y* sin que la capa de diseño pudiera corregirlo: contra un `style` en línea no gana ninguna
hoja sin `!important`, que §5 prohíbe.

Lo levantó el panel de jueces que evaluó las tres vías, no yo. Es exactamente el patrón de §8:
la ausencia de señal leída como señal buena.

**2. `scripts/lib/captura.mjs` estaba acoplado al color, y sin decirlo.** Su línea 175 fijaba el
carrusel de pasos preguntando `getComputedStyle(c).backgroundColor === 'rgb(13, 28, 63)'` — o
sea, el `#0D1C3F` que este encargo cambia. Sin tocarla, la sonda deja de casar, el bucle agota
sus 10 reintentos y **las 14 fichas se capturan con el paso mal fijado**. Habría entrado en el
baseline como verdad aprobada. Corregida a `rgb(0, 28, 99)` y con el acoplamiento escrito al
lado, para que el próximo que mueva el color mueva también la sonda.

## §7 · Cómo se verifica

Estáticas (gratis, sin navegador):

```bash
node scripts/check-tokens.mjs
node scripts/check-rutas.mjs && node scripts/check-enlaces.mjs && node scripts/check-seo.mjs
```

De navegador — **jamás barridas sin avisar**, y **nunca dos a la vez**:

```bash
node scripts/check-texto.mjs '/services/'      # el texto NO se toca: tiene que salir 0 movido
node scripts/check-visual.mjs '=/'             # la home. Con comillas: zsh se come =/ suelto
```

**Nunca `/` como filtro**: casa por `includes()`, así que casa las 115 y crees que mides 4.

## §8 · Definición de terminado

- Un solo navy en todo `src/`: `#001c63`, y **solo** dentro de `tokens.css`.
- Cero literales de color fuera de `tokens.css`, verificado por una puerta que **de verdad los
  busca** — hoy no los busca en los `<style>`, y por eso hay una paleta paralela desde hace meses.
- Dos hues de marca más un cian. Cero morado, lima o turquesa.
- Un solo degradado de CTA.
- `check:texto` en **0 movido**: si el texto se mueve, el cambio dejó de ser de color.
- Se dice explícitamente **qué puerta corrió y cuál no**. Una puerta que se salta por falta de
  referencia **falla ABIERTA**: no se cuenta como verde.
- Capturas antes/después de nav, banda CTA, ficha de servicio y pie, a 1920 y 479.
