# Encargo — rehacer el estimador de piscinas como app nativa del sitio

Trabajas en `~/Sites/mrandmrs-outdoor-living/`, la migración de
`https://mrandmrsoutdoorliving.com` de Webflow a **Astro + Sanity + Vercel**. Lee antes
`MIGRACION-LOG.md` (bitácora, una entrada por fase) y `docs/ENTREGA.md` (estado de entrega).
El sitio ya está desplegado y público en
<https://mrandmrs-outdoor-living-rajppfro3-senaviacorp.vercel.app>.

## Qué hay hoy

`/pool-investment-estimator` **no es una página de Webflow**. Es una app **Astro + React
`client:only`** que servía **Webflow Cloud** desde
`67ed3381-….wf-app-prod.cosmic.webflow.services`, montada bajo el dominio real. Su HTML son
4,8 kB de cascarón; todo lo pinta React. `/pool-cost-estimator` la embebe en un **iframe**
(`class="pool-estimator-iframe"`), hoy ya con ruta relativa `/pool-investment-estimator`.

En la Fase 5 se **portó el bundle construido** para no depender de la suscripción de Webflow.
Los ficheros están rescatados y versionados en `_source/estimator/`:

```
PoolEstimatorPage.Cy-Yd7Xu.js   215 kB   la app
client.6NxMFTsy.js              176 kB   React
index.BqdhZ9yF.js                12 kB
index.C0oxWGe_.css              276 kB   TODO el diseño
index.html                      4,8 kB   el cascarón
```

`scripts/build-estimador.mjs` los copia a `dist` en cada build (`npm run estimador`, encadenado
en `npm run build`).

**Está minificado y SIN sourcemap.** Funciona, pero cambiar una fórmula o un precio exige
rehacer la app — que es exactamente lo que se te pide.

Medido y verificado en su día: **el bundle no hace ni una llamada de red.** `fetch(`,
`XMLHttpRequest`, `axios` y `/api/` dan **cero**. Es una calculadora 100 % de cliente y su único
enlace saliente es `/request-estimated`.

## El encargo

1. **Rehacer el estimador como código propio, nativo del sitio Astro**, en local, sin iframe ni
   bundle opaco. Fuente legible y mantenible.
2. **Mismo diseño.** No es un rediseño. La referencia visual es la app actual, que puedes ver
   funcionando y cuyo CSS completo tienes en `_source/estimator/index.C0oxWGe_.css`.
3. **Puedes y debes mejorar la lógica en una dirección concreta: que capte el lead.** Hoy el
   estimador calcula un rango y ofrece «Schedule Your Design Consultation», que se va a
   `/request-estimated` y **pierde por el camino todo lo que el visitante acaba de configurar**.
   El objetivo es que al final del recorrido el usuario **deje sus datos de contacto** y que el
   aviso incluya **la estimación y las opciones que eligió**. Eso es lo que convierte una
   calculadora en un captador de leads.
4. Al terminar, **desplegar a Vercel**.

## LO PRIMERO, Y ES URGENTE: capturar el oráculo

La app actual es una **función pura** (misma entrada → misma salida, sin red). Eso te da algo
que no volverás a tener: **un oráculo para verificar que tu versión calcula igual.**

Lo pierdes cuando (a) se corte el dominio de Webflow, o (b) sustituyas el bundle. Así que
**antes de escribir una línea de la app nueva**, construye un fichero de casos:

- Recorre la app actual con Playwright, enumerando combinaciones de opciones.
- Para cada combinación, registra **entradas → rango estimado** y el desglose de
  «View Cost Breakdown».
- Guárdalo versionado en `_source/estimator-casos.json`.
- Cubre los extremos de cada control (los sliders en su mínimo y su máximo) y una muestra amplia
  del resto, no solo el camino feliz.

Después, tu app nueva tiene que reproducir **todos** esos casos. Un estimador que se parece pero
da otro número no es el mismo estimador: le está diciendo otro precio a un cliente real.

Este proyecto ya perdió por poco un dato equivalente —el orden manual de las colecciones de
Webflow, rescatado in extremis en `_source/orden-listas.json`—. No repitas eso.

## El modelo, hasta donde se ha leído del bundle

Las cadenas del bundle están intactas aunque el código esté minificado. De ahí salen **7 pasos**:

| Paso | Contenido visible en las cadenas |
|---|---|
| Project Type | `New Custom Pool` · `Pool & Patio Remodel` |
| Pool Size | slider de superficie |
| Pool Style / Complexity | `Freeform` · `Luxury / Custom Geometry` |
| Interior Finish | `Standard Plaster` · `Pebble Finish` (*«Lower maintenance, softer water feel»*) · `Premium / Polished Finish` |
| Spa & Systems / Pool Systems & Comfort | `Integrated Spa` · `Raised Spillover Spa` · `LED Lighting` · calefacción (*«Gas or heat pump for year-round comfort»*) · *«Control everything from your phone»* |
| Decking | `Deck Size` (slider 200–1500 sqft) · `Deck Material`: `Concrete` ($12/sqft, *«Brushed or stamped concrete. Affordable and versatile.»*) · `Pavers` (marcado como recomendado) · `Travertine` (*«Natural stone. Premium, stays cool underfoot, luxury aesthetic.»*) |
| Outdoor Add-Ons / Outdoor Living & Site | `Outdoor Kitchen` · `Pool Screen Enclosure` · `Louvered Roof System` · `Pool-Area Landscaping` |
| Site Conditions | `Limited equipment access to backyard` · `Significant rock or coral in soil` · `Community architectural review process` |

Cabeceras: `Estimated Investment Range`, `View Cost Breakdown`,
`Schedule Your Design Consultation`. Barra de progreso «Step N of 7 — NN% Complete».

Números sueltos que aparecen y huelen a precio: `1500, 2000, 2200, 3500, 4500, 6400, 8000, 8500`.

**Trátalo como pistas, no como el modelo.** El modelo lo fijan los casos medidos del punto
anterior. Si una pista y una medición se contradicen, manda la medición.

## Reutiliza lo que ya existe. No lo reinventes

- **El endpoint de leads ya está hecho y probado**: `src/pages/api/formulario.ts`, con cuatro
  capas antibot (honeypot `ref_id`, time-trap <1000 ms, Turnstile en modo Managed que **falla
  ABIERTO** si Cloudflare no responde, y rate-limit por IP). Lee su cabecera entera: explica por
  qué `ok` solo es `true` **si el correo salió de verdad** —`console.log` no es entrega— y por
  qué los secretos van por `process.env` y **nunca** por `import.meta.env` (Vite los sustituye en
  build y se llevó por delante toda la rama de envío).
  Para el estimador **añade una entrada nueva a su tabla `FORMULARIOS`** con sus campos y su
  etiqueta legible; no crees un endpoint paralelo.
- **El comportamiento de cliente** está en `src/components/Formularios.astro`: estados con las
  clases del propio sitio (`.w-form-done` / `.w-form-fail`), Turnstile con **render explícito**
  (el implícito falla sobre un elemento oculto) y la clave de sitio ya existente
  `0x4AAAAAAAQTptj2So4dx43e`, que era la del propio Webflow.
- **Solo se cablean los formularios de LEAD.** `scripts/build-paginas.mjs` tiene la lista y el
  motivo: cablear los de filtro montaba un captcha donde nadie envía nada y garantizaba un 400.

## Las puertas, y qué va a pasar con ellas

`npm run check` encadena build + `check:assets`, `check:rutas`, `check:enlaces`, `check:seo`,
`check:texto`, `check:ix2` y `check:visual`. Hoy están verdes salvo `check:visual`, que quedó sin
veredicto por saturación de la máquina.

**Rehacer el estimador va a poner en rojo `check:texto` y `check:visual` en
`/pool-investment-estimator` y `/pool-cost-estimator`, y eso es correcto**: la app cambia a
propósito. Lo que NO se hace:

- bajar el umbral global de `check:visual`;
- declarar la ruta entera si la diferencia es de un solo ancho — la tabla
  `DISTINTAS_A_PROPOSITO` admite `{ anchos: [479], motivo }` justo para eso;
- tocar el baseline de otras rutas.

Lo que sí: **declarar esas dos rutas una a una, con el motivo escrito**, igual que se hizo con
la decisión D2 (los widgets de Elfsight rehechos en nativo). Y dejar el resto de puertas verdes.

Ojo con las de navegador: **piden foco real y una cada vez**. Correr dos a la vez, o un
diagnóstico mientras corre otra, las hace competir por el foco — medido: una captura pasó de
9,2 s a 45 s y otra corrida murió por *timeout* de screenshot. El README lo explica.

Hay dos diagnósticos escritos que te van a servir: `npm run diag:visual <ruta> <ancho>` dice **en
qué banda** difiere una página, y `node scripts/diag-geometria.mjs <ruta> <ancho>` compara la
geometría del DOM contra el sitio vivo y señala **qué elemento** se separa. Un porcentaje no
señala nada; esos dos sí.

## Decisiones que NO tomas tú

- **El iframe.** Con la app nativa, `/pool-cost-estimator` podría montarla directamente y
  ahorrarse el iframe. Pero esa página está bajo el contrato de paridad. **Propón y pregunta**;
  no la cambies por iniciativa propia.
- **El DNS.** No se toca. Lo aprueba Sebastian.
- **Los precios.** Si al medir encuentras algo que parece un error de la app actual, **no lo
  arregles**: replícalo y anótalo en «Mejoras candidatas NO aplicadas» de la bitácora. Cambiar
  un precio sin que lo apruebe el cliente es cambiarle el negocio.

## Cómo se trabaja aquí

De `PROMPT.md`, y va en serio:

> **Un número sin el comando que lo produjo no es un número, es una opinión.**

- Una entrada de bitácora por fase, **escrita al cerrar**, con los números medidos y la salida
  real del comando pegada.
- Ninguna puerta se da por buena sin haberla visto **en rojo** al menos una vez.
- Un commit por fase, en `main`. **No subas sin avisar**: el repo está enlazado a Vercel y el
  push dispara un despliegue a producción.
- Dos fallos independientes pueden dar el mismo síntoma. No cierres por la primera causa.
- Y una lección cara de esta migración: **una puerta que revienta no es estricta, es frágil.**
  Si una ruta falla, cuéntala en rojo y sigue midiendo las demás.

## Hecho es

1. `_source/estimator-casos.json` versionado, con los casos medidos de la app actual.
2. El estimador rehecho en fuente propia, servido desde el sitio Astro, **sin el bundle de
   `_source/estimator/`** y sin dependencia de Webflow.
3. **Todos** los casos del punto 1 reproducidos por la app nueva.
4. El final del recorrido capta datos de contacto y el aviso al negocio llega **con la
   estimación y las opciones elegidas**, por el endpoint que ya existe.
5. Puertas verdes salvo las dos rutas declaradas, con su motivo.
6. Desplegado en Vercel y verificado **sobre el despliegue**, no sobre el build local.
