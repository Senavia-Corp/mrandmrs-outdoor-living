# SEO + AEO + GEO — mapa keyword→URL y decisiones

Entregable de la **F0** del encargo SEO/AEO/GEO y su adenda de Google Ads. Es el documento que
dirige las fases siguientes: nada de lo de aquí sale de intuición, todo sale de los datos que se
citan con su comando.

## Metodología

```
GSC  GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY
     sc-domain:mrandmrsoutdoorliving.com · 2026-06-09 → 2026-09-07 (90 días)
     dimensiones: [query] · [page] · [query,page]      cuenta google_search_console_eyah-surahi
GA4  GOOGLE_ANALYTICS_RUN_REPORT
     properties/506563956 · mismo rango
     dimensiones: [landingPagePlusQueryString] · [eventName]   cuenta google_analytics_crout-hillet
```

Propiedad de dominio (`sc-domain:`), así que cubre apex, `www` y `http`/`https` de una vez.

🚨 **El campo `indexed` de `LIST_SITEMAPS` devuelve `"0"` siempre.** Google dejó de poblarlo hace
años. Ninguna cifra de indexación de este documento sale de ahí; la indexación real se mide con
`INSPECT_URL` por URL (F11).

---

## 1 · El hallazgo que manda sobre todo lo demás: canibalización genérica

**El cluster de mayor valor del sitio no tiene página objetivo, y Google está eligiendo una al
azar.** Medido, `query × page`:

| Consulta | Impr | Pos | Página que Google elige |
|---|---:|---:|---|
| best pool builders | 88 | 11,1 | `/pool-builders/pembroke-pines-florida` |
| best inground pool installers near me | 84 | 7,7 | `/pool-builders/pembroke-pines-florida` |
| best pool companies near me | 82 | 11,8 | `/pool-builders/pembroke-pines-florida` |
| best pool builder near me | 81 | 17,7 | `/pool-builders/pembroke-pines-florida` |
| best pool installers near me | 77 | 9,7 | `/pool-builders/pembroke-pines-florida` |
| best pool contractor near me | 76 | 11,0 | `/pool-builders/pembroke-pines-florida` |
| best pool companies in my area | 1 | 9,0 | `/pool-builders/pembroke-pines-florida` |

**~490 impresiones en posiciones 7-18, y 0 clics.** La página entera rinde 7.916 impresiones con
2 clics: **CTR 0,025 %**.

La causa no es misteriosa y ya está medida en el plan: las 53 páginas de ciudad son **82,9 %
idénticas byte a byte** y colapsan a 7 textos distintos al enmascarar el topónimo. Ante una
consulta genérica sin ciudad, Google no tiene forma de preferir una y coge cualquiera. Le tocó
Pembroke Pines. Y una vez elegida, el `<title>` dice «Pembroke Pines» mientras la consulta dice
«near me», así que nadie hace clic.

**Consecuencia para el mapa:** el cluster genérico necesita **su propia URL objetivo**, y las 53
ciudades deben enlazarla en vez de competir con ella. Ese es el trabajo de F2 (enlazado) y F6
(diferenciación local), y es la palanca orgánica más grande del sitio — más que cualquier ajuste
de meta.

**Contraprueba de que las páginas de ciudad SÍ funcionan cuando la consulta nombra la ciudad:**
`/pool-builders/boca-raton-florida` se lleva `boca raton pool remodeling` (110 impr), `boca raton
pool builders` (62), `best pool company boca raton` (48), `boca pool remodel` (47), `boca raton
pool experts` (31). El problema no son las páginas de ciudad: es que no hay nada por encima de
ellas.

---

## 2 · Mapa keyword→URL — una URL objetivo por intención

Sale de `query × page` a 90 días. «Hoy» = la página que Google elige hoy; «objetivo» = la que debe
ganar. Cuando las dos coinciden, el trabajo es de refuerzo, no de reasignación.

### 2.1 · Genérico de contratista — SIN DUEÑO, es la prioridad 1

| Intención | Consultas representativas | Hoy | Objetivo |
|---|---|---|---|
| «el mejor constructor de piscinas, cerca de mí» | best pool builders · best pool {installers,companies,contractor} near me · best pool companies in my area | `/pool-builders/pembroke-pines-florida` (accidental) | **`/where-we-serve`** como cabecera de la jerarquía regional, reforzada desde las 53 |
| Regional sur | best pool builders in south florida (53 impr, pos 70,8) · best pool companies in south florida | `/where-we-serves/custom-pool-builders-south-florida` | misma, ya correcta — el problema es la posición, no el destino |
| Regional norte | barn builders north florida · best outdoor living contractor in gainesville | `/` y servicios | `/where-we-serve/north-florida` |

### 2.2 · Informativo — donde el sitio ya gana, y es AEO puro

| Intención | Consultas | Hoy = objetivo | Estado |
|---|---|---|---|
| Permisos | does an above ground pool require a permit (**pos 1**) · above ground pool permit (7,5) · …requirements (10,3) · …florida (14,5) · backfilling for pools miami-dade county | `/blogs/what-permits-are-required-for-pool-construction-in-florida` | **Fuerte.** 2.346 impr, 12 clics, pos 10,2. Tabla de permisos por condado (F4) y `FAQPage` |
| Plazos | pool construction timeline (10,0) · pool building process florida (7,5) · «approximately how long?» (8,0) | `/blogs/pool-construction-timeline-in-florida-…` | 981 impr, 8 clics, pos 14,8. Lista numerada con plazos por fase (F4) |
| Coste | average cost to build a pool in florida (**29 impr, pos 59,7**) · average cost of building a pool in florida (10, 58,1) · …installation… (2, 60,5) | `/blogs/complete-guide-to-pool-construction-…` | **Mal colocado.** 2.622 impr pero pos 33,7. El coste debería ir a `/pool-cost-estimator`, que hoy solo saca `above ground pool cost estimator` en pos 55,7 |

**Cuidado con leer estas posiciones sin su volumen:** `does an above ground pool require a permit`
sale en posición 1, pero sobre **1 sola impresión** — es una señal de forma, no de volumen, y no
sostiene por sí sola ninguna conclusión. Lo que sí es sólido es **la página**: 2.346 impresiones,
12 clics, posición media 10,2 en 90 días. El cluster de permisos está bien colocado y mal
explotado: ninguna de esas consultas tiene hoy un párrafo-respuesta de 40-55 palabras arriba de la
página. Es la primera pieza de F4.

### 2.3 · Servicios — cada uno con su cluster, casi todos en posición mala

| Objetivo | Consultas que ya le llegan | Impr / pos |
|---|---|---|
| `/services/motorized-retractable-screens-in-north-south-florida` | automatic patio screens florida · alys beach retractable {patio ,}screens · apopka/atlantic beach/barefoot bay motorized screens · automated patio screen near me | 21 @ 35,0 + cola larga @ 51-75 |
| `/services/steel-building-pole-barn-construction-in-north-south-florida` | **barn builders florida (45 @ 49,9)** · barn builders in florida · barn builders north florida (23,5) · barn building company in clearwater county | 2.311 impr totales, 1 clic, pos 39,5 |
| `/services/custom-aluminum-pergola-builders-in-north-south-florida` | aluminum pergola installers near me (18 @ 51,8) · aluminum {louvered ,}pergola installation {davie,wellington,coconut creek,lighthouse point,plantation} | cola de ciudades @ 33-79 |
| `/services/patio-screen-rooms-enclosures-in-north-south-florida` | **are there any specialists in screen room design in bronson fl? (44 @ 5,8)** | consulta en forma de pregunta, pos 5,8, **0 clics** |
| `/services/custom-deck-builders-in-north-south-florida` | are there any companies that build custom decks in bronson fl? (7 @ 18,7) | ídem, forma de pregunta |
| `/services/pool-screen-enclosures-for-north-south-florida-pools` | patio screen (pos 1) · aluminum pool cage installation oldsmar (pos 5) | ya gana, reforzar |
| `/services/pool-remodeling-renovation-in-north-south-florida` | altamonte springs pool remodeling company (4 @ 38,3) | **LP de pago** — ver §3 |
| `/services/custom-outdoor-kitchens-for-north-south-florida-homes` | best outdoor kitchen companies orlando florida… (30) | |

Las dos consultas en forma de pregunta («are there any specialists in screen room design in bronson
fl?», 44 impr en **posición 5,8**, cero clics) son la demostración de que el sitio aparece en
consultas conversacionales y **no captura ninguna**: no hay respuesta extraíble arriba de la página.
Es el caso de prueba de F4.

### 2.4 · Ciudad y condado

Funcionan cuando la consulta nombra la ciudad (Boca Raton, arriba). Prioridad de diferenciación en
F6, **por impresiones reales**, no las 53 a la vez:

```
pembroke-pines 7.916 · boca-raton 1.777 · deerfield-beach 1.214 · delray-beach 2.956
davie 3.289 · hollywood 2.136 · dania-beach 699 · beach 593 · boynton-beach 441
```
El resto de las 53 espera. Las que no tienen ninguna impresión no reciben trabajo de copy.

### 2.5 · Canibalizaciones detectadas

1. **Genérico vs. 53 ciudades** — §1. La grande.
2. **Coste**: `/blogs/complete-guide-…` y `/pool-cost-estimator` compiten por el cluster de precio.
   Objetivo: la guía se queda con «proceso/costes explicados», el estimador con «cuánto cuesta».
3. **URLs viejas de redirect todavía rankeando** — Google sigue sirviendo las URLs previas al
   redirect: `pool-builders/pool-builders-ocala-florida` (603 impr, `best pool builder ocala` 23
   @ 49,5), `pool-builders-micanopy-florida` (741 impr), `pool-builders-hallandale-beach-florida`.
   Los 7 redirects existen y son 308; la consolidación no ha ocurrido todavía. **Se vigila en F11,
   no se toca** — forzarlo no está en nuestra mano.
4. **Tres variantes de la home indexadas**: `https://mrandmrsoutdoorliving.com/` (3.823 impr, pos
   28,9), `http://www.mrandmrsoutdoorliving.com/` (1.282 impr, pos 5,39) y la canónica
   `https://www.…`. Las canónicas y los 308 ya son correctos; es índice heredado. Se vigila.

---

## 3 · Las 39 keywords de pago y sus 4 landing pages

Manda la hoja 22 del libro de campaña en `<h1>`, héroe, CTA y orden above-the-fold; el resto lo
manda este documento (regla de precedencia del plan).

| Grupo | kw | URL final | Lo que ya le llega en orgánico |
|---|---:|---|---|
| Pool Builders Core | 20 | `/services/custom-pool-spa-builders-in-north-south-florida` | 12 sesiones GA4; poca presencia orgánica propia |
| Gainesville | 5 | `/pool-builders/gainesville-florida` | `above ground pools gainesville fl` @ 77 · `best outdoor living contractor in gainesville` (6 @ 35,8, va a la home) |
| Ocala | 5 | `/pool-builders/ocala-florida` | 12 sesiones GA4. **Ojo:** el orgánico de Ocala cae hoy en la URL vieja `pool-builders-ocala-florida` |
| Full Remodel | 9 | `/services/pool-remodeling-renovation-in-north-south-florida` | 16 sesiones GA4; `altamonte springs pool remodeling company` @ 38,3 |

**Conflicto de mensaje, nombrado y resuelto por copy, no por slug:** los slugs dicen
`north-south-florida`, los anuncios prometen «North Florida». No se renombran (son URLs finales de
anuncios activos: una URL final que redirige es **rechazo de anuncio**). North Florida va primero
en `h1`, héroe y `<title>`; South Florida queda subordinado, en el cuerpo.

---

## 4 · Línea base de medición — lo que A2 tiene que arreglar

GA4, 90 días, `eventName`:

```
page_view        5.240      user_engagement  4.416      scroll           3.982
session_start    1.102      first_visit        934
lead_form_start     73  ←┐
form_start          72  ←┘  DOS eventos para lo mismo
form_submit         48
click               36      file_download       10
phone_click          2  ←   click-to-call prácticamente sin instrumentar
video_progress       4      video_complete       1      video_start       1
```

Tres cosas salen de ahí, y son exactamente las que la hoja 25 marca como bloqueantes:

1. **No existe un evento de conversión propio.** No hay `generate_lead` ni equivalente. Lo único
   parecido es `form_submit` (48), que es la medición automática de GA4 — se dispara en el submit
   del cliente, no tras validación en servidor. Un envío rechazado por el servidor cuenta igual.
2. **`lead_form_start` (73) y `form_start` (72) son el mismo hecho contado dos veces.** Es el doble
   conteo de la hoja 25, ya presente, medible y a la espera de contaminar el aprendizaje de
   Maximize Conversions.
3. **`phone_click` = 2 en 90 días.** Para un contratista cuyo canal principal es el teléfono, eso
   no es un dato de comportamiento: es una carencia de instrumentación.

Con `page_view` (5.240) y `scroll` (3.982) disponibles como eventos, la hoja 31 tiene razón en
marcarlo de impacto «Very High»: si alguno de los dos entra como conversión primaria, Maximize
Conversions quema $1.600/mes optimizando hacia ruido.

**Anotado de paso:** `/cascaron` aparece con 16 sesiones en GA4. Es una ruta de fixture
(`MM_FIXTURES=1`), no una de las 122. Está recibiendo tráfico real y midiéndolo.

---

## 5 · Prioridad de ejecución que sale de estos datos

1. **A1-A3, A5** — desbloquean $2.000/mes parados. Manda sobre lo orgánico.
2. **El cluster genérico sin dueño** (§1) — ~490 impresiones en posición 7-18 con CTR 0,025 %.
3. **Las dos consultas en forma de pregunta en posición 5,8 con 0 clics** (§2.3) — F4, y son la
   prueba barata de que la capa AEO funciona.
4. **Permisos y plazos** (§2.2) — donde ya se gana; tabla, lista numerada y `FAQPage`.
5. **El cluster de coste mal colocado** (§2.2) — reasignar al estimador.
6. **F6 por impresiones**, empezando por las 9 ciudades con volumen. Las demás esperan.

## 6 · Lo que queda fuera, y por qué

- **Tier 2 (mover 64 URLs): no se mueve.** Decidido. Ya tienen impresiones reales y 2 de ellas son
  URLs finales de anuncios activos.
- **Renombrar los slugs `north-south-florida`:** no. Ver §3.
- **Forzar la consolidación de las URLs viejas de redirect:** no está en nuestra mano. Se vigila.
- **`aggregateRating`:** pendiente de decisión, con recomendación escrita. «100+ reseñas de 5
  estrellas» está marcado DATA NOT AVAILABLE en la hoja 18 del libro de Ads, y el perfil real está
  en 4,1 sobre 13. Si el dato no lo sostiene, no se marca.
- **La cuenta de Google Ads:** no se toca. Ni crear, ni pausar, ni activar, ni pujas ni presupuestos.
