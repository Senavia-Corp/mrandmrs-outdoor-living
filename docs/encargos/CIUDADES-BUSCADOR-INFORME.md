# CIUDADES-BUSCADOR — informe (17-oct-2026)

**Encargo:** `PROMPT-CIUDADES-BUSCADOR.md` (Sebastian, 17-oct). **Base:** `origin/stitch-sitio` = `06912299`.
**Rama:** `ciudades-buscador`, worktree `.claude/worktrees/quirky-herschel-e0189d`. **Sin push.** Commits por fichero al final.

## 1 · Dirección (frontend-design, antes del markup)

La pieza deja de ser una nota al pie de la FAQ y pasa a ser **el índice de ciudades de «Where We Serve»**: misma banda
azul clara, mismo canal y contenedor, H2 propio y la ciudad a dos gestos (tres letras en el campo o un condado en los chips).
Cambia la composición entera: de un `<p>` con 53 enlaces corridos a **cabecera + buscador + carril de condados con cuenta +
rejilla de tarjetas-enlace agrupadas por condado bajo un `<h3>`**, en 1 / 2 / 3 / 4 columnas (480 / 768 / 992). El acento
va en un solo sitio: las cabeceras de condado como índice (nombre, cuenta en tinta suave y una regla que corre hasta el
borde). Tarjetas blancas sin sombra sobre la banda; hover solo bajo puntero fino y solo color/transform (D-05).

## 2 · Rutas afectadas (derivadas del build, no de memoria)

```
grep -rlo 'mm-ciudades-servicio' .vercel/output/static --include='*.html' | sort   # antes: 7 fichas
grep -rlo 'class="mm-ciudades"'   .vercel/output/static --include='*.html' | sort   # después: las mismas 7
grep -rlo 'mm-faq-mas'      .vercel/output/static --include='*.html' | wc -l        # 118 landings, fuera de alcance, sin tocar
grep -rlo 'mm-faq-fuentes'  .vercel/output/static --include='*.html' | wc -l        # 125 (FAQ + landings): su CSS no se toca
```

| Ficha | Ciudades | Condados | Buscador |
|---|---:|---:|---|
| `/services/pool-builders` | 53 | 9 | sí |
| `/services/pool-remodeling` | 15 | 6 | sí |
| `/services/pergola-builders` | 13 | 6 | sí |
| `/services/louvered-roofs` | 13 | 6 | sí |
| `/services/deck-builders` | 10 | 6 | sí |
| `/services/outdoor-kitchens` | 10 | 6 | sí |
| `/services/landscaping` | 4 | 4 | no (≤ `UMBRAL_BUSCADOR` = 8: solo rejilla) |

**Las otras 226 rutas construidas no cambian:** comparado el build de antes con el de después fichero a fichero, 232 de
233 HTML difieren, pero fuera de las 7 fichas la única diferencia es el nombre con hash de la hoja `Base.*.css`
(0 rutas con otra diferencia). En las 118 landings las líneas `.mm-faq-mas` siguen como estaban (3-8 enlaces; no
apareció otro bloque de ≥10 enlaces corridos en el inventario).

**Datos.** Las 118 landings resuelven condado: 53 por las páginas de condado (`vecinas.mjs`) y 65 por
`ciudades-servicios-filas.json > ciudades.<doc.slug>.condado`. Ninguna va a «Other». Los 9 condados son los de `negocio.mjs`.

## 3 · Qué cambia en el código

| Fichero | Cambio |
|---|---|
| `src/lib/servicios-ciudad.mjs` | `ciudadesDeFicha(ficha)` devuelve las 7 fichas (piscina incluida) con `condados[]`, `ciudades[]` (orden del DOM), `zonas[]`, `textos` y **`lineas`** (el `innerText` exacto que pinta el componente con JS en la vista «All»). `UMBRAL_BUSCADOR`, `TEXTOS_BUSCADOR`. `porCiudad` para `pool-builders` |
| `src/lib/vecinas.mjs` | `CONDADO_DE_RUTA` y `NOMBRE_DE_RUTA` para las 118; `nombreCondado` y `zonaDeCondado` exportados. Se retira `ciudadesDePiscinaPorZona()` |
| `src/components/widgets/CiudadesServicio.astro` | Reescrito: `<section class="mm-ciudades">` (antes `div`). Un `<symbol>` para el pin y otro para la flecha, 53 `<use>`. Botón de limpiar propio (44 × 44, solo con texto). Script `is:inline` de 2 020 B con sangrado (≈1,97 KiB), sin dependencias |
| `src/styles/disenio/sistema.css` | Bloque `.mm-ciudades*` / `.mm-chip*` / `.mm-ciudad*`; fuera la regla `.mm-ciudades-servicio .mm-faq-fuentes`. `.mm-faq-fuentes` no se toca |
| `src/styles/disenio/tokens.css` | `--mm-ancho-busqueda: 520px` y `--mm-borde-control-tenue: #7d8db4` (navy al 48 % sobre `--mm-azul-50` = 3,04:1; el `--mm-borde-control` daba 2,77:1 sobre la banda) |
| `src/lib/jsonld-propio.mjs` | `areaServed` sale de la misma función, en el mismo orden que la página |
| `scripts/check-texto.mjs` | `LINEAS_CIUDADES_FICHA` se deriva de `ciudadesDeFicha().lineas` (ver §6) |
| `scripts/check-seo.mjs` | Lee las ciudades de `.mm-ciudades a.mm-ciudad .mm-ciudad-n` y las compara sin «, FL» |
| `scripts/check-estructura-servicios.mjs` | Secciones **opcionales** declaradas: `mm-ciudades` solo puede ir detrás de `mm-zonas` y puede faltar |

Mejora progresiva: sin JS se ven las N tarjetas en grupos por condado con su `<h3>` (es lo que ve Googlebot); el campo y
los chips nacen `hidden` y el script los enciende durante el parseo. Filtrar pone `hidden` a tarjeta y grupo, nunca los
quita del DOM. Sin `localStorage`, sin `?q=`. `hidden` manda sobre cualquier `display` de clase
(`.mm-ciudades [hidden] { display: none }`): sin esa regla los 9 enlaces de condado del pie se veían (cazado por `check:texto`).

## 4 · Medidas antes / después

Antes, `/services/pool-builders`, 13 anchos de D-128 (320 … 1920), sobre el bloque `.mm-ciudades-servicio`:

| | Antes | Después (`.mm-ciudades`) |
|---|---|---|
| Objetivos | 53 enlaces en línea | 66 controles al cargar (campo, 10 chips, 53 tarjetas, 2 enlaces de zona; +1 botón de limpiar con texto); 6 en landscaping |
| Alto del objetivo | **19 px en los 13 anchos** (la regla de 44 px solo aplicaba dentro de `.mm-faq`) | mínimo 44 px (chips 44,2; campo 48; tarjetas 65; enlaces 44) en los 13 anchos |
| Separación mínima entre objetivos | **0 px** (enlaces consecutivos pegados) en 12 anchos; 6,2 px a 992 | 8 px (chip–chip) en todos |
| Objetivos < 44 px | 53 de 53 | 0 |
| Desborde horizontal | 0 | 0 (también tras desplazar los chips y tras filtrar) |
| Alto del bloque | 431 px a 320 · 171 px a 1920 | 4 809 px a 320 (1 columna, 53 tarjetas) · 2 307 px a 1920 |

`build-mide.mjs` (14 anchos, con 2560) salía LIMPIO antes y sale LIMPIO después en las dos rutas; cuenta como
«bajo 44» solo controles de bloque, por eso no veía los 19 px de los enlaces en línea: la medida de arriba es de una
sonda propia sobre `getClientRects()`.

**Peso de `/services/pool-builders/index.html`:** 206 831 → 234 321 B en crudo (**+27,5 KB**, por encima de los ~15 KB
del encargo), 48 705 → 51 258 B gzip (**+2,6 KB**). Son 53 tarjetas × ~450 B (enlace, dos `<span>`, dos `<use>`,
`data-q`) + 9 `<h3>` + 10 chips + el script de 2 KB; el pin y la flecha son símbolos únicos, no 53 trazados. En el cable
cuesta 2,6 KB.

**Contraste (peor píxel, calculado con la fórmula WCAG sobre los tokens):** apoyo y cuenta del `<h3>` 4,82:1 (tinta suave
sobre azul-50); servicio en tarjeta, badge del chip inactivo y placeholder 5,26:1; badge del chip activo 9,81:1; borde de
campo y chips 3,04:1 sobre la banda; pin 5,01:1 (decorativo). CLS medido con `PerformanceObserver`: **0** a 390 y 1440,
en carga y tras desplazar hasta la sección; con JS la vista «All» mide lo mismo que sin JS salvo el bloque de controles,
que aparece durante el parseo.

## 5 · Puertas (acotadas por ruta; lo que no corrió, dicho)

| Puerta | Resultado |
|---|---|
| `check:tokens` | VERDE (11 hojas, 0 literales, 0 `!important`, 0 `@layer`; capa 148,3 KB de 168) |
| `check:estructura` | **ROJA en las 14 fichas, pero ya lo estaba antes de este encargo**: la banda `mm-cat` (commit `99c8ad85`, «Project Gallery») no está en `ESPERADO`. Con `mm-cat` tolerado en una copia temporal de la puerta, las 14 salen **verde** y las 7 marcan `+ mm-ciudades (opcional)`. El orden `ESPERADO` es del director; no se toca aquí |
| `check:captacion` · `check:rutas` · `check:enlaces` · `check:seo` · `check:encabezados` · `check:jsonld` | VERDE las seis (`check:seo` valida que `#servicio.areaServed` dice las mismas 53/15/13/13/10/10/4 ciudades, en el mismo orden) |
| `check:texto` en las 7 fichas (`=/services/<ficha>`) | **7 identicas · 0 en rojo** (declaración derivada; ver §6) |
| `check:texto` en las otras 108 rutas | **no corrió como puerta**; en su lugar, la prueba de §2: su HTML es byte a byte el mismo salvo el nombre del CSS |
| `check:visual` en las 7 fichas | **ROJO en las 7, en los 4 anchos (28 comparaciones)**, por alto: +597…+932 px a 1920/1440 y +1 537…+2 956 px a 991/479. Es el cambio esperado; defiende la línea antigua. Pendiente del visto de Sebastian y del re-baseline con `aprobar-diseno.mjs` (una sola aprobación) |
| `check:visual` en otras rutas | no corrió (no se tocaron; ver §2) |
| `check:ix2`, `check:assets`, `check:menu`, `check:carrusel`, `check:galeria*`, `check:redirects` | **no corrieron** (no leen `argv` o no tocan esta pieza) |
| Medidas a mano 480-767 y 991/992 | sonda propia en 320, 360, 390, 480, 600, 768, 820, 991, 992, 1100, 1200, 1440, 1920: 0 desbordes, 0 objetivos < 44 px, chips desplazables a 320 (último chip entero: borde derecho 296 de 320) |
| Teclado y lector (Chromium) | Tab: campo → 10 chips → primera tarjeta; `focus-visible` con `--mm-foco` + halo en los tres controles; `aria-pressed` exclusivo; región viva «5 cities» / «8 cities in Alachua County» / «0 cities» |
| Teclado y lector (WebKit) | Mismos resultados en filtro, chips (Enter), región viva, pie de condado y sin JS. El Tab de WebKit **salta botones y enlaces por defecto** (comportamiento de Safari sin «Press Tab to highlight each item»), así que el orden de tabulación solo se verificó en Chromium |
| Sin JS (`javaScriptEnabled: false`) | 53 tarjetas y 9 `<h3>` visibles; controles ocultos; 62 `<a href>` en la sección (53 + 2 zonas + 9 condados ocultos) |
| Búsqueda | «palm» → North Palm Beach, Palm Beach Gardens, Royal Palm Beach, South Palm Beach, West Palm Beach; «BÓCA» → Boca Raton (acentos y mayúsculas); «zzz» → «No cities match.» con los enlaces de zona debajo |
| accesslint `audit_live`, acotado a `.mm-ciudades` | **0 violaciones** en `/services/pool-builders` y `/services/pergola-builders`. Página entera: 3 «moderate» de landmark (`body > section.code`, `noscript`, un `div`) **anteriores** y fuera de la pieza (`.mm-ciudades` está dentro de `<main>`) |
| Agente `ui-qa`, 2 rutas × 390/768/1280/1920 | 0 críticos, 2 medios, 3 menores, **los cinco corregidos y re-medidos** (§7). Limpio: scroll, solapes, objetivos, contraste, foco, filtro, sin JS, alineación con `mm-zonas` |

## 6 · Texto nuevo (D-10): registrado, declarado como PROVISIONAL, pendiente del visto de Sebastian

Filas **T-107 a T-114** añadidas a `docs/encargos/STITCH-TEXTO.md` (en el worktree `stitch` de `stitch-docs` y en la
copia del árbol principal, **sin commitear**: ese fichero no está en la rama pública). Lista cerrada:

| Cadena | Dónde |
|---|---|
| `All` + cuenta (`All 53`) | chip, solo con JS |
| `<Condado> County` + cuenta (`Alachua County 8`; los 9 condados) | chips (JS) y `<h3>` de grupo (también sin JS) |
| `<n> cities across <m> Florida counties` | apoyo bajo el H2 (cifras derivadas) |
| `Search your city` | `label` `.mm-sr` (cuenta en `innerText`) y `placeholder` |
| `No cities match.` | estado vacío, solo con JS y tras filtrar |
| `Filter by county` · `Clear search` · `<n> cities in <Condado> County` / `<n> cities` / `1 city` | `aria-label` del grupo y del botón de limpiar (solo icono) · recuento visible y `aria-live` al filtrar (vacío al cargar) |
| Retiradas: `<Servicio> by city: A, FL · …` (6) y las dos de piscina por zona (T-101) | el rótulo pasa a H2 (en pantalla Title Case por el `capitalize` de `.mm-h2`: «Custom Pool Builders By City»); «<Ciudad>, FL» pasa a tarjeta «<Ciudad>» + servicio |
| `View North/South Florida Service Areas` | repetidos al pie (ya existen justo encima) |

**Decisión que hay que conocer:** la declaración en `scripts/check-texto.mjs` **ya está escrita**, derivada de
`ciudadesDeFicha().lineas`, porque sin ella la puerta no puede correr (la antigua importaba una función que ya no existe)
y el encargo exige `check:texto` al 100 % en las 7. Cuenta como provisional: si Sebastian cambia una cadena, se cambia
en `TEXTOS_BUSCADOR` / `porCiudad` y la declaración se mueve sola. `baseline/text/` no se ha tocado.

## 7 · Lo que corrigió la auditoría (`ui-qa`, 17-oct) y cómo quedó

1. **Desalineación de 32 px con `mm-zonas` entre 1200 y 1439** (la regla de 1200 iba antes que la de 768 y perdía en la
   cascada) → la regla va detrás del bloque de 992. Re-medido 1199/1200/1280/1439/1440: borde izquierdo igual al de
   `.mm-zonas-caja`.
2. **Tarjetas más cortas que su celda a 768** cuando un nombre parte en dos líneas → `.mm-ciudades-rejilla > li { display: grid }`.
3. **Borde de campo y chips a 2,77:1 sobre la banda** → token `--mm-borde-control-tenue` (3,04:1).
4. **Sin aspa para limpiar en táctil** (el reset de Webflow la quita y con `appearance: none` la nativa no se pinta: probado
   `textfield` y `searchfield` en Chromium y WebKit, ninguna la enseña) → botón propio `.mm-ciudades-x` de 44 × 44 dentro
   del campo, visible solo con texto; al pulsarlo vacía, restaura las 53 y devuelve el foco al campo (medido en los dos motores).
5. **El recuento solo lo oía el lector** → la región viva pasa a ser una línea visible bajo los chips (vacía al cargar).

## 8 · Capturas

`docs/encargos/capturas/ciudades-buscador/`: `pool-builders-390.jpg`, `pool-builders-1440.jpg`, `landscaping-390.jpg`,
`landscaping-1440.jpg` (sección entera, cabecera fija oculta para que no se cuele a mitad del cosido). Las 24 PNG del
`ui-qa` quedaron en el scratchpad de la sesión, no en el repo.

## 9 · Fuera del alcance y pendientes

- Las líneas `.mm-faq-mas` de las 118 landings (3-8 enlaces) quedan como están: no son el problema y no salieron con
  desbordes en el inventario. Si Sebastian quiere, la misma tarjeta valdría para ellas.
- Los chips de zona (North / South Florida) encima de los de condado **no se pusieron**: lo decide Sebastian. Los
  condados ya van en orden norte → sur.
- `check:estructura` roja por `mm-cat` (anterior): es del director añadir `mm-cat` a `ESPERADO` o quitar la banda.
- La página de condado solo se enlaza en el pie de la ficha de piscina (las otras seis no tienen páginas de condado propias).
- Push, merge y re-baseline: de Sebastian y del director, por SHA.
