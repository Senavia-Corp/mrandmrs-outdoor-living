# ENCARGO R10-LECT — la experiencia de lectura

Eres el chat **PULIDOR-2** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director
que está en otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R10-LECT
RUTAS      las 10 fichas /blogs/*  +  /blogs-tips  +  los 3 /articles/*   (14 rutas)
POSEES     src/styles/lectura.css   (ya creado y cableado por el director)
PROHIBIDO  todo lo demás. En especial Base.astro, propio.css, home.css, proyectos.css,
           blog.css —¡NO es tuyo, ver abajo!—, disenio/*, scripts/*, contratos.json,
           baseline/, MIGRACION-LOG.md, CUALQUIER .astro —esto es CSS puro—
           y EL TEXTO VISIBLE.
```

## Antes de nada, en este orden

0. **Lee `docs/encargos/00-PRINCIPIOS.md`.** Manda sobre este fichero. En una linea: se
   **eleva** la base de Webflow, no se sustituye.
1. Lee `~/Sites/CLAUDE.md` — tabla de enrutado de skills y las 7 reglas duras del final.
2. Lee `PROMPT-REDISENO.md` §1, §3, §5 y §6 de este repo. Es el contrato.
3. **Invoca `frontend-design`** — esto es un rediseño — y después
   **`make-interfaces-feel-better`** para la pasada de detalle.
4. `git status --porcelain`. Si hay ficheros sucios que no son tuyos, **para y pregunta**:
   conviven hasta 3 chats editando y el árbol pasó de 0 a 19 sucios en 5 minutos.

## Objetivo

La experiencia de **lectura**. Diez guías largas sobre construir piscinas en Florida — permisos,
plazos, costes — que es exactamente lo que busca alguien antes de pedir presupuesto, y hoy se
leen como un volcado de Webflow: medida de línea sin control, jerarquía plana, ritmo vertical
inexistente. Que se lean como un artículo de una publicación seria.

Los 3 de `/articles/` son legales (privacidad, términos, accesibilidad): ahí el objetivo es
legibilidad y respeto, no lucimiento.

## Tus selectores, con el alcance ya medido por el director

| Selector | Rutas | |
|---|---|---|
| `.blog-section` | **10** | las fichas de blog |
| `.articles-section` | **1** | `/blogs-tips` |
| `.article-body` | **3** | los legales |

### ⚠️ La trampa es la tuya, y ya casi cuela

`blog-section` como **subcadena** casa **87** ficheros del build, porque `blog-section-page` la
contiene — y esa es **otra sección**, que vive en 63 rutas y **la posee otro chat** (`blog.css`,
ya rediseñada). Como **clase exacta**, `.blog-section` son 10. Verifícalo tú antes de escribir:

```bash
grep -rlo 'class="blog-section"' .vercel/output/static --include='*.html' | wc -l
```

**El build de las 115 páginas ya existe** en `.vercel/output/static` — grepéalo, no lo
reconstruyas.

**Fuera de tu lote. No lo toques:** `.hero-project` → **20 rutas: tus 10 fichas de blog Y las 10
de `/project/`**. Otro chat trabaja en `/project/` ahora mismo. Es de un encargo posterior.
También `.hero-section` (18) · `.cta-footer` (102) · `.code` · `.footer`.

## Reglas de la capa (las mide `check:tokens`)

- Cero `!important`. Cero `@layer`: `webflow.css` son 167 KB **sin capa**, y cualquier regla sin
  capa gana a toda regla con capa. Tu fichero gana por **orden de carga**.
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. **Token que falte, me lo
  pides** — `disenio/` es del director.
- **Todo selector cuelga de `.blog-section`, `.articles-section` o `.article-body`.**
- `min-width` 480 / 768 / 992, jamás mezclado con los `max-width` de Webflow.
- Nunca `animation-fill-mode: forwards`. Ningún `opacity: 0` fuera de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: ni estado ni texto de cuerpo.
- Cada par de colores nuevo lleva **su ratio medido al lado**. En texto largo el mínimo real no
  es 4,5:1, es lo que se lee cómodo diez minutos seguidos.

## Lo que no se puede romper

- **El texto.** `check:texto` compara `innerText` al 100 % sin tolerancia y no se re-baseliniza
  nunca. Es lo que te da permiso de rediseñar.
- **`text-transform: capitalize` NO es inerte en este sitio.** El marcado dice `What do we do!`
  y el baseline dice `What Do We Do!`. Tocarlo — o «limpiarlo» — mueve el texto de 114 páginas.
- Nada de `::first-letter` ni `::first-line` que dependa de un salto que el build pueda mover, y
  nada de `content:` con texto: `innerText` lo ignora, pero el usuario no.

## Qué corres tú, y qué no

**Corres:** `astro dev --port 4328` (tu puerto) y el panel de navegador de Claude.

**No corres:** `npm run build` — sobrescribe el artefacto compartido que mide el director — ·
`git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

**Cuando el director diga «VENTANA DE PUERTAS»:** cierra el panel del navegador y deja de
escribir. Dos navegadores a la vez **matan** su corrida, no la ralentizan.

Y una que parece de cortesía y no lo es: **`lectura.css` se importa en las 115 páginas**, así que
escribir en él mientras esperas turno publica tu trabajo a medias en el build del siguiente que
construya. Fuera de tu ventana, el trabajo preparado vive en un borrador aparte.

## Informe

```
ENCARGO         R10-LECT
ESTADO          listo | bloqueado | parcial
FICHEROS        ruta:linea
ALCANCE         cada selector | rutas que pinta | el grep que lo produjo
NUMEROS         metrica | antes | despues | comando
                (incluye medida de linea en `ch` a 1440 y a 479, y ritmo vertical)
CONTRASTES      cada par nuevo, con su ratio medido
RIESGO A OTRAS  que otras rutas puede haber movido esto, y por que
ABIERTO         lo que queda y de quien depende
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.
