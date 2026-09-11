# Encargo — título visible en `/pool-cost-estimator` (D8)

Trabajas en `~/Sites/mrandmrs-outdoor-living/`. Lee antes `CLAUDE.md` (reglas de la casa) y la
decisión **D7** en `MIGRACION-LOG.md:192`. Este encargo la corrige.

## Qué hay hoy

La página **ya tiene un `<h1>`**, pero oculto: `src/components/widgets/Estimador.astro:143`,
clase `pe-sr` (recorte de lector de pantalla, `src/styles/estimador.css:91`). D7 lo dejó oculto
para no mover un píxel en una ruta con contrato de paridad, y dejó escrito: *«si se quiere
visible, es un cambio de diseño y va con su re-aprobación visual»*.

**Sebastian lo quiere visible.** Eso es la D8. Lo que ve hoy el visitante al llegar es «Step 1
of 7»: ni una palabra que diga qué es la página, ni para Google ni para la persona.

## El encargo

1. Pintar el `<h1>` **y una línea de introducción** encima del estimador, solo en
   `/pool-cost-estimator`. `/pool-investment-estimator` (la página desnuda, `suelta`) conserva
   su `<h1>` oculto tal cual.
2. **Móvil primero. Es lo más importante del encargo** (sección propia abajo).
3. Aspecto del sitio, no uno nuevo. Activa **`frontend-design`** antes del markup (tabla de
   `~/Sites/CLAUDE.md`), pero con el sistema existente: tokens de
   `src/styles/disenio/tokens.css`, y como precedente nativo el `h1.ty-titulo` de
   `src/pages/thank-you.astro:197` (y su ajuste móvil en `:333`, `--mm-paso-6`). Color navy como
   los títulos de las tarjetas. Nada de fuentes nuevas.

### Texto propuesto (Sebastian lo aprueba; no lo cambies sin decirlo)

- **H1:** `Custom Inground Pool Cost Estimator` — el mismo que ya lleva el `<h1>` oculto y la
  palabra clave del `<title>`. Mantenerlo evita tocar su declaración en `check-texto`.
- **Intro (un `<p>`):** `Answer 7 quick questions to see what your custom pool in Florida
  could cost.` La propuesta inicial («…an estimated investment range for your custom pool and
  outdoor living project in Florida.») ocupaba 3 líneas en móvil y a 375×667 dejaba la primera
  opción en 683 px, bajo el pliegue. Con la corta termina en 662 px. Elegida por Sebastian el
  11-sep (D8).

Si propones otro texto, pon los dos lado a lado y pregunta.

## Móvil: los criterios, medidos, no mirados

Mide sobre `.vercel/output/static`, **nunca** sobre `astro dev`. Anchos: **320, 375, 390, 430,
479, 768, 991, 1024 y 1440**.

- **Nada se sale.** `document.documentElement.scrollWidth === clientWidth` en los 9 anchos.
- **La primera opción sigue sin scroll.** A **375×667** (iPhone SE) y **390×844**, el borde
  inferior de la primera `.pe-opcion` («New Custom Pool») queda por encima del pliegue. Si no
  cabe, se reduce el título; no se esconde.
- **Google indexa la versión móvil.** H1 e intro existen en el HTML a todos los anchos: nada de
  `display:none` bajo un breakpoint para ganar altura.
- **Tamaño en `rem`/tokens, no en `em`.** Por debajo de 992, `#pool-estimator` baja la base a
  14px (`estimador.css:65`): un tamaño en `em` se encoge solo.
- `text-wrap: balance` en el H1 y `pretty` en la intro. A 320, el H1 en **3 líneas como mucho**
  y sin palabra huérfana.
- Alineado con el borde de las tarjetas (mismo contenedor `.pe-ancho`, `estimador.css:100`), no
  flotando aparte. En escritorio ocupa las dos columnas, encima de `.pe-rejilla`, y **no rompe**
  el panel `sticky` de precio (`estimador.css:105`).
- Contraste AA. Sin salto de maquetación: va horneado en el HTML, sin JS.

Entrega capturas a **375 y 1440** para la re-aprobación visual de Sebastian que exige D7.

## Dónde se toca, y las trampas

- **`src/pages/pool-cost-estimator.astro` es DERIVADO** (línea 2): lo regenera
  `scripts/build-paginas.mjs`. No se edita a mano. El cambio va en `Estimador.astro`, visible
  cuando `!suelta`.
- **Reescribe el comentario de `Estimador.astro:126-142`.** Dice que el `<h1>` va oculto a
  propósito; dejarlo así es dejar un comentario que miente.
- **No metas los estilos en `estimador.css`.** `scripts/check-tokens.mjs:23` lo excluye de la
  puerta con una condición: *el día que alguien lo edite, se mueve a la capa y se limpia* (1
  `!important` y 38 literales de color). Ponlos en la capa de diseño de `src/styles/` con
  tokens. Si decides tocarlo igualmente, asume esa limpieza entera.
- **Jerarquía.** Con un H1 visible se salta de `h1` a `h3` (los títulos de paso son
  `div.pe-titulo`). Convertirlos en `<h2>` es **opcional** y tiene trampa: el CSS base de
  Webflow estiliza los encabezados en esta ruta (el blindaje está en `estimador.css:68-87`). Si
  lo haces, blinda y mide; si no, anótalo en «Mejoras candidatas NO aplicadas».

## Las puertas

- `check:texto` — `scripts/check-texto.mjs:331`, entrada de `LINEAS_ANADIDAS` para
  `/pool-cost-estimator`: añade la línea de la intro y cambia el motivo de D7 a D8.
- `check:visual` — `scripts/check-visual.mjs:94`: la ruta ya está declarada por D3; **añade D8
  al motivo**. No bajes umbrales ni toques el baseline de otras rutas.
- Corre `npm run check:tokens`, `check:seo` y `check:estimador` (la calculadora no cambia, así
  que tiene que seguir verde), y `node scripts/check-visual.mjs pool-cost-estimator`.
- Una puerta que no corrió no es verde: si alguna se salta, dilo.

## Decisiones que NO tomas tú

- El texto final del H1 y de la intro.
- Tocar `<title>`, meta description o JSON-LD: fuera de alcance.
- **Push.** Un commit en `main` sí; subirlo no. El push despliega a producción: pregunta antes.

## Hecho es

1. H1 e intro visibles en `/pool-cost-estimator`, y ocultos como antes en
   `/pool-investment-estimator`.
2. Los criterios de móvil medidos en los 9 anchos, con la salida del comando pegada.
3. Entrada **D8** en `MIGRACION-LOG.md`, con los números medidos.
4. Puertas verdes, con las dos declaraciones actualizadas a D8.
5. Capturas a 375 y 1440 entregadas para aprobar.
