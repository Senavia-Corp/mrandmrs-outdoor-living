# R9-HERO — contexto técnico de los héroes con vídeo

Léelo antes de tocar cualquier héroe con vídeo. Vale para el de la home y para el de las 55
rutas de área de servicio. **Lee antes `00-PRINCIPIOS.md`**: lo de aquí no lo sustituye, lo
concreta para este subsistema.

Escrito el 3-sep-2026, después del rediseño (commit `d35b260`), con lo aprendido al hacerlo —
incluidos los dos fallos que costaron rehacer trabajo.

## 1. Cuáles son y dónde viven

Solo **2 patrones de héroe** usan `<video>` de fondo. Alcance medido por frontera de clase, no
por subcadena:

    grep -rl 'hero-glass-section' src/ | grep -v hero-glass-section-page

| Patrón | Rutas | Marcado | CSS |
|---|---|---|---|
| `.hero-glass-section-page.mm-hero` | **1** (`/`) | `src/pages/index.astro`, constante `S_HERO` | `src/styles/home.css` |
| `.hero-glass-section` | **55** | `src/data/plantilla-pool-builders.json` → `LIT[0][6]` (53 ciudades) + constante `T0` de los 2 `src/pages/where-we-serves/*.astro` | `src/styles/hero-zona.css` |

Los dos vídeos son distintos: home usa `bg-video-1-mp4.mp4`/`.webm`, y **las 55 rutas de zona
comparten** `bg-video-mp4.mp4`/`.webm`. Un cambio de velo en zona se ve igual en las 55.

**No son héroes con vídeo** (imagen estática o patrón distinto, fuera de este subsistema):
`services/*` (14), `country/*` (9), `project/*` + `blogs/*` (20), `where-we-serve.astro`
(singular, split 50/50) y las 8 páginas índice con `.hero-section` (ver `hero-indice.css`).

## 2. La trampa del contexto de apilamiento — EL VÍDEO DESAPARECE

Las dos secciones son `position:relative` **sin `z-index`**. El `<video>` lleva `z-index:-100`
de una regla base de Webflow y **solo se ve porque escapa hasta la raíz del documento**.

En cuanto la sección se convierte en contexto de apilamiento, el vídeo queda por debajo del
fondo de su propia sección y **desaparece**. Nunca declares sobre `.hero-glass-section-page`,
`.mm-hero` ni `.hero-glass-section`:

    z-index · transform · filter · backdrop-filter · opacity<1 · isolation · will-change

Por eso el velo se escribe como `background-image` **de la propia sección**, y no como capa
nueva ni pseudo-elemento. Está documentado también en `home.css:46-51`.

Comprobación más barata que abrir el navegador — si ninguna de esas palabras aparece sobre esos
selectores, la trampa no se ha pisado:

    grep -nE '\.(mm-hero|hero-glass-section)\b[^{]*\{[^}]*(z-index|transform|filter|backdrop-filter|opacity|isolation|will-change)' src/styles/home.css src/styles/hero-zona.css

## 3. El velo está ATADO a la posición del texto

Esto es lo que más fácil se rompe en silencio.

Las paradas del degradado no son decorativas: se fijaron **midiendo dónde cae cada elemento**
dentro del héroe, para que la banda oscura tape justo el texto que no tiene fondo propio.

| Fichero | Selector | Banda oscura (78 % de navy) |
|---|---|---|
| `home.css` | `.mm-hero` | de **27 %** a **73 %** de la altura |
| `hero-zona.css` | `.hero-glass-section` | de **20 %** a **74 %** de la altura |

Arriba y abajo de esa banda el velo se aclara a 18-35 %, que es donde el vídeo se aprecia. Se
aclara ahí **a propósito**: las badges van sobre pastilla blanca opaca y los botones sobre
dorado/blanco opacos, así que **no dependen del velo para leerse**. El h1, el h2 y el párrafo
sí: son blancos directamente sobre el vídeo.

🚨 **Si mueves o redimensionas el texto, la banda deja de coincidir con él y el contraste se
rompe sin que ninguna puerta lo diga.** Ya pasó: el primer intento puso la banda desde el 62 %
cuando el h1 caía en 29,4-56,9 %, y el titular quedó sobre la zona clara — ilegible, y detectado
solo al mirar la página construida. Después de cada cambio de tamaño o espaciado: **re-medir y
re-calibrar**.

### Suelo de contraste, medido

El peor píxel real bajo la caja del texto es **blanco puro** (la piedra del borde de la
piscina), y aparece en aproximadamente la mitad de los fotogramas muestreados a 1 fps. Ojo con
esto y con `00-PRINCIPIOS.md` §4: el contenido del vídeo cambia mucho a lo largo del bucle, así
que **muestrear un fotograma no vale**; `home.css` documenta 26,4 s de bucle para el de home.

- Alfa navy mínimo para que el texto blanco llegue a **4,5:1** sobre blanco puro: **60,3 %**
  (independientemente coherente con el 61 % que ya tenía documentado `home.css`).
- Con el 78 % actual, medido con canvas sobre el fotograma en vivo: **8,09:1** en la caja del h1
  y **8,32:1** en la del párrafo. Sobra margen, y por eso la banda no baja de 78 % donde hay
  texto sin fondo propio.
- Un velo navy es **más débil que uno negro al mismo alfa** porque el azul aporta luminancia. La
  casa pide navy, así que el alfa sube.

### Cómo se mide (pégalo en la consola del build servido)

    // 1. dónde cae el texto, en % de la altura del héroe
    const hero = document.querySelector('.hero-glass-section');   // o .hero-glass-section-page
    const r = hero.getBoundingClientRect();
    const pct = el => { const b = el.getBoundingClientRect();
      return [((b.top-r.top)/r.height*100).toFixed(1), ((b.bottom-r.top)/r.height*100).toFixed(1)]; };

    // 2. ancho que necesita un titular para N líneas
    const cs = getComputedStyle(h1);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    ctx.measureText(h1.textContent.trim()).width / 2;   // ancho para 2 líneas

    // 3. contraste real: vuelca el frame a canvas, busca el píxel MÁS CLARO bajo la caja del
    //    texto, mézclalo con navy (0,28,99) al alfa del degradado y aplica la fórmula WCAG
    //    (linealizar sRGB, pesos 0.2126/0.7152/0.0722). Repetir en varios segundos del bucle.

## 4. Radio de impacto de las clases

Antes de escribir una regla, mide a cuántos ficheros llega. Las que importan aquí:

| Clase | Ficheros | Consecuencia |
|---|---|---|
| `.wrapper-buttons-center` | **67** | Regla suelta = re-alinea todos los CTA del sitio. **Siempre acotada** bajo `.mm-hero` o `.hero-glass-section`. |
| `.hero-home-block` | los **2** héroes | Es la misma clase en los dos marcados. Cada fichero escribe **su mitad** (`.mm-hero .hero-home-block` en home.css, `.hero-glass-section .hero-home-block` en hero-zona.css), con los mismos valores, a propósito. |
| `.button-styles` | 59 | Por eso todo cuelga de un ancla de héroe. |
| `.heading-hero` | 23 | Ídem. |

**Propiedad de ficheros:** `home.css` declara posesión exclusiva de todo lo que cuelga de
`.mm-hero` (1 ruta). `hero-zona.css` es el equivalente para `.hero-glass-section` (55 rutas), y
existe precisamente porque meter 55 rutas en un fichero llamado `home` mentiría sobre su
alcance — el error histórico que ya documenta `blog.css`.

## 5. Ficheros derivados: la trampa de la regeneración

- Los 2 de `where-we-serves/` eran `DERIVADO` (los generaba `scripts/build-paginas.mjs` desde
  `_source/vivo/*.html`). Están **promovidos a edición a mano** desde el 3-sep-2026, igual que
  `index.astro`. **`npm run paginas` los sobrescribe** — pasó una vez durante el rediseño y se
  perdieron las ediciones. La advertencia está en la cabecera de cada uno.
- Las 53 páginas de ciudad salen de `plantilla-pool-builders.json`. El héroe vive en
  **`LIT[0][6]`** (no en `[0][0]`: ese corta justo antes de abrir el `<h1>`). `LIT[0]` alterna
  literales (índices pares) y `null` que se rellenan desde Sanity vía `CAMPOS[0]`.
  Tras editarlo: `node -e "require('./src/data/plantilla-pool-builders.json')"`.
- `webflow.css` es generado (`scripts/build-css.mjs`). No se edita: se sustituye por orden de
  carga desde la capa de diseño.

## 6. Estado conocido y deuda abierta

- **`check:texto` está en rojo para estos héroes, y es esperado.** El rediseño añadió un segundo
  botón («Project Gallery», a `/gallery`, con el estilo `.button-styles.secundary` que ya
  existía sin usar) por decisión explícita de Sebastian el 3-sep-2026. Eso es texto nuevo, y
  `00-PRINCIPIOS.md` §2 dice que el texto no se toca y que el baseline **no se re-baseliniza
  nunca**. La contradicción es real y **la resuelve Sebastian, no tú**: no re-baselinices por tu
  cuenta ni quites el botón.
- La clase `.yellow` del h2 de zona es un resto de Webflow: **no pinta amarillo**, pinta blanco
  por su propia regla. No la renombres (movería marcado en 55 rutas por cosmética).
- `.glass-effect-block` (la caja de vidrio) se quitó del marcado en las 3 fuentes. Su regla
  sigue en `webflow.css`, inerte, y solo aplicaba bajo `max-width:767px`. Es código muerto
  esperado; no toques `webflow.css` para limpiarlo.

## 7. Cómo se verifica

- **Construir y comprobar sobre el build, nunca sobre `npm run dev`**: dev no hornea
  `width`/`height` y las medidas mienten. `npm run build` escribe en
  **`.vercel/output/static/`** (no `dist/`: el proyecto usa `output:'static'` + adaptador de
  Vercel). Sírvelo estático y mide ahí.
- Puertas del repo, en orden de utilidad para este subsistema:
  `npm run check:tokens` (cero `!important`, cero `@layer`, solo `var(--mm-*)`, `min-width`
  480/768/992) → tiene que salir **PUERTA VERDE**;
  `npm run check:rutas` (115/115 construidas);
  `npm run check:visual` (debe marcar las 56 rutas del alcance y **ninguna fuera** — si marca
  otra, es fuga de scope, sospecha de una regla sin acotar);
  `npm run check:texto` (ver §6: rojo esperado en estos héroes).
- Matriz mínima de anchos: **1920 / 1440 / 1280 / 991 / 768 / 390**. Los dos sistemas de
  breakpoints conviven y no se mezclan: la capa de diseño usa `min-width` 480/768/992, Webflow
  usa `max-width` 479/767/991.
- En zona, prueba con la ciudad de nombre **más largo y más corto** (p. ej.
  `palm-beach-gardens-florida` contra `ocala-florida`): el h1 sale de Sanity y cambia de largo
  en las 53.

## 8. Aviso operativo: hay otra sesión trabajando en este repo

Durante el rediseño había **otra sesión de Claude Code** en el mismo directorio (blog, galería,
mosaico de confianza, country, services). Costó tres incidentes reales:

1. Una regeneración (`npm run paginas`) pisó los 2 ficheros de `where-we-serves` editados a mano.
2. Un `git reset` ajeno borró **todo** el trabajo sin commitear, incluido un fichero nuevo.
3. Un `git add` ajeno se coló en un commit propio: el índice de git es **compartido por el
   repositorio**, no por sesión, así que `git commit` recogió 4 ficheros de la otra sesión.

Disciplina que se deriva de eso:

- Commitea **pronto**, no al final.
- Estagea **siempre por ruta explícita**. Nunca `git add -A` ni `git add .`.
- Mejor aún: `git commit <rutas> -m "…"`, que acota el commit a esas rutas pase lo que pase con
  el índice.
- Verifica **siempre** con `git show --stat HEAD` que el commit lleva solo lo tuyo.
