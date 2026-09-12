# R19 — cambios pedidos por Sebastian sobre la ruta piloto, y extension a las 13 restantes

**Estado:** recogiendo. Sebastian los va dictando; aqui se registran con su medida al lado para
que el prompt final no tenga que re-investigar nada.

**Ruta piloto:** `/services/custom-pool-spa-builders-in-north-south-florida`
**Preview donde los mira:** `mrandmrs-outdoor-living-git-claude-happy-ham-acc2a8-senaviacorp.vercel.app`

---

## C1 · ~~La franja «Why Homeowners Pick Us» tiene que usar el fondo de `.trusted-section`~~

> ⚠️ **SUPERSEDIDO POR C4.** Sebastian lo mejoro: en vez de copiar el fondo de una seccion a
> otra, se **funden las dos en una sola** y comparten fondo por construccion. Lo que sigue se
> conserva porque **la medida del fondo y sus tres capas siguen valiendo** para C4.

**Lo que pide:** el azul de la franja no es el mismo que el de la seccion «Custom Pool & Spa
Builders Serving In North & South Florida». Replicar ESE fondo y ese efecto en la franja de
arriba.

### Que es ese fondo, exactamente

No es un azul plano. Son **tres capas**, y la tercera es un truco deliberado:

| Capa | De donde | Que hace |
|---|---|---|
| `background-image: url(/images/site/animateddivs-image.webp)` + `background-size: cover` | `webflow.css` | la onda azul. 34.698 B, en git, la usan **121 rutas** |
| `background-color: var(--mm-azul-500)` | `propio.css:261` | reserva. Antes era `#3185ca`, que con el blanco encima daba 3,93:1; se cambio a `--mm-azul-500` (7,47:1) |
| `box-shadow: inset 0 0 0 100vmax color-mix(in srgb, var(--mm-navy) 50%, transparent)` | `intro.css:50` | **el velo**. Va por `inset box-shadow` y no por pseudo-elemento a proposito: no toca `position`, no crea contexto de apilamiento, no anade un elemento y **no necesita `url()`** |

### ⚠️ LA MEDIDA QUE DECIDE COMO SE HACE

Aislado el fondo (escondido el contenido) y medido el **peor pixel por bandas** a 1440:

```
banda   y     peor pixel   blanco   #c7cddd   oro
   0     0     #98e2f1      1,45 !    1,10 !   1,28 !   <- FRANJA CLARA ARRIBA
   1    69     #2b4196      9,13      5,74     4,92
   …    …      …            …         …        …
   7   483     #2a52a0      7,47      4,69     4,02
   8   552     #2956a3      7,11      4,47 !   3,83     <- el cuerpo atenuado cae
   9   621     #265ba5      6,73      4,23 !   3,62
```

**El fondo NO es uniforme.** Tiene una banda de cian claro (`#98e2f1`) en el 10 % superior donde
no se lee nada, y en el 20 % inferior el cuerpo atenuado `--mm-tinta-inversa-2` baja de 4,5:1.

`.trusted-section` se salva porque su texto cae en la zona segura. **La franja no:** su `<h2>`
va arriba del todo —justo en la banda de cian— y los cuerpos de las tarjetas abajo.

### Como hacerlo, entonces

Copiar las tres capas **no basta**. Hay que resolver una de estas, y verificarlo midiendo:

1. **Velo mas hondo** para esta seccion (navy por encima del 50 %) hasta que el peor pixel deje
   pasar blanco, `#c7cddd` y oro con margen; o
2. **`background-position`** que se salte la banda clara; o
3. **cuerpo en blanco** en vez de `--mm-tinta-inversa-2` dentro de la franja (sube a 15,60 sobre
   navy, y sobre este fondo aguanta donde el atenuado no).

Sea cual sea: **se mide el peor pixel por bandas, como arriba, y se acredita el numero.** No se
da por bueno «se parece».

### Efectos colaterales a vigilar

- `servicio-core.css` pasaria a pedir un `url()`. La imagen esta en git y la piden 121 rutas, asi
  que `check:enlaces` deberia seguir verde — **hay que comprobarlo**, no suponerlo.
- El heroe ya trae foto. Franja con imagen + heroe con imagen seguidos: mirar que no compitan.

---

## C2 · Probar el formulario de verdad, con el anti-bots, al terminar

**Lo que pide:** verificar que el sistema anti-bots y el formulario funcionan. Al final del
trabajo, **enviar un formulario de prueba con sus datos** (`sebastian@senaviacorp.com`) y
**confirmar en Gmail que ha llegado**.

Esto **levanta la prohibicion** del encargo original, que decia expresamente que no se hicieran
envios de prueba reales porque mandan correo al negocio. Lo autoriza el, con su direccion.

### 🚨 LO QUE SU PROPIA CAPTURA YA DEMUESTRA

En la captura del formulario en la preview, el widget de Turnstile sale **en estado de error**:

> «No es posible conectarse al sitio web — CLOUDFLARE»

Eso es lo que hace Turnstile cuando **el dominio no esta dado de alta** en el widget. Y encaja
con lo que `ENTREGA.md:70` ya avisaba: *«fuera del dominio registrado el script carga y
`window.turnstile` existe, pero `render()` no pinta nada»*.

**Por que importa mas de lo que parece, y es aritmetica de la cascada del servidor:**

| Entorno | `TURNSTILE_SECRET` | Dominio de alta | Resultado |
|---|---|---|---|
| **preview** | NO puesta | no | `validaTurnstile` devuelve `'ok'` (falla ABIERTO). El captcha no bloquea… pero **no hay SMTP en preview**, asi que el envio devuelve 500 igual |
| **produccion** | **SI puesta** | **por comprobar** | si el dominio NO esta de alta: no hay token -> `'sin-token'` -> **403 en TODOS los leads** |

O sea: en produccion, secreto puesto + dominio sin registrar = **se pierden el 100 % de los
leads**, en silencio y con el formulario pareciendo normal. `formulario.ts:30-31` ya avisa de la
variante hermana: cruzar las claves da `invalid-input-secret`, *«que es peor que no ponerla»*.

### Lo que hay que hacer, en este orden

1. **Comprobar en Cloudflare** que el widget `0x4AAAAAAEnkUHbX6ap29qsu` tiene de alta
   `www.mrandmrsoutdoorliving.com` **y** `mrandmrsoutdoorliving.com`. Hay conexion de
   `cloudflare` en Composio: se puede verificar sin preguntar.
2. **Decidir donde se prueba.** El envio real solo puede pasar donde HAY SMTP, o sea
   **produccion**. En preview devolvera 500 siempre. Alternativa: dar de alta el dominio de
   preview en Turnstile y poner `SMTP_USER`/`SMTP_PASS` en el target `preview` — mas trabajo,
   pero prueba sin tocar produccion.
3. **Enviar** con `sebastian@senaviacorp.com` y datos reconocibles como prueba.
4. **Confirmar en Gmail** que llego, con el asunto esperado:
   `New lead · Pool builders core lead · <ZIP>`. Hay conexion de `gmail` en Composio.
5. **Probar tambien que el anti-bots RECHAZA**: el honeypot `ref_id` relleno y el time-trap
   (envio antes de 1 s) tienen que dar rechazo. Eso se puede probar sin mandar correo.

---

## C3 · «What Will My Pool Cost?» a media/media: foto a la izquierda, fondo azul a la derecha

**Lo que pide:** que la seccion de inversion deje de ser una tarjeta tenue sobre blanco y pase a
una banda **50 / 50**: foto de un proyecto terminado **a altura completa** ocupando el 50 %
izquierdo, y el 50 % derecho con **fondo azul** llevando el texto y los dos botones. Que impacte.

**Y el motivo que da es el que de verdad importa, porque no es de esta seccion sino de la
plantilla entera:**

> «al hacer scroll se ve la pagina muy simple porque todo es fondo blanco»

Eso convierte C1 y C3 en **el mismo problema**: la ficha no tiene ritmo cromatico. Cuatro
secciones blancas seguidas y el ojo no encuentra donde empieza cada cosa. **Este principio manda
tambien sobre las 13 fichas restantes**, no solo sobre esta: el rediseno de la plantilla tiene que
alternar planos, no repetir blanco.

### La foto: cual, y por que no vale cualquiera

La pagina **ya usa** estas, y repetir una seria el mismo defecto que ya se corrigio una vez en el
heroe (la foto salia dos veces, como portada de su propia tarjeta):

```
estate-pool-spa-sun-shelf-north-florida-project-2.avif    <- el HEROE
estate-pool-spa-sun-shelf-north-florida-project-1.avif    <- portada en el carrusel
luxury-pool-raised-spa-travertine-deck-south-florida-project-1.avif
pool-raised-spa-marble-deck-south-florida-project-1.avif
```

Candidatas libres, y de obra de PISCINA en NORTH FLORIDA, que es la intencion de la landing:

- `estate-pool-spa-sun-shelf-north-florida/…-project-3.avif` · `-4` · `-5`
- `luxury-pool-spa-screen-enclosure-north-florida/…-outdoor-kitchen-florida-2..6.avif` (5)

**Se elige por hoja de contactos, mirandolas**, como se eligio la del heroe. No a ojo desde el
nombre del fichero.

### Lo que hay que resolver, y medir

1. **El recorte.** Las fotos son apaisadas (1250×698) y la columna es media pantalla a **altura
   completa**, o sea vertical. `object-fit: cover` recorta los lados: hay que mirar que no se
   coma la piscina. Es el criterio para elegir la foto, mas que la belleza.
2. **`width`/`height` horneados** + `aspect-ratio`, o vuelve el CLS que costo 38 imagenes arreglar.
3. **Que hace por debajo de 992.** Se apila, pero ¿foto primero o contenido primero? La foto
   primero se ve mejor; el contenido primero pone antes los dos CTA. **Se decide midiendo**, no
   por gusto.
4. **Contraste sobre el azul**: titulo, cuerpo y los dos botones. El de contorno es
   `.mm-accion--linea`, que dentro de `.mm-inverso` coge `--mm-tinta` = blanco: borde y texto a
   15,60:1 sin escribir una regla. El dorado lleva tinta navy encima, 8,40:1.
5. **`check:enlaces`** vera una referencia de imagen nueva: tiene que existir y estar en git.
6. **Presupuesto**: de los tres cambios, este es el caro. Quedan ~1.900 B en la capa.

### Lo que arrastra para las 13 fichas restantes

La foto no puede estar cableada en el CSS ni en el componente: va en
`captacion-servicios.json`, en el bloque `inversion`, con su `alt`. Cada ficha traera la suya
—la de su propio servicio— y `InversionCore.astro` la lee por ruta, igual que ya hace con el
titulo, el texto y los CTA. **Una entrada de JSON por ficha, cero CSS nuevo.**

---

## C4 · Fundir «Why Homeowners Pick Us» y «Custom Pool & Spa Builders…» en UNA seccion

**Sustituye a C1.** En vez de copiar un fondo de una seccion a otra, se juntan las dos en una
sola que comparte fondo **por construccion**: primero «Why», debajo «Custom», mismo plano.
El diseno interno de cada una **no cambia**; solo dejan de ser dos secciones y pasan a ser dos
bloques de la misma.

**Y van ARRIBA, antes del formulario.** El motivo que da es de experiencia de uso y es bueno:
**asi se ven imagenes de obra ANTES de pedirle los datos a nadie.** El mosaico de fotos deja de
estar enterrado detras del formulario.

### El orden hoy, y el orden que queda

```
hoy                                     despues
 3 hero-services                         3 hero-services
 4 logos-section                         4 logos-section
 5 svc-confianza        «Why»            5 ┌ «Why»  ──┐ una sola seccion,
 6 svc-captacion        formulario       5 └ «Custom» ┘ mismo fondo
 7 testimonial-section  resenas          6 svc-captacion   formulario
 8 trusted-section      «Custom»         7 testimonial-section
 9 services                              8 services
```

O sea: **`trusted-section` sube del puesto 8 al 5**, y las resenas quedan justo detras del
formulario.

### ⚠️ Lo que hay que resolver, y NO es copiar y pegar

**1 · `.trusted-section` la montan 121 rutas. No se toca su regla global.**
Su fondo son las tres capas de C1 —imagen `animateddivs-image.webp`, reserva `--mm-azul-500` y
el velo de navy al 50 % por `inset box-shadow`—, y las tres viven en reglas compartidas
(`webflow.css`, `propio.css:261`, `intro.css:50`). Fundirlas obliga a **neutralizar el fondo de
la interior solo en esta ruta**, con un selector `.svc-`. Cambiar `.trusted-section` a secas
moveria las otras 120 paginas y rompe la promesa de identidad.

**2 · LA MEDIDA DEL FONDO HAY QUE REHACERLA. La de C1 ya no vale.**
El perfil por bandas de C1 se midio sobre `.trusted-section` con su altura actual (693 px). La
seccion fundida es **mucho mas alta**, y `background-size: cover` escala y recorta la imagen
segun la caja: **la banda de cian claro (`#98e2f1`) acabara en otro sitio**. Puede caer sobre el
`<h2>` de «Why», sobre las tarjetas, o salirse del encuadre. Se vuelve a medir por bandas sobre
la seccion fundida y se acredita el numero. Heredar la medida vieja seria dar por bueno un
numero que ya no describe la caja.

**3 · `check:texto`: esto SI es un reorden de lineas del baseline.**
A diferencia del bloque de captacion —que son lineas declaradas y basto con reordenar su propia
lista—, el texto de `.trusted-section` **viene del baseline de Webflow**. Moverlo delante del
formulario lo mueve respecto a las resenas, y eso se declara en `REORDENADAS_A_PROPOSITO`, que
exige el bloque EXACTO antes -> despues y **revienta al arrancar si las dos listas no tienen las
mismas lineas**. Es una barandilla, no un formalismo: obliga a demostrar que solo se reordena.

Las listas **se sacan de la salida real de la puerta**, no se escriben de memoria. Ojo al orden
en que la puerta descuenta bloques: las resenas ya van descontadas por su propia declaracion
(26 lineas en 83 rutas), asi que lo que queda por reordenar no es lo que se ve en pantalla.

**4 · El generador.** `captacion()` en `build-paginas.mjs` ya reordena secciones de esta ruta
(subservicios, `location`, resenas). Subir `trusted-section` es un paso mas del mismo tipo, y
sigue acotado por lista de rutas: las otras 13 fichas no se enteran hasta que se declaren.

### Para las 13 restantes

Las 14 fichas comparten plantilla y **todas tienen `trusted-section`** en el mismo sitio. El paso
del generador vale para las catorce sin cambios: se activa anadiendo la ruta a la lista. El
contenido del mosaico ya es propio de cada ficha, asi que no hay copy nuevo que declarar.
