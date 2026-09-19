# BRIEF — cómo se escribe un artículo de este blog

Lo lee quien redacta, antes de escribir. El artículo vive en `contenido/blog/<slug>.md` y de ahí
lo publica `scripts/publica-blog.mjs` a Sanity. El roadmap está en `contenido/roadmap-blog.json`.

## Quién publica esto

Mr & Mrs Outdoor Living, contratista **real** de North y South Florida: piscinas, remodelación,
pérgolas, techos de lamas, cocinas exteriores, mosquiteras, decks, jardinería, riego, naves
metálicas e iluminación. Obra propia, licencia propia. No es un blog de afiliados.

El lector típico es un propietario que está **a punto de gastar entre 40.000 y 200.000 $** y
quiere entender la decisión antes de pedir presupuesto. No busca inspiración: busca criterio.

## Las cinco reglas que no se negocian

1. **Answer-first.** Si el H1 pregunta, la respuesta va en el primer párrafo. No hay introducción
   de calentamiento. Lo primero que se lee es lo que se vino a buscar, y el resto lo matiza.
2. **Information gain.** Cada artículo tiene que decir algo que las diez primeras posiciones de
   Google **no** dicen: el número real, el orden en que se toman las decisiones, el fallo
   concreto que se ve en obra, la consecuencia de elegir mal. Un resumen de lo que ya está
   escrito no aporta nada y no se publica.
3. **Inglés americano profesional.** Frases cortas, voz activa, sin adjetivos de folleto. Nada de
   «stunning», «transform your oasis», «dream backyard», «nestled». Se escribe como habla un
   contratista bueno explicándoselo a un cliente: directo, concreto, sin vender.
4. **Nada inventado.** Ni cifras, ni marcas, ni normativas, ni plazos, ni personas. Si un dato no
   se puede sostener, se explica el **factor** en vez del número. Ver «cifras» más abajo.
5. **Sin padding.** La extensión la fija la pregunta: 1.200 palabras si se responde en 1.200,
   2.800 si hacen falta. Una sección que no cambia una decisión, sobra.

## Qué NO se escribe

- No hay autor con nombre: el editor es la empresa. Nada de «I've seen», «in my 20 years».
- No se prometen resultados («increase your home value by 15%»).
- No se habla de competidores.
- No se recontesta lo que ya responden las 53 páginas de ciudad ni las 9 de condado: **se
  enlazan**. Dos páginas con la misma respuesta es canibalización.
- No se repite la respuesta de otro artículo del roadmap. Si se roza, se enlaza y se sigue.
  Comprueba `contenido/roadmap-blog.json` y `contenido/blog/` antes de empezar.

## Las cifras de coste

Hay una tabla de precios **aprobada** que el sitio ya usa en su estimador
(`src/lib/estimador.js`, verificada contra 384 casos oráculo). Esas cifras **sí** se pueden citar:

    piscina        85 $/sqft standard · 110 freeform · 145 luxury
    acabado        ×1 plaster · ×1,15 pebble · ×1,35 premium
    deck           12 $/sqft hormigón · 22 adoquín · 35 travertino
    spa            12.000 $ integrado · 18.000 con vertedero
    equipo         calentador 4.500 · cloración salina 2.200 · automatización 3.500 · LED 450/ud
    exterior       pérgola 8.500 · techo de lamas 18.000 · mosquitera 15.000 · cocina 25.000 ·
                   jardinería 8.000
    obra           acceso difícil +8 % · excavación en roca +12 % · trámite HOA 1.500
    permisos       9 % de (piscina + deck)
    remodelación   82 % de lo que costaría de obra nueva
    horquilla      lo que se enseña es ±10 %

**Para todo lo demás no hay cifra.** Un deck de composite, una nave metálica o un riego
inteligente no están en esa tabla: se explican los factores que mueven el precio y se manda a
`/pool-cost-estimator` o `/request-estimated`. Una cifra inventada con dos decimales es peor que
no dar ninguna, porque el lector la va a usar para negociar.

Cuando cites una cifra, **di de dónde sale**: «our estimator prices integrated spas at $12,000».

## Permisos y código

Por **condado**, no por «Florida» a secas: el trámite de Alachua no es el de Broward. Si no
tienes la fuente oficial delante, describe el **proceso** (quién revisa, en qué orden, qué para
la obra) y no cites números de artículo ni plazos concretos. Lo que sí se puede decir siempre:
que la obra la permita y la inspeccione alguien con licencia, y que el propietario puede
comprobar la licencia en el registro público del estado.

Si citas una fuente oficial, va en `fuentes` del frontmatter con su URL real.

## Enlazado interno — ningún blog huérfano

Cada artículo enlaza, **en el cuerpo y con anchor descriptivo**:

- **su ficha de servicio** (obligatorio, al menos una vez);
- **2-3 artículos hermanos** del roadmap o de los 10 heredados;
- según la intención: `/pool-cost-estimator`, `/request-estimated`, `/gallery`, `/financing`,
  `/pool-investment-estimator`;
- si el artículo es local: `/pool-builders/gainesville-florida`, `/pool-builders/ocala-florida`,
  `/country/custom-pool-builders-alachua-county-fl`,
  `/country/custom-pool-builders-marion-county-fl`, `/where-we-serve/north-florida`.

Anchor descriptivo significa el texto que describe el destino, no «click here» ni el título
entero pegado. `check:enlaces` comprueba que la ruta existe: un slug inventado rompe el build.

**Las 14 fichas de servicio y los 10 artículos heredados están listados en
`contenido/roadmap-blog.json` y en Sanity.** No inventes rutas: cópialas.

## Las imágenes

Salen de `/gallery`, que son fotos de obra **real del cliente**. Se referencian por nombre:
`construction-7` = servicio `construction`, índice 7 en `src/data/gallery-procedencia.json`.

🚨 **El índice NO es el número del fichero, y van AL REVÉS.** `construction-0` es
`…-florida-10.jpg` y `construction-9` es `…-florida-01.jpg`. Un redactor ya escribió cuatro
`alt` correctos apuntando a cuatro fotos equivocadas por usar el número del fichero: el guarda
solo cazó el que se salía de rango, y los otros tres habrían publicado la foto de otro con el
texto de ésta. **Cuenta la posición dentro del array de `gallery-procedencia.json`, no leas el
nombre del fichero.**

**Solo valen las que tienen `"usable": true`.** El resto son generadas, de banco, o no son obra
suya — y el script se niega a publicarlas. Mira el JSON antes de elegir; ahí está el `altGaleria`
original de cada una, que dice qué se ve.

Se reutiliza la misma foto en varios artículos del mismo cluster: es lo decidido y está bien.

**El `alt` lo escribes tú y describe LO QUE SE VE EN LA FOTO**, no de qué va el artículo. Si la
foto es una piscina con spa elevado, el alt dice eso — aunque el artículo hable de permisos. Un
alt que describe el artículo en vez de la imagen es una mentira para quien no ve.

Una portada + 2 o 3 figuras repartidas por el cuerpo, donde de verdad ilustren algo.

## El Markdown que se admite

El conversor (`scripts/lib/markdown-a-portable.mjs`) **falla con el número de línea** ante
cualquier otra cosa. Admite exactamente:

    ## Sección          h2
    ### Subsección      h3
    #### Apartado       h4
    Un párrafo con **negrita**, *cursiva* y un [enlace](/services/slug).
    - viñeta
    1. numerada
    {{figura: construction-7}}
    | Factor | Por qué |
    |---|---|
    | A | B |

**No** hay `# h1` (el H1 es el título), **no** hay citas `>`, **no** hay `![imagen]()`, **no** hay
bloques de código. Un enlace tiene que empezar por `/` o por `http(s)://`.

Toda `{{figura: x}}` del cuerpo tiene que estar declarada en `figuras`, y toda declarada tiene
que usarse. Las dos cosas se comprueban.

## El frontmatter, campo a campo

```
---
{
  "slug": "igual-que-el-nombre-del-fichero",
  "title": "El H1. Puede ser largo: es el que trabaja para la búsqueda",
  "cardTitle": "El titular corto de la tarjeta. Máximo 70 caracteres",
  "categoria": "slug de blogCategory — sale del roadmap",
  "servicios": ["slug-del-servicio-primario", "otro-si-de-verdad-aplica"],
  "relacionados": ["slug-hermano-1", "slug-hermano-2", "slug-hermano-3"],
  "ordenEnServicio": 1,
  "ordenIndice": 21,
  "searchIntent": "informational | commercial | transactional | local",
  "funnelStage": "awareness | consideration | decision",
  "tags": ["opcional", "solo-si-aporta"],
  "seo": {
    "title": "≤ 60 caracteres, con la keyword delante",
    "description": "150-160 caracteres. ÚNICA en todo el sitio. Dice qué se va a saber al leerlo"
  },
  "summary": "La entradilla de la tarjeta. Se escribe para decidir si entrar, no para resumir",
  "portada": { "ref": "construction-9", "alt": "Lo que se ve en la foto" },
  "figuras": [
    { "ref": "construction-7", "alt": "Lo que se ve en esta otra" }
  ],
  "faq": [
    { "question": "Una pregunta real", "answer": "Dos o tres frases. Sin cifras inventadas." }
  ],
  "fuentes": []
}
---
```

`title`, `cardTitle`, `categoria`, `searchIntent`, `funnelStage` y `ordenIndice` **ya están
decididos en `contenido/roadmap-blog.json`**: cópialos de ahí, no los reinventes.

`ordenEnServicio` 1-3 solo si el roadmap marca ese artículo como uno de los tres de su ficha.

La `faq` se **pinta** en la página y además se emite como `FAQPage`: lo que pongas ahí lo ve
Google y lo ve el lector, y tiene que casar 1:1. 3-5 preguntas, las que de verdad se hacen.

## Cómo se comprueba antes de dar por hecho el artículo

```bash
node -e "import('./scripts/lib/articulo.mjs').then(m=>m.leeArticulo('contenido/blog/<slug>.md'))"
```

Si eso no lanza, el artículo está bien formado. Lo demás lo miden las puertas.
