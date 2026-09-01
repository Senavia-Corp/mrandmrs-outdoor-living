# ENCARGO R12-GAL — /gallery

Eres el chat **GALERIA** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en otro
chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-GAL
RUTA       /gallery
POSEES     src/styles/galeria.css   (ya creado y cableado por el director)
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

La rejilla de obra terminada. Es donde alguien que se está planteando gastar $80.000 va a decidir
si esta empresa construye lo que él quiere. Hoy es una rejilla de plantilla con un desplegable
gris encima.

## Tus selectores, con el alcance ya medido

| Selector | Rutas | |
|---|---|---|
| `.gallery-page` | **1** | la sección entera, tuya |
| `.gallery-filters` · `.gallery-filter-form` · `.service-filter` | **1** | el filtro |
| `.cms-list-pictures` · `.cms-item-pictures` · `.gallery-picture` · `.block-pictures` | **1** | la rejilla |

**Todo exclusivo de `/gallery`.** No hay riesgo de mover otra ruta, así que aquí puedes ser
ambicioso con la maqueta.

## El diagnóstico, medido

```css
.cms-list-pictures { grid-template-columns: 1fr 1fr 1fr; gap: 16px }   /* → 1fr 1fr → 1fr */
.gallery-picture   { width: 100%; height: 250px; border-radius: 15px }
.gallery-filters   { background-color: #eee; border-radius: 10px; padding: .5rem }
.gallery-page      { padding: 0 2em 6em }
```

| # | Lo medido | Por qué importa |
|---|---|---|
| 1 | **`height: 250px` fijo sobre columnas `1fr`.** A 1920 cada columna mide ~600 px → recorte ≈ 2,4:1; a 991 con 2 columnas ~470 px → 1,9:1; a 479 a una columna ~415 px → 1,66:1 | El encuadre de cada foto **cambia solo** con el ancho de la ventana. Una piscina bien compuesta a 1920 sale decapitada a 479. Se declara `aspect-ratio`, no altura fija — y con la altura aún puesta, `aspect-ratio` calcula el ANCHO: hay que neutralizarla |
| 2 | **`gap: 16px` fijo** en los tres tramos | A 1920 son 16 px entre fotos de 600; a 479, 16 px entre fotos de 415. El aire no escala con la pieza |
| 3 | **Cero estados.** No hay `:hover` ni `:focus-visible` sobre `.gallery-picture` | Si las fotos son enlaces, no hay ni una señal de que se puedan pulsar. Compruébalo y dilo |
| 4 | El filtro es un `<select>` nativo sobre un pill `#eee` de esquinas 10 px, a todo el ancho | Es el único control de la página y parece un formulario de 2010. Su objetivo táctil y su foco se miden |

## Qué se te pide

Que la rejilla se lea como el portafolio de un estudio: encuadre estable, ritmo, y un filtro que
parezca parte del diseño y no un resto del exportador. **Investiga cómo presentan su trabajo los
estudios de arquitectura y paisajismo que cobran caro** y trae dos referencias con lo que te llevas.

**Entrega dos variantes** en `src/pages/_lab-galeria.astro` (guion bajo: Astro no la enruta), con
las fotos reales. Capturas a 1440 y 479. **Para ahí** hasta que Sebastian elija.

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
salida literal**) y tu propio `astro dev --port 4341` con el panel del navegador de Claude.

**No corres:** `npm run build` —sobrescribe el artefacto compartido que mide el director— ·
`git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y dejas de escribir hasta que
te avise. Dos navegadores a la vez **matan** su corrida, no la ralentizan. Mientras no lo oigas,
**trabajas**: no hay que pedir permiso para escribir.

## Informe

```
ENCARGO R12-GAL · ESTADO listo|bloqueado|parcial · FICHEROS ruta:linea
ALCANCE selector | rutas que pinta | el grep que lo produjo
NUMEROS metrica | antes | despues | comando   (incluye 600 px y 767 px: ninguna puerta los ve)
CONTRASTES par de colores | ratio medido    ·    TOQUE control | px medidos a 479
RIESGO A OTRAS  ·  ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.
