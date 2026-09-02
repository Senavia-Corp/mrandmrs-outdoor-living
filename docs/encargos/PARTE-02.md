# PARTE DE DIRECCIÓN 02 — MODO SIMULTÁNEO

**Léelo antes que tu encargo. Manda sobre él.**

Decisión de Sebastian: los **nueve frentes corren a la vez**. Yo había recomendado tres; él
decidió nueve y es su llamada. Lo que cambia no es tu encargo — cambia cómo se coordina, porque
con nueve simultáneos ya no puedo resolver dependencias por turno: hay que eliminarlas antes.

## 1. No esperas al director para NADA de tu paso 1

Investiga, decide, monta tus variantes en tu página de laboratorio, hazte las capturas y entrega.
**Todo eso lo haces solo.** No pidas permiso para escribir, no esperes ventana, no esperes
aprobación intermedia. La única frase que te detiene es **«VENTANA DE PUERTAS»**, y la digo yo
cuando necesito Chromium en exclusiva.

Si te bloqueas de verdad —te falta un token, tu selector no pinta, tu encargo choca con otro—
**dilo en el informe y sigue con lo que no dependa de eso.** No te quedes parado: ya pasó una vez
y tres frentes perdieron cuatro horas esperando un permiso que no existía.

## 2. Higiene de navegador — con nueve frentes esto es lo primero que rompe

Nueve `astro dev` y nueve paneles abiertos a la vez ahogan la máquina, y mis puertas miden mal sin
CPU libre: está medido, dos navegadores llevaron una captura de 9,2 s a 45 s, y otro par **mató**
la corrida entera.

- **Tu puerto es tuyo y solo tuyo.** Está en tu encargo. No uses otro.
- **No dejes `astro dev` corriendo mientras piensas o escribes.** Lo levantas para mirar, miras,
  lo bajas. Lo mismo con el panel del navegador: se abre para ver, se cierra al terminar.
- Con **«VENTANA DE PUERTAS»**: cierras panel, bajas tu dev y paras hasta que reabra.

## 3. El contrato de color del formulario — la única dependencia real, ya desactivada

`/contact-us` y `/request-estimated` comparten el fallo más caro del sitio y lo reparten dos
chats. Para que no tengáis que hablaros, **lo fijo yo aquí, con los números medidos**:

```
El panel es linear-gradient(#1cadeb → #1d4bbf).   Luminancia del cian: 0.3613
Techo de luminancia para que el BLANCO dé 4,5:1:  0.1833
                                                  → el cian actual es el DOBLE de brillante
```

**Regla 1 — el campo lleva fondo PROPIO y opaco.** `.text-field` (de ESTIMACION) hoy es
`background: #fff0` (transparente) con texto y borde blancos: por eso depende del panel y por eso
da 2,55:1. Con fondo propio deja de depender de nada:

| Fondo del campo | Texto navy `#001c63` | |
|---|---|---|
| blanco `#ffffff` | **15,60 : 1** | |
| blanco hueso `#f7f9fc` | **14,79 : 1** | |
| gris `#ececec` (`--grey`, ya en la paleta) | **13,20 : 1** | |

Elige uno y decláralo. **A partir de aquí ESTIMACION no necesita saber qué hace CONTACTO.**

**Regla 2 — el panel es libre, con un techo.** CONTACTO elige `.form` como quiera, con una única
condición: **el punto más claro del degradado tiene que dar ≥4,5:1 con el texto que vaya encima.**
Si mantiene texto blanco, la luminancia del stop más claro no puede pasar de **0,1833**. Referencia
medida por si sirve: `#1279a5` es el mismo cian oscurecido y da **4,88:1** con blanco; el stop de
abajo `#1d4bbf` ya da 7,47:1.

**Regla 3 — el oro no marca estado.** 1,86:1 sobre blanco. Vive en fondos de CTA con texto navy
(8,40:1). Y fuera el verde menta `#3cd3ad` y el morado `#6c33da` del botón de envío: son los
defaults de la plantilla de Webflow.

Los dos declaráis vuestros ratios medidos en el informe. Si al integrar no casan, lo arreglo yo.

> ⚠️ **CORREGIDO 2-sep-2026 — dos atribuciones de este documento eran FALSAS.** Las midieron dos
> frentes por separado y las verifiqué:
>
> | Clase | El documento decía | **Medido, tokenizando el atributo `class`** |
> |---|---|---|
> | `.text-field` | 2 rutas, de ESTIMACION | **1 ruta: solo `/contact-us`. Es de CONTACTO.** `/request-estimated` usa `.text-field-form` |
> | `.submit-button` | el botón de envío, en verde menta | **0 rutas. No existe en ninguna de las 115.** El menta `#3cd3ad` y el morado `#6c33da` son CSS muerto de Webflow; el botón real es `.button-styles` |
>
> **La causa, y es una trampa que ahorra tiempo saberla:** conté con
> `grep -E 'class="[^"]*\btext-field\b'`. En una expresión regular `\b` es frontera de PALABRA y
> el guion **no es carácter de palabra**, así que `\btext-field\b` casa dentro de
> `text-field-form`. Lo mismo le pasa a `\bform\b` (da 6; `.form` es 1) y a `\bgallery-page\b`
> (da 25 por `slider-gallery-page`; es 1). **Una clase se cuenta partiendo el atributo `class` por
> espacios y comparando el token entero**, nunca con `\b` ni con subcadena.

## 4. Cómo entregas

1. **Las variantes se las enseñas a Sebastian** en tu propio chat, con capturas a 1440 y 479.
   Él elige ahí mismo. **No paso yo por ese lado**: con nueve frentes, meterme en cada elección
   sería el cuello de botella.
2. **El informe me lo mandas a mí** en el formato de tu encargo, cuando la variante elegida ya
   esté aplicada en tu fichero CSS.
3. Yo construyo, mido acotado a tus rutas, y commiteo. **Un commit por encargo.**

## 5. Lo que sigue siendo innegociable

- **No construyes** (`npm run build` sobrescribe el artefacto compartido que mido yo).
- **No commiteas.** No tocas `baseline/`, `contratos.json`, `Base.astro`, `scripts/*`, `disenio/*`.
- **No corres** `check:texto`, `check:visual`, `check:ix2` ni `check:cascaron`.
- **Sí corres** `npm run check:tokens` — estática, sin navegador, <1 s, 11 comprobaciones. Antes de
  cada informe, y **pegas su salida literal**.
- **El texto no se toca.** Ni una palabra, en ninguna página.
- **Escribes solo en tu fichero.** Está declarado en tu encargo y en la cabecera del propio CSS.

## 6. Y lo de siempre

**Un número sin el comando que lo produjo es una opinión.** Pega la salida literal, no la resumas.
La ausencia de señal no es señal buena: si una comprobación no corrió, dilo — no la cuentes como
verde. En este repo esa confusión lleva siete fallos abiertos.
