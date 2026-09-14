# R20-CIUDADES — Ocala y Gainesville captan el lead en su propia página

**Encargo:** de Sebastian, 14-sep-2026 · **Base:** `0ea89ee` · **Rama:** `claude/fervent-cannon-wvrghf`
**Fase 1:** las 2 landings de pago · **Fase 2:** las otras 51, en datos

---

## 1 · El problema, en una línea

`/pool-builders/ocala-florida` y `/pool-builders/gainesville-florida` son las Final URL de dos ad
groups activos. Su CTA salía a `/request-estimated`: **un segundo clic que el anuncio ya había
pagado**. Es la brecha que la matriz de Ads declara literalmente («Main Gap: sin formulario
propio», §2) y la única que las separaba de la ficha Core, que la cerró en R17-CORE → R19.

## 2 · Tres premisas del encargo que la medición corrigió

| # | El encargo decía | Medido |
|---|---|---|
| 1 | «Sin entrada los 4 widgets devuelven `null`» | **`CollageFaq` no: lanza `throw`.** Se monta condicionado, nunca suelto. Y `FormularioCore:81` leía `d.proyectos` **fuera** de su propio guard: montarlo en las 53 tiraba el build de las 51 con `TypeError`. Un `d?.` — el único cambio obligatorio en un componente |
| 2 | «`check:ads`: las 13 reglas» | **12 de 13.** El héroe de estas rutas (`.hero-glass-section`, 57 rutas) **no tiene `<img>`**: su fondo es un `<video>` autoplay con póster. La regla 12 modela un héroe de imagen; aplicarla aquí sería inventarse un selector para salir verde. Sale en PENDIENTE con su motivo. **Decisión de Sebastian: se deja el vídeo** |
| 3 | «migrar las 2 a contrato `rediseno`» | Ya lo eran desde el 31-ago-2026. Lo que había que hacer es **actualizar el `motivo`**, no el contrato |

Y una cuarta, que no estaba en el encargo: **`servicio-core.css` lo importa `Base.astro` en las
115 rutas** y sus `.svc-*` son selectores planos. Por eso esto cuesta **0 bytes de CSS**.

## 3 · Filtro de decisión — lo que entró y lo que no

| Cambio | Decisión | Por qué |
|---|---|---|
| `FormularioCore` con ancla `#estimate` | **MUST** | elimina el segundo clic pagado |
| Héroe: CTA → `#estimate`, 2 `tel:`, licencias | **MUST** | el teléfono lo ponía solo el cromo: un verde prestado de la regla 8 |
| `ConfianzaCore` delante del formulario | **MUST** | responde «¿por qué vosotros?» antes de pedir datos |
| Apoyo del héroe sin «pool remodeling» | **MUST** | la tercera línea de la primera pantalla ofrecía la puerta de al lado; la remodelación tiene su propia landing desde R19 |
| `InversionCore` | **MUST** | el coste es la objeción nº 1 y no tenía respuesta. Dos salidas reales, **ni una cifra** |
| FAQ + collage + `FAQPage` | **SHOULD alto** | 3 objeciones locales; los permisos por condado son relevancia local verificable |
| 2 CTA `.svc-cierre` | **SHOULD** | había 6 secciones seguidas sin camino a `#estimate` |
| Foto propia en el héroe | **NO CHANGE** | decisión de Sebastian: se deja el vídeo compartido |
| `section.gallery` | **NO CHANGE** | el carrusel de obra y el feed ya enseñan resultado |
| Subir las reseñas delante de `_3d-section` | **NO CHANGE** | la confianza ya está cubierta por logos + franja + intro **antes** del formulario. Se reporta |
| H1, `<title>`, meta | **NO SE TOCAN** | son decisión de pago de A3 |

## 4 · Orden resultante

```
 1 hero-glass-section  🟡  CTA → #estimate · 2 tel: (North primero) · licencias
 2 wrapper-logos       🔒
 3 svc-confianza       🟢  4 tarjetas · la 4ª nombra el condado
 4 trusted-section     🔒
 5 appointment-section 🟢  #estimate — el formulario
 6 _3d-section         🔒     7 animated-divs-section 🔒  → .svc-cierre 🟢
 8 projects-section    🔒     9 testimonial + reseñas 🔒
10 svc-inversion       🟢  2 CTAs, ni una cifra
11 faq-section         🟢  collage de 5 + 3 objeciones locales → .svc-cierre 🟢
12 blog · 13 feed · 14 cta-footer  🔒
```
Ninguna cadena deja más de 2 secciones sin paso siguiente.

## 5 · Cómo cuesta una ciudad: una fila

`src/data/ciudades-captacion.json` guarda lo único que cambia —`{slug, ciudad, condado, region,
collage, inversion}`— y `npm run captacion:ciudades` expande cada fila a su entrada completa en
`captacion-servicios.json` y en `collage-faq-por-ruta.json`. `npm run check:captacion` vuelve a
expandir y sale **rojo** si alguien editó a mano las entradas generadas.

**Entradas literales, no expansión al pintar:** `check-texto.mjs` (`readFileSync`) y
`api/formulario.ts` (`import`) leen el JSON **crudo**. Una expansión en `src/lib/` sería invisible
justo para los dos consumidores que dan de alta el texto declarado y la lista blanca del correo
del lead — y el fallo se vería en el lead que no llega.

Solo valen los 9 condados de `negocio.mjs`, **leídos del fuente, no copiados**. Una ciudad con un
condado que no esté en esa lista **para el generador**: no se inventa.

## 6 · Cada ciudad, su propio cubo de leads

| | Ocala | Gainesville |
|---|---|---|
| `data-name` | `Ocala Pool Builders Form` | `Gainesville Pool Builders Form` |
| Asunto del correo | `Ocala pool builders lead` | `Gainesville pool builders lead` |
| `data-mm-id` (GA4, acción de Turnstile) | `ocala` | `gainesville` |

Es la lección de R19: con un `data-name` compartido, catorce servicios llegaban indistinguibles.
**No se tocó ningún fichero compartido**: `FICHAS_CAPTACION` se deriva de las claves del JSON y
`aviso-correo.ts` cae en `tituloRespaldo`, que ya es el `aviso`.

## 7 · Las puertas, y los tres defectos que aparecieron al mirarlas

| Puerta | Cambio |
|---|---|
| `check:ads` | `formulario:{…}` en las 2 → **regla 13 activa**. **Regla 14 NUEVA**: el `FAQPage` casa 1:1 con los `<h3>` visibles. Regla 12 **NO APLICA**, con su motivo impreso |
| `check:seo` | **`BLOQUES_PROPIOS`**, tercera categoría junto a `PARTES_PROPIAS` y `JSONLD_ARREGLADO`: descuenta el `FAQPage` del baseline **y le exige** tipo, nº de entradas, nada vacío y **ninguna cifra de dinero** |
| `check:texto` | Casi nada a mano: `bloquesCaptacion()` ya era agnóstica de ruta. Se le añade el bloque de la FAQ (se distingue por `faq.titulo`, que solo traen las entradas que montan su propia sección) y el CTA de media página, con `rutas` **derivadas** del JSON |
| `check:estructura:ciudades` | **NUEVA**, estática, <1 s. Dos formas y solo dos: con captación y sin ella. Es lo que hace que la fase 2 no dependa de capturas |
| `disenio/contratos.json` | `motivo` ampliado en las 2. El contrato ya era `rediseno` |

**Tres defectos encontrados por el camino, los tres en puertas compartidas:**

1. **La regla 9 de `check:ads` no comprobaba nada.** `:180` borra todos los `<script>` del DOM
   para quedarse con el texto del cuerpo, y `:200` buscaba el JSON-LD **después**: recorría una
   lista vacía y salía verde. Arreglado recogiendo los bloques antes de vaciar.
2. **Las reglas 10 y 11 no veían una sola respuesta de FAQ.** En el marcado de Webflow la
   respuesta es un `<nav class="dropdown-list">`, y las dos reglas quitaban `nav` entero. La
   regla 11 existe **precisamente** porque «$75,000 … $500,000+» estuvo publicado dentro de una
   respuesta de FAQ: la puerta escrita para cazar eso no podía mirar donde pasó. Arreglado
   quitando el menú por su sección (`section.menu`) y no por la etiqueta. Medido: de los 8
   `<nav>` de la página, los 5 del menú cuelgan de `section.menu` y los 3 restantes son
   respuestas. Las otras dos landings siguen verdes.
3. **`FormularioCore` reventaba sin entrada** (§2.1).

**Las tres reglas nuevas se rompieron a propósito** antes de darlas por buenas (§9 del log).

## 8 · Score interno — NOT A GOOGLE METRIC

Derivado criterio a criterio de la rúbrica de la matriz §3, no estimado:

| Criterio | Máx | Antes | Después | Por qué |
|---|---:|---:|---:|---|
| Search Intent · H1/Hero · First 100 Words · Geographic · Trust | 60 | 60 | 60 | ya estaban al máximo |
| Semantic Service Coverage | 10 | 9 | 9 | el clúster no cambia |
| **CTA / Conversion Match** | 10 | **6** | **10** | `<form data-mm-envia="1">` propio con ancla `#estimate`. Se acaba el segundo clic. Mismo movimiento que Core, probado por `check:ads` regla 13 |
| **Commercial Intent / Scope** | 10 | **8** | **9** | la deducción decía «el cuerpo sigue siendo común»; ya no lo es: 4 de 13 secciones son propias de la ciudad y dos nombran su condado. El −1 que queda es real: 3D, Pool Features, obra, blog y feed siguen idénticos en las 53 |
| Mobile UX | 5 | 4 | 4 | **se mantiene**: laboratorio no es teléfono. Con criterio laxo saldría 96; no se hace |
| Technical / Performance | 5 | 3 | 3 | sigue `PRODUCTION PERFORMANCE VERIFICATION BLOCKED` |
| **TOTAL** | **100** | **90** | **95** | |

## 9 · Lo que queda para Sebastian

1. **Aprobar las capturas** de `audit/r20-ciudades/` con `aprobar-diseno.mjs` (exige humano y árbol
   limpio). Hasta entonces `check:visual` sigue rojo en las 2, y es **ROJO CORRECTO**.
2. **`generate_lead` en GTM.** Sigue a 0 en GA4 desde enero. No es de este repo y **bloquea el
   lanzamiento** de las cuatro landings, no solo de estas dos (matriz §0).
3. **El merge de la fase 2**, que queda en PR por decisión suya.
4. **Las ciudades marcadas** en la tabla condado → región de la fase 2, si alguna cae fuera de los 9.
