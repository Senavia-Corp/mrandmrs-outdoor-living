# Encargo — Implementar los arreglos técnicos de SEO (código, no arquitectura grande)

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5, réplica de un Webflow — lee
`docs/encargos/00-PRINCIPIOS.md` antes de nada). El diagnóstico ya está hecho:
[`docs/encargos/SEO-URLS-PLAN.md`](docs/encargos/SEO-URLS-PLAN.md) — léelo primero, entero.
Este encargo implementa la parte de ese plan que ya está decidida y es puro arreglo técnico.
Trabaja **de forma autónoma de principio a fin**: arregla, verifica con las puertas, actualiza
`MIGRACION-LOG.md` y **despliega a producción** al final. No pares a preguntar salvo que te
topes con algo destructivo, irreversible, o que caiga en "Fuera de alcance" más abajo.

## Qué SÍ se implementa aquí — con el mecanismo exacto (ya diagnosticado, no hace falta redescubrirlo)

### 1 · El único audit que le cuesta a Lighthouse el 100/100 de SEO: `link-text`
Verificado con Lighthouse 13.4.1: 92/100 en 4 de 6 plantillas medidas, un solo audit en rojo —
texto de enlace no descriptivo. Tres fuentes, tres arreglos distintos:

- **`src/data/servicios-categoria.json`** — el campo `"cta"` vale literalmente `"See More"` en
  las ~50 entradas del fichero. Lo consume `ServiciosPorCategoria.astro:62`
  (`import DATOS from '../../data/servicios-categoria.json'`) y lo pinta en
  `ServiciosPorCategoria.astro:144` (`<a class="svc-cta" ... set:html={sv.cta} />`) — **es
  dinámico**, arreglar el JSON basta, no hace falta tocar el componente ni regenerar nada.
- **`src/data/blogs.json`** — mismo patrón, campo `"cta": "Read More"` en sus 10 entradas,
  consumido por `CarruselBlog.astro` en las 14 páginas de `/services/*`. Arreglar el JSON
  también basta para esas 14.
- **`src/pages/index.astro`, constante `S_BLOG`** — la home **no** lee de `blogs.json` en este
  punto: `blogs.json` se extrajo UNA VEZ de este mismo `S_BLOG` (ver cabecera de
  `scripts/build-blogs.mjs`) y la home está en `NO_REGENERAR`, así que su copia quedó congelada
  y no se resincroniza sola. Las 10 apariciones de "Read More" dentro del HTML crudo de
  `S_BLOG` se editan a mano, directamente en ese fichero — es la única de las tres fuentes que
  lo necesita.

**Arreglo, para las tres**: no cambies el texto visible (el texto no se toca — Principio 2). Añade
distinción **fuera de lo visible**: `aria-label` (o `title`) en cada `<a>` con el nombre real
del servicio/post (ej. `aria-label="See more: Custom Aluminum Pergola Builders"`), que es lo
que Lighthouse y un lector de pantalla evalúan — el "See More"/"Read More" visible se queda
igual.

### 2 · 8 páginas `/project/*` con JSON-LD que no parsea — causa raíz encontrada
No es un problema de contenido: es un **carácter de control sin escapar** (un salto de línea
literal dentro de un valor de cadena JSON) en el campo `description`, heredado tal cual del
scrape de Webflow. Reproducido y confirmado en las 8:
```
Bad control character in string literal in JSON at position ~4xx (line 6 column ~2xx-3xx)
```
Rutas (todas en `src/pages/project/`, todas con el mismo patrón, en la constante `LD_CRUDO`):
```
luxury-pool-motorized-pergola-screens-south-florida.astro
luxury-pool-pergola-outdoor-living-south-florida.astro
luxury-pool-spa-screen-enclosure-north-florida.astro
luxury-pool-spa-with-screen-enclosure-north-florida.astro
luxury-pool-motorized-pergola-outdoor-kitchen-north-florida.astro
luxury-pool-motorized-pergola-screen-enclosure-north-florida.astro
luxury-pool-pergola-outdoor-kitchen-south-florida.astro
residential-pool-pergola-outdoor-dining-north-florida.astro
```
**Arreglo**: escapa los caracteres de control (`\n`, `\r`, `\t`) dentro de cada cadena de
`LD_CRUDO` a su forma válida en JSON (`\\n`, etc.) — es un arreglo puramente sintáctico, no
cambia ni una palabra del contenido. Verifica con `JSON.parse` sobre las 8 antes de darlas por
buenas (el mismo patrón de prueba que usaste para diagnosticar sirve para confirmar el arreglo).

**Esto rompe la paridad byte a byte a propósito, para estas 8 — y hay que decírselo a la
puerta.** `scripts/check-seo.mjs` ya sabe que estas 8 vienen rotas del origen: la línea
`if (e.__sinParsear !== undefined) continue; // los 8 rotos del origen: se replican crudos`
se salta la comparación de esos bloques en vez de exigir coincidencia. Una vez reparados,
o (a) quitas la marca `__sinParsear` de esas 8 entradas en `baseline/seo.json` y dejas que
`check-seo.mjs` las compare con normalidad (comparará contra el JSON-LD ya reparado, que tendrás
que reflejar también ahí), o (b) documentas explícitamente por qué siguen sin compararse. **No
lo dejes en silencio** — anota la desviación en `MIGRACION-LOG.md` con el mismo formato que D1/D2
(quién, cuándo, por qué), igual que exige el Principio 6.

### 3 · `/brochures` sin meta description ni JSON-LD
Ya tiene `<h1>` (confirmado: "Outdoor Living Brochures" en su `T0`) — el hueco es solo meta
description + un bloque JSON-LD razonable (`WebPage` o `CollectionPage`, mira qué usan páginas
de forma parecida, ej. `/gallery` o `/videos`, para no inventar una forma nueva). **Trampa**:
este fichero puede estar tocado por otra sesión ahora mismo (`git status --short` antes de
editarlo) — si lo está, coordina o deja este punto para el final.

### 4 · `<h1>` ausente en `/pool-cost-estimator` y `/pool-investment-estimator`
Las dos páginas de estimador. Añade un `<h1>` real describiendo la herramienta (no un `<h2>`
disfrazado con la clase visual de h1 — que sea semánticamente `<h1>`).

### 5 · CLS por encima de 0.1 en 3 plantillas
`/services/*` (0.176), `/where-we-serve` (0.153), `/pool-builders/*` (0.115) — medido con
Lighthouse contra el build de producción. Sin diagnosticar la causa exacta todavía: candidato
más probable son imágenes o tarjetas sin `width`/`height` (o `aspect-ratio`) reservado en esas
plantillas — **investígalo tú, esto sí hace falta descubrirlo**, con el propio Lighthouse
(`--only-categories=performance` contra el build en local, mismo método que
`docs/encargos/SEO-URLS-PLAN.md`) antes y después del arreglo para confirmar que baja de 0.1.

### 6 · Colisión `/where-we-serve` vs `where-we-serves/` — Tier 1 del plan, ya recomendado
Mueve las 2 páginas y añade los 2 redirects, tal cual los deja
`docs/encargos/SEO-URLS-PLAN.md § Mapa de redirects`:

| Actual | Nueva |
|---|---|
| `/where-we-serves/custom-pool-builders-north-florida` | `/where-we-serve/north-florida` |
| `/where-we-serves/custom-pool-builders-south-florida` | `/where-we-serve/south-florida` |

Añade los 2 redirects a `vercel.json` **como adición** a los 3 que ya hay, nunca los toques.
Actualiza los enlaces internos que apunten a las rutas viejas (busca en `src/` antes de mover
nada). Comprueba `scripts/check-enlaces.mjs` sigue en verde — ya valida que todo redirect
declarado exista y sea `permanent:true`.

### 7 · Las 3 páginas `/articles/*` huérfanas — enlázalas, la decisión del dominio es aparte
`/articles/accessibility`, `/articles/privacy-policy`, `/articles/terms-conditions` no tienen
NINGÚN enlace interno (confirmado por BFS sobre las 116 páginas). Esto se arregla **siempre**,
sin esperar a que Sebastian decida qué hacer con `mrandmrsoutdoorsliving.com` (punto 2 de
"Fuera de alcance"): una página sin un solo enlace que le apunte está mal igual, decida lo que
decida sobre el dominio. **Trampa, la misma que en `PROMPT-MENU.md`**: `Footer.astro` es SALIDA
GENERADA por `scripts/build-shell.mjs` desde el HTML vivo de `mrandmrsoutdoorliving.com` —
cualquier arreglo va en el generador (post-proceso), nunca a mano en `Footer.astro`, o se pierde
en el próximo `npm run shell`. No toques a qué dominio apunta el enlace legal existente (eso sí
es la decisión pendiente) — solo añade, en algún punto sensato del pie, enlaces a las 3 rutas
propias que hoy nadie referencia.

## Fuera de alcance — se reporta, no se toca

1. **La consolidación geográfica (Tier 2 del plan)** — 64 páginas (`/pool-builders/`,
   `/country/`, `/where-we-serves/`) repartidas en tres jerarquías sin relación. El propio plan
   dice que esto "no se decide aquí": necesita que Sebastian apruebe la forma exacta del nuevo
   slug antes de que nadie mueva un fichero.
2. **Qué hacer con `mrandmrsoutdoorsliving.com`** (el dominio con «s») — dos caminos posibles en
   el plan, cada uno depende de un hecho que solo Sebastian sabe (si ese dominio tiene una razón
   de negocio propia o no). No elijas uno por tu cuenta.
3. **Los 18 `<title>` y 10 meta description fuera de longitud** — acortarlos es reescribir
   texto, y el SEO de contenido va en otra sesión, con otro agente (así lo pidió Sebastian desde
   el principio). Señálalos en el informe final si quieres, no los toques.
4. **GSC/GA4, envío de sitemap, corte de DNS** — nada de esto es código; son pasos de
   lanzamiento que van en `docs/encargos/SEO-URLS-PLAN.md § Antes de publicar`, no aquí.
5. Cualquier cambio visual, de `.astro` fuera de lo listado arriba, o de contenido/copy.

## Trampas de este repo — léelas antes de tocar nada

- **Índice de git compartido, activamente** — la última vez que se miró había otra sesión
  tocando `brochures.astro`, los 9 `.astro` de `src/pages/country/` y varios más. `git status
  --short` antes de nada, y **nunca `git add -A`**: añade por ruta explícita solo lo que tú
  hayas tocado, `git status --short` otra vez justo antes de commitear.
- **Verifica siempre sobre lo construido** (`PUBLIC_ES_PRODUCCION=1 npm run build`, mide sobre
  `.vercel/output/static`), nunca sobre `astro dev` — así se generaron todas las cifras de
  `SEO-URLS-PLAN.md`, y así se deben confirmar los arreglos.
- **`Nav.astro`/`Footer.astro` son salida generada** de `scripts/build-shell.mjs` — arreglos de
  marcado van en el generador.
- **La home (`/`) está en `NO_REGENERAR`** — su `.astro` no se deriva más, se edita
  directamente (única excepción entre las 115+1 rutas).
- **Un número sin el comando que lo produjo es una opinión** (Principio 6) — cada "arreglado"
  en el informe final lleva al lado el comando que lo confirma.

## Verificar y desplegar

1. `npm run check` completo, en verde. Si alguna puerta ajena ya venía roja de antes (puede,
   dado el punto de arriba), dilo en el informe y no la maquilles.
2. Confirma con Lighthouse (mismo método que `SEO-URLS-PLAN.md`) que las plantillas que estaban
   en 92/100 de SEO ahora dan 100/100, y que el CLS de las 3 plantillas del punto 5 bajó de 0.1.
3. `git status --short` → añade **solo tus ficheros por ruta**, commits acotados y descriptivos
   en español, `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
4. `git push origin main`. El despliegue va por push — el MCP de Vercel da 403 en este
   proyecto, no lo intentes.
5. Espera al despliegue y verifica en `https://mrandmrs-outdoor-living.vercel.app` (no en
   local): confirma que los 2 redirects nuevos responden 301 hacia el destino correcto, y que
   las páginas movidas/arregladas sirven bien. El dominio del cliente
   (`mrandmrsoutdoorliving.com`) sigue en Webflow y no se toca.

## Entrega

Informe corto: qué se arregló con `fichero:línea`, las puntuaciones de Lighthouse antes/después
por plantilla, qué puertas quedaron en verde, la entrada nueva en `MIGRACION-LOG.md` para la
desviación de paridad del punto 2, y la URL del despliegue verificado. Cierra repitiendo,
explícitos, los 5 puntos de "Fuera de alcance" — para que quede claro qué de
`SEO-URLS-PLAN.md` sigue pendiente y de quién es la próxima decisión.
