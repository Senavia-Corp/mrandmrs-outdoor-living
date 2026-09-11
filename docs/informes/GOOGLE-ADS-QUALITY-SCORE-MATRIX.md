# Google Ads — matriz de Quality Score

**Fecha:** 2026-09-11 · **Propiedad GA4:** `properties/506563956` · **GSC:** `sc-domain:mrandmrsoutdoorliving.com`

---

## 0 · Lo primero, porque cambia el veredicto de todo lo demás

> ## 🚨 El evento de conversión no existe en GA4. Cero, en ocho meses y medio.
>
> ```
> GOOGLE_ANALYTICS_RUN_REPORT · properties/506563956 · 2026-01-01 → 2026-09-11
> dimensions=[eventName]   (18 eventos distintos, lista completa)
>
>   page_view 8932 · user_engagement 6671 · scroll 4506 · session_start 2882
>   first_visit 2223 · lead_form_start 219 · form_start 217 · click 100
>   form_submit 94 · file_download 22 · video_progress 16 · phone_click 13
>   whatsapp_chat 6 · call_click_elsight 4 · video_start 4 · chat_start_elsight 2
>   whatsapp_click 2 · video_complete 1
>
>   generate_lead ......... 0      ← el evento de conversión
>   click_to_call ......... 0
>   estimator_complete .... 0
>   brochure_download ..... 0
>   view_project_gallery .. 0
> ```
>
> **Los cinco tags de evento personalizado de `gtm-container.json` están los cinco a cero.**
>
> Y no es que nadie convierta. `/thank-you` —que es quien empuja `generate_lead`— tiene
> **18 páginas vistas** en esa misma ventana:
> ```
> dimensions=[pagePath] filtro CONTAINS "thank" → /thank-you : 18 screenPageViews
> ```
>
> Así que el push **sale del sitio** (`src/pages/thank-you.astro:158-159`) y el tag de GTM **no
> lo recoge**. Eso se arregla en la interfaz de GTM, no en este repositorio.
>
> **Sospechoso principal:** el contenedor trae un trigger de bloqueo
> `BLOQUEO - Entornos de preview` (id 30) cuya condición es `{{_event}} .*` — casa con
> **todos** los eventos. Si en el contenedor publicado ese bloqueo no está acotado a preview,
> bloquea también producción, que es exactamente el síntoma observado. **Hay que verificarlo en
> GTM antes de lanzar.**
>
> **Consecuencia comercial:** las dos campañas son *Maximize Conversions*. Una estrategia de puja
> que optimiza hacia conversiones, con **cero** conversiones registradas, no tiene de qué
> aprender. Lanzar $2.000/mes contra eso es el error más caro disponible en este encargo.

---

## 1 · QS1 — inventario keyword → ad group → landing page

**Las 39 keywords no están disponibles.** Se agotaron las vías, y consta cuál se intentó:

| Fuente (orden de precedencia del encargo) | Resultado |
|---|---|
| Export LIVE de Google Ads | ❌ `GOOGLEADS_SEARCH_STREAM_GAQL` → `USER_PERMISSION_DENIED`. La única conexión de Composio es `googleads_chinky-wasat` (Ab-Aluminum-and-Screens) y no alcanza esta cuenta |
| `…FINAL_LAUNCH_MASTER_2026-09-07.xlsx` | ❌ No existe. Buscado en **todas** las unidades de Drive: `name contains 'LAUNCH_MASTER'` → vacío; `name contains 'Google_Ads'` → 25 resultados, ninguno es él; cualquier `.xlsx` modificado después del 2026-09-04 → vacío |
| Fichero de campaña más reciente | ⚠️ `FINAL_BUILD_2026-09-03.xlsx` existe, pero es **cuatro días anterior** al que el encargo nombra. No se usa: construir sobre una versión que pudo cambiar es peor que declarar el hueco |
| Datos ya documentados en el encargo | ✅ Es lo que hay abajo |

**Por tanto: `Keyword`, `Match Type`, `Current QS`, `Expected CTR`, `Ad Relevance` y
`Landing Page Experience` son `DATA NOT AVAILABLE` en las 39 filas.** No se inventan, no se
estiman y no se sustituyen por una investigación de keywords nueva.

Lo que **sí** consta, verificado contra el repositorio construido:

| Campaign | Ad Group | kw | Final URL | ¿existe? | ¿redirige? |
|---|---|---:|---|---|---|
| New Pool Construction \| North Florida | Pool Builders Core | 20 | `/services/custom-pool-spa-builders-in-north-south-florida` | ✅ 200 en build | ✅ no |
| New Pool Construction \| North Florida | Gainesville | 5 | `/pool-builders/gainesville-florida` | ✅ 200 en build | ✅ no |
| New Pool Construction \| North Florida | Ocala | 5 | `/pool-builders/ocala-florida` | ✅ 200 en build | ✅ no |
| Complete Pool Remodeling \| North Florida | Full Remodel | 9 | `/services/pool-remodeling-renovation-in-north-south-florida` | ✅ 200 en build | ✅ no |
| Brand \| North Florida | — | — | PAUSADA | — | — |

«¿redirige?» importa más de lo que parece: **una URL final de anuncio que redirige es rechazo de
anuncio**, no una molestia. Lo vigila `npm run check:ads` en cada pasada.

---

## 2 · QS2 — matriz por landing page

Al no haber keywords individuales, la matriz se agrupa por **ad group**, que es la unidad real
de Ad Relevance en Google Ads. En cuanto aparezca el export, cada fila se abre en sus keywords
sin rehacer nada.

| Campo | Pool Builders Core | Gainesville | Ocala | Full Remodel |
|---|---|---|---|---|
| Final URL | `/services/custom-pool-spa-builders-…` | `/pool-builders/gainesville-florida` | `/pool-builders/ocala-florida` | `/services/pool-remodeling-renovation-…` |
| Search Intent | construcción de piscina nueva | ídem + local | ídem + local | remodelación completa |
| **Current QS** | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE |
| **Expected CTR** | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE |
| **Ad Relevance** | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE |
| **Landing Page Exp.** | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE | DATA NOT AVAILABLE |
| H1 Match | ✅ «Custom Pool Builders» | ✅ **corregido** | ✅ **corregido** | ✅ «Pool Remodeling & Renovation Services» |
| Hero Match | ✅ | ✅ **corregido** | ✅ **corregido** | ✅ |
| First 100 Words | ✅ pool + zona | ✅ inground + Alachua | ✅ inground + Marion | ✅ remodel + pool |
| CTA Match | ✅ Free Estimate | ✅ | ✅ | ✅ |
| Local Match | zona regional | ✅ Gainesville + Alachua County | ✅ Ocala + Marion County | zona regional |
| Commercial Intent | ✅ | ✅ | ✅ | ✅ |
| **Internal LP Score** | **88** | **90** | **90** | **86** |
| Main Gap | sin formulario propio | sin formulario propio | sin formulario propio | sin formulario propio |
| Required Action | A1 (5 campos) · verificar GTM | ídem | ídem | ídem |
| Priority | P0 (tracking) | P0 (tracking) | P0 (tracking) | P0 (tracking) |
| Status | READY AFTER FIXES | READY AFTER FIXES | READY AFTER FIXES | READY AFTER FIXES |

---

## 3 · QS3 — Internal Landing Page Relevance Score

> ### ⚠️ NOT A GOOGLE METRIC
> Es una métrica **propia y solo de auditoría**. Google no publica su fórmula de Quality Score y
> pondera histórico y competencia que este repositorio no ve. Este número mide **lo que el sitio
> controla**, y nada más. No sustituye ni predice el Landing Page Experience real.

| Criterio | Máx | Core | Gvl | Oca | Rem |
|---|---:|---:|---:|---:|---:|
| Search Intent Match | 20 | 20 | 20 | 20 | 20 |
| H1/Hero Message Match | 15 | 15 | 15 | 15 | 14 |
| First 100 Words Relevance | 10 | 9 | 10 | 10 | 9 |
| Semantic Service Coverage | 10 | 10 | 9 | 9 | 9 |
| Geographic Relevance | 10 | 7 | 10 | 10 | 7 |
| Commercial Intent / Scope | 10 | 9 | 8 | 8 | 8 |
| CTA / Conversion Match | 10 | 6 | 6 | 6 | 6 |
| Trust / Supporting Evidence | 5 | 5 | 5 | 5 | 5 |
| Mobile UX | 5 | 4 | 4 | 4 | 5 |
| Technical / Performance | 5 | 3 | 3 | 3 | 3 |
| **TOTAL** | **100** | **88** | **90** | **90** | **86** |

**Las deducciones, justificadas — ninguna es de relleno:**

- **CTA / Conversión, −4 en las cuatro.** Ninguna de las 4 lleva `<form>` propio: el tráfico de
  pago tiene que hacer **un segundo clic** hasta `/contact-us` o `/request-estimated`. Cada clic
  intermedio cuesta conversiones que ya están pagadas.
- **Technical / Performance, −2 en las cuatro.** No es que rindan mal: es que **no se ha podido
  medir contra producción**. El proxy de egress deniega el dominio, y el encargo prohíbe marcar
  como aprobado lo que no se midió. Ver §5.
- **Geographic, −3 en Core y Remodel.** Los slugs dicen `north-south-florida` y los anuncios
  prometen «North Florida». Se resolvió por copy (North Florida delante en `<title>`, h1 y
  héroe), que es lo correcto: renombrar el slug rompería la URL final del anuncio. Queda una
  dilución residual que el copy no puede eliminar del todo.
- **Mobile UX, −1 en Core/Gvl/Oca.** Sin medida en dispositivo real; hay 80 px reservados para
  el botón flotante de llamada y no se han roto, pero eso es verificación estática.
- **Commercial Intent, −2 en Gvl/Oca.** Las páginas de ciudad siguen compartiendo plantilla en
  todo lo que está por debajo del pliegue. Se corrigió lo que el anuncio ve primero; el cuerpo
  sigue siendo común.

---

## 4 · QS4 — cadena de correspondencia de mensaje

```
SEARCH QUERY → KEYWORD → AD GROUP → RSA THEME → TITLE → H1 → HERO → 100 WORDS → CTA → FORM → CONVERSION
     ?            ?          ✅         ⚠️        ✅      ✅     ✅       ✅        ✅     ⚠️        🚨
```

- **QUERY / KEYWORD** — `DATA NOT AVAILABLE` (§1).
- **RSA THEME ⚠️** — los cinco temas que el encargo cita («3D Design Preview», «Permits Managed
  for You», «Design to Final Startup», «Gunite & Concrete Pools», «Licensed Pool Contractors»)
  no se pueden cotejar uno a uno sin la hoja 13. **«Licensed Pool Contractors» sí está
  respaldado**: el pie publica `CPC1461119` y `CPC1460562` en las 122 páginas, y desde F3 van
  también en el `identifier` del `LocalBusiness`. Los otros cuatro quedan
  **RSA CLAIM REQUIRES REVIEW**: no se escriben en la página para hacerlos coincidir con el
  anuncio si no están verificados.
- **FORM ⚠️** — A1 pendiente; ninguna de las 4 tiene formulario propio.
- **CONVERSION 🚨** — §0.

---

## 5 · QS6/QS7 — rendimiento y móvil

```
PRODUCTION PERFORMANCE VERIFICATION BLOCKED
```

Medir LCP/INP/CLS contra producción es imposible desde este entorno, y se agotaron las vías:
`curl` → 403 del proxy · `WebFetch` → `EGRESS_BLOCKED` · `mcp__Vercel__web_fetch_vercel_url` →
«Unable to create shareable URL» · Firecrawl → sin conexión en Composio.

**No se marca como aprobado.** Lo que sí se midió, sobre el build:

| Medida | Valor |
|---|---|
| `<img>` sin `width`/`height` en las 122 | **10.062 de 11.636** (86 %) |
| `<img>` sin `alt` | **0** |
| `fetchpriority="high"` en todo el sitio | **1 imagen** |

Los 10.062 sin dimensiones son el motor del CLS. El generador solo hornea `width`/`height` para
dos clases (`RESERVAN_HUECO`, `build-paginas.mjs:38`); extenderlo es el arreglo, y está
pendiente.

---

## 6 · Veredicto

### Por landing page

| Landing | Veredicto | Qué falta |
|---|---|---|
| Pool Builders Core | **READY AFTER FIXES** | verificar GTM (§0) · A1 |
| Gainesville | **READY AFTER FIXES** | verificar GTM (§0) · A1 |
| Ocala | **READY AFTER FIXES** | verificar GTM (§0) · A1 |
| Full Remodel | **READY AFTER FIXES** | verificar GTM (§0) · A1 |

Las cuatro pasan `npm run check:ads`: intención correcta arriba del pliegue, un solo `<h1>`,
canónica correcta, sin `noindex`, con camino a conversión, con el teléfono de North Florida
delante, JSON-LD válido, cero afirmaciones prohibidas y cero redirects sobre la URL final.

### Por keyword

Las 39: **DATA NOT AVAILABLE**. No hay export ni acceso a la cuenta (§1).

### Gate de lanzamiento

> **NO LANZAR** hasta que `generate_lead` aparezca en GA4 en una prueba real de extremo a
> extremo. Todo lo demás de esta matriz es mejora; **esto es un bloqueo**, y no se arregla desde
> el repositorio.

### Sobre el «10/10»

No se promete, y no por prudencia retórica: el Quality Score son tres señales y el sitio gobierna
**Landing Page Experience** entera, **Ad Relevance** a medias —por correspondencia de mensaje— y
**Expected CTR** casi nada, porque depende del histórico del anuncio, que hoy no existe. Lo
controlable queda llevado al máximo y medido. Si el QS no sube, la causa estará demostrablemente
en la cuenta y no en el sitio.
