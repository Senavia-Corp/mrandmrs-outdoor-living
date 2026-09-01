# ENCARGO R9-HERO — el héroe de la portada

Eres el chat **HOME** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director que
está en otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R9-HERO
RUTA       /   (solo la home)
POSEES     src/pages/index.astro · src/styles/home.css
PROHIBIDO  todo lo demás. En especial Base.astro, propio.css, disenio/*, scripts/*,
           contratos.json, baseline/, MIGRACION-LOG.md, y EL TEXTO VISIBLE.
```

## Antes de nada, en este orden

0. **Lee `docs/encargos/00-PRINCIPIOS.md`.** Manda sobre este fichero. En una linea: se
   **eleva** la base de Webflow, no se sustituye.
1. Lee `~/Sites/CLAUDE.md` — tabla de enrutado de skills y las 7 reglas duras del final.
2. Lee `PROMPT-REDISENO.md` §1, §3, §5 y §6 de este repo. Es el contrato y manda sobre todo.
3. **Invoca la skill `frontend-design` ANTES de escribir una línea de markup o CSS.** Es
   obligatoria para dirección de arte. Apóyate en `emil-design-eng` si dudas de una decisión
   de fondo, y en `make-interfaces-feel-better` para la pasada de detalle del paso 2.
4. `git status --porcelain`. Si hay ficheros sucios que no son tuyos, **para y pregunta**:
   en este repo conviven hasta 3 chats editando y el árbol pasó de 0 a 19 sucios en 5 minutos.

## Objetivo

**Elevar** el héroe de la portada — `section.hero-glass-section-page`, la constante `S_HERO`
de `index.astro`. No rediseñarlo: la composición de Webflow se conserva (vídeo de fondo, fila
de 4 bullets, h1, subtítulo, CTA centrado, banda de logos al pie). Lo que se eleva es el
espaciado, la jerarquía, el scrim, la escala del CTA y los estados.

Es lo primero que ve alguien que va a gastar $80.000 en una piscina en Florida, y su trabajo
es **captar el lead**.

## El diagnóstico ya está hecho — no lo repitas, arréglalo

Medido por el director el 1-sep-2026 sobre `.vercel/output/static` a 1440×900 y 479, con
sondas de `getBoundingClientRect` y `getComputedStyle` y muestreo del vídeo en canvas.
**Estos son tus números de partida.** Cada punto lleva lo que se midió; el «cómo» es tuyo.

| # | Lo medido | Por qué importa para captar lead |
|---|---|---|
| 1 | **El CTA mide 181 × 38,4 px** (`padding: 11,2px 16px`, `font-size: 16px`) dentro de un héroe de 900 px de alto | El único elemento que convierte ocupa el **0,53 %** del héroe. A 479 baja a 162 × 36,4 con texto de 14 px |
| 2 | **El bloque de contenido va de y=281 a y=618: 337 px de 900.** El 63 % del héroe es overlay sobre vídeo | No es respiración, es vacío. El aire tiene que repartirse, no acumularse arriba y abajo |
| 3 | **Las 4 bullets bajan a 7 px de texto a 479** (12 px a 1440, 10 a 991). Cajas de 102 × 26 px | Son las cuatro razones para confiar —Licensed & Insurance, Financing Available, 3D Design, North & South Florida— y en móvil son ilegibles |
| 4 | **El overlay es plano:** `linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4))`. El vídeo bajo el h1 va de luma 22 a 251. Tras el overlay, la zona más clara queda en **151** | Texto blanco sobre luma 151 = **2,92 : 1**. No llega ni a los 3:1 de texto grande. Un scrim plano ensucia el vídeo entero y aun así no protege el texto |
| 5 | El subtítulo lleva `text-shadow: 1px 1px 4px #000` a 479 y `1px 1px 3px` a 991, y **ninguno a 1440** | Es el parche de alguien que notó el punto 4 y lo tapó en móvil. La sombra es el síntoma; el scrim es la causa |
| 6 | **El h1 lleva `border-bottom: 2px solid` oro a lo ancho de sus 1100 px** | Es el detalle más de plantilla del héroe. Una regla de 1100 px bajo un titular centrado |
| 7 | **Todo centrado**: `text-align:center` + `align-items:center` + `justify-content:space-between`. h1 de 69 caracteres en 2 líneas, subtítulo de 117 en 2 líneas de ~58 caracteres | Dos bloques centrados de anchura parecida y peso parecido compiten. El subtítulo tiene **más palabras que el titular** |
| 8 | **El vídeo del héroe dura 40 s y del segundo ~14 al ~22 es un solar en obra** — excavadora, encofrado, tierra. Verificado con hoja de contactos de 9 fotogramas: 7 son obra terminada preciosa, 2 son la obra abierta | Uno de cada cinco visitantes ve un solar destrozado detrás del titular. Es el fallo más caro y **no es de CSS** |
| 9 | El CTA es azul `#3898EC` con texto navy: **5,10 : 1**, correcto — pero es el **azul de Webflow por defecto**, no un color de la marca. Y el nav lleva otro «Get A Free Estimate» idéntico justo encima | Dos CTA iguales compitiendo, y el del héroe no usa el oro de la casa sobre navy (8,40 : 1), que es el par que la marca ya tiene medido |

**El punto 8 es del director, no tuyo:** el vídeo se recorta o se reordena, y eso lo hago yo.
Tú diseña contando con que el fondo será obra terminada.

## Entrega en dos pasos. El paso 2 no empieza hasta que Sebastian elija

**PASO 1 — tres variantes de la MISMA estructura.**

No son tres héroes distintos: es **el héroe de Webflow, elevado de tres maneras**. Misma
composición, mismos elementos, mismo orden, mismo texto. Lo que cambia entre variantes es el
tratamiento — por ejemplo el tipo de scrim y de dónde nace, cómo se resuelve la jerarquía
entre h1 y subtítulo, y cómo gana peso el CTA y qué hace la fila de bullets.

Móntalas en `src/pages/_lab-heroe.astro` (guion bajo: Astro no la enruta), con el **texto real**
copiado literal. Cada variante con su nombre, su razón en dos líneas, **los números del cuadro
de arriba que mueve**, y capturas a 1440 y 479. Entrégalas y **para**.

**PASO 2 — solo con la variante elegida:** llevarla a `index.astro` + `home.css`.

## Reglas de la capa (las mide `check:tokens` — **córrela tú**)

- Cero `!important`. Cero `@layer`: `webflow.css` son 167 KB **sin capa**, y cualquier regla sin
  capa gana a toda regla con capa. Tú ganas por **orden de carga**, que ya lo tienes.
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. **Token que te falte, me
  lo pides** — `disenio/` es del director, tú no lo escribes.
- `min-width` 480 / 768 / 992, jamás mezclado con los `max-width` de Webflow.
- Nunca `animation-fill-mode: forwards`: deja un `transform: matrix()` en vez de `none`, y eso
  crea contexto de apilamiento que rompe descendientes `fixed`. Ningún `opacity: 0` que no
  cuelgue de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos de CTA con
  texto navy (8,40:1). Está medido, no se rediscute.
- Todo par de colores que introduzcas lleva **su ratio medido escrito al lado**.

## Lo que no se puede romper

- **El texto.** Ni una palabra, ni el orden. `check:texto` compara `innerText` al 100 % sin
  tolerancia y **no se re-baseliniza nunca**. Eso es lo que te da permiso de reescribir el
  markup que quieras: un `div` envolvente o un `aria-label` no lo mueven, una palabra sí.
- **Los `data-w-id`.** Son las claves de `src/data/reveals.json`, y `check:ix2` cuenta huérfanas
  con un tope fijo de 14. Si reescribes un elemento, **el `data-w-id` viaja con él**.
- **La trampa horneada en `index.astro`:** `astro.config.mjs` no declara `compressHTML`, y el
  defecto de Astro no es `true` sino `"jsx"`. Un espacio entre dos etiquetas **en la misma
  línea** sobrevive al build y mueve el texto. Nunca pongas uno.
- **`npm run paginas` sobrescribe `index.astro`** y borra tu trabajo en silencio. No lo corras.

## Qué corres tú, y qué no

**Corres:** `astro dev --port 4326` (tu puerto, solo tuyo) y el panel de navegador de Claude
para mirar tu trabajo.

**No corres:** `npm run build` · `npm run paginas` · `git commit` · `check:texto|visual|ix2|cascaron`
· nada dentro de `baseline/`.

**Cuando el director diga «VENTANA DE PUERTAS»:** cierra el panel del navegador y deja de
escribir hasta que te avise. Dos navegadores a la vez **matan** su corrida, no la ralentizan
(`Target page, context or browser has been closed`), y ya pasó en la ruta 22 de 115.

Y una que parece de cortesía y no lo es: **los ficheros que se importan siempre solo se escriben
durante tu ventana.** `Base.astro` carga `home.css` en las 115 páginas, así que escribir en él
mientras esperas turno publica tu trabajo a medias en el build del siguiente que construya.

## Informe (al terminar cada paso)

```
ENCARGO         R9-HERO paso N
ESTADO          listo | bloqueado | parcial
FICHEROS        ruta:linea, uno por linea
NUMEROS         metrica | antes | despues | el comando exacto que lo produjo
CONTRASTES      cada par nuevo, con su ratio medido
RIESGO A OTRAS  que otras rutas puede haber movido esto, y por que
ABIERTO         lo que queda y de quien depende
```

`RIESGO A OTRAS` es el campo que sostiene el sistema: el director necesita saber qué
reverificar sin barrer las 115.

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la
resumas.
