# Estado de entrega — Mr & Mrs Outdoor Living

Escrito al cerrar la sesión del 27/28-ago-2026. Los números salen de las puertas; los comandos
que los producen están en `MIGRACION-LOG.md`, entrada por fase.

## Qué está hecho

| Fase | Estado |
|---|---|
| F0 Cuentas y repo | ✅ |
| F1 Baseline congelado | ✅ 115 HTML · 115 textos · 115 SEO · 460 capturas · determinismo demostrado |
| F2 Assets locales | ✅ (reabierta 3 veces) 1826 assets · 0 fallos · 0 referencias a Webflow |
| F3 Sanity | ✅ 511 documentos · 628 assets · 0 referencias rotas |
| F4 Cascarón | ✅ nav y pie idénticos al vivo por geometría, 4 anchos |
| F5 Páginas estáticas | ✅ 14/14 con texto 100 % idéntico |
| F6 Páginas de colección | ✅ 115/115 rutas · 0 de más |
| F7 Interacciones | ✅ 0 invisibles · 0 transform residual · 0 scroll-x |
| F8 Formularios | 🟡 endpoint hecho y probado; **faltan credenciales** |
| F9 Paridad SEO | ✅ 115/115 con el `<head>` del origen |
| F10 Puertas | 🟡 9 de 10 escritas |
| F11 Deploy | ⬜ **no iniciado a propósito** |

## Lo que hace falta de tu parte

### 1. Credenciales (bloquean la Fase 8)
| Variable | De dónde sale |
|---|---|
| `SMTP_USER` / `SMTP_PASS` | Gmail App Password. **Exige 2FA activa** y debe ser de la cuenta que autentica |
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
- **127 imágenes de contenido con `alt` vacío** y **8 fichas de `/project/` con JSON-LD
  inválido**, las dos cosas heredadas del origen.

## Lo que queda por hacer, y no depende de nadie

1. **Las 7 plantillas no leen de Sanity.** Es lo único que separa este sitio de tener un CMS
   útil. Los 511 documentos están importados y verificados; falta cablearlos. Cuando se haga,
   `check:texto` dirá al instante si algo dejó de cuadrar — esa es la red que se ha construido
   antes, a propósito.
2. Con eso hecho, los **428 MB** de imágenes salen de git y se piden al CDN de Sanity.
3. De la Fase 7 quedan el **antes/después**, `w-tabs` (2 usos) y la paginación de
   `/blogs-tips`. Ninguno deja el sitio roto.
4. `check:lighthouse` y `check:formularios` (este último necesita las credenciales).

## Cómo se comprueba todo

```bash
npm run check
```

Encadena build + `check:assets` + `check:rutas` + `check:enlaces` + `check:seo` +
`check:texto` + `check:ix2` + `check:visual`. Las de navegador piden **foco real**: la ventana
de Chromium tiene que quedarse delante.
