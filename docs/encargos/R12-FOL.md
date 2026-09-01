# ENCARGO R12-FOL — /brochures

Eres el chat **FOLLETOS** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en otro
chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-FOL
RUTA       /brochures
POSEES     src/styles/folletos.css   (ya creado y cableado por el director)
PROHIBIDO  todo lo demás. Esto es CSS PURO: el markup solo se toca en la home, y solo el chat HOME.
           Nada de Base.astro, propio.css, disenio/*, scripts/*, contratos.json, baseline/,
           MIGRACION-LOG.md, ni ningún .astro. Y EL TEXTO VISIBLE no se toca.
```
> **Lee antes `docs/encargos/PARTE-02.md`** — modo simultáneo: nueve frentes a la vez.
> Manda sobre este documento. Ahí está por qué no esperas al director para nada, la higiene de
> navegador y el contrato de color del formulario.

## Antes de nada

1. `docs/encargos/00-PRINCIPIOS.md` — manda sobre todo. Se **eleva** Webflow, no se sustituye.
2. `docs/encargos/CRITERIO.md` — con eso te acepto o te rechazo.
3. Invoca **`frontend-design`** antes de escribir una línea, y luego
   **`make-interfaces-feel-better`** para la pasada de detalle.
4. `git status --porcelain`. Ficheros sucios que no son tuyos: **para y pregunta** — en este repo
   conviven varias sesiones y el árbol pasó de 0 a 19 sucios en 5 minutos.


## Objetivo

El catálogo de folletos de los fabricantes con los que trabajan. Es material de venta: quien llega
aquí ya está eligiendo acabados. Hoy es un panel navy de casillas a la izquierda y una rejilla de
dos columnas a la derecha, en una caja de 1000 px.

## Tus selectores, con el alcance ya medido

| Selector | Rutas | |
|---|---|---|
| `.brochures-section-page` · `.section_fs-example` | **1** | la sección |
| `.filter_form` · `.filter_block` · `.filter_content` · `.checkbox_field` · `.checkbox_label` | **1** | el panel de filtros |
| `.cms_list` · `.cms_list-item` · `.cms_list-wrapper` · `.cover-brochure-page` · `.container-large` | **1** | la rejilla |

**Todo exclusivo de `/brochures`.**

## El diagnóstico, medido

```css
.filter_block   { background-color: var(--blue_dark); border-radius: 8px; gap: 1rem }
.checkbox_label { font-size: 12px; margin-right: .25rem }
.checkbox_field { color: var(--white); font-size: 1rem; display: flex }
.cms_list       { grid-template-columns: 1fr 1fr; gap: 1.5rem }
.cms_list-item  { max-width: 40rem }
.container-large{ max-width: 1000px }
.brochures-section-page { color: var(--white); padding: 0 2rem 4rem }
```

| # | Lo medido | Por qué importa |
|---|---|---|
| 1 | **Las 9 etiquetas del filtro van a 12 px** (`.checkbox_label`), dentro de un `.checkbox_field` declarado a 1rem | Son las nueve categorías del catálogo, sobre fondo navy. 12 px es el tamaño de un pie de foto, no de un control |
| 2 | **La rejilla es de 2 columnas fijas** y el contenedor está capado a **1000 px** mientras el resto del sitio respira más | A 1920 sobran ~900 px de pantalla vacía a los lados y las portadas salen enormes. La rejilla no aprovecha nada |
| 3 | `.brochures-section-page { color: var(--white) }` — texto blanco heredado por toda la sección | Sobre fondo claro eso es blanco sobre blanco. Comprueba qué hereda de verdad y con qué contraste |
| 4 | El panel de filtros es una columna navy de altura libre junto a una rejilla que crece | En cuanto hay más de 4 filas, el panel deja un socavón navy o la rejilla se despega. Mide los dos suelos |
| 5 | **Declarada en `DISTINTAS_A_PROPOSITO` solo a 479 px** —el Webflow vivo inyecta Turnstile en el formulario de filtro y suma 16 px que el sitio nuevo no replica a propósito— | En 1920, 1440 y 991 la puerta **sí** compara: ahí no tienes red de excusa |

## Qué se te pide

Que el catálogo se lea como un catálogo y no como una tabla: jerarquía entre portada y título,
una rejilla que respire distinto según el ancho, y un filtro legible y pulsable. **Investiga cómo
presentan catálogos descargables las marcas de materiales premium** y trae dos referencias.

**Entrega dos variantes** en `src/pages/_lab-folletos.astro`, con las portadas reales. Capturas a
1440 y 479. **Para ahí** hasta que Sebastian elija.

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
salida literal**) y tu propio `astro dev --port 4342` con el panel del navegador de Claude.

**No corres:** `npm run build` —sobrescribe el artefacto compartido que mide el director— ·
`git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y dejas de escribir hasta que
te avise. Dos navegadores a la vez **matan** su corrida, no la ralentizan. Mientras no lo oigas,
**trabajas**: no hay que pedir permiso para escribir.

## Informe

```
ENCARGO R12-FOL · ESTADO listo|bloqueado|parcial · FICHEROS ruta:linea
ALCANCE selector | rutas que pinta | el grep que lo produjo
NUMEROS metrica | antes | despues | comando   (incluye 600 px y 767 px: ninguna puerta los ve)
CONTRASTES par de colores | ratio medido    ·    TOQUE control | px medidos a 479
RIESGO A OTRAS  ·  ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.
