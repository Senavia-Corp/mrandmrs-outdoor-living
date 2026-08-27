# Migración Mr & Mrs Outdoor Living — Webflow → Astro 5 + Sanity + Vercel

> Pega este fichero completo como primer mensaje de una sesión de Claude Code abierta en
> `~/Sites/mrandmrs-outdoor-living/`. La carpeta ya está preparada y los insumos generados.

---

## 0. CONTRATO

Migras `https://mrandmrsoutdoorliving.com` de Webflow a Astro 5 + Sanity + Vercel.
**El sitio nuevo debe quedar EXACTAMENTE igual al actual**: mismo diseño, mismo texto,
mismas rutas, **mismas animaciones**, mismos metadatos.

- ❌ NO rediseñes. NO cambies espaciados, colores, tipografías, jerarquía ni componentes.
- ❌ NO reescribas copy. NO corrijas las erratas del origen (`Rendeing`, `Metadescripcion`,
  `Procesos`, `Imagen Intro`, `pool-sceen`) — están mal EN EL ORIGEN y así se quedan.
- ❌ NO añadas páginas, secciones, CTAs ni schema markup que hoy no existan.
- ✅ Cambian solo: hosting, CMS, pipeline de assets y el HTML/CSS de salida.

**La fuente de verdad es el sitio EN VIVO**, no el export ni los CSV. Si difieren, gana el vivo.

Si crees que algo del original está mal hecho: anótalo en la tabla **«Mejoras candidatas NO
aplicadas»** de `MIGRACION-LOG.md` y **replícalo tal cual**. Las mejoras son una conversación
posterior con el cliente, no parte de esta migración.

---

## 1. CÓMO TRABAJAS — la disciplina de bitácora

Esto no es una lista de tareas: es un cuaderno de ingeniería. **12 fases, cada una con una
puerta (gate) que se cumple o no se cumple.**

**Al cerrar cada fase, escribes una entrada en `MIGRACION-LOG.md`** usando la plantilla que
ya está ahí. La entrada lleva: objetivo, qué se hizo, **números medidos**, **la evidencia
con el comando y su salida real pegada**, resultado del gate, desviaciones, rarezas del
original replicadas a propósito, y qué queda abierto.

Reglas duras del proceso:

1. **Un número sin el comando que lo produjo no es un número, es una opinión.** Pega la salida.
2. **No avanzas de fase con el gate en rojo.** Arréglalo o dime qué te bloquea. No lo dejes
   «para después»: en este tipo de migración, lo que se salta se descubre en producción.
3. **Una puerta tiene que haber estado en ROJO alguna vez para probar algo.** Si escribes un
   check y pasa a la primera, rómpelo a propósito y comprueba que falla. Un check que nunca
   pudo fallar no verifica nada — es exactamente lo que pasó en Pergola Plus con
   `comprobar-imagenes.mjs`, que leía del disco local y por eso jamás podía ver el fallo real.
4. **Un commit por fase**, con el número de fase en el mensaje. Rama `main`.
5. **Al terminar una fase**: qué hiciste, el gate con números, qué sigue. No un informe por fichero.
6. **Dos fallos independientes pueden dar el mismo síntoma.** No des una fase por cerrada
   porque arreglaste la primera causa que encontraste (el menú móvil de AMS necesitó dos
   arreglos distintos; con solo el primero, el cliente volvió a reportarlo).

---

## 2. LA CARPETA (ya montada)

```
~/Sites/mrandmrs-outdoor-living/
├── PROMPT.md                      este fichero
├── MIGRACION-LOG.md               la bitácora — se escribe al cerrar cada fase
├── README.md  .gitignore
├── _source/                       insumos CONGELADOS, no se editan a mano
│   ├── webflow-export/            export original (138 MB, gitignored)
│   ├── cms/                       los 16 CSV con nombre legible
│   ├── animations/
│   │   ├── ix2.json               payload de interacciones extraído de webflow.js
│   │   ├── ix2-catalog.md         12 animaciones, 168 eventos, con duración y easing
│   │   └── ix2-targets.csv        data-w-id → animación → breakpoints → páginas
│   ├── live/sitemap.txt           el sitemap real (113 URLs)
│   ├── routes.csv                 las 115 rutas → colección → plantilla → ¿en sitemap?
│   └── assets-inventory.csv       659 assets únicos, deduplicados por URL, con su alt
├── baseline/  html/ text/ seo.json shots/     se llena en la Fase 1
├── scripts/   extract-ix2.mjs  build-inventory.mjs   + las puertas que escribas
├── src/ public/ studio/ docs/
```

Regenerar los insumos: `node scripts/extract-ix2.mjs && node scripts/build-inventory.mjs`

### Lo que ya está medido — no lo vuelvas a averiguar

| Hecho | Valor |
|---|---|
| Páginas públicas | **115** (el sitemap solo lista 113) |
| Fuera del sitemap pero vivas (200) | `/pool-investment-estimator`, `/where-we-serves/custom-pool-builders-north-florida` |
| Colecciones con página propia | 7 de 16 |
| Colecciones que dan 404 | `industries`, `commercial-services`, `brochures/{slug}` — son **solo datos** |
| Assets únicos | **659** (de 877 referencias; 44 URLs se repiten) |
| Assets con **hash encadenado** `{nuevo}_{viejo}_` | **193** |
| **Colisiones de nombre** tras limpiar hashes | **22** |
| **AVIF** (Sanity NO los procesa al subir) | **177** |
| Interacciones | **168 eventos**, 12 animaciones, **109 elementos** con `data-w-id` |
| Elementos que arrancan en `opacity:0` | **14** |
| Breakpoints | 479 / 767 / 991 / 1280 / 1440 / 1920 |

---

## 3. STACK

**Astro 5 (`output: 'static'`) + `@astrojs/vercel` + Sanity v4 (Studio embebido en `/studio`).**

Por qué Astro y no Next.js: 115 páginas de marketing, cero lógica de aplicación. Astro las
hornea en build y sirve HTML puro. Es el stack de Pergola Plus, AB Aluminum y AMS.
*Si prefieres Next.js App Router, dilo AHORA; no lo cambies a mitad.*

---

# FASE 0 — Cuentas, identidades y repo

**Va primero por una razón concreta: en las tres migraciones anteriores, cruzar cuentas costó
tiempo y dejó proyectos huérfanos.** En AB Aluminum hay dos proyectos de Sanity llamados igual
y uno se creó por error en la cuenta corporativa. En AMS, `vercel link --scope` creó un proyecto
duplicado vacío y un deploy aterrizó ahí.

**No escribas una línea de código hasta cerrar esta fase.**

1. **Pregúntame** y anota en la bitácora, antes de crear nada:
   - ¿El Sanity va en la cuenta **del cliente** o en la corporativa de Senavia? (regla de las
     migraciones anteriores: **el contenido del cliente va en la cuenta del cliente**).
   - ¿Qué equipo de Vercel? ¿Plan Hobby o Pro?
   - ¿Repo de GitHub público o privado?
2. **Dos avisos que hay que resolver ahora, no en la Fase 11:**
   - **Hobby prohíbe el uso comercial.** Un sitio de cliente en producción sobre Hobby es
     riesgo real de suspensión.
   - **Hobby NO despliega desde un repo privado de una organización de GitHub.** Mensaje
     literal de Vercel: *"Cannot deploy from a private GitHub organization repository on the
     Hobby plan."* En AMS esto provocó tres flip-flops público↔privado en un solo día.
3. El token de Sanity tiene que ser de rol **Editor**, no Viewer — un Viewer **falla el import
   en silencio a mitad**. Si además hace falta crear un dataset (p. ej. `leads` privado), el
   rol Editor tampoco basta: hace falta **Developer** (`sanity.project.datasets/create`).
4. Secretos en `.env` gitignorado. **Nunca en la bitácora, nunca en memoria.** Rotar al entregar.
5. `git init`, primer commit con la carpeta ya preparada.

**GATE 0** — En la bitácora: projectId + dataset de Sanity, equipo + plan de Vercel, repo y su
visibilidad, y el rol del token verificado con una escritura real de prueba (no con un `whoami`).

---

# FASE 1 — Baseline congelado

Sin esto no hay manera de demostrar «quedó exactamente igual». Es la fase más importante
y la que más tienta saltarse.

1. Descarga el **HTML renderizado de las 115 rutas** de `_source/routes.csv` → `baseline/html/{slug}.html`.
2. **Capturas de página completa en 4 anchos** — 1920, 1440, 991, 479 → `baseline/shots/{ancho}/{slug}.png`.
3. `baseline/seo.json` por URL: `<title>`, `meta description`, todos los `og:*` y `twitter:*`,
   `<link rel=canonical>`, los `<h1>` (y cuántos hay), y todos los bloques `application/ld+json`.
4. `baseline/text/{slug}.txt`: `document.body.innerText` normalizado (espacios colapsados, un nodo por línea).
5. Guarda `robots.txt` original.

Deja el script como `scripts/capture-baseline.mjs` para poder recapturar.

> ### ⚠️ Trampa: la pestaña sin foco deja las animaciones en `opacity: 0`
> Un navegador automatizado en pestaña oculta reporta `viewport 0x0`, no dispara
> `IntersectionObserver` y **captura el sitio con todos los reveals de Webflow todavía
> invisibles**. Tu baseline saldría en blanco por secciones y no te darías cuenta.
> Da foco real a la pestaña, haz scroll hasta el final, espera a que terminen las animaciones
> (≥1200 ms tras el último scroll) y solo entonces captura.
> **Comprobación obligatoria:** ningún elemento con `data-w-id` puede tener `opacity` computada
> `0` en el momento de la captura. Si alguno lo tiene, la captura no vale.

> ### ⚠️ Trampa: el sitemap miente
> Ya está resuelto aquí (115 vs 113) y `routes.csv` lo refleja. Pero si barres el sitio otra
> vez, **no salgas del sitemap**: en AMS eran 52 en el sitemap y 54 servidas, y un barrido
> desde el sitemap dio un falso «todo limpio».

**GATE 1** — 115 HTML + 460 capturas + `seo.json` con 115 entradas + 0 elementos en `opacity:0`
en las capturas. Pega los conteos reales.

---

# FASE 2 — Assets 100 % locales con nombre y formato SEO

Requisito duro del cliente: **cero referencias a `cdn.prod.website-files.com` al terminar.**
Urgente además porque el CDN de Webflow ya devuelve **403 permanente** en algunos assets de
proyectos anteriores: la ventana para depender de él se está cerrando.

`_source/assets-inventory.csv` ya trae los 659 assets deduplicados **por URL**, con su `alt`
resuelto. Parte de ahí.

> ### ⚠️ La trampa que costó una revisión entera en Pergola Plus: el manifiesto no determinista
> Si encolas **una tarea por referencia** en vez de una por URL, la misma imagen sale con `alt`
> o sin él según qué petición llegue antes: dos ejecuciones idénticas dan resultados distintos.
> En Pergola Plus fueron 42 imágenes con `alt` a cara o cruz. **No rompe nada visible** — la
> página renderiza igual con `alt=""` — así que se habría descubierto ya subido a Sanity.
> `build-inventory.mjs` ya funde por URL y hace ganar a la referencia que trae `alt`.
> **No cambies eso.** Aquí hay **44 URLs referenciadas 2+ veces**.

### 2.1 Descarga y nombres

1. Descarga los 659 + los 174 locales del export + los 2 de `MISSING.txt` (esos, del sitio vivo).
2. **Hashes encadenados: 193 assets los tienen.** Webflow antepone un hash nuevo al re-subir
   (`{nuevo}_{viejo}_nombre.ext`) y a veces **codifica el nombre dos veces** (`%2520`).
   Quita todos los prefijos `^[0-9a-f]{24}_` en bucle y decodifica dos veces. Ya lo hace
   `nombreFinal()` en `build-inventory.mjs`.
3. **22 colisiones de nombre.** Dos URLs distintas caen en el mismo nombre final. Resolución:
   - Si el `sha256` coincide → **es el mismo fichero**, deduplica y apunta ambas referencias ahí.
   - Si no coincide → sufija con el contexto de uso (colección + slug), **nunca** con `-1`, `-2`.
4. Nombres poco descriptivos (`adobe-express---file-3`, `artboard-9`) → renómbralos por su
   contexto: `{coleccion}-{slug-item}-{campo}-{n}.ext`.
5. `sha256` de todo → deduplica.

### 2.2 Organización

```
public/images/site/            logo, favicon, webclip, iconos, decorativos del chrome
public/images/{coleccion}/{slug-item}/…
public/videos/                 los 3 vídeos + pósters
public/brochures/              los 54 PDF
```

### 2.3 Formatos y marcado

- AVIF + WebP con `<picture>`, original como fallback.
- **Todo `<img>` con `width` y `height` medidos del fichero.** No los inventes.
- `loading="lazy"` donde Webflow lo tiene; **nunca** en el LCP de cada página.
- Vídeos: usa las versiones comprimidas (`*_mp4.mp4`, `*_webm.webm`), **nunca** los originales
  de 25 MB. `preload="none"` + `poster`.
- **No recomprimas ni recortes.** Cualquier cambio de píxeles es un cambio de diseño.

> ### ⚠️ `aspect-ratio` con la altura ya definida deriva el ANCHO
> El atributo `height` es una *pista de presentación*: si ninguna regla de autor declara
> `height`, gana el atributo, y con la altura fija `aspect-ratio` calcula el ancho y desborda
> la columna. En Pergola Plus salieron fotos a 1406 px de alto en producción y perfectas en
> `npm run dev`. **Declara las dos dimensiones o ninguna**; con `aspect-ratio`, añade `height: auto`.

> ### ⚠️ Nunca `rm -rf` sobre una carpeta versionada
> El instalador de assets de Pergola Plus hacía `rm -rf public/images` y se llevó 20 ficheros
> que no salen del export y que nadie podía regenerar. **Escribe encima, no borres el destino.**

**GATE 2**
- `grep -rE "website-files\.com|uploads-ssl\.webflow\.com" src/ public/` → **0**
- 0 filas del inventario sin fichero local · 0 colisiones sin resolver
- El manifiesto es **determinista**: córrelo dos veces y `diff` de los dos manifiestos = vacío.
  *(Este es el gate que no existía en Pergola Plus.)*

---

# FASE 3 — Sanity: esquemas + import

Un `documentType` por colección. Las 9 que no tienen página propia también son documentos
(se referencian) para que el cliente pueda editarlas.

- Campos en **camelCase inglés**; el label original del CSV va en la `description` del campo
  para que el editor lo reconozca.
- `slug` con `source: name`, `required().unique()`.
- Rich text → **Portable Text** con `@portabletext/block-tools` + `jsdom`:
  `blogs.Blog`, `articles.Body`, `projects.Services Rendered` (`<ul><li>`) y todo
  `Paragraph *` que contenga tags. Verifica que sobreviven `ul/ol/strong/a/h2-h4`.
- **`_key` de Portable Text DETERMINISTA**: `sha256(slug + ':' + índice)`, nunca aleatoria.
  Así regenerar sin tocar texto es un no-op byte a byte, y si algún día el diff sale enorme,
  eso mismo te avisa de que algo se rompió. (Patrón de AMS.)
- **`_id` derivado del `Item ID` de Webflow** → re-ejecutar el import **actualiza, no duplica**.
  Guarda además `legacyId` oculto para depurar y para poder revertir.
- Referencias **por slug**. Orden topológico de import:
  `categories, categories-brochures → residentials, commercials → subservices, procesos, images, brochures`
  y `where-we-serves → countries → pool-builders`.
- Multirreferencia `; ` → `array of reference` **conservando el orden del CSV** (es orden de
  visualización). Haz `trim()` de cada trozo: sin él quedan slugs con espacio delante que no resuelven.
- `Archived=true` → no importar. `Draft=true` → importar como borrador de Sanity.
- Los 54 PDF → `file` asset.
- Singletons: `siteSettings` (logo, teléfono `+1 352-740-3361`, JSON-LD de Organization, IDs de
  tracking) + un documento por página estática con sus campos SEO.

> ### ⚠️ Sanity NO procesa AVIF al subir — y aquí hay 177
> Es el formato más usado de este sitio. El importador tiene que **convertir avif→jpeg al vuelo**
> antes de subir (`sips` en macOS, o `sharp`). En AB Aluminum fueron 87 y el import moría sin
> explicar por qué.

> ### ⚠️ Sanity corta a 25 peticiones en vuelo
> Semáforo de **8** en el importador. Sanity además deduplica por contenido, así que el conteo
> de assets subidos será menor que el de uploads (en AB Aluminum: 273 uploads → 229 únicos).

> ### ⚠️ El MCP de Sanity no sirve para el import masivo
> `create_documents` solo crea **borradores** y **no sube assets**. El import va por token +
> `@sanity/client`.

**GATE 3**
- GROQ que cuente documentos por tipo y cuadre con `routes.csv` y los CSV: 53 pool-builders,
  14 residentials, 10 projects, 10 blogs, 9 countries, 3 articles, 2 where-we-serves,
  147 images, 113 subservices, 57 brochures, 56 procesos, 20 logos, 10 industries, 3+9 categorías, 3 commercials.
- **0 referencias rotas.**
- Corre el import **dos veces**: el segundo pase no debe crear ni un documento nuevo.

---

# FASE 4 — Cascarón Astro

Layout base, nav, pie, tokens y fuentes. Todavía sin páginas.

**Tokens de marca** — están en `:root` del CSS de Webflow. Cópialos literalmente:

```
--black:#000  --blue_dark:#001c63  --upcolor:#1cadeb  --downcolor:#1d4bbf
--gold/--yellow-1:#f4b248  --yellow-2:#d99933  --gold-light/--yellow-3:#edb660
--grey:#ececec  --blue_light:#1f77ea  --blue-500:#31c2f6  --blue-50-2:#e9f1fd
--_apps---sizes--radius:16px  --padding-header:2rem
```

Hay variables con el nombre corrupto (`--_apps---colors--background\<deleted|variable-…\>`):
**sustitúyelas por su valor resuelto**, no las arrastres.

**Fuentes:** Montserrat, Inter y Playfair Display. Hoy las carga el WebFont Loader de Google.
Sustitúyelo por `@fontsource-variable` **auto-alojado**, mismas familias y pesos, `font-display: swap`.

> ### ⚠️ El nav es `fixed` y mide 85 px
> Lo dice la propia animación: `a-11` mueve el nav a `translateY(-85px)` para esconderlo.
> Cualquier sección escrita a mano empieza en `y=0`, **por detrás del nav**. El padding
> superior va como `calc(85px + <aire>)`, con el motivo escrito al lado. En Pergola Plus se
> midieron 3 px entre el borde del nav y el primer texto por no hacerlo, y a ojo no se ve
> porque el logo es más bajo que su caja.

> ### ⚠️ Los componentes de Webflow están compartidos entre páginas
> Estilar una clase de Webflow a pelo (`.faq_item`, `.wrapper-faq`) rompe páginas que no
> estabas mirando. **Cuelga todo de una clase propia** que ponga tu componente.

> ### ⚠️ `<style>` en Astro es raw-text
> Un comentario mal cerrado dentro de un `<style>` se traga cientos de líneas de CSS **sin dar
> ningún error**. Si desaparece medio diseño, mira ahí antes que en ningún otro sitio.

**GATE 4** — El layout base renderiza; `check:visual` del nav y el pie ≥99 % contra el baseline
en los 4 anchos.

---

# FASE 5 — Páginas estáticas (13 + 1 oculta)

Las 12 de `routes.csv` tipo `estatica`, más `/` y `/pool-investment-estimator`.
Esta última **no está en el export**: captúrala del sitio vivo. La embebe `/pool-cost-estimator`
en un `<iframe>`; decide si la sirves como página propia (lo es) y anótalo.

**GATE 5** — Las 14 en verde en `check:texto` (100 % idéntico) y `check:visual` (≥99 %).

---

# FASE 6 — Páginas de colección (101)

| Ruta | Colección | Plantilla | Nº |
|---|---|---|---|
| `/services/{slug}` | residentials | `detail_services.html` | 14 |
| `/pool-builders/{slug}` | pool-builders | `detail_pool-builders.html` | 53 |
| `/project/{slug}` | projects | `detail_project.html` | 10 |
| `/blogs/{slug}` | blogs | `detail_blogs.html` | 10 |
| `/country/{slug}` | countries | `detail_country.html` | 9 |
| `/articles/{slug}` | articles | `detail_articles.html` | 3 |
| `/where-we-serves/{slug}` | where-we-serves | `detail_where-we-serves.html` | 2 |

**Los singulares y plurales están mezclados a propósito** (`/project/` singular pero `/projects`;
`/country/` singular y no existe `/countries`). Replícalo exacto: cambiarlo rompe SEO y enlaces
externos. Sin barra final. Redirect 301 `/ruta/` → `/ruta` en `vercel.json`.

**NO generes rutas** para `industries`, `commercial-services`, `subservices`, `brochures/{slug}`,
`procesos`, `images`, `logos`, `category`, `categories-brochures`: dan **404** en el sitio real
(verificado). Sus datos se embeben en otras páginas.

**GATE 6** — 115/115 rutas responden 200 sobre `dist/`, y **ninguna ruta extra existe**.

---

# FASE 7 — Animaciones e interacciones ★

**Esta fase es la que separa una migración de una copia muerta.** El sitio tiene
**168 eventos sobre 109 elementos**, y **14 arrancan en `opacity: 0`**: si no reimplementas su
animación, quedan invisibles para siempre y nadie lo nota hasta que el cliente lo ve.

Todo el catálogo está en `_source/animations/ix2-catalog.md` (duraciones, easings, valores) y
en `ix2-targets.csv` (qué `data-w-id`, en qué página, con qué breakpoints).

## 7.1 Las 12 animaciones a reimplementar

| Animación | Eventos | Qué hace |
|---|---|---|
| `growIn` | **77** SCROLL_INTO_VIEW | `opacity 0→1` + `scale .75→1`, **1000 ms `outQuart`** |
| `slideInLeft` | 11 | `opacity 0→1` + `translateX(-100px)→0`, 1000 ms `outQuart` |
| `slideInRight` | 9 | `opacity 0→1` + `translateX(100px)→0`, 1000 ms `outQuart` |
| `slideInBottom` | 9 | `opacity 0→1` + `translateY(100px)→0`, 1000 ms `outQuart` |
| `a-11` Menu Up | 20 PAGE_SCROLL_DOWN | nav → `translateY(-85px)` + `opacity 0`, **500 ms `easeInOut`** |
| `a-12` Menu Down | 20 PAGE_SCROLL_UP | nav → `translateY(0)` + `opacity 1`, 500 ms `easeInOut` |
| `a-3` / `a-13` | 5+5 DROPDOWN_OPEN | `display: none → block` |
| `a-4` / `a-14` | 5+5 DROPDOWN_CLOSE | `display: block → none` |
| `a-9` | 1 MOUSE_CLICK | checkbox: `translateX(1rem)` + 2 cambios de `background-color` |
| `a-10` | 1 MOUSE_SECOND_CLICK | el inverso de `a-9` |

Easings exactos: `outQuart` = `cubic-bezier(0.165, 0.84, 0.44, 1)` ·
`easeInOut` = `cubic-bezier(0.455, 0.03, 0.515, 0.955)`.

## 7.2 El reparto por breakpoint NO es decorativo

Webflow: `main` ≥992 · `medium` 768–991 · `small` 480–767 · `tiny` 0–479.

- **130 eventos** corren en los cuatro.
- **20 solo en `main`**: 9 `slideInLeft` + 7 `slideInRight` + 2 `slideInBottom` + 2 `growIn`.
- **17 solo en `medium+small+tiny`**: todos `growIn`.

Es el patrón clásico: **los mismos elementos deslizan en horizontal en escritorio y hacen
fade+scale en móvil**. Si aplicas el deslizamiento lateral en móvil, aparece **barra de scroll
horizontal**. En LTR el desbordamiento por la izquierda no genera barra; **solo el positivo**
— así que `slideInRight` es el peligroso. En AMS la amplitud lateral segura medida fue **20 px**,
no 100.

## 7.3 Cómo se implementa

`IntersectionObserver` + `@keyframes` CSS, seleccionando **por `data-w-id`** (el atributo ya
está en el HTML migrado; si una sección lo pierde, pierde su entrada).

> ### ⚠️ El estado oculto tiene que colgar de un sello que escriba el JS
> ```css
> html[data-anim] [data-w-id]:not([data-visto]) { opacity: 0 }
> ```
> El atributo `data-anim` lo pone un `<script is:inline>` en el `<head>`. **Si el script no
> corre, el selector no casa y se ve todo** — que es exactamente el comportamiento correcto.
> Refinamiento que aprendimos en AMS: escribe el sello **después** de construir el
> `IntersectionObserver`, y monta todo en un `try/catch` que lo retire si algo falla. Sellar
> antes y fallar después es el mismo fallo por la puerta de atrás.
> Este repo tiene precedente: en AMS el sitio **ya se quedó invisible una vez** por heredar los
> `data-w-id` + `style="opacity:0"` de Webflow sin su animación.

> ### ⚠️ `backwards`, NUNCA `both`
> Con un `@keyframes` de un solo fotograma `from`, el `forwards` que `both` lleva dentro deja el
> efecto aplicado **de por vida**: el `transform` se queda serializado como `matrix(1,0,0,1,0,0)`
> en vez de volver a `none`. Es la identidad y no se ve — pero **un `transform` distinto de
> `none` crea contexto de apilamiento y bloque contenedor** para descendientes `fixed`/`absolute`.
> Medido en AMS: con `both`, un bloque atrapaba **de forma permanente** sus decorativos en
> `z-index:-1`, no solo durante los 450 ms. **Lo cazó la verificación, no el diseño.**

> ### ⚠️ `animation`, no `transition`
> Un `transition-delay` se queda puesto para siempre y cualquier hover futuro de ese hijo
> arrancaría cientos de ms tarde. `animation-delay` no se filtra.

> ### ⚠️ Transform sobre un elemento `fixed`/`sticky` se carga el posicionamiento
> El nav es `fixed`. Sus animaciones (`a-11`/`a-12`) **sí** usan `translateY` — eso es correcto
> para `fixed`. Pero **no le añadas ninguna animación de entrada más**: en Pergola Plus, el
> `.menu` es uno de los dos elementos que **nunca** se pudieron animar por CSS.

> ### ⚠️ Los objetivos de ACCIÓN no se ven mirando los objetivos de EVENTO
> Una lista `a-*` puede tocar elementos que **no son** el `target` del evento, vía
> `affectedElements`. En Pergola Plus ese fue el error de la primera pasada: dos elementos
> seguían recibiendo `element.style` de IX2, y **un `element.style` gana siempre a una animación
> CSS con fill activo, en silencio**. Antes de dar la fase por cerrada, recorre `ix2.json`
> buscando `affectedElements` además de `target`.

> ### ⚠️ El `<a>` con hash deja doble entrada en el historial
> `webflow.js` trae un manejador de anclas **delegado en `document`** que hace su propio
> `history.pushState`. Corre **después** de un listener puesto en el propio `<a>`, así que
> `preventDefault()` no lo frena. Síntoma: cada clic deja dos entradas y el botón atrás no hace
> nada. Si conservas algo de `webflow.js`, añade `e.stopPropagation()` junto al `preventDefault()`.

**Accesibilidad:** `@media (prefers-reduced-motion: reduce)` y `@media print` **sin
`!important`** — repitiendo la misma cadena de selectores que la regla que oculta, para ganar
por orden. Un reset global de `animation: none` **no basta**: comprime la duración pero no
restablece `opacity` ni `transform`.

**No animes** heroes, ningún candidato a LCP, ni nada por encima del pliegue.

## 7.4 Los otros componentes de Webflow

| Componente | Usos | Reimplementación |
|---|---|---|
| `w-dyn-list` / `w-dyn-item` | 111 / 108 | bucle Astro sobre Sanity |
| `w-dropdown` | 96 | `<details>` o JS mínimo, con `a-3`/`a-4` |
| `w-nav` | 21 | nav propio: `over-right`, colapsa ≤991, 400 ms |
| `w-embed` | 90 | HTML inline |
| `w-tabs` | 2 (8 panes) | tabs con roles ARIA |
| `w-lightbox` | 6 | `<dialog>`; conserva grupos y orden |
| `w-background-video` | 7 | `<video autoplay muted loop playsinline preload="none" poster>` + su botón play/pausa |
| `w-pagination` | 1 | paginación estática en `/blogs-tips` |
| `w-richtext` | 3 | Portable Text con las mismas clases |

**Terceros:**

| Script | Acción |
|---|---|
| `@finsweet/attributes@2` | reimplementar el filtrado de listas en local |
| `finsweetcomponentsconfig-1.0.24.js` | eliminar si lo anterior lo cubre |
| `@flowbase-co/boosters-before-after-slider` | reimplementar (~40 líneas) |
| **Elfsight click-to-call** `e4536a7a-7d1e-4555-8d8c-e81075d084b0` | **mantener tal cual**: cuenta del cliente |
| jQuery 3.5.1 + `webflow.js` | eliminar |
| GA4 `G-7VHTVG2Q7G` · GTM `GTM-N9BWB3BV` · Meta Pixel `863379502909192` | **conservar los 3 IDs**, mismo orden, con el `<noscript>` de GTM |

**GATE 7** — `check:ix2`: sobre `dist/` servido, con **la pestaña con foco**, cargando y
haciendo scroll completo en los 4 anchos, **ningún elemento con `data-w-id` queda con `opacity`
computada 0**, y ningún `transform` residual distinto de `none` en reposo. Además: 0 barra de
scroll horizontal en 479 y 767.

---

# FASE 8 — Formularios y captación

Los formularios de Webflow **mueren** al salir de Webflow. Hay que rehacerlos.

1. **Contact Page Form** (`/contact-us`): First Name, Last Name, Email, Phone, Message.
2. **Request Quote Form** (`/request-estimated`): Full Name, Email, Phone Number, Street Address,
   City, State, ZIP Code, Project Type, Estimated Project Budget, Type (radio), Checkbox (múltiples).
3. Formularios de **filtro** (`filter`, `service-filter` en `/gallery`): son UI, no envían nada.

Astro API route (`export const prerender = false`). **Validación en servidor obligatoria**,
honeypot, time-trap y rate limit por IP. Estados **done**/**fail** con el mismo markup y las
mismas clases que hoy (`w-form-done`, `w-form-fail`).

**Pregúntame antes de escribir el mailer:** destinatario y proveedor (Resend / Gmail SMTP).

> ### ⚠️ `console.log` NO es entrega
> En Pergola Plus, `ok = canales.log || …` y **`console.log` no falla nunca**: el visitante veía
> «gracias» pasara lo que pasara con su lead, y el 500 era código inalcanzable. **El log es
> rastro, no entrega.** Entregar es que el lead llegue a donde alguien lo va a ver. El acuse al
> visitante tampoco cuenta: que le llegue su confirmación mientras el negocio no se entera es
> una mentira más educada.

> ### ⚠️ El import de nodemailer con especificador en VARIABLE no se empaqueta
> El rastreador del adaptador de Vercel no lo ve, no lo incluye, y el envío revienta en
> producción con `Cannot find module`. Como el envío suele ir en try/catch, el síntoma es
> «el lead se guarda y el aviso nunca llega». **Usa un literal**: `await import("nodemailer")`.
> Verifica que `.vercel/output/functions/**/node_modules/nodemailer` existe tras el build.

> ### ⚠️ El honeypot no puede parecer un campo real
> `company_url` lo autorellenan los gestores de contraseñas y tira usuarios reales. Usa algo
> como `ref_id`. Y el time-trap a **<1000 ms**, no a 2500: 2500 tiraba a quien usa autofill.

> ### ⚠️ Probar el endpoint
> `astro preview` **no existe** con el adaptador de Vercel. O `astro dev` con cabecera `Origin`
> en los POST (si no, Astro devuelve 403 por CSRF), o sirve `.vercel/output/static` con
> `npx serve`. Gmail App Password exige **2FA activa** y debe ser **de la cuenta que autentica**.

**GATE 8** — Un correo **recibido de verdad** por cada uno de los 2 formularios. No un 200 en consola.

---

# FASE 9 — Paridad SEO

- `<title>` y `meta description` **idénticos** a `baseline/seo.json`, carácter a carácter.
- Todos los `og:*` y `twitter:*` que hoy existen, con las URLs de imagen ya locales.
- `<link rel="canonical">` absoluto en las 115.
- **JSON-LD**: reproduce el bloque `Organization` que ya está en el `<head>` (name
  "Mr & Mrs Outdoor Living", logo, description, `areaServed` State Florida, `addressRegion: FL`),
  con la URL del logo actualizada. **No añadas schema nuevo.**
- `sitemap.xml` con las **113 URLs originales** — las 2 que hoy están fuera **siguen fuera**.
- `robots.txt` con la misma línea única de `Sitemap:`.
- 404 real. `favicon.png` + `webclip.png` locales. `lang="en"`.
- La página `401.html` (protegida por contraseña) **no se migra**; anótalo y pregúntame.

> ### ⚠️ Un interruptor de indexación que falle CERRADO
> Mientras el sitio viva en una URL de preview, **no puede indexarse**. Usa una variable
> (`PUBLIC_ES_PRODUCCION`, indexa **solo** con el valor exacto `"1"`) que gobierne a la vez:
> `robots.txt`, el `sitemap.xml`, el `<meta noindex>` y `PUBLIC_SITE_URL`.
> **Ojo con el fallback de la URL**: si cae en `localhost` está mal, pero si cae en el dominio
> del cliente, las 115 canónicas apuntan al sitio viejo — ese fue el fallo real en Pergola Plus.
> **No** uses `X-Robots-Tag` en `vercel.json`: es estático, no lee la variable, y o lo hereda
> producción o hay que acordarse de quitarlo justo en el deploy que más caro sale olvidar.

**GATE 9** — `check:seo` 115/115 exactos contra el baseline.

---

# FASE 10 — Puertas de verificación

Escríbelas como scripts npm. **Corren sobre `dist/` servido o sobre la preview de Vercel,
nunca sobre `npm run dev`.**

| Script | Comprueba | Umbral |
|---|---|---|
| `check:rutas` | las 115 dan 200 y no existe ninguna extra | 115/115, 0 extras |
| `check:texto` | `innerText` normalizado vs `baseline/text/` | **100 % idéntico** |
| `check:seo` | title, description, og, twitter, canonical, JSON-LD | 115/115 |
| `check:visual` | diff de píxeles vs `baseline/shots/` en 1920/1440/991/479 | **≥99 % por página** |
| `check:ix2` | 0 elementos en `opacity:0`; 0 `transform` residual; 0 scroll-x en móvil | 0 fallos |
| `check:assets` | 0 refs a `website-files.com`; 0 imágenes 404; todo `<img>` con width/height | 0 fallos |
| `check:enlaces` | ningún enlace interno roto, ninguno a `.html` | 0 rotos |
| `check:formularios` | POST real → correo recibido | 2/2 |
| `check:git` | **todo lo que pide `dist/` está en `git ls-files`** | 0 fallos |
| `check:lighthouse` | Perf/A11y/BP/SEO ≥ el sitio actual | nunca por debajo |

> ### ⚠️ `check:git` es la puerta que faltó en Pergola Plus, y costó producción rota
> `public/cms-img/` y `public/videos/` estaban en `.gitignore`, y el proyecto **despliega por
> `git push`**: Vercel construía desde un clon donde esos 507 ficheros no existían. **429 URLs
> rotas en producción con todas las puertas en verde en local.** La puerta medía si el fichero
> existía **en disco** — y el disco es esta máquina, justo donde el instalador lo acaba de dejar
> todo, así que **nunca pudo ver el fallo**.
> **Corolario, y es la regla más importante de todo este documento: una puerta que lee el disco
> local no dice nada sobre lo desplegado.** `check:git` usa `git ls-files`, que es lo único que
> Vercel llega a ver. Pruébala en los dos sentidos: en rojo antes de versionar, en verde después.

> ### ⚠️ Las puertas cazan el markup, no el sentido
> Un renombrado puede pasar las 10 en verde y dejar el nombre viejo a la vista. **Mira la página.**
> Corolarios concretos de migraciones anteriores:
> - Un **redirect 301 NO satisface** una puerta de «páginas servidas»: no genera HTML.
> - **Ninguna puerta escanea los `url()` del CSS** → ahí puede quedar un 404 invisible. Añádelo.
> - Una puerta con **puerto fijo** prueba el proyecto que haya al otro lado si el puerto está
>   ocupado, sin avisar. Compruébalo con `lsof -nP -iTCP:<puerto> -sTCP:LISTEN`.

> ### ⚠️ Lighthouse: `NO_LCP` en localhost móvil es un artefacto
> La simulación Lantern revienta con `LanternError: NO_LCP` porque en localhost las respuestas
> son instantáneas (grafo degenerado), y emite un LCP falso que **tapa el Performance móvil en
> ~92 aunque la página sea rápida**. Fíate de `observedLargestContentfulPaint`, del desktop, y
> sobre todo de la URL desplegada.

> ### ⚠️ Verificar el GTM desde fuera
> Un contenedor **publicado pero vacío** devuelve 200 y pesa lo mismo que uno lleno: la consola
> sale limpia y Tag Assistant dice «conectado» mientras GA4 se queda a cero para siempre.
> ```bash
> curl -s "https://www.googletagmanager.com/gtm.js?id=GTM-N9BWB3BV" | grep -oE "G-[A-Z0-9]{8,12}|AW-[0-9]{9,12}" | sort -u
> ```
> Tiene que imprimir `G-7VHTVG2Q7G`. Otra `G-` = está entregando a una propiedad ajena.

**GATE 10** — Las 10 en verde sobre `dist/`, y cada una demostrada en rojo al menos una vez.

---

# FASE 11 — Deploy y corte de dominio

1. **Despliega por `git push`, no por CLI.** El deploy por `vercel deploy --prod` devolvió
   `readyState: BLOCKED` sin código ni mensaje, con el equipo sin bloquear; en cuanto se conectó
   la integración de git, el push funcionó a la primera. **Si ves `BLOCKED`, no persigas el CLI: empuja.**
2. Si el repo es un monorepo, fija **`rootDirectory`** y **`framework`** en el proyecto de Vercel
   o el build falla en la raíz.
3. Variables de entorno: recuerda que **production ≠ preview**. Si las de correo solo están en
   producción, las previews no envían y el `check:formularios` contra preview miente.
4. Repite **las 10 puertas contra la URL de preview**. Las de local no valen para esto.
5. Enséñame la preview y el informe de las 10 puertas.
6. **Para aquí.** El cambio de DNS lo apruebo yo. No lo hagas por iniciativa propia.
7. Cuando lo apruebe: dominio, verificar el certificado del host **exacto** (apex y `www` son
   dos entradas distintas; en AB Aluminum solo el apex estaba en el proyecto y `www` servía un
   certificado que no casaba, con el sitio público efectivamente roto), reenviar sitemap a
   Search Console, y **dejar Webflow publicado 30 días** por si hay que revertir.
8. **Rota los tokens** de Sanity y Vercel al entregar.

**GATE 11** — Las 10 puertas en verde contra la preview. Entrada final en la bitácora con la URL,
los IDs de proyecto y la lista de lo que queda en manos del cliente.

---

## Apéndice — trampas de entorno

- **Verifica sobre `dist`, nunca sobre `dev`.** `astro dev` no hornea `width`/`height` ni sirve
  los assets igual. Un fallo que solo vive en `dist/` no se puede encontrar en desarrollo.
- **`npm run build` no comprueba tipos** (esbuild los quita). `astro check` es un comando aparte.
  Un campo mal escrito llega a producción en verde.
- **Si hay otra sesión trabajando este repo**: commitea la salida generada en cuanto la
  produzcas, `git add` explícito por fichero (nunca `-A`), y no cambies de rama ni hagas `stash`.
  Alguna puerta puede hacer `git checkout --` en un `finally` y llevarse trabajo sin comitear.
- **El separador de los CSV es `; `** (punto y coma + espacio). `split(';')` sin `trim()` deja
  slugs con espacio delante que no resuelven contra ningún documento.
