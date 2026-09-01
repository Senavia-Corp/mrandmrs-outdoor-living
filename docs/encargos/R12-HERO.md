# ENCARGO R12-HERO — el héroe de las 8 páginas índice

Eres el chat **HERO-INDICE** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un
director en otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-HERO
RUTAS      /gallery · /brochures · /blogs-tips · /contact-us · /projects
           /testimonials · /videos · /industry-solutions            (8 rutas)
POSEES     src/styles/hero-indice.css   (ya creado y cableado)
PROHIBIDO  todo lo demás. Y de tus vecinos, en concreto: `.gallery-page`, `.articles-section`,
           `.brochures-section-page`, `.form-section` (cuatro chats trabajando AHORA), más
           `.cta-footer`, `.footer`, `.location` y `.testimonial-section`.
```

> **Lee antes `docs/encargos/PARTE-02.md`** — modo simultáneo: nueve frentes a la vez.
> Manda sobre este documento. Ahí está por qué no esperas al director para nada, la higiene de
> navegador y el contrato de color del formulario.

## Antes de nada

1. `docs/encargos/00-PRINCIPIOS.md` — manda sobre todo. Se **eleva** Webflow, no se sustituye.
2. `docs/encargos/CRITERIO.md` — con eso te acepto o te rechazo.
3. Invoca **`frontend-design`** y luego **`make-interfaces-feel-better`**.
4. `git status --porcelain`. Ficheros sucios que no son tuyos: **para y pregunta**.

## Por qué esto es UN encargo y no cuatro

`.hero-section` se pinta en **8 rutas con marcado IDÉNTICO** — verificado: 421-452 caracteres y
las mismas cinco clases en las cuatro que estoy repartiendo hoy; **solo cambia el texto**. Si
cada chat de página tocara su propio héroe, tendríamos cuatro héroes distintos en el mismo sitio.
Lo haces tú una vez y suben las ocho.

Es lo primero que ve el visitante en toda página que no es la home.

## El diagnóstico, medido — no lo repitas, arréglalo

Sacado de `src/styles/webflow.css` y del HTML construido:

```css
.hero-section      { margin-top: 85px; padding: 4em 2em 3rem; height: 100%;
                     flex-flow: column; gap: 2rem; display: flex }
.header-hero-page  { max-width: 850px; margin-inline: auto; flex-flow: column }
.heading-hero-page { border-bottom: 1px solid var(--gold); color: var(--blue_dark);
                     padding-bottom: 15px }
.text-block-4      { /* NADA. Cero reglas propias en las 167 KB de webflow.css */ }
```

| # | Lo medido | Por qué importa |
|---|---|---|
| 1 | **El párrafo no tiene ni una regla.** `.text-block-4` hereda del body y nada más: ni medida de línea, ni interlineado, ni color propio | Es la única frase que explica de qué va la página, en 8 páginas, y está sin diseñar |
| 2 | **La regla de oro bajo el h1**, ahora a 1 px. El oro da **1,86:1 sobre blanco** | Es decorativa y casi invisible. Es el mismo detalle de plantilla que ya se quitó del héroe de la home, donde medía 1100 px de ancho |
| 3 | `padding: 4em 2em 3rem` — **mezcla `em` y `rem` en la misma declaración**. Los `em` resuelven contra el cuerpo (14 px), los `rem` contra la raíz | El aire de arriba y el de abajo no son comparables y cambian solos si alguien toca el tamaño del cuerpo |
| 4 | `margin-top: 85px` en número mágico, y `height: 100%` en un flex column sin altura de padre | Los 85 px son la altura del nav `fixed`. Va en token, no en literal suelto |
| 5 | Todo centrado en 850 px, h1 + párrafo, sin nada más | No está mal: está sin decidir. Aquí es donde se nota si hay un estudio detrás |

## Qué se te pide

Elevar esa banda para que las 8 páginas arranquen como un sitio caro. La composición se conserva
—titular, párrafo, centrado— y lo que cambia es cómo está ejecutado: ritmo vertical, escala y
peso del titular, medida de línea y color del párrafo, y qué sustituye a la regla de oro.

**Investiga antes de decidir.** Mira cómo resuelven la cabecera de una página índice los sitios
que cobran caro por diseño; trae dos o tres referencias con lo que te llevas de cada una.

**Entrega dos variantes**, en `src/pages/_lab-hero-indice.astro` (guion bajo: Astro no la enruta),
con el texto REAL de dos rutas distintas —`/gallery` es corto y `/blogs-tips` es largo— para que
se juzgue con el contenido de verdad. Capturas a 1440 y 479. **Para ahí** hasta que Sebastian elija.

## Lo que no se puede romper

- **El texto.** `check:texto` compara `innerText` al 100 % sin tolerancia.
- **`text-transform: capitalize` no es inerte aquí**: cambia `innerText` y hay una puerta al 100 %.
- Tu cambio mueve **8 rutas**. Decláralas en `RIESGO A OTRAS` con el `grep` que lo prueba.

## Qué corres tú

`npm run check:tokens` (estática, <1 s, **córrela antes de cada informe y pega la salida**) y tu
propio `astro dev --port 4340` con el panel del navegador.

**No corres:** `npm run build` · `git commit` · `check:texto|visual|ix2|cascaron` · `baseline/`.
Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y paras. Mientras no lo oigas,
trabajas: no hay que pedir permiso para escribir.

## Informe

```
ENCARGO R12-HERO · ESTADO · FICHEROS ruta:linea · ALCANCE selector|rutas|grep
NUMEROS metrica|antes|despues|comando · CONTRASTES par|ratio medido
RIESGO A OTRAS · ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.
