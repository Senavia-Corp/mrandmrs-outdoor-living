# R21-CIUDADES — registro de cambios de Sebastian sobre Ocala y Gainesville

**Estado: ABIERTO — se está llenando.** Sebastian va dictando cambios en chat; cada uno se
registra aquí con su análisis. Cuando estén todos, este fichero **es** el encargo que se ejecuta.

**Base:** `5c74909` (R20-CIUDADES F2, ya en producción) · **Rutas piloto:**
`/pool-builders/gainesville-florida` y `/pool-builders/ocala-florida`
**Después:** las otras 51 ciudades, con el mismo trabajo y su propio copy y SEO local.

---

## 0 · Lo que hay que saber antes de escribir una sola regla

### 0.1 · Esto no empieza de cero: es la tercera tanda de R20-CIUDADES

`docs/encargos/R20-CIUDADES.md` es el encargo vivo. Ya pasaron dos tandas:

- **F1** (`9ab8f28`) — las 2 landings captan el lead en su propia página: `FormularioCore` con
  ancla `#estimate`, `ConfianzaCore`, `InversionCore`, FAQ con collage, y el héroe recibió sus
  **dos teléfonos** y su **línea de licencias**.
- **F2** (`5c74909`) — los 4 cambios que Sebastian pidió viendo producción: reseñas delante de
  «Project Showcase», fuera el CTA de media página, fotos de `trusted-section` → `/gallery`, y
  las 6 de «Pool Features» a vertical.

Lo abierto de allí que muerde aquí: **`check:visual` está rojo por contrato `rediseno` en 55
rutas** y solo Sebastian lo cierra con `aprobar-diseno.mjs`. Cada tanda nueva que no se apruebe
se acumula sobre esa misma deuda. Conviene **una sola aprobación al final**, no una por cambio.

### 0.2 · El mecanismo que hace posible «primero 2, luego 51»

Es el hallazgo que gobierna todo este encargo, y ya existe — no hay que inventarlo:

```
src/data/ciudades-captacion.json   ← una fila por ciudad {slug, ciudad, condado, region, …}
        │  npm run captacion:ciudades
        ▼
captacion-servicios.json + collage-faq-por-ruta.json   ← entradas literales, generadas
        │  [slug].astro solo llama a la capa si la ruta TIENE entrada
        ▼
Ocala + Gainesville reciben la capa · las otras 51 salen intactas, byte a byte
```

**Consecuencia que hay que respetar en cada cambio de este documento:** todo lo nuevo —marcado y
CSS— cuelga de la capa de captación. Entonces «aprobar en 2 y extender a 51» **no es rediseñar
otra vez: es añadir 51 filas y volver a generar.** Un cambio escrito contra el selector pelado
hace lo contrario: mueve las 51 sin permiso y las pone en rojo.

### 0.3 · Los tres alcances reales, medidos hoy sobre el árbol

| Selector | Rutas | Qué pasa si se toca pelado |
|---|---:|---|
| `.hero-glass-section` (`hero-zona.css`) | **57** | se mueven las 51 ciudades restantes + los 2 `where-we-serve` + el laboratorio |
| `.svc-heroe__tel` · `.svc-heroe__lic` (`servicio-core.css`) | **16** | se mueven **las 14 fichas de `/services/`**, que también los pintan |
| `.button-styles` | **121** | todo el sitio |

```bash
grep -rlo 'svc-heroe__lic' .vercel/output/static --include='*.html' | wc -l   # 14 fichas (+2 tras F1)
```

**Por eso toda regla nueva va bajo un modificador de la capa**, p. ej. `.svc-heroe--ciudad`, que
emite `captacion-ciudad.mjs` y hoy solo existe en 2 rutas. Nada de tocar `.svc-heroe__lic` suelto.

### 0.4 · Las puertas que deciden si un cambio se puede hacer

| Puerta | Qué muerde aquí |
|---|---|
| `check:texto` | compara `innerText` al **100 %**. Mover la línea de licencias de debajo del párrafo a encima del H1 **cambia el orden** → rojo, salvo que se redeclare el bloque en `bloquesCaptacion()` de `scripts/check-texto.mjs`. No es bloqueo: es un paso obligatorio |
| `check:estructura:ciudades` | estática, <1 s. Conoce **dos formas y solo dos** (con captación y sin ella). Si el héroe cambia de forma, esta puerta hay que enseñarle la nueva |
| `check:ads` | regla 12 (héroe con `<img>`) **NO APLICA** aquí y sale en PENDIENTE con motivo: el fondo es `<video>`. Decisión de Sebastian, se mantiene. Un `<svg>` de icono no la cambia |
| `check:tokens` | 0 literales de color, 0 `!important`, 0 `@layer`, `min-width` 480/768/992, longitudes desde `--mm-e-*` |
| `check:visual` | 4 anchos (1920/1440/991/479). **Ciego en la banda 480-767 y en el salto 991→992**: toda regla nueva aporta medida manual a 600, 767 y 991/992 |
| `diag-ritmo.mjs` · `diag-estados.mjs` · `diag-velo` | ya existen de R20 y miden justo esto: composición del héroe dentro del pliegue 390×844 **descontando los 80 px del botón flotante**, y el peor píxel del velo sobre los 28 s del bucle de vídeo |

### 0.5 · Colisiones vivas

- **`PROMPT-FONDO-AGUA.md`** (aprobado 12-sep, parado hasta cerrar T2/T5 de `PROMPT-LOCAL`)
  reescribe **todo** fondo azul del sitio. **No toca el héroe** —que es vídeo con velo, no banda
  azul—, así que los dos frentes pueden ir en paralelo; lo que no debe pasar es re-baselinizar
  estas 2 rutas dos veces. Una sola aprobación, al final.
- El fichero sigue **sin trackear** y `aprobar-diseno.mjs` **exige árbol limpio**: hay que
  commitearlo o guardarlo antes de aprobar nada.
- `.vercel/output/static` es de `0ea89ee`, **anterior a F1/F2**. Toda medida se rehace sobre un
  build fresco; las de este documento que vengan del build viejo van marcadas.

---

## 1 · CAMBIO 1 — el héroe: compacto, anclado abajo, con badge y sin muro de líneas

> **Pedido literal (18-sep):** «revisar el hero para que todo se vea más compacto hacia abajo,
> alinea el texto más hacia abajo. En la parte donde dice *Florida certified pool contractor ·
> CPC1461119 · CPC1460562* mejor usar badge arriba del H1 con icono. La idea es que este hero se
> vea limpio. El problema es que se ve muy simple, muchas líneas debajo del título, en vez de usar
> decoraciones o iconos que mejoren la escena. Mejorar el hero para que se vea bien en desktop y
> móvil.»

### 1.1 · Lo que hay hoy, en su forma real

```html
<section class="hero-glass-section">              <!-- vídeo de fondo + velo; 57 rutas -->
  <div class="wrapper-hero"><div class="hero-home-block">
    <div class="wrapper-main-hero-page">
      <h1>Custom Pool Builders In Gainesville, Florida</h1>
      <h2 class="yellow">Custom Inground Pool Construction For Homes In Gainesville And Alachua County</h2>
      <div class="text-divider-hero-city">
        <p class="paragraph-2">New custom inground pools for Gainesville homeowners — 3D design,
           permits, construction and final start-up, from one licensed team.</p>
        <p class="svc-heroe__tel">+1 (352) 740-3361 North Florida · +1 (954) 913-7112 South Florida</p>
        <p class="svc-heroe__lic">Florida certified pool contractor · CPC1461119 · CPC1460562</p>
        <div class="wrapper-buttons-center"> CTA #estimate · Project Gallery </div>
      </div></div></div></div>
  <div class="wrapper-logos"> … marquee «Trusted by Florida's finest homeowners» … </div>
</section>
```

El marcado de `__tel` y `__lic` lo inyecta `src/lib/captacion-ciudad.mjs:109-111` partiendo `B[0]`
por el ancla `'<div class="wrapper-buttons-center"><a href="/request-estimated"'`. El texto sale de
`captacion-servicios.json → heroe.{apoyo, licencias, ancla, zonas}`, generado desde
`ciudades-captacion.json`.

**El diagnóstico coincide con lo que ve Sebastian, y se puede nombrar con precisión:** debajo del
H1 hay **cuatro bloques de texto seguidos, todos del mismo peso visual** — H2, párrafo de dos
líneas, teléfonos y licencias. Seis líneas de prosa plana. No es que falte adorno: es que **los
cuatro trabajos del héroe se están entregando con la misma forma**, así que ninguno destaca.

Un héroe de landing de pago hace cuatro cosas, por este orden:

| # | Trabajo | Hoy | Forma que le corresponde |
|---|---|---|---|
| 1 | Confirmar la promesa del anuncio (ciudad + servicio) | H1 + H2 | titular. **El H1 no se toca: es decisión de pago de A3** |
| 2 | Probar legitimidad rápido | línea de texto, la última | **badge** — se lee como credencial, no como frase |
| 3 | Un siguiente paso obvio | 2 botones | botón |
| 4 | Salida para quien ya quiere llamar | línea de texto | **chip con icono y ≥44 px**, junto a los botones |

### 1.2 · Lo que se hace

**a) El badge, encima del H1.** Píldora con icono de escudo/check en SVG **inline** con
`currentColor` —como los sociales del pie y `.svc-confianza__icono`—, fondo navy translúcido y
filete de 1 px. Texto: el mismo de `heroe.licencias`, sin reescribir. Nada de Higgsfield: un
pictograma no necesita generación y un PNG no hereda `currentColor`.
Exige **un ancla nueva** en `captacion-ciudad.mjs` (hoy solo hay la de los botones): se parte por
la apertura del `<h1>`, con la misma guarda de «exactamente una vez» que ya usa el fichero.

**b) Los teléfonos, con icono y tamaño de dedo.** De párrafo suelto a **dos chips** con glifo de
teléfono, pegados a la fila de CTAs. En móvil esto es el cambio de más valor del héroe: hoy son
texto subrayado dentro de un `<p>`.

**c) El ritmo se aprieta y el grupo baja.** El héroe **ya** ancla abajo
(`hero-zona.css:47,56` — `align-items:flex-end` + `padding-bottom: 64+16`), pero los huecos
internos se **suman**: `.text-divider-hero-city` pone `row-gap: 24` (`hero-zona.css:151`) y
`.svc-heroe__lic` añade encima `margin-block: 8 24` (`servicio-core.css:500`). Se unifica en una
sola escala. Con el badge y los chips fuera de la columna de prosa, bajo el H1 quedan **dos**
bloques —H2 y párrafo— en vez de cuatro.

**d) El H2 baja un paso.** Mide casi lo mismo que el H1 y va en oro: compite en vez de apoyar.
Baja un escalón de la escala tipográfica. **Su ratio va medido contra el peor píxel del velo**,
no contra el promedio — el oro es 1,86:1 sobre blanco y aquí vive sobre vídeo.

**e) Suelo del pliegue.** El bloque baja **hasta donde deja el pliegue**, no más: `diag-ritmo.mjs`
mide 390×844 descontando los 80 px del botón flotante de llamada, y el héroe tiene que seguir
cabiendo entero. En desktop, el CTA no puede tocar la franja blanca de logos.

### 1.3 · Alcance y coste — y por qué no se puede escribir del modo obvio

| Si se escribe… | Mueve | Veredicto |
|---|---:|---|
| `.hero-glass-section .paragraph-2 { … }` | 57 rutas | ❌ |
| `.svc-heroe__lic { … }` | 16 (las 14 fichas también) | ❌ |
| `.svc-heroe--ciudad .svc-heroe__lic { … }` | **2** | ✅ |

El modificador lo emite `captacion-ciudad.mjs`, o sea **solo las rutas con entrada de captación**.
El día que se extienda a las 51 basta con añadirles su fila y regenerar: **el diseño ya está**.

### 1.4 · Lo que este cambio obliga a tocar, y nada más

```
src/lib/captacion-ciudad.mjs      ancla nueva en <h1> · badge · chips · modificador de clase
src/styles/servicio-core.css      reglas nuevas, TODAS bajo .svc-heroe--ciudad
scripts/check-texto.mjs           redeclarar el bloque del héroe: cambia el ORDEN del innerText
scripts/check-estructura-ciudades.mjs   enseñarle la forma nueva del héroe
src/data/ciudades-captacion.json  solo si el badge necesita un campo propio
```

### 1.5 · Cómo se acepta

- `check:tokens` verde con la salida pegada · 0 literales, 0 `!important`, 0 `@layer`.
- `check:texto` verde **en las 2**, con el bloque redeclarado (no con la declaración vieja).
- `check:estructura:ciudades` verde en las **53**: las 51 sin captación siguen byte a byte.
- Contraste **por el peor píxel**, no por el promedio: badge, H2 y chips contra el peor fotograma
  del bucle de vídeo (`diag-velo`, 28 s), cada uno con su número.
- **≥44 px** en badge (si es enlace), chips de teléfono y CTAs, medido con
  `getBoundingClientRect()` sobre `.vercel/output/static` en los 4 anchos.
- Foco con `--mm-foco`, ≥3:1 contra sus dos vecinos.
- Medida manual a **600, 767 y 991/992**, donde `check:visual` no mira.
- `diag-ritmo`: el héroe entero dentro del pliegue 390×844 menos los 80 px del flotante.
- Capturas a **1440 y 390** de las 2 rutas en `audit/r21-ciudades/`.

### 1.6 · Decisiones que son de Sebastian, no mías

1. **El párrafo de apoyo.** «3D design, permits, construction and final start-up» son cuatro pasos
   de un proceso contados como frase. Como **fila de 4 chips con icono** se lee de un vistazo y es
   exactamente la «decoración con iconos» pedida — pero **cambia el texto**, así que hay que
   declararlo y afecta al copy de las 53. ¿Se reescribe o se deja la frase?
2. **Los CTA miden 36-38 px de alto.** R20 lo reportó y **no** lo arregló a propósito: son
   `.button-styles`, 121 rutas, y subirlo solo aquí dejaría estos 2 botones distintos de los de
   arriba y abajo de la misma página. En una landing de pago en móvil, 38 px cuesta conversión.
   ¿Se sube solo en las 2, se sube en las 121, o se deja?
3. **Una aprobación o varias.** Recomiendo **una sola** al final de todos los cambios: cada
   `aprobar-diseno.mjs` exige humano, árbol limpio y va por lotes.

---

## 2 · CAMBIO 2 — la sección de Servicios de la home, entre «Pool Features» y «What Our Clients Say»

> **Pedido literal (18-sep):** «Necesito colocar entre estas dos secciones la sección de Servicios
> que se usa en el home page. Necesito colocar la misma sección de servicio entre la sección de
> *Pool Features & Upgrades* y *What Our Clients Say*.»

### 2.1 · Qué sección es, exactamente

`src/components/widgets/ServiciosPorCategoria.astro` — el «panel de mando» que Sebastian aprobó
el 28-ago: cabecera + control segmentado de 3 pestañas (`tablist` real) + lista de 14 servicios
con icono a la izquierda y ficha con foto, texto y «See More» a la derecha. Hoy vive en **3
rutas**: `/` y las 2 de `/where-we-serve/`.

No es marcado heredado que haya que copiar: es un componente ya rediseñado, con teclado, con el
estado inicial **servido** (no filtrado en cliente) y con sus contrastes medidos. Montarlo es una
línea.

### 2.2 · El sitio que pide Sebastian ya es una costura abierta

En `[slug].astro` el orden de hoy es:

```
<Fragment set:html={P_ANTES} />    ← … cierra `.animated-divs-section` («Pool Features & Upgrades»)
                                   ← ⬅ AQUÍ
<Fragment set:html={P_DESPUES} />  ← abre `.testimonial-section` («What Our Clients Say»)
<ResenasGoogle />
<Fragment set:html={B[1]} />       ← la cierra
<CarruselProyectos />              ← «Project Showcase», que F2 bajó detrás de las reseñas
```

El punto que pide **es exactamente la juntura entre `P_ANTES` y `P_DESPUES`**, que R20-CIUDADES F2
ya dejó abierta. O sea: **una línea en el bloque de render.** Ni marcador nuevo, ni `partirEn`
nuevo, ni guarda nueva, ni cirugía sobre el HTML derivado.

### 2.3 · La trampa: montarlo tal cual TIRA EL BUILD

`ServiciosPorCategoria.astro:67-69` **se localiza solo** por `Astro.url.pathname` y **lanza** si
no encuentra su entrada:

```js
const ruta = Astro.url.pathname.replace(/(.)\/$/, '$1');
const d = DATOS[ruta];
if (!d) throw new Error(`ServiciosPorCategoria: no hay datos para ${ruta}. Corre \`npm run paginas\`.`);
```

Y `src/data/servicios-categoria.json` tiene **tres claves**: `/`, `/where-we-serve/north-florida`,
`/where-we-serve/south-florida`. Ninguna ciudad. Dos salidas:

| | Coste | Veredicto |
|---|---|---|
| **(a) Prop opcional `clave`**, con `Astro.url.pathname` por defecto; las ciudades reusan **una** entrada | **2 líneas** en el componente | ✅ |
| (b) Generar 53 entradas en el JSON | duplica ~50 KB × 53, y ese JSON **lo escribe `build-paginas.mjs`** desde el origen: una clave a mano se pelea con el generador | ❌ |

Con (a), además, esa entrada compartida puede ser **propia de las ciudades** en vez de la de `/`
— y eso abre la decisión de abajo, que es de correspondencia con el anuncio y no de maquetación.

### 2.4 · Lo que cuesta, medido

| | |
|---|---|
| **CSS** | **0 bytes de hoja.** Los estilos van en el `<style>` del propio componente y Astro los envía solo donde se monta |
| `check:texto` | **el coste real.** La sección añade mucho `innerText` nuevo. Rojo hasta declararlo. El texto es **idéntico** al de `/`, así que es **un** bloque declarado y reutilizado, no 53 |
| `check:estructura:ciudades` | cambian **las dos** formas —con captación y sin ella—, igual que en F2 |
| `check:visual` | rojo correcto en las rutas que la monten · re-baseline **por lotes**, con árbol limpio entre lote y lote |
| `check:ix2` | el componente trae 2 `data-w-id` que hoy **no** animan (sus claves en `reveals.json` llevan prefijo `pageId|`). Hay que confirmar que en las rutas nuevas tampoco quedan atrapados en `opacity:0` — regla 1 |
| `check:enlaces` | 14 enlaces internos nuevos por ruta; son rutas vivas de `/services/`, pero la puerta los recorre |

### 2.5 · Lo que hay que decir aunque no se pregunte: dos fugas seguidas

La sección mete **14 enlaces de salida** a `/services/*`, y su CTA es «See More», que lleva FUERA
de la página. Justo debajo queda «Project Showcase», cuya única salida —«See all Projects»— R20 ya
anotó como fuga. En una página que **se paga por clic**, dos fugas seguidas justo antes de la
prueba social es una decisión de embudo, no de maquetación.

**No es motivo para no hacerlo** — y encaja con el Principio 1 de A3: los servicios secundarios no
desaparecen del héroe, viven más abajo; esto es exactamente «más abajo». Pero la mitigación cuesta
una línea: **cerrar la sección con el `.svc-cierre` que devuelve a `#estimate`**, el gemelo del que
ya existe al pie de la FAQ. Con eso la sección demuestra alcance y **devuelve** al formulario en
vez de solo repartir salidas.

### 2.6 · Alcance y secuencia — y por qué no chocan con «primero 2, luego 51»

F2 sentó doctrina de Sebastian: **«las 53 deben tener la misma estructura»**, y por eso el
movimiento de las reseñas no fue acotado con `CAP`. Esto es lo mismo: la sección es **idéntica en
las 53**, no lleva copy por ciudad. Hacerla 53 de golpe es más barato que 2 y luego 51 — el
re-baseline, que es el acto caro e irreversible, se paga **una** vez.

La secuencia que respeta las dos cosas:

1. Se monta **condicionada a `CAP`** → sale solo en Ocala y Gainesville. Sebastian la ve y la
   aprueba con el resto de cambios de este documento.
2. Aprobada, **se quita la condición** en el mismo PR, antes de re-baselinizar: una línea.
3. Re-baseline **una sola vez**, ya con las 53 en su forma final.

### 2.7 · Ficheros que toca

```
src/pages/pool-builders/[slug].astro     una línea: <ServiciosPorCategoria clave="…" />
src/components/widgets/ServiciosPorCategoria.astro   prop opcional `clave` (2 líneas)
src/data/servicios-categoria.json        1 entrada nueva compartida, SI se quiere orden propio
scripts/check-texto.mjs                  declarar el bloque de la sección para estas rutas
scripts/check-estructura-ciudades.mjs    las DOS formas
```

### 2.8 · Decisión que es de Sebastian

**La pestaña abierta al llegar.** Hoy `defecto: "outdoor-living"`, que es lo correcto en la home.
En una landing cuyo ad group es **«pool builders»**, la pestaña abierta debería ser **«Pool
Solutions»**: es correspondencia con el anuncio, cuesta **un campo del JSON** y es justo el tipo de
cosa que mide la matriz de Quality Score. ¿Se cambia para las ciudades, o se deja igual que la home?

---

## 3 · CAMBIO 3 — definición de las fotos, y el ritmo vertical entre secciones

> **Pedido literal (18-sep):** «Usa imágenes de alta definición de proyectos reales que estén de
> mayor definición. Mejorar la calidad de las imágenes usando el CLI de Higgsfield. En la sección
> de FAQ se ve un poco rara, no tiene casi espacio en la parte de arriba. Visualmente se ve raro
> porque en la parte de abajo hay más espacio que la de arriba; todas las secciones deben estar
> separadas con el mismo espacio entre secciones, que se vea simétrico cuando se hace scroll.»

---

### 3A · Las fotos — el techo no es el `srcset`, es la biblioteca

#### El número que decide todo

**Las 10 fotos de obra real del set `construction` miden 1250 px de ancho. Las diez. Es el techo
de todo el material real del sitio** — viene así del export de Webflow:

```
1250x698   /images/images/pool-construction-1/…-01.jpg   724K
1250x933   /images/images/pool-construction-10/…-10.jpg  1.1M
1250x698   …-03.jpg  828K      1250x698  …-05.jpg  832K      1250x933  …-07.jpg  1.1M
```
*(medido con `sips -g pixelWidth -g pixelHeight` sobre `public/`)*

Y son JPEG a **~0,95 bytes por píxel** (828 KB para 873 K píxeles): calidad ~95 sobre una imagen
pequeña. O sea que **el peso ya está gastado**; lo que falta son píxeles, no bitrate.

#### Por qué se ve blanda: la geometría del recorte, no la compresión

Las tres celdas de `trusted-section` son **299×500** y **299×250** (verticales). La foto es
**1250×698** (apaisada). Con `object-fit: cover` la imagen escala por **altura**:

```
para llenar 500 px de alto desde 698 → factor 0,716 → la foto se pinta a 895 CSS px de ancho
en pantalla retina (DPR 2) hacen falta  1790 × 1000 px de fuente
lo que hay                              1250 ×  698
                                        ─────────────  reescalado de 1,43×
```

**Ese 1,43× es el mismo que `caracteristicas.css` llevaba apuntado desde R17-CARAC** esperando «al
cambio de fotos». No lo arregla ningún `srcset`: **el fichero más grande que existe ES el de
1250 px.** Una foto apaisada metida en una celda vertical tira el 64 % de sus píxeles a lo ancho.

#### Higgsfield no puede hacer esto, y además no debe

**No puede.** `~/.local/bin/hf` es un curl pasarela sobre `platform.higgsfield.ai`; lo que la clave
admite es `/higgsfield-ai/soul/standard`, que es **texto-a-imagen 1080p 16:9** — genera una foto
nueva, no mejora la tuya. `seedance`, `veo3.1`, `sora2`, `nano-banana` y `flux-pro` dan
`model_not_found` con esta clave (`00-PRINCIPIOS.md` §3). Y 1080p es **menos** ancho que los
1250 px que ya tienes.

**Y además no debe.** `00-PRINCIPIOS.md` §3 tiene una línea roja explícita: *nunca se genera obra
que parezca del cliente*. Un escalador de IA sobre la foto de una piscina real no inventa el
proyecto, pero **sí inventa el detalle**: la junta del gres, el canto del coping, la textura del
agua. En la web de un constructor de piscinas, inventar el detalle del acabado es inventar el
acabado — que es justo lo que la regla protege. Generar sigue estando bien para **iconos,
pictogramas y texturas** (el badge del cambio 1, por ejemplo).

#### Las tres salidas honestas, por orden

| | Qué es | Coste | Gana |
|---|---|---|---|
| **1** | **Pedir los originales de cámara.** Es un contratista real: estas fotos salieron de algún sitio. Un original de 4000 px resuelve las 53 rutas, los dos collages y el feed de golpe | pedirlos | **todo, y es honesto** |
| **2** | **Cambiar la geometría del recorte.** Celdas menos verticales bajan la demanda: a 299×375 el reescalado cae de 1,43× a **1,07×** y la blandura desaparece sin tocar un píxel | 0 € · ~10 líneas | mucho, hoy mismo |
| **3** | **Reescalar** con un escalador local (Real-ESRGAN / `sharp` con Lanczos) — **no** con Higgsfield | 0 € | poco, y roza la línea roja |

**Recomiendo 1, y mientras llegan, 2.** La 2 es reversible y se nota igual, porque el problema
medido **es la geometría**, no la compresión.

> ❓ **Decisión de Sebastian:** ¿existen los originales de cámara de esas 10 obras? Si existen,
> esto deja de ser un problema de diseño y pasa a ser una subida de ficheros.

---

### 3B · El ritmo — y por qué la FAQ es la única que no puede casar

#### El hueco entre dos secciones es la SUMA de dos paddings

Paddings verticales tal como están hoy, sacados de `webflow.css` (ninguna hoja de diseño los
sobrescribe):

| Sección | Declarado | ≥992 px | ≤991 px |
|---|---|---:|---:|
| `.trusted-section` · `._3d-section` · `.projects-section` · `.testimonial-section` · `.blog-section-page` · `.products-section` | `6rem` | **96** | **96** |
| `.animated-divs-section` · `.appointment-section` | `4rem` | **64** | **64** |
| **`.faq-section`** | **`6em`** | **108** | **84** |

#### El defecto, con nombre

**`.faq-section` es la única sección del sitio cuyo padding va en `em`.** `em` resuelve contra el
tamaño del cuerpo, y `webflow.css` declara **dos**: `body{font-size:14px}` de base y
`body{font-size:18px}` después, que gana en escritorio; a `max-width:991px` vuelve a 14 px.

```
≥992 px →  6em × 18px = 108 px   (sus vecinas: 96)
≤991 px →  6em × 14px =  84 px   (sus vecinas: 96)
```

O sea que **la FAQ es la única sección cuyo ritmo cambia al cruzar el breakpoint mientras todas
las demás se quedan quietas.** No puede casar con sus vecinas por construcción. Es exactamente la
misma familia de fallo que `DIRECTOR.md` ya tenía documentada en `.cta-page-section` («los 3em
resuelven contra un body de 14 px»).

#### Y por eso lo de arriba y lo de abajo no miden igual

Lo que ve Sebastian es aritmética, no capricho: el hueco entre dos secciones es
`padding-bottom` de la de arriba **+** `padding-top` de la de abajo. Con 64, 84, 96 y 108 sueltos,
los huecos salen **160, 180, 192, 204…** y no hay dos iguales en toda la página.

Hay un segundo efecto, y conviene decirlo porque cambia la solución: **una sección con banda de
color no se lee igual que una blanca.** El padding de una banda azul se lee *dentro* de la banda;
el de dos secciones blancas seguidas se lee *entre* ellas y se suma. Por eso «el mismo número en
todas» no da «simétrico al hacer scroll»: **lo que hay que igualar es el hueco entre los bordes
del contenido**, y en dos blancas seguidas cada una pone la mitad.

#### Cómo se arregla sin abrir una guerra de propiedad

Escribirlo sección por sección obliga a tocar **8 hojas de 5 dueños distintos** —`cta.css` (HOME),
`obra.css` (PULIDOR-1), `render3d.css` y `social.css` (PULIDOR-2), `caracteristicas.css`
(R17-CARAC), `faq.css` (FAQ-COLLAGE)—, y además `.faq-section` son **18 rutas** contando las 2
ciudades: tocarla suelta mueve las 14 fichas de `/services/`.

```bash
grep -rl 'class="faq-section' .vercel/output/static --include='*.html' | wc -l   # 16 + las 2 = 18
```

**Una sola regla de ritmo, acotada a las rutas de ciudad**, bajo la capa de captación: un token
`--mm-ritmo-seccion` y `padding-block` sobre las secciones hermanas. Un fichero, un dueño, 2 rutas
hoy y 53 cuando se extienda. No pelea con nadie porque va acotada y carga la última.

**Aparte, y esto sí conviene arreglarlo en su hoja:** `.faq-section` debe pasar de `em` a `rem` o a
token. Son **18 rutas** y hay que decírselo al dueño de `faq.css`; dejar un `em` vivo ahí significa
que el día que alguien toque el tamaño del cuerpo, el ritmo de 18 páginas se mueve solo.

#### Lo que cuesta

| | |
|---|---|
| `check:texto` | **no se mueve**: es solo CSS |
| `check:visual` | rojo correcto en las rutas tocadas · re-baseline por lotes |
| `check:tokens` | todo el aire desde `--mm-e-*`; si hace falta `--mm-ritmo-seccion`, **se pide al director**, no se inventa |
| Evidencia | medida manual a **600, 767 y 991/992** — el salto 991→992 es justo donde el `em` de la FAQ cambia de valor, y `check:visual` no mira ahí |

> ❓ **Decisión de Sebastian:** ¿el ritmo uniforme se aplica **solo a las rutas de ciudad** (mi
> recomendación: acotado, reversible, y se extiende con las 51) o se abre como encargo propio para
> las 122 rutas? Lo segundo es un programa, no un cambio.

---

## 4 · CAMBIO 4 — la galería de las fichas, entre el formulario y el 3D

> **Pedido literal (18-sep):** «Colocar debajo de la sección de Contact Form y antes de la sección
> de 3D rendering la sección de Gallery que se usa en las páginas de servicio. Colocar exactamente
> la misma sección y usar las imágenes que usa la página de servicios de New Pool Construction y
> Pool Remodeling.»

### 4.1 · El sitio vuelve a ser una costura abierta — la tercera seguida

```
<Fragment set:html={ANTES_FORM} />   ← `.trusted-section`
<FormularioCore ruta={RUTA} />       ← `#estimate`, el Contact Form
                                     ← ⬅ AQUÍ
<Fragment set:html={P_ANTES} />      ← abre `._3d-section`, el 3D rendering
```

`partirEn(b0, '<section class="_3d-section"')` ya deja ese corte hecho desde F1. **Una línea.**

### 4.2 · Coste de JavaScript y de cableado: **cero**. Verificado, no supuesto

| Qué | Medido |
|---|---|
| El motor | `Componentes.astro` va en `Base.astro:349` → **las 122 rutas** ya lo cargan |
| El slider | lo mueve **por atributo** (`[fs-slider-element="list"]`), no por instancia. La ficha corre **tres a la vez**: `fs-slider-blog`, `fs-slider-gallery`, `fs-slider-resenas` |
| En la ciudad | ya corre `fs-slider-blog` — 11 nodos `fs-slider-*` en el HTML de Ocala. La maquinaria está cargada y probada ahí |
| El lightbox | el mismo `Componentes.astro` lo rehace con `<dialog>` (`:185`), genérico sobre `a.w-lightbox` |

O sea que montar una cuarta instancia no pide ni un `<script>` nuevo ni una línea de cableado.

### 4.3 · Lo que sí hay que escribir: el componente

**`section.gallery` NO es un componente.** Son 11,2 KB de marcado derivado de Webflow que viven en
cada una de las 14 fichas; `build-paginas.mjs` solo lo **mueve** detrás de la FAQ (bloque 8b), no
lo construye.

Para montarlo en las ciudades hay que **extraerlo a componente**, exactamente como R16-PROY hizo
con «Project Showcase» → `CarruselProyectos.astro`. La alternativa —copiar los 11,2 KB literales
en el template de ciudad— es la forma conocida de que las dos copias dejen de coincidir.

### 4.4 · 🔴 El número feo: la misma foto, cuatro veces en la misma página

Las 10 de `construction` **ya salen tres veces** en una página de ciudad:

| Dónde | Cuántas | De dónde viene |
|---|---:|---|
| `trusted-section` | **3** (03, 05, 07) | R20-CIUDADES F2 |
| collage de la FAQ | **5** | R20-CIUDADES F1 |
| feed de Instagram | **10** | solape 10/10 **ya declarado** en FICHAS-ORDEN·2 |
| **galería nueva** | **+10** | este cambio |

Es el defecto que FICHAS-ORDEN·2 dejó anotado como *«Abierto: fotos repetidas seguidas — decide
Sebastian»*, y en esta página sale amplificado.

**La mitad la resuelve tu propio pedido:** las **10 de `pool-remodeling` son nuevas aquí, cero
solape**. Con las 20 el solape baja al 50 %; poniendo remodeling primero, lo que se ve al llegar
es material que no ha salido antes.

Tres formas de cerrarlo, y es decisión tuya:

| | Qué | Solape |
|---|---|---|
| **a** | Las **20**, tal cual pediste, con **remodeling primero** | 50 %, y lo repetido queda al final |
| **b** | Solo las **10 de remodeling** | **~0 %** |
| **c** | **10 elegidas a mano** de los dos sets, quitando las 5 que ya están en el collage de la FAQ | bajo, y es el que mejor se ve |

Si se elige, **se elige por hoja de contactos, nunca por el nombre del fichero**
(`00-PRINCIPIOS.md` §4).

### 4.5 · Dos cosas que hay que decir aunque no se pregunten

**1 · R20 declinó esta sección a propósito.** `R20-CIUDADES.md` §3: `section.gallery` → **NO
CHANGE**, «el carrusel de obra y el feed ya enseñan resultado». Lo has visto en vivo y lo
reviertes — es tu decisión, y hay un argumento nuevo que entonces no existía: **la posición**.
Allí se descartó ponerla abajo, compitiendo con «Project Showcase». Aquí va **arriba, pegada al
formulario**: quien no rellenó el formulario ve obra inmediatamente. Eso sí es distinto.

**2 · La tensión con F1, que no es contradicción pero se dice.** F1 quitó «pool remodeling» del
apoyo del héroe a propósito: *«la tercera línea de la primera pantalla ofrecía la puerta de al
lado»*. Fotos de remodelación **bajo el pliegue** no son lo mismo que un CTA competidor. Pero el
**encabezado y los `alt` sí cuentan**: en un ad group de «new pool construction», un título que
diga «remodeling» reintroduce la intención de la puerta de al lado. El h2 se queda en obra
(«Custom Pool Project Gallery»), no en remodelación.

### 4.6 · Y confirma el 3A

Las 10 de `pool-remodeling` miden **1250 px de ancho** también (1250×698 y 1250×933).
**El techo de 1250 no es de un set: es de toda la biblioteca de obra real del sitio.**

### 4.7 · Puertas

| | |
|---|---|
| `check:texto` | h2 + entradilla son texto nuevo → declarar el bloque |
| `check:galeria` | **gate que ya existe**: 20 anclas con nombre, modal, 44×44, Escape, velo y foco. Hay que correrlo en las 2 rutas nuevas, no darlo por bueno porque pasa en la ficha |
| `check:carrusel` · `check:estructura:ciudades` · `check:visual` | forma nueva en las dos listas · rojo correcto · re-baseline por lotes |
| `check:enlaces` | 10-20 enlaces de lightbox nuevos por ruta |
| JS / CSS | **0** — §4.2 |

---

## 5 · INVENTARIO DE IMAGEN — el suelo para el prompt de imágenes

Levantado el 18-sep-2026 sobre `public/images/`, midiendo fichero a fichero (`sips` para
jpg/png/webp, caja `ispe` del contenedor para AVIF). No es una estimación.

### 5.1 · El hallazgo, y gobierna todo lo que se decida sobre imagen

> **Las 227 fotos de obra real del sitio miden 1250 px de ancho. Todas. Y casi todas 1250×698.**

| Carpeta | Qué es | Fotos | Ancho máximo |
|---|---|---:|---:|
| `images/` | las **15 galerías de servicio** (pool-construction, pool-remodeling, pergolas, deck, kitchen…) | 147 | **1250** |
| `projects/` | las **15 galerías de obra propia** en AVIF | 80 | **1250** |
| `residentials/` | fotos de ficha, antes/después | 81 | 1408 |
| `procesos/` | pasos de proceso | 56 | 1408 |
| `countries/` · `where-we-serves/` · `pool-builders/` | cromo de zona | 17 | 850–1250 |
| `brochures/` | escaneos de folleto | 53 | 2556 |
| `site/` | cromo, blog y artículos | 630 | **3168** |

Lo único por encima de 2000 px son **escaneos de folleto y fotos de artículo** — nada de eso es
obra del cliente.

### 5.2 · Las tres consecuencias, para no volver a discutirlas

1. **Ninguna selección, reordenación ni `srcset` sube la definición.** El fichero más grande que
   existe es el de 1250. Elegir mejores fotos mejora el *encuadre*, no la *nitidez*.
2. **1250×698 es 16:9. Toda celda vertical pelea contra la fuente.** Es la causa medida del
   1,43× de `trusted-section` (§3A). La palanca barata es la geometría, no el fichero.
3. **Higgsfield no entra aquí** (§3A): su modelo disponible es texto-a-imagen a 1080p —más
   estrecho que 1250— y generar obra que parezca del cliente está prohibido
   (`00-PRINCIPIOS.md` §3). Sí entra para iconos, pictogramas y texturas.

### 5.3 · Lo que ya está repartido en una página de ciudad

| Sección | Fotos | Set |
|---|---:|---|
| `trusted-section` | 3 | `construction` 03, 05, 07 |
| collage de la FAQ | 5 | `construction` |
| «Project Showcase» (`CarruselProyectos`) | 15 | 10 de `/gallery` + 5 de obra propia |
| carrusel de blog | 10 | `site/` |
| feed de Instagram | 10 | `construction` — **solape 10/10 declarado** |
| *(cambio 2)* Servicios por categoría | 14 | `residentials/` |
| *(cambio 4)* galería nueva | 10–20 | `construction` + `remodeling` |

**El mismo set `construction` aparece hoy en tres sitios de la misma página, y el cambio 4 lo
llevaría a cuatro.** Es el dato que debe mandar en cualquier reparto de imagen que se decida.

---

## 6 · EL BANCO DE IMÁGENES — verificado el 18-sep-2026, y cambia dos cambios de este documento

`/Users/senavia/Downloads/MrMrs_Outdoor_Living_Image_Bank/`. Comprobado en solo lectura:
existe, el índice responde, `search_image_bank.py` funciona y la regla de North Florida se
comporta como está escrita (devuelve vacío y lo explica).

### 6.1 · Contesta la decisión 6: **sí, los originales de cámara existen**

| | Ancho |
|---|---|
| Originales `approved` (71 + 3) | **3019 – 6000 px**, media **5085** |
| Derivado `hero` | **2400×1350** |
| Derivado `service` | **1800×1200** — y es **3:2**, no 16:9 |
| Derivado `gallery` | **1600×1067** |
| Derivado `blog` | 1600×900 |
| Derivado `instagram` | **1080×1350 — VERTICAL (4:5)** |
| **El sitio hoy** | **1250×698** |

**El 1,43× de `trusted-section` desaparece.** Con el derivado `service` (1800×1200) en la celda
de 299×500: `cover` escala por altura, 500/1200 = 0,417 → la foto se pinta a 750 CSS px; a DPR 2
hacen falta 1000 px de alto y hay **1200**. Pasa de reescalar **1,43×** a **0,83×** — de inventar
píxeles a sobrarle. Y para las celdas verticales están los 8 assets con recorte seguro **4:5** y
su derivado de 1080×1350.

O sea: **§3A se resuelve con fotografía real, sin tocar la geometría y sin Higgsfield.**

### 6.2 · Coincide con el cambio 4 exactamente

Los **dos únicos servicios** con fotografía aprobada son
`custom-pool-spa-builders` y `pool-remodeling-renovation` — **justo los dos sets que pediste**.
Y `project-059` trae un **antes/después real**: tres fotogramas del vaso vaciado durante el
resanado más la piscina acabada, **misma propiedad verificada** (`--project project-059 --pairs`).

**Límite que hay que decir:** los 74 aprobados salen de **3 propiedades** y son **todos
apaisados**. El propio buscador etiqueta los resultados `[repeat property]`. Una galería de 20
sacada de 3 casas se va a leer como la misma piscina desde 20 ángulos. Para el cambio 4 eso pesa.

### 6.3 · 🔴 La colisión: **Gainesville y Ocala son North Florida**

El banco es tajante: **cero fotografía de North Florida** (1 asset, sin aprobar; 191 sin región),
`03_web_ready/projects/north-fl/` vacío a propósito, y la regla 2 dice *no llenar una página de
North Florida con una foto de South Florida*.

Las dos rutas piloto son North Florida: Gainesville es Alachua y Ocala es Marion, y su propio
héroe pone **el teléfono de North Florida primero** (`zonas: ["North Florida","South Florida"]`).

**Leída al pie de la letra, la regla 2 deja el banco sin poder dar una sola foto a las dos
páginas de este encargo.**

Pero el sitio ya resolvió el fondo del problema, y en la dirección contraria: R20-CIUDADES F2
cambió las fotos de `trusted-section` **precisamente porque el `alt` afirmaba la ciudad** —
«una foto no puede decir dónde se hizo si es la misma en 53 sitios»—. Y el `suggested_alt_gallery`
del banco **no nombra ciudad ni región**: «Completed backyard pool with raised spa».

| | Qué | Coste |
|---|---|---|
| **a** | **Usar el banco con alt no localizador**, que es lo que el sitio ya hace. Contradice la *letra* de la regla 2, cumple su *espíritu* | 0 |
| **b** | No usar el banco en las 2 piloto hasta que haya fotografía de North Florida | el banco no sirve para este encargo y las fotos siguen a 1250 |
| **c** | **Encargar una sesión en North Florida** (Gainesville / Ocala) | lo que recomienda el propio informe; resolvería las 53 con material que **sí** puede afirmar la localidad |

**Recomiendo (a) ahora y (c) encargado.** Razón medida: las fotos que hay hoy en esas dos páginas
**no tienen procedencia verificada de ninguna clase**. Cambiarlas por las del banco es una mejora
de honestidad —obra real verificada, 4-5× de resolución, `alt` escrito sobre hechos observados,
IA en cuarentena— aunque la región sea South Florida. Lo que no se puede hacer, y el banco tiene
razón, es **decir** que son de North Florida.

### 6.4 · 🟠 Hallazgo que no venía a buscar: el sitio ya afirma North Florida en 72 rutas

```
ls public/images/projects | grep north-florida   →  6 de las 15 galerías de obra
grep -rlo 'estate-pool-spa-sun-shelf-north-florida' .vercel/output/static | wc -l   →  72
```

**Seis galerías de obra del sitio llevan `-north-florida` en la carpeta y en la URL**, y
`CarruselProyectos` las pinta en **72 rutas** — Ocala y Gainesville incluidas. El banco, hecho
con los ficheros de origen del cliente, **no encuentra fotografía verificada de North Florida**.

Dos lecturas, y desde aquí no se puede cerrar:

1. Son obra real de North Florida cuyos ficheros de origen **nunca entraron en el banco** (el
   banco tiene 420 ficheros; el sitio tiene 227 fotos de obra: son poblaciones distintas).
2. Los nombres son aspiracionales y la obra es de South Florida.

**Es una pregunta de veracidad sobre páginas vivas, y solo Sebastian la contesta.** Y es además
el camino más corto para cerrar el hueco nº 1 del banco: si esas 6 son reales, sus ficheros están
casi seguro entre los **191 sin región**, y contestarlo desbloquea North Florida para las 2 piloto.

### 6.5 · Lo que cuesta traer el banco al repo

| | |
|---|---|
| Rutas | el banco propone `/images/projects/<region>/<project-id>/` · el sitio ya tiene `public/images/projects/<slug>/` → **subnivel distinto, sin colisión** (verificado) |
| Despliegue | `url_status = proposed_not_deployed` en **todas**. Hay que **copiar** los `.webp` a `public/` — no es editar un JSON |
| `check:assets` | puerta existente; hay que correrla tras copiar |
| Registro | toda foto usada se anota en `08_ai_index/page_asset_usage.csv` (hoy solo tiene la cabecera) |
| `alt` | se usa `suggested_alt_gallery` / `suggested_alt_service`. **Nunca** añadir ciudad, dirección, medida, precio, marca ni licencia |
| IA | los 48 `generated_design_concept` **nunca** como obra. 37 tienen nombre inocuo y 9 se llaman igual que un asset acabado: **el nombre no prueba nada, manda `asset_class`** |

---

## 7 · DIRECCIÓN DE ARTE — qué foto va en cada hueco, y por qué

Pedido de Sebastian (18-sep): *«actuar como experto en director de arte para usar las imágenes
ideales para captar clientes potenciales, que llamen la atención y en excelente calidad»*.

Todo lo de aquí sale de consultar el banco, no de opinar.

### 7.1 · La paleta real, medida

| Eje | Reparto de los 74 aprobados |
|---|---|
| Vista | tierra **47** · aéreo **27** |
| Luz | día **62** · **hora dorada / crepúsculo 12** |
| Etapa | acabado **71** · **renovación en curso 3** |
| Aire para texto | bottom 27 · top 22 · left 17 · right 8 |
| Arquetipo | A2 piscina+spa integrados 60 · A7 línea recta clásica 14 |
| Propiedades | **3** |

### 7.2 · 🔴 La trampa de casting, y es fácil caer en ella

**Los 8 assets con recorte vertical seguro (4:5) son TODOS de `project-059`. Y tres de ellos son
el vaso VACÍO en pleno resanado** — incluido `ag-de085ec669`, que con **94** es el asset con más
puntuación de todo el banco.

> Quien reparta las celdas verticales por «mayor `quality_score` con recorte 4:5» pondrá **tres
> fotos de una piscina vaciada, en obra, arriba de una landing de pago de piscina NUEVA.**

`00-PRINCIPIOS.md` §4 dice que no se eligen imágenes por el nombre del fichero. Esto lo extiende:
**tampoco por la puntuación.** Un 94 sobre un vaso vacío es una gran fotografía de un sujeto
equivocado para ese hueco.

Descontados esos 3, quedan **5 verticales útiles, todas de la misma casa**. Y `trusted-section`
pide 3.

**De ahí sale un argumento que no es de nitidez sino de casting:** bajar la verticalidad de esas
celdas (§3A, opción 2) lleva el reparto de **5 candidatas de 1 propiedad** a **74 de 3**. La
geometría no solo arregla el 1,43×: es lo que libera el casting.

### 7.3 · El activo escaso: 12 fotogramas de hora dorada

De 74, solo **12** son hora dorada o crepúsculo. Y aéreo + crepúsculo son **exactamente dos**
(`ag-b2d0417375` y `ag-0a981243d7`, los dos de `project-061`).

En marketing de piscinas no se vende la piscina: **se vende la tarde.** Agua encendida, luz
caliente en el deck, cielo azul de hora azul. Esos 12 son el material que para al visitante, y
hay que **gastarlos a propósito**, no dejarlos caer donde toque por orden de puntuación.

### 7.4 · Reparto por hueco

| Hueco | Trabajo | Qué pide | Casting |
|---|---|---|---|
| Héroe | primera impresión | — | **vídeo, no se toca** (decisión de Sebastian en R20 §3) |
| `trusted-section` · 3 celdas | «somos reales y con licencia» | vertical, obra **acabada** | las 5 verticales útiles de `project-059` — **o** bajar la verticalidad y abrir a las 74 |
| **Galería nueva** (cambio 4) | «mira lo que hacemos» | **variedad** | aquí se gastan los 12 de hora dorada, **repartidos**; nunca dos seguidas de la misma propiedad |
| Collage FAQ · 5 | apoyo, se ve pequeño | detalle legible en miniatura | **tierra, no aéreo**: un dron a 130 px de ancho es una mancha azul |
| Antes/después | la prueba más persuasiva del banco | par verificado | los 3 de `renovation_in_progress` + la acabada de la misma propiedad |

### 7.5 · Seis reglas de dirección, para que el reparto no dependa de quién lo haga

1. **La hora manda sobre la resolución.** Entre un 85 de crepúsculo y un 93 de mediodía, en un
   hueco de captación gana el crepúsculo.
2. **`quality_score` no es casting** (§7.2). Es calidad técnica, no idoneidad.
3. **Aéreo lejos, tierra cerca.** El dron explica la *forma* del proyecto; el plano de tierra
   vende el *material*. En celdas pequeñas el dron no se lee.
4. **Nunca dos de la misma propiedad seguidas.** Con 3 casas y 20 huecos hay que barajar por
   `project_id`, y el buscador ya avisa con `[repeat property]`.
5. **El aire para el texto se casta, no se sufre.** Para cualquier hueco con texto encima se elige
   por `copy_space_zone`, no por belleza.
6. **Se mira la hoja de contactos antes de fijar nada** (`07_contact_sheets/`). El banco da
   metadatos; el encuadre real se ve mirando.

### 7.6 · La que NO va en esta landing, y es la mejor del banco

El antes/después de `project-059` es lo más persuasivo que hay aquí: vaso vaciado en resanado y
piscina acabada, **misma propiedad verificada**. Y **no va en estas dos páginas**: son la Final URL
de ad groups de *new pool construction*, y enseñar una piscina vieja siendo resanada contradice el
anuncio que se acaba de pagar — es la misma razón por la que R20 F1 quitó «pool remodeling» del
apoyo del héroe.

**Su sitio es `/services/pool-remodeling-renovation-in-north-south-florida`**, que ya tiene capa de
captación. Queda **reportado, no hecho**: está fuera del alcance de este encargo.

---

## Registro

| Fecha | Cambio | Estado |
|---|---|---|
| 18-sep-2026 | 1 · héroe compacto, badge con icono, menos líneas | registrado y analizado |
| 18-sep-2026 | 2 · sección de Servicios de la home entre Pool Features y Testimonios | registrado y analizado |
| 18-sep-2026 | 3A · definición de las fotos de obra · 3B · ritmo vertical entre secciones | registrado y analizado |
| 18-sep-2026 | 4 · la galería de las fichas, entre el formulario y el 3D | registrado y analizado |

## Decisiones abiertas de Sebastian

| # | De | Pregunta |
|---|---|---|
| 1 | §1.6 | El párrafo del héroe: ¿se reescribe como 4 chips con icono (cambia texto) o se deja la frase? |
| 2 | §1.6 | Los CTA miden 36-38 px: ¿se suben en las 2, en las 121, o se dejan? |
| 3 | §1.6 | ¿Una sola aprobación al final (recomendado) o una por cambio? |
| 4 | §2.5 | ¿La sección de Servicios cierra con CTA a `#estimate`? |
| 5 | §2.8 | ¿Pestaña por defecto «Pool Solutions» en las ciudades, o «Outdoor Living» como la home? |
| 6 | §3A | **¿Existen los originales de cámara de las 10 obras?** Si existen, el problema de definición se acaba con una subida de ficheros |
| 7 | §3A | Mientras tanto, ¿se baja la verticalidad de las celdas (1,43× → 1,07×, gratis y reversible)? |
| 8 | §3B | El ritmo uniforme: ¿solo rutas de ciudad (recomendado) o encargo propio para las 122? |
| 10 | §6.3 | **¿Se usan fotos South FL del banco en las 2 páginas North FL, con alt no localizador?** (recomiendo sí) ¿Y se encarga sesión en North Florida? |
| 11 | §6.4 | **¿Las 6 galerías `-north-florida` del sitio son obra real de North Florida?** Afecta a 72 rutas vivas y desbloquea el banco |
| 9 | §4.4 | **Qué fotos lleva la galería:** (a) las 20 con remodeling primero · (b) solo las 10 de remodeling, solape ~0 · (c) 10 elegidas a mano por hoja de contactos |
