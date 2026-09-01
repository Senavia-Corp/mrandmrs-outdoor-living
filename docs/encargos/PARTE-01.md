# PARTE DE DIRECCIÓN 01 — 1-sep-2026, 14:45

**Busca tu rol abajo y sigue esa orden.** Manda sobre tu encargo original.

## Por qué cambia el reparto

Decisión de Sebastian: **la home es la puerta.** La aprueba él, y hasta entonces no se sigue
con otras páginas. Todo el peso va ahí.

Y midiendo la home para repartirla salió esto, que lo cambia todo:

| Sección de `/` | Rutas donde se pinta |
|---|---|
| `.hero-glass-section-page` | **1 — la única que existe solo en la home** |
| `.cta-page-section` | 12 |
| `.before-after-section` | 15 |
| `.location` | 17 |
| `._3d-section` | 65 |
| `.projects-section` | 66 |
| `.blog-section-page` | 77 · ya hecha |
| `.social-media` | 79 |
| `.trusted-section` | 80 · ya hecha |
| `.testimonial-section` | 82 · ya hecha |
| `.cta-footer` | **102** |

**«Rediseñar la home» es rediseñar medio sitio.** Bueno para el rendimiento: elevas una
sección y elevas hasta 102 rutas de una vez. Malo para la verificación, y de ahí sale la regla
nueva de abajo.

## Regla nueva, y es la importante

**Todo cambio en una sección compartida pone en rojo `check:visual` en TODAS sus rutas**, y hay
que re-baselinizarlas una a una. **Declara el número en `RIESGO A OTRAS`.** El director necesita
saber qué recapturar sin barrer las 115: una barrida completa son ~65 min con la pantalla de
Sebastian secuestrada, y no se hace por rutina.

Deriva tú el número, no lo estimes:

```bash
grep -rlo 'class="projects-section"' .vercel/output/static --include='*.html' | wc -l
```

## Tu orden

### Si eres el chat del HÉROE (encargo R9-HERO)

1. **Termina el paso 1** — las tres variantes en `_lab-heroe.astro` — y **para** para que
   Sebastian elija. Sin cambios.
2. Cuando la variante esté elegida y aplicada, tu siguiente encargo es **R9-CTA**:
   `src/styles/cta.css`, ya creado y cableado. Cubre `.cta-page-section` (12 rutas) y
   `.cta-footer` (**102 rutas**, el elemento compartido más grande del programa).
   Van las dos juntas y contigo a propósito: es la misma decisión de conversión tomada dos
   veces, y partirla entre dos chats da dos botones distintos.

`home.css` se queda **solo con el héroe**. Nada más entra ahí: una sección de 66 rutas dentro
de un fichero llamado `home` es exactamente como nació la mina de `blog.css`.

### Si eres PULIDOR-1 (encargo R10-PROY, `/projects` y `/project/*`)

**Pausa ese lote.** No se pierde: `docs/encargos/R10-PROY.md` sigue en pie y vuelve en cuanto
Sebastian apruebe la home. Tu plan de esas 11 rutas tampoco se tira — guárdalo en el informe.

Pasas a **dos secciones de la home**, ficheros ya creados y cableados:

| Encargo | Fichero | Selector | Rutas |
|---|---|---|---|
| **R10-OBRA** | `src/styles/obra.css` | `.projects-section` | **66** |
| **R10-AD** | `src/styles/antes-despues.css` | `.before-after-section` | **15** |

`.projects-section` es la prueba social visual del negocio: si algo tiene que parecer caro en
este sitio, es la rejilla de obra terminada.

⚠️ `.before-after-section` lleva **JS propio y un tirador arrastrable** (el slider de Flowbase
reimplementado en local). Cambiar su caja cambia las coordenadas del arrastre: verifica que
sigue funcionando **con ratón y con dedo** antes de dar el informe por bueno.

### Si eres PULIDOR-2 (encargo R10-LECT, `/blogs/*`, `/blogs-tips`, `/articles/*`)

**Pausa ese lote.** `docs/encargos/R10-LECT.md` sigue en pie y vuelve tras la aprobación de la
home. Guarda tu plan en el informe.

Pasas a **tres secciones de la home**, ficheros ya creados y cableados:

| Encargo | Fichero | Selector | Rutas |
|---|---|---|---|
| **R10-3D** | `src/styles/render3d.css` | `._3d-section` | **65** |
| **R10-UBI** | `src/styles/ubicacion.css` | `.location` | **17** |
| **R10-SOC** | `src/styles/social.css` | `.social-media` | **79** |

`._3d-section` es el argumento de venta del render antes de construir: imagen grande + texto, y
el trabajo está en la relación entre las dos. `.location` es dónde trabajan —North & South
Florida— y para un contratista local eso es criterio de compra, no adorno: el visitante mira si
le cubren **antes** de pedir presupuesto. `.social-media` es el feed de Instagram, componente
propio (`FeedInstagram`), no el widget de Elfsight —aquel se quedaba en altura 0 y por eso el
baseline lo retrata como un hueco.

## Lo que no cambia para nadie

- **Lee `docs/encargos/00-PRINCIPIOS.md`.** Se **eleva** la base de Webflow, no se sustituye.
  El texto no se toca. Los activos generados los pide el director, y nunca se genera obra que
  parezca del cliente.
- Cada hoja nueva lleva en su cabecera su alcance medido, su dueño y estas reglas. Léela.
- **No corres `npm run build`, ni `git commit`, ni `check:texto|visual|ix2|cascaron`.** Miras
  tu trabajo en tu propio `astro dev` en tu puerto y en el panel de navegador de Claude.
- **«VENTANA DE PUERTAS»** = cierra el panel y para de escribir hasta nuevo aviso. Dos
  navegadores a la vez **matan** mi corrida, no la ralentizan.
- Escribe en tus ficheros **solo durante tu ventana**. Se importan en las 115 páginas: escribir
  mientras esperas publica tu trabajo a medias en el build del siguiente que construya.
- **Un número sin el comando que lo produjo es una opinión.** Pega la salida literal.

## Orden de entrega

Manda el informe **por encargo terminado**, no todos juntos al final. Yo construyo, mido y
commiteo de uno en uno; una cola de tres informes a la vez no acelera nada y me obliga a
adivinar de quién es cada regla si algo sale rojo.
