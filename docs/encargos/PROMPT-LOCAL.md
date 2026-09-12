# PROMPT-LOCAL — cerrar lo que sólo se puede cerrar en la Mac

> **Para el chat local de Sebastian** (`~/Sites/mrandmrs-outdoor-living`).
> Escrito el 12-sep-2026 desde el contenedor remoto, que ya no puede avanzar más: lo que queda
> necesita un humano mirando, Photoshop, la cuenta de Google y un navegador con foco real.
>
> **Trabaja en automático.** No pares a preguntar salvo en los dos puntos donde este documento
> dice explícitamente «aquí para». Lo demás está decidido.

---

## 0 · De dónde partes

`main`, la rama `claude/happy-hamilton-u7vqjy` y producción están las tres en el mismo commit.
Las catorce fichas de `/services/` están **live**. Lo abierto no es código a medias: son cinco
tareas que el contenedor remoto no podía tocar.

```bash
cd ~/Sites/mrandmrs-outdoor-living
git fetch origin claude/happy-hamilton-u7vqjy
git checkout claude/happy-hamilton-u7vqjy && git pull origin claude/happy-hamilton-u7vqjy
git status --porcelain          # tiene que salir vacío antes de empezar
```

---

## 1 · Las reglas que muerden aquí y no allá

**Lee `CLAUDE.md` entero antes de tocar nada.** Estas cinco son las que cambian en local:

1. **`npm run build` sin `PUBLIC_ES_PRODUCCION=1` sabotea el SEO.** Escribe `Disallow: /` en
   `public/robots.txt` y deja `public/sitemap.xml` vacío. `check:cascaron` hace lo mismo.
   Siempre `PUBLIC_ES_PRODUCCION=1 npm run build`, y **antes de cada commit**:
   ```bash
   git status --porcelain public/robots.txt public/sitemap.xml   # vacío, o los restauras
   ```
   Esos dos ficheros **no se commitean nunca**.

2. **Las puertas de navegador piden foco real** (`docs/ENTREGA.md:218`). En el contenedor había
   `xvfb`; en tu Mac no. La ventana de Chromium se queda delante y **no la tocas** mientras corre.
   Si la tapas, la medición miente y sale un rojo que no es real.

3. **Nunca pases `/` como filtro** a `check-texto` ni a `check-visual`: casa por `includes()` y
   se lleva las 115 rutas (≈65 min de pantalla secuestrada). Para la home, exacto y con comillas:
   `node scripts/check-visual.mjs '=/'`.

4. **Mide sobre `.vercel/output/static`, jamás sobre `astro dev`.** Dev no hornea `width`/`height`.

5. **Nunca `git add -A`.** Fichero a fichero, siempre.

Y la regla de oro de este sitio, que no está en `CLAUDE.md` porque se ganó a golpes:

> **Mide los estados que no se ven.** El banner de éxito del formulario estuvo a **1.35:1** de
> contraste —negro sobre azul marino, la pantalla que ve un lead recién captado— y sobrevivió a
> diecisiete puertas. Ninguna lo vio porque **ese estado no existe hasta que el formulario se
> envía**. Lo cazó un panel adversario mirando a mano. Cuando toques un formulario, un lightbox
> o cualquier cosa con estados, **provoca el estado y mídelo**.

---

## 2 · T1 · GTM — va primero porque es el único que cuesta dinero

**El hecho:** `generate_lead` marca **0** en GA4 mientras **llegan leads reales al Gmail**
(4, 7, 8 y 11-sep, con `TURNSTILE_SECRET` puesto en producción). El circuito de entrega funciona.
Lo que no dispara es la conversión.

### Antes de tocar GTM, parte el problema en dos

El encargo anterior daba por hecho que la culpa era de GTM «y de nada más». **Leyendo el código,
eso no está probado.** El `generate_lead` no cuelga del envío: cuelga de una llave en
`sessionStorage`. La cadena real es ésta:

1. `src/components/Formularios.astro:192` — el servidor acepta (`entregado`) y **sólo entonces** se
   escribe `sessionStorage['mm_lead']` con los campos categóricos. Si el antibot descarta en
   silencio, se enseña el panel de éxito pero **no se escribe `mm_lead` ni se va a `/thank-you`**
   (líneas 180-184, y está comentado a propósito).
2. `Formularios.astro:221` — `location.assign('/thank-you?f=' + idForm)`.
3. `src/pages/thank-you.astro:147-167` — lee `mm_lead`, lo **borra**, y empuja **un** `generate_lead`
   al `dataLayer`. Si la llave no está, **hace `return` y no empuja nada**. El `?f=` no interviene:
   es sólo la etiqueta del formulario.

Así que hay dos fallos posibles, y se distinguen por una sola comprobación.

**Media respuesta ya la tienes**, y está en la bitácora: GA4 registra **18 páginas vistas en
`/thank-you`** frente a **0 `generate_lead`**. Es decir: **se llega a `/thank-you`**, así que el
paso 2 funciona y el dedo apunta a GTM. Pero 18 en ocho meses y medio es muy poco, así que
**crúzalas por fecha** antes de dar el paso 1 por bueno:

> **¿Hay páginas vistas de `/thank-you` los días 4, 7, 8 y 11 de septiembre**, que es cuando
> entraron los leads reales al Gmail?

- **Sí** → llegó, la llave estaba, el push salió. El fallo es **GTM**: el tag no dispara o algo lo
  bloquea. Sigue con el sospechoso de abajo.
- **No** → esos leads llegaron al correo **sin pasar por `/thank-you`**, y entonces hay un segundo
  fallo antes de GTM: o el antibot los marcó como descartados (`Formularios.astro:184`, que corta
  sin redirigir aunque el servidor haya entregado), o `sessionStorage` estaba vacío al llegar. Eso
  se depura en código, aquí, y **no se arregla tocando GTM**.

Haz ese cruce **primero**. Ahorra toda la rama equivocada.

### El sospechoso, si resulta ser GTM

El trigger `BLOQUEO - Entornos de preview`, con condición `{{_event}}` casando `.*`. Un `.*` casa
con **todo**, incluido producción — un blocker pensado para preview que estaría bloqueando el
sitio real.

### Qué entregas

La **ruta de clics exacta**: contenedor, trigger, qué condición cambiar y por cuál. Y si la
respuesta a la pregunta de arriba fue «no», el diagnóstico del circuito con el fichero y la línea.

> **AQUÍ PARAS.** La cuenta de Google la toca Sebastian, no tú. Le entregas el diagnóstico y
> sigues con T2 mientras él lo aplica.
> Los nueve pendientes de Sebastian están listados en `docs/encargos/R17-CORE.md` §13.

**Por qué es el primero:** mientras `generate_lead` siga a 0, el veredicto de la landing es
**READY AFTER FIXES**, no *READY FOR PAID SEARCH*. Reanudar la campaña de **$1.600/mes** ahora
sería pagar por conversiones que nadie está registrando.

---

## 3 · T2 · Mirar las trece fichas que están live sin revisar

Sebastian revisó **una** —la piloto de piscinas, a 1440, 991 y 390— y aprobó la dirección. Las
otras trece se construyeron, se verificaron y se publicaron en el mismo tramo. **Están en
producción sin que él las haya visto.**

Y el contrato visual sigue abierto: las catorce figuran en `disenio/contratos.json` con contrato
`rediseno` apuntando a `sha 527b5f0` / `2026-08-31` — **una referencia anterior al rediseño**. Así
que `check:visual` sale roja en las catorce *por diseño*. Esa puerta existe exactamente para esto:
para que nada se publique sin que un humano lo mire.

### La secuencia, en este orden y sin saltarse pasos

```bash
PUBLIC_ES_PRODUCCION=1 npm run build
node scripts/check-visual.mjs custom-pool-spa-builders    # mira el rojo: te dice QUÉ cambió
# --> Sebastian mira la página. Sin eso no se sigue.
node scripts/aprobar-diseno.mjs /services/custom-pool-spa-builders-in-north-south-florida --si
```

`aprobar-diseno.mjs` **se niega** si el árbol de git no está limpio, si falta `--si`, si no hay
build o el build es más viejo que `src/`, o si queda un `[data-w-id]` invisible. No pelees con las
negativas: cada una tapa un agujero real. Y ojo con la última — **hornearía una sección en blanco
como si fuera el diseño aprobado**.

Es el **único acto irreversible del sistema**: a partir de ahí `check:visual` deja de defender la
captura de Webflow y pasa a defender ésta. Si la captura nueva lleva un defecto dentro, el defecto
se convierte en la verdad.

> **AQUÍ PARAS EN CADA RUTA.** Tú preparas y mides; **quien aprueba es Sebastian mirando**. No
> corras `--si` por tu cuenta ni «para ir adelantando».

### Las catorce

```
/services/custom-pool-spa-builders-in-north-south-florida          <- la piloto, ya revisada
/services/pool-remodeling-renovation-in-north-south-florida
/services/pool-screen-enclosures-for-north-south-florida-pools
/services/patio-screen-rooms-enclosures-in-north-south-florida
/services/motorized-retractable-screens-in-north-south-florida
/services/motorized-louvered-roof-systems-in-north-south-florida
/services/custom-aluminum-pergola-builders-in-north-south-florida
/services/custom-deck-builders-in-north-south-florida
/services/custom-outdoor-kitchens-for-north-south-florida-homes
/services/premium-outdoor-furniture-for-north-south-florida-homes
/services/professional-landscaping-services-in-north-south-florida
/services/smart-irrigation-system-installation-in-north-south-florida
/services/smart-soffit-led-lighting-installation-in-north-south-florida
/services/steel-building-pole-barn-construction-in-north-south-florida
```

**Lo que sí puedes aprobar de una tacada:** el script acepta varias rutas
(`node scripts/aprobar-diseno.mjs /a /b /c --si`) y escribe al final, no sobre la marcha, para que
un fallo en el ancho 3 no deje una ruta con dos anchos nuevos y dos viejos. Úsalo **después** de
que Sebastian haya mirado el lote, no antes.

---

## 4 · T3 · El consentimiento SMS — y una corrección al encargo anterior

**El apunte que traía el encargo estaba mal en dos cosas. Éstos son los datos medidos hoy.**

Son **tres** formularios, no cuatro. Los tres llevan `required` en la casilla de consentimiento:

| Dónde está | Cómo se edita | Línea |
|---|---|---|
| `_source/vivo/contact-us.html` | **derivado** → `src/pages/contact-us.astro` | busca `name="Checkbox"` |
| `_source/vivo/request-estimated.html` | **derivado** → `src/pages/request-estimated.astro` | ídem |
| `src/components/GalleryLeadLightbox.astro` | **directo** | `92` |

Y el defecto es **el contrario** del que estaba anotado: el problema es que `required` **está**,
no que falte. **47 CFR §64.1200(a)(2)** no permite que el consentimiento a marketing por SMS sea
condición para recibir el servicio, y un `required` lo convierte exactamente en eso.

**La ficha piloto ya lo hace bien.** `src/components/widgets/FormularioCore.astro:214-217`: sin
`required`, `value="Yes"`, y la etiqueta lo **dice** — *«This is optional and is not required to
get an estimate.»*. **El arreglo es replicar el piloto en los otros tres.** No inventes redacción:
copia la del piloto, literal.

### Dos trampas, las dos verificadas hoy

**a) Dos de los tres son DERIVADOS.** Tocar `src/pages/contact-us.astro` a mano no sirve:
`scripts/build-paginas.mjs` lo regenera desde `_source/vivo/` y se lleva tu cambio por delante.
Editas el `_source/vivo/*.html` y luego:

```bash
node scripts/build-paginas.mjs
git diff --stat src/pages/contact-us.astro src/pages/request-estimated.astro
```

**b) `check:texto` sólo se entera en UNA de las tres.** Contado sobre el build actual: la frase
del consentimiento aparece en 4 páginas del HTML, pero **sólo `/contact-us` la tiene en
`baseline/text/`**. Las otras son invisibles a la puerta porque `innerText` no ve lo que está
oculto: en `/request-estimated` la casilla vive en el paso 3 del formulario multi-paso, y en
`/gallery` el lightbox está cerrado (`GalleryLeadLightbox.astro:23`, `enGaleria`, lo dice su propio
docblock: *«baseline/text/gallery.txt son 110 líneas y ninguna es del formulario»*).

O sea: **declara sólo `/contact-us`**, y con lista de rutas cerrada, nunca `null`. El sitio exacto
es `LINEAS_ANADIDAS` en `scripts/check-texto.mjs:500`, y ya tienes el molde hecho —
`check-texto.mjs:1183-1186` declara esa misma frase para la piloto. Sigue ese patrón.

Que la puerta no vea las otras dos **no es permiso para no mirarlas**: es justamente el caso de la
regla de oro del §1. Abre el paso 3 de `/request-estimated` y el lightbox de `/gallery` y
compruébalo con los ojos.

### Y avisa de esto

`/contact-us` y `/request-estimated` **también tienen contrato `rediseno`**. Tocarlas las pone
rojas en `check:visual` hasta re-aprobarlas — mismo procedimiento del T2, mismo «aquí paras».

### Comprobación

```bash
npm run check:tokens
PUBLIC_ES_PRODUCCION=1 npm run build
node scripts/check-texto.mjs contact-us
node scripts/check-texto.mjs request-estimated
node scripts/check-texto.mjs gallery
grep -o 'name="Checkbox"[^>]*required' .vercel/output/static/contact-us/index.html | wc -l   # -> 0
```

---

## 5 · T4 · El «Before» del antes/después

La sección salió porque la foto original era de un listado del MLS de Miami. **Todo lo demás está
decidido** en `docs/encargos/R17-CORE.md` §10 — léelo entero, no lo resumas:

- **La obra** (§10.1): `estate-pool-spa-sun-shelf-north-florida`, plano aéreo, 1250×698. Gana por
  una razón técnica: la piscina y su terraza son una isla rodeada de césped por tres lados **dentro
  del mismo encuadre**, así que el «antes» se rellena con césped que ya está en la propia foto.
  El modelo no inventa el material: lo copia de al lado.
- **La escena** (§10.2), descrita al detalle.
- **La máscara** (§10.3): la isla construida —vaso, spa, terraza, inlay, canto rodado y el
  mobiliario que está encima—. **Fuera de la máscara se queda la losa del lanai**: es anterior a
  la piscina, borrarla sería inventar de más.
- **Los tres prompts**: corto, largo y negativo. Literales.

**La técnica manda sobre la marca.** Hace falta **relleno generativo con máscara sobre la foto
real**, no texto-a-imagen: **Photoshop Generative Fill** primero. Higgsfield (`~/.local/bin/hf`,
`~/.higgsfield.env`) **sólo si su endpoint acepta init image + máscara** — `00-PRINCIPIOS.md:38`
lo documenta como *still dirigido* texto-a-imagen, y sin `init image` daría **otro patio**, que es
justo el problema que venimos a arreglar.

**La regla que no se toca:** nunca se genera obra que parezca del cliente
(`00-PRINCIPIOS.md` §3). Aquí la obra es real y lo generado es su **ausencia** — y aun así **va
etiquetado**.

---

## 6 · T5 · `page.clock.install()` en `scripts/lib/captura.mjs`

`check:texto` sale roja en **exactamente** las catorce fichas de `/services/` — que son
**exactamente** las catorce que llevan el carrusel de proceso. Trece de ellas son byte-idénticas a
su base, así que **el rojo es de la puerta, no del contenido**: el carrusel avanza a los 5 s
(`AUTOPLAY_DELAY`, citado en `scripts/lib/captura.mjs:137`) y la captura lo pilla a medio girar.

El arreglo es congelar el reloj con `page.clock.install()` antes de la captura. Cierra las catorce
de una vez.

**Va el último a propósito: toca una puerta, y las puertas son del director.** Prepáralo, mide que
las catorce pasan a verde, **y entrega el diff sin commitear hasta que Sebastian diga.** Un cambio
en la recinstrumentación de medida que nadie revisó es la forma más rápida de volver verde algo que
está roto.

---

## 7 · Cómo se entrega

**Autorizado sin preguntar:** `PUBLIC_ES_PRODUCCION=1 npm run build`, correr las puertas que este
documento nombra, commitear **fichero a fichero** y `git push -u origin claude/happy-hamilton-u7vqjy`.
El paso a `main` y el despliegue los da Sebastian.

**Un commit por tarea**, con el mensaje diciendo qué se midió. Cierra el pie con:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Y deja constancia en `MIGRACION-LOG.md`: qué cerraste, con qué puerta, y **qué puertas se saltaron
por falta de referencia**. Una puerta que no corrió **no es una puerta verde** — falla ABIERTO
(`docs/encargos/DIRECTOR.md:149`). Dilo aunque el verde acabe saliendo.

---

## 8 · Lo que NO se hace

- **Ni una cifra financiera.** Decisión de Sebastian del 2-sep-2026 (TILA / Reg Z). Ni rangos, ni
  «desde», ni cuotas.
- **Nada sin verificar se publica**: años de experiencia, número de piscinas, «5 estrellas»,
  garantías, urgencia falsa (`src/lib/negocio.mjs`).
- **No barras el sitio.** Nada de `ui-qa`, `carrusel-qa` ni `0.8.0:audit` por iniciativa propia, y
  nada de abrir el preview e ir pasando páginas. Lo que este documento pide por su nombre, sí.
- **No toques** DNS, la cuenta de Google Ads, GTM/GA4 ni abras un PR. Eso es de Sebastian.
- **No corras `aprobar-diseno.mjs` sin que él haya mirado la página.**
