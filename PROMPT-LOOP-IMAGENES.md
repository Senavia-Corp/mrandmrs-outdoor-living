# PROMPT-LOOP-IMAGENES · obra real en las 14 fichas, el megamenú y «Full-Service»

Encargo de Sebastian, 2-oct-2026. **Es un loop, no un encargo de una pasada.** Se lanza así, en
una sesión nueva sobre `~/Sites/mrandmrs-outdoor-living`:

```
/loop Lee /Users/senavia/Sites/mrandmrs-outdoor-living/PROMPT-LOOP-IMAGENES.md entero y ejecuta UNA iteración (§4). El estado está en docs/encargos/LOOP-IMAGENES-ESTADO.json del worktree loop-imagenes.
```

Cada disparo hace **una unidad** (§3), la commitea y programa el siguiente con el mínimo (60 s).
Cuando se cumple §8 o salta un freno de §7, el loop se para solo (`stop`). Todo lo que una
iteración necesita saber de la anterior está en el fichero de estado: **no confíes en tu memoria
de la conversación**, se compacta.

Sustituye a `PROMPT-IMAGENES-SERVICIOS.md` (21-sep): aquel hablaba de un banco en `~/Downloads`
que ya no existe y de solo dos fichas. No lo sigas.

---

## 1 · Qué se pide, y la meta que decide una máquina

Que **toda foto de servicio que el banco pueda cubrir sea obra real del banco**, elegida para
vender en el hueco concreto donde va, en tres superficies:

| Superficie | Dónde sale | Fotos |
|---|---|---|
| **Fichas** `/services/<slug>` | 14 rutas | héroe, galería, proceso, banda de inversión, collage de la FAQ |
| **Megamenú** «Services» | las 115 rutas | 14 `img.picture-service`, una por servicio |
| **«Full-Service Outdoor Living…»** | `/` y las 2 de `/where-we-serve/` | 14 `img.svc-foto`, una por servicio |

**Regla de Sebastian, literal:** *si no existe una foto real para ese tipo de imagen, se deja la
que está.* Un hueco que se queda no es un fallo: es un resultado, y se entrega con la foto que
habría que hacer (§8).

**Hecho = `node scripts/check-fotos-servicios.mjs` sale con 0** (la escribes en F0, §5). No hay
otro criterio de «terminado», y «se ve mejor» no es uno.

### Frontera — lo que el loop NO hace, pase lo que pase

| No | Por qué |
|---|---|
| Tocar la sección **Intro** (`trusted-section svc-intro`, el collage de 3) | Sebastian: esas fotos son las correctas |
| Tocar **«What we do»** (`section.services`, las 4 de `servicios.detalle[].foto`) | Ídem. Las dos se **auditan** (§5 F0) y se reportan; no se cambian |
| Publicar algo que no sea `procedencia: obra_real` + `estado: aprobada*` | `BANCO-IMAGENES.md` regla 4 |
| Usar una `dudosa` (hay 80) | Regla 5: hasta que Sebastian la adjudique |
| Edición generativa: borrar objetos, cambiar cielos, rellenar, reescalar con IA | Deja de ser obra real. Ver §6.4 |
| Cambiar copy, titulares, precios, logos, fondos decorativos (`design2/3.webp`) | Fuera de alcance |
| Editar `_source/vivo/` o un `.astro` con cabecera `DERIVADO` | Se pierde en la siguiente regeneración |
| Aflojar, saltar o re-baselinar una puerta para que pase | `aprobar-diseno.mjs` exige humano |
| Repetir una foto dentro de la misma página | Es justo lo que hoy está mal (§2.3) |
| Marcar `se-queda` sin haber abierto candidatas | El atajo que vacía el encargo. Ver §6.6 |
| Fusionar el PR | Deploy = merge a `main`, y lo pide Sebastian nombrándolo |
| `ui-qa`, `carrusel-qa`, `0.8.0:audit`, barrer rutas en el navegador | `CLAUDE.md` §1 |

---

## 2 · Lo que ya está medido (2-oct-2026, sobre `origin/main` en `ebd9e4e`)

Si algo no cuadra con lo que ves, **gana el árbol**: dilo en la bitácora y corrige este fichero.

### 2.1 · El `main` local está viejo

El árbol principal iba **20 commits por detrás de `origin/main`** y con trabajo sin commitear de
otra sesión (`scripts/build-paginas.mjs`, `src/pages/gallery.astro`). No trabajes ahí ni midas
ahí. Worktree propio desde `origin/main` (§5 F0).

### 2.2 · Dónde se controla cada foto

| Hueco | Fuente de verdad | Notas |
|---|---|---|
| Héroe | `src/data/captacion-servicios.json` → `<ruta>.heroe.foto/alt/ancho/alto` | + `heroe.og` (JPEG 1200×630, opt-in) para `og:image`. `check-seo.mjs` fija la imagen del JSON-LD de New Pool: se cambia en el mismo commit |
| Proceso (4) | mismo fichero → `<ruta>.proceso.fotos[4]` (opt-in, hoy solo en las 2 de piscina) | Lo lee `captacion()` en `build-paginas.mjs`. Las 4 con la **misma proporción** o la sección salta ~175 px en tablet |
| Banda de inversión | mismo fichero → `<ruta>.inversion.foto` | 50/50 con texto al lado |
| Collage de la FAQ (5) | `src/data/collage-faq-por-ruta.json` → `<ruta>.fotos` | Las 14 fichas tienen entrada |
| Galería (8–10) | **`src/data/fotos-por-ruta.json`** → `{ruta: {selector: [foto \| null]}}` | Mecanismo general de `fotosPorRuta()`; `null` deja la de origen |
| Megamenú (14) | `src/components/Nav.astro`, a mano | `npm run shell` **no corre** (lo dice la cabecera de `Nav.astro`). Se edita la cadena `marcado` y se **declara** en `build-shell.mjs` y en las desviaciones de `check-cascaron.mjs` |
| Full-Service (14×3) | `src/data/servicios-categoria.json` **es GENERADO** (`build-paginas.mjs`, al final) | Editarlo a mano se pierde. Va un override en el generador (§5 FULL) |

Tres cosas de `fotosPorRuta()` que te van a morder si no las sabes:

1. Exige que `src/ancho/alto` casen **exactamente** con la entrada del banco y que esa entrada
   lleve la ruta en `usada_en`. Si no, ROJO. Es la traza; no la rodees.
2. Escribe `object-position:${pos}` sin comprobar: **`pos` es obligatorio** en cada foto.
3. **No toca el lightbox.** Cada slide de la galería es `a.w-lightbox` + `<img>` +
   `<script class="w-json">` con la misma URL. Hay que extender la función para que reescriba ese
   JSON cuando el `<img>` vive dentro de un `a.w-lightbox`, o `check:galeria` (que abre el visor)
   te caza. Es el único cambio de generador que las fichas necesitan.

### 2.3 · Cómo está una ficha hoy (medido en Outdoor Kitchens; las 14 son la misma plantilla)

```
hero-services svc-heroe · logos · svc-confianza · trusted-section svc-intro [NO TOCAR]
· svc-captacion · gallery · services «What we do» [NO TOCAR] · process-section · svc-inversion
· faq-section · testimonial · location · blog-section-page · cta-footer
```

- La galería, «What we do», el collage de la FAQ y la intro **se reparten las mismas ~8 fotos**:
  `kitchen-2` sale cuatro veces en la página. Al cambiar galería y FAQ por banco, la repetición
  con las dos secciones intocables desaparece sola. Compruébalo, no lo supongas.
- Los pasos del proceso son `/images/procesos/<servicio>-step-N/…png`, 1408×768. **Los 39 PNG
  que hay en disco llevan todos marca C2PA de imagen generada por IA** (medido en los bytes, 39
  de 39). R24 ya cambió los 8 de piscina por obra real; **las otras 12 fichas siguen pintando
  los suyos:** es lo más urgente del encargo, y el banco tiene foto de obra en curso para siete
  de ellas (columna «En obra» de §2.4).
- El feed de Instagram ya no sale (#24) y el carrusel de blog ya usa banco (#25, #26). Fuera.

### 2.4 · El banco, por servicio — el techo real

`src/data/banco-imagenes.json`: 1.269 entradas, **514 aprobadas, todas `obra_real`**. Fichero
servido: `/images/banco/<servicio>/<slug>.webp`, 1600 px de lado mayor, sin EXIF.

| id banco | Ficha (`/services/…`) | Terminadas como protagonista (libres) | Como secundario | En obra |
|---|---|---|---|---|
| `pergolas` | custom-aluminum-pergola-builders… | 97 (58) · 29 obras | 116 | 22 |
| `decks` | custom-deck-builders… | 38 (28) · 20 obras | 158 | 22 |
| `kitchens` | custom-outdoor-kitchens… | 36 (16) · 14 obras | 51 | 21 |
| `louvered` | motorized-louvered-roof-systems… | 31 (12) · 12 obras | 37 | 12 |
| `landscaping` | professional-landscaping-services… | 28 (18) · 9 obras | 55 | 7 |
| `construction` | custom-pool-spa-builders… | 19 (13) · 9 obras | 36 | 83, con `fase_obra` |
| `pole` | steel-building-pole-barn… | 14 (11) · 5 obras | 14 | 25 |
| `remodeling` | pool-remodeling-renovation… | 5 (2) · 3 obras | 5 | 34 + 8 `antes` |
| `furniture` | premium-outdoor-furniture… | **0** | 28 | 0 |
| `lighting` | smart-soffit-led-lighting… | **0** | 26 | 0 |
| `enclosures` | pool-screen-enclosures… | **0** | 2 | 1 |
| `rooms` | patio-screen-rooms-enclosures… | **0** | 1 | 0 |
| `screens` | motorized-retractable-screens… | **0** | 1 | 0 |
| `irrigation` | smart-irrigation-system… | **0** | 0 | 0 |

Lectura honrada: **ocho fichas tienen material; seis casi no.** En las seis de abajo una foto
«secundaria» solo vale si al abrirla el servicio **es** el sujeto del encuadre (una pérgola de
noche donde lo que se ve es la luz del sofito sí es `lighting`; una piscina con dos tumbonas al
fondo no es `furniture`). Si no, el hueco se queda. `irrigation` se queda entera: son dos líneas
de estado, no una iteración de búsqueda.

---

## 3 · Unidades y orden

Una iteración = una unidad = un commit. Así Sebastian revierte un servicio sin tocar los demás.

```
F0 (montaje) → pergolas (piloto) → kitchens → decks → louvered → landscaping → pole
→ construction → remodeling → lighting → furniture → enclosures → rooms → screens → irrigation
→ MENU → FULL → CIERRE
```

`pergolas` va primera porque es donde más banco hay: si ahí el loop cambia pocas fotos, el
problema es el criterio y no el material (freno §7.2). `MENU` y `FULL` van al final porque se
juzgan **como conjunto de 14**, no foto a foto, y cada ficha les deja reservadas sus candidatas.

---

## 4 · Una iteración

1. **Sincroniza.** En el worktree: `git fetch && git merge --ff-only origin/main` si la rama no
   tiene commits propios; si los tiene, `git merge origin/main`. Conflicto en un JSON de datos →
   freno §7.4.
2. **Lee el estado** y coge la primera unidad que no esté `hecha`. Si está `en-curso`, la
   iteración anterior murió a medias: `git status`, y retoma desde lo que haya en disco.
3. **Inventaría los huecos de la unidad** sobre el HTML construido (no sobre el JSON): selector,
   `src` actual y su procedencia (§6.1). Anótalos en el estado antes de elegir nada.
4. **Casting** hueco a hueco (§6). Máximo **3 candidatas abiertas por hueco**.
5. **Juez independiente** (§6.5): un subagente nuevo, a ciegas, por unidad. Uno, no un enjambre.
6. **Aplica** solo lo que el juez deja pasar. Añade la ruta al `usada_en` de cada foto que entra
   y quítala de la que sale (las 11 que el banco ya cruzó con lo publicado llevan `publicada_como`).
7. **Genera, construye y mide** (§6.7). Roja por algo tuyo → arréglalo; a la tercera vez que la
   misma puerta falla por el mismo hueco, ese hueco vuelve a su foto de antes y queda `escalada`.
8. **Deja la hoja de revisión** de la unidad: `banco/.trabajo/loop-imagenes/<unidad>.jpg`, una
   fila por hueco, antes | después, recortadas a la caja real del hueco.
9. **Commit por nombre** (nunca `-A`), mensaje en la voz del repo («La ficha de cocinas enseña
   obra propia en héroe, galería y proceso»). Unidad → `hecha`, con el hash. Una línea en
   `MIGRACION-LOG.md`.
10. **Programa el siguiente disparo** (60 s), o para si toca §7 u §8.

---

## 5 · Las unidades que no son una ficha

### F0 · Montaje (una vez)

- Worktree `.claude/worktrees/loop-imagenes`, rama `loop-imagenes` desde `origin/main`. **Nunca en
  `/tmp`.** Tres enlaces gitignorados: `node_modules`, `.env`, `_source/sanity-masters`.
- Copia este fichero a la raíz del worktree y commitéalo: es la versión que manda desde entonces.
- Lee `CLAUDE.md`, `BANCO-IMAGENES.md` (sus 8 reglas mandan) y el `_lee_esto` de
  `captacion-servicios.json` y de `fotos-por-ruta.json`.
- `npm run build` una vez y restaura lo que ensucia: `git checkout -- public/robots.txt
  public/sitemap.xml public/llms.txt`. Sobre ese build:
  - **Mide las cajas** con Playwright headless (no con el panel del navegador) a 390, 768, 991 y
    1440: una ficha cualquiera (héroe, slide de galería, paso de proceso, banda de inversión, las
    5 teselas del collage), el megamenú abierto (`img.picture-service`) y el panel de Full-Service
    (`img.svc-foto`). De cada caja: ancho, alto y **qué zona tapa texto** (el H1 del héroe; el
    degradado con título y descripción del megamenú, abajo; la tarjeta de cristal y el contador
    «1 / 7» de Full-Service). Va al estado, en `cajas`. Todo el casting se hace contra esas cajas.
  - **Línea base de lo intocable:** el `src` de las 3 fotos de intro y las 4 de «What we do» de
    las 14 fichas, al estado. La puerta final comprueba que no se han movido.
  - **Auditoría de procedencia de lo intocable y de los pasos de proceso**, con Python (aquí
    `grep` es `ugrep` y se salta los binarios): busca `trainedAlgorithmicMedia` y `c2pa` en los
    bytes. Resultado al estado y al informe final. **Se reporta, no se cambia.**
- Escribe dos piezas pequeñas, y nada más:
  - `scripts/encaje-foto.mjs <src> <hueco> [pos]` — con `sharp`, recorta la foto a las cajas del
    hueco en los 4 anchos como lo haría `object-fit: cover`, sombrea la zona de texto y lo deja
    todo en una tira JPG. Es lo que miras tú y lo que mira el juez.
  - `scripts/check-fotos-servicios.mjs` — **la puerta del loop**, sobre `.vercel/output/static`.
    Sale 1 si: falta una unidad o un hueco por decidir · un hueco `canjeada` no pinta en el HTML
    el `src` que dice el estado · ese `src` no traza a una entrada `obra_real` + `aprobada*` que
    lleve la ruta en `usada_en` · un mismo fichero sale dos veces en el cuerpo de una ficha
    (el megamenú y el pie no cuentan) · un `se-queda` no trae motivo, candidatas descartadas y
    `falta` · alguna foto de intro o de «What we do» ha cambiado respecto a la línea base.
    **Pruébala en rojo antes de fiarte:** rompe un caso de cada y mira que salta.
- Extiende `fotosPorRuta()` para el lightbox (§2.2.3) y, si `proceso.fotos` no acepta `null`,
  dale la misma semántica que `fotos-por-ruta.json`: `null` = ese paso se queda.

### MENU · las 14 del megamenú

- Las candidatas las dejó reservadas cada ficha (`portada_menu` en el estado). Aquí se monta la
  **tira de las 14 a tamaño real** y se juzga el conjunto: en ~240 px, ¿se distingue de un
  vistazo «pérgola de aluminio» de «techo de lamas» de «patio screen room»? Si dos se confunden,
  cambia una. Un menú donde tres tarjetas parecen la misma foto no orienta a nadie.
- La caja es casi cuadrada y el **tercio de abajo va tapado** por el degradado con título y
  descripción: el sujeto vive en los dos tercios de arriba.
- Sale en las 115 rutas: deriva un fichero **propio y pequeño** (lado mayor ≈ 2× la caja medida,
  AVIF o WebP, objetivo ≤ 60 KB) en `public/images/obra/<obra-NNN>/…`, como hizo R24, con
  `width`/`height` en el `<img>`. No enchufes el 1600 del banco a una tarjeta de 240 px.
- `usada_en` lleva la pseudo-ruta `"megamenu"`. Alt = el del banco, sin el «Image of…» de hoy.
- Puertas: `check:menu`, y `check:cascaron` en gate de fase (no lee `argv`) con la desviación
  declarada. Si un servicio no tiene foto real que funcione a ese tamaño, **se queda la actual**.

### FULL · las 14 de «Full-Service»

- Override en el generador, no en el JSON generado: un `src/data/fotos-servicios-categoria.json`
  (`{id: {foto, alt, ancho, alto, pos, _banco}}`) que `build-paginas.mjs` aplica al construir
  `SERVICIOS`, con la misma comprobación de traza que `fotosPorRuta()`. Un `id` sin entrada sale
  como hoy. Las 3 rutas llevan las mismas 14 fotos: un solo override las cubre.
- La home es ex-derivada y **no se regenera** (`NO_REGENERAR`), pero el widget lee el JSON: basta.
- Caja ancha (≈ 15:8 en escritorio; mídela), **tarjeta de cristal sobre el ~30 % inferior** y el
  contador arriba a la derecha. El sujeto, arriba y centrado; nada importante en esa esquina.
- Puede ser la misma obra que la del megamenú si aguanta los dos recortes; si no, otra.
- `usada_en`: las 3 rutas. Puertas: `check-texto` y `check-visual` con `'=/'` (con comillas) y
  las dos de `where-we-serve`.

### CIERRE

`npm run check:tokens && npm run check:rutas && npm run check:enlaces && npm run check:seo &&
npm run check:estructura && npm run check:assets && npm run check:galeria && npm run check:menu`,
más `node scripts/build-banco.mjs --check` y `node scripts/check-fotos-servicios.mjs`. Push de la
rama, PR con el informe de §8 y la preview de Vercel. **Sin merge.** Ahí se para el loop.

---

## 6 · Casting: cómo se elige una foto que venda

### 6.1 · Primero, qué hay hoy en el hueco

| Procedencia de la foto actual | Cómo se sabe | Prioridad |
|---|---|---|
| `ia_probada` | C2PA en los bytes | 1 — se cambia en cuanto haya una real que encaje |
| `no_real` | `gallery-procedencia.json`: `generada_o_stock` / `no_es_del_cliente` | 2 |
| `sin_verificar` | no está en ninguno de los dos sitios | 3 |
| `obra_real` | está en el banco (`usada_en`) o adjudicada en `gallery-procedencia.json` | 4 — solo si la nueva **mejora** (§6.5) |

### 6.2 · Qué tiene que hacer la foto en cada hueco

| Hueco | Su trabajo | Qué buscar |
|---|---|---|
| **Megamenú** | Que se reconozca el servicio en medio segundo | Un solo sujeto, grande, contraste con el panel azul |
| **Full-Service** | Que apetezca hacer clic en «See More» | Obra terminada, luz de día, aspiracional, limpia |
| **Héroe** | La primera impresión de la landing de anuncio | La mejor foto terminada del servicio; sitio para el H1 (`espacio_texto`) |
| **Galería** | Probar que hay oficio y variedad | Secuencia: general → medio → detalle; obras alternas; ≥ 3 obras distintas si el banco las da |
| **Proceso** | Probar que la obra es nuestra | `etapa: construccion`, y que la foto sea **ese paso** (lee el título del paso) |
| **Inversión** | Justificar el precio | Material y acabado visibles, terminada |
| **Collage FAQ** | Acompañar sin distraer | 5 teselas pequeñas: detalle y variedad, no panorámicas |

En todos: horizonte recto, sujeto legible **al tamaño del hueco** y no al 100 %, agua y cielo con
información, nada de mangueras, cubos, bolsas ni coches **dentro del recorte**.

### 6.3 · El método

1. **Índice** (`jq` sobre `banco-imagenes.json`): servicio, `etapa`, orientación que pide la
   caja, `recortes_seguros`, y lee `descripcion` y `defectos`. `aprobada_con_recorte` solo vale
   dentro de sus `recortes_seguros`.
2. **Hoja de contactos** (`banco/hojas/<servicio>-<etapa>-NN.jpg`) para descartar. No aprueba.
3. **Abre el fichero** de las finalistas. Tres por hueco como mucho.
4. **`encaje-foto.mjs`** con la `pos` que propones. Una foto buena que el recorte destroza en
   móvil no es candidata para ese hueco.
5. **Conjunto**: nada repetido en la página; en la galería, ni dos casi iguales seguidas ni dos
   de la misma obra seguidas si hay alternativa. El héroe de una ficha no es héroe de otra.
6. Si el servicio va justo de material, el orden de reparto es **héroe → galería → inversión →
   proceso → FAQ**. Lo que no alcance, se queda.

### 6.4 · Revelado sí, retoque no

Sebastian pidió mejorar luz y sombras donde haga falta. Se puede, **desde el original**
(`BANCO_ORIGEN`), con `sharp` y en local — sin subir la foto a ningún servicio externo:

- **Permitido:** exposición, levantar sombras, bajar altas luces, balance de blancos, contraste,
  saturación con mesura, enderezar, recortar, enfoque suave.
- **Prohibido:** quitar o añadir objetos, cambiar el cielo, relleno generativo, reescalado con
  IA, y cualquier ajuste que cambie el color real de un acabado (el travertino no se vuelve
  blanco, el aluminio bronce no se vuelve negro).

La regla: **que el dueño de esa casa reconozca su patio**. Lo que se arregla recortando, se
recorta; lo que solo se arregla borrando, descarta la foto.

El resultado es un fichero derivado en `public/images/obra/<obra-NNN>/<nombre-descriptivo>`
(precedente R24), sin metadatos, con `_banco`, `_proyecto` y `_ajuste` (la receta, reproducible)
en el JSON. El slug del banco **no** se toca y su `.webp` no se sobrescribe. Solo se deriva si
hace falta —corrección, peso del megamenú, definición del héroe—; si no, se usa el del banco
tal cual con `pos`.

### 6.5 · El juez

Un subagente nuevo por unidad, que no ha visto tu casting. Recibe, por hueco, **dos tiras de
`encaje-foto.mjs` etiquetadas A y B en orden aleatorio** (la actual y la candidata, sin decirle
cuál es cuál), qué hueco es y la fila de §6.2. Devuelve por hueco: `A | B | iguales`, y defectos
clasificados así — **este escalón es la corrección al peritaje del 21-sep, que tumbó 39 de 42
fotos por tratar cualquier desorden como bloqueante**:

| Clase | Ejemplos | Efecto |
|---|---|---|
| **Bloqueante** | cara reconocible, matrícula, número de portal, rótulo de otra empresa · el servicio no se lee al tamaño del hueco · obra a medias en un hueco de «terminado» | La candidata cae |
| **Dentro del recorte** | manguera, cubo, herramienta, calva de tierra **visibles en la caja** | Cae para ese hueco, salvo que otra `pos` lo saque |
| **Fuera del recorte** | lo mismo, pero el `cover` lo deja fuera en los 4 anchos | **No cuenta** |
| **Cosmético** | cielo algo plano, sombra dura | No tumba; inclina hacia §6.4 |

**Se canjea** si la candidata no tiene bloqueantes ni defectos dentro del recorte **y** (la
actual no es `obra_real` **o** el juez prefiere la candidata). Empate entre dos reales → se
queda la actual: cambiar por cambiar no vende más.

### 6.6 · `se-queda` hay que ganárselo

Un hueco solo pasa a `se-queda` con: el motivo, las candidatas abiertas y por qué cayó cada una
(o la consulta `jq` que devolvió cero), y `falta`: **la foto que habría que hacer**, descrita
como se la pedirías a quien va a la obra con el móvil («cerramiento de piscina terminado, desde
el jardín, de día, con la estructura entera en cuadro»).

### 6.7 · Puertas de cada unidad

Siempre sobre `.vercel/output/static`, tras `npm run paginas && npm run build` y restaurar
`robots.txt`, `sitemap.xml` y `llms.txt`. Acotadas a la ruta de la unidad:

```bash
npm run check:tokens
npm run check:estructura && npm run check:galeria && npm run check:assets && npm run check:seo
node scripts/build-banco.mjs --check
node scripts/check-texto.mjs  <slug-de-la-ficha>     # nunca '/' como filtro
node scripts/check-visual.mjs <slug-de-la-ficha>
node scripts/check-fotos-servicios.mjs <unidad>
```

- **`check-visual` va a salir roja y es ROJO CORRECTO:** la referencia es anterior al cambio de
  foto. Lo que tienes que demostrar es que **solo cambian píxeles dentro de las cajas de foto** y
  que el alto de la página no se mueve (`npm run diag:visual`). Si la página crece o encoge, es
  un fallo tuyo: `ratio`, `ancho`/`alto` o proporción de los pasos. Aprobar la referencia nueva es
  de Sebastian (`aprobar-diseno.mjs`), no del loop.
- El héroe es el LCP: el fichero nuevo no pesa más que el de hoy salvo que lo justifiques.
- **Una puerta que no corrió no es una puerta verde.** Si se saltó, dilo en el estado.

---

## 7 · Frenos — el loop se para y lo dice

1. **Tope por hueco:** 3 candidatas. **Tope por puerta:** 3 intentos, y el hueco vuelve atrás.
2. **Criterio descalibrado:** si en `pergolas` (58 libres) el juez tumba más del 70 % de las
   candidatas, o se canjean menos de un tercio de los huecos, **para**. No es falta de material:
   es el listón. Entrega la hoja de revisión y espera a Sebastian. Lo mismo si se canjea el 100 %
   sin una sola caída: un juez que aprueba todo no está juzgando.
3. **Una puerta roja por algo que no es tuyo** → para y repórtalo, no la arregles de paso.
4. **Conflicto** al fusionar `origin/main` en un JSON de datos o en `build-paginas.mjs` → para.
5. **Tres iteraciones seguidas sin commit** → para.
6. **Cualquier tentación de la tabla de §1** → no se hace, se anota y se sigue con lo demás.

Parar es: unidad en `frenada` con el motivo, commit de lo que esté sano, y fin del loop.

---

## 8 · Estado y entrega

`docs/encargos/LOOP-IMAGENES-ESTADO.json`, commiteado en cada iteración:

```json
{
  "base": "<sha de origin/main en F0>",
  "cajas": { "heroe": { "1440": [0, 0], "zona_texto": "izquierda" } },
  "intocables": { "/services/…": ["/images/…", "…"] },
  "unidades": [{
    "id": "kitchens", "ruta": "/services/custom-outdoor-kitchens-for-north-south-florida-homes",
    "estado": "pendiente | en-curso | hecha | frenada", "commit": null,
    "portada_menu": "bi-0000", "portada_full": "bi-0000",
    "huecos": [{
      "hueco": "galeria[3]", "selector": "section.gallery img",
      "antes": "/images/images/kitchen-5/…avif", "procedencia_antes": "sin_verificar",
      "estado": "pendiente | canjeada | se-queda | escalada",
      "despues": "/images/banco/kitchens/…webp", "_banco": "bi-0000", "pos": "50% 40%",
      "_ajuste": null, "juez": "B",
      "descartadas": [{ "_banco": "bi-0000", "clase": "dentro-del-recorte", "motivo": "…" }],
      "falta": null
    }]
  }]
}
```

El estado avanza en un solo sentido: una unidad `hecha` no se reabre desde el loop.

**La entrega es el cuerpo del PR**, con estos cuatro bloques y sus números:

1. **Canjeadas**, por superficie y por ficha, enlazando las hojas de antes/después.
2. **Se quedan**, con el motivo — y de ahí, **la lista de fotos que hay que hacer**, agrupada
   por servicio. Es el entregable más útil para las seis fichas sin banco.
3. **Auditoría de Intro y «What we do»**: qué fotos llevan marca de IA en el fichero. No se
   tocaron; la decisión es de Sebastian.
4. **Lo que espera a un humano**: aprobar las capturas (`aprobar-diseno.mjs`) y el merge.

---

_Escrito el 2-oct-2026 contra `origin/main` en `ebd9e4e`. Las cifras del banco y los nombres de
clave son de ese día; los números de línea se han evitado a propósito. Si el árbol se ha movido,
manda el árbol._
