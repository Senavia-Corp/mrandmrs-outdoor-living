# ENCARGO — FONDO AGUA: un solo fondo azul para todas las secciones no blancas

**Repo:** `~/Sites/mrandmrs-outdoor-living` (Astro 5 estático, Vercel, 115 rutas, CSS propio sin React).
Lee `CLAUDE.md` y `docs/encargos/00-PRINCIPIOS.md` antes de tocar nada.
Aprobado por Sebastián el 12-sep-2026 sobre la propuesta visual: **variante B (base + cresta + grano)**
y **la foto fuera del todo**.

---

## 1 · Qué se arregla

Hoy hay **cuatro** tratamientos azules distintos y ninguno casa con los otros:

| sección | fondo de hoy | rutas |
|---|---|---|
| `.trusted-section` | `animateddivs-image.webp` + velo navy 50 % (`intro.css:47`) | 80 |
| `.gallery` | la misma webp, reserva `--mm-azul-500` (`propio.css:261`) | 24 |
| `.testimonial-section` | `testimonial-image.webp` — foto teñida de MORADO | 83 |
| `.cta-footer` / `.cta-page-section` | `cta-footer-image.webp` | 108 / 12 |
| `.footer` | `linear-gradient(#1173b5, #1d4bbf)` (`propio.css:214`) | 120 |
| `.hero-project` | la misma webp + velo navy 35 % (`propio.css:379`) | 25 |
| `.hero-about` | `linear-gradient(0deg, --upcolor, --downcolor)` | 1 |

Y el webp tiene un defecto latente: es una imagen de proporción fija con `background-size:cover`,
así que **la onda se estira o se recorta según el alto de cada sección**. No es el mismo gesto
en dos sitios. Se sustituye por vector anclado al borde superior.

---

## 2 · El sistema: «Fondo Agua»

Concepto: **profundidad**. Construyen piscinas; el agua es clara donde cubre poco y honda donde
cubre mucho. Toda banda azul del sitio es un corte del mismo cuerpo de agua — clara arriba,
honda abajo. Eso fija la dirección del degradado (hoy va al revés en el pie que en la banda de
confianza) y hace que toda sección azul termine en el mismo navy, así que el corte contra la
sección blanca siguiente siempre es limpio.

Tres capas, **ningún color nuevo**, **cero assets de red**:

1. **Base** — degradado de 5 paradas de la rampa H223. Escala con el alto de la sección.
2. **Cresta** — dos curvas navy superpuestas en SVG data-URI. **Alto FIJO de 340 px anclado
   arriba**: es lo que arregla el estiramiento.
3. **Grano** — `feTurbulence` desaturado al 5 %. Es la textura pedida, y de paso mata el
   bandeado del degradado en pantallas de 8 bits.

### El techo del degradado no es una elección estética

`--mm-azul-400 #3767e1` da **5,01:1** con blanco encima. Es el paso MÁS CLARO de la rampa que
aguanta texto blanco a WCAG AA. Por encima, el blanco suspende. La parada del 0 % es ese paso
porque la paleta lo decide, no el ojo. No lo subas.

| parada | token | hex | blanco encima |
|---|---|---|---|
| 0 % | `--mm-azul-400` | `#3767e1` | 5,01:1 AA |
| 17 % | interpolada | `#2a55cf` | 6,11:1 AA |
| 37 % | `--mm-azul-500` | `#1d4bbf` | 7,47:1 AA |
| 66 % | `--mm-azul-600` | `#0e37a0` | 10,13:1 AAA |
| 100 % | `--mm-azul-800` | `#002175` | 14,24:1 AAA |

La cresta solo OSCURECE (navy al 17 % y al 11 %): todo punto bajo ella sube de ratio, nunca
baja. El grano es gris al 5 %, mueve la luminancia ±3 %, y el punto peor del sistema —el 0 %
con el grano aclarando— queda en **4,86:1**. Cumple. Mídelo tú, no te fíes de esta línea.

---

## 3 · El código

### 3.1 · `src/styles/disenio/tokens.css` — las tres capas

Van AQUÍ y solo aquí: `check:tokens` regla 3 prohíbe literales de color fuera de este fichero,
y los data-URI llevan `%23001c63` dentro. Colócalas junto al bloque
«EL DEGRADADO DE LA BANDA CTA», que es su hermano.

```css
/* ── EL FONDO AGUA — la superficie azul única del sitio ─────────────────────
 * Sustituye a los cuatro tratamientos de R13. Tres capas, cero assets de red.
 * CONCEPTO: profundidad. Clara en superficie, honda en el fondo.
 * El techo es --mm-azul-400 porque es el paso más claro de la rampa que aguanta
 * texto blanco (5,01:1). No es gusto: es el límite de la paleta. */
--agua-profundidad: linear-gradient(180deg,
  var(--mm-azul-400)  0%,    /* blanco encima  5,01:1 */
  #2a55cf            17%,    /* blanco encima  6,11:1 — interpolada, H223 */
  var(--mm-azul-500) 37%,    /* blanco encima  7,47:1 */
  var(--mm-azul-600) 66%,    /* blanco encima 10,13:1 */
  var(--mm-azul-800) 100%);  /* blanco encima 14,24:1 */

/* Dos curvas navy superpuestas: el solape crea tres tonos y eso es lo que lo
 * hace leer como un menisco y no como una onda de dibujo animado.
 * viewBox de 340 de alto + preserveAspectRatio='none': la clase le da alto FIJO
 * en px, así que la curva cae a la misma distancia del borde superior en una
 * sección de 260 px y en una de 900. Es el defecto del webp que esto cierra. */
--agua-cresta: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 340' preserveAspectRatio='none'%3E%3Cpath d='M0,0 H1440 V62 C1290,50 1170,80 1000,100 C830,120 690,116 500,106 C330,97 160,74 0,70 Z' fill='%23001c63' opacity='.17'/%3E%3Cpath d='M0,0 H1440 V94 C1290,82 1170,112 1000,132 C830,152 690,148 500,138 C330,129 160,106 0,102 Z' fill='%23001c63' opacity='.11'/%3E%3C/svg%3E");

/* Gris al 5 %. Mueve la luminancia ±3 %: el punto peor del sistema queda en
 * 4,86:1, que sigue siendo AA. Sin él el degradado se bandea a 8 bits. */
--agua-grano: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
```

### 3.2 · `src/styles/propio.css` — la clase

```css
.trusted-section,
.gallery,
.testimonial-section,
.cta-footer,
.cta-page-section,
.hero-project,
.hero-about,
.footer {
  background-color: var(--mm-azul-800);   /* reserva: si un data-URI fallara, sigue cumpliendo 14,24:1 */
  background-image: var(--agua-cresta), var(--agua-grano), var(--agua-profundidad);
  background-repeat: no-repeat, repeat, no-repeat;
  background-position: top center, top left, top center;
  background-size: 100% 340px, 180px 180px, 100% 100%;
}
@media (max-width: 767px) {
  /* 340 px de cresta comprimidos en 375 px de ancho dan una curva demasiado
   * empinada. El ancla sigue siendo absoluta dentro de cada banda. */
  .trusted-section, .gallery, .testimonial-section, .cta-footer,
  .cta-page-section, .hero-project, .hero-about, .footer {
    background-size: 100% 220px, 180px 180px, 100% 100%;
  }
}
```

`background-image` y NUNCA el atajo `background`: resetearía el `background-color` de reserva.

### 3.3 · Lo que hay que RETIRAR

- **`intro.css:47`** — el velo `box-shadow: inset … --mm-navy 50%` de `.trusted-section`.
  Existía para rescatar el contraste sobre la foto. Sin foto sobra, y además oscurecería el
  degradado fuera de sus ratios medidos. **Bórralo y deja el comentario explicando por qué.**
- **`propio.css:379`** — el mismo velo al 35 % de `.hero-project`. Igual.
- **`propio.css:261`** — `.trusted-section, .gallery { background-color: var(--mm-azul-500) }`.
  Lo absorbe la clase nueva.
- **`propio.css:214`** — el degradado del `.footer`. Lo absorbe la clase nueva.
- **Las fotos.** `testimonial-image.webp` y `cta-footer-image.webp` no se referencian fuera de
  `webflow.css` (comprobado): quedan huérfanas y **se retiran de `public/images/site/`**.
  `animateddivs-image.webp` **SE QUEDA**: la usan `obra.css`, `antes-despues.css` y
  `_lab-obra.astro`. No la toques.

`webflow.css` es DERIVADO (`build-css.mjs`), **no se edita**: se gana por orden de carga.

### 3.4 · Dos cosas que hay que comprobar, no suponer

- `.cta-footer` y `.cta-page-section` traen `color: var(--blue_dark)` de Webflow. En el CTA de
  la home todo el texto vive dentro de una tarjeta blanca, así que esa declaración es inerte —
  **pero verifícalo en las 12 rutas de `.cta-page-section`**, no solo en la home. Si hay texto
  suelto sobre la banda, es navy sobre azul hondo: pásalo a `--mm-tinta-inversa`.
- `.hero-about` tiene un párrafo NEGRO sobre el degradado (`propio.css:397` documenta que
  oscurecer sube el h2 y hunde el párrafo). Sobre el fondo nuevo, negro sobre `#3767e1` da
  **1,47:1**. **Ese párrafo pasa a blanco**, y se mide.

---

## 4 · Lo que NO entra

- Tipografía, espaciado, jerarquía, copy: nada. Esto es solo el fondo.
- Las tarjetas de reseñas, el carrusel y sus flechas: no se tocan.
- El oro sigue siendo solo fondo de CTA. `tokens.css` ya lo dejó por escrito y no se rediscute.
- El nav. No es una sección.

---

## 5 · 🚨 El coste, que es el punto caro del encargo

La unión de las rutas afectadas es **prácticamente las 115**. Derívala tú antes de medir, no la
supongas:

```bash
grep -rlE 'class="[^"]*\b(trusted-section|gallery|testimonial-section|cta-footer|cta-page-section|hero-project|hero-about|footer)\b' \
  .vercel/output/static --include='*.html' | wc -l
```

**`check:visual` va a salir en rojo en todas ellas y hay que re-baselinizar el sitio entero.**
Es el mismo caso que R12-CON documentó en `propio.css:208` cuando cambió el pie en 113 rutas.
`npm run build`, el commit y el despliegue son del director (`CLAUDE.md` §3): entrega el diff y
para si tu encargo no te los autoriza.

---

## 6 · Verificación

```bash
npm run check:tokens      # SIEMPRE, <1 s. Si sale rojo por un literal, es que metiste
                          # un data-URI fuera de disenio/tokens.css
npm run check:assets      # confirma que retirar las dos webp no deja referencias colgando
npm run check:rutas && npm run check:enlaces
node scripts/check-visual.mjs '=/'    # con comillas; zsh se come `=/` suelto
```

Sobre `.vercel/output/static`, **nunca** sobre `astro dev` — dev no hornea `width`/`height` y
las medidas mienten.

**Mide el contraste de verdad**, capturando la caja realmente pintada con los flotantes
ocultos, como hizo R13. Los mínimos: el peor punto del sistema ≥ 4,5:1 para texto normal, y
≥ 3:1 para lo que identifique un control. Una puerta que no corrió **no** es una puerta verde:
si se salta por falta de referencia, dilo — falla ABIERTO.

---

## 7 · Entrega

Diff + la tabla de ratios medidos (no estimados) en las tres familias: `.trusted-section`,
`.testimonial-section` y `.footer`, a 479 / 991 / 1440 / 1920. Y el número exacto de rutas que
hay que re-baselinizar.
