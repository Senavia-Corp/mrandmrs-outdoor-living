# Parte de bugs — Mr & Mrs Outdoor Living

> **Estado al 5-sep-2026.** Alcance aprobado: P1 + P2 + P3. Cada ticket lleva su estado y la
> verificación que lo cierra. Los que NO se hacen llevan el motivo, no el silencio.
>
> | | |
> |---|---|
> | ✅ Resueltos y verificados | M1 M2 M4 M7 M8 M9 M10 M11 M13 M14 M16 M18 M20 |
> | 🚫 No se hacen, por decisión de Sebastian | M12 |
> | 📋 Documentados, no ejecutados (con motivo) | M5 M6 M15 M17 M19 M21 M22 M23 M24 M25 M26 M27 |
> | ❌ Retirados: eran defectos de la sonda | M3 |

Auditoría del 4/5-sep-2026 sobre el build de producción (`PUBLIC_ES_PRODUCCION=1`) en worktree
aislado. Sustrato: `.vercel/output/static`, 122 páginas.

**Instrumento**: `scripts/audit-sondas.mjs` (headless, nuevo) — 122 rutas × 6 anchos
(375/390/768/1280/1440/1920) = **732 mediciones**; más las 15 puertas del repo, jsdom sobre el
HTML construido, y revisión visual a 375 px.

> **Sin evidencia no hay ticket.** Cada fila lleva la medida que lo detecta. Los hallazgos que
> resultaron ser defectos de la sonda están al final, en «Descartados», con lo que se midió para
> descartarlos — no se cuentan como bugs.

## Lo que la barrida NO encontró (y es la mejor noticia del informe)

| Métrica | Resultado en 732 mediciones |
|---|---|
| Desbordamiento horizontal | **0** |
| Solapes de bloque | **0** |
| Imágenes rotas | **0** |
| Peticiones propias 404/500 o fallidas | **0** |
| Errores de consola | **0** |
| Páginas sin `<title>` · sin canónica · con H1 duplicado | **0 · 0 · 0** |
| Enlaces internos rotos · assets ausentes (`check:enlaces`) | **0 · 0** |
| Descripciones duplicadas | **0** |
| Secretos en el historial de git | **0** |

El sitio es **responsive-limpio**: no se sale por ningún lado en ninguno de los 6 anchos.

---

## P1 — Alto: visible para el cliente, o daña conversión, SEO o accesibilidad

### M1 · Los enlaces legales del formulario de contacto son invisibles (blanco sobre blanco)

> ✅ **RESUELTO** — `.link-4` pasa a `--mm-enlace`. Sonda sobre `/contact-us`: **0 contrastes** en los 6 anchos (antes 12). Captura: `audit/M1-contacto-legal-ARREGLADO-390.png`.

| | |
|---|---|
| **Ruta** | `/contact-us` |
| **Viewport** | los **6** (375/390/768/1280/1440/1920) |
| **Síntoma** | El aviso se lee **«By submitting this form, you agree to our  &»**. «Terms» y «Privacy Policy.» no se ven. |
| **Causa raíz** | `a.link-4` tiene `color: rgb(255,255,255)` sobre un contenedor blanco. Contraste **1:1**. En el visor de `/gallery` la misma clase sale azul (`rgb(29,75,191)`), así que la regla blanca solo alcanza a esta página. |
| **file:line** | `src/pages/contact-us.astro` (marcado heredado) · clase `.link-4` |
| **Evidencia** | `audit/contacto-legal-390.png` · sonda: 12 apariciones, `rgb(255,255,255)` sobre `rgb(255,255,255)` |
| **Fix** | Darle a `.link-4` el color de enlace del sistema (el mismo azul del visor) y subrayado visible. |
| **Esfuerzo** | 15 min |

Además del defecto visual: se pide al usuario aceptar unas condiciones que **no puede leer ni
abrir**. Es la página de conversión principal.

### M2 · Dos pares de fichas de obra comparten `<title>`

> ✅ **RESUELTO** — Tres títulos diferenciados y declarados en `TITULO_PROPIO`. `check:seo` **VERDE** y ahora además exige unicidad: «los 122 `<title>` son únicos — 0 repetidos».

| | |
|---|---|
| **Rutas** | `/project/luxury-pool-motorized-pergola-outdoor-kitchen-north-florida` + `…-screen-enclosure-north-florida` · `/project/luxury-pool-spa-screen-enclosure-north-florida` + `…-with-screen-enclosure-north-florida` |
| **Síntoma** | Títulos idénticos: «Luxury Pool with Motorized Pergola \| North Florida» y «Luxury Pool & Spa with Screen Enclosure \| North Florida» |
| **Causa raíz** | Heredado del Webflow de origen. `check:seo` exige el `<title>` idéntico al origen, así que la paridad lo protegía. **La paridad ya no manda.** |
| **Evidencia** | jsdom sobre 122 HTML · lo avisa también `check:medicion` («defecto real de posicionamiento anotado para Sebastian») |
| **Fix** | Diferenciar ambos títulos. Toca relajar la comparación de `check:seo` para esas 2 rutas, con motivo escrito. |
| **Esfuerzo** | 40 min (incluye la excepción en la puerta) |

### M3 · Casillas de formulario por debajo del mínimo de WCAG 2.2 AA

| | |
|---|---|
| **Síntoma** | `input#Checkbox` mide **13×13 px** y otro `input` **16×16 px**. El mínimo de SC 2.5.8 (AA) es 24×24. |
| **Apariciones** | 54 y 24 en la barrida |
| **Evidencia** | sonda, cubo «campos de formulario» |
| **Fix** | Subir el área táctil a ≥24 px (mejor 44 con `padding`, sin mover el cuadro pintado). |
| **Esfuerzo** | 30 min |

Los `input#checkbox.w-checkbox-input` y los radios de 24×24 **cumplen AA** justo en el límite;
quedan como P2 por debajo de la guía de 44.

### M4 · Los enlaces del pie miden 16 px de alto en las 122 páginas

> ✅ **RESUELTO** — `padding-block:4px` + `margin-block:-4px`. Medido: la caja pasa de **16 px a 24×24**, los huecos de 10 a 2 px (no se solapan) y el texto no se mueve.

| | |
|---|---|
| **Síntoma** | `a.footer-link` con 16 px de alto — por debajo de los 24 de WCAG 2.2 AA 2.5.8 |
| **Apariciones** | **4 654** (58 patrones), en las 122 páginas y los 6 anchos |
| **Causa raíz** | Un solo componente: el pie compartido. Un ticket, no 122. |
| **file:line** | `src/components/Footer.astro` |
| **Evidencia** | sonda, cubo «controles < 24 px» |
| **Fix** | Subir la altura de línea o el `padding` vertical del enlace a ≥24 px. |
| **Esfuerzo** | 30 min + re-aprobar referencias de `check:visual` |

### M5 · 5 546 imágenes visibles sin `width`/`height` (riesgo de CLS)

| | |
|---|---|
| **Síntoma** | 27 patrones sin dimensiones horneadas. Los dos mayores: `img.fs-marquee-logoscms_logo` (2 093) e `img.imagelogo-navbar` (723 — **el logo del nav, en las 122 páginas**). |
| **Evidencia** | sonda, cubo «img sin width/height» |
| **Fix** | Hornear `width`/`height` en el generador de plantillas; empezar por el logo del nav y el carrusel de logos, que salen en todas. |
| **Esfuerzo** | 2 h |

### M6 · Dos vídeos de fondo con `autoplay`, sin `poster` y sin `preload`

| | |
|---|---|
| **Ruta** | `/` (y las que reusan el héroe con vídeo) |
| **Síntoma** | `<video autoplay loop muted playsinline>` ×2, ambos sin `poster` y sin `preload`. Los ficheros pesan **7–8 MB** cada uno (`bg-video-1-mp4.mp4`, `bg-video-3d-mp4.mp4`). |
| **Impacto** | En móvil el héroe queda en negro hasta que el vídeo pinta, y se descargan ambos. |
| **Evidencia** | jsdom sobre `index.html` · `ls -la .vercel/output/static/videos` |
| **Fix** | `poster` con un fotograma, `preload="none"`, y no arrancar el segundo vídeo hasta que entre en pantalla. |
| **Esfuerzo** | 1,5 h |

### M7 · `/pool-investment-estimator`: huérfana, indexable y sin descripción

> ✅ **RESUELTO** — Cabecera completa (description, og:*, twitter:*) y entrada en el sitemap. Verificado sobre el build.

| | |
|---|---|
| **Síntoma** | 200 en producción · **ningún enlace interno la alcanza** (0 entrantes) · fuera del sitemap · **sin `meta description`** · sin `og:title` · sin nav ni pie · y **sí indexable** (no lleva `noindex`) |
| **Contexto** | Su gemela `/pool-cost-estimator` la enlazan 121 páginas y lleva el mismo formulario de 48 campos. |
| **Evidencia** | `audit/INVENTORY.md` (huérfanas) · `curl` a producción |
| **Fix** | Decidir: `noindex` como `/thank-you`, o darle `<head>` completo y enlazarla. **Es decisión de producto: la propongo, no la tomo.** |
| **Esfuerzo** | 20 min una vez decidido |

### M8 · El botón flotante de teléfono tapa contenido y controles de formulario

> ✅ **RESUELTO** — `padding-bottom:80px` en `.wrapper-footer-info` por debajo de 768. Medido con la caja del **texto** en 375/390/600/767/768/1440: **0 textos tapados** en los seis.

| | |
|---|---|
| **Rutas** | todas (widget global); comprobado en `/contact-us` y `/videos` |
| **Viewport** | 375 y 390 |
| **Síntoma** | El círculo azul de llamada se pinta **encima del desplegable «Select one…»** del formulario de contacto, y sobre el texto de las tarjetas de vídeo. |
| **Evidencia** | `audit/shots/375_contact-us.png` · `audit/tarjeta-video-375.png` |
| **Nota** | La sonda **no** lo detecta: excluye los elementos `position:fixed` del cálculo de solapes. Salió mirando. |
| **Fix** | Reservar hueco al final del formulario, o desplazar el botón cuando hay un control debajo. |
| **Esfuerzo** | 1 h |

### M9 · Los teléfonos de contacto parten el número y el subrayado pisa la segunda línea

> ✅ **RESUELTO** — Número envuelto en `.mm-tel` con `nowrap`, enlace a `display:block` y `line-height:1.35`. `innerText` idéntico al original, así que `check:texto` no se ve afectada. Captura: `audit/M9-telefonos-ARREGLADO-375.png`.

| | |
|---|---|
| **Ruta** | `/contact-us` |
| **Viewport** | 375 y 390 |
| **Síntoma** | «North Florida: +1 (352) 740-**3361**» parte antes de los últimos 4 dígitos, y el subrayado del enlace queda pegado al renglón de abajo. Igual en el de South Florida. |
| **Evidencia** | `audit/shots/375_contact-us.png` |
| **Fix** | `white-space: nowrap` en el número (no en la etiqueta) o partir etiqueta y número en dos líneas propias; subir el `line-height`. |
| **Esfuerzo** | 30 min |

---

## P2 — Medio: pulido, inconsistencia y deuda con impacto

| ID | Hallazgo | Evidencia | Fix | Esfuerzo |
|---|---|---|---|---|
| ✅ **M10** | `p.grey` a **4.17:1** sobre blanco en `/about` (mínimo 4.5). 18 apariciones. `rgb(124,124,124)` — **RESUELTO**: `--mm-gris-aa` (#767676, 4,54:1). `check:tokens` VERDE. | sonda | `#767676` da 4.54:1 | 10 min |
| ✅ **M11** | **849** enlaces `target="_blank"` sin `rel="noopener"`. Tres destinos sociales ×241 y `senaviacorp.com` ×120 — todo del **pie compartido** — **RESUELTO**: 0 de 2116 enlaces `target="_blank"` sin `rel`, y 0 externos. | jsdom | Añadir `rel` en `Footer.astro` y en el generador del cascarón | 30 min |
| **M12** | Los enlaces de Terms y Privacy apuntan a **`mrandmrsoutdoorsliving.com`** (con S: **otro dominio**), teniendo el sitio `/articles/terms-conditions` y `/articles/privacy-policy` propios y con 200 | `curl` a los dos dominios | Repuntar a las páginas propias. Si el cliente retira ese dominio, hoy se rompen | 20 min |
| ✅ **M13** | **Cero cabeceras de seguridad**: sin `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. `vercel.json` no tiene bloque `headers` — **RESUELTO**: 5 cabeceras en `vercel.json`. | `curl -I` a producción | Bloque `headers` en `vercel.json` | 30 min |
| ✅ **M14** | `robots.txt` de producción es **solo** la línea `Sitemap:`, sin ningún `User-agent` — **RESUELTO**: `User-agent: *` + `Allow: /` en producción; preview sigue bloqueado. | `curl` · `build-seo-ficheros.mjs:102` | Añadir `User-agent: *` + `Allow: /` | 10 min |
| **M15** | **34 páginas** saltan nivel de encabezado (`h1→h3`, `h1→h4`). Familias: `articles`, `blogs`, `country`, `blogs-tips`, `about` | jsdom | Corregir en las 4-5 plantillas, no página a página | 2 h |
| ✅ **M16** | **`check:assets` sale ROJA desde un clon limpio.** `_source/assets-manifest.json` lista 3 vídeos (`public/videos/bg-video{,-1,-3d}.mp4`) que `.gitignore:60-66` excluye a propósito y que **ningún HTML ni CSS construido usa**. En la máquina de Sebastian pasa verde porque los ficheros siguen sueltos en disco — **RESUELTO**: 3 entradas muertas fuera del manifiesto. `check:assets` **VERDE desde un árbol limpio**. | reproducido en el worktree | Quitar las 3 entradas del manifiesto | 20 min |
| **M17** | CTAs de **28–40 px** de alto (bajo la guía de 44, cumplen AA). `a.button-styles` 112×34 ×858, `a.mm-resenas__enlace` 137×28 ×504 | sonda | Subir el `padding` vertical | 1 h + re-aprobar visual |
| ✅ **M18** | **19 páginas sin `og:image`** y 5 sin `twitter:card` — **RESUELTO**: 0 páginas sin `og:image` ni `twitter:card`. Declarado en `META_ANADIDAS`. | jsdom | Imagen por defecto en `Base.astro` | 30 min |
| **M19** | `npm audit`: **3 vulnerabilidades altas** — `path-to-regexp` vía `@vercel/routing-utils` vía `@astrojs/vercel`. Es dependencia de construcción, no de ejecución en el navegador | `npm audit --omit=dev` | Ver si hay subida no rompedora del adaptador | 1 h |
| ✅ **M20** | `/where-we-serve/north-florida` está **fuera del sitemap** mientras su gemela south-florida sí está. Deliberado por paridad (`build-seo-ficheros.mjs:17`), pero es una zona de servicio entera sin declarar — **RESUELTO**: `/where-we-serve/north-florida` en el sitemap. 121 `<loc>`. | cruce build↔sitemap | Añadirla | 10 min |

---

## P3 — Bajo: se documenta; se arregla si sobra tiempo

| ID | Hallazgo | Evidencia |
|---|---|---|
| **M21** | `/videos`: la descripción se corta **a media palabra** a 105 px con `overflow:hidden` y un desvanecido, sin «ver más» | `audit/tarjeta-video-375.png` |
| **M22** | `/videos`: las tarjetas anuncian «**1 Views** • 0 Likes • 0 Comments» — concordancia mal, y exhibir ceros resta en vez de sumar | misma captura |
| **M23** | `estimador.css` conserva la paleta muerta de shadcn en `oklch()` (ya declarada como excepción en `check:tokens`) | `check-tokens.mjs` cabecera |
| **M24** | Carrusel de logos: el control de pausa se pinta **encima de un logo**, y los logos se cortan en los bordes | `audit/shots/375_home.png` |
| **M25** | `/about`: la foto del héroe se recorta por arriba y por los lados (pala y brazo cortados) | `audit/shots/375_about.png` |
| **M26** | El velo azul de los héroes es tan opaco que la foto de piscina casi no se lee | `audit/shots/375_home.png`, `375_where-we-serve_north-florida.png` |
| **M27** | El endpoint de formularios no limita la longitud por campo (sí tiene Turnstile, honeypot y rate-limit) | `src/pages/api/formulario.ts` |

---

## Repositorio (DevOps)

| ID | Hallazgo |
|---|---|
| **M28** | `r16-proy-carrusel` está **2 commits por delante de `main` y sin mergear**, y `main` es lo que sirve producción |
| **M29** | Rama muerta `ensayo-merge` (idéntica a `main`), worktree `claude/adoring-panini-5f17df` y worktree huérfano en `/private/tmp/…/deploy-worktree` |
| **M30** | Un `astro dev` ajeno (PID 55481) lleva vivo desde el jueves sobre el árbol principal; el log ya registra que borró `.vercel/output` a media construcción. Esta auditoría lo esquivó con el worktree; **no se ha tocado** |

---

## Descartados: lo que parecía un bug y no lo era

Se listan porque costaron medición y para que nadie los vuelva a levantar.

| Parecía | Qué se midió | Veredicto |
|---|---|---|
| 122 páginas sin canónica, `robots.txt` en `Disallow: /` | El build en disco se hizo **sin `PUBLIC_ES_PRODUCCION=1`** | Artefacto del build de preview. En producción: 122/122 con canónica |
| 30 páginas con **dos `<h1>`** | `grep '<h1'` contaba coincidencias dentro de JSON-LD; jsdom cuenta **1 en las 122** | Defecto de mi grep |
| 94 objetivos táctiles y 2 contrastes de 1:1 en la home | Los elementos estaban dentro de `.svc-cuerpo`, un panel con `opacity:0`. La sonda no miraba a los ancestros | Defecto de la sonda, corregido |
| 397 solapes de texto | 251 eran dos `<strong>` multilínea del mismo párrafo (la caja de un elemento en línea une todas sus líneas); el resto, texto recortado por `overflow:hidden` cuya caja cae sobre la tarjeta vecina | Defecto de la sonda, corregido con `rectVisto()` |
| 36 contrastes de 1.05:1 en el estimador | El parser leía `oklch(0.446 0.043 257.281)` como si fuera `rgb()`. «Step 1 of 7» se lee perfectamente | Defecto de la sonda, corregido |
| 48 contrastes de 1.09:1 en la insignia de duración de `/videos` | Su fondo es `color(srgb 0 0 0 / 0.8)`, que el parser estricto rechazaba: comparaba el texto blanco contra el fondo claro de la tarjeta | Defecto de la sonda, corregido |
| Enlaces legales a un dominio roto | `mrandmrsoutdoorsliving.com/terms-of-service` y `/privacy-policy-page` responden **200 con contenido real** | No es un enlace roto; sigue siendo M12 |
| Sin `prefers-reduced-motion` | Está en 10+ hojas de `src/styles/` | Cubierto |
| `npm run build` modifica dos ficheros versionados (`public/robots.txt`, `public/sitemap.xml`) | Lo commiteado es `Disallow: /` y un sitemap vacío; solo un build con `PUBLIC_ES_PRODUCCION=1` los abre | **Red de seguridad deliberada**, no un bug. El valor por defecto del repo es «bloqueado» |

---

## Lo que NO se ejecuta, y por qué — medido, no supuesto

Nada de esto se calla. Cada fila lleva la medida que llevó a no tocarlo.

| ID | Por qué no se hace |
|---|---|
| **M12** | **Decisión de Sebastian**: los enlaces legales se quedan en `mrandmrsoutdoorsliving.com`. Sí se les añadió `rel="noopener"` (M11), que es lo que sí era un defecto. |
| **M5** | **Bloqueado por una trampa medida.** `webflow.css` sirve `img{max-width:100%}` **sin `height:auto`**. Hornear `width`/`height` con eso deforma la imagen: el ancho lo encoge el `max-width` y el alto se queda en el intrínseco. Habría que añadir antes un `img{height:auto}` global, que cambia el renderizado de las 122 páginas y exige `check:visual` con navegador visible. **Y el CLS ya aprueba**: medido en `/` a 375, **0,047** (el umbral es 0,1). Riesgo alto, ganancia marginal. |
| **M6** | **Rebajado tras medirlo: no era lo que parecía.** Los dos vídeos **sí tienen póster** (como `background-image`, el patrón de Webflow; mi sonda solo miraba el atributo `poster`). Y lo importante: **no se descargan** — 0 bytes de vídeo en la carga de `/` a 375. El coste real son **2,68 MB de imágenes**, ver M31. |
| **M31** *(nuevo)* | **Las imágenes no son adaptables.** Medido en `/` a 375: **4,10 MB transferidos, 2,68 MB de imágenes**, con AVIF de 300-450 KB servidos a tamaño de escritorio. Ninguna tiene `srcset` ni `sizes`, y **no hay variantes en disco**. Generarlas es un cambio de tubería (sharp, manifiesto, `check:assets`), no un arreglo de bug. **Se recomienda como siguiente encargo**: es la mejora de rendimiento con más recorrido que le queda al sitio. Hoy no bloquea nada — **LCP 344 ms** y **CLS 0,047**, los dos holgadamente dentro de umbral. |
| **M15** | 34 páginas saltan nivel de encabezado (`h1→h3`, `h1→h4`) en 4-5 plantillas. Cambiar la etiqueta cambia el tamaño heredado de `webflow.css` salvo que la clase lo fije, así que **necesita `check:visual` con navegador visible** para no colar una regresión tipográfica en 34 páginas. Es incumplimiento de buena práctica (1.3.1), no de un criterio AA duro. |
| **M17** | Los CTA miden 28-40 px de alto: **cumplen** el mínimo AA de 24, quedan bajo la guía de 44. Subirlos mueve píxeles en las 107 rutas con contrato `rediseno` y obliga a re-aprobar sus referencias una a una. Es una decisión de diseño con coste, no un fallo. |
| **M19** | **Medido: no es explotable y el «arreglo» rompe el build.** `path-to-regexp` **no aparece en el código desplegado** (comprobado sobre `.vercel/output/functions`): es dependencia de construcción del adaptador, y los únicos patrones que procesa son los de nuestro propio `vercel.json`. El aviso propone **bajar** `@astrojs/vercel` de 11 a 8.0.4 — un retroceso mayor, no una actualización. Riesgo aceptado y documentado. |
| **M21 M24 M25 M26** | Cambian píxeles en rutas con contrato `rediseno`: exigen que un humano mire la ruta y apruebe la referencia (`aprobar-diseno.mjs … --si`). Se dejan preparados para una sesión de aprobación con Sebastian. |
| **M22** | «1 Views • 0 Likes • 0 Comments» sale de `youtube.json`, extraído del sitio vivo, y `check:texto` compara el `innerText` de `/videos` contra `baseline/text/`. Cambiarlo sin poder correr esa puerta —navegador visible— sería dar por bueno lo que no se ha medido. |
| **M23** | La paleta `oklch` muerta de `estimador.css` ya está **declarada como excepción** en `check:tokens`. Limpiarla es higiene sin efecto visible; se hace cuando alguien toque esa hoja, que es lo que su propia cabecera dice. |
| **M27** | El endpoint ya tiene Turnstile, honeypot, rate-limit por IP y validación de servidor. Un tope de longitud por campo es defensa en profundidad, no un agujero abierto. |

## Un hallazgo del propio proceso

| ID | Hallazgo |
|---|---|
| **M32** | **`check:carrusel` es inestable.** Dos pasadas seguidas sobre el MISMO build, sin tocar nada: la primera «ROJO — 2 fallo(s)», la segunda «OK». Mide tiempos de scroll y tareas largas, así que compite con cualquier otra cosa que use CPU. Una puerta que cambia de color sin que cambie el código no puede bloquear una entrega: o se estabiliza, o se declara informativa. |

## Verificación de que no hay regresión — medida, no supuesta

El cambio de la Ola 1 que más alcance tiene es el del pie: toca las **122 páginas**. Se midió la
altura del documento y del pie en 5 rutas × los 4 anchos de referencia, construyendo el estado
**anterior** en un worktree aparte y comparando:

```
  ruta@ancho          docAntes  docDesp   delta    pieAntes  pieDesp  delta
  /about@1920            7835     7835        0        705      705       0
  /@1920                10207    10207        0        705      705       0
  /gallery@1920         19378    19378        0        705      705       0
  /videos@1920           3999     3999        0        705      705       0
  /projects@1920         6951     6951        0        705      705       0
  ... 1440 y 991: delta 0 en las cinco rutas ...
  /about@479             9394     9474      +80       1565     1645     +80
  /@479                 10543    10623      +80       1565     1645     +80
```

**Delta 0 en 1920, 1440 y 991.** El truco de `padding` + `margin` negativo es pixel-neutro, como
se diseñó. El +80 de 479 es exactamente el hueco declarado para el botón flotante (M8), acotado
a `max-width: 767px`.

### M33 *(nuevo)* — `/about` tiene contrato `paridad` pero está rediseñada

`check:visual` sale **ROJA en `/about` a los 4 anchos**, y **no es de esta auditoría**: se corrió
la misma puerta sobre el commit anterior (`33baf7e`, worktree aislado) y da **exactamente los
mismos números**: −17 px a 1920, −29 px a 1440.

La causa es de catálogo: `/about` sigue en contrato `paridad` —se compara contra la captura del
Webflow original— pero las fases R9 y R13 la rediseñaron (el h1 que pisaba la foto, el contraste
del subtítulo). Una ruta rediseñada comparada contra el origen está roja por definición.

**Arreglo**: moverla a contrato `rediseno` en `disenio/contratos.json` con su motivo, mirarla y
aprobar la referencia (`node scripts/aprobar-diseno.mjs /about --si`). Eso exige que un humano la
mire, así que **queda para la sesión de aprobación con Sebastian**, no se decide aquí.
