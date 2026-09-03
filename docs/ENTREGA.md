# Estado de entrega — Mr & Mrs Outdoor Living

Escrito al cerrar la sesión del 27/28-ago-2026. Los números salen de las puertas; los comandos
que los producen están en `MIGRACION-LOG.md`, entrada por fase.

## Qué está hecho

| Fase | Estado |
|---|---|
| F0 Cuentas y repo | ✅ |
| F1 Baseline congelado | ↩️ reabierta 28-ago: el carrusel de pasos de `/services/` autoavanzaba y la captura no lo paraba. Receta corregida y las 14 fichas recapturadas — **pero en 2 de las 14 no cuajó**, ver «Lo que queda» punto 6 |
| F2 Assets locales | ✅ (reabierta 3 veces) 1826 assets · 0 fallos · 0 referencias a Webflow |
| F3 Sanity | ✅ 511 documentos · 628 assets · 0 referencias rotas |
| F4 Cascarón | ✅ nav y pie idénticos al vivo por geometría, 4 anchos |
| F5 Páginas estáticas | ✅ 14/14 con texto 100 % idéntico |
| F6 Páginas de colección | ✅ 115/115 rutas del origen · 0 de más (el build sirve 116: ver «Fuera de fase» abajo) |
| F6b Colecciones desde el CMS | 🟡 **1 familia de 7**: `pool-builders` (53 páginas) ya lee de Sanity, reproducción 53/53 byte a byte |
| F7 Interacciones | ✅ 0 invisibles · 0 transform residual · 0 scroll-x |
| F8 Formularios | 🟡 endpoint hecho y probado; **faltan credenciales** |
| F9 Paridad SEO | ✅ 115/115 con el `<head>` del origen · +1 propia con head propio e indexación vigilada igual |
| F10 Puertas | 🟡 9 de 10 escritas · **`check:visual` en rojo por 5 de 460** |
| F12 Estimador en fuente propia | ✅ oráculo de 384 casos · app rehecha sin React ni bundle · capta el lead · `/pool-investment-estimator` a **100 %** de píxeles y texto |
| F11 Deploy | 🟡 **LIVE 28-ago** en <https://mrandmrs-outdoor-living-rajppfro3-senaviacorp.vercel.app> · protegido por el equipo · **DNS sin tocar** |

## Lo que hace falta de tu parte

### 0. El repositorio remoto está atrasado (el sitio SÍ está desplegado)
**La Fase 12 está desplegada y verificada** en
<https://mrandmrs-outdoor-living-p8geh8sve-senaviacorp.vercel.app> — se subió con
`vercel deploy --prebuilt --prod`, reutilizando la sesión del CLI que ya había en la máquina.

Lo que **no** se ha podido hacer es el `git push`: el token de GitHub del llavero es inválido
(`gh auth status`: *«The token in keyring is invalid»*). Hay **8 commits en `main` sin subir**.
Lo desplegado y lo versionado son el mismo código, pero el remoto está atrasado:

```bash
gh auth login -h github.com
git push origin main
```

### 0b. (histórico) La Fase 12 estuvo en local sin poder subirse
El token de GitHub del llavero **es inválido** (`gh auth status`: *«The token in keyring is
invalid»*), así que `git push` falla con *«Invalid username or token»*. Hay **7 commits en
`main` sin subir** con el estimador entero. Se desbloquea con:

```bash
gh auth login -h github.com
git push origin main
```

Y después **mira en el panel de Vercel si ha salido un despliegue**: si la integración de GitHub
sigue sin conectar (ver más abajo), el push sube el código pero no despliega.


### 1. Credenciales (bloquean la Fase 8)
| Variable | De dónde sale |
|---|---|
| `SMTP_USER` / `SMTP_PASS` | Gmail App Password. **Exige 2FA activa** y debe ser de la cuenta que autentica. Ahora bloquean **tres** formularios, no dos: el de contacto, el de presupuesto y el nuevo del estimador |
| `LEAD_TO` | opcional; por defecto `info@mrandmrsoutdoorliving.com`, el del propio sitio |
| `TURNSTILE_SECRET` | panel de Cloudflare del cliente. **La clave de SITIO ya existe** (`0x4AAAAAAAQTptj2So4dx43e`): la tenía Webflow |

Sin `SMTP_*` el endpoint devuelve **500**, no un 200 mentiroso. Sin `TURNSTILE_SECRET` **no
valida** (deja pasar), no bloquea.

### 2. Dos decisiones antes de desplegar
- **Visibilidad del repo.** Hoy no hay remoto. El repo pesa **676 MB** (428 de ellos son las
  imágenes y los PDF que las páginas piden por ruta local). Hobby **no despliega desde un repo
  privado de una organización de GitHub**: o el repo va público —y con él los assets del
  cliente— o fuera de la organización, o el equipo necesita plan de pago.
- **Dominios del widget de Turnstile.** Hay que dar de alta el dominio de la preview de Vercel
  y el de producción. Medido: fuera del dominio registrado el script carga y `window.turnstile`
  existe, pero `render()` **no pinta nada**. Sin esto, los dos formularios se ven sin captcha en
  la preview.

### 3. Y una conversación con el cliente
- **Los 3 widgets de Elfsight no los ve nadie** (medido en dos navegadores). Dos de ellos
  deberían ser secciones con contenido. Se han rehecho nativos; **falta conectar los datos**:
  ficha de Google Business Profile (CID `13592496939047920063`) y cuenta de Instagram.
- **342 enlaces del menú y el pie llevan a `/commercial-services/…`, que da 404** — también en
  el sitio actual. O se crean esas 3 páginas o se quitan los enlaces.
- **El estimador ya no vive en un iframe.** Decisión tuya del 28-ago: `/pool-cost-estimator`
  monta el estimador directamente. Se ganan un documento, un juego de CSS y JS repetido y las
  alturas fijas del iframe (900/1400/1600 px), y la página queda entre 196 y 272 px más corta
  según el ancho. Las dos rutas comparten el mismo componente.
- **El estimador ahora capta el lead.** Antes acababa en un botón a `/request-estimated` que
  perdía por el camino todo lo que el visitante había configurado. Ahora pide nombre, email,
  teléfono y código postal en el paso 7, y el aviso al negocio llega con la estimación, las 12
  opciones elegidas y el desglose. **Falta que llegue el correo: eso son las credenciales SMTP.**
- **Dos incoherencias de precio en la calculadora original, replicadas a propósito** (filas 9 y
  10 de «Mejoras candidatas» en `MIGRACION-LOG.md`): los 1.500 $ del recargo por HOA cuentan
  distinto en el total y en el desglose, y en «Pool & Patio Remodel» el descuento del 18 % se
  aplica al total pero no a las líneas del desglose. **No se han tocado**: cambiar un precio sin
  que lo apruebes es cambiarte el negocio. «Arreglar» la primera mueve el precio de 155 de los
  384 casos medidos.
- **127 imágenes de contenido con `alt` vacío** y **8 fichas de `/project/` con JSON-LD
  inválido**, las dos cosas heredadas del origen.

## Lo que queda por hacer, y no depende de nadie

1. **6 de las 7 plantillas siguen sin leer de Sanity** (48 páginas: `services`, `project`,
   `blogs`, `country`, `articles`, `where-we-serves`). `pool-builders` —la mayor, 53 páginas—
   ya lo hace. Las 6 que faltan llevan listas de CMS de largo variable y texto enriquecido
   (`blogs` va de 654 a 1864 tokens), así que el diff por posición que sirvió para las 53 no
   les vale. **Lo que falta está medido, familia a familia, en `MIGRACION-LOG.md` (Fase 6b)**, y
   había una cosa urgente —el orden en que esas listas pintan sus elementos es el **orden
   manual de Webflow**, que ni el export ni Sanity conservan— y **ya está rescatada**:
   `npm run orden` la extrae del HTML vivo a `_source/orden-listas.json` (397 KB versionados,
   397 secuencias). `poolBuilder` sale con orden global de 53 sin contradicciones; `service`,
   `blogPost` y `project` no tienen orden global —sus listas de «relacionados» difieren entre
   fichas— y por eso se guardan también las secuencias crudas. Tras el corte de dominio ese
   fichero es la única copia que queda.
2. **Los 5 rojos de `check:visual` están diagnosticados** (28-ago). Eran tres cosas distintas:
   un **defecto propio** —se cableaban al endpoint de leads también los formularios de *filtro*,
   lo que les montaba un Turnstile encima y desplazaba 2 px la galería; `/gallery` pasó de
   98,71 % a **99,99 %** y a **0 desvíos de geometría** contra el vivo—, una **séptima fuente de
   no determinismo** en la captura —los revelados de 1000 ms se cogían a media transición, y una
   opacidad a medias no es 0, así que la comprobación de invisibles no los veía—, y una
   **diferencia legítima**: el sitio vivo tiene Turnstile inyectado en TODOS sus formularios,
   incluido el de filtro de `/brochures`, y eso añade 16 px a 479. Los dos primeros están
   arreglados y el baseline entero se ha rehecho con la receta corregida.
3. Con lo primero hecho, los **428 MB** de imágenes salen de git y se piden al CDN de Sanity.
4. **De la Fase 7 no queda nada.** Revisado el 28-ago: el **antes/después** (clip-path) y
   `w-tabs` ya están en `src/components/Componentes.astro` (secciones 4 y 5), y la
   «paginación» resultó no existir: el único `w-pagination-wrapper` del sitio está en
   `/where-we-serve` y **viene vacío en el original** —Webflow no genera controles porque la
   lista cabe entera—, así que no hay nada que reimplementar.
5. `check:lighthouse` y `check:formularios` (este último necesita las credenciales).
6. **Las 2 fichas de `/services` están casi cerradas.** Recapturadas del sitio vivo el 28-ago:
   `check:texto` **verde en las dos**, y `check:visual` de 8 comparaciones rojas a 2. Por el
   camino salió una séptima fuente de no determinismo —el slider de galería lo mueve Swiper, que
   reescribe `transform` en línea y se lleva por delante el `!important` del congelado—, ya
   arreglada en `scripts/lib/captura.mjs` con la API del propio Swiper.
   Queda `pool-screen-enclosures` distinta a **1440 y 991** (a 1920 y 479 está bien). Sin
   diagnosticar: se paró a petición tuya. Se cierra con
   `node scripts/diag-visual.mjs /services/pool-screen-enclosures-for-north-south-florida-pools 1440`
   y una recaptura — **y solo mientras el dominio viejo siga vivo**.
7. **Una decisión pequeña del estimador, tuya:** el pulgar del slider. En la app original mide
   2×2 px y **es invisible** — la barra se pinta pero no hay tirador que arrastrar. No es
   diseño, es una regla de CSS perdida; el propio CSS del original pedía un pulgar dorado. En la
   versión nueva se pinta, 16 px y dorado. Si lo prefieres invisible como estaba, es una línea.

## Despliegue — hecho, y qué queda

🔗 **<https://mrandmrs-outdoor-living-rajppfro3-senaviacorp.vercel.app>** ·
panel <https://vercel.com/senaviacorp/mrandmrs-outdoor-living>

Subido con el CLI desde el build local (`vercel deploy --prebuilt`), **no desde el repo**: el
repo está en `4a1bba7`, de antes del trabajo del 28-ago, así que enlazarlo habría desplegado el
estado viejo. Verificado sobre el despliegue real: `noindex, nofollow` puesto, sin canónica,
**0 referencias a Webflow y 0 a Elfsight**, las páginas de Sanity sirviendo y los `alt` por
ciudad correctos.

**Tres cosas pendientes, en orden de lo que te afecta:**

1. ~~Está protegido~~ **Protección SSO desactivada el 28-ago a petición de Sebastian**
   (`vercel project protection disable … --sso`). El enlace es público y se le puede pasar al
   cliente. Comprobado sin autenticar: `/`, `/gallery`, `/pool-builders/…` y `/contact-us` dan
   200, y **la triple defensa contra la indexación aguanta**: `<meta robots="noindex, nofollow">`,
   sin canónica, y `robots.txt` con `Disallow: /`.
   Nota: el proyecto ya traía un secreto de *protection bypass* de automatización de antes; no se
   ha tocado. `gitForkProtection` sigue activo.
2. **Vercel lo asignó a «producción»** —es lo que hace con el primer despliegue de un proyecto
   nuevo, no se pidió `--prod`—. **Tu dominio no está tocado**: el DNS sigue en Webflow y el
   `noindex` aguanta, así que Google no lo indexa.
3. **El repo sigue sin enlazar**, o sea que no hay despliegue automático al hacer push. Cuando
   la *Login Connection* de GitHub esté de verdad en la cuenta `senavia-corp`:
   `vercel git connect --scope senaviacorp`. Ojo: la conexión del usuario y el acceso al
   repositorio son **dos permisos distintos**; conceder el segundo no arregla el primero.

El repo está en GitHub, **privado**: `senaviacorp/mrandmrs-outdoor-living`, rama `main`.

### Lo único que bloquea, y solo lo puedes hacer tú

La cuenta de Vercel (`senavia-corp` / hosting@senaviacorp.com) **no tiene conectada la
integración de GitHub**, y esa conexión es un OAuth del panel: no hay API que la haga. Sin ella,
la API responde literalmente *«The provided GitHub repository can't be found»*, porque Vercel no
puede leer un repo privado al que no tiene acceso.

> vercel.com → Settings de la cuenta → **Connections** → conectar **GitHub**.

Hecho eso, el proyecto se crea y despliega enlazado al repo sin más intervención.

### Dos cosas que decidir al desplegar

1. **El equipo está en plan Hobby** (el de pago se canceló el 11-oct-2025). Hobby es para uso
   **no comercial** y esto es el sitio de un cliente. Funciona —un repo privado de cuenta
   personal sí despliega en Hobby, y `senaviacorp` es cuenta personal— pero es una decisión de
   negocio, no técnica.
2. **`PUBLIC_ES_PRODUCCION` se queda SIN definir en la preview.** Es lo que mantiene el
   `noindex` y la ausencia de canónica: sin eso, Google indexa la preview y compite con el
   dominio real. `check:seo` ya lo comprueba y hoy dice `modo: preview (noindex si, canonica no)`.

### Variables de entorno en Vercel

| Variable | Cuándo | De dónde |
|---|---|---|
| `SMTP_USER` / `SMTP_PASS` | antes de que el formulario sirva de algo | App Password de Gmail (exige 2FA) |
| `TURNSTILE_SECRET` | ídem | panel de Cloudflare del cliente |
| `LEAD_TO` | opcional | por defecto `info@mrandmrsoutdoorliving.com` |
| `PUBLIC_ES_PRODUCCION` | **solo en producción**, nunca en preview | `1` |

El build **no necesita el token de Sanity**: el dataset es público y las plantillas leen sin
autenticación. Eso es deliberado — un secreto que no hace falta en producción no debe estar en
producción. El token de escritura (`migracion-webflow`, id `siJwsZIuxYcguA`) vive solo en `.env`
local y **hay que revocarlo al entregar**.

### Y no toques el DNS

El corte de dominio lo aprueba Sebastian. No se hace por iniciativa propia.

## Cómo se comprueba todo

```bash
npm run check
```

Encadena build + `check:assets` + `check:rutas` + `check:enlaces` + `check:seo` +
`check:texto` + `check:ix2` + `check:visual`. Las de navegador piden **foco real**: la ventana
de Chromium tiene que quedarse delante.

## Fuera de fase — `/financing` (2-sep-2026)

La primera página de **autoría propia**: no existe en el origen de Webflow, así que la paridad
no le aplica. Sustituye al enlace del nav que mandaba a Acorn Finance desde las 115 rutas.

Verde en `check:tokens`, `check:rutas`, `check:enlaces` y `check:seo` (en los dos modos del
interruptor de indexación). **`check:visual` sale ROJA a propósito** hasta que Sebastian
apruebe la página mirándola y el director corra `aprobar-diseno.mjs`. Y hay cuatro puertas que
**no pueden** medirla, por no tener origen contra el que comparar: están enumeradas en
`scripts/lib/rutas-propias.mjs`. Detalle completo en `MIGRACION-LOG.md`.
