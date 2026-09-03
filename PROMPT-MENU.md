# Encargo — Menú y pie: que TODOS los enlaces funcionen, también en móvil

Repo: `~/Sites/mrandmrs-outdoor-living` (Astro 5, réplica de un Webflow).
Trabaja **de forma autónoma de principio a fin**: diagnostica, arregla, verifica con puertas
y **despliega a producción** al final. No pares a preguntar salvo que te topes con algo
destructivo o irreversible que no esté cubierto aquí.

## Síntoma que hay que cerrar

En móvil hay enlaces del menú que **no navegan**. Además quiero la certeza de que **todas**
las rutas del menú y del pie apuntan a páginas que existen. Hoy no es así: hay **342 enlaces
a `/commercial-services/…` que dan 404** y están tapados como "rotos en el origen".

---

## Trampas de este repo — léelas antes de tocar nada

1. **`src/components/Nav.astro` y `src/components/Footer.astro` son SALIDA GENERADA.**
   Los escribe `scripts/build-shell.mjs` desde el HTML vivo de `mrandmrsoutdoorliving.com`.
   Editarlos a mano funciona hasta que alguien corre `npm run shell` y se lo lleva por delante.
   → Todo arreglo de marcado va **en el generador** (post-proceso dentro de `build-shell.mjs`),
   y todo arreglo de comportamiento va en `src/components/Interacciones.astro`.
   Después de tocar el generador, **corre `npm run shell` y comprueba que el arreglo sobrevive**.

2. **Aquí no existe `webflow.js`.** El menú móvil (`w-nav`) y los 96 desplegables (`w-dropdown`)
   están reimplementados a mano en `src/components/Interacciones.astro` (326 líneas). El bug de
   móvil está casi seguro ahí: el overlay es `fixed` desde y=85, el menú se **mueve dentro del
   overlay** al abrir, y hay un manejador de "clic fuera" que cierra todo. Sospechosos por orden:
   un elemento que tapa el `<a>` (`.glas-div`, `.block-img-submenu`), un `preventDefault` en el
   toggle que también atrapa los `<a>` hijos, o el cierre del overlay disparándose antes de que
   el enlace navegue.

3. **Verifica siempre sobre lo construido, nunca sobre `npm run dev`.** La puerta mide
   `.vercel/output/static`, que es lo que se despliega.

4. **Hay más sesiones trabajando en este mismo repo ahora mismo. El índice de git es compartido.**
   Ahora mismo el árbol ya tiene cambios ajenos (`src/layouts/Base.astro`, `src/pages/lab/[v].astro`,
   `src/styles/contacto.css` y ficheros sin seguimiento). **Nunca `git add -A` ni `git add .`**:
   añade por ruta explícita solo los ficheros que tú hayas tocado, y revisa `git status --short`
   justo antes de commitear para confirmar que no arrastras nada de otro frente.

5. **No barras las 115 rutas con navegador visible.** El menú y el pie son un cascarón compartido:
   con **una página por tipo de plantilla** (portada, `/services/…`, `/pool-builders/…`, `/blogs/…`,
   `/project/…`, `/country/…`, `/gallery`, `/contact-us`) queda cubierto. Playwright **headless**.

---

## Qué hay que hacer

### Fase 1 · Inventario (antes de arreglar nada)
Construye (`npm run build`) y saca de `.vercel/output/static` la lista completa y deduplicada de
enlaces del cascarón: `section.menu` (menú, submenús, botón de teléfono, redes, CTA) y el pie.
Para cada uno clasifica: **interno que resuelve**, **interno que 404**, **externo**, **`tel:`/`mailto:`**.
Contrasta los internos contra `_source/routes.csv`. Deja el inventario en
`docs/encargos/MENU-INVENTARIO.md` con el conteo por categoría.

### Fase 2 · Rutas rotas
Regla para cada enlace interno que no resuelve, **sin inventarse páginas**:

- Si existe una página real equivalente → **301 en `vercel.json`** hacia ella.
- Si no existe equivalente → **quitar el enlace del cascarón** (en `build-shell.mjs`, no a mano).

Para los tres `/commercial-services/…` el destino por defecto es su gemelo comercial en
`/services/…` (construcción → construcción de piscinas, renovaciones → remodelación,
contratistas → construcción). Si al medirlos ves un destino mejor, úsalo y **justifícalo en el
informe**.

Esto **rompe a propósito el contrato de "réplica byte a byte"** del menú: es una decisión
explícita de Sebastián, no un descuido. Actualiza el bloque `ROTOS_EN_ORIGEN` de
`scripts/check-enlaces.mjs` para que refleje la nueva realidad (si ya no queda ninguno,
vacía la lista y deja el comentario explicando por qué), y anótalo en `MIGRACION-LOG.md`.

### Fase 3 · El bug de móvil
Reproduce **primero**, con Playwright headless sobre el sitio construido, a 390×844 y 768×1024,
usando **`tap()` real** (contexto con `hasTouch: true`), no `click()`. Para cada enlace del menú
abierto: comprueba que es alcanzable (`elementFromPoint` en su centro devuelve el `<a>` o un hijo
suyo), que el área táctil llega a 44×44 CSS px y que al tocarlo **cambia la URL al destino esperado**.

Arregla la causa en `src/components/Interacciones.astro`. Restricciones:
- **No cambies el aspecto.** `npm run check:visual` tiene que seguir en verde.
- Ni `!important` nuevos ni reescrituras del módulo: el diff más corto que cierre el fallo.
- Los desplegables tienen que seguir cerrando con Escape, con clic fuera y al navegar.

### Fase 4 · La puerta (esto no es opcional)
Crea `scripts/check-menu.mjs` + `"check:menu"` en `package.json`, y **engánchalo a `npm run check`**.
Debe fallar en rojo si, sobre `.vercel/output/static` y en el muestreo de plantillas:
- algún enlace interno del menú o del pie no resuelve a una ruta de `_source/routes.csv`
  (ni a un 301 declarado en `vercel.json`);
- algún enlace del menú abierto a 390 px no es alcanzable, no llega a 44×44, o al tocarlo no navega;
- queda algún `href` a `.html` o algún `href="#"` sin manejador.

La puerta se mide con su **propio** código, no reutilizando el que arregla el bug.
Comprueba que la puerta **detecta el fallo**: revierte tu arreglo en local, confirma que sale ROJO,
vuelve a aplicarlo y confirma VERDE. Sin esa prueba la puerta no vale nada.

### Fase 5 · Verificar y desplegar
1. `npm run check` completo, en verde. Si alguna puerta ajena ya venía roja de antes, dilo en el
   informe y no la maquilles.
2. `git status --short` → añade **solo tus ficheros por ruta**, un único commit descriptivo en
   español, con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
3. `git push origin main`. **El despliegue va por push: el MCP de Vercel da 403 en este proyecto,
   no lo intentes.**
4. Espera al despliegue y **verifica en producción real** (`https://mrandmrs-outdoor-living.vercel.app`),
   no en local: repite el muestreo táctil de la Fase 3 contra la URL desplegada y comprueba que
   los 301 responden 301 hacia el destino correcto. El dominio del cliente
   (`mrandmrsoutdoorliving.com`) **sigue en Webflow y no se toca**.

## Entrega
Informe corto: qué enlaces estaban rotos y cómo quedó cada uno, cuál era la causa real del fallo
en móvil (con `fichero:línea`), qué mide la puerta nueva, y la URL del despliegue verificado.
