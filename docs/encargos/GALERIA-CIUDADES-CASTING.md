# Galería de obra de las 53 ciudades: casting, SEO y puertas

Encargo: «City Project Gallery Image Casting + SEO» (Sebastian, 4-oct-2026). Sección
`GaleriaObra.astro` («Custom Pool Project Gallery») de `/services/pool-builders/<city>-fl`.
Fuente de verdad: `src/data/galeria-obra-por-ruta.json → _defecto.fotos`. Puerta propia:
`npm run check:galeria-obra`.

**Decisión de Sebastian en esta sesión.** project-062 (banco viejo del cliente, IDs `ag-…`, sin
registro en `banco-imagenes.json`) entra como excepción documentada: máximo 3 fotos y solo
desde una lista blanca. Se usan las 3.

Sin commit, push, PR, deploy ni re-baseline.

---

## 0 · Cómo se hizo el casting y qué se encontró

1. **Índice.** `banco-imagenes.json` con `estado ∈ {aprobada, aprobada_con_recorte}`,
   `procedencia = obra_real` y `etapa = terminado` da 269 fotos. De piscina como protagonista
   solo hay 19 `construction` y 5 `remodeling`. Se suman las de servicios secundarios que enseñan
   piscina (pérgolas, cocinas, decks): 92 candidatas.
2. **Hojas de contactos** (`banco/hojas/*-terminado-*`) y hojas propias con el recorte simulado.
   Sirven para criba, no para aprobar.
3. **Apertura a tamaño completo** de unas 25 finalistas. Ahí cayeron siete que la hoja daba por
   buenas (ver descartes).
4. **Recorte REAL de la tarjeta, medido sobre el build** (Playwright, Gainesville):

   | Ancho | Tarjeta | Proporción |
   |---|---|---|
   | 390, móvil real (viewport + táctil) | 139 × 250 | **0,56 : 1 (vertical)**, dos por pantalla |
   | 440, móvil real | 164 × 250 | 0,66 : 1 |
   | 768 | 688 × 450 | 1,53 : 1 |
   | 991 | 440 × 450 | 0,98 : 1 |
   | 1440 | 384 × 350 | 1,10 : 1 |
   | 1920 | 352 × 350 | 1,01 : 1 |

   Mi primera lectura de `webflow.css` daba 2:1 y era falsa: alguna hoja del proyecto pisa el
   ancho del slide en táctil. Consecuencia: las verticales del banco (con `4:5`/`1:1` seguros)
   encajan solas, y las apaisadas pierden en móvil hasta dos tercios del ancho. Cada foto se
   revisó recortada a 0,56 y a 1,05 con su `object-position`. Así cayó bi-0633: el taburete del
   primer plano sale grande en todos los tamaños, porque la imagen ocupa todo el alto de la tarjeta
   y `pos` no puede sacarlo.
5. **No repetir foto en la misma página.** La puerta nueva compara cada foto del set (con sus
   copias de `publicada_como`) contra todo `<img>` del cuerpo de las 53. La primera pasada salió
   **roja con 159 fallos**: el panel de servicios (`products-section`, montado en las 53) ya pinta
   **bi-0662, bi-0521 y bi-0079** como `…-full.avif`, y bi-0662 es la foto de la pestaña abierta
   por defecto. Salieron del set.

### Hallazgos sobre el material (para el banco, no tocados aquí)

- **project-059 (banco viejo) = obra-046 (banco nuevo).** Es la misma casa: canastas, pasos de piedra
  y casa de dos plantas. `059-10` y `bi-0505` son casi la misma toma. Salen las 6 de project-059 y la
  casa entra una vez, desde el banco nuevo.
- **obra-063 y obra-100 son la misma propiedad**: misma valla horizontal oscura, macetas de
  Talavera, cuentas de vidrio azul, toldo azul y casa con zócalo de mosaico. La puerta las trata como
  una casa (`MISMA_CASA`). **Propuesta: fundir `obra-100` en `obra-063` en el índice.**
- **`usada_en` desfasado en bi-0486.** Lista las 53 ciudades, pero en el cuerpo de las ciudades no
  sale con ningún nombre: solo es su `og:image`. Y al revés, **bi-0662, bi-0521, bi-0079, bi-0307 y
  bi-0928** salen en las 53 (panel de servicios) y su `usada_en` no lo dice. No lo corrijo: no es de
  este encargo y el panel lo genera `ServiciosPorCategoria` con `clave="/"`.
- La galería anterior tenía casi duplicados (`062-14`≈`062-15`, `059-20`≈`059-21`) y repetía
  «Completed backyard pool with raised spa» como alt en 10 de sus 12 fotos.

---

## 1 · Tabla de casting

A wow · B intención piscina · C escala/valor · D acabado · E composición · F diferenciación ·
G recorte en la tarjeta real · H confianza. Umbrales del encargo: <28 fuera, 28–31 solo si cubre un
hueco único, 32+ fuerte, 36+ para los primeros puestos.

| # | Fuente | Proyecto | Servicio | A | B | C | D | E | F | G | H | /40 | Qué enseña | Por qué capta | Alt SEO | ¿Entra? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | bi-0947 | obra-090 | Pool | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | **37** | Piscina rectangular, sun shelf con tumbonas, spa elevado, travertino marfil | Obra nueva completa, sin defectos, vertical que encaja sola en el móvil | Rectangular pool with raised spa, sun shelf loungers and ivory travertine deck under a blue sky | Sí · 01 |
| 2 | ag-939d5f6462 (062-16) | project-062 | Pool + spa | 3 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | **36** | Spa elevado de mosaico claro, sun shelf, deck de piedra | Otra casa y otra paleta (blanca) | *propio, §4* | Sí · 02 |
| 3 | bi-1039 | obra-100 (=063) | Patio completo | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | **34** | Rebosadero de mosaico iridiscente, spa bajo pérgola, casa | Piscina + pérgola en una foto | Pool with iridescent blue glass tile and spillover edge, raised spa under a bronze pergola and artificial turf | Sí · 03 |
| 4 | bi-0505 | obra-046 | Pool | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | **32** | Casa, piscina, spa y pasos de piedra | Otra arquitectura (casa de dos plantas) | New pool with raised spa, travertine deck and stepping pads in artificial turf behind a two-story home. | Sí · 04 |
| 5 | ag-cd1064a0aa (062-18) | project-062 | Pool | 4 | 5 | 4 | 5 | 4 | 3 | 4 | 5 | **34** | Otro ángulo: sun shelf, spa al fondo, deck y césped | Misma casa que la 02, otra vista | *propio, §4* | Sí · 05 |
| 6 | bi-0519 | obra-048 | Remodelación | 3 | 4 | 4 | 3 | 4 | 3 | 3 | 5 | **29** | Remodelación terminada: cenefa de vidrio azul, travertino | Única remodelación terminada libre (hueco único) | Remodeled pool with blue glass waterline tile and ivory travertine deck behind a stucco house. | Sí · 06 |
| 7 | bi-0759 | obra-068 | Outdoor kitchen | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 4 | **31** | Cocina de piedra apilada bajo cubierta aislada, con la piscina al lado | Primer cross-sell, con piscina en cuadro (hueco único) | Black aluminum insulated patio cover over a stacked stone outdoor kitchen next to a pool. | Sí · 07 |
| 8 | bi-0485 | obra-045 | Pool | 4 | 4 | 4 | 5 | 4 | 4 | 5 | 5 | **35** | Spa elevado, mármol gris y franja de grava, finca al atardecer | Otra estética (rural, gris) | Raised tiled spa inside a new pool with gray marble deck and pebble band, open pasture behind at dusk. | Sí · 08 |
| 9 | bi-1046 | obra-100 (=063) | Pérgola | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 5 | **35** | Pérgola bronce sobre spa, canal y palmeras | Pérgola y spa: venta cruzada que sigue siendo agua | Dark bronze freestanding lattice pergola framing a blue-tiled spa with canal, boats and palms behind | Sí · 09 |
| 10 | ag-4dec9a66e4 (062-25) | project-062 | Pool | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 5 | **31** | Plano general desde el césped: piscina, spa, casa y palmas | Tercera vista de la casa 062; vuelve la piscina | *propio, §4* | Sí · 10 |
| 11 | bi-0914 | obra-083 | Pérgola / patio cover | 4 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | **33** | Cubierta exenta con celosía junto a piscina con pasos | La piscina ocupa media foto: cierra con agua | Freestanding dark aluminum patio cover with privacy screen on a pool deck with blue tile pool. | Sí · 11 |

### Descartes fuertes

| Fuente | Por qué no |
|---|---|
| bi-0662 (obra-063), 37 | El panel de servicios de las 53 ya la pinta, en la pestaña abierta por defecto |
| bi-0521 (obra-048), 32 | El panel de servicios ya la pinta (pestaña de remodelación) |
| bi-0079 (obra-012), 31 | El panel de servicios ya la pinta (pestaña de decks) |
| bi-0633 (obra-059), 37 → 30 | Taburete blanco grande en primer plano, visible en todos los recortes reales de la tarjeta |
| bi-0486 (obra-045) | La de más impacto del banco, pero con manguera enrollada en el deck y otra cruzándolo, y churros en los muebles |
| bi-1010, bi-0614, bi-0948, bi-0237, bi-0835, bi-0084 | Son los seis paneles de la banda «Project Gallery» de la misma página |
| bi-0661 (obra-063) | Caja de alarma de piscina grande en primer plano; casi la misma toma que bi-0662 |
| bi-0307 (obra-039) | Dosificador de cloro en mitad del agua; además ya sale en el panel de servicios |
| bi-0928 (obra-087) | Ya sale en el panel de servicios |
| bi-0504, bi-0508 (obra-046) | Dos canastas de baloncesto dominan el cuadro |
| bi-0501, bi-0487, bi-0596 | `aprobada_con_recorte` sin el recorte que pide la tarjeta |
| bi-0594 (obra-049) | Manguera cruzando el deck y sopladora |
| bi-0593 (obra-049) | Media foto de tierra y charcos |
| bi-0630 (obra-059) | Tumbona cortada; la piscina casi no se ve |
| bi-0078 (obra-012) | Persona visible junto a la cancela |
| bi-0168 (obra-027) | Cielo quemado |
| bi-0977 | Poste eléctrico y cables encima |
| bi-0077 (obra-012) | Encuadre roto por el marco de la ventana |
| bi-0935 (obra-087) | Canasta de piscina en mitad del agua |
| bi-0223 | Flotador de cisne gigante |
| bi-0615, bi-0969 | Perro y toldo cortado / caseta vieja y valla del vecino |
| 062-15, 062-14 | Casi duplicados de 062-16 |
| 062-03 | Caja gris en primer plano |
| 062-05 | Hojas sobre el deck, luz plana |
| 062-10, 062-22 | Repiten el ángulo de 062-18 |
| todo project-059 | Es la casa de obra-046, que entra desde el banco nuevo |

---

## 2 · Antes / después

**ANTES**: 12 fotos de 2 casas (project-062 ×6, project-059 ×6; project-059 es obra-046).
Servicios: piscina nueva y remodelación (project-059 venía etiquetada «pool-remodeling» en el
banco viejo; el nuevo la clasifica como piscina nueva). Casi duplicados: 062-14/062-15 y
059-20/059-21. 10 de los 12 alt eran idénticos.

**DESPUÉS**: 11 fotos de **8 casas** (9 `proyecto` del banco; obra-063 = obra-100).

- Pool Construction: 7 (incluye 1 de patio completo)
- Pool Remodeling: 1
- Pergola / Patio Cover: 2
- Outdoor Kitchen: 1
- Deck / Hardscape: 0

Piscina o remodelación como sujeto: 8 de 11 (73 %). Piscina visible en el cuadro: 11 de 11.

**Por qué 11 y no 16–18.** Las demás candidatas caen por una de tres razones: no aguantan la
apertura a tamaño completo, repiten una toma ya elegida o ya salen en la misma página. **Deck y
segunda remodelación quedan como huecos**: las dos remodelaciones terminadas buenas (bi-0521 y
bi-0614) ya están en la página, y no hay un deck con piscina sin defectos. El encargo pide calidad
antes que cantidad: el hueco se reporta, no se rellena.

---

## 3 · Orden final

| Pos | Fuente | Proyecto | Servicio | Alt | /40 | Por qué en ese puesto |
|---|---|---|---|---|---|---|
| 01 | bi-0947 | obra-090 | Pool | Rectangular pool with raised spa, sun shelf loungers and ivory travertine deck under a blue sky | 37 | Héroe: la que mejor vende obra nueva en la tarjeta del móvil (vaso, sun shelf, spa y deck), sin defectos y sin publicar en otra página |
| 02 | 062-16 | project-062 | Pool + spa | Rectangular pool with a raised spa clad in pale mosaic, sun shelf loungers and a wide stone deck beside a covered lanai. | 36 | Otra casa y otra paleta desde la segunda foto |
| 03 | bi-1039 | obra-100 | Patio completo | Pool with iridescent blue glass tile and spillover edge, raised spa under a bronze pergola and artificial turf | 34 | Otra arquitectura de vaso y el primer «también hacen el patio» |
| 04 | bi-0505 | obra-046 | Pool | New pool with raised spa, travertine deck and stepping pads in artificial turf behind a two-story home. | 32 | Otra casa, otra arquitectura |
| 05 | 062-18 | project-062 | Pool | Pool with sun shelf lounge chairs and a small raised spa, edged by a pale stone deck and lawn beside a two-story home. | 34 | Otro ángulo de la 02, a 3 puestos |
| 06 | bi-0519 | obra-048 | Remodelación | Remodeled pool with blue glass waterline tile and ivory travertine deck behind a stucco house. | 29 | La remodelación, cerrando las seis de piscina |
| 07 | bi-0759 | obra-068 | Outdoor kitchen | Black aluminum insulated patio cover over a stacked stone outdoor kitchen next to a pool. | 31 | Primer servicio secundario, con la piscina en cuadro |
| 08 | bi-0485 | obra-045 | Pool | Raised tiled spa inside a new pool with gray marble deck and pebble band, open pasture behind at dusk. | 35 | Vuelve la piscina, otra estética |
| 09 | bi-1046 | obra-100 | Pérgola | Dark bronze freestanding lattice pergola framing a blue-tiled spa with canal, boats and palms behind | 35 | Pérgola sobre spa; misma casa que la 03, a 6 puestos |
| 10 | 062-25 | project-062 | Pool | Wide view of a rectangular pool with sun shelf loungers and a raised spa on a pale stone deck, framed by lawn, palms and a covered lanai. | 31 | Plano general; misma casa que la 05, a 5 puestos |
| 11 | bi-0914 | obra-083 | Patio cover | Freestanding dark aluminum patio cover with privacy screen on a pool deck with blue tile pool. | 33 | Cierra con una piscina que ocupa media foto |

Nunca hay dos seguidas de la misma casa, y las seis primeras son de piscina.

---

## 4 · SEO por foto

| Pos | src | alt | Medidas | Procedencia | Asset | Proyecto | `pos` |
|---|---|---|---|---|---|---|---|
| 01 | `/images/banco/construction/pool-construction-spa-travertine-deck-sun-shelf-florida-01.webp` | Rectangular pool with raised spa, sun shelf loungers and ivory travertine deck under a blue sky | 1200×1600 | obra_real · aprobada · terminado | bi-0947 | obra-090 | 50% 65% |
| 02 | `/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-16.webp` | Rectangular pool with a raised spa clad in pale mosaic, sun shelf loungers and a wide stone deck beside a covered lanai. | 1600×1067 | banco viejo del cliente (excepción) | ag-939d5f6462 | project-062 | — |
| 03 | `/images/banco/construction/pool-construction-blue-glass-tile-spillover-pergola-florida-01.webp` | Pool with iridescent blue glass tile and spillover edge, raised spa under a bronze pergola and artificial turf | 1440×812 | obra_real · aprobada · terminado | bi-1039 | obra-100 | — |
| 04 | `/images/banco/construction/pool-construction-spa-turf-stepping-pads-house-florida-01.webp` | New pool with raised spa, travertine deck and stepping pads in artificial turf behind a two-story home. | 1600×1200 | obra_real · aprobada · terminado | bi-0505 | obra-046 | — |
| 05 | `/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-18.webp` | Pool with sun shelf lounge chairs and a small raised spa, edged by a pale stone deck and lawn beside a two-story home. | 1600×1067 | banco viejo del cliente (excepción) | ag-cd1064a0aa | project-062 | 45% 50% |
| 06 | `/images/banco/remodeling/pool-remodeling-travertine-deck-glass-tile-finished-florida-01.webp` | Remodeled pool with blue glass waterline tile and ivory travertine deck behind a stucco house. | 1600×1200 | obra_real · aprobada · terminado | bi-0519 | obra-048 | — |
| 07 | `/images/banco/pergolas/insulated-patio-cover-outdoor-kitchen-pool-florida-01.webp` | Black aluminum insulated patio cover over a stacked stone outdoor kitchen next to a pool. | 1440×1080 | obra_real · aprobada · terminado | bi-0759 | obra-068 | — |
| 08 | `/images/banco/construction/pool-construction-raised-spa-gray-marble-deck-florida-01.webp` | Raised tiled spa inside a new pool with gray marble deck and pebble band, open pasture behind at dusk. | 900×1600 | obra_real · aprobada · terminado | bi-0485 | obra-045 | — |
| 09 | `/images/banco/pergolas/freestanding-pergola-dark-bronze-pool-spa-canal-florida-02.webp` | Dark bronze freestanding lattice pergola framing a blue-tiled spa with canal, boats and palms behind | 1600×900 | obra_real · aprobada · terminado | bi-1046 | obra-100 | — |
| 10 | `/images/obra/project-062/mrandmrs-pool-spa-a2-gallery-project-062-25.webp` | Wide view of a rectangular pool with sun shelf loungers and a raised spa on a pale stone deck, framed by lawn, palms and a covered lanai. | 1600×1067 | banco viejo del cliente (excepción) | ag-4dec9a66e4 | project-062 | 40% 50% |
| 11 | `/images/banco/pergolas/freestanding-patio-cover-privacy-screen-poolside-florida-02.webp` | Freestanding dark aluminum patio cover with privacy screen on a pool deck with blue tile pool. | 1024×768 | obra_real · aprobada · terminado | bi-0914 | obra-083 | — |

- **Alt.** Las del banco van palabra por palabra (`alt` del índice; este banco no tiene
  `suggested_alt_gallery`). Las tres de project-062 llevan alt propio, escrito solo con rasgos que
  se ven y que figuran en los `_rasgo` del banco viejo (*covered lanai, pale mosaic spa cladding,
  sun loungers, wide stone deck*). Ningún alt nombra ciudad ni región; la puerta lo exige contra las
  53 ciudades, los 9 condados y «Florida».
- **src.** Los slugs del banco, sin copiar ni renombrar. Los de project-062 son los que ya estaban
  publicados (`…-a2-gallery-project-062-NN.webp`): poco descriptivos, pero renombrar un activo
  publicado cambia su URL y el encargo no lo pide.
- **Sin `title`** ni captions visibles (`check-texto` no se mueve).
- **ImageObject: no se añade.** `check-seo` admite un solo bloque JSON-LD propio por ruta
  (`BLOQUES_PROPIOS`, hoy el `FAQPage`); habría que reabrir ese contrato para un marcado sin
  beneficio claro (no hay ubicación ni autoría verificables, y Google indexa la `<img>` con su alt
  igual). Si algún día se hace, debe derivarse del mismo `_defecto.fotos`.
- **`usada_en`**: las 53 rutas de ciudad se añadieron por script (derivadas de
  `seo-pool-builders.json` + `rutaCiudad`) a los 8 `_banco` del set. La puerta exige las 53 en cada
  uno.

---

## 5 · Rutas

- **53/53 ciudades** pintan el set entero y en orden: primer slide
  `pool-construction-spa-travertine-deck-sun-shelf-florida-01.webp`, último
  `freestanding-patio-cover-privacy-screen-poolside-florida-02.webp`. **0 fallidas.**
- La guarda `CAP &&` se quitó de `[slug].astro`. Hoy no cambia nada (las 53 tienen entrada en
  `captacion-servicios.json`), pero la galería ya no depende de eso. `check-estructura-ciudades`
  declara el mismo punto lógico en la forma SIN captación (`trusted-section → gallery →
  _3d-section`) y deja de prohibir `.svc-galeria`.
- **Fuera de alcance y comprobado**: la ficha `/services/pool-builders` y los 9 condados no
  llevan la galería (10/10). *Propuesta, no ejecutada:* los condados son landings de captación
  local y podrían montarla; decide Sebastian.

---

## 6 · Rendimiento

| | Fotos | Peso de las fotos |
|---|---|---|
| ANTES | 12 | 3.350.718 B (3,2 MB) |
| DESPUÉS | 11 | 2.672.400 B (2,5 MB), **−20 %** |

Fotos de la galería pedidas en Gainesville (Playwright, `loading="lazy"`; el resto se pide al
deslizar):

| Ancho | Al cargar (arriba del todo) | Al llegar a la sección | Tras deslizar hasta el final |
|---|---|---|---|
| 390 móvil | 0 | 11 | 11 · 2.610 KB |
| 440 móvil | 5 · 1.164 KB | 10 | 11 |
| 768 | 4 · 986 KB | 4 | 11 |
| 991 | 6 · 1.459 KB | 6 | 11 |
| 1440 | 6 · 1.459 KB | 6 | 11 |
| 1920 | 8 · 1.832 KB | 8 | 11 |

La galería va justo debajo del formulario, dentro del margen en que Chrome adelanta las `lazy`,
así que en escritorio se piden de entrada las de la primera pantalla del carrusel (y alguna más). No
es un cambio de este encargo: el componente ya era `lazy`; se añade `decoding="async"`.

**CLS de la galería: 0,0000 a los 6 anchos.** El CLS total de la página (0,011–0,060) viene entero
del carrusel de logos del héroe (atribución de `layout-shift` por nodo).

**`srcset` (auditado, no implementado).** El banco solo tiene derivados de 1.600 px, y la tarjeta mide
139–440 px CSS. Medido en el scratchpad: los 11 a 800 px pesarían **766.568 B (−71 %)**. Hay
precedente: `build-imagenes-blog.mjs` ya genera `-p-800` de fotos del banco para el blog (50
ficheros). **Recomendación:** derivados de 800 px + `srcset/sizes` en `GaleriaObra`, sobre todo por
móvil. No lo hago aquí porque el encargo pide no crear pipeline sin decidirlo.

---

## 7 · Puertas (build `MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1 npm run build`, exit 0)

```
check:galeria-obra
── 1. el set de galeria-obra-por-ruta.json
  11 fotos · 8 casas · 3 del banco viejo · pool 5 · pool-spa 1 · patio-completo 1 · remodelacion 1 · cocina 1 · pergola 2
── 2. las 53 ciudades construidas (.vercel/output/static)
  53/53 ciudades con el set entero y en orden · primero pool-construction-spa-travertine-deck-sun-shelf-florida-01.webp · ultimo freestanding-patio-cover-privacy-screen-poolside-florida-02.webp
  10/10 rutas fuera de alcance (ficha + condados) sin la galeria
PUERTA VERDE — un set, las 53 ciudades, obra real trazada

check:estructura:ciudades
  53 con capa de captacion · 0 exactamente como estaban
PUERTA VERDE — dos formas y solo dos

check:tokens      … la capa pesa 94.0 KB de 94 KB — 0.0 KB libres … PUERTA VERDE
check:rutas       … 0 referencias a Webflow / Elfsight en lo desplegado — 0 en 0 ficheros … PUERTA VERDE
check:enlaces     … 1058/1058 ficheros de public/ pedidos por dist estan en git — 0 fuera de git … PUERTA VERDE
check:redirects   … rutas construidas en minuscula, sin %20 ni // ni espacios … PUERTA VERDE
check:captacion   … PUERTA VERDE
PUBLIC_ES_PRODUCCION=1 check:seo   … un solo host: canonicas [www.mrandmrsoutdoorliving.com] = sitemap [...] … PUERTA VERDE
node scripts/build-banco.mjs --check   ✅ banco: 1269 entradas, 515 aprobadas con fichero, sin metadatos

check:galeria -- /services/pool-builders/gainesville-fl
  ok   las 22 anclas medidas tienen nombre accesible — 0 paginas con anclas mudas
  ok   el lightbox abre como modal · abrirlo NO mueve la pagina · 0 controles por debajo de 44x44
  ok   las flechas pasan de imagen · Escape cierra · tocar el velo cierra · al cerrar, el foco vuelve al ancla
PUERTA VERDE

check:carrusel -- gainesville-fl
 · fs-slider-gallery (11 tarjetas, paso 368.0px)
OK  check:carrusel — mecanica, teclado, tactil y reduced-motion correctos

check-texto (xvfb-run) /services/pool-builders/{gainesville,ocala,davie,reddick,wellington}-fl
  1 identicas · 0 en rojo   (1/1 rutas medidas)   ×5 → PUERTA VERDE ×5
```

QA propio en Gainesville a 390/440/768/991/1440/1920 (Playwright, scratchpad, con
`prefers-reduced-motion` para apagar el autoplay): next, previous, next hasta el final, Home, End,
abrir el lightbox en la foto 1 («1 / 11»), flecha a la foto 2, Escape con devolución del foco y cierre
por el velo. **54/54 ok.** El swipe táctil y el arrastre de la barra los mide `check:carrusel`.

**Prueba de que la puerta nueva falla cerrada** (mutaciones temporales, restauradas con `cmp`): el set
anterior da 672 rojos; una ciudad en el alt, dos seguidas de la misma casa, abrir con la cocina, un
recorte no permitido, `usada_en` sin las 53, un `_asset` fuera de lista blanca, un array copiado por
ciudad, Reddick con un slide menos y Reddick sin galería: **todas rojas**.

**Puertas que no salieron verdes (y no son de este cambio):**

- `check:assets` → exit 1 con **salida idéntica en el árbol base** (`git stash`): falta el symlink
  gitignorado `_source/sanity-masters` en este contenedor (`ENOENT …/_source/sanity-masters/…`). **No
  corrió completa: no es verde.**
- `check-visual '=/services/pool-builders/gainesville-fl'` → 4 rojos de alto (1920 −186 px, 1440
  −186, 991 −138, 479 −110). **Los mismos 4 rojos con los mismos deltas en el build base**, y la altura
  de página y de galería medida es idéntica al píxel en base y con el cambio (1440: 11.570 px de página,
  548 px de galería). La línea base es anterior a cambios ya fusionados. Re-baselinizar es del director.

Entorno: hizo falta `npm ci` (no había `node_modules`), `PLAYWRIGHT_BROWSERS_PATH` del scratchpad
enlazando el Chromium preinstalado (el Playwright del proyecto espera otra revisión) y `xvfb-run` para
`check-texto` (lanza con ventana). Ningún script del repo se tocó para eso.

---

## 8 · Riesgos y datos no verificados

- **project-062** no tiene registro en `banco-imagenes.json`: su procedencia de obra real descansa en
  el banco viejo del cliente (`08_ai_index`), que no está en este repo. Excepción decidida por
  Sebastian; la puerta solo admite los 3 `ag-…` de la lista blanca.
- **Ubicación de ninguna obra verificada** (`region: desconocida`): por eso ningún alt la nombra.
- **Las verticales `aprobada`** (bi-0947, bi-0485) se recortan en la tarjeta; su `recortes_seguros`
  (4:5, 1:1) es justo lo que pide la tarjeta real. Las apaisadas se revisaron recortadas a 0,56 y a
  1,05; la remodelación (bi-0519) deja ver en móvil el televisor envuelto en plástico de la fachada
  (defecto del banco, pequeño) y es la única remodelación libre.
- **Hueco de deck y de segunda remodelación**: hace falta material nuevo, no otra selección. Lo que
  más rendiría es **repetir limpia la aérea de obra-045** (bi-0486, sin mangueras ni flotadores).
- **`usada_en` desfasado** en otras fotos (§0): no corregido, fuera de alcance.
- Observación fuera de alcance: la primera foto de `trusted-section`
  (`/images/site/custom-pool-construction-florida-1custom-pool-construction-florida.avif`) tiene aspecto
  de fotografía profesional de arquitectura y no está en el banco. Conviene confirmar que es obra propia.
