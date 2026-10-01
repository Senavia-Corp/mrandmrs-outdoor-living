# PROMPT-BANCO-IMAGENES · clasificar las fotos y dejar un banco que la IA pueda consumir

Encargo de Sebastian, 1-oct-2026. Se pega entero en una sesión nueva sobre
`~/Sites/mrandmrs-outdoor-living`. Si algo de lo que sigue no cuadra con lo que ves en disco,
**gana lo que ves** y lo dices; no lo arregles en silencio.

```
ORIGEN = /Users/senavia/Documents/Pictures Mr and Mrs Outdoor Living
```

Si `ORIGEN` no existe o está vacía, para y dilo. No busques otra carpeta «parecida».
La ruta lleva espacios: entre comillas siempre.

### Lo que ya se sabe de `ORIGEN` (medido el 1-oct-2026, no lo vuelvas a investigar)

16 GB · **1.267 imágenes** (765 jpg, 366 jpeg, 54 heic, 44 png, 33 webp, 3 tif, 1 arw/avif/gif/jfif)
· 221 vídeos (mov/mp4) · 52 PDF. **Vídeos y PDF quedan fuera**: no se indexan ni se copian.

| Carpeta | Ficheros | Pista de servicio — **pista, no veredicto** |
|---|---|---|
| `NEW JOBS CONSTRUCTION/` (10 subcarpetas, una por obra) | 478 · 9,8 GB | `construction` y lo que salga; aquí está la obra real |
| `CONSTRUCTION PICTURES/` | 22 | `construction`, etapa `construccion` |
| `POOL ADD ON/` · `POOL EQUIPMENT/` | 1 · 2 | `construction` / `remodeling` |
| `PERGOLA/` (25 subcarpetas por modelo) · `PERGOLA PRIVACY WALL/` · `PERGOLA - KITCHEN/` | 198 · 10 · 30 | `pergolas` (+ `kitchens`) |
| `EQUINOX LOUVERED ROOF/` · `LOUVERED ROOF OUTDOOR ELEMENT/` | 109 · 161 | `louvered` |
| `OUTDOOR KICTCHEN/` · `KITCHEN FINISH/` | 115 · 8 | `kitchens` |
| `DECKING/` (Concrete, Pavers, Brick Pavers, TURF) | 138 | `decks` (turf → `landscaping`) |
| `LANDSCAPING/` | 36 | `landscaping` |
| `IRRIGREEN/` | 63 | `irrigation` |
| `OUTDOOR LIGHTS/` | 49 | `lighting` |
| `POLE BARN/` · `POLE BARN 2/` | 61 · 61 | `pole` |

Cuatro cosas que cambian cómo se trabaja esta carpeta:

1. **`POLE BARN 2/` es copia de `POLE BARN/`** (mismos 61 nombres), y hay **136 hashes repetidos**
   en total. Deduplica por `sha256` antes de abrir una sola foto.
2. **Buena parte NO es obra de la empresa: es material de fabricante y de internet.** Señales ya
   vistas: `belgard-pool-pavers.jpg`, `pool-and-patio-pavers-installation-7.jpg`, carpetas
   `Brochures`/`BROCHURES`, `Pro Select Member Assets`, `Certified Badges`, modelos de catálogo
   (`Renaissance`, `Equinox`, `Moderna`), nombres tipo `1179…_n.jpg` (descarga de Facebook).
   Eso es `procedencia: stock` o `no_es_del_cliente` y **no se aprueba como obra**. Que la
   empresa instale ese producto no hace suya la foto del fabricante. Las fotos de móvil
   (`IMG_…`, `633…__UUID.jpeg`, HEIC con EXIF de cámara) son las candidatas a `obra_real`.
3. **Las subcarpetas de `NEW JOBS CONSTRUCTION/` llevan el apellido del cliente** (`Greenberg`,
   `Darr Pool`, `Brannen`…). Cada una es un `proyecto`. **El apellido no sale jamás** en el slug,
   el `alt`, la `descripcion` ni los `tags`; solo queda dentro de `origen`. `Fort Lauderdale Pool`
   sí prueba región (`south_fl`) para esa obra — en el índice, no en la URL.
4. **Faltan carpetas para** `remodeling`, `enclosures`, `rooms`, `screens` y `furniture`. Puede
   haber fotos de esos servicios dentro de otras carpetas (una jaula al fondo de una piscina);
   si no las hay, la celda queda en cero y se reporta. No se rellena.

HEIC y TIF los lee `sharp`; si el `.arw` o algún HEIC no abre, se anota como `rechazada` con
motivo `formato_no_legible` — no se instala nada para rescatar un fichero.

---

## 1 · Qué se quiere

Un **banco de imágenes dentro del repo** con el que cualquier sesión futura, sin abrir una sola
foto, pueda responder: *«dame una foto real, terminada, de pérgola, en horizontal, que no esté
ya en esa página»* — y recibir una URL que funciona y un `alt` listo.

Cada foto de `ORIGEN` sale clasificada por tres ejes:

| Eje | Valores |
|---|---|
| **etapa** | `terminado` (proyecto final) · `construccion` (obra en curso) · `antes` (estado previo de una remodelación) |
| **servicio** (uno o varios) | `construction` `remodeling` `pergolas` `louvered` `rooms` `enclosures` `screens` `kitchens` `decks` `landscaping` `irrigation` `lighting` `furniture` `pole` |
| **proyecto** | `obra-001`, `obra-002`… — todas las fotos de la misma propiedad comparten id |

Los ids de servicio son los de `src/data/servicios-categoria.json`; no inventes otros. Una foto
de piscina con pérgola al fondo es `["construction","pergolas"]`, con el protagonista primero.

Para `construccion` en piscina, anota además `fase_obra`: `excavacion` `acero` `gunite`
`fontaneria` `azulejo` `deck` `acabado` `equipos`. Es lo que más falta hace: las secciones de
proceso de las fichas hoy no tienen ni una foto real (`INFORME-IMAGENES-21-SEP.md` §4.3).

## 2 · Qué NO entra

- **No se cambia ninguna foto del sitio.** Este encargo crea el banco; usarlo es otro encargo.
- **No se renombra ni se mueve nada de lo ya publicado** en `public/images/` — esas URLs están
  indexadas. Lo ya publicado solo se *anota* (§6).
- Ni `npm run build`, ni commit, ni deploy: son del director (`CLAUDE.md` §3). Entregas el diff.
- Ni `ui-qa`, ni barridas, ni abrir el preview. Aquí no hay página que mirar.
- Los originales de `ORIGEN` no se tocan, no se borran y **no entran en git**.

## 3 · Dónde vive el banco

```
public/images/banco/<servicio>/<slug>.webp   ← el fichero servido; su ruta ES la URL
src/data/banco-imagenes.json                 ← el índice; lo único que lee la IA
banco/hojas/<servicio>-<etapa>-NN.jpg        ← hojas de contactos (fuera de public/)
scripts/build-banco.mjs                      ← deriva, escribe el índice, y con --check lo valida
BANCO-IMAGENES.md                            ← cómo se consulta, 30 líneas, no más
```

Solo se deriva a `public/` lo **aprobado**. Lo rechazado queda en el índice con su motivo y sin
fichero: el repo ya pesa 1 GB y `public/images` 341 MB.

Derivado único: **WebP, 1600 px de lado largo, q80**, con `sharp` (ya está en `package.json`).
Sin variantes por uso hasta que un encargo las pida. `sharp` re-codifica desde píxeles y no
copia EXIF: compruébalo en tres ficheros (`metadata().exif` vacío) y anótalo — ahí van el GPS
de la casa del cliente y el número de serie del móvil.

Añade al final una línea en `CLAUDE.md` apuntando a `BANCO-IMAGENES.md`. Sin eso el banco existe
pero ninguna sesión sabrá que está.

## 4 · La URL — reglas del nombre

```
/images/banco/<servicio>/<keyword-servicio>-<sujeto>-<rasgo>-<vista>-florida-NN.webp
/images/banco/pergolas/aluminum-pergola-pool-deck-travertine-aerial-florida-03.webp
/images/banco/construction/pool-construction-gunite-shell-ground-florida-01.webp
```

1. Inglés (el sitio es en inglés), minúsculas, ASCII, guiones. Máximo 70 caracteres.
2. **Describe lo que se ve**, no lo que convendría que se viera. Si no hay spa, no pone `spa`.
3. Nunca `IMG_`, `DSC`, `WhatsApp`, fechas, hashes ni el id de proyecto.
4. **Nunca `north`, `south` ni una ciudad.** El nombre afirma un sitio y la marca vende las dos
   regiones (criterio de R21-CIUDADES y de `src/data/galeria-pagina.json`). La región, si se
   sabe de verdad, va en el índice, no en la URL.
5. El slug es único en todo el banco y **no se cambia nunca** una vez escrito: es una URL.
6. La carpeta es la del servicio protagonista. `etapa` no va en la ruta — va en el nombre solo
   cuando lo describe (`gunite-shell`, `before-remodel`).

## 5 · El índice — `src/data/banco-imagenes.json`

Un array plano, una entrada por foto de `ORIGEN` (aprobada o no):

```json
{
  "id": "bi-0042",
  "src": "/images/banco/pergolas/aluminum-pergola-pool-deck-travertine-aerial-florida-03.webp",
  "estado": "aprobada",
  "etapa": "terminado",
  "servicios": ["pergolas", "construction"],
  "fase_obra": null,
  "proyecto": "obra-007",
  "region": "desconocida",
  "procedencia": "obra_real",
  "vista": "aerea",
  "orientacion": "horizontal",
  "ancho": 1600, "alto": 1067,
  "alt": "Aluminum pergola over a travertine pool deck, aerial view of a Florida backyard",
  "descripcion": "Pérgola de aluminio blanca de 4 postes sobre deck de travertino; piscina rectangular a la derecha; luz de tarde.",
  "tags": ["pergola", "travertine", "pool deck", "aerial"],
  "espacio_texto": "izquierda",
  "recortes_seguros": ["16:9", "3:2", "1:1"],
  "defectos": [],
  "usada_en": [],
  "origen": "Pergolas/2026-03/IMG_4471.HEIC",
  "sha256": "…"
}
```

- `estado`: `aprobada` · `aprobada_con_recorte` (sirve solo en los `recortes_seguros`) ·
  `rechazada` · `dudosa` · `duplicado` (con `duplicado_de`).
- `vista`: `aerea` · `suelo` · `detalle`. `espacio_texto`: `izquierda` · `derecha` · `arriba` · `ninguno`.
- `alt`: inglés, una frase, lo que se ve, ≤ 125 caracteres, sin «image of» y sin keywords apiladas.
- `descripcion`: español, para que la IA elija sin abrir el fichero. Di lo que distingue esta
  foto de sus vecinas, no «piscina bonita».
- `region`: `north_fl` / `south_fl` **solo si lo prueba la carpeta de origen, el GPS del original
  o Sebastian**. Si no, `desconocida`. No se deduce por las palmeras.
- `usada_en`: rutas donde esa foto ya sale. Vacío al crear; lo mantiene quien la use.

## 6 · Lo ya publicado

`public/images/` tiene ~1.500 ficheros repartidos en `site/`, `images/`, `projects/`,
`residentials/`, `procesos/`, `obra/`… **No los metas en el banco.** Solo:

1. Calcula el `sha256` de las fotos de contenido ya publicadas (no logos, svg ni `-p-500`/`-p-800`).
2. Si una foto de `ORIGEN` casa por hash con una publicada, su entrada lleva `src` = la URL que
   ya existe, no se deriva otra vez, y `usada_en` se rellena con un `grep` de esa ruta en
   `src/data/` y, si existe, en `.vercel/output/static` (no construyas para tenerlo; si no está,
   di que `usada_en` salió solo de `src/data/`).

## 7 · El método, en este orden

1. **Inventario antes de mirar nada.** Cuenta ficheros por carpeta y extensión, dimensiones,
   `sha256`. Los duplicados exactos caen aquí. Dime el total antes de seguir: si pasan de ~300,
   reparte la clasificación por carpeta en subagentes — pero **el índice lo escribe uno solo**.
2. **Procedencia, con prueba y no con ojo.** Busca en los bytes `c2pa` y
   `trainedAlgorithmicMedia` (`grep -a`; no hay `exiftool` instalado), mira si hay EXIF de
   cámara, y desconfía de 1408×768 y demás relaciones que ningún sensor da. Valores:
   `obra_real` · `generada_ia` · `stock` · `no_es_del_cliente` · `dudosa`. Ya hubo nueve
   imágenes de IA publicadas como obra (`INFORME-IMAGENES-21-SEP.md` §1). **Una `generada_ia`
   nunca queda `aprobada` con etapa `terminado` ni `construccion`.** Ausencia de C2PA no limpia:
   un re-encode lo borra.
3. **Agrupa por propiedad** (`proyecto`): misma casa, mismo vaso, misma tanda de fechas. Las
   ráfagas casi idénticas → te quedas la mejor, el resto `duplicado`.
4. **Hoja de contactos para descartar**: 4 columnas, no 6 — a 6 columnas las fotos mienten
   sobre lo que enseñan. Aquí cae lo obvio: movida, encuadre muerto, sujeto irreconocible.
5. **Abre el fichero a tamaño real antes de aprobar.** Bordes, césped, fondo del vaso, cielo.
   La hoja sirve para decir que no, nunca para decir que sí. **El nombre del fichero y el de la
   carpeta no prueban nada**: clasificas por lo que hay en el cuadro.
6. **Defectos, graduados** — el peritaje anterior rechazó 39 de 42 por poner cualquier desorden
   como bloqueante, y hubo que desandarlo:
   - **Bloqueante** → `rechazada`: caras reconocibles, matrículas, número de portal, casa del
     vecino identificable, sujeto ilegible, desenfoque, foto que no es de obra de la empresa.
   - **Arreglable recortando** → `aprobada_con_recorte`: manguera, cubo, robot limpiafondos o
     bolsa en un borde. Anota en `recortes_seguros` solo los recortes que lo dejan fuera.
   - En `construccion` el desorden de obra **es el sujeto**, no un defecto. Lo que bloquea ahí
     es que no se entienda qué fase es, o que salga un operario reconocible.
7. **Nombra, deriva, escribe la entrada.** En ese orden; el slug sale de lo que viste al abrirla.

## 8 · La puerta

`node scripts/build-banco.mjs --check` falla si:

- una entrada `aprobada*` no tiene fichero en disco, o hay un fichero en `public/images/banco/`
  sin entrada;
- hay un `src` o un `id` repetido, o un slug que rompe §4 (mayúsculas, `north`, `south`, `img_`…);
- falta `alt`, `etapa`, `servicios` o `procedencia`, o un servicio no está en la lista de §1;
- una `generada_ia` / `stock` / `no_es_del_cliente` está `aprobada` como obra;
- un derivado conserva EXIF.

Pruébala en rojo una vez (rompe una entrada a mano, mira que salta, deshazlo) y dilo. Corre
también `npm run check:assets`: los ficheros nuevos no están en `_source/assets-manifest.json`
y hay que saber si eso la enciende. Si una puerta no corrió, se dice; no cuenta como verde.

## 9 · Lo que entregas

1. El diff (ficheros de §3), sin commitear.
2. Una tabla **servicio × etapa** con el número de aprobadas en cada celda. **Los ceros son el
   resultado más útil del encargo**: dicen qué sesión de fotos hay que pedirle al cliente.
3. Recuento por `procedencia` y por `estado`, y los motivos de rechazo agrupados.
4. La lista de `dudosa` con la pregunta concreta para Sebastian en cada una (¿es obra vuestra?,
   ¿qué ciudad?). No las resuelvas adivinando.
5. Una línea en `MIGRACION-LOG.md`.

## 10 · Cómo se consultará después (va en `BANCO-IMAGENES.md`)

```bash
# terminadas de pérgola, horizontales, sin usar todavía
jq '.[] | select(.estado|startswith("aprobada"))
        | select(.etapa=="terminado" and (.servicios|index("pergolas")) and .orientacion=="horizontal" and (.usada_en|length)==0)
        | {src, alt, proyecto, vista, recortes_seguros}' src/data/banco-imagenes.json
```

Y tres reglas para quien consuma: se elige **por el índice y luego por la hoja de contactos**,
nunca escaneando carpetas; al usar una foto se añade la ruta a su `usada_en`; y si el índice no
tiene la foto que el hueco necesita, el hueco se queda como está y se reporta.
