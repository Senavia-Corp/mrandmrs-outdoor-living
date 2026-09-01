# ENCARGO R12-EST — `/request-estimated`, la página que convierte

Eres el chat **ESTIMACION** del Programa R de Mr & Mrs Outdoor Living. Trabajas bajo un director
en otro chat: él construye, mide, commitea y despliega. **Tú diseñas.**

```
PROYECTO   /Users/senavia/Sites/mrandmrs-outdoor-living   (la sesión abre en ~)
ENCARGO    R12-EST
RUTA       /request-estimated   (+ 7 clases que salen también en /contact-us)
POSEES     src/styles/estimacion.css   (ya creado y cableado)
PROHIBIDO  todo lo demás. En especial `.hero-section` (8 rutas, del chat HERO-INDICE),
           `.logos-section` (25 rutas), `.cta-footer` (102), `.footer` (113),
           y `estimador.css` — que es OTRA cosa: el calculador de `/pool-cost-estimator`.
```

> **Lee antes `docs/encargos/PARTE-02.md`** — modo simultáneo: nueve frentes a la vez.
> Manda sobre este documento. Ahí está por qué no esperas al director para nada, la higiene de
> navegador y el contrato de color del formulario.

## Antes de nada

1. `docs/encargos/00-PRINCIPIOS.md` — manda sobre todo.
2. `docs/encargos/CRITERIO.md` — con eso te acepto o te rechazo.
3. Invoca **`frontend-design`**, luego **`make-interfaces-feel-better`**, y para el formulario
   también **`accessibility`**: aquí un fallo de contraste o de tamaño de toque no es un detalle,
   es un lead perdido.
4. `git status --porcelain`. Sucios que no son tuyos: **para y pregunta**.

## Por qué esta página es distinta de las otras cinco

Es **donde entra el dinero**. Todo lo demás del sitio existe para traer a alguien aquí. Un botón
mal contrastado en `/gallery` cuesta una impresión; aquí cuesta el presupuesto.

## 🚨 Tres cosas que NO puedes tocar

**1. La lógica del formulario.** Es multipaso por JS: `#msf`, `[data-step="1|2|3"]`, `#msf-next`,
`#msf-back`, `#msf-submit`. **No cambias ni un** `id`, `name`, `data-required`, `data-step`,
`action="/api/formulario"`, `data-turnstile-sitekey`, ni el campo trampa `ref_id` (el
`<input name="ref_id">` con `left:-9999px` es antispam: si lo tocas, entra basura). **Aquí solo
entra CSS.** Si crees que hace falta markup, lo pides; no lo escribes.

**2. El texto.** `check:texto` compara `innerText` al 100 % sin tolerancia.

**3. `check:visual` no te vigila.** `/request-estimated` está declarada en
`DISTINTAS_A_PROPOSITO` **a los cuatro anchos** (Turnstile no pinta fuera del dominio registrado
y la página sale más corta que su baseline). `declarada()` se evalúa antes y al margen del
contrato: **hoy esta página no se compara en ningún ancho, así que verde no prueba nada.**
Resolverlo es del director. Tú compensas con capturas y medidas propias, a 1920/1440/991/479 **y
además a 600 y 767**, que es la banda que ninguna puerta fotografía.

## Defecto de NEGOCIO, encontrado al medir — NO lo arregles, es de Sebastian

Las **14 casillas de servicio del paso 1** tienen todas `id="checkbox"` y `name="checkbox"`, y
**ninguna lleva `value`**:

```
$ casillas de servicio: 14 · ids distintos: {'checkbox': 14} · names: {'checkbox': 14}
$ ¿alguna tiene value=?  False
```

El formulario envía `checkbox=on` repetido, así que **qué servicios pidió el lead no llega
nunca**. Es la pregunta que decide a qué comercial va el aviso. Arreglarlo cambia los datos del
formulario y toca `/api/formulario`: **fuera de tu encargo.** Está reportado. Si tu diseño depende
de ello, dilo en `ABIERTO`.

## Lo que hay hoy, medido

**Y `.text-field` es TUYA** (2 rutas: `/request-estimated` y `/contact-us`). Es la clase con el
borde blanco a 2,55:1 sobre el cian. El chat CONTACTO arregla el FONDO del panel (`.form`, suya);
tú arreglas **el campo**. Los dos ratios se miden contra el fondo que quede, no contra el de hoy:
coordinaos por el director antes de fijar colores.

```css
.appointment-section  { 1 ruta — tuya entera }
.text-field           { 2 rutas — color:#fff; background:#fff0; border:1px solid #fff }
.select-field         { el desplegable de presupuesto }
.text-field-form      { los inputs de dirección y contacto }
.services-form        { las 14 casillas, hoy en dos columnas planas }
.msf-buttons          { Back / Next }
.bugget-form          { sí, con la errata del original. NO se renombra: es el gancho }
```

Y de la página hermana `/contact-us`, que comparte estas clases contigo y que ya está medida:

| Lo medido | Ratio | Veredicto |
|---|---|---|
| Panel del formulario: `linear-gradient(#1cadeb → #1d4bbf)` | — | |
| **Blanco sobre el cian de arriba `#1cadeb`** | **2,55 : 1** | 🔴 no llega ni a 3:1 |
| Blanco sobre el azul de abajo `#1d4bbf` | 7,47 : 1 | ✅ |
| `.text-field { border: 1px solid #fff }` sobre el cian | **2,55 : 1** | 🔴 WCAG 1.4.11 pide 3:1 para el límite de un campo |
| `.submit-button { background: #3cd3ad }` (verde menta) | — | 🔴 default de plantilla Webflow, ajeno a la marca |
| `.submit-button:hover { background: #6c33da }` (morado) | — | 🔴 ídem |
| `.radio-button { width: 18px; height: 18px }` | — | 🔴 por debajo de los 24×24 de WCAG 2.2 AA |

**La mitad de arriba del formulario de leads es ilegible.** Ahí caen «First name», «Last name» y
«Email». Es el hallazgo más caro de las seis páginas.

## Qué se te pide

Elevar la página entera y el formulario **al 100 %**, con permiso explícito de Sebastian para
tomar decisiones de diseño fuertes. En concreto:

- **El formulario, componente a componente:** campos, desplegable, casillas, radios, botones
  Back/Next/Enviar, estados de foco y error, y el mensaje de éxito. Objetivos táctiles **≥44 px**
  en los cuatro anchos. Todo par de colores con su ratio medido y **≥4,5:1** en texto.
- **Iconos donde ayuden a rellenar**, no como adorno: los 14 servicios son una decisión difícil
  en una lista de texto plano. Si añades iconos, salen de `astro-icon`/SVG propio en la capa CSS
  o los pides al director. **Nunca generados por IA si representan obra del cliente.**
- **El progreso de los 3 pasos** tiene que verse. Hoy no hay ni un indicador: el visitante no sabe
  cuánto le queda, y eso es abandono medible.
- **Fotografía real de obra real.** Si la maqueta pide imagen, sale de `public/images/projects/`
  (10 galerías) o `public/images/residentials/` (14). **Nada generado por IA que parezca obra del
  cliente** — es publicidad engañosa y el material real existe. Elige por hoja de contactos, nunca
  por el nombre del fichero: miente sobre el encuadre.

**Investiga antes de decidir.** Mira cómo resuelven un formulario de presupuesto largo los
contratistas y los sitios que convierten bien; trae dos o tres referencias con lo que te llevas de
cada una y por qué encaja en una marca navy y oro.

**Entrega dos variantes del formulario** en `src/pages/_lab-estimacion.astro` (guion bajo: Astro no
la enruta), con el texto real y **los tres pasos**. Capturas a 1440 y 479. **Para ahí** hasta que
Sebastian elija.

## Qué corres tú

`npm run check:tokens` (estática, <1 s, **antes de cada informe, y pega la salida**) y tu propio
`astro dev --port 4345` con el panel del navegador.

**No corres:** `npm run build` · `git commit` · `check:texto|visual|ix2|cascaron` · `baseline/`.
Con **«VENTANA DE PUERTAS»** cierras el panel y paras. Mientras no lo oigas, trabajas.

## Informe

```
ENCARGO R12-EST · ESTADO · FICHEROS ruta:linea · ALCANCE selector|rutas|grep
NUMEROS metrica|antes|despues|comando  (incluye 600 px y 767 px, que ninguna puerta ve)
CONTRASTES par|ratio medido  ·  TOQUE control|px medidos a 479
RIESGO A OTRAS  (recuerda: 7 clases tuyas mueven también /contact-us)
ABIERTO
```

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.
