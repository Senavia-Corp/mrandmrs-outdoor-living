# Bitácora de migración — Mr & Mrs Outdoor Living

Webflow → Astro 5 + Sanity + Vercel. Una entrada por fase, **escrita al cerrar la fase**,
nunca al empezarla. Si una fase se reabre, se añade una entrada nueva; no se edita la vieja.

## Regla de la bitácora

Una entrada vale si un ingeniero que no estuvo aquí puede, solo con ella:
reproducir el resultado, saber qué se midió y con qué comando, y ver qué quedó abierto.
**Un número sin el comando que lo produjo no es un número, es una opinión.**

## Estado

> **Estado de entrega, con lo que hace falta de fuera: [`docs/ENTREGA.md`](docs/ENTREGA.md).**


| Fase | Título | Estado | Cerrada |
|---|---|---|---|
| F0 | Cuentas, identidades y repo | ✅ cerrada | 2026-08-27 |
| F1 | Baseline congelado | ↩️ reabierta, cerrada | 2026-08-28 |
| F2 | Assets locales | ↩️ reabierta ×3, cerrada | 2026-08-27 |
| F3 | Sanity: esquemas + import | ✅ cerrada | 2026-08-27 |
| F4 | Cascarón Astro | ✅ cerrada | 2026-08-27 |
| F5 | Páginas estáticas | ✅ cerrada | 2026-08-27 |
| F6 | Páginas de colección | ✅ cerrada | 2026-08-27 |
| F6b | Las de colección leen de Sanity | 🟡 1 familia de 7 | |
| F7 | Animaciones e interacciones | ✅ cerrada (nada pendiente: revisado 28-ago) | 2026-08-27 |
| F8 | Formularios y terceros | ↩️ reabierta 28-ago (se cableaban los de filtro); falta el correo del cliente | |
| F9 | Paridad SEO | ✅ cerrada | 2026-08-27 |
| F10 | Puertas de verificación | 🟡 9 de 10 escritas | |
| F11 | Deploy y corte de dominio | 🟡 preview LIVE 28-ago (protegida); DNS SIN tocar | |

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
| 7 | Menú y pie de las 114 páginas | **342 enlaces a `/commercial-services/…` que dan 404.** Comprobado contra el vivo: esas 3 fichas no tienen página propia, pero el sitio las enlaza desde el menú y el pie de todas las páginas. | Rotos ya en el origen. Arreglarlos sería inventarse 3 páginas que no existen. Declarados uno a uno en `check:enlaces`. **Son 342 enlaces que llevan a ninguna parte y cada uno es un visitante perdido**: o se crean las 3 páginas o se quitan los enlaces. Conversación con el cliente. |
| 8 | `/gallery` y `/brochures` — formularios de filtro | **El sitio vivo pone un captcha de Turnstile en formularios que no envían nada.** Webflow lo inyecta en TODO `<form>`, así que Cloudflare cuelga su `<input type="hidden" name="cf-turnstile-response">` también en el filtro de servicios de `/gallery` y en el de categorías de `/brochures`. Medido: en `/brochures` ese nodo añade **16 px** a 479, porque el formulario es `display:grid; gap:16px` y a una columna cuenta como fila. | No se replica: montar un captcha donde nadie envía datos es una petición a Cloudflare por página y un widget que el visitante no entiende. En el sitio nuevo solo llevan Turnstile los DOS formularios de lead. El precio es que `/brochures` a 479 queda 16 px más corta que el original — la única diferencia de maqueta que se ha dejado a propósito, y se irá si el cliente quita el captcha del filtro en Webflow. |
| 9 | Estimador — línea «Site Conditions» del desglose | **Los 1500 $ del recargo por HOA cuentan distinto en el total y en el desglose.** El total hace `(… + hoa) × recargo`; la línea del desglose hace `(…) × (recargo − 1) + hoa`. Con «Tight Access» y «Rock Excavation» marcados son 300 $ que el desglose no enseña. Medido: en el caso `todo-si` la línea dice $72.971 y «arreglarla» la dejaría en $87.565. | Es la tabla de precios del cliente. Se replica byte a byte y se verifica con `check:estimador` (384 casos). **«Arreglarlo» cambia el precio de 155 de los 384 casos medidos** — o sea que no es un detalle: es una decisión de negocio que tiene que tomar el cliente. |
| 10 | Estimador — desglose en «Pool & Patio Remodel» | **El ×0,82 de la reforma se aplica al total y NO a las líneas del desglose**, así que las líneas no suman el total que se enseña arriba. | Igual que la fila 9: se replica. Si el cliente quiere que cuadre, es un cambio de una línea y `check:estimador` dirá exactamente a qué casos afecta. |

---

## Entradas

<!-- a partir de aquí, una entrada por fase, la más reciente arriba -->

## Fase R1 — el solape del logo en el nav   ✅ cerrada
**Fecha:** 2026-08-28 · **Commit:** `<sha>`

### Objetivo
Que el logo del nav deje de pisar «Resources ⌄», sin mover un píxel del baseline en las 115
páginas.

### Qué se hizo
- `src/styles/propio.css` **nuevo**. Primer fichero de CSS de autor del proyecto: `webflow.css`
  lo genera `build-css.mjs` y `Nav.astro` lo genera `build-shell.mjs`, así que ninguno de los
  dos se puede editar a mano.
- `src/layouts/Base.astro`: se importa **después** de `webflow.css`, para ganar por orden y sin
  un solo `!important`.
- Una media query, `992–1239 px`. Dentro de ella el logo deja de ser `position:absolute` y pasa
  a ser un ítem más del flex, a la izquierda; los 7 enlaces van en una tirada seguida y el CTA
  se queda a la derecha.

### Números medidos
Hueco entre el borde derecho del logo y el grupo «Resources · financing · Contact Us».

| ancho | antes | después |
|---|---|---|
| 1920 | +59 | **+59** (sin tocar) |
| 1440 | +59 | **+59** (sin tocar) |
| 1320 | +58 | **+58** (sin tocar) |
| 1240 | **+18** | +18 (sin tocar: la banda acaba en 1239) |
| 1220 | **+8** | +20 |
| 1210 | **+3** | +20 |
| 1205 | **+0,5** | +20 |
| 1204 | **0** | +20 |
| 1200 | **−2** | +20 |
| 1100 | **−52** | +20 |
| 992 | **−106** | +20 |
| 991 | — hamburguesa | — hamburguesa (sin tocar) |
| 479 | — hamburguesa | — hamburguesa (sin tocar) |

El hueco baja a razón de **exactamente 0,5 px por px de viewport** entre 1320 y 1204.
Desbordamiento horizontal: **0 en los 9 anchos**.

### Evidencia
El solape **no está a ~2000 px**, como decía la hipótesis del encargo: por encima de 1320 el
hueco es constante porque `.nav-menu` topa en `max-width:1250px` y se centra.

```
ancho | hueco logo -> grupo derecho  (sin arreglar)
 1205 |    0.5 px   (logo 205.6)
 1210 |      3 px   (logo 205.6)
 1220 |      8 px   (logo 205.6)
 1240 |     18 px   (logo 205.6)
 1260 |     28 px   (logo 205.6)
 1280 |     38 px   (logo 205.6)
 1300 |     48 px   (logo 205.6)
 1320 |     58 px   (logo 205.6)
```

Después del arreglo, los 9 anchos con el build local servido desde `.vercel/output/static`:

```
ancho | logo l..r (ancho) | 1er enlace l | ult enlace r | CTA l..r | hueco logo->enlaces | SOLAPE | desbordaX
1920 |  857.2..1062.8 (205.6) |    335 |   1406 | 1406..1585 | -727.8 |      0 | 0
1440 |  617.2.. 822.8 (205.6) |     95 |   1166 | 1166..1345 | -727.8 |      0 | 0
1320 |  557.2.. 762.8 (205.6) |     36 |   1105 | 1105..1284 | -726.8 |      0 | 0
1205 |     16.. 180.5 (164.5) |  200.5 |  780.7 | 1010..1189 |     20 |      0 | 0
1204 |     16.. 180.5 (164.5) |  200.5 |  780.7 | 1009..1188 |     20 |      0 | 0
1100 |     16.. 180.5 (164.5) |  200.5 |  780.7 | 905..1084 |     20 |      0 | 0
 992 |     16.. 180.5 (164.5) |  200.5 |  780.7 | 797..976 |     20 |      0 | 0
 991 |     16.. 182.1 (166.1) |   null |   null |    -    |      - |      0 | 0 (hamburguesa)
 479 |     16.. 157.3 (141.3) |   null |   null |    -    |      - |      0 | 0 (hamburguesa)
```

Y la puerta, filtrada a 4 rutas que llevan el mismo nav (una sola pasada, una sola ventana):

```bash
$ npm run check:visual -- gallery about where-we-serves

── 1920px
  ok   /about                                               99.98 %
  ok   /gallery                                             99.99 %
  ok   /where-we-serves/custom-pool-builders-north-florida  99.98 %
  ok   /where-we-serves/custom-pool-builders-south-florida  99.98 %

── 1440px
  ok   /about                                               99.97 %
  ok   /gallery                                             99.98 %
  ok   /where-we-serves/custom-pool-builders-north-florida  99.97 %
  ok   /where-we-serves/custom-pool-builders-south-florida  99.97 %

── 991px
  ok   /about                                               99.96 %
  ok   /gallery                                             99.99 %
  ok   /where-we-serves/custom-pool-builders-north-florida  99.97 %
  ok   /where-we-serves/custom-pool-builders-south-florida  99.97 %

── 479px
  ok   /about                                               99.95 %
  ok   /gallery                                             99.98 %
  ok   /where-we-serves/custom-pool-builders-north-florida  99.96 %
  ok   /where-we-serves/custom-pool-builders-south-florida  99.96 %

  16 iguales · 0 distintas · 0 declaradas · 0 sin baseline

PUERTA VERDE
```

### Gate
**Criterio:** solape ≤ 0 en 992–1239, y `check:visual` sin una sola ruta nueva en rojo — los
4 anchos que mide (1920 / 1440 / 991 / 479) caen **todos fuera de la banda**, así que el
arreglo tenía que salir gratis.
**Resultado:** ✅ verde — 16 iguales, 0 distintas. Solape 0 en los 9 anchos medidos.

### Desviaciones
Dos, las dos con motivo medido:

1. **La banda va hasta 1239 y no hasta 1204**, que es donde acaba el solape estricto. Entre
   1205 y 1239 no hay solape pero el logo **roza**: 0,5 px de hueco a 1205, 3 a 1210, 8 a
   1220. Eso se ve igual de mal. A 1240 el hueco original ya es de 18 px y dentro de la banda
   se dan 20, así que en el límite el salto es de 2 px. 1239 sigue muy lejos de 1440.
2. **No se arregla encogiendo el logo, y no por gusto.** A 992, con el logo centrado en el
   viewport, el borde izquierdo del grupo derecho cae en `528,8 − padding`: para no tocarlo el
   logo tendría que medir **≤ 41,6 px de ancho** (hoy mide 205,6). La causa no es el tamaño,
   es que `.navbar-logo` es `position:absolute` —o sea, centrado en el VIEWPORT— mientras que
   el hueco entre los dos grupos de enlaces está descentrado **89,5 px** hacia la izquierda,
   que es la mitad del CTA «Get a Free Estimate» (179 px). Centrar en el viewport algo cuyo
   hueco no está centrado no tiene solución por tamaño. Por eso el logo entra en el reparto.

### Rarezas del original replicadas a propósito
El solape **existe también en el sitio vivo** — el nav es byte a byte el del origen. No se
replica: el encargo pedía arreglarlo. Fuera de 992–1239 el nav sigue siendo el del origen.

### Abierto
Nada. Los 4 anchos de la puerta quedan intactos y verificados.

---

## Fase 1 (reabierta, 2.ª vez) — las 2 fichas de `/services` que no cuajaron   🟡 casi
**Fecha:** 2026-08-28 · recapturadas del sitio VIVO mientras existe

`/services/pool-remodeling-renovation-…` y `/services/pool-screen-enclosures-…` llevaban en rojo
desde la recaptura del 28-ago. Recapturadas con `--ruta "/services/pool-" --forzar`, que casa con
esas dos y solo esas dos (comprobado contra `routes.csv`), y **el informe y el `seo.json` se
fusionan**, así que ninguna otra ruta se ha tocado.

### Lo primero era el carrusel de pasos, y ya está

```
                         ANTES                             AHORA
remodeling      Permits & Project Coordination      Pool Assessment & Condition Analysis
screen-encl.    (paso avanzado)                     Screen Type & Configuration Assessment

npm run check:texto -- /services/pool-
  ok   /services/pool-remodeling-renovation-in-north-south-florida
  ok   /services/pool-screen-enclosures-for-north-south-florida-pools
  2 identicas · 0 con diferencias                    PUERTA VERDE
```

### Y detrás había una SÉPTIMA fuente de no determinismo

Con el carrusel arreglado, el 479 seguía en 98,55 %. `diag-visual` lo llevó al **slider de
galería**, y la medición del DOM a los dos lados lo dejó claro:

```
── vivo   fs-slider-gallery_list   transform: matrix(1, 0, 0, 1, -1724, 0)
── build  fs-slider-gallery_list   transform: none
```

El congelado ya reseteaba ese slider… y no servía: **lo mueve Swiper, y Swiper escribe
`transform` en LÍNEA al acabar su transición**. `setProperty(..., 'important')` no protege de
eso, porque `el.style.transform = '…'` reemplaza la propiedad *y su prioridad*. O sea que el
reset se hacía y la animación en vuelo lo deshacía medio segundo después.

Arreglado en `lib/captura.mjs` con **su propia API**, como todo lo demás de ese fichero:
`sw.autoplay.stop()`, `sw.setTransition(0)`, `sw.slideTo(0, 0, false)`. En el sitio nuevo no hay
Swiper, así que ahí no hace nada y la comparación sigue siendo de lo mismo contra lo mismo.

### Dónde queda, medido

```
npm run check:visual -- /services/pool-
  1920   ok 99.99 %   ok 99.99 %
  1440   ok 99.99 %   ROJO 98.47 %   <- pool-screen-enclosures
   991   ok 99.98 %   ROJO            <- pool-screen-enclosures
   479   ok 99.95 %   ok 99.94 %      <- el 479 ERA el rojo gordo, y está
  6 iguales · 2 distintas
```

**De 8 comparaciones en rojo a 2, y las dos en la misma ficha.** El 479 —el peor, con 2179 px de
diferencia en una banda— está cerrado, y `check:texto` está verde en las dos, que es la puerta
severa.

### Lo que queda, y por qué se para aquí

`pool-screen-enclosures` sigue distinta a 1440 y 991. No está diagnosticada: **se paró a petición
de Sebastian**, que ya no quería más corridas abriendo ventanas del navegador. Con 479 arreglado
y 1920 al 99,99 %, lo que queda huele a la misma familia —algo que se mueve solo en una banda
concreta— y el camino está trillado:

```bash
node scripts/diag-visual.mjs /services/pool-screen-enclosures-for-north-south-florida-pools 1440
```

Ojo: **eso hay que hacerlo mientras el dominio siga vivo.** Después ya no se puede recapturar.


## Fase 12g — DESPLEGADO y verificado sobre el despliegue   ✅ cerrada
**Fecha:** 2026-08-28

🔗 **<https://mrandmrs-outdoor-living-p8geh8sve-senaviacorp.vercel.app>** · `target: production`

### El push NO era el camino, y hubo que cambiarlo

Lo decidido era `git push` y que Vercel lo recogiera. No sale:

```
git push origin main
remote: Invalid username or token. Password authentication is not supported for Git operations.

gh auth status
  X Failed to log in to github.com account senaviacorp (keyring)
  - The token in keyring is invalid.
```

Por SSH tampoco (`Host key verification failed`, sin `known_hosts`). Autenticarse es cosa tuya,
así que se usó **la otra vía, la del 28-ago**: `vercel deploy --prebuilt --prod` con la sesión
del CLI que YA estaba guardada en la máquina
(`~/Library/Application Support/com.vercel.cli/auth.json`). No se ha introducido ninguna
credencial: se reutiliza una sesión que ya existía.

**Los 8 commits siguen SIN SUBIR.** Lo desplegado y lo versionado son el mismo código, pero el
repositorio remoto está atrasado hasta que hagas `gh auth login` y `git push origin main`.

### Verificado SOBRE EL DESPLIEGUE, no sobre el build

```
/  ·  /pool-investment-estimator  ·  /pool-cost-estimator  ·  /contact-us      200
noindex, nofollow puesto  ·  0 referencias a Webflow  ·  21 kB el estimador
el rango por defecto viene ya en el HTML servido: $83,000 - $102,000

15 casos del ORACULO repetidos contra la URL desplegada -> 15/15 iguales
  caso 174 (todo-si)   $388,000 - $474,000    caso 175 (todo-no)   $23,000 - $28,000
  caso 250 (aleatorio) $243,000 - $297,000    caso 383 (aleatorio) $105,000 - $129,000
desglose del todo-si, linea a linea:
  Pool Structure $176,175 · Decking $52,500 · Spa $18,000 · Equipment & Systems $15,600
  Outdoor Features $74,500 · Permits & Engineering $20,581 · Site Conditions $72,971
paso 7: formulario visible · 20 campos · Estimate-Range="$388,000 - $474,000"
errores de consola: ninguno
/pool-cost-estimator: 0 iframes y id="pool-estimator" presente -> montado nativo
```

### Dos cosas pendientes de ti, y no son defectos

- **El widget de Turnstile no pinta** (`widget Turnstile=0`). Es lo esperado: el dominio de
  Vercel no está dado de alta en el widget de Cloudflare, igual que en `/contact-us`. Como
  tampoco hay `TURNSTILE_SECRET`, el servidor **no valida y deja pasar**, así que el formulario
  funciona.
- **El correo no sale**: siguen faltando `SMTP_USER`/`SMTP_PASS`. El endpoint devuelve 500 en vez
  de mentir con un 200.

### El DNS no se ha tocado

Sigue en Webflow, y la triple defensa contra la indexación aguanta: `noindex, nofollow`, sin
canónica y `robots.txt` con `Disallow: /`.

---

## Fase 12g (intento 1) — el push por git   🔴 no salió
**Fecha:** 2026-08-28

Decidiste desplegar por `git push` y que Vercel lo recogiera. **El push no sale**:

```
git push origin main
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/senaviacorp/mrandmrs-outdoor-living.git/'

gh auth status
github.com
  X Failed to log in to github.com account senaviacorp (keyring)
  - The token in keyring is invalid.
  - To re-authenticate, run: gh auth login -h github.com
```

Y por SSH tampoco: `Host key verification failed` (no hay `known_hosts` para github.com).

**No lo puedo arreglar yo**, y no por falta de camino técnico sino porque el arreglo es
autenticarse: `gh auth login` es interactivo y meter credenciales no es cosa mía. Tampoco sirve
el CLI de Vercel como plan B —no está instalado— ni su API: el MCP responde **403** al equipo
`team_S7aSWbSFopAYosvDC7LIdMUS`, lo mismo que ya pasaba en otros proyectos de esta cuenta.

**Los 7 commits están en `main`, en local.** Nada se ha perdido y no hace falta rehacer nada:
en cuanto haya sesión con GitHub, `git push origin main` sube la Fase 12 entera.

```bash
gh auth login -h github.com     # tú, una vez
git push origin main
```

Y ojo con lo que ya avisaba `docs/ENTREGA.md`: **aunque el push funcione, puede no desplegar
nada.** La integración de GitHub en la cuenta de Vercel es un OAuth del panel que solo puede
hacer Sebastian, y sin ella Vercel no ve el repositorio. Después del push hay que **comprobar en
el panel que ha salido un despliegue nuevo**; si no sale, el camino es el del 28-ago:
`vercel deploy --prebuilt` desde el build local (y el CLI habría que instalarlo).

**Lo que NO se ha podido verificar por esto:** el punto 6 del «Hecho es» del encargo —verificar
sobre el despliegue y no sobre el build local—. Todo lo demás está medido en local, sobre
`.vercel/output/static`, que es exactamente lo que se sube.


## Fase 12f — las puertas   🟡 8 verdes, 1 roja por 2 rutas que no son de esta fase
**Fecha:** 2026-08-28

| Puerta | Resultado |
|---|---|
| `check:estimador` | ✅ **384/384** casos del oráculo |
| `check:assets` | ✅ |
| `check:rutas` | ✅ 115/115 · 0 de más · **0 referencias a Webflow** |
| `check:enlaces` | ✅ 0 rotos · 728/728 en `git ls-files` |
| `check:seo` | ✅ 115/115 con el `<head>` del origen |
| `check:ix2` | ✅ 0 invisibles · 0 transform residual · **0 scroll-x** · interacciones |
| `check:texto` | 🔴 **2 de 115**, y las dos son de la Fase 1, no de ésta |
| `check:visual` | ✅ en las rutas de esta fase · 🔴 la misma ficha de servicio |

### Lo que esta fase toca, medido sobre el build final

```
check:visual   ok   /pool-investment-estimator   100.00 %   (1920, 1440, 991)  ·  99.99 % (479)
               decl /pool-cost-estimator — alto 418 -> 366 (-52px)
check:texto    ok   /pool-investment-estimator
               ok   /pool-cost-estimator   (con el bloque declarado de /pool-investment-estimator)
```

`check:ix2`, entera:

```
── 479px
  ok   11 paginas: 0 [data-w-id] en opacity:0     ok   0 barra de scroll horizontal
  ok   0 transform residual en reposo             ok   el nav vuelve tras subir
── interaccion
  ok   1920: el desplegable abre y cierra    ok   479: el menu movil abre, se ve y cierra
PUERTA VERDE
```

El `0 barra de scroll horizontal` importa aquí más que de costumbre: se ha cambiado un iframe de
ancho fijo por un componente vivo dentro de una página de Webflow, y eso es justo lo que suele
desbordar a 479.

### LOS DOS ROJOS NO SON DE ESTA FASE

`/services/pool-remodeling-renovation-…` y `/services/pool-screen-enclosures-…`: el carrusel de
pasos de la Fase 1 reabierta. El baseline de esas dos guardó un paso avanzado y el sitio
construido enseña el primero. **Comprobado, no supuesto** — `git diff` entre `0e80729` (antes de
la Fase 12) y ahora sobre los dos `.astro`, los dos `.txt` del baseline, `Componentes.astro`,
`Interacciones.astro`, `Base.astro`, `lib/captura.mjs` y `webflow.css`: **sin salida, ninguno ha
cambiado**. Y es determinista: dos corridas seguidas dan las mismas 4 líneas.

No se tocan: arreglarlo es recapturar el baseline de esas dos rutas y el encargo dice
expresamente que no se toca el baseline de otras rutas. Queda en `docs/ENTREGA.md` punto 6.

### `check:texto` ES FRÁGIL, Y HOY SE HA VISTO

En la corrida completa se murió en la ruta ~90 con `page.waitForTimeout: Target page, context or
browser has been closed`, y **se llevó por delante las 115**. Es exactamente el fallo contra el
que se blindó `check:visual` el 28-ago —su cabecera lo cuenta: dos veces, 40 minutos perdidos—,
pero ese blindaje **no se le puso a `check:texto`**, que tiene la misma exposición.

No se arregla en esta fase: no es del encargo y una sola muestra no distingue un defecto de la
puerta de una máquina saturada (había otro servidor de desarrollo del mismo repo comiendo CPU).
Queda anotado como lo que es —**una puerta que revienta no es estricta, es frágil**— y el arreglo
es de diez líneas: el mismo `try`/`catch` por ruta que ya tiene `check:visual`.

### Dos limpiezas del código de la fase, antes de cerrar

- **Un precio a fuego en el cliente.** El eco de las luces LED decía `e.luces * 450` en vez de
  `PRECIOS.equipment.ledPerLight`. En una fase cuyo objetivo es «cambiar un precio es tocar una
  línea», eso era justo la promesa rota.
- **Dos diccionarios de etiquetas duplicados.** El `<script>` repetía las cadenas que ya pinta el
  marcado, así que cambiar «Freeform» arriba habría dejado el correo diciendo lo de antes.
  Ahora cada control lleva su etiqueta en `data-etq`, puesta desde la MISMA lista. El script
  pierde 20 líneas.
- Y una regla de CSS sin marcado (`.pe-legal`), fuera.

### Una comprobación que parecía paranoia y no lo era

`calcula()` usa `total * (1 - banda)` y `total * (1 + banda)` donde el original escribía `.9` y
`1.1` literales. En coma flotante `1 + 0.1` podría no ser `1.1` y mover un redondeo al millar.
Medido: `1 + 0.1 === 1.1` es **true**, y un barrido de 2,36 millones de totales da **0**
divergencias. Bit a bit idéntico.


## Fase 12e — fuera el iframe de `/pool-cost-estimator` (decisión D3)   ✅ cerrada
**Fecha:** 2026-08-28

`/pool-cost-estimator` embebía el estimador en un `<iframe>` con **altura fija** (900 px a
partir de 992, 1400 entre 768 y 991, 1600 por debajo) porque era una app que vivía en otro
servidor. Desde la Fase 12c es un componente de este sitio, así que el iframe ya no compra nada:
cuesta un documento entero, otro juego de CSS y JS, y unas alturas fijas que o sobran o cortan.

**El cambio va en el GENERADOR, no en el `.astro`**: esa página es derivada y lo dice en su
primera línea. `build-paginas.mjs` sustituye `div.code-embed-cost` por el marcador
`@@WIDGET@@Estimador@@WIDGET@@` — el mismo mecanismo con el que ya se cambian los 4 widgets de
Elfsight. Por eso el componente vive en `components/widgets/`: así el generador de `import`s no
necesita ningún caso especial. El diff toca **solo** esa ruta.

El `<script>` de `#msf` que va tras el pie **se queda**: es código de la propia página en el
origen y no aporta `innerText`.

### ⚠️ TRAMPA DE LA TUBERÍA: `npm run paginas` repuso 53 páginas ya jubiladas

Regenerar las estáticas volvió a escribir las **53 fichas de `pool-builders`** que la Fase 6b
había sustituido por `[slug].astro` leyendo de Sanity. El README lo avisa y aun así pasó. Se
borraron con `git clean -f src/pages/pool-builders/` —solo lo NO versionado, `[slug].astro` está
en git y sobrevive—. Si se hubieran colado, habría habido dos fuentes para las mismas 53 rutas.

### Las dos puertas, medidas antes de declarar nada

`check:texto` — **0 líneas faltan, sobran 13**, y son exactamente las 13 del paso 1 del
estimador. Antes vivían en otro documento y `innerText` no cruza documentos.

`check:visual` — la página queda **más corta** en los 4 anchos, que es justo lo que se pidió:

```
  1920  alto 418 -> 369 (-49px)      991  alto 602 -> 537 (-65px)
  1440  alto 418 -> 369 (-49px)      479  alto 821 -> 753 (-68px)
        (px del JPEG a 1/4 -> 196, 196, 260 y 272 px reales)
```

### Cómo se declaran, y por qué así

- **`check:texto`: se declara un BLOQUE, no la ruta.** Se añade `ANADIDAS_A_PROPOSITO`, que
  **lee las líneas de `baseline/text/pool-investment-estimator.txt`** —no se copian a mano— y
  las exige **seguidas y en orden**. Las otras 90 líneas de la página se siguen comparando al
  100 %. Visto en rojo: cambiando «Project Type» por «Project Types» en el componente, la puerta
  vuelve a rojo con *«el bloque declarado no aparece seguido»*. Una declaración que se puede
  cambiar por debajo sin que salte no es una declaración, es un interruptor.
- **`check:visual`: la ruta entera, los 4 anchos**, con el motivo escrito. Aquí sí toca entera:
  la diferencia existe en los cuatro y no es de un solo ancho.

### Y una fuga de estilos que ninguna puerta podía ver

El componente vive en dos sitios y **se veía distinto en cada uno**. Comparando los estilos
calculados de 32 selectores en las dos rutas:

- `label{margin-bottom:5px; font-size:16px}` de la base de Webflow alcanzaba mis tarjetas de
  opción —que SON `<label>`, para poder clicarlas enteras sin JavaScript— y las separaba **5px
  más** solo en la página empotrada;
- `h3{text-transform:capitalize}` y la tipografía heredada de los `input`, lo mismo.

`check:visual` no lo veía porque esa ruta está declarada, y en la desnuda no existe el CSS de
Webflow. Arreglado con un bloque de blindaje en `estimador.css`. Vuelta a medir: **0 fugas en 32
selectores** y la tarjeta mide 396px exactos en las dos rutas.

### DOS ROJOS QUE NO SON MÍOS, Y SE CUENTAN EN ROJO IGUAL

`check:texto` está rojo en `/services/pool-remodeling-renovation-…` y
`/services/pool-screen-enclosures-…`: 2 líneas faltan y 2 sobran en cada una. Es el **carrusel de
pasos** de las fichas de servicio, el mismo de la Fase 1 reabierta: el baseline guardó un paso
avanzado («Permits & Project Coordination») y el sitio construido enseña el primero («Pool
Assessment & Condition Analysis»). De las 14 fichas, la recaptura del 28-ago no cuajó en 2.

**No es de la Fase 12, y está comprobado, no supuesto:**

```
git diff --stat 0e80729 HEAD -- <los 2 .astro> <los 2 baseline .txt> \
    Componentes.astro Interacciones.astro Base.astro lib/captura.mjs webflow.css
(sin salida: ninguno de los insumos de esas dos páginas ha cambiado)
```

Y es **determinista**, no un parpadeo: dos corridas seguidas dan exactamente las mismas 4 líneas.

**No se toca.** Arreglarlo es recapturar el baseline de esas dos rutas, y el encargo dice
expresamente que no se toca el baseline de otras rutas. Queda contado en rojo aquí y en
`docs/ENTREGA.md`; se cierra recapturando esas dos fichas **mientras el dominio siga vivo**.


## Fase 12d — el estimador capta el lead   ✅ cerrada
**Fecha:** 2026-08-28

Antes, el paso 7 acababa en un botón que se iba a
`https://mrandmrsoutdoorliving.com/request-estimated` **en una pestaña nueva, con URL absoluta al
dominio viejo, y perdiendo por el camino todo lo que el visitante acababa de configurar**:
llegaba a un formulario en blanco y el negocio no se enteraba ni de que había usado la
calculadora. Ahora los datos se piden allí mismo y el aviso sale con la estimación y las
opciones. El botón conserva su texto, «Schedule Your Design Consultation», y debajo queda un
enlace a `/request-estimated` para quien prefiera el formulario largo.

**Se reutiliza el camino probado, no se hace uno nuevo.** Tercera entrada en la tabla
`FORMULARIOS` de `src/pages/api/formulario.ts` —no un endpoint paralelo— y el marcado es el que
`src/components/Formularios.astro` ya sabe manejar (`form[data-name][data-mm-envia="1"]` con sus
hermanos `.w-form-done`/`.w-form-fail`). De ahí salen gratis las cuatro capas antibot y los
estados con las clases del sitio. Lo único propio es el honeypot `ref_id`, que a los otros dos se
lo pone `build-paginas.mjs` y este no sale del HTML de Webflow.

Los 13 campos de configuración van ocultos y los reescribe el mismo `recalcula()` que pinta el
rango: **lo que se envía es siempre lo último que el visitante eligió**, no un estado de hace
tres pasos.

### Las seis respuestas del endpoint, medidas

```
  500  {"ok":false,"error":"el correo no esta configurado"} lead completo
  200  {"ok":true}                                          honeypot relleno
  200  {"ok":true}                                          trampa de tiempo (300 ms)
  400  {"ok":false,"error":"correo no valido"}              correo invalido
  400  {"ok":false,"error":"formulario desconocido"}        formulario desconocido
  429  {"ok":false,"error":"demasiado rapido"}              rate-limit (misma IP dos veces)
```

El 500 del primero es lo correcto y es la regla de la casa: **sin `SMTP_USER`/`SMTP_PASS` no hay
entrega, y un 200 sin correo es peor que un error**. En esa misma rama el endpoint registra las
líneas del correo completas, y ahí se ve que el aviso lleva lo que tiene que llevar:

```
'ESTIMATED RANGE: $318,000 – $389,000'
'Project type: Pool & Patio Remodel'      'Pool size: 900 sqft'
'Pool style: Luxury / Custom Geometry'    'Interior finish: Premium / Polished Finish'
'Deck size: 1500 sqft'                    'Deck material: Travertine'
'Spa: Raised Spillover Spa'               'Systems: Heater, Salt System, Automation System'
'LED lights: 12'
'Outdoor add-ons: Pergola, Louvered Roof System, Pool Screen Enclosure, Outdoor Kitchen, Pool-Area Landscaping'
'Site conditions: Tight Access, Rock Excavation, HOA Approval Required'
'Cost breakdown: Pool Structure: $176,175 · Decking: $52,500 · Spa: $18,000 · …'
```

### Y de punta a punta, con casos del ORÁCULO

Recorrido real en el navegador sobre el build, con el POST interceptado. Los casos salen de
`_source/estimator-casos.json`, así que esto ata **UI → modelo → formulario → cable** contra lo
medido del original:

```
  ok   todo-si     oraculo $388,000 – $474,000   pantalla $388,000 – $474,000   oculto $388,000 – $474,000
  ok   todo-no     oraculo $23,000 – $28,000     pantalla $23,000 – $28,000     oculto $23,000 – $28,000
  ok   defecto     oraculo $83,000 – $102,000    pantalla $83,000 – $102,000    oculto $83,000 – $102,000
  ok   aleatorio   oraculo $243,000 – $297,000   pantalla $243,000 – $297,000   oculto $243,000 – $297,000

  paso actual: 7 · cierre visible: true
  ── lo que sale por el cable ──
     Full-Name         Dana Whitfield          Estimate-Range    $243,000 – $297,000
     email             dana@example.com        Project-Type      New Custom Pool
     Phone             (305) 555-0142          Pool-Size         600 sqft
     ZIP-Code          33139                   Pool-Style        Luxury / Custom Geometry
     Deck-Size         1500 sqft               Interior-Finish   Premium / Polished Finish
     Deck-Material     Pavers                  Spa               Raised Spillover Spa
     LED-Lights        11                      Systems           Heater, Salt System, Automation System
     Outdoor-Add-Ons   Pergola, Louvered Roof System, Outdoor Kitchen
     Site-Conditions   Tight Access, HOA Approval Required
     Cost-Breakdown    Pool Structure: $117,450 · Decking: $33,000 · Spa: $18,000 · …
     ref_id            (vacío)                 __form            Pool Estimator Form
                                               elapsedMs         2433
  estado del formulario: enviado=true gracias=true
```

### LO QUE NO SE HA PROBADO, Y HAY QUE DECIRLO

**Que el correo SALE de verdad, no.** Sigue sin haber `SMTP_USER`/`SMTP_PASS` (bloqueo de la
Fase 8, ya anotado en `docs/ENTREGA.md`). Se ha probado la ruta entera **hasta el borde del
envío**: el cuerpo se compone bien y el endpoint devuelve 500 en vez de mentir. El envío en sí es
el MISMO código que usan los otros dos formularios y tampoco está probado en ninguno de los tres.

Se intentó cerrarlo con un servidor SMTP+TLS de pega en local, y se abandonó tras dos intentos:
el diálogo `AUTH LOGIN` se colgaba y la infraestructura de la prueba estaba costando más que lo
que probaba. La rama del 500 ya registra el cuerpo entero, que es la prueba que hacía falta.
Con unas credenciales de prueba se cierra en cinco minutos y se anota el `messageId`.


## Fase 12c — el estimador, rehecho en fuente propia   ✅ cerrada
**Fecha:** 2026-08-28

Fuera el bundle. `src/components/widgets/Estimador.astro` (marcado de los 7 pasos + panel +
~120 líneas de `<script>`), `src/styles/estimador.css` (293 líneas, **todo bajo
`#pool-estimator`**) y `src/pages/pool-investment-estimator.astro`, la página desnuda escrita a
mano. Borrados `public/pool-investment-estimator/` (5 ficheros) y `scripts/build-estimador.mjs`;
fuera el paso `estimador` de `npm run build`.

| | antes | ahora |
|---|---|---|
| Lo que se sirve | 680 kB de React + Radix + Tailwind minificados, sin sourcemap | **20 kB** de HTML + CSS + JS propios |
| Dependencias nuevas | React, Radix, Tailwind | **ninguna** |
| Cambiar un precio | rehacer la app | una línea en `src/lib/estimador.js` |

**Cero dependencias nuevas de verdad**: los tres controles son `<input type="radio|checkbox|
range">` nativos. Con eso salen gratis el teclado, el lector de pantalla y el `FormData` — y la
selección de la tarjeta se pinta con `:has(input:checked)`, **sin una línea de JavaScript**,
donde el original necesitaba estado de React y un `onClick` en el div.

Las etiquetas de precio del marcado (`Base rate: $110/sqft`, `Heater (+$4,500)`, `Tight Access
(+8% total)`) se componen desde `PRECIOS` en tiempo de build: cambiar un precio mueve el número
Y el texto. En el original había que editar el bundle minificado en dos sitios.

### El resultado, medido

```
npm run check:visual -- /pool-investment-estimator
  1920px  ok  100.00 %      991px  ok  100.00 %
  1440px  ok  100.00 %      479px  ok   99.99 %
  4 iguales · 0 distintas · 0 declaradas          PUERTA VERDE

npm run check:texto -- /pool-investment-estimator
  ok  /pool-investment-estimator                  PUERTA VERDE
```

**El encargo daba por hecho que esta ruta saldría roja en las dos puertas y habría que
declararla. No hace falta: sale verde.** El paso 1 no enseña el formulario y «Step 1 of 7 /
14% Complete» no cambia, así que no hay nada que declarar. Una declaración que no hace falta es
una puerta menos.

### LAS CLASES DEL ORIGINAL MIENTEN, Y HAY QUE SABERLO

El CSS del original es Tailwind v4 (`@layer utilities`) **encima** de normalize.css y de la base
de Webflow, que van SIN capa. Y una regla sin capa le gana a cualquier `@layer`. O sea que media
docena de utilidades no hacen nada y la clase dice una cosa y la pantalla otra:

| Clase que pone | Lo que se ve de verdad | Quién gana |
|---|---|---|
| `text-lg font-semibold` en las etiquetas de opción | **16px / 400** | `label{font-size:16px;font-weight:400}` |
| `mt-2` en los párrafos de descripción | **0 arriba, 10 abajo** | `p{margin:0 0 10px}` |
| `space-x-3` entre casilla y etiqueta | **0 de separación** | — |
| `text-sm font-medium` en los botones | **18px / 400** | `button{font:inherit}` de normalize |
| `font-semibold` en «Heater (+$4,500)» | **400** | `label{font-weight:400}` |
| `size-4` en el pulgar del slider | **2x2 px, invisible** | (ver abajo) |

Reproducir las clases habría dado una página **parecida** y con media docena de tamaños
distintos. Todos los valores de `estimador.css` salen de `getComputedStyle` sobre la app
original, paso a paso.

### Cuatro defectos propios, y los cuatro los cazó la medición, no el ojo

Ninguno se veía a simple vista; los cuatro movían píxeles.

1. **El panel salía 14px alto.** `.pe-cierre` (el formulario del paso 7) es el último hijo del
   panel y está oculto en los pasos 1-6, así que con `> :not(:last-child){margin-bottom}` el
   párrafo de aviso cobraba 24px en vez de sus 10. Arreglado con `> * + *{margin-top}`: lo
   oculto no aporta, y el primer visible nunca cobra.
2. **Y luego 24px corto**, por el arreglo anterior. `.pe-aviso{margin:0 0 10px}` empata en
   especificidad con `.pe-panel-cuerpo > * + *`, va después y gana — el atajo `margin` declara
   también `margin-top:0`. Con `margin-bottom` a secas ya no hay empate que perder.
3. **Todo el contenido de la tarjeta, 14px arriba.** El margen inferior de `.pe-cab-fila` se
   escapaba de `.pe-cab` —que no tiene ni borde ni relleno— y se fundía con el `margin-top` de
   `.pe-cuerpo`. Pasado a `padding-bottom`, que no colapsa.
4. **La base tipográfica baja a 14px por debajo de 992.** Es una regla de la base de Webflow
   (`@media (max-width:991px){body{font-size:14px}}`) que venía en el mismo CSS. Sin traerla, el
   subtítulo y «View Cost Breakdown» se pintaban a 18px: 98,57 % a 991 y 98,60 % a 479, con la
   página **3px más alta**. El porcentaje no señalaba nada; lo señaló comparar la geometría de
   los dos DOM por hitos de TEXTO, que es lo único que funciona cuando las clases ya no coinciden
   (`diag-geometria.mjs` empareja por clases de Webflow y aquí no puede emparejar nada).

### La ÚNICA diferencia deliberada de maqueta: el pulgar del slider se ve

En el original mide **2x2 px y es invisible** — comprobado con `getComputedStyle` y en captura:
la barra se pinta pero no hay tirador que arrastrar. No es una decisión de diseño, es `size-4`
perdiendo contra la base sin capa. Lo demuestra el propio CSS del original, que dice
`#pool-estimator [role=slider]{background-color:var(--gold);border-color:var(--gold)}`: el autor
SÍ quería un pulgar dorado. Aquí se pinta, 16px y dorado.

No afecta a ninguna puerta —los sliders viven en los pasos 2, 5 y 6 y el baseline es del paso
1—, así que se apunta aquí y en `docs/ENTREGA.md` para que el cliente pueda vetarlo.

### El oráculo sigue siendo recapturable

`capturar-oraculo.mjs` servía `public/pool-investment-estimator/`, que ya no existe. Ahora sirve
**`_source/estimator/`** —el insumo congelado— deshaciendo al vuelo el prefijo del host de
Webflow Cloud. Comprobado tras el borrado: el bundle ORIGINAL sigue arrancando y dando
`$83,000 – $102,000`. Mientras esos 5 ficheros estén en git, el oráculo se puede volver a
capturar aunque el dominio ya esté cortado.


## Fase 12b — el modelo en fuente propia, con su puerta   ✅ cerrada
**Fecha:** 2026-08-28

`src/lib/estimador.js` — `PRECIOS`, `POR_DEFECTO`, `SLIDERS`, `calcula()`, `dolares()`,
`LINEAS_DESGLOSE`. Función pura, sin DOM y sin red. **Un solo módulo para dos consumidores**: lo
que ve el visitante y la puerta que lo mide. Dos copias dejarían de ser la misma al primer
arreglo que solo se aplique en un lado, y el síntoma sería un precio distinto en pantalla y en la
puerta.

`scripts/check-estimador.mjs` reproduce los 384 casos del oráculo **en Node, sin navegador** — lo
que importa aquí: las otras puertas piden foco real y una cada vez, y ésta se puede lanzar
mientras se trabaja sin estropear ninguna medición. Va la PRIMERA de la cadena de `npm run check`
porque no necesita el build y falla en 0,2 s.

```
npm run check:estimador

  ok   defecto        1/1        ok   todo-si        1/1
  ok   categorico   162/162      ok   todo-no        1/1
  ok   booleano      11/11       ok   extremos       8/8
  ok   aleatorio    200/200

  384/384 casos reproducidos · oráculo capturado el 2026-08-28
  el oráculo coincidió 10/10 contra el dominio vivo

PUERTA VERDE
```

### Vista en ROJO dos veces antes de darla por buena

Una puerta que nadie ha visto fallar no es una puerta.

**1 · Un precio cambiado.** `pebble: 1.15 → 1.16`:

```
  ROJO defecto        0/1     ROJO categorico   108/162     ROJO aleatorio  124/200
  caso 0 (defecto) — new · 450sqft freeform/pebble · deck 600 pavers
       min 83000 -> 84000
       texto "$83,000 – $102,000" -> "$84,000 – $102,000"
       Pool Structure: $56,925 -> $57,420
       Permits & Engineering: $6,311 -> $6,356
```

Fíjate en los 54 casos `categorico` que **siguen en verde**: son los de `plaster` y `premium`,
que no tocan ese multiplicador. La puerta discrimina, no dice «rojo» a todo.

**2 · «Arreglar» la incoherencia del HOA.** Multiplicando también la línea del desglose por el
recargo, que es lo que uno haría sin pensar:

```
  ROJO booleano 9/11   ROJO todo-si 0/1   ROJO aleatorio 45/200
  caso 174 (todo-si) — Site Conditions: $72,971 -> $87,565
```

**155 casos.** Esto es la prueba de que la rareza es real y carga peso, no un detalle cosmético:
«arreglarla» le cambiaría el precio a más de un tercio de los casos medidos. Se replica.

### Las dos incoherencias del original, replicadas y anotadas

Van a «Mejoras candidatas NO aplicadas» (filas 9 y 10). Ninguna se arregla: cambiar un precio sin
que lo apruebe el cliente es cambiarle el negocio.


## Fase 12a — el oráculo del estimador, capturado antes de tocar nada   ✅ cerrada
**Fecha:** 2026-08-28

### Por qué esto va primero

`/pool-investment-estimator` es una **función pura**: misma entrada, misma salida, cero llamadas
de red. Eso la convierte en un oráculo con el que verificar que la app nueva calcula igual — y el
oráculo **desaparece en cuanto se sustituya el bundle o se corte el dominio**, o sea en cuanto
empiece el trabajo. Este proyecto ya estuvo a punto de perder un dato equivalente (el orden manual
de las colecciones, rescatado in extremis en `_source/orden-listas.json`). No se repite.

### Lo capturado

```
node scripts/capturar-oraculo.mjs --vivo

── capturando 384 casos del bundle ACTUAL (local)
  local  384/384  373s   ultimo: $105,000 – $129,000
── referencia de maqueta del paso 1 (caduca con el bundle)
  1920px  alto 1080  54 elementos     991px  alto 1128  54 elementos
  1440px  alto  900  54 elementos     479px  alto 1315  54 elementos
── 10 casos contra el dominio VIVO (el bundle portado contra el original)
  vivo    10/10  13s   ultimo: $169,000 – $206,000

  384 casos · 209 rangos distintos
  contra el vivo: 10/10 iguales
  tipografía efectiva: Inter, sans-serif
```

| Bloque | Casos | Qué cubre |
|---|---|---|
| `categorico` | 162 | la combinatoria COMPLETA: proyecto × estilo × acabado × material × spa |
| `aleatorio` | 200 | los 19 controles, con LCG de semilla fija (20260828): la tanda es reproducible |
| `booleano` | 11 | cada casilla volteada una a una desde el estado por defecto |
| `extremos` | 8 | **los sliders en su mínimo y en su máximo**: piscina {250,900} × deck {200,1500} × LED {0,12} |
| `todo-si` / `todo-no` | 2 | todo encendido con los tres sliders al máximo, y todo apagado al mínimo |
| `defecto` | 1 | el estado inicial |

**Por caso se guardan 8 valores, no 1**: el rango, su texto literal, el subtítulo y las hasta 7
líneas de «View Cost Breakdown». Un modelo equivocado puede acertar un rango por casualidad —la
salida está redondeada al millar—; no puede acertar el desglose entero 384 veces.

### El hallazgo que cambia el trabajo: el modelo NO estaba perdido

El bundle está minificado pero **no ofuscado**. El objeto de precios sobrevive literal en
`_source/estimator/PoolEstimatorPage.Cy-Yd7Xu.js` (byte ~190.100), y con él la fórmula, los 19
estados por defecto, los 7 títulos, todos los textos y los 12 iconos de `lucide-react` con su
`path`. Comprobado a mano contra el oráculo, sin navegador, en los dos extremos:

| | `todo-si` (900 sqft · luxury · premium · 1500 travertine · todo ✓) | `todo-no` |
|---|---|---|
| Pool Structure | 900×145×1,35 = **176 175** ✓ | 250×85×1,0 = **21 250** ✓ |
| Permits | (176175+52500)×0,09 = **20 580,75 → $20 581** ✓ | **$2 129** ✓ |
| Site Conditions | 357 355,75×0,20 + 1500 = **$72 971** ✓ | (no sale) ✓ |
| Rango | (358 855,75×1,20)×0,9/1,1 → **$388 000 – $474 000** ✓ | **$23 000 – $28 000** ✓ |

O sea: el oráculo pasa de ser *la única fuente del modelo* a ser *la prueba contra la que se
verifica un modelo ya recuperado*. Es una posición mucho mejor.

### Dos cosas que se midieron porque también caducan

- **La tipografía efectiva es `Inter, sans-serif`.** No era evidente: el CSS del bundle importa
  18 familias de Google Fonts y define `--default-font-family: var(--font-geist-sans)`, una
  variable **que no existe en ninguna parte del fichero**. Había que medirlo, no deducirlo. Inter
  ya está auto-alojada en `src/styles/fuentes.css`, así que la app nueva no necesita Google Fonts.
- **La geometría del paso 1 en los 4 anchos** (54 elementos con su `top`, alto y ancho), en
  `_source/estimator-referencia.json`. Es la referencia contra la que se mide la maqueta nueva
  cuando `diag-geometria.mjs` ya no pueda preguntarle al dominio.

### Dos fallos propios, los dos silenciosos

Ninguno de los dos habría petado: los dos habrían escrito un oráculo con datos falsos.

1. **`querySelector('.text-5xl')` devolvía «600», no el rango.** El paso 5 pinta los pies
   cuadrados del deck con esa misma clase y va ANTES en el documento. Reventó en el caso 4 porque
   «600» no parsea como rango; si el deck hubiera medido «$83,000» habría pasado. Ahora el rango
   se ancla al párrafo «Estimated Investment Range» y se lee su hermano.
2. **`'Step 1 of 7'.replace(/\D+/g,'')` da `17`, no `1`.** El asistente se creía en el paso 17 y
   pulsaba «Back» eternamente. Ahora el número sale del grupo de la expresión.

### Verde es

`_source/estimator-casos.json` (316 kB, versionado) con 384 casos, 0 fallos de captura, y **10/10
coincidiendo contra el sitio vivo** — lo que además demuestra que el bundle portado en la Fase 5 y
el original de Webflow dan exactamente lo mismo.


## Fase 10 — Puertas de verificación   🟡 8 de 10
**Fecha:** 2026-08-27

### Las que hay
| Script | Comprueba | Estado |
|---|---|---|
| `check:assets` | 10 checks del pipeline de assets | ✅ verde |
| `check:baseline` | el baseline es completo y determinista | ✅ verde |
| `check:cascaron` | nav y pie contra el vivo, por geometría | ✅ verde |
| `check:rutas` | 115/115, 0 de más, 0 referencias a Webflow | ✅ verde |
| `check:enlaces` | enlaces, assets locales y **git ↔ despliegue** | ✅ verde |
| `check:seo` | el `<head>` de las 115 | ✅ verde |
| `check:texto` | `innerText` **100 % idéntico** | ✅ verde |
| `check:ix2` | invisibles, transform residual, scroll-x, interacción | ✅ verde |
| `check:visual` | diff de píxeles contra el baseline | ⬜ **falta** |
| `check:lighthouse` | Perf/A11y/BP/SEO ≥ el actual | ⬜ **falta** |

`npm run check` las encadena todas.

### LO QUE CAZÓ `check:enlaces`, Y ES GRAVE
**601 ficheros que `dist/` pide por ruta local NO estaban en `git ls-files`.** 428 MB de
imágenes de colección y los 54 PDF.

Desplegando por `git push` habrían sido **601 assets rotos en producción con todas las demás
puertas en verde**. Es el desastre de Pergola Plus calcado: allí fueron 507 ficheros y 429 URLs
rotas, y la puerta de entonces no podía verlo porque miraba **el disco** — el disco de la
máquina donde el instalador acaba de dejarlo todo.

Lo mejor es que **estaba predicho**. El `.gitignore` de la Fase 2 decía, con estas palabras:
«su destino es SANITY y las páginas lo pedirán por URL del CDN de Sanity, no por ruta local.
**Si en la Fase 6 alguna página acaba pidiendo una de estas rutas en local, HAY QUE
VERSIONARLA.**» Pasó exactamente eso, porque las páginas se generan desde el HTML del vivo.

Versionados: **428 MB**, el repo pasa de 267 MB a ~700 MB. Es caro y se sabe. Deja de serlo el
día que las 7 plantillas lean de Sanity y las imágenes se pidan a su CDN.

Probada en rojo desversionando un fichero: `728/729 — 1 fuera de git`. Verde al devolverlo.

### Enlaces rotos: 342, y ya lo estaban
Todos a `/commercial-services/…`. Comprobado contra el vivo: **404 también allí**. Se replican
(contrato) y quedan declarados uno a uno con su motivo, más una fila en mejoras candidatas: son
342 enlaces del menú y el pie que no llevan a ninguna parte.

### Abierto
- **`check:visual`** — es la que falta de verdad. Ojo con el diseño: ya se demostró en la Fase 4
  que «≥99 % de píxeles» sobre una banda casi vacía deja pasar un elemento movido 6 px. Para
  páginas completas el porcentaje sí discrimina, pero la tolerancia hay que calibrarla (0.3 tras
  el reescalado a 1/4, medido).
- **`check:lighthouse`** — recordar que el Lantern móvil en localhost revienta con `NO_LCP` y
  tapa el Performance en ~92 aunque la página sea rápida. Fiarse del desktop y de la URL
  desplegada.
- **`check:formularios`** — no se puede escribir hasta tener credenciales de correo.

## Fase 11 (parcial) — el sitio está en Vercel, con el DNS intacto   🟡

**28-ago-2026.** 🔗 <https://mrandmrs-outdoor-living-rajppfro3-senaviacorp.vercel.app>
Panel: <https://vercel.com/senaviacorp/mrandmrs-outdoor-living> · `dpl_9RFx72oKaFo8WBoBkHqbvqf4F826`

### No se pudo enlazar el repo, y eso decidió la vía

Las dos rutas de API fallaron de forma consistente en dos endpoints distintos:

```
VERCEL_CREATE_PROJECT       -> "You need to add a Login Connection to your GitHub account first"
VERCEL_CREATE_NEW_DEPLOYMENT-> "The provided GitHub repository can't be found"
```

Y a mitad de los intentos el token de GitHub del CLI **quedó revocado**
(`gh auth status: The token in keyring is invalid`), señal de que la autorización se estaba
rehaciendo. La *Login Connection* de Vercel es del USUARIO y es distinta de dar acceso al
repositorio en GitHub; conceder lo segundo no arregla lo primero.

**Lo que decidió la vía no fue la comodidad, fue el contenido:** el repo en GitHub está en
`4a1bba7`, de ANTES del trabajo de hoy. Enlazarlo habría desplegado el estado viejo. El CLI sube
`.vercel/output`, que es el build de hoy — 115 páginas y la función de render.

En la máquina ya había sesión del CLI con la cuenta correcta (`vercel whoami` → `senavia-corp`),
así que no hizo falta ni instalar globalmente (`npx vercel`) ni tocar ninguna credencial.

### ⚠️ Vercel lo puso en PRODUCCIÓN, no en preview

No se pasó `--prod`. Es el comportamiento de Vercel con el primer despliegue de un proyecto:

> *"This is the project's first deployment, so it was assigned to production."*

**El DNS no se ha tocado** —`mrandmrsoutdoorliving.com` sigue en Webflow— así que esto no afecta
al sitio del cliente. Y lo que protegía de verdad aguantó: **`PUBLIC_ES_PRODUCCION` sin definir
sigue emitiendo `noindex`**, comprobado sobre el despliegue real y no sobre el build local.

### Verificado SOBRE EL DESPLIEGUE

El proyecto trae la protección de despliegue activada por defecto (302 al login para quien no
esté en el equipo), así que la verificación va por `vercel curl`, que autentica:

| Comprobación | Resultado |
|---|---|
| `<meta name="robots">` | `noindex, nofollow` ✅ · sin canónica |
| Referencias a `website-files.com` / Elfsight | **0** / **0** |
| Páginas servidas desde Sanity | `/pool-builders/alachua-florida` 130 kB, h1 correcto |
| **El arreglo de los `alt`** | Alachua→«Alachua», Boca Raton→«Boca Raton», Weston→«Weston» |
| `/gallery`, `/services/…` | correctas |

### Abierto

- **La protección de despliegue sigue activada.** Para enseñárselo al cliente hay que quitarla;
  no se toca por iniciativa propia porque hace el sitio públicamente alcanzable.
- **El repo sigue sin enlazar**, así que no hay despliegue automático por push. Cuando la
  *Login Connection* esté de verdad: `vercel git connect --scope senaviacorp`.
- **El corte de DNS no se ha hecho ni se hará sin aprobación de Sebastian.**
- El trabajo de hoy sigue **sin comprometer ni subir**: falta el veredicto de `check:visual`.

## Fase 8 (reabierta) — el cableado de formularios cogía TODOS, no solo los dos de lead   ✅ cerrada

**28-ago-2026.** `check:visual` llevaba días en rojo por 5 comparaciones de 460, y el porcentaje
no señalaba nada: «98,71 %, diferencia repartida por toda la página». Se escribieron dos
diagnósticos —`diag:visual` (en qué banda cae la diferencia) y `diag-geometria.mjs` (qué elemento
del DOM se separa del vivo)— y el segundo lo dijo en una línea:

```
$ node scripts/diag-geometria.mjs /gallery 1920
  solo en local (5): input#0, div.mm-llamar#0, …
   y   339  div.gallery-filter-form.w-form#0    dTop 0   dAlto 2
```

### El defecto

`build-paginas.mjs` hacía `for (const form of n.querySelectorAll('form[data-name]'))` y a **todos**
les ponía `action="/api/formulario"` y `data-mm-envia="1"`. Pero no todo `<form>` de Webflow envía
nada: `/gallery` y `/brochures` tienen formularios de **filtro** de Finsweet —un `<select>` y unos
checkboxes que solo filtran la lista—. Consecuencias, en orden de gravedad:

1. **`Formularios.astro` les montaba un widget de Turnstile** en páginas que no recogen ningún
   dato. Un captcha donde no hay envío es ruido y una petición a Cloudflare por página.
2. Si alguien los hubiera enviado, el endpoint responde **400 «formulario desconocido»**: esos
   nombres no están en su tabla. O sea que el cableado llevaba a un error garantizado.
3. El honeypot añadía un hijo al `<form>`, que es `display:grid`, y eso **desplazaba 2 px** las
   181 fotos de `/gallery`.

La lista de formularios de lead ya existía en `src/pages/api/formulario.ts`. Ahora el generador
usa la misma: si un formulario no está ahí, no se toca.

### Medido, contra el sitio VIVO

```
$ node scripts/diag-geometria.mjs /gallery 1920      # despues
  645 elementos comunes · 0 con desvio
  sin desvios de geometria: la diferencia es de PINTADO, no de maqueta

$ npm run check:visual -- /gallery /brochures /country/…broward /country/…palm-beach
  1920  /gallery    98.71 % -> 99.99 %
  1440  /gallery    98.29 % -> 99.98 %
   991  /brochures  ->  99.96 %      1920 -> 99.98 %      1440 -> 99.98 %
```

### Lo que resultó NO ser un defecto

- **`/brochures` a 479.** El sitio vivo tiene **Turnstile inyectado por Cloudflare en todos los
  formularios**, incluido el de filtro:
  `<div><div><input type="hidden" name="cf-turnstile-response" …></div></div>`. Ese formulario es
  `display:grid; gap:16px`, así que a una columna el nodo vacío añade **una fila de 16 px**; a
  anchos mayores cae en la segunda columna y no suma nada. Mi build no lo tiene porque no pone
  captcha donde no hay envío. Va a «Mejoras candidatas» (fila 8) y se **declara en la puerta,
  pero solo a 479**: `check:visual` aprendió a aceptar `{ anchos: [479], motivo }` además de un
  texto suelto. Declarar la ruta entera por una diferencia que solo existe a 479 habría apagado
  la puerta también a 1920, 1440 y 991 — y ahí es donde vive casi todo el contenido. Una
  declaración que tapa más de lo que explica es una puerta menos.
- **La tercera imagen de `/country/…-broward`** parecía cambiada
  (`florida-custom-pool-builders-modern-backyard.avif` en el vivo,
  `south-florida-custom-pool-builders-modern-backyard-design.avif` en el mío). Es **el mismo
  fichero renombrado por el deduplicado**: `sha256 b31af196…` y 115 158 bytes en los dos,
  verificado bajando el original del CDN. El nombre local sale de la primera referencia que lo
  usó, que estaba en `where-we-serves`.

## Fase 1 (reabierta) — el carrusel de pasos autoavanzaba, y la captura no lo paraba   ✅ cerrada

**28-ago-2026.** `check:texto` pasó de 115/115 a **rojo en 10 de las 14 fichas de `/services/`**,
todas con el mismo síntoma: «faltan 2 líneas, sobran 2».

### No era el sitio nuevo: era la captura

Las fichas de servicio traen **código propio del sitio** —no IX2, no Finsweet— que autoavanza
los pasos del proceso cada 5 s y esconde los inactivos:

```
$ python3 -c "…"   # sobre baseline/html/services_pool-remodeling-…html
<div role="listitem" class="process-content-item w-dyn-item"
     style="display: none; opacity: 0; transform: translateY(-10px); transition: opacity 0.3s, transform 0.3s;">
```

`innerText` **no ve lo que está en `display:none`**, así que el baseline guardó el texto del paso
que tocara en ese instante y la puerta leyó el de otro: 2 líneas de menos y 2 de más, que son el
`<h2>` y el `<p>` de un paso cambiados por los de otro. El script es EL MISMO en los dos lados
—va horneado en la página, verificado con `grep -c goToStep` sobre lo desplegado—, así que el
sitio nuevo se comporta igual que el viejo. Lo que fallaba era comparar dos fotos tomadas en
momentos distintos de una animación.

Es la **sexta fuente de no determinismo**, y la Fase 1 solo neutralizó cinco. Las otras cinco se
encontraron leyendo el HTML antes de capturar; esta no se veía ahí, porque el marcado es idéntico
y lo único que cambia es *cuándo* miras.

### Se para con el mecanismo del propio sitio

El script expone su propio freno —`section.addEventListener('mouseenter', stopAutoplay)`— así que
no hace falta inventar nada ni tocar temporizadores:

```js
// scripts/lib/captura.mjs, paso 5a
document.querySelector('.process-step-item').dispatchEvent(new MouseEvent('click', …));  // fija el paso 0
await pag.waitForTimeout(900);                                                            // 300 salida + 420 entrada
document.querySelector('.process-section').dispatchEvent(new MouseEvent('mouseenter', …)); // para el autoplay
```

El `mouseenter` va **después** del clic y no antes: pulsar un paso llama a `startAutoplay()` al
final, así que pararlo primero no serviría de nada. Mismo patrón que el `pointerdown` del slider
de Finsweet en la Fase 7.

Como la receta vive en `scripts/lib/captura.mjs` y la importan **tanto la captura del baseline
como todas las puertas de navegador**, arreglarla en un sitio la arregla en los dos. Esa fue la
razón de compartirla desde el principio.

### Recaptura

El origen sigue vivo (`HTTP 200`), así que el baseline de las 14 fichas se rehízo con la receta
corregida en vez de declarar las 10 páginas como «distintas a propósito»:

```
$ npm run baseline -- --ruta /services/ --forzar
```

### Y una SÉPTIMA fuente: el asentado esperaba un número, no un estado

Los 900 ms tras volver arriba se eligieron porque el nav tarda 500. Pero volver arriba mete otra
vez en pantalla los elementos de la primera pantalla, y sus revelados duran **1000 ms**: la
captura los cogía a media transición. Y como **una opacidad a medias no es 0**, la comprobación
de invisibles del paso 6 los daba por buenos.

Síntoma: la MISMA página contra el MISMO baseline, dos corridas seguidas.

```
$ node scripts/diag-visual.mjs /country/custom-pool-builders-broward-county-fl 479
  2772 pixeles distintos (98.67 % iguales)     <- primera
   736 pixeles distintos (99.65 % iguales)     <- segunda, misma entrada
```

Un umbral no distingue eso de una regresión de verdad, y eso es exactamente lo que convierte una
puerta en decoración.

No se puede preguntar «¿ha acabado la animación?» sin saber qué motor la mueve: IX2 usa estilos
en línea y `requestAnimationFrame`, así que `document.getAnimations()` no la ve. Se pregunta lo
único válido para cualquier motor: **¿ha cambiado algo entre dos muestras?** Se muestrea
`opacity` y `transform` de todo lo animable cada 250 ms y se sigue hasta que dos lecturas
seguidas salen iguales, con techo de 3 s.

```
$ for i in 1 2 3; do node scripts/diag-visual.mjs /country/…broward 479; done
  2772 pixeles distintos (98.67 % iguales)
  2772 pixeles distintos (98.67 % iguales)
  2772 pixeles distintos (98.67 % iguales)
```

Estable. Y como ahora el número no se mueve, **el baseline entero se rehizo con la receta
corregida**: el que había se tomó a media animación, y comparar dos recetas distintas es
justamente lo que el diseño de receta compartida existía para impedir.

### Y un defecto de robustez que costó 40 minutos

La recaptura completa **murió en la ruta 44 de 115, del segundo de cuatro anchos**:

```
   43/115 /pool-builders/gainesville-florida    6580px  137k 11.6s
page.evaluate: Execution context was destroyed, most likely because of a navigation.
    at asentar (scripts/lib/captura.mjs:68)
```

`/pool-builders/gulf-stream-florida` navegó sola después de que `goto` diera la página por
cargada, y eso destruyó el contexto en medio de la sonda de foco. La excepción subió sin que
nadie la cogiera y se llevó por delante la corrida entera: **40 minutos tirados que además no
decían nada de las otras 416 capturas**.

Que una página se porte raro es normal; que eso mate el proceso es un defecto del script. Ahora
el asentado va en `try/catch`: se reintenta **una vez** recargando, y si vuelve a fallar esa
captura se anota como error y **la corrida sigue**. Quien tiene que ponerse en rojo por una
captura que falta es `check:baseline`, que exige 460 de 460 — no el proceso reventando.

Y para reanudar sin repetir lo bueno: la captura ya salta las rutas que tienen JPG cuando no se
le pasa `--forzar`, así que basta con borrar **solo** las que quedaron sin rehacer. Se rehicieron
304 en vez de 460.

**Y el mismo defecto estaba en `check:visual`**, que no lo tenía arreglado: con la máquina
saturada, `page.screenshot: Timeout 120000ms exceeded` mató la comparación **4 de 460**. Ahora
cada ruta va en `try/catch`: la que no se pueda medir se cuenta **en rojo con su motivo** y la
corrida sigue. No se cuela nada —la puerta acaba en rojo igual— pero se entera uno de las otras
456 en vez de quedarse sin nada.

Lección de las dos: **una puerta que revienta no es estricta, es frágil.** Lo estricto es contar
el fallo y seguir midiendo.

### Abierto

- La ruta `/` dio **`medicion invalida {"foco":true,"oculto":false,"fotogramas":4}`** en una de
  las corridas: la sonda pide ≥8 fotogramas en 400 ms y vio 4. Es la sonda haciendo su trabajo
  —se niega a medir en vez de dar un número malo— pero indica que la máquina iba cargada. Si se
  repite con la ventana en primer plano y sin nada más corriendo, entonces sí es un defecto.

## Fase 6b — `pool-builders` deja de ser 53 ficheros y pasa a leer de Sanity   🟡 1 de 7 familias

**28-ago-2026.** Hasta hoy los 511 documentos de Sanity estaban importados y verificados, y no
los leía nadie: las 101 fichas de colección eran 101 `.astro` con el HTML horneado. Un CMS que
no alimenta ninguna página no es un CMS, es una copia de seguridad cara.

### La plantilla no se escribe: se deriva por diff

Escribir a mano una plantilla de 800 tokens de marcado de Webflow es la vía rápida a un sitio
«casi igual», y nadie sabría decir qué se perdió. `scripts/build-plantillas.mjs` lo hace al
revés: tokeniza las N páginas ya generadas de una familia y **lo que coincide en las N es
literal; lo que varía es un hueco**. Después cada hueco busca dueño: un campo de Sanity cuyo
valor, escapado igual que lo escapa el sitio, sea EXACTAMENTE el del hueco **en las N**. Un
campo que casa en 52 de 53 no vale — eso es una coincidencia, no una correspondencia.

Los huecos no van solo en nodos de texto. De `<img src="…" loading="lazy" data-w-id="…"
alt="…" class="image">` **solo cambia el `alt`**, así que se trocea **atributo a atributo**;
meter la etiqueta entera como hueco habría obligado a guardar en el CMS el `data-w-id` de
Webflow y las clases de maquetación.

Y el valor tampoco tiene por qué ocupar el token entero. El emparejado no pregunta «¿es el token
igual al campo?» sino «¿parten las N cadenas por ese valor en los MISMOS trozos?». Con eso caben
en la misma regla el caso exacto, el valor con un `\n` detrás, el valor incrustado en un JSON, y
el valor que sale **dos veces** en el mismo token —la URL de una imagen aparece en el `src` y otra
vez en el JSON del lightbox—.

**Y se elige el candidato más largo, y antes el que casa entero.** Sin esa regla la partición
encontraba campos cortos que «también encajan»: el párrafo «Homeowners trust us for custom pools
& outdoor living in **Alachua**. Read our reviews.» lo explicaba `name` = «Alachua» con todo lo
demás de literal, en vez de `paragraphReviews`. Reproducía la página byte a byte **y aun así era
falso**: editar ese párrafo en el CMS no habría cambiado nada. Byte-exacto no implica bien
mapeado, y la autocomprobación sola no distingue los dos casos.

### La autocomprobación, que es la parte que importa

Antes de borrar una sola página, la plantilla se renderiza para las N y se compara **byte a
byte** con la página que ya existía. `check:texto` lo habría cazado después, pero para entonces
los originales ya estarían borrados — y una red que solo avisa cuando ya no puedes volver atrás
no es una red.

```
$ node scripts/build-plantillas.mjs --dry-run

  pool-builders     53 paginas · OK 53/53 identicas byte a byte · 13 huecos → h1Title, h2Title,
                    intro, imagenIntro1.alt, imagenIntro2.alt, imagenIntro3.alt, headingIntro,
                    paragraphIntro, paragraphReviews, paragraphFeatures, paragraphPortfolio,
                    paragraphBlog
  services          14 paginas · NO uniforme (835..851 tokens): listas de CMS de largo variable
  project           10 paginas · NO uniforme (125..133 tokens): listas de CMS de largo variable
  blogs             10 paginas · NO uniforme (654..1864 tokens): listas de CMS de largo variable
  country            9 paginas · NO uniforme (947..1075 tokens): listas de CMS de largo variable
  articles           3 paginas · NO uniforme (83..106 tokens): listas de CMS de largo variable
  where-we-serves    2 paginas · NO uniforme (1293..1333 tokens): listas de CMS de largo variable
```

### 🔴 Lo que destapó: en Sanity, 52 de 53 ciudades decían «Alachua»

La primera corrida dejó 3 huecos sin dueño — los `alt` de las tres imágenes de intro. El motivo
no era el código:

```
   attr alt varia → campo: NINGUNO
      imagenIntro1.alt: fallan 52/53 · ej archer-florida
         sanity: "…manicured lawn and pergola lounge in Alachua, FL."
         html  : "…manicured lawn and pergola lounge in Archer, FL."
```

**Causa.** `import.mjs` sacaba el `alt` de `assetLocal()`, que lo lee del **manifiesto**, y el
manifiesto está indexado **por contenido**: las 53 ciudades comparten el mismo fichero de imagen
—mismo sha256, deduplicado en la Fase 2— así que las 53 heredaban el alt de la primera ficha
que lo usó. El CSV traía el alt por fila (`Metadata Imagen Intro 1`) y `schema-map.mjs` ya sabía
qué columna va con qué imagen (`c.alt`); solo faltaba usarla.

**Por qué ninguna puerta lo vio.** Las páginas eran estáticas y llevaban el alt bueno horneado
desde el HTML vivo. El defecto solo existía en Sanity, y Sanity no pintaba nada. Habría salido
a producción el día que el CMS pasara a ser la fuente: 52 páginas con el `alt` de otra ciudad
—accesibilidad y SEO— sin que ninguna comparación contra el baseline se moviera un píxel.

```
$ npm run import:dry && npm run import
  con alt de «Alachua» en imagenIntro1: 1 (antes: 53)
   alachua-florida          …icured lawn and pergola lounge in Alachua, FL.
   archer-florida           …nicured lawn and pergola lounge in Archer, FL.
   atlantis-florida         …cured lawn and pergola lounge in Atlantis, FL.
  ✅ import completo   (519 documentos)
```

Afecta a **todas** las familias con imágenes compartidas, no solo a `pool-builders`; por eso se
arregló el importador y se relanzó el import entero en vez de parchear 52 documentos.

### Defecto propio, corregido

**`PID is not defined` al construir.** Astro extrae `getStaticPaths` a su propio módulo para el
prerender, y allí no existe ninguna constante del módulo de la página. Las constantes del
proyecto y el dataset van **dentro** de la función. No es un error de escritura: compila y
revienta en el build.

### Qué queda dentro y qué fuera del CMS

`SEO.meta` y `SEO.jsonLd` **no** salen de Sanity: son el `<head>` medido del sitio vivo y
`check:seo` los compara contra el baseline. Regenerarlos desde el CMS sería producir un JSON-LD
distinto del que hay hoy, que es justo lo que el contrato prohíbe. Viven en
`src/data/seo-pool-builders.json`, derivado. El `titulo` y la `descripcion` sí salen de Sanity
(`seo.title` / `seo.description`), porque se demostró que reproducen el byte exacto.

El build **depende ahora de la red**: si Sanity no responde, `getStaticPaths` lanza y el build
para. Es deliberado — una colección que desaparece en silencio son 53 URLs que devuelven 404
con el despliegue en verde.

### Segunda pasada: los campos que valen lo mismo en las 53

El diff, por definición, solo abre hueco donde algo **cambia**. Pero `headingReviews` vale «What
Our Clients Say» en las 53 ciudades, así que quedaba de literal: el campo existía en Sanity, se
veía en el estudio, y **editarlo no habría cambiado nada en la página**. Un CMS con campos que no
hacen nada es peor que no tenerlos, porque nadie se entera hasta que alguien edita uno y se
pregunta por qué no pasa nada.

Una segunda pasada los convierte en hueco, con dos condiciones para no inventarse
correspondencias: el valor tiene que aparecer **exactamente una vez** en toda la plantilla y
medir **8 caracteres o más** —con menos, una palabra corriente casaría en cualquier trozo de
marcado—. Pasan por la misma autocomprobación byte a byte que el resto.

Resultado: **13 huecos → 18**. Entran `headingReviews`, `headingPortfolio`, `headingBlog`,
`headingFeature` y `heading3DRendering`.

### Medido

| Métrica | Antes | Ahora |
|---|---|---|
| Ficheros en `src/pages/pool-builders/` | 53 | **1** |
| Campos del CMS que de verdad pintan | 0 | **18** |
| Rutas construidas de esa familia | 53 | **53** |
| Reproducción byte a byte de las 53 | — | **53/53** |
| Documentos que alimentan páginas | 0 de 511 | **53** |
| `check:rutas` | verde | **verde**, 115 páginas, 0 de más |
| `check:enlaces` | verde | **verde**, 729/729 en git |

### Abierto

- **6 familias de 7 siguen estáticas** (48 páginas), y ya se sabe exactamente qué le falta a
  cada una. El generador aprendió a sacar las listas del esqueleto —cada RUN de `w-dyn-item`
  hermanos se sustituye por UN marcador antes de comparar, porque el número de items es justo
  lo que cambia— y con eso **`services`, `project`, `country` y `where-we-serves` alinean
  exactas**. Lo que queda son huecos concretos, no un problema de forma:

  | Familia | Pág. | Huecos sin dueño | Qué falta |
  |---|---|---|---|
  | `services` | 14 | 19 | rutas locales de imagen dentro de listas anidadas |
  | `country` | 9 | 3 | ídem |
  | `where-we-serves` | 2 | 5 | ídem |
  | `project` | 10 | 2 | ver abajo |
  | `blogs` | 10 | — | el cuerpo es texto enriquecido (529..1739 tokens, estructura distinta por ficha) |
  | `articles` | 3 | — | ídem |

  **Y el que decide el resto: el ORDEN de las listas es manual y no está en los datos.** La
  lista de ciudades de una ficha de condado es una **referencia inversa** —las ciudades apuntan
  al condado, no al revés— y eso se resuelve con `references(^._id)`; los recuentos cuadran
  exactos en las 9 fichas (8/16/1/2/1/4/3/17/1, idénticos a `count(*[_type=="poolBuilder" &&
  references(^._id)])`). Pero el ORDEN en que se pintan no es `name`, ni `_createdAt`, ni `_id`,
  ni el de las filas del CSV: en Broward los índices del CSV salen `52, 50, 44, 38, 40, 39, 37,
  29…`, con inversiones. Es el orden **manual de la colección de Webflow**, que el export no
  conserva y que en Sanity no existe. Reproducirlo exige extraerlo del HTML vivo y guardarlo
  como campo de rango — y hay que hacerlo **antes** de que caduque el dominio.

  ✅ **Rescatado el mismo día**, sin esperar a cablearlo: `npm run orden`
  (`scripts/extract-orden.mjs`) lee `baseline/html/`, saca de cada lista la secuencia de slugs y
  la funde en un orden global por colección con un topológico. Sale
  `_source/orden-listas.json`, **397 KB versionados**:

  | Colección | Listas | Elementos | Orden global |
  |---|---|---|---|
  | `poolBuilder` | 119 | 53 | **53, sin contradicciones** ✅ |
  | `county` | 4 | 9 | 9 ✅ |
  | `serviceRegion` | 17 | 2 | 2 ✅ |
  | `service` | 116 | 14 | **no existe** 🔴 las páginas se contradicen |
  | `blogPost` | 74 | 10 | **no existe** 🔴 |
  | `project` | 67 | 10 | **no existe** 🔴 |

  Que tres colecciones no tengan orden global **no es un fallo del rescate, es el dato**: sus
  listas de «relacionados» van en órdenes distintos según la ficha. Por eso el fichero guarda
  **las secuencias crudas además de la fusión** — quedarse solo con la fusión habría perdido
  justo el dato de las tres familias que más lo necesitan. Tras el corte de dominio ese fichero
  es la única copia que queda.

  Y la fusión no se da por buena porque salga: se comprueba que **reproduce todas las listas
  observadas**, que es lo único que la valida.

```
  serviceRegion   17 listas · el orden global las explica TODAS: True
  poolBuilder    119 listas · el orden global las explica TODAS: True
  county           4 listas · el orden global las explica TODAS: True
```

  Dos obstáculos reales, medidos:
  1. **`project`**: un nodo de texto acaba con `\n` en nueve fichas y **sin él en la décima**.
     Ese byte no sale de ningún campo del CMS, así que la plantilla no lo puede reproducir.
  2. **El `<script type="text/x-wf-template">` de Webflow** lleva el HTML del primer item de la
     lista **URL-codificado**. Se sabe reconstruir —es la unidad de repetición codificada— pero
     sería la única pieza derivada de otra derivada, y hoy no se hace.
  3. **`blogs` y `articles`** exigen renderizar Portable Text, y un Portable Text renderizado
     **no se puede demostrar idéntico byte a byte** al HTML que produjo Webflow. Esa familia no
     entra hasta que haya otra forma de probarlo.

  **No se han tocado**: cada familia entra entera y con las N fichas reproducidas byte a byte,
  o no entra.
- Los **428 MB de imágenes** siguen en git. Sacarlos exige que las 7 familias lean de Sanity.
- El `alt` de las otras familias está corregido en Sanity pero **nadie lo lee todavía**, así que
  no hay puerta que lo defienda hasta que se cableen.

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

### ↩️ CERRADO DESPUÉS: lo que quedaba de la Fase 7
Medido en el navegador, no supuesto:

| Componente | Medido |
|---|---|
| `w-lightbox` | 137 imágenes en 1 grupo, abre en «1 / 137» y navega |
| Marquee | 14 logos → 28 duplicados, `--mm-dur: 17s`, animación corriendo |
| Slider | 10 diapositivas, `scrollWidth 11870 / clientW 1187`, las flechas desplazan |
| **Antes/después** | al 50 % la imagen «after» mide 315 px y la línea está en 315; arrastrando al 25 % pasan a 472 y 157. Con `role="slider"` y flechas del teclado |
| **`w-tabs`** | 4 enlaces / 4 paneles en las 9 fichas de condado; al pulsar el 3.º se activa el panel 2 y queda en `display:block`. Con `role="tablist"` |

El antes/después y los tabs se reimplementan **con el mecanismo del sitio**: el CSS ya trae
`.bas-image-after-h{width:50%}` y `.w-tab-pane{display:none}`, así que arrastrar solo mueve ese
50 % y cambiar de pestaña solo mueve la clase. Nada inventado.

Queda únicamente la **paginación de `/where-we-serve`** (1 uso).

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
