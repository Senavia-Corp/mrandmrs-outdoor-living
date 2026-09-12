# ENCARGO R19 — cerrar la ficha piloto y extender a las 13 restantes

> **Este prompt se ejecuta de principio a fin sin pedir permiso a mitad.** Cuando termines la
> ruta piloto **NO pares a preguntar**: sigue con las trece fichas restantes. Solo se para en los
> bloqueos que estan nombrados abajo, y esos ya vienen con su respuesta.

---

## 0 · Donde estas

- **Repo:** `~/Sites/mrandmrs-outdoor-living` · rama **`claude/happy-hamilton-u7vqjy`**
- **Manda `CLAUDE.md`.** Leelo antes de nada. Lo de abajo no lo sustituye.
- **Ruta piloto:** `/services/custom-pool-spa-builders-in-north-south-florida`
- **Que es:** la Final URL del ad group de Google Ads «Pool Builders Core» — 20 de 39 keywords de
  una campana de **$1.600/mes parada esperando al sitio**. No es una pagina mas: cada defecto
  aqui se paga en clics comprados.
- **Los cambios estan registrados y medidos** en **`docs/encargos/R19-CAMBIOS.md`**. Leelo
  entero antes de tocar codigo: lleva las medidas hechas para que no las repitas.
- **El historial de como se llego aqui** esta en `docs/encargos/R17-CORE.md` y en
  `MIGRACION-LOG.md`.

### Lo que YA esta hecho y no hay que rehacer

La ficha ya tiene formulario propio de 9 campos con su circuito entero, franja de confianza en
navy con filetes de oro, banda de inversion, carrusel de obras filtrado a 4 piscinas, FAQ
ampliada, y el `FAQPage` arreglado. Score interno **88 -> 95**. Trece commits, de `a4c7185` a
`b889993`. **1 de 122 paginas cambia**; las otras 121 salen byte a byte iguales, y eso hay que
mantenerlo.

---

## 1 · Lo que hay que hacer en la ficha piloto

Los cinco cambios estan detallados **con sus medidas** en `R19-CAMBIOS.md`. Resumen ejecutable:

| | Cambio | Lo que NO puedes hacer a la ligera |
|---|---|---|
| **C4** | Fundir «Why homeowners pick us» + «Intro» (`trusted-section`) en UNA seccion con el mismo fondo, y subirla **antes del formulario** | `.trusted-section` la montan **121 rutas**: neutraliza su fondo **solo en esta ruta** con un selector `.svc-`. Y **vuelve a medir el fondo**: el perfil de C1 ya no vale porque la caja cambia de alto y `cover` recorta distinto |
| **C3** | «What will my pool cost?» a **50/50**: foto de obra a altura completa a la izquierda, fondo azul con texto y botones a la derecha | La foto **no puede repetir** ninguna de las 4 que ya usa la pagina. Elige **por hoja de contactos**, y el criterio es **el recorte**, no la belleza: la columna es vertical y `object-fit: cover` se come los lados |
| **C5** | El heroe: telefonos y CTA estan a **0 px** uno de otro; componer el aire, y revisar movil | Medido: arriba el ritmo es 8/10/10 y abajo cae a 0. El pliegue a 390×844 con los **80 px reservados** del boton flotante **no puede empeorar** |
| **C2** | Probar el formulario **de verdad** al final y confirmar en Gmail | Ver §4. Tiene trampa y puede costar el 100 % de los leads |

**El orden final de las 15 secciones esta confirmado y cotejado** en `R19-CAMBIOS.md`. De «What
we do» hacia abajo **ya esta bien: no lo toques.** Lo unico estructural es subir `trusted-section`
del puesto 6 al 4.

---

## 2 · Las reglas de la casa que muerden

Estas son las que ya han cazado a alguien en este repo. No son burocracia.

1. **No barras el sitio.** Nada de recorrer las 115 rutas «a ver como va». Acota siempre.
2. **NUNCA pases `/` como filtro** a `check-texto` ni a `check-visual`: casa por `includes()` y
   te lleva las 115 creyendo que mides 4. Para la home, `'=/'` **con comillas**.
3. **Verifica sobre `.vercel/output/static`, JAMAS sobre `astro dev`**: dev no hornea
   `width`/`height` y las medidas mienten.
4. **Corre las puertas con el mismo `PUBLIC_ES_PRODUCCION` que el build.**
5. **`npm run build` sin `PUBLIC_ES_PRODUCCION=1` reescribe `public/robots.txt` con
   `Disallow: /` y vacia `public/sitemap.xml`.** Si pasa, restauralos y **no los commitees jamas**.
6. **Nunca `git add -A`.** Fichero a fichero.
7. **Colores solo por token.** `check:tokens` prohibe literales fuera de `disenio/tokens.css`.
   Nada de `!important`, nada de `@layer`.
8. **El presupuesto de la capa CSS es real:** tope 80 KB, quedan **~1.900 bytes sin comentarios**.
   Los comentarios se quitan antes de medir: **documentar es gratis, el CSS no**.
9. **`.svc-` NO es un prefijo libre.** `ServiciosPorCategoria.astro` ya usa `svc-icono`,
   `svc-barra`, `svc-ficha`, `svc-chevron`, `svc-nombre`, `svc-panel`, `svc-cat`, `svc-fila`,
   `svc-foto`, `svc-cabecera`, `svc-contador`, `svc-cta`, `svc-cuerpo`, `svc-cats`. Comprueba
   cualquier nombre nuevo contra ese fichero.
10. **Contraste por PEOR PIXEL, nunca promedio.** Texto >= 4,5:1, grafico/UI >= 3:1. **Da el
    numero medido**, no la palabra «cumple».
11. **`check:texto` compara innerText al 100 % y NO se re-baseliniza nunca.** Texto nuevo ->
    `LINEAS_ANADIDAS`. Reordenar lineas del baseline -> `REORDENADAS_A_PROPOSITO`, que exige el
    bloque exacto antes->despues y revienta si las listas no tienen las mismas lineas.
12. **Las otras 121 paginas salen byte a byte iguales.** Se admite que cambie el hash del bundle
    CSS. Compruebalo, no lo supongas.

### Utilidades que ya existen — usalas antes de escribir CSS

- **`.mm-inverso`** (`disenio/base.css`): seccion oscura que **redefine los papeles** del ambito
  —tinta->blanco, atenuada->#c7cddd, superficie->#1a3373, borde->#29407c y **foco->blanco**—.
  Da el fondo navy **por cero bytes**.
- **`.mm-tono`**, **`.mm-tarjeta`**, **`.mm-tarjeta--alta`**, **`.mm-accion`**,
  **`.mm-accion--linea`**, **`.mm-seccion`**, **`.mm-caja`**, **`.mm-medida`**.
- **El oro:** `base.css` lo reserva para `.mm-accion` porque sobre blanco da **1,86:1**. Sobre
  navy da **8,40:1**, y dentro de `.mm-inverso` el sistema ya usa oro claro como color de enlace.
  Oro sobre oscuro esta permitido y **esta documentado por que**; oro sobre claro, no.

---

## 3 · Como se verifica

```bash
MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1 npm run build
npm run check:tokens                      # <1 s, la primera siempre — vigila el presupuesto
npm run check:rutas && npm run check:enlaces
PUBLIC_ES_PRODUCCION=1 npm run check:seo
PUBLIC_ES_PRODUCCION=1 npm run check:ads
npm run check:medicion && npm run check:aviso && npm run check:carrusel
node scripts/check-texto.mjs  '=/services/custom-pool-spa-builders-in-north-south-florida'
npm run check:ix2                         # NO lee argv: va entero. Tarda.
node scripts/check-visual.mjs '=/services/custom-pool-spa-builders-in-north-south-florida'
```

**En este entorno las puertas de navegador necesitan `xvfb-run`:**
`xvfb-run -a --server-args="-screen 0 1920x1200x24" npm run check:ix2`

### Rojas ESPERADAS — clasificalas, no las escondas

- **`check:texto`: PUERTA ROJA en 14 paginas — `PRE-EXISTING KNOWN RED`.** Son exactamente las 14
  fichas de `/services/`, que son exactamente las 14 que montan la seccion de proceso. Firma
  identica `faltan 2 lineas, sobran 2`. Causa **probada**: `AUTOPLAY_DELAY = 5000` pasa la
  diapositiva sola y la captura lee el paso 2. **Es defecto de la puerta, no de las paginas.**
  Si tu ruta da esa firma, esta bien. Si da otra cosa, **es tuya**.
- **`check:visual`: ROJA y CORRECTA.** Contrato `rediseno` con referencia del 31-ago. Sale con
  `node scripts/aprobar-diseno.mjs <ruta> --si`, que exige arbol limpio y **humano**. No la
  fuerces.
- **`check:assets`: `ENVIRONMENT BLOCKER`.** Lee de `_source/sanity-masters/`, que esta en
  `.gitignore:12`: **no puede pasar en ningun clon nuevo**. No pierdas tiempo.
- **`check:cascaron` NO se corre**: reescribe `robots.txt` y `sitemap.xml` con versiones de
  preview.

**Una puerta que no corrio no es una puerta verde.** Si se salta, dilo.

---

## 4 · C2 — la prueba del formulario, y su trampa

Sebastian **autoriza** un envio real con sus datos: `sebastian@senaviacorp.com`. Eso **levanta**
la prohibicion del encargo original sobre envios de prueba.

### 🚨 Comprueba esto ANTES, o la prueba no significa nada

En la preview, el widget de Turnstile sale **en estado de error** («No es posible conectarse al
sitio web»), que es lo que hace cuando **el dominio no esta dado de alta** en Cloudflare.

| Entorno | `TURNSTILE_SECRET` | Consecuencia |
|---|---|---|
| preview | **no** puesta | `validaTurnstile` devuelve `'ok'` — falla ABIERTO. Pero no hay SMTP: el envio da 500 |
| **produccion** | **SI** puesta | si el dominio no esta de alta: sin token -> `'sin-token'` -> **403 en TODOS los leads** |

O sea: en produccion, **secreto puesto + dominio sin registrar = se pierde el 100 % de los
leads**, en silencio, con el formulario pareciendo normal. `formulario.ts:30-31` avisa de la
variante hermana: cruzar las claves da `invalid-input-secret`, «peor que no ponerla».

**Pasos, en orden:**

1. **Verifica en Cloudflare** que el widget `0x4AAAAAAEnkUHbX6ap29qsu` tiene de alta
   `www.mrandmrsoutdoorliving.com` y `mrandmrsoutdoorliving.com`. Hay conexion de `cloudflare` en
   Composio: **compruebalo, no preguntes**.
2. **Prueba el rechazo sin mandar correo**: honeypot `ref_id` relleno y time-trap (envio antes de
   1 s) tienen que ser rechazados.
3. **Envia** con `sebastian@senaviacorp.com` y datos reconocibles como prueba.
4. **Confirma en Gmail** que llego. Asunto esperado:
   `New lead · Pool builders core lead · <ZIP>`. Hay conexion de `gmail` en Composio.
5. **Donde se prueba:** el envio real solo funciona donde hay SMTP, que hoy es **solo
   produccion** (en preview solo esta `LEAD_TO`). Si produccion no esta desplegada con estos
   cambios, **dilo y no inventes una prueba que no probaste**.

---

## 4.bis · ARREGLA LOS DEFECTOS DE DISENO QUE ENCUENTRES POR EL CAMINO

Sebastian lo pide expresamente: **si al hacer un cambio ves un defecto de diseno, arreglalo.** No
lo apuntes para luego. Pero con un limite, porque este sitio promete que 121 paginas salen byte a
byte iguales y eso no se rompe por una mejora.

### Lo que SI arreglas, sin preguntar

Defectos **en las secciones que estas tocando** o **en la ruta en la que estas trabajando**, que
puedas **demostrar con una medida**:

- contraste por debajo de umbral (peor pixel, nunca promedio)
- desbordamiento horizontal
- objetivos tactiles por debajo de 44 px que no esten dentro de un envoltorio alcanzable
- huecos muertos, ritmos rotos, asimetrias que no tienen motivo
- costuras de color entre secciones vecinas
- imagenes repetidas en la misma pagina
- `width`/`height` que falten y provoquen CLS
- saltos de nivel en la jerarquia de encabezados **que tu cambio introduzca**
- colisiones de nombre de clase
- textos que se salen, se parten mal o pierden su linea base

**Y arreglalo con su medida escrita en el codigo**: «iba a X, ahora a Y», como esta el resto de
la hoja. Un arreglo sin numero es una opinion.

### Lo que NO arreglas: lo reportas

**Si el defecto vive en marcado o CSS COMPARTIDO, tocarlo mueve las otras 121 paginas y rompe la
garantia de identidad.** Eso no es tuyo: se documenta y se deja escrito de quien es.

Ejemplos reales ya detectados en este repo, y ninguno se toco:

- **73 enlaces del pie por debajo de 44×44** — cromo del sitio, en las 122 paginas.
- **El salto `h2 -> h4` del marquee del pie** — esta en las catorce fichas.
- **`CarruselProyectos` no declara `width`/`height`** en sus slides — lo montan 66 rutas.
- **El anillo de foco de los acordeones es invisible por debajo de 992** (1,12:1) — alcanza a las
  14 fichas.
- **Cualquier clic fuera cierra la respuesta de la FAQ que estas leyendo.**

**La regla para decidir:** ¿el selector que tendrias que tocar lo usa alguna otra ruta? Compruebalo
—`grep -rlo 'la-clase' .vercel/output/static --include='*.html' | wc -l`— y si la respuesta es mas
de una, **reportalo en vez de arreglarlo**.

### El listo que hay que tener

Los defectos que mas han dolido en este encargo **no se veian en una captura**:

| Defecto | Por que no se veia |
|---|---|
| Banner de exito a **1,35:1** | ese estado no existe hasta que se envia el formulario |
| Foto del heroe **repetida** como portada de su propia tarjeta | hay que mirar la pagina entera, no la seccion |
| **65 px de costura blanca** entre dos secciones | solo aparece cuando una de las dos cambia de color |
| Padding **96 arriba / 32 abajo** | la justificacion escrita era correcta… para el diseno anterior |
| Colision de `.svc-icono` con otro componente | hay que barrer los nombres, no leer el diff |

**Mide los estados que no se ven**: banners de exito y de fallo, estados de foco, `:hover`,
`prefers-reduced-motion`, campos en error, formulario enviado, carruseles en marcha.

---

## 5 · Y DESPUES, SIN PARAR: las 13 fichas restantes

En cuanto la piloto este verde y commiteada, **sigue**. No preguntes.

```
custom-aluminum-pergola-builders-in-north-south-florida
custom-deck-builders-in-north-south-florida
custom-outdoor-kitchens-for-north-south-florida-homes
motorized-louvered-roof-systems-in-north-south-florida
motorized-retractable-screens-in-north-south-florida
patio-screen-rooms-enclosures-in-north-south-florida
pool-remodeling-renovation-in-north-south-florida
pool-screen-enclosures-for-north-south-florida-pools
premium-outdoor-furniture-for-north-south-florida-homes
professional-landscaping-services-in-north-south-florida
smart-irrigation-system-installation-in-north-south-florida
smart-soffit-led-lighting-installation-in-north-south-florida
steel-building-pole-barn-construction-in-north-south-florida
```

**Las 14 son la misma plantilla** — verificado elemento a elemento: mismo orden de secciones,
14 `h2`, 15 `h3`, 3 `h4`, 70 `<img>`, 17 `<a>`, 8 subservicios, 4 pasos, 5 FAQ.

### Lo que cuesta cada ficha

| Pieza | Coste |
|---|---|
| Las 3 secciones nuevas | **1 entrada** en `src/data/captacion-servicios.json` |
| El enganche del generador | **1 linea** en la lista de rutas de `build-paginas.mjs` |
| `servicio-core.css` | **0** — el prefijo `.svc-` se escribio para las 14 |
| `check:texto` | sus declaraciones, por ruta |
| `check:ads` | solo si es landing de pago |

### El contenido de cada ficha NO se inventa

- Copy: de lo que **esa** ficha ya sostiene. Si dice «warranty» 0 veces, no se escribe garantia.
- Foto de C3: de las obras de **ese** servicio, sin repetir las que ya salen en la pagina.
- **Prohibido publicar lo no verificado**: anos de experiencia, numero de obras, «5 estrellas»,
  garantias, urgencia falsa. **Ni una cifra financiera** (decision de Sebastian del 2-sep,
  TILA/Reg Z).
- **Ningun asset generado por IA puede parecer obra del cliente** (`00-PRINCIPIOS.md` §3).

### Ficha a ficha, el ciclo

1. Entrada de JSON + linea en el generador.
2. `npm run paginas` y `npm run build`.
3. Puertas **acotadas a esa ruta**.
4. Identidad: **solo esa pagina cambia**.
5. Commit con su medida en el mensaje. **Push.**
6. Siguiente. Sin preguntar.

---

## 6 · Permisos

**SI puedes, sin preguntar:** construir · `npm run paginas` · commitear fichero a fichero ·
**push** a `claude/happy-hamilton-u7vqjy` · el envio real de prueba del §4.

**NO puedes sin que Sebastian lo diga:** abrir PR · **merge a `main`** (dispara el despliegue a
**www.mrandmrsoutdoorliving.com**, el sitio real) · tocar DNS · la cuenta de Google Ads · GTM/GA4 ·
`aprobar-diseno.mjs` (exige humano).

---

## 7 · Lo que queda abierto, y de quien es

1. **El «Before»** del antes/despues: la foto original era de un listado del **MLS de Miami** y la
   seccion salio. Obra elegida, mascara y prompts en `R17-CORE.md` §10. **De Sebastian.**
2. **Aprobar las capturas** -> `aprobar-diseno.mjs`. **De Sebastian.**
3. **Merge a `main`** para que esto salga a produccion. **De Sebastian.**
4. **`generate_lead` a 0 en GA4** en ocho meses y medio con `/thank-you` en 18 paginas vistas.
   Sospechoso: el trigger `BLOQUEO - Entornos de preview` con condicion `{{_event}} .*`.
   **Es de GTM, no de este repo.** Mientras siga a 0, el veredicto es READY AFTER FIXES y **no**
   READY FOR PAID SEARCH.
5. **Consentimiento SMS `required`** en los otros 4 formularios del sitio (47 CFR §64.1200(a)(2)).
   **Decision de Sebastian.**
6. **`page.clock.install()`** en `scripts/lib/captura.mjs` cerraria el rojo de `check:texto` en
   las 14 fichas de golpe. **Del director.**
7. **`check:assets`** no pasa en ningun clon nuevo. **De alguien, no de este encargo.**

---

## 8 · Como se informa

Al cerrar cada ficha, y al cerrar el encargo:

- **Numeros con el comando que los produjo.** Un numero sin su comando es una opinion.
- **Cada roja clasificada**: `NEW REGRESSION` / `PRE-EXISTING KNOWN RED` / `ENVIRONMENT BLOCKER`.
- **Lo que no se pudo medir se dice**, no se maquilla.
- Documenta en `MIGRACION-LOG.md` con la plantilla de la casa, y actualiza
  `docs/informes/GOOGLE-ADS-QUALITY-SCORE-MATRIX.md` si tocas una landing de pago.

**Y una advertencia que vale mas que ninguna regla:** en este encargo, dos de los tres defectos
mas graves los encontro **medir el resultado construido**, no releer el diff. El banner de exito
del formulario llevaba **1,35:1** —negro sobre navy, la pantalla que ve quien acaba de dejar el
lead— y sobrevivio a las 17 puertas, a una auditoria a cuatro anchos y a un red team, porque
**ese estado no existe hasta que se envia el formulario**. Mide los estados que no se ven.
