# PARTE DE DIRECCIÓN 04 — respuestas a los cinco informes

Cinco informes a la vez. Todo lo que pedíais era mío y ya está hecho. Aquí van las respuestas
cruzadas, para no repetirlas cinco veces.

## 1. LOS CUATRO TOKENS QUE PEDISTEIS: concedidos

Están en `disenio/tokens.css`, cada uno con su motivo y su medida:

| Token | Valor | Quién lo pidió y por qué no valía uno existente |
|---|---|---|
| `--mm-nav-alto` | `85px` | HERO-INDICE. Era el `margin-top` mágico del nav `fixed`, literal repetido en `webflow.css`. Re-declararlo en una hoja de sección habría sido **mudar el número de sitio**, no quitarlo |
| `--mm-paso-campo` | `16px` | CONTACTO. Es un **suelo**, no una preferencia: por debajo de 16 px iOS Safari hace zoom al enfocar un campo. `--mm-paso-1` da 14 hasta 992 |
| `--mm-error` | `#b3261e` | ESTIMACION. **6,54:1 sobre blanco y 5,75:1 sobre `--mm-fondo-tenue`**: vale como texto y como borde en los dos. Descartado `#d92d20` (4,83 y **4,25** — solo servía de borde) |
| `--mm-ancho-galeria` | `1600px` | GALERIA. Los 1250 px de Webflow dejaban la rejilla en el 65 % de una pantalla de 1920 |

## 2. LOS CONTRATOS: concedidos

`/gallery` · `/brochures` · `/projects` · `/request-estimated` pasan a `rediseno`, más
`/blogs-tips` que ya estaba. Total: **88 rutas**.

`/projects` no tiene trabajo propio —su lote sigue pausado— pero lo arrastra el héroe de las 8
páginas índice: su captura cambia igual, y sin contrato la puerta la mediría contra el Webflow
original.

**`/` se ACTUALIZA, no se sustituye.** Su motivo ahora acumula el del héroe **delante** del de
R9-BLOG-01 y D2. Si se pierde el texto viejo, esas dos entregas dejan de ser auditables en la
misma captura que las contiene. Gracias al frente que lo planteó así.

Los cuatro nuevos llevan `sha: "por-asignar"`: vuestro trabajo está en el árbol sin commitear.

## 3. 🚨 DOS ERRORES MÍOS EN LOS ENCARGOS, y la trampa que los causó

Dos frentes los midieron por separado y los verifiqué:

| Clase | Yo decía | **Medido** |
|---|---|---|
| `.text-field` | 2 rutas, de ESTIMACION | **1 ruta: solo `/contact-us`. Es de CONTACTO** |
| `.submit-button` | el botón de envío, verde menta | **0 rutas. No existe en las 115** — el menta `#3cd3ad` y el morado `#6c33da` son CSS muerto; el botón real es `.button-styles` |

**La causa, y merece quedar escrita:** conté con `grep -E 'class="[^"]*\btext-field\b'`. En una
expresión regular `\b` es frontera de **palabra**, y **el guion no es carácter de palabra**, así
que `\btext-field\b` casa dentro de `text-field-form`. Lo mismo con `\bform\b` (da 6; `.form` es
1) y `\bgallery-page\b` (da 25 por `slider-gallery-page`; es 1).

**Una clase se cuenta partiendo el atributo `class` por espacios y comparando el token entero.**
Ni `\b`, ni subcadena. Corregido en R12-EST, R12-CON y PARTE-02 §3.

## 4. `src/pages/lab/[v].astro` ES SEGURO — probado, no supuesto

Dos frentes avisaron de que rompería `check:rutas` por no llevar guion bajo. **No lo rompe**, y
juzgaron por el nombre del fichero sin leer su guarda: `getStaticPaths` devuelve lista vacía fuera
de `DEV`. Construido en un árbol aislado con la mirilla y los ocho laboratorios dentro:

```
HTML emitidos: 115        (tienen que ser 115)
HTML con 'lab' en la ruta: 0
check:rutas: PUERTA VERDE
```

Lo único que sí emite son 3 hojas CSS sueltas en `_astro/` de los `<style>` de los laboratorios.
Peso muerto, no ruta. **Borrad vuestro laboratorio en el commit de vuestro encargo.**

## 5. El baseline del héroe SÍ es determinista — no hace falta tocar `asentar()`

Aviso recibido: «el héroe es de vídeo, si `asentar()` no fija `currentTime` dos corridas capturan
fotogramas distintos». **Ya lo fija**, desde antes de este programa:

```js
scripts/lib/captura.mjs:196
document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; });
```

Siempre el fotograma 0. Vuestro banco de pruebas necesitaba `currentTime = 6` porque no ejecuta
`asentar()`; la puerta sí. **No se toca `captura.mjs`**: cambiar la receta invalidaría el
significado de las 460 referencias del baseline.

## 6. TRAMPAS DE MEDIDA que habéis encontrado y que os sirven a todos

Las tres salieron de frentes distintos y las tres son reales:

- **Con el panel del navegador OCULTO no hay `requestAnimationFrame`**, así que las transiciones se
  congelan en el fotograma 0 y `getComputedStyle` devuelve el valor de PARTIDA para siempre.
  Cualquier propiedad bajo `transition` se lee mal. Dio dos falsas alarmas seguidas.
- **Una medida de geometría sobre un elemento con reveal es ruido.** `scale(.75) → none` corre
  1000 ms sobre `.header-hero-page` y la misma hoja llegó a dar dos firmas distintas de sí misma.
  Se mide con el sello `data-anim` retirado.
- **`.focus()` desde JS no dispara `:focus-visible`** y devuelve el anillo del navegador. El foco
  se verifica con **tabulador real**. Ese falso positivo destapó un hueco de verdad.

## 7. LO QUE NO TIENE DUEÑO Y NO ES DE NADIE DE VOSOTROS

Anotado para decidir con Sebastian. **No lo toquéis**; si os cruzáis, medidlo y decidlo en `ABIERTO`:

- 🚨 **El CTA se sale de la pantalla en móvil con el captcha pintado.** `Formularios.astro:57`
  inserta el widget como hermano del botón dentro de un `flex; justify-content:center`, y quedan
  lado a lado: `scrollWidth 485` contra ventana de 479; `433` contra `375`. ESTIMACION lo arregló
  en su ruta. **`/contact-us` monta el mismo widget con el mismo JS y nadie lo posee.**
- **`.footer` lleva el mismo `linear-gradient(#1cadeb, #1d4bbf)`** que el panel del formulario, en
  **113 rutas**: arrastra el mismo 2,55:1 en su mitad alta.
- **Anillo de foco en ORO en 114 rutas.** `Componentes.astro:65`, el lightbox:
  `outline: 3px solid var(--yellow-1)` = **1,86:1**. El criterio lo prohíbe por nombre.
- **`.mm-llamar`** (114 rutas) pisa controles del formulario: 26 px sobre «First name» a 479,
  37 a 600 y 767.
- **La casilla del SMS sigue en 13×13** en `/contact-us`: ESTIMACION acotó su arreglo a
  `.appointment-section`. Es un hueco del reparto, no un fallo suyo.
- **`.w-form-fail`** sale en 6 rutas y solo se arregló una.

## 8. El presupuesto de capa se está agotando

**56,1 KB de 80** con frentes todavía escribiendo. `check:tokens` se pondrá roja sola cuando se
pase. Si vuestra hoja es grande, mirad antes de crecer: el tope existe porque una capa de autor
que pase de la mitad de `webflow.css` (167 KB) ya no está elevando Webflow, lo está reescribiendo.
