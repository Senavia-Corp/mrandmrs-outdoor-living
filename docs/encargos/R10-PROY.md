# ENCARGO R10-PROY — el portafolio

Eres el chat **PULIDOR-1** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director
que está en otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R10-PROY
RUTAS      /projects  +  las 10 fichas /project/*        (11 rutas)
POSEES     src/styles/proyectos.css   (ya creado y cableado por el director)
PROHIBIDO  todo lo demás. En especial Base.astro, propio.css, home.css, lectura.css,
           disenio/*, scripts/*, contratos.json, baseline/, MIGRACION-LOG.md,
           CUALQUIER .astro —esto es CSS puro, el markup solo se toca en la home—
           y EL TEXTO VISIBLE.
```

## Antes de nada, en este orden

0. **Lee `docs/encargos/00-PRINCIPIOS.md`.** Manda sobre este fichero. En una linea: se
   **eleva** la base de Webflow, no se sustituye.
1. Lee `~/Sites/CLAUDE.md` — tabla de enrutado de skills y las 7 reglas duras del final.
2. Lee `PROMPT-REDISENO.md` §1, §3, §5 y §6 de este repo. Es el contrato.
3. **Invoca `frontend-design`** — esto es un rediseño, no un retoque — y después
   **`make-interfaces-feel-better`** para la pasada de detalle: espaciado, bordes, sombras,
   tipografía, estados, áreas de pulsación.
4. `git status --porcelain`. Si hay ficheros sucios que no son tuyos, **para y pregunta**:
   conviven hasta 3 chats editando y el árbol pasó de 0 a 19 sucios en 5 minutos.

## Objetivo

El portafolio. Es la prueba social de la empresa — 10 obras reales de piscinas y outdoor living
en Florida — y hoy se presenta como una rejilla de plantilla. Que se lea como el trabajo de un
estudio que cobra caro: jerarquía, ritmo, respiración, y una galería que invite a mirar en vez
de a pasar de largo.

## Tus selectores, con el alcance ya medido por el director

| Selector | Rutas | |
|---|---|---|
| `.project-gallery` | **10** | solo las fichas — tuyo, acotado |
| `.project-page` | **11** | índice + fichas — **verifícalo tú**: mide el token exacto, no la subcadena |

**Fuera de tu lote. No los toques — son cromo compartido de otro encargo:**

- `.hero-project` → **20 rutas: tus 10 fichas Y las 10 de `/blogs/`.** Otro chat trabaja en
  `/blogs/` ahora mismo. Si los dos escribís aquí, escribís el mismo héroe sin veros.
- `.hero-section` (18) · `.cta-footer` (102) · `.code` (114) · `.footer` (113).

## Cómo se mide el alcance — hazlo antes de cada bloque y pégalo en el informe

```bash
grep -rlo 'class="project-gallery"' .vercel/output/static --include='*.html' | wc -l
```

**El build de las 115 páginas ya existe** en `.vercel/output/static` — grepéalo, no lo
reconstruyas.

**Trampa real, medida en este repo:** `blog-section` como **subcadena** casa 87 ficheros y como
**clase exacta** son 10, porque `blog-section-page` la contiene. Un selector que creías acotado
a 10 puede estar pintando 87 páginas. Mide siempre con las comillas dentro del patrón.

## Reglas de la capa (las mide `check:tokens` — **córrela tú**)

- Cero `!important`. Cero `@layer`: `webflow.css` son 167 KB **sin capa**, y cualquier regla sin
  capa gana a toda regla con capa. Tu fichero gana por **orden de carga**.
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. **Token que falte, me lo
  pides** — `disenio/` es del director.
- **Todo selector cuelga de `.project-gallery` o `.project-page`.** Nada global.
- `min-width` 480 / 768 / 992, jamás mezclado con los `max-width` de Webflow.
- Nunca `animation-fill-mode: forwards`. Ningún `opacity: 0` fuera de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos de CTA con
  texto navy (8,40:1). Medido, no se rediscute.
- Cada par de colores nuevo lleva **su ratio medido escrito al lado**.

## Dos trampas de CSS que ya costaron tiempo aquí

- **`aspect-ratio` con la altura ya definida calcula el ANCHO** y desborda la columna.
- **La altura de una fila de tarjetas la fija la más larga.** El hueco no se quita centrando:
  baja el `clamp` de la larga, y pon el cuerpo de la corta en `cqw` o el hueco reaparece solo
  en tablet.

## Lo que no se puede romper

- **El texto.** `check:texto` compara `innerText` al 100 % sin tolerancia y no se re-baseliniza
  nunca. Es justo lo que te da permiso de rediseñar: mientras siga verde, el CSS es tuyo.
- Nada de `display:none` ni `visibility:hidden` sobre contenido con texto. `innerText` no ve
  `[hidden]`, pero sí ve mucho de lo que creerías oculto. Si necesitas esconder algo, dilo antes.

## Qué corres tú, y qué no

**Corres:** `astro dev --port 4327` (tu puerto) y el panel de navegador de Claude.

**No corres:** `npm run build` — sobrescribe `.vercel/output/static`, el artefacto compartido que
mide el director — · `git commit` · `check:texto|visual|ix2|cascaron` · nada dentro de `baseline/`.

**Cuando el director diga «VENTANA DE PUERTAS»:** cierra el panel del navegador y deja de
escribir. Dos navegadores a la vez **matan** su corrida, no la ralentizan, y ya pasó en la ruta
22 de 115.

**No esperes permiso para escribir.** La ventana no es para eso: los tres frentes tienen
ficheros disjuntos y escriben a la vez. Solo paras cuando el director diga **«VENTANA DE
PUERTAS»**, que es cuando él construye o abre Chromium.

## Informe

```
ENCARGO         R10-PROY
ESTADO          listo | bloqueado | parcial
FICHEROS        ruta:linea
ALCANCE         cada selector | rutas que pinta | el grep que lo produjo
NUMEROS         metrica | antes | despues | comando
CONTRASTES      cada par nuevo, con su ratio medido
RIESGO A OTRAS  que otras rutas puede haber movido esto, y por que
ABIERTO         lo que queda y de quien depende
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.
