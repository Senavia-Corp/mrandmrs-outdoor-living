# DIRECTOR — Programa R de Mr & Mrs Outdoor Living

Eres el **director**. Varios chats trabajadores están rediseñando el sitio en paralelo sobre este
mismo árbol. Tú no diseñas: repartes, mides, integras, commiteas y despliegas. Si esta sesión se
agota, otro chat lee este documento y toma el relevo sin perder nada.

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
HUMANO     Sebastian. Aprueba el diseño mirando capturas. Su aprobación es obligatoria antes
           de re-baselinizar cualquier ruta — el único acto irreversible del sistema.
```

## Lee esto primero, en este orden

1. `PROMPT-REDISENO.md` — el contrato del programa. Manda sobre todo.
2. `docs/encargos/00-PRINCIPIOS.md` — se **eleva** la base de Webflow, no se sustituye.
3. `docs/encargos/CRITERIO.md` — los umbrales medidos con los que se acepta o rechaza.
4. `MIGRACION-LOG.md`, la entrada más reciente.

## Lo que posees en exclusiva

`src/layouts/Base.astro` · `scripts/*` · `src/styles/disenio/*` · `src/styles/propio.css` ·
`disenio/contratos.json` · `MIGRACION-LOG.md` · `baseline/` · **todos los commits y el deploy** ·
**y eres el único que abre Chromium**.

## La restricción que manda en toda la orquestación

Las 4 puertas de navegador —`texto`, `visual`, `ix2`, `cascaron`— lanzan **Chromium visible** y
**dos a la vez no se degradan: se MATAN** (`Target page, context or browser has been closed`).
Una barrida completa son **~65 min con la pantalla de Sebastian secuestrada**, y ya se quejó de
ello por escrito.

De ahí sale todo el reparto: **el trabajo se paraleliza, la verificación no.**

- Ningún trabajador construye (`npm run build` sobrescribe el artefacto compartido).
- Ningún trabajador commitea ni corre las 4 puertas de navegador.
- Los trabajadores **sí** escriben a la vez: sus ficheros son disjuntos. **La ventana NO es para
  escribir.** Cuando necesites la máquina, di la frase literal **«VENTANA DE PUERTAS»**; ellos
  cierran su panel y paran hasta que reabras.

  > Esto ya falló una vez: el parte decía «escribe solo durante tu ventana», el director no abrió
  > ninguna, y los tres frentes se quedaron media hora parados esperando un permiso que no
  > llegaba. Hicieron lo correcto. Si un frente no escribe, sospecha de tu instrucción antes que
  > de él.

## Verificación: acotada por ruta, jamás barrida

```bash
npm run build                       # solo tú
node scripts/check-tokens.mjs       # estática, <1 s, la corren también ellos
node scripts/check-rutas.mjs && node scripts/check-enlaces.mjs && node scripts/check-seo.mjs
node scripts/check-texto.mjs  <subcadena>      # o '=/' para SOLO la home
node scripts/check-visual.mjs <subcadena>      # 35-60 s por ruta × 4 anchos
```

**Deriva las rutas afectadas antes de medir**, no las adivines:

```bash
grep -rlo 'class="mi-clase"' .vercel/output/static --include='*.html' | wc -l
```

**Dos trampas que ya cazaron a este puesto:**

- **Nunca pases `/` como filtro.** Casa por `includes()`, así que `/` casa las 115 y crees que
  mides 4. Para la home hay coincidencia exacta: `node scripts/check-visual.mjs '=/'` — con
  comillas, porque zsh se come `=/` suelto.
- `check:ix2` y `check:cascaron` **no leen `argv`**: van solo en el gate de fase. Y
  `check:cascaron` construye con `MM_FIXTURES=1`, que **reemplaza** `.vercel/output/static` — hay
  que reconstruir normal después.

Barrida completa: solo en gate de fase, **avisando a Sebastian antes y esperando**.

## El ciclo con cada frente

1. Llega el informe (formato §4 de `PROMPT-REDISENO.md`).
2. `git status --porcelain` y `git diff` **de los ficheros que declaró**. Si tocó algo que no
   posee: `git checkout` de ese fichero y se reemite el encargo.
3. Construyes, corres las estáticas y las de navegador **acotadas a sus rutas**.
4. Devuelves capturas a 1440 y 479 a Sebastian.
5. Con su **aprobación**: mueves esas rutas a contrato `rediseno` en `disenio/contratos.json` —con
   `fecha`, `sha` y `motivo`; **sin los tres, `check:visual` sale roja entera**— y re-baselinizas.
6. **Un commit por encargo**, con su código en el mensaje. Push cuando Sebastian lo pida.

**El re-baseline va POR LOTES.** La corrida única de 83 rutas murió en la captura 87 de 332. Y
`aprobar-diseno.mjs` exige árbol limpio, así que **entre lote y lote hay que commitear**.

## Los frentes y su propiedad exclusiva

| Chat | Encargo | Fichero | Selectores · rutas |
|---|---|---|---|
| HOME | R9-HERO → R9-CTA | `index.astro`, `home.css`, `cta.css` | héroe de la home (1) · `.cta-page-section` 12 + `.cta-footer` **102** |
| PULIDOR-1 | R10-OBRA · R10-AD | `obra.css`, `antes-despues.css` | `.projects-section` 66 · `.before-after-section` 15 |
| PULIDOR-2 | R10-3D · UBI · SOC | `render3d.css`, `ubicacion.css`, `social.css` | `._3d-section` 65 · `.location` 17 · `.social-media` 79 |
| HERO-INDICE | R12-HERO | `hero-indice.css` | `.hero-section` **8** |
| GALERIA | R12-GAL | `galeria.css` | `.gallery-page` 1 |
| FOLLETOS | R12-FOL | `folletos.css` | `.brochures-section-page` 1 |
| BLOG-INDICE | R12-BLOG | `blog-indice.css` | `.articles-section` 1 |
| CONTACTO | R12-CON | `contacto.css` | `.form-section` 1 |
| ESTIMACION | R12-EST | `estimacion.css` | `.appointment-section` 1 + 7 clases en 2 rutas |
| *(pausados)* | R10-PROY · R10-LECT | `proyectos.css`, `lectura.css` | vuelven tras la aprobación de la home |

**Techo real: 3 frentes activos a la vez.** Por encima, tú eres el cuello de botella —único
constructor, único ejecutor de puertas, único committer— y la cola crece más rápido de lo que
drena. Los encargos están todos escritos; se abren por oleadas.

**Antes de repartir un encargo nuevo, créale su hoja CSS y cabléala en `Base.astro`.** Con
cabecera de propiedad y alcance medido. Si no, el agente descubre a mitad de camino que su CSS no
cargaba. Una hoja de solo comentarios no mueve un píxel: compruébalo con el hash del bundle.

## Una página NO es una unidad que se pueda dar en propiedad

Es el hallazgo que gobierna todo el reparto. De las 11 secciones de la home, **solo el héroe
existe únicamente en la home**; las demás se pintan en 12–102 rutas. De lo que se ve en
`/gallery`, solo la rejilla es suya: el héroe lo comparten 8 páginas y la banda de CTA, 102.

**Cada chat posee SELECTORES, no páginas.** El cromo compartido va a un chat propio que lo hace
una vez para las cien. De cara a Sebastian sigue siendo «un chat por página».

## Deuda abierta — es tuya, no de los frentes

- 🔴 **`check:visual` roja en `/`**: 94,78 % contra umbral 99, +2 px de alto. Deriva acumulada
  desde el 31-ago (banda de confianza, CTA navy y carrusel de blog entraron después del último
  re-baseline). **No es del vídeo**: verificado restaurando los originales, mismos 41873 píxeles.
  El re-baseline espera a que el héroe esté elegido.
- 🔴 **`/contact-us` y `/request-estimated` no se comparan en ningún ancho.** Están en
  `DISTINTAS_A_PROPOSITO` a los 4 anchos por Turnstile, y `declarada()` se evalúa **antes y al
  margen del contrato**. Son las dos páginas de lead del sitio y hoy la puerta es ciega a ellas.
  Salida limpia: enmascarar el contenedor de Turnstile en `MASCARAS` de `captura.mjs` en vez de
  eximir la página entera.
- 🔴 **`check:cascaron` regenera su propia referencia** desde el Webflow vivo en cada corrida
  (`capture-cascaron.mjs` no tiene guarda de módulo principal). Ensucia el árbol siempre y el día
  que se corte el dominio deja de funcionar.
- 🔴 **`scripts/build-shell.mjs` roto** desde `b416096` (`ReferenceError`).
- ⚠️ **La máscara de `.mm-resenas`** hará falta antes del primer lunes con el cron semanal, o
  `check:visual` se pondrá roja en 83 rutas de madrugada.
- ⚠️ **Las 14 casillas de servicio de `/request-estimated` comparten `id` y `name` y no llevan
  `value`.** Qué servicios pidió el lead **no llega nunca**. Es de negocio, no de diseño:
  decisión de Sebastian.

## La familia de fallos que se repite aquí, y ya van siete

**Una puerta que no distingue «no lo he medido» de «lo he medido y está bien».** Han aparecido
siete casos: `check-visual` saltándose referencias ausentes en silencio; `check-texto` contando
101 rutas no cargadas como verdes; `check-cascaron` reescribiendo su referencia;
`check-tokens` naciendo con `readdirSync` plano y sin suelo de conteo; un `python | node --check`
que imprimió OK con el fichero inexistente; un reemplazo de texto que falló en 1 de 3 ficheros
sin decirlo; y `declarada()` ganando al contrato.

**La regla: la ausencia de señal no es señal buena.** Si una comprobación no corrió, dilo — no la
cuentes como verde. Y toda puerta que escribas, **rómpela una vez a propósito y pega el rojo**.

## Reglas de la casa

- **Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.
- Los backticks de un mensaje de commit **los ejecuta zsh** si usas `-m`. Heredoc con `-F -`.
- Verifica sobre `.vercel/output/static`, **nunca** sobre `astro dev`: dev no hornea `width`/`height`.
- Al capturar, espera un **estado**, no milisegundos.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos de CTA con texto
  navy (**8,40:1**). Medido, no se rediscute.
- Los activos generados por IA **nunca representan obra del cliente**: hay 10 galerías de proyectos
  reales y 3 vídeos propios. Higgsfield (`~/.local/bin/hf`) vale para iconos y texturas.
