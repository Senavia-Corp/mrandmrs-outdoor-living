# Encargo — Cerrar la migración a Vercel y dejar la medición funcionando

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5 estático, adaptador Vercel, réplica elevada de
un Webflow). **Lee `docs/encargos/00-PRINCIPIOS.md` antes de nada.**

El diagnóstico está hecho y verificado en vivo el 04-sep-2026. **No lo redescubras.** Parte de
«Estado verificado» y ve directo a ejecutar.

Trabaja de forma autónoma: implementa, verifica con las puertas, actualiza `MIGRACION-LOG.md`.
**Despliega tú** — está autorizado. **No toques DNS** y no publiques la versión de GTM: eso es
de Sebastian y está en la Fase M.

---

## 0 · Lo que está sangrando AHORA MISMO

Ordenado por daño. El punto 1 es el único urgente de verdad.

### 1 · Producción le está diciendo a Google que suelte el sitio entero

El DNS ya apunta a Vercel, pero el último build salió **sin `PUBLIC_ES_PRODUCCION`**, y ese
interruptor gobierna tres cosas a la vez (`scripts/build-seo-ficheros.mjs` y `Base.astro:215`):

```
robots.txt        ->  User-agent: *  /  Disallow: /
las 122 páginas   ->  <meta name="robots" content="noindex, nofollow">
sitemap.xml       ->  vacío, 0 <loc>
```

Lo que hay en juego, medido en Search Console sobre los últimos 6 meses:
**434 clics y 165.829 impresiones.**

La variable **ya está puesta** en Vercel. El interruptor falla cerrado a propósito, así que
esto **solo se arregla con un redespliegue**. Es la Fase 1 y va antes que nada.

### 2 · Cinco eventos de valor sin instrumentar

`generate_lead` ya está. Faltan `click_to_call`, `estimator_complete`, `brochure_download` y
`view_project_gallery` — Fase 3. El teléfono importa especialmente: hay dos números y un botón
flotante, y hoy **ninguna llamada se registra**.

### 3 · El Meta Pixel está muerto desde el corte

`863379502909192` vivía **solo** en el campo nativo de Webflow. Al salir de Webflow desapareció.
No está en el contenedor GTM (comprobado: 0 coincidencias en `gtm.js`). Fase M.

---

## Estado verificado — no lo repitas

### DNS (GoDaddy, ns75/ns76) — corte hecho y propagado

| | Valor |
|---|---|
| apex `A` | `216.198.79.1` (Vercel) |
| `www` `CNAME` | `ce49e370cc4a9456.vercel-dns-017.com` (Vercel) |
| Comportamiento | **apex → 308 → `www`**. `www` sirve 200. |

Comprobado en los tres resolvers públicos (8.8.8.8, 1.1.1.1, 9.9.9.9), no solo en el autoritativo.

**Sobrevivió todo lo que tenía que sobrevivir**, verificado registro a registro:
MX a `mail.protection.outlook.com`, DKIM `selector1`/`selector2._domainkey`, `_dmarc` con
`p=quarantine`, y el SPF —cuya cadena `secureserver.net` → `spf-0.secureserver.net` →
`include:spf.protection.outlook.com` **sí cubre Microsoft 365**, no está roto—. Y sobre todo:
el TXT **`google-site-verification=UJWfkVC3d9LtrG958vwFUDNqN19uc_MQi7LFo5YJp2A` sigue en la
zona**, que es lo que mantiene viva la propiedad de Search Console. **No lo borres nunca.**

Sobra el TXT `_webflow one-time-verification=2642f237-…`. Se puede quitar (Fase M).

### GA4 — propiedad `506563956`, stream `12213454581`, `G-7VHTVG2Q7G`

Enhanced Measurement está **activo** y **ya emite** `form_start`, `lead_form_start`,
`form_submit`, `scroll`, `file_download`, `click`.

> 🚨 **No crees un evento propio llamado `form_start` ni `lead_form_start`.** Ya existen y
> chocarían. El inicio de formulario lo cubre Enhanced Measurement: úsalo, no lo dupliques.

Línea base de los últimos 30 días, para poder detectar si algo se rompe o se duplica:

```
page_view      2382       form_start        25
user_engagement 2085      lead_form_start   24
scroll         1887       form_submit       16
session_start   525       click             16
first_visit     463       file_download      6
```

`page_view / session_start` = **4,54 páginas por sesión**, alto para un sitio de marketing.
La causa probable era el doble etiquetado de Webflow (campo nativo + contenedor GTM, mismo
Measurement ID). **No lo di por demostrado**: no pude contar los envíos reales porque GA4 usa
`sendBeacon` y eso no aparece en la Resource Timing API. En Astro la fuente es una sola, así que
el problema se extingue solo — pero **vigila esa cifra una semana después del despliegue**: si
baja hacia 2-2,5, era eso.

### GTM `GTM-N9BWB3BV`

Leído del `gtm.js` publicado: **3 tags `googtag` con el MISMO `G-7VHTVG2Q7G`**, 7 tags Custom
HTML, **0** referencias al pixel de Meta, **0** tags `AW-`. Los nombres y disparadores de esos
7 Custom HTML **no se pueden leer desde `gtm.js`**: hay que mirarlos en la interfaz antes de
tocar nada.

### Search Console — `sc-domain:mrandmrsoutdoorliving.com`, `siteOwner`

Es **propiedad de dominio**, verificada por DNS. Por eso el corte a Vercel no la rompió.

**9 URLs legacy que Google todavía sirve y que no tienen página**; 7 siguen el patrón
`/pool-builders/pool-builders-*`. En 6 meses: 19 clics y 11.307 impresiones. Dos merecen
atención: `/services/custom-aluminum-wood-pergola-builders-in-north-south-florida` rankea en
**posición 2,2** y ya daba 404 en el sitio viejo, y `/excavation` en posición 8,3. Webflow las
redirigía; `vercel.json` no lo hacía, así que al cortar morían todas. **Ya está resuelto** (ver
abajo), pero verifícalo en producción.

### Qué se puede automatizar — comprobado, no supuesto

| Sistema | Realidad |
|---|---|
| **Search Console** | ✅ Escritura completa vía Composio: `ADD_SITE`, `SUBMIT_SITEMAP`, `LIST_SITEMAPS`, `INSPECT_URL`, `SEARCH_ANALYTICS_QUERY` |
| **GA4 lectura** | ✅ `LIST_ACCOUNT_SUMMARIES`, `LIST_CONVERSION_EVENTS`, `GET_KEY_EVENT`, `RUN_REPORT` → sirve para **verificar** |
| **GA4 escritura** | ⚠️ Solo `CREATE_CUSTOM_METRIC`. **No existe crear-dimensión ni marcar-key-event** → configuración a mano |
| **Tag Manager** | ❌ **Composio no tiene toolkit de GTM.** Todo manual, por eso hay un JSON de importación |

---

## Lo YA aplicado en el árbol — verifícalo, no lo rehagas

Sin commitear y **sin desplegar**. `npm run build` pasa y produce 122 HTML.

| Fichero | Cambio | Cómo verificarlo |
|---|---|---|
| `vercel.json` | +3 redirects: comodín `/pool-builders/pool-builders-:slug`, la de pergola en posición 2,2, y `/excavation` | 8 redirects en total |
| `src/layouts/Base.astro` | Snippet GTM `is:inline` tras `FUENTES_PRECARGA`, antes de `<title>` | 121 páginas |
| `src/pages/pool-investment-estimator.astro` | El mismo snippet. **Esta página no usa `Base.astro`**, tiene `<head>` propio, y era la única de las 122 sin medir pese a llevar el `Pool Estimator Form` | la 122ª |
| `src/components/Formularios.astro` | Rama `if (ok)`: escribe `sessionStorage.mm_lead` y redirige a `/thank-you?f=`. `CLAVE_SITIO` → `0x4AAAAAAEnkUHbX6ap29qsu` | línea 23 y ~100-135 |
| `src/pages/thank-you.astro` | Página nueva. `noindex` vía prop `seo`, push `generate_lead` con guarda | 0 literales de color |
| `gtm-container.json` | Contenedor listo para importar: 10 variables, 6 disparadores, 8 tags | JSON válido |
| Vercel env | `PUBLIC_ES_PRODUCCION`, `SMTP_USER`, `SMTP_PASS`, `TURNSTILE_SECRET` | `npx vercel env ls` → 4 |

**Comprueba antes de tocar**: si algo de esto no está (checkout distinto, cambios revertidos),
aplícalo. Las instrucciones son idempotentes a propósito.

---

## FASE 0 · La decisión que bloquea el despliegue

**Vercel sirve `www` y el apex hace 308 hacia él. `astro.config.mjs` declara
`site: 'https://mrandmrsoutdoorliving.com'` — el apex.**

Consecuencia: las 122 canónicas y las 113 URLs del sitemap apuntan a una URL que **redirige**.
Google lo acaba resolviendo, pero gasta rastreo y ensucia la cobertura («Página con
redirección») justo en la semana más frágil de la migración.

**Opción A — recomendada.** Sebastian entra en Vercel → Settings → Domains y pone
`mrandmrsoutdoorliving.com` como **Production**, con `www` redirigiendo hacia él. Cero cambios
de código, y coincide con los 6 meses de historial de Search Console donde el apex era el
canónico (`https://mrandmrsoutdoorliving.com/` con 150 clics).

**Opción B.** Cambiar `site` a `https://www.mrandmrsoutdoorliving.com`, regenerar sitemap y
canónicas, y re-enviar el sitemap. Más trabajo y rompe la continuidad.

**Si nadie ha decidido cuando llegues aquí: para y pregunta.** No despliegues con las canónicas
apuntando a una redirección.

---

## FASE 1 · Desplegar (esto apaga el incendio del punto 0.1)

Depende de: Fase 0 resuelta.

```bash
cd ~/Sites/mrandmrs-outdoor-living
npm run check          # las puertas, enteras
npx vercel --prod
```

**Verifica en producción inmediatamente después**, contra el host que sirva según la Fase 0:

```bash
curl -s https://<host>/robots.txt                       # NO puede decir Disallow: /
curl -s https://<host>/sitemap.xml | grep -c '<loc>'    # tiene que dar 113
curl -s https://<host>/contact-us | grep -c 'noindex'   # tiene que dar 0
curl -s https://<host>/contact-us | grep -o '<link rel="canonical"[^>]*>'
curl -s https://<host>/thank-you  | grep -c 'noindex'   # tiene que dar 1
curl -s https://<host>/sitemap.xml | grep -c 'thank-you' # tiene que dar 0
```

> El build local corre **sin** `PUBLIC_ES_PRODUCCION`, así que en local `robots.txt` dice
> `Disallow: /` y el sitemap sale vacío — correcto para preview. Por eso **«`/thank-you` está
> fuera del sitemap» solo queda demostrado con el build de Vercel.** Hasta entonces no lo des
> por verde.

Y los redirects, que hasta ahora los servía Webflow:

```bash
for u in /pool-builders/pool-builders-hallandale-beach-florida \
         /pool-builders/pool-builders-ocala-florida \
         /services/custom-aluminum-wood-pergola-builders-in-north-south-florida \
         /excavation ; do
  curl -s -o /dev/null -w "%{http_code} $u\n" "https://<host>$u"
done   # los cuatro tienen que dar 301
```

---

## FASE 2 · La ruta del lead, de punta a punta

Depende de: Fase 1.

Esto **no se verifica leyendo código**. Envía un formulario de verdad desde el navegador y
comprueba las cinco cosas:

1. El widget de Turnstile se pinta (site key `0x4AAAAAAEnkUHbX6ap29qsu`).
2. El envío responde `200 {"ok":true}` — no 403 ni 500.
3. **Llega el correo** a `info@mrandmrsoutdoorliving.com`.
4. El navegador aterriza en `/thank-you?f=contact`.
5. En GA4 DebugView aparece **un** `generate_lead` con sus 6 parámetros.

Dos trampas ya identificadas:

- **403 en todo**: `TURNSTILE_SECRET` lleva la site key en vez de la secret. `formulario.ts:112`
  hace `if (!secreta) return 'ok'` —sin clave se salta la validación y pasa—, pero con la clave
  **equivocada** Cloudflare devuelve `invalid-input-secret` y `formulario.ts:122` responde
  `'invalido'` → **403 en cada lead**. Es peor que no ponerla.
- **500 en todo**: falta `SMTP_USER` o `SMTP_PASS`. `formulario.ts:177-181` devuelve 500 y el
  lead **no se entrega**.

> 🚨 **El `From:` del correo es `SMTP_USER`** (`formulario.ts:197`). Tiene que ser la cuenta de
> Gmail real. Si alguien lo cambia a `info@mrandmrsoutdoorliving.com` mientras se autentica
> contra Gmail, el `From` dice el dominio pero el correo sale de servidores de Google: el SPF
> del dominio cubre GoDaddy y Outlook, **no Google** → SPF falla, DKIM no alinea, y con
> `_dmarc p=quarantine` **cada aviso de lead se va a spam sin que nadie se entere.**

Repite el envío desde los **5** puntos: `/contact-us`, `/request-estimated`, el lightbox de
`/gallery`, `/brochures` y el estimador. Confirma que `form_name` sale `contact`, `estimate`,
`gallery`, `brochures` y `estimator` respectivamente — la desambiguación de `Request Quote Form`
se hace **por ruta**, porque tres formularios comparten `data-name`.

Y las dos pruebas que demuestran que la guarda funciona:

- **F5 sobre `/thank-you`** → **cero** `generate_lead` nuevos.
- **`/thank-you` en pestaña nueva** → **cero** conversiones.

---

## FASE 3 · Los cinco eventos que faltan

Depende de: Fase 1. Independiente de la Fase 2.

Todos son `dataLayer.push`. Los tags que los consumen ya están en `gtm-container.json`.

| Evento | Dónde | Parámetros |
|---|---|---|
| `click_to_call` | Listener **delegado en `document`**, no uno por enlace: hay `tel:` en el nav, el pie, `/contact-us` y el botón flotante `ClickToCall.astro` | `phone_region`: `352…`→`north`, `954…`→`south` |
| `estimator_complete` | `widgets/Estimador.astro`, donde ya se muestra el resultado | `budget_range` — el **rango**, nunca la cifra si lleva datos del usuario |
| `brochure_download` | Delegado, clicks a PDF en `/brochures` | `link_text` |
| `view_project_gallery` | Apertura del lightbox en `GalleryLeadLightbox.astro` | `link_text` |

**No añadas `form_start`.** Enhanced Measurement ya lo emite (25 en 30 días). Duplicarlo es
peor que no tenerlo.

> 🚨 **LÍNEA ROJA — PII.** Ni email, ni teléfono, ni nombre, ni `Street-Address` salen al
> dataLayer. Es política de Google —te pueden borrar la propiedad— y es un problema legal.
> Solo campos categóricos. `City` es el límite y en la duda, fuera. `Formularios.astro` ya está
> escrito así; mantenlo. Antes de cerrar, `grep` sobre los push para confirmarlo.

---

## FASE M · Lo que NO puede automatizarse (Sebastian, en la interfaz)

Ningún agente puede hacer esto. Entrégalo como lista de comprobación, en este orden.

### M1 · GTM — importar `gtm-container.json`

1. **Primero, auditar los 7 tags Custom HTML que ya existen.** No se pueden leer desde
   `gtm.js`. Si alguno duplica GA4 o Meta, se pausa.
2. Admin → Import Container → **«Merge» + «Rename conflicting»**. **Nunca «Overwrite»**.
3. Dejar **un solo** Google Tag con `G-7VHTVG2Q7G`. **Pausar los otros dos.**
4. Confirmar que el disparador de bloqueo `BLOQUEO - Entornos de preview`
   (`vercel.app|localhost|127.0.0.1|webflow.io`) está como **excepción en todos** los tags de
   medición.
5. Vista previa con Tag Assistant contra producción **antes** de publicar.
6. Publicar con nombre de versión y notas.

> El JSON está escrito a mano contra el formato de exportación actual de GTM. **Revisa tag por
> tag después de importar**: si GTM cambió algún nombre de parámetro, la importación puede
> dejar un campo vacío sin dar error.

### M2 · GA4 — propiedad `506563956`

1. **Key event**: marcar `generate_lead`. Opcionalmente `click_to_call` como secundaria.
2. **Dimensiones personalizadas, ámbito evento** — sin esto los parámetros llegan pero **son
   invisibles en los informes**:
   `form_name`, `form_location`, `project_type`, `user_type`, `budget_range`,
   `service_interest`, `phone_region`.
3. **Retención de datos → 14 meses.** Por defecto son 2 y es pérdida silenciosa.
4. **Excluir referencias**: `challenges.cloudflare.com`. Turnstile rompe la atribución de origen
   si no se excluye — y este sitio lo lleva en los 5 formularios.
5. **Filtro de tráfico interno** por la IP de la oficina.
6. **Enlazar con Search Console.**

Verificable después con `GOOGLE_ANALYTICS_LIST_CONVERSION_EVENTS` y `RUN_REPORT`.

### M3 · Search Console

La propiedad ya existe y está verificada. Tras el despliegue:

1. `SUBMIT_SITEMAP` con el sitemap del host que decida la Fase 0.
2. `INSPECT_URL` sobre una muestra: home, un `/services/*`, un `/pool-builders/*`, un `/blogs/*`
   y una de las URLs redirigidas.
3. Vigilar «Página con redirección» en Cobertura durante dos semanas.

### M4 · Meta Pixel `863379502909192`

Los dos tags están en el JSON (`Meta Pixel - Base` y `Meta Pixel - Lead`). Tras publicar,
verificar con la extensión **Meta Pixel Helper** que `PageView` sale una sola vez y que `Lead`
salta en `/thank-you`.

### M5 · Limpieza, cuando todo lo anterior esté verde

- Borrar el TXT `_webflow one-time-verification=…` de GoDaddy.
- Si el proyecto de Webflow sigue vivo: **quitar el Google Tag ID y el Meta Pixel ID de sus
  campos nativos**, para que no queden dos sitios midiendo.
- `CNAME pay → paylinks.commerce.godaddy.com` si no se usa.
- **Jamás** el TXT `google-site-verification`.

---

## Fuera de alcance — para en seco

- **Tocar DNS.** Ninguna fase, ninguna excusa.
- **Publicar la versión de GTM.** Se deja preparada; publica Sebastian.
- **Crear tags `AW-` o acciones de conversión de Google Ads.** Todavía no hay campañas. La
  infraestructura queda lista: cuando se activen, se importa `generate_lead` desde GA4.
- **Conversions API de Meta / Enhanced Conversions.** Son servidor y necesitan hash de PII.
- **Consent Mode v2.** Deliberadamente fuera: audiencia de Florida, tráfico del EEE
  despreciable. Anótalo en el log **como decisión, no como olvido**.
- **Reescribir copy existente.** `check:texto` compara `innerText` al 100 %. El texto de
  `/thank-you` es tuyo porque es página nueva; el del resto, no.

---

## Puertas y verificación

```bash
npm run check
```

Y declara esto **explícitamente** en el informe, porque es la regla dura de la casa —una puerta
que no corre por falta de referencia **falla ABIERTO**:

> `check:visual` y `check:texto` **no cubren `/thank-you`**. Es página nueva y no existe
> referencia en `baseline/shots/`. Esas puertas **se saltaron, no pasaron.**

Por eso `/thank-you` necesita revisión que las puertas no dan: agente **`ui-qa`** + **`0.8.0:audit`**
(accesslint) antes de darla por buena. Foco visible, orden de encabezados, contraste sobre
`--mm-fondo-navy`, tap targets de los dos teléfonos, y los 4 anchos (479/991/1440/1920).

Comprobaciones que sí son exigibles:

1. **122 de 122** páginas con el snippet de GTM en el `<head>`.
2. `grep` sobre todos los `dataLayer.push`: **cero** email, teléfono, nombre o dirección.
3. Las 5 pruebas de la Fase 2, una por formulario.
4. F5 y enlace directo sobre `/thank-you`: cero conversiones nuevas.
5. GA4 DebugView: los 6 eventos con nombre y parámetros correctos.

---

## Riesgos, cada uno con su mitigación

| Riesgo | Estado / mitigación |
|---|---|
| Producción sigue `noindex` y Google desindexa | **Activo ahora.** Fase 1, es lo primero. |
| Canónicas apuntando a una URL que redirige | **Activo.** Fase 0, bloquea el despliegue. |
| `TURNSTILE_SECRET` con la site key → 403 en todos los leads | Fase 2, prueba 2. Peor que no ponerla. |
| `SMTP_USER` con el dominio propio → DMARC manda los leads a spam | Fase 2. Tiene que ser la cuenta de Gmail. |
| El redirect rompe `check:galeria-formulario` | **No.** Verificado: `check-galeria-formulario.mjs:54` solo exige que el marcado exista. Mantén `.w-form-done`. |
| `/thank-you` se cuela en el sitemap | **No.** Lista explícita en `build-seo-ficheros.mjs`. No la añadas. Confirmar en el build de Vercel. |
| El estimador en un iframe rompería el redirect | **No.** La decisión D3 lo empotró. |
| Turnstile rompe la atribución de origen | M2 punto 4. |
| Los preview de Vercel ensucian GA4 | Disparador de bloqueo por hostname, M1 punto 4. |
| El JSON de GTM importa con campos vacíos | M1: revisar tag por tag después de importar. |
| 4,54 páginas por sesión sigue alto tras el corte | Entonces no era el doble etiquetado. Investigar con DebugView. |
