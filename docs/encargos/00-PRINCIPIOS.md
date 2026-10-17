# PRINCIPIOS DEL PROGRAMA R — léelos antes que tu encargo

Aplican a los tres frentes. Si tu encargo dice algo que contradice esto, manda esto.

## 1. Se REMODELA: la base de Webflow es el punto de partida, no el techo

> **Cambiado el 5-oct-2026, lo decide Sebastian.** Hasta hoy esta sección decía «se eleva, no
> se sustituye» y prohibía recomponer. El resultado medido fueron encargos de rediseño que
> devolvían retoques de padding. Lo que sigue es lo que manda ahora.

**Rediseñar una sección es replantearla**, no pulir la que hay. Antes de escribir una regla se
decide una dirección —qué tiene que conseguir la sección, qué se lee primero, qué la hace
memorable— y se ejecuta entera. Está permitido, y se espera:

- **Recomponer** — otra rejilla, otra proporción, otro orden de los elementos dentro de la
  sección, romper la columna centrada, solapar, sangrar la foto al borde.
- **Sustituir un componente por otro con otra idea** — tres tarjetas iguales pueden ser una
  pieza editorial; una lista puede ser una línea de tiempo.
- **Cambiar el markup** de la sección en cualquier ruta, no solo en la home, mientras
  `check:texto` siga verde (§2).
- **Escala y jerarquía con intención** — titulares grandes de verdad, contraste de tamaños,
  aire generoso. Sombras, radios, superficies, estados y movimiento al servicio de esa idea.
- **Añadir lo que la dirección pida** — tokens nuevos, elementos decorativos, fotos del banco.

**Lo que se conserva es la marca, no la maqueta:** el logo, el navy y el oro, que sea
reconocible como Mr & Mrs. La composición de Webflow no es marca.

**Lo que sigue siendo decisión de Sebastian:** quitar una sección entera, añadir una con texto
nuevo, o cambiar el orden de las secciones de una página. Se propone en el informe.

Criterio para dudar: si el antes y el después solo se distinguen poniéndolos lado a lado, **no
es un rediseño y no se entrega como tal**. El cliente tiene que abrir la página y pensar «han
rehecho esto», reconociendo la marca.

## 2. El texto no se toca, y por eso puedes tocar el resto

`check:texto` compara `innerText` al 100 % sin tolerancia y **no se re-baseliniza nunca**.
Mientras siga verde, el markup y el CSS son tuyos. Un `div` envolvente o un `aria-label` no lo
mueven; una palabra sí. El texto se reescribe **después**, en otro programa.

## 3. Imágenes e iconos generados: Higgsfield, y con una línea roja

Hay generación por IA disponible: **Higgsfield**, `~/.local/bin/hf` (wrapper de curl sobre
`platform.higgsfield.ai`, credenciales en `~/.higgsfield.env`). Still dirigido:
`/higgsfield-ai/soul/standard` 1080p 16:9, **0,188 $ por imagen**.
Ojo: `seedance`, `veo3.1`, `sora2`, `nano-banana` y `flux-pro` dan `model_not_found` con esta
clave — el plan web y el de API se venden aparte.

**Lo pide el DIRECTOR, no tú.** Si tu sección necesita un activo que no existe, pídelo en el
informe describiendo qué hace falta y para qué hueco.

🚨 **La línea roja: nunca se genera obra que parezca del cliente.** Este es un contratista real
con 10 galerías de proyectos reales y 3 vídeos de obra propia. Una piscina generada por IA
puesta donde el visitante entiende «esto lo construimos nosotros» es publicidad engañosa, y
además innecesaria: el material real existe. **Antes de pedir una imagen generada, busca en
`public/images/projects/` (10 galerías), `residentials/` (14) y `public/videos/` (3 pistas).**

Generar sí vale para: iconos y pictogramas, texturas y fondos abstractos, elementos
decorativos, y huecos donde no hay ni puede haber foto real.

## 4. Elegir imágenes por hoja de contactos, nunca por el nombre del fichero

El nombre miente sobre el encuadre y cuela renders. Si necesitas elegir entre varias, míralas
juntas. Con vídeo, muestrea varios segundos: **el vídeo del héroe dura 40 s y en el segundo 16
se convierte en un solar en obra** — cosa que el nombre del fichero no dice y el primer
fotograma tampoco.

## 5. Reglas de la capa CSS, comunes a los tres

- Cero `!important`. Cero `@layer`: `webflow.css` son 167 KB **sin capa**, y cualquier regla
  sin capa gana a toda regla con capa. Ganas por **orden de carga**.
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. Token que falte
  —color, espaciado, radio, sombra, paso tipográfico— **se añade ahí** en el mismo cambio, con
  su ratio medido si es un color. No se pide ni se espera (cambiado el 5-oct-2026).
- `min-width`, jamás mezclado en la misma regla con los `max-width` de Webflow. 480 / 768 / 992
  son los de la casa; si el diseño pide otro corte o una `@container`, se usa y se dice.
- El peso de la capa no se mide antes de diseñar: el tope de `check:tokens` es el peso de `webflow.css` (167 KB) y es
  alarma, no presupuesto por sección.
- Nunca `animation-fill-mode: forwards`. Ningún `opacity: 0` fuera de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos de CTA con
  texto navy (8,40:1). Medido, no se rediscute.
- Cada par de colores nuevo lleva **su ratio medido escrito al lado**.

## 6. Un número sin el comando que lo produjo es una opinión

Pega la salida literal. No la resumas.
