# PROMPT MAESTRO — /projects: fuera 4 obras, obras nuevas del banco y filtro por servicio

Encargo de Sebastian, 2-oct-2026. Se ejecuta de principio a fin con **dos paradas obligatorias**:
el casting (§3.3) y el cierre (§7).

## Qué se pide

1. **Ocultar** de `/projects` las 4 obras que Sebastian marcó con X (§2).
2. **Subir obras nuevas** desde el banco de obra propia (§3), y **ampliar con fotos del banco** las
   fichas que se quedan (§4).
3. **Un desplegable por servicio** encima de la rejilla (§5).

**Regla madre:** todas las fotos salen de `src/data/banco-imagenes.json`. Ninguna sale de Webflow, de
stock, de IA ni de una carpeta escaneada a mano.

Lee antes de tocar nada:
- `CLAUDE.md` del repo: §1 no se barre el sitio, §2 las puertas, §3 construir/commitear/desplegar,
  §4 el banco.
- `BANCO-IMAGENES.md` entero; sus 8 reglas mandan aquí.
- `scripts/lib/rutas-propias.mjs:1-60`: qué hace cada puerta con una ruta propia, y por qué.

## Decisiones ya tomadas — no se vuelven a preguntar

| Tema | Decisión |
|---|---|
| Ocultas | #6, #7, #8, #9 (tabla §2). Las 1–5 y 10–12 se ven sin X en las capturas. **13–15: no llegó captura, se quedan.** |
| Alcance de «ocultar» | Solo `/projects`: tarjeta + entrada del `hasPart` del JSON-LD. La ficha `/project/<slug>` **sigue viva** y el carrusel «Project Showcase» **no se toca**. |
| Obras nuevas | Casting de las 28 candidatas → tabla → **Sebastian elige** → se construyen las elegidas. |
| Filtro | Una opción por servicio; solo salen las que tengan obras visibles. |
| Cierre | Rama + PR con la preview de Vercel en verde. **El merge (= producción) lo pide Sebastian nombrando el PR.** |

---

## 0 · Dónde trabajar

- Empieza con `git status` en el árbol principal. A 2-oct, otra sesión tenía **sin commitear**:
  - `scripts/build-paginas.mjs` y `src/pages/gallery.astro`, modificados;
  - `src/data/galeria-pagina.json`, nuevo;
  - `public/images/obra/project-0{59,61,62}/`, añadido.

  `build-paginas.mjs` es justo el generador que vas a tocar. No pises ese trabajo ni lo arrastres a
  tu commit.
- Trabaja en un worktree propio: `.claude/worktrees/proyectos-banco`, rama `proyectos-banco` desde
  `origin/main`. **No uses `/tmp`.** Crea los tres symlinks gitignorados:
  - `node_modules`
  - `.env`
  - `_source/sanity-masters`, porque sin él `check:assets` sale roja.
- `git fetch && git merge --ff-only origin/main` antes de construir y antes de empujar.
- Después de **cada** `npm run build`: `git checkout -- public/robots.txt public/sitemap.xml`. El
  build local los deja con `Disallow: /` y 0 URLs.
- `git add` **por nombre**, nunca `-A` ni `commit -a`.

## 1 · Cómo está hoy (verificado el 2-oct)

**`/projects` pinta 15 tarjetas y no tiene filtro.**

- `src/pages/projects.astro` es **derivado; no se edita a mano**. Lo genera `scripts/build-paginas.mjs`
  desde `_source/vivo/projects.html` (`npm run paginas`).
- Las **5 primeras** son de autoría propia. Salen de `src/data/proyectos-propios.json` y se inyectan
  clonando la primera tarjeta de `.cms-list-work` como molde.
  - Busca `OBRAS_EN` y su bucle (selectores `.img-work`, `.title-work`, `.block-content-work`,
    `.wrapper-buttons a`).
  - El mismo generador amplía el `hasPart` del JSON-LD.
  - Hay una cuenta de control, `OBRAS_ESPERADAS`.
  - Localiza todo por **nombre de símbolo**: los números de línea cambian con el trabajo ajeno.
- Las **10 siguientes** son las migradas de Webflow, tal cual vienen en el HTML de origen.
- **Fichas:**
  - Las 10 migradas son `.astro` derivadas.
  - Las 5 propias son `.astro` escritas a mano que leen `proyectos-propios.json`, declaradas en
    `scripts/lib/rutas-propias.mjs` y en `disenio/contratos.json`.

**`proyectos-propios.json` lo leen cinco sitios:**
- `CarruselProyectos.astro`, el carrusel «Project Showcase», que sale en la home y en muchas rutas;
- `src/lib/obras.mjs`;
- `check-texto.mjs`;
- `check-seo.mjs`;
- `build-paginas.mjs`.

**Si metes 25 obras ahí, el carrusel de todo el sitio pasa de 15 a 40 slides.** Las obras nuevas
llevan `"enCarrusel": false`, y `CarruselProyectos.astro` tiene que respetarlo. Comprueba con un `grep`
sobre el build que el número de slides **no cambia**.

**El banco, en lo que importa aquí:**
- 514 fotos aprobadas, `procedencia: obra_real`, agrupadas en `proyecto: obra-NNN` (misma propiedad =
  mismo id).
- 76 aprobadas no tienen `proyecto`: no forman obra y **no se agrupan por parecido**.
- `region` es `desconocida` en todas menos una.

---

## 2 · Ocultar las 4 marcadas con X

| # | Slug (`/project/…`) | Título de la tarjeta |
|---|---|---|
| 6 | `modern-pool-motorized-pergola-south-florida` | Modern Pool & Motorized Pergola – South Florida |
| 7 | `south-florida-backyard-pool-wood-pergola` | South Florida Backyard Pool & Wood Pergola Project |
| 8 | `residential-pool-pergola-outdoor-dining-north-florida` | Residential Pool with Pergola & Outdoor Dining |
| 9 | `luxury-pool-motorized-pergola-screen-enclosure-north-florida` | Luxury Pool with Motorized Pergola & Screen Enclosure |

Las 4 son migradas de Webflow. Tras ocultarlas, `/projects` arranca con **11 tarjetas**.

**Cómo:**
- **Un solo fichero de datos para el índice:** `src/data/proyectos-indice.json`, con:
  - `ocultas`: los 4 slugs, con motivo y fecha;
  - `servicios`: slug → servicios, para las 10 migradas; las propias lo llevan en
    `proyectos-propios.json`;
  - `opciones`: servicio → etiqueta del desplegable.

  Nada de un `if` por slug en el generador.
- `build-paginas.mjs` lo lee **después** de la inyección de `OBRAS_EN`. Quita la tarjeta y su entrada
  del `hasPart`, y ajusta `OBRAS_ESPERADAS` o cualquier cuenta que ahora mienta.
- Si un slug de `ocultas` no aparece en el HTML de origen, el generador **falla en rojo**. Una lista
  que ya no casa con nada no se calla.
- La ficha sigue viva: es una de las 115 rutas congeladas y `check:rutas` la exige. Retirarla (301 o
  `noindex`) es otra decisión, y es de Sebastian.
- `check:texto` compara el `innerText` de `/projects` con `baseline/text/`, y `check:seo` compara el
  `hasPart` de origen. Quitar tarjetas se **declara** en las dos puertas, igual que ya se declaran las
  5 obras propias (`OBRAS_PROPIAS_EN` en `check-texto.mjs`, `PARTES_PROPIAS` en `check-seo.mjs`). **No
  se re-baseliniza nunca.**

---

## 3 · Obras nuevas desde el banco

### 3.1 Qué cuenta como obra publicable

Un `proyecto: obra-NNN` que cumple **todo** esto:

- Fotos con `estado` `aprobada` o `aprobada_con_recorte`. En el segundo caso, **solo dentro de sus
  `recortes_seguros`**: lee `defectos` antes de usarla.
- **≥ 3 fotos `etapa: terminado`**, con al menos una horizontal para la portada de la tarjeta.
- **≥ 5 fotos en total**, para que la galería aguante; las 5 fichas propias tienen 5–6. Las de
  `construccion` y `antes` cuentan, y van detrás como proceso.
- Elegidas por **hoja de contactos** (`banco/hojas/`), mirando la foto a resolución nativa. Nunca por
  el nombre ni por la `descripcion` sola. Dos fotos casi iguales no van seguidas.

### 3.2 Candidatas, calculadas del índice el 2-oct

Son **propuesta, no casting**.

**Fuertes (≥ 5 fotos):**

| Servicio | Obra | Terminadas (horiz.) | Total | Nota |
|---|---|---|---|---|
| Pools | `obra-046` | 11 (7) | 13 | la piscina terminada más completa del banco |
| Pools | `obra-048` | 3 (3) | 33 | remodelación con 6 «antes» + 24 de obra: ficha de antes/después |
| Pools | `obra-045` | 4 (2) | 11 | su `bi-0486` ya sale en ~60 rutas: la portada tiene que ser otra |
| Pools | `obra-049` | 4 (4) | 32 | el índice avisa «media foto es tierra»: ojo con la portada |
| Pergolas | `obra-088` | 8 (7) | 8 | `bi-0944` ya en `/gallery` y en la ficha de pérgolas |
| Pergolas | `obra-099` | 5 (5) | 5 | |
| Pergolas | `obra-100` | 5 (5) | 5 | `bi-1038` ya en un blog, en `/gallery` y en la ficha de pérgolas |
| Louvered | `obra-050` | 7 (6) | 18 | trae 10 de montaje |
| Louvered | `obra-033` | 7 (7) | 7 | |
| Kitchens | `obra-070` | 5 (3) | 7 | una foto lleva la parrilla con el film puesto |
| Kitchens | `obra-066` | 3 (3) | 10 | |
| Kitchens / Landscaping | `obra-002` | 3 (3) | 10 | |
| Landscaping | `obra-039` | 8 (7) | 8 | `bi-0308` ya en `/gallery` y en la ficha de paisajismo |
| Decks | `obra-012` | 4 (3) | 5 | |
| Pole barns | `obra-111` | 4 (2) | 6 | |

**Justas (3–4 fotos):** solo entran si en la hoja se leen como obra completa.
- Pérgolas: `obra-085`, `087`, `089`, `097`.
- Louvered: `obra-027`, `071`.
- Kitchens: `obra-069`, `072`, `074`, `075`.
- Landscaping: `obra-042`, `043`.
- Decks: `obra-059`.

**No forman obra por sí solas:** `obra-065` (49, todas de construcción), `obra-064` (17) y `obra-114`
(10). Pueden ser el «durante» de una ficha que ya existe (§4).

**Hay pocas piscinas terminadas**, y es el servicio principal. No maquilles el filtro «Pools & Spas»
con pérgolas sobre piscina. Si se queda corto, se dice.

### 3.3 Casting — PRIMERA PARADA

Por cada candidata:
1. Monta su hoja de contactos por obra. Usa `build-banco.mjs --hojas` si lo permite; si no, un script
   pequeño con el trabajo intermedio en `banco/.trabajo/`, nunca en el scratchpad.
2. Mira cada foto a resolución nativa.
3. Elige portada y galería en orden.
4. Somete cada «publicar» a **dos refutadores independientes**, que buscan:
   - caras, números de portal, matrículas;
   - desorden;
   - render o IA;
   - duplicado;
   - defecto de agua o de borde;
   - obra ajena.

   Si cualquiera de los dos refuta, la foto sale. Es el método del peritaje del 21-sep
   (`INFORME-IMAGENES-21-SEP.md`).

Si la sesión tiene workflows, esto va en uno de **solo lectura**: un agente por obra y dos
verificadores por foto elegida. Las escrituras de §3.4–§5 **no** se paralelizan: tocan los mismos
ficheros.

**Entrega la tabla y PARA:** obra · servicios · portada (`id`) · galería en orden (`id`s) · título
propuesto · descartes con su motivo. Cada obra nueva es una URL nueva e indexable; **cuántas y cuáles
lo decide Sebastian.**

Lo que **no** depende del casting puede ir antes de la parada: §2, §5 y la búsqueda de parejas de §4.

### 3.4 Cómo se montan las elegidas

- **Datos:** en `proyectos-propios.json`, con `"enCarrusel": false` y `servicios`. Mismos campos que las
  5 de hoy (`slug`, `titulo`, `tituloFicha`, `resumen`, `ubicacion`, `estilo`, `tipo`, `seo`, `galeria`,
  `portada`, `alt`, `publicado`).
- **Rutas:** **una sola plantilla**, `src/pages/project/[slug].astro`, con `getStaticPaths` sobre las
  obras nuevas. No 25 ficheros copiados.
  - Las rutas estáticas que ya existen ganan a la dinámica, así que las 15 de hoy no se mueven.
  - Antes, comprueba que ningún script de `scripts/` glob-ea `src/pages/project/*.astro` y se atraganta
    con un nombre entre corchetes.
- **Declaración:** cada ruta nueva va en `scripts/lib/rutas-propias.mjs` **y** en
  `disenio/contratos.json` con contrato `rediseno`. Sin lo segundo, `check:visual` la salta en
  silencio. Si las dos listas pueden derivarse de `proyectos-propios.json` en vez de copiarse a mano,
  derívalas.
- **Fotos:** el `src` del banco tal cual (`/images/banco/…`, WebP de 1600 px sin EXIF).
  - No se re-derivan, no se copian y no se renombran: regla 7, el slug es una URL.
  - `importar-obras-propias.mjs` (AVIF) no aplica.
- **Sitemap:** las URLs nuevas, donde `build-seo-ficheros.mjs` declara las 5 de hoy, o derivadas del
  JSON.
- **`usada_en`:** añade la ruta a cada foto usada en `banco-imagenes.json` y pasa
  `node scripts/build-banco.mjs --check`.
- **Tarjeta en `/projects`:** la inyecta `OBRAS_EN` como a las otras propias, en el orden de la tabla
  aprobada.

### 3.5 Texto: nada que el banco no pruebe

El copy va en **inglés** y suena a Florida: pies, «licensed».

- **Ni región ni ciudad.** `region` es `desconocida`: ni en el slug, ni en el título, ni en el resumen,
  ni en `ubicacion`. Las de hoy dicen «North/South Florida» porque venían así; las nuevas no lo
  heredan. Si Sebastian da la ubicación de una obra, entonces sí.
- **Nada de medidas, precios, marcas ni plazos.** Solo lo que se ve en las fotos; la `descripcion` del
  índice sirve para eso.
- **Títulos únicos.** La 10 y la 12 ya repiten título; no lo empeores.
- **`alt` en inglés por foto**, desde el `alt` del banco, sin inventar rasgos.

---

## 4 · Más fotos para las 11 fichas que se quedan

Hoy **ninguna** ficha de `/project/` está enlazada a un `obra-NNN`:
- `usada_en` solo cruzó 11 fotos del sitio con el banco, y ninguna es de `/project/`.
- Las 5 propias usan fotos del banco anterior (`/images/projects/…`, el
  `MrMrs_Outdoor_Living_Image_Bank`, que ya no está en disco).
- Las migradas usan fotos de Webflow.

Para cada una de las 11 (1–5 y 10–15):

1. **Busca su pareja en el banco.**
   - Si existe el script que rellenó `usada_en` («cruce por parecido visual»), úsalo primero como
     criba. No detecta recortes ni ediciones fuertes.
   - Confirma siempre **a ojo**, con la hoja de contactos. Ni por nombre ni por título.
   - Las obras de solo construcción (`obra-065`, `049`, `048`, `064`, `114`) son las primeras
     sospechosas de ser el «durante» de una piscina publicada.
2. **Con certeza:** añade a la galería las fotos del banco que no estén ya. Terminadas primero; de obra
   después, como proceso. Mismos dos refutadores que en §3.3.
3. **Sin pareja, o con duda:** la ficha **se queda como está** y va al informe (regla 8). Una pareja
   dudosa publicada es la obra de otro cliente en esta ficha.

**Dónde se toca:**
- **Propias:** se amplían en `proyectos-propios.json`.
- **Migradas:** su galería sale del HTML de origen, así que ampliarla es inyección en `build-paginas.mjs`
  con el mismo mecanismo de molde que `OBRAS_EN` y `/gallery`. Se **declara** en `check:texto` y en
  `check:seo`, como en §2.

---

## 5 · El desplegable

**Aspecto** (maqueta de Sebastian):
- texto «All» en el azul marino de la marca;
- chevron a la derecha;
- una sola línea inferior de 1 px;
- sin caja, sin sombra, sin fondo;
- centrado sobre la rejilla, debajo de la entradilla.

Solo tokens existentes; `npm run check:tokens` lo vigila.

**Implementación** (lo nativo primero):
- `<select>` **nativo** con `appearance: none` y chevron por CSS. Teclado, lector de pantalla y la rueda
  nativa de iOS/Android vienen gratis.
- `<label>` visualmente oculta: «Filter projects by service».
- Cada tarjeta lleva `data-servicios="pools pergolas"`, con varios valores si hace falta: una piscina
  con pérgola sale en los dos filtros.
- Unas pocas líneas de JS ponen `hidden` a las que no casan. **Sin JS se ven todas.**
- Un contador `aria-live="polite"` («11 projects»).
- El `<select>`, el contador, los `data-servicios` y el script los **inyecta `build-paginas.mjs`**.
  Nada a mano en `projects.astro`.
- Fuera de alcance: Finsweet (en `/gallery` hace otro patrón), parámetro en la URL y animación de
  rejilla.

**Opciones** (en inglés, salen de los datos, solo las que tengan al menos una obra visible):

`All` · `Pools & Spas` · `Pergolas` · `Louvered Roofs` · `Outdoor Kitchens` · `Decks & Pavers` ·
`Landscaping` · `Screen Enclosures` · `Pole Barns`

Pasar a tres opciones («Pools / Pergolas / Other Outdoor Living») tiene que ser cambiar solo el mapa
`opciones`.

**Clasificación de las 11 que se quedan.** Revísala mirando la galería de cada ficha:

| # | Servicios |
|---|---|
| 1, 2, 3 | pools |
| 4, 14 | pools, pergolas |
| 5 | pergolas |
| 10, 12 | pools, enclosures |
| 11 | pools, louvered, kitchens |
| 13 | pools, louvered |
| 15 | pools, pergolas, kitchens |

«Motorized pergola» = techo de lamas = `louvered`, como lo llama `/services/motorized-louvered-roof-systems-…`.

**Rejilla filtrada** (2 columnas):
- Una categoría con número impar no deja la última tarjeta estirada a lo ancho.
- La altura de fila no la fija una tarjeta oculta (regla 4 de `~/Sites/CLAUDE.md`).
- A 375 px el desplegable no desborda.

---

## 6 · Verificación

Sobre `.vercel/output/static` de **tu** worktree, nunca sobre `astro dev`. Acotada a lo tocado.

```bash
npm run check:tokens
npm run check:rutas && npm run check:enlaces && npm run check:seo
node scripts/check-texto.mjs  /projects
node scripts/check-visual.mjs /projects
node scripts/check-visual.mjs /project/<slug-completo>   # una por ficha nueva o ampliada
node scripts/build-banco.mjs --check
grep -rlo 'cms-list-work' .vercel/output/static --include='*.html'   # rutas que pintan la rejilla
```

- `/project` **sin la `s`** casa por `includes()` con todas las fichas: pásale siempre el slug completo.
  Nunca `/` como filtro.
- **Las ocultas:** cada ficha devuelve 200 y conserva su canónica, y sus tarjetas no están en el HTML
  de `/projects`.
- **El carrusel:** mismo número de slides antes y después, con un `grep` sobre una ruta que lo pinte.
- **`check:visual` falla ABIERTO** con las fichas nuevas (sin referencia en `baseline/shots/`). Por
  eso este encargo **pide por su nombre** `ui-qa` + `0.8.0:audit`:
  - sobre `/projects`: desplegable con teclado y con ratón, cada opción, contador, a 375 px;
  - sobre **una** ficha nueva representativa, a 4 anchos.

  Las demás comparten plantilla: con la puerta basta.
- El informe dice qué puertas corrieron, cuáles no y por qué. **Una puerta que no corrió no está en
  verde.**

## 7 · Cierre — SEGUNDA PARADA

- Commit en la rama `proyectos-banco`, por nombre, en commits con sentido:
  1. ocultas + filtro;
  2. fichas nuevas;
  3. fotos extra.
- Push, PR (squash) y preview de Vercel en verde.
- **No se fusiona.** Merge a `main` = producción, y lo pide Sebastian nombrando el número del PR.

## Informe final

1. Rutas nuevas, y rutas cuyo texto cambió (declarado en qué puerta).
2. Tabla de casting aprobada: obra → ficha → fotos, con el `id` del banco de cada una.
3. Fichas de §4 sin pareja en el banco, y categorías del filtro que se quedaron cortas.
4. Puertas: corridas / saltadas / por qué.
5. PR y URL de la preview.
