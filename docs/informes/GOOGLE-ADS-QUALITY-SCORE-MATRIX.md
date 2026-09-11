# Google Ads — matriz de Quality Score

**Fecha:** 2026-09-11 · **Propiedad GA4:** `properties/506563956` · **GSC:** `sc-domain:mrandmrsoutdoorliving.com`

> **Actualizado el 11-sep-2026 por R17-CORE.** La landing del ad group «Pool Builders Core»
> —`/services/custom-pool-spa-builders-in-north-south-florida`— pasa de **88 a 95** en el score
> interno. Lo que lo mueve está en §3, con lo que lo prueba al lado. Las otras tres landings no
> se tocaron. **El bloqueo de lanzamiento de §0 sigue exactamente igual**: esto sube lo que el
> sitio controla y no arregla nada de GTM.
>
> Informe de la ficha: [`docs/encargos/R17-CORE.md`](../encargos/R17-CORE.md).

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
| First 100 Words | ✅ **pool nueva + North Florida + teléfono + CTA** | ✅ inground + Alachua | ✅ inground + Marion | ✅ remodel + pool |
| CTA Match | ✅ **ancla al formulario de la propia página** | ✅ Free Estimate (2.º clic) | ✅ Free Estimate (2.º clic) | ✅ Free Estimate (2.º clic) |
| Local Match | **North Florida delante en héroe, teléfonos y `location`** | ✅ Gainesville + Alachua County | ✅ Ocala + Marion County | zona regional |
| Commercial Intent | ✅ **remodelación fuera del cluster y enlazada a su landing** | ✅ | ✅ | ✅ |
| **Internal LP Score** | **95** (era 88) | **90** | **90** | **86** |
| Main Gap | — el formulario propio está puesto | sin formulario propio | sin formulario propio | sin formulario propio |
| Required Action | verificar GTM | A1 (5 campos) · verificar GTM | ídem | ídem |
| Priority | P0 (tracking) | P0 (tracking) | P0 (tracking) | P0 (tracking) |
| Status | READY AFTER FIXES | READY AFTER FIXES | READY AFTER FIXES | READY AFTER FIXES |

---

## 3 · QS3 — Internal Landing Page Relevance Score

> ### ⚠️ NOT A GOOGLE METRIC
> Es una métrica **propia y solo de auditoría**. Google no publica su fórmula de Quality Score y
> pondera histórico y competencia que este repositorio no ve. Este número mide **lo que el sitio
> controla**, y nada más. No sustituye ni predice el Landing Page Experience real.

| Criterio | Máx | Core (era) | **Core (hoy)** | Gvl | Oca | Rem |
|---|---:|---:|---:|---:|---:|---:|
| Search Intent Match | 20 | 20 | **20** | 20 | 20 | 20 |
| H1/Hero Message Match | 15 | 15 | **15** | 15 | 15 | 14 |
| First 100 Words Relevance | 10 | 9 | **10** | 10 | 10 | 9 |
| Semantic Service Coverage | 10 | 10 | **10** | 9 | 9 | 9 |
| Geographic Relevance | 10 | 7 | **8** | 10 | 10 | 7 |
| Commercial Intent / Scope | 10 | 9 | **10** | 8 | 8 | 8 |
| CTA / Conversion Match | 10 | 6 | **10** | 6 | 6 | 6 |
| Trust / Supporting Evidence | 5 | 5 | **5** | 5 | 5 | 5 |
| Mobile UX | 5 | 4 | **4** | 4 | 4 | 5 |
| Technical / Performance | 5 | 3 | **3** | 3 | 3 | 3 |
| **TOTAL** | **100** | **88** | **95** | **90** | **90** | **86** |

**R17-CORE, 11-sep-2026 — los 7 puntos que subió Core, uno por uno y con lo que los prueba:**

| Punto | De → a | Qué lo mueve | Cómo se comprueba |
|---|---|---|---|
| First 100 Words | 9 → 10 | el héroe abre con «New custom inground pools for **North Florida** homeowners», los dos teléfonos con `tel:` y un CTA que ancla a `#estimate` **de esta misma página** | `check:ads` regla 12 · 7 `href="tel:"` en el cuerpo, antes 0 |
| Geographic | 7 → **8** | North Florida delante en héroe, teléfonos y `location`; campo ZIP obligatorio con `pattern="[0-9]{5}"` | los 2 puntos que faltan **no se recuperan**: el slug dice `north-south` y renombrarlo rompe la Final URL del anuncio |
| Commercial Intent | 9 → 10 | los 8 subservicios se reordenan (obra nueva delante), se corrige «redesigns», y los 6 de remodelación **enlazan a la landing de Remodeling** en vez de no enlazar a nada | antes: 8 subservicios, **0 enlaces** |
| CTA / Conversion | 6 → **10** | `<form data-mm-envia="1">` propio con 8 cualificadores obligatorios. **Se acaba el segundo clic** que el tráfico de pago tenía que dar hasta `/request-estimated` | `check:ads` regla 13 · 1 `<form>` en la página, antes 0 |
| Mobile UX | 4 → **4** | medido a 390 px sobre el build, no en dispositivo real. **Se mantiene la deducción**: laboratorio no es teléfono. Con criterio laxo sería 96 | se declara, no se maquilla |
| Technical | 3 → **3** | sigue `PRODUCTION PERFORMANCE VERIFICATION BLOCKED` (§5) | ídem |

**Las deducciones, justificadas — ninguna es de relleno:**

- **CTA / Conversión, −4 en tres. Cerrada en Core (11-sep-2026).** Gainesville, Ocala y Remodel
  siguen sin `<form>` propio: el tráfico de pago tiene que hacer **un segundo clic** hasta
  `/contact-us` o `/request-estimated`, y cada clic intermedio cuesta conversiones ya pagadas.
  Core ya lo tiene puesto, y el mecanismo está escrito para las 14 fichas: una entrada de JSON
  y una línea de lista de rutas por cada una de las trece restantes.
- **Technical / Performance, −2 en las cuatro.** No es que rindan mal: es que **no se ha podido
  medir contra producción**. El proxy de egress deniega el dominio, y el encargo prohíbe marcar
  como aprobado lo que no se midió. Ver §5.
- **Geographic, −2 en Core (era −3) y −3 en Remodel.** Los slugs dicen `north-south-florida` y
  los anuncios prometen «North Florida». Se resolvió por copy —North Florida delante en
  `<title>`, h1 y héroe—, que es lo correcto: renombrar el slug rompería la URL final del
  anuncio. En Core se recuperó un punto más el 11-sep: los dos teléfonos con el de North Florida
  primero **en el cuerpo** (antes la página no tenía ni uno: el invariante pasaba solo por el
  cromo), `location` reordenada con North Florida delante y campo ZIP obligatorio. **Los 2 que
  quedan no se recuperan sin romper el slug**, y el slug es la Final URL del anuncio.
- **Mobile UX, −1 en Core/Gvl/Oca.** Sin medida en dispositivo real; hay 80 px reservados para
  el botón flotante de llamada y no se han roto, pero eso es verificación estática. En Core se
  volvió a medir el 11-sep sobre el build con `getBoundingClientRect` —h1, CTA y teléfono de
  North Florida dentro del pliegue a 390×844 y a 1440×900, con los 80 px reservados— y **la
  deducción se mantiene igual**: el laboratorio no es un teléfono. Aceptarla como medida daría
  96 en vez de 95; no se hace.
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
- **FORM ⚠️ → ✅ en Core** (11-sep-2026). `Pool Builders Core Form`, `<form data-mm-envia="1">`
  con `action="/api/formulario"`, ocho cualificadores obligatorios, honeypot `ref_id`, time-trap
  y Turnstile con `action=core`. `form_name` propio —**no** se reutilizó «Request Quote Form»,
  que habría dado `estimate` e indistinguible del de `/request-estimated` en GA4—. Cuatro de los
  cualificadores caen en parámetros que `generate_lead` **ya** empuja (`project_type`,
  `user_type`, `budget_range`, `service_interest`); el ZIP y el Timeline viajan **solo al
  correo**. Gainesville, Ocala y Remodel siguen en ⚠️: A1 pendiente.
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
pendiente **en 13 de las 14 fichas**. En Core se hizo el 11-sep, y así se mide:

```bash
$ node -e 'const h=require("fs").readFileSync(F,"utf8").slice(...);
           imgs.filter(t=>!/\bwidth=/.test(t)||!/\bheight=/.test(t)).length'

  /services/pool-remodeling-renovation-…  (ficha sin tocar)  135 <img>,  97 sin dimensiones
  /services/custom-pool-spa-builders-…    (Core, hoy)        133 <img>,  59 sin dimensiones
```

Las 38 de diferencia son exactamente el cuerpo de la ficha: héroe, `image`, los 8 iconos de
subservicio, los 4 pasos del proceso, los 2 fondos de diseño, los 10 iconos de acordeón y los 2
fondos a sangre. **Las 59 que quedan son todas de cromo compartido** —logo del nav y del pie,
`icon-deco`, el carrusel de servicios, los iconos del submenú, el carrusel de blog y el visor de
la galería—, con recuento idéntico al de la ficha sin tocar: tocarlas cambiaría las otras 121
páginas, que este encargo mantiene byte a byte iguales.

Las 4 restantes propias de Core son los slides de `CarruselProyectos`, que **no** declara
dimensiones y lo montan 66 rutas: bajarlas de 10 a 4 ya fue una mejora —la sección `gallery` que
sustituyó traía 10 sin dimensiones— y hornearlas es un frente de las 66, no de esta ficha.

Y el héroe, que es el LCP:

| Medida | Antes | Después |
|---|---|---|
| `loading` del héroe | `lazy` | `eager` |
| `fetchpriority` | ausente | `high` |
| `width`/`height` | ausentes | `1250`/`698` |

`fetchpriority="high"` en todo el sitio pasa de **1 imagen a 2**: la de Core es la segunda.

---

## 6 · Veredicto

### Por landing page

| Landing | Veredicto | Qué falta |
|---|---|---|
| Pool Builders Core | **READY AFTER FIXES** | verificar GTM (§0). **A1 hecho** el 11-sep |
| Gainesville | **READY AFTER FIXES** | verificar GTM (§0) · A1 |
| Ocala | **READY AFTER FIXES** | verificar GTM (§0) · A1 |
| Full Remodel | **READY AFTER FIXES** | verificar GTM (§0) · A1 |

Las cuatro pasan `npm run check:ads`: intención correcta arriba del pliegue, un solo `<h1>`,
canónica correcta, sin `noindex`, con camino a conversión, con el teléfono de North Florida
delante, JSON-LD válido, cero afirmaciones prohibidas y cero redirects sobre la URL final.

**Tres reglas nuevas desde el 11-sep** (`scripts/check-ads-landing-pages.mjs`), y las tres se
rompieron a propósito una vez para ver el rojo antes de darlas por buenas:

| # | Qué exige | Por qué existe |
|---:|---|---|
| 11 | **cero cifras de precio en el cuerpo** (los `<option>` de un `<select>` se descuentan) | el `$75,000 – $500,000+` estaba en el cuerpo **y dentro del `FAQPage`**, sin verificar, y las regex viejas buscaban `$55K`/`$20K+`: no lo cazaban. Choca además con la decisión TILA/Reg Z del 2-sep |
| 12 | el héroe **no** es `lazy`, lleva `fetchpriority="high"` y sus dimensiones | el héroe es el LCP y salía diferido |
| 13 | **un solo** `<form data-mm-envia="1">`, con `data-name`, `action`, honeypot, preselección de Project Type y paneles de éxito/fallo | es la regla que convierte «hay formulario» en «hay formulario que funciona» |

Y se arregló un defecto de la propia puerta: `:161` usaba el contador **global** `fallos`, así que
una landing rota dejaba **mudas** las líneas `ok` de todas las siguientes. Ahora cuenta por
landing.

La puerta dice en voz alta lo que todavía no está hecho — «3 de 4 landings sin la capa de
captación» — en vez de callarlo: no es un fallo suyo, es trabajo pendiente, y se imprime.

### Un hallazgo que no es de Quality Score y hay que decir igual

**Los cuatro formularios antiguos del sitio exigen el consentimiento de SMS para poder enviarse.**
`/contact-us`, `/request-estimated`, `/brochures` y el lightbox de `/gallery` traen la casilla
`required` desde Webflow, y su texto mezcla avisos de obra con «promotions». Exigir un
consentimiento de **marketing** como condición para pedir un presupuesto es justo lo que
47 CFR §64.1200(a)(2) no permite — y además es el único campo obligatorio de esos formularios que
no aporta nada a la estimación: quien no lo marca se va sin dejar el lead que ya se pagó.

**En el formulario nuevo del Core va opcional**, y es el único del sitio que además **registra** el
consentimiento en el correo del lead. Los otros cuatro son rutas fuera del encargo R17-CORE y **no
se tocaron**. Es decisión de Sebastian si se igualan.

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
