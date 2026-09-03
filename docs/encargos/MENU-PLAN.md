# MENU — plan de trabajo

Diagnóstico: 38 agentes, 28 causas candidatas, **3 supervivientes tras refutación adversarial**
— y las tres son **la misma causa raíz**, hallada por tres lentes independientes (empírica con
Playwright, lectura de CSS, lectura de historia). Medido sobre el build servido en :4739, con
tacto real (`hasTouch`, `touchscreen.tap()`), 2 páginas × 3 anchos × 33 enlaces.

## La causa raíz

`src/components/Interacciones.astro:75` declara

    .w-nav-overlay[data-abierto] { position:fixed; inset:85px 0 0; z-index:9999; background:#00000059 }

con especificidad **(0,2,0)**. En `src/styles/webflow.css:10` vive

    .w-nav[data-animation=over-right] .w-nav-overlay { width:auto }
    .w-nav[data-animation=over-right] .w-nav-overlay,… { z-index:1; top:0; left:auto }

con especificidad **(0,3,0)**, y el `.navbar` sí lleva `data-animation="over-right"`. **Gana Webflow.**
Computado real con el menú abierto: `top:0; left:390px; width:0px; z-index:1` — un listón de **cero
píxeles** pegado al borde derecho, no el telón a pantalla completa que el código cree poner.

Pierde por ESPECIFICIDAD, no por orden: repetir el selector no basta, hay que subir a (0,4,0).

### Lo que eso rompe, medido

| # | Síntoma | Medida |
|---|---------|--------|
| A1 | Tocar fuera **no cierra** el menú | toque en (30,500) → `data-abierto` sigue puesto |
| A2 | El toque **atraviesa** a la página de detrás | @991 tocado «Get A Free Estimate» con el menú abierto → **navega a /request-estimated** |
| A3 | **Enlaces fuera de pantalla e intocables** | @390 los 3 últimos servicios (irrigation, steel, furniture); @991 esos 3 + soffit. Tras arrastrar sí navegan |
| A4 | El velo nunca se pinta | `background` correcto sobre superficie de área 0 |

**A3 es lo que el usuario reporta como «algunos links no funcionan».** El panel mide 85 px más que
la ventana (`height:100%` sobre un overlay pegado a `top:0`, más `margin-top:85px` de `.nav-menu`),
así que su último tramo cae fuera de pantalla y nada anuncia que se puede deslizar.

### Segunda causa independiente, también medida

**8 enlaces del menú miden 16 px de alto** (`/about`, `/where-we-serve`, `/industry-solutions`,
`/testimonials`, `/brochures`, `/videos`, `/pool-cost-estimator`, `/blogs-tips`) y
`/request-estimated` mide 32. El mínimo táctil son 44. Están separados 44 px entre sí, o sea que
**hay hueco de sobra para agrandar el área sin mover un píxel**.

Y `.mm-llamar` (botón flotante de llamada, z-index 900, hermano de `body`) **tapa parcialmente** el
enlace de Smart Soffit LED en x∈[316,362].

## Enlaces rotos — lo que hay de verdad

Barrido completo: 16.040 `<a href>` en 116 páginas.

- **345 apariciones**, 3 hrefs únicos, a `/commercial-services/…` → **404 real**. Salen todos del
  **menú**, no del pie: el texto de `check-enlaces.mjs:47-52` («342 enlaces en el pie y en los
  menús») es **falso**, y el conteo correcto es 345.
- **551 `href="#"`**: 114 del logo del pie, 433 de galería/lightbox (inertes — este build no carga
  `webflow.js` y `Interacciones.astro` no implementa `w-lightbox`), 2 correos muertos, 2 botones
  Back/Next que sí funcionan por JS propio.
- `mrandmrsoutdoorsliving.com` (con «s») **NO es errata**: responde **200** y sirve el «Terms of
  Service | Mr. & Mrs. Outdoor Living» real del cliente por Cloudflare. **No se toca.**

## Plan

| Fase | Qué | Dónde | Riesgo visual |
|---|---|---|---|
| 1 | Especificidad a (0,4,0) + `margin-top:0` en el panel + **quitar el velo** | `Interacciones.astro:75,88` | **ninguno** — el origen tampoco tiene velo |
| 2 | Área táctil a 44 px con `padding`+`margin` negativo | `Interacciones.astro` | ninguno — el hueco ya existe |
| 3 | Ocultar `.mm-llamar` con el menú abierto | `Interacciones.astro` | solo con el menú abierto |
| 4 | 3 × 301 a destinos reales + la puerta deja de perdonar | `vercel.json`, `check-enlaces.mjs` | ninguno |
| 5 | Logo del pie `#` → `/` | `build-shell.mjs` + `Footer.astro` | ninguno |
| 6 | Puerta `check:menu`, estática **y táctil**, probada en rojo antes de aplicar | `scripts/check-menu.mjs` | — |
| 7 | `npm run check`, commit acotado, `git push origin main`, verificar en producción | — | — |

**Quitar el velo en vez de dejarlo aparecer** es deliberado: nunca se ha pintado en la vida del
fichero, el Webflow de origen no lo tiene, y hacerlo aparecer sería un cambio de aspecto en 115
páginas que nadie ha pedido. El overlay captura el toque igual estando transparente.

### Destinos de los 301

| Roto | Destino | Por qué |
|---|---|---|
| `…commercial-pool-construction-…` | `/industry-solutions` | su `<title>` es literalmente «Commercial Pool Construction & Design-Build Contractors in Florida» |
| `…commercial-pool-contractors-…` | `/industry-solutions` | mismo público B2B: GCs, arquitectos, operadores, promotores |
| `…commercial-pool-renovations-…` | `/services/pool-remodeling-renovation-…` | correspondencia casi 1:1: las 6 features del origen son los H3 de esa página |

301 y no borrar: las 3 URLs llevan publicadas desde el 21-dic-2025 y hoy dan 404 en el dominio vivo;
un 301 recupera enlaces entrantes e indexación, borrar el `<a>` deja el 404 intacto. Además los 3
son el contenido **íntegro** del desplegable «Commercial»: borrarlos deja el apartado vacío, y eso
es decisión de negocio del cliente, no de migración.

## Fuera de alcance — se reporta, no se toca

- ~~433 anclas de galería/lightbox inertes~~ **FALSO. Corregido el 3-sep-2026 tras probarlo.**
  El lightbox existe en `src/components/Componentes.astro:40` y funciona en las 35 páginas y en las
  tres clases de ancla; el salto de scroll es 0 px. El informe dedujo que no había implementación
  porque buscó en `Interacciones.astro`. Lo único real: Anterior/Siguiente miden 40×40 bajo 768 px
  (mínimo 44, WCAG 2.2 AA 2.5.8).
- 2 `<a href="#">info@mrandmrsoutdoorliving.com</a>` que deberían ser `mailto:`.
- Dos fuentes de verdad para las páginas legales: el pie manda al segundo dominio mientras el sitio
  tiene `/articles/terms-conditions` y `/articles/privacy-policy` propias.
- `.mm-llamar` pisando controles en `/contact-us` (26-37 px): ya está en PARTE-04 §7 de otro frente.
