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
| F2 | Assets locales | ↩️ reabierta y cerrada | 2026-08-27 |
| F3 | Sanity: esquemas + import | ✅ cerrada | 2026-08-27 |
| F4 | Cascarón Astro | ⬜ pendiente | |
| F5 | Páginas estáticas | ⬜ pendiente | |
| F6 | Páginas de colección | ⬜ pendiente | |
| F7 | Animaciones e interacciones | ⬜ pendiente | |
| F8 | Formularios y terceros | ⬜ pendiente | |
| F9 | Paridad SEO | ⬜ pendiente | |
| F10 | Puertas de verificación | ⬜ pendiente | |
| F11 | Deploy y corte de dominio | ⬜ pendiente | |

Estados: ⬜ pendiente · 🟡 en curso · ✅ cerrada · 🔴 bloqueada · ↩️ reabierta

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
| 5 | Home, `/contact-us` y todas las páginas (widget flotante) | **Los 3 widgets de Elfsight no pintan nada.** Medido el 27-ago-2026 en dos navegadores distintos sobre el sitio vivo: los tres contenedores se quedan en **altura 0 y sin hijos** tras barrido completo y 6–8 s de espera. `platform.js` sí carga y la petición a `core.service.elfsight.com/p/boot/` sí se hace. Dos de ellos no son adorno: `ce5a93b9…` es **Google Reviews** y `fdd09947…` el **Instagram Feed** — una `<section class="social-media">` entera. El tercero es el click-to-call. | `PROMPT.md` dice «mantener tal cual: cuenta del cliente», y solo conocía uno de los tres. Se mantienen los tres igual que están. **Pero conviene decírselo al cliente**: hoy paga por tres widgets que ningún visitante ve, y dos de ellos deberían ser secciones con contenido. La causa está en su cuenta de Elfsight, no en el sitio. |
| 6 | `/`, `/about`, `/request-estimated`, home | **Finsweet hace tres trabajos, no uno.** Además del filtrado de listas que apunta `PROMPT.md`: el **marquee de logos** (`fs-marquee-logoscms_*`, 14 logos) y el **slider del blog** (`fs-slider-blog_*`). | No es una mejora: es alcance que faltaba. Anotado aquí para que la Fase 7 no lo descubra tarde — `@finsweet/attributes@2` hay que reimplementarlo en tres frentes, no en uno. |

---

## Entradas

<!-- a partir de aquí, una entrada por fase, la más reciente arriba -->

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
