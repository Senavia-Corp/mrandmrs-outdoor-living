# SEO-URLS — auditoría técnica + arquitectura de URLs

Ejecuta [`PROMPT-SEO-URLS.md`](../../PROMPT-SEO-URLS.md). Solo lectura: nada de lo de aquí está
aplicado todavía. Medido sobre el commit `ebb8896` (el HEAD de `main` al empezar; el repo ha
seguido avanzando en paralelo — hoy va por `36d3ed1`, rediseño del hero con vídeo, que es
justo el área que este informe marca como sospechosa de LCP, ver Hallazgo 10), en un
**worktree aislado** (`git worktree add --detach`) para no leer ficheros a medio editar de la
sesión que estaba tocando `Base.astro`/`index.astro` a la vez.

**Metodología, para poder reproducir cualquier cifra de aquí:**
`PUBLIC_ES_PRODUCCION=1 npm run build` (build único, modo producción, para que canónica/noindex
salgan como en real) → jsdom 30.0.1 sobre las 116 páginas de `.vercel/output/static` (script de
inventario, extrae head + grafo de enlaces internos + forma del slug) → Lighthouse 13.4.1 (CLI
vía `npx`, Chromium de Playwright vía `CHROME_PATH`) contra un servidor estático local sirviendo
el mismo build, en 6 plantillas representativas. GSC/GA4 comprobados vía Composio
(`sebastian@senaviacorp.com`).

## Resumen

116/116 páginas construidas. **3 hallazgos ALTO, 5 MEDIO, 3 BAJO/informativos.** Lo que ya
funciona bien: 0 canónicas ausentes y 0 `noindex` colado en modo producción (la puerta
`check:seo` hace su trabajo), 0 URLs del sitemap viejo de Webflow sin equivalente hoy (migración
de paridad real, no hay slugs perdidos), profundidad de clic ≤ 2 en 112 de 116 páginas.

La cifra «100/100» de SEO técnico está anclada a **Lighthouse 13.4.1, categoría SEO**: 92/100 en
4 de las 6 plantillas medidas, 100/100 en las otras 2 — y las 4 que no llegan a 100 fallan por
**una sola causa**, no por causas distintas (Hallazgo 1). Arreglar esa causa sube el sitio entero
a 100/100 de SEO en Lighthouse.

## Checklist técnico puntuado

**[ALTO] 1 · Un único audit de Lighthouse tira el SEO score de 4 plantillas de 6: `link-text`
("See More" / "Read More" sin texto descriptivo)**
Medido: `lighthouse http://localhost:<puerto>/ --only-categories=seo,performance` →
`categories.seo.score = 0.92`, único audit con `score < 1`: `link-text`. Mismo resultado en `/`,
`/services/*`, `/pool-builders/*`, `/blogs/*` — limpio (100/100) en `/project/*` y
`/where-we-serve`.
- **"See More"** — 14 apariciones, una por cada tarjeta de servicio en la grid de la home.
  Componente: [`src/components/widgets/ServiciosPorCategoria.astro`](../../src/components/widgets/ServiciosPorCategoria.astro).
- **"Read More"** — 10 apariciones, una por cada tarjeta del carrusel de blog. No es un
  componente: es HTML crudo scrapeado, embebido como constante `S_BLOG` en cada página que
  lleva el carrusel (ej. [`src/pages/index.astro:55`](../../src/pages/index.astro#L55)) —
  **el arreglo va en el generador que produce ese HTML** (mismo patrón que `PROMPT-MENU.md`
  trampa 1: nunca a mano por página, o se pierde en el próximo `npm run paginas`/`npm run
  blogs`).
- **Arreglo:** texto de enlace único por tarjeta (`aria-label="Ver {servicio}"` /
  `aria-label="Leer: {título del post}"`, o visualmente oculto con `.sr-only`). Un solo cambio
  en cada una de las dos fuentes, 24 instancias corregidas de una vez.
- **Por qué importa:** es el único audit que separa el sitio de 100/100 real de Lighthouse, no
  una opinión — y descriptividad de enlaces es exactamente lo que la skill `seo` pide
  ("usa texto de anclaje descriptivo, evita anclas genéricas").

**[ALTO] 2 · 8 páginas `/project/*` con JSON-LD que no parsea**
Confirmado con `JSON.parse` real sobre el HTML construido — no son diferencias de contenido,
son bloques inválidos:
```
/project/luxury-pool-motorized-pergola-screens-south-florida
/project/luxury-pool-pergola-outdoor-living-south-florida
/project/luxury-pool-spa-screen-enclosure-north-florida
/project/luxury-pool-spa-with-screen-enclosure-north-florida
/project/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida
/project/luxury-pool-motorized-pergola-screen-enclosure-north-florida
/project/luxury-pool-pergola-outdoor-kitchen-south-florida
/project/residential-pool-pergola-outdoor-dining-north-florida
```
Ya documentado en `scripts/check-seo.mjs:123` como "los 8 rotos del origen: se replican
crudos" — el Webflow original ya tenía este JSON-LD roto y la paridad lo replicó bit a bit a
propósito. Confirmado aquí de forma independiente (mismo número, mismas 8 rutas) — la paridad
funcionó como debía, pero el defecto del origen sigue siendo un defecto: Google Rich Results
no puede leer estos bloques. **Arreglo:** repara el JSON en el generador para estas 8 (las
otras 2 de `/project/*` — `south-florida-backyard-pool-wood-pergola`,
`modern-pool-motorized-pergola-south-florida` — ya parsean bien, úsalas de referencia de forma).

**[ALTO] 3 · 3 páginas propias huérfanas — 0 enlaces internos les apuntan**
`/articles/accessibility`, `/articles/privacy-policy`, `/articles/terms-conditions` no aparecen
en el grafo de enlaces de ninguna de las 116 páginas (BFS desde `/` sobre todos los `href="/…"`
del body completo, no solo menú/pie). Razón encontrada: el pie enlaza las páginas legales a
`mrandmrsoutdoorsliving.com` (con «s», dominio distinto que responde 200 con contenido real del
cliente vía Cloudflare) en vez de a estas rutas propias — que sí existen, sí están en el
sitemap, pero a las que nada del sitio apunta. Es más que un enlace suelto: son **dos dominios
sirviendo el mismo contenido legal en paralelo**, riesgo real de contenido duplicado. Ver
arquitectura de URLs, más abajo — esta es la que necesita decisión de Sebastian antes de
tocarse.

**[MEDIO] 4 · `/brochures` sin meta description ni JSON-LD**
Única página de contenido real (no herramienta) sin ninguno de los dos — `pool-investment-estimator`
también los tiene vacíos, pero ese ya está documentado como excepción (`SIN_HEAD_DE_WEBFLOW` en
`check-seo.mjs:58`, cabecera propia de 4 etiquetas). `/brochures` no tiene esa excepción: es un
hueco real.

**[MEDIO] 5 · `/pool-cost-estimator` y `/pool-investment-estimator` sin ningún `<h1>`**
Las dos herramientas de estimación. Sin encabezado no hay señal de tema para el crawler en la
página que probablemente más conversión mueve del sitio.

**[MEDIO] 6 · 18 `<title>` por encima de ~60 caracteres** (riesgo de truncado en el SERP) —
ejemplos: `/` (63), `/contact-us` (71), `/videos` (67), `/blogs-tips` (65),
`/services/professional-landscaping-services-in-north-south-florida` (69). Lista completa en
`$SCRATCH/inventory.json` de esta sesión (no versionado — pide el fichero si hace falta la
lista entera).

**[MEDIO] 7 · 10 meta description por encima de ~160 caracteres** — ejemplos: `/about` (171),
`/where-we-serve` (172), `/where-we-serves/custom-pool-builders-north-florida` (188),
`/testimonials` (167), `/gallery` (165).

**[MEDIO] 8 · CLS por encima del umbral "bueno" (0.1) en 3 de 6 plantillas medidas** —
`/services/*` 0.176, `/where-we-serve` 0.153, `/pool-builders/*` 0.115. `/`, `/blogs/*` y
`/project/*` están dentro (0.013–0.035). Candidato: imágenes o tarjetas sin `width`/`height`
reservado en las plantillas de servicios y de zona.

**[BAJO/INFO] 9 · Colisión de nombres `/where-we-serve` (singular) vs `where-we-serves/`
(plural)** — ver arquitectura de URLs.

**[BAJO/INFO] 10 · LCP anómalo en `/` (56,3 s), `/pool-builders/*` (50,9 s) y `/services/*`
(14,0 s)** — no se toma como cifra real de producción. El servidor de medición es un
`http.createServer` mínimo sin soporte de range-requests, y la home tiene **dos `<video
autoplay loop muted>`** de fondo (confirmado en el HTML construido) que probablemente se
atascan esperando el vídeo completo en vez de solo el primer frame — un CDN real (Vercel) sirve
vídeo con range-requests y esto no debería reproducirse igual. Además el commit `36d3ed1`,
posterior al medido aquí, es justo un rediseño del hero con vídeo — puede que ya lo cambie. **No
sacar conclusiones de rendimiento de esta cifra; remedir con PageSpeed Insights real contra la
URL de producción tras publicar** (Fase 9 bloquea PSI hoy — no hay URL pública en modo
producción, ver Pendientes).

**[INFO] 11 · Composio (GSC + GA4, `sebastian@senaviacorp.com`) sigue sin propiedad de esta
marca** — comprobado dos veces en esta sesión (antes y durante la ejecución), sin cambios: GSC
solo verifica `accountingmaxservices.com`; GA4 solo tiene Silver Construction Group, GQM Inc,
Patio Aluminum Design y Senavia Corp. Ninguna propiedad de PageSpeed Insights tampoco (no existe
ese conector en Composio). Esperado — el sitio no ha publicado — va en Pendientes, no bloquea
este informe.

## Arquitectura de URLs

### Tier 1 — bajo riesgo, recomendado

**Unificar `/where-we-serve` (singular, estática) con `where-we-serves/` (plural, 2 rutas).**
Hoy son dos raíces sin relación jerárquica visible ni en la URL ni, aparte del nombre casi
idéntico, en ningún otro sitio — confusión real, no cosmética (Hallazgo 9). Propuesta: anidar
las dos regionales bajo la singular, que es la que ya está en el nav:

| Actual | Nueva | Por qué |
|---|---|---|
| `/where-we-serves/custom-pool-builders-north-florida` | `/where-we-serve/north-florida` | resuelve la colisión singular/plural; jerarquía padre→hijo legible |
| `/where-we-serves/custom-pool-builders-south-florida` | `/where-we-serve/south-florida` | ídem |

**Resolver el doble dominio de las páginas legales (Hallazgo 3).** Necesita que Sebastian
decida el porqué de `mrandmrsoutdoorsliving.com` antes de tocar nada — no es una llamada de
SEO pura. Dos caminos, mismo resultado técnico (una sola versión indexable):
- Si el dominio con «s» no tiene una razón de negocio propia: 301 de todo ese dominio al
  principal, y el pie pasa a enlazar `/articles/terms-conditions` y `/articles/privacy-policy`
  locales — cierra el hallazgo de huérfanas de paso.
- Si sí la tiene (entidad legal distinta, por ejemplo): canonical cruzada explícita hacia la
  que se considere autoritativa, y el pie sigue enlazando la local igualmente — una página sin
  ningún enlace interno no se arregla con una canonical, se arregla enlazándola.

### Tier 2 — alto impacto, necesita aprobación explícita de Sebastian antes de tocar nada

**El 56 % del sitio (64 de 116 páginas) son páginas de localización repartidas en tres
jerarquías de URL que no se relacionan entre sí:** `/pool-builders/<ciudad>-florida` (53),
`/country/custom-pool-builders-<condado>-county-fl` (9), y las 2 de `where-we-serves/` de
arriba (región). Geográficamente una ciudad está dentro de un condado y un condado dentro de
una región — hoy eso no se ve en ninguna URL. Consolidarlas bajo una sola jerarquía anidada
(ej. `/where-we-serve/north-florida/alachua-county/gainesville`) es lo que la skill `seo`
llama silo temático, y es la palanca de SEO local más grande de todo este sitio: agrupa
autoridad de enlace por región → condado → ciudad en vez de repartirla plana entre 64 URLs sin
relación.

**Esto rompe el Principio 1 a propósito, así que no se decide aquí.** No es un renombrado
cosmético — tiene una razón de arquitectura real — pero mover 64 URLs significa 64 redirects,
reescribir enlaces internos en tres colecciones, y perder la poca correspondencia 1:1 que
quedaba con el Webflow de origen. Se deja **propuesta, no ejecutada**: si Sebastian la aprueba,
la forma exacta del slug (¿cuántos niveles? ¿se repite "custom-pool-builders" en cada nivel o
solo en el hijo?) se decide en ese momento, y el mapa de 64 redirects se genera entonces —
enumerarlo ahora sería inventar una forma de slug que nadie ha aprobado todavía.

**No se toca por ser cosmético — se reporta:** las 3 rutas de `/services/…` que rompen el
patrón `-in-north-south-florida` (Hallazgo ya conocido, ver `PROMPT-SEO-URLS.md`). Los tres
slugs son igual de descriptivos que el resto; no hay ganancia de SEO real en unificarlos, solo
estética — Principio 1 dice que eso no es motivo suficiente. Se deja anotado, no en el mapa de
redirects.

## Mapa de redirects 301 — a aplicar cuando se implementen los renombres del Tier 1

Ninguno de estos existe todavía en `vercel.json` — son el resultado de mover las 2 páginas de
`where-we-serves/`, no de nada que haya cambiado hoy. Formato idéntico a los 3 redirects que ya
hay (`permanent: true`), como **adición**:

```json
{
  "redirects": [
    {
      "source": "/where-we-serves/custom-pool-builders-north-florida",
      "destination": "/where-we-serve/north-florida",
      "permanent": true
    },
    {
      "source": "/where-we-serves/custom-pool-builders-south-florida",
      "destination": "/where-we-serve/south-florida",
      "permanent": true
    }
  ]
}
```

El cruce contra `_source/live/sitemap.txt` (113 URLs del Webflow vivo) no aporta filas nuevas:
las 113 tienen equivalente exacto hoy — la migración no dejó slugs sueltos (Resumen). Toda
entrada futura de este mapa viene de decisiones de arquitectura, no de deuda de la migración.

## Antes de publicar

- [ ] Verificar/añadir `mrandmrsoutdoorliving.com` como propiedad en Google Search Console
      (hoy sin propiedad en la cuenta de Composio — Hallazgo 11).
- [ ] Crear o conectar la propiedad GA4 correcta para esta marca (misma comprobación, mismo
      resultado vacío).
- [ ] Decisión de Sebastian: qué hacer con `mrandmrsoutdoorsliving.com` (Tier 1).
- [ ] Decisión de Sebastian: aprobar o no la consolidación geográfica (Tier 2) — condiciona si
      el Tier 1 se implementa solo o como parte de algo más grande.
- [ ] Arreglar `link-text` (Hallazgo 1) — el único bloqueo real para 100/100 de SEO en
      Lighthouse.
- [ ] Reparar el JSON-LD de los 8 `/project/*` (Hallazgo 2).
- [ ] `/brochures`: meta description + JSON-LD (Hallazgo 4).
- [ ] H1 en los dos estimadores (Hallazgo 5).
- [ ] Enviar el `sitemap.xml` nuevo a GSC el día del corte de dominio.
- [ ] Remedir con Lighthouse/PageSpeed Insights contra la URL real de producción — las cifras
      de rendimiento de este informe son locales y probablemente pesimistas (Hallazgo 10).

Nada de esta lista se ejecuta en este encargo — es solo lectura y plan, por diseño
(`PROMPT-SEO-URLS.md`).
