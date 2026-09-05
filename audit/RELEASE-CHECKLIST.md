# Checklist de entrega — Mr & Mrs Outdoor Living

Cierre de la auditoría integral del 4/5-sep-2026. `main` en `624eed6`, desplegado y verificado
sobre el dominio real. Cada línea lleva **cómo** se comprobó; lo que no se pudo comprobar lo
dice con su nombre y su motivo.

## 1 · Las 15 puertas, todas corridas sobre el artefacto de release

Es la primera vez que se corren **las quince**. En el cierre anterior, cuatro no corrieron y se
dieron por buenas — «una puerta que no corrió no es una puerta verde».

| Puerta | Resultado |
|---|---|
| `check:tokens` `check:rutas` `check:enlaces` `check:seo` `check:medicion` `check:assets` `check:aviso` `check:estimador` | ✅ **8 verdes** |
| `check:carrusel` `check:menu` `check:galeria` `check:galeria-formulario` | ✅ **4 verdes** |
| `check:texto` | ✅ **VERDE.** Corrida entera por primera vez: salieron **56 páginas rojas**, todas heredadas, diagnosticadas y declaradas |
| `check:ix2` | ✅ **VERDE.** No había corrido nunca |
| `check:cascaron` | ✅ **VERDE**, con sus 5 desviaciones declaradas |
| `check:visual` | 🔴 **356 comparaciones rojas — MEDIDO QUE SON ANTERIORES.** Ver §4 |

## 2 · El artefacto

| Punto | Comprobación | Estado |
|---|---|---|
| El build pasa desde cero | `PUBLIC_ES_PRODUCCION=1 npm run build` | ✅ 14 s |
| Sustrato de producción, no preview | 122/122 con canónica · robots abierto · 121 `<loc>` | ✅ |
| Consola, red e imágenes | Sonda headless, 732 mediciones (122 rutas × 6 anchos) | ✅ 0 errores, 0 fallos, 0 rotas |

## 3 · Producción — verificado sobre el dominio real

| Punto | Medida |
|---|---|
| Las 121 URLs del sitemap | ✅ **121/121 en 200**, cero excepciones |
| Los 14 redirects permanentes | ✅ **14/14 en 308**, y sus destinos resuelven en 200 |
| Cabeceras de seguridad | ✅ **6 vivas**: HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, COOP |
| `robots.txt` | ✅ `User-agent: *` + `Allow: /` + línea `Sitemap:` |
| Canónicas | ✅ 122/122, host `www`, igual que el sitemap |
| apex → www | ✅ 308 |

### El hallazgo mayor de la auditoría

**Los 14 redirects y las 5 cabeceras iban al vacío.** Medido antes del arreglo: `/excavation`,
`/where-we-serves/…` y las 12 restantes devolvían **404** en producción, y `curl -I` solo daba
`strict-transport-security`.

Causa: el sitio despliega con `vercel deploy --prebuilt --prod`, y **con `--prebuilt` Vercel no
lee `vercel.json`** — el enrutado sale entero de `.vercel/output/config.json`, que escribe el
adaptador de Astro. Estaban bien escritos y no llegaban al servidor. Son justo las URLs viejas
de Webflow que Google todavía tiene indexadas: cada una servía un 404 a tráfico orgánico real.

Ninguna puerta lo vio porque `check:enlaces` valida que los redirects estén *declarados*, no que
*lleguen*. Cerrado con `scripts/build-vercel-config.mjs`, enganchado al final de `npm run build`.

## 4 · `check:visual`: por qué está roja y por qué no bloquea

356 comparaciones rojas. **Está medido que son anteriores a esta auditoría**: se construyó el
estado previo (`33baf7e`) en un worktree aparte y `/gallery` da los **mismos deltas exactos** —
+1319 px a 1920, +742 a 1440, +2537 a 991, +1139 a 479.

Es la deriva del rediseño R9–R16 contra el baseline de Webflow: páginas que se rediseñaron a
propósito y cuya referencia aprobada nunca se repuso. **No es una regresión de esta sesión.**

Se cierra mirando cada ruta y re-aprobando su referencia con
`node scripts/aprobar-diseno.mjs <ruta> --si`, que **exige un humano que la haya mirado**. No se
puede firmar desde un agente sin vaciar de sentido la puerta, así que se deja abierta y dicha.

## 5 · Repositorio

| Punto | Estado |
|---|---|
| Todo commiteado | ✅ árbol limpio |
| `main` sincronizada con el remoto | ✅ `624eed6` |
| Ramas | ✅ solo `main`, local y remota. `ensayo-merge` y `r16-proy-carrusel` borradas tras verificar que no aportaban nada |
| Worktrees | ✅ solo el principal. Los cuatro de trabajo y verificación, borrados |
| Stashes | ✅ ninguno |
| Secretos | ✅ `.env` y `.env.local` nunca versionados, verificado sobre `git log --all` |

## 6 · Lo que queda abierto, y de quién es

- **`check:visual`** — 356 comparaciones. Necesita que Sebastian mire y apruebe las referencias (§4).
- **`SMTP_USER` / `SMTP_PASS` en el scope Preview** de Vercel. Producción sí los tiene: Sebastian probó los 5 formularios a mano y llegan.
- **La entrega SMTP no se puede verificar desde un agente**: en producción Turnstile no emite token a un navegador automatizado (403 medido) y un antibot no se sortea.
- **Proceso `astro dev` ajeno** (PID 55481), vivo desde el jueves. No se ha tocado: es de otra sesión.
