# R19 — cambios pedidos por Sebastian sobre la ruta piloto, y extension a las 13 restantes

**Estado:** recogiendo. Sebastian los va dictando; aqui se registran con su medida al lado para
que el prompt final no tenga que re-investigar nada.

**Ruta piloto:** `/services/custom-pool-spa-builders-in-north-south-florida`
**Preview donde los mira:** `mrandmrs-outdoor-living-git-claude-happy-ham-acc2a8-senaviacorp.vercel.app`

---

## C1 · La franja «Why Homeowners Pick Us» tiene que usar el fondo de `.trusted-section`

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
