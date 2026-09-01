# PRINCIPIOS DEL PROGRAMA R — léelos antes que tu encargo

Aplican a los tres frentes. Si tu encargo dice algo que contradice esto, manda esto.

## 1. Se ELEVA la base de Webflow, no se sustituye

**Esto no es un rediseño desde cero.** El diseño exportado de Webflow es la base y se
conserva: su estructura de secciones, su composición, su identidad, sus componentes. Lo que
se eleva es **cómo está ejecutado**:

- **Espaciado y ritmo** — paddings, márgenes, el aire entre bloques, la relación entre
  secciones vecinas. Es donde más se nota que un sitio lo hizo un equipo y no una plantilla.
- **Jerarquía** — tamaños, pesos y contraste que digan en qué orden hay que leer. Hoy muchas
  secciones tienen todo al mismo peso, que es lo mismo que no tener jerarquía.
- **Estructura interna del componente** — la rejilla de una tarjeta, la alineación de un
  icono con su texto, dónde cae el CTA. Sin inventar secciones que no existen.
- **Superficie** — bordes, radios, sombras tintadas de navy (nunca negro puro), estados de
  foco y hover que hoy no existen o están invertidos.
- **Legibilidad** — medida de línea, interlineado, contraste medido.

**Lo que NO se hace:** cambiar la identidad, inventar secciones nuevas, mover el contenido de
sitio porque «quedaría mejor en otro orden», ni sustituir un componente entero por otro con
otra idea. Si crees que una sección sobra o falta, **dilo en el informe** — es decisión de
Sebastian, no tuya.

Criterio para dudar: si un cliente que conoce su web actual la abriera, tiene que reconocerla
al instante y pensar «esto está mejor hecho», no «me han cambiado la web».

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
- Ningún literal de color: solo `var(--mm-*)` de `disenio/tokens.css`. Token que falte, se
  **pide** al director; `disenio/` no lo escribe nadie más.
- `min-width` 480 / 768 / 992, jamás mezclado con los `max-width` de Webflow.
- Nunca `animation-fill-mode: forwards`. Ningún `opacity: 0` fuera de `html[data-anim]`.
- El oro `#f4b248` da **1,86:1 sobre blanco**: nunca marca estado. Vive en fondos de CTA con
  texto navy (8,40:1). Medido, no se rediscute.
- Cada par de colores nuevo lleva **su ratio medido escrito al lado**.

## 6. Un número sin el comando que lo produjo es una opinión

Pega la salida literal. No la resumas.
