# ENCARGO R12-BLOG — /blogs-tips

Eres el chat **BLOG-INDICE** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en otro
chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-BLOG
RUTA       /blogs-tips
POSEES     src/styles/blog-indice.css   (ya creado y cableado por el director)
PROHIBIDO  todo lo demás. Esto es CSS PURO: el markup solo se toca en la home, y solo el chat HOME.
           Nada de Base.astro, propio.css, disenio/*, scripts/*, contratos.json, baseline/,
           MIGRACION-LOG.md, ni ningún .astro. Y EL TEXTO VISIBLE no se toca.
```
## Antes de nada

1. `docs/encargos/00-PRINCIPIOS.md` — manda sobre todo. Se **eleva** Webflow, no se sustituye.
2. `docs/encargos/CRITERIO.md` — con eso te acepto o te rechazo.
3. Invoca **`frontend-design`** antes de escribir una línea, y luego
   **`make-interfaces-feel-better`** para la pasada de detalle.
4. `git status --porcelain`. Ficheros sucios que no son tuyos: **para y pregunta** — en este repo
   conviven varias sesiones y el árbol pasó de 0 a 19 sucios en 5 minutos.


## Objetivo

El índice del blog: diez guías largas sobre construir piscinas en Florida —permisos, plazos,
costes— que es exactamente lo que busca alguien **antes** de pedir presupuesto. Es la puerta de
entrada orgánica del sitio.

## Tus selectores, con el alcance ya medido

| Selector | Rutas | |
|---|---|---|
| `.articles-section` | **1** | la sección |
| `.blogs-list` · `.item-blogs` | **1** | la rejilla de tarjetas |

**No confundir con dos vecinos que se parecen y NO son tuyos:** `blog.css` restila
`.blog-section-page` (la banda de blog que sale en **63 rutas**), y `lectura.css` restila
`.blog-section` (las **10 fichas** de `/blogs/*`). `.articles-section` estaba asignada a
`lectura.css` y **se le retiró el 1-sep para dártela a ti**. Un selector, un dueño.

## El diagnóstico, medido

```css
.articles-section { color: var(--blue_dark); padding: 3em 2em }
.blogs-list       { grid-template-columns: 1fr 1fr 1fr; gap: 2rem; align-items: flex-start }
                  /* → 1fr 1fr con gap 1rem → 1fr */
.item-blogs       { width: 100%; height: 100% }
```

| # | Lo medido | Por qué importa |
|---|---|---|
| 1 | **`.item-blogs` no tiene ni una regla de aspecto**: ni fondo, ni borde, ni radio, ni sombra. Solo `width/height:100%` | La tarjeta que ves hoy la pinta otra clase heredada. Averigua cuál antes de escribir, o vas a pelearte con la cascada sin saber contra quién |
| 2 | **`align-items: flex-start` en la rejilla** | Cada tarjeta toma su altura natural, así que la fila queda dentada cuando los títulos ocupan distinto número de líneas. Se ve en el sitio vivo: un título de 2 líneas y otro de 3 |
| 3 | **`gap: 2rem` a tres columnas pero `1rem` a dos** | El aire se estrecha justo cuando las tarjetas se hacen más grandes. Va al revés |
| 4 | `padding: 3em 2em` — **`em` sobre un cuerpo de 14 px** | 3em son 42 px, no 48. El aire de sección no debe depender del tamaño del cuerpo |

## Qué se te pide — y aquí Sebastian pidió expresamente investigación

**Estudia cómo resuelven la rejilla y la maqueta los blogs profesionales que de verdad se leen.**
No copies: extrae el principio. Lo que hay que mirar y traer razonado:

- **La jerarquía de la rejilla.** ¿Todas las tarjetas iguales, o una destacada arriba? Con 10
  entradas, tres iguales por fila es la opción más pobre de las disponibles.
- **La proporción imagen/texto** de la tarjeta y el encuadre de la foto.
- **La medida de línea del extracto** y cuántas líneas se dejan antes de cortar.
- **Qué metadatos se enseñan** (categoría, tiempo de lectura, fecha) — ojo: **no puedes añadir
  texto**, así que si el dato no está hoy en la página, no existe para ti. Dilo en `ABIERTO` si
  crees que hace falta.
- **El botón «Read More»**: hoy es un rectángulo oro. Mira si los que convierten usan botón o
  tratan la tarjeta entera como área pulsable.

Trae **tres referencias** con lo que te llevas de cada una y por qué encaja en una marca navy y
oro que vende obra cara en Florida.

**Entrega dos variantes** en `src/pages/_lab-blog-indice.astro`, con las 10 entradas reales —los
títulos y extractos de verdad, que son de longitudes muy distintas y ahí es donde se rompen las
rejillas—. Capturas a 1440 y 479. **Para ahí** hasta que Sebastian elija.

## Fuera de tu lote — cromo compartido, no lo toques

`.hero-section` (**8 rutas**, del chat HERO-INDICE) · `.cta-footer` (102, del chat HOME) ·
`.footer` (113) · `.code` (114). Cada uno tiene o tendrá su dueño; dos chats tocando el mismo
selector dan dos resultados distintos en el mismo sitio.

## Cómo se mide el alcance — antes de cada bloque, y va en el informe

```bash
grep -rlo 'class="TU-CLASE"' .vercel/output/static --include='*.html' | wc -l
```

El build de las 115 páginas **ya existe** — grepéalo, no lo reconstruyas. Trampa medida:
`blog-section` como subcadena casa 87 ficheros y como clase exacta son 10.

## Lo que no se puede romper

- **El texto.** `check:texto` compara `innerText` al 100 % sin tolerancia y no se re-baseliniza
  nunca. Es justo lo que te da permiso de rediseñar el markup… salvo que aquí es **solo CSS**.
- **`text-transform: capitalize` no es inerte**: cambia `innerText` y hay una puerta al 100 %.
- Trampas de CSS que ya costaron tiempo aquí: `aspect-ratio` **con la altura ya definida calcula
  el ANCHO** y desborda la columna; y la altura de una fila de tarjetas la fija la más larga —el
  hueco no se quita centrando, se baja el `clamp` de la larga.

## Qué corres tú

`npm run check:tokens` (estática, sin navegador, <1 s: **córrela antes de cada informe y pega su
salida literal**) y tu propio `astro dev --port 4343` con el panel del navegador de Claude.

**No corres:** `npm run build` —sobrescribe el artefacto compartido que mide el director— ·
`git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y dejas de escribir hasta que
te avise. Dos navegadores a la vez **matan** su corrida, no la ralentizan. Mientras no lo oigas,
**trabajas**: no hay que pedir permiso para escribir.

## Informe

```
ENCARGO R12-BLOG · ESTADO listo|bloqueado|parcial · FICHEROS ruta:linea
ALCANCE selector | rutas que pinta | el grep que lo produjo
NUMEROS metrica | antes | despues | comando   (incluye 600 px y 767 px: ninguna puerta los ve)
CONTRASTES par de colores | ratio medido    ·    TOQUE control | px medidos a 479
RIESGO A OTRAS  ·  ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.
