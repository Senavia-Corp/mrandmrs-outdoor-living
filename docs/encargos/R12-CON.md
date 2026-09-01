# ENCARGO R12-CON — /contact-us

Eres el chat **CONTACTO** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en otro
chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-CON
RUTA       /contact-us
POSEES     src/styles/contacto.css   (ya creado y cableado por el director)
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

La página de contacto: columna izquierda con datos y CTA, columna derecha con el formulario sobre
un panel de degradado. Es uno de los **dos** formularios de lead del sitio.

## Tus selectores, con el alcance ya medido

| Selector | Rutas | |
|---|---|---|
| `.form-section` · `.form-div` · `.box-info-contact` · `.header-box-info` · `.phone-wrapper` | **1** | tuyos |
| `.radio-button` · `.radio-button-label` | **1** | tuyos |
| **`.form`** — el panel del degradado | **1** | tuyo. Aquí vive `linear-gradient(#1cadeb, #1d4bbf)`, la causa del 2,55:1 |

**Lo que NO es tuyo aunque salga en tu página:** `.checkbox-field`, `.checkbox-label-3`,
`.success-message-form`, `.text-block-7`, `.link-4`, `.ikonik-t882o` y **`.text-field`** (los campos)
salen **también en `/request-estimated`** y los posee el chat **ESTIMACION** (`estimacion.css`). Los dos formularios
de lead tienen que hablar el mismo idioma: si los tocáis los dos, salen dos casillas distintas y
dos mensajes de éxito distintos. Tampoco son tuyos `.location` (17 rutas, chat PULIDOR-2),
`.testimonial-section` (82) ni `.cta-footer` (102).

## El diagnóstico, medido — es el peor de las seis páginas

El panel del formulario es `linear-gradient(#1cadeb → #1d4bbf)` y las etiquetas y el texto que
escribe el usuario van en **blanco**:

| Par | Ratio | Veredicto |
|---|---|---|
| **Blanco sobre el cian de arriba `#1cadeb`** | **2,55 : 1** | 🔴 no llega ni al 3:1 de texto grande |
| Blanco sobre el azul de abajo `#1d4bbf` | 7,47 : 1 | ✅ |
| `.text-field { border: 1px solid #fff }` sobre el cian | **2,55 : 1** | 🔴 WCAG 1.4.11 pide 3:1 para el límite de un campo. **`.text-field` es del chat ESTIMACION** (2 rutas): tú arreglas el FONDO, él el campo. Coordinaos por el director |
| Navy `#001c63` sobre ese cian | 6,11 : 1 | ✅ la salida está a mano |

**La mitad de arriba del formulario es ilegible**: ahí caen «First name», «Last name» y «Email».

Y además:

```css
.radio-button   { width: 18px; height: 18px }     /* 🔴 WCAG 2.2 AA pide ≥24×24 */
.text-field     { color: #fff; background-color: #fff0 }   /* fondo transparente */
.submit-button  { background-color: #3cd3ad }     /* 🔴 verde menta: default de Webflow */
.submit-button:hover { background-color: #6c33da }/* 🔴 morado: ídem */
.header-box-info{ max-width: 450px }  /* → 350px y centrado en móvil */
```

El verde menta y el morado son los colores por defecto de la plantilla de Webflow. En una marca
navy y oro no pintan nada, y el par de la casa —navy sobre oro— ya está medido a **8,40:1**.

## 🚨 La puerta no te vigila

`/contact-us` está declarada en `DISTINTAS_A_PROPOSITO` **a los cuatro anchos** (Turnstile no
pinta fuera del dominio registrado y la página sale ~16 px más corta que su baseline).
`declarada()` se evalúa antes y al margen del contrato: **hoy esta página no se compara en ningún
ancho, así que verde no prueba nada.** Resolverlo es del director. Tú compensas con capturas y
medidas propias, a 1920/1440/991/479 **y además a 600 y 767**.

## Qué se te pide

Que la página se lea como el sitio de una empresa seria y que el formulario se pueda rellenar sin
esfuerzo: contraste real medido, campos con límite visible, radios y casillas pulsables con el
pulgar (**≥44 px**), foco visible, y una columna izquierda que sostenga la derecha en vez de
quedarse corta. **Investiga cómo resuelven la página de contacto los estudios y contratistas que
convierten bien** y trae dos referencias.

**Entrega dos variantes** en `src/pages/_lab-contacto.astro`, con el texto y el formulario reales.
Capturas a 1440 y 479. **Para ahí** hasta que Sebastian elija.

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
salida literal**) y tu propio `astro dev --port 4344` con el panel del navegador de Claude.

**No corres:** `npm run build` —sobrescribe el artefacto compartido que mide el director— ·
`git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y dejas de escribir hasta que
te avise. Dos navegadores a la vez **matan** su corrida, no la ralentizan. Mientras no lo oigas,
**trabajas**: no hay que pedir permiso para escribir.

## Informe

```
ENCARGO R12-CON · ESTADO listo|bloqueado|parcial · FICHEROS ruta:linea
ALCANCE selector | rutas que pinta | el grep que lo produjo
NUMEROS metrica | antes | despues | comando   (incluye 600 px y 767 px: ninguna puerta los ve)
CONTRASTES par de colores | ratio medido    ·    TOQUE control | px medidos a 479
RIESGO A OTRAS  ·  ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.

## Un dato que te sobrepasa, y por eso no es tuyo

El **pie de página lleva el MISMO degradado** que tu panel:

```
.footer { background-image: linear-gradient(#1cadeb, #1d4bbf) }   -> 113 rutas
```

Si el pie tiene texto claro en su mitad superior, arrastra tu mismo 2,55:1 en **113 páginas**.
`.footer` no tiene dueño todavía. **No lo toques**: mídelo si te cruzas con él y dilo en
`ABIERTO` con el ratio. El director decide si abre encargo.
