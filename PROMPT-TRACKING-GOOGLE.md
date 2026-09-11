# Encargo — Medición de Google cerrada: GTM, GA4 y conversiones de Google Ads

Repo: `~/Sites/mrandmrs-outdoor-living`. **Lee antes `docs/encargos/00-PRINCIPIOS.md`, el
`CLAUDE.md` del repo y las secciones «R17-TRACKING» y «FASE LETTERHEAD» de `MIGRACION-LOG.md`.**

Trabaja con dos sombreros a la vez: **especialista de Google Ads** (qué conversión aprende la puja
y cuál solo se observa) e **ingeniero de medición** (cada señal sale una vez, de un solo sitio, y
se puede demostrar).

Este encargo **sustituye a la Fase M de `PROMPT-TRACKING.md`** y, solo para medición, levanta el
§10 de `PROMPT-SEO-AEO-GEO-ADENDA-ADS.md`: aquí **sí** se toca la configuración de conversiones de
Google Ads, GA4 y GTM. Las campañas siguen intocables.

Dos etapas. La primera termina en una parada:

1. **Etapa 1 — Diagnóstico, solo lectura.** Confirma o refuta el §0, completa lo que falta y
   entrega el plan de cambios. **Para y espera a Sebastian.**
2. **Etapa 2 — Arreglos**, con el plan aprobado, en el orden de abajo.

---

## 0 · Lo que está roto hoy

Cruce del código (verificado en producción el 4-sep) con las capturas de las tres cuentas que hizo
Sebastian el 11-sep-2026. Es hipótesis con evidencia; la Etapa 1 la confirma.

### 0.1 · El lead real no llega ni a GA4 ni a Ads

El sitio empuja `generate_lead` (con guarda) y otros cuatro eventos al `dataLayer`, verificado en
producción. **Pero `gtm-container.json` nunca se importó**: el contenedor vivo es el de Webflow
(workspace 7, 0 cambios, las 5 etiquetas «hace 7 meses») y ninguna etiqueta escucha esos eventos.
En los eventos recientes de GA4 (28 días) **no aparecen** `generate_lead`, `click_to_call`,
`estimator_complete`, `brochure_download` ni `view_project_gallery`. Mueren en el `dataLayer`
desde el 4-sep.

### 0.2 · Lo que hoy cuenta como lead es basura

El único key event de formulario con datos es **`form_submit`**. Sale de Enhanced Measurement y/o
de la etiqueta vieja `Lead Form Submit`, cuyo activador es el **Envío de formulario** nativo de
GTM. Los dos disparan en el `submit` del navegador, **antes** de que responda el servidor: cuentan
los bots que caza el honeypot, los 403 de Turnstile y los envíos que fallan. Justo lo que la guarda
`entregado` existe para filtrar (log R17, «El antibot contaba sus propias capturas como
conversiones»).

### 0.3 · Google Ads no tiene ninguna conversión que funcione

Cuenta **`971-839-0464`**. Goals → Summary:

| Goal | Acción | Optim. | Origen | Conv. | Estado |
|---|---|---|---|---|---|
| Submit lead form (3 de 3 campañas) | Business profile - Form submit 🔒 | Primary | Other | 0 | No recent conversions |
| | Enviar formulario de clientes potenciales | Primary | Website | 0 | No recent conversions |
| | Lead form - Submit | Secondary | Google hosted | 0 | No recent conversions |
| Engagement (account-default, 0 de 3) | YouTube channel subscriptions | Primary | YouTube hosted | 0 | No recent conversions |
| YouTube follow-on views (account-default, 0 de 3) | YouTube follow-on views | Primary | YouTube hosted | 0 | No recent conversions |

- **No hay ninguna etiqueta `AW-`**, ni en el contenedor ni en las 122 páginas (0 en el build, 11-sep).
  La acción «Website» o no tiene quién la dispare, **o** está montada por URL de carga de página
  sobre la Google tag. En ese caso contaría cada F5 de `/thank-you` saltándose la guarda.
  **Averigua cuál de las dos.**
- **No hay ninguna acción de llamada**: ni llamadas desde anuncios ni clics en `tel:`. Hoy
  **ninguna llamada llega a Ads**.
- Las campañas (New Pool NF a $1.600/mes y Remodel NF a $400/mes, **Maximize Conversions**,
  pausadas; adenda §1) pujarían contra un objetivo sin datos.

### 0.4 · El «tag de Google Ads» que Sebastian copió es el de GA4

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-7VHTVG2Q7G"></script>
```

`G-7VHTVG2Q7G` es el Measurement ID de GA4, no un ID de Ads (`AW-…`). Ads lo ofrece porque detecta
la Google tag que ya está en el sitio.

> 🚨 **No lo pegues en el sitio.** GTM ya carga esa Google tag en las 122 páginas. Un segundo
> snippet duplica cada `page_view` y cada conversión: «peor que no medir, porque los números salen
> y parecen buenos» (`check-medicion.mjs`). **Todo lo de Google entra por GTM, y solo por GTM.**

### 0.5 · Los clics al teléfono se cuentan de menos

`phone_click` sale de la etiqueta vieja `Phone Click (North + South)`, con activadores **«Todos los
elementos»** y `Click URL contiene tel:+1…`. **Sospecha:** ese tipo de activador no sube hasta el
`<a>`. El teléfono del nav es un enlace **solo icono** con un `<svg>` dentro, así que el clic sobre
el icono llegaría con `Click URL` vacío. Compruébalo en Vista previa, no lo des por hecho. El
`click_to_call` del código usa `closest('a[href]')` y está verificado en producción con los dos
números.

### 0.6 · Restos de Elfsight

Quedan los activadores `phone_click_elfsight` y `whatsapp_click`, la etiqueta `WhatsApp Click` y
los key events `call_click_elsight`, `chat_start_elsight` y `whatsapp_click`. Elfsight salió en la
decisión D2 (`ClickToCall.astro` lo sustituye) y el sitio no tiene WhatsApp (0 referencias en
`src/`). **Están muertos.**

---

## Estado verificado — no lo repitas

### Sitio

| | |
|---|---|
| GTM `GTM-N9BWB3BV` | 122/122 páginas en producción (log, Fase 3.1). `/pool-investment-estimator` no pasa por `Base.astro`: lleva snippet propio y está declarada como excepción en `check:medicion` |
| `gtag/js` o `AW-` en el HTML | **0** en el build local (11-sep) |
| Host | `www` (el apex hace 308) |

Lo que el código ya empuja al `dataLayer`. **No añadas eventos ni toques la guarda:**

| Evento | Dónde | Parámetros |
|---|---|---|
| `generate_lead` | `thank-you.astro:158`. Solo dispara si hay `mm_lead` en `sessionStorage`, y `Formularios.astro:172` solo lo escribe con `entregado === true` | `form_name`, `form_location`, `project_type`, `user_type`, `budget_range`, `service_interest` |
| `click_to_call` | `Formularios.astro:277`, delegado en `document` | `phone_region` (`north`/`south`), `form_location` |
| `brochure_download` | `Formularios.astro:289` | `link_text` |
| `view_project_gallery` | `GalleryLeadLightbox.astro:486` | `link_text` |
| `estimator_complete` | `Estimador.astro:546` | `budget_range` |

- `gclid`, `utm_*` y el referrer **solo viajan al correo** (`Formularios.astro:128`). Esa postura
  no cambia sin la decisión D4.
- Teléfonos: `tel:+13527403361` (North, 366 enlaces) y `tel:+19549137112` (South, 245). En el texto
  visible aparecen como mínimo en dos formatos, `+1 (352) 740-3361` y `352-740-3361`. Importa si
  se activa D2.

### GA4 — cuenta `369710957`, propiedad `506563956`, stream `12213454581`, `G-7VHTVG2Q7G`

- **Recogida de datos**: activa en las últimas 48 h.
- **Enhanced Measurement**: activo (vistas, desplazamientos, clics de salida «y 4 más»).
- **Key events**: `call_click_elsight`, `chat_start_elsight`, `close_convert_lead`, `form_submit`
  (con datos), `phone_click` (con datos), `purchase`, `qualify_lead`, `whatsapp_click`.
  **`generate_lead` no está.**
- **Eventos recientes** (28 días): `click`, `file_download`, `first_visit`, `form_start`,
  `form_submit`, `lead_form_start`, `page_view`, `phone_click`, `scroll`, `session_start`,
  `user_engagement`.
- **`lead_form_start`** llega, pero **el código no lo empuja**. Candidata: una regla de «Crear
  eventos personalizados» del stream a partir de `form_start` (la línea base de agosto daba 25
  frente a 24). Averígualo.
- **Sigue pendiente todo el M2** de `PROMPT-TRACKING.md` (log 3.4): las 7 dimensiones, la
  retención a 14 meses, excluir `challenges.cloudflare.com` y el enlace con Search Console.

### GTM — cuenta `6338308205`, contenedor `243035227`, workspace 7

| Etiqueta | Tipo | Activador |
|---|---|---|
| Etiqueta de Google G-7VHTVG2Q7G | Google tag | Initialization - All Pages |
| Lead Form Start | GA4 evento | `lead_form_start` (evento personalizado) |
| Lead Form Submit | GA4 evento | `lead_form_submit` (**Envío de formulario**) |
| Phone Click (North + South) | GA4 evento | `phone_click_elfsight`, `phone_click_north_florida` y `phone_click_south_florida` (los dos últimos, **Todos los elementos** con Click URL `tel:+1…`) |
| WhatsApp Click | GA4 evento | `whatsapp_click` (evento personalizado) |

> La lectura de `gtm.js` del 4-sep («3 googtag, 7 Custom HTML») **no cuadra** con esta tabla:
> probablemente contó los listeners de clic y de formulario como si fueran etiquetas. **Manda la
> interfaz**, y todavía más el export JSON de la versión publicada.

`gtm-container.json` (en el repo, sin importar): 8 etiquetas (Google Tag, 5 eventos GA4 y 2 de Meta
Pixel), 6 activadores (incluido `BLOQUEO - Entornos de preview`) y 10 variables. Los dos arreglos
del log («`gtm-container.json`: dos fallos») siguen puestos. **No trae nada de Ads.**

### Qué se puede automatizar

| Sistema | Realidad |
|---|---|
| GA4, lectura | ✅ Composio: `LIST_CONVERSION_EVENTS`, `RUN_REPORT` |
| GA4, escritura | ⚠️ Solo `CREATE_CUSTOM_METRIC`. Todo lo demás, en la interfaz |
| GTM | ❌ No hay toolkit: interfaz |
| Google Ads | ✅ **Lectura** con `GOOGLEADS_SEARCH_STREAM_GAQL`: el toolkit existe (comprobado el 11-sep), pero **la conexión con esta cuenta no está comprobada**; si falta, `composio link`. Escritura: interfaz |
| Interfaces | `claude-in-chrome` sobre el Chrome de Sebastian, con sus sesiones abiertas |

---

## Reglas de ejecución

- **La Etapa 1 no cambia nada.** Ni un interruptor, ni «descartar» una recomendación, ni guardar un
  borrador en GTM.
- **La Etapa 2 solo arranca con el plan aprobado en el chat.** Publicar la versión de GTM pide
  **un OK aparte**, justo antes de pulsar.
- **Antes reversible que destructivo:** etiquetas en pausa, no borradas; acciones de Ads a
  Secondary, no eliminadas; key events desmarcados, no borrados.
- **Esto lo hace Sebastian, no tú:** enviar formularios en producción (Turnstile es un antibot y no
  se sortea), aceptar condiciones (las Customer Data Terms de Enhanced Conversions) y cualquier
  credencial.
- **Nunca pulses tus propios anuncios.**
- Las pantallas de Google cambian cada pocos meses. **Antes de montar cada pieza, consulta la ayuda
  vigente** (support.google.com de Ads, de GA4 y de Tag Manager). No tires de memoria.
- Código: construir, commitear y desplegar son del director (`CLAUDE.md` §3). Si no te lo autoriza
  en la sesión, entrega el diff y para.

---

## ETAPA 1 · Diagnóstico → `docs/encargos/TRACKING-ESTADO.md`

### 1.1 · Sitio

1. **Cobertura en producción** por `curl`, con el método de la Fase 3.1 del log (headless: no es
   una barrida de navegador). Recorre las URLs del sitemap más `/thank-you` y
   `/pool-investment-estimator`, y cuenta en cada página `GTM-N9BWB3BV`, `gtm.js`, `ns.html`,
   `gtag/js` y `AW-`. Esperado: 122 páginas, el snippet una sola vez, y cero de los dos últimos.
2. **Que el `gclid` sobreviva.** Una URL final que pierde el `gclid` es una conversión que Ads no
   atribuye nunca:
   ```bash
   curl -sI 'https://mrandmrsoutdoorliving.com/contact-us?gclid=TEST123' | grep -iE '^(HTTP|location)'
   # 308, y la Location conserva ?gclid=TEST123
   for u in /services/custom-pool-spa-builders-in-north-south-florida /pool-builders/gainesville-florida \
            /pool-builders/ocala-florida /services/pool-remodeling-renovation-in-north-south-florida /contact-us ; do
     curl -s -o /dev/null -w "%{http_code} $u\n" "https://www.mrandmrsoutdoorliving.com$u?gclid=TEST123"
   done   # las cinco: 200, sin redirección
   ```
3. Con `grep`, confirma que las 5 líneas de la tabla de eventos siguen donde dicen.

### 1.2 · GTM

1. **Versiones**: cuál está publicada, cuándo y por quién. ¿Coincide con el workspace 7?
2. **Exporta la versión publicada** (Administrador → Exportar contenedor) a
   `docs/encargos/gtm-publicado-AAAA-MM-DD.json`. Exportar solo lee. Saca de ahí, etiqueta por
   etiqueta, el nombre de evento que manda, sus parámetros, activadores y excepciones, y la
   configuración de la Google tag. Tienes que resolver:
   - Qué nombre de evento manda `Lead Form Submit`, y si el activador `lead_form_submit` tiene
     «Comprobar validación».
   - Quién empuja `lead_form_start`, si el código no lo hace.
   - Qué variables definidas por el usuario hay (las capturas no llegan a verlas).
3. **Vista previa (Tag Assistant) contra producción**, sin publicar nada. En la home, pulsa el
   teléfono **icono** del nav, el **texto** del teléfono del pie y el **botón flotante**, con los
   dos números, y anota qué etiqueta dispara en cada caso. Eso confirma o refuta el §0.5.
4. **Diff del export contra `gtm-container.json`**: qué chocará al importar (nombres, la Google tag
   duplicada).

### 1.3 · GA4

1. Con Composio `RUN_REPORT`, 90 días de `eventName × date` para `form_submit`, `form_start`,
   `lead_form_start`, `phone_click`, `generate_lead`, `click_to_call`, `page_view` y
   `session_start`. Tiene que verse el corte del 4-sep, y el ratio `page_view/session_start` que
   `PROMPT-TRACKING.md` pedía vigilar (4,54 antes del corte).
2. En la interfaz, revisa:
   - los 7 interruptores de Enhanced Measurement;
   - las reglas de «Modificar eventos» y de «Crear eventos personalizados»;
   - las dimensiones personalizadas, la retención y las referencias no deseadas;
   - el tráfico interno: si está definido, **y si está activo**;
   - los vínculos de producto: con Google Ads (qué cuenta, y si la publicidad personalizada está
     activa) y con Search Console;
   - la configuración de atribución.

### 1.4 · Google Ads — `971-839-0464`

Por GAQL si la conexión existe; lo que GAQL no dé, por la interfaz.

1. Zona horaria y moneda de la cuenta. **Auto-tagging** (Admin → Account settings): ¿activo?
2. **Cada acción de conversión**, también las que no están en ningún goal. De cada una: nombre,
   origen, categoría, primary o secondary, estado, recuento (One/Every), ventanas, modelo de
   atribución, valor y **método de montaje** (ID + etiqueta de conversión, regla de URL sobre la
   Google tag, o importada de GA4).
   - De `Enviar formulario de clientes potenciales`, **averigua qué la dispara**. Si es la carga de
     `/thank-you`, se salta la guarda. Si tiene ID + etiqueta, apúntalos: es candidata a
     reutilizarse.
3. **Metas por campaña.** Las 3 campañas usan «Submit lead form», pero ¿con las metas por defecto
   de la cuenta o con metas propias de cada campaña? Solo mirar. De eso depende que una acción de
   llamada pueda pujar sin tocar la campaña (ver D1).
4. En Admin → Data manager / Google tag: qué IDs `AW-` hay y si la tag está **combinada** con
   `G-7VHTVG2Q7G`. Y qué productos hay conectados (GA4, Business Profile).
5. **Enhanced Conversions**: ¿activado?, ¿con qué método?, ¿están aceptadas las Customer Data
   Terms?
   🚨 Si está activado en modo automático sin la decisión D4, **es un hallazgo grave**: la Google
   tag estaría leyendo emails de las páginas.
6. **Assets de llamada y de formulario** en las campañas: ¿existen?, ¿está activo el informe de
   llamadas? **Si hay un lead form asset, ¿a dónde van esos leads?** Un lead de Ads que no recibe
   nadie es una fuga, no un problema de medición, pero se reporta.

### 1.5 · El informe, y la parada

El informe va en `docs/encargos/TRACKING-ESTADO.md` y lleva:

1. **La matriz de señales.** Una fila por señal: lead de formulario, clic al teléfono, llamada desde
   anuncio, estimador, folleto, galería y `page_view`. Columnas:
   - ¿lo emite el código?
   - etiqueta de GTM
   - evento de GA4
   - ¿key event?
   - acción de Ads
   - ¿Primary?
   - **fuentes duplicadas**
2. Cada punto del §0, confirmado o refutado, con su evidencia.
3. **El plan de la Etapa 2** como checklist, con los valores exactos (nombres, IDs, ventanas).
4. Las decisiones de abajo, cada una con su recomendación.

**PARA.** Presenta el informe y espera el OK de Sebastian. No empieces la Etapa 2 «para ir
adelantando».

---

## Decisiones de Sebastian — antes de la Etapa 2

**D1 · De qué aprende la puja.** Lo recomendado:

- **Primary: una sola acción web de lead**, disparada por `generate_lead`. Si en 1.4 salen **dos**
  acciones web Primary para el mismo formulario, cada lead cuenta dos veces y Maximize Conversions
  puja contra el doble.
- **Primary también: las llamadas desde anuncios de ≥ 60 s**, si hay asset de llamada.
- **Secondary: `click_to_call`.** Es un **clic, no una llamada**: cuenta a quien se equivoca, a
  quien pulsa en escritorio y al cliente de siempre. La adenda A2 ya lo pone como secundario. Se ve
  en Ads (en «Todas las conv.»), pero la puja no aprende de él.
- Si Sebastian prefiere que el clic puje, que sepa esto: según las metas de campaña (1.4.3), puede
  obligar a tocar la campaña, y eso es del equipo de medios.

**D2 · Llamadas desde el sitio con número de desvío de Google.** Esta etiqueta cambia el número por
uno de desvío **solo a quien llega desde un anuncio**, y cuenta llamadas **reales** de ≥ 60 s. Es la
medición buena del teléfono. El coste: hay que configurarla para cada formato de número visible
(ver «Estado verificado») y probarla en un móvil. Recomendado: sí, pero solo para North Florida,
que es el número del tráfico de pago (adenda A3). **No bloquea el lanzamiento**: puede ir después.

**D3 · Valor por conversión.** Con Maximize Conversions sin tCPA, el valor no mueve la puja.
Recomendado: **sin valor** hasta tener un número real (ticket medio × tasa de cierre). Un valor
inventado estropea los informes hoy y la puja el día que se pase a puja por valor.

**D4 · Enhanced Conversions** (decisión 8 de la adenda). La hoja 25 la marca como BLOCKING, pero
técnicamente no lo es. Sin ella, Conversion Linker guarda el `gclid` en una cookie propia y la
conversión se atribuye igual. **No hace falta meter el `gclid` en el `dataLayer`**, así que la
postura de privacidad actual es compatible. Lo que aporta EC es recuperar las conversiones que se
pierden por las cookies (Safari/iOS).

- **(a) Sí.** El email y el teléfono se capturan al enviar y pasan **solo** a la etiqueta de Ads,
  como datos proporcionados por el usuario, con hash SHA-256 hecho por la Google tag. **Nunca** van
  a GA4 ni a Meta. Implica:
  - reescribir la cabecera de `Formularios.astro:128`, que hoy dice lo contrario;
  - mencionarlo en `/articles/privacy-policy`;
  - que Sebastian acepte las Customer Data Terms.
- **(b) No, por ahora.** Se lanza con la etiqueta nativa + Conversion Linker. Más adelante se
  importan conversiones offline desde el CRM, con el `gclid` que ya llega por correo.
- Recomendado: **(b) para lanzar, y (a) a revisar con 2-4 semanas de datos.**

**D5 · El nombre del evento de teléfono en GA4.** Recomendado: se queda `click_to_call`, que es
correcto y lleva `phone_region`, y `phone_click` se retira en la misma publicación. Su historial
viene de un activador que casi seguro contaba de menos. La fecha del corte se anota en GA4.

**D6 · Las 2 etiquetas de Meta Pixel** de `gtm-container.json`. Si se importan activas, se publican
con esta versión, y quedan fuera del alcance de Google. Dos opciones: se publican y se verifican con
Meta Pixel Helper (era el M4 de `PROMPT-TRACKING.md`), **o** entran en pausa.

**D7 · Tráfico interno.** Hace falta la IP de la oficina para el filtro de GA4. Sin ella, los leads
de prueba de la Etapa 2 cuentan como reales, y hay que dejarlos anotados con su fecha.

**D8 · Las acciones de YouTube** (los goals Engagement y YouTube follow-on views: account-default y
Primary). Hoy no las usa ninguna campaña. Pero si alguien pasa una campaña a las metas por defecto,
la puja optimizaría suscripciones a YouTube. Recomendado: **pasarlas a Secondary**.

---

## ETAPA 2 · Arreglos — en este orden

El orden no es estético. Primero Ads, porque GTM necesita el ID y la etiqueta de conversión. Después
GTM, porque GA4 necesita que los eventos lleguen. GA4 se retoca al final, sin dejarlo ni un día a
cero.

### 2.1 · Google Ads

1. Auto-tagging **activado**.
2. **La acción de lead.** Reutiliza `Enviar formulario de clientes potenciales` si en 1.4 salió
   montada con ID + etiqueta. Si está montada por URL, crea una nueva y pasa la vieja a Secondary.
   Configuración, salvo que D1 o D3 digan otra cosa:
   ```
   Categoría      Submit lead form       Recuento      One
   Click-through  90 días                (el ciclo de venta de una piscina es largo)
   Atribución     Data-driven            Optimización  Primary
   Valor          según D3
   Montaje        Google Tag Manager → Conversion ID + Conversion label
   ```
3. **`Click to call – website`**: categoría Phone call lead, recuento One, Secondary (D1).
4. **Llamadas desde anuncios** (≥ 60 s) si hay asset de llamada, y **llamadas desde el sitio** si
   D2 es sí. Los assets **no se crean**: si no existen, se reporta al equipo de medios.
5. Si hay acciones importadas de GA4 (`form_submit`, `phone_click`…), van a **Secondary**. Nunca
   una importada en Primary junto a la nativa.
6. `Business profile - Form submit` 🔒 no se toca: la gestiona Google. Aplica D8. Enhanced
   Conversions, **solo** si D4 es (a), y las condiciones las acepta Sebastian.
7. El resultado es **exactamente una** acción web Primary de lead. Compruébalo en la tabla de
   Summary, no de memoria.

### 2.2 · GTM — en un workspace nuevo, no en el 7

1. **Importa `gtm-container.json`** con **Fusionar + Renombrar en conflicto. Nunca Sobrescribir.**
2. **Deja una sola Google tag con `G-7VHTVG2Q7G`.** Tras importar habrá dos: quédate con la que
   lleva la excepción `BLOQUEO - Entornos de preview` y pausa la otra. Dos iguales = doble
   `page_view`.
3. **Crea en la interfaz lo nuevo.** Son pocas piezas, y así es más fiable que escribirlas a mano
   en el JSON:
   - **Conversion Linker**, en todas las páginas.
   - La **Google tag de `AW-…`**, si GTM avisa de que falta: en Initialization - All Pages. Es la
     base de Ads y va a otro destino, así que no duplica GA4.
   - **`Ads - Lead`**: tipo Google Ads Conversion Tracking, con el ID + etiqueta de 2.1.2 y el
     activador `CE - generate_lead`.
   - **`Ads - Click to call`**: activador `CE - click_to_call`.
   - Constantes para el ID y las etiquetas, junto a `CONST - GA4 Measurement ID`.
   - La excepción `BLOQUEO - Entornos de preview` en **todas** las etiquetas de medición, las de Ads
     incluidas.
4. **Pausa, no borres:** `Lead Form Submit`, `Phone Click (North + South)`, `WhatsApp Click`, y
   `Lead Form Start` si 1.2 confirma que es ruido. Meta, según D6.
5. **Revisa lo importado etiqueta por etiqueta.** El JSON se escribió a mano, y si GTM ha
   renombrado un parámetro, entra vacío sin dar error.
6. **Vista previa contra producción**, con evidencia de cada punto:
   - `page_view` **una** vez por página.
   - `click_to_call` en el icono del nav, en el texto del pie y en el botón flotante, con los dos
     números. En cada clic, la etiqueta de GA4 y `Ads - Click to call` disparan una vez.
   - Aterrizar con `?gclid=TEST123` crea la cookie `_gcl_aw`.
   - **Envío real, lo hace Sebastian** con Tag Assistant conectado: `generate_lead` una vez y con
     sus 6 parámetros; `GA4 - generate_lead` y `Ads - Lead`, una vez cada una.
   - F5 sobre `/thank-you` → **cero**. `/thank-you` en una pestaña nueva → **cero**.
7. **Publicar, con OK explícito en ese momento.** Nombre de versión: «Google Ads + GA4 —
   conversiones (AAAA-MM-DD)», y en las notas, la lista de cambios.
8. **Exporta la versión publicada y sobrescribe con ella `gtm-container.json`** en el repo. Desde
   hoy el JSON del repo es el reflejo de lo publicado, no un borrador escrito a mano.

### 2.3 · GA4

1. **Crea el key event `generate_lead` por nombre antes de publicar GTM**, para que el primer lead
   ya cuente. `click_to_call`, según D1 y D5.
2. **Después** de ver `generate_lead` en DebugView, desmarca `form_submit`, `phone_click`,
   `call_click_elsight`, `chat_start_elsight` y `whatsapp_click`. Nunca antes: se quedaría a cero.
3. `qualify_lead` y `close_convert_lead` **se quedan**: están reservados para la importación offline
   desde el CRM (adenda §5.2, rama b). Anótalo.
4. **Enhanced Measurement sigue activo**, formularios incluidos: `form_start` es la entrada del
   embudo (adenda A2). `form_submit` queda como evento normal, sin estrella, y **nunca** se importa
   a Ads.
5. **El M2 pendiente:**
   - las 7 dimensiones de ámbito evento: `form_name`, `form_location`, `project_type`, `user_type`,
     `budget_range`, `service_interest` y `phone_region`;
   - retención a **14 meses**;
   - excluir `challenges.cloudflare.com` de las referencias;
   - el filtro de tráfico interno (D7);
   - el enlace con Search Console.
6. **El vínculo con Google Ads** `971-839-0464`, activo y con publicidad personalizada.
7. **La regla de «Crear eventos» que produce `lead_form_start`**, si 1.3 la confirma: se desactiva
   si solo duplica `form_start`.
8. **Una anotación en GA4** con la fecha del corte.

### 2.4 · Código — lo mínimo

- **`check:medicion` en rojo** si alguna página lleva `googletagmanager.com/gtag/js` o un literal
  `AW-\d+`. Todo lo de Google va por GTM, y esto evita que alguien pegue el snippet del §0.4 dentro
  de seis meses. Son unas pocas líneas en el bucle que ya cuenta el snippet.
- **Solo si D4 es (a):** Enhanced Conversions, con la cabecera de `Formularios.astro` reescrita para
  que el código no diga una cosa y haga otra.
- **Nada más.** El `dataLayer` ya está bien.

### 2.5 · Cuadre a las 72 h

- **El correo es la verdad.** Compara los `generate_lead` de GA4 con los correos de lead recibidos
  en el mismo periodo:
  - GA4 por debajo de los correos: normal (bloqueadores de anuncios).
  - GA4 por encima de los correos: **duplicación**, y se investiga.
- Compara `page_view/session_start` con el 4,54 de antes del corte.
- En Ads, «Unverified» o «No recent conversions» **es lo esperado mientras las campañas estén
  pausadas**: sin clic de anuncio no hay conversión que atribuir. No es un fallo y no se «arregla».
  Se revisa en las 48 h siguientes al primer lead de pago.

---

## Criterio de aceptación

- [ ] 122/122 páginas con GTM **una** vez, **0** `gtag/js` y **0** `AW-` en el HTML (en producción
      y en `check:medicion`).
- [ ] Contenedor publicado con 1 Google tag `G-`, 1 Conversion Linker, 1 `Ads - Lead` y 1
      `Ads - Click to call`. Las viejas, en pausa.
- [ ] Evidencia de Tag Assistant de cada punto de 2.2.6.
- [ ] GA4: los key events son exactamente la lista aprobada; las 7 dimensiones están creadas; la
      retención, las referencias y los vínculos, puestos.
- [ ] Ads: **una** acción web Primary de lead, las importaciones de GA4 en Secondary y el
      auto-tagging activado.
- [ ] `gtm-container.json` es el export de lo publicado.
- [ ] Cuadre de 2.5 hecho, o fechado si aún no han pasado las 72 h.
- [ ] Entrada en `MIGRACION-LOG.md` con lo que corrió **y lo que no**. Una comprobación que no se
      hizo **falla ABIERTO**: nunca se cuenta como verde.

## Fuera de alcance — para en seco

- **Campañas**: crearlas, activarlas o pausarlas, y tocar presupuestos, pujas, keywords, anuncios,
  assets o metas por campaña. El lanzamiento lo abre Sebastian con su equipo de medios.
- Pegar snippets de Google en el código. Todo va por GTM.
- `gclid` o PII al `dataLayer`, salvo que D4 sea (a), y aun así solo hacia Ads.
- **Consent Mode v2**: fuera por decisión (audiencia de Florida; `PROMPT-TRACKING.md`). Si D4 es
  (a), se revisa junto a la adenda A6.
- Borrar nada: ni acciones, ni key events, ni etiquetas, ni datos.
- Eventos nuevos en el código y cambios en las landings (adenda A1 y A3-A5, que son otro encargo).
- DNS.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Dos Google tags `G-` tras importar → doble `page_view` | 2.2.2 + Vista previa |
| Dos acciones web Primary para el mismo lead → Ads cuenta el doble | 2.1.7 |
| La importación de GA4 y la etiqueta nativa, las dos en Primary | 2.1.5 |
| Se desmarca `form_submit` antes de que llegue `generate_lead` → días a cero | 2.3.1 y luego 2.3.2, en ese orden |
| Leads de prueba contados como reales | D7, o anotados con su fecha |
| La URL final redirige y pierde el `gclid` | 1.1.2 |
| Enhanced Conversions en automático, leyendo emails sin decisión | 1.4.5 |
| La etiqueta de llamadas no reconoce el formato del número | D2: probar cada formato visible en móvil |
| La publicación arrastra Meta sin querer | D6 |
| El JSON importa con campos vacíos | 2.2.5 |
| Leads del formulario de Ads que no llegan a nadie | 1.4.6, se reporta |
