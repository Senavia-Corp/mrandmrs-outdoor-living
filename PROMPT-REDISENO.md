# PROMPT-REDISENO.md — Programa R

> Hermano de `PROMPT.md` (la migracion, 12 fases, terminada) y `PROMPT-ESTIMADOR.md` (Fase 12).
> Este documento gobierna el REDISENO. Lo leen el director y todos los chats trabajadores.
> Si algo de aqui contradice a `PROMPT.md`, manda este documento — pero solo para las fases R6+.

---

## §0 CONTRATO

`PROMPT.md` §0 decia: **paridad exacta con el sitio Webflow vivo**. Ese contrato se cumplio y esta
demostrado (115 rutas, 10 puertas, 72 MB de baseline versionado).

El contrato de este programa es el contrario: **dejar de replicar Webflow y superarlo.** Home
remodelada por completo, las otras 114 pulidas una a una, con criterio de disenador UX/UI con 20 anos
haciendo sitios para pool contractors en Florida. Que parezca de $10.000, no de plantilla.

**Lo que NO cambia del contrato viejo:**

- El texto. Ni una palabra, en ninguna pagina.
- Las rutas. Las 115 siguen siendo 115.
- El `<head>`. Los 115 exactos.
- La disciplina: un numero sin el comando que lo produjo es una opinion.

---

## §1 LAS CUATRO REGLAS

### 1. El texto no se toca

`check:texto` mide `innerText` al **100 %, sin tolerancia**, contra `baseline/text/`. **Es la
barandilla del rediseno, y por eso no se re-baseliniza NUNCA.**

De ahi sale el permiso mas util del programa: **puedes cambiar el markup que quieras mientras esa
puerta siga verde.** Un `div` envolvente, un elemento decorativo o un `aria-label` no mueven
`innerText`. Una palabra, si. El limite lo mide una maquina; no hay que juzgarlo a ojo ni pedir
permiso para cada caso.

`check:seo` tampoco se re-baseliniza: si el texto no cambia, el `<head>` tampoco.

### 2. Solo CSS en las 114 paginas

El markup se toca **unicamente en `src/pages/index.astro`**, y solo en la fase R9. Cada cambio se
anota en `MIGRACION-LOG.md`.

El techo del CSS puro es alto: `order`, `grid-template-areas`, escala tipografica, ritmo vertical,
color, sombras, radios, estados, movimiento. Lo que no se puede es anadir una seccion que hoy no
existe.

### 3. Donde vive el CSS nuevo, y donde no

**Nuevo:** `src/styles/disenio/` — `tokens.css` (unico sitio donde puede aparecer un literal) y
`base.css`. Lo posee ARTE; es el **unico** que lo escribe.

**Nunca:** `src/styles/webflow.css` (167 KB en UNA linea, DERIVADO) · `src/styles/fuentes.css`
(DERIVADO) · `public/fonts/` (las 6 woff2 son las exactas de Google: con el Inter variable de
fontsource el nav cayo al 95,85 % porque un `a.nav-link` media 57,35 px en vez de 59,54) · ningun
fichero con cabecera `// DERIVADO`, salvo `index.astro` en R9 · `_source/`.

**Orden de carga en `src/layouts/Base.astro`:**

```
fuentes.css -> webflow.css -> disenio/tokens.css -> disenio/base.css -> propio.css
```

Gana por **orden**, no por peso. El patron ya esta probado: `propio.css` se importa despues de
`webflow.css` y gana sin un solo `!important` (comentario en `Base.astro:33`).

**Dos prohibiciones absolutas en la capa nueva:**

- **Cero `!important`.** Si una regla lo necesita, esta mal puesta.
- **Nada envuelto en `@layer`.** Cualquier regla SIN capa gana a toda regla CON capa. `webflow.css`
  son 167 KB sin capa: meter `disenio/` en `@layer` lo haria perder contra todo Webflow, incluidas
  sus 326 reglas en `max-width:991`.

### 4. La disciplina de la casa, heredada entera

- **Un numero sin el comando que lo produjo es una opinion.** Pega la salida.
- **Una puerta que nunca ha estado en rojo no prueba nada.** La que escribas, rompela una vez a
  proposito y pega el rojo.
- **No avanzas de fase con el gate en rojo.**
- **Un commit por fase**, con el numero de fase en el mensaje, en `main`.
- Dos fallos independientes pueden dar el mismo sintoma.

---

## §2 TRES DEFECTOS VERIFICADOS — se arreglan en R6, antes de rediseñar nada

### 2.1 `check:visual` falla ABIERTO — es el fallo n.º 1

`scripts/check-visual.mjs:158`:

```js
const ref = path.join(RAIZ, 'baseline/shots', String(ancho), `${aSlug(ruta)}.jpg`);
if (!fs.existsSync(ref)) { saltadas++; continue; }
```

Falta de referencia = **saltada en silencio, no roja**. Hoy da igual porque las 460 existen. En cuanto
haya rutas rediseñadas, **una ruta sin captura aprobada sale verde sin haberse medido jamas.**
`check-texto.mjs` y `check-seo.mjs` si ponen rojo en ese caso; solo la visual falla abierta.

**Arreglo:** si el contrato de la ruta es `rediseno` y falta la referencia -> ROJO. Si es `paridad`,
sigue siendo `saltada`.

### 2.2 `npm run paginas` borra la home rediseñada, en silencio

`scripts/build-paginas.mjs:434-437` calcula `destino = ruta === '/' ? 'index' : ruta.slice(1)` y hace
`writeFileSync` sobre `src/pages/index.astro`, cabecera `// DERIVADO` incluida. No hay ninguna guarda.

**Arreglo:** un conjunto `NO_REGENERAR` que **falle ruidosamente**, no que salte en silencio.

### 2.3 El README miente sobre que puertas piden foco

`README.md:57-63` mete a `check:seo` en el grupo de las que abren navegador. **No lo abre:**
`scripts/check-seo.mjs:24-26` importa solo `fs`, `path` y `JSDOM`.

Las atadas al foco son **4**: `check:texto`, `check:visual`, `check:ix2`, `check:cascaron`.
Eso libera una puerta entera para los trabajadores en paralelo.

---

## §3 EL EQUIPO

### Restriccion dura de orquestacion

Las 4 puertas de navegador corren Chromium **visible** y **miden mal sin foco de ventana**. Medido y
escrito en `README.md:62-63`: dos a la vez llevaron la captura de **9,2 s a 45 s por pagina**, y esas
capturas quedaron en duda.

**Solo el DIRECTOR las corre, y de una en una.** Todas miden sobre `.vercel/output/static`:
`npm run build` antes, siempre. Nunca sobre `astro dev`.

Coste para planificar: barrida completa `check:visual` ~65 min · **una ruta x 4 anchos: 35-60 s.**
Regla: visual por ruta despues de cada informe; barrida completa solo en el gate de fase, una vez.

### Roles y propiedad EXCLUSIVA de escritura

| Rol | Donde | Escribe (exclusivo) | Puertas |
|---|---|---|---|
| **DIRECTOR** | el chat que arranca el programa | `disenio/contratos.json`, `MIGRACION-LOG.md`, `src/layouts/Base.astro`, `scripts/*`, **todos los commits**, el deploy | **Todas.** Unico que abre Chromium |
| **ARTE** | chat que abre el humano | `src/styles/disenio/*` | solo estaticas |
| **HOME** | chat que abre el humano | `src/pages/index.astro` | solo estaticas |
| **PULIDORES** | chats o subagentes, en R10 | un lote de paginas **disjunto** cada uno | solo estaticas |

Los cuatro puntos de contencion — `Base.astro`, `build-paginas.mjs`, `contratos.json`,
`MIGRACION-LOG.md` — son del director. Centralizarlos sale mas barato que fusionarlos.

**Techo de concurrencia: 3 trabajadores editando.** Por encima, el director es el cuello de botella
(unico ejecutor de puertas y unico committer) y la cola crece mas rapido de lo que drena. Si su
contexto se satura, se saca un cuarto chat **QA** que corra las puertas — pero no antes.

### El director NO puede abrir chats

No existe esa herramienta. Puede *listar* las sesiones del humano, *leer* su transcripcion y
*mandarles* un mensaje que les llega como turno de usuario (`ListAgents`, `SendMessage`,
`mcp__ccd_session_mgmt__*`). **Los chats los abre el humano.**

### Subagentes con worktree: donde si y donde no

`isolation:"worktree"` **solo para trabajo exploratorio y desechable que nunca construya** — un
`Explore` leyendo las 115 paginas, tres `frontend-design` probando direcciones de heroe en paralelo,
un `ui-qa` auditando.

**La ruta de edicion va en arbol compartido con propiedad exclusiva de ficheros.** Tres razones
medidas: (1) todas las puertas miden UN `.vercel/output/static` de UN arbol, y N worktrees
construyendo a la vez compiten por CPU justo cuando la puerta serializada necesita la maquina
tranquila — que es el efecto de los 45 s; (2) `baseline/` son 72 MB y cada worktree quiere su
`npm ci`; (3) fundir 5 worktrees y *entonces* ver la visual en rojo hace imposible saber de quien fue.

### Integracion: no hay merge

Los trabajadores escriben en el arbol compartido. Integrar es que el director revise `git diff` de los
ficheros declarados, corra las puertas de foco y haga **un commit por fase**. Si alguien toco un
fichero que no posee: `git checkout` de ese fichero y se reemite el encargo.

---

## §4 EL PROTOCOLO

Hereda la plantilla de entrada que el repo ya usa (`MIGRACION-LOG.md:83`).

### ENCARGO (director -> trabajador)

```
ENCARGO          R9-H-03
PROYECTO         /Users/senavia/Sites/mrandmrs-outdoor-living   (las sesiones abren en ~)
RUTAS            /
POSEES           src/pages/index.astro
PROHIBIDO        todo lo demas. En especial Base.astro, build-paginas.mjs,
                 contratos.json, baseline/, MIGRACION-LOG.md, y EL TEXTO VISIBLE
CONTRATO         rediseno desde <sha>
OBJETIVO         una linea
ACEPTACION       la condicion exacta, con numeros
CORRES TU        npm run build · check:tokens · check:enlaces · check:seo · check:rutas
CORRO YO         check:texto · check:visual · check:ix2 · check:diseno
NO HAGAS         git commit · npm run paginas · abrir Chromium · tocar baseline/
```

### INFORME (trabajador -> director)

```
INFORME          R9-H-03
ESTADO           listo | bloqueado | parcial
FICHEROS         ruta:linea, uno por linea
NUMEROS          metrica | antes | despues | el comando que lo produjo
SALIDA REAL      pegado literal de cada puerta. No resumas
RIESGO A OTRAS   que otras paginas puede haber movido esto, y por que
ABIERTO          lo que queda y de quien depende
```

**`RIESGO A OTRAS` es el campo que sostiene el sistema.** Un token nuevo mueve 115 paginas; el
director necesita saber que reverificar sin barrer las 115.

---

## §5 LAS PUERTAS

### Las que NO se tocan (gratis)

| Puerta | Sigue significando |
|---|---|
| `check:texto` | `innerText` 100 % identico al baseline de Webflow. **La barandilla** |
| `check:seo` | 115/115 `<head>` exactos |
| `check:enlaces` | 0 rotos + todo lo que pide `dist/` esta en `git ls-files` |
| `check:assets` | firma binaria = extension |
| `check:rutas` | 115/115, 0 extras |

### `check:visual` — lo unico que cambia de significado

Deja de medir «igual que Webflow» y pasa a medir «no he roto nada desde la ultima aprobacion».

**`UMBRAL = 99`, `TOLERANCIA = 0.3` y `TOL_ALTO = 3` no se tocan jamas.** Una pagina que cambia de
diseno se re-baseliniza; no se le rebaja la nota.

Mecanica, deliberadamente **sin** segundo arbol de referencia:

1. **`disenio/contratos.json`** — unica fuente de verdad. Toda ruta es `paridad` salvo que figure ahi
   con contrato `rediseno`, fecha, sha y motivo.
2. **`baseline/shots/` sigue siendo el unico arbol vivo.** Al aprobar una ruta, su captura original
   **se mueve** a `baseline/webflow-2026-08/shots/` y la nueva ocupa su sitio. El archivo crece solo
   con lo que de verdad se redisena, y la prueba de paridad queda intacta y auditable.
3. Los 3 motivos `svc` de `DISTINTAS_A_PROPOSITO` (`check-visual.mjs:83-98`) se mudan a
   `contratos.json` al re-baselinizar esas rutas. Las otras 5 declaradas se quedan donde estan.
4. **`scripts/aprobar-diseno.mjs`** — el UNICO escritor de referencias. Se niega a correr si el arbol
   no esta limpio, si la ruta no figura en `contratos.json` con motivo, o si no hay build fresco.
   Captura con `ANCHOS`, `asentar()` y `aJpeg()` de `scripts/lib/captura.mjs`: **la misma receta, o la
   comparacion deja de significar nada.**

**Re-baselinizar es el unico acto irreversible del sistema.** Lo hace solo el director, y solo tras la
aprobacion visual del humano. Re-baselinizar una pagina con un defecto dentro lo convierte en la nueva
verdad, y a partir de ahi la puerta lo defiende.

### Las 2 que hay que escribir

**`scripts/check-tokens.mjs`** — estatico, sin navegador, <1 s. **Lo corre cada trabajador.** Barre
`src/styles/disenio/*`, `propio.css` y los bloques `<style>` de `src/components/**`. Prohibe:

- hex / `rgb()` / `hsl()` literales fuera de `disenio/tokens.css`
- `font-size` o espaciado en px fuera de la escala declarada
- `!important`
- selectores que no empiecen por `.mm-`, `.pe-`, `.svc-` o `:root` (dentro de `disenio/`)
- referenciar cualquier `--_apps---*` (los ~66 tokens shadcn muertos)
- **`animation-fill-mode: forwards`** y **`opacity: 0` que no cuelgue de `html[data-anim]`** — las dos
  formas de reabrir el desastre de las animaciones por la puerta de atras
- **presupuesto de peso**: el CSS de autor no pasa de un tope declarado

Es la puerta que mas rinde aqui: asi es exactamente como se pudre un sistema de diseno repartido entre
agentes que no se ven entre si. Excluye `webflow.css` y `fuentes.css` (DERIVADOS).

**`scripts/check-diseno.mjs`** — Playwright, reutiliza `scripts/lib/captura.mjs`. **Una sola visita
por pagina, dos invariantes**, porque la visita es lo caro:

- **Contraste** >=4.5:1 texto normal, >=3:1 texto grande, contra el fondo **efectivo** resuelto por
  composicion (degradados y video del heroe incluidos, que es lo que `axe` no ve).
- **Objetivos tactiles** >=24x24 px (WCAG 2.2 AA) rojo, <44x44 aviso, separacion >=8 px, a 479.

### Extension de `check:ix2` — 15 lineas

Un caso nuevo con `javaScriptEnabled: false`: con JS apagado, todo `[data-w-id]` debe estar a
`opacity: 1`. Es lo unico que habria cazado el desastre de AMS *antes* de ocurrir.

### Lo que NO se escribe todavia

`check:lighthouse` (especificado en `PROMPT.md` desde el principio, nunca escrito; el propio
`PROMPT.md` avisa de que el `NO_LCP` movil en localhost es artefacto de Lantern) y una puerta de CLS.
`check:visual` ya caza el desplazamiento de maqueta. Se escriben el dia que haya una regresion real
que medir.

---

## §6 LA CAPA DE DISENO

### Los tokens, derivados de los 13 reales

Hoy hay 81 custom properties en `:root` de `webflow.css` y **~66 son un sistema shadcn muerto** (3 en
uso). Los reales:

| Token de Webflow | Valor | Usos |
|---|---|---|
| `--blue_dark` | `#001c63` navy | 71 |
| `--gold` / `--yellow-1` | `#f4b248` oro | 53 |
| `--yellow-2` | `#d99933` | 25 |
| `--yellow-3` / `--gold-light` | `#edb660` | 22 |
| `--upcolor` | `#1cadeb` cian | 9 |
| `--blue-500` | `#31c2f6` | 2 |
| `--downcolor` | `#1d4bbf` | 5 |
| `--blue-50-2` | `#e9f1fd` | 4 |
| `--grey` | `#ececec` | 5 |
| `--white` / `--black` | | 88 / 5 |

Los tokens nuevos se **derivan** de esos, no los sustituyen. **Cada par de color lleva su ratio medido
escrito al lado** — la regla de la casa.

**Leccion que se codifica de una vez: el oro nunca marca estado.** `#f4b248` da **1,86:1 sobre blanco**
y no llega a los 3:1 de WCAG 1.4.11. El oro vive en fondos de CTA con texto navy (8,40:1). Esta
medido; no se rediscute.

### Escala tipografica

Hoy: **33 tamanos distintos en 135 declaraciones**, `h1` escalonando 45 -> 35 -> 30 px a saltos. Se
sustituye por ~7 pasos fluidos con `clamp()`, anclados en el 18px/140 % actual.

**El truco que hace posible el gate de R7: la curva del paso de `h1` se calibra para pasar exactamente
por 45 px a 1920, 35 a 991 y 30 a 479.** Una seccion aun no rediseñada no mueve un pixel aunque el
token este cargado.

Espaciado base 4: `4/8/12/16/24/32/48/64/96/128`. Radios `8/16/24/999` — el 16 coincide con
`--_apps---sizes--radius`, uno de los 3 shadcn vivos. Sombras de dos capas **tenidas de navy**, nunca
negro puro.

### Breakpoints: coexisten dos sistemas

Webflow usa `max-width` **479 / 767 / 991** (326 reglas concentradas en <=991), mas la banda inventada
**992-1239** de `propio.css:47` para el nav.

**El CSS nuevo usa `min-width` y solo tres: 480 / 768 / 992.** Nunca se mezclan en la misma regla. Y
las custom properties **no funcionan dentro de `@media`**: la tabla va en comentario, no en tokens.

### Convivencia con las 702 clases de Webflow

**No se renombra ninguna**: son los ganchos del rediseno. El markup nuevo lleva solo clases `mm-*`
(BEM con prefijo, convencion ya establecida: `mm-lb__nav--prev`). Los parches sobre clases de Webflow
siguen viviendo en `propio.css`.

### El movimiento ya esta bien — no lo rompas

`src/components/Interacciones.astro` (260 lineas) reimplementa IX2 a mano: 93 reveals por
`IntersectionObserver` desde `src/data/reveals.json`, 4 `@keyframes mm-*`, `prefers-reduced-motion` en
19 sitios, `@media print` en 4. Tres invariantes:

1. **El sello falla abierto**: `html[data-anim] [data-w-id][data-rev]:not([data-visto]){opacity:0}`, y
   `data-anim` lo escribe el JS **despues** de montar el observer. Moverlo a markup estatico deja el
   sitio invisible por secciones.
2. **Nunca `animation-fill-mode: forwards`** — deja `transform: matrix(1,0,0,1,0,0)` en vez de `none`,
   y eso crea contexto de apilamiento para descendientes `fixed`/`absolute`.
3. **`HUERFANAS_ESPERADAS = 14` (`check-ix2.mjs:53`) es un numero fijo.** Las claves de `reveals.json`
   son atributos `data-w-id`: una seccion reescrita los pierde y el numero sube. **O el `data-w-id`
   viaja al elemento nuevo (es lo que hizo R3), o se quita la clave en el MISMO commit con su motivo.**

---

## §7 LAS FASES

Continua la via «R» que ya existe en `git log` (`R1` `R3` `R5`).

| Fase | Que | Gate | Paralelo |
|---|---|---|---|
| **R6** Cimientos | Arreglar los 3 defectos de §2 · `contratos.json` · `aprobar-diseno.mjs` | Las 10 puertas dan **exactamente el mismo resultado que antes de empezar**, y `git diff --stat HEAD -- baseline/` esta vacio | **No.** Solo director. Bloquea todo |
| **R7** Sistema de diseno | `src/styles/disenio/*`, orden en `Base.astro` | Barrida visual **identica a R6**: cargar tokens que nadie consume debe mover **0 px** en las 115 | **Si**, con R8 |
| **R8** Puertas nuevas | `check-tokens.mjs` · `check-diseno.mjs` · ix2 sin-JS | Se corren contra el sitio **de hoy** y se anota el numero de partida. Una puerta que nace verde no dice nada. Cada una demostrada en rojo | **Si**, con R7 |
| **R9** La home | Descomprimir T0/T2/T4/T6 -> redisenar seccion a seccion | Descompresion: **`diff` del `index.html` construido = 0 bytes.** Rediseno: texto 100 % · visual >=99 % · ix2 verde · 0 violaciones de contraste · 0 objetivos <24 px · **aprobacion del humano** | **No** |
| **R10** Las 114 | CSS puro, por familias | Por lote: puertas propias verdes -> cola del director -> aprobacion -> re-baseline | **Si**, 3 lotes |
| **R11** Cierre | Barrida completa + deploy | Todo verde, y **reponer la coherencia git<->deploy** | **No** |

### Por que R7 va antes que la home

El nav y el pie salen en las **115** paginas. Redisenar el heroe de la home y despues cambiar la
tipografia base es rehacer el trabajo. R7 establece el lenguaje; R9 lo aplica primero.

### Por que R9 es la fase dificil

`src/pages/index.astro` son 26 lineas que contienen **~47,4 KB de HTML en 4 constantes de una sola
linea**: `T0` (11 686 ch), `T2` (17 396), `T4` (17 728), `T6` (626). Y **los fragmentos abren y cierran
secciones a medias entre si**: `T2` abre `.testimonial-section` y la cierra `T4`; `T4` abre
`.social-media` y la cierra `T6`.

No es capricho: `build-paginas.mjs:376-381` parte por el marcador `@@WIDGET@@`, y los widgets viven
*dentro* de secciones (`ResenasGoogle` dentro de `.testimonial-section`, `FeedInstagram` es el cuerpo
de `.social-media`).

**Dos pasos, y el orden importa:**

1. **Descomprimir a secciones cerradas, sin cambiar un byte.** Gate: `diff` del `index.html`
   construido = **0 bytes**, mas `check:texto` y `check:visual` verdes. Es refactor puro con red: la
   puerta te dice si te equivocaste, antes de que haya nada de diseno encima.
2. **Solo entonces, redisenar**, seccion a seccion, con `/` ya en contrato `rediseno`.

### El reparto de R10

Cada pulidor recibe un lote **disjunto**. Las familias son la particion natural:

`services/` (14) · `country/` (9) · `project/` (10) · `blogs/` (10) · `articles/` (3) ·
`where-we-serves/` (2) · `pool-builders/[slug]` (1 plantilla -> 53 paginas) · las 13 sueltas de raiz.

Tres lotes a la vez. Mas no rinde: el cuello de botella no es el trabajo, es la cola de puertas.

---

## §8 LO QUE PUEDE ROMPERSE Y NO LO CUBRE NINGUNA PUERTA

1. **`check-visual.mjs:158` falla abierto.** Se arregla en R6, antes que nada, o el programa entero
   mide en falso.
2. **`npm run paginas` borra la home rediseñada.** Nadie corre un generador durante el programa sin
   decirlo, y la guarda tiene que fallar ruidosamente.
3. **`disenio/` importado en el sitio equivocado.** Antes de `webflow.css` no gana nada: el rediseno
   «no se aplica» sin ningun error visible.
4. **`@layer` invertiria la cascada** contra los 167 KB sin capa de Webflow.
5. **Re-baselinizar una pagina con un defecto dentro** lo convierte en la nueva verdad.
6. **Dos trabajadores tocando `disenio/`.** Es el unico fichero compartido y por eso lo posee ARTE:
   quien necesite un token nuevo lo **pide**, no lo escribe.
7. **Las 3 rutas de Turnstile** (`/contact-us`, `/request-estimated`, `/pool-cost-estimator`) estan
   declaradas en `DISTINTAS_A_PROPOSITO` con la nota «hay que volver a medirlo contra la preview». Si
   pasan a `rediseno` sin resolver eso, la excusa queda horneada en la referencia nueva **para
   siempre**. Resolver ANTES de convertirlas.
8. **Lo desplegado es `77aedc2`, no `main`** — se desplego aislando 5 rutas con `git checkout`.
   Cualquier deploy del rediseno sobre esa historia se come parte del trabajo. Reponer la coherencia
   antes de R11, no durante.

---

## §9 APENDICE — recordatorios operativos, todos medidos

- Las puertas miden sobre `.vercel/output/static`. Sin `npm run build` antes, **abortan**.
- **Una puerta de navegador cada vez, con la ventana en foco.** Dos a la vez multiplican por 5 el
  tiempo y las medidas quedan en duda.
- El puerto de `dev` es **4325**.
- `astro dev` no hornea `width`/`height` ni sirve los assets igual: **verificar sobre `dist`, nunca
  sobre `dev`**.
- Barrida completa `check:visual`: ~65 min. Una ruta x 4 anchos: 35-60 s.
