# MASTER IMPLEMENTATION PROMPT
# MR. & MRS. OUTDOOR LIVING
# SANITY BLOG CMS + SEO/AEO/GEO CONTENT SYSTEM + SERVICE-PAGE BLOG INTEGRATION

Actúa como un equipo senior multidisciplinario compuesto por:

- Senior SEO Strategist
- SEO Content Architect
- Local SEO Specialist
- Semantic SEO Specialist
- Search Intent Analyst
- AEO Specialist
- GEO / Generative Engine Optimization Specialist
- Technical SEO Engineer
- Sanity CMS Architect
- Astro / Frontend Engineer
- UX/UI Designer
- CRO Specialist
- Internal Linking Architect
- Editorial Director
- Professional American-English Copywriter
- Home Services Marketing Specialist
- Swimming Pool & Outdoor Living Content Specialist
- Structured Data Specialist
- Web Performance Engineer
- QA Engineer
- Fact Checker

Estás trabajando directamente sobre el proyecto real de:

Mr. & Mrs. Outdoor Living

PRODUCTION WEBSITE:
https://www.mrandmrsoutdoorliving.com/

REPOSITORIO:
/Users/senavia/Sites/mrandmrs-outdoor-living

El proyecto ya contiene:

- website funcionando (115 rutas, `output: 'static'`);
- páginas de servicios (14 en `src/pages/services/`);
- páginas locales (53 ciudades + 9 condados + 2 estado);
- blog existente (`/blogs-tips` + 10 fichas en `src/pages/blogs/`);
- artículos ya publicados;
- Sanity CMS (`studio/`, projectId `m273z6jc`, dataset `production`);
- banco de imágenes (`public/images/`, 1.249 ficheros en 13 carpetas);
- galerías/proyectos (10 fichas + 5 obras propias + `/gallery`);
- formularios (5 de captación, `src/components/widgets/FormularioCore.astro`);
- páginas comerciales;
- Pool Cost Estimator (`/pool-cost-estimator`, `/pool-investment-estimator`);
- Financing (`/financing`);
- Project Gallery (`/projects`, `/gallery`);
- diseño visual definido (tokens en `disenio/tokens.css`, hojas en `src/styles/`).

NO reconstruyas el proyecto desde cero.

Debes trabajar sobre la arquitectura actual.

======================================================================
CÓMO SE TRABAJA AQUÍ — LÉELO ANTES QUE EL OBJETIVO
======================================================================

Este bloque no cambia lo que hay que hacer. Cambia CÓMO se hace, y es lo que
separa una entrega aceptada de una rechazada.

**EL STACK REAL, MEDIDO:**

```
Astro 7.2.9 · @astrojs/vercel · output: 'static' · trailingSlash: 'never'
build.format: 'file' · CSS propio, CERO React · Sanity como CMS
site = PUBLIC_SITE_URL || https://www.mrandmrsoutdoorliving.com   (CON www)
```

No es Next.js. No hay App Router ni Pages Router: hay `src/pages/**/*.astro`,
rutas dinámicas con `getStaticPaths`, y una API route (`src/pages/api/formulario.ts`)
que es lo único que necesita servidor. No hay `next/image`: las imágenes son
`<img>` con `srcset` horneado. No hay React Server Components. Si tu instinto dice
«esto en Next se haría así», para y mira cómo lo hace el repo.

**LEE ESTO PRIMERO, EN ESTE ORDEN:**

1. `CLAUDE.md` — las reglas de la casa. Manda sobre este documento.
2. `PROMPT-REDISENO.md` — el contrato del programa R.
3. `docs/encargos/00-PRINCIPIOS.md` — se ELEVA la base de Webflow, no se sustituye.
4. `docs/encargos/CRITERIO.md` — los umbrales medidos con los que se acepta o rechaza.
5. `docs/encargos/DIRECTOR.md` — el reparto vivo y la deuda abierta.
6. `MIGRACION-LOG.md`, la entrada más reciente.

**TUS PERMISOS EN ESTE ENCARGO — DIRECTOR COMPLETO:**

Sebastian te autoriza, para este encargo y solo para este:

- `npm run build`;
- correr las puertas, incluidas las 4 de navegador;
- re-baselinizar `baseline/text/` y `baseline/shots/` de las rutas que toques,
  **sin pedir permiso lote a lote**;
- commitear;
- push y merge a main — que es el despliegue: Vercel publica al entrar en main.

Con eso vienen cuatro obligaciones que NO son negociables:

1. **El árbol es compartido.** Puede haber otros chats trabajando sobre él a la
   vez. Antes de construir: `git fetch origin && git merge --ff-only origin/main`,
   y `git status --porcelain` para ver qué hay vivo que no sea tuyo. Si aparece
   trabajo ajeno a medias, **para y dilo** — no lo commitees ni lo revientes.
2. **Commit por nombre de fichero, nunca `git add -A`.** Y los backticks de un
   mensaje de commit los ejecuta zsh si usas `-m`: heredoc con `-F -`.
3. **`npm run build` ensucia `public/robots.txt` y `public/sitemap.xml`.** Los
   reescribe `scripts/build-seo-ficheros.mjs` según `PUBLIC_ES_PRODUCCION`.
   Restáuralos o commitéalos a conciencia: si se cuela un `Disallow: /`, se
   desindexa el sitio entero.
4. **Sebastian verifica AL FINAL, sobre el informe y el sitio desplegado.** No le
   vas enseñando el trabajo ruta por ruta ni le pides aprobación por lote: el
   informe final de este documento ES la entrega. Eso hace la economía de tokens
   parte del encargo, no una cortesía — mide con las puertas, no con los ojos.
5. **Re-baselinizar es el único acto irreversible del sistema.** Se hace POR
   LOTES (`scripts/aprobar-diseno.mjs` exige árbol limpio, así que hay commit
   entre lote y lote; la corrida única de 83 rutas murió en la captura 87 de 332),
   y **el diff del texto re-baselinizado va pegado en el informe, literal**. Sin
   ese diff, nadie puede saber después si lo que se congeló era lo que se quería.

**LA VERIFICACIÓN SON LAS PUERTAS, NO MIRAR CAPTURAS:**

```bash
npm run check:tokens                       # estática, <1 s, córrela siempre
npm run check:rutas && npm run check:enlaces && npm run check:seo
node scripts/check-texto.mjs  <subcadena>  # acotada por ruta
node scripts/check-visual.mjs <subcadena>  # 35-60 s por ruta × 4 anchos
node scripts/check-sanity.mjs              # dataset real vs _source/sanity-docs.json
```

**Deriva las rutas afectadas antes de medir, no las adivines:**

```bash
grep -rlo 'class="blog-section-page"' .vercel/output/static --include='*.html' | wc -l
```

Cinco trampas que ya cazaron a alguien aquí:

- **Nunca pases `/` como filtro.** Casa por `includes()`: te lleva las 115
  creyendo que mides 4, y son ~65 min con la pantalla de Sebastian secuestrada.
  Para la home hay coincidencia exacta, **con comillas** (zsh se come `=/` suelto):
  `node scripts/check-visual.mjs '=/'`.
- `check:ix2` y `check:cascaron` **no leen `argv`**: van solo en gate de fase.
  Y `check:cascaron` construye con `MM_FIXTURES=1`, que **reemplaza**
  `.vercel/output/static` — hay que reconstruir normal después.
- **Verifica sobre `.vercel/output/static`, NUNCA sobre `astro dev`** — dev no
  hornea `width`/`height` y las medidas mienten.
- Las 4 puertas de navegador lanzan **Chromium visible** y **dos a la vez no se
  degradan: se MATAN** (`Target page, context or browser has been closed`).
  Se corren de una en una.
- **Al capturar, espera un ESTADO, no milisegundos.** La misma página ha dado
  98,67 % y 99,65 % por esperar por reloj. Y «opacidad a medias» no es 0.

**UNA PUERTA QUE NO CORRIÓ NO ES UNA PUERTA VERDE.**

Es la familia de fallo que más veces ha aparecido en este repo — van siete casos
documentados en `docs/encargos/DIRECTOR.md`. Si una comprobación se saltó por
falta de referencia, **dilo**: falla ABIERTO. Y un número sin el comando que lo
produjo es una opinión: pega la salida literal, no la resumas.

**LO QUE CADA PUERTA HACE CON UNA RUTA NUEVA** (está escrito en
`scripts/lib/rutas-propias.mjs`, léelo entero antes de crear la primera URL):

| Puerta | Con una ruta que no existe en Webflow |
|---|---|
| `check:rutas` | ROJA si no está declarada en `RUTAS_PROPIAS` — es lo único que rompe por existir |
| `check:seo` | La mide **contra sí misma**: title y description no vacíos, canónica y noindex |
| `check:visual` | La itera solo si tiene contrato `rediseno` en `disenio/contratos.json`. Sin contrato la SALTA EN SILENCIO |
| `check:texto` | **No la mide.** No hay origen contra el que comparar |
| `check:assets`, `check:ix2`, `check:baseline` | **No la miden.** Iteran otras fuentes |

Tres puertas ciegas a cada URL nueva. Por eso, y solo por eso, este encargo SÍ
autoriza auditoría a mano con el agente **`ui-qa`** + la skill **`audit`** de
accesslint, a 1920/1440/991/479 — mismo caso que `/thank-you` en
`PROMPT-TRACKING.md:353`.

**Y SE AUDITA LA PLANTILLA, NO CADA ARTÍCULO.** Los artículos nuevos comparten
una sola plantilla (`src/pages/blogs/[slug].astro`) y un solo índice
(`/blogs-tips`). Auditar 90 URLs que pintan el mismo markup con distinto texto no
encuentra nada que no encuentren tres, y cuesta horas de pantalla y decenas de
miles de tokens. El alcance de la auditoría a mano es, en total:

- `/blogs-tips` — es markup nuevo de verdad (buscador, filtros, paginación);
- **dos o tres** fichas representativas: la más larga, una con tabla y FAQ, y una
  con el artículo destacado. Elígelas y di por qué.

Nada más. Si las tres pasan, la plantilla pasa.

**LO QUE SIGUE PROHIBIDO ES LA BARRIDA QUE NADIE PIDIÓ.** Ni recorrer las 115
rutas «para ver cómo va», ni abrir el navegador y pasar páginas, ni capturar una
por artículo. `check:visual` y `check:texto` miden más y mejor que mirar
capturas, headless y sin gastar contexto. Acota siempre por las rutas que tocaste.

**LAS SKILLS QUE APLICAN, Y LAS QUE NO:**

- **`frontend-design`** — ANTES de escribir el markup de la nueva `/blogs-tips`,
  no después. Es la regla de `~/Sites/CLAUDE.md` y el fallo que más caro sale.
- **`make-interfaces-feel-better`** — para pulir tarjetas, chips, estados.
- **`seo`** — para el trabajo de meta, schema, sitemap y Core Web Vitals.
- **`ui-qa`** + **`audit`** (accesslint) — solo sobre las rutas NUEVAS. Por su
  nombre y acotadas. Nunca sobre las 115.
- **NO uses aquí** `motion-*`, `react-*`, `frontend-patterns`, `frontend-a11y`:
  son de React/Next con `motion/react`. Este sitio es Astro con CSS.

**EL MCP DE SANITY ESTÁ EN LA SESIÓN.** Úsalo para leer y escribir el dataset
sin montar scripts: `get_schema`, `query_documents` (GROQ), `create_documents`,
`patch_documents`, `publish_documents`, `deploy_schema`. Pasa `resource` en cada
llamada (projectId `m273z6jc`, dataset `production`); no persiste entre llamadas.
Para lecturas que tienen que ver borradores hace falta el token: una lectura
ANÓNIMA de un dataset público devuelve los borradores como **0**, no como error
— esa trampa ya puso `check-sanity.mjs` en rojo diciendo «0 borradores» con los
8 ahí. El token está en `.env` como `SANITY_WRITE_TOKEN`.

**LA DISCIPLINA DE LA CAPA CSS** (`docs/encargos/00-PRINCIPIOS.md` §5):

- Cero `!important`. Cero `@layer` — `webflow.css` son 167 KB **sin capa**, y
  cualquier regla sin capa gana a toda regla con capa. Se gana por **orden de carga**.
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. Token que
  falte, se **pide**; `disenio/` no lo escribe nadie más.
- `min-width` 480 / 768 / 992, jamás mezclado con los `max-width` de Webflow.
- Nunca `animation-fill-mode: forwards`. Ningún `opacity: 0` fuera de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos
  de CTA con texto navy (**8,40:1**). Medido, no se rediscute.
- Cada par de colores nuevo lleva **su ratio medido escrito al lado**.
- Objetivo táctil ≥44 px en los CUATRO anchos, con la receta que ya funciona
  (`min-height:44px` + `inline-flex` + centrado, `intro.css:161-166`), nunca
  `height` fija ni **`aspect-ratio` con la altura ya declarada — con la altura
  definida, `aspect-ratio` calcula el ANCHO y desborda la columna**.
- Hoja nueva = hay que **cablearla en `src/layouts/Base.astro`**. Una hoja de solo
  comentarios no mueve un píxel: compruébalo con el hash del bundle.

**EL ESPAÑOL DE ESTE SITIO ES EL DE FLORIDA, NO EL DE ESPAÑA.** Pies y mph, «con
licencia», `code enforcement`. (El contenido público va en inglés americano; esto
aplica a comentarios, informes y a cualquier copy en español que aparezca.)

======================================================================
OBJETIVO PRINCIPAL
======================================================================

Construir e implementar un sistema editorial profesional que permita que
Mr. & Mrs. Outdoor Living desarrolle autoridad temática y comercial en
Google y otros sistemas de búsqueda y descubrimiento.

El objetivo es crear contenido:

- útil para homeowners reales;
- orientado a decisiones de compra;
- optimizado para SEO;
- optimizado para Local SEO;
- estructurado para Answer Engines;
- fácilmente interpretable por AI search engines;
- semánticamente claro;
- internamente conectado;
- visualmente atractivo;
- conectado a páginas comerciales;
- capaz de conducir visitantes hacia una consulta o estimate.

Funnel:

Google / AI Search
→ Blog
→ Education
→ Trust
→ Service Page
→ Project Gallery / Cost Estimator / Financing
→ Consultation / Estimate
→ Qualified Lead

NO estamos intentando generar tráfico irrelevante.

Queremos homeowners potencialmente preparados para invertir en proyectos
residenciales de alto valor.

======================================================================
REGLA CRÍTICA
======================================================================

TODOS LOS BLOGS, tanto los actuales como los nuevos, deben estar
administrados desde SANITY CMS.

Sanity debe convertirse en la única fuente de verdad del sistema editorial.

NO mantener una lista paralela hardcoded de blogs si puede administrarse
correctamente desde Sanity.

NO crear nuevos artículos directamente como páginas estáticas si la
arquitectura permite gestionarlos desde Sanity.

**EL PRECEDENTE EXACTO YA EXISTE EN ESTE REPO, Y ES EL PATRÓN A SEGUIR.**

La Fase 6b hizo esto mismo con las 53 páginas de ciudad: borró los 53 `.astro`
estáticos y las pasó a `src/pages/pool-builders/[slug].astro`, que pide los
documentos a `m273z6jc.api.sanity.io` dentro de `getStaticPaths` y **falla
CERRADO a propósito** — sin datos no se construye media colección, porque 53 URLs
que desaparecen en silencio son 53 errores 404 con el despliegue en verde.

Lee ese fichero entero antes de escribir `src/pages/blogs/[slug].astro`. Y lee
también:

- `scripts/cache-sanity.mjs` — la cache de escape para construir sin red
  (`MM_SANITY_CACHE=1`), que **nunca** debe poder enmascarar una caída real de Sanity.
- `scripts/build-paginas.mjs:349` — el `NO_REGENERAR`. Cuando borres los 10
  `.astro` de `src/pages/blogs/`, **tienen que entrar ahí con su motivo**, o
  `npm run paginas` los repone sin versionar, ensombrece la plantilla y rompe
  `check:rutas` con 10 rutas de más. Le pasó exactamente eso a `/pool-builders/`.

======================================================================
FASE 0 — AUDITORÍA COMPLETA ANTES DE MODIFICAR
======================================================================

ANTES de escribir contenido o modificar componentes:

audita completamente el repository.

Identifica:

- framework y versión — `package.json`, `astro.config.mjs`;
- routing — `src/pages/**` (estático) y las rutas dinámicas con `getStaticPaths`;
- `trailingSlash`, `build.format`, `site` y de dónde sale el host;
- configuración de Sanity — `studio/sanity.config.ts`, `.env` / `.env.example`;
- schemas de Sanity — `studio/schemaTypes/*.ts` (17 tipos);
- schema actual del blog — `studio/schemaTypes/blogPost.ts`;
- configuración de Portable Text — el campo `blog` de `blogPost` y qué renderiza hoy;
- consultas GROQ existentes — `src/pages/pool-builders/[slug].astro`, `scripts/check-sanity.mjs`;
- pipeline de imagen — `srcset` horneado, variantes `-p-500`…`-p-2600`,
  `src/data/assets-locales.json`, `_source/assets-manifest.json`;
- blog index — `src/pages/blogs-tips.astro` (DERIVADO);
- blog detail template — `src/pages/blogs/*.astro` (DERIVADOS);
- sistema de metadata — `src/layouts/Base.astro` + `src/data/meta-propia.json`;
- metadata dinámica — cómo la sirven hoy las 53 de `/pool-builders/` desde Sanity;
- canonical URLs — `Base.astro`, y el acoplamiento con `astro.config.mjs`;
- sitemap y robots — `scripts/build-seo-ficheros.mjs` (allowlist + interruptor);
- structured data — los bloques `jsonLd` y `jsonLdCrudo` de `Base.astro`, y su
  desduplicación de `BreadcrumbList`;
- breadcrumbs;
- service pages — las 14 de `src/pages/services/`;
- local pages — `/pool-builders/[slug]`, `/country/*`, `/where-we-serve/*`;
- project pages — `src/pages/project/*` (10 de Webflow + 5 propias);
- gallery — `/gallery`, `/projects`, `src/components/widgets/GaleriaObra.astro`;
- forms — `src/components/widgets/FormularioCore.astro`, `src/pages/api/formulario.ts`;
- CTA components — `.cta-page-section` y `.cta-footer` (mide su alcance con grep);
- Pool Cost Estimator — `src/components/widgets/Estimador.astro`, `src/lib/estimador.js`;
- Financing — `src/pages/financing.astro`;
- lógica actual de related-post — **no existe**: `CarruselBlog.astro` pinta los 10
  siempre, con el campo `categoria` en `null` a la espera. Verifícalo;
- blog cards actuales — `CarruselBlog.astro` y el bloque `.item-blogs` de `/blogs-tips`;
- utilidades SEO existentes — `scripts/check-seo.mjs` (835 líneas: léelas, dicen
  exactamente qué se exige);
- redirects — `vercel.json` (14 permanentes) y `scripts/build-vercel-config.mjs`,
  que los inyecta en `.vercel/output/config.json` porque con `--prebuilt` Vercel
  **no lee `vercel.json`**;
- analytics hooks — `gtm-container.json`, `scripts/check-medicion.mjs`, `/thank-you`;
- image bank — `public/images/**`.

NO asumas estructuras.

Inspecciona primero el código.

Mándalo todo por Bash (`sed -n`, `grep -rn`, `find`) antes de abrir una sola vez
el navegador. Leer es gratis; capturar cuesta minutos de pantalla ajena.

======================================================================
FASE 1 — INVENTARIO DE BLOGS EXISTENTES
======================================================================

El website YA tiene blogs publicados.

Ejemplos visibles actualmente incluyen temas como:

- Top 10 Luxury Pool Designs For Florida Homes
- Complete Guide To Pool Construction In Florida
- New Pool Construction Vs Pool Remodeling
- Pool Construction Timeline In Florida
- Outdoor Living Design Guide For Florida Homes
- What Permits Are Required For Pool Construction
- Common Pool Construction Mistakes We See In Florida

Esta lista NO debe considerarse exhaustiva.

Debes descubrir TODOS los artículos reales existentes.

Las tres fuentes que hay que CRUZAR — y cruzarlas es el punto, porque cualquiera
de las tres por separado miente:

```bash
ls src/pages/blogs/*.astro                    # lo que se sirve hoy
node -e "const d=require('./_source/sanity-docs.json'); \
  console.log(d.filter(x=>x._type==='blogPost').map(x=>x.slug.current).join('\n'))"
head -2 _source/cms/blogs.csv                 # el export de Webflow del que salió todo
node -e "console.log(require('./src/data/blogs.json').posts.length)"   # lo que pinta el carrusel
```

Y contra el dataset REAL, no contra lo que alguien creyó subir — con el MCP de
Sanity o con `scripts/check-sanity.mjs`:

```
*[_type == "blogPost"]{ _id, title, "slug": slug.current, publishedAt, feature,
                        titlePage, summary, seo, "img": image.alt }
```

Crear internamente un inventario con:

- title;
- slug;
- current URL;
- category;
- service supported;
- H1;
- SEO title;
- meta description;
- featured image;
- published date;
- updated date;
- article content;
- internal links;
- CTA;
- search intent;
- possible keyword overlap;
- Sanity status;
- indexation-related metadata.

IMPORTANTE:

Los blogs existentes sirven como:

1. referencia visual;
2. referencia de diseño;
3. contenido que puede mejorarse;
4. contenido que NO debe duplicarse.

======================================================================
PRESERVACIÓN SEO
======================================================================

NO cambiar URLs existentes innecesariamente.

Si una URL existente ya está publicada/indexada:

PREFERIR:

actualizar contenido
→ mantener slug
→ mantener URL
→ mejorar metadata
→ mejorar internal linking.

Solo cambiar URL cuando exista una razón SEO realmente fuerte.

Si una URL cambia:

- implementar redirect 301 — **en `vercel.json`, y verificando que LLEGA**. Los 14
  redirects de este fichero llevaron muertos desde que el sitio salió porque con
  `vercel deploy --prebuilt` Vercel no lee `vercel.json`: el enrutado sale entero
  de `.vercel/output/config.json`. Lo arregla `scripts/build-vercel-config.mjs`
  al final del build. Comprueba con `curl -I` contra el despliegue, no con la fe;
- actualizar enlaces internos — `check:enlaces` valida que nadie enlace a la vieja;
- actualizar sitemap — `scripts/build-seo-ficheros.mjs`;
- actualizar canonical;
- evitar redirect chains;
- verificar que la URL vieja redirige directamente a la nueva.

**LOS 10 SLUGS ACTUALES YA COINCIDEN CARÁCTER A CARÁCTER CON LOS DE SANITY.**
Verificado. O sea que la migración de la Fase 2 se puede hacer con CERO redirects
si no tocas los slugs — y esa es la salida preferida.

======================================================================
FASE 2 — MIGRAR / NORMALIZAR TODO A SANITY
======================================================================

Audita si todos los blogs actuales ya viven en Sanity.

Si algunos están hardcoded o almacenados fuera del CMS:

MIGRARLOS a Sanity preservando:

- URL;
- slug;
- title;
- content;
- images;
- metadata;
- dates;
- internal links.

No perder contenido existente.

**LO QUE VAS A ENCONTRAR, Y LO QUE FALTA DE VERDAD.** Los 10 documentos
`blogPost` YA están en el dataset, con `blog` como Portable Text (el primero trae
121 bloques), `image` con su `alt`, y `seo.title` / `seo.description`. Lo que NO
está migrado es el RENDER: el sitio sigue sirviendo 10 `.astro` derivados del
HTML de Webflow, y `src/data/blogs.json` —que alimenta el carrusel de todas las
fichas— se deriva del marcado de `src/pages/index.astro` por
`scripts/build-blogs.mjs`. Ésa es la «lista paralela hardcoded» que la regla
crítica manda eliminar.

El trabajo de esta fase es, entonces:

1. `src/pages/blogs/[slug].astro` leyendo Sanity en `getStaticPaths`, **fallando
   cerrado**, con el mismo patrón exacto de `pool-builders/[slug].astro`.
2. Borrar los 10 `.astro` estáticos y meter `/blogs/` en el `NO_REGENERAR` de
   `scripts/build-paginas.mjs`, con su motivo escrito.
3. `src/data/blogs.json` pasa a DERIVARSE de Sanity, no de `index.astro`. Reescribe
   `scripts/build-blogs.mjs` para eso y deja la cabecera diciendo de dónde sale
   ahora. El campo `categoria`, que hoy sale `null` en los 10, se rellena aquí:
   está reservado exactamente para esto desde el día que se escribió.
4. Extender la cache de escape: `scripts/cache-sanity.mjs` cubre hoy solo
   `poolBuilder`. Si `blogPost` va a construirse desde red, necesita el mismo
   escape o el build se vuelve dependiente de que Sanity esté en pie.

**LA PUERTA DE TEXTO Y ESTOS 10.** `check:texto` compara `innerText` al 100 % sin
tolerancia contra `baseline/text/`. Al pasar de HTML de Webflow a Portable Text
renderizado, esas 10 rutas se van a mover aunque no cambies una palabra: espacios,
entidades, orden de nodos. Tienes dos herramientas, y la elección se declara en el
informe ruta por ruta:

- **`TRADUCIDAS`** en `scripts/check-texto.mjs` — declara la sustitución EXACTA,
  vieja → nueva. No es «ignora esta línea»: si el texto no casa, la puerta sigue
  hablando. Es lo correcto cuando el cambio es tipográfico y no editorial.
- **Re-baseline** con `scripts/aprobar-diseno.mjs` — autorizado en este encargo,
  por lotes, con commit entre lote y lote, y **con el diff pegado en el informe**.

Lo que no vale es la tercera vía: que la ruta salga verde porque la puerta dejó de
mirarla.

======================================================================
SANITY CONTENT MODEL
======================================================================

Audita primero el schema actual.

Extiéndelo cuando sea necesario en lugar de crear arquitectura redundante.

`studio/schemaTypes/blogPost.ts` HOY tiene: `title`, `slug`, `legacyId`,
`publishedAt`, `feature`, `date`, `titlePage`, `summary`, `blog`, `image` (con
`alt`), `seo` (objeto `seo` con `title` y `description`).

Mapea contra eso ANTES de añadir un campo. Varios de los que pide la lista de
abajo ya existen con otro nombre —`summary` es `excerpt`, `image` es `heroImage`,
`image.alt` es `heroImageAlt`, `feature` es `featured`, `seo.title` es `seoTitle`,
`seo.description` es `metaDescription`— y duplicarlos crearía dos fuentes de
verdad para el mismo dato. Se conserva el nombre que ya está y se extiende lo que
de verdad falta.

El blogPost ideal debería poder manejar como mínimo:

title
cardTitle
slug
excerpt
heroImage
heroImageAlt
content
category
relatedServices
relatedLocations
tags
featured
publishedAt
updatedAt
author/reviewer cuando exista una persona real
seoTitle
metaDescription
canonicalUrl si es necesario
primaryTopic
searchIntent
funnelStage
recommendedCTA
relatedPosts
sources/references
FAQ data cuando sea apropiado
readingTime si la arquitectura lo permite

NO usar campos SEO solo para keyword stuffing.

**CÓMO SE EDITA EL SCHEMA AQUÍ.** Los `.ts` de `studio/schemaTypes/` los GENERÓ
`scripts/gen-schemas.mjs` desde `scripts/schema-map.mjs`, pero su propia cabecera
lo dice: *«Se corre UNA vez; a partir de ahí los .ts son la fuente.»* Edita el
`.ts` a mano. **No vuelvas a correr `npm run schemas`** sin diffear después: te
borraría los campos nuevos sin avisar.

Y publica el schema al dataset (`deploy_schema` del MCP, o `sanity schema deploy`
desde `studio/`) — si no, el Studio que abre Sebastian no verá los campos nuevos.

======================================================================
CATEGORÍAS EN SANITY
======================================================================

Crear un schema referenciado:

blogCategory

No usar categorías como strings hardcoded si Sanity puede administrarlas.

Campos:

name
slug
description
order
icon opcional
featuredImage opcional
seoTitle opcional
metaDescription opcional

**OJO CON EL TIPO `category` QUE YA EXISTE.** `studio/schemaTypes/category.ts`
son las 3 categorías que venían del Webflow, con `name`/`slug`/`legacyId`/
`publishedAt`/`feature` y sin descripción ni orden. Decide explícitamente y
dilo en el informe: o extiendes ese tipo, o creas `blogCategory` aparte y
explicas por qué conviven dos. Lo que no puede pasar es que queden dos taxonomías
solapadas sin que nadie sepa cuál manda.

======================================================================
TAXONOMÍA EDITORIAL
======================================================================

Organiza la biblioteca en categorías claras.

No crear 30 categorías innecesarias.

Utilizar aproximadamente estas categorías principales:

1. New Pool Construction
2. Pool Remodeling
3. Pool Design & Planning
4. Pergolas & Louvered Roofs
5. Outdoor Kitchens
6. Screens & Enclosures
7. Decks
8. Landscaping & Irrigation
9. Outdoor Living
10. Structures & Lighting
11. Florida Homeowner Guides

Los servicios específicos pueden existir adicionalmente como
relatedServices/tags.

Cada artículo debe tener:

- una categoría primaria;
- servicio(s) relacionado(s);
- tags solamente cuando sean útiles.

**LAS CATEGORÍAS TIENEN QUE CASAR CON LOS 14 SERVICIOS REALES.** Esos 14 están en
`src/pages/services/` y también en Sanity como tipo `service`. La lista de arriba
agrupa varios en una categoría (Pergolas & Louvered Roofs son dos servicios), y
eso está bien para el lector — pero `relatedServices` debe referenciar el
documento `service` real, no una cadena suelta. Saca los slugs de ahí:

```bash
ls src/pages/services/
```

======================================================================
FASE 3 — REDISEÑAR /BLOGS-TIPS
======================================================================

Actualmente la cantidad de blogs es limitada y puede mostrarse en un grid.

Después de implementar todos los nuevos artículos habrá demasiados para
depender únicamente de scroll.

Debes mejorar:

/blogs-tips

para convertirla en una biblioteca editorial profesional.

MANTENER el lenguaje visual actual de Mr. & Mrs. Outdoor Living.

No hacer un redesign desconectado de la marca.

**TRES COSAS QUE HAY QUE RESOLVER ANTES DE TOCAR EL MARKUP:**

1. **`src/pages/blogs-tips.astro` es DERIVADO.** Lo genera `scripts/build-paginas.mjs`
   desde `_source/vivo/blogs-tips.html`. Si lo editas a mano sin más, `npm run paginas`
   lo sobrescribe en silencio — le pasó a las 2 páginas de Estado en la sesión de
   SEO del 3-sep-2026 y hubo que restaurarlas de una instantánea. O entra en
   `NO_REGENERAR` con su motivo, o pasa a construirse desde Sanity como el resto.
   Declara cuál eliges.
2. **La hoja CSS ya existe y tiene dueño declarado**: `src/styles/blog-indice.css`,
   encargo R12-BLOG (`docs/encargos/R12-BLOG.md`), alcance `.articles-section`,
   1 ruta. Lee ese encargo antes de escribir una regla: puede haber trabajo hecho
   o en curso. El CSS nuevo va ahí, no en `propio.css` ni en una hoja nueva sin cablear.
3. **`frontend-design` va ANTES del markup.** Es la regla de `~/Sites/CLAUDE.md` y
   es el fallo que más caro sale en estos sitios: empezar una página sin pasar por
   ella. Invócala, di en una línea por qué, y sigue.

======================================================================
BLOG INDEX UX
======================================================================

La nueva página debe contener:

1. Intro / Hero editorial.

2. Search bar:
   “Search articles...”

3. Category filter.

4. Featured article.

5. Article grid.

6. Pagination o Load More.

7. Empty state.

8. Responsive mobile experience.

El héroe actual (`.hero-section`) lo comparten **8 páginas**: mídelo antes de
tocarlo (`grep -rlo 'class="hero-section"' .vercel/output/static --include='*.html' | wc -l`)
y si el cambio se sale de `.articles-section`, dilo — es alcance de otro frente.

======================================================================
CATEGORY FILTER
======================================================================

Agregar una opción:

ALL

seguida de las categorías relevantes.

Desktop:

usar chips/tabs/buttons limpios y fáciles de identificar.

Mobile:

permitir horizontal scroll, dropdown o solución equivalente que mantenga
buena UX.

El filtro debe ser accesible:

- keyboard navigation;
- semantic buttons;
- aria state;
- visible selected state.

**Y CON LAS REGLAS DE FOCO DE LA CASA**: el anillo usa `--mm-foco` /
`--mm-foco-inverso` con `--mm-foco-grosor` y `--mm-foco-aire`, y da ≥3:1 contra
sus DOS vecinos (lo de dentro y lo que queda fuera por el `outline-offset`).
Prohibidos el `#3b79c3` de Webflow y el `#1cadeb` del feed. **El oro no marca
estado en ningún sitio** (1,86:1 sobre blanco). Cada ratio va con su número
calculado, no con «se ve bien».

Chips ≥44 px de alto en los cuatro anchos, con la receta de `intro.css:161-166`.

======================================================================
BLOG SEARCH
======================================================================

Permitir buscar artículos por:

- title;
- excerpt;
- topic;
- category;
- tags.

Evitar búsquedas lentas o innecesariamente complejas.

La búsqueda debe funcionar bien en mobile.

**SIN SERVIDOR.** El sitio es `output: 'static'`: no hay endpoint de búsqueda ni
lo va a haber. La búsqueda es cliente, sobre un índice horneado en build desde
Sanity — solo los campos que la tarjeta necesita, no el Portable Text entero.
Con ~100 artículos eso son decenas de KB, no megas; si crece, se hornea un JSON
aparte y se carga en diferido.

Y el JS va **sin `type="module"` que rompa el patrón de la casa**: mira cómo
engancha `src/components/Interacciones.astro` y `Componentes.astro` antes de
inventar otra forma.

======================================================================
NO CARGAR 100 ARTÍCULOS SIN NECESIDAD
======================================================================

Cuando existan muchos artículos:

usar una estrategia como:

pagination

o

Load More

o equivalente apropiado a la arquitectura existente.

Recomendación visual inicial:

Desktop:
3 columns.

Tablet:
2 columns.

Mobile:
1 column.

Mostrar aproximadamente 9–12 artículos inicialmente.

**Y SIN CREAR RUTAS NUEVAS POR PÁGINA SI SE PUEDE EVITAR.** Cada URL que aparezca
en `.vercel/output/static` y no esté declarada pone `check:rutas` en ROJO. Si
haces paginación con rutas (`/blogs-tips/2`), cada una necesita su entrada en
`scripts/lib/rutas-propias.mjs` con motivo, su contrato `rediseno` en
`disenio/contratos.json`, y su decisión de sitemap. «Load More» sobre el índice
horneado no crea ninguna. Elige con eso en la mano y explica la elección.

**LA ALTURA DE UNA FILA DE TARJETAS LA FIJA LA MÁS LARGA.** El hueco no se quita
centrando: baja el `clamp` de la larga, y pon el cuerpo de la corta en `cqw` o el
hueco reaparece en tablet.

======================================================================
BLOG CARD DESIGN
======================================================================

Cada card debe poder mostrar:

- image;
- category;
- cardTitle;
- short excerpt;
- optional date/read time;
- clear Read Article CTA.

El cardTitle puede ser distinto al SEO H1.

Ejemplo:

SEO H1:

How Much Does a Custom Pool Cost in Florida? Cost Factors & Planning Guide

Visible card:

What Will Your Pool Really Cost?

Esto permite:

SEO clarity + website CTR.

**LA TARJETA YA EXISTE Y SE HEREDA.** `src/styles/blog.css` (R9-BLOG-01) cuelga
entero de `.blog-section-page .*`: 3 tarjetas por vista, alturas iguales, CTA
alineado, flecha en navy. Emitiendo las mismas clases se aplica solo. No dupliques
esa hoja para el índice: lo que sea común sube, lo que sea del índice vive en
`blog-indice.css`.

Y el enlace mantiene el patrón de accesibilidad que ya usa `CarruselBlog.astro`:
`aria-label` con el título completo y el `<span class="mm-sr">` dentro del botón.
Diez botones que solo digan «Read More» son diez enlaces indistinguibles para un
lector de pantalla.

======================================================================
FEATURED ARTICLE
======================================================================

Mantener o mejorar el concepto actual de artículo destacado.

El artículo Featured debe seleccionarse desde Sanity mediante:

featured = true

No hardcodearlo.

Sanity debe poder controlar qué artículo aparece destacado.

**EL CAMPO YA SE LLAMA `feature`** (booleano, viene del `Feature` de Webflow) y
está en los 10 documentos. Úsalo; no crees `featured` al lado. Y decide qué pasa
si hay dos a `true` — hoy nada lo impide: o `validation` en el schema, o un orden
determinista y documentado. Lo que no vale es que el destacado dependa del orden
en que Sanity devuelva los documentos.

======================================================================
IMÁGENES — REGLA CRÍTICA
======================================================================

TODAS LAS IMÁGENES DE LOS BLOGS deben salir del banco de imágenes
EXISTENTE dentro del proyecto/Sanity.

NO descargar stock images.

NO usar imágenes aleatorias externas.

NO generar imágenes nuevas automáticamente.

NO usar imágenes sin relación con el artículo.

**EL BANCO, CON SUS RUTAS REALES Y SUS RECUENTOS MEDIDOS:**

```
public/images/site/            639   fotos de página: héroes, secciones, los 10 blogs actuales
public/images/images/          148   la colección `images` de Webflow
public/images/subservices/     112   los subservicios (112 documentos en Sanity)
public/images/residentials/     95   residencial
public/images/projects/         81   las 10 galerías de obra REAL del cliente
public/images/procesos/         56   los 55 pasos de proceso
public/images/brochures/        53   portadas de folleto
public/images/obra/             25   las 5 obras propias (3-sep-2026)
public/images/logos/            20   logos de marca y de proveedor
public/images/countries/        11   los 9 condados
public/images/pool-builders/     3
public/images/where-we-serves/   3
public/images/commercials/       2
                            ──────
                             1.249 ficheros
public/videos/                   9   ficheros = 3 pistas propias
```

Índices que evitan tener que recorrer el disco:

- `src/data/assets-locales.json` — 628 entradas, mapa de activos locales;
- `_source/assets-manifest.json` + `_source/assets-inventory.csv` — lo que itera
  `check:assets` (comprueba firmas mágicas: un 403 guardado como `.webp` es un
  fichero de 0 dimensiones que parece existir);
- `_source/sanity-assets.json` — lo subido al asset store de Sanity.

**LAS VARIANTES DE WEBFLOW SON PARTE DEL BANCO.** Cada foto grande trae
`-p-500`, `-p-800`, `-p-1080`, `-p-1600`, `-p-2000`, `-p-2600` más el original, y
eso es lo que compone el `srcset` que ya emiten `blogs.json` y `/blogs-tips`.
Copia ese patrón; no sirvas el original de 2752 px a un móvil.

**CÓMO SE REFERENCIA UNA IMAGEN DESDE UN `blogPost`.** Los 10 actuales lo hacen
así, y es el patrón que usa `scripts/import.mjs`:

```json
"image": {
  "_sanityAsset": "/Users/senavia/Sites/mrandmrs-outdoor-living/public/images/site/commercial-pool-construction-florida.webp",
  "_publico": "/images/site/commercial-pool-construction-florida.webp",
  "alt": "Commercial pool construction project in Florida designed for hotels, resorts, and multifamily properties."
}
```

Crear mentalmente un media inventory agrupado por:

- new pools;
- spas;
- remodeling;
- pergolas;
- louvered roofs;
- outdoor kitchens;
- enclosures;
- screens;
- decks;
- landscaping;
- irrigation;
- lighting;
- outdoor living;
- structures.

======================================================================
IMAGE SELECTION
======================================================================

Para cada blog elegir:

1 Hero image.

Y cuando el contenido lo justifique:

2–5 imágenes internas relevantes.

Usar imágenes para explicar visualmente el tema.

No añadir imágenes solo para llenar espacio.

**ELIGE POR HOJA DE CONTACTOS, NUNCA POR EL NOMBRE DEL FICHERO.** Es la regla 6
de `~/Sites/CLAUDE.md` y el principio §4 de `00-PRINCIPIOS.md`: el nombre miente
sobre el encuadre y cuela renders. Si tienes que elegir entre varias, míralas
juntas. Con vídeo, muestrea varios segundos — el vídeo del héroe dura 40 s y en
el segundo 16 se convierte en un solar en obra, cosa que ni el nombre ni el
primer fotograma dicen.

Monta la hoja de contactos con `sharp` (ya está como devDependency) en una sola
imagen por carpeta candidata, y mírala una vez. Es una lectura de imagen, no una
barrida del sitio: barato y acotado.

======================================================================
NO FALSEAR PROYECTOS
======================================================================

NO presentar dos fotografías de proyectos diferentes como:

“before / after”

si no pertenecen realmente al mismo proyecto.

NO declarar que una imagen es de Gainesville/Ocala si el proyecto no puede
verificarse como de esa ciudad.

NO inventar ubicación.

**Y LA LÍNEA ROJA DE LA CASA, QUE VA MÁS LEJOS:** 🚨 **nunca se genera obra que
parezca del cliente.** Este es un contratista real con 10 galerías de proyectos
reales y 3 vídeos de obra propia. Una piscina generada por IA puesta donde el
visitante entiende «esto lo construimos nosotros» es publicidad engañosa, y
además innecesaria: el material real existe. Generar (Higgsfield, `~/.local/bin/hf`)
vale solo para iconos, pictogramas, texturas y fondos abstractos — y en este
encargo, que es editorial, no debería hacer falta ni eso.

El par antes/después que ya existe en el sitio (`.before-after-section`, 15 rutas)
usa dos fotos de 1450×906 con encuadre IDÉNTICO. Si construyes uno nuevo, esa es
la vara: tocar la caja de solo una de las dos enseña una transformación que no ocurrió.

======================================================================
IMAGE SEO
======================================================================

Implementar correctamente:

- Sanity image optimization — `@sanity/image-url` sobre el CDN, o servir el
  activo local con sus variantes ya horneadas. Elige una y sé consistente: hoy el
  sitio sirve `/images/...` local y el `check:assets` lo vigila;
- responsive srcsets cuando aplique — con el patrón `-p-*` de arriba;
- lazy loading below fold — `loading="lazy"`, como ya hace `CarruselBlog.astro`;
- width/height — **y aquí está la trampa que da nombre a la regla 1 de la casa**:
  `astro dev` NO los hornea. Verifica sobre `.vercel/output/static` o las medidas
  mienten;
- prevention of CLS;
- meaningful alt text.

GOOD ALT:

Custom rectangular swimming pool with raised spa and light stone deck.

BAD ALT:

Best pool builder Gainesville Ocala Florida custom pools.

======================================================================
FASE 4 — CONTENT RESEARCH
======================================================================

ANTES de escribir cada nuevo artículo:

investiga la pregunta.

Para información que puede cambiar o necesita precisión:

usar fuentes oficiales/primarias cuando sea posible.

Especialmente para:

- permits;
- codes;
- wind requirements;
- construction requirements;
- manufacturer specifications;
- technical standards;
- municipal/county information.

Preferir:

Florida government
county/city government
Florida Building Code resources
manufacturer documentation
industry associations
official technical sources.

NO inventar:

- cost ranges;
- permit requirements;
- timelines;
- statistics;
- ROI;
- warranties;
- years of experience;
- certifications;
- project counts;
- company claims.

**LO QUE EL PROPIO REPO YA DA POR BUENO, Y ES FUENTE PRIMARIA PARA ESTE CLIENTE:**

- `src/data/resenas.json` — reseñas reales de Google, traídas por `fetch-resenas.mjs`;
- `src/data/proyectos-propios.json` y `src/data/obras-migradas.json` — obra real,
  con su descripción escrita mirando la foto;
- `_source/estimator-referencia.json` y `_source/estimator-casos.json` — los
  rangos de coste del estimador, que son los únicos números de precio aprobados
  que hay en este proyecto;
- `src/data/ciudades-captacion.json` y `src/data/seo-pool-builders.json` — lo que
  ya se dice de cada ciudad, y con qué respaldo.

Antes de citar una cifra de coste, mira si el estimador ya la tiene. Si la tiene,
úsala y enlaza al estimador. Si no la tiene, no la inventes.

Los condados que cubre el sitio están en `src/pages/country/` — 9, incluidos
Alachua y Marion. Los datos de permisos y `code enforcement` se buscan por
condado, no por «Florida» a secas: es lo que distingue una guía útil de una
genérica.

======================================================================
COST CONTENT
======================================================================

Muchos artículos tienen intención relacionada con precio.

NO inventar cifras.

Si existen datos aprobados/verificables dentro del proyecto:

se pueden utilizar correctamente.

Si no existe información suficientemente confiable:

explicar:

- factors affecting cost;
- scope variables;
- site conditions;
- design choices;
- upgrades;
- engineering/permitting;
- why estimates vary.

Luego dirigir al usuario hacia:

Pool Cost Estimator  →  /pool-cost-estimator

o

Request an Estimate  →  /request-estimated

(Y existe además `/pool-investment-estimator`, que es otra página y otra
intención. Mira las dos antes de decidir a cuál enlazas en cada artículo.)

======================================================================
HUMAN-FIRST CONTENT
======================================================================

El objetivo NO es escribir para Google.

El objetivo es escribir el mejor recurso posible para la persona que hizo
la búsqueda.

Después estructurarlo correctamente para search engines.

Cada artículo debe responder:

“What exactly is this homeowner trying to decide?”

======================================================================
AI SEARCH / AEO / GEO
======================================================================

Queremos aumentar la probabilidad de que el contenido pueda ser entendido,
resumido y utilizado por:

- Google Search;
- Google AI Overviews;
- ChatGPT Search;
- Gemini;
- Bing/Copilot;
- Perplexity;
- otros search/answer engines.

NO existe garantía de citación.

NO utilizar trucos para “forzar” AI citations.

La estrategia debe basarse en:

- high factual accuracy;
- clear entity relationships;
- information gain;
- direct answers;
- structured content;
- concise definitions;
- comparison tables;
- decision frameworks;
- relevant sources;
- clear headings;
- original practical value.

**HAY TRABAJO PREVIO SOBRE ESTO EN EL REPO Y NO SE EMPIEZA DE CERO:**
`PROMPT-SEO-AEO-GEO.md`, `PROMPT-SEO-AEO-GEO-ADENDA-ADS.md`,
`docs/encargos/SEO-AEO-GEO-PLAN.md` y `docs/informes/SEO-AEO-GEO-INFORME.md`.
Léelos antes de decidir la estrategia: lo que ya esté decidido ahí, manda.

======================================================================
ANSWER-FIRST WRITING
======================================================================

Cuando un H1 hace una pregunta:

responder la pregunta muy temprano.

NO escribir 500–700 palabras antes de entregar la respuesta principal.

Ejemplo:

H1:
Is a Motorized Louvered Roof Worth It in Florida?

El primer bloque debería explicar rápidamente:

- para quién puede tener sentido;
- principales beneficios;
- tradeoffs;
- qué factores deben evaluarse.

Después profundizar.

======================================================================
INFORMATION GAIN
======================================================================

Cada artículo debe agregar algo útil que normalmente falta en contenido
genérico.

Utilizar:

- homeowner decision frameworks;
- planning checklists;
- comparison tables;
- “when this makes sense”;
- “when this may not make sense”;
- contractor questions;
- common decision mistakes;
- project sequencing;
- Florida-specific considerations;
- design tradeoffs;
- upgrade timing.

NO fabricar proprietary data.

======================================================================
WRITING STYLE
======================================================================

Todo el contenido público debe escribirse en:

PROFESSIONAL AMERICAN ENGLISH.

Tone:

professional
clear
premium
helpful
specific
trustworthy
homeowner-focused

Evitar lenguaje típico de AI como:

- delve;
- unlock;
- game-changing;
- revolutionary;
- in today's world;
- dream backyard repetido constantemente;
- ultimate guide cuando no sea necesario.

Evitar paragraphs largos sin necesidad.

**Y RESPETA LO QUE `check:texto` YA CONGELÓ EN LAS RUTAS QUE NO SON DEL BLOG.**
No se añade, quita ni mueve `text-transform: capitalize` de ningún selector: está
vivo en `h2/h3/h4` y `.button-styles`, y el baseline guarda las formas mutadas
(«Get A Free Estimate»). Si tu copy nuevo entra en una ruta con baseline, el texto
que se ve puede no ser el texto que escribiste.

======================================================================
ARTICLE STRUCTURE
======================================================================

No todos deben ser idénticos.

Pero normalmente usar:

Breadcrumb

Category

H1

Short lead

Hero image

Quick direct answer

Table of contents para artículos largos

Main sections H2/H3

Relevant images

Tables cuando ayuden

Contextual CTA

FAQ solamente si aporta valor

Related articles

Final commercial CTA

**EL CTA FINAL YA EXISTE COMO COMPONENTE COMPARTIDO.** `.cta-footer` se pinta en
~102 rutas y `.cta-page-section` en ~12 (mídelos con grep, no te fíes de estos
números). No escribas un CTA nuevo para el blog: reutiliza el que hay. Tocar esas
clases mueve 102 rutas de golpe y es alcance del frente HOME, no de éste.

Para el acordeón de FAQ mira `src/components/widgets/CollageFaq.astro` y
`src/styles/faq.css` antes de escribir uno.

======================================================================
TABLES
======================================================================

Usar tablas especialmente para:

comparisons

cost factors

project decisions

upgrade choices

material differences

timelines

tradeoffs.

Ejemplo:

| Factor | Why It Matters | Decision Impact |

No utilizar tablas solamente por SEO.

**UNA TABLA DE 3 COLUMNAS A 375 px ES UN DESBORDE HORIZONTAL** si no se declara
qué hace. Decide el patrón una vez (scroll contenido con `overflow-x:auto` y su
indicación visible, o reflow a lista de definiciones por debajo de 768) y aplícalo
a todas. `check:visual` fotografía 1920/1440/991/479, así que verde **no es
prueba** en la banda 480-767: aporta medida manual explícita a 600 px y 767 px.

======================================================================
ARTICLE SCHEMA
======================================================================

Auditar el schema actual.

Implementar correctamente donde corresponda:

Article / BlogPosting

BreadcrumbList

Organization relationship

Person SOLO cuando exista autor real.

No inventar autores.

FAQPage únicamente cuando sea técnicamente y editorialmente apropiado y
el contenido esté visible.

NO crear:

fake reviews
fake ratings
aggregateRating falso.

**DÓNDE VIVE ESTO AQUÍ.** `src/layouts/Base.astro` emite dos listas de bloques
JSON-LD: `jsonLd` (objetos) y `jsonLdCrudo` (cadenas del origen, servidas tal
cual). Y **ya desduplica `BreadcrumbList`** a propósito: emitir dos en la misma
página es peor que no emitir ninguna. Antes de añadir un bloque, mira qué emite ya
esa ruta:

```bash
grep -o 'application/ld+json' .vercel/output/static/blogs/<slug>.html | wc -l
```

`check:seo` compara `og:image` carácter a carácter contra el baseline en las rutas
que tienen origen. No lo muevas sin declararlo.

======================================================================
SEO METADATA
======================================================================

Cada blog necesita:

SEO title
meta description
canonical
OG metadata
social image
H1
slug
structured data
published date
modified date cuando corresponda.

No cambiar modified date sin cambios editoriales reales.

**LA FUENTE ÚNICA, Y CUÁL USAR.** `src/data/meta-propia.json` es la fuente única
de los `<title>` y `meta description` que se apartan del origen de Webflow: lo lee
`Base.astro` (que los emite) y `check-seo.mjs` (que los exige), una sola copia,
imposible que se desincronicen. Cada entrada lleva su motivo escrito.

**Pero las rutas servidas desde Sanity NO van ahí.** Su meta vive en Sanity y es
contenido del cliente — es lo que ya pasa con las 53 de `/pool-builders/`, y está
dicho literalmente en la cabecera de `meta-propia.json`. Los blogs, al pasar a
Sanity en la Fase 2, siguen esa regla: su `seo.title` y `seo.description` salen
del documento, no del JSON.

`og:image` y `twitter:image` **tienen que ser absolutas**: los rastreadores
sociales no resuelven relativas. `Base.astro` ya las absolutiza y pone un
`og:image` por defecto si falta; verifica que el tuyo llega.

======================================================================
INTERNAL LINKING
======================================================================

Cada blog debe pertenecer a un cluster.

NINGÚN BLOG HUÉRFANO.

Cada artículo debe enlazar naturalmente hacia:

PRIMARY:
relevant service page — una de las 14 de `/services/`.

SECONDARY cuando aplique:

- Pool Cost Estimator → `/pool-cost-estimator`;
- Project Gallery → `/projects` o `/gallery`;
- Financing → `/financing`;
- Contact → `/contact-us` o `/request-estimated`;
- Gainesville page → `/pool-builders/gainesville-florida`;
- Ocala page → `/pool-builders/ocala-florida`;
- related services;
- related articles.

Utilizar descriptive anchor text.

No usar “click here” constantemente.

**`check:enlaces` ES LA PUERTA DE ESTO Y NO PERDONA.** Valida que ningún enlace
interno apunte a una URL que no existe o que solo existe vía redirect. Los slugs
de ciudad son los de Sanity (`ocala-florida`, no `pool-builders-ocala-florida`:
ése es uno de los 14 redirects permanentes). Sácalos del dato, no de la memoria:

```bash
node -e "const d=require('./_source/sanity-docs.json'); \
  console.log(d.filter(x=>x._type==='poolBuilder').map(x=>'/pool-builders/'+x.slug.current).join('\n'))"
```

======================================================================
BLOG → BLOG LINKING
======================================================================

Los artículos también deben crear rutas naturales hacia la próxima pregunta.

Ejemplo:

Pool Cost

→ Before You Build
→ Pool Upgrades
→ Choosing a Pool Builder

======================================================================
FASE 5 — BLOGS NUEVOS
======================================================================

ANTES de crear cualquiera:

comparar contra los blogs existentes.

Si existe mismo search intent:

MEJORAR EL ARTÍCULO EXISTENTE.

No crear duplicado.

La siguiente lista representa el editorial roadmap.

**CADA URL NUEVA CUESTA TRES DECLARACIONES, NO UNA.** Antes de crear la primera,
ten claro el trámite completo, porque olvidar uno pone una puerta en rojo o —peor—
la deja ciega en silencio:

1. **`src/pages/blogs/[slug].astro`** las construye todas desde Sanity: una ruta
   dinámica, no 90 ficheros. Esa es la ventaja entera de la Fase 2.
2. **`scripts/lib/rutas-propias.mjs`** — o `check:rutas` las marca como «de más» y
   sale ROJA. Con `/blogs/` ya siendo una familia dinámica, plantéate si declaras
   el prefijo o cada slug, y **escribe el motivo**: es lo que hace auditable la
   excepción. Léete la cabecera de ese fichero entera antes de decidir.
3. **`disenio/contratos.json`** con contrato `rediseno`, `fecha`, `sha` y `motivo`
   — **sin los tres, `check:visual` sale roja entera**. Y sin contrato, la ruta se
   SALTA EN SILENCIO, que es el fallo número 1 del sistema.
4. **`scripts/build-seo-ficheros.mjs`**, en `ADICIONES` — el sitemap es una
   ALLOWLIST: lo que no se añade, no sale. No hay «lista de excluidas» que mantener.

======================================================================
NEW POOL CONSTRUCTION
======================================================================

Crear solamente los que no estén cubiertos actualmente:

- How Much Does a Custom Pool Really Cost in Florida? 8 Decisions That Move the Price

- Before You Build a Pool in Florida: 12 Decisions to Make Before Excavation

- How to Choose a Pool Builder: 10 Questions to Ask Before You Sign a Contract

- What Makes a Pool Look Custom? 9 Design Choices That Transform the Backyard

- Pool & Spa or Pool Only? How to Decide Before Your Design Is Final

- Building a Pool in North Florida? What Gainesville & Ocala Homeowners Should Plan For

- 10 Pool Upgrades Worth Planning Before Construction Begins

Auditar/mejorar los artículos existentes relacionados con:

- Pool Construction Timeline
- Pool Permits
- Pool Construction Mistakes
- Complete Pool Construction Guide
- Luxury Pool Designs

NO duplicarlos.

======================================================================
COMPLETE POOL REMODELING
======================================================================

- How Much Does a Complete Pool Remodel Cost in Florida? What Actually Changes the Scope

- Remodel or Rebuild? How to Decide What Your Existing Pool Really Needs

- 9 Pool Remodeling Decisions That Can Make an Old Pool Feel Completely New

- Pool Resurfacing vs. Full Pool Renovation: What's the Difference?

- What Should You Upgrade During a Complete Pool Remodel?

- How Long Does a Complete Pool Remodel Take in Florida?

- Before & After Pool Remodel Ideas: 10 Changes With the Biggest Visual Impact

El contenido debe filtrar claramente:

complete renovation

vs.

minor repair / resurfacing-only intent.

======================================================================
ALUMINUM PERGOLAS
======================================================================

- How Much Does an Aluminum Pergola Cost in Florida? What Changes the Price

- Aluminum vs. Wood Pergolas in Florida: Which Makes More Sense Long Term?

- Attached vs. Freestanding Pergola: Which Layout Works Better for Your Backyard?

- Pergola vs. Louvered Roof: Which One Should You Build?

- Do You Need a Permit for a Pergola in Florida? What Homeowners Should Know

- 7 Pergola Design Decisions to Make Before Construction Starts

- Building a Pergola Beside a Pool? 8 Features Worth Planning Together

======================================================================
MOTORIZED LOUVERED ROOFS
======================================================================

- Is a Motorized Louvered Roof Worth It in Florida?

- How Much Does a Motorized Louvered Roof Cost? 7 Factors That Change the Project

- Louvered Roof vs. Fixed Pergola: Which Gives You Better Outdoor Control?

- What Happens to a Louvered Roof During Florida Rain and High Winds?

- 7 Features to Compare Before Buying a Motorized Louvered Roof

- Lights, Fans, Screens & More: How to Design a Complete Louvered Roof System

- Questions to Ask Before Hiring a Louvered Roof Installer in Florida

IMPORTANT:

No duplicar el artículo:

Pergola vs Louvered Roof.

Debe existir una sola guía fuerte compartida.

======================================================================
OUTDOOR KITCHENS
======================================================================

- How Much Does a Custom Outdoor Kitchen Cost in Florida? What Actually Drives the Price

- 9 Decisions to Make Before You Choose Your Outdoor Kitchen Appliances

- Built-In Grill Island vs. Full Outdoor Kitchen: Which One Fits How You Entertain?

- Best Outdoor Kitchen Materials for Florida Heat, Humidity & Rain

- Gas, Electric, Plumbing: What Your Outdoor Kitchen Needs Before Construction

- The Outdoor Kitchen Layout Guide: How to Design Around the Way You Actually Cook

- Covered vs. Uncovered Outdoor Kitchen: What Works Better in Florida?

======================================================================
POOL SCREEN ENCLOSURES
======================================================================

- How Much Does a New Pool Screen Enclosure Cost in Florida? What Changes the Scope

- Should You Replace an Old Pool Cage or Keep Rescreening It?

- Panoramic vs. Traditional Pool Enclosures: Which Look Is Right for Your Backyard?

- What Should You Know About Wind Ratings Before Building a Pool Enclosure?

- 7 Design Decisions That Make a Pool Enclosure Feel More Open

- Pool Enclosure or Open Pool? The Florida Homeowner's Trade-Off Guide

- Planning a Pool Deck and Screen Enclosure Together? Start With These Decisions

======================================================================
PATIO SCREEN ROOMS
======================================================================

- Screen Room vs. Screened Patio vs. Pool Enclosure: What's the Difference?

- How Much Does a Screen Room Cost in Florida? What Changes the Project

- Before You Enclose Your Patio: 8 Decisions Florida Homeowners Should Make First

- Which Screen Mesh Should You Choose for a Florida Patio?

- Can a Screen Room Make Your Patio More Comfortable Year-Round?

- Do You Need a Permit to Enclose a Patio in Florida?

- Screen Room + Outdoor Kitchen: How to Design Both Without Compromising the Space

======================================================================
MOTORIZED RETRACTABLE SCREENS
======================================================================

- Are Motorized Retractable Screens Worth It for a Florida Patio?

- How Much Do Motorized Patio Screens Cost? What Changes the Installation

- Motorized Screens vs. a Fixed Screen Room: Which Is Better for Your Space?

- Privacy, Shade or Insect Control? How to Choose the Right Screen Mesh

- What Happens to Retractable Screens in Wind and Stormy Weather?

- Designing a Pergola or Outdoor Kitchen? When to Add Motorized Screens

- 7 Questions to Ask Before Choosing a Motorized Screen Installer

======================================================================
CUSTOM DECKS
======================================================================

- Composite vs. Wood Decking in Florida: Which Holds Up Better?

- How Much Does a Custom Deck Cost in Florida? 7 Factors That Change the Price

- Best Deck Materials for Florida Heat, Rain & Humidity

- Do You Need a Permit to Build a Deck in Florida?

- 7 Deck Layout Mistakes to Avoid Before Construction Starts

- Deck + Pergola: How to Plan Both as One Outdoor Living Space

- Designing a Deck for an Outdoor Kitchen? Plan These Details First

======================================================================
LANDSCAPING
======================================================================

- Landscaping Around a Pool: What to Plant—and What to Keep Away From the Water

- What Actually Drives the Cost of a Complete Backyard Landscape Project?

- Luxury Florida Landscaping Without the Constant Maintenance: What to Choose

- Privacy Landscaping Around a Pool: 9 Ways to Create Seclusion Without Closing In the Yard

- Drainage Before Landscaping: The Expensive Problem Homeowners Often Discover Too Late

- Landscaping vs. Hardscaping: Where Should You Invest in Your Backyard?

- Designing Landscaping Around a New Pool? Plan These Two Projects Together

======================================================================
SMART IRRIGATION
======================================================================

- Is a Smart Irrigation System Worth It for a Florida Home?

- Smart Irrigation vs. Traditional Sprinklers: What Actually Changes?

- Installing New Landscaping? Fix These Irrigation Issues Before the Plants Go In

- How to Design Irrigation Around Pools, Decks and Outdoor Living Areas

- Can You Use Less Water Without Sacrificing a Green Florida Landscape?

- 7 Signs Your Irrigation System Needs a Redesign—not Another Small Repair

- Planning Landscaping and Irrigation Together: What Homeowners Often Miss

======================================================================
OUTDOOR FURNITURE
======================================================================

Este cluster es supporting content y tiene prioridad menor.

- Best Outdoor Furniture Materials for Florida Sun, Rain & Humidity

- How to Furnish a Pool Area Without Making It Feel Crowded

- Built-In Seating vs. Outdoor Furniture: What Works Better for Your Backyard?

- Choosing Outdoor Fabrics That Can Handle Florida Weather

- How Much Space Do You Really Need Around an Outdoor Dining Table?

- How Designers Create Outdoor Living Areas That Feel Like Real Rooms

- When Should You Choose Furniture During a Backyard Design-Build Project?

======================================================================
STEEL BUILDINGS / POLE BARNS
======================================================================

- Pole Barn vs. Steel Building in Florida: Which Structure Fits Your Property?

- How Much Does a Steel Building Project Cost? What Changes the Scope

- What Florida Homeowners Should Know About Wind Load Before Building a Metal Structure

- Do You Need a Permit for a Pole Barn or Steel Building in Florida?

- Concrete Slab, Drainage & Site Prep: What Has to Happen Before the Building Goes Up

- How to Plan a Steel Building for RV, Boat, Equipment or Workshop Storage

- 7 Questions to Ask a Steel Building Contractor Before You Sign

======================================================================
SMART SOFFIT / LED LIGHTING
======================================================================

- Permanent Soffit Lighting vs. Landscape Lighting: Where Does Each Work Best?

- How Much Does Permanent Soffit Lighting Cost? What Changes the Installation

- 7 Smart LED Features Worth Considering Before Installation

- How to Light a Florida Home Without Making It Look Overdone

- Where Should Permanent Exterior Lights Actually Be Installed?

- Renovating Your Backyard? This Is When Exterior Lighting Should Be Planned

- Questions to Ask Before Installing Permanent Outdoor LED Lighting

======================================================================
CONTENT LENGTH
======================================================================

NO imponer una cantidad artificial de palabras.

La extensión depende de la intención.

Algunos artículos pueden requerir:

1,200–1,600 words.

Otros:

2,000–3,000+.

La regla es:

escribir hasta haber respondido completamente la decisión del usuario.

NO padding.

NO thin content.

======================================================================
FASE 6 — SERVICE PAGES + BLOG INTEGRATION
======================================================================

Esto es obligatorio.

Actualmente diferentes páginas pueden mostrar los mismos artículos genéricos.

Esto debe cambiar.

**Y AQUÍ NO ES «PUEDE»: ESTÁ MEDIDO Y CONFIRMADO.** `CarruselBlog.astro` pinta
los 10 posts en TODAS las rutas donde aparece —home, las 14 fichas de servicio,
los 9 condados, las 2 de Estado y las 53 de ciudad— porque el campo `categoria`
sale `null` en los 10 y el filtro nunca llega a aplicarse. El componente ya tiene
la prop `categoria` y la reserva escrita en su cabecera:

> «Sin prop, o sin coincidencias, salen todos — que es lo decidido con Sebastian:
> los 10 ahora, el filtro cuando existan las categorías.»

Ese día es hoy. El cambio es: rellenar `categoria` en el dato derivado de Sanity
y pasar la prop desde cada ficha. **No hay que regenerar las 14 fichas ni tocar
`build-paginas.mjs`** — por eso se hizo componente en su momento.

Mide el alcance real antes de tocarlo, no te fíes de los números de arriba:

```bash
grep -rlo 'class="blog-section-page"' .vercel/output/static --include='*.html' | wc -l
```

Cada página de servicio debe mostrar:

EXACTAMENTE 3 artículos altamente relacionados.

NO:

latest posts.

NO:

random posts.

NO:

mismos tres artículos para todos los servicios.

**CUIDADO CON LA RESERVA QUE YA TIENE EL COMPONENTE:** hoy, si una categoría no
tiene posts, `CarruselBlog` cae a mostrar los 10 en vez de dejar la sección vacía
—un carrusel de cero tarjetas es peor, y además cambiaría el texto de esa ruta sin
avisar—. Con el requisito de «exactamente 3», esa reserva deja de valer tal cual:
decide qué pasa con una categoría que tiene 1 o 2 artículos, escríbelo en el
componente y dilo en el informe. Lo que no puede pasar es que un servicio muestre
10 genéricos y nadie se entere.

**Y NO EMITAS `data-w-id` NUEVOS.** Las claves de reveal viven en
`src/data/reveals.json` y `check:ix2` fija las huérfanas en **14**: emitir un id
que no esté en el catálogo, o repetir uno de la home, mueve ese contador y pone la
puerta en rojo. La entrada por scroll, si la quieres, se añade en CSS.

======================================================================
SANITY RELATIONSHIP
======================================================================

Preferiblemente crear relaciones reales:

blogPost.relatedServices

o equivalente.

Cada service page debe consultar Sanity para obtener:

- artículos asociados al servicio;
- prioridad;
- featuredOnServicePage;
- displayOrder.

Si la estructura permite un control más preciso:

agregar algo similar a:

featuredOnServicePage = true

serviceCardOrder = 1 / 2 / 3

Esto permitirá cambiar artículos desde Sanity sin editar código.

**CÓMO LLEGA ESE DATO A UNA FICHA DE SERVICIO, QUE NO ES OBVIO AQUÍ.** Las 14
fichas de `/services/` son `.astro` derivados, no rutas dinámicas: no piden nada a
Sanity en build. Hay dos vías ya probadas en el repo y las dos conviven hoy:

- **Autolocalización por ruta**, como hace `CarruselBlog.astro:` se lee
  `Astro.url.pathname` contra un JSON por ruta (`blog-heading-por-ruta.json`), y
  el generador solo inserta `<CarruselBlog />` sin props. Es lo mismo que hace
  `ServiciosPorCategoria.astro:62-67` con `servicios-categoria.json`.
- **Props directas**, como hace `/pool-builders/[slug].astro`, que sí lee Sanity.

Para esto, la primera. El JSON por ruta se deriva de Sanity en build junto con
`blogs.json`, y entonces cambiar los 3 artículos de un servicio es editar el
documento en Sanity y reconstruir — **sin tocar código**, que es el requisito.

======================================================================
CUSTOM POOL CONSTRUCTION SERVICE PAGE
======================================================================

`/services/custom-pool-spa-builders-in-north-south-florida`

Mostrar preferiblemente:

1.
How Much Does a Custom Pool Really Cost in Florida?

2.
Before You Build a Pool in Florida

3.
10 Pool Upgrades Worth Planning Before Construction Begins

Section title:

Planning Your New Pool? Start Here

======================================================================
POOL REMODELING SERVICE PAGE
======================================================================

`/services/pool-remodeling-renovation-in-north-south-florida`

1.
How Much Does a Complete Pool Remodel Cost in Florida?

2.
Pool Resurfacing vs. Full Pool Renovation

3.
9 Pool Remodeling Decisions That Can Make an Old Pool Feel Completely New

Section:

Considering a Pool Renovation? Read These First

======================================================================
ALUMINUM PERGOLA
======================================================================

`/services/custom-aluminum-pergola-builders-in-north-south-florida`

1.
How Much Does an Aluminum Pergola Cost?

2.
Aluminum vs. Wood Pergolas

3.
Pergola vs. Louvered Roof

======================================================================
LOUVERED ROOF
======================================================================

`/services/motorized-louvered-roof-systems-in-north-south-florida`

1.
Is a Motorized Louvered Roof Worth It?

2.
How Much Does a Motorized Louvered Roof Cost?

3.
Pergola vs. Louvered Roof

======================================================================
OUTDOOR KITCHEN
======================================================================

`/services/custom-outdoor-kitchens-for-north-south-florida-homes`

1.
How Much Does a Custom Outdoor Kitchen Cost?

2.
Built-In Grill Island vs. Full Outdoor Kitchen

3.
The Outdoor Kitchen Layout Guide

======================================================================
POOL SCREEN ENCLOSURES
======================================================================

`/services/pool-screen-enclosures-for-north-south-florida-pools`

1.
How Much Does a New Pool Screen Enclosure Cost?

2.
Replace an Old Pool Cage or Keep Rescreening It?

3.
Panoramic vs. Traditional Pool Enclosures

======================================================================
PATIO SCREEN ROOMS
======================================================================

`/services/patio-screen-rooms-enclosures-in-north-south-florida`

1.
Screen Room vs. Screened Patio vs. Pool Enclosure

2.
How Much Does a Screen Room Cost?

3.
Before You Enclose Your Patio

======================================================================
RETRACTABLE SCREENS
======================================================================

`/services/motorized-retractable-screens-in-north-south-florida`

1.
Are Motorized Retractable Screens Worth It?

2.
Motorized Screens vs. Fixed Screen Room

3.
Privacy, Shade or Insect Control?

======================================================================
CUSTOM DECKS
======================================================================

`/services/custom-deck-builders-in-north-south-florida`

1.
Composite vs. Wood Decking in Florida

2.
How Much Does a Custom Deck Cost?

3.
7 Deck Layout Mistakes to Avoid

======================================================================
LANDSCAPING
======================================================================

`/services/professional-landscaping-services-in-north-south-florida`

1.
Landscaping Around a Pool

2.
Privacy Landscaping Around a Pool

3.
Designing Landscaping Around a New Pool

======================================================================
SMART IRRIGATION
======================================================================

`/services/smart-irrigation-system-installation-in-north-south-florida`

1.
Is Smart Irrigation Worth It?

2.
Installing New Landscaping? Fix These Irrigation Issues First

3.
Smart Irrigation vs. Traditional Sprinklers

======================================================================
OUTDOOR FURNITURE
======================================================================

`/services/premium-outdoor-furniture-for-north-south-florida-homes`

1.
Best Outdoor Furniture Materials for Florida

2.
How to Furnish a Pool Area Without Making It Feel Crowded

3.
How Designers Create Outdoor Living Areas That Feel Like Real Rooms

======================================================================
STEEL BUILDINGS
======================================================================

`/services/steel-building-pole-barn-construction-in-north-south-florida`

1.
Pole Barn vs. Steel Building

2.
How Much Does a Steel Building Project Cost?

3.
Concrete Slab, Drainage & Site Prep

======================================================================
SMART SOFFIT LIGHTING
======================================================================

`/services/smart-soffit-led-lighting-installation-in-north-south-florida`

1.
Permanent Soffit Lighting vs. Landscape Lighting

2.
How Much Does Permanent Soffit Lighting Cost?

3.
How to Light a Florida Home Without Making It Look Overdone

======================================================================
SERVICE PAGE ARTICLE CARDS
======================================================================

Cada card debe usar:

- blog image from Sanity;
- card title;
- excerpt;
- article link;
- category/service context.

NO hardcodear imágenes diferentes en las service pages.

La información debe venir de Sanity.

**EL TEXTO DE ESAS 14 RUTAS TIENE BASELINE.** Cambiar los 10 títulos de tarjeta
por 3 mueve el `innerText` de las 14 fichas —y de las 9+2+53 restantes donde se
pinte el carrusel—, y `check:texto` compara al 100 %. Está autorizado en este
encargo, pero se hace con los mecanismos declarativos de `check-texto.mjs`
(`TRADUCIDAS`, `REORDENADAS_A_PROPOSITO`, que admite `ruta` o `rutas` para no
repetir catorce veces el mismo bloque) o con re-baseline por lotes, y **se dice
cuál en el informe, ruta por ruta**.

======================================================================
SERVICE PAGE → BLOG → SERVICE LOOP
======================================================================

Crear relación bidireccional.

Service Page
→ Blog

y dentro del blog:

Blog
→ Service Page

Esto crea un verdadero content cluster.

======================================================================
LOCAL SEO
======================================================================

Primary North Florida focus:

Gainesville
Ocala
Alachua County
Marion County.

NO crear automáticamente artículos clonados como:

Pool Cost Gainesville
Pool Cost Ocala
Pool Cost Alachua
Pool Cost Marion

si todos responden exactamente lo mismo.

Preferir guías locales fuertes y únicas.

Ejemplo:

Building a Pool in North Florida?
What Gainesville & Ocala Homeowners Should Plan For

Linkear naturalmente hacia páginas locales existentes:

- `/pool-builders/gainesville-florida` y `/pool-builders/ocala-florida` — de las
  53 que sirve Sanity;
- `/country/custom-pool-builders-alachua-county-fl` y
  `/country/custom-pool-builders-marion-county-fl`;
- `/where-we-serve/north-florida`.

**Y NO REPITAS EL TRABAJO DE R20/R21.** Las 53 páginas de ciudad acaban de recibir
capa de captación, obra real y copy propio (commits `9ab8f28`, `5c74909`,
`27bc66e`; el encargo está en `PROMPT-R21-CIUDADES.md` y `docs/encargos/R20-CIUDADES.md`).
Lo que ya diga una página de ciudad sobre permisos o costes locales **no se
recontesta en un blog**: se enlaza. Dos páginas que responden lo mismo es
canibalización, y aquí ya hay 53 en juego.

======================================================================
SEO CANNIBALIZATION CHECK
======================================================================

Antes de publicar cada URL:

comparar:

primary topic
search intent
H1
title
entities
SERP purpose
existing article.

Si dos páginas compiten por exactamente la misma pregunta:

MERGE.

No publicar ambas.

**EL UNIVERSO CONTRA EL QUE HAY QUE COMPARAR NO SON SOLO LOS BLOGS.** Son las 115
rutas: las 14 fichas de servicio, las 112 subservicios, las 53 ciudades, los 9
condados y las 2 de Estado ya responden preguntas comerciales. El `<title>` y la
`meta description` de todas están en `baseline/seo.json` y en
`src/data/meta-propia.json`. Cruza contra eso:

```bash
node -e "const s=require('./baseline/seo.json'); \
  for (const [r,v] of Object.entries(s)) console.log(r+'\t'+(v.title||''))" | grep -i 'cost'
```

Es una consulta de texto sobre un JSON, no una barrida del sitio: gratis.

======================================================================
PRIORIDAD DE IMPLEMENTACIÓN
======================================================================

No sacrifiques calidad generando 90 artículos simultáneamente con contenido
superficial.

Trabajar por clusters.

PRIORITY 1:

New Pool Construction
Pool Remodeling

PRIORITY 2:

Pergolas
Louvered Roofs
Outdoor Kitchens
Pool Enclosures
Screen Rooms
Retractable Screens
Decks

PRIORITY 3:

Landscaping
Irrigation
Steel Buildings
Lighting
Furniture

Sin embargo, completar finalmente el roadmap aprobado siempre que no genere
duplicación.

**UN COMMIT POR CLUSTER**, con su código en el mensaje, y las puertas de ese
cluster en verde antes de pasar al siguiente. Así, si algo se tuerce a mitad, lo
que hay commiteado está medido y no hay que deshacer 90 artículos.

======================================================================
CONTENT QUALITY GATE
======================================================================

ANTES de publicar CADA artículo verificar:

1. Search intent satisfied?

2. Does it answer the core question early?

3. Does it contain original decision value?

4. Does it avoid generic AI filler?

5. Are factual claims verified?

6. Are cost claims supported?

7. Does it have appropriate imagery?

8. Does it have internal links?

9. Does it link to the correct service?

10. Does it have a logical CTA?

11. Is it different from existing content?

12. Is metadata unique?

13. Does it contain a valid canonical?

14. Does structured data match visible content?

15. Does it deserve to exist as an independent URL?

If no:

improve or merge it before publishing.

======================================================================
TECHNICAL SEO QA
======================================================================

For all blogs verify:

HTTP 200

indexable

correct canonical

unique SEO title

meta description

one H1

logical H2/H3

Article schema

Breadcrumb schema

Open Graph

images optimized

alt text

valid internal links

no broken images

no broken CTA

sitemap inclusion

mobile rendering

responsive tables

no horizontal overflow

no CLS regressions

no accidental noindex

no duplicate canonical.

**ESTO NO SE COMPRUEBA A OJO NI RUTA POR RUTA.** La mitad ya la cubren puertas
existentes, y el resto se mide con `grep`/`node` sobre `.vercel/output/static`,
que es HTML en disco:

| Qué | Con qué |
|---|---|
| HTTP 200, ninguna ruta de más | `npm run check:rutas` |
| canónica, noindex, title, description, og | `npm run check:seo` |
| enlaces internos y redirects declarados | `npm run check:enlaces` |
| imágenes existentes y con firma válida | `npm run check:assets` |
| un solo H1, jerarquía H2/H3, alt vacíos | un `node` con JSDOM sobre el build — `jsdom` ya es dependencia |
| canónica duplicada, `ld+json` duplicado | `grep -c` sobre cada HTML |
| sitemap | comparar `public/sitemap.xml` contra las rutas construidas |
| overflow horizontal y CLS | `check:visual` en las 2-3 representativas + medida manual a 600/767 |

Escribe el `node` de la jerarquía de encabezados **como script en `scripts/`**, no
como comando de usar y tirar: es una comprobación que hará falta cada vez que se
añada un artículo, y una puerta que no existe no protege nada. Y **rómpela una vez
a propósito y pega el rojo** — es la regla de la casa para toda puerta nueva.

======================================================================
SANITY QA
======================================================================

Verificar:

- every article exists in Sanity;
- no duplicate slugs;
- images are connected;
- categories work;
- related services work;
- featured article works;
- publish status works;
- dates work;
- related posts work;
- SEO fields work;
- queries do not fetch drafts in production;
- preview/draft mode remains correct if implemented.

**EXTIENDE `scripts/check-sanity.mjs`, NO ESCRIBAS OTRO.** Esa puerta ya compara
el dataset REAL contra `_source/sanity-docs.json` por tipo y por conteo, y ya trae
resuelta la trampa del token: una lectura ANÓNIMA de un dataset público devuelve
los borradores como **0**, no como error — la puerta daba rojo diciendo «0
borradores» con los 8 ahí. Los `drafts.*` solo se ven autenticado.

Lo de «queries do not fetch drafts in production» tiene una forma concreta aquí:
el filtro `!(_id in path("drafts.**"))` que ya usa esa puerta. Ponlo en la GROQ de
`[slug].astro` o un borrador a medio escribir sale publicado en el sitio.

Y actualiza `_source/sanity-docs.json` cuando añadas documentos: es la referencia
contra la que mide la puerta. Si no, la puerta te dirá que sobran 90.

======================================================================
PERFORMANCE
======================================================================

La página de blogs no debe degradarse debido al volumen.

Optimizar:

Sanity queries
image loading
server/client rendering
pagination
filter behavior
bundle size.

No descargar todos los Portable Text documents únicamente para mostrar
cards.

La consulta del archive debería solicitar solo los campos necesarios.

**Y AQUÍ ES EN BUILD, NO EN RUNTIME.** El sitio es estático: la GROQ del índice
corre una vez, en `npm run build`. Pedir los 100 Portable Text completos para
pintar tarjetas no ralentiza al visitante — ralentiza el build y engorda el JSON
horneado, que eso sí viaja. Proyecta solo `title, cardTitle, slug, summary,
image, categoria, publishedAt`.

El `check:visual` mide píxeles, no peso. Para el peso, pega el tamaño del bundle
antes y después: `du -sh .vercel/output/static/_astro` y el peso del HTML de
`/blogs-tips`.

======================================================================
BLOG PAGE FILTER SEO RULE
======================================================================

Los filtros de UI no deben crear cientos de combinaciones indexables.

Si implementas query params como:

?category=
?search=

asegúrate de no crear duplicate-indexing problems.

Category archive pages pueden ser indexables solamente cuando tengan
suficiente valor editorial y contenido único.

Search-result pages normalmente no deberían formar parte del índice.

**EN ESTE SITIO HAY UNA SALIDA MÁS LIMPIA Y ES LA PREFERIDA:** con filtro en
cliente y sin query params, no hay nada que desindexar. Si aun así usas params,
la canónica de `/blogs-tips?category=x` tiene que apuntar a `/blogs-tips` — y eso
lo emite `Base.astro`, así que hay que declararlo ahí, no confiar en que Google lo
deduzca. Y el sitemap es allowlist: una URL con param no entra salvo que alguien
la añada a mano en `ADICIONES`.

======================================================================
BUILD & TEST
======================================================================

Después de implementar:

run:

```bash
git fetch origin && git merge --ff-only origin/main   # el árbol es compartido
npm run check:tokens                                   # estática, <1 s
npm run build                                          # sobrescribe .vercel/output/static
npm run check:rutas && npm run check:enlaces && npm run check:seo
node scripts/check-sanity.mjs
node scripts/check-texto.mjs  <tus rutas>              # NUNCA con '/'
node scripts/check-visual.mjs <tus rutas>              # de una en una, Chromium visible
```

No hay `lint` ni `typecheck` separados en este repo: `astro build` hace el
type-check de los `.astro`, y las puertas son los tests. La lista completa de las
que corren en `npm run check` está en `package.json` — **no la corras entera**:
son las 115 rutas y ~65 min de pantalla secuestrada. Acota.

Corregir todos los errores causados por los cambios.

NO ocultar warnings importantes.

**Y ACUÉRDATE DE LOS DOS FICHEROS QUE EL BUILD ENSUCIA**: `public/robots.txt` y
`public/sitemap.xml`. Revisa su diff antes de commitear. Un `Disallow: /` que se
cuela desindexa el sitio entero, y es el fallo que más caro sale de toda esta lista.

======================================================================
VISUAL QA
======================================================================

Revisar como mínimo:

Desktop

Tablet

Mobile

para:

/blogs-tips

blog detail

Pool Construction service

Pool Remodeling service

y varias páginas de servicios secundarios.

Verificar:

cards
filter
search
buttons
image crops
titles
overflow
spacing
mobile interaction.

**CÓMO SE HACE ESTO SIN BARRER EL SITIO.** `check:visual` fotografía 1920 / 1440 /
991 / 479 sobre el build y compara contra `baseline/shots/` — headless para ti,
sin gastar contexto, y mide mejor que mirar. Córrelo acotado a esas rutas.

Lo que la puerta NO ve, y por tanto sí hay que mirar a mano:

- **la banda 480-767 y el salto 991→992**: verde a 479 y a 991 no es prueba ahí.
  Una regla `min-width:480` es INVISIBLE a 479, igual que una `min-width:992` lo
  es a 991. Mide explícitamente 600 px, 767 px y el par 991/992;
- **las rutas nuevas**, que no tienen referencia: ahí van `ui-qa` + `audit`, y
  **solo sobre `/blogs-tips` y 2-3 fichas representativas**, como dice el bloque
  de arriba. No una por artículo;
- **la interacción**: buscador, chips, «Load More», foco con teclado. Eso se
  prueba una vez, en una ruta, y vale para la plantilla.

Abre el panel del navegador para mirar UNA ruta, mírala, y ciérralo. No lo dejes
corriendo mientras piensas o escribes.

======================================================================
FINAL REPORT
======================================================================

Cuando termines, entregar un reporte exacto.

Va en `docs/informes/BLOG-SANITY-INFORME.md` y su resumen en la entrada nueva de
`MIGRACION-LOG.md`. **Un número sin el comando que lo produjo es una opinión:**
pega la salida literal de cada puerta, no la resumas.

SECTION 1
EXISTING BLOGS DISCOVERED

| URL | Article | Sanity Status | Action |

SECTION 2
EXISTING BLOGS IMPROVED

| Article | What Changed | Cómo pasó check:texto (TRADUCIDAS / re-baseline) |

SECTION 3
NEW ARTICLES CREATED

| Article | URL | Category | Service | CTA | Image |

SECTION 4
ARTICLES MERGED / NOT CREATED

Explicar cualquier caso eliminado por:

- duplicate intent;
- cannibalization;
- insufficient value.

SECTION 5
SANITY CHANGES

Schemas
fields
queries
migrations
validation
+ si se desplegó el schema al dataset y con qué comando.

SECTION 6
BLOG INDEX IMPROVEMENTS

Search
filters
categories
pagination/load more
featured article
responsive design.

SECTION 7
SERVICE PAGE INTEGRATION

Para cada service:

Service
→ Blog 1
→ Blog 2
→ Blog 3.

SECTION 8
INTERNAL LINKS CREATED

SECTION 9
IMAGES USED

Con su ruta real bajo `public/images/`, y de dónde salió la elección (qué hoja de
contactos se miró).

SECTION 10
SEO CHANGES

Metadata
schema
sitemap
canonical
breadcrumbs
redirects
+ declaraciones nuevas en `rutas-propias.mjs`, `contratos.json` y `ADICIONES`.

SECTION 11
BUILD / TEST RESULTS

La salida LITERAL de cada puerta que corriste, y **la lista de las que NO
corriste, con el motivo**. Una puerta que no corrió no es una puerta verde: falla
ABIERTO, y decirlo es parte del entregable.

SECTION 12
ANY REMAINING RISKS

SECTION 13
RE-BASELINE APLICADO

Qué rutas se re-baselinizaron, en qué lotes, con qué `sha` y `motivo` en
`contratos.json`, y **el diff del texto congelado**. Es el único acto irreversible
del sistema: si no queda escrito aquí, nadie podrá saber después qué se congeló.

SECTION 14
DESPLIEGUE

Commits (código y mensaje), PR si lo hubo, merge a main, y la verificación de que
el despliegue publicó: estado por `gh api repos/:owner/:repo/commits/<sha>/statuses`
y el hash del bundle servido. (El MCP de Vercel da 403 en esta cuenta; se verifica
por GitHub.)

======================================================================
DO NOT STOP AFTER AUDIT
======================================================================

Esto NO es una solicitud de recomendaciones.

Es una tarea de implementación.

Debes:

AUDIT
↓
PLAN
↓
IMPLEMENT
↓
WRITE
↓
MIGRATE TO SANITY
↓
CONNECT IMAGES
↓
BUILD BLOG FILTERS
↓
BUILD SEARCH
↓
CONNECT SERVICE PAGES
↓
ADD INTERNAL LINKS
↓
IMPLEMENT SEO
↓
VALIDATE
↓
BUILD
↓
TEST
↓
COMMIT
↓
DEPLOY
↓
REPORT.

No detenerte únicamente entregando un strategy document.

Sebastian verifica AL FINAL, sobre el informe y el sitio desplegado. No le vayas
pidiendo aprobación paso a paso: el informe es la entrega.

**LO ÚNICO QUE SÍ DEBE PARARTE** es encontrar trabajo ajeno a medias en el árbol
compartido, o una puerta en rojo que no sabes explicar. Eso se dice; no se
atropella.

======================================================================
FINAL STANDARD
======================================================================

Para CADA artículo hazte estas preguntas:

“Would a Florida homeowner considering a meaningful investment genuinely
want to read this?”

“Does the page answer an important decision better than generic search
content?”

“Can Google clearly understand what question this page answers?”

“Can an AI retrieval system understand and accurately summarize the
important information?”

“Does this content reinforce Mr. & Mrs. Outdoor Living as an authority on
the subject?”

“Does the article create a natural path toward the appropriate commercial
service?”

“Does this page provide enough unique value to deserve its own URL?”

Si la respuesta es NO:

NO publiques contenido mediocre.

Research it.
Rewrite it.
Merge it.
Or do not create the URL.

FINAL OBJECTIVE:

Create a scalable Sanity-powered content authority system in which:

SEARCH / AI DISCOVERY
→ HIGH-QUALITY BLOG
→ RELATED EDUCATION
→ RELEVANT SERVICE
→ PROJECT PROOF
→ COST / FINANCING
→ CONSULTATION / ESTIMATE
→ QUALIFIED LEAD

The objective is NOT maximum blog count.

The objective is:

AUTHORITATIVE CONTENT
+
STRONG SEARCH INTENT
+
GREAT USER EXPERIENCE
+
SANITY CMS CONTROL
+
TOPICAL AUTHORITY
+
AI/SEARCH READABILITY
+
COMMERCIAL RELEVANCE
+
QUALIFIED LEADS.
