# Encargo — Mega menú de «Services»: pulido de ejecución, sin rediseño

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5 estático, adaptador Vercel, réplica elevada
de un Webflow, 115 rutas, CSS propio, **sin React y sin Tailwind**).

**POLISH, DON'T REDESIGN.** El concepto del mega menú se queda como está: tres columnas de
servicios a la izquierda, tarjeta de preview a la derecha, la imagen cambia al pasar por
encima de cada servicio. Lo que sube de nivel es la **ejecución**: nitidez de imagen, peso de
los divisores, grosor del borde, hover, iconos, ritmo del espaciado, móvil y accesibilidad.

---

## 0 · Límites duros de este encargo

- **NO se despliega a producción.** En este repo desplegar *es* entrar en `main`: Vercel
  publica con el merge. Trabaja en rama propia (worktree propio), commitea ahí, abre PR si
  quieres — **no mergees a `main`** ni lo pidas. La publicación la decide Sebastian, después.
- **NO barras las 115 rutas.** El mega menú es cascarón compartido: con **una ruta** (la
  portada) queda cubierto para lo visual. El panel del navegador se abre para mirar una ruta,
  se mira y se cierra; no se deja corriendo.
- **NO rediseñes.** Nada de tarjetas por servicio, glassmorphism, cambio de paleta,
  reconstrucción, ni librerías de animación. Es CSS.
- **No toques nombres, URLs ni el número de servicios.** Son 14 y siguen siendo 14.

---

## 1 · Trampas del repo — léelas antes de abrir un fichero

Tres de los cuatro ficheros implicados son **salida generada**. Editarlos a mano funciona
hasta que alguien corre el generador y se lo lleva por delante.

| Fichero | ¿Generado? | Lo escribe | Dónde va tu cambio |
|---|---|---|---|
| `src/components/Nav.astro` | **SÍ** | `scripts/build-shell.mjs` | en el post-proceso del generador |
| `src/styles/webflow.css` | **SÍ** | `scripts/build-css.mjs` desde `_source/webflow-css` | **no lo toques** |
| `src/styles/propio.css` | no | a mano | **aquí van los overrides de CSS** |
| `src/components/Interacciones.astro` | no | a mano | aquí va el comportamiento |

- `propio.css` se importa en `Base.astro` **después** de `webflow.css`: gana por orden,
  **sin `!important`**. Si necesitas un `!important` es que estás en el fichero equivocado.
- Después de tocar `build-shell.mjs`, corre `npm run shell` y **comprueba que el arreglo
  sobrevive** a la regeneración.
- Aquí **no existe `webflow.js`**. El menú móvil (`w-nav`) y los desplegables (`w-dropdown`)
  están reimplementados a mano en `Interacciones.astro`.

---

## 2 · Diagnóstico ya medido — no lo repitas, arráncalo de aquí

Todo lo de abajo está verificado sobre el árbol y sobre `.vercel/output/static`. Audita si
quieres ampliar, pero no gastes un turno en redescubrirlo.

### Marcado (dentro del string `marcado` de `Nav.astro`)

```
section.menu › .navbar › nav.nav-menu › .dropdown (Services) › nav.dropdown-list-submenu
  └── .navbar-submenu › .wrapper-submenu
        ├── .block-link-submenu   (70 %)  → 14 × .item-link[data-service] › a.link-block-service
        │                                     › .box-icon › img.icon-deco  +  .text-link-submenu
        └── .block-img-submenu    (30 %)  → 14 × .wrapper-picture-service[data-service]
                                              › img.picture-service + .cover (título + descripción)
```

Las 14 claves `data-service`: `construction`, `remodeling`, `pergolas`, `louvered`,
`enclosures`, `kitchens`, `screens`, `patiorooms`, `decks`, `landscaping`, `lighting`,
`irrigation`, `steel`, `furniture`.

### CSS actual (extraído de `webflow.css`, minificado)

```css
.wrapper-submenu      { gap:50px; min-height:350px; display:flex }
.block-link-submenu   { width:70%; gap:1%; display:flex; flex-flow:wrap }
.item-link            { width:32%; border-radius:5px; transition:background-color .25s }
.item-link:hover      { background-color:#ffffff40 }          /* blanco al 25 % */
.link-block-service   { gap:1em; min-height:45px; padding:1rem 5px;
                        border-bottom:2px solid var(--gold-light) }   /* ← el divisor pesado */
.box-icon             { width:30px; height:30px; border-radius:20px;
                        background-color:var(--gold-light) }
.icon-deco            { width:15px; height:15px }
.block-img-submenu    { width:30%; min-height:350px; transition:all .35s }
.wrapper-picture-service { border:5px solid var(--gold);            /* ← el borde grueso */
                        border-radius:20px; opacity:0; cursor:none;
                        transition:opacity .25s; position:absolute }
.wrapper-picture-service.is-active { opacity:1; cursor:auto }
.picture-service      { object-fit:cover; width:500px; height:100% }
.cover                { background-image:linear-gradient(#0000,#2183a757 40%,
                        #31c2f680 65%,#001c63d9); padding:0 1rem 2em 2em }
.title-car-subtitle   { font-size:20px; font-weight:500; line-height:120% }

@media (max-width:991px) {
  .block-img-submenu  { display:none }   /* la preview YA no existe en móvil */
  .box-icon           { display:none }   /* ← y los iconos dorados TAMPOCO */
  .item-link          { width:100% }
  .block-link-submenu { flex-flow:column; width:100% }
}
```

### Los cinco fallos medidos

1. **Las imágenes van borrosas.** Las 14 previews son `/images/site/*.avif` a **467 × 350 px**
   (36–72 KB) y el CSS las pinta a **500 px de ancho**: se escalan ×1,07 a 1x y **×2,14 en
   pantalla retina**. Es el fallo más visible de los cinco y el que más barato sale de arreglar.
2. **Los divisores son bordes de tabla.** `border-bottom:2px solid var(--gold-light)` (#edb660)
   a opacidad plena, en cada uno de los 14 items. Es exactamente el «demasiado peso visual».
3. **El borde de la preview es de 5 px** de `--gold` sólido sobre un radio de 20 px.
4. **Móvil: no hay preview y tampoco hay iconos.** Por debajo de 991 px el menú queda
   reducido a una lista de texto plano. `.link-block-service` da 45 px de alto útil: **por
   debajo de los 44 × 44 solo por los pelos**, y sin el círculo el `<a>` pierde ancla visual.
5. **El script de depuración está en producción.** El `<script>` embebido en `Nav.astro`
   (`.code-embed-menu`) lleva ~20 `console.log` / `console.warn` — «✓ Submenu encontrado»,
   «Imagen mapeada: …» — y se sirve en **121 ficheros HTML** del build. Verificado:
   `grep -rlo "Submenu encontrado" .vercel/output/static --include='*.html' | wc -l` → 121.

### Lo que YA está bien — no lo toques

- La proporción **70 / 30** entre servicios y preview ya cae dentro de lo razonable.
- El **mecanismo de cambio de imagen** (mapa `data-service` → `.is-active`, `mouseover` +
  `click` delegados en `.wrapper-submenu`) funciona y **se conserva**. Puedes mejorar la
  transición; no reescribas la lógica.
- El primer servicio se activa por defecto al cargar. Se mantiene.

---

## 3 · El encargo, por frentes

### A · Imágenes en condiciones — el banco ya está en el repo

Existe `public/images/residentials/<slug-del-servicio>/`: **14 carpetas, una por servicio**,
con originales de **1250 × 1250 a 1950 × 1219 px** (0,3–2 MB). El slug de la carpeta coincide
con el `href` del item del menú, así que el emparejamiento es mecánico:

```
/services/custom-pool-spa-builders-in-north-south-florida
  → public/images/residentials/custom-pool-spa-builders-in-north-south-florida/
```

Trabajo:

1. **Elige por hoja de contactos, nunca por el nombre del fichero** — el nombre miente sobre
   el encuadre. Monta una hoja de contactos con las candidatas de las 14 carpetas y elige
   mirándolas. Descarta `*-before.png` / `*-after.png` (son pares de antes/después) y los
   `artboard-*.svg` (son iconos).
2. Deriva de cada original un AVIF a **1000 px de ancho** (2× los 500 px de la caja) con el
   encuadre correcto para una caja apaisada. Manda el **recorte**, no el reescalado: si el
   original es cuadrado, recorta a la proporción de la caja; no lo deformes.
3. Déjalas en `public/images/site/` siguiendo la nomenclatura que ya hay, y apunta el `src`
   desde el generador. **No borres las antiguas** en este encargo: si alguna otra ruta las usa,
   te la llevas por delante. Comprueba con
   `grep -rlo '<nombre-fichero>' .vercel/output/static --include='*.html' | wc -l`.
4. Pon `width` y `height` explícitos en cada `<img class="picture-service">`. Hoy no los
   llevan y el navegador no puede reservar la caja.
5. La preview está oculta hasta que se abre el menú: mantén `loading="lazy"` y **no provoques
   layout shift** al cambiar de imagen (las 14 son `position:absolute` en la misma caja, así
   que si todas comparten proporción no lo habrá — asegúralo).

**Si al mirarlas ves que el banco no da un encuadre decente para algún servicio, dilo en el
informe y deja ese servicio con su imagen actual.** No inventes una imagen: los activos
generados por IA **nunca** representan obra del cliente en este sitio.

### B · Divisores y borde: que dejen de gritar

- Baja el divisor de `2px solid var(--gold-light)` a **1 px y baja opacidad**. La intención es
  «se intuye la fila», no «hay una tabla». Un `rgba()` derivado del oro, o un
  `linear-gradient` que se desvanezca en los extremos: decide tú, pero **una sola solución**
  para los 14, y que el último item de cada columna no cuelgue un divisor huérfano.
- Baja el borde de `.wrapper-picture-service` de **5 px a 1–2 px**, y ajusta el radio para que
  el conjunto no se sienta acolchado.
- `cursor:none` en la preview inactiva es un residuo raro; quítalo si no cumple ninguna función.
- **El oro `#f4b248` da 1,86:1 sobre blanco.** Nunca marca estado ni lleva texto encima. Esto
  está medido y no se rediscute: si necesitas un acento legible, va sobre navy (8,40:1).

### C · Hover, foco e iconos

- El hover actual (`#ffffff40`, blanco al 25 %) es un bloque. Bájalo y acompáñalo de algo más
  fino: desplazamiento horizontal de la flecha (`transform: translateX`), cambio de opacidad
  del círculo. **Anima `transform` y `opacity`, nunca `width`/`height`/`top`/`left`.**
- **150–250 ms**, easing natural, y respeta `prefers-reduced-motion`.
- El círculo dorado de 30 px con flecha de 15 px se conserva como concepto. Revisa que el
  centrado óptico sea real y que no domine al texto.
- **`:focus-visible` tiene que verse.** Hoy no hay estilo de foco propio: el teclado depende
  del outline del navegador, que sobre el fondo azul del menú se pierde.

### D · Móvil (≤ 991 px) — el frente con más margen

No comprimas las tres columnas. Lo que hay hoy es una lista de texto plano sin iconos y sin
preview. Decisiones que tomas tú, con criterio y justificándolas:

- **Devuelve el ancla visual.** El `.box-icon` desaparece a 991 px; sin él cada fila es texto
  suelto. Recupéralo en un tamaño adecuado a móvil, o sustitúyelo por algo equivalente.
- **Área táctil ≥ 44 × 44 CSS px** de verdad, no 45 px justos que cualquier ajuste se come.
  Esto lo mide `npm run check:menu` con tacto real: es la puerta, no una opinión.
- **La preview en móvil**: hoy está oculta. Analiza si devolverla aporta — si la traes, que sea
  con poca altura y sin empujar la lista fuera de pantalla. Si decides dejarla oculta, **dilo
  explícitamente en el informe con el porqué**; lo que no vale es no haberlo mirado.
- Cuidado con `.glas-div`: es un `position:absolute; inset:0` con `z-index:1` que está en
  algunos items y ya ha tapado enlaces antes. Si estorba, quítalo desde el generador.

### E · Accesibilidad

- El toggle de «Services» abre con teclado, `Tab` recorre los 14 enlaces, `Escape` cierra.
- `aria-expanded` correcto en el toggle; `aria-controls` si procede.
- La interacción **no puede depender solo de `hover`**: hoy el cambio de imagen ya escucha
  `click` además de `mouseover` — mantenlo y añade `focusin`, o el teclado no mueve la preview.
- Contraste suficiente en el texto sobre el degradado de `.cover`.

### F · Limpieza

Saca los `console.log` / `console.warn` del script embebido. Es ruido de depuración en 121
páginas servidas. El script se queda; los logs no.

---

## 4 · El contrato de réplica — esto es lo que te va a bloquear

`npm run check:cascaron` compara el nav del build contra el sitio vivo congelado: **303 cajas
de elemento del nav en 4 anchos, más el texto carácter a carácter**. Cualquier cambio visual
que hagas aquí **la pone en rojo, y es correcto que lo haga**.

- Esa puerta **no lee `argv`** y no está en la cadena de `npm run check`: va en gate de fase.
- Hay un **re-baseline en espera** (FONDO-AGUA), parado por Sebastian. **No re-baselines nada
  por tu cuenta.** Corre la puerta, pega el rojo, y **deja escrito en el informe qué elementos
  se movieron y por qué**. La decisión de congelar la nueva referencia es de Sebastian.
- `check:visual` sí está en la cadena y mide la página con el menú **cerrado**: no debería
  moverse. Si se mueve, es que has tocado algo fuera del desplegable — eso sí es un fallo tuyo.

---

## 5 · Verificación — son las puertas, no las capturas

Sobre `.vercel/output/static`, **nunca** sobre `astro dev`: dev no hornea `width`/`height` y
las medidas mienten.

```bash
npm run check:tokens                 # estática, <1 s, córrela siempre
npm run check:menu                   # LA puerta de este encargo: alcanzable + 44x44, tacto real
npm run check:rutas && npm run check:enlaces
node scripts/check-visual.mjs '=/'   # la portada. Comillas: zsh se come `=/` suelto
npm run check:cascaron               # gate de fase; se espera rojo (ver §4)
```

Deriva las rutas afectadas, no las adivines:

```bash
grep -rlo 'wrapper-picture-service' .vercel/output/static --include='*.html' | wc -l
```

**Nunca pases `/` como filtro a `check-visual`**: casa por `includes()` y te lleva las 115
creyendo que mides una.

**Una puerta que no corrió no es una puerta verde.** Si se saltó por falta de referencia,
dilo — falla ABIERTO. Un número sin el comando que lo produjo es una opinión: pega la salida
literal.

`npm run build` sobrescribe `.vercel/output/static`, que es artefacto compartido con otras
sesiones sobre este mismo árbol. **Para este encargo estás autorizado a construir**, pero:
`git fetch && git merge --ff-only` antes, worktree propio, y **nunca `git add -A` ni `git add .`**
— añade por ruta explícita y revisa `git status --short` antes de commitear.

---

## 6 · Entrega

Un informe corto, en este orden:

1. **Ficheros tocados** (ruta + qué cambió en una línea).
2. **Las 14 imágenes**: original elegido → derivada, con resoluciones antes/después. Y los
   servicios donde el banco no daba un encuadre decente, si los hubo.
3. **Antes / después en números**: divisor, borde, hover, área táctil móvil.
4. **Decisión sobre la preview en móvil**, con el porqué.
5. **Accesibilidad**: qué se añadió (foco, teclado, ARIA).
6. **Salida literal de cada puerta.** `check:cascaron` en rojo con la lista de elementos
   movidos, para que Sebastian decida el re-baseline.
7. **Lo que dejaste sin hacer y por qué.**

No hay merge a `main`. Termina con el diff commiteado en tu rama y el informe.
