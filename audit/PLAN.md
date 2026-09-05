# Plan de trabajo — de la auditoría a la entrega

Alcance aprobado por Sebastian el 4-sep-2026: **P1 + P2 + P3**, merge a `main`, limpieza del
repositorio y **despliegue a producción al cerrar**.

Decisiones suyas que gobiernan las olas:

- **M7** `/pool-investment-estimator`: se le da `<head>` completo y **se enlaza**. No va a `noindex`.
- **M12** enlaces legales: **se quedan en `mrandmrsoutdoorsliving.com`**. Cerrado como «no se toca».
- **M2** títulos duplicados: **sí** se diferencian, declarando la excepción en `check:seo`.

## Cómo se verifica cada cosa

| Herramienta | Para qué |
|---|---|
| `node scripts/audit-sondas.mjs '<ruta>'` | Re-mide el ticket con **la misma sonda que lo detectó**, mismo ancho, misma métrica |
| `npm run check:tokens\|rutas\|enlaces\|seo\|assets\|medicion` | Puertas estáticas, baratas, sin navegador |
| `check:visual` `check:texto` `check:ix2` `check:cascaron` | Navegador **visible**, una cada vez y con foco. Al cierre |
| `scripts/aprobar-diseno.mjs <ruta> --si` | Re-aprobar la referencia de una ruta cuyo aspecto cambie |

**Regla que no se salta:** ningún ticket se cierra sin pegar la salida de su verificación.
Una puerta que no corre no es una puerta verde.

## El coste que hay que ver de antemano

107 de las 122 rutas tienen contrato `rediseno`: **cambiar su aspecto pone `check:visual` en
rojo** hasta que un humano mire la ruta y la apruebe. Por eso todo lo que altera píxeles se
concentra en las olas 1 y 4, y la aprobación se hace **en una sola sesión al final**, no
interrumpiendo once veces.

---

## Ola 1 — P1 visible · rama `fix/ola-1-p1-visible`

| Ticket | Qué se hace | Ficheros | Riesgo |
|---|---|---|---|
| **M1** | `.link-4` deja de ser blanco. `propio.css:284` lo pintaba blanco para un panel azul que R12-CON sustituyó por «tarjeta clara»: hoy es blanco sobre blanco y **es la única regla que queda de aquel panel**. Pasa a `--mm-enlace` (#1d4bbf, 7,47:1), que es lo que ya usan las reglas acotadas de `/gallery` y `/request-estimated` | `src/styles/propio.css` | Bajo — medido: ninguna de las 3 rutas con `.link-4` tiene ya fondo oscuro |
| **M9** | Los teléfonos de `/contact-us` dejan de partir el número y de pisar el subrayado | `src/styles/contacto.css` | Bajo |
| **M8** | El botón flotante de llamada deja de taparse con el formulario y con las tarjetas | hoja del widget + `contacto.css` | Medio — es global |
| **M3** | Casillas de 13×13 y 16×16 a ≥24 px de área táctil | `contacto.css` / `estimacion.css` | Bajo |
| **M4** | `a.footer-link` a ≥24 px de alto en las 122 páginas | `src/components/Footer.astro` + hoja | Medio — toca las 122 |
| **M2** | Diferenciar los 2 pares de títulos + excepción declarada en `check:seo` | 4 `.astro` de `project/` + `scripts/check-seo.mjs` | Medio — toca una puerta de paridad |
| **M7** | `<head>` completo para `/pool-investment-estimator` y enlazarla | su `.astro` + donde se enlace | Bajo |

**Verificación:** `audit-sondas.mjs` sobre `/contact-us`, `/pool-investment-estimator` y una
ruta de cada familia → 0 contrastes, 0 campos <24. `check:seo` 122/122. `check:rutas`.
**DoD:** las 7 filas verificadas con su salida pegada en `BUGS.md`.

## Ola 2 — P1 rendimiento · rama `fix/ola-2-p1-rendimiento`

| Ticket | Qué se hace | Riesgo |
|---|---|---|
| **M6** | `poster` + `preload="none"` en los dos vídeos del héroe; el segundo no arranca hasta entrar en pantalla | Medio — el héroe es lo primero que se ve |
| **M5** | `width`/`height` horneados. Se empieza por `img.imagelogo-navbar` (122 páginas) y el carrusel de logos (2 093 apariciones) | Medio — el generador de plantillas |

**Verificación:** sonda (0 imágenes sin dimensión en las rutas tocadas) + medida de LCP/CLS a
375 px sobre `/` antes y después. **DoD:** LCP y CLS medidos y anotados, mejor o igual.

## Ola 3 — P2 · rama `fix/ola-3-p2`

M10 contraste `p.grey` · M11 `rel="noopener"` en el pie · M13 cabeceras de seguridad en
`vercel.json` · M14 `User-agent` en `robots.txt` · M15 saltos de encabezado en 4-5 plantillas ·
M16 las 3 entradas muertas del manifiesto · M17 CTAs a 44 px · M18 `og:image` por defecto ·
M19 `npm audit` · M20 `/where-we-serve/north-florida` al sitemap.

**Verificación:** sonda + `check:seo` + `check:assets` (verde **desde un clon limpio**, que es
donde hoy falla) + `curl -I` a las cabeceras tras desplegar.

## Ola 4 — P3 y pulido visual · rama `fix/ola-4-p3-pulido`

M21 descripción cortada en `/videos` · M22 «1 Views • 0 Likes» · M23 `oklch` muerto ·
M24 el control del carrusel encima del logo · M25 el recorte de la foto de `/about` ·
M26 el velo de los héroes · M27 tope de longitud por campo en el endpoint.

**Aquí se decide mirando.** M25 y M26 cambian el aspecto de rutas con contrato `rediseno`:
se preparan, se miran contigo, y solo entonces se aprueban las referencias.

## Ola 5 — Release · sobre `main`

1. Merge de las 4 olas + `r16-proy-carrusel` a `main`.
2. `npm run check` **completa desde cero**, con las 4 puertas de navegador visible una cada vez.
3. Limpieza: `ensayo-merge`, worktree `adoring-panini-5f17df`, worktree huérfano de `/tmp`, y
   este mismo worktree. **Cada borrado se enseña antes de hacerlo.**
4. `vercel deploy --prebuilt --prod` — autorizado y reconfirmado.
5. Verificación post-despliegue sobre el dominio real.
6. `audit/RELEASE-CHECKLIST.md` y resumen ejecutivo para el cliente.

## Lo que NO se hace, y por qué

| No se hace | Motivo |
|---|---|
| **M12** repuntar los enlaces legales al dominio propio | Decisión de Sebastian: se quedan en `mrandmrsoutdoorsliving.com` |
| Rebajar los 67 enlaces de texto <44 px del pie y el menú | WCAG 2.2 2.5.8 los exime en texto corrido, y se arreglan con espaciado, no agrandando la caja. M4 sí sube los que son control |
| Matar el `astro dev` ajeno (PID 55481) | Es de otra sesión. El worktree lo esquiva |
| Re-capturar el baseline de las 115 rutas | `baseline/shots/` es la única prueba de la migración y no se regenera una vez cortado el dominio |
