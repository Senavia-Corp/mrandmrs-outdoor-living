# ADENDA — Google Ads: que el sitio sostenga un Quality Score máximo

**Esto no sustituye a `PROMPT-SEO-AEO-GEO.md`: lo amplía.** Lee aquel entero primero — sus
principios, trampas, puertas y línea roja siguen mandando tal cual. Esta adenda añade un
frente que faltaba: **hay una campaña de Google Ads construida y pausada esperando al sitio.**

Fuente: `Mr_Mrs_Outdoor_Living_Google_Ads_FINAL_LAUNCH_MASTER_2026-09-07.xlsx` (32 hojas).
Cópialo a `docs/encargos/` antes de empezar; es la especificación, y no se improvisa sobre ella.

---

## 1 · La campaña, en diez líneas

```
New Pool Construction | North Florida   $1.600/mes  Maximize Conversions, sin tCPA
Complete Pool Remodeling | North Florida  $400/mes  Maximize Conversions, sin tCPA
Brand | North Florida                       PAUSADA  no lanzar sin evidencia
```

4 grupos activos tras el gate · **39 keywords** (30 Exact + 9 Phrase) · Search only ·
AI Max **OFF** · Search Partners **OFF** · Presence only · ZIPs de Gainesville, Ocala y
The Villages (32669, 32653, 32605, 32608, 32643, 34480, 34476, 34471, 34482, 32162).

**Las 4 landing pages de pago — y las 39 keywords caen todas en estas 4:**

| Grupo | URL | Arreglo exigido por la hoja 20/23 |
|---|---|---|
| Pool Builders Core (20 kw) | `/services/custom-pool-spa-builders-in-north-south-florida` | Quitar fuga de remodelación y servicios secundarios **above the fold** |
| Gainesville (5 kw) | `/pool-builders/gainesville-florida` | Héroe pool-first, prueba local |
| Ocala (5 kw) | `/pool-builders/ocala-florida` | Quitar distracción de pérgola / cocina exterior / comercial |
| Full Remodel (9 kw) | `/services/pool-remodeling-renovation-in-north-south-florida` | Posicionar **proyecto completo** primero |

Más `/contact-us` (formulario), y `/projects`, `/testimonials`, `/where-we-serve` como prueba
y destino de sitelinks. **Verificado: las 8 existen hoy.** `/thank-you` también existe, y va
`noindex` a propósito — está declarado en `NOINDEX_A_PROPOSITO`, y es exactamente lo que la
hoja 23 pide como «Dedicated Paid Thank-You Page». **No lo construyas de cero: úsalo.**

---

## 2 · Por qué esto es urgente: la campaña está bloqueada, y el bloqueo es el sitio

Hoja 26, *Final Readiness* — 89,6 global, con **5 categorías bloqueadas**. Cuatro de las cinco
las arregla este repo, no la cuenta de Ads:

```
Landing Pages ........... 76  BLOCKED  ← la nota más baja de todo el libro
Measurement ............. 78  BLOCKED
Conversion Strategy ..... 82  BLOCKED
Lead Quality Protection . 91  BLOCKED  (campos del formulario)
Assets .................. 86  PARTIAL
```

Traducido: **$2.000/mes están parados esperando a que el sitio esté listo.** Esa es la
prioridad de esta adenda sobre cualquier refinamiento de SEO orgánico del prompt anterior.

---

## 3 · Sobre el «10/10», una vez y sin rodeos

El Quality Score se compone de tres cosas: **Expected CTR**, **Ad Relevance** y **Landing Page
Experience**. El sitio gobierna la tercera por completo, la segunda a medias (por
correspondencia de mensaje entre anuncio y página) y la primera casi nada — depende del
histórico del anuncio, que hoy no existe.

Así que el objetivo real, y el que sí se puede exigir y medir, es:
**«Above average» en Landing Page Experience y en Ad Relevance en las 39 keywords.** Eso es lo
que empuja el QS a 8-10. Un 10/10 uniforme en las 39 no se promete: se acerca en las Exact de
marca y de intención estrecha, y se estabiliza solo después de semanas de datos. **No pongas
un 10/10 garantizado en ningún informe.** Deja el sitio de forma que, si el QS no sube, la
causa esté demostrablemente en la cuenta y no aquí.

---

## 4 · Conflictos con el prompt anterior — resueltos aquí, no en tiempo de ejecución

El prompt 1 reescribe copy y metas guiado por **datos orgánicos de GSC**. Esta adenda impone
copy guiado por **keywords de pago**. En 4 URLs concretas eso choca. Regla de precedencia,
y no se renegocia sobre la marcha:

| Elemento | En las 4 LPs de pago | En las otras 117 |
|---|---|---|
| `<h1>`, héroe, CTA principal, orden above-the-fold | **Manda la hoja 22 del libro de Ads** | Manda el prompt 1 (F8) |
| `<title>`, `meta description` | Reconcilia: la hoja 22 los propone y **también son buen SEO** — úsalos, y solo aparta si el dato de GSC demuestra pérdida | Manda el prompt 1 (F1) |
| Datos estructurados, FAQ, breadcrumbs, `sameAs` | Manda el prompt 1 (F3/F4) — **no estorban al QS, lo ayudan** | Igual |
| Contenido por debajo del pliegue | Prompt 1, siempre que no contradiga la promesa del anuncio | Igual |

Ejemplo concreto de la hoja 22, para que no lo inventes:

```
/services/custom-pool-spa-builders-in-north-south-florida
  Title  : Custom Pool Builders in North Florida | Mr & Mrs Outdoor Living
  H1     : Custom Pool Builders in North Florida
  Hero   : Custom inground pool construction from 3D design through final startup.
  CTA    : Request a Free Estimate
```

**Y el conflicto de fondo que hay que nombrar:** los slugs dicen `north-south-florida` y los
anuncios dicen «North Florida Pool Builder». Un anuncio que promete North Florida cayendo en
una página titulada «North & South Florida» **diluye la correspondencia de mensaje**, que es
justo lo que puntúa Ad Relevance. **No renombres los slugs** (el prompt 1 §F2 deja el Tier 2 a
decisión de Sebastian, y estas 2 URLs son URLs finales de anuncios activos: moverlas rompería
la campaña). La solución es de copy: **North Florida primero en `<h1>`, héroe y título; South
Florida presente pero subordinado**, en el cuerpo.

---

## 5 · Dos trampas nuevas, medidas hoy, que deciden cómo se implementa esto

### 5.1 · Gainesville y Ocala **no tienen contenido propio** — son 1 plantilla × 53 ciudades

`src/pages/pool-builders/[slug].astro` abre con, literalmente:

```
// DERIVADO - no editar a mano. Lo genera scripts/build-plantillas.mjs
```

El cuerpo de las 53 sale de `src/data/plantilla-pool-builders.json` — **una sola plantilla
compartida**. Lo único propio de cada ciudad en `src/data/seo-pool-builders.json` son dos
campos: `seo` y `ldCrudo`. **No hay mecanismo de override de contenido por ciudad.**

Consecuencia: «héroe pool-first para Gainesville» **no es un cambio de una página**. O tocas
las 53, o construyes el override. Además `npm run plantillas` **ya no puede re-derivar** (las
53 páginas de origen no existen desde la Fase 6b), así que todo cambio se mantiene a mano —
ya hay dos precedentes anotados en la cabecera del fichero (R11-BLOG-02 y R15-IG).

**Lo que hay que hacer, y en este orden:**

1. **Construye el mecanismo de override por ciudad** en `seo-pool-builders.json` (p. ej. un
   bloque `bloques` opcional que la plantilla consulte antes de caer al valor común).
   Documéntalo en la cabecera de `[slug].astro` como tercer cambio a mano deliberado.
2. **Aplícalo solo a Gainesville y Ocala.** Las otras 51 no reciben tráfico de pago; tocarlas
   es riesgo sin retorno y multiplica por 26 la superficie de las puertas.
3. El override se declara en `check:texto` acotado **a esas 2 rutas** (prompt 1 §3, caso 1 —
   son pocas, van con mecanismo de declaración, no con re-baseline).

Si al medir resulta que el mecanismo sale más caro que el beneficio, **dilo y propón la
alternativa**: campos `hero`/`h1` por ciudad rellenados solo en 2 y vacíos en 51. Lo que **no**
vale es editar `[slug].astro` a mano ignorando el aviso de la cabecera.

### 5.2 · La atribución **ya está capturada** — pero se va solo al correo, a propósito

Esto no está a cero como asume el checklist de la hoja 24. `src/components/Formularios.astro:324`
ya captura, con persistencia de primer toque (resuelve exactamente el problema de que el
`gclid` desaparece tras dos navegaciones):

```js
var CLAVES = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content',
              'gclid','fbclid','wbraid','gbraid'];
```

Pero la línea 128 dice, y va en mayúsculas en el código:

> 🚨 **VIAJA SOLO AL CORREO. Ni una de estas claves se acerca al dataLayer**

Fue una decisión de privacidad deliberada: `gclid` y el referrer serían identificadores en GA4.
**Y choca de frente** con lo que la hoja 25 marca como BLOCKING: persistir GCLID/GBRAID/WBRAID
hasta la conversión, y habilitar Enhanced Conversions for Leads.

**No lo cambies por tu cuenta.** Es decisión de Sebastian (§9). Prepara las dos ramas:

- **Si aprueba:** el `gclid` viaja al evento de conversión (no al `page_view`), con consentimiento
  y hash según exige Enhanced Conversions. Documenta el cambio en la misma cabecera que hoy
  dice lo contrario — **no dejes el código diciendo una cosa y haciendo otra**.
- **Si no aprueba:** la conversión se importa **offline desde el CRM** con el `gclid` que ya
  llega por correo (hoja 25, fila «Offline / Qualified Lead»). Es más lento pero funciona, y no
  toca la postura de privacidad. **Dilo así en el informe**, no como carencia.

---

## 6 · Fases nuevas — van DESPUÉS de la F3 del prompt 1, y antes de la F8

### A1 · Formulario cualificador (BLOCKING para la campaña)

Hoja 24. Cinco campos nuevos en el formulario de estimación, **todos obligatorios**:

```
ZIP Code          validación de 5 dígitos
Homeowner status  Yes / No / Other
Project Type      New Custom Pool / Complete Pool Remodel
Investment Range   por rangos, nunca campo libre
Timeline          por rangos predefinidos
```

«Detalles del proyecto» se queda **opcional** — no añadas fricción donde no hace falta.
`Project Type` debe **preseleccionarse** según la landing de entrada (Core/ciudad → New Custom
Pool; Remodel → Complete Pool Remodel): es un punto de conversión y de correspondencia de
mensaje a la vez.

La API es `src/pages/api/formulario.ts` y el aviso lo compone `src/lib/aviso-correo.ts` —
los campos nuevos tienen que llegar a los dos, y a la plantilla de correo, o el lead llega
mutilado. Hay puerta: `check:aviso` (`npm run check:aviso`).

### A2 · Evento de conversión único y sin duplicar (BLOCKING)

- **Un** evento de éxito por envío válido, disparado **solo tras validación en servidor**, no
  en el `submit` del cliente.
- **Sin doble conteo** entre la etiqueta de Ads y GA4 `form_submit` (hoja 25).
- Eventos secundarios en GA4: `form_start`, `click_to_call`. **Nunca** `page_view` ni `scroll`
  como primarios — la hoja 31 lo marca como el fallo de impacto «Very High»: Maximize
  Conversions aprendiendo de eventos basura quema $1.600/mes en semanas.
- Verifica extremo a extremo: envío real → evento en GA4 `properties/506563956` → conversión
  en Ads. `check:medicion` ya vigila que GTM esté presente y **no duplicado**; extiéndela para
  cubrir el evento de conversión.

### A3 · Limpieza de las 4 landing pages de pago

El arreglo exigido por URL está en la tabla del §1. Criterio, para las cuatro:

- **Above the fold responde a la promesa del anuncio y a nada más.** En Core: piscina nueva.
  En Ocala: piscina, no pérgola ni cocina exterior ni comercial. En Remodel: proyecto completo,
  no un servicio suelto de azulejo.
- Servicios secundarios **no desaparecen** — bajan. La regla del Principio 1 sigue viva: no se
  inventan secciones ni se borra contenido, **se reordena y se jerarquiza**.
- **Teléfono de North Florida, `+1 (352) 740-3361`**, es el que debe ver el tráfico de pago
  (hoja 24, «Click-to-call QA»). El sitio muestra los dos; en estas 4 rutas el de NF va primero.
- CTA fija móvil accesible **sin tapar contenido** — ojo, ya hay 80 px reservados para el botón
  flotante de llamada (commit `414108c`) y `check:visual` los tiene declarados. No los rompas.

### A4 · Correspondencia de mensaje anuncio → página

Extrae los titulares de la hoja 13 (RSA) y verifica que **cada tema aparece literalmente en su
landing**: «3D Design Preview», «Permits Managed for You», «Design to Final Startup»,
«Gunite & Concrete Pools», «Licensed Pool Contractors». Si un titular promete algo que la
página no dice, **una de las dos miente** — y la que se arregla es la página, salvo que la
afirmación no esté verificada (§7).

Prueba sitelinks, callouts y snippets estructurados (hojas 15-17): **cada URL de sitelink debe
devolver 200 y ser relevante a su texto**. Son 11. Añádelas a `check:enlaces` como conjunto
declarado, para que un renombrado futuro no rompa la campaña en silencio.

### A5 · Velocidad y móvil de las 4 (BLOCKING)

La hoja 24 lo marca bloqueante y la 31 le da impacto alto. El prompt 1 ya trae el Hallazgo 10
(LCP anómalo en `/services/*`, sospechoso del vídeo del héroe). **En estas 4 rutas la barra es
más alta que en el resto del sitio**: es tráfico pagado, mayoritariamente móvil, y el LCP entra
directo en Landing Page Experience. Mide con PageSpeed Insights **de campo si hay datos, y de
laboratorio móvil si no**, contra producción.

### A6 · Consentimiento

Copy de consentimiento SMS/email alineado con el proceso de seguimiento (hoja 24, con Legal).
Si se activan Enhanced Conversions (§5.2), el modo de consentimiento tiene que ser coherente
con lo que declare la política de privacidad — que ya existe en `/articles/privacy-policy`.

---

## 7 · Línea roja de las afirmaciones — se endurece

El prompt 1 §5 ya prohíbe inventar. La hoja 18 va más lejos y **lista lo que está prohibido
por nombre**. Esto vale igual para el copy de la web, no solo para los anuncios:

```
PROHIBIDO usar sin confirmación de Sebastian:
  · «$55K+» como umbral de piscina nueva      DATA NOT AVAILABLE
  · «$20K+» como umbral de remodelación       DATA NOT AVAILABLE
  · «100+ reseñas de 5 estrellas»             DATA NOT AVAILABLE
  · «$75K» como mínimo residencial            está en la web, pero NO es mínimo verificado

VERIFICAR antes de usar:
  · «Licensed & Insured»    → confirmar licencia vigente
  · «Family-Owned»          → solo mientras /about lo sostenga
  · «Financing available»   → confirmar términos vigentes

VERIFICADO, se puede usar:
  · 3D Design Preview · Permits Managed · Free Estimate · el teléfono de North Florida
```

Esto ata también el `aggregateRating` del prompt 1 §F3: «100+ reseñas de 5 estrellas» está
marcado **DATA NOT AVAILABLE** en el libro de Ads. Si `src/data/resenas.json` no sostiene la
cifra, no hay `aggregateRating`, y punto.

---

## 8 · Puertas y criterio de aceptación — lo que se añade

Además de las 15 del repo y del criterio del prompt 1:

- [ ] Las 4 LPs, `/contact-us`, `/thank-you` y las **11 URLs de sitelink** → 200, sin redirect
      intermedio. **Una URL final de anuncio que redirige es rechazo de anuncio**, no una
      molestia: verifícalas contra producción, no contra el build.
- [ ] Los 5 campos cualificadores presentes, validados y llegando al correo y al CRM.
- [ ] Un solo evento de conversión por envío. Probado extremo a extremo con un envío real.
- [ ] Cero doble conteo entre Ads y GA4 (`check:medicion` extendida).
- [ ] `Project Type` preseleccionado según la landing de entrada.
- [ ] Teléfono de North Florida primero en las 4 LPs, click-to-call probado en móvil real.
- [ ] Cada tema de los titulares RSA presente en su landing, o retirado del anuncio.
- [ ] CWV en verde **en móvil** en las 4, medido contra producción.
- [ ] Cero afirmaciones de la lista prohibida del §7 en las 121 páginas — **búscalas con grep,
      no de memoria**.
- [ ] Informe con las 5 categorías bloqueadas de la hoja 26 y qué las desbloquea, para que
      Sebastian pueda abrir el gate de lanzamiento con una decisión, no con una corazonada.

---

## 9 · Decisiones de Sebastian — se AÑADEN a las 7 del prompt 1, mismo momento

8. **`gclid` al dataLayer, ¿sí o no?** (§5.2). Es la que desbloquea Enhanced Conversions.
   Si no, se va a conversiones offline desde el CRM. **Explícale las dos, no le pidas que
   elija a ciegas.**
9. **Override por ciudad** (§5.1): ¿se construye el mecanismo, o Gainesville y Ocala se quedan
   con la plantilla común y se acepta la pérdida de relevancia local?
10. **Umbrales de inversión** ($55K nuevo / $20K remodelación): ¿se confirman como reales, se
    corrigen, o se retiran de todas partes?
11. **Licencia vigente y número**, para poder usar «Licensed & Insured» en web y anuncios.
12. **Recuento y plataforma de reseñas**, que decide si hay `aggregateRating` o no.
13. **Página de gracias de pago**: `/thank-you` existe y va `noindex`. ¿Se usa tal cual para
    la conversión determinista, o quiere una separada para pago?

---

## 10 · Lo que esta adenda NO autoriza

**No toques la cuenta de Google Ads.** Ni crear, ni pausar, ni activar, ni cambiar pujas,
presupuestos o keywords. El gate de lanzamiento lo abre Sebastian con su equipo de medios.
Este encargo deja el **sitio** listo y entrega el informe que dice qué queda desbloqueado.

Tampoco: crear cuentas o perfiles, tocar DNS, ni renombrar las URLs finales de los anuncios.
