# R24-FOTO-PISCINAS — la imagen de las dos fichas de piscina, con obra real y con la etapa correcta

**Estado: LISTO PARA F0.** Todo lo de aquí está medido sobre `main` en `7300075` (2-oct-2026), sobre
el árbol fuente: en el contenedor donde se escribió esto **no hay `.vercel/output/static` ni
`node_modules`, y el banco de imágenes no está** (vive en el Mac de Sebastian). Por eso los conteos de
sección salen de `src/pages/services/*.astro` y las medidas de fichero de `public/images/`. **El
encargo se ejecuta en local**, donde están el banco, `sqlite3` y `sharp`.

**Pedido literal (2-oct):** «mejorar las imágenes de las páginas de servicio de New Pool Construction y
Pool Remodeling. Un agente que mejore las fotos usando el banco de imágenes, analizando qué fotos
podríamos usar mejor como proyectos terminados o en qué momentos usar fotos de proyectos en
construcción en progreso.»

**Rutas:**

| Ruta | Encargo madre | Captación |
|---|---|---|
| `/services/custom-pool-spa-builders-in-north-south-florida` | R17-CORE · R22-DETALLE | Final URL del ad group «Pool Builders Core» |
| `/services/pool-remodeling-renovation-in-north-south-florida` | R22-DETALLE | capa de captación propia (`captacion-servicios.json`) |

Lee antes, en este orden: `CLAUDE.md` · `docs/encargos/00-PRINCIPIOS.md` (§3 y §4 mandan aquí) ·
`PROMPT-BLOG-IMAGENES.md` §0.3 y §1.2 (cómo se consulta el banco) · `PROMPT-R21-CIUDADES.md` §6-§7
(dirección de arte sobre el banco, verificada) · `MIGRACION-LOG.md` entradas R22-BLOG-IMG y R23-PORTADAS.

---

## 0 · Lo que hay que saber antes de tocar un fichero

### 0.1 · Las dos páginas, hueco por hueco, con lo que hay hoy

Orden real de secciones (de `src/pages/services/<ruta>.astro`, bloques `T0…T14` y componentes):

```
T0  hero-services svc-heroe        1 foto     ConfianzaCore (iconos, 0 fotos)
T2  trusted-section svc-intro      3 fotos    FormularioCore (0 fotos)
T4  gallery                       10 fotos    ← las 10 de /gallery de su servicio
T4  services  (R22-DETALLE)        4 fotos    ← 4 filas foto/texto, de captacion-servicios.json
T4  process-section                4 fotos    InversionCore (1 foto)
T6  faq-section                    0          CollageFaq (5 fotos)
T8  testimonial-section            0          ResenasGoogle · T10 location (2 mapas) · CarruselBlog
T12 social-media                   FeedInstagram (10 fotos, las mismas 10 de /gallery construction)
T14 cta-footer                     0
```

Medido fichero a fichero (`python3`, cabeceras PNG/JPEG/`ispe`/VP8X; marcador = la cadena
`trainedAlgorithmicMedia` dentro del fichero, igual que `build-imagenes-blog.mjs:104`):

**`/services/custom-pool-spa-builders-in-north-south-florida`**

| Hueco | Fichero | px | KB | Marcador IA | Procedencia |
|---|---|---|---:|---|---|
| Héroe (LCP) | `projects/estate-pool-spa-sun-shelf-north-florida/…-project-2.avif` | 1250×698 | 145 | no | galería `-north-florida`: **veracidad sin contestar** (R21 §6.4, pregunta 11) |
| Intro 1/3 | `residentials/custom-pool…/pool-remodeling-contractors-florida.avif` | 1250×1250 | 305 | **🤖 SÍ** | **IA presentada como obra** |
| Intro 2/3 | `residentials/custom-pool…/custom-pool-builders-north-and-south-florida.avif` | **1792×1792** | 558 | no | sin procedencia; 1792² es formato nativo de generador, no de cámara |
| Intro 3/3 | `residentials/custom-pool…/residential-pool-builders-north-and-south-florida.avif.avif` | **1792×1792** | 783 | no | ídem, y con doble extensión |
| Galería ×10 | `images/pool-construction-1…10/*.jpg` | 1250×698/933/937 | 720-1161 | no | **las 10 `obra_real`** en `gallery-procedencia.json`, 4 adjudicadas por el cliente |
| Fila «Design & Engineering» | `projects/estate-pool-spa-sun-shelf-north-florida/…-project-1.avif` | 1250×698 | 148 | no | misma galería del héroe |
| Fila «Plumbing, Equipment, Automation» | `servicios/pool-equipment-pad-plumbing-automation-florida.avif` | 1250×698 | 129 | no | **banco** (IMG_0457, `60ba38b`) |
| Fila «Finishes, Tile & Coping» | `servicios/pool-tile-coping-travertine-deck-florida.avif` | 1250×698 | 126 | no | **banco** (67242095369, project-017, `6a64c97`) |
| Fila «Remodeling & Spa Additions» | `servicios/pool-remodeling-raised-spa-travertine-deck-south-florida.avif` | 1250×703 | 110 | no | **banco** (IMG_3759, project-059, `60ba38b`) |
| Proceso ×4 | `procesos/pool-construction-step-1…4/*.png` | 1408×768 | 1581-2242 | **🤖 SÍ, las 4** | ilustración IA de obra, **7,3 MB** |
| Inversión | `projects/luxury-pool-spa-screen-enclosure-north-florida/…-6.avif` | — | 197 | no | galería `-north-florida` |
| Collage FAQ ×5 | `pool-construction` 08, 10, 05, 07, 02 | 1250 | — | no | repite 5 de la galería (solape aceptado en FICHAS-ORDEN · 2) |
| Instagram ×10 | `pool-construction` 1…10 | 1250 | — | no | **las mismas 10 de la galería** (`instagram.json` lo declara) |
| Ubicación ×2 | `where-we-serves/*/…avif` | 1250×938 | 160/276 | **🤖 SÍ** | mapas; el de South Florida se titula «Aerial drone view of a luxury custom pool». **Fuera de alcance: `.location` es de PULIDOR-2 y pinta 17 rutas. Se reporta** |

**`/services/pool-remodeling-renovation-in-north-south-florida`**

| Hueco | Fichero | px | KB | Marcador IA | Procedencia |
|---|---|---|---:|---|---|
| Héroe (LCP) | `projects/estate-pool-spa-sun-shelf-north-florida/…-project-3.avif` | 1250×698 | 121 | no | **piscina nueva** en la ficha de remodelación; misma galería `-north-florida` |
| Intro 1/3 | `residentials/pool-remodeling…/modern-pool-remodeling-upgrade-florida.avif` | 1250×698 | 257 | no | sin procedencia verificada |
| Intro 2/3 | `residentials/pool-remodeling…/pool-resurfacing-tile-finish-upgrade-florida.avif` | 1250×933 | 178 | no | ídem |
| Intro 3/3 | `residentials/pool-remodeling…/pool-remodeling-renovation-florida.avif` | 1250×946 | 372 | no | ídem |
| Galería ×10 | `images/pool-remodeling-1…10/*.jpg` | 1250×698/933/946 | 196-348 | no | **las 10 `obra_real`** (una con confianza `media`: la 08) |
| Fila «Structural Repairs & Shell Rebuilds» | `residentials/pool-remodeling…/pool-spa-renovation-backyard-florida.avif` | 1950×1219 | 661 | **🤖 SÍ** | **IA presentada como obra** |
| Fila 2 | `images/pool-remodeling-9/…-09.jpg` | 1250×698 | 203 | no | **repite la galería** de la misma página |
| Fila 3 | `images/pool-remodeling-5/…-05.jpg` | 1250×933 | 241 | no | **repite la galería** |
| Fila 4 | `images/pool-remodeling-2/…-02.jpg` | 1250×946 | 348 | no | **repite la galería** |
| Proceso ×4 | `procesos/pool-remodel-step-1…4/*.png` | 1408×768 | 2042-2240 | **🤖 SÍ, las 4** | ilustración IA de obra, **8,4 MB** |
| Inversión | `projects/luxury-pool-raised-spa-travertine-deck-south-florida/…-project-3.avif` | — | 185 | no | galería de obra propia |
| Collage FAQ ×5 | `pool-remodeling` 08, 03, 09, 04, 06 | 1250 | — | no | repite 5 de la galería; **la 09 sale tres veces en la página** (galería, fila, collage) |

### 0.2 · Los tres hallazgos que gobiernan el encargo

**1 · Hay IA presentada como obra del cliente en las dos páginas, y es la línea roja de
`00-PRINCIPIOS §3`.** Con marcador firmado: una de las tres fotos de la intro de piscina nueva, la
foto de la fila «Structural Repairs» de remodelación, y **los 8 pasos de proceso**. Sin marcador
pero con formato de generador: las dos de 1792×1792 de la intro de piscina nueva. R22-BLOG-IMG ya
lo dejó anotado en su «queda abierto» 4 (105 de 1.097 imágenes del sitio llevan el marcador, 40 en
`residentials/` y 39 en `procesos/`): **este es el encargo aparte que pedía, acotado a las dos
fichas de piscina.**

```bash
for f in public/images/residentials/*pool*/* public/images/procesos/pool-*/*; do
  grep -c trainedAlgorithmicMedia "$f" | grep -q '^[1-9]' && echo "🤖 $f"; done
```

**2 · La ficha de remodelación enseña diez fotos y las repite hasta tres veces.** Galería (10) +
filas (3 de esas 10) + collage (5 de esas 10) + héroe de piscina *nueva*. El visitante que compara
«¿me remodelan bien?» ve la misma piscina acabada en tres sitios y ni una sola **en proceso de
remodelación** — que es exactamente lo que el banco sí tiene (§0.4) y lo que R21 §7.6 dejó
«reportado, no hecho»: *«Su sitio es `/services/pool-remodeling-renovation…`».*

**3 · Las dos fichas pesan por donde no se ve.** La galería de piscina nueva son **8,8 MB en 10
JPEG** a 1250 px (tienen escalera `-p-500/800/1080` en `/images/site/`, así que el navegador no
descarga el máster; pero el lightbox de `check:galeria` sí lo abre). Los 8 PNG de proceso son
**15,7 MB** sin escalera ni `srcset`. Y en `residentials/` duermen **4 PNG de antes/después, 12,1
MB, con marcador IA, que ninguna página referencia** (`grep -rl` en `src/` solo los encuentra en
`assets-locales.json` y el manifiesto): el «Before» era un listado del MLS de Miami y R17-CORE sacó
la sección (`MIGRACION-LOG.md` R17 hallazgo 1).

### 0.3 · La doctrina del encargo: terminada o en obra, según lo que vende el hueco

Es la pregunta literal del pedido, y se contesta hueco a hueco, no por gusto. Regla: **una foto de
obra terminada vende el resultado; una de obra en curso vende la competencia.** Cada hueco pide una
de las dos, y mezclarlas donde no toca cuesta leads (R21 §7.2: tres fotos de un vaso vaciado arriba
de una landing de piscina nueva; R21 §7.6: una piscina vieja resanándose debajo de un anuncio de
piscina nueva).

| Hueco | Qué le pregunta el visitante | Etapa | Por qué |
|---|---|---|---|
| **Héroe** | «¿esto es lo que quiero?» | **terminada**, hora dorada si la hay | primera impresión y LCP: se vende la tarde, no la obra (R21 §7.3) |
| **Intro** (3 celdas) | «¿son reales, son de aquí?» | **terminada**, planos distintos de propiedades distintas | prueba de existencia; tres casas, no una desde tres ángulos |
| **Galería** | «¿cuánto hacen?» | **terminada**, variedad máxima | catálogo; nunca dos seguidas de la misma propiedad |
| **Filas de detalle** (4) | «¿qué hacen exactamente en cada parte?» | **la que enseña lo que dice el texto**: equipos, tile, estructura, plaster | aquí **sí** cabe obra en curso: «Structural Repairs & Shell Rebuilds» se enseña con el vaso abierto; «Plumbing, Equipment, Automation» con el pad de equipos (ya hecho en `60ba38b`); «Resurfacing» con el Bond Kote o el plaster fresco |
| **Proceso** (4 pasos) | «¿cómo va a ser pasar por esto?» | **en obra**, un paso = una etapa real | es el único hueco donde la obra en curso **es el sujeto**. Hoy son 8 ilustraciones IA |
| **Antes/después** (solo remodelación) | «¿de verdad lo transforman?» | **par verificado**: en obra + terminada, misma propiedad | la prueba más persuasiva del banco (R21 §7.4) y hoy no está en ninguna de las dos |
| **Inversión** | «¿me lo puedo permitir?» | **terminada**, plano de tierra | el precio se enseña con el material, no con el dron |
| **Collage FAQ** | apoyo, miniatura | **terminada**, plano de tierra | un dron a 130 px es una mancha azul (R21 §7.5 regla 3) |

**Lo que no cambia con la doctrina:** en la ficha de piscina **nueva** no entra ninguna foto de
`renovation_in_progress` fuera de las filas de detalle y del proceso. Y en la de remodelación el
héroe sigue siendo una piscina **terminada**: el «antes» va en su sección, etiquetado «Before».

### 0.4 · El banco, lo que ya se sabe de él sin volver a abrirlo

`~/Downloads/MrMrs_Outdoor_Living_Image_Bank`, manda `08_ai_index/README_AI_RETRIEVAL.md`. Verificado
en R21 §6 y R22 §0.3; aquí solo lo que decide este encargo:

- **74 publicables** (`approved` + `approved_low_priority`), **3 propiedades** (059: 30 · 062: 30 ·
  061: 14), todas South Florida, todas apaisadas, 16:9 seguro en las 74. Reparto por servicio:
  `custom-pool-spa-builders` 44 · `pool-remodeling-renovation` 30.
- **`construction_stage`: 71 `completed` · 3 `renovation_in_progress`**, los 3 de project-059, uno de
  ellos (`ag-de085ec669`, q94) el de más puntuación del banco. Son el vaso vaciado en resanado.
  Junto con la acabada de la misma propiedad forman **un antes/después real verificado**
  (`search_image_bank.py --project project-059 --pairs`).
- **project-061 es documentación de obra** (vallas de seguridad, trabajo en curso), no marketing
  (R21, tabla «lo que el documento tenía mal», 6.1). Es el pozo natural de «en obra» aprobada.
- **156 `review_required` y 118 `catalogued_not_selected`**: ahí es donde con más probabilidad están
  excavación, acero, gunita y plaster. **No se publican sin respuesta humana**, pero sí se castan y se
  le enseñan a Sebastian para que apruebe (F0).
- **48 `not_for_project_gallery_design_concept_only`**: IA con manifiesto C2PA, 37 con nombre de
  fichero inocente. **Manda `asset_class`, nunca el nombre.**
- **Ya gastadas, no repetir:** las 12 de `/images/obra/project-059|062/` (R21, `galeria-obra-por-ruta.json`
  guarda sus `_asset`), las 3 de `/images/servicios/` (§0.1) y las que R22 derivó a `/images/blog/`
  (`imagenes-blog-por-ruta.json`, campo `_asset`).
- **`lighting` no es de fiar** y **`quality_score` no es casting** (R21 ejecutado, 7.3 y §7.2). Se
  mira la hoja de contactos, y antes de publicar **se abre el fichero al 100 %**: 3 de las 12
  primeras de R21 tenían una manguera de aspiradora cruzando el vaso que la hoja no enseñaba.
- Cinco derivados por activo: `hero` 2400×1350 · `service` 1800×1200 (3:2) · `gallery` 1600×1067
  (3:2) · `blog` 1600×900 · `instagram` 1080×1350 (solo 8, todos 059). **No se recorta a mano lo
  que el banco ya recortó.**

### 0.5 · Dónde se edita cada foto — y qué no es tuyo

Los `.astro` de `/services/` son **DERIVADOS** (`// DERIVADO - no editar a mano`, los regenera
`npm run paginas` desde `_source/vivo/`). Lo que cambia una foto es el **dato** o el **generador**:

| Hueco | Se edita en | Mecanismo | Tuyo |
|---|---|---|---|
| Héroe | `captacion-servicios.json` → `heroe.{foto,alt,ancho,alto}` | `build-paginas.mjs:658`; además alimenta `about.image` del JSON-LD (`:1099`) | **sí** |
| Filas de detalle | `captacion-servicios.json` → `servicios.detalle[].{foto,alt,ancho,alto}` | `:843` | **sí** |
| Inversión | `captacion-servicios.json` → `inversion.{foto,alt,…}` | `InversionCore.astro:46` | **sí** |
| Collage FAQ | `collage-faq-por-ruta.json` (con `pos` y `_hoja`) | `CollageFaq.astro` | **sí** |
| Instagram | `instagram.json` | `FeedInstagram.astro` | sí, pero **no se toca aquí** (solape 10/10 declarado y aceptado; es de PULIDOR-2) |
| Galería ×10 | **`_source/vivo/`** vía bloque 8 del generador: «las 10 de New Pool and Spa Construction de `/gallery`» | `build-paginas.mjs:994-1056` | **no**: son las 10 que el cliente adjudicó para `/gallery`; cambiarlas es decisión de Sebastian y escritura del director |
| Intro ×3 | **`_source/vivo/`**, el generador solo la recoloca (`:1561`) | no hay clave de datos | **no sin director**: hace falta una clave nueva (`intro.fotos[3]`) y su bloque en el generador. Se **pide** en el informe con las 3 fotos ya castadas y derivadas |
| Proceso ×4 | **`_source/vivo/`**, el generador solo cuelga `InversionCore` detrás (`:1565`) | no hay clave de datos | **ídem**: clave `proceso.fotos[4]` + bloque. Se pide con las 4 castadas |
| Antes/después | hoy **no existe** en estas rutas. El componente vive en `src/pages/index.astro` (`S_ANTES_DESPUES`), el JS en `Componentes.astro:685`, el CSS en `antes-despues.css` | sección nueva en la ficha = director + `check:estructura` | **no sin director**: se entrega el par derivado y el marcado propuesto |

**Lo que sí es tuyo en escritura:** `src/data/captacion-servicios.json` (solo las dos claves de
piscina), `src/data/collage-faq-por-ruta.json` (solo las dos rutas), y ficheros **nuevos** bajo
`public/images/obra/<project-id>/`. Nada más. Ni `scripts/*`, ni `_source/`, ni `Base.astro`, ni CSS.

### 0.6 · Las puertas que muerden aquí

| Puerta | Qué pasa |
|---|---|
| `check:texto` | **100 %, no se re-baseliniza nunca.** Un `src`/`alt`/`width` no mueve `innerText`. Un `<figcaption>` o una etiqueta «Before» nueva **sí**: por eso el antes/después se entrega como propuesta, no se monta |
| `check:assets` | Fichero **nuevo en ruta nueva** → no está en el manifiesto y la puerta no lo mira: `grep -c '"local:/images/obra/' _source/assets-manifest.json` da **0** y está verde desde R21. **Reemplazar por nombre** (sobrescribir un `.avif` de `residentials/`) **sí** la enciende: comprobación 3 + `DERIVADOS_A_PROPOSITO`. **Aquí no se sobrescribe nada: ruta nueva siempre** |
| `check:seo` | `heroe.foto` es `og:image` y `about.image`. Cambiarla es correcto; que exista el fichero es lo que mide |
| `check:ix2` | las 3 `<img>` de la intro llevan `data-w-id` (reveal). Si el director las canjea, **se conserva el atributo**; las huérfanas están fijadas en 14 |
| `check:estructura` · `check:captacion` | miden la forma de la capa de captación; una clave nueva en el JSON que el generador no conozca **aborta** |
| `check:galeria` | lightbox de la galería: anclas, 44×44, Escape. No se toca la galería, no debe moverse |
| `check:visual` | **ya está roja en las dos rutas y no es de este encargo**: R21 se fusionó sin re-baselinizar (`MIGRACION-LOG` R23 «queda abierto» 1: −127/−131/−22/+14 px de alto en `/services/custom-pool…`), y `60ba38b`/`6a64c97` cambiaron fotos sin re-baseline. **Una sola aprobación al final, de Sebastian** |
| `check:tokens` | <1 s, se corre siempre. Este encargo **no escribe CSS** |

### 0.7 · Colisiones vivas

- **La verdad de `-north-florida`** (R21 §6.4, pregunta 11): 6 galerías de `projects/` la afirman en
  carpeta y URL, el banco no tiene una sola foto verificada de North Florida, y **las dos fichas
  llevan esa galería en el héroe**. Si Sebastian la confirma, el héroe se queda; si no, el héroe
  sale del banco con `alt` no localizador (decisión (a) de R21 §6.3). **Se pregunta en F0, no se
  supone.**
- **Sanity**: `pool-builders/[slug]` no pasa por el generador; estas dos rutas **sí**. `npm run
  paginas` lo corre el director.
- **`.vercel/output/static` es artefacto compartido.** Construir, commitear y desplegar son del
  director (`DIRECTOR.md:35`).

---

## 1 · FASE 0 — casting sobre hoja de contactos, sin tocar nada

Entregable: **una tabla hueco ↔ foto ↔ etapa ↔ `asset_id` ↔ `publish_status`** para las dos páginas,
y las cuatro preguntas de §7 ya formuladas con sus candidatas al lado. Sin navegador, ~2 h.

1. **Consulta, no escanees.** `08_ai_index/image_bank.sqlite` o `search_image_bank.py`. Dos pozos:

   ```sql
   -- pozo A · terminada, publicable hoy
   select asset_id, project_id, camera_view, lighting, copy_space_zone, quality_score
     from assets where publish_status like 'approved%'
      and asset_class = 'real_completed_project' and construction_stage = 'completed';
   -- pozo B · en obra, publicable o pendiente de respuesta humana
   select asset_id, project_id, publish_status, construction_stage, feature_tags
     from assets where asset_class <> 'generated_design_concept'
      and construction_stage <> 'completed';
   ```

   El pozo B **incluye `review_required` y `catalogued_not_selected` a propósito**: es la única
   forma de saber si el banco tiene excavación, acero, gunita, plaster. Lo que salga de ahí **no se
   publica**: se le enseña a Sebastian en hoja de contactos con su `asset_id` y se le pide la
   aprobación. **Una foto `review_required` que no se aprobó no existe para F1.**

2. **Mira `07_contact_sheets/by-service/`** (4 de `custom-pool-spa-builders`, 3 de
   `pool-remodeling-renovation`) antes de fijar nada. Y para las que pasen el corte, **abre el
   fichero al 100 %** (manguera, cielo quemado, mobiliario a medio poner).

3. **Descarta por lista**, no por memoria: las 12 de `/images/obra/`, las 3 de `/images/servicios/`,
   y las `_asset` de `imagenes-blog-por-ruta.json`.

   ```bash
   python3 -c "import json;[print(f['_asset']) for f in json.load(open('src/data/galeria-obra-por-ruta.json'))['_defecto']['fotos']]"
   grep -o '"_asset": *"[^"]*"' src/data/imagenes-blog-por-ruta.json | sort -u
   ```

4. **Cruza las 20 de `/gallery` contra el banco.** Las 10 `pool-construction-*` y las 10
   `pool-remodeling-*` son obra real adjudicada pero el sitio solo tiene su versión a 1250 px,
   720-1161 KB en JPEG. Si sus originales están entre los 421 activos (hash perceptual con
   `sharp` + `blockhash`, o a ojo sobre la hoja `by-project`), **se pueden rederivar a AVIF 1600
   desde cámara sin cambiar el casting**. Si no están, se queda como está y se dice.

5. **Reparte por propiedad antes que por belleza.** Con 3 casas para ~14 huecos de «terminada»
   entre las dos páginas, el patrón es 059 → 062 → 061 → … variando `camera_view` y `lighting`, y
   **nunca dos contiguas de la misma casa** en intro, filas ni collage. `project-062` es el único con
   las tres combinaciones.

---

## 2 · FASE 1 — `/services/custom-pool-spa-builders-in-north-south-florida`

Es la Final URL de pago: **cero obra en curso por encima de las filas de detalle.**

| Hueco | Qué se hace | Etapa | De dónde |
|---|---|---|---|
| Héroe | **depende de la pregunta 1 de §7.** Si `-north-florida` es real, se queda. Si no, entra una del pozo A, `copy_space_zone` compatible con el titular, hora dorada real (mirada, no etiquetada) | terminada | banco `hero` 2400×1350 → `/images/obra/<id>/` |
| Intro ×3 | **se castan y derivan las 3** (tres propiedades, tres encuadres: aéreo, tierra, detalle) y **se piden al director** con la clave `intro.fotos` propuesta. La celda es vertical: usar `service` 1800×1200 con `object-position` del banco (`copy_space_zone`), **o** los 8 con recorte 4:5 seguro — que son todos de 059 y 3 de ellos el vaso vaciado (R21 §7.2): **esos 3 no** | terminada | banco |
| Galería ×10 | **no se toca el casting.** Solo si F0-4 encuentra los originales: rederivar y pedirlo | terminada | — |
| Fila «Design & Engineering» | sustituir la aérea de `-north-florida` por una de **tierra** que enseñe geometría construida (coping, escalones, banco solar): el texto habla de diseño y el visitante tiene que ver forma, no dron | terminada | banco `service` |
| Fila «Plumbing…» | hecha (`60ba38b`). Se queda | en obra (pad) | — |
| Fila «Finishes, Tile & Coping» | hecha (`6a64c97`). Se queda | terminada (detalle) | — |
| Fila «Remodeling & Spa Additions» | hecha (`60ba38b`). Se queda | terminada | — |
| Proceso ×4 | **ver §4.** Hoy IA con marcador | en obra | pozo B + aprobación |
| Inversión | se queda si la pregunta 1 lo permite; si no, plano de tierra del banco con el deck en primer plano | terminada | banco `service` |
| Collage ×5 | se queda (son las 10 adjudicadas, plano de tierra). Si el cruce F0-4 da originales, rederivar | terminada | — |

**Lo que mejora de verdad en esta página:** sale la IA de la intro (1 segura, 2 probables) y del
proceso (4), y la primera pantalla deja de depender de una galería cuya región nadie ha confirmado.

---

## 3 · FASE 2 — `/services/pool-remodeling-renovation-in-north-south-florida`

Aquí es donde el banco rinde más, porque **tiene lo que la página no enseña**: la obra a medias.

| Hueco | Qué se hace | Etapa | De dónde |
|---|---|---|---|
| Héroe | **una piscina remodelada terminada del banco** (`pool-remodeling-renovation`, 30 aprobadas, project-059), hora dorada si la hay de verdad. Deja de ser la piscina nueva de `-north-florida` | terminada | banco `hero` |
| Intro ×3 | castar 3 de **remodelación terminada** de propiedades distintas; **se piden al director** igual que en F1 | terminada | banco |
| Galería ×10 | no se toca el casting | terminada | — |
| Fila «Structural Repairs & Shell Rebuilds» | **sale la IA de 1950×1219.** Entra el **vaso abierto**: uno de los 3 `renovation_in_progress` de 059 (el q94 vale aquí: es justo el sujeto) o lo que apruebe el pozo B | **en obra** | banco `service` |
| Fila 2 (`-09` repetida) | sustituir por una del banco que enseñe el **plaster o el Bond Kote** si el pozo B lo da; si no, tile/coping terminado de otra propiedad que la galería no tenga | en obra o terminada | banco |
| Fila 3 (`-05` repetida) | sustituir por **equipos** (pad, variable-speed, calentador): el texto de la fila lo promete | en obra (pad) | banco |
| Fila 4 (`-02` repetida) | sustituir por la **misma propiedad del par antes/después, terminada**: cierra el relato de la página | terminada | banco |
| Proceso ×4 | **ver §4** | en obra | pozo B |
| Antes/después | **nueva sección, entregada como propuesta** (§5): `renovation_in_progress` de 059 como «Before» y la acabada de la misma propiedad como «After», derivadas a **dimensiones idénticas** (el JS de `Componentes.astro:685` pinta la de después con `clip-path` sobre la de antes y la costura solo cuadra si los dos ficheros miden igual, `fb4318f`). 5 anchos AVIF 640/960/1280/1600/2000 como la home | par | banco |
| Inversión | se queda (obra propia, South Florida, terminada) | terminada | — |
| Collage ×5 | sacar la **09** (ya está en fila y galería) y meter una de la galería que el collage no tenga; `pos` por hoja de contactos | terminada | `pool-remodeling-*` |

**Lo que mejora de verdad:** la página pasa de «la misma piscina acabada tres veces» a un relato
completo —así estaba, así se abre, así se termina— con obra real en cada paso.

---

## 4 · Los 8 pasos de proceso — la decisión que no es del trabajador

Hoy `process-section` pinta 4 PNG IA por ficha, 1,5-2,2 MB cada uno, con marcador C2PA, bajo el
`alt` «Expert pool excavation, steel rebar, gunite application…». **Es obra generada donde el
visitante entiende «así trabajamos nosotros».** `00-PRINCIPIOS §3` lo permite solo para «huecos donde
no hay ni puede haber foto real», y no es el caso: el cliente construye piscinas todas las semanas.

Tres salidas, en orden de preferencia; **Sebastian elige** (§7, pregunta 3):

| | Salida | Qué hace falta | Coste |
|---|---|---|---|
| **a** | **Foto real por paso**, del pozo B: consulta / plano (paso 1 puede ser terminada: la casa con su render o el equipo midiendo), excavación-acero-gunita (paso 2-3), plaster y llenado (paso 4) | que el pozo B tenga las etapas y Sebastian apruebe las `review_required` | 0 generación |
| **b** | **Pictograma o diagrama** donde el banco no llegue: un esquema de la secuencia, sin pretender fotografía | Higgsfield, lo pide el **director** (`00-PRINCIPIOS §3`) | 0,188 $/imagen |
| **c** | Dejarlas y **etiquetarlas** como ilustración (`alt` que lo diga) | nada | sigue siendo IA de obra sin decirlo visualmente |

Recomendación: **a donde el banco llegue, b en el resto, nunca c.** Y sea cual sea, los PNG de
1408×768 a 2 MB se van: AVIF a 1250 de ancho con escalera `-p-500/800`, como `/images/obra/paneles/`.

Si el banco **no tiene** excavación ni gunita entre sus 421 ficheros (probable: son fotos de
entrega, no de obra), el informe lo dice con el `select` pegado y **se pide una sesión de obra en
curso** al cliente, igual que R21 pidió sesión en North Florida. Una visita de 30 minutos a una obra
activa cierra los 8 huecos de las dos fichas.

---

## 5 · Marcado, nombres y derivados

- **Ruta nueva, siempre:** `/images/obra/<project-id>/<seo_filename sin '-south-fl'>.avif|webp`.
  Es la que R21 fijó y por el mismo motivo: el nombre del banco afirma región en la URL y estas
  fichas se venden a las dos. **No se sobrescribe ningún fichero de `residentials/` ni
  `procesos/`**: los viejos se quedan hasta que el director los retire con el manifiesto delante.
- **El `alt` sale del banco palabra por palabra** (`suggested_alt_service` en filas e intro,
  `suggested_alt_gallery` en collage). Sin ciudad, región, medida, precio, marca ni licencia.
  Excepción ya sentada por `60ba38b`: si se recorta y lo que se ve cambia, el `alt` se reescribe por
  lo que se ve.
- **`width`/`height` literales y ciertos.** Casan con el fichero (`703`, no `698`, si así es). Si
  el banco trae giro `irot`, **se hornea** en búfer intermedio (`6a64c97`): un fichero de 698×1250
  con marca «gírame» reserva el hueco al revés.
- **Techo = máster.** `hero` 2400, `service` 1800, `gallery` 1600. No se amplía.
- **Peso:** AVIF q52 4:2:0 effort 6 como `fb4318f`; `webp` solo si hay que casar con `/images/obra/`
  existente. Los 5 anchos solo en el antes/después; en filas e intro bastan 1x/2x del hueco pintado
  (medir el hueco en `servicio-core.css:378` antes de decidir).
- **Trazabilidad:** cada entrada nueva del JSON lleva `_asset` y `_proyecto` (no se pintan), y
  cada foto usada se apunta en `08_ai_index/page_asset_usage.csv` del banco.
- **Cero `data-w-id` nuevos. Cero CSS. Cero texto.**

---

## 6 · Orden de ejecución y coste

| | Trabajo | Puertas | Coste |
|---|---|---|---|
| **F0** | Casting en hoja de contactos; dos pozos; cruce de `/gallery` contra el banco; tabla hueco↔foto↔etapa; las 4 preguntas de §7 con candidatas | — | ~2 h, sin navegador |
| **F1** | Piscina nueva: héroe (condicional), fila «Design», derivados de intro para el director | `tokens` · `assets` · `seo` · `estructura` · `captacion` · `texto`(1 ruta) | ~6 ficheros + ~8 líneas de JSON |
| **F2** | Remodelación: héroe, 4 filas, collage, derivados de intro y del par antes/después | ídem + `galeria` | ~10 ficheros + ~20 líneas |
| **F3** | Director: clave `intro.fotos` y `proceso.fotos` + bloque del generador; sección antes/después; retirada de IA y de los 4 PNG huérfanos con manifiesto | `estructura` · `ix2` · `assets` · `visual`(2) | director |
| **F4** | Re-baseline de las 2 rutas, **una vez**, con el rojo heredado de R21 incluido | `aprobar-diseno.mjs` | solo Sebastian, árbol limpio |

```bash
npm run check:tokens
node scripts/check-assets.mjs                         # 0 desfases; nada nuevo si la ruta es nueva
npm run check:seo                                     # og:image y about.image apuntan a fichero que existe
node scripts/check-texto.mjs  services/custom-pool    # 100 %
node scripts/check-texto.mjs  services/pool-remodel   # 100 %
node scripts/check-visual.mjs services/custom-pool    # 4 anchos · rojo ESPERADO (y ya lo estaba)
node scripts/check-visual.mjs services/pool-remodel
```

**Nunca `/` ni `services` a secas como filtro**: `services` casa 14 fichas + `/services` índice.
La subcadena es la del slug. **Nada de `ui-qa` ni `0.8.0:audit`**: se abre una ruta, se mira, se cierra.

Y a ojo, lo que ninguna puerta ve: que en 390 px el héroe deje aire al titular (`copy_space_zone`),
que las 3 de la intro **no parezcan la misma casa**, y que la foto de cada fila **enseñe lo que la
fila dice**.

---

## 7 · Las decisiones que son de Sebastian — se preguntan en F0, con las candidatas al lado

| # | Pregunta | Qué desbloquea |
|---|---|---|
| 1 | **¿Las 6 galerías `-north-florida` de `projects/` son obra real de North Florida?** (R21 §6.4, pregunta 11, sin contestar) | el héroe de las dos fichas y la fila «Design» de piscina nueva. Afecta además a 72 rutas vivas |
| 2 | **¿Las dos de 1792×1792 de la intro de piscina nueva son fotografía?** No llevan marcador, pero 1792² es formato de generador y no de cámara, y una lleva `.avif.avif` | si no, salen las 3 de la intro, no 1 |
| 3 | **Proceso: a, b o c de §4** | las 8 de proceso |
| 4 | **¿Aprueba las `review_required` del pozo B que F0 le enseñe?** (`asset_id` a `asset_id`) | las filas «en obra», el «Before», el proceso |
| 5 | **¿Entra la sección antes/después en la ficha de remodelación?** R17-CORE §10 la dejó «vuelve en su propio commit cuando exista el par honesto»; el par existe en el banco | F3 |

---

## 8 · Decisiones ya tomadas — no se rediscuten

| | | |
|---|---|---|
| Fotos del banco → ruta nueva sin región | `/images/obra/<id>/` | R21; `60ba38b` usó `/images/servicios/` y se queda, no se mueve |
| `alt` palabra por palabra del banco | sin ciudad ni región | R20 F2, R21 |
| Galería e Instagram no se tocan | son las 10 adjudicadas por el cliente y el solape está declarado | FICHAS-ORDEN · 2, `instagram.json` |
| La IA nunca es obra | ni con nombre bonito ni sin marcador | `00-PRINCIPIOS §3`, R22 (`-tccm-` sin marcador y eran IA) |
| `quality_score` y `lighting` no castan | se mira | R21 ejecutado |
| Casting por hoja de contactos y fichero abierto | la hoja descarta, el fichero aprueba | R21 corrección 18-sep |
| Un solo re-baseline, al final | incluye el rojo heredado de R21 | R23 abierto 1 |

---

## 9 · Lo que este encargo NO hace

- **No reescribe una palabra.** `check:texto` al 100 % es lo que permite tocar todo lo demás.
- **No toca `scripts/`, `_source/`, CSS ni `Base.astro`.** Lo que necesite generador se **pide**, con
  los ficheros ya derivados y el JSON ya escrito en la forma propuesta.
- **No sobrescribe ningún fichero existente.** Ruta nueva; la retirada de los viejos es del director.
- **No genera obra.** Higgsfield solo para pictogramas de §4-b, y lo pide el director.
- **No toca `.location`, `.social-media`, `CarruselBlog` ni las otras 12 fichas.** El mapa con
  marcador IA de `where-we-serves/` y los 105 ficheros marcados del sitio se **reportan**.
- **No construye, no commitea, no despliega, no barre el sitio.**

---

## 10 · Informe

```
ENCARGO R24-FOTO-PISCINAS · FASE · ESTADO · FICHEROS ruta:linea
CASTING   hueco | foto (asset_id, project, stage, publish_status) | etapa pedida | por qué
NUMEROS   fichero | px antes→después | KB antes→después | comando
IA RETIRADA  fichero | marcador | sustituto
PUERTAS   nombre | verde/rojo/NO CORRIDA | salida literal
PARA EL DIRECTOR  claves JSON propuestas + bloque de generador descrito + ficheros ya derivados
PREGUNTAS A SEBASTIAN  las 5 de §7, cada una con candidatas en hoja de contactos
ABIERTO
```

**Un número sin el comando que lo produjo es una opinión. Una puerta que no corrió no es verde.**
