# Bitácora de migración — Mr & Mrs Outdoor Living

Webflow → Astro 5 + Sanity + Vercel. Una entrada por fase, **escrita al cerrar la fase**,
nunca al empezarla. Si una fase se reabre, se añade una entrada nueva; no se edita la vieja.

## Regla de la bitácora

Una entrada vale si un ingeniero que no estuvo aquí puede, solo con ella:
reproducir el resultado, saber qué se midió y con qué comando, y ver qué quedó abierto.
**Un número sin el comando que lo produjo no es un número, es una opinión.**

## Estado

| Fase | Título | Estado | Cerrada |
|---|---|---|---|
| F0 | Cuentas, identidades y repo | ✅ cerrada | 2026-08-27 |
| F1 | Baseline congelado | ⬜ pendiente | |
| F2 | Assets locales | ✅ cerrada | 2026-08-27 |
| F3 | Sanity: esquemas + import | ✅ cerrada | 2026-08-27 |
| F4 | Cascarón Astro | ⬜ pendiente | |
| F5 | Páginas estáticas | ⬜ pendiente | |
| F6 | Páginas de colección | ⬜ pendiente | |
| F7 | Animaciones e interacciones | ⬜ pendiente | |
| F8 | Formularios y terceros | ⬜ pendiente | |
| F9 | Paridad SEO | ⬜ pendiente | |
| F10 | Puertas de verificación | ⬜ pendiente | |
| F11 | Deploy y corte de dominio | ⬜ pendiente | |

Estados: ⬜ pendiente · 🟡 en curso · ✅ cerrada · 🔴 bloqueada · ↩️ reabierta

---

## Plantilla de entrada (copiar tal cual)

```markdown
## Fase N — <título>            <!-- 🟡 en curso | ✅ cerrada | 🔴 bloqueada -->
**Fecha:** YYYY-MM-DD · **Commit:** `<sha>`

### Objetivo
Una línea. Qué tenía que quedar cierto al terminar.

### Qué se hizo
Viñetas cortas. Ficheros creados/tocados con ruta.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
|  |  |  |

### Evidencia
El comando y su salida REAL pegada. No parafrasear.
```bash
$ <comando>
<salida>
```

### Gate
**Criterio:** <la condición exacta que tenía que cumplirse>
**Resultado:** ✅ verde / 🔴 rojo — <por qué>

### Desviaciones
Qué se hizo distinto del plan y por qué. «Ninguna» es una respuesta válida.

### Rarezas del original replicadas a propósito
Lo que parece un error y NO se corrigió, porque el sitio de origen lo tiene así.

### Abierto
Lo que queda pendiente y de quién depende. «Nada» es una respuesta válida.
```

---

## Mejoras candidatas NO aplicadas

Todo lo que se detecte y se decida no tocar, porque la migración es a paridad.
Esta lista es el insumo de la conversación posterior con el cliente.

| # | Página / componente | Qué se ve | Por qué no se tocó |
|---|---|---|---|
| 1 | Galerías de `projects`, portadas de `brochures`, `logos`, pasos de `procesos` | **127 imágenes de contenido con `alt` vacío**. Verificado contra el sitio vivo: sirve `alt=""` en 37 de 45 `<img>` de una ficha de proyecto. | El origen no los tiene. Redactarlos es escribir contenido nuevo, no migrar. El manifiesto ya tiene el hueco marcado: es una pasada de una tarde cuando el cliente lo apruebe. |
| 2 | `commercials.csv` | Las cabeceras `Img Feature 2 / 3` y `SEO Metadata Image Feature 3 / 2` están **cruzadas** en el export. | Se emparejó por nombre (2→2, 3→3). Las páginas de `commercials` dan 404 en el sitio real, así que no se ve. Anotado por si algún día se publican. |
| 3 | `industry-solutions.html` | La URL del logo repite el id de sitio (`/68f185…/68f185…/`) y da **403**. | Es un defecto del HTML de Webflow. Se normaliza al descargar; la ruta simple da 200 y su sha256 coincide con el logo local. |
| 4 | export de Webflow | 6 ficheros con extensión `.avif` cuyo contenido es **WebP**. | Defecto del exportador. Se renombran a su formato real; servirlos como AVIF rompería la subida a Sanity. |

---

## Entradas

<!-- a partir de aquí, una entrada por fase, la más reciente arriba -->

## Fase 2 — Assets locales   ✅ cerrada
**Fecha:** 2026-08-27 · **Commits:** `F2: 657 assets descargados…` + `F2: saca sanity-masters de git…`

### Objetivo
Que las 657 URLs del CDN de Webflow y los 174 ficheros del export estén en disco, con nombre
SEO, clasificados por colección, en formato que Sanity acepte, y que el manifiesto sea
determinista.

### Qué se hizo
- `scripts/download-assets.mjs` — descarga con concurrencia 8, 3 reintentos, reanudable por
  sha256, escribe encima (nunca `rm -rf` sobre el destino), deduplica por contenido y genera
  el máster JPEG de cada AVIF.
- `scripts/check-assets.mjs` — la puerta, 9 comprobaciones.
- `scripts/build-inventory.mjs` — parcheado 4 veces (ver defectos).
- `.gitignore` — reescrito con el acoplamiento git↔despliegue documentado.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Referencias procesadas | 657 remotas + 174 locales | **831** |
| Ficheros en disco tras deduplicar | — | **793** |
| Fallos de descarga | 0 | **0** |
| AVIF con máster JPEG para Sanity | todos | **213 / 213** |
| Imágenes sin dimensiones | 0 | **0** |
| Colisiones de nombre sin resolver | 0 | **0** |
| Referencias al CDN de Webflow que quedan | 0 | **0** |
| Manifiesto determinista (2 pasadas) | idéntico | **idéntico byte a byte** |
| Repo versionado | — | **77 MB / 213 ficheros** (950 MB en disco) |

### Evidencia
```
$ node scripts/check-assets.mjs
── 1. todo lo referenciado existe en disco          ✅ 0 ausentes
── 2. cada fichero ES lo que su extensión dice      ✅ 0 vacíos · 0 cabeceras que no casan
── 3. el sha256 del manifiesto casa con el disco    ✅ 0 desfases
── 4. dimensiones para cada imagen                  ✅ 0 sin dimensiones
── 5. Sanity: AVIF con máster JPEG                  ✅ 213 AVIF, 0 sin máster · 0 másters inválidos
── 6. nombres sin basura de Webflow                 ✅ 0 con hash, %-escape o espacio
── 7. colisiones mismo destino/contenido distinto   ✅ 0
── 8. cobertura del inventario                      ✅ 657/657
── 9. acoplamiento git ↔ despliegue                 ✅ 216 de cromo, 0 fuera de git
✅ PUERTA VERDE

$ cp _source/assets-manifest.json /tmp/m2.json && node scripts/download-assets.mjs && diff /tmp/m2.json _source/assets-manifest.json
✅ determinista

$ git rm --cached -q public/images/site/logo-mr-mr.svg && node scripts/check-assets.mjs
── 9. …  🔴 216 assets de cromo, todos versionados — 2 fuera de git
🔴 PUERTA ROJA — 1 fallo(s)
```

### Gate
**Criterio:** 0 fallos de descarga · 0 referencias al CDN · manifiesto determinista ·
la puerta demostrada en rojo al menos una vez.
**Resultado:** ✅ verde. El check 9 se probó en los dos sentidos (rojo al desversionar el logo,
verde al devolverlo). Los checks 2 y 6 estuvieron en rojo de verdad y destaparon defectos reales.

### Defectos encontrados y corregidos
1. **`%2520` — doble codificación.** 15 SVG y 3 WebP daban **403**. El fichero en el CDN se
   llama literalmente `Artboard%209.svg`, así que su URL correcta lleva `%2520`. Mi propio
   `decodeURI` la convertía en `%209` y la rompía. **Regla: la URL se usa CRUDA para descargar;
   solo se decodifica para calcular el nombre legible.** Ya era una trampa conocida de Pergola Plus.
2. **`%2F` — barra codificada.** 3 pósters de vídeo traían la barra como `%2F`, así que
   `url.split('/').pop()` se llevaba el id de sitio y el hash dentro del nombre. Se decodifica
   antes de partir la ruta.
3. **6 WebP con extensión `.avif`** en el export de Webflow. La extensión ahora sale de los
   **bytes**, no del nombre. Sin esto, Sanity los rechaza y la conversión avif→jpeg se aplica
   a algo que no es AVIF.
4. **URL con el id de sitio duplicado** en `industry-solutions.html` → 403. Se normaliza.
5. **El mapa de `alt` estaba escrito a mano** y se dejaba fuera `Imagen Intro N`,
   `Image Animation N`, `Before/After Image` e `Img Feature N`: **31 alts perdidos en silencio**.
   Ahora se empareja por nombre. Además se extrae el `alt` del `<img>` para los assets de cromo.
6. **`.gitignore` con comentario al final de la línea.** Git trata la línea entera como patrón,
   así que `_source/sanity-masters/   # derivable…` no casaba con nada y **82 MB de másters se
   colaron al commit**. Solo se vio midiendo el repo. Hay una comprobación en el propio fichero.

### Rarezas del original replicadas a propósito
- **127 imágenes de contenido con `alt` vacío.** El sitio vivo sirve `alt=""` (37 de 45 en una
  ficha de proyecto). No se redactan: sería contenido nuevo. Anotado como mejora candidata.
- Los 2 ficheros de `MISSING.txt` (`checked-thumb`, `unchecked-thumb`) **no los referencia
  ninguna página ni el CSS**. No se recuperan.
- Los 3 vídeos originales (70 MB) no los pide ninguna página: solo se usan las variantes
  `_mp4`/`_webm`. Se quedan en disco pero fuera de git, con lista blanca.

### Abierto
- **El acoplamiento `.gitignore` ↔ Fase 3.** Las carpetas de colección y `public/brochures/`
  están fuera de git porque su destino es Sanity. **Si la Fase 6 acaba pidiendo alguna por ruta
  local, hay que versionarla.** `check:git` de la Fase 10 tiene que barrer `dist/` y exigirlo
  contra `git ls-files`, nunca contra el disco.
- Los 213 másters JPEG son la entrada de la Fase 3; no van a git (derivables).

## Fase 0 — Cuentas y repo   ✅ cerrada
**Fecha:** 2026-08-27

### Qué se verificó
| Servicio | `--account` | Resuelve a |
|---|---|---|
| Sanity | `sanity_raker-uranic` | proyecto **`m273z6jc`**, org `oa0t37sqx`, dataset `production` **público y vacío** |
| Vercel | `vercel_goral-format` | equipo **Senavia Corp** `team_S7aSWbSFopAYosvDC7LIdMUS` |
| Cloudflare | `cloudflare_blab-squad` | cuenta del cliente, **0 zonas** |

### Hallazgo: el dominio no está en Cloudflare
`mrandmrsoutdoorliving.com` usa NS de **GoDaddy** (`ns75/ns76.domaincontrol.com`). El
`server: cloudflare` que devuelve hoy es **el Cloudflare de Webflow**. Las 3 herramientas de
Cloudflare de Composio son de ámbito zona → inservibles hoy.
**Decisión de Sebastian:** solo Turnstile, el DNS se queda en GoDaddy.

### Permisos del robot de Sanity, medidos
`Claude_Code` (`pKuCLTBHB`), token `siq7a1w8exeC0K`, roles **developer + contributor + editor**.
- ✅ **Escribe documentos** vía `composio proxy` (probado con un canario, creado y borrado;
  dataset de vuelta a `count(*) = 0`).
- 🔴 **NO puede subir binarios.** El proxy de Composio corrompe el cuerpo binario: un SVG (texto)
  sube bien, pero WebP y JPEG dan `422 Input buffer contains unsupported image format`. Probado
  con `Blob`, `Uint8Array` y `Buffer` — los tres fallan igual, así que no es la forma del cuerpo.
  **Conclusión: `composio proxy` sirve para mutaciones JSON, no para `assets/images`.**

---

## Fase 3 — Sanity: esquemas + import   ✅ cerrada
**Fecha:** 2026-08-27

### Qué se hizo
- `scripts/schema-map.mjs` — **fuente única** del mapeo columna-CSV → campo-Sanity.
  **Falla si alguna columna se queda sin destino**: es lo único que impide perder un campo en
  silencio (un campo perdido no rompe el build, deja un hueco que nadie mira).
- `scripts/gen-schemas.mjs` → `studio/schemaTypes/*.ts` (16 tipos + `seo`).
- `studio/` — Sanity 4.22.1, `projectId: m273z6jc`, compila con `tsc --noEmit` sin error.
- `scripts/import.mjs` — construye los documentos; **`--dry-run` por defecto** si no hay token.

### Números medidos
| Métrica | Esperado | Medido |
|---|---|---|
| Columnas de CSV sin destino | 0 | **0** de 236 campos en 16 colecciones |
| Documentos construidos | = filas no archivadas | **519** |
| Referencias rotas | 0 | **0** |
| Assets ausentes | 0 | **0** |
| Documentos con Portable Text | — | **79** |
| Assets que van a Sanity | — | **628** (los otros 203 son cromo y se quedan en `public/`) |
| Borradores (`Draft=true`) | — | **9** |

Conteos por tipo, todos cuadran con los CSV: 147 galleryImage · 113 subservice · 57 brochure ·
56 processStep · 53 poolBuilder · 20 logo · 14 service · 10 industry · 10 project · 10 blogPost ·
9 brochureCategory · 9 county · 3 category · 3 commercialService · 3 article · 2 serviceRegion.

### Evidencia
```
$ npm run import:dry
documentos construidos : 519
con Portable Text      : 79
assets referenciados   : 628 de 831 del manifiesto
✅ 0 referencias rotas · 0 assets ausentes
```

### Defecto corregido
`gen-schemas.mjs` emitía `description: '…', (vacía en el export)` con el paréntesis **fuera de la
cadena** → `.ts` roto. Lo cazó `tsc --noEmit`; el `npm run build` de Astro **no** lo habría
cazado, porque esbuild no comprueba tipos.

### Rarezas del original replicadas a propósito
- Las erratas de nombre de campo se conservan en la `description` de cada campo del esquema
  (`Heading 3D Rendeing Design`, `Metadescripcion SEO`, `Imagen Intro N`) para que el editor
  reconozca de dónde viene cada cosa.
- `blogs.Date`, `commercials.Categories` y `logos.Metadata` están **vacías en el export**: se
  emiten igual, marcadas en la descripción.

### Subida — hecha
Token acuñado con el robot de Composio (rol `developer` → crea tokens), etiqueta
**`migracion-webflow`**, id `siJwsZIuxYcguA`, rol **editor**. Guardado solo en `.env`
(gitignored, permisos 600). **REVOCAR AL ENTREGAR.**

| Métrica | Medido |
|---|---|
| Assets subidos | **628** (449 imágenes + 179 ficheros) |
| Documentos publicados | **511** en 16 tipos |
| Borradores | **8** |
| Referencias, todas resueltas | **1267** |
| Idempotencia (2.ª corrida) | `count(*)` **1159 → 1159** |

```
$ node scripts/check-sanity.mjs
── 1. conteo por tipo        ✅ 511 documentos publicados en 16 tipos
── 2. borradores             ✅ 8
── 3. referencias rotas      ✅ 1267 referencias, todas resuelven
── 4. assets                 ✅ 449 imágenes + 179 ficheros = 628
── 5. sin slug               ✅ todos con slug
── 6. Portable Text          ✅ 10 blogPost con bloques
── 7. idempotencia           ✅ count(*) 1159 -> 1159
✅ PUERTA VERDE

$ # probada en rojo: borrado un industry, restaurado con el propio importador
🔴 industry: esperado 10, hay 9   ->   🔴 PUERTA ROJA
✅ PUERTA VERDE   (tras `node scripts/import.mjs`)
```

### Defectos corregidos durante la subida
1. **`slice(17)` en vez de una captura de regex** se comía la barra inicial de cada ruta →
   628 `ENOENT`. Sustituido por `matchAll` con grupo.
2. **`.sort()` MUTA.** Ordenar `docs` alfabéticamente para volcarlo a `sanity-docs.json`
   destruía el orden topológico con el que se escriben los lotes: el primer lote intentaba
   escribir un `brochure` antes que su `brochureCategory` → `409`. Ahora se ordena una **copia**.
3. **Un documento publicado no puede referenciar a un borrador** (Sanity da 409 a mitad de lote,
   sin decir la causa). Añadido un guardia que lo detecta en el ensayo.
4. **La puerta medía sin token y daba un falso negativo.** Una lectura ANÓNIMA de un dataset
   público devuelve los borradores como **0, no como error**: la puerta decía «0 borradores»
   con los 8 dentro. Mismo patrón que el 200-con-`result:[]` de un dataset privado en AMS.
5. Los **12 `system.group`** de Sanity son grupos ACL, no contenido, y su `_id` es `_.groups.*`
   —así que `path("system.**")` NO los filtra—. Se filtra por `_type match "system.*"`.

### Rareza del original: un `Draft=true` que el sitio SÍ sirve
`where-we-serves/custom-pool-builders-north-florida` viene marcado como borrador en el export,
**pero la página devuelve 200** y 7 condados la referencian. Manda el sitio vivo (contrato):
se publica, con la excepción declarada en `PUBLICAR_IGUAL` de `import.mjs`.
Los otros 8 borradores se quedan como borradores, **verificado uno a uno contra el vivo**:
los 6 logos no salen en la home, y ni el subservice `lighting-water-feature-upgrades` ni el paso
`smart-lighting-step-1` salen en su ficha de servicio.

### Abierto
- El **Studio no está desplegado**. `npm run deploy` desde `studio/` lo tiene que correr el dueño
  del proyecto: el login del CLI de esta máquina no llega a `m273z6jc`. El frontend no lo necesita
  (lee el dataset directo), pero el cliente sí para editar.
- **Revocar el token `migracion-webflow`** al entregar.
