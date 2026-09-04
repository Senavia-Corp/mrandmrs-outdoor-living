# Encargo — Auditoría técnica de SEO y arquitectura de URLs (solo lectura + plan, sin tocar código)

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5, réplica de un Webflow — lee
`docs/encargos/00-PRINCIPIOS.md` antes de nada). Este encargo es **de diagnóstico y plan, no
de implementación**: no toca `.astro`, no toca `vercel.json`, no hace commit ni push. Si por el
camino ves un arreglo de una línea evidente, **anótalo en el plan**, no lo apliques.

## Qué hay que cerrar

Este sitio ya tiene un gate de **paridad SEO** con el Webflow de origen (`npm run check:seo`,
Fase 9 — ✅ cerrada). Paridad significa que el `<head>` de las 115 páginas migradas es IDÉNTICO
al de origen, con una sola adición deliberada (la canónica, que el origen no tenía en ninguna).
Eso es un techo, no un objetivo: si el Webflow original tenía errores de SEO técnico, la
paridad los replica tal cual.

Lo que falta, y es este encargo: auditar **arquitectura de URLs, metadatos y SEO técnico** de
las rutas actuales contra buenas prácticas (no contra el origen), puntuar dónde está hoy, y
entregar un plan concreto — con mapa de URLs nuevas y sus 301 — para publicar en
`mrandmrsoutdoorliving.com` con el SEO técnico al máximo. El SEO de contenido (copy, densidad
de keywords en el cuerpo) **no es de este encargo**: va en otra sesión, con otro agente.

## Trampas de este repo — léelas antes de tocar nada

1. **No hay nada roto en que `mrandmrs-outdoor-living.vercel.app/sitemap.xml` esté vacío y
   `robots.txt` diga `Disallow: /`.** Es `scripts/build-seo-ficheros.mjs` haciendo su trabajo:
   solo indexa con `PUBLIC_ES_PRODUCCION` exactamente igual a `"1"`. Auditar esa URL en vivo tal
   cual te da un sitio bloqueado a propósito — no lo reportes como fallo. Audita sobre
   `.vercel/output/static` tras `npm run build` (igual que `check-seo.mjs` y `check-rutas.mjs`),
   o razona sobre el código fuente directamente.

2. **El dominio real, `mrandmrsoutdoorliving.com`, sigue en Webflow — DNS sin tocar.** El corte
   lo aprueba Sebastian, no es parte de este encargo. Tu plan es para el día del corte, no para
   ejecutarlo hoy.

3. **Ya existe tooling de SEO técnico — léelo antes de proponer nada nuevo:**
   - `scripts/check-seo.mjs` — compara el `<head>` de cada ruta contra `baseline/seo.json`.
   - `scripts/build-seo-ficheros.mjs` — genera `sitemap.xml`/`robots.txt` con el interruptor.
   - `scripts/check-rutas.mjs` — confirma que las rutas esperadas existen y no hay ninguna de más.
   - `_source/routes.csv` — las 115 rutas migradas (tipo/colección/plantilla/si-va-en-sitemap);
     la ruta 116 (`/financing`) no está aquí, está declarada en `scripts/lib/rutas-propias.mjs`.
   - `_source/live/sitemap.txt` — las 113 URLs que el Webflow de origen declaraba en su propio
     sitemap (el sitio servía 115; dos nunca estuvieron en su sitemap — cabecera de
     `build-seo-ficheros.mjs` dice cuáles y por qué).
   - `baseline/seo.json` / `baseline/sitemap.xml` — el `<head>` y sitemap tal cual en Webflow.

   Tu auditoría es una capa nueva sobre esto, no una reinvención. Si vas a puntuar canónicas,
   JSON-LD, robots, etc., parte de lo que estos ficheros ya saben en vez de reconstruirlo.

4. **`vercel.json` ya tiene 3 redirects 301**, de un encargo anterior (enlaces del menú a
   `/commercial-services/…` que daban 404 real también en el origen — ver
   `docs/encargos/MENU-PLAN.md`). Léelos antes de proponer el mapa completo: tu propuesta los
   **incluye y extiende**, nunca los duplica ni los contradice.

5. **Pistas ya encontradas por otros encargos — verifícalas, no las des por ciertas sin mirar:**
   - 0 canónicas en las 115 páginas de origen (ya corregido aquí, es una adición deliberada).
   - 345 apariciones (3 hrefs únicos) de enlaces rotos a `/commercial-services/…` — según
     `MENU-PLAN.md` ya resueltos con los 3 redirects de `vercel.json`. Confirma que siguen ahí
     y que responden 301 de verdad; no los repitas en tu mapa.
   - **Dos fuentes de verdad para las páginas legales**: el pie enlaza a
     `mrandmrsoutdoorsliving.com` (con «s», dominio distinto, responde 200 con contenido real
     del cliente vía Cloudflare) mientras el sitio nuevo tiene sus propias
     `/articles/terms-conditions` y `/articles/privacy-policy`. Sin resolver — esto SÍ es
     arquitectura de URLs, o sea que es de este encargo: decide y propón canonical/estrategia
     (¿el dominio con «s» debería redirigir entero al bueno?), no lo dejes pasar otra vez.
   - **Colisión de nombres**: existe `/where-we-serve` (página estática, singular) Y una carpeta
     `where-we-serves/` (plural) con 2 páginas de zona agrupada. Revisa si confunde a un
     crawler, a un usuario, o a los enlaces internos, y si merece unificarse.
   - La mayoría de las rutas de `/services/…` terminan en `-in-north-south-florida`, pero 3 no
     siguen el patrón (`custom-outdoor-kitchens-for-north-south-florida-homes`,
     `premium-outdoor-furniture-for-north-south-florida-homes`,
     `pool-screen-enclosures-for-north-south-florida-pools`). Decide con criterio SEO si es
     ruido o si conviene unificar el patrón de slug.

6. **Composio tiene Google Search Console y GA4 conectados** (usuario
   `sebastian@senaviacorp.com`), pero **comprobado hoy 2026-09-03, ninguno de los dos tiene una
   propiedad de Mr & Mrs Outdoor Living**: GSC solo verifica `sc-domain:accountingmaxservices.com`;
   GA4 solo tiene propiedades de Silver Construction Group, GQM Inc, Patio Aluminum Design y
   Senavia Corp. Vuelve a comprobarlo por si cambió (`composio execute
   "GOOGLE_SEARCH_CONSOLE_LIST_SITES" -d '{}'` y `"GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES"`),
   pero **no bloquees el encargo si sigue vacío**: el sitio no ha publicado todavía, así que
   tampoco habría histórico real que perder. Trátalo como un pendiente de lanzamiento en el plan
   (Fase 5), no como un fallo de auditoría. Si Sebastian sabe de una propiedad GSC del Webflow
   viejo en OTRA cuenta de Google, pregúntaselo antes de cerrar el plan — qué URL de origen
   recibe tráfico/clics hoy vale oro para priorizar el mapa de redirects.

7. **Índice de git compartido** — puede haber más sesiones trabajando aquí ahora mismo.
   `git status --short` antes de nada. Si vas a dejar ficheros nuevos, en rutas propias dentro
   de `docs/`, nunca sobreescribiendo lo de otro frente.

## Qué hay que hacer

### Fase 1 · Inventario del estado actual
`npm run build`. Sobre `.vercel/output/static` (no `src/pages`, no `astro dev`), para cada ruta
—las 115 de `_source/routes.csv` más las propias de `rutas-propias.mjs`— extrae: `<title>`,
meta description, canonical, `meta[name=robots]`, todos los `og:*`/`twitter:*`, bloques
JSON-LD, profundidad de clic desde `/` (vía el menú y pie ya construidos), y la forma del slug
(guiones, longitud, tokens redundantes).

Cruza contra `_source/live/sitemap.txt` (113 URLs del Webflow vivo): cualquiera que hoy no
resuelva a 200 va a la lista "necesita 301 si no lo tiene ya". Cruza contra los 3 redirects de
`vercel.json` para no repetir lo ya resuelto.

### Fase 2 · Datos externos (best-effort, no bloqueante)
Prueba `GOOGLE_SEARCH_CONSOLE_LIST_SITES` por si ya hay propiedad para esta marca (ver trampa
6). Si la hay, saca clics/impresiones por página con `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY`
(dimensión `page`, últimos 16 meses) para priorizar qué redirects cuidar más. Repite con
`GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES`: si hay propiedad GA4, anota qué páginas tienen más
sesiones con `GOOGLE_ANALYTICS_RUN_REPORT`. Si no hay ninguna, sigue sin ellos y dilo en el plan
tal cual — no inventes cifras.

### Fase 3 · Checklist técnico puntuado
Usa el checklist de la skill `seo` (crawlability, indexability, performance, structured data)
como rúbrica. Añade Core Web Vitals reales: corre Lighthouse (`npx lighthouse`, o la API pública
de PageSpeed Insights si no quieres depender de Chrome local; si Composio tiene conector de
PageSpeed pruébalo con `composio search "pagespeed"` primero) contra 4-5 plantillas
representativas servidas en local con `PUBLIC_ES_PRODUCCION=1` (para medir como si fuera
producción: canónicas puestas, sin `noindex`). El «100/100» de este encargo se ancla a la
puntuación real de la categoría SEO de Lighthouse, no a una sensación. Cada hallazgo en el
formato de la skill `seo`: `[ALTO/MEDIO/BAJO]`, ruta, qué pasa, por qué importa, arreglo
propuesto.

### Fase 4 · Arquitectura de URLs propuesta
Para cada ruta cuyo slug o posición en el árbol tenga un problema real —no cosmético: el
Principio 1 de `00-PRINCIPIOS.md` sigue vigente, esto no es un rediseño, y cambiar una URL sin
razón de SEO/arquitectura tiene coste (pierde el poco histórico que hay, rompe enlaces
externos)— propón la nueva y el porqué en una línea, estilo la tabla «Destinos de los 301» de
`docs/encargos/MENU-PLAN.md`. Resuelve explícitamente la colisión `where-we-serve` /
`where-we-serves/` y la doble fuente de las páginas legales (trampa 5). No toques las URLs que
ya funcionan bien solo por consistencia estética.

### Fase 5 · Mapa de redirects 301 + pendientes de lanzamiento
Entrega el array `redirects` completo listo para fusionar en `vercel.json` (mismo formato
`source`/`destination`/`permanent: true` que las 3 que ya hay), cubriendo toda URL de
`_source/live/sitemap.txt` que cambie de slug, más cualquier URL rota adicional que
encuentres. Añade una lista corta «antes de publicar»: verificar/añadir el dominio en GSC,
crear o conectar la propiedad GA4 correcta, enviar el sitemap nuevo el día del corte — nada de
esto se ejecuta en este encargo, solo se deja listo para marcar.

## Fuera de alcance — se reporta, no se toca

SEO de contenido (copy, densidad de keywords, encabezados de marketing — otra sesión). Tocar
`vercel.json`, cualquier `.astro`, o DNS. Commit, push o deploy. Ejecutar el corte de dominio.
Cualquier cambio visual.

## Entrega

`docs/encargos/SEO-URLS-PLAN.md`, con: el checklist puntuado (Fase 3), la tabla de arquitectura
de URLs nueva vs. actual con motivo (Fase 4), el array de `redirects` listo para copiar a
`vercel.json` (Fase 5), y la lista de pendientes de lanzamiento. Cada afirmación con el comando
que la produjo (Principio 6 de `00-PRINCIPIOS.md`) — un número sin su comando es una opinión.
