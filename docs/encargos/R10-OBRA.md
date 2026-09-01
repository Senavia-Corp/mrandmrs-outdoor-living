# ENCARGO R10-OBRA — la obra terminada de la home

Eres el chat **PULIDOR-1** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en
otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

> **Lee antes `docs/encargos/PARTE-02.md`** — modo simultáneo: nueve frentes a la vez. Manda
> sobre este documento.

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGOS   R10-OBRA  y  R10-AD   (dos, en este orden)
POSEES     src/styles/obra.css          -> .projects-section        66 rutas
           src/styles/antes-despues.css -> .before-after-section    15 rutas
PROHIBIDO  todo lo demás. Esto es CSS PURO. En especial `.hero-section` (8, chat HERO-INDICE),
           `.cta-footer` (102, chat HOME), `._3d-section`/`.location`/`.social-media`
           (chat PULIDOR-2), `.gallery-page`, `.form-section`, `.appointment-section`.
           Y EL TEXTO VISIBLE no se toca.
```

## Antes de nada

1. `docs/encargos/PARTE-02.md` y `docs/encargos/00-PRINCIPIOS.md` — se **eleva** Webflow, no se
   sustituye.
2. `docs/encargos/CRITERIO.md` — **tu sección está ahí con los umbrales medidos**. Con eso te
   acepto o te rechazo. Respóndelos uno a uno con su número.
3. Invoca **`frontend-design`** y luego **`make-interfaces-feel-better`**.
4. `git status --porcelain`. Sucios que no son tuyos: **para y pregunta**.

## Objetivo

`.projects-section` es la prueba social visual del negocio: si algo tiene que parecer caro en este
sitio, es la rejilla de obra terminada. Sale en **66 rutas**, así que lo que hagas eleva medio sitio.

`.before-after-section` es el deslizador antes/después. **Lleva JS propio y un tirador
arrastrable**: cambiar su caja cambia las coordenadas del arrastre. Verifica que sigue funcionando
**con ratón y con dedo** antes de dar el informe por bueno.

## Lo que ya está medido y te espera en CRITERIO.md

Tu sección trae, entre otros: el recorte de la foto llega al **43,5 % a 992** y la relación salta
**1,637 entre 991 y 992**; el tirador mide **42×42** (hace falta ≥44) y su icono da **1,86:1**
—blanco sobre oro—; `touch-action: none` **congela el scroll** en media pantalla de móvil; el
tirador va **±8 px por detrás del dedo** porque el JS mide sobre la caja de borde y el `clip-path`
recorta sobre la de relleno —ese `border: 8px solid #fff` es un término de la fórmula, no
decoración—; y **el 55,3 % de los píxeles** bajo `.before-after-intro` está por debajo de 4,5:1.

⚠️ Y uno que ahorra una tarde: **`.fs-slider-projects_image` tiene 0 usos en las 66 rutas.**
Comprueba que tu selector pinta antes de pulirlo.

## Entrega

Dos variantes en `src/pages/_lab-obra.astro` (guion bajo: Astro no la enruta), con las fotos
reales. Capturas a 1440 y 479. **Se las enseñas a Sebastian en este chat** y él elige; el informe
me lo mandas a mí cuando la elegida ya esté en tu CSS.

## Qué corres tú

`npm run check:tokens` (estática, <1 s, **antes de cada informe y pegas la salida**) y
`astro dev --port 4327` — **tu puerto**. Levántalo para mirar y bájalo al terminar.

**No corres:** `npm run build` · `git commit` · `check:texto|visual|ix2|cascaron` · `baseline/`.
Con **«VENTANA DE PUERTAS»** cierras panel, bajas el dev y paras.

## Informe

```
ENCARGO R10-OBRA (o R10-AD) · ESTADO · FICHEROS ruta:linea
ALCANCE selector | rutas | grep   ·   NUMEROS metrica | antes | despues | comando
CONTRASTES par | ratio medido    ·   TOQUE control | px a 479
RIESGO A OTRAS  (66 y 15 rutas: di cuáles hay que recapturar)   ·   ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.**
