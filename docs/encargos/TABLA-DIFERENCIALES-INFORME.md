# TABLA-DIFERENCIALES — informe (17-oct-2026)

**Encargo:** tabla comparativa de diferenciales bajo «Before & After Transformations» (director, 17-oct). **Base:**
`origin/stitch-sitio` = `5a78a010` (la rama nació sobre `06912299` y se rebasó al entregar, tras CIUDADES-BUSCADOR y ABOUT-OBRA). **Rama:** `tabla-diferenciales`, worktree `.claude/worktrees/tabla-diferenciales`.
**Sin push.** Commits por pieza al final.

## 1 · Dirección (frontend-design, antes del markup)

La tabla no es una tabla de planes: es la **hoja de alcance del proyecto**. La primera columna lista lo que un proyecto
necesita, en dos grupos (cómo corre el proyecto · qué se diseña y construye); la columna de Mr & Mrs es un **lomo navy
continuo con un check de oro por fila**, el único acento de la pieza; las dos alternativas quedan en blanco y tinta suave.
Sobre terceros no se afirma nada que no sea estructural: en vez de aspas inventadas, las alternativas **dicen con palabras
lo que cubren** («Their trade only», «You coordinate», «Per vendor», «Varies»; la aspa solo donde es literal: nadie más
da «un solo equipo de diseño a construcción», y con varios proveedores nadie diseña el espacio entero). En el grupo de los
14 servicios las alternativas se **colapsan en una sola celda** por columna («One trade per contractor» / «One vendor per
trade, coordinated by you») sobre un panel tenue: catorce checks de oro frente a una frase. Sin cifras, plazos, años,
garantías ni «5-star» (decisión de Sebastian, 2-sep-2026). Sin fotos.

En <768 la hoja no se encoge: **scroll horizontal con la primera columna fija**; a 390 asoma la tercera columna
(24 + 196 + 120 px) para que se vea que la hoja sigue. La región de scroll es enfocable (`tabindex="0"`,
`role="region"`) con `outline` de 2 px; sin hover, sin movimiento.

## 2 · Rutas afectadas (derivadas del build, no de memoria)

```
grep -rlo 'class="mm-cmp"' .vercel/output/static --include='*.html'   # 1: index.html
grep -rlo 'class="mm-ad"'  .vercel/output/static --include='*.html'   # 2: index.html y services/pool-remodeling
```

La sección «Before & After» de la home es markup propio de `index.astro`, no un componente compartido: la `mm-ad` de
`/services/pool-remodeling` es otra pieza (sin deslizador ni la línea «Design visualization…»). **La tabla entra solo en
`/`.** Las otras 232 rutas construidas solo cambian en el nombre con hash de `Base.*.css` (el CSS nuevo cuelga de
`.mm-cmp*`, clases que no existen fuera de la home).

## 3 · Lo que dice la tabla y de dónde sale

| Fila | Mr & Mrs | Respaldo en el sitio |
|---|---|---|
| Property walk and free estimate | ✓ | «We walk your property…» (`/financing`, `/request-estimated`); «We schedule your site visit» (`/thank-you`); «Get a Free Estimate» (home) |
| 3D design of the whole space | ✓ | sello «3D Design» del hero; «3D Pool Design & Visualization» (home) |
| Permits pulled under a licensed contractor | ✓ | «We pull the gas, electrical, and plumbing permits under our own license» (`/services/outdoor-kitchens`); licencias en `src/lib/identidad.mjs` |
| Engineering | ✓ | «Licensed & Engineered» (home); «Engineering, permits, and the build itself, managed by a licensed Florida contractor» (`/financing`) |
| One team from design to construction | ✓ | «One team handles design, permits, engineering, and construction» (home, `/services/pool-remodeling`) |
| Materials, scheduling and crews managed in-house | ✓ | «By managing materials, scheduling, and crews internally…» (`/about`) |
| Financing options through a lending partner | ✓ | sello «Financing Available»; «you review options through our lending partner. Approval and terms come from the lender» (`/financing`). La nota al pie repite esa misma reserva |
| Los 14 servicios | ✓ ×14 | los 14 con ficha en `/services`, en el orden del índice de la home (`src/data/servicios-categoria.json`) |

Alternativas: `Single-trade contractor` → «Their trade only» en lo que un oficio cubre para su oficio, «Varies» en
financiación, aspa en «One team…»; `Multiple vendors or DIY` → «Per vendor» / «You coordinate», «Varies» en financiación,
aspa en «3D design of the whole space» y en «One team…». Nada de esto es despectivo ni cuantitativo.

**Fuente única:** `src/lib/diferenciales.mjs` alimenta el componente (`TablaDiferenciales.astro`) y la puerta
(`check-texto.mjs`, `lineasDiferenciales()`): una fila nueva o una errata mueven las dos a la vez.

## 4 · Texto nuevo (D-10) — para el visto de Sebastian

Registrado como **provisional** en `STITCH-TEXTO.md` (filas **T-115 a T-122**, en la copia del árbol principal y en el
worktree `stitch`, sin commitear, como hizo CIUDADES-BUSCADOR) y declarado en `check-texto.mjs` como bloque contiguo
que tiene que ir entero y pegado detrás de «Licensed & Engineered». `baseline/text/` no se toca.

- T-115 · H2: `Everything Your Project Needs, One Team`
- T-116 · párrafo: `Compare what a single-trade contractor or a set of separate vendors covers with what our licensed design-build team handles for you, from the first property walk to the finished build.`
- T-117 · `<caption>` (solo lector de pantalla): `Scope of a project with Mr & Mrs Outdoor Living compared with a single-trade contractor and with multiple vendors or DIY`
- T-118 · cabeceras: `What your project needs` · `Mr & Mrs Outdoor Living` · `Single-trade contractor` · `Multiple vendors or DIY`
- T-119 · grupos: `How the project runs` · `What gets designed and built`
- T-120 · las 7 filas del primer grupo (tabla de §3); las 14 del segundo son nombres de servicio que ya existen
- T-121 · `Their trade only` · `Per vendor` · `You coordinate` · `Varies` · `One trade per contractor` · `One vendor per trade, coordinated by you`
- T-122 · nota: `Financing is offered through a third-party lending partner; approval and terms come from the lender.`; y, no visibles, `Included` / `Not included` (nombre accesible de los iconos)

## 5 · Verificación (sobre `.vercel/output/static`, nunca `astro dev`)

| Puerta | Resultado |
|---|---|
| `check:tokens` | **verde** · capa 153,1 KB de 168 (15,1 libres; la pieza añade ~3,5 KB, el resto es el buscador de ciudades que entró con la base) · 0 literales de color, 0 `!important`, 0 `@layer`, 0 `opacity: 0` |
| `check-texto.mjs '=/'` | **verde** (100 %, con el bloque declarado) |
| `check:seo` · `check:encabezados` · `check:rutas` · `check:enlaces` | **verdes** |
| `check-accesible.mjs '=/'` (390 y 1440, `MM_SIN_CONTRASTE=1`) | **verde**: un `<main>`, 80 `<img>` con `alt`, 232 controles con nombre, foco visible. El contraste va aparte, abajo |
| `check-visual.mjs '=/'` | **roja, y es la esperada**: solo `/`, en sus 4 anchos, por alto (+1 054 / +1 117 / +1 601 / +2 161 px: la tabla). Re-baseline con `aprobar-diseno.mjs` cuando Sebastian apruebe |
| `check:estructura` | **roja heredada**: las 14 fichas, «puesto 7: se esperaba svc-inversion y hay mm-cat» — viene de `06912299`, documentado ya por CIUDADES-BUSCADOR. La home no es ficha; la tabla no toca `check-estructura` |

**Medidas a mano** (Chromium, `reducedMotion`, sobre el build), 10 anchos: 320, 390, 480, 600, 767, 768, 991, 992,
1440 y 1920 → **0 desbordes del documento, 0 elementos fuera del viewport fuera de la región de scroll**; celda mínima
44-47 px; región de scroll enfocable con `outline` 2 px sólido; scroll horizontal activo solo <768 (a 767 la hoja ya cabe);
columna fija `sticky` <768 y `static` desde 768.

**Contraste por peor píxel, muestreado en la caja del texto** (`Range.getClientRects`, glifos transparentes):
1440 → **4,82:1** peor caso (rótulos de grupo, `#596b9a` sobre `#f1f5ff`); 390 → **4,82:1**; el resto 5,26:1 (tinta suave
sobre blanco) y 15,60:1 (navy sobre blanco). Iconos: oro sobre navy 8,40:1, aspa `#596b9a` sobre blanco 5,26:1.
Capturas: `docs/encargos/capturas/tabla-diferenciales/` (390, 390 desplazada al final, 1440; cabecera fija y barra
inferior ocultas solo para la captura).

## 6 · Lo que NO se midió o no cuenta como verde

- `diag-contraste.mjs` de la casa **no corrió sobre la home**: espera `load` sin bloquear la red externa y no termina. Se
  midió con una copia que bloquea la red y, además, con un muestreo propio acotado a la caja del texto. Con el muestreo de
  la casa (celda entera) la cabecera redondeada del lomo da 1,23:1: son las esquinas fuera del radio, no el glifo.
- A 390 con la hoja desplazada al final, dos textos dan 4,13:1 en el píxel `x=48` / `x=219`: es texto que **ya ha pasado
  por debajo de la columna fija** (el píxel es su borde), comportamiento normal del patrón; el mismo texto, visible, mide
  5,26:1. El `<caption>` en `.mm-sr` no es visible y no se mide.
- No corrieron: `check:visual` fuera de `/`, `check:ix2`, `check:assets`, `check:menu`, `check:carrusel`, `check:galeria*`,
  `check:redirects`, `check:jsonld`, WebKit, `ui-qa`, accesslint (no se pidieron; la barrida no se asume).
- No se ha comparado byte a byte con un build previo de la base; la afirmación de §2 sale del `grep` de clases.

## 7 · Decisiones que quedan para Sebastian

1. Texto nuevo T-115 a T-122 (declarado ya como provisional para que la puerta corra).
2. Las palabras de las alternativas («Their trade only», «You coordinate», «Varies») en vez de aspas: es la forma honesta
   de no afirmar nada sobre terceros; si prefiere aspas, se cambian seis cadenas en `diferenciales.mjs`.
3. Visual de la home y re-baseline (`aprobar-diseno.mjs`, una sola vez).
4. Push por SHA (D-11).
