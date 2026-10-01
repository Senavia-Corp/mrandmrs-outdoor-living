# Banco de imágenes — cómo se consulta

Fotografía de obra propia, clasificada el 1-oct-2026 desde
`~/Documents/Pictures Mr and Mrs Outdoor Living` (1.269 ficheros, 1.129 únicos).

| Qué | Dónde |
|---|---|
| Índice — **lo único que hay que leer** | `src/data/banco-imagenes.json` (1.269 entradas, 514 aprobadas) |
| Ficheros servidos (WebP, 1600 px, sin EXIF) | `public/images/banco/<servicio>/<slug>.webp` → URL `/images/banco/…` |
| Hojas de contactos de lo aprobado | `banco/hojas/<servicio>-<etapa>-NN.jpg` |
| Dudosas, con su pregunta | `banco/DUDOSAS.md` + `banco/hojas-dudosas/` |
| Derivar · hojas · puerta | `node scripts/build-banco.mjs` · `--hojas` · `--check` |

## Consultar

```bash
# pérgolas terminadas, horizontales, que no se usan todavía en ninguna página
jq '.[] | select(.estado|startswith("aprobada"))
        | select(.etapa=="terminado" and (.servicios|index("pergolas")) and .orientacion=="horizontal" and (.usada_en|length)==0)
        | {id, src, alt, proyecto, vista, estado, recortes_seguros}' src/data/banco-imagenes.json

# fases de obra de piscina, para las secciones de proceso
jq '.[] | select(.estado=="aprobada" and .fase_obra=="gunite") | {id, src, alt, proyecto}' src/data/banco-imagenes.json
```

Campos: `etapa` (`terminado` · `construccion` · `antes`), `servicios` (protagonista primero),
`fase_obra`, `proyecto` (misma propiedad = mismo `obra-NNN`), `vista`, `orientacion`,
`espacio_texto`, `recortes_seguros`, `defectos`, `descripcion` (en español, para elegir sin abrir).

## Reglas para quien consuma

1. **Índice primero, hoja de contactos después.** Nunca se elige escaneando carpetas ni por el nombre.
2. **`aprobada_con_recorte` solo vale en sus `recortes_seguros`**: lee `defectos` antes de usarla.
3. **Mira `usada_en` antes de elegir y añade la ruta al usarla.** Ya viene relleno en las 11 fotos
   que el sitio publica hoy (cruce por parecido visual, verificado a ojo; `publicada_como` dice
   con qué fichero). El cruce no detecta recortes ni ediciones fuertes: que esté vacío no
   garantiza que esa obra no salga ya en la web.
4. **Solo `procedencia: obra_real` se publica como obra.** `stock`, `generada_ia` y
   `no_es_del_cliente` están en el índice para que nadie las vuelva a proponer.
5. **`dudosa` no se usa** hasta que Sebastian la adjudique. «Happy House» es de los mismos dueños:
   sus fotos son obra propia (dicho por Sebastian el 1-oct-2026).
6. **Las que llevan `recorte` se sirven ya recortadas** (el cuadro entero tenía una cara o un número
   de portal). No las re-derives a mano desde el original.
7. **El slug no se cambia nunca**: es una URL. Y no lleva región: `region` es `desconocida` salvo
   en una obra, porque ni la carpeta ni el EXIF la prueban.
8. **Si el banco no tiene la foto que el hueco pide, el hueco se queda como está y se reporta.**
   Ceros hoy: `irrigation`, `lighting`, `furniture`, `rooms` y `screens` como protagonista;
   `enclosures` tiene una sola.

## Añadir fotos

Entrada nueva en el índice (`origen` relativo a la carpeta de originales, `sha256`, `estado`,
`src`…) → `node scripts/build-banco.mjs` → `--hojas` → `--check`. Los originales no entran en git;
la ruta se cambia con `BANCO_ORIGEN=…`. El trabajo intermedio de la clasificación (previews,
inventario, decisiones por lote) está en `banco/.trabajo/`, ignorado por git.
