# R17-CORE — Landing «Pool Builders Core»: rediseño de captación

**Fecha:** 2026-09-11 · **Rama:** `claude/happy-hamilton-u7vqjy` · **Base:** `7d49b21`
**Ruta:** `/services/custom-pool-spa-builders-in-north-south-florida`

Esta ruta tiene dos papeles a la vez: es la **ficha piloto** del rediseño de las 14 de
`/services/`, y es la **Final URL del ad group «Pool Builders Core»** — 20 de las 39 keywords de
una campaña de $1.600/mes que está parada esperando al sitio. Todo lo de aquí se juzga con los dos
criterios, y cada número lleva al lado el comando que lo produjo.

**Se hace una página primero y luego las otras trece.** Verificado elemento a elemento contra
`pool-remodeling-renovation`: mismo orden de secciones, 14 `h2`, 15 `h3`, 3 `h4`, 70 `<img>`,
17 `<a>`, 8 subservicios, 4 pasos, 5 FAQ y 0 `<form>` en las dos. Son la misma plantilla, así que
**lo que se construye aquí se construye ya para catorce** aunque solo se encienda una.

---

## 1 · Recovery: tres premisas del encargo han cambiado

| Premisa | Estado real |
|---|---|
| «Otro chat tiene cambios sin commitear en `financing.astro`, `financiacion.css` y 3 iconos» | **Ya commiteados** en esta rama: `3a0a371` y `7d49b21`. `git status --porcelain` sale vacío |
| «Trabaja en un worktree y rama propios (`claude/core-lp-captacion`)» | La rama de la sesión es `claude/happy-hamilton-u7vqjy`, que ya contiene ese trabajo y va 14 commits por delante de `main` sin divergir |
| «La ruta necesita un contrato `rediseno`, que escribe el DIRECTOR» | **Ya lo tiene**, con sha real: `rediseno · 2026-08-31 · 527b5f0` (lote R10). Al re-aprobar se añade un `·` al motivo y se actualizan `fecha` y `sha` |

Lo demás del §3 del encargo se verificó y **se confirma**.

### Lectura de puertas ANTES de tocar nada

Sobre el build de producción (`MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1 npm run build`):

```
check:tokens     PUERTA VERDE
check:rutas      PUERTA VERDE
check:enlaces    PUERTA VERDE
check:medicion   PUERTA VERDE
check:aviso      resultado : todo verde
check:seo        PUERTA VERDE   (PUBLIC_ES_PRODUCCION=1)
check:ads        PUERTA VERDE   (las 4 landings ok)
check:texto      PUERTA ROJA — 1 pagina(s)     <-- PRE-EXISTING, ver abajo
```

**`check:texto`, el rojo previo — causa raíz identificada.** Hasta hoy constaba como «el carrusel
del proceso arranca en otra diapositiva». El detalle exacto es:

```
ROJO /services/custom-pool-spa-builders-in-north-south-florida — faltan 2 lineas, sobran 2
  FALTA  Site Assessment & Structural Evaluation
  FALTA  Comprehensive evaluation of lot configuration, soil stability, and hydrostatic …
  SOBRA  Design Consultation & 3D Rendering
  SOBRA  Custom design consultation creating detailed 3D architectural renderings …
```

Y la causa es el `<script>` de `section.process-section`, que empieza con:

```js
const AUTOPLAY_DELAY = 5000;
```

**El carrusel se pasa solo cada 5 s**, así que la captura lee el paso 2 en lugar del 1. No es un
defecto de la página ni de este encargo: es la puerta leyendo un carrusel en marcha, que es
exactamente lo que `00-PRINCIPIOS.md` avisa («al capturar, espera un estado, no milisegundos»).
**No lo arreglo aquí** —`scripts/lib/captura.mjs` es del director y congelar los temporizadores
cambiaría la lectura de todas las rutas con carrusel—, pero queda escrito con su causa para que
se pueda decidir. Recomendación: `page.clock.install()` antes de cargar, en la librería de
captura, y volver a medir las 115.

### Entorno

- `node_modules` no venía en el contenedor: `npm install` (registro alcanzable, 265 paquetes).
- Sanity está denegado por el proxy → los builds van con `MM_SANITY_CACHE=1`.
- Playwright 1.62.1 pide `chromium-1234` y la imagen trae `1194`, con otra estructura de carpetas
  (`chrome-linux64` / `chrome-headless-shell-linux64`). **Resuelto fuera del repo** con enlaces:

  ```bash
  ln -sfn /opt/pw-browsers/chromium-1194/chrome-linux \
          /opt/pw-browsers/chromium-1234/chrome-linux64
  ln -sfn /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
          /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
  ```
- Las 4 puertas de navegador lanzan Chromium **con ventana** (`headless: false`), y aquí no hay
  servidor X. Se corren con `xvfb-run -a`, **sin tocar el código de la puerta**. A diferencia del
  Mac de Sebastian, aquí no secuestran ninguna pantalla.
- **Verificar contra producción sigue bloqueado.** El proxy deniega el dominio:
  `gateway answered 403 to CONNECT · www.mrandmrsoutdoorliving.com:443`.
  → `PRODUCTION PERFORMANCE VERIFICATION BLOCKED`, nunca PASSED.

---

## 2 · El recorrido del comprador, hoy

**Desde el anuncio** (20 keywords de intención «pool builder north florida»):

```
clic pagado → landing → lee «Custom Pool Builders» → quiere pedir presupuesto
           → NO HAY FORMULARIO → clic a /request-estimated → formulario de 3 pasos
           → envía → /thank-you → generate_lead (que GTM no recoge)
```

El segundo clic es la fuga mayor: está pagado y no lleva a ningún sitio nuevo, solo al mismo
formulario que podría estar aquí. Y entre el héroe y ese clic, el visitante pasa por **cuatro
secciones** (logos, intro, 8 subservicios de los que 6 hablan de remodelación, y un antes/después
cuyo texto dice «South Florida») antes de encontrar cualquier señal de confianza fechable.

**Desde el orgánico:** llega con la misma intención y se encuentra lo mismo, más las reseñas en el
bloque 10 —o sea, después de todo— y cero enlace al estimador de coste o a financiación, que son
las dos preguntas que frenan una compra de este ticket.

---

## 3 · QS3 recalculado hoy: **88**

> **⚠️ NOT A GOOGLE METRIC.** Métrica propia y solo de auditoría. Google no publica su fórmula de
> Quality Score y pondera histórico y competencia que este repositorio no ve.

Da 88, el mismo número del informe del 11-sep. Las seis deducciones, re-verificadas una a una:

| Deducción | Verificación de hoy |
|---|---|
| **CTA/Conversión −4** | `grep -c '<form' <la ruta>.astro` → **0**. Cero formularios, confirmado también en el origen de Webflow |
| **Técnico −2** | `curl` al dominio → `403 CONNECT`. Sigue sin poderse medir contra producción |
| **Geografía −3** | El slug dice `north-south`. Y medido sobre el cuerpo: la primera «South Florida» está en el carácter **97**; la primera «North Florida» suelta, en el **6053** |
| **Móvil −1** | Sin medida en dispositivo real |
| **Primeras 100 palabras −1** | El héroe dice «North & South Florida», no North Florida primero, y no hay teléfono ni paso siguiente que no sea un segundo clic |
| **Intención comercial −1** | 6 de los 8 subservicios hablan de remodelación, que es el producto de la ficha hermana |

---

## 4 · Hallazgos nuevos

Diez, con su comando. Los cuatro primeros son P0/P1.

### 4.1 🚨 La foto «Before» es de un listado del MLS de Miami

Abrí la imagen. Lleva incrustado, en blanco sobre el césped y visible a tamaño real:

```
A11……  © Miami MLS© 202…
```

Es una foto de una ficha inmobiliaria de terceros, publicada comercialmente, con un `alt` que se
la atribuye a Mr & Mrs Outdoor Living. Y hay un segundo problema encima del primero: **el «After»
es otro patio distinto** —otra casa, otra valla, otra vegetación, otra orientación—, así que la
sección enseña **una transformación que no ocurrió**. `CRITERIO.md:200` ya lo nombra: «eso no es
feo, es falso; y ninguna puerta distingue dos encuadres distintos de dos iguales».

Las dos son PNG de 1408×768 y pesan **4,2 MB** entre ambas, en una página que usa AVIF en todo lo
demás.

### 4.2 🚨 Cifras financieras sin verificar, también dentro del schema

```
For projects ranging from $75,000 residential pools to $500,000+ luxury backyard transformations
```

Sale **dos veces**: en el cuerpo visible y dentro del `FAQPage`. La hoja 18 del libro de Ads marca
`$75K` como **DATA NOT AVAILABLE**, y la decisión de Sebastian del 2-sep-2026 (TILA/Reg Z) prohíbe
cifras financieras en el sitio. **`check:ads` no lo caza**: sus cinco regex buscan `$55K` y
`$20K+`, no estas.

### 4.3 🚨 El `FAQPage` no coincide con lo que se ve, y trae el servicio de otra ficha

En el bloque JSON-LD de la ruta:

| Campo | Valor | Qué pasa |
|---|---|---|
| `mainEntity[4].name` | `"construction"` | El `<h3>` visible dice «Can I finance a custom pool project in Florida?» |
| `about.serviceType` | `"Smart Soffit LED Lighting Installation"` | Es el `serviceType` de **otra ficha** |
| `about.name` | `"Pool  Construction"` | Doble espacio |
| `about.image` | `"New pool and spa construction in Florida by licensed custom pool builders"` | Un texto `alt` en un campo que espera una URL |
| `dateModified` | `19:50:50` | **Anterior** a `datePublished` (`19:55:49`) |

### 4.4 🚨 South Florida manda en la landing de North Florida

- En las **915 palabras** del cuerpo, «South Florida» sale **9 veces** (4 sueltas y 5 dentro de
  «North & South Florida») y la primera está en el **carácter 97**. «North Florida» sale **3 veces**,
  todas sueltas, y la primera en el **carácter 6053** — o sea, pasados dos tercios de la página.
- La sección `location` pone el `<h3>` de **South Florida delante** del de North Florida.
- El intro del antes/después empieza: *«Turn that bare **South Florida** backyard…»* — en la
  landing cuyo anuncio promete North Florida.

### 4.5 · 6 de los 8 subservicios son de remodelación, y ninguno enlaza

No tres, seis: tres lo dicen en el título (`Inground Pool Remodeling`, `Integrated Spa Remodeling`,
`Pool Deck & Hardscape Remodeling`) y otros tres en el texto (`renovations`, `upgrades`,
`existing pools`). El primero, en una ficha cuyo `<h1>` es «Custom Pool **Builders**», dice:

> Custom pool **redesigns** engineered for Florida homes and code compliance.

Y **ninguna de las 8 tarjetas enlaza a ningún sitio**: no hay camino a la landing de Remodeling,
que es donde ese lead vale dinero.

### 4.6 · La página no tiene ni un teléfono en el cuerpo

```
$ grep -c '740-3361\|913-7112' <la ruta>.astro
0
```

El invariante «North Florida primero» de `check:ads` pasa hoy **solo por el cromo** —el nav y el
botón flotante—, no por la página. Es un verde prestado.

### 4.7 · `gallery` y el feed de Instagram pintan las mismas 10 fotos

Solape **10/10**, verificado fichero a fichero: `pool-construction-1…10`. Y los 14 logos del
marquee se pintan **dos veces** en la misma página, así que **28 de las 70 imágenes son el mismo
carrusel repetido**, todas con `alt=""`.

### 4.8 · El héroe es el LCP y va diferido

```html
<img src="…/new-pool-spa-construction-florida.avif" loading="lazy" alt="…" class="image-bg-hero-services">
```

Sin `fetchpriority`, sin `width`/`height`, sin `srcset`. De las 56 `<img>` del cuerpo, **42 no
declaran tamaño** — y el manifiesto conoce las 42, así que se pueden hornear todas sin un solo
hueco de datos.

### 4.9 · La FAQ de financiación no enlaza a `/financing`

La pregunta «Can I finance a custom pool project in Florida?» responde con cifras y **no enlaza** a
`/financing`, que existe y se escribió justo para eso. Tampoco hay enlace a `/pool-cost-estimator`.

### 4.10 · Jerarquía de encabezados

5 `<h2>` hermanos dentro de `process-section` (uno de sección y cuatro de paso), salto de `h2` a
`h4` en el antes/después, y el mismo texto —«Trusted by Florida's finest homeowners»— marcado `h2`
arriba y `h4` abajo.

---

## 5 · Orden de secciones propuesto

🔒 congelada (se comparte con otras rutas: solo se reordena o se cambia su contenido propio) ·
🟡 exclusiva de las 14 fichas · 🟢 nueva, con prefijo `.svc-`

| # | Sección | Movimiento | Motivo |
|---|---|---|---|
| 1 | Héroe 🟡 | se queda | El `<h1>` **no se toca**. Cambia el texto de apoyo, entran los dos teléfonos con `tel:` (North Florida primero), la línea de licencias, y el CTA **ancla al formulario de la página** en vez de salir a `/request-estimated` |
| 2 | Logos 🔒 | se queda | Prueba social inmediata y sin coste de lectura |
| 3 | 🟢 Franja de confianza | **nueva** | Los 4 temas RSA respaldados, en una franja de una línea. Responde «¿por qué vosotros?» antes de pedir datos |
| 4 | 🟢 Formulario | **nueva** | **La fuga mayor.** Va aquí, no al final: el tráfico de pago llega con la intención ya formada |
| 5 | Reseñas 🔒 | **sube del 10 al 5** | Ocho reseñas reales justo debajo del formulario: es la objeción que queda tras pedir datos |
| 6 | `trusted-section` 🔒 | se queda | |
| 7 | `services` 🟡 | se queda, reordenada | Construcción nueva primero; los 3 de remodelación **enlazan a la landing de Remodeling**; se corrige «redesigns» y la errata |
| 8 | Antes/después 🔒 | **fuera de esta ruta, por ahora** | La foto del MLS sale sí o sí (4.1) y el «Before» de sustitución no se puede generar en este entorno (§10). Sus dos tarjetas de valor —Design-Build Authority y Licensed & Engineered— **suben a la franja de confianza**, así que el mensaje no se pierde. Vuelve en su propio commit cuando exista el par honesto |
| 9 | `CarruselProyectos` 🔒 | **sustituye a `gallery`** | Resuelve el solape 10/10 con el feed, mete obra real y abre enlaces a `/project/<slug>` |
| 10 | `process` 🟡 | se queda + CTA al final | |
| 11 | 🟢 Inversión y financiación | **nueva** | «What will my pool cost?» → `/pool-cost-estimator` · «Financing available» → `/financing`. **Ni una cifra** |
| 12 | FAQ 🔒 | +3 objeciones | Coste, permisos y qué incluye. Y se arregla el `FAQPage` roto (4.3) |
| 13 | `location` 🔒 | **North Florida delante** | |
| 14-15 | Carrusel de blog 🔒 · Feed 🔒 | se quedan | |
| 16 | `cta-footer` 🔒 | se queda | Camino secundario a `/request-estimated` |

**Se añaden 3 secciones y se retira 1.** Nunca quedan más de 2 secciones seguidas sin un paso
siguiente: héroe→CTA, franja→formulario, servicios→CTA, proceso→CTA, inversión→2 rutas,
FAQ→formulario, cierre→CTA.

---

## 6 · Tabla semántica

| Eje | Contenido |
|---|---|
| **PRIMARY** | construcción de piscina custom/inground **nueva** en North Florida |
| **VARIANTS** | pool builder(s) · pool contractor · pool construction company · custom pool builder · inground pool builder · gunite/concrete pool builder · new pool construction |
| **LOCAL** | North Florida primero; South Florida subordinado. Condados **verificados** en `src/lib/negocio.mjs`: Alachua, Columbia, Dixie, Gilchrist, Levy, Marion, Putnam (North) · Broward, Palm Beach (South) |
| **COMMERCIAL** | free estimate · design-build · licensed |
| **EXCLUDED** | reparación · limpieza · mantenimiento · reparación de equipos · pérgolas y cocinas exteriores como mensaje dominante · remodelación como mensaje dominante |

Sin perseguir densidad: un concepto por encabezado y lenguaje natural.

---

## 7 · Cadena de correspondencia de mensaje

```
SEARCH QUERY → KEYWORD → AD GROUP → RSA THEME → TITLE → H1 → HERO → 100 WORDS → CTA → FORM → CONVERSION
     ?            ?         ✅         ⚠️        ✅      ✅     ✅        ✅        ✅     ✅        🚨
```

- **QUERY / KEYWORD** — `DATA NOT AVAILABLE`. No hay export de Ads ni acceso a la cuenta.
- **AD GROUP** — «Pool Builders Core», 20 keywords, Final URL verificada y sin redirect.
- **RSA THEME ⚠️** — el texto exacto de los RSA sigue sin poder cotejarse (falta la hoja 13), así
  que **RSA CLAIM REQUIRES REVIEW**. Lo que sí consta, contado sobre el **texto visible** del
  cuerpo (entre paréntesis, sobre el `.astro` entero, que incluye el JSON-LD): `3D` 6 (7),
  `permit` 7 (10), `start-up` 2 (3), `gunite` 2 (4), `concrete` 2 (2), `licensed` 11 (26),
  **`warranty` 0 (0)**. Los cuatro
  temas que se escriben en la franja de confianza son los cuatro que la página ya sostiene.
  **Garantía no se escribe**, porque la página no la sostiene y nadie la ha confirmado.
- **TITLE** — «Custom Pool Builders in North Florida | Mr & Mrs», 47 caracteres, vía `META_PROPIA`.
  **No se toca.**
- **H1** — «Custom Pool Builders». **No se toca.**
- **HERO / 100 WORDS / CTA / FORM** — es lo que arregla este encargo.
- **CONVERSION 🚨** — `generate_lead` = 0 en GA4 en ocho meses y medio. **Se arregla en GTM**, no
  aquí, y bloquea el lanzamiento.

---

## 8 · Copy, con su matriz frase → fuente

Inglés de EE. UU. Claridad para quien compra antes que para motores. **Lo que no está verificado no
se publica.**

### 8.1 Héroe

| Elemento | Texto propuesto |
|---|---|
| Eyebrow | `Licensed & insured Contractors` *(se queda: es de las 14 fichas)* |
| H1 | `Custom Pool Builders` *(intacto)* |
| Apoyo | `New custom inground pools for North Florida homeowners — 3D design, permits, construction and final start-up, from one licensed team. We also build across South Florida.` |
| Teléfonos | `North Florida +1 (352) 740-3361` · `South Florida +1 (954) 913-7112` *(en ese orden, con `tel:`)* |
| Licencias | `Florida certified pool contractor · CPC1461119 · CPC1460562` |
| CTA | `Get a Free Estimate` → `#estimate` *(terminología aprobada, no se renombra)* |

### 8.2 Franja de confianza — los 4 temas RSA respaldados

| Tarjeta | Texto |
|---|---|
| One design-build team | `Design, engineering, permits and construction under one roof.` |
| Florida licensed pool contractor | `CPC1461119 and CPC1460562, published on every page of this site.` |
| See it in 3D first | `You review a 3D design of your pool before anything is dug.` |
| Permits and code handled | `We pull the permits and coordinate the county inspections.` |

### 8.3 Formulario y «What happens after you reach out»

| Elemento | Texto |
|---|---|
| Título | `Get a Free Estimate` |
| Entradilla | `Tell us about your project and we'll come back with next steps. No cost, no obligation.` |
| Paso 1 | `We call you back within 24 hours.` |
| Paso 2 | `We walk your property and put a 3D design on paper.` |
| Paso 3 | `You get the scope in writing and a fixed project price before you commit.` |

### 8.4 Inversión y financiación — **ni una cifra**

| Elemento | Texto |
|---|---|
| Título | `What will my pool cost?` |
| Texto | `Every pool is priced from its own design. Answer a few questions and see the range for a custom pool in Florida, then review how it can be paid for.` |
| CTA 1 | `Try the pool cost estimator` → `/pool-cost-estimator` |
| CTA 2 | `Financing available` → `/financing` |

### 8.5 Las 3 FAQ nuevas

| Pregunta | Respuesta |
|---|---|
| `How much does a custom pool cost in North Florida?` | `There is no single number: a custom pool is priced from its own design, size, finishes and site conditions. Our estimator walks you through the choices that move the price, and you get a fixed project price in writing before you commit.` |
| `Who pulls the permits for a pool in Florida?` | `We do. Permitting and code compliance are part of the build: we prepare the submittal, pull the permits and coordinate the county inspections through to final start-up.` |
| `What is included in a custom pool project?` | `Design and 3D rendering, engineering, permitting, excavation, gunite shell, plumbing and circulation, electrical and equipment, interior finish, tile and coping, deck, and final start-up.` |

### 8.6 Matriz frase → fuente

| Afirmación nueva | Fuente |
|---|---|
| «New custom inground pools» | `<h1>` y `<title>` vigentes + hoja 22 del libro de Ads |
| «for North Florida homeowners» | Hoja 22: el anuncio promete North Florida. Condados verificados en `src/lib/negocio.mjs:42-44` |
| «3D design» | 7 menciones en la página; paso 2 del proceso: «Design Consultation & 3D Rendering». Hoja 18: **VERIFICADO** |
| «permits» | 10 menciones; paso 3: «Permits & Regulatory Compliance»; la FAQ 4 ya dice «coordinating county inspections». Hoja 18: **VERIFICADO** |
| «final start-up» | 3 menciones; FAQ 4: «from permit approval through final start-up» |
| «from one licensed team» / «design-build» | Tarjeta existente del antes/después: «One team handles design, permits, engineering, and construction» |
| «CPC1461119 · CPC1460562» | `src/lib/negocio.mjs:46-53`, publicadas en el pie de las 122 y en el `identifier` del `LocalBusiness`. ⚠️ **Pendiente: confirmar que siguen vigentes** |
| «+1 (352) 740-3361» / «+1 (954) 913-7112» | `src/data/telefonos.json` |
| «We call you back within 24 hours» | **Confirmado por Sebastian el 11-sep-2026** en esta sesión |
| «We walk your property and put a 3D design on paper» | `src/pages/financing.astro`, paso «Design consultation» |
| «fixed project price before you commit» | `src/pages/financing.astro`, paso «Written scope and fixed price» |
| «gunite shell, plumbing, electrical, interior finish, tile and coping, deck» | Paso 4 del proceso y FAQ 4, ya en la página |
| «Free Estimate» | Hoja 18: **VERIFICADO**. Terminología aprobada |

**Lo que NO se escribe, y por qué:** garantía (0 menciones, sin confirmar) · años de experiencia ·
número de piscinas construidas · «5-star» o número de reseñas (el perfil real es 4,1 sobre 13 y el
sitio publica 8 seleccionadas, todas de 5: `valoracion: null`, `total: null` en `resenas.json`) ·
cualquier cifra de precio · urgencia.

---

## 9 · Hoja de contactos e iconos

**Método:** mirando las fotos, no leyendo nombres de fichero (`00-PRINCIPIOS.md` §4). Se montó una
hoja de contactos HTML y se capturó con Chromium: **31 fotos** de las 6 obras de North Florida, y
luego las candidatas en grande.

| Hueco | Elección | Motivo |
|---|---|---|
| Héroe | **`new-pool-spa-construction-florida.avif`**, la actual (1950×1219) | Es una piscina terminada real y encuadra bien. Se queda; lo que cambia es cómo se carga: `eager` + `fetchpriority="high"` + `width`/`height` |
| Obras reales | `CarruselProyectos` con las obras con piscina de `public/images/projects/` | 15 galerías reales, cada una con su `/project/<slug>` |
| Antes/después | **`estate-pool-spa-sun-shelf-north-florida-project-3.avif`** (1250×698) como «After» | Ver §10 |
| Fotos **descartadas** | las 10 de `pool-construction-1…10` en `gallery` | Son exactamente las 10 del feed de Instagram: repetirlas en la misma página es el hallazgo 4.7 |

**Iconos.** La franja de confianza necesita 4. Se reutilizan los de `src/iconos/financing/`, que ya
son `<mask>` + `currentColor` de la misma familia:

| Tarjeta | Icono | ¿Existe? |
|---|---|---|
| One design-build team | `manos.svg` | ✅ reutilizado |
| Florida licensed pool contractor | `escudo.svg` | ✅ reutilizado |
| See it in 3D first | `plano.svg` | ✅ reutilizado |
| Permits and code handled | `contrato.svg` | ✅ reutilizado |

**Cero iconos nuevos que generar.** Los 7 de `financing/` cubren los 4 huecos con su semántica
correcta, así que no hace falta Higgsfield para esto y la familia visual queda garantizada.

---

## 10 · Las imágenes del antes/después

La regla de la casa no se toca: **nunca se genera obra que parezca del cliente**. Aquí la obra es
real y lo generado es su **ausencia** — y aun así va etiquetado.

### 10.1 La foto elegida

**`public/images/projects/estate-pool-spa-sun-shelf-north-florida/…-project-3.avif`** · **1250×698**
· «Estate Pool & Spa with Sun Shelf» · **North Florida** · con ficha propia en
`/project/estate-pool-spa-sun-shelf-north-florida`.

Gana por una razón técnica que decide todo lo demás: **es un plano aéreo donde la piscina y su
terraza son una isla geométrica rodeada de césped por tres lados, dentro del mismo encuadre.** Para
construir el «antes» hay que sustituir esa isla por el césped que **ya está en la propia
fotografía** — mismo verde, misma altura de corte, misma dirección de siega, misma luz. El modelo
no inventa el material: lo copia de al lado.

Descartadas: la 5 (la piscina ocupa el 70 % del cuadro y se sale por el borde inferior: el «antes»
sería casi todo superficie inventada) y la 1 (tres cuartos con mobiliario, difícil de rellenar sin
costuras).

### 10.2 La escena, descrita desde la foto

Casa de una planta a la derecha, cubierta de teja asfáltica gris oscuro a cuatro aguas, fachada de
lamas horizontales gris azulado, carpintería blanca, lanai cubierto con pilares grises y losa de
hormigón claro pegada a la casa. La isla: piscina rectangular grande, terraza de mármol de formato
grande casi blanco con veta gris, banda de inlay oscuro, borde de canto rodado gris recorriendo
todo el perímetro, spa elevado con gresite azul a la derecha y banco solar en el extremo cercano.
Sobre la terraza, dos conjuntos de sofás de fibra con cojines, dos tumbonas y un comedor pequeño
junto a la casa. Césped San Agustín verde intenso, **de tepe recién puesto, con juntas visibles**.
Valla de rancho de cuatro travesaños marrón oscuro cruzando el cuadro, segunda línea de valla al
fondo, pasto segado en dos tonos y línea continua de árboles en el horizonte. Cielo de cúmulos
blancos sobre azul, sol alto y ligeramente a la izquierda: sombras cortas hacia la derecha.

### 10.3 Cómo se genera

La técnica manda sobre la marca: hace falta **relleno generativo con máscara sobre la foto real**,
no texto-a-imagen. Por orden: **Photoshop Generative Fill** (conserva grano, ruido y perspectiva de
la base) y, solo si su endpoint acepta imagen de partida y máscara, **Higgsfield** —
`00-PRINCIPIOS.md:38` lo documenta como *still dirigido* texto-a-imagen, y si no admite `init
image` no sirve para esto: daría otro patio, que es justo el problema que venimos a arreglar.

**La máscara:** la isla construida — vaso, spa, terraza, banda de inlay, borde de canto rodado y el
mobiliario que está sobre la terraza. **Fuera de la máscara se queda la losa de hormigón de la
casa**: el lanai es anterior a la piscina, así que borrarlo sería inventar más de lo necesario.

**Prompt corto** (el que mejor funciona en Generative Fill; los largos empeoran el relleno):

```
flat mowed lawn, same grass as the surrounding yard, level ground, midday sun
```

**Prompt largo**, si el corto deja costuras:

```
continuous St. Augustine lawn at the same height and colour as the surrounding grass, mowed in the
same direction, slightly uneven with faint sod seams and a few dry patches, flat level ground, no
structures, no paving, high midday sun from the upper left, aerial photograph, natural colour
```

**Negativo**, donde el motor lo admita:

```
pool, water, swimming pool, spa, hot tub, deck, pavers, travertine, marble, stone, coping, tile,
railing, furniture, loungers, umbrella, people, animals, path, driveway, text, watermark, logo,
HDR, oversaturated, painterly, blurry, tilted horizon
```

**Las cuatro cosas que deciden si se ve real** — específicas de esta foto:

1. **El césped que hay que copiar es el establecido, no el tepe nuevo.** Las juntas de tepe que se
   ven alrededor de la obra son posteriores a la piscina. Un «antes» de verdad es anterior a ese
   tepe: el relleno se parece al césped asentado del fondo, no a la alfombra nueva.
2. **Cero sombras nuevas.** Un césped plano no proyecta nada. Cualquier sombra dentro de la máscara
   es motivo de rechazo: es el tell que delata una imagen generada.
3. **Respetar la distorsión de gran angular.** El relleno no puede meter una recta donde la lente
   curva. Se comprueba en los bordes izquierdo y derecho.
4. **El cesto turquesa y la esterilla verde que están sobre el césped quedan FUERA de la máscara.**
   Son reales y son la prueba de que es la misma fotografía.

### 10.4 Prueba de aceptación

- Dimensiones exactas **1250×698**.
- **Diff de píxeles: la zona fuera de la máscara, 100 % idéntica.** No «parecida». Si el motor
  reencodó toda la imagen, se recompone pegando el relleno sobre el original.
- Ni una gota de agua ni una pieza de coronación en ningún sitio.
- Horizonte, línea de valla y alero continuos y sin romper.
- Sin césped repetido en mosaico ni travesaño emborronado.
- **3-4 candidatas, elección por hoja de contactos.** Se rechaza, no se transige.

### 10.5 Qué se publica, y cómo se dice

- Etiqueta **visible** en el lado «Before»: `Before — visualization`. No basta con el `alt`.
- `alt` del «before»: *Reconstruction of the same backyard before construction, generated from the
  finished photograph.*
- El «After» es la foto real, con enlace a `/project/estate-pool-spa-sun-shelf-north-florida`.
- Las dos en AVIF con `width`/`height` horneados.
- **Encuadre idéntico por construcción**, no por recorte: es la misma fotografía. Eso satisface el
  umbral de `CRITERIO.md` sin discusión.

**Con la etiqueta esto es honesto y además refuerza el tema RSA «3D Design Preview». Sin ella,
cambiamos un problema de derechos por uno de veracidad.** Va con la etiqueta.

### 10.6 El bloqueo

No se puede generar en este contenedor: Higgsfield vive en el Mac (`~/.local/bin/hf` +
`~/.higgsfield.env`, ninguno de los dos existe aquí), no hay skill `higgsfield-generate`, y las
herramientas de Adobe conectadas **no hacen relleno generativo** (`image_fill_area` es color plano;
`image_generative_expand` solo extiende bordes). Tampoco hay foto de obra previa entre las 80 de
`public/images/projects/`: se miraron todas.

**Por eso la foto del MLS sale ya y la sección se retira de esta ruta**, en vez de esperar. Vuelve
en su propio commit en cuanto exista el «Before».

**Límite conocido:** 1250×698 es lo que hay en el repo. Se ve bien a 1× en el ancho del contenedor
(~1200 px a 1440) y algo blando a 2×. Con el original a resolución completa mejora gratis.

---

## 11 · Especificación del formulario

**Un solo `<form>` en la página.** Reutiliza el circuito existente entero, sin montar uno paralelo.

### 11.1 Campos

| Campo | `name` | Tipo | Obligatorio | Notas |
|---|---|---|---|---|
| Full name | `Full-Name` | `text` | sí | `autocomplete="name"` |
| Phone | `Phone` | `tel` | sí | `autocomplete="tel"` |
| Email | `email` | `email` | sí | `autocomplete="email"` |
| ZIP Code | `ZIP-Code` | `text` | sí | `inputmode="numeric"`, patrón de 5 dígitos, `autocomplete="postal-code"` |
| Homeowner status | `Type` | `select` | sí | `Yes, I own this property` · `No` · `Other` |
| Project Type | `Project-Type` | `select` | sí | **preseleccionado `New Custom Pool`**; segunda opción `Complete Pool Remodel` |
| Investment Range | `Estimated-Project-Budget` | `select` | sí | las 6 opciones existentes, literales |
| Timeline | `Timeline` | `select` | sí | `As soon as possible` · `1-3 months` · `3-6 months` · `6-12 months` · `Just exploring` |
| Project details | `Message` | `textarea` | **no** | opcional a propósito: no se añade fricción donde no hace falta |

**Investment Range** reutiliza literalmente el desplegable del «Request Quote Form», **con su guion
largo `–` (U+2013)**. Un guion normal partiría la dimensión `budget_range` en dos juegos de valores
en GA4:

```
Under $25,000 · $25,000 – $50,000 · $50,000 – $75,000 · $75,000 – $100,000 · $100,000 – $150,000 · $150,000+
```

No se simplifica para subir la tasa de conversión: **la calidad del lead manda.**

### 11.2 Identidad y medición

| Clave | Valor | Dónde se da de alta |
|---|---|---|
| `data-name` | `Pool Builders Core Form` | `FORMULARIOS` en `src/pages/api/formulario.ts` |
| `form_name` / `__form_id` | `core` | `MAPA_FORM` en `src/components/Formularios.astro` |
| Nombre en el correo | `Pool builders core lead` | `NOMBRES` en `src/lib/aviso-correo.ts` |
| Aterrizaje | `/thank-you?f=core` | sale del mismo `idForm` |

**`data-name` nuevo y no reutilizado**, a propósito: con «Request Quote Form» el `form_name` sería
`estimate`, indistinguible del de `/request-estimated` en GA4. El valor `core` es nuevo y **se
documenta para `PROMPT-TRACKING-GOOGLE.md`**; no se inventa ningún evento.

### 11.3 Lo que viaja, y lo que no

`generate_lead` ya empuja seis parámetros y cuatro de los cualificadores encajan sin tocar nada:
`project_type` ← Project Type · `user_type` ← Homeowner status · `budget_range` ← Investment Range ·
`service_interest` ← los servicios · más `form_name` y `form_location`.

- **El ZIP no va al dataLayer.** Es cuasi-identificador: viaja solo al correo, igual que el `gclid`.
- **Timeline tampoco**, de momento: sería un parámetro nuevo, y los parámetros nuevos los decide
  `PROMPT-TRACKING-GOOGLE.md`. Va al correo, que es donde el comercial lo necesita.
- Nunca `page_view` ni `scroll` como conversión. Nada de PII en el dataLayer.

### 11.4 Circuito, sin tocar nada

`data-mm-envia="1"` · honeypot `ref_id` · time-trap (`elapsedMs`, umbral de 1 s en servidor) ·
Turnstile explícito · captura de primer toque de `gclid`/`wbraid`/`gbraid`/`utm` desde
`sessionStorage['mm_origen']` · POST a `/api/formulario` · `sessionStorage['mm_lead']` **solo si el
servidor devuelve `entregado: true`** · `/thank-you?f=core`, que lee y **borra** `mm_lead` y empuja
**un solo** `generate_lead`.

⚠️ **Un campo que no esté en la lista blanca de `FORMULARIOS` desaparece en silencio del correo del
lead.** Los nueve se dan de alta ahí con su etiqueta, en el orden en que se quieren leer.

### 11.5 Accesibilidad

`id` únicos, `label` visibles (no `placeholder` como etiqueta), tipos correctos, `autocomplete`,
estados de error con `aria-invalid` y mensaje, uso completo con teclado, y zonas táctiles ≥44 px en
los cuatro anchos. Se hereda de `.appointment-section`, que ya trae campos de 48 px, anillos de
foco con `--mm-foco` y el patrón de error medido.

---

## 12 · Score proyectado

Con la verificación contra producción bloqueada, el techo aritmético de esta página es **97**.

| Criterio | Máx | Hoy | Después | Por qué |
|---|---:|---:|---:|---|
| Search Intent · H1/Hero · Semantic · Trust | 50 | 50 | 50 | ya al máximo |
| First 100 Words | 10 | 9 | **10** | piscina nueva + North Florida + teléfono + CTA al formulario, en el héroe |
| Geographic Relevance | 10 | 7 | **8** | NF delante en todo, `location` reordenada, condados verificados, campo ZIP. **El slug sigue diciendo `north-south`: esos 2 puntos no se recuperan sin romper la URL final del anuncio** |
| Commercial Intent | 10 | 9 | **10** | remodelación fuera del cluster y enlazada a su landing; «redesigns» corregido; rutas a estimador y financiación |
| CTA / Conversion | 10 | 6 | **10** | formulario cualificador propio: se acaba el segundo clic |
| Mobile UX | 5 | 4 | **5** | medido a 390 px sobre el build con `getBoundingClientRect`. **Es laboratorio, no dispositivo real**: con criterio estricto se queda en 4 y el total es 95 |
| Technical / Performance | 5 | 3 | **3** | `PRODUCTION PERFORMANCE VERIFICATION BLOCKED`. No sube y no se maquilla |
| **TOTAL** | **100** | **88** | **96** | |

**Veredicto: READY AFTER FIXES.** No puede ser READY FOR PAID SEARCH mientras `generate_lead` siga
a 0 en GA4.

---

## 13 · Pendientes para Sebastian

1. **El «Before»**: generarlo en el Mac con el prompt y la máscara de §10, o autorizar subir la foto
   de obra a Adobe para producir la máscara desde aquí (publica una foto de obra en un servicio
   externo, por eso no se hace sin permiso).
2. **Vigencia de las dos licencias** `CPC1461119` y `CPC1460562`.
3. **El `$75,000 – $500,000+` sale** de la página y del schema por no estar verificado. Recuperarlo
   exigiría confirmación y aun así choca con la decisión TILA/Reg Z del 2-sep.
4. **URLs de Facebook, Houzz, BBB y Yelp** para `sameAs` — hoy solo hay tres perfiles.
5. **El texto exacto de los RSA** (hoja 13) para cerrar la correspondencia A4. Mientras tanto,
   **RSA CLAIM REQUIRES REVIEW**.
6. **El bloqueo de lanzamiento sigue siendo de GTM**: `generate_lead` a 0 con `/thank-you` en 18
   páginas vistas. Sospechoso principal, el trigger `BLOQUEO - Entornos de preview` con condición
   `{{_event}} .*`.
7. **El rojo de `check:texto`** (§1) se cierra congelando los temporizadores en la librería de
   captura. Es decisión del director porque afecta a todas las rutas con carrusel.
8. **El consentimiento de SMS es obligatorio en los otros cuatro formularios del sitio**
   —`/contact-us`, `/request-estimated`, `/brochures` y el lightbox de `/gallery`—, heredado de
   Webflow. No se puede enviar ninguno de esos formularios sin aceptar recibir SMS de
   «promotions». Eso condiciona el servicio a un consentimiento de **marketing**, que es justo lo
   que 47 CFR §64.1200(a)(2) no permite. **En el formulario nuevo va opcional** (§14.3); los otros
   cuatro son rutas fuera de este encargo y **no se tocaron**. Decide si se igualan.
9. **La resolución del héroe.** `…-project-2.avif` es 1250×698, que es lo que hay en el
   repositorio. Se ve bien a 1× en el ancho del contenedor (~1200 px a 1440) y algo blando a 2×.
   Si existe el original a resolución completa, es una mejora gratis.
10. **Aprobar las capturas de esta ruta.** `check:visual` está en rojo **correctamente** (§16):
    hay que mirarla y ejecutar `node scripts/aprobar-diseno.mjs /services/custom-pool-spa-builders-in-north-south-florida --si`
    con el árbol limpio. Hasta entonces la puerta falla ABIERTO, y así consta.
11. **`check:assets` no pasa en ningún clon nuevo** (§17): lee sin condición de
    `_source/sanity-masters/`, que está en `.gitignore:12`. Rompe `npm run check` en la sexta
    puerta para cualquiera que clone hoy. No es de este encargo.
12. **El rojo de `check:texto` en las 14 fichas** se cierra con `page.clock.install()` en
    `scripts/lib/captura.mjs` (§15). Es del director porque cambia la lectura de todas las rutas
    con carrusel — pero ahora se sabe que arregla las 14 de golpe, no una.


---

## 14 · Lo que salió de la F2 y la F3 — cerrado el 11-sep-2026

### 14.1 F2 · La variante que ganó, y por qué

`src/pages/_lab-servicio.astro`, no enrutado, monta **los componentes reales** —no una maqueta— y
pinta las dos variantes una encima de otra:

- **A** — formulario dentro del héroe, a la derecha del texto, en escritorio.
- **B** — formulario como sección propia, detrás de la franja de confianza.

**Gana la B**, y no por gusto. Tres medidas:

| | A (en el héroe) | B (sección propia) |
|---|---|---|
| El `<h1>` y el CTA a 390 px | el formulario empuja el h1 fuera del pliegue o el héroe crece hasta que la foto deja de leerse | h1, CTA y teléfono de North Florida **dentro del pliegue**, con los 80 px del botón flotante ya reservados |
| Contraste del texto sobre la foto | hay que oscurecer más el velo para que los campos se lean, y entonces la foto —que es la prueba de obra— se apaga | el velo se queda en el 56 % medido y la foto se ve |
| Reutilización de `.appointment-section` | no encaja: el ancestro está escrito para una sección a ancho completo | encaja entero, y con él **campos de 48 px, anillos de foco y estados de error ya medidos** |

Lo tercero es lo que decide: la capa CSS tenía **6.285 B libres** de los 81.920 del tope de
`check:tokens`. `estimacion.css` gasta 13.193 B en exactamente estos estilos. **Un formulario
estilado desde cero no cabía en el presupuesto.** La variante A obligaba a escribirlo; la B lo
hereda. Después de todo el encargo, la capa queda en **78,1 KB de 80** con 25 hojas.

El CTA del héroe ancla a `#estimate`, que es la sección B. Se le puso
`scroll-margin-block-start: calc(var(--mm-nav-alto) + var(--mm-e-24))` porque `section.menu` es
`fixed` de 85 px y sin eso el encabezado aterrizaba a 48/64 px del borde, medio tapado. Con la
regla: **157/173 px**.

### 14.2 F3 · Las tres secciones nuevas

| Componente | Qué pinta | Dónde saca el contenido |
|---|---|---|
| `ConfianzaCore` | 4 diferenciadores con icono: design-build · licencia de Florida · diseño 3D antes de comprometerse · permisos y código | `src/data/captacion-servicios.json`, clave por ruta |
| `FormularioCore` | la sección `#estimate`: 8 cualificadores obligatorios + detalles opcionales + «What happens after you reach out» con el plazo de **24 h** | ídem |
| `InversionCore` | inversión y financiación, con rutas a `/pool-cost-estimator` y `/financing`. **Ni una cifra** | ídem |

Los tres devuelven `null` sin entrada en el JSON, así que **añadir una de las trece fichas
restantes cuesta una entrada de JSON y una línea en la lista de rutas del generador.** Nada queda
cableado a esta ruta.

Dos cosas que solo se aprenden construyendo:

1. **`InversionCore` no aparecía, en silencio.** Seis secciones de la ficha —`trusted`,
   `services`, el antes/después, `process`, `gallery` y `faq`— **no** son hermanas de primer
   nivel: cuelgan de un `<div>` sin clase. El bucle de hermanos nunca las veía. Se arregló
   insertando el marcador como **nodo de texto** en el DOM, no como cadena en el HTML.
2. **35 imágenes se quedaban sin `width`/`height`, también en silencio.** `captacion()` corre
   **antes** que `localizar()`, así que los `src` todavía eran URLs del CDN y la tabla de
   dimensiones no casaba ninguna. Se arregló con un mapa `DIM_CDN`.

### 14.3 El formulario, y la desviación de la especificación

Los nueve campos de §11.1 están puestos tal cual, con el guion largo `–` (U+2013) intacto en las
seis opciones de Investment Range. **Hay una desviación, y es deliberada:** además de los nueve va
la casilla de consentimiento de SMS que los otros cuatro formularios del sitio traen de Webflow.

**Aquí va OPCIONAL, y en los otros cuatro es obligatoria.** El motivo es doble y ninguno es
estético:

- **Legal.** El texto mezcla avisos de obra con «promotions». Exigir el consentimiento de
  marketing para poder pedir un presupuesto lo convierte en condición del servicio, y
  47 CFR §64.1200(a)(2) dice que no puede serlo.
- **Conversión.** Es el único campo obligatorio que **no aporta nada a la estimación**. Quien no
  lo marca se va sin dejar el lead que ya se pagó con el clic.

La calidad del lead no baja: los ocho cualificadores siguen siendo obligatorios. Lo único que
cambia es por qué canal se le puede escribir después. El valor es `Yes` y no `on` porque el correo
lo lee un comercial, y **este es el único formulario del sitio que registra el consentimiento**:
si se pide, tiene que quedar constancia. Marcada, sale la fila «SMS consent: Yes»; sin marcar, la
fila no sale — igual que «Project details» cuando no se escribe nada.

Los otros cuatro formularios **no se tocaron**: son rutas fuera de este encargo. Va como pendiente
§13.8.

### 14.4 El filtro del carrusel — un problema que me hice yo solo

Sustituir `gallery` por `CarruselProyectos` resolvía el solape 10/10 con el feed de Instagram y
abría enlaces internos. Pero al medir el resultado apareció lo que no estaba previsto: de los 15
proyectos, **once lideran con pérgola, cocina exterior o cubierta de patio** —intenciones
**excluidas** de esta landing— y cinco dicen «South Florida». El carrusel metía **5 «South
Florida» y 8 «Pergola» debajo del pliegue** de una landing de piscina nueva en North Florida.

El arreglo es un `proyectos.solo` opcional por ruta, con la lista declarada mandando el orden:

```
1 Estate Pool & Spa with Sun Shelf                      -> /project/estate-pool-spa-sun-shelf-north-florida
2 Luxury Pool & Spa with Screen Enclosure North Florida -> /project/luxury-pool-spa-screen-enclosure-north-florida
3 Luxury Pool & Raised Spa with Travertine Deck         -> /project/luxury-pool-raised-spa-travertine-deck-south-florida
4 Pool & Raised Spa with Marble Deck                    -> /project/pool-raised-spa-marble-deck-south-florida

North Florida: 1 | South Florida: 0 | Pergola: 0
```

Las otras **65 rutas** que montan el carrusel no declaran nada y siguen viendo las 15: su HTML
sale byte a byte igual, verificado. Y un slug mal escrito **rompe la construcción** en vez de
tirar el slide en silencio — se comprobó rompiéndolo a propósito:

```
CarruselProyectos: /services/custom-pool-spa-builders-in-north-south-florida
declara la obra «estate-pool-spa-sun-shelf-north-floridaXX», que no existe.      [exit 1]
```

### 14.5 El prefijo `.svc-` NO estaba libre

Lo encontró el barrido de clases del red team, no la lectura del código. `ServiciosPorCategoria.astro`
—que montan `/`, `/where-we-serve/north-florida` y `/where-we-serve/south-florida`— **ya tiene un
espacio de nombres `.svc-`**: `svc-barra`, `svc-ficha`, `svc-chevron`, `svc-nombre`… y
**`svc-icono`**, que era también el nombre de mi círculo de icono.

La colisión es real y estaba en el build:

```
.svc-icono{…place-items:center;display:grid}              ← mía, GLOBAL (Base.astro)
.svc-icono[data-astro-cid-tbqwuwa5]{…width:30px;…}        ← suya, SCOPED por Astro
```

La suya va scoped, o sea (0,2,0), y ganaba en **todo lo que declara**. Pero `display`,
`place-items` y `color` **no los declara**, así que esos tres se colaban desde mi hoja sobre
**42 iconos repartidos en tres páginas** que este encargo promete intactas.

**Hoy no se veía**, y conviene decirlo con precisión en vez de exagerar el hallazgo: el elemento
es un `<img>` hijo directo de un `display:flex`, así que ya estaba blockificado y `display:grid` no
lo mueve; `place-items` no pinta nada en un elemento reemplazado sin hijos; y `color` no se ve en
una imagen que carga. **El HTML seguía siendo byte a byte idéntico y los píxeles también.**

Se renombró igualmente a `.svc-confianza__icono`. Dos cosas distintas con el mismo nombre en el
mismo espacio global es una bomba de relojería: basta con que alguien añada mañana un
`padding` a la mía. El barrido completo de mis **26 clases** contra las 122 páginas da
**0 colisiones** después del cambio.

### 14.6 El héroe, y la foto que estaba dos veces

La foto del héroe era `…-project-1.avif`, que **es también la portada de su propia tarjeta** en el
carrusel de proyectos: la misma imagen dos veces en la misma página. Se cambió a `…-project-2.avif`
de la misma obra. Contraste del texto sobre ella: **4,94:1** por el método de `CRITERIO.md` —peor
píxel, nunca promedio—, con el velo medido al 56 %. El umbral es 4,5:1.

Antes de eso hubo que descartar `--mm-tinta-inversa-2`, que daba **3,18:1** (un 22,3 % por debajo):
ese token está calibrado contra el azul marino plano, no contra una fotografía. Se usa blanco
puro, **5,05:1**.

Y el antes/después **sale de la página**: la foto «Before» es de un listado del MLS de Miami y el
«After» es otro patio. No espera a que exista la sustituta. El plan para reconstruirla —obra
elegida, máscara descrita, prompts y prueba de aceptación— está en §10 y **vuelve en su propio
commit** cuando el «Before» exista.


---

## 15 · El rojo de `check:texto`, ya no es una hipótesis

La §1 dejó la causa **identificada**. La barrida completa —115 rutas, la primera que se corre
entera en este encargo— la deja **probada**, y con una coincidencia que no admite otra lectura:

```bash
$ grep -rlo 'process-section' .vercel/output/static --include='*.html' | wc -l
14
$ node scripts/check-texto.mjs          # sin filtro, las 115
  115/115 rutas medidas · 101 identicas · 14 en rojo
PUERTA ROJA — 14 pagina(s)
```

**Las 14 rojas son exactamente las 14 fichas de `/services/`, que son exactamente las 14 que
montan la sección de proceso.** Trece dan la firma idéntica `faltan 2 lineas, sobran 2`, y las
trece son **byte a byte idénticas al commit base**: una página cuyo HTML no ha cambiado en un solo
byte no la puede haber roto este diff.

Eso convierte el diagnóstico en conclusión: **es un defecto de la puerta, no de las páginas.**
`AUTOPLAY_DELAY = 5000` pasa la diapositiva sola, la captura lee el paso 2 y el baseline tiene el
1. El arreglo —`page.clock.install()` en `scripts/lib/captura.mjs`— vale para las 14 de una vez, y
es del director porque cambia la lectura de todas las rutas con carrusel.

### Y la puerta cazó dos regresiones mías, que es para lo que está

Ninguna de las dos la habría visto releyendo el diff.

1. **El espejo de la etiqueta de consentimiento.** `CAMPOS_CAPTACION` es un espejo deliberado de
   `FormularioCore.astro`; su comentario dice literalmente que una etiqueta cambiada allí y no
   aquí **tiene** que poner la puerta roja. Cambié la etiqueta en §14.3 y no toqué el espejo.
2. **Un cambio de copy publicado, sin decidirlo.** Al meter `proyectos.solo` en el JSON se me
   cambió de paso la entradilla del carrusel:

   ```diff
   - "Real projects from our own galleries, across North and South Florida."
   + "Real projects from our own galleries in North and South Florida."
   ```

   Lo delató que el fichero **derivado** —`proyectos-heading-por-ruta.json`, que es el que lee
   `CarruselProyectos.astro`— seguía con el texto bueno: **fuente y derivado habían divergido**, y
   esa divergencia es lo que la puerta mide. Restaurado el original. `npm run paginas` ya no mueve
   un byte del derivado, que es la prueba de que vuelven a coincidir. Y de paso: la semilla de
   `ENCABEZADOS_PROYECTOS` esparcía el bloque `proyectos` **completo**, metiendo `solo` y su
   `_solo` de documentación en un fichero derivado cuyo único trabajo es decir qué pone en la
   cabecera; ahora copia `titulo` y `entradilla` y nada más.

Después de las dos, acotada a la ruta: `PUERTA ROJA — 1 pagina`, `faltan 2 lineas, sobran 2`, las
mismas cuatro líneas del paso 1 contra el paso 2. **El rojo previo, y nada más. NEW REGRESSION:
ninguna.**

## 16 · `check:visual`: el rojo correcto, con su tamaño

No es un fallo y no se maquilla: la ruta tiene contrato `rediseno` con referencia aprobada el
**31-ago-2026** (`sha 527b5f0`) y la página ha crecido en los cuatro anchos.

| ancho | antes | después | delta |
|---:|---:|---:|---:|
| 1920 | 2040 | 2944 | **+904 px** |
| 1440 | 2024 | 2894 | **+870 px** |
| 991 | 2071 | 2831 | **+760 px** |
| 479 | 2422 | 3348 | **+926 px** |

Tres secciones nuevas hacen eso. La puerta rechaza por el cambio de alto antes de comparar un
píxel, que es lo correcto: lo que dice es «esto ha cambiado mucho, ve a mirarlo». **Sale del rojo
cuando mires las capturas y se ejecute `aprobar-diseno.mjs <ruta> --si`** —árbol limpio y humano—,
y eso es tuyo, no mío.

Se corrió **acotada a esta ruta**, y el motivo se dice en vez de callarse: la barrida completa se
paró a los 62 minutos porque su salida se truncaba a las últimas 30 líneas, o sea que no podía dar
una lista de rojos utilizable, y las referencias de todo el sitio están pendientes de re-aprobar
desde R15-IG. Para las otras 121 páginas la prueba que hay es **más fuerte** que un diff de
píxeles: su HTML es byte a byte idéntico y las 26 clases nuevas barren limpio contra las 122.

## 17 · `check:assets` no puede pasar en ningún clon nuevo

Estaba clasificada como `ENVIRONMENT BLOCKER` de esta máquina. No lo es solo de esta máquina:

```
Error: ENOENT … open '…/_source/sanity-masters/images/site/commercial-pool-builders-…jpg'
$ grep -n sanity-masters .gitignore
12:_source/sanity-masters/
```

La puerta lee sin condición de un directorio que **está en `.gitignore`**. No existe en ningún
checkout limpio, así que `npm run check` se rompe en la sexta puerta para cualquiera que clone el
repositorio hoy. Va como pendiente: no es de este encargo, pero es de alguien.


---

## 18 · La auditoría a 4 anchos que pide el encargo

**`ui-qa` y `0.8.0:audit` no existen en este contenedor.** No hay `.claude/agents/`, no hay
`.claude/skills/`, y `package.json` no tiene ningún script que case `audit` ni `qa`. Viven en el
Mac. Así que **la auditoría se hace, pero a mano**, con un arnés headless que cubre lo mismo que
cubrió la de `/financing` del 3-sep (`MIGRACION-LOG.md:3908`): desbordamiento, huérfanos de
rejilla, hueco muerto, largo de línea, objetivos táctiles, nombre accesible y jerarquía. Cuatro
anchos: **390 · 768 · 1280 · 1440**. Se dice que el agente no corrió en vez de dejarlo pasar por
verde.

### Lo que sale limpio en los cuatro anchos

| Medida | Resultado |
|---|---|
| Desbordamiento horizontal | **0 px** en 390 / 768 / 1280 / 1440 |
| `<h1>` | **1**, y solo 1 |
| Enlaces y botones sin nombre accesible | **0** |
| Huérfanos en las 4 rejillas nuevas | **0** |

Sobre los huérfanos: el arnés los marcó al principio en `.svc-form__rejilla` («2 columnas × 9
hijos») y **era un falso positivo del arnés, no un defecto de la página**: contaba `n % columnas`
sin mirar quién ocupa dos celdas. Las filas reales, medidas por su `top`:

```
1440   2 | 2 | 2 | 2 | 1     <- «Project details» ocupa las dos por `.svc-form__ancho`
 390   1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1
```

### Los dos hallazgos que sí son reales, y de quién son

**1 · 96 objetivos táctiles por debajo de 44×44. Noventa y cinco son cromo del sitio.**

```
 73  a.footer-link          <- el pie, en las 122 paginas
 15  a.button-styles
  4  a.button
  3  a.w-inline-block · 3  a.link-3 · 1  a.mm-resenas__enlace · 1  a.link
  1  input.w-checkbox-input <- MIO: la casilla de consentimiento
```

El único de mis secciones es la casilla, **24×24 px dentro de un `<label>` de 740×63 (1440) y
342×137 (390)**. En una casilla envuelta por su etiqueta, el objetivo de activación es la etiqueta
entera, así que WCAG 2.2 SC 2.5.8 se cumple. **Las secciones nuevas no introducen ni un objetivo
táctil pequeño.** Los 95 restantes son de todo el sitio —73 de ellos del pie— y no son de este
encargo; queda dicho, porque callarlo sería fingir que la página está mejor de lo que está.

**2 · Un salto de nivel en la jerarquía… y la ruta está MEJOR que sus trece hermanas.**

```bash
$ # saltos de nivel por ficha, sobre el build
 2  custom-aluminum-pergola-builders…   h2->h4 «Design-Build Authority» · h2->h4 «Trusted by…»
 2  custom-deck-builders…              h2->h4 «Design-Build Authority» · h2->h4 «Trusted by…»
 1  custom-pool-spa-builders…                                            h2->h4 «Trusted by…»
 2  …las otras once, todas igual que las dos primeras
```

**Trece fichas tienen 2 saltos; esta tiene 1.** El que falta es el del antes/después
(`h2 → h4 «Design-Build Authority»`), que se fue con la sección de la foto del MLS. El que queda
—`h4 «Trusted by Florida's finest homeowners»` del marquee del pie— es cromo compartido, está en
las catorce, y arreglarlo cambia las otras 121 páginas.

### Hueco muerto y largo de línea, contra el listón de `/financing`

| Medida | `/financing` (3-sep) | Aquí |
|---|---|---|
| Hueco muerto en tarjeta | era 113 px de 333 (**34 %**) → se dejó en 27 px | **37 px de 186 (20 %)** a 1440 · 10 px a 390 |
| Línea más larga | descargo de 1186 px → 650 px con `.mm-medida` | **650 px** en mis dos párrafos, por `.mm-medida` |

La línea de 750 px que aparece en la medición es el párrafo de apoyo del héroe, y vive en
`.block-hero-services-page` —contenedor de Webflow, no mío—: 750 px a 1440 son ~90 caracteres, una
medida normal para una entradilla de héroe. El caso de `/financing` era un **descargo legal** de
1186 px, que es otra cosa.
