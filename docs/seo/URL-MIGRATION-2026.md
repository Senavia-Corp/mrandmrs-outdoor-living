# Migración de URLs — 3 de octubre de 2026

## Summary

| | |
|---|---|
| **Fecha** | 2026-10-03 |
| **Objetivo** | Mover las 14 fichas de servicio, las 53 páginas locales de pool builders y las 9 de condado al silo `/services/`, con redirects permanentes 1:1 y sin cadenas, para poder crecer después con páginas locales por servicio (`/services/pool-remodeling/ocala-fl`, …). |
| **URLs migradas** | **76** = 14 service + 53 city + 9 county |
| **Dominio canónico** | `https://www.mrandmrsoutdoorliving.com` (sin cambios; canónicas, sitemap, robots, JSON-LD, og:image y enlaces absolutos ya iban en `www`) |
| **Sitemap anterior** | 158 URLs (`public/sitemap.xml` en `cbf585b`) |
| **Sitemap nuevo** | 168 URLs: salen las 76 viejas, entran las 76 nuevas y entran las 10 `/gallery/<categoría>` que el generador ya añadía desde el 2-oct-2026 pero que el fichero versionado aún no llevaba. 82 permanecen idénticas. Ninguna página de contenido desaparece. |
| **Redirects** | 90 reglas de ruta (14 históricas + 76 nuevas) + 1 de host = **91** en `vercel.json`, todas `permanent: true` (308 en Vercel). |

### Fuente de verdad

- `src/data/seo-url-migrations.json` — las 76 filas `{ old, new, type, sanitySlug? }` y los 14 redirects históricos con su destino final. **Única** lista: de ella salen los redirects, los enlaces reescritos, las puertas y esta tabla.
- `src/lib/rutas-seo.mjs` — la lógica para Astro: `renombra()`, `origen()`, `rutaCiudad()`, `esFicha()`, `esCiudad()`, `esCondado()`.
- `scripts/lib/renombradas.mjs` — la misma lógica para generadores y puertas (+ las 2 regionales del 3-sep-2026).
- `scripts/build-redirects.mjs` — escribe los `redirects` de `vercel.json` desde la tabla (`npm run redirects`; `--check` falla si se desincronizan).
- `scripts/check-redirects.mjs` — la puerta (`npm run check:redirects`, dentro de `npm run check`): ver *Verification*.

### Decisiones de arquitectura

1. **Las URLs nacen en el código, no en Sanity.** Las 14 fichas y los 9 condados se generan desde `_source/vivo/*.html` (`build-paginas.mjs`) y las 53 ciudades desde la plantilla `src/pages/services/pool-builders/[slug].astro`. El `slug.current` de los documentos `poolBuilder`, `service`, `county` y `serviceRegion` de Sanity es la **identidad** del documento y la clave de la cadena editorial del blog (`contenido/blog/*.md` → `servicios:`, `contenido/roadmap-blog.json`, `src/data/sanity-ids.json`): **no se renombra** en el CMS. Es exactamente lo que ya se hizo con `serviceRegion` el 3-sep-2026. La URL pública de una ciudad la deriva `rutaCiudad(slug)` (tabla primero; `<ciudad>-florida` → `<ciudad>-fl` para una ciudad nueva).
2. **Hillsboro Beach.** El documento `poolBuilder-6a8f67a39235e3662e5727d8` (`slug: beach-florida`) ya decía *Hillsboro Beach* en `name`, `h1Title`, `h2Title`, `headingIntro`, `intro` y `seo.title/description`: sólo el slug estaba mal. Su URL es ahora `/services/pool-builders/hillsboro-beach-fl` (title, H1, canónica, miga y schema consistentes). El slug de Sanity queda como identidad; renombrarlo es una decisión editorial aparte (ver *High-risk*).
3. **Sin comodines.** `/pool-builders/:city-florida → /services/pool-builders/:city-fl` fallaría en Hillsboro y se tragaría los 7 legacy `pool-builders-<x>-florida`. Las 90 reglas son literales; `build-vercel-config.mjs` aborta con cualquier otra forma.
4. **La miga no inventa páginas.** `/services` no existe como página, así que el escalón se omite: `Home → Pool Builders → Ocala, FL`. De paso se corrigen dos migas que ya apuntaban a 404 antes de esta migración: `/blogs` (el hub es `/blogs-tips`) y `/project` (el hub es `/projects`); `/articles` se omite. Lo mide `check:redirects` punto 9.
5. **`startsWith('/services/')` ya no identifica las 14 fichas** (`/services/pool-builders/ocala-fl` también empieza así). Todos los sitios que lo usaban pasan a `esFicha()` / `esCiudad()` / `esCondado()`: `build-paginas`, `build-seo-ficheros`, `check-seo`, `check-texto`, `check-estructura-*`, `build-captacion-ciudades`, `CarruselBlog.astro`.
6. **Baseline re-claveado, no re-baselinizado.** `baseline/seo.json`, `baseline/rutas.json`, `baseline/captura-informe.json`, `baseline/sitemap.xml`, `baseline/text/*.txt`, `baseline/html/*.html` y `baseline/shots/*/*.jpg` pasan a nombrarse por la ruta servida (456 ficheros renombrados con `git mv`, contenido intacto), igual que se hizo con `where-we-serve/*`. `_source/vivo/`, `_source/cms/` y `_source/live/sitemap.txt` son el origen y no se tocan: `origen(ruta)` traduce al nombre viejo donde hace falta.

## Mapping (76)

| OLD | NEW | TYPE | REDIRECT | VERIFIED |
|---|---|---|---|---|
| `/services/custom-pool-spa-builders-in-north-south-florida` | `/services/pool-builders` | service | 308 | ✅ |
| `/services/pool-remodeling-renovation-in-north-south-florida` | `/services/pool-remodeling` | service | 308 | ✅ |
| `/services/custom-aluminum-pergola-builders-in-north-south-florida` | `/services/pergola-builders` | service | 308 | ✅ |
| `/services/custom-outdoor-kitchens-for-north-south-florida-homes` | `/services/outdoor-kitchens` | service | 308 | ✅ |
| `/services/motorized-louvered-roof-systems-in-north-south-florida` | `/services/louvered-roofs` | service | 308 | ✅ |
| `/services/motorized-retractable-screens-in-north-south-florida` | `/services/retractable-screens` | service | 308 | ✅ |
| `/services/patio-screen-rooms-enclosures-in-north-south-florida` | `/services/patio-screen-rooms` | service | 308 | ✅ |
| `/services/pool-screen-enclosures-for-north-south-florida-pools` | `/services/pool-screen-enclosures` | service | 308 | ✅ |
| `/services/custom-deck-builders-in-north-south-florida` | `/services/deck-builders` | service | 308 | ✅ |
| `/services/professional-landscaping-services-in-north-south-florida` | `/services/landscaping` | service | 308 | ✅ |
| `/services/smart-irrigation-system-installation-in-north-south-florida` | `/services/irrigation-systems` | service | 308 | ✅ |
| `/services/premium-outdoor-furniture-for-north-south-florida-homes` | `/services/outdoor-furniture` | service | 308 | ✅ |
| `/services/steel-building-pole-barn-construction-in-north-south-florida` | `/services/steel-buildings-pole-barns` | service | 308 | ✅ |
| `/services/smart-soffit-led-lighting-installation-in-north-south-florida` | `/services/soffit-led-lighting` | service | 308 | ✅ |
| `/pool-builders/alachua-florida` | `/services/pool-builders/alachua-fl` | city | 308 | ✅ |
| `/pool-builders/archer-florida` | `/services/pool-builders/archer-fl` | city | 308 | ✅ |
| `/pool-builders/atlantis-florida` | `/services/pool-builders/atlantis-fl` | city | 308 | ✅ |
| `/pool-builders/beach-florida` | `/services/pool-builders/hillsboro-beach-fl` | city | 308 | ✅ |
| `/pool-builders/boca-raton-florida` | `/services/pool-builders/boca-raton-fl` | city | 308 | ✅ |
| `/pool-builders/boynton-beach-florida` | `/services/pool-builders/boynton-beach-fl` | city | 308 | ✅ |
| `/pool-builders/cedar-key-florida` | `/services/pool-builders/cedar-key-fl` | city | 308 | ✅ |
| `/pool-builders/chiefland-florida` | `/services/pool-builders/chiefland-fl` | city | 308 | ✅ |
| `/pool-builders/cross-city-florida` | `/services/pool-builders/cross-city-fl` | city | 308 | ✅ |
| `/pool-builders/dania-beach-florida` | `/services/pool-builders/dania-beach-fl` | city | 308 | ✅ |
| `/pool-builders/davie-florida` | `/services/pool-builders/davie-fl` | city | 308 | ✅ |
| `/pool-builders/deerfield-beach-florida` | `/services/pool-builders/deerfield-beach-fl` | city | 308 | ✅ |
| `/pool-builders/delray-beach-florida` | `/services/pool-builders/delray-beach-fl` | city | 308 | ✅ |
| `/pool-builders/fanning-springs-florida` | `/services/pool-builders/fanning-springs-fl` | city | 308 | ✅ |
| `/pool-builders/fort-lauderdale-florida` | `/services/pool-builders/fort-lauderdale-fl` | city | 308 | ✅ |
| `/pool-builders/gainesville-florida` | `/services/pool-builders/gainesville-fl` | city | 308 | ✅ |
| `/pool-builders/gulf-stream-florida` | `/services/pool-builders/gulf-stream-fl` | city | 308 | ✅ |
| `/pool-builders/hallandale-beach-florida` | `/services/pool-builders/hallandale-beach-fl` | city | 308 | ✅ |
| `/pool-builders/hawthorne-florida` | `/services/pool-builders/hawthorne-fl` | city | 308 | ✅ |
| `/pool-builders/high-springs-florida` | `/services/pool-builders/high-springs-fl` | city | 308 | ✅ |
| `/pool-builders/hollywood-florida` | `/services/pool-builders/hollywood-fl` | city | 308 | ✅ |
| `/pool-builders/hypoluxo-florida` | `/services/pool-builders/hypoluxo-fl` | city | 308 | ✅ |
| `/pool-builders/juno-beach-florida` | `/services/pool-builders/juno-beach-fl` | city | 308 | ✅ |
| `/pool-builders/jupiter-florida` | `/services/pool-builders/jupiter-fl` | city | 308 | ✅ |
| `/pool-builders/lake-city-florida` | `/services/pool-builders/lake-city-fl` | city | 308 | ✅ |
| `/pool-builders/lighthouse-point-florida` | `/services/pool-builders/lighthouse-point-fl` | city | 308 | ✅ |
| `/pool-builders/manalapan-florida` | `/services/pool-builders/manalapan-fl` | city | 308 | ✅ |
| `/pool-builders/mcintosh-florida` | `/services/pool-builders/mcintosh-fl` | city | 308 | ✅ |
| `/pool-builders/micanopy-florida` | `/services/pool-builders/micanopy-fl` | city | 308 | ✅ |
| `/pool-builders/miramar-florida` | `/services/pool-builders/miramar-fl` | city | 308 | ✅ |
| `/pool-builders/newberry-florida` | `/services/pool-builders/newberry-fl` | city | 308 | ✅ |
| `/pool-builders/north-palm-beach-florida` | `/services/pool-builders/north-palm-beach-fl` | city | 308 | ✅ |
| `/pool-builders/ocala-florida` | `/services/pool-builders/ocala-fl` | city | 308 | ✅ |
| `/pool-builders/ocean-ridge-florida` | `/services/pool-builders/ocean-ridge-fl` | city | 308 | ✅ |
| `/pool-builders/old-town-florida` | `/services/pool-builders/old-town-fl` | city | 308 | ✅ |
| `/pool-builders/palatka-florida` | `/services/pool-builders/palatka-fl` | city | 308 | ✅ |
| `/pool-builders/palm-beach-gardens-florida` | `/services/pool-builders/palm-beach-gardens-fl` | city | 308 | ✅ |
| `/pool-builders/parkland-florida` | `/services/pool-builders/parkland-fl` | city | 308 | ✅ |
| `/pool-builders/pembroke-pines-florida` | `/services/pool-builders/pembroke-pines-fl` | city | 308 | ✅ |
| `/pool-builders/plantation-florida` | `/services/pool-builders/plantation-fl` | city | 308 | ✅ |
| `/pool-builders/pompano-beach-florida` | `/services/pool-builders/pompano-beach-fl` | city | 308 | ✅ |
| `/pool-builders/reddick-florida` | `/services/pool-builders/reddick-fl` | city | 308 | ✅ |
| `/pool-builders/royal-palm-beach-florida` | `/services/pool-builders/royal-palm-beach-fl` | city | 308 | ✅ |
| `/pool-builders/south-palm-beach-florida` | `/services/pool-builders/south-palm-beach-fl` | city | 308 | ✅ |
| `/pool-builders/southwest-ranches-florida` | `/services/pool-builders/southwest-ranches-fl` | city | 308 | ✅ |
| `/pool-builders/tequesta-florida` | `/services/pool-builders/tequesta-fl` | city | 308 | ✅ |
| `/pool-builders/trenton-florida` | `/services/pool-builders/trenton-fl` | city | 308 | ✅ |
| `/pool-builders/waldo-florida` | `/services/pool-builders/waldo-fl` | city | 308 | ✅ |
| `/pool-builders/wellington-florida` | `/services/pool-builders/wellington-fl` | city | 308 | ✅ |
| `/pool-builders/west-palm-beach-florida` | `/services/pool-builders/west-palm-beach-fl` | city | 308 | ✅ |
| `/pool-builders/weston-florida` | `/services/pool-builders/weston-fl` | city | 308 | ✅ |
| `/pool-builders/williston-florida` | `/services/pool-builders/williston-fl` | city | 308 | ✅ |
| `/pool-builders/wilton-manors-florida` | `/services/pool-builders/wilton-manors-fl` | city | 308 | ✅ |
| `/country/custom-pool-builders-alachua-county-fl` | `/services/pool-builders/alachua-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-broward-county-fl` | `/services/pool-builders/broward-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-columbia-county-fl` | `/services/pool-builders/columbia-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-dixie-county-fl` | `/services/pool-builders/dixie-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-gilchrist-county-fl` | `/services/pool-builders/gilchrist-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-levy-county-fl` | `/services/pool-builders/levy-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-marion-county-fl` | `/services/pool-builders/marion-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-palm-beach-county-fl` | `/services/pool-builders/palm-beach-county-fl` | county | 308 | ✅ |
| `/country/custom-pool-builders-putnam-county-fl` | `/services/pool-builders/putnam-county-fl` | county | 308 | ✅ |

*VERIFIED* = construida (200), sin página en la URL vieja, redirect permanente directo en `vercel.json` y en `.vercel/output/config.json`, en el sitemap, canónica propia, 0 enlaces internos a la vieja. Lo mide `npm run check:redirects` sobre el build (ver *Verification*).

## Legacy mappings (14 históricos, todos a destino FINAL)

| SOURCE | DESTINATION (final) | Motivo |
|---|---|---|
| `/commercial-services/commercial-pool-construction-north-south-florida` | `/industry-solutions` | MENU-PLAN.md: ficha comercial que ya daba 404 en el Webflow de origen; el menu la enlazaba. |
| `/commercial-services/commercial-pool-contractors-north-south-florida` | `/industry-solutions` | MENU-PLAN.md: idem. |
| `/commercial-services/commercial-pool-renovations-north-south-florida` | `/services/pool-remodeling` | MENU-PLAN.md: idem; su destino es la ficha de remodelacion, migrada el 3-oct-2026 (antes /services/pool-remodeling-renovation-in-north-south-florida). |
| `/where-we-serves/custom-pool-builders-north-florida` | `/where-we-serve/north-florida` | Tier 1 de SEO-URLS-PLAN.md (3-sep-2026): las 2 regionales se anidan bajo /where-we-serve. |
| `/where-we-serves/custom-pool-builders-south-florida` | `/where-we-serve/south-florida` | Tier 1 de SEO-URLS-PLAN.md (3-sep-2026): idem; estaba en el sitemap del Webflow vivo. |
| `/services/custom-aluminum-wood-pergola-builders-in-north-south-florida` | `/services/pergola-builders` | Slug viejo del servicio de pergolas, con «wood» en medio; rankea en posicion 2,2 con 125 impresiones. Destino: la ficha de pergolas, migrada el 3-oct-2026. |
| `/excavation` | `/services/pool-builders` | Ruta heredada que ya devolvia 404 antes de la migracion (11 impresiones). La excavacion es parte de la construccion de piscina: ficha de pool builders, migrada el 3-oct-2026. |
| `/pool-builders/pool-builders-southwest-ranches-florida` | `/services/pool-builders/southwest-ranches-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-hallandale-beach-florida` | `/services/pool-builders/hallandale-beach-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-ocala-florida` | `/services/pool-builders/ocala-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-north-palm-beach-florida` | `/services/pool-builders/north-palm-beach-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-micanopy-florida` | `/services/pool-builders/micanopy-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-west-palm-beach-florida` | `/services/pool-builders/west-palm-beach-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |
| `/pool-builders/pool-builders-mcintosh-florida` | `/services/pool-builders/mcintosh-fl` | Legacy de Webflow (slug con el prefijo repetido), con impresiones en Search Console. Apunta DIRECTO a la ciudad migrada el 3-oct-2026: nunca a /pool-builders/*, que ahora tambien redirige. |

Los 3 de `/commercial-services/` siguen enlazados desde el megamenú a propósito (decisión de `docs/encargos/MENU-PLAN.md`); `check:redirects` los declara y vigila que ningún otro source de redirect reciba enlaces internos. Los otros 11 no tienen ningún enlace interno (`check:enlaces`, `SIN_ENLACE_INTERNO`).

El redirect de host (`mrandmrs-outdoor-living.vercel.app/(.*) → https://www.mrandmrsoutdoorliving.com/$1`) se conserva tal cual.

## Sanity

| Qué | Documentos | Campo | Metodología |
|---|---|---|---|
| Enlaces internos en Portable Text del blog | **46 `blogPost`** (de 47 publicados) | `blog[_key].markDefs[_key].href` — **108 enlaces** | `patch_documents` (set, sólo el `href`, por `_key` de bloque y de marca) en 2 lotes → `publish_documents` de los 46. `_id`, `_type`, contenido, referencias y fechas intactos. Verificado después con GROQ: 0 `href` que empiece por `/pool-builders/`, `/country/` o uno de los 10 slugs largos de `/services/`; 0 borradores residuales; 47 publicados (igual que antes). |
| Origen Markdown de esos artículos | 46 ficheros `contenido/blog/*.md` | enlaces `[texto](/ruta)` | mismos 108 enlaces reescritos, para que `publica-blog.mjs` no los devuelva a la URL vieja. |
| Caché versionada | `src/data/blogs-sanity.json` | `href` | misma transformación (el proxy del contenedor bloquea `*.sanity.io` y `cache-blog-sanity.mjs` no puede correr aquí). Cotejado: el conjunto de `href` internos de la caché = el que devuelve Sanity (67 distintos, 0 viejos). |
| `poolBuilder` (53), `service` (14), `county` (9), `serviceRegion` (2) | — | `slug.current` | **NO modificados**, a propósito (identidad; ver *Decisiones* 1). `src/data/pool-builders-sanity.json` y `src/data/sanity-ids.json` siguen válidos. |
| `seo.canonical`, `relatedServices`, `relatedPosts`, `primaryService` | — | — | referencias por `_id`: no contienen URLs, nada que cambiar (comprobado en el esquema y por GROQ). |
| Blogs y proyectos | — | — | 0 cambios de slug, 0 cambios editoriales. |

## Verification

Build de producción desde el contenedor: `PUBLIC_ES_PRODUCCION=1 MM_SANITY_CACHE=1 npm run build` (la caché declarada es obligatoria aquí porque el proxy bloquea `api.sanity.io`; el aviso `>>> Sanity no responde` es esperado). Resultados sobre `.vercel/output/static` del 3-oct-2026:

| Comprobación | Comando | Resultado |
|---|---|---|
| Build de producción | `PUBLIC_ES_PRODUCCION=1 MM_SANITY_CACHE=1 npm run build` | ✅ PASS — 169 páginas, 91 redirects + 1 bloque de cabeceras inyectados en `.vercel/output/config.json` (92 rutas 308 contando la de Astro) |
| Tokens | `npm run check:tokens` | ✅ VERDE |
| Rutas (115 del CSV + propias, 0 de más) | `npm run check:rutas` | ✅ VERDE |
| Enlaces internos, 301 declarados, git↔dist | `npm run check:enlaces` | ✅ VERDE — 0 rotos, 87 renombrados sin enlace interno, 0 huérfanos |
| **Migración (nueva)** | `npm run check:redirects` | ✅ VERDE — 76/76 nuevas construidas · 0 viejas construidas · 76/76 con 308 directo · 14/14 históricos a página · 0 cadenas · 0 bucles · 0 sources repetidos · vercel.json = tabla · sitemap 168 `<loc>` en www, 76/76 nuevas, 0 viejas, 0 duplicadas, todas 200 y canónica propia · 0 enlaces internos a las 76 viejas · 0 a otros sources (salvo los 3 declarados) · canónica = ruta en todas · og:url = canónica · 0 URLs viejas en JSON-LD · miga: cada item es página construida · 0 páginas bajo /pool-builders/ ni /country/ · rutas en minúscula |
| SEO (`<head>` contra baseline, canónica, #negocio, #miga) | `npm run check:seo` | ✅ VERDE |
| Estructura de las 14 fichas | `npm run check:estructura` | ✅ VERDE |
| Estructura de las 53 ciudades | `npm run check:estructura:ciudades` | ✅ VERDE |
| Captación de ciudades = generador | `npm run check:captacion` | ✅ VERDE |
| Menú y pie (estático + móvil) | `npm run check:menu` | ✅ VERDE (con `xvfb-run`) |
| Galería / formulario de galería | `npm run check:galeria`, `check:galeria-formulario` | ✅ VERDE |
| Landings de pago (Core, Ocala, Gainesville, Remodeling) | `npm run check:ads` | ✅ VERDE |
| Medición (GTM, GA4, formularios, teléfonos, thank-you) | `npm run check:medicion`, `check:aviso`, `check:estimador`, `check:resenas` | ✅ VERDE |
| IX2 y carruseles | `npm run check:ix2`, `check:carrusel` | ✅ VERDE |
| Texto (innerText contra baseline) en las 76 | `node scripts/check-texto.mjs /services/` | ✅ VERDE — 76/76 (con `xvfb-run`; `check-texto` necesita navegador con ventana). Ninguna línea de texto se mueve con el cambio de URL. |
| Assets | `npm run check:assets` | ⛔ NO MEDIDA: requiere `_source/sanity-masters/`, que no está en el repo ni en el contenedor. No depende de esta migración. |
| Visual (capturas contra baseline) | `npm run check:visual` | ⛔ NO MEDIDA a propósito (CLAUDE.md §1: barrido de 115 rutas × 4 anchos). Las referencias se renombraron sin tocar el píxel; el marcado no cambia salvo los `href`. |
| Sanity (TEST 10) | GROQ por MCP | ✅ 0 `href` viejos en 47 `blogPost`; 0 borradores; referencias por `_id` sin URLs |
| Grep global (TEST 11) | ver *Old URL search* en el informe | ✅ 0 enlaces activos; restos = sources de redirect, origen congelado y documentación histórica |

Despliegue del 3-oct-2026 (`c4f8d62`, `dpl_2K59uvNqdHLCZripxjwm1Qz2mLQY`): puntos 1-3 verificados en vivo desde el sandbox de Composio — 90/90 redirects 308 directos, 90/90 destinos 200, sitemap 168 sin URLs viejas, apex → www, robots y canónicas correctas, 0 enlaces internos viejos. Quedan los puntos 4-6.

Checklist de despliegue (inmediatamente después de publicar en producción):
1. `curl -sI https://www.mrandmrsoutdoorliving.com/pool-builders/beach-florida` → `308` con `location: /services/pool-builders/hillsboro-beach-fl`; lo mismo para `/excavation`, `/pool-builders/pool-builders-ocala-florida` y `/services/custom-pool-spa-builders-in-north-south-florida`.
2. `curl -s https://www.mrandmrsoutdoorliving.com/sitemap.xml | grep -c '<loc>'` → 168, y 0 coincidencias de `in-north-south-florida`, `/pool-builders/`, `/country/`.
3. Las 76 nuevas en 200 (`check-redirects` lo mide en local; en vivo basta un `for` sobre `src/data/seo-url-migrations.json`).
4. Search Console: enviar el sitemap de nuevo e inspeccionar `/services/pool-builders`, `/services/pool-builders/ocala-fl` y `/services/pool-builders/marion-county-fl` (canónica declarada = canónica elegida).
5. GA4/Ads: las Final URL de los ad groups «Pool Builders Core», «Ocala», «Gainesville» y «Remodeling» deben actualizarse a las nuevas URLs (hoy llegan por 308; funciona, pero cuesta un salto en tráfico de pago).
6. Regenerar la caché del blog con red (`node scripts/cache-blog-sanity.mjs`) y comprobar que el diff es vacío.


## Inventario del sitemap (antes → después)

- **Sustituidas (76 → 76):** las de la tabla *Mapping*.
- **Permanecen (82):** `/`, las 13 corporativas/herramientas, las 3 legales, `/where-we-serve` + 2 regionales, los 15 `/project/`, `/blogs-tips` y los 47 `/blogs/`, `/financing`, `/pool-investment-estimator`.
- **Añadidas (10):** `/gallery/<categoría>` — las añadió el generador el 2-oct-2026 (`ADICIONES_GALERIA`); el `public/sitemap.xml` versionado no se había regenerado desde entonces.
- **Desaparecidas:** ninguna aparte de las 76 sustituidas.
- Entradas de imagen (`<image:image>`): 34, en `/services/pool-builders` y `/services/pool-remodeling` (antes en sus URLs viejas).

## Qué queda fuera, a propósito

- Blogs (`/blogs/*`), proyectos (`/project/*`, `/projects`), corporativas, legales, `/where-we-serve*`: sin cambios de URL.
- No se crean páginas locales de `pool-remodeling` ni de otros servicios: la arquitectura queda preparada (`/services/<servicio>/<ciudad>-fl`) pero esa es la siguiente fase.
- `_source/vivo/`, `_source/cms/`, `_source/live/sitemap.txt`, `baseline/html/*.html` (contenido), `audit/`, `docs/encargos/*`, `MIGRACION-LOG.md` histórico y los `PROMPT-*.md`: conservan las URLs viejas porque **son** el registro del origen o de encargos ya cerrados.
