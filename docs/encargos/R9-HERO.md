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

1. Lee `~/Sites/CLAUDE.md` — tabla de enrutado de skills y las 7 reglas duras del final.
2. Lee `PROMPT-REDISENO.md` §1, §3, §5 y §6 de este repo. Es el contrato y manda sobre todo.
3. **Invoca la skill `frontend-design` ANTES de escribir una línea de markup o CSS.** Es
   obligatoria para dirección de arte. Apóyate en `emil-design-eng` si dudas de una decisión
   de fondo, y en `make-interfaces-feel-better` para la pasada de detalle del paso 2.
4. `git status --porcelain`. Si hay ficheros sucios que no son tuyos, **para y pregunta**:
   en este repo conviven hasta 3 chats editando y el árbol pasó de 0 a 19 sucios en 5 minutos.

## Objetivo

El héroe de la portada — `section.hero-glass-section-page`, la constante `S_HERO` de
`index.astro`. Es lo primero que ve alguien que va a gastar $80.000 en una piscina en Florida,
y hoy es un héroe de plantilla de Webflow. Que parezca de un estudio.

## Entrega en dos pasos. El paso 2 no empieza hasta que Sebastian elija

**PASO 1 — tres direcciones, sin tocar la home.**
Móntalas en una página de trabajo que NO entra en el sitio: `src/pages/_lab-heroe.astro`
(guion bajo: Astro no la enruta). Con el **texto real** del héroe actual copiado literal, para
que se juzgue con el contenido de verdad y no con lorem. Cada dirección con su nombre, su razón
en dos líneas y capturas a 1440 y 479. **Las tres genuinamente distintas** — no la misma con
otro color. Entrégalas y **para**.

**PASO 2 — solo con la dirección elegida:** llevarla a `index.astro` + `home.css`.

## Reglas de la capa (las mide `check:tokens`)

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
