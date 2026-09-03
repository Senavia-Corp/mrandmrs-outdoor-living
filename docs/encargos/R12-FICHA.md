# ENCARGO R12-FICHA — las 10 fichas de `/blogs/*`

Eres el chat **FICHA-BLOG** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director en
otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-FICHA
RUTAS      /blogs/*  — las 10 fichas de artículo
POSEES     src/styles/lectura.css        (creado y cableado en Base.astro:77; hoy son
                                          45 líneas de comentario y CERO reglas)
           src/pages/_lab-lectura.astro  (lo creas tú; el guion bajo lo deja fuera de rutas)
PUERTO     astro dev --port 4346         (4340-4345 están cogidos)
PROHIBIDO  todo lo demás. Esto es CSS PURO: el markup solo se toca en la home, y solo el chat
           HOME. Nada de Base.astro, propio.css, disenio/*, webflow.css, scripts/*,
           contratos.json, baseline/, MIGRACION-LOG.md, ni ningún .astro de `src/pages/blogs/`
           —son DERIVADOS, los regenera `npm run paginas`—. Y EL TEXTO VISIBLE no se toca.
```

> **Lee antes `docs/encargos/PARTE-04.md`** — es el parte vigente y manda sobre este documento.
> Ahí está el modo simultáneo (varios frentes a la vez), la higiene de navegador, y el error de
> conteo de clases que ya costó dos encargos mal medidos.

## Antes de nada

1. `docs/encargos/00-PRINCIPIOS.md` — manda sobre todo. Se **eleva** Webflow, no se sustituye.
2. `docs/encargos/CRITERIO.md` — con eso te acepto o te rechazo.
3. Invoca **`frontend-design`** antes de escribir una línea, y luego
   **`make-interfaces-feel-better`** para la pasada de detalle.
4. `git status --porcelain`. Ficheros sucios que no son tuyos: **para y pregunta** — en este repo
   conviven varias sesiones y el índice de git es compartido.

## Objetivo

Diez guías largas sobre construir piscinas en Florida. Son la puerta de entrada orgánica del sitio
y lo que lee alguien **antes** de pedir presupuesto: el artículo que convierte es el que se
termina de leer. Hoy no se termina, y no es culpa del texto —el texto es bueno— sino de una
medida de línea de ~830 px sin un solo descanso vertical.

## Tus selectores, con el alcance ya medido

Contados por **token entero** del atributo `class` sobre `.vercel/output/static` (2-sep-2026):

| Selector | Rutas | |
|---|---|---|
| `.blog-section` | **10** | la banda de la ficha |
| `.wrapper-cms-blog` | **10** | la maqueta a dos columnas |
| `.blog-block` | **10** | la columna del artículo (70 %) |
| `.cms-blogs-block` | **10** | el raíl lateral (30 %) |
| `.related-blogs` | **10** | las tarjetas del raíl — **este es tu gancho, no `.card`** |
| `.related-image` | **10** | la foto de esas tarjetas |
| `.wrapper-content-related-blogs` | **10** | el cuerpo de la tarjeta |
| `.cms-related-articles` · `.list-related-articles` | **10** | los envoltorios de la lista |

### Los que se parecen y NO son tuyos — aquí es donde se rompe el sitio

| Clase | Rutas | |
|---|---|---|
| `.card` | **89** | `.card related-blogs` lleva las dos. Engancha por `.related-blogs` |
| `.paragraph-mini` | **113** | el extracto del raíl la usa. Escálala desde `.cms-blogs-block` |
| `.button-styles` · `.w-dyn-item` | **114** | cromo global |
| `.w-richtext` | **27** | blogs + `/articles/*` + otras. Escálala desde `.blog-section` |
| `.secundary` | **25** | el «Read More» del raíl la lleva |
| `.hero-project` | **20** | las 10 fichas Y las 10 de `/project/`. Encargo aparte |
| `.container` | global | `max-width: 1250px`. Ni la mires |

**Regla, sin excepción: todo selector tuyo cuelga de `.blog-section`, `.wrapper-cms-blog` o
`.cms-blogs-block`.** Una sola regla suelta sobre `.card` repinta 89 páginas de otros frentes.

Cómo se cuenta —y **no** con `\b`, que no es frontera en un guion y ya dio 25 rutas donde había 1
(PARTE-04 §3)—:

```bash
node -e 'const fs=require("fs"),p=require("path");let n=0;(function a(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const q=p.join(d,e.name);if(e.isDirectory())a(q);else if(e.name.endsWith(".html")){const s=new Set();for(const m of fs.readFileSync(q,"utf8").matchAll(/class="([^"]*)"/g))for(const t of m[1].trim().split(/\s+/))s.add(t);if(s.has(process.argv[1]))n++}}})(".vercel/output/static");console.log(n)' TU-CLASE
```

El build de las 115 páginas **ya existe** — grepéalo, no lo reconstruyas.

## El diagnóstico, medido

Todo esto sale de `webflow.css`, que es lo único que pinta hoy la ficha:

```css
.blog-section      { background:#fffef5; padding:6em 2em; overflow:hidden }
.wrapper-cms-blog  { display:flex; gap:20px; justify-content:center; width:100% }
.blog-block        { width:70%; display:flex; flex-flow:column; gap:10px }
.cms-blogs-block   { width:30%; flex-flow:column; justify-content:flex-start; align-items:center }
.related-image     { object-fit:cover; width:100%; height:200px; margin-bottom:0 }
.wrapper-content-related-blogs { flex-flow:column; width:100%; padding:1em 1em 2em }
.paragraph-mini    { font-size:12px; line-height:130% }     /* ← 113 rutas */
.w-richtext figure { max-width:60%; position:relative }
.container         { width:100%; max-width:1250px }
@media (max-width:991px) { .wrapper-cms-blog{flex-flow:column} .blog-block,.cms-blogs-block{width:100%} }
```

| # | Lo medido | Por qué importa |
|---|---|---|
| 1 | **La medida de línea son ~830 px**: 70 % de (1250 − 2×2em). A `--mm-paso-3` (15-16 px) son ~115-125 caracteres por línea | El ideal tipográfico son 60-75. Es el defecto n.º 1 y el que se ve de golpe en la captura. **Y el token ya existe: `--mm-medida: 650px`, sin un solo uso en toda la ficha** |
| 2 | **El raíl no es pegajoso y el artículo mide varias pantallas más que él.** Medido en `/blogs/top-10-luxury-pool-designs-for-florida-homes`: 68 `<p>`, 18 `<h3>`, 5 `<h2>`, 12 `<ul>`, 4 `<figure>`. El raíl son 7 tarjetas ≈ 2.300 px | A partir de ahí queda un canal blanco del 30 % del ancho y miles de píxeles de alto. `position: sticky` es CSS puro y está dentro de tu techo |
| 3 | **`.w-richtext` no emite ni una regla de espaciado propia** dentro de la ficha: `h2`, `h3`, `p` y `ul` van con el margen por defecto del navegador | De ahí el muro. 5 `h2` y 18 `h3` sin jerarquía visible: el `h3` no se despega del párrafo anterior, así que el lector no ve dónde empieza cada apartado |
| 4 | **`figure { max-width: 60% }`** dentro de una columna de 830 px = ~500 px, centrada | Ni acompaña a la medida ni la rompe a propósito. Se queda en tierra de nadie, que es justo lo que enseña la captura |
| 5 | **Las 4 imágenes del cuerpo van sin `width` ni `height`**, solo `loading="lazy"` | Es CLS. El markup **no es tuyo**, pero `aspect-ratio` en CSS sí reserva el hueco. Ojo con la trampa del §«trampas» |
| 6 | **`padding: 6em 2em` sobre un cuerpo de 14 px** = 84/28 px, no 96/32 | Mismo defecto que ya se corrigió en el índice (R12-BLOG §4): el aire de sección no debe depender del tamaño del cuerpo |
| 7 | **En móvil el raíl cae detrás de 68 párrafos.** A ≤991 px `flex-flow: column` y `width:100%` | Nadie llega. `order` es CSS puro y §1.2 del programa lo pone explícitamente dentro del techo |
| 8 | **`.cms-blogs-block { align-items: center }`** con tarjetas de ancho variable | Borde derecho dentado contra una columna de texto que sí tiene borde recto |
| 9 | **El extracto del raíl a 12 px** con `line-height: 130%` | Es `--mm-paso-0`, el escalón más bajo, para el texto que compite con un artículo entero. Y `.paragraph-mini` pinta 113 rutas: escálala desde `.cms-blogs-block`, nunca a pelo |

## Qué se te pide — y aquí Sebastian pidió expresamente investigación

**Estudia cómo resuelven la ficha larga las publicaciones que de verdad se leen.** No copies:
extrae el principio. Lo que hay que mirar y traer razonado:

- **La medida y el ritmo.** Qué relación de espacio hay entre `h2`, `h3`, `p` y `ul` cuando el
  artículo tiene 23 encabezados. El ritmo vertical es lo que convierte un muro en una lectura.
- **Qué hace el raíl cuando el artículo es cinco veces más largo que él**: se pega, se convierte
  en índice, cierra con una llamada a la acción, o desaparece. Las cuatro son decisiones legítimas
  y tres de ellas son CSS puro.
- **Cómo se marcan 5 `h2` y 18 `h3` sin numerarlos con texto** —no puedes añadir texto—.
- **El tratamiento de la figura dentro de la medida**: a la medida, sangrada, o a sangre.
- **Dónde queda la llamada a la acción** en una ficha que hoy termina en `.cta-footer`, que es
  cromo compartido de 102 rutas y no es tuyo.

Trae **tres referencias** con lo que te llevas de cada una y por qué encaja en una marca navy y
oro que vende obra cara en Florida.

**Entrega dos variantes** en `src/pages/_lab-lectura.astro`, con el cuerpo REAL de
`/blogs/top-10-luxury-pool-designs-for-florida-homes` —68 `<p>`, 18 `<h3>`, 12 `<ul>`, 4 figuras y
el raíl de 7 tarjetas—: es el que rompe las maquetas, y una maqueta probada con tres párrafos de
relleno no prueba nada. Capturas a **1440, 991, 767 y 479**. **Para ahí** hasta que Sebastian elija.

## Lo que NO puedes tocar aunque lo veas — son defectos reales y son de texto

1. **El `h2` del raíl dice «Artículos Más Leídos», en español, en una página en inglés.**
   Verificado en `baseline/text/blogs_top-10-luxury-pool-designs-for-florida-homes.txt`. Es texto
   del baseline y `check:texto` compara `innerText` al 100 % sin tolerancia y **no se re-baseliniza
   nunca**. No se traduce en este encargo. **Va en `ABIERTO`.**
2. **El raíl enlaza al propio artículo que estás leyendo** — la 7.ª tarjeta lleva
   `a.button-styles.secundary.w--current`. **Y no lo puedes ocultar**: `display:none` saca el nodo
   de `innerText` y tumba la puerta. **Va en `ABIERTO`.**
3. **La ficha no tiene fecha, ni autor, ni tiempo de lectura.** Si crees que hacen falta —y en una
   guía de permisos y costes la fecha vale dinero— dilo en `ABIERTO`. Añadir texto no es tuyo.
4. **`text-transform: capitalize` NO es inerte en este sitio**: el marcado dice `What do we do!` y
   el baseline dice `What Do We Do!`. Mueve `innerText` de 114 páginas.
5. **Un índice por `counter()` + `::before` es tentador** con 5 `h2` y 18 `h3`. Antes de apoyarte
   en él, **mide si el `innerText` de Playwright ve el contenido generado**. Si lo ve, tumbas la
   puerta al 100 %. Un número sin el comando que lo produjo es una opinión, y eso vale igual para
   un «no cuenta».

## Presupuesto, tokens y capa

- **La capa va por 59,0 KB de 80** → **21,0 KB libres**, y los comparten todos los frentes vivos.
  Salida de `npm run check:tokens`, 2-sep. Tu techo práctico: **no pases de ~6 KB sin avisar.**
- Tokens que ya existen y te sirven: **`--mm-medida: 650px`**, `--mm-ancho: 1250px`,
  `--mm-alto-cuerpo: 1.4`, `--mm-alto-titulo: 1.2`, la escala `--mm-paso-0..6`, el espaciado
  `--mm-e-8..96`, los radios `--mm-r-8/16/24/pastilla`, las sombras `--mm-sombra-1..3`,
  `--mm-nav-alto: 85px`.
- **Token que falte, se PIDE al director** con su valor y por qué no vale uno existente: así se
  concedieron los cuatro de PARTE-04 §1. No lo declares tú — `check:tokens` prohíbe literales de
  color fuera de `disenio/tokens.css`, y esa hoja no es tuya.
- **El oro `#f4b248` da 1,86:1 sobre blanco**: ni texto de cuerpo ni estado.

## Trampas de CSS ya pagadas en este repo

- **`aspect-ratio` con la altura ya definida calcula el ANCHO** y desborda la columna. Con
  `.related-image { height: 200px }` puesto, esto te muerde en la primera regla.
- **La altura de una fila de tarjetas la fija la más larga.** El hueco no se quita centrando: se
  baja el `clamp` de la larga, y el cuerpo de la corta va en `cqw` o reaparece en tablet.
- **`min-width` 480 / 768 / 992** para lo tuyo, jamás mezclado con los `max-width` de Webflow, que
  tiene 326 reglas en `max-width:991`.
- **Cero `!important`, cero `@layer`**: `webflow.css` son 167 KB SIN capa, y toda regla sin capa
  gana a toda regla con capa. Ganas por **orden** — `lectura.css` entra en `Base.astro:77`, después
  de `webflow.css` (:30) y de `disenio/*` (:46-47), antes de `propio.css` (:102).
- **Ningún `opacity: 0` fuera de `html[data-anim]`; nunca `animation-fill-mode: forwards`.** Son
  las dos formas de reabrir el desastre de las animaciones por la puerta de atrás.

## Qué corres tú

`npm run check:tokens` (estática, sin navegador, <1 s: **córrela antes de cada informe y pega su
salida literal**) y tu propio `astro dev --port 4346` con el panel del navegador de Claude.

**No corres:** `npm run build` —sobrescribe el artefacto compartido que mide el director— ·
**`npm run paginas`** —regenera las 10 fichas desde `_source/vivo/` y se lleva por delante lo que
haya— · `git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

Cuando el director diga **«VENTANA DE PUERTAS»**, cierras el panel y dejas de escribir hasta que te
avise. Dos navegadores a la vez **matan** su corrida. Mientras no lo oigas, **trabajas**: no hay que
pedir permiso para escribir.

## Para el director — dos cosas que son suyas, no del trabajador

1. **Las 10 rutas `/blogs/*` NO están contratadas.** `disenio/contratos.json` tiene 88 rutas y
   **cero** de `/blogs/`. Mientras sigan como `paridad`, `check:visual` las mide contra el Webflow
   original y **se pondrán rojas en cuanto el diseño cambie** — rojo que no significa regresión.
   Hay que contratarlas antes de la primera corrida de puertas.

   ```bash
   node -e 'console.log(Object.keys(require("./disenio/contratos.json").rutas||{}).filter(r=>r.startsWith("/blogs/")).length)'
   ```

2. **`.hero-project` son 20 rutas** —las 10 fichas y las 10 de `/project/`— y hoy **no lo emite
   nadie**: `lectura.css` y `proyectos.css` tienen 0 reglas. La banda azul del héroe que se ve en
   la captura es Webflow puro. Tocarla es un encargo aparte y compartido con el lote de `/project/`.

## Informe

```
ENCARGO R12-FICHA · ESTADO listo|bloqueado|parcial · FICHEROS ruta:linea
ALCANCE     selector | rutas que pinta | el comando que lo produjo
NUMEROS     metrica | antes | despues | comando   (incluye 600 px y 767 px: ninguna puerta los ve)
MEDIDA      caracteres por linea a 1440 y a 992, medidos
CONTRASTES  par de colores | ratio medido   ·   TOQUE control | px medidos a 479
RIESGO A OTRAS  ·  ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.
