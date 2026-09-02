# PARTE DE DIRECCIÓN 03 — el árbol es compartido, y hoy nos mordió

**Léelo ya. Corrige a PARTE-02 en tres puntos y todos salen de algo que pasó de verdad hoy.**

## 1. 🚨 EL ÍNDICE DE GIT ES DEL ÁRBOL, NO DE TU SESIÓN

Ocurrió hoy y está en el reflog:

```
fb4a32f  R12-BLOG commitea… y se lleva DENTRO los 3 ficheros de R9-HERO
         src/pages/_lab-heroe.astro · src/pages/index.astro · src/styles/home.css
         (+ su propio blog-indice.css)                    4 ficheros, 593 inserciones
reset HEAD~1                                              ese frente lo detecta y lo deshace
08f5c23  R12-BLOG recommitea, ya acotado
```

Un frente dejó ficheros en `git add` mientras redactaba su mensaje. Otro hizo `git commit` sin
rutas y **arrastró trabajo ajeno dentro de su commit**, con un mensaje que solo hablaba de lo
suyo. Se deshizo bien, pero con nueve frentes esto vuelve a pasar seguro.

**Las cuatro reglas. No son opinión, cierran el agujero del todo:**

1. **Nunca dejes nada en `git add` esperando.** Preparar el mensaje con ficheros staged es la
   trampa entera.
2. **Commitea SIEMPRE con rutas explícitas:**
   ```bash
   git commit src/styles/tu-fichero.css docs/lo-tuyo.md -m "…"
   ```
   Esa forma **ignora el índice** para esas rutas: no puede arrastrar lo de nadie.
3. **Antes de commitear, mira qué llevas:** `git diff --cached --stat`. Si aparece un fichero
   que no es tuyo, sácalo con `git restore --staged <ruta>` — **no pierde su trabajo**, se queda
   en el árbol de su dueño.
4. **Si haces `reset` para deshacer, comprueba que los ficheros ajenos volvieron al árbol.**

> Contexto de mando: PARTE-02 §5 decía «no commiteas, commiteo yo». Sebastian ha autorizado
> directamente a varios frentes a commitear y empujar, y es su llamada. Con varios committers,
> estas cuatro reglas dejan de ser higiene y pasan a ser lo único que separa los encargos.
> **Si Sebastian no te ha dicho expresamente que commitees, no commitees.**

## 2. UN SOLO `astro dev` POR PROYECTO — tu puerto propio no existe

PARTE-02 §2 decía «tu puerto es tuyo y solo tuyo». **Es falso y lo midió un frente:**

```
Another astro dev server is already running. URL: http://localhost:4321  PID: 49102
```

Astro no admite dos servidores de desarrollo en el mismo proyecto **sea cual sea el puerto**.
Con nueve frentes, ocho arrancan y mueren.

**Lo que se hace:**

- **Hay UN dev compartido en `http://localhost:4321`. Úsalo.** Sirve el proyecto entero, así que
  tu página está ahí igual que la de todos. Verás CSS a medias de otros frentes: es normal y de
  hecho es útil.
- **NUNCA uses `--force`**: le tumba el servidor a un compañero en mitad de una captura.
- Si el 4321 no responde, levántalo tú (`npm run dev -- --port 4321`) y **avísalo**. El que lo
  levanta no es su dueño: es de todos.
- Con **«VENTANA DE PUERTAS»** el que lo tenga levantado lo baja.

## 3. LA PÁGINA DE LABORATORIO: el guion bajo NO funciona

Los nueve encargos dicen «`_lab-loquesea.astro` (guion bajo: Astro no la enruta)». Astro excluye
los `_*` del enrutado **también en dev** — verificado, 404. Tal cual está escrito, **la página de
laboratorio no se puede ni mirar**.

**El patrón bueno, y lo encontró el frente de R10-SEC:**

```astro
---
// src/pages/lab/[v].astro
export function getStaticPaths() {
  return import.meta.env.DEV ? [{ params: { v: 'a' } }, { params: { v: 'b' } }] : [];
}
---
```

Visible en `http://localhost:4321/lab/a` mientras desarrollas y **emite cero HTML en el build**,
así que `check:rutas` no se entera. Verificado: **PUERTA VERDE** con las ocho páginas de
laboratorio en el árbol.

Si ya montaste la tuya con guion bajo, déjala: no emite ruta y no molesta. Para mirar, usa
`src/pages/lab/[v].astro`.

## 4. `disenio/base.css` mentía sobre `capitalize` — corregido

Su cabecera afirmaba, «medido el 29-ago», que `text-transform: capitalize` **no** mueve
`innerText`. **Es falso**, y el error estaba en el caso de prueba: se midió con «Outdoor Living»,
que ya venía capitalizado, así que la transformación no tenía nada que hacer.

```
marcado    .vercel/output/static/index.html    "…Contractors in Florida"
baseline   baseline/text/index.txt:13          "…Contractors In Florida"
marcado    Nav                                 "Get a Free Estimate"
baseline   baseline/text/index.txt:8           "Get A Free Estimate"
```

**`capitalize` es load-bearing en las 114 páginas. No quites ninguno.** Quien leyera el comentario
viejo y «limpiara» un `text-transform` ponía en rojo `check:texto`, la única puerta que no se
re-baseliniza jamás. Lo cazó el frente de R9-HERO **leyendo el baseline en vez de creerse el
comentario**, que es exactamente la disciplina de la casa.

## 5. Corrección a un frente: `contratos.json` NO está vacío

Se ha reportado dos veces que `disenio/contratos.json` está vacío y que `/` no tiene contrato.
**Las dos son incorrectas:**

```
$ node -e "…" → claves raíz: [ '_', 'porDefecto', 'rutas' ] · rutas con contrato: 83
$ ¿está / ?  {"contrato":"rediseno","fecha":"2026-08-31","sha":"527b5f0","motivo":"R9-BLOG-01 …"}
```

`/` está en contrato `rediseno` desde el 31-ago. `check:visual` sale roja en `/` por **deriva
acumulada** —la banda de confianza, el CTA navy y el carrusel de blog entraron después del último
re-baseline— y ahora además por el héroe nuevo, que es un cambio deliberado. **No es por falta de
contrato.** El re-baseline es mío y va cuando Sebastian apruebe la home entera.

Regla general: `contratos.json` guarda las rutas bajo la clave **`rutas`**, no en la raíz. Leerlo
como `Object.keys(json)` da tres claves y parece vacío.
