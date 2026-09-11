# Encargo — SEO + AEO + GEO: auditar, implementar y dejar en producción

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5 estático, adaptador Vercel, 121 URLs vivas).
Lee **antes de tocar nada**, y en este orden: `CLAUDE.md` (reglas de la casa),
`docs/encargos/00-PRINCIPIOS.md` (principios del programa R — con la excepción del §3 de aquí),
y `docs/encargos/SEO-URLS-PLAN.md` (la auditoría de solo lectura que ya está hecha: **no la
repitas, ejecútala**).

Trabaja **de forma autónoma de principio a fin**. Este encargo **sí autoriza** construir,
commitear y desplegar a producción (`CLAUDE.md §3` cede el permiso del director para este
encargo, y solo para este). Para en seco únicamente ante lo que el §11 marca como decisión de
Sebastian.

---

## 1 · Qué se pide

Dejar `mrandmrsoutdoorliving.com` con **todo lo controlable optimizado y publicado**: imágenes,
páginas, enlaces, URLs, estructura, datos estructurados, copy y SEO técnico — para captar
clientes de piscinas y outdoor living en Florida por búsqueda orgánica, por respuesta directa
(featured snippets, voz) y por motores generativos (ChatGPT, Perplexity, Gemini, AI Overviews).

Las tres siglas, desambiguadas, porque en este negocio dos de ellas se solapan:

| | Qué es aquí | Dónde se juega |
|---|---|---|
| **SEO** | Búsqueda clásica de Google | `<head>`, arquitectura de URLs, enlazado, CWV, contenido |
| **AEO** | Answer Engine Optimization — snippet, People Also Ask, voz | `FAQPage`, respuestas de 40-55 palabras arriba del bloque, tablas, listas |
| **GEO** | Generative Engine Optimization — que un LLM te cite | Entidad clara, datos verificables y atribuibles, `sameAs`, consistencia entre fuentes |
| **(geo local)** | El otro GEO, el geográfico | `LocalBusiness` completo, NAP, 53 ciudades + 9 condados, GBP |

**Los cuatro entran en el alcance.** Cuando este documento diga «GEO» a secas se refiere al
generativo; el geográfico se nombra siempre «local».

**Una línea de honestidad, y no se repite:** «primer lugar» no se promete ni se puede
garantizar — depende de competencia, autoridad de dominio y tiempo. Lo que este encargo hace es
llevar al máximo **todo lo que está bajo nuestro control** y dejarlo medido, de forma que la
posición dependa solo de lo que no controlamos. No inventes previsiones de ranking en el
informe.

---

## 2 · Punto de partida — VERIFICADO el 7-sep-2026, no lo redescubras

Todo lo de este bloque está medido en esa fecha con los comandos que se citan. Reverifica lo
que vayas a tocar (el repo avanza), pero **no gastes una fase en redescubrirlo**.

### Las cuentas — y son las correctas

Composio, org `sebastian_workspace`, usuario `sebastian@senaviacorp.com`. Hay conexiones
**propias de esta marca**, distintas de las genéricas de Senavia. Usa estas y solo estas:

```
GSC    google_search_console_eyah-surahi    alias «mr and mrs outdoor living»
GA4    google_analytics_crout-hillet        alias «mr and mrs outdoor living»
DNS    cloudflare_blab-squad                alias «mr-&-mrs-outdoor-living»
CMS    sanity_raker-uranic                  alias «mr-&-mrs-outdoor-living»
Vercel vercel_goral-format                  alias «senavia-corp» (el equipo, no la marca)
```

Comprobado, con salida real:

- **Search Console** → `sc-domain:mrandmrsoutdoorliving.com`, permiso `siteOwner`.
  Es propiedad de **dominio**, así que cubre apex, `www` y subdominios de una vez.
- **GA4** → cuenta `accounts/369710957` «Mr and Mrs Outdoor Living», propiedad
  `properties/506563956` «mrandmrsoutdoorliving.com», `canEdit: true`.
- **Vercel** → proyecto `mrandmrs-outdoor-living`, `prj_vjnQhNx0pAEV60vOFBc4DsE21Mjz`,
  equipo `team_S7aSWbSFopAYosvDC7LIdMUS` (`.vercel/project.json`).
- **GTM** → `GTM-N9BWB3BV`, inyectado en `src/layouts/Base.astro:245`.

> ⚠️ **El Hallazgo 11 de `SEO-URLS-PLAN.md` está OBSOLETO.** Decía que Composio no tenía
> propiedad de esta marca. Eso era cierto contra la conexión genérica
> `sebastian@senaviacorp.com`; hoy existen las dos conexiones dedicadas de arriba. Corrige ese
> hallazgo en el informe final en vez de arrastrarlo.

### Lo que Google ve hoy

```
sitemap.xml        113 URLs enviadas · 0 errores · última descarga 2026-08-29
page-sitemap.xml   1021 URLs enviadas · 1 ERROR · última descarga 2025-09-29  ← de Webflow, zombi
tráfico 28 días    ~20 clics, casi todo marca («mr and mrs outdoor living», pos. 1.08)
```

Tres cosas que salen de ahí, y son trabajo real:

1. **El sitemap enviado dice 113; producción sirve 121.** Se descargó el 29-ago, antes de los
   últimos despliegues. Hay que reenviarlo.
2. **`page-sitemap.xml` es un fósil de Webflow con 1 error y 1021 URLs** que ya no existen.
   Sigue enviado. Hay que retirarlo.
3. **El sitio es casi invisible fuera de marca.** ~20 clics/28 días con 121 páginas publicadas
   es el perfil de un dominio recién migrado: no hay nada que «recuperar», hay que construir.
   Esto es una oportunidad, no una emergencia — pero fija la prioridad: **indexación primero,
   refinamiento después.**

> 🚨 **Trampa de la API, y ya engañó a un informe:** el campo `indexed` de
> `GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS` devuelve `"0"` **siempre**. Google dejó de poblarlo
> hace años. **No reportes «0 páginas indexadas» a partir de ese número.** La indexación real
> se mide con `GOOGLE_SEARCH_CONSOLE_INSPECT_URL` por URL, o con el informe de cobertura en la
> interfaz. Un dato que la API no da no es un dato: es un hueco (`CLAUDE.md §2`).

### Datos estructurados que ya existen — y los huecos

Contado sobre `src/` con `grep -o '"@type"'`:

```
tiene:  ImageObject 139 · Question/Answer 75+75 · LocalBusiness 55 · PostalAddress 54
        GeoCoordinates 54 · Organization 53 · WebPage 40 · BlogPosting 20 · Service 16
        FAQPage 15 · BreadcrumbList 12 (ListItem)

falta:  sameAs ............ 0 ficheros  ← mata el GEO generativo: sin esto no hay entidad
        aggregateRating ... 0 ficheros
        openingHours ...... 0 ficheros
        priceRange ........ 1 fichero
        BreadcrumbList .... 1 fichero (12 ListItem, pero un solo sitio los usa)
```

Y el hueco grande, medido: **`LocalBusiness` solo vive en 3 sitios** —
`src/data/seo-pool-builders.json` (las 53 de ciudad) y las 2 de `where-we-serve/`. **No está en
la home, ni en `/contact-us`, ni en ninguna `/services/*`.** Peor: su dirección está vacía de
contenido útil —

```json
"address":{"@type":"PostalAddress","addressCountry":"US","addressRegion":"FL"}
```

sin calle, sin ciudad, sin código postal, sin `telephone`. Para local y para GEO eso es casi
como no tenerla.

**NAP disponible** (`src/data/telefonos.json`): `+1 (352) 740-3361` North Florida ·
`+1 (954) 913-7112` South Florida · `info@mrandmrsoutdoorliving.com`. **La dirección postal no
está en el repo — la pide Sebastian (§11).**

### Los hallazgos abiertos del plan previo

`docs/encargos/SEO-URLS-PLAN.md` los dejó diagnosticados y **sin aplicar**, por diseño. Son la
Fase 1 de este encargo, ya sin trabajo de diagnóstico:

| # | Sev | Qué | Dónde |
|---|---|---|---|
| 1 | ALTO | `link-text`: «See More» ×14 y «Read More» ×10 — único audit que impide 100/100 SEO en Lighthouse | `src/data/servicios-categoria.json`, `src/data/blogs.json`, `src/pages/index.astro` (`S_BLOG`) |
| 2 | ALTO | 8 `/project/*` con JSON-LD que **no parsea** (carácter de control sin escapar en `description`) | `src/pages/project/*.astro`, const `LD_CRUDO` |
| 3 | ALTO | 3 páginas propias **huérfanas**, 0 enlaces internos entrantes | ver plan |
| 4 | MEDIO | `/brochures` sin meta description ni JSON-LD | `src/pages/brochures.astro` |
| 5 | MEDIO | Los 2 estimadores sin ningún `<h1>` | `pool-cost-estimator`, `pool-investment-estimator` |
| 6 | MEDIO | 18 `<title>` > 60 caracteres | varias |
| 7 | MEDIO | 10 meta description > 160 caracteres | `/about` (171), … |
| 8 | MEDIO | CLS > 0.1 en 3 de 6 plantillas | varias |
| 9 | BAJO | Colisión `/where-we-serve` vs `where-we-serves/` (ya hay 2 redirects) | `vercel.json` |
| 10 | INFO | LCP anómalo local (56 s) — **medida local, probablemente pesimista**; remedir contra producción | `/`, `/pool-builders/*`, `/services/*` |

El **mapa de redirects del Tier 1** y la **consolidación geográfica del Tier 2** ya están
redactados al final del plan. El Tier 2 (mover 64 URLs) **no se ejecuta sin Sebastian** (§11).

---

## 3 · La decisión que hace este encargo posible: se levanta el Principio 2

`docs/encargos/00-PRINCIPIOS.md §2` dice, literalmente, que el texto no se toca, que
`check:texto` **no se re-baseliniza nunca**, y que «el texto se reescribe después, **en otro
programa**».

**Este encargo es ese otro programa.** Sebastian lo ha pedido explícitamente («que el copy esté
totalmente optimizado»). Sin esta cláusula te estrellarías contra dos puertas rojas y te
quedarías parado, que es exactamente lo que pasó la última vez que alguien tocó copy aquí.

Consecuencia mecánica, y no es negociable el cómo:

- **`check:texto`** compara `innerText` al 100 % contra `baseline/text/`. Cualquier palabra que
  cambies la pone roja.
- **`check:seo`** compara `<title>` y `meta description` **carácter a carácter** contra
  `baseline/seo.json`. Cualquier meta que reescribas la pone roja.

**Cómo se hace bien** (elige por caso, no una regla única):

1. **Cambios acotados** (unas pocas rutas): usa los mecanismos de declaración que ya existen —
   `TITULO_PROPIO` en `scripts/check-seo.mjs:37` (Map ruta→título, ya tiene 3 entradas y **debe
   casar con `TITULO_PROPIO` de `build-paginas.mjs`**), y `LINEAS_ANADIDAS` /
   `ANADIDAS_A_PROPOSITO` / `QUITADAS_A_PROPOSITO` en `scripts/check-texto.mjs`.
2. **`check-seo.mjs` no tiene equivalente para `description`.** Añádelo: un `META_PROPIA`
   (Map ruta→`{title, description}`) espejo de `TITULO_PROPIO`, con el mismo comentario de por
   qué existe. No metas descripciones sueltas en `TITULO_PROPIO`.
3. **Reescritura masiva de copy** (una plantilla entera, decenas de rutas): declararlas una a
   una llenaría el fichero de copy duplicado — el propio `check-texto.mjs:497` rechaza eso por
   escrito. Ahí **re-capturas la referencia** de esas rutas, **en un commit aparte, solo de
   baseline, con el porqué en el mensaje**, para que el diff sea revisable. La puerta sigue
   viva y exacta para todas las demás rutas.

🚨 **Lo que NO vale:** re-baselinizar entero «para ponerlo verde». Si al final de este encargo
`baseline/text/` cambió en 115 rutas en un solo commit, la puerta ha muerto y nadie se enterará
hasta que un bug de copy llegue a producción.

Lo que **sigue intacto del Principio 2**: la identidad, la estructura de secciones y la
composición no se tocan (Principio 1). Esto es reescribir texto dentro de los huecos que ya
existen, **no** rediseñar.

---

## 4 · Trampas de este repo — medidas, no teóricas

1. **`PUBLIC_ES_PRODUCCION` falla cerrado.** Solo con `="1"` exacto se indexa. Cualquier
   auditoría sobre un build normal ve `Disallow: /` y sitemap vacío: **eso no es un fallo**.
   Audita con `PUBLIC_ES_PRODUCCION=1 npm run build`.
2. **Verifica sobre `.vercel/output/static`, nunca sobre `astro dev`** — dev no hornea
   `width`/`height` y las medidas mienten.
3. **No barras el sitio.** Nada de `ui-qa`, `carrusel-qa` ni `0.8.0:audit` por iniciativa
   propia: 115 rutas × anchos = ~65 min con la pantalla secuestrada, y ya hay queja por escrito.
   Deriva las rutas afectadas con `grep` sobre el HTML construido y mide solo esas. Si **este**
   encargo pide una auditoría por su nombre (§6 F9), esa sí se ejecuta.
4. **Nunca pases `/` como filtro** a `check-texto`/`check-visual`: casa por `includes()` y te
   lleva las 115. Para la home, coincidencia exacta **y con comillas**:
   `node scripts/check-visual.mjs '=/'`.
5. **`check:ix2` y `check:cascaron` no leen `argv`** — solo van en gate de fase completo.
6. **`npm run build` sobrescribe `.vercel/output/static`, que es artefacto compartido.** Puede
   haber otro chat sobre este árbol. Si vas a hacer varias pasadas largas, trabaja en
   `git worktree add --detach` (es lo que hizo el informe previo).
7. **`site` está en dos ficheros y tienen que decir lo mismo**: `astro.config.mjs` y
   `scripts/build-seo-ficheros.mjs`. `check:seo` ya compara el host del sitemap con el de las
   canónicas — no lo desactives.
8. **El sitemap lleva 113 del origen + adiciones deliberadas declaradas.** Si añades URLs,
   decláralas en el bloque de adiciones de `build-seo-ficheros.mjs` con su motivo, no las
   mezcles con las 113.
9. **Una puerta que no corrió no es una puerta verde.** Si se salta por falta de referencia,
   dilo: falla **abierto**.
10. **`/thank-you` lleva `noindex` también en producción, y está bien así.** Está declarado en
    `NOINDEX_A_PROPOSITO`. No lo «arregles».
11. **El español de estos sitios es el de Florida**: pies y mph, «con licencia»,
    `code enforcement`. El copy público del sitio es **en inglés** — no lo traduzcas.

---

## 5 · Línea roja del contenido

Este es un contratista real con obra real. **Ni una afirmación que no puedas sostener.**

- **`AggregateRating` solo con reseñas reales.** Existen en `src/data/resenas.json` y hay una
  puerta, `check:resenas`. Marcar valoraciones inventadas, o marcar reseñas propias en la
  página de la organización, viola las políticas de Google y puede costar una acción manual.
  Si los datos no dan para un `aggregateRating` legítimo, **no lo pongas** y dilo en el informe.
- **Nada de licencias, premios, años de experiencia, número de proyectos o certificaciones que
  no estén ya en el sitio o los confirme Sebastian.** El copy nuevo se construye sobre hechos
  existentes; si un hueco pide un dato que no tienes, pídelo en el informe (§11).
- **Ninguna imagen generada por IA donde el visitante entienda «esto lo construimos nosotros»**
  (Principio 3). Hay 10 galerías de proyectos, 14 de residenciales y 3 vídeos de obra propia.
- **Nada de contenido escalado sin valor**: no generes 53 variantes de la misma página de
  ciudad cambiando el topónimo. Eso es exactamente lo que Google penaliza desde la política de
  *scaled content abuse*, y estas 53 páginas ya existen — **audítalas por duplicación real
  antes de tocarlas** (§6 F6).

---

## 6 · Las fases

Cada fase termina con sus puertas verdes y una entrada en `MIGRACION-LOG.md`. **Commit por
fase**, no un commit gigante al final.

### F0 · Identidad, línea base y presupuesto de trabajo

1. Verifica las cinco conexiones del §2 con `composio connections list`. Ejecuta
   `GOOGLE_SEARCH_CONSOLE_LIST_SITES --account google_search_console_eyah-surahi` y
   `GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES --account google_analytics_crout-hillet`.
   **Si no devuelven exactamente `sc-domain:mrandmrsoutdoorliving.com` y
   `properties/506563956`, PARA** y repórtalo: estarías optimizando a ciegas o contra otra
   marca.
2. Baja los datos que van a dirigir las decisiones, **no inventes keywords**:
   - `SEARCH_ANALYTICS_QUERY` a 90 días por `query`, por `page`, y por `query`×`page`.
   - Separa marca de no-marca. Las consultas con impresiones y posición 8-20 son la lista de
     oportunidad: ahí un cambio de título mueve la aguja hoy.
   - GA4: páginas de entrada, conversiones de formulario, y qué rutas no reciben nada.
3. `PUBLIC_ES_PRODUCCION=1 npm run build` y captura el inventario de partida (head + grafo de
   enlaces + slugs) — hay script de referencia en la metodología de `SEO-URLS-PLAN.md`.
4. Escribe `docs/encargos/SEO-AEO-GEO-PLAN.md` con el mapa keyword→URL **derivado de los datos
   reales**, no de intuición. Una URL objetivo por intención; marca canibalizaciones.

### F1 · SEO técnico — cerrar los 10 hallazgos abiertos

Aplica la tabla del §2. El mecanismo exacto de los hallazgos 1 y 2 ya está resuelto en
`PROMPT-SEO-IMPLEMENTACION.md` — **léelo, no lo rediagnostiques.** Añade:

- `<title>` ≤ 60 y `description` ≤ 155 caracteres en las 121, **sin repetir ninguno**
  (`check:seo` ya exige unicidad de títulos — extiéndelo a descripciones).
- Escríbelos para **clic**, no para relleno: intención + diferenciador + zona.
- Encabezados: exactamente un `<h1>` por página, jerarquía `h2`/`h3` sin saltos.
- `hreflang` no aplica (un idioma, un país) — no lo añadas.

### F2 · Arquitectura de URLs, redirects y enlazado interno

- Aplica el mapa de redirects Tier 1 del plan como **adición** a los 14 que ya hay
  (`permanent: true`). **Verifica que ningún redirect encadena** (A→B→C): eso se corrige
  apuntando A→C.
- Cierra las 3 huérfanas (Hallazgo 3) con enlaces contextuales reales, no con un bloque de
  enlaces al pie.
- Enlazado interno con **texto de ancla descriptivo**: de las páginas de ciudad hacia el
  servicio que corresponde, y del servicio hacia las 3-5 ciudades con más demanda según F0.
  Profundidad de clic ≤ 3 en las 121.
- **Tier 2 (mover 64 URLs) queda a decisión de Sebastian** (§11). Si lo aprueba, va en fase
  propia con su mapa de 64 redirects generado, no improvisado.

### F3 · Datos estructurados — el mayor déficit medido

1. **`Organization` + `LocalBusiness` completos, en un solo sitio y reutilizados.** Hoy están
   dispersos y la dirección va vacía. Céntralo (p. ej. `src/data/negocio.json` consumido por
   `Base.astro`) e inclúyelo en la home, `/contact-us` y las de servicio, con:
   `name`, `url`, `logo`, `image`, `telephone` (los dos de `telefonos.json`), `email`,
   `address` **completa**, `geo`, `areaServed`, `openingHours`, `priceRange`, `founder` si
   procede, y **`sameAs` con todos los perfiles reales** (Google Business Profile, Facebook,
   Instagram — hay `src/data/instagram.json`, YouTube — hay `src/data/youtube.json`, Houzz,
   BBB, Yelp si existen). **`sameAs` es la pieza que hoy vale 0 y la que más pesa en GEO**: es
   cómo un LLM confirma que la entidad es real y la misma en todas partes.
2. **`Service`** en cada `/services/*` con `provider`, `areaServed`, `serviceType` y, si es
   defendible, `offers` con rango de precio.
3. **`BreadcrumbList` en las 121**, no en una sola. Google lo pinta en el SERP.
4. **`FAQPage`** donde haya FAQ visible en la página (ya hay 15) — **nunca marques FAQ que el
   usuario no ve**. Amplía cobertura a servicios y ciudades con preguntas reales de F0
   (las de People Also Ask y las consultas en forma de pregunta de GSC).
5. **`ImageObject`** con `contentUrl`, `width`, `height` y `caption` en las galerías.
6. Valida **el 100 %** con `JSON.parse` sobre el HTML construido —los 8 rotos del Hallazgo 2
   demuestran que aquí eso se cuela— y luego con el validador de schema.org / Rich Results.

### F4 · AEO — que la respuesta sea extraíble

- Cada página de servicio y cada post responde su pregunta principal **en las primeras 60
  palabras**, en un párrafo autónomo de **40-55 palabras** que se entienda sin contexto. Ese
  párrafo es lo que se lleva el snippet y lo que lee un asistente de voz.
- **Un `h2` en forma de pregunta** por cada duda real detectada en F0, con su respuesta
  inmediatamente debajo.
- Datos comparables en **tabla real** (`<table>`), no en imagen ni en `div`s: coste por tipo de
  piscina, plazos por fase, permisos por condado. Las tablas se extraen; las imágenes no.
- Listas numeradas para procesos (`¿cuánto tarda construir una piscina?` → pasos con plazos).
- Lenguaje natural de consulta: `how much does a pool cost in florida`, `pool permit
  requirements broward county` — tal y como la gente pregunta.

### F5 · GEO — que un LLM te cite

- **Entidad inequívoca**: nombre, zona de servicio y especialidad idénticos en el sitio, en el
  schema, en GBP y en los perfiles de `sameAs`. Una inconsistencia de NAP rompe la confianza de
  la entidad.
- **Cifras verificables y atribuibles** en el copy: plazos reales, condados servidos, tipos de
  permiso por jurisdicción. Un LLM cita lo que puede atribuir; el marketing vacío
  («los mejores de Florida») no se cita nunca.
- **Estructura citable**: encabezados descriptivos, párrafos autocontenidos, definiciones
  explícitas. Nada de información que solo exista dentro de una imagen o de un carrusel.
- **Fecha y autoría visibles** en los 10 posts (`datePublished`, `dateModified`, `author`).
- Evalúa `public/llms.txt` con las URLs principales y una línea por cada una. Es barato y no
  hace daño; si lo añades, decláralo en `build-seo-ficheros.mjs` como adición deliberada.
- **No** bloquees `GPTBot`, `PerplexityBot`, `ClaudeBot` ni `Google-Extended` en `robots.txt`:
  bloquearlos es renunciar a aparecer en respuestas generativas. Si `robots.txt` los bloquea
  hoy, quítalo y anótalo.

### F6 · Local — las 53 ciudades y los 9 condados

Aquí está el mayor volumen de páginas del sitio y el mayor riesgo.

1. **Audita duplicación real antes de tocar**: extrae el texto de las 53 y mide solapamiento.
   Si son la misma página con el topónimo cambiado, el arreglo **no** es escribir 53 textos
   nuevos a mano: es dar a cada una **algo que solo ella puede decir** — proyectos reales de esa
   zona, el condado y su `code enforcement`, plazos de permiso locales, barrios servidos.
   Prioriza por las ciudades con impresiones reales en F0; las que no tienen ninguna esperan.
2. `LocalBusiness` con `areaServed` correcto y **NAP idéntico** al de GBP, carácter a carácter.
3. Enlaza ciudad ↔ condado ↔ servicio en las dos direcciones.
4. **Google Business Profile**: comprueba con Composio si hay conexión (`composio search
   "google business profile"`). Si la hay, audita categorías, servicios, zona y coherencia NAP.
   Si no la hay, **no la crees** — pídela en §11. GBP es la mitad del SEO local de un
   contratista, y no está en el repo.

### F7 · Imágenes

- `alt` **descriptivo** en todas las de contenido (`""` explícito en las decorativas). Describe
  la obra, no la keyword: `Freeform pool with raised spa and travertine deck, Weston FL`.
- `width`/`height` horneados en las 121 (ya lo hace el build — **verifícalo**, es lo que evita
  CLS del Hallazgo 8).
- Nombres de fichero legibles y con sentido donde se puedan cambiar sin romper el manifiesto
  (`_source/assets-manifest.json` gobierna el mapeo — **no rompas ese mapa**; si el coste es
  alto, déjalo y anótalo).
- `loading="lazy"` salvo el LCP de cada página, que va `eager` + `fetchpriority="high"`.
- Formatos modernos con respaldo, y **peso**: el LCP del Hallazgo 10 apunta al vídeo del héroe.
- **Sitemap de imágenes** para las galerías: es tráfico real en este sector y hoy no existe
  (el `page-sitemap.xml` zombi tenía 1004 imágenes; ese volumen se ha perdido).

### F8 · Copy on-page

Bajo el §3 (Principio 2 levantado) y el §5 (línea roja). Reescribe **solo donde F0 diga que hay
demanda**, empezando por: home, las 14 de `/services/*`, `/about`, `/contact-us`, y las ciudades
prioritarias. Keyword principal en `h1`, `<title>` y primeras 100 palabras — **una por página**,
sin repetir intención entre páginas. Nada de densidad forzada. Cada CTA dice qué pasa al pulsar.

### F9 · Rendimiento y accesibilidad

- Remide con Lighthouse **contra producción**, no local (Hallazgo 10 dice que lo local miente).
  Objetivo: SEO 100/100 en las 6 plantillas; CWV en verde (LCP < 2,5 s, INP < 200 ms,
  CLS < 0,1).
- Corrige el CLS del Hallazgo 8 con dimensiones reservadas, no con parches.
- **Aquí sí**, y pedido por su nombre: `ui-qa` + `0.8.0:audit` **acotados a las rutas que hayas
  tocado**, derivadas con `grep` sobre el HTML construido. No al sitio entero.

### F10 · Puertas, despliegue y verificación en producción

```bash
npm run check:tokens                       # <1 s, siempre
npm run check:rutas && npm run check:enlaces && npm run check:seo
node scripts/check-texto.mjs  <subcadena>  # acotada por ruta
node scripts/check-visual.mjs <subcadena>  # 35-60 s por ruta × 4 anchos
npm run check                              # las 15, antes de desplegar
```

Antes de desplegar: **las 15 en verde, o cada roja explicada por escrito** con por qué es
correcta y dónde queda declarada. Recuerda que `--prebuilt` **no lee `vercel.json`** (commit
`624eed6`: los 14 redirects y las 5 cabeceras se fueron al vacío por eso). Despliega y verifica
**en el dominio real**:

```
todas las URLs del sitemap  → 200
todos los redirects         → 308, destinos en 200
robots.txt                  → User-agent: * / Allow: / / Sitemap:
canónicas                   → todas en www, mismo host que el sitemap
apex → www                  → 308
```

### F11 · Search Console — cerrar el círculo

1. **Retira `page-sitemap.xml`** (el zombi de Webflow con 1 error).
2. **Reenvía `sitemap.xml`** con las 121 y confirma que se descarga sin errores.
3. `INSPECT_URL` sobre una muestra representativa (home, 2 servicios, 2 ciudades, 1 proyecto,
   1 post) y **reporta el estado real de indexación** — recordando la trampa del §2.
4. Comprueba que GA4 `properties/506563956` recibe eventos tras el despliegue (hay
   `check:medicion`) y que la conversión de formulario dispara.
5. Deja escrito qué hay que mirar a 30 y 90 días: impresiones no-marca, consultas nuevas,
   posición media de las URLs objetivo del mapa de F0.

---

## 7 · Entregables

1. **Código en producción**, desplegado y verificado (§F10).
2. `docs/encargos/SEO-AEO-GEO-PLAN.md` — mapa keyword→URL, decisiones y lo que quedó fuera.
3. `docs/informes/SEO-AEO-GEO-INFORME.md` — antes/después con **cifras medidas**: Lighthouse
   por plantilla, cobertura de schema, títulos/descripciones fuera de rango, huérfanas,
   redirects encadenados. Corrige ahí el Hallazgo 11 obsoleto.
4. `MIGRACION-LOG.md` actualizado, una entrada por fase con la salida de los comandos.
5. **Un resumen en lenguaje llano para Sebastian**: qué cambió, qué esperar y cuándo, qué
   depende de él. Sin jerga.

---

## 8 · Criterio de aceptación — medible, no opinable

- [ ] Las 15 puertas verdes, o cada roja explicada y declarada.
- [ ] Lighthouse SEO **100/100** en las 6 plantillas, medido contra producción.
- [ ] **0** páginas sin `<title>` único, sin `description` única, o sin `<h1>`.
- [ ] **0** JSON-LD que no parsee, en las 121.
- [ ] **0** páginas huérfanas; profundidad de clic ≤ 3 en las 121.
- [ ] **0** redirects encadenados; todos los del mapa en 308 con destino 200.
- [ ] `LocalBusiness`/`Organization` completos con `sameAs` poblado, presentes en home,
      contacto y servicios.
- [ ] `BreadcrumbList` en las 121.
- [ ] **0** imágenes de contenido sin `alt`; `width`/`height` en todas.
- [ ] `sitemap.xml` con las 121 aceptado en GSC; `page-sitemap.xml` retirado.
- [ ] CWV en verde en las 6 plantillas medidas contra producción.
- [ ] GA4 recibiendo eventos y conversión de formulario disparando.

---

## 9 · Fuera de alcance

Rediseño visual o cambios de identidad (Principio 1) · mover el Tier 2 de 64 URLs sin
aprobación · crear perfiles o cuentas nuevas (GBP, redes) · campañas de pago · link building
externo · tocar DNS en Cloudflare · publicar en Sanity contenido que Sebastian no haya visto ·
barridos completos del sitio no pedidos.

---

## 10 · Cómo trabajar

Autónomo hasta el final. Fase → puertas → commit → log. Si una fase se atasca, **termina todas
las demás** y di exactamente qué quedó fuera y por qué (`CLAUDE.md`: una puerta que no corrió no
es verde). No pares a preguntar salvo lo del §11. Mensajes de commit en el estilo de la casa:
qué cambió y **por qué**, no qué fichero se tocó.

---

## 11 · Lo único que decide Sebastian — pregúntalo TODO junto, al llegar a F3, no al empezar

1. **Dirección postal del negocio** para `LocalBusiness`. Sin ella el schema local queda a
   medias. ¿Hay dirección física publicable, o es negocio de área de servicio (sin dirección
   visible, solo `areaServed`)? Las dos son válidas y se marcan distinto.
2. **Perfiles para `sameAs`**: URLs exactas de Google Business Profile, Facebook, Instagram,
   YouTube, Houzz, BBB, Yelp. Es lo que hoy vale 0 y lo que más pesa en GEO.
3. **Horario de atención** (`openingHours`) y **rango de precios** (`priceRange`).
4. **`mrandmrsoutdoorsliving.com`** (el dominio con la «s» de más, Tier 1 del plan): ¿se
   compra/redirige, o se deja?
5. **Consolidación geográfica Tier 2** — mover 64 URLs. Es la decisión más cara del plan.
6. **Reseñas**: ¿se puede usar `aggregateRating` con datos reales verificables (§5)?
7. **Acceso a Google Business Profile**, si quiere que se audite (hoy no hay conexión).

Mientras esperas respuesta, **sigue con todo lo que no depende de ellas** — que es casi todo.
