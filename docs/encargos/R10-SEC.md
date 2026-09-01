# ENCARGO R10-SEC — render 3D, zona de servicio y feed social

Eres el chat **PULIDOR-2** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en
otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

> **Lee antes `docs/encargos/PARTE-02.md`** — modo simultáneo: nueve frentes a la vez. Manda
> sobre este documento.

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGOS   R10-3D · R10-UBI · R10-SOC   (tres, en este orden)
POSEES     src/styles/render3d.css  -> ._3d-section     65 rutas
           src/styles/ubicacion.css -> .location        17 rutas
           src/styles/social.css    -> .social-media    79 rutas
PROHIBIDO  todo lo demás. Esto es CSS PURO. En especial `.hero-section` (8, HERO-INDICE),
           `.cta-footer` (102, HOME), `.projects-section`/`.before-after-section` (PULIDOR-1),
           `.form-section`, `.appointment-section`, `.gallery-page`.
           Y EL TEXTO VISIBLE no se toca.
```

## Antes de nada

1. `docs/encargos/PARTE-02.md` y `docs/encargos/00-PRINCIPIOS.md` — se **eleva** Webflow.
2. `docs/encargos/CRITERIO.md` — **tus dos secciones están ahí con los umbrales medidos**.
   Respóndelos uno a uno con su número.
3. Invoca **`frontend-design`** y luego **`make-interfaces-feel-better`**.
4. `git status --porcelain`. Sucios que no son tuyos: **para y pregunta**.

## Objetivo

`._3d-section` (65 rutas) es el argumento de venta del render antes de construir: imagen grande +
texto, y el trabajo está en la relación entre las dos. `.location` (17) es dónde trabajan —North &
South Florida— y para un contratista local eso es **criterio de compra**, no adorno: el visitante
mira si le cubren antes de pedir presupuesto. `.social-media` (79) es el feed de Instagram,
componente propio `FeedInstagram.astro`, no el widget de Elfsight.

## Lo que ya está medido y te espera en CRITERIO.md

Entre otros: `.location` declara **0 px de padding inferior** con 192-204 px de costurón arriba; el
canal izquierdo da **0 px** en `.location` y 36/28 px en `._3d-section` porque usa `em`; el vídeo
se recorta entre el **13,5 % y el 25 %** según el ancho; las dos tarjetas de cobertura dan hoy
**4,06:1 y 4,37:1**, y —esto es lo que decide tu trabajo— **copiar el patrón de la casa las
EMPEORA**: el navy al 50 % de `.trusted-section` las deja en 3,34:1 y multiplica por 15 el área
ilegible; hace falta navy ≥62 %. Y a 600 y 767 px hay **147-167 px de aire muerto por tarjeta**,
en una banda que ninguna puerta fotografía.

⚠️ Dos que ahorran una tarde: **`.block-item-country` no existe en ninguna de las 115 páginas**, y
**el feed tiene 0 nodos `.mm-ig`** en las 115 construidas —puedes entregar `social.css` entero con
las once puertas verdes sin que se haya pintado nunca—. Para el feed, adjunta capturas **con
contenido** (datos reales o `datosDemo`) en tres rutas de familias distintas.

⚠️ Y la cascada: una regla a 0-1-0 en `social.css` la ignora en silencio el `<style>` del
componente, que carga **después** con `[data-astro-cid-*]`. Necesitas ≥0-3-0, y lo transcribes en
el informe. Cero `!important`.

## Entrega

Dos variantes por sección en `src/pages/_lab-secciones.astro` (guion bajo: Astro no la enruta).
Capturas a 1440 y 479. **Se las enseñas a Sebastian en este chat**; el informe me lo mandas a mí
—**uno por encargo**, no los tres juntos— cuando la elegida ya esté en tu CSS.

## Qué corres tú

`npm run check:tokens` (estática, <1 s, **antes de cada informe y pegas la salida**) y
`astro dev --port 4328` — **tu puerto**. Levántalo para mirar y bájalo al terminar.

**No corres:** `npm run build` · `git commit` · `check:texto|visual|ix2|cascaron` · `baseline/`.
Con **«VENTANA DE PUERTAS»** cierras panel, bajas el dev y paras.

## Informe

```
ENCARGO R10-3D | R10-UBI | R10-SOC · ESTADO · FICHEROS ruta:linea
ALCANCE selector | rutas | grep   ·   NUMEROS metrica | antes | despues | comando
CONTRASTES par | ratio medido    ·   TOQUE control | px a 479
RIESGO A OTRAS  (65, 17 y 79 rutas)   ·   ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.**
