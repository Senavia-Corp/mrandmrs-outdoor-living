# R22-BLOG-IMG — la imagen de los blogs, con obra real

**Estado: LISTO PARA EJECUTAR.** Todo medido sobre el árbol de hoy. La única decisión que queda
abierta es **D1: el orden del re-baseline con `PROMPT-FONDO-AGUA`** (§6), y no bloquea F0-F2.

**Base:** `5c74909` (R20-CIUDADES F2, en producción) + la rama `r21-ciudades` sin commitear.

**Pedido literal (18-sep):** «reemplazar todas las imágenes de los blogs y agregar más imágenes en
cada blog en la estructura del blog usando el banco de imágenes de Mr and Mrs Outdoor Living de
proyectos reales de la empresa, mejorando la fidelidad y engagement de la página. Tanto los que se
ven en la página de blogs, como los que salen en el carrusel en todas las páginas, como dentro de
cada blog.»

**Decidido por Sebastian (18-sep):** los 4 artículos de los que el banco no tiene foto se ilustran
con **las galerías que el sitio ya sirve**, no generando ni forzando una foto de otro sujeto. §3.

---

## 0 · Lo que hay que saber antes de tocar un fichero

### 0.1 · Las tres superficies son UNA superficie: 11 ficheros

Esto gobierna todo el encargo. Las tres cosas que pide Sebastian —la página de blogs, el carrusel de
todas las páginas, y las tarjetas de dentro de cada artículo— **no son tres juegos de imágenes: son
el mismo juego de 11 ficheros `.webp` referenciado desde tres sitios.**

| Superficie | Rutas | De dónde saca la imagen |
|---|---:|---|
| `/blogs-tips` | 1 | `T0` horneado en `src/pages/blogs-tips.astro` |
| `CarruselBlog` (home, 14 fichas, estado, condados, ciudades) | **79** | `src/data/blogs.json` → `CarruselBlog.astro:66` |
| «Most Read Articles», al pie de cada artículo | 10 | `T0` horneado en cada `src/pages/blogs/*.astro` |

```bash
grep -rlo 'fs-slider-blog_instance' .vercel/output/static --include='*.html' | wc -l   # 79
grep -rlo 'Most Read Articles'      .vercel/output/static --include='*.html' | wc -l   # 10
grep -rlE 'luxury-pool-designs-florida-homes|outdoor-living-design-florida-homes|pool-construction-permits-florida|common-pool-construction-mistakes-florida|pool-construction-timeline-florida|new-pool-construction-vs-pool-remodeling-florida|commercial-pool-construction-florida|residential-vs-commercial-pool-construction-florida|outdoor-living-increases-property-value-florida' \
  .vercel/output/static --include='*.html' | wc -l                                      # 90 de 122
```

**90 de las 122 rutas construidas** referencian al menos una imagen de blog. La consecuencia
práctica, y es la buena noticia del encargo:

> **Conservando el nombre del fichero, el reemplazo de las 10 tarjetas no toca una sola línea de
> marcado.** Se sustituye el `.webp` en `public/images/site/` y las 90 rutas cambian solas. Cero
> markup, cero `check:texto`, cero `check:enlaces`, cero `check:seo` —el `image` de los
> `BlogPosting` del JSON-LD apunta a esos mismos nombres y sigue siendo válido.

**Los nombres se conservan.** Renombrar al `seo_filename` del banco cuesta 11 nombres × 14 ficheros
de origen, rompe el rastro con `_source/assets-manifest.json`, y no gana nada medible.

### 0.2 · El cuerpo de 9 de los 10 artículos NO tiene ni una imagen

Medido, artículo por artículo:

```
 KB | imgs uniq | h2 h3 | artículo
 37 |    7    7 | 11 23 | commercial-pool-construction-in-florida-what-decision-makers-must-know
 27 |    7    7 |  7 15 | common-pool-construction-mistakes-we-see-in-florida
 44 |    7    7 | 12 26 | complete-guide-to-pool-construction-in-florida-costs-timeline-process
 26 |    7    7 |  8 12 | how-outdoor-living-spaces-increase-property-value-in-florida
 31 |    7    7 |  7 16 | new-pool-construction-vs-pool-remodeling-which-is-right-for-you
 32 |    7    7 |  9 18 | outdoor-living-design-guide-for-florida-homes
 36 |    7    7 | 11 21 | pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish
 39 |    7    7 | 10 22 | residential-vs-commercial-pool-construction-in-florida
 47 |   11   11 |  7 25 | top-10-luxury-pool-designs-for-florida-homes
 29 |    7    7 |  9 13 | what-permits-are-required-for-pool-construction-in-florida
```

Esas **7 imágenes son las 7 tarjetas de «Most Read Articles»**, todas por debajo del último `<h2>`.
El orden real de `what-permits`, sacado de su `T0`:

```
[SECTION hero-project]   h1 — sin <img>: el fondo es la banda de agua de propio.css:506
[SECTION blog-section]   h2 ×7, h3 ×6   ← 28.151 caracteres de texto, CERO imágenes
                         h2: Most Read Articles → 7 <img>
[SECTION cta-footer]
```

O sea: **«agregar más imágenes en cada blog» es marcado nuevo, no un reemplazo.** Es la mitad cara
del encargo y la que de verdad mueve el engagement: hoy son 26-47 KB de prosa seguida, 7 a 12 `h2`
sin un respiro visual, y el lector llega a la primera foto cuando el artículo ya se acabó.

El único que sí tiene cuerpo ilustrado es `top-10`, con 4 `.jpg` `-tccm-` de 168-196 KB.

### 0.3 · Fuente A — el banco: 421 activos, y solo 74 se pueden publicar

`~/Downloads/MrMrs_Outdoor_Living_Image_Bank`. Su `08_ai_index/README_AI_RETRIEVAL.md` manda; esto
es el resumen medido contra `image_bank.sqlite`:

| `publish_status` | | |
|---|---:|---|
| `review_required` | 156 | necesitan respuesta humana antes de usarse |
| `catalogued_not_selected` | 118 | reales, fuera de la preselección |
| **`approved` + `approved_low_priority`** | **74** | **lo único publicable hoy** |
| `not_for_project_gallery_design_concept_only` | 48 | **generadas por IA** |
| `excluded_provenance` · `privacy_hold` · `video_review_required` | 24 | |

**🚨 La línea roja, y aquí es literal.** 48 activos llevan manifiesto C2PA firmado declarando
`trainedAlgorithmicMedia`, y **37 tienen nombre de fichero listo para web** del tipo
`luxury-pool-spa-contractors-north-south-florida.jpeg`. Varias son ediciones IA de obra real del
cliente. **El nombre del fichero no prueba nada: manda `asset_class`.** Es `00-PRINCIPIOS §3` y
`§4` —elegir por hoja de contactos, nunca por nombre— con la prueba criptográfica de por qué.

Los 74 aprobados:

```
región         south_fl  74       (no hay ni una foto aprobada de North Florida)
orientación    landscape 74
servicio       custom-pool-spa-builders 44 · pool-remodeling-renovation 30
propiedades    project-059: 30 · project-062: 30 · project-061: 14   ← TRES casas, no treinta
16:9 seguro    74 de 74 (crop_not_safe con 16:9: 0)
etapa          completed 71 · renovation_in_progress 3  ← los 3 se excluyen, ver §1.2
```

**El banco ya trae el derivado que hace falta.** Cinco formatos por activo, y uno se llama `blog`:

| formato | tamaño | uso |
|---|---|---|
| `hero` | 2400×1350 | 16:9 grande — es el máster útil |
| **`blog`** | **1600×900** | **16:9 — exactamente la tarjeta de blog** |
| `service` | 1800×1200 | 3:2 |
| `gallery` | 1600×1067 | 3:2, el que usó R21 en `/images/obra/` |
| `instagram` | 1080×1350 | 4:5, solo 8 |

Cada activo trae `suggested_alt_gallery`, `suggested_alt_service`, `suggested_caption`,
`quality_score`, `safe_crops`, `copy_space_zone`, `camera_view`, `lighting` y `construction_stage`.
El `alt` se copia **palabra por palabra** del banco, como ya decidió R21
(`src/data/galeria-obra-por-ruta.json`), y no nombra ciudad ni región.

### 0.4 · Fuente B — las galerías que el sitio ya sirve

Es lo que decidió Sebastian para los 4 huérfanos. Son obra real del cliente, **ya versionadas, ya
en el manifiesto, ya servidas**, y cubren exactamente lo que al banco le falta:

| Carpeta | Contenido | Ficheros | Techo |
|---|---|---:|---|
| `public/images/images/commercial-1…10` | hotel/resort, country club, HOA, multifamiliar, build-to-rent, lap pool, hidroterapia, escolar, senior living | 10 | 1250×682 |
| `public/images/images/pool-construction-1…10` | piscina residencial, obra propia | 10 | 1250×698 |
| `public/images/images/pool-remodeling-1…10` | remodelación | 10 | 1250×698 |
| `public/images/images/kitchen-1…8` | cocina exterior | 8 | 1250×698 |
| `public/images/images/pergolas-1…10` · `deck-1…10` · `patio-screen-1…10` · `light-1…10` · `landscaping-1…10` | pérgola, deck, enclosure, iluminación, jardinería | 50 | 1250×698-933 |
| `public/images/projects/` | **15 galerías de proyecto con nombre propio** (pool+pergola+cocina+enclosure, north y south FL) | 81 | 1250 |
| `public/images/residentials/` | 14 galerías por servicio | 95 | 1250 |

**Lo que NO vale de aquí:**

- `public/images/subservices/**` son **SVG de icono**, no fotografía. 112 ficheros, ninguno usable
  como imagen de artículo.
- `public/images/procesos/**` son **PNG de 1408×768 y 1,5-2,2 MB cada uno**. Aunque el sujeto
  encaje (`pool-construction-step-1…4`), usarlos obliga a reencodar → fichero nuevo → entrada
  `local:` + `DERIVADOS_A_PROPOSITO` (§1.4). **No se usan en este encargo.** Si un artículo pide
  una secuencia de etapas, se pide aparte.

**La regla que separa las dos fuentes, y hay que respetarla:** el banco trae metadatos verificados y
`asset_class` firmado; las galerías del sitio **no**. Por eso las galerías solo se usan donde el
banco no llega, el `alt` sale del marcado que ya existe en la ficha de servicio correspondiente, y
**nunca se mezcla una galería y el banco dentro de la misma imagen** (nada de recortar una del sitio
para que «case» con una del banco).

### 0.5 · Lo que la decisión de Sebastian arregla de paso

Con los 4 huérfanos saliendo de las galerías, **solo 6 artículos tiran de las 3 propiedades del
banco**, no 10. El aviso del propio banco (`README §7`: *prefer varied projects*, marca
`[repeat property]`) deja de ser un problema de recasting imposible y pasa a ser un patrón de
alternancia que sí cabe. R21 ya gastó 12 de las 74; quedan 62.

### 0.6 · Las puertas que muerden aquí

| Puerta | Qué pasa |
|---|---|
| `check:assets` | **la que muerde de verdad, y solo en F1.** Comprobación 3 exige que el `sha256` del manifiesto case con el disco. Reemplazar un `.webp` la enciende hasta declararlo — procedimiento exacto en §1.4. **Las galerías de §0.4 no la tocan: se referencian en su sitio, no se copian** |
| `check:texto` | `innerText` al 100 %. Un `<img>` **no lo mueve** (ni su `alt`). Un `<figcaption>` **sí**: es texto nuevo y sale rojo. Por eso el cuerpo va con `alt` y sin pie de foto (§2.2, y F4 opcional en §4) |
| `check:visual` | rojo correcto en **hasta 90 rutas**. Es el coste real del encargo y va al final, en una sola aprobación (§0.7) |
| `check:seo` | el `image` de cada `BlogPosting` apunta a `/images/site/<nombre>.webp`. **Conservando nombres sigue verde sin tocarlo** |
| `check:enlaces` · `check:rutas` | no se mueven: no se añaden enlaces |
| `check:tokens` | estática, <1 s. CSS nuevo: 0 literales de color, 0 `!important`, `min-width` 480/768/992, longitudes desde `--mm-e-*` |
| `check:ix2` | **no emitir `data-w-id` nuevos.** Las huérfanas están fijadas en 14 |
| `check:carrusel` | los slides tienen que ser **hijos directos** de `[fs-slider-element="list"]`. No se toca el carrusel, pero el reemplazo pasa por sus tarjetas |

### 0.7 · Colisiones vivas — leer antes de correr nada

- **`check:visual` ya está rojo** por contrato `rediseño` en 55 rutas de R20/R21, y solo Sebastian
  cierra con `aprobar-diseno.mjs`. Este encargo suma hasta 90 rutas sobre esa misma deuda.
  **Una sola aprobación al final, no una por fase.**
- **`PROMPT-FONDO-AGUA.md`** (aprobado 12-sep, parado hasta cerrar T2/T5 de `PROMPT-LOCAL`)
  reescribe todo fondo azul del sitio y toca `.hero-project`, que son **las 10 rutas de `/blogs/`**.
  Los dos frentes se pisan en el héroe del artículo. **No re-baselinizar `/blogs/` dos veces** — es
  la decisión D1 de §6.
- `aprobar-diseno.mjs` **exige árbol limpio**. Hoy `r21-ciudades` tiene 20 ficheros sin commitear.
- `.vercel/output/static` es artefacto compartido y puede haber otros chats sobre este árbol.
  **Construir, commitear y desplegar son del director** (`docs/encargos/DIRECTOR.md:35`).

### 0.8 · Un hallazgo que no es de imagen pero sale al mirar esto

**7 de los 10 artículos se enlazan a sí mismos** en «Most Read Articles»:

```bash
for f in src/pages/blogs/*.astro; do slug=$(basename $f .astro);
  grep -q "href=\\\\\"/blogs/$slug\\\\\"" $f && echo "  AUTOENLACE: $slug"; done
```

```
AUTOENLACE: common-pool-construction-mistakes-we-see-in-florida
AUTOENLACE: complete-guide-to-pool-construction-in-florida-costs-timeline-process
AUTOENLACE: new-pool-construction-vs-pool-remodeling-which-is-right-for-you
AUTOENLACE: outdoor-living-design-guide-for-florida-homes
AUTOENLACE: pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish
AUTOENLACE: top-10-luxury-pool-designs-for-florida-homes
AUTOENLACE: what-permits-are-required-for-pool-construction-in-florida
```

Herencia del Webflow: la lista de relacionados no se excluye a sí misma. Arreglarlo quita texto →
`check:texto` rojo hasta declararlo. **Fuera de alcance: se reporta, no se arregla aquí.**

---

## 1 · FASE 1 — las 10 tarjetas, obra real, sin tocar marcado

### 1.1 · Lo que hay hoy

| Fichero (base) | px | Peso con derivados |
|---|---|---:|
| `luxury-pool-designs-florida-homes` (+ variante `--blogs-tips`) | 2752×1536 | 4.947 KB |
| `pool-construction-timeline-florida` | 2752×1536 | 3.126 KB |
| `common-pool-construction-mistakes-florida` | 2752×1536 | 2.610 KB |
| `new-pool-construction-vs-pool-remodeling-florida` | 2752×1536 | 2.585 KB |
| `residential-vs-commercial-pool-construction-florida` | 3168×1780 | 2.341 KB |
| `outdoor-living-increases-property-value-florida` | 2752×1536 | 2.289 KB |
| `commercial-pool-construction-florida` | 2752×1536 | 2.238 KB |
| `outdoor-living-design-florida-homes` | 2752×1536 | 1.966 KB |
| `pool-construction-permits-florida` | 2400×1792 | 1.917 KB |
| **TOTAL** | | **69 ficheros · 23,5 MB** |

Dos cosas que se ven solas: **23,5 MB para 10 tarjetas** —la escalera llega a `-p-2600` y el
original a 2752 px para pintar una tarjeta de ~380 px— y **una relación de aspecto que no es
uniforme** (16:9 en 7, 4:3 en `permits`, raro en `residential-vs`). La altura de la fila la fija la
más alta.

### 1.2 · El casting — por hoja de contactos

1. **Nunca escanear carpetas.** Se consulta `08_ai_index/image_bank.sqlite` o
   `search_image_bank.py`, filtrando `publish_status LIKE 'approved%'` y
   `asset_class = 'real_completed_project'`.
2. **Mirar `07_contact_sheets/by-service/`** (7 hojas: 4 de `custom-pool-spa-builders`, 3 de
   `pool-remodeling-renovation`) antes de decidir. El nombre miente; la hoja no.
   Para las galerías de §0.4, la hoja de contactos es abrir la ficha de servicio que ya las pinta.
3. **Alternar propiedad tarjeta a tarjeta.** Nunca dos seguidas de `project-059`. Con 3 propiedades
   para 6 tarjetas de banco: 059 → 062 → 061 → 059 → 062 → 061, variando `camera_view`
   (`aerial`/`ground`) y `lighting` (`day`/`golden_hour_or_twilight`). `project-062` es el único con
   las tres combinaciones.
4. **Excluir `construction_stage = renovation_in_progress`** (3 fotogramas en 059, uno de ellos el
   de más puntuación del banco, q89). Un vaso vaciado en pleno resanado no es la tarjeta de un
   artículo sobre piscina nueva. Misma decisión que tomó R21.
5. **No repetir las 12 ya gastadas** en `public/images/obra/project-059/` y `project-062/`.
6. **Origen: el derivado `blog` (1600×900).** Es 16:9 exacto y ya está generado. No recortar a mano
   lo que el banco ya recortó.
7. **Para las 4 tarjetas de galería** el origen es el fichero que ya sirve el sitio (1250 px). Se
   reencoda al nombre de destino conservando su relación de aspecto; **no se amplía**.

### 1.3 · La asignación, artículo por artículo

| # | Artículo | Fuente de la tarjeta | Pozo de candidatas |
|---|---|---|---|
| 1 | `top-10-luxury-pool-designs-…` | **banco** | `custom-pool-spa-builders`, 062/061, `aerial` o `golden_hour` |
| 2 | `complete-guide-to-pool-construction-…` | **banco** | `custom-pool-spa-builders`, `completed` |
| 3 | `pool-construction-timeline-…` | **banco** | `custom-pool-spa-builders`, `ground` |
| 4 | `common-pool-construction-mistakes-…` | **banco** | `pool-remodeling-renovation` 059, `completed` |
| 5 | `new-pool-construction-vs-pool-remodeling-…` | **banco** | el banco tiene **los dos servicios**: una foto que lea como piscina nueva |
| 6 | `how-outdoor-living-…-property-value` | **galería** | `images/kitchen-*`, `pergolas-*`, `deck-*`, `projects/luxury-pool-pergola-outdoor-living-south-florida` |
| 7 | `outdoor-living-design-guide-…` | **galería** | `projects/luxury-pool-pergola-outdoor-kitchen-south-florida`, `residentials/custom-outdoor-kitchens-…` |
| 8 | `what-permits-are-required-…` | **galería** | `images/pool-construction-*` — obra residencial identificable, sin inventar un permiso |
| 9 | `commercial-pool-construction-…` | **galería** | `images/commercial-1…10` |
| 10 | `residential-vs-commercial-…` | **mixta** | mitad residencial del **banco**, mitad comercial de `images/commercial-*`. Si solo cabe una: **comercial**, que es la mitad que hoy no está |

Las 10 `commercial-*` con su sujeto, para que el casting no se haga a ciegas:

```
commercial-1   build-to-rent-community-pool-builders-florida.avif
commercial-2   commercial-lap-pools-fitness-centers-florida.avif
commercial-3   commercial-pool-developers-new-construction-florida.avif
commercial-4   country-club-pool-design-build-florida.avif
commercial-5   hoa-community-pool-renovation-florida.avif
commercial-6   hotel-resort-pool-contractors-florida.avif
commercial-7   medical-hydrotherapy-pool-construction-florida.avif
commercial-8   multifamily-pool-construction-renovation-florida.avif
commercial-9   school-university-aquatic-facilities-florida.avif
commercial-10  senior-living-pool-construction-florida.avif
```

Hoy solo `/industry-solutions` las pinta. El resto del sitio no las ve.

### 1.4 · La escalera de derivados

Los nombres se conservan, así que hay que reproducir la escalera exacta de cada imagen:

```
…-p-500.webp  …-p-800.webp  …-p-1080.webp  …-p-1600.webp  …-p-2000.webp  …-p-2600.webp  ….webp
```

`sharp@0.35.4` ya está en `devDependencies`.

**Regla de techo: no se inventa resolución.** El máster del banco es 2400×1350 (`hero`); el de una
galería del sitio es 1250. Los peldaños por encima del máster **no se generan ampliados**.

**Decidido: se recorta la escalera.** Banco → `500/800/1080/1600/2000`. Galería → `500/800/1080`
(+ el original a 1250). Y se corrige el `w` del `srcset` en `src/data/blogs.json`,
`src/pages/blogs-tips.astro` y los 10 artículos: ~33 ediciones de cadena, todas mecánicas.
El motivo es el punto del encargo: una tarjeta de 380 px sirviendo un fichero de 2752 px es
exactamente lo que hace que un blog no enganche en móvil.

> Si se prefiere cero marcado, la alternativa es conservar los 7 peldaños con el último igual al
> máster y dejar el `w` declarado mintiendo. Se descartó: deja el problema de peso intacto.

### 1.5 · `check:assets` — el procedimiento exacto, que no es obvio

78 entradas del manifiesto casan con estos nombres, todas remotas (`https://cdn.prod.website-files…`)
y ninguna `local:`. Está documentado en `scripts/check-assets.mjs:27-41`. Por cada `.webp`
reemplazado:

1. **Añadir su entrada `local:<ruta pública>`** a `_source/assets-manifest.json`, con el `sha256`
   del fichero nuevo y su `dim` — la comprobación 4 exige dimensiones en toda imagen.
2. **No tocar la entrada remota.** Se queda **congelada con el hash del original de Webflow**.
   Igualar los dos hashes afirmaría que el CDN de Webflow sirve nuestra foto, que es falso, y
   borraría el único rastro de la migración.
3. **Declararlo en `DERIVADOS_A_PROPOSITO`** con su motivo, en la forma de las entradas de
   R13-COLOR. La comprobación 7 exige que **todo camino declarado tenga su entrada `local:`**: si
   se declara sin crearla, la puerta sale roja al revés.
4. Comprobación 6: el nombre no puede llevar hash de 24 hex, `%`-escape ni espacio. Los nombres
   actuales ya están limpios.

```bash
node scripts/check-assets.mjs          # estática, no abre navegador
```

**Rómpela una vez a propósito** —declara uno sin su `local:`— y pega el rojo. Una puerta que nunca
se vio roja no es una puerta (`DIRECTOR.md:149`).

### 1.6 · Cómo se acepta la Fase 1

```bash
npm run check:tokens                      # <1 s
node scripts/check-assets.mjs             # 0 desfases · N derivados declarados, todos con local:
npm run check:seo                         # BlogPosting.image intacto
node scripts/check-texto.mjs blogs        # 10 artículos + /blogs-tips: DEBE seguir 100 %
node scripts/check-visual.mjs blogs-tips  # 4 anchos · rojo ESPERADO, es el cambio pedido
node scripts/check-visual.mjs '=/'        # la home, por el carrusel. Con comillas: zsh se come =/ suelto
```

Y a ojo, porque ninguna puerta lo ve: **las tres propiedades del banco no pueden parecer una.** Se
abre `/blogs-tips` a 1440 y a 390, se mira la rejilla entera de una vez, y si dos tarjetas
contiguas son la misma casa se recasta. Una ruta suelta en el navegador es normal; **no se barre el
sitio** (`CLAUDE.md §1`).

---

## 2 · FASE 2 — imagen dentro del artículo

Es lo que pide «agregar más imágenes en cada blog», y es donde está el engagement.

### 2.1 · Dónde van, y cuántas

**3 imágenes por artículo, no una por `h2`.** Con 7-12 `h2`, una por sección son 90 imágenes: el
lector reconoce la misma casa a la tercera y el artículo pierde autoridad en vez de ganarla. Tres,
donde el texto describe algo que la foto **de verdad enseña**:

| Posición | Regla |
|---|---|
| 1.ª | tras el primer `h2`, antes del segundo. Es la que se ve sin scroll en 390 px |
| 2.ª | en el tercio central, detrás del `h2` cuyo sujeto salga en `feature_tags` (banco) o en el `alt` que ya tiene la foto (galería) |
| 3.ª | detrás del último `h2` de contenido, **antes** de «Most Read Articles» |

**Ninguna se pone donde el texto habla de algo que la foto no enseña.** Un artículo de permisos
ilustrado con un spa de mosaico no ilustra: decora, y el lector lo nota.

La fuente de cada artículo es la misma tabla de §1.3. Los 4 huérfanos y la mitad comercial del
décimo salen de galería; los 6 restantes, del banco, sin repetir las que se gastaron en la tarjeta.

### 2.2 · El marcado

Dos casos, y la diferencia importa:

**(a) Del banco** — fichero nuevo, derivado `gallery` (1600×1067) o `blog` (1600×900), a
`/images/blog/<slug>/`:

```html
<figure class="blog-figura">
  <img src="/images/blog/<slug>/<nombre>.webp"
       alt="<suggested_alt_gallery del banco, palabra por palabra>"
       width="1600" height="900" loading="lazy" decoding="async">
</figure>
```

**(b) De galería** — **se referencia en su sitio, no se copia**:

```html
<figure class="blog-figura">
  <img src="/images/images/commercial-6/hotel-resort-pool-contractors-florida.avif"
       alt="<el alt que ya usa la ficha de servicio para esa misma foto>"
       width="1250" height="682" loading="lazy" decoding="async">
</figure>
```

Copiarlas sería duplicar peso en `public/`, duplicar entradas de manifiesto y abrir la comprobación
7 de colisiones (mismo destino, contenido distinto) sin ganar nada: ya están versionadas y servidas.

Reglas comunes:

- **Sin `<figcaption>`.** Es texto nuevo → `check:texto` rojo. Si se quiere pie de foto (y
  `suggested_caption` del banco es bueno), es la F4 opcional de §4, con bloques declarados.
- **`width`/`height` literales, siempre.** Sin ellos hay CLS, y `astro dev` no los hornea: se
  verifica sobre `.vercel/output/static`.
- **Ruta nueva `/images/blog/<slug>/`** para lo del banco, no `/images/site/`. Neutra, sin token de
  región — igual que R21 con `/images/obra/`, y por el mismo motivo: `…-south-fl-…` afirma en la
  URL una región que el artículo no dice.
- **Cero `data-w-id`.** `check:ix2` fija las huérfanas en 14.
- CSS en `src/styles/lectura.css` (ya es la hoja de las 20 rutas de `.hero-project`) o en el
  `<style>` del componente si se extrae uno. Los bloques `<style>` de componente **no cuentan**
  contra el presupuesto de 92 KB que suma `check-tokens.mjs:429`.
- **`.avif` y `.webp` conviven** en la misma página sin problema: el sitio ya sirve las dos.

### 2.3 · Los 4 `.jpg` de `top-10`

`top-10-luxury-pool-designs-for-florida-homes-tccm-.jpg-0{0,1}.jpg` y `-1{0,1}.jpg`, 168-196 KB
cada uno, `.jpg` donde todo lo demás es `.webp`/`.avif`. **Antes de tocarlos hay que mirarlos en
hoja de contactos y establecer su origen**: el nombre `-tccm-` no dice de dónde salieron y el banco
tiene 48 IA con nombres inocentes. Si son reales y del cliente, entran en el patrón de §2.2
reencodados. Si no se puede establecer el origen, **se reemplazan** por las 3 del banco que le
tocan a ese artículo.

### 2.4 · Cómo se acepta la Fase 2

```bash
npm run check:tokens
node scripts/check-texto.mjs blogs     # DEBE seguir 100 %: un <img> no mueve innerText
node scripts/check-visual.mjs blogs/   # 10 rutas × 4 anchos ≈ 8-10 min · rojo esperado
node scripts/check-ix2.mjs             # huérfanas siguen en 14
node scripts/check-assets.mjs          # las de galería NO deben aparecer como nuevas
```

Y a ojo, lo que ninguna puerta ve: que la foto **ilustre el párrafo que tiene al lado**, y que en
390 px la primera imagen caiga dentro del pliegue.

---

## 3 · Los 4 huérfanos, resueltos

El banco no tiene fotografía aprobada de permisos, piscina comercial, cocina exterior ni pérgola:
sus 74 aprobadas son piscina y spa residencial de South Florida. **Decisión de Sebastian: se tira de
las galerías que el sitio ya sirve.** Queda así:

| Artículo | Qué le falta al banco | De dónde sale | Por qué es honesto |
|---|---|---|---|
| `commercial-pool-construction-…` | piscina de hotel, resort, multifamiliar | `images/commercial-1…10` | 10 fotos reales, una por tipología, ya con `alt` escrito. Hoy solo las ve `/industry-solutions` |
| `residential-vs-commercial-…` | la mitad comercial | banco + `images/commercial-*` | la comparación necesita las dos, y ahora las tiene |
| `what-permits-are-required-…` | permisos, inspección, GFCI, barrera | `images/pool-construction-*` | obra residencial identificable. **No se inventa la foto de un permiso** |
| `outdoor-living-design-guide-…` · `how-outdoor-living-…-property-value` | cocina, pérgola, lanai, deck | `images/kitchen-*`, `pergolas-*`, `deck-*`, `projects/*`, `residentials/*` | es justo lo que esas galerías enseñan, y es obra del cliente |

**Lo que sigue estando prohibido, y no lo cambia esta decisión:**

- Poner una piscina residencial de South Florida en el artículo comercial porque «es una piscina».
- Usar cualquier activo `not_for_project_gallery_design_concept_only` del banco. Son IA, con
  manifiesto firmado, y 37 tienen nombre de fichero engañoso.
- Generar obra. Higgsfield sigue valiendo **solo** para pictogramas, diagramas y fondos abstractos
  —un esquema de las 5 inspecciones del artículo de permisos sería buena ilustración y no afirma
  obra—, y **lo pide el director, no el trabajador** (`00-PRINCIPIOS §3`).

---

## 4 · Orden de ejecución y coste

| | Trabajo | Puertas | Coste |
|---|---|---|---|
| **F0** | Casting sobre hoja de contactos (banco) y sobre las fichas que ya las pintan (galería). Tabla de asignación foto↔artículo↔posición, **sin tocar nada** | — | ~1 h, sin navegador |
| **F1** | 10 tarjetas: derivados, escalera recortada, `srcset` corregido, manifiesto, `DERIVADOS_A_PROPOSITO` | `tokens`, `assets`, `seo`, `texto`, `visual`(2 rutas) | ~33 ediciones de cadena |
| **F2** | 3 imágenes × 10 artículos + CSS. Banco → fichero nuevo; galería → referencia en su sitio | `tokens`, `texto`, `visual`(10 rutas), `ix2`, `assets` | ~30 `<figure>` |
| **F3** | Re-baseline **una sola vez**, coordinado con FONDO-AGUA | `aprobar-diseno.mjs` | solo Sebastian, árbol limpio |
| **F4** *(opcional)* | Pies de foto con `suggested_caption` del banco | `texto` con bloques declarados en `check-texto.mjs` | no se hace salvo que se pida |

`check:visual` completo NO se corre: son 115 rutas × 4 anchos, ~65 min con la pantalla secuestrada y
ya se quejó por escrito. **Se acota por ruta**, derivando las afectadas con el `grep` de §0.1.
**Nunca pasar `/` como filtro**: casa por `includes()` y se lleva las 115 creyendo que mide 4.

---

## 5 · Decisiones ya tomadas — no se rediscuten

| | | |
|---|---|---|
| **Los 4 huérfanos** | galerías del sitio, no generación ni foto forzada | Sebastian, 18-sep |
| **Nombres de fichero** | se conservan los actuales; no se renombra al `seo_filename` del banco | renombrar toca 90 rutas y rompe el rastro con el manifiesto |
| **Escalera de derivados** | se recorta (banco 2000, galería 1250) y se corrige el `srcset` | 23,5 MB para 10 tarjetas es el problema, no el detalle |
| **Pies de foto** | no, en F1/F2 | cuesta declarar bloques en `check:texto`; F4 opcional si se pide |
| **Galerías: referencia, no copia** | se apunta a su ruta actual | copiar duplica peso y abre la comprobación 7 sin ganar nada |
| **Los 7 autoenlaces** | se reportan, no se arreglan aquí | quitar texto mueve `check:texto`; es su propio encargo |

---

## 6 · La única decisión abierta

**D1 — el orden del re-baseline con `PROMPT-FONDO-AGUA`.** Ese encargo toca `.hero-project`, que son
las 10 rutas de `/blogs/`; este toca su cuerpo y sus tarjetas. **`/blogs/` no se re-baseliniza dos
veces.** O se cierra FONDO-AGUA primero, o se cierra este entero antes de tocarlo. Es del director,
y no bloquea F0-F2: solo F3.

---

## 7 · Lo que este encargo NO hace

- **No reescribe una palabra.** `check:texto` al 100 % es lo que permite tocar todo lo demás
  (`00-PRINCIPIOS §2`).
- **No rediseña la tarjeta ni el carrusel.** `blog.css` y `blog-indice.css` se quedan como están; si
  la nueva relación de aspecto pide un ajuste, se pide, no se hace.
- **No añade secciones.** Imagen dentro del cuerpo que ya existe, nada más.
- **No usa `subservices/` ni `procesos/`.** Iconos SVG los primeros; PNG de 1,5-2,2 MB los segundos.
- **No construye, no commitea, no despliega.** Son del director (`DIRECTOR.md:35`). Si el encargo lo
  autoriza, adelante; si no, se entrega el diff y se para.
- **No barre el sitio.** Nada de `ui-qa`, `carrusel-qa` ni `0.8.0:audit` por iniciativa propia. Una
  ruta se abre, se mira y se cierra.
