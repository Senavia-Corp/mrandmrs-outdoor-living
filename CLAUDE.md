# Mr & Mrs Outdoor Living — reglas de la casa

Astro 5 estático con adaptador Vercel, réplica elevada de un Webflow. **115 rutas.** CSS propio,
sin React. Manda `PROMPT-REDISENO.md`; el reparto vivo está en `docs/encargos/DIRECTOR.md`, los
umbrales en `docs/encargos/CRITERIO.md`, y lo último hecho en `MIGRACION-LOG.md`.

## 0. Rediseñar es rediseñar

**El sitio está en remodelación (desde el 5-oct-2026, lo decide Sebastian).** Cuando se pide
rediseñar, remodelar o elevar una sección, **el fallo es entregar un retoque**: mismo layout
con otro padding, otra sombra y un radio. Eso ya pasó demasiadas veces y es justo lo que se
quiere cortar.

- **`frontend-design` antes del markup, siempre.** Se elige una dirección y se dice en dos
  líneas antes de escribir CSS: qué consigue la sección y qué cambia de composición.
- **Se recompone.** Otra rejilla, otro componente, otro markup, en cualquier ruta. La base de
  Webflow es el punto de partida, no el techo. Se conserva la marca (logo, navy, oro), no la
  maqueta. Detalle en `docs/encargos/00-PRINCIPIOS.md` §1.
- **El diff corto no es una virtud aquí.** Las reglas de «mínimo cambio» (plugin ponytail
  incluido) valen para scripts y lógica, **no para trabajo de diseño**: una sección rehecha
  son 5-15 KB de CSS y markup nuevo, y está bien.
- **No se mide «¿cabe?» antes de diseñar.** El tope de `check:tokens` es el peso de `webflow.css` (167 KB) y es alarma.
  Token que falte se añade a `src/styles/disenio/tokens.css` en el mismo cambio.
- **`check:visual` en rojo sobre la ruta rediseñada es lo esperado**, no una señal para
  encoger el cambio: defiende la captura anterior. Se enseña a Sebastian, y si la aprueba se
  re-baseliniza con `aprobar-diseno.mjs`. Lo que no puede salir rojo es otra ruta que no
  tocabas.

**Lo que NO se afloja**, porque no limita el diseño sino que protege al visitante o al SEO:
`check:texto` al 100 % (ni una palabra), rutas y `<head>`, cero `!important` y cero `@layer`,
ningún `opacity: 0` fuera de `html[data-anim]`, contraste ≥4,5:1 por el peor píxel, controles
≥44 px, y nunca obra generada por IA.

## 1. No se barre el sitio

**No recorras las rutas para «ver cómo va».** Nada de `ui-qa`, `carrusel-qa` ni `0.8.0:audit`
por iniciativa propia, y nada de abrir el preview e ir pasando páginas. Una barrida son 115
rutas × varios anchos: ~65 min con la pantalla de Sebastian secuestrada, y ya se quejó por
escrito (`docs/encargos/DIRECTOR.md:30`).

**Pero si un encargo o Sebastian los piden por su nombre, se ejecutan sin preguntar y sin
objetar.** Ejemplo canónico y hoy vigente: `PROMPT-TRACKING.md:353` pide `ui-qa` +
`0.8.0:audit` sobre `/thank-you` a 4 anchos, porque es ruta nueva sin referencia en
`baseline/shots/` y las puertas se la saltan. Eso es uso legítimo. Lo que se corta es el
barrido que nadie pidió, no la auditoría que sí.

El panel del navegador se abre para mirar **una** ruta, se mira, y se cierra. No se deja
corriendo mientras piensas o escribes (`docs/encargos/PARTE-02.md:26`).

## 2. La verificación son las puertas, no el chat

Hay 15. Miden más y mejor que mirar capturas, headless y sin gastar contexto:

```bash
npm run check:tokens                       # estática, <1 s, córrela siempre
npm run check:rutas && npm run check:enlaces && npm run check:seo
npm run check:redirects                    # estática: 76 URLs migradas, 308 directos, sitemap/canónicas/miga
node scripts/check-texto.mjs  <subcadena>  # acotada por ruta
node scripts/check-visual.mjs <subcadena>  # 35-60 s por ruta × 4 anchos
```

**Deriva las rutas afectadas antes de medir, no las adivines:**

```bash
grep -rlo 'class="mi-clase"' .vercel/output/static --include='*.html' | wc -l
```

Tres trampas que ya cazaron a alguien aquí:

- **Nunca pases `/` como filtro.** Casa por `includes()`: te lleva las 115 creyendo que mides
  4. Para la home hay coincidencia exacta, y **con comillas**, que zsh se come `=/` suelto:
  `node scripts/check-visual.mjs '=/'`.
- `check:ix2` y `check:cascaron` **no leen `argv`**: van solo en gate de fase.
- Verifica sobre `.vercel/output/static`, **nunca** sobre `astro dev` — dev no hornea
  `width`/`height` y las medidas mienten.

**Una puerta que no corrió no es una puerta verde.** Si se saltó por falta de referencia, dilo:
falla ABIERTO (`docs/encargos/DIRECTOR.md:149`). Es justo por eso que hay rutas que sí necesitan
auditoría a mano — ver §1.

## 3. Construir, commitear y desplegar no son gratis

`npm run build` sobrescribe `.vercel/output/static`, que es artefacto compartido: puede haber
otros chats sobre este mismo árbol a la vez. Los tres actos son del director
(`docs/encargos/DIRECTOR.md:35`). Si tu encargo te los autoriza, adelante; si no, entrega el
diff y para.

## 4. Fotos: hay banco

Antes de proponer o cambiar una foto, lee `BANCO-IMAGENES.md`. El índice es
`src/data/banco-imagenes.json`; se elige por él y por `banco/hojas/`, no escaneando carpetas.
