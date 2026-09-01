# CRITERIO DE ACEPTACIÓN — las 7 secciones pendientes de la home

Con esto acepto o rechazo tu informe. **Sale de medir el sitio construido**, no de opinar: cada
número de aquí se sacó de `.vercel/output/static` y del CSS ya resuelto. Si un umbral te parece
imposible, dilo en el informe con tu número — pero no lo ignores en silencio.

Dos correcciones sobre lo que diga cualquier texto anterior: `check:tokens` son **11**
comprobaciones, no 9; y la home **sí** se puede acotar ahora, con `node scripts/check-visual.mjs '=/'`
(comillas obligatorias: zsh se come `=/` suelto). Lo que sigue prohibido es pasar `/` a pelo.

---

## Umbrales comunes a los tres frentes

· OBJETIVO TÁCTIL. Todo control ≥44 px de alto y ancho en los CUATRO anchos que mide la puerta
  (1920/1440/991/479), medido con getBoundingClientRect() sobre .vercel/output/static, no
  calculado a mano. Se usa la receta que ya funciona en el repo (min-height:44px + inline-flex +
  centrado, intro.css:161-166), nunca `height` fija ni `aspect-ratio` con la altura ya declarada
  — con la altura definida, aspect-ratio calcula el ANCHO y desborda la columna.
· CONTRASTE POR EL PEOR CASO, NUNCA POR EL PROMEDIO. Texto ≥4,5:1 (titulares grandes ≥3:1) y
  cualquier elemento no textual ≥3:1, medidos contra el PEOR parche o píxel de la foto que hay
  debajo. Los promedios aprueban en falso: en cta-footer-image.webp la media da 5,49:1 y la teja
  que pisa el párrafo da 3,11:1. Cada ratio va con su número calculado, no con «se ve bien».
· FOCO DEL SISTEMA. Todo control usa --mm-foco / --mm-foco-inverso con --mm-foco-grosor y --mm-
  foco-aire, y el anillo da ≥3:1 contra SUS DOS vecinos (lo que tiene dentro y lo que le queda
  fuera por el outline-offset). Prohibidos el #3b79c3 de Webflow y el #1cadeb del feed; el oro
  NO marca estado en ningún sitio (1,86:1 sobre blanco).
· DISCIPLINA DE CAPA CON SALIDA PEGADA. check:tokens verde 9/9 con su salida transcrita: 0
  literales de color (solo var(--mm-*)), 0 !important, 0 @layer, breakpoints solo min-width
  480/768/992 sin mezclarlos con los max-width de Webflow, y toda longitud sacada de --mm-e-*,
  --mm-r-* o --mm-paso-*. Si falta un token, se PIDE al director; no se inventa un hex.
· TEXTO INTACTO. check:texto al 100 % sobre las rutas tocadas, corrido con filtro por ruta y
  JAMÁS con `/` (casa con las 115 y bloquea la pantalla ~65 min). No se añade, quita ni mueve
  `text-transform: capitalize` de ningún selector: está vivo en h2/h3/h4 y .button-styles y el
  baseline guarda las formas mutadas («Get A Free Estimate»).
· ALCANCE MEDIDO Y CONTRATOS ANTES QUE PÍXELES. Cada selector nuevo va anclado a su sección y
  con su recuento real de rutas (`grep -rl … | wc -l`); un selector que se creía de la home y
  pinta 66 rutas es motivo de rechazo aunque el resultado guste. Antes de emitir la primera
  regla, toda ruta afectada tiene contrato `rediseno` en disenio/contratos.json (aprobar-
  diseno.mjs:82 rechaza las que sigan en `paridad`), y el informe lista las capturas a rehacer.
· EVIDENCIA DONDE LA PUERTA NO MIRA. check:visual solo fotografía 1920/1440/991/479, así que
  verde no es prueba en la banda 480-767 ni en el salto 991→992, y una regla `min-width:480` es
  INVISIBLE a 479 igual que una `min-width:992` lo es a 991. Se aporta medida manual explícita
  de 600 px, 767 px y del par 991/992, y se declara qué ancho arregla cada regla.
· CERO DECLARACIONES INERTES, Y LO QUE REVIVE SE DICE. El informe declara cuántas declaraciones
  emite cada fichero y cuántas tienen efecto medido; deben coincidir. Y lista qué reglas que hoy
  están muertas pasan a estar VIVAS por el cambio (los flex-flow/gap sin display:flex, .bas-
  wrapper{max-width:946px}, .w-container): activar un display:flex heredado mueve 66 rutas de
  golpe.

---

## Por sección

### .cta-page-section (12 rutas) + .cta-footer (102 rutas) — src/styles/cta.css, chat HOME

- VELO SOBRE LA FOTO. En .cta-page-section el párrafo (18 px / 400) da ≥4,5:1 y el titular ≥3:1
  contra el PEOR parche de cta-footer-image.webp (hoy YHIGH=146 en x=1200..1439 → blanco a
  3,11:1; el promedio da 5,49:1 y aprobaría en falso). El informe da el color resultante del
  velo y su ratio; referencia medida: navy al 55 % → 7,05:1.
- EL AZUL DE WEBFLOW, MUERTO. Se demuestra que el fondo del CTA ya no puede caer a #3898EC: o se
  declara un background-color propio en la capa que gane a .w-button, o se prueba con --yellow-1
  sin definir que el botón no se vuelve azul. Importa porque los cuatro tokens del degradado
  viven en webflow.css, que es DERIVADO, y el CTA es el 0,054 % de los píxeles de la home: si se
  pone azul, no lo ve ninguna de las 11 puertas.
- JERARQUÍA DE BANDA SIN INVERSIÓN. El padding vertical de .cta-page-section ≥ el de .cta-footer
  en los cuatro anchos (hoy a 991: 42 px contra 64, porque los 3em resuelven contra un body de
  14 px). Nada de `em` para aire de banda: rem o token, o el número vuelve a depender del
  cuerpo.
- UNA SOLA DECISIÓN REPETIDA. Titular y párrafo son idénticos carácter a carácter en las dos
  bandas y en 3 rutas salen las dos en la misma página: mismo tratamiento y párrafo ≤650 px
  (--mm-medida) en LAS DOS (hoy 1.186 / 950 / 850 px, ninguna en el token), con text-
  wrap:balance en el titular como ya hace .trusted-section.
- ESTADOS Y RITMO. :hover y :active declarados y medidos con su ratio en cada estado (hoy 0
  reglas de estado alcanzan al CTA: las de .button-styles están encerradas bajo .trusted-
  section), transición con guarda @media (prefers-reduced-motion: reduce); y los tres huecos
  internos —titular→párrafo, párrafo→botón y padding de banda— dentro de la escala --mm-e-* (hoy
  10 px, 18/28 px y 96/64/42/32 px, ninguno en ella).

### .projects-section (66 rutas) + .before-after-section (15 rutas) — src/styles/proyectos.css y antes-despues.css, PULIDOR-1

- ENCUADRE DECLARADO Y SIN SALTO. La caja de la foto lleva aspect-ratio explícito por tramo, la
  relación no sale de [1,45 : 2,05] en ningún ancho entre 320 y 1920, ningún ancho supera el 25
  % de recorte (hoy 43,5 % a 992) y la diferencia de relación entre 991 y 992 es ≤0,25 (hoy
  1,637: de 2,649 a 1,012). Con la altura aún declarada, aspect-ratio calcula el ANCHO: se
  demuestra que height queda neutralizada.
- LOS TRES CONTROLES, VISIBLES Y ALCANZABLES. Las 2 flechas y el tirador (role=slider,
  tabindex=0) tienen :hover y :focus-visible —hoy hay 0 reglas de estado en toda la sección, y
  el anillo global las excluye por lista de selectores—, el tirador ≥44×44 (hoy 42×42) y su
  icono ≥3:1 sobre el fondo del tirador (hoy 1,86:1, blanco sobre oro). El icono va en navy
  sobre oro o blanco sobre navy: el oro no marca estado.
- TEXTO BLANCO CON SUELO GARANTIZADO. Se declara un fondo efectivo bajo .before-after-intro tal
  que el PEOR píxel da ≥4,5:1, y se prueba re-midiendo animateddivs-image.webp con el velo
  aplicado (hoy: 55,3 % de los píxeles por debajo de 4,5:1 y 17,1 % por debajo de 3:1). «Se ve
  bien en mi captura de 1440» no vale.
- EL DEDO RECUPERA EL SCROLL Y EL ARRASTRE NO EMPEORA. `touch-action` pasa de `none` a `pan-y` y
  el informe declara con esas palabras que el arrastre sigue funcionando CON DEDO y CON RATÓN a
  375 y 991 px. El desfase puntero→costura se mide antes y después: hoy ±8 px porque el JS mide
  sobre la caja de borde y el clip-path recorta sobre la de relleno — el `border:8px solid #fff`
  es un término de la fórmula, no decoración.
- LA COMPARACIÓN SIGUE SIENDO HONESTA Y LA FILA CIERRA. Las dos fotos del antes/después (ambas
  1450x906) conservan encuadre IDÉNTICO; tocar la caja de solo una enseña una transformación que
  no ocurrió. Y las 10 tarjetas dan la misma altura en la banda 480-767, con evidencia manual a
  600 px porque ahí no captura ninguna puerta.

### ._3d-section (65 rutas) + .location (17 rutas) — src/styles/render3d.css y ubicacion.css, PULIDOR-2

- BANDA COMPLETA Y UN SOLO CANAL. .location declara su padding inferior (hoy 0 px, con 192-204
  px de costurón arriba) y ningún costurón difiere de su opuesto más de 1,5x. En los cuatro
  anchos, el borde izquierdo del titular, del párrafo y del bloque de medio caen en la misma x
  ±1 px, con canal ≥24 px (--mm-canal): hoy .location da 0 px y ._3d-section 36/28 px porque usa
  `em`. Prohibido usar .w-container como palanca: está muerto por orden de aparición.
- UN SOLO ENCUADRE DEL VÍDEO. El bloque mantiene 16:9 (fuente 1280x720 medida con ffprobe) con
  ≤5 % de recorte en los cuatro anchos, frente al 13,5 / 14,4 / 25,0 / 16,0 % de hoy, y con
  height:auto explícito si se usa aspect-ratio. check:ix2 verde: 0 barra horizontal a 479 y 767.
- VELO MEDIDO POR IMAGEN Y POR ANCHO. Peor píxel ≥4,5:1 contra blanco y 0,00 % del área útil por
  debajo, en las DOS fotos de .item-country. Aviso que decide el trabajo: copiar el patrón de la
  casa (navy al 50 % de .trusted-section) EMPEORA a 3,34:1 / 3,58:1 y multiplica por 15 el área
  ilegible; hace falta navy ≥62 % (4,81:1 / 5,11:1). Hoy: 4,06:1 / 4,37:1.
- SUELO COMPARTIDO. A 1920, 1440 y 991 las dos .item-country tienen la misma altura y la base de
  sus dos CTA la misma y (±1 px), y se demuestra con una prueba forzada: añadiendo una línea al
  párrafo de UNA sola tarjeta la igualdad se mantiene. `align-items:center` sobre .cms-list-
  country no puede sobrevivir a la entrega — hoy lo único que tapa el problema son 92-117 px de
  holgura.
- CERO AIRE MUERTO EN LA BANDA CIEGA. A 600 px y a 767 px la holgura vertical entre el contenido
  de la tarjeta y su caja es ≤24 px (hoy 147-167 px por tarjeta, porque min-height:450px sigue
  vigente hasta 479). Se mide a mano: la puerta no visita ese tramo.

### .social-media — feed de Instagram propio (79 rutas), src/styles/social.css + FeedInstagram.astro, PULIDOR-2

- PRUEBA DE PINTADO ANTES QUE NADA. El informe adjunta capturas de la sección CON contenido
  (datos reales o datosDemo) en tres rutas de familias distintas —pool-builders/, services/,
  country/— a 1920, 991 y 479. check:visual en verde NO se acepta como prueba: hoy hay 0 nodos
  .mm-ig en las 115 páginas construidas y la puerta es ciega a esta sección.
- CASCADA DEMOSTRADA, NO SUPUESTA. Toda regla de social.css que deba ganar al <style> del
  componente lleva especificidad ≥0-3-0 y el informe transcribe el selector exacto y contra qué
  regla compite: el componente carga DESPUÉS (offset 1602 contra 1546) y todos sus selectores
  llevan [data-astro-cid-d6k336wr], o sea ≥0-2-0. Cero !important. Sin esto se entrega un
  informe verde sobre una hoja inerte.
- GUARDA DE VACÍO, INNEGOCIABLE. El aire de sección va en .social-media:has(.mm-ig) o entero
  dentro de .mm-ig, y se prueba que con items:[] los 79 HTML no mueven un píxel y check:visual
  sale verde sin re-baselinizar. Hoy .social-media no tiene ni una declaración en los 190.947
  bytes del CSS construido, con vecinas a 64-96 px.
- VELO Y AFORDANCIA SIN RATÓN. El icono blanco da ≥4,5:1 sobre la PEOR foto posible (blanca), es
  decir alfa navy ≥61 % → 4,58:1 (hoy 45,1 % → 2,85:1, y las fotos son piscinas bajo sol de
  Florida). Y el velo se enciende también en :focus-visible y :focus-within, con una respuesta
  explícita a qué ve un dedo en un móvil donde no hay hover. Si el opacity:0 se queda en el
  componente y su encendedor se va a social.css, check:tokens se pone ROJA aunque el resultado
  sea correcto.
- REJILLA DETERMINISTA. Columnas fijas por breakpoint (min-width 480/768/992), nunca auto-fill,
  el recuento jamás crece al estrechar la pantalla (hoy 6/5/3/2, con tablet un 22,5 % MÁS grande
  que escritorio) y el recuento de items del snapshot llena filas completas en los cuatro anchos
  (hoy 12 items dejan 3 huecos de 184,12 px a 991).

---

## Lo que NINGUNA puerta ve, y por tanto tiene que mirar un ojo

Esta lista es la más valiosa del documento. Son los fallos que pueden entregarse **con las once
puertas en verde**, así que si están, los tengo que ver yo o Sebastian — o llegan al cliente.

· El CONTRASTE. Ninguna puerta calcula un ratio. check:visual compara contra su propio baseline,
  así que un texto que ya se leía a 3,11:1 sobre la foto se aprueba como «sin cambio» para
  siempre. Los cuatro velos (CTA, antes/después, tarjetas de cobertura, feed) hay que medirlos a
  mano por peor píxel, y el promedio miente: en cta-footer-image.webp aprueba a 5,49:1 lo que en
  la teja real da 3,11:1.
· La ALTURA DE TOQUE. Nadie mide 44 px. Los botones a 36,4 px a 991 y 479, el tirador a 42x42 y
  el @usuario a 19,6 px pasan las once puertas en verde: el lead que falla el toque con el
  pulgar no deja rastro en ningún fichero.
· La BANDA 480-767 y el SALTO 991→992. Las capturas son 1920/1440/991/479. Ahí viven el 25-36 %
  de recorte del vídeo y de la foto de proyecto, los 147-167 px de aire muerto por tarjeta y la
  fila de altura irregular. Peor: una regla `min-width:480` es invisible a 479 y una `min-
  width:992` lo es a 991, o sea que se puede aprobar un arreglo que la puerta nunca ha visto y
  dejar rotos exactamente los dos anchos que sí fotografía.
· TODO el feed de Instagram. Con `items: []` no hay un solo nodo .mm-ig en las 115 páginas: se
  puede entregar social.css entero con las puertas en verde sin que nada de lo escrito se haya
  pintado nunca.
· Lo que cambia por DEBAJO del 1 % de píxeles (UMBRAL=99). El CTA es el 0,054 % de la home: el
  día que se ponga azul Webflow porque webflow.css se regeneró sin --yellow-1, se entera el
  cliente por teléfono.
· Que el CSS nuevo GANE la cascada. Una regla a 0-1-0 en social.css es ignorada en silencio por
  el <style> del componente, que carga después con [data-astro-cid-*]; y .container gana a
  .w-container solo por orden de aparición, no por especificidad. Un informe puede salir verde
  sobre una hoja inerte.
· Que el selector PINTE donde se cree. `.block-item-country` no existe en ninguna de las 115
  páginas y `.fs-slider-projects_image` tiene 0 usos en 66 rutas: nadie avisa de que se ha
  trabajado sobre una clase muerta.
· Las DECLARACIONES INERTES y las que reviven. Ocho `flex-flow`/`justify-content`/`gap` sin
  `display:flex`, `max-width:946px` inalcanzable, `scale3d(1none,...)` descartada. Añadir el
  `display:flex` que falta activa media docena de declaraciones de golpe en 66 rutas y ninguna
  puerta lo señala.
· El CONTEXTO DE APILAMIENTO. Un `transform`, `filter`, `opacity<1` o `will-change` puesto en un
  hover de .item-country hace que la foto se pinte ENCIMA del velo y el blanco caiga a 1,64:1.
  No mueve un píxel en reposo, así que no aparece ni en el diff ni en la captura.
· El COMPORTAMIENTO CON DEDO. Que `touch-action:none` congele el scroll en media pantalla de
  móvil, y que el tirador del antes/después vaya ±8 px por detrás del dedo porque el JS mide
  sobre la caja de borde y el clip-path recorta sobre la de relleno. Solo se ve tocando.
· El ORDEN DE TABULACIÓN contra el visual: en <=991 el antes/después invierte la columna por CSS
  y el foco entra por el deslizador —sin anillo— antes que por el titular que explica qué es.
· La HONESTIDAD de la comparación antes/después: si el cambio de caja toca solo una de las dos
  fotos, la sección enseña una transformación que no ocurrió. Eso no es feo, es falso, y ninguna
  puerta distingue dos encuadres distintos de dos iguales.

---

## Cómo se usa

Tu informe responde a los umbrales de tu sección **uno a uno, con su número y el comando que lo
produjo**. Un umbral sin número es un umbral sin cumplir. Si algo de «lo que ninguna puerta ve»
aplica a tu sección, dilo aunque salga verde: la ausencia de señal no es señal buena, y en este
repo esa confusión ya ha costado seis fallos abiertos.

