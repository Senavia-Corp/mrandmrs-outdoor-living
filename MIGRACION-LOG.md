# Bitácora de migración — Mr & Mrs Outdoor Living

Webflow → Astro 5 + Sanity + Vercel. Una entrada por fase, **escrita al cerrar la fase**,
nunca al empezarla. Si una fase se reabre, se añade una entrada nueva; no se edita la vieja.

## Regla de la bitácora

Una entrada vale si un ingeniero que no estuvo aquí puede, solo con ella:
reproducir el resultado, saber qué se midió y con qué comando, y ver qué quedó abierto.
**Un número sin el comando que lo produjo no es un número, es una opinión.**

## Estado

| Fase | Título | Estado | Cerrada |
|---|---|---|---|
| F0 | Cuentas, identidades y repo | ✅ cerrada | 2026-08-27 |
| F1 | Baseline congelado | ✅ cerrada | 2026-08-27 |
| F2 | Assets locales | ↩️ reabierta ×3, cerrada | 2026-08-27 |
| F3 | Sanity: esquemas + import | ✅ cerrada | 2026-08-27 |
| F4 | Cascarón Astro | ✅ cerrada | 2026-08-27 |
| F5 | Páginas estáticas | ✅ cerrada | 2026-08-27 |
| F6 | Páginas de colección | ✅ cerrada | 2026-08-27 |
| F7 | Animaciones e interacciones | ✅ cerrada | 2026-08-27 |
| F8 | Formularios y terceros | 🟡 falta el correo del cliente | |
| F9 | Paridad SEO | ✅ cerrada | 2026-08-27 |
| F10 | Puertas de verificación | ⬜ pendiente | |
| F11 | Deploy y corte de dominio | ⬜ pendiente | |

Estados: ⬜ pendiente · 🟡 en curso · ✅ cerrada · 🔴 bloqueada · ↩️ reabierta

## Decisiones de alcance

Lo que se aparta del contrato de paridad, con quién lo decidió y qué arrastra. Va aquí arriba
y no enterrado en la entrada de una fase, porque cada una cambia lo que una puerta puede exigir.

### D1 · La Fase 7 tiene tres frentes de Finsweet, no uno   — Sebastian, 27-ago-2026 ✅
`PROMPT.md` solo apunta el filtrado de listas. Medido sobre el vivo, `@finsweet/attributes@2`
hace además el **marquee de logos** (`fs-marquee-logoscms_*`, 14 logos, en `/`, `/about` y
`/request-estimated`) y el **slider del blog** (`fs-slider-blog_*`). Los tres se reimplementan
en local. No es una mejora: es alcance que faltaba en el encargo.

### D2 · Los 3 widgets de Elfsight se rehacen NATIVOS y en local   — Sebastian, 27-ago-2026 ✅
Fuera `elfsightcdn.com/platform.js` y los 3 `<div class="elfsight-app-…">`. Se sustituyen por
componentes propios: **click-to-call**, **reseñas de Google** y **feed de Instagram**.

**Esto es una desviación deliberada de la paridad, y arrastra tres cosas:**

1. **Es CONTENIDO NUEVO frente al baseline.** Hoy los tres se quedan en altura 0 — medido en dos
   navegadores— así que el baseline los retrata como huecos. En cuanto se pinten de verdad, la
   home y `/contact-us` dejarán de casar. **`check:visual` necesita una excepción declarada por
   región, con su motivo, nunca bajar el umbral global.** Sin eso, la puerta se pone roja para
   siempre por algo que hicimos a propósito, y la primera reacción será relajar el umbral —que
   es exactamente como se pierde una puerta.
2. **`check:texto` es 100 % idéntico y NO admite excepción de umbral.** El texto nuevo de las
   reseñas y del feed hay que declararlo como bloque añadido, por ruta.
3. **Hacen falta datos.** Los **tres diseños ya están hechos** (27-ago-2026); lo que falta
   son los datos, y esa es la parte que Sebastian dejó **para el final**. Los componentes leen
   de `src/data/*.json`, que están **vacíos a propósito**: si no hay datos reales, el widget no
   pinta nada. Ni una reseña ni una publicación inventada — en un sitio de captación eso no es
   un marcador de posición, es un problema.
   - **Click-to-call: terminado y con datos.** No necesita integración. Y no es un número, son
     **DOS**: el sitio etiqueta `North Florida +1 (352) 740-3361` y `South Florida
     +1 (954) 913-7112` en `div.phone-wrapper` de `/contact-us`. Un botón que llamara solo al
     primero mandaría a la oficina equivocada a medio estado.
   - Reseñas de Google → **CID `13592496939047920063`** (dado por Sebastian, 27-ago-2026).
     Es el identificador de `maps.google.com/?cid=…`. Falta la integración.
   - **Instagram** → `@mrandmrsoutdoorliving` (sacado del pie del sitio). Mismo patrón:
     snapshot en build, sin token vivo en el navegador — un token de Instagram caduca y el feed
     se apaga solo un martes cualquiera. Las imágenes se sirven locales: las URLs del CDN de
     Instagram van firmadas y caducan en horas.

   «Todo en local» se interpreta así: **cero peticiones a terceros en el navegador del
   visitante**; el contenido se hornea en el build. Pendiente de los accesos del cliente. No
   bloquea las Fases 4, 5 ni 6.


---

## Plantilla de entrada (copiar tal cual)

```markdown
## Fase N — <título>            <!-- 🟡 en curso | ✅ cerrada | 🔴 bloqueada -->
**Fecha:** YYYY-MM-DD · **Commit:** `<sha>`

### Objetivo
Una línea. Qué tenía que quedar cierto al terminar.

### Qué se hizo
Viñetas cortas. Ficheros creados/tocados con ruta.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
|  |  |  |

### Evidencia
El comando y su salida REAL pegada. No parafrasear.
```bash
$ <comando>
<salida>
```

### Gate
**Criterio:** <la condición exacta que tenía que cumplirse>
**Resultado:** ✅ verde / 🔴 rojo — <por qué>

### Desviaciones
Qué se hizo distinto del plan y por qué. «Ninguna» es una respuesta válida.

### Rarezas del original replicadas a propósito
Lo que parece un error y NO se corrigió, porque el sitio de origen lo tiene así.

### Abierto
Lo que queda pendiente y de quién depende. «Nada» es una respuesta válida.
```

---

## Mejoras candidatas NO aplicadas

Todo lo que se detecte y se decida no tocar, porque la migración es a paridad.
Esta lista es el insumo de la conversación posterior con el cliente.

| # | Página / componente | Qué se ve | Por qué no se tocó |
|---|---|---|---|
| 1 | Galerías de `projects`, portadas de `brochures`, `logos`, pasos de `procesos` | **127 imágenes de contenido con `alt` vacío**. Verificado contra el sitio vivo: sirve `alt=""` en 37 de 45 `<img>` de una ficha de proyecto. | El origen no los tiene. Redactarlos es escribir contenido nuevo, no migrar. El manifiesto ya tiene el hueco marcado: es una pasada de una tarde cuando el cliente lo apruebe. |
| 2 | `commercials.csv` | Las cabeceras `Img Feature 2 / 3` y `SEO Metadata Image Feature 3 / 2` están **cruzadas** en el export. | Se emparejó por nombre (2→2, 3→3). Las páginas de `commercials` dan 404 en el sitio real, así que no se ve. Anotado por si algún día se publican. |
| 3 | `industry-solutions.html` | La URL del logo repite el id de sitio (`/68f185…/68f185…/`) y da **403**. | Es un defecto del HTML de Webflow. Se normaliza al descargar; la ruta simple da 200 y su sha256 coincide con el logo local. |
| 4 | export de Webflow | 6 ficheros con extensión `.avif` cuyo contenido es **WebP**. | Defecto del exportador. Se renombran a su formato real; servirlos como AVIF rompería la subida a Sanity. |
| 5 | Home, `/contact-us` y todas las páginas (widget flotante) | **Los 3 widgets de Elfsight no pintan nada.** Medido el 27-ago-2026 en dos navegadores distintos sobre el sitio vivo: los tres contenedores se quedan en **altura 0 y sin hijos** tras barrido completo y 6–8 s de espera. `platform.js` sí carga y la petición a `core.service.elfsight.com/p/boot/` sí se hace. Dos de ellos no son adorno: `ce5a93b9…` es **Google Reviews** y `fdd09947…` el **Instagram Feed** — una `<section class="social-media">` entera. El tercero es el click-to-call. | ↩️ **YA NO APLICA — decisión de Sebastian, 27-ago-2026: los tres se rehacen NATIVOS y en local.** Fuera Elfsight y su `platform.js`. Ver «Decisiones de alcance» abajo. |
| 6 | `/`, `/about`, `/request-estimated`, home | **Finsweet hace tres trabajos, no uno.** Además del filtrado de listas que apunta `PROMPT.md`: el **marquee de logos** (`fs-marquee-logoscms_*`, 14 logos) y el **slider del blog** (`fs-slider-blog_*`). | No es una mejora: es alcance que faltaba. Anotado aquí para que la Fase 7 no lo descubra tarde — `@finsweet/attributes@2` hay que reimplementarlo en tres frentes, no en uno. |

---

## Entradas

<!-- a partir de aquí, una entrada por fase, la más reciente arriba -->

## Fases 7 (2.ª parte) y 8 — componentes y formularios   🟡
**Fecha:** 2026-08-27

### Lo que se cerró de la Fase 7
| Componente | Estado | Medido |
|---|---|---|
| `w-lightbox` | ✅ | `<dialog>`, **137 imágenes en 1 grupo** en `/gallery`, abre en «1 / 137» y navega |
| Marquee de Finsweet | ✅ | 14 logos duplicados a **28**, `--mm-dur: 17s`, animación corriendo |
| Slider de Finsweet | ✅ | 10 diapositivas, `scrollWidth 11870 / clientW 1187`, las flechas desplazan |

La velocidad del marquee se calcula con el **ancho real** (60 px/s), no con un tiempo fijo: con
un tiempo fijo, más logos = más rápido.

Los tres degradan solos: sin JS, el lightbox es un enlace, el marquee una fila quieta y el
slider una lista con scroll. Ninguno esconde nada.

### Fase 8 — el endpoint, hecho y probado
`src/pages/api/formulario.ts`, con las cuatro capas en orden. Probadas una a una contra el
endpoint de verdad:

```
  ruta existe (GET)        -> 404          (solo POST)
  honeypot relleno         -> 200 {"ok":true}                    descarta en silencio
  time-trap 300ms          -> 200 {"ok":true}                    descarta en silencio
  formulario desconocido   -> 400 {"error":"formulario desconocido"}
  rate-limit inmediato     -> 429 {"error":"demasiado rapido"}
  valido SIN SMTP          -> 500 {"error":"el correo no esta configurado"}
```

**La última línea es la que importa.** Sin credenciales devuelve **500**, no un 200 mentiroso:
`ok` es true solo si el correo salió de verdad. En Pergola Plus el visitante veía «gracias»
pasara lo que pasara con su lead.

El honeypot se llama `ref_id` y no `company_url`: lo segundo lo autorellenan los gestores de
contraseñas y tira usuarios reales. El time-trap está a **<1000 ms**, no a 2500, que tiraba a
quien usa autofill.

### La clave de Turnstile YA EXISTÍA
No hay que crearla: los formularios del sitio vivo ya traen
`data-turnstile-sitekey="0x4AAAAAAAQTptj2So4dx43e"` — el cliente ya lo tenía configurado en
Webflow. **Falta solo la clave SECRETA**, que solo está en su panel de Cloudflare.

El widget se renderiza **explícitamente**, no por `class="cf-turnstile"`: el render implícito
falla sobre un elemento oculto. Y el script de Turnstile solo se carga en las páginas que de
verdad envían: un captcha «en todas por si acaso» da sensación de protección donde no hay envío.

### ⚠️ LA TRAMPA DE BUILD QUE HABRÍA MATADO EL FORMULARIO EN SILENCIO
Esta no está en el encargo y es peor que la que sí está.

Los secretos se leían con `import.meta.env.SMTP_USER`. **Vite sustituye eso en tiempo de
BUILD**, y como al construir no había esas variables, el empaquetador dedujo que
`if (!usuario || !clave)` era siempre cierto, **dio la rama del envío por muerta y la borró
entera del bundle**. Verificado leyendo el chunk construido: 3160 bytes, un `return 500` a
fuego y **cero menciones a nodemailer**.

Lo grave es que **poner las variables en Vercel después NO lo arregla**: el código de enviar ya
no existe en lo desplegado. El síntoma sería «configuré el correo y sigue sin enviar».

Arreglado leyendo de `process.env`, que se resuelve en EJECUCIÓN. Comprobado tras el cambio:
el chunk pasa a 4782 bytes con `createTransport`, `sendMail` y **nodemailer dentro de
`.vercel/output/functions/_render.func/node_modules/`**.

(La trampa que sí avisaba el encargo —el especificador del `import` en una variable— también
está respetada: `await import('nodemailer')` con literal.)

### Abierto — hace falta el cliente
- **`SMTP_USER` / `SMTP_PASS`**: Gmail App Password exige 2FA activa y debe ser **de la cuenta
  que autentica**. Destinatario por defecto `info@mrandmrsoutdoorliving.com`, el del propio sitio.
- **`TURNSTILE_SECRET`**: del panel de Cloudflare del cliente. Sin ella el endpoint **no valida**
  (deja pasar), no bloquea.
- **GATE 8 sigue sin cumplirse**: pide un correo **recibido de verdad** por cada formulario, y
  eso no se puede demostrar sin credenciales. El endpoint está probado en todo lo demás.
- Del inventario de la Fase 7 quedan: el **antes/después**, `w-tabs` (2 usos) y la paginación
  de `/blogs-tips`. Ninguno deja el sitio roto.

## Fase 7 — Animaciones e interacciones   ✅ cerrada
**Fecha:** 2026-08-27

### Objetivo
Que el sitio se comporte igual sin `webflow.js`: entradas por scroll, nav que se esconde,
desplegables, menú móvil y el play/pausa de los vídeos de fondo.

### EL FALLO GRANDE, y no lo cazaba ninguna puerta anterior
**El HTML servido trae `style="opacity:0"` EN LÍNEA en 270 elementos de 35 páginas.** Es el
anti-FOUC de Webflow: «mantén esto invisible hasta que arranque la interacción». Sin
`webflow.js` no arranca nadie y **se quedan invisibles para siempre**. Es literalmente lo que
ya pasó una vez en AMS.

`check:texto` NO puede cazarlo: `innerText` incluye lo que está a `opacity: 0`, así que las 115
páginas salían **verdes** con secciones enteras invisibles. Lo cazó una sonda en el navegador,
y ahora lo caza `check:ix2`.

Un `style` en línea gana además a cualquier regla de autor, así que también habría roto el
revelado propio. Se retira en el generador, en las páginas y en el cascarón.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| `[data-w-id]` en `opacity:0`, 11 páginas × 4 anchos | 0 | **0** |
| `transform` residual en reposo | 0 | **0** |
| Barra de scroll horizontal a 991 y 479 | 0 | **0** |
| Elementos con entrada por scroll | — | **79** (68 growIn · 8 slideInLeft · 8 slideInRight · 9 slideInBottom) |
| Entradas solo en `main` (>=992) | — | **18** |
| Entradas solo en móvil/tablet | — | **14** |

```
$ npm run check:ix2
── 1920px / 1440px / 991px / 479px
  ok 11 paginas: 0 [data-w-id] en opacity:0 · ok 0 transform residual en reposo
  ok 0 barra de scroll horizontal · ok el sello data-anim · ok el nav vuelve tras subir
── interaccion
  ok 1920: el desplegable abre y cierra
  ok  479: el menu movil abre, se ve y cierra
PUERTA VERDE
```

### Las trampas del encargo, respetadas y comprobadas
- **El sello lo escribe el JS, y se escribe DESPUÉS de construir el observer**, todo en un
  `try/catch` que lo retira si algo falla. Si el script no corre, el selector no casa y **se ve
  todo** — que es el comportamiento correcto.
- **`backwards`, nunca `both`.** Medido tras el cambio: **0 transform residual**. Con `both`,
  el `forwards` que lleva dentro deja `matrix(1,0,0,1,0,0)` en vez de `none`, y un transform
  distinto de `none` crea contexto de apilamiento para descendientes `fixed`/`absolute`.
- **`animation`, no `transition`**, para las entradas.
- **El deslizamiento lateral solo donde el origen lo tiene.** 18 entradas corren solo en `main`
  y 14 solo en móvil/tablet; el reparto sale de `ix2-targets.csv`, no de la memoria.
  `check:ix2` confirma 0 barra horizontal a 479.
- **`prefers-reduced-motion` y `@media print` sin `!important`**, repitiendo la misma cadena de
  selectores para ganar por orden. Un reset global de `animation: none` no basta: comprime la
  duración pero no restablece `opacity` ni `transform`.

### Tres cosas que salieron de medir, no de suponer
1. **`rootMargin` negativo deja elementos fuera para siempre.** Con `-10%` por abajo, los
   bloques que viven en el último 10 % del viewport cuando el scroll ya no da más —tres del pie
   de la home— **no llegan a disparar nunca**. A cero.
2. **El menú móvil se reimplementa CON el mecanismo de Webflow, no contra él.** Su CSS ya trae
   `[data-nav-menu-open] { display:block!important; ... }`; lo que hacía `webflow.js` era mover
   el menú al overlay y ponerle ese atributo. Haciéndolo igual, el menú conserva los estilos
   del diseñador en vez de unos inventados.
3. **Ponerle fondo blanco al panel lo dejaba vacío.** El menú móvil del sitio lleva el texto en
   blanco sobre `--blue_dark`. El panel pintaba y no se veía nada dentro. El fondo lo pone el
   CSS del diseñador; yo solo posiciono.

Y el overlay necesita `z-index` alto: con 9 quedaba **detrás del contenido** aunque su caja
estuviera en su sitio, porque varias secciones crean su propio contexto de apilamiento.

### Abierto — lo que la Fase 7 NO cubre todavía
Está medido y acotado, no olvidado:
- **`w-lightbox`** — `/gallery` tiene 137 referencias. Hoy los enlaces no abren visor.
- **Finsweet, los tres frentes** (D1): el **filtrado** de listas, el **marquee** de logos y el
  **slider** del blog. El marquee no se mueve y el slider no desliza.
- **El antes/después** de `@flowbase-co/boosters-before-after-slider`.
- `w-tabs` (2 usos, 8 paneles) y `w-pagination` (1, en `/blogs-tips`).

Ninguna deja el sitio roto ni invisible: son componentes que se muestran estáticos en su primer
estado. `check:ix2` sigue verde porque lo que mide —invisibles, transform residual, scroll
horizontal— sigue en cero.

## Fases 6 y 9 — las 101 de colección y la paridad SEO   ✅ cerradas
**Fecha:** 2026-08-27

### Objetivo
Que respondan las 115 rutas y **ninguna más**, y que el `<head>` de todas sea el del origen.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Rutas construidas | 115 | **115 / 115** |
| Rutas de más | 0 | **0** |
| Referencias a Webflow / Elfsight en lo desplegado | 0 | **0** |
| `<head>` idéntico al origen | 115 | **115 / 115** |
| URLs en el sitemap | 113 | **113** |

```
$ npm run check:rutas
  ok 115/115 rutas del sitio construidas · ok 115 paginas en el build, 0 de mas
  ok el estimador se sirve · ok 0 referencias a Webflow / Elfsight
PUERTA VERDE

$ npm run check:seo                        # preview
  115/115 paginas con el head identico al origen   -> PUERTA VERDE
$ PUBLIC_ES_PRODUCCION=1 npm run check:seo # produccion
  115/115 paginas con el head identico al origen   -> PUERTA VERDE
```

### La decisión de fondo de la Fase 6, y hay que leerla
Las 101 páginas de colección se generan **desde el HTML servido de cada una**, igual que las
estáticas — **no desde Sanity**. Es la misma ruta de código, así que no hay una segunda
implementación que pueda divergir, y la paridad queda demostrada página a página.

**Consecuencia, dicha claramente: hoy el CMS no pinta nada.** Los 511 documentos están
importados y verificados en Sanity (Fase 3), pero las plantillas todavía no leen de ahí, así
que editar en Sanity no cambia el sitio. Es un trabajo acotado —7 plantillas— y la paridad
medida es la red de seguridad para hacerlo: cuando cada plantilla lea de Sanity,
`check:texto` dirá al instante si algo dejó de cuadrar. **Se hizo en este orden a propósito:
primero un sitio idéntico y desplegable, después la fuente de datos.**

### Cuatro trampas más, todas medidas
1. **`text/x-wf-template` va URL-CODIFICADO.** Webflow guarda ahí la plantilla de lista vacía,
   y dentro había 20 URLs del CDN que ningún patrón literal casaba. Hay que decodificar,
   reescribir y volver a codificar.
2. **El paréntesis, otra vez.** Tres `og:image` se truncaban en `...florida%2520(1` porque la
   regex paraba en `)`. Mismo bug que en el inventario, otra regex.
3. **El id de sitio duplicado.** El JSON-LD de `/industry-solutions` trae la URL del logo con
   el id repetido —el defecto del origen que ya anotó la Fase 2— así que no casaba con el
   manifiesto hasta normalizarla igual que hace el inventario.
4. **`og:image` se había quedado RELATIVA** al pasar las URLs a local. Los rastreadores
   sociales no resuelven rutas relativas: se absolutizan contra `Astro.site`.

### La canónica: adición deliberada, no paridad
El sitio vivo **no tiene ni una canónica en las 115**. La Fase 9 del encargo las pide, así que
son una adición consciente. `check:seo` no las compara contra el baseline —daría rojo en las
115 por algo que hicimos a propósito—: exige que existan **solo en producción** y que apunten
a su propia página.

### El interruptor de indexación falla CERRADO
Solo se indexa con `PUBLIC_ES_PRODUCCION` **exactamente igual a `"1"`**. Cualquier otro valor
deja el sitio bloqueado. Gobierna las cuatro cosas a la vez: `robots.txt`, el `sitemap.xml`,
el `<meta noindex>` y la canónica. Probado en los dos modos.

El estimador también, y no era gratis: lo sirve `public/`, no pasa por `Base.astro`, y sin
tocarlo habría sido **la única de las 115 indexable desde una preview**.

No se usa `X-Robots-Tag` en `vercel.json`: es estático, no lee la variable, y o lo hereda
producción o hay que acordarse de quitarlo justo en el despliegue que más caro sale olvidar.

### El sitemap lleva 113, no 115
Las mismas que el original. `/pool-investment-estimator` y
`/where-we-serves/custom-pool-builders-north-florida` responden 200 pero el sitemap del origen
no las lista. Se replica: meterlas sería cambiar lo que el sitio le dice a Google.

### El fixture del cascarón ya no puede colarse
`src/pages/cascaron.astro` era una ruta que el origen no tiene y que `check:rutas` iba a cazar.
Pasó a ser una ruta **dinámica** cuyo `getStaticPaths` devuelve lista vacía salvo con
`MM_FIXTURES=1`. Confiar en acordarse de borrar un fichero no es un plan.

### Abierto
- **Las 7 plantillas no leen de Sanity.** Es lo que queda para que el CMS sirva de algo.
- Los 8 bloques de JSON-LD rotos del origen se emiten **crudos, byte a byte** (el contrato dice
  replicar, no arreglar). Siguen siendo mejora candidata.

## Fase 5 — Páginas estáticas (14)   ✅ cerrada
**Fecha:** 2026-08-27

### Objetivo
Las 13 estáticas más `/pool-investment-estimator`, con el texto **idéntico carácter a carácter**
al del sitio vivo y **cero referencias a Webflow**.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Páginas con texto 100 % idéntico | 14 | **14 / 14** |
| Referencias a `website-files.com` en el build | 0 | **0** |
| Referencias a `elfsightcdn` / `wf-app-prod` | 0 | **0** |
| Referencias a jQuery / cloudfront | 0 | **0** |

```
$ npm run check:texto
  ok / · ok /about · ok /blogs-tips · ok /brochures · ok /contact-us · ok /gallery
  ok /industry-solutions · ok /pool-cost-estimator · ok /projects · ok /request-estimated
  ok /testimonials · ok /videos · ok /where-we-serve · ok /pool-investment-estimator
  14 identicas · 0 con diferencias · 101 aun sin construir
PUERTA VERDE

$ grep -ro "website-files.com|wf-app-prod|elfsightcdn" .vercel/output/static | wc -l
0
```

### EL HALLAZGO GORDO: hay un CUARTO widget de Elfsight, y ese SÍ pinta
`PROMPT.md` conocía uno (el click-to-call). Hay **cuatro**:

| id | qué es | en cuántas páginas | ¿pinta? |
|---|---|---|---|
| `e4536a7a…` | Click to Call | 114 | no |
| `ce5a93b9…` | Google Reviews | 83 | no |
| `fdd09947…` | Instagram Feed | 79 | no |
| **`2dd65b70…`** | **YouTube Gallery** | 1 (`/videos`) | **SÍ — 45 kB de contenido real** |

Lo destapó `check:texto`: `/videos` perdía **114 líneas**. La galería trae la cabecera del
canal y 8 vídeos con título, fecha, duración, descripción completa y contadores.

**No hizo falta ninguna clave de API**: los datos se sacan de `baseline/html/videos.html`, que
es el DOM del sitio vivo DESPUÉS de que el widget pintara. Son datos reales del canal del
cliente, capturados de su propio sitio. `scripts/extract-youtube.mjs` los extrae y baja las 9
miniaturas a local (`i.ytimg.com` es un tercero).

### Rarezas del original replicadas a propósito
- **`/brochures` no tiene pie.** Es la única de las 115 con cascarón que se acaba sin él.
  Ponerle uno sería añadir una sección: `Base.astro` tiene `conPie`.
- **`/gallery` lleva su `section.hero-section` ANTES del nav** en el documento. El nav es
  `fixed`, así que no cambia lo que se ve — pero sí el ORDEN del `innerText`, y `check:texto`
  compara línea a línea. Una sola página de las 115; el layout tiene un slot `antes-nav`.
- **2 páginas llevan `<script>`+`<style>` DESPUÉS del pie** (el redimensionador del iframe del
  estimador). Slot `tras-pie`.
- Los títulos de los vídeos llevan `text-transform: none`: el CSS del sitio capitaliza los
  encabezados y convertía `for Hotel & Resort` en `For Hotel & Resort`. Eso no es estilo, es
  **cambiar el texto**, y `check:texto` lo caza.

### Diferencias de texto DECLARADAS (D2)
Dos líneas del baseline desaparecen a propósito, y están declaradas una a una en
`check-texto.mjs`. Las dos son chrome del propio Elfsight, no contenido del cliente:
`12` (su paginación) y `Free YouTube Video Gallery Widget` (su marca).

El botón de suscribirse de la galería **no lleva texto visible a propósito**: en el original es
un iframe de YouTube y su texto no entra en el `innerText` del documento. Poner «Subscribe»
añadía una línea que el origen no tiene. Va accesible por `aria-label`.

### Cuatro sitios donde vivían URLs del CDN que nadie miraba
Cada uno salió de medir, no de suponer, y cada uno habría dejado el sitio pidiéndole cosas a
Webflow después del corte:
1. `href` — los botones de descarga de los **54 PDF**. No son imágenes, así que ningún escaneo
   de `src`/`srcset` los veía.
2. Dentro de `<script>` — el JSON-LD de `/gallery` lleva **137** URLs de imagen.
3. `data-poster-url` — los pósters de los vídeos de fondo de la home.
4. El **iframe absoluto** del estimador: apuntaba a `https://mrandmrsoutdoorliving.com/...`, o
   sea que **cualquier preview habría cargado el sitio VIEJO dentro del nuevo** — y
   `check:visual` habría estado comparando el original consigo mismo. Ahora es relativo.

### El estimador, portado
`scripts/build-estimador.mjs` copia los 3 JS + 1 CSS + el cascarón a
`public/pool-investment-estimator/`, con las URLs del origen `cosmic` y del CDN a local.
Funciona sin Webflow porque el bundle **no hace ni una llamada de red**.

### Abierto
- El estimador es **código minificado sin fuentes**: funciona, pero cambiar una fórmula o un
  precio exigiría rehacerlo.
- Su CSS trae **2 `@import` a Google Fonts** sin auto-alojar.
- Cuando el cliente suba un vídeo nuevo, `npm run youtube` hay que volver a correrlo — y eso
  solo funciona mientras el sitio viejo siga en pie. Después, integración con la API de YouTube.
- **Borrar `cascaron.astro` y `vista-widgets.astro` antes de cerrar la Fase 6.**

## Fase 4 — Cascarón Astro   ✅ cerrada
**Fecha:** 2026-08-27

### Objetivo
Que el nav y el pie del build sean **los mismos** que los del sitio vivo, en los 4 anchos.

### Qué se hizo
- `astro.config.mjs` — estático + adaptador de Vercel. **Astro 7, no 5**: `@astrojs/vercel@11`
  pide `^7`, y es lo que corre en Pergola Plus y AB Aluminum. No cambia el contrato de salida.
- `scripts/build-css.mjs` → `src/styles/webflow.css`, derivado del CSS **del vivo**.
- `scripts/fetch-fuentes.mjs` → `public/fonts/` + `src/styles/fuentes.css`.
- `scripts/build-shell.mjs` → `src/components/{Nav,Footer}.astro` (40 kB de marcado; no se copia a mano).
- `scripts/capture-cascaron.mjs` → `baseline/cascaron.json`, la referencia congelada.
- `scripts/check-cascaron.mjs` — la puerta.
- `src/layouts/Base.astro` — nav + contenido + pie + botón de llamada.

### Números medidos
| Métrica | Medido |
|---|---|
| Elementos del nav comparados, por ancho | **303** |
| Elementos del pie comparados, por ancho | **180** |
| Elementos desviados (tol 0,6 px), 4 anchos | **0** |
| Texto del nav y del pie | **idéntico** |
| Banda del nav en píxeles | **99,90–100,00 %** |
| Variables en `:root` | 82 (84 − 2 corruptas resueltas) |
| `url()` del CDN en el CSS | **0** |
| Peso de las fuentes auto-alojadas | 348 kB, 6 woff2 |

### El hallazgo que cambió la puerta
El encargo pedía «`check:visual` del nav y el pie **≥99 %** contra el baseline». **Esa métrica
no sirve para el nav, y se puede demostrar:** con la tolerancia que hace que contenido
IDÉNTICO llegue al 99 % tras el reescalado, un nav con un enlace movido **6 px** daba
**99,33 %** y pasaba igual. No es un umbral mal elegido: la banda del nav es casi toda blanca,
así que mover un enlace toca el 0,7 % de los píxeles.

```
  tolerancia   IGUALES(vivo vs build)   ROTO(build vs build+6px)
  0.1           97.72 %                  98.81 %
  0.2           99.71 %                  99.33 %      <- el roto pasa el 99 %
  0.3          100.00 %                  99.66 %      <- el roto pasa el 99 %
```

Así que la puerta compara **la caja de cada elemento**, relativa a la sección, más el texto.
Los píxeles se quedan como señal secundaria —cazan un color o una imagen que no carga, que la
geometría no ve— con la tolerancia calibrada a 0.3, que es la medida que hace que contenido
idéntico dé 100 % después de bajar a 1/4.

### El otro hallazgo: @fontsource no vale
El encargo dice de auto-alojar con `@fontsource-variable`. Se hizo, y el nav salía al
**95,85 %**. Medido elemento a elemento: la caja del nav coincidía al píxel y el logo también,
pero **un `a.nav-link` medía 57,35 px en el build y 59,54 px en el vivo**. Misma familia, mismo
tamaño, mismo peso, métricas distintas: el Inter variable de fontsource no es el Inter que
sirve Google hoy. Con cada enlace 2 px más estrecho, ninguna comparación iba a llegar al 99 %
en 115 páginas.

Se bajan los **.woff2 exactos** que pide el sitio, con la misma cadena de familias de su
WebFont Loader. Tras el cambio: **0 de 60 elementos del nav desviados**.

**Playfair Display no se migra.** El loader del origen carga sus 5 pesos, pero no la usa nadie:
0 `font-family` con Playfair en el CSS del vivo y en las 115 páginas del baseline. Cero
píxeles afectados. Anotado como desviación medida, no como olvido.

### Evidencia
```
$ npm run check:cascaron
── 1920px
  ✅ menu: 303 elementos · ✅ geometría 0 desviados (tol 0.6px) · ✅ texto idéntico
  ✅ footer: 180 elementos · ✅ geometría 0 desviados · ✅ texto idéntico
  ✅ nav: píxeles (señal secundaria) — 100.00 %
  … 1440, 991 y 479 igual
✅ PUERTA VERDE

$ # probada en rojo: .menu{height:92px} y .footer-link{padding-left:7px}
  🔴 menu: geometría — 27 elementos desviados
       #0 div.navbar: h 85->92     #1 a.navbar-logo: y 10->13.5
  🔴 footer: geometría — 152 elementos desviados
       #19 div.footer-block: w 134.1->141.1
```

### Rarezas del original replicadas a propósito
- **`w-nav-overlay` se hornea.** `webflow.js` inyecta ese div vacío como último hijo de
  `.navbar.w-nav` y ahí mueve el menú al abrirlo en móvil. Sin él, el cascarón tenía 302
  elementos donde el vivo tiene 303, en los 4 anchos. Se hornea igual que lo inyectaba
  Webflow; abrir y cerrar es de la Fase 7.
- **El bloque `<style>` anti-FOUC del origen NO se copia.** Dice
  `html.w-mod-js:not(.w-mod-ix) [data-w-id]{opacity:0}`, o sea «invisible hasta que arranque
  IX2». Sin `webflow.js` nadie pone `w-mod-ix` y esos elementos se quedarían invisibles PARA
  SIEMPRE. Es literalmente lo que pasó una vez en AMS. Lo sustituye el sello de la Fase 7.
- Sí se conserva el script en línea que pone `w-mod-js`/`w-mod-touch`: hay CSS que depende.

### Abierto
- **Borrar `src/pages/cascaron.astro` y `src/pages/vista-widgets.astro` antes de la Fase 6.**
  Son rutas que el origen no tiene; `check:rutas` las cazará.
- El adaptador de Vercel emite `ruta/index.html` aunque `build.format` sea `'file'`. Hay que
  decidir en la Fase 9/11 cómo queda la URL final (el encargo pide sin barra).

## Fase 2 (reabierta, 3.ª vez) — el inventario se construía desde el export, y el export está desfasado   ✅ cerrada
**Fecha:** 2026-08-27 · Destapado por el extractor del cascarón, que abortó.

### Por qué se reabre
El extractor del nav falló: **25 de las 27 imágenes del nav del vivo no estaban en el
manifiesto**. Medido sobre las 115 páginas: de las **1183** URLs del CDN que piden, solo
**39** estaban. La causa de fondo es la misma de las dos reaperturas anteriores — **el
inventario se construía desde el export, y el contrato dice que manda el vivo**.

Medidas las 1144 que faltaban, una a una:

| | |
|---|---|
| Mismo contenido, URL re-hasheada por Webflow | **689** — solo faltaba el mapeo |
| Variantes responsive `-p-500/800/1080` del `srcset` | **440** |
| Imágenes de contenido genuinamente nuevas | **0** |

**El export no ha perdido contenido: lo que se desfasó son las URLs.**

### Dos bugs míos que salieron por el camino
1. **La regex de URLs paraba en `)`.** En HTML el delimitador es la comilla, no el paréntesis:
   `…_Adobe Express - file (1).png` se truncaba en `…file%20(1`. Eso dejó 12 assets sin
   extensión y **explica los «15 assets que el CDN ya no sirve» que reporté antes: eran URLs
   rotas por mí, no assets muertos.** Con la URL correcta bajan sin problema.
2. **Tampoco paraba en la coma**, y `data-video-urls` lleva el mp4 y el webm separados por
   coma: los 3 vídeos de fondo se pedían como una URL con dos pegadas y daban 403.

Corregidos los dos: **0 fallos de descarga y 0 assets perdidos.**

### Y una fragilidad de fondo, arreglada
El ganador de cada `sha256` lo decidía **el orden de llegada de la red con concurrencia 8**.
Al añadir URLs nuevas cuyo contenido ya estaba en disco, una podía ganar y **llevarse el
fichero a otra carpeta**, moviendo rutas que ya referencian el CSS derivado y las páginas.
Ahora `porSha` se siembra desde el manifiesto previo: lo colocado se queda donde está.
Medido tras el cambio: **0 rutas movidas, 0 sha cambiados** sobre 844 entradas previas.

### Números medidos
| Métrica | Antes | Ahora |
|---|---|---|
| Assets únicos | 670 | **1826** |
| Referencias | 844 | **2000** |
| Ficheros en disco | 794 | **1238** |
| Fallos de descarga | 0 | **0** |
| Assets de cromo versionados | 229 | **792** (+48 MB) |
| Rutas movidas de sitio | — | **0** |

### Abierto
- Los 48 MB de variantes responsive van a git porque las páginas las piden por ruta local y
  son los bytes exactos del origen: reencodearlas sería cambiar píxeles.

## Fase 2 (reabierta, 2.ª vez) — nadie escaneaba los `url()` del CSS   ✅ cerrada
**Fecha:** 2026-08-27 · Destapado al empezar la Fase 4.

### Por qué se reabre
`PROMPT.md` avisa literalmente: «ninguna puerta escanea los `url()` del CSS → ahí puede quedar
un 404 invisible». Y así era. No se veía porque **el CSS del export usa rutas relativas**
(`url('../images/…')`, 0 `url(https://)`), mientras que **el CSS que sirve el vivo —el que
produjo el baseline— apunta al CDN en 13 sitios.**

De esos 13 faltaban 3 en el manifiesto. Dos (`Design3.webp`, `check-icon-black.png`) ya estaban
en disco por el export y solo les faltaba el mapeo. El tercero **no estaba en ningún sitio**:
`custom-checkbox-checkmark.589d534424.svg`, la palomita de todos los `w-checkbox` del sitio,
servida desde **`d3e54v103j8qbb.cloudfront.net`** — el host de assets de plataforma de Webflow,
que ni siquiera casaba el patrón de URL del inventario.

Es el mismo defecto que la primera reapertura y con un origen distinto: van tres sitios donde
vivían referencias que nadie miraba (CSS del estimador, CSS del sitio, host de plataforma).

### Qué se hizo
- `scripts/build-inventory.mjs` — escanea `_source/webflow-css/*.css` y el patrón de host se
  ensancha a `d3e54v103j8qbb.cloudfront.net`.
- `_source/webflow-css/outdoorliving-shared.efeeddf43.min.css` — **el CSS del vivo, congelado**.
  Es el que produjo el baseline; el del export no sirve para eso (ver más abajo).
- `scripts/download-assets.mjs` — `destino()` trata `css:` como cromo, igual que `html:`.
- `scripts/check-assets.mjs` — **check 10 nuevo**.

### El fallo que la puerta dejó pasar en VERDE
Al añadir el prefijo `css:` a los `usos`, `destino()` lo tomó por uso de colección y mandó
**11 assets a `public/images/css:outdoorliving-shared/sin-slug/`**. Los 9 checks salieron
**verdes**: todos comparan coherencia CONTRA EL MANIFIESTO, y un destino absurdo es
perfectamente coherente consigo mismo. Lo único que lo delató fue el contador de cromo bajando
de 226 a 208 — un número, no un check.

De ahí el **check 10**: los destinos se comparan contra las colecciones que existen de verdad
(los CSV de `_source/cms`). Probado en los dos sentidos.

### Números medidos
| Métrica | Antes | Ahora |
|---|---|---|
| Assets únicos | 667 | **670** (+3) |
| Referencias | 841 | **844** |
| Ficheros en disco | 793 | **794** (+1 real: la palomita) |
| Assets de cromo versionados | 226 | **229** |
| Checks de la puerta | 9 | **10** |

```
$ node scripts/check-assets.mjs
── 8. cobertura del inventario   ✅ 670/670 remotos — faltan 0
── 9. acoplamiento git ↔ despliegue ✅ 229 assets de cromo, todos versionados
── 10. cada destino es una carpeta que existe de verdad
  ✅ 17 destinos válidos (site + 16 colecciones) — 0 inventados
✅ PUERTA VERDE

$ # probado en rojo: un destino inventado en el manifiesto
── 10.  🔴 17 destinos válidos — 1 inventados: inventada
🔴 PUERTA ROJA — 1 fallo(s)
```

### Hallazgo para la Fase 4: el CSS del export NO es el del vivo
- El del vivo (`…shared.efeeddf43.min.css`, 172 kB) **es normalize + webflow + sitio fundidos**,
  y apunta al CDN.
- El del export son 3 ficheros (178 + 40 + 8 kB) con rutas relativas.
- **Manda el del vivo**: es el que produjo las 460 capturas contra las que mide `check:visual`.
  Partir del export sería perseguir deriva de píxeles durante días.

### Abierto
- Las **2 variables con el nombre corrupto** (`--_apps---colors--background\<deleted|variable-…\>`
  y su gemela de `card`) siguen en el `:root` del vivo. Las dos resuelven a `var(--white)` y hay
  además una versión limpia de cada una. La Fase 4 las sustituye por su valor resuelto.

## Fase 1 — Baseline congelado   ✅ cerrada
**Fecha:** 2026-08-27 · **Commit:** `F1: baseline congelado…`

### Objetivo
Que exista, en disco **y en git**, la prueba reproducible de cómo es el sitio HOY: 115 HTML
renderizados, 115 textos, 115 entradas de SEO, 460 capturas en 4 anchos, `robots.txt` y
`sitemap.xml`, y **cero elementos con `data-w-id` en `opacity:0`** al capturar.

Sin esto, `check:texto`, `check:seo` y `check:visual` son checks que no pueden fallar — el
fallo exacto de `comprobar-imagenes.mjs` en Pergola Plus. Y la ventana se cierra: solo se puede
capturar mientras Webflow sirva el sitio.

### Qué se hizo
- `scripts/lib/captura.mjs` — **el congelado, en un solo sitio.** Lo importan la captura y lo
  importará `check:visual`. Módulo compartido a propósito: la comparación de píxeles solo
  significa algo si las dos capturas se toman con la misma receta, y dos copias dejan de ser
  iguales al primer arreglo que solo se aplica en un lado.
- `scripts/capture-baseline.mjs` — la captura. Reanudable, con volcado en cada ruta.
- `scripts/check-baseline.mjs` — la puerta, 8 checks.
- `.gitignore` — **`baseline/shots/` sale de la lista de ignorados**, con el motivo al lado.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| HTML renderizados (post-JS) | 115 | **115** |
| Textos normalizados | 115 | **115** |
| Entradas de `seo.json` | 115 | **115** |
| Capturas (115 × 4 anchos) | 460 | **460** |
| Mediciones abortadas | 0 | **0** |
| Errores de carga | 0 | **0** |
| `[data-w-id]` visibles en `opacity:0` | 0 | **0** |
| Determinismo, píxeles iguales al recapturar | ≥99,5 % | **100,000 %** en los 3 arquetipos |
| Determinismo, HTML normalizado y texto | idéntico | **sha256 idéntico** |
| Peso en git | — | **71 MB** (53 capturas · 17 HTML · 1 texto) |
| Página más alta | — | `/gallery`, **39 473 px** a 479 |

### El baseline tiene que ser DETERMINISTA o no vale
Si la captura no se reproduce, un umbral de «≥99 % de píxeles» no mide la migración: mide el
ruido de la captura. **Cinco fuentes de no-determinismo, todas medidas sobre el vivo**, y su
neutralización vive en el módulo compartido:

| Fuente | Qué se midió | Neutralización |
|---|---|---|
| Barrido demasiado rápido | Con un viewport por rAF, 2 de los 25 `data-w-id` de la home se quedaban en `opacity:0`. IX2 pide que el elemento esté en pantalla un momento, no que lo cruces | 2 pasadas a medio viewport con 100 ms de reposo |
| El nav se esconde al bajar | `.menu` es `position:fixed` de **85 px** (justo lo que dice `a-11`: `translateY(-85px)`). Capturar al llegar abajo = las 115 páginas sin nav | volver arriba y esperar 900 ms a que `a-12` lo devuelva |
| Vídeos en `autoplay loop` | uno estaba en `t = 1,998 s` | `pause()` + `currentTime = 0` |
| El marquee de Finsweet | `animation-name:none` pero `transform:matrix(1,0,0,1,-102.88,0)` → **lo mueve JS**, así que `animations:'disabled'` de Playwright NO lo toca | `transform:none !important`, que gana al style en línea |
| Widgets de Elfsight | contenido remoto que cambia solo | `mask` de Playwright, declarada con su motivo |

Y **cinco cosas más que cambian solo en el DOM serializado**, no en lo que se ve. Se
normalizan una a una en `normalizarHtml()`; un «ignora el HTML» global habría convertido el
check de determinismo en un check que no comprueba:

1. El **WebFont Loader** de Google añade una clase por variante al `<html>`; el conjunto es
   siempre el mismo y el **orden** depende de qué fuente gane la carrera → se ordenan.
2. **Finsweet cachebustea su propio script** con la hora en ms (`fs-components.js?v=…`).
3. **Finsweet genera un id aleatorio** para el clon con el que mide el marquee.
4. El **transform en línea del marquee**: el congelado le gana por `!important` (por eso los
   píxeles salen idénticos) pero el valor sigue llegando al `outerHTML`.
5. **GTM inyecta A VECES** un `<script async>` de health-check de GA (`gtg_health=1`) y a veces
   no. Se vio midiendo /about 5 veces: dos estados estables, 137 080 y 136 951 bytes, y la
   única diferencia entre ellos eran esas dos etiquetas.

Con las diez puestas: **5 de 5 pases dan el mismo sha256.**

### Evidencia
```
$ npm run baseline
  nuevas: 456 · abortadas: 0 · invisibles: 0 · errores: 0

$ npm run check:baseline
── 1. están las 115 de cada cosa
  ✅ el informe cubre 115 rutas x 4 anchos · ✅ 115/115 HTML · ✅ 115/115 textos
  ✅ 115/115 entradas de SEO · ✅ robots.txt · ✅ sitemap.xml
── 2. las 460 capturas existen y SON un JPEG del ancho esperado
  ✅ 460/460 capturas — 0 mal
  ✅ muestra de 28 decodifica al ancho correcto — 0 mal
── 3. ninguna medición abortada por la sonda de foco
  ✅ mediciones abortadas — 0        ✅ errores de carga — 0
── 4. ningún [data-w-id] visible se quedó en opacity:0
  ✅ elementos invisibles — 0
── 5. el SEO capturado tiene sentido
  ✅ 115/115 con <title>
  ✅ JSON-LD roto: exactamente las 8 del origen — 0 nuevas · 0 que ya no lo están
  ✅ el origen sigue sin canónicas (0 esperadas)
── 6. ningún texto vacío ni absurdamente corto
  ✅ textos sospechosamente cortos — 0
── 7. determinismo: recapturar da lo mismo
     /                                                    100.000 % de píxeles iguales
     /about                                               100.000 % de píxeles iguales
     /services/custom-deck-builders-in-north-south-florid 100.000 % de píxeles iguales
  ✅ 3 arquetipos reproducen — 0 desvíos
── 8. el baseline está en git, no solo en este disco
  ✅ 695/695 ficheros del baseline versionados — 0 fuera de git
✅ PUERTA VERDE
```

### La puerta, probada en ROJO
Siete roturas a propósito. **Tres encontraron un fallo en la propia puerta**, que es justo para
lo que sirve hacerlas:

| # | Rotura | Resultado |
|---|---|---|
| A | Borrar `shots/1920/gallery.jpg` | 🔴 check 2 — `458/460 · 1920 /gallery — no existe` |
| B | Escribir un `.jpg` que contiene HTML (el fallo del 403 guardado como `.webp` de la Fase 2) | 🔴 check 2 — `479 / — no es JPEG`. **Y destapó que la puerta REVENTABA** con una excepción de sharp en vez de reportar: una puerta que se cae no te dice el resto de fallos. Ahora va en `try/catch` |
| C | Truncar `text/about.txt` a 40 caracteres | 🔴 check 6 — `/about — 40 caracteres` |
| D | `git rm --cached baseline/seo.json` | 🔴 check 8 — `693/694 · 1 fuera de git` |
| E | Volver al barrido rápido de un viewport por rAF | 🔴 check 4 — **143 elementos invisibles en 22 rutas**, no los 2 de la home |
| F | Robarle el foco a la pestaña | **NO SE PUDO ROMPER** — ver abajo |
| G | Una ruta que da 404 | 🔴 check 3 — `1920 /ruta-que-no-existe 404` |

Además, el **check 7 estuvo en rojo de verdad tres veces** durante el desarrollo, y es lo que
destapó las 5 fuentes de no-determinismo del DOM.

#### La rotura E es el motivo de existir de esta fase
Con el barrido ingenuo salen **143 `[data-w-id]` congelados en `opacity:0` repartidos por 22
rutas** — las 10 fichas de `/services/` pierden 9 elementos cada una, incluidos los
`.cms-item-subservices` y el `.process-header`. Un baseline así habría servido de referencia
con agujeros a TODAS las comparaciones posteriores, y `check:visual` habría salido **verde**
comparando el sitio nuevo contra un retrato roto del viejo.

#### La rotura F no prendió, y hay que decirlo
**`document.hasFocus()` no puede dar `false` bajo Playwright.** Playwright activa la emulación
de foco a propósito para que los tests no salgan flaky. Probado en los dos modos:

```
headless=true   sonda={"foco":true,"oculto":false,"fotogramas":50}  -> la deja pasar
headless=false  sonda={"foco":true,"oculto":false,"fotogramas":26}  -> la deja pasar
```

Se intentó también robando el foco con `osascript` en bucle durante la captura: tampoco, porque
`bringToFront()` lo recupera justo antes de medir. O sea que **esa mitad del check 3 da
confianza falsa** y no cuenta como probada. Se deja puesta —en otro entorno, o si Playwright
cambia, sí avisaría— pero con el aviso escrito en el código, y sabiendo que **el detector real
del fallo que pretende evitar es el check 4**, que sí se probó en rojo con las 143.

### Rarezas del original replicadas a propósito
- **8 fichas de `/project/` publican JSON-LD inválido.** Error real medido sobre el HTML
  servido: `Bad control character in string literal in JSON at position 443`. El campo
  `description` del CMS acaba en salto de línea y Webflow lo interpola crudo dentro de la
  cadena JSON. Ningún parser lo acepta, Google incluido. Se replica (contrato) y la puerta
  exige que el conjunto siga siendo **exactamente esas 8**: si aparece una novena o una se
  arregla sola, el baseline ya no describe el mismo sitio.
- **113 de 115 páginas llevan JSON-LD**; las 2 que no son `/pool-investment-estimator` (que no
  es una página de Webflow) y una más.

### Desviación declarada de la paridad: las canónicas
**El sitio vivo no tiene ni un `<link rel="canonical">`** — comprobado en 0 de 115, en
estáticas y en los 7 tipos de ficha. La Fase 9 pide canónicas absolutas en las 115, así que
**son una adición deliberada, no paridad**. Consecuencia para la Fase 9: `check:seo` tiene que
tratarlas como diferencia esperada, no exigir que casen contra el baseline. La puerta de aquí
no exige que existan: exige que **siga siendo cierto que el origen no las tiene**.

### Lo que este baseline NO retrata
Los **3 widgets de Elfsight se quedan en altura 0 y sin hijos**, medido en dos navegadores
distintos tras barrido completo y 6–8 s de espera; `platform.js` carga y la petición a
`core.service.elfsight.com/p/boot/` se hace. No es un artefacto de la automatización: no los ve
nadie. Dos de ellos deberían pintar contenido (Google Reviews e Instagram Feed). Está en la
tabla de mejoras candidatas, fila 5, porque es conversación con el cliente.

### Abierto
- **`baseline/shots/` pesa 53 MB en git** y no vuelve a cambiar salvo recaptura. Es el precio
  de tener la única prueba de paridad dentro del repo.
- `check:visual` (Fase 10) **tiene que importar `scripts/lib/captura.mjs`**, no reimplementar el
  congelado. Si lo reimplementa, la comparación deja de ser de lo mismo contra lo mismo.
- La media sonda de foco no está probada y no se puede probar aquí. Si alguna vez se cambia de
  motor de navegador, hay que volver a intentar romperla.

## Fase 2 (reabierta) — el CSS del estimador referenciaba 10 assets sin mapear   ✅ cerrada
**Fecha:** 2026-08-27 · **Reabre:** la entrada de Fase 2 de más abajo, que NO se edita.

### Por qué se reabre
Preparando la Fase 1 se midió `/pool-investment-estimator` y resultó **no ser una página de
Webflow**: es una app **Astro 5 + React `client:only`** servida por **Webflow Cloud** desde
`67ed3381-….wf-app-prod.cosmic.webflow.services`, montada bajo el dominio real. Su hoja de
estilos vive en ESE origen, así que `build-inventory.mjs` —que escanea el export y el HTML del
vivo— nunca la miró. Dentro había **10 URLs de `cdn.prod.website-files.com` sin entrada en el
manifiesto**.

**Los 10 ficheros ya estaban en disco y en git**: habían entrado por el export local
(`local:checked.png`, `local:bg-cover.svg`, …). Lo que faltaba era el **mapeo URL → fichero**.
Sin él, la pasada de reescritura de la Fase 5 no habría tenido nada con qué sustituir esas 10
URLs y el CSS del estimador se habría publicado apuntando al CDN de Webflow — justo el
requisito duro del cliente («cero referencias a `cdn.prod.website-files.com` al terminar»), y
sobre un CDN que ya devuelve **403 permanente** en assets de proyectos anteriores.

Nota sobre la entrada vieja: decía que los 2 ficheros de `MISSING.txt` «no los referencia
ninguna página ni el CSS». **Sigue siendo cierto** — los de `MISSING.txt` son
`checked-thumb-130-130-80.png` y `unchecked-thumb-130-130-80.png`, las miniaturas. Los que sí
usa el estimador son `checked.png` y `unchecked.png`, que son otros ficheros y sí estaban.

### Qué se hizo
- `scripts/build-inventory.mjs` — escanea también `_source/estimator/*.{css,html}` buscando
  URLs del CDN. Un bloque, con el porqué escrito al lado.
- `_source/estimator/` — **rescatado el material del estimador antes de que caduque** (depende
  de que la suscripción de Webflow siga viva): cascarón HTML + CSS + los **3** JS. Eran 2 a
  simple vista; el grafo de módulos se cerró recorriendo los `import` en cadena y apareció un
  tercero, `index.BqdhZ9yF.js`, sin el cual la app no arranca. 676 kB, 5 ficheros.
- `npm run assets` y `npm run check:assets`.

### Números medidos
| Métrica | Antes | Ahora |
|---|---|---|
| Assets únicos en el inventario | 657 | **667** (+10, 0 eliminados) |
| Referencias en el manifiesto | 831 | **841** |
| Ficheros distintos en disco | 793 | **793** (los 10 ya estaban) |
| Entradas previas alteradas | — | **0** |
| Assets de cromo versionados | 216 | **226** |
| Fallos de descarga | — | **0** |
| `_source/routes.csv` | — | **idéntico byte a byte** |

### Evidencia
```
$ node scripts/build-inventory.mjs
routes.csv            115 rutas
assets-inventory.csv  667 assets únicos
  referenciados 2+ veces: 45  (fundidos por URL: el manifiesto es determinista)

$ diff inv-antes.csv _source/assets-inventory.csv | grep -c '^>'   # añadidos
10
$ diff inv-antes.csv _source/assets-inventory.csv | grep -c '^<'   # eliminados
0
$ diff rutas-antes.csv _source/routes.csv && echo "(idéntico)"
(idéntico)

$ node scripts/download-assets.mjs
referencias procesadas : 841
ficheros en disco      : 793  (617.5 MB de referencias, dedup incluido)
✅ 0 fallos de descarga

$ node scripts/check-assets.mjs
── 8. cobertura del inventario     ✅ 667/667 remotos del inventario — faltan 0
── 9. acoplamiento git ↔ despliegue ✅ 226 assets de cromo, todos versionados
✅ PUERTA VERDE
```

Los 10 que faltaban, todos a `public/images/site/`:
`whychooseusimg.webp` · `cta-footer-image.webp` · `testimonial-image.webp` ·
`animateddivs-image.webp` · `outdoor-living-final-inspection-handover-florida-1….webp` ·
`checked.png` · `unchecked.png` · `bg-cover.svg` · `bg-cover-movil.svg` · `bg-cover-phone.svg`

sha256 del material rescatado del estimador:
```
8662dae9263f9f2e… PoolEstimatorPage.Cy-Yd7Xu.js   214 931 b
0f1e56e86473119c… client.6NxMFTsy.js              175 515 b
c64774625025eda2… index.BqdhZ9yF.js                12 250 b
7f6d1c04a390ee46… index.C0oxWGe_.css              276 140 b
ebd5a6f4c8a27959… index.html                        4 810 b
```

### Gate
**Criterio:** `check:assets` verde, el inventario solo AÑADE (0 eliminados, 0 entradas previas
alteradas) y `routes.csv` no se mueve.
**Resultado:** ✅ verde. 9/9 checks, 667/667 de cobertura, 226 de cromo versionados.

### Desviaciones
El **cableado** del estimador como página es de la Fase 5. Aquí solo se rescata el material,
y se hace ahora a propósito: tanto el CDN de Webflow como el origen `cosmic` dependen de una
suscripción viva, y lo que no se baje hoy puede no estar mañana.

### Abierto
- El bundle del estimador es **código minificado sin fuentes**. Portarlo lo deja funcionando;
  cambiar una fórmula o un precio exigiría rehacer la app.
- Su CSS trae **2 `@import` a Google Fonts** (Montserrat y una familia larga con Bitter, Changa
  One, Droid Sans…). La Fase 4 auto-aloja las fuentes: hay que incluir estas.

## Fase 2 — Assets locales   ✅ cerrada
**Fecha:** 2026-08-27 · **Commits:** `F2: 657 assets descargados…` + `F2: saca sanity-masters de git…`

### Objetivo
Que las 657 URLs del CDN de Webflow y los 174 ficheros del export estén en disco, con nombre
SEO, clasificados por colección, en formato que Sanity acepte, y que el manifiesto sea
determinista.

### Qué se hizo
- `scripts/download-assets.mjs` — descarga con concurrencia 8, 3 reintentos, reanudable por
  sha256, escribe encima (nunca `rm -rf` sobre el destino), deduplica por contenido y genera
  el máster JPEG de cada AVIF.
- `scripts/check-assets.mjs` — la puerta, 9 comprobaciones.
- `scripts/build-inventory.mjs` — parcheado 4 veces (ver defectos).
- `.gitignore` — reescrito con el acoplamiento git↔despliegue documentado.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Referencias procesadas | 657 remotas + 174 locales | **831** |
| Ficheros en disco tras deduplicar | — | **793** |
| Fallos de descarga | 0 | **0** |
| AVIF con máster JPEG para Sanity | todos | **213 / 213** |
| Imágenes sin dimensiones | 0 | **0** |
| Colisiones de nombre sin resolver | 0 | **0** |
| Referencias al CDN de Webflow que quedan | 0 | **0** |
| Manifiesto determinista (2 pasadas) | idéntico | **idéntico byte a byte** |
| Repo versionado | — | **77 MB / 213 ficheros** (950 MB en disco) |

### Evidencia
```
$ node scripts/check-assets.mjs
── 1. todo lo referenciado existe en disco          ✅ 0 ausentes
── 2. cada fichero ES lo que su extensión dice      ✅ 0 vacíos · 0 cabeceras que no casan
── 3. el sha256 del manifiesto casa con el disco    ✅ 0 desfases
── 4. dimensiones para cada imagen                  ✅ 0 sin dimensiones
── 5. Sanity: AVIF con máster JPEG                  ✅ 213 AVIF, 0 sin máster · 0 másters inválidos
── 6. nombres sin basura de Webflow                 ✅ 0 con hash, %-escape o espacio
── 7. colisiones mismo destino/contenido distinto   ✅ 0
── 8. cobertura del inventario                      ✅ 657/657
── 9. acoplamiento git ↔ despliegue                 ✅ 216 de cromo, 0 fuera de git
✅ PUERTA VERDE

$ cp _source/assets-manifest.json /tmp/m2.json && node scripts/download-assets.mjs && diff /tmp/m2.json _source/assets-manifest.json
✅ determinista

$ git rm --cached -q public/images/site/logo-mr-mr.svg && node scripts/check-assets.mjs
── 9. …  🔴 216 assets de cromo, todos versionados — 2 fuera de git
🔴 PUERTA ROJA — 1 fallo(s)
```

### Gate
**Criterio:** 0 fallos de descarga · 0 referencias al CDN · manifiesto determinista ·
la puerta demostrada en rojo al menos una vez.
**Resultado:** ✅ verde. El check 9 se probó en los dos sentidos (rojo al desversionar el logo,
verde al devolverlo). Los checks 2 y 6 estuvieron en rojo de verdad y destaparon defectos reales.

### Defectos encontrados y corregidos
1. **`%2520` — doble codificación.** 15 SVG y 3 WebP daban **403**. El fichero en el CDN se
   llama literalmente `Artboard%209.svg`, así que su URL correcta lleva `%2520`. Mi propio
   `decodeURI` la convertía en `%209` y la rompía. **Regla: la URL se usa CRUDA para descargar;
   solo se decodifica para calcular el nombre legible.** Ya era una trampa conocida de Pergola Plus.
2. **`%2F` — barra codificada.** 3 pósters de vídeo traían la barra como `%2F`, así que
   `url.split('/').pop()` se llevaba el id de sitio y el hash dentro del nombre. Se decodifica
   antes de partir la ruta.
3. **6 WebP con extensión `.avif`** en el export de Webflow. La extensión ahora sale de los
   **bytes**, no del nombre. Sin esto, Sanity los rechaza y la conversión avif→jpeg se aplica
   a algo que no es AVIF.
4. **URL con el id de sitio duplicado** en `industry-solutions.html` → 403. Se normaliza.
5. **El mapa de `alt` estaba escrito a mano** y se dejaba fuera `Imagen Intro N`,
   `Image Animation N`, `Before/After Image` e `Img Feature N`: **31 alts perdidos en silencio**.
   Ahora se empareja por nombre. Además se extrae el `alt` del `<img>` para los assets de cromo.
6. **`.gitignore` con comentario al final de la línea.** Git trata la línea entera como patrón,
   así que `_source/sanity-masters/   # derivable…` no casaba con nada y **82 MB de másters se
   colaron al commit**. Solo se vio midiendo el repo. Hay una comprobación en el propio fichero.

### Rarezas del original replicadas a propósito
- **127 imágenes de contenido con `alt` vacío.** El sitio vivo sirve `alt=""` (37 de 45 en una
  ficha de proyecto). No se redactan: sería contenido nuevo. Anotado como mejora candidata.
- Los 2 ficheros de `MISSING.txt` (`checked-thumb`, `unchecked-thumb`) **no los referencia
  ninguna página ni el CSS**. No se recuperan.
- Los 3 vídeos originales (70 MB) no los pide ninguna página: solo se usan las variantes
  `_mp4`/`_webm`. Se quedan en disco pero fuera de git, con lista blanca.

### Abierto
- **El acoplamiento `.gitignore` ↔ Fase 3.** Las carpetas de colección y `public/brochures/`
  están fuera de git porque su destino es Sanity. **Si la Fase 6 acaba pidiendo alguna por ruta
  local, hay que versionarla.** `check:git` de la Fase 10 tiene que barrer `dist/` y exigirlo
  contra `git ls-files`, nunca contra el disco.
- Los 213 másters JPEG son la entrada de la Fase 3; no van a git (derivables).

## Fase 0 — Cuentas y repo   ✅ cerrada
**Fecha:** 2026-08-27

### Qué se verificó
| Servicio | `--account` | Resuelve a |
|---|---|---|
| Sanity | `sanity_raker-uranic` | proyecto **`m273z6jc`**, org `oa0t37sqx`, dataset `production` **público y vacío** |
| Vercel | `vercel_goral-format` | equipo **Senavia Corp** `team_S7aSWbSFopAYosvDC7LIdMUS` |
| Cloudflare | `cloudflare_blab-squad` | cuenta del cliente, **0 zonas** |

### Hallazgo: el dominio no está en Cloudflare
`mrandmrsoutdoorliving.com` usa NS de **GoDaddy** (`ns75/ns76.domaincontrol.com`). El
`server: cloudflare` que devuelve hoy es **el Cloudflare de Webflow**. Las 3 herramientas de
Cloudflare de Composio son de ámbito zona → inservibles hoy.
**Decisión de Sebastian:** solo Turnstile, el DNS se queda en GoDaddy.

### Permisos del robot de Sanity, medidos
`Claude_Code` (`pKuCLTBHB`), token `siq7a1w8exeC0K`, roles **developer + contributor + editor**.
- ✅ **Escribe documentos** vía `composio proxy` (probado con un canario, creado y borrado;
  dataset de vuelta a `count(*) = 0`).
- 🔴 **NO puede subir binarios.** El proxy de Composio corrompe el cuerpo binario: un SVG (texto)
  sube bien, pero WebP y JPEG dan `422 Input buffer contains unsupported image format`. Probado
  con `Blob`, `Uint8Array` y `Buffer` — los tres fallan igual, así que no es la forma del cuerpo.
  **Conclusión: `composio proxy` sirve para mutaciones JSON, no para `assets/images`.**

---

## Fase 3 — Sanity: esquemas + import   ✅ cerrada
**Fecha:** 2026-08-27

### Qué se hizo
- `scripts/schema-map.mjs` — **fuente única** del mapeo columna-CSV → campo-Sanity.
  **Falla si alguna columna se queda sin destino**: es lo único que impide perder un campo en
  silencio (un campo perdido no rompe el build, deja un hueco que nadie mira).
- `scripts/gen-schemas.mjs` → `studio/schemaTypes/*.ts` (16 tipos + `seo`).
- `studio/` — Sanity 4.22.1, `projectId: m273z6jc`, compila con `tsc --noEmit` sin error.
- `scripts/import.mjs` — construye los documentos; **`--dry-run` por defecto** si no hay token.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Columnas de CSV sin destino | 0 | **0** de 236 campos en 16 colecciones |
| Documentos construidos | = filas no archivadas | **519** |
| Referencias rotas | 0 | **0** |
| Assets ausentes | 0 | **0** |
| Documentos con Portable Text | — | **79** |
| Assets que van a Sanity | — | **628** (los otros 203 son cromo y se quedan en `public/`) |
| Borradores (`Draft=true`) | — | **9** |

Conteos por tipo, todos cuadran con los CSV: 147 galleryImage · 113 subservice · 57 brochure ·
56 processStep · 53 poolBuilder · 20 logo · 14 service · 10 industry · 10 project · 10 blogPost ·
9 brochureCategory · 9 county · 3 category · 3 commercialService · 3 article · 2 serviceRegion.

### Evidencia
```
$ npm run import:dry
documentos construidos : 519
con Portable Text      : 79
assets referenciados   : 628 de 831 del manifiesto
✅ 0 referencias rotas · 0 assets ausentes
```

### Defecto corregido
`gen-schemas.mjs` emitía `description: '…', (vacía en el export)` con el paréntesis **fuera de la
cadena** → `.ts` roto. Lo cazó `tsc --noEmit`; el `npm run build` de Astro **no** lo habría
cazado, porque esbuild no comprueba tipos.

### Rarezas del original replicadas a propósito
- Las erratas de nombre de campo se conservan en la `description` de cada campo del esquema
  (`Heading 3D Rendeing Design`, `Metadescripcion SEO`, `Imagen Intro N`) para que el editor
  reconozca de dónde viene cada cosa.
- `blogs.Date`, `commercials.Categories` y `logos.Metadata` están **vacías en el export**: se
  emiten igual, marcadas en la descripción.

### Subida — hecha
Token acuñado con el robot de Composio (rol `developer` → crea tokens), etiqueta
**`migracion-webflow`**, id `siJwsZIuxYcguA`, rol **editor**. Guardado solo en `.env`
(gitignored, permisos 600). **REVOCAR AL ENTREGAR.**

| Métrica | Medido |
|---|---|
| Assets subidos | **628** (449 imágenes + 179 ficheros) |
| Documentos publicados | **511** en 16 tipos |
| Borradores | **8** |
| Referencias, todas resueltas | **1267** |
| Idempotencia (2.ª corrida) | `count(*)` **1159 → 1159** |

```
$ node scripts/check-sanity.mjs
── 1. conteo por tipo        ✅ 511 documentos publicados en 16 tipos
── 2. borradores             ✅ 8
── 3. referencias rotas      ✅ 1267 referencias, todas resuelven
── 4. assets                 ✅ 449 imágenes + 179 ficheros = 628
── 5. sin slug               ✅ todos con slug
── 6. Portable Text          ✅ 10 blogPost con bloques
── 7. idempotencia           ✅ count(*) 1159 -> 1159
✅ PUERTA VERDE

$ # probada en rojo: borrado un industry, restaurado con el propio importador
🔴 industry: esperado 10, hay 9   ->   🔴 PUERTA ROJA
✅ PUERTA VERDE   (tras `node scripts/import.mjs`)
```

### Defectos corregidos durante la subida
1. **`slice(17)` en vez de una captura de regex** se comía la barra inicial de cada ruta →
   628 `ENOENT`. Sustituido por `matchAll` con grupo.
2. **`.sort()` MUTA.** Ordenar `docs` alfabéticamente para volcarlo a `sanity-docs.json`
   destruía el orden topológico con el que se escriben los lotes: el primer lote intentaba
   escribir un `brochure` antes que su `brochureCategory` → `409`. Ahora se ordena una **copia**.
3. **Un documento publicado no puede referenciar a un borrador** (Sanity da 409 a mitad de lote,
   sin decir la causa). Añadido un guardia que lo detecta en el ensayo.
4. **La puerta medía sin token y daba un falso negativo.** Una lectura ANÓNIMA de un dataset
   público devuelve los borradores como **0, no como error**: la puerta decía «0 borradores»
   con los 8 dentro. Mismo patrón que el 200-con-`result:[]` de un dataset privado en AMS.
5. Los **12 `system.group`** de Sanity son grupos ACL, no contenido, y su `_id` es `_.groups.*`
   —así que `path("system.**")` NO los filtra—. Se filtra por `_type match "system.*"`.

### Rareza del original: un `Draft=true` que el sitio SÍ sirve
`where-we-serves/custom-pool-builders-north-florida` viene marcado como borrador en el export,
**pero la página devuelve 200** y 7 condados la referencian. Manda el sitio vivo (contrato):
se publica, con la excepción declarada en `PUBLICAR_IGUAL` de `import.mjs`.
Los otros 8 borradores se quedan como borradores, **verificado uno a uno contra el vivo**:
los 6 logos no salen en la home, y ni el subservice `lighting-water-feature-upgrades` ni el paso
`smart-lighting-step-1` salen en su ficha de servicio.

### Abierto
- El **Studio no está desplegado**. `npm run deploy` desde `studio/` lo tiene que correr el dueño
  del proyecto: el login del CLI de esta máquina no llega a `m273z6jc`. El frontend no lo necesita
  (lee el dataset directo), pero el cliente sí para editar.
- **Revocar el token `migracion-webflow`** al entregar.
