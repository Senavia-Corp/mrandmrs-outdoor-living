# TRACKING-ESTADO — diagnóstico de la medición de Google

**Etapa 1 del encargo «Medición de Google cerrada».** Solo lectura: no se ha tocado ni un
interruptor, ni se ha guardado ningún borrador, ni se ha construido, commiteado ni desplegado
nada del sitio.

- **Fecha:** 11-sep-2026
- **Alcance:** GTM `GTM-N9BWB3BV` · GA4 `properties/506563956` · Google Ads `971-839-0464`
- **Método:** API de Google Ads (GAQL) y de GA4 (Admin + Data) vía Composio · `grep` sobre el
  árbol del repo · Gmail para la verdad de contraste.

---

## 0 · Léelo primero: tres cosas cambian el encargo

### 0.A 🚨 Enhanced Conversions for Leads YA ESTÁ ACTIVADO, y las condiciones YA ESTÁN ACEPTADAS

El §1.4.5 pedía comprobar esto como «hallazgo grave». Lo es, y está:

```
GOOGLESUPER_SEARCH_STREAM_GAQL · customers/9718390464
SELECT customer.conversion_tracking_setting.* FROM customer

  "conversionTrackingId": "18420694908",
  "conversionTrackingStatus": "CONVERSION_TRACKING_MANAGED_BY_SELF",
  "googleAdsConversionCustomer": "customers/9718390464",
  "acceptedCustomerDataTerms": true,          ← YA aceptadas
  "enhancedConversionsForLeadsEnabled": true  ← YA activado
```

**Qué significa de verdad, sin alarmismo:** el interruptor está puesto y el contrato firmado,
pero **no hay ninguna etiqueta de Ads en el sitio que pueda alimentarlo**. Hoy es una
capacidad armada y vacía: no está leyendo emails de nadie, porque no hay tag que los lea.

**Qué arrastra:** la decisión **D4 deja de ser una decisión de «activar o no»** y pasa a ser
una de «desactivar o usar». Y hay una contradicción viva que hay que resolver sí o sí: la
cabecera de `Formularios.astro:126-129` afirma lo contrario de lo que la cuenta tiene puesto.

> ```js
> // 🚨 VIAJA SOLO AL CORREO. Ni una de estas claves se acerca al dataLayer: `gclid` y el
> // referrer identifican a una persona en cuanto se cruzan con la plataforma de anuncios.
> ```

El código dice la verdad sobre el código. La cuenta de Ads dice otra cosa sobre la cuenta.

### 0.B 🚨 Las campañas NO están pausadas: están ENABLED y SERVING

El encargo dice «pausadas» y asume dos campañas a $1.600 + $400/mes. Ni una cosa ni la otra:

```
SELECT campaign.name, campaign.status, campaign.serving_status,
       campaign.advertising_channel_type, campaign_budget.amount_micros FROM campaign

PMax | New Pool Construction | North FL   PERFORMANCE_MAX  ENABLED / SERVING   $17,00/día
New Pool Construction | North Florida     SEARCH           ENABLED / SERVING   $54,00/día
Pool Remodeling | North Florida           SEARCH           ENABLED / SERVING   $17,00/día
```

- Son **tres**, no dos. **Hay una campaña Performance Max que el encargo no menciona.**
- Presupuesto diario total **$88 ≈ $2.676/mes**, no $2.000.
- Las tres en `MAXIMIZE_CONVERSIONS`, sin tCPA.

Ahora el matiz que evita el pánico — gasto real de los últimos 90 días:

```
SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros
FROM campaign WHERE segments.date BETWEEN '2026-06-13' AND '2026-09-11'

PMax | New Pool Construction | North FL   impresiones 0    clics 0   coste $0,00
New Pool Construction | North Florida     impresiones 15   clics 0   coste $0,00
Pool Remodeling | North Florida           impresiones 0    clics 0   coste $0,00
```

**Están habilitadas y elegibles, pero no entregan.** No se está quemando dinero hoy. Pero la
premisa del §2.5 («lo esperado mientras las campañas estén pausadas») es falsa: **no hay una
pausa que proteja**. El día que eso empiece a servir —y basta con que Google lo decida—, puja
contra un objetivo sin datos. Esto sube la urgencia de la Etapa 2; no la baja.

### 0.C 🚨 Dos de las cuatro fuentes del diagnóstico son inalcanzables desde esta sesión

Esta sesión corre en un contenedor en la nube, no en el Chrome de Sebastian.

| Fuente | Estado | Consecuencia |
|---|---|---|
| Google Ads (GAQL) | ✅ **funciona** | 1.4 hecho casi entero |
| GA4 (Admin + Data API) | ✅ **funciona** | 1.3 hecho a medias |
| **Producción por HTTP** | ❌ **egress bloqueado** | **1.1 NO SE HA HECHO** |
| **Interfaz de GTM** | ❌ **sin navegador y sin API** | **1.2 NO SE HA HECHO** |

Evidencia del bloqueo de red, por dos caminos independientes:

```
$ curl -sS -o /dev/null -w '%{http_code}\n' https://www.mrandmrsoutdoorliving.com/
curl: (56) CONNECT tunnel failed, response 403
000

$ curl -sS "$HTTPS_PROXY/__agentproxy/status"
"recentRelayFailures": [
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "www.mrandmrsoutdoorliving.com:443" },
  { "host": "example.com:443", "kind": "connect_rejected" }   ← también el control
]
```

Y por la vía de fetch del propio agente: `EGRESS_BLOCKED · www.mrandmrsoutdoorliving.com`.

No es TLS ni es el dominio: el DNS resuelve (`216.198.79.1` → Vercel). Es política de salida.
No he reintentado ni buscado rodeos.

**Falla ABIERTO** (`DIRECTOR.md:149`): 1.1 y 1.2 quedan **sin comprobar**, no en verde.

---

## 1 · La matriz de señales

Una fila por señal. `?` = no verificable desde esta sesión.

| Señal | ¿La emite el código? | Etiqueta GTM (publicado) | Evento GA4 | ¿Key event? | Acción de Ads | ¿Primary? | Fuentes duplicadas |
|---|---|---|---|---|---|---|---|
| **Lead de formulario** | ✅ `generate_lead`, con guarda | ❌ ninguna escucha `generate_lead` | **0 en 90 d** | ❌ no existe | `Enviar formulario de clientes potenciales` (`WEBPAGE_CODELESS`) | ✅ **sí** | 🚨 **3**: EM `form_submit` + `Lead Form Submit` + regla de URL en Ads |
| **Clic al teléfono** | ✅ `click_to_call` + `phone_region` | ❌ | **0 en 90 d** | ❌ | ninguna nativa · importada `phone_click` (HIDDEN) | ❌ | `phone_click` (2 en 90 d) |
| **Llamada desde anuncio** | n/a | n/a | n/a | n/a | `conversionActions/179` vía 2 assets CALL | n/d | — |
| **Estimador** | ✅ `estimator_complete` | ❌ | **0 en 90 d** | ❌ | ninguna | — | — |
| **Folleto** | ✅ `brochure_download` | ❌ | **0 en 90 d** | ❌ | ninguna | — | EM `file_download` (10 en 90 d) |
| **Galería** | ✅ `view_project_gallery` | ❌ | **0 en 90 d** | ❌ | ninguna | — | — |
| **page_view** | vía Google tag de GTM | `Etiqueta de Google G-7VHTVG2Q7G` | **5.333 en 90 d** | n/a | — | — | ratio 4,56 — ver §3.3 |

La lectura de una línea: **el sitio emite cinco señales limpias y ninguna de las cinco llega a
ningún sitio.** Lo único que hoy cuenta como lead es medición automática que dispara antes de
que el servidor conteste.

---

## 2 · Cada punto del §0, confirmado o refutado

### §0.1 · El lead real no llega ni a GA4 ni a Ads — ✅ **CONFIRMADO**

```
GOOGLE_ANALYTICS_RUN_REPORT · properties/506563956 · 2026-06-13 → 2026-09-11
dimensions=[eventName] metrics=[eventCount]   (14 eventos distintos, lista COMPLETA)

page_view 5333 · user_engagement 4436 · scroll 3987 · session_start 1170 · first_visit 995
lead_form_start 71 · form_start 68 · form_submit 49 · click 35 · file_download 10
video_progress 4 · phone_click 2 · video_complete 1 · video_start 1

generate_lead ......... AUSENTE
click_to_call ......... AUSENTE
estimator_complete .... AUSENTE
brochure_download ..... AUSENTE
view_project_gallery .. AUSENTE
```

Los cinco no aparecen. El hecho está confirmado.

**La causa, en cambio, NO está demostrada** — y aquí refuto al informe anterior. El
`GOOGLE-ADS-QUALITY-SCORE-MATRIX.md:39-43` señala como «sospechoso principal» el disparador
`BLOQUEO - Entornos de preview` con `{{_event}}` regex `.*`. **Ese disparador vive en
`gtm-container.json`, que nunca se importó** (`MIGRACION-LOG.md:4670`). No puede estar
bloqueando un contenedor en el que no existe.

La explicación que sí encaja con todo lo observado es la del propio encargo: **el contenedor
vivo es el de Webflow y ninguna de sus 5 etiquetas escucha esos nombres de evento.** No hay
nada que bloquear porque no hay nada que disparar.

> ⚠️ Pero el `.*` sigue siendo un riesgo **futuro** real: en cuanto se importe el JSON, ese
> disparador es excepción en las 8 etiquetas. El 2.2.6 tiene que probarlo en Vista previa
> **contra producción**, no darlo por bueno.

### §0.2 · Lo que hoy cuenta como lead es basura — ✅ **CONFIRMADO, y cuantificado**

`form_submit` es key event en GA4 desde el 8-feb-2026 y tiene 49 eventos en 90 días. Contra la
verdad —los correos de aviso, que salen solo cuando el servidor entregó:

```
Gmail · subject:"New lead" after:2026/06/13 · remitente mrandmrsoutdoorliving@gmail.com

2026-09-04 21:07 EDT  Gallery request · Trenton 32693-2744   · /gallery
2026-09-07 08:19 EDT  Estimate request · Coral Springs 33071 · /request-estimated
2026-09-08 09:20 EDT  Contact form                            · /contact-us
2026-09-08 13:42 EDT  Gallery request · weston 33322          · /gallery      ← prueba (sebastian navia)
2026-09-08 13:44 EDT  Contact form · ref tagassistant.google.com              ← prueba
```

**5 correos desde que el aviso existe, de los cuales 2 son pruebas de Sebastian → 3 leads reales.**

Contra `form_submit` día a día en la misma ventana:

| Día | `form_submit` (GA4) | Correos de lead | Veredicto |
|---|---:|---:|---|
| 2026-09-04 | **13** | **1** | 🚨 divergen 13:1 |
| 2026-09-05 | 0 | 0 | — |
| 2026-09-06 | 0 | 0 | — |
| 2026-09-07 | **1** | **1** | ✅ cuadran |
| 2026-09-08 | **3** | **3** | ✅ cuadran |
| **Total** | **17** | **5** | |

El matiz honesto: **`form_submit` y el correo cuadran perfectamente los días 7 y 8.** Toda la
divergencia está en el 4-sep, el día de la migración, con Turnstile roto y el antibot contando
sus propias capturas (`MIGRACION-LOG.md:4328-4344`).

Eso **no rehabilita `form_submit`**: sigue disparando en el submit del navegador, antes del
403 de Turnstile y antes del descarte silencioso del honeypot. Es una señal que cuadra cuando
no pasa nada raro y se dispara 13:1 justo el día que pasa algo raro. **Para aprendizaje de
puja, eso es inservible.** Pero la afirmación «cuenta los bots todos los días» no se sostiene
con los datos: fue un día concreto.

### §0.3 · Google Ads no tiene ninguna conversión que funcione — ⚠️ **REFUTADO EN TRES PUNTOS**

El resultado (cero conversiones útiles) es correcto. El diagnóstico, no.

**(a) `Enviar formulario de clientes potenciales` está montada por REGLA DE URL.** Era la
pregunta abierta del §1.4.2. Respuesta:

```
conversion_action.id                        7744524683
conversion_action.type                      WEBPAGE_CODELESS   ← regla de URL, NO id+etiqueta
conversion_action.origin                    WEBSITE
conversion_action.category                  SUBMIT_LEAD_FORM
conversion_action.primary_for_goal          true
conversion_action.counting_type             MANY_PER_CLICK     ← «Every», no «One»
conversion_action.click_through_lookback…   30
conversion_action.attribution_model         GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN (AVAILABLE)
conversion_action.include_in_conversions_…  false
```

`WEBPAGE_CODELESS` confirma la sospecha del encargo: **se dispara por carga de página sobre la
Google tag, se salta la guarda de `mm_lead`, y con `MANY_PER_CLICK` cada F5 de `/thank-you`
contaría otra vez.** No tiene id + etiqueta que reutilizar.
→ **Rama 2 del 2.1.2: hay que crear una acción nueva y pasar esta a Secondary.**

**(b) 🚨 «No hay ninguna acción de llamada» es FALSO. Hay dos assets CALL activos.**

```
FROM customer_asset                             FROM campaign_asset
asset 415581207346  CALL  (954) 913-7112        asset 418977962401  CALL  (352) 740-3361
  customerAsset CALL · ENABLED  ← nivel cuenta    PMax | New Pool Construction  · ENABLED
  callConversionReportingState:                   Pool Remodeling | North FL    · ENABLED
    USE_ACCOUNT_LEVEL_CALL_CONVERSION_ACTION      (mismo reporting state)
  callConversionAction: …/conversionActions/179
```

Tres cosas salen de aquí:

1. **Sí hay asset de llamada** → la rama «Primary también: llamadas desde anuncios ≥ 60 s» de
   **D1 es viable sin crear nada**, solo configurando.
2. ⚠️ **El número a nivel de cuenta es el de South Florida `(954) 913-7112`**, mientras que el
   de las campañas es North `(352) 740-3361`. La adenda A3 dice que el tráfico de pago es de
   North. **Un asset de llamada a nivel de cuenta con el número equivocado es una fuga.**
3. ⚠️ **La campaña de $54/día, `New Pool Construction | North Florida`, NO tiene asset de
   llamada.** Es la de mayor presupuesto de las tres.

`conversionActions/179` no se puede leer por GAQL desde esta cuenta (devuelve 0 filas): es la
acción de llamada por defecto de Google a nivel de sistema. **Hay que verla en la interfaz.**

**(c) «Las campañas están pausadas» es FALSO.** Ver §0.B.

**Inventario completo de las 12 acciones de conversión:**

| id | Nombre | Origen | Tipo | Categoría | Estado | Primary | Recuento |
|---|---|---|---|---|---|---|---|
| 7744524683 | Enviar formulario de clientes potenciales | WEBSITE | `WEBPAGE_CODELESS` | SUBMIT_LEAD_FORM | ENABLED | ✅ **sí** | Every |
| 7741518216 | Lead form - Submit | GOOGLE_HOSTED | LEAD_FORM_SUBMIT | SUBMIT_LEAD_FORM | ENABLED | no | One |
| 7758321517 | YouTube channel subscriptions | YOUTUBE_HOSTED | — | ENGAGEMENT | ENABLED | ✅ **sí** | One |
| 7758191975 | YouTube follow-on views | YOUTUBE_HOSTED | — | YOUTUBE_FOLLOW_ON_VIEWS | ENABLED | ✅ **sí** | Every |
| 7758304690 | …(web) purchase | WEBSITE | GA4_PURCHASE | PURCHASE | HIDDEN | no | Every |
| 7758304684 | …(web) close_convert_lead | WEBSITE | — | CONVERTED_LEAD | HIDDEN | no | Every |
| 7758304687 | …(web) qualify_lead | WEBSITE | — | QUALIFIED_LEAD | HIDDEN | no | Every |
| 7758304693 | …(web) call_click_elsight | WEBSITE | GA4_CUSTOM | DEFAULT | HIDDEN | no | Every |
| 7758304696 | …(web) phone_click | WEBSITE | GA4_CUSTOM | DEFAULT | HIDDEN | no | Every |
| 7758304789 | …(web) chat_start_elsight | WEBSITE | GA4_CUSTOM | DEFAULT | HIDDEN | no | Every |
| 7758304792 | …(web) form_submit | WEBSITE | GA4_CUSTOM | DEFAULT | HIDDEN | no | Every |
| 7758304795 | …(web) whatsapp_click | WEBSITE | GA4_CUSTOM | DEFAULT | HIDDEN | no | Every |

✅ **Buena noticia para el 2.1.5:** las 8 importadas de GA4 ya están `HIDDEN` y ninguna es
Primary. No hay que degradarlas.
⚠️ `Lead form - Submit` tiene `defaultCurrencyCode: "XXX"` con `alwaysUseDefaultValue: true`.
`XXX` es el código ISO de «sin moneda»: un valor de 1 sin moneda válida.
🚨 **`Business profile - Form submit 🔒` NO aparece en la API.** La interfaz la muestra dentro
del goal; GAQL no la devuelve. Encaja con `customerConversionGoal SUBMIT_LEAD_FORM~UNKNOWN`.

### §0.4 · El «tag de Google Ads» que copió Sebastian es el de GA4 — ✅ **CONFIRMADO**

`G-7VHTVG2Q7G` es el Measurement ID del stream 12213454581. Confirmado por
`GOOGLE_ANALYTICS_LIST_DATA_STREAMS`. No pegarlo: GTM ya lo carga.

**Y ya tenemos el ID de Ads que sí hace falta**, sin tener que buscarlo en la interfaz:

```
customer.conversion_tracking_setting.conversion_tracking_id = 18420694908
```

→ **El ID de conversión para el 2.2.3 es `AW-18420694908`.** La etiqueta de conversión
(*conversion label*) sale al crear la acción, con `GOOGLEADS_GET_CONVERSION_ACTION_TAG_SNIPPETS`.

### §0.5 · Los clics al teléfono se cuentan de menos — ✅ **CONFIRMADO por volumen** · ⚠️ mecanismo sin probar

`phone_click` = **2 eventos en 90 días**, y los dos el 2026-09-04, los dos en `/brochures`.
Frente a eso, el sitio tiene 5 puntos de clic al teléfono y `file_download` saca 10.

El marcado del icono del nav es exactamente lo que el encargo sospechaba (`Nav.astro:25`):

```html
<a href="tel:+13527403361" aria-label="Call (352) 740-3361" class="phone-link w-inline-block">
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" …></svg>
</a>
```

**Cero texto: solo el `<svg>`.** Un disparador de «Todos los elementos» con `Click URL contiene
tel:` recibe el `<svg>` como `gtm.element` y `Click URL` sale vacía. La hipótesis es
consistente con el marcado y con el volumen, **pero confirmarla exige Vista previa** y eso no
se puede hacer desde aquí.

> ⚠️ **Corrección al encargo:** no son 3 sitios de clic, son **5**, y **ninguno está en el pie**
> (`Footer.astro` no tiene un solo `tel:`). Son: icono del nav (1 enlace, solo North) · botón
> flotante `ClickToCall.astro` (2) · `/contact-us` `div.phone-wrapper` (2) · `/thank-you` (2) ·
> panel de fallo del formulario inyectado por JS (2). **El 2.2.6 tiene que probar los cinco.**

### §0.6 · Restos de Elfsight — ✅ **CONFIRMADO, y hay más de lo que decía el encargo**

En `src/`: 7 menciones de Elfsight, **todas en comentarios**; 1 de WhatsApp, **también
comentario**. Cero código. En GA4 siguen como key events `call_click_elsight`,
`chat_start_elsight` y `whatsapp_click`. **Y además** existen como 3 acciones de conversión
importadas en Ads (7758304693, 7758304789, 7758304795), en `HIDDEN`.

---

## 3 · Lo que sí se pudo medir de 1.3 (GA4) — y lo que no

### 3.1 · Configuración de la propiedad

| Ajuste | Valor medido | Veredicto |
|---|---|---|
| Propiedad / cuenta | `properties/506563956` en `accounts/369710957` | ok |
| Stream web | `12213454581` · `G-7VHTVG2Q7G` · defaultUri **apex** `https://mrandmrsoutdoorliving.com` | ⚠️ el canónico es `www` |
| Moneda | USD | ok |
| **Zona horaria** | **`America/Los_Angeles`** | 🚨 **el negocio es de Florida; Ads está en `America/New_York`** |
| Nivel | `GOOGLE_ANALYTICS_STANDARD` | ok |
| **Retención de datos de EVENTO** | **`TWO_MONTHS`** | 🚨 **pendiente del M2** |
| Retención de datos de usuario | `FOURTEEN_MONTHS` | ok |
| Atribución (informes) | `PAID_AND_ORGANIC_CHANNELS_DATA_DRIVEN` | ok |
| Ventana de adquisición / otras | 30 días / 90 días | ok |
| Exportación a Ads | `GOOGLE_PAID_CHANNELS` | ok |
| **Dimensiones personalizadas** | **0 — respuesta vacía** | 🚨 **las 7 del M2, pendientes** |
| **Reglas de «Crear eventos»** | **0 — respuesta vacía** | ver 3.2 |
| **Vínculo con Google Ads** | ✅ **existe**: `googleAdsLinks/15756403672` → `9718390464`, creado **2026-09-10** por sebastian@senaviacorp.com, `adsPersonalizationEnabled: true` | ✅ **el 2.3.6 ya está hecho** |

🚨 **La zona horaria es un problema operativo, no cosmético.** GA4 cierra el día 3 horas
después que Ads. Cualquier cuadre diario entre los dos —y el §2.5 es exactamente eso— sale
descuadrado en los bordes del día. Cambiarla no reprocesa el histórico, así que es una
decisión con coste; la dejo planteada, no resuelta.

### 3.2 · De dónde sale `lead_form_start` — ❌ **hipótesis del encargo REFUTADA**

El encargo proponía una regla de «Crear eventos personalizados» a partir de `form_start`.

```
GOOGLE_ANALYTICS_LIST_EVENT_CREATE_RULES
  parent = properties/506563956/dataStreams/12213454581
  →  {}     (vacío: no hay ninguna regla)
```

**No hay ninguna regla de creación de eventos en el stream.** La hipótesis queda descartada.

Además, los números no son los de un duplicado: **`lead_form_start` (71) > `form_start` (68)**
a 90 días. Y por página, `lead_form_start` dispara en `/brochures` (3 veces) — una página que
según `MIGRACION-LOG.md:4397` **no tiene formulario de lead**.

Queda una sola explicación posible: algo empuja `lead_form_start` al dataLayer, y la etiqueta
`Lead Form Start` del contenedor vivo lo recoge. **Solo el export del contenedor publicado lo
resuelve.** Sin comprobar.

### 3.3 · El ratio `page_view / session_start`

| Ventana | page_view | session_start | Ratio |
|---|---:|---:|---:|
| 90 días (13-jun → 11-sep) | 5.333 | 1.170 | **4,56** |
| Antes del corte (13-jun → 3-sep) | 3.042 | 912 | **3,34** |
| **Después del corte (6-sep → 11-sep)** | **208** | **119** | **1,75** |

El 4,56 a 90 días reproduce el 4,54 de referencia. Pero partido por el corte, **el ratio cae a
1,75**, que es sano. La conjetura del doble etiquetado de Webflow queda **respaldada**.

⚠️ Cuidado con los dos días de la migración, que contaminan cualquier media que los incluya:

```
2026-09-04   page_view   485   session_start 65
2026-09-05   page_view  1598   session_start 74   ← ratio 21,6
```

Son la auditoría y el rastreo del día del despliegue. **Para el cuadre del 2.5, la línea base
buena es 1,75, no 4,54**, y hay que excluir el 4 y el 5 de septiembre.

### 3.4 · Lo que NO se pudo leer de 1.3 — falla ABIERTO

No hay tool en Composio que lea estos ajustes, y no hay navegador. **Quedan para Sebastian:**

- [ ] Los **7 interruptores** de Enhanced Measurement (uno a uno).
- [ ] Las reglas de **«Modificar eventos»**.
- [ ] **Referencias no deseadas** — la lista actual.
- [ ] **Tráfico interno** — si está definido y si está activo.
- [ ] **Vínculo con Search Console**.

> 💡 Hallazgo lateral que cambia el M2: en un correo de lead real aparece
> `Referral from tagassistant.google.com`. **Las pruebas de Tag Assistant de la Etapa 2 van a
> contaminar la atribución.** A la lista de referencias excluidas hay que añadir
> **`tagassistant.google.com`**, no solo `challenges.cloudflare.com`.

> 💡 Segundo hallazgo lateral, ya documentado en `SEO-AEO-GEO-PLAN.md:185-186` y confirmado:
> `/cascaron`, ruta de fixture (`MM_FIXTURES=1`), recibe sesiones reales en GA4.

### 3.5 · Metas de conversión — y por qué esto decide D1

```
FROM customer_conversion_goal            (metas por defecto de la CUENTA)
  SUBMIT_LEAD_FORM ~ WEBSITE            biddable: (no)
  SUBMIT_LEAD_FORM ~ GOOGLE_HOSTED      biddable: (no)
  SUBMIT_LEAD_FORM ~ UNKNOWN            biddable: (no)
  ENGAGEMENT ~ YOUTUBE_HOSTED           biddable: TRUE   🚨
  YOUTUBE_FOLLOW_ON_VIEWS ~ YOUTUBE…    biddable: TRUE   🚨
```

```
FROM campaign_conversion_goal            (metas PROPIAS de cada campaña)
PMax | New Pool Construction   SUBMIT_LEAD_FORM~WEBSITE        biddable TRUE
                               (las otras 4, no biddable — YouTube incluido)
New Pool Construction | NF     SUBMIT_LEAD_FORM~WEBSITE        biddable TRUE
                               SUBMIT_LEAD_FORM~GOOGLE_HOSTED  biddable TRUE
Pool Remodeling | NF           SUBMIT_LEAD_FORM~WEBSITE        biddable TRUE
                               SUBMIT_LEAD_FORM~GOOGLE_HOSTED  biddable TRUE
```

**Respuesta al §1.4.3: las tres campañas usan metas PROPIAS, no las de la cuenta.** Dos
consecuencias que mandan sobre la Etapa 2:

1. ✅ **Una acción nueva en `SUBMIT_LEAD_FORM` + origen `WEBSITE` hereda la pujabilidad en las
   tres campañas sin tocar ni una campaña.** Es exactamente lo que hace falta y cae dentro del
   alcance.
2. 🚨 **Una acción de llamada (`PHONE_CALL_LEADS`) NO sería pujable** sin editar el juego de
   metas de cada campaña — y eso es tocar campañas, que está **fuera de alcance**. La rama de
   D1 sobre llamadas Primary **no se puede ejecutar sin el equipo de medios**.
3. ✅ Sobre **D8**: las metas de YouTube son pujables **solo en las metas por defecto de la
   cuenta**, y ninguna campaña las usa. El riesgo es **latente, no activo**. La recomendación
   de pasarlas a Secondary sigue en pie, pero no es urgente.

---

## 4 · Lo que se puede automatizar — corregido

La tabla del encargo estaba desactualizada en cuatro casillas.

| Sistema | El encargo decía | **Medido hoy** |
|---|---|---|
| GA4, lectura | ✅ 2 tools | ✅ **mucho más**: retención, atribución, streams, vínculos con Ads, reglas de evento, dimensiones |
| GA4, escritura | ⚠️ solo `CREATE_CUSTOM_METRIC` | ✅ **`GOOGLE_ANALYTICS_CREATE_CUSTOM_DIMENSION` existe → las 7 dimensiones del M2 son automatizables** |
| GA4, key events | — | ❌ **solo interfaz.** La API es de solo lectura, confirmado por la propia doc del tool |
| GTM | ❌ sin toolkit | ❌ **confirmado, sin toolkit de ningún tipo** |
| Google Ads, lectura | ✅ `GOOGLEADS_SEARCH_STREAM_GAQL` | ⚠️ **ese tool da 403.** Funciona **`GOOGLESUPER_SEARCH_STREAM_GAQL`** (identidad sebastian@senaviacorp.com) |
| Google Ads, escritura | ❌ interfaz | ✅ **`GOOGLEADS_MUTATE_CONVERSION_ACTIONS` y `GOOGLEADS_GET_CONVERSION_ACTION_TAG_SNIPPETS` existen** (sin probar en escritura) |
| claude-in-chrome | ✅ sobre el Chrome de Sebastian | ❌ **no existe en esta sesión** (contenedor en la nube) |

El 403 de `GOOGLEADS_*`, para que quede el comando:

```
GOOGLEADS_SEARCH_STREAM_GAQL · customer_id 9718390464
403 USER_PERMISSION_DENIED — "User doesn't have permission to access customer.
Note: If you're accessing a client customer, the manager's customer id must be set
in the 'login-customer-id' header."
```
La conexión `googleads_chinky-wasat` es la de *Ab-Aluminum-and-Screens* y llega vía MCC sin
poder fijar `login-customer-id`. **Para Ads, usar siempre `GOOGLESUPER_*`.**

---

## 5 · Plan de la Etapa 2 — checklist con valores exactos

Reordenado respecto al encargo por lo aprendido. ✅ = ya está hecho, no hay que tocarlo.

### 5.1 · Google Ads (`GOOGLESUPER_*` para leer, interfaz o `MUTATE` para escribir)

- [x] ✅ **Auto-tagging** — ya activado (`customer.auto_tagging_enabled = true`). **Nada que hacer.**
- [ ] **Crear la acción de lead nueva.** `Enviar formulario de clientes potenciales` es
      `WEBPAGE_CODELESS`, así que **no se reutiliza**. Valores exactos:
      ```
      Nombre          Lead - Formulario web (generate_lead)
      Categoría       SUBMIT_LEAD_FORM
      Origen          WEBSITE
      Recuento        ONE_PER_CLICK            (One, no Every)
      Click-through   90 días
      View-through    1 día
      Atribución      GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN
      Optimización    primary_for_goal = true
      Valor           sin valor  (D3)
      Montaje         Google Tag Manager → Conversion ID + Conversion label
      ```
      → hereda pujabilidad de `SUBMIT_LEAD_FORM~WEBSITE`, ya biddable en las 3 campañas.
- [ ] **`Enviar formulario de clientes potenciales` (7744524683) → Secondary**
      (`primary_for_goal = false`). **No borrar.**
- [ ] **Crear `Click to call - website`**: categoría `PHONE_CALL_LEADS`, `ONE_PER_CLICK`,
      **Secondary** (D1). Ojo: no será pujable sin tocar campañas — es para observar.
- [ ] **Verificar `conversionActions/179` en la interfaz** (GAQL no la devuelve): categoría,
      duración mínima, si es Primary.
- [ ] 🚨 **Reportar al equipo de medios** (no tocar): el asset CALL de cuenta lleva el número de
      **South** `(954) 913-7112` cuando el tráfico de pago es de **North**; y la campaña de
      **$54/día** no tiene asset de llamada.
- [x] ✅ Importadas de GA4 → ya las 8 en `HIDDEN`, ninguna Primary. **Nada que hacer.**
- [ ] **D8**: `YouTube channel subscriptions` (7758321517) y `YouTube follow-on views`
      (7758191975) → `primary_for_goal = false`. Riesgo latente, prioridad baja.
- [ ] `Business profile - Form submit 🔒` — no se toca.
- [ ] **Comprobar en Summary** que queda **exactamente una** acción web Primary de lead.

### 5.2 · GTM — 🚨 **íntegramente de Sebastian. No hay API ni navegador.**

Sin cambios respecto al encargo (2.2.1 – 2.2.7), con estas precisiones:

- El ID de Ads para las constantes es **`AW-18420694908`**.
- El 2.2.6 tiene que probar **los 5 puntos de clic de teléfono**, no 3, y ninguno en el pie.
- El 2.2.6 tiene que probar **explícitamente** que el disparador `BLOQUEO - Entornos de
  preview` con regex `.*` **no bloquea producción** — es el riesgo que el JSON introduce.
- ⚠️ La etiqueta 42 del JSON (`GA4 - click_to_call`) **ignora el `form_location` que el sitio
  empuja** y usa `{{Page Path}}`. Revisar al importar.
- ⚠️ `{{Page Hostname}}` y `{{Page Path}}` son variables **integradas**. Si están desactivadas
  en la UI del contenedor, el bloqueo y el `form_location` no resuelven.

### 5.3 · GA4

- [ ] **Key event `generate_lead`** por nombre, **antes** de publicar GTM. (Interfaz: la API es
      de solo lectura.)
- [ ] **Las 7 dimensiones de ámbito evento** — automatizable con
      `GOOGLE_ANALYTICS_CREATE_CUSTOM_DIMENSION`: `form_name`, `form_location`, `project_type`,
      `user_type`, `budget_range`, `service_interest`, `phone_region`.
- [ ] **Retención de eventos `TWO_MONTHS` → `FOURTEEN_MONTHS`.**
- [ ] **Referencias excluidas**: `challenges.cloudflare.com` **y `tagassistant.google.com`**.
- [ ] Filtro de tráfico interno (D7, falta la IP).
- [ ] Enlace con Search Console.
- [ ] **Solo DESPUÉS de ver `generate_lead` en DebugView**: desmarcar `form_submit`,
      `phone_click`, `call_click_elsight`, `chat_start_elsight`, `whatsapp_click`.
- [ ] `qualify_lead` y `close_convert_lead` se quedan (importación offline futura).
- [x] ✅ Vínculo con Ads — ya existe desde el 10-sep, con publicidad personalizada activa.
- [ ] Anotación con la fecha del corte.
- [ ] **Decidir sobre la zona horaria** `America/Los_Angeles` (§3.1).

### 5.4 · Código — el único cambio, y no está aplicado

`scripts/check-medicion.mjs`. Punto de inserción exacto: el bucle `for (const f of htmls)`
(`:104-135`), justo después del bloque del `<noscript>` (`:116-118`).

```js
// en :100, junto a los demás acumuladores
const conGtagJs = [], conAw = [];

// dentro del for, tras el bloque del <noscript>
// Todo lo de Google entra por GTM y SOLO por GTM. Un segundo snippet de gtag/js duplica
// cada page_view y cada conversion: peor que no medir, porque los numeros salen y parecen
// buenos. Y un literal AW- en el HTML significa que alguien pego la etiqueta de Ads a mano
// en vez de montarla en el contenedor.
if (/googletagmanager\.com\/gtag\/js/.test(html)) conGtagJs.push(r);
const aw = html.match(/AW-\d{9,}/g);
if (aw) conAw.push(`${r} (${[...new Set(aw)].join(', ')})`);

// junto a los check() de :137-140
check('cero gtag/js suelto (todo lo de Google va por GTM)', conGtagJs.length === 0,
  conGtagJs.slice(0, 5).join(', '));
check('cero literales AW- en el HTML', conAw.length === 0, conAw.slice(0, 5).join(', '));
```

⚠️ Limitación que hay que decir: el script lee **solo `.html`**. Un `gtag/js` inyectado desde
un bundle de `_astro/*.js` no lo vería esta puerta.

Y solo si D4 es (a): reescribir la cabecera de `Formularios.astro:126-129`.

### 5.5 · Cuadre a las 72 h — corregido

- El correo es la verdad. **Excluir las pruebas** (hoy 2 de 5 lo son).
- La línea base del ratio es **1,75**, no 4,54, y **excluyendo el 4 y el 5 de septiembre**.
- 🚨 **GA4 cierra el día 3 h después que Ads** (Los Angeles vs Nueva York). Cuadrar por
  ventanas de varios días, nunca día a día.
- «No recent conversions» **no** es lo esperado «porque las campañas están pausadas»: no lo
  están. Es lo esperado porque no entregan (0 clics en 90 días).

---

## 6 · Decisiones — con recomendación

| # | Decisión | Recomendación | Qué cambia respecto al encargo |
|---|---|---|---|
| **D1** | De qué aprende la puja | **Primary: una sola acción web nueva de lead, disparada por `generate_lead`.** `click_to_call` → Secondary. **Llamadas desde anuncios: NO como Primary** | 🚨 Sí hay asset de llamada, pero con metas por campaña **no se puede hacer pujable sin tocar campañas** = fuera de alcance. Se reporta al equipo de medios |
| **D2** | Llamadas desde el sitio con número de desvío | **Sí, y solo North Florida** — pero **después** del lanzamiento | Hay que cubrir **4 formatos visibles** del 352: `+1 (352) 740-3361`, `(352) 740-3361`, `+1-352-740-3361`, `+13527403361`. Y son **5** puntos de clic, no 3 |
| **D3** | Valor por conversión | **Sin valor**, hasta tener ticket medio × tasa de cierre | Sin cambios. Ojo: `Lead form - Submit` ya arrastra un valor 1 con moneda `XXX` inválida |
| **D4** | Enhanced Conversions | 🚨 **La pregunta ha cambiado.** Ya está **activado** y las condiciones **aceptadas**. Recomiendo **(b) lanzar sin EC** y **dejar el interruptor como está** (hoy es inerte: no hay tag de Ads que lo alimente). Revisar con 2-4 semanas de datos | El encargo lo planteaba como «activar o no». Es «desactivar, o usarlo y reescribir la cabecera de `Formularios.astro:126-129`». **Lo que no se puede es dejar el código diciendo lo contrario de la cuenta** |
| **D5** | Nombre del evento de teléfono | **`click_to_call`**, y `phone_click` se retira en la misma publicación | Sin cambios. Refuerzo: `phone_click` = 2 en 90 días, los dos el mismo día y en la misma página |
| **D6** | Las 2 etiquetas de Meta Pixel | **En pausa** al importar | El M4 (verificar con Pixel Helper) necesita navegador. Meter Meta en la publicación que arregla Google añade una variable sin poder verificarla |
| **D7** | Tráfico interno | Hace falta **la IP de la oficina** | Y aparte: excluir **`tagassistant.google.com`** de referencias, o las pruebas de la Etapa 2 se cuentan como leads de Google |
| **D8** | Acciones de YouTube | **A Secondary**, prioridad **baja** | Son pujables solo en las metas por defecto de la cuenta, que **ninguna campaña usa**. Riesgo latente, no activo |

---

## 7 · Lo que NO se ha comprobado — falla ABIERTO

Nada de esta lista cuenta como verde.

| § | Comprobación | Estado | Por qué |
|---|---|---|---|
| **1.1** | Cobertura de las 122 rutas en producción (GTM ×1, 0 `gtag/js`, 0 `AW-`) | ❌ **NO COMPROBADO** | egress bloqueado (403 CONNECT) |
| **1.1.2** | Supervivencia del `gclid`: apex→www 308 y las 5 rutas en 200 | ❌ **NO COMPROBADO** | ídem |
| **1.2.1** | Versión publicada de GTM: cuál, cuándo, quién | ❌ **NO COMPROBADO** | sin navegador, sin API |
| **1.2.2** | Export del contenedor publicado | ❌ **NO COMPROBADO** | ídem |
| **1.2.3** | Vista previa con Tag Assistant (confirma §0.5) | ❌ **NO COMPROBADO** | ídem |
| **1.2.4** | Diff export ↔ `gtm-container.json` | ❌ **NO COMPROBADO** | ídem |
| **1.3** | Los 7 interruptores de Enhanced Measurement | ❌ **NO COMPROBADO** | sin tool, sin navegador |
| **1.3** | Reglas de «Modificar eventos» | ❌ **NO COMPROBADO** | ídem |
| **1.3** | Referencias no deseadas · tráfico interno · Search Console | ❌ **NO COMPROBADO** | ídem |
| **1.4.5** | `conversionActions/179` (la acción de llamada) | ❌ **NO COMPROBADO** | GAQL devuelve 0 filas |
| **1.4.4** | Data manager / Google tag: IDs y productos conectados | ⚠️ **PARCIAL** | el ID sale por API (`18420694908`); el resto es interfaz |
| — | Las 5 líneas de la tabla de eventos en el código | ✅ **COMPROBADO** | ver anexo |
| — | `.vercel/output/static` | ❌ **no existe** | no hay build. `check:medicion` no puede correr sin él, y construir es del director |

**Lo que hace falta para cerrar 1.1:** habilitar `www.mrandmrsoutdoorliving.com:443` y el apex
en la política de egreso de la sesión. El script está escrito y listo (anexo B).
**Lo que hace falta para cerrar 1.2:** lo hace Sebastian en su Chrome, o se abre una sesión con
navegador.

---

## Anexo A · Las 5 líneas de la tabla de eventos, verificadas

El encargo daba unas líneas; estas son las reales.

| Evento | Encargo | **Real** | Condición | Parámetros |
|---|---|---|---|---|
| `generate_lead` | `thank-you.astro:158` | **`:147-168`** | solo si `mm_lead` está en `sessionStorage` y parsea; se borra antes de empujar | `form_name`, `form_location`, `project_type`, `user_type`, `budget_range`, `service_interest` |
| `click_to_call` | `Formularios.astro:277` | **`:277`** ✅ | delegado en `document` en fase de captura; `closest('a[href]')` con `href` que empieza por `tel:` | `phone_region` (north/south/**unknown**), `form_location` |
| `brochure_download` | `Formularios.astro:289` | **`:289`** ✅ | `href` que casa `/\.pdf(\?\|#\|$)/i` | `link_text` = nombre del fichero |
| `view_project_gallery` | `GalleryLeadLightbox.astro:486` | **`:483-490`** | clic en `a.w-lightbox` dentro de `.gallery-page`; **solo en `/gallery`** | `link_text` = `alt` de la imagen |
| `estimator_complete` | `Estimador.astro:546` | **`:546`** ✅ | último paso, **una vez por carga** (guarda `completado`) | `budget_range` (6 tramos por punto medio) |

La guarda de `entregado` está en `Formularios.astro:142-154` (asignación) y **`:168-172`** (el
corte: `if (!entregado) { form.reset(); return; }`). `mm_lead` se escribe en `:179-206`, después
de la guarda.

## Anexo B · Script de cobertura, listo para cuando haya red

```bash
#!/usr/bin/env bash
# Cuenta los patrones de medicion por pagina contra PRODUCCION. Solo lectura.
set -uo pipefail
HOST="https://www.mrandmrsoutdoorliving.com"
OUT="${TMPDIR:-/tmp}/medicion"; mkdir -p "$OUT"

# El sitemap trae 121 locs; /thank-you es noindex y no esta, hay que anadirla a mano.
curl -s "$HOST/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g' \
  | sed -E "s#^https?://[^/]+##" | sed 's#^$#/#' > "$OUT/rutas.txt"
echo /thank-you >> "$OUT/rutas.txt"

printf '%-62s %4s %4s %6s %7s %4s\n' RUTA HTTP GTM ns.html gtag/js AW-
while read -r ruta; do
  body=$(curl -sL --max-time 25 -w '\n%{http_code}' "$HOST$ruta")
  code=${body##*$'\n'}; html=${body%$'\n'*}
  printf '%-62s %4s %4s %6s %7s %4s\n' "$ruta" "$code" \
    "$(grep -oc 'GTM-N9BWB3BV'        <<<"$html")" \
    "$(grep -oc 'ns\.html'            <<<"$html")" \
    "$(grep -oc 'gtag/js'             <<<"$html")" \
    "$(grep -oEc 'AW-[0-9]{9,}'       <<<"$html")"
done < "$OUT/rutas.txt" | tee "$OUT/cobertura.txt"

# gclid
curl -sI "https://mrandmrsoutdoorliving.com/contact-us?gclid=TEST123" | grep -iE '^(HTTP|location)'
for u in /services/custom-pool-spa-builders-in-north-south-florida \
         /pool-builders/gainesville-florida /pool-builders/ocala-florida \
         /services/pool-remodeling-renovation-in-north-south-florida /contact-us ; do
  curl -s -o /dev/null -w "%{http_code} $u\n" "$HOST$u?gclid=TEST123"
done
```

> ⚠️ `gtm.js` da normalmente 2 en una página sana (`event:'gtm.js'` y la URL). El doble
> etiquetado real se detecta con `GTM-N9BWB3BV > 2` o `ns.html > 1`, igual que hace
> `check-medicion.mjs:114`.

## Anexo C · Discrepancias encontradas, ajenas a la medición

Se reportan, no se tocan (`00-PRINCIPIOS.md:23`).

| # | Dónde | Qué |
|---|---|---|
| 1 | `check-medicion.mjs:24` | dice «119» pero `LOCS_ESPERADAS = 121` (`:44`). Comentario desfasado |
| 2 | `build-seo-ficheros.mjs:21` | dice «hoy 6, así que son 119»; hay **8** adiciones → 121 |
| 3 | `build-seo-ficheros.mjs:16-19` | afirma que no se meten rutas fuera del sitemap del origen; `:85-101` mete dos |
| 4 | `formulario.ts:118` | el comentario dice «doce» claves; `CLAVES_ORIGEN` tiene **11** |
| 5 | `gtm-container.json` etiqueta 42 | ignora el `form_location` empujado y usa `{{Page Path}}` |
| 6 | GA4 | `/cascaron` (fixture) recibe sesiones reales |
| 7 | Ads | `Lead form - Submit` con `defaultCurrencyCode: "XXX"` y `alwaysUseDefaultValue: true` |
| 8 | Docs | **La adenda `PROMPT-SEO-AEO-GEO-ADENDA-ADS.md` no existe en el repo** (ni en ninguna rama). §1, §5.2/rama b, §10, A6, «decisión 8» y la «hoja 25» solo constan como citas de segunda mano |

---

## PARADA

Etapa 1 entregada con **1.3 y 1.4 medidos** y **1.1 y 1.2 sin comprobar por falta de acceso**.

**Para seguir hacen falta tres cosas de Sebastian:**

1. **El OK al plan** de la §5, con las decisiones D1–D8 de la §6 resueltas.
2. **Desbloquear 1.1 o aceptar que se cierra a mano**: habilitar el egreso a
   `www.mrandmrsoutdoorliving.com:443`, o correr el script del anexo B él mismo.
3. **1.2 es suyo sí o sí**: el export del contenedor publicado y la Vista previa con Tag
   Assistant no se pueden hacer desde una sesión sin navegador. **El export es lo que
   desbloquea las dos preguntas abiertas**: qué nombre de evento manda `Lead Form Submit`, y
   quién empuja `lead_form_start`.

**Y una cosa que conviene decidir antes que el resto:** las tres campañas están `ENABLED` y
`SERVING`. Hoy no entregan, pero nada garantiza que sigan así. Si se quiere un margen de
seguridad mientras dura la Etapa 2, **pausarlas es del equipo de medios** — yo no las toco.
