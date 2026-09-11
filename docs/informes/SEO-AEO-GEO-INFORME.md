# SEO + AEO + GEO + Google Ads — informe

**Fecha:** 2026-09-11 · **Rama:** `claude/seo-aeo-geo-mrandmrs-anluhe` · **Base:** `c54d3d8`

Cada cifra de aquí sale de un comando, y el comando está al lado (Principio 6). Lo que no se
pudo medir se dice, no se rellena.

---

## 1 · Lo que hay que leer aunque no se lea nada más

**1. El evento de conversión no existe en GA4.** Cero `generate_lead` en ocho meses y medio,
mientras `/thank-you` —que es quien lo empuja— tiene 18 páginas vistas. Los cinco tags de evento
personalizado del contenedor están los cinco a cero. **Se arregla en GTM, no en este repo, y
bloquea el lanzamiento de $2.000/mes.** Detalle y sospechoso en
[`GOOGLE-ADS-QUALITY-SCORE-MATRIX.md`](GOOGLE-ADS-QUALITY-SCORE-MATRIX.md) §0.

**2. El cluster orgánico de mayor valor no tenía página objetivo.** `best pool builders`,
`best pool {installers,companies,contractor} near me` suman **~490 impresiones en posición
7,7-17,7 y cero clics**, y Google los resolvía todos contra `/pool-builders/pembroke-pines-florida`
—elegida al azar entre 53 páginas que son 82,9 % idénticas byte a byte—. Esa página rinde 7.916
impresiones con 2 clics: **CTR 0,025 %**.

**3. El sitio era semánticamente mudo, y ya no lo es.** `sameAs` pasa de **0 a 122**.

---

## 2 · Estado recuperado y qué se continuó

| Fase | Estado | Commit |
|---|---|---|
| F0 · línea base y mapa keyword→URL | ✅ cerrada | `e547b93` |
| F0b · caché de Sanity, build e inventario | ✅ cerrada | `979482c` |
| F1 · `META_PROPIA`, metas propias | ✅ cerrada | `b0c2b11` |
| A3 · las 4 landing pages + `check:ads` | ✅ cerrada | `432f07e` |
| F3 · entidad del negocio en las 122 | ✅ cerrada | `353e65c` |
| QS1-QS4 · matriz de Quality Score | ✅ entregada | este commit |
| A1 · 5 campos cualificadores | ⬜ pendiente | — |
| A2 · evento de conversión | 🚨 **bloqueado en GTM**, no en el repo | — |
| A4 · correspondencia RSA + 11 sitelinks | 🚫 bloqueado: no existe el libro de campaña | — |
| F9/F10/A5 · verificación contra producción | 🚫 bloqueado: egress | — |

---

## 3 · Antes y después, medido

### SEO técnico

| Métrica | Antes | Después | Comando |
|---|---:|---:|---|
| `<title>` > 60 caracteres | 21 | **4** | jsdom sobre `.vercel/output/static` |
| `description` > 155 caracteres | 39 | **30** | ídem |
| `<title>` duplicados en las 122 | 0 | 0 | `check:seo` |
| Páginas sin `<h1>` | 0 | 0 | ídem |
| Páginas con más de un `<h1>` | 0 | 0 | ídem |

Las 4 que siguen largas son deliberadas: 3 son `/project/*` declaradas en `TITULO_PROPIO` por M2
—se alargaron para dejar de duplicarse, que es el defecto peor— y la 4.ª es la landing de pago
del Core, donde manda la hoja 22 del libro de campaña. De las 30 descripciones largas, **28 son
las ciudades**: su meta vive en Sanity, es contenido del cliente, y el encargo prohíbe publicar
allí lo que Sebastian no haya visto. Están entre 156 y 160 caracteres. Van propuestas, no escritas.

### Datos estructurados — el déficit mayor, cerrado

| Métrica | Antes | Después |
|---|---:|---:|
| `LocalBusiness` de la entidad | 0 | **122** |
| **`sameAs` poblado** | **0** | **122** |
| `telephone` dentro de JSON-LD | 0 | **122** |
| `BreadcrumbList` | 1 | **120** |
| Páginas sin ningún JSON-LD | 1 | **0** |
| JSON-LD que no parsea | 0 | 0 |

Las tres URLs de `sameAs` ya vivían en el repo: el perfil de Google (`resenas.json.enlacePerfil`,
CID que `check-resenas.mjs:24` verifica en cada pasada), Instagram y el canal de YouTube.
Facebook, Houzz, BBB y Yelp **no están** porque no constan en ninguna fuente.

### Las 4 landing pages de pago

| | antes | después |
|---|---|---|
| h1 Gainesville | Luxury Pool Builders & **Outdoor Living Contractors** in Gainesville | **Custom Pool Builders** In Gainesville, Florida |
| h2 Gainesville | **All In One - Custom Pools, Pergolas & Outdoor Kitchens** … | **Custom Inground Pool Construction** For Homes In Gainesville And **Alachua County** |
| title Gainesville | Luxury Pools & **Outdoor Living** in Gainesville, FL | **Custom Pool Builders** in Gainesville, FL |

Ídem Ocala con Marion County. Los servicios secundarios **no se borran**: siguen más abajo
(Principio 1). Solo 2 de las 53 ciudades llevan override; las otras 51 salen byte a byte igual,
verificado.

---

## 4 · Correcciones a lo que el encargo daba por cierto

| Premisa | Medido |
|---|---|
| «~20 clics / 28 días» | ~130 clics a 90 días, con lista de oportunidad concreta |
| Hallazgo 2: 8 `/project/*` con JSON-LD roto | **Ya arreglado** — sanitizador en `build-paginas.mjs:912-923`, 0 rotos en las 122 |
| Hallazgo 4: `/brochures` sin description ni JSON-LD | **Ya arreglado** — `HUECOS_SEO`; hoy 150 car + `CollectionPage` |
| Hallazgo 5: estimadores sin `<h1>` | **Ya arreglado** — 1 `<h1>` cada uno |
| Hallazgo 3: 3 `/articles/*` huérfanas | **Medio** — el pie ya las enlaza; quedan 2 huérfanas reales |
| Hallazgo 11: Composio sin propiedad de esta marca | **Obsoleto** — GSC `siteOwner`, GA4 `canEdit: true` |
| «$75K como mínimo residencial está en la web» | **No lo está.** Los `$75,000` del repo son **rangos de un desplegable de presupuesto**. `$55K`, `$20K+` y «100+ reseñas de 5 estrellas»: **cero apariciones** |
| «La atribución está a cero» (hoja 24) | **No.** `Formularios.astro:324` ya captura `gclid`/`wbraid`/`gbraid`/`utm_*` con persistencia de primer toque. Estaba deliberadamente desconectada del dataLayer, no ausente |
| «No existe evento de conversión propio» | **Existe en el código** (`/thank-you` empuja `generate_lead`). Lo que no existe es su llegada a GA4 |

---

## 5 · Bloqueos, con las vías que se agotaron

| Bloqueo | Vías probadas |
|---|---|
| **Verificar producción** (F10, F9, A5) | `curl` → 403 · `WebFetch` → `EGRESS_BLOCKED` · MCP de Vercel → «Unable to create shareable URL» · Firecrawl → sin conexión. Queda `INSPECT_URL` de GSC, que da el veredicto de Google pero **no** códigos HTTP |
| **Las 39 keywords** (A4, QS1) | Ads → `USER_PERMISSION_DENIED` · Drive `LAUNCH_MASTER` → vacío en todas las unidades · ningún `.xlsx` posterior al 04-sep |
| **`generate_lead` en GA4** | Diagnosticado, no reparable desde el repo: es configuración de GTM |
| **Metas de las 53 ciudades** | Viven en Sanity = contenido del cliente |

Sanity **sí** se resolvió: el build no arrancaba porque el proxy deniega `api.sanity.io`, y ahora
hay una caché explícita tras `MM_SANITY_CACHE=1` que nunca puede enmascarar una caída real.

---

## 6 · Puertas

**Verdes — 13:** `check:resenas` · `check:aviso` · `check:estimador` · `check:tokens` ·
`check:rutas` · `check:enlaces` · `check:menu` · `check:galeria` · `check:galeria-formulario` ·
`check:seo` · `check:medicion` · `check:carrusel` · `check:ix2` · más `check:ads` (nueva) y
`check:texto` sobre las 53 ciudades y las rutas tocadas.

**NEW REGRESSION: ninguna.** Las rojas que quedan son las tres de abajo, clasificadas con
evidencia y no por conveniencia.

1. **`check:texto` en `/services/custom-pool-spa-builders-…`** — `PRE-EXISTING KNOWN RED`.
   El carrusel de proceso arranca en otra diapositiva que la que capturó el baseline de Webflow.
   **Verificado**: `git stash` de los cambios, reconstrucción de `432f07e` limpio, y la roja sale
   **idéntica**.
2. **`check:cascaron`, 8 fallos** — `ENVIRONMENT BLOCKER`. Los ocho son **desviación de
   geometría** en nav y pie. Pero: recuentos idénticos (303/303 y 180/180), **texto idéntico**, y
   píxeles al **99,45 %** y **99,32 %**. Y se desvían **los 180 elementos del pie**, todos. Un
   cambio de contenido no mueve 180 elementos dejando el píxel al 99,4 %; una métrica de fuente
   distinta, sí. La referencia se capturó en la máquina macOS de Sebastian y esto corre en Linux.
   Además **este diff no toca ni `Nav.astro` ni `Footer.astro` ni su CSS**, que es lo único que
   esa puerta mira.
3. **`check:visual`, ~356 comparaciones** — `PRE-EXISTING`. Deriva deliberada de R9-R16 cuya
   referencia nunca se repuso. Se cierra con `aprobar-diseno.mjs --si`, que **exige un humano** y
   no se firma desde un agente.
4. **`check:assets`** — `ENVIRONMENT BLOCKER`. Busca `_source/sanity-masters/`, que está en
   `.gitignore:12` y por tanto **no existe en un clon limpio**. Falla igual sobre HEAD sin mis
   cambios (`exit=1`, verificado).

### Dos trampas del entorno, resueltas y anotadas

- **Playwright 1.62.1 espera `chromium-1234` y la imagen trae `1194`**, en dos paquetes distintos
  (el navegador y el *headless shell*, con el binario llamado `headless_shell`). Resuelto **fuera
  del repo** con enlaces; sin eso, seis puertas no arrancan.
- 🚨 **`check:cascaron` reconstruye con `MM_FIXTURES=1` y eso sobrescribe `public/robots.txt` y
  `public/sitemap.xml` con la versión de PREVIEW** — `Disallow: /` y 0 `<loc>`. Es la misma
  trampa que la bitácora ya documentaba. **Hay que restaurarlos después de correrla**; commitear
  eso publicaría un sitio que se prohíbe a sí mismo.

Trampa que costó una vuelta y queda anotada: **las puertas hay que correrlas con el mismo
`PUBLIC_ES_PRODUCCION` que el build.** Sin la variable sobre un build de producción, `check:seo`
da 122 rojas que no son del sitio.

---

## 7 · Red team — lo que busqué contra mi propio trabajo

| Riesgo | Resultado |
|---|---|
| Keyword stuffing en las LPs | No. Un concepto por encabezado, lenguaje natural |
| Señales locales inventadas | No. Solo Gainesville/Alachua y Ocala/Marion, que son verificables |
| Doorway pages | No. Una landing por intención; las 51 ciudades restantes intactas |
| Contenido duplicado nuevo | No. Las 53 siguen a 82,9 % de solape **del origen**; no se añadió ninguno |
| Afirmaciones sin evidencia | Cero, verificado con `grep` sobre las 122 y fijado en `check:ads` |
| Tracking roto por el cambio | No. `check:medicion` verde antes y después |
| Fuga de plantilla de ciudad | Vigilada: `check:ads` falla si vuelve «pergola/outdoor kitchen» arriba del pliegue |
| `aggregateRating` falso | No se puso. El perfil real es 4,1/13 y el sitio publica 8, todas de 5 |

---

## 8 · Lo que queda, por prioridad

**P0 — bloquea el lanzamiento**
1. **Verificar en GTM por qué `generate_lead` no llega a GA4.** Empezar por el trigger de bloqueo
   `BLOQUEO - Entornos de preview` (`{{_event}} .*`), que casa con todos los eventos. Después,
   una prueba real de extremo a extremo: envío → `/thank-you` → evento en DebugView → conversión
   en Ads.

**P1**
2. **A1 — los 5 campos cualificadores** (ZIP, Homeowner, Project Type, Investment Range,
   Timeline), con `Project Type` preseleccionado según la landing. Nota de alcance: los campos
   del formulario viven en el HTML scrapeado de las páginas derivadas, así que el arreglo va en
   `build-paginas.mjs` y **regenera ~50 ficheros**; conviene hacerlo en su propio commit.
3. **Formulario propio en las 4 landing pages.** Hoy el tráfico pagado hace un segundo clic.

**P2**
4. `width`/`height` en los 10.062 `<img>` que no los llevan — es el motor del CLS.
5. Enlazado ciudad ↔ condado ↔ región hacia `/where-we-serve`, para consolidar el cluster genérico.
6. Capa AEO: párrafo-respuesta de 40-55 palabras, `<table>` de permisos por condado, `FAQPage`.

**Para Sebastian** — el bloque completo está al final del plan. Lo que más rinde: las URLs de
Facebook/Houzz/BBB/Yelp para `sameAs`, si hay dirección postal publicable, y si las dos licencias
`CPC1461119` / `CPC1460562` siguen vigentes.

---

## 8.ter · Despliegue — hecho, y qué quedó sin verificar

**Mergeado y en producción el 11-sep-2026.** PR #2 → `main` (`8502b2f`), y Vercel desplegó y
**promovió**:

```
VERCEL_GET_DEPLOYMENT  dpl_E8cz5gsCW5LmCKCDsyhYioRf6Xhy
  target        : production
  readyState    : READY        readySubstate : PROMOTED
  gitSource.sha : 8502b2fb6ece448ca751354be0efe0473cc752e9
  aliasAssigned : true
  alias         : www.mrandmrsoutdoorliving.com · mrandmrsoutdoorliving.com
                  mrandmrs-outdoor-living.vercel.app
  env           : …PUBLIC_ES_PRODUCCION…
```

Dato de paso que vale la pena: **los 5 despliegues de rama previos salieron `READY`**. O sea que
el build funciona en Vercel con Sanity alcanzable, y la caché de F0b **nunca se usa allí** — la
guarda que para el build sin datos sigue intacta en producción, que es exactamente como se
diseñó.

### 🚨 Lo que NO se verificó, y no se da por bueno

`PRODUCTION HTTP VERIFICATION NOT PERFORMED`. El F10 del encargo pide comprobar, **contra el
dominio**, las 121 URLs en 200, los redirects en 308 con destino en 200, `robots.txt`, que todas
las canónicas estén en `www` y el apex→www en 308. **Nada de eso se ha hecho**: el proxy de
egress deniega el dominio y también la URL de despliegue (`mcp__Vercel__web_fetch_vercel_url` da
403 de scope sobre `senaviacorp`).

Lo único que consta es lo de arriba: que la plataforma reporta el despliegue como READY y
PROMOTED con el commit correcto y el alias de producción asignado. Es evidencia real, pero **no
es lo mismo** que haber pedido las 121 URLs.

**Los comandos, para correrlos desde una máquina con red:**
```bash
# las 121 del sitemap en 200
curl -s https://www.mrandmrsoutdoorliving.com/sitemap.xml \
  | grep -oP '(?<=<loc>)[^<]+' \
  | xargs -P8 -I{} sh -c 'printf "%s %s\n" "$(curl -s -o /dev/null -w %{http_code} "{}")" "{}"' \
  | grep -v '^200 ' ; echo "(vacio = las 121 en 200)"

# los 14 redirects en 308 con destino en 200
node -e 'JSON.parse(require("fs").readFileSync("vercel.json","utf8")).redirects
  .forEach(r=>console.log(r.source, r.destination))' \
  | while read s d; do
      printf '%s -> %s  %s\n' "$s" "$d" \
        "$(curl -s -o /dev/null -w %{http_code} https://www.mrandmrsoutdoorliving.com$s)"
    done

# robots, canonica y apex
curl -s  https://www.mrandmrsoutdoorliving.com/robots.txt
curl -s  https://www.mrandmrsoutdoorliving.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -sI https://mrandmrsoutdoorliving.com/ | head -2     # se espera 308 -> www
```

Y lo que sí se puede hacer sin red al dominio: `INSPECT_URL` de GSC sobre una muestra, dentro de
unos días, cuando Google haya vuelto a rastrear.

---

## 8.bis · F11 — Search Console, lo hecho y lo que queda a mano

**Hecho (11-sep-2026 11:45 UTC):** `sitemap.xml` reenviado y **ya descargado por Google**.

| | antes | después |
|---|---|---|
| `sitemap.xml` enviadas | 113 (descarga del 29-ago) | **121 · 0 errores** (descarga del 11-sep) |

El desfase de 8 URLs que arrastraba el encargo queda cerrado.

**Queda a mano, y no por olvido:** retirar `page-sitemap.xml` —el zombi de Webflow con 1 error,
17 URLs web y 1.004 de imagen, todas muertas, sin descargar desde el 29-sep-2025—. **El toolkit
de Composio no expone borrado de sitemaps** (`GOOGLE_SEARCH_CONSOLE_DELETE_SITEMAP` no existe;
solo `SUBMIT` y `GET`). Se borra en la interfaz de Search Console, en Sitemaps → los tres puntos
→ Eliminar sitemap.

**Un dato de indexación que confirma el diagnóstico.** `INSPECT_URL` sobre
`/pool-builders/gainesville-florida`:

```
coverageState : "Discovered - currently not indexed"
referringUrls : ["https://www.mrandmrsoutdoorliving.com/where-we-serve/south-florida"]
verdict       : NEUTRAL
```

Google **conoce** la página —le llegó desde `/where-we-serve/south-florida`— y ha decidido **no
indexarla**. «Discovered, currently not indexed» en una página de ciudad es la respuesta típica
a contenido que el rastreador juzga redundante, y encaja exactamente con el 82,9 % de solape
medido entre las 53. Es la mejor prueba de que la diferenciación de A3 y el trabajo de F6 atacan
la causa correcta, y también de por qué las 51 restantes necesitan contenido propio antes que
metas nuevas.

Recordatorio que sigue vigente: el campo `indexed` de la API devuelve `"0"` siempre, en los dos
sitemaps. **No es un dato.** La indexación real se mide con `INSPECT_URL`, como aquí.

---

## 9 · Qué esperar, y cuándo

Sin promesas de posición: depende de competencia, autoridad de dominio y tiempo, que no
controlamos. Lo que sí se puede vigilar, a 30 y 90 días en Search Console:

- **impresiones no-marca** y consultas nuevas;
- **posición media** de `/where-we-serve` en el cluster genérico, que es la apuesta principal;
- **CTR de `/pool-builders/pembroke-pines-florida`**, hoy en 0,025 %: si los títulos hacen su
  trabajo, es donde primero se verá;
- que el sitemap reenviado se descargue sin errores y que `page-sitemap.xml` (el zombi de Webflow
  con 1 error y 1.021 URLs muertas) desaparezca.
