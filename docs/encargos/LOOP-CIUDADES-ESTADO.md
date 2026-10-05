# LOOP-CIUDADES — estado

> Lo lee cada iteración del loop «Páginas de SEO local por servicio y ciudad». Una iteración =
> UN paso: leer esto, hacer el siguiente pendiente, actualizar esto, terminar. El estado vive
> aquí, no en el chat.

## Estado

| Campo | Valor |
|---|---|
| fase | **0 — Matriz** |
| paso | **PARADA 1: matriz propuesta, espera aprobación de Sebastian** |
| lote | – |
| siguiente paso | Con la matriz aprobada (y las decisiones D1–D5 contestadas): FASE 1, fontanería + piloto `/services/pool-remodeling/gainesville-fl` |
| iteraciones sin avanzar | 0 |
| última iteración | 5-oct-2026, Fase 0, sobre `origin/main` 9824a43 |
| rama | `claude/hopeful-brown-9anqr6` (solo este fichero) |

## Punto de partida verificado (5-oct-2026, `origin/main` 9824a43)

- **14 fichas** en `src/pages/services/*.astro`, **53 ciudades** en `src/data/ciudades-captacion.json`
  (20 North, 33 South) y **9 condados** en `src/lib/negocio.mjs:30` (7 North, 2 South). Confirmado.
- **Las rutas de ciudad son `/services/pool-builders/<ciudad>-fl`.** El slug de Sanity es
  `<ciudad>-florida` y lo traduce `rutaCiudad` (`src/lib/rutas-seo.mjs:50`). Ojo con
  `beach-florida`: es Hillsboro Beach, con ruta `hillsboro-beach-fl`.
- **51 de 53 ciudades no tienen condado.** Llevan `_sin_condado`: «el copy se escribe sin condado
  hasta que Sebastian aporte el mapa verificado». Solo Ocala→Marion y Gainesville→Alachua lo
  tienen. **No hay en el repo ningún mapa ciudad→condado verificado.**
- **Hechos locales con fuente oficial: solo 2**, los `faqExtra` de Ocala y Gainesville
  (permisos de piscina, comprobados el 4-oct-2026). Para los otros 13 servicios no hay ninguno.
  Las líneas sobre la HVHZ de Broward de las fichas
  (`captacion-servicios.json:1011,1340,1498,2572`) no citan URL.
- **El copy por ciudad de pool-builders sale de Sanity**: `h1Title`, `h2Title`, `intro`, `seo.title`
  y `seo.description`, con 2 y 8 plantillas. Se lee de `_type=="poolBuilder"` en
  `[slug].astro:70`, con la cache `src/data/pool-builders-sanity.json`. Hay que tener en cuenta
  dos cosas:
  - Está prohibido escribir en Sanity, así que los servicios nuevos necesitan esos campos en un
    fichero del repo.
  - Ocala y Gainesville los pisan con `seo-pool-builders.json > bloques` y `meta-propia.json`.
- **Ninguna foto de una página de ciudad es propia de esa ciudad.** De unas 77 fotos, solo varía
  `fotos.inversion`, y es 1 de 3 según la región. Las 16 del banco son las mismas en las 53.
  Los huecos que serían del servicio son:
  - 3 de `fotos.intro` (`trusted-section`);
  - 11 de `GaleriaObra` (`galeria-obra-por-ruta.json > _defecto`);
  - 1 de `inversion`.

  En total, **15 por servicio**, compartidas entre sus ciudades.
- **Región**: las 13 fichas dicen «North & South Florida» (`captacion-servicios.json`,
  `heroe.apoyo` de cada ficha). Las 13 URLs heredadas de Webflow eran `…-north-south-florida`. Nada
  en el repo limita un servicio a una región. El tráfico de pago y los anuncios van primero a
  North (`docs/encargos/SEO-AEO-GEO-PLAN.md:148-151`).
- **Licencias** (`src/lib/identidad.mjs:12-22`): constan CPC1461119 y CPC1460562 (piscinas,
  verificadas) y SCC131153553, sin verificar y de clase contradictoria («Structural» en /about,
  «aluminum contractor» en la ficha de pérgolas). No consta CGC/CBC ni licencia eléctrica.
- **Enlazado actual**:
  - `/services/pool-builders` no enlaza a ninguna ciudad (`pool-builders.astro:13`, div
    `w-dyn-list` vacío);
  - los 9 condados enlazan sus 53 ciudades con listas estáticas de Webflow;
  - el pie solo enlaza Gainesville y Ocala (`src/lib/pie.mjs:17-23`).

## Banco: fotos reales libres por servicio

Criterio de «libre»: `estado` empieza por `aprobada`, `procedencia == "obra_real"`, servicio
protagonista (`servicios[0]`) y `usada_en` vacío.

| Servicio (ficha) | Clave banco | Protagonista | **Libres** | Terminado | Construcción | Antes | Obras libres |
|---|---|---|---|---|---|---|---|
| pool-remodeling | `remodeling` | 47 | **32** | 2 | 25 | 5 | 7 |
| pool-screen-enclosures | `enclosures` | 1 | **1** | 0 | 1 | 0 | 1 |
| pergola-builders | `pergolas` | 122 | **66** | 56 | 8 | 2 | 23 |
| outdoor-kitchens | `kitchens` | 60 | **33** | 13 | 17 | 3 | 12 |
| louvered-roofs | `louvered` | 43 | **16** | 8 | 8 | 0 | 6 |
| patio-screen-rooms | `rooms` | 0 | **0** | 0 | 0 | 0 | 0 |
| deck-builders | `decks` | 64 | **45** | 25 | 17 | 3 | 20 |
| landscaping | `landscaping` | 37 | **23** | 17 | 4 | 2 | 10 |
| retractable-screens | `screens` | 0 | **0** | 0 | 0 | 0 | 0 |
| soffit-led-lighting | `lighting` | 0 | **0** | 0 | 0 | 0 | 0 |
| irrigation-systems | `irrigation` | 0 | **0** | 0 | 0 | 0 | 0 |
| outdoor-furniture | `furniture` | 0 | **0** | 0 | 0 | 0 | 0 |
| steel-buildings-pole-barns | `pole` | 39 | **31** | 10 | 21 | 0 | 9 |

Notas sobre el banco:
- `lighting` y `furniture` solo salen como servicio secundario (13 y 7 libres).
- Las 51 de `irrigation` son stock rechazado.
- `region` vale `desconocida` en 1.126 de 1.269, así que ninguna foto se puede atribuir a una
  ciudad.
- Hay 39 `dudosa` de `louvered` pendientes de adjudicar. Si Sebastian las aprueba, el tope de
  louvered sube.

Reproducir:

```bash
node -e '
const b=require("./src/data/banco-imagenes.json");
const ok=x=>String(x.estado).startsWith("aprobada")&&x.procedencia==="obra_real";
for(const s of ["remodeling","enclosures","pergolas","kitchens","louvered","rooms","decks","landscaping","screens","lighting","irrigation","furniture","pole"]){
 const p=b.filter(x=>ok(x)&&x.servicios[0]===s), l=p.filter(x=>!(x.usada_en||[]).length);
 const by=e=>l.filter(x=>x.etapa===e).length;
 console.log(s,"prot",p.length,"libres",l.length,"term",by("terminado"),"constr",by("construccion"),"antes",by("antes"))}'
```

## Criterio de la matriz

1. **Hueco**: el diseño exacto pide 15 fotos propias del servicio. Por debajo de 15 libres, el
   servicio no se hace.
2. **Línea roja del loop**: un servicio no puede tener más páginas que fotos reales libres.
   El tope de páginas es su número de libres.
3. **Algo verdadero y específico por ciudad.** Aquí solo se PREVÉ el gancho local. Se verifica en
   cada lote con URL oficial y fecha, como el `faqExtra`. Los ganchos previstos:
   - qué oficina revisa el permiso (ciudad, condado o proveedor contratado);
   - la HVHZ de Broward (FBC cap. 16 y aprobación de producto);
   - la CCCL de FDEP en los municipios con frente de playa;
   - el distrito de agua (SRWMD, SJRWMD, SWFWMD o SFWMD) y las ordenanzas de riego y fertilizante;
   - la exención agrícola (F.S. 604.50) para graneros;
   - el gas natural frente al LP en cocinas.

   **Una ciudad cuyo hecho no se pueda verificar en su lote se excluye entonces** y entra la
   siguiente reserva (R).
4. **Orden dentro del tope**: primero las 20 de North, por el tráfico de pago y porque ya hay
   datos verificados allí. Después South, por población (orden aproximado, Census 2020; se
   verifica en el lote y solo sirve para ordenar, no se publica).
   - North: Gainesville, Ocala, Lake City, Palatka, Alachua, Newberry, High Springs, Williston,
     Chiefland, Trenton, Cross City, Hawthorne, Archer, Fanning Springs, Waldo, Cedar Key,
     Micanopy, Reddick, McIntosh, Old Town.
   - South: Fort Lauderdale, Pembroke Pines, Hollywood, Miramar, West Palm Beach, Pompano Beach,
     Davie, Boca Raton, Plantation, Deerfield Beach, Boynton Beach, Delray Beach, Weston,
     Wellington, Jupiter, Palm Beach Gardens, Hallandale Beach, Royal Palm Beach, Parkland, Dania
     Beach, North Palm Beach, Wilton Manors, Lighthouse Point, Southwest Ranches, Tequesta, Juno
     Beach, Hypoluxo, Atlantis, Hillsboro Beach, Ocean Ridge, South Palm Beach, Gulf Stream,
     Manalapan.

## Matriz propuesta (PENDIENTE DE APROBACIÓN)

| # | Servicio | Tope (fotos) | **Páginas** | North | South | Motivo / gancho previsto |
|---|---|---|---|---|---|---|
| 1 | pool-remodeling | 32 | **32** | 20 | 12 | Tope = fotos. Galería casi toda de obra/antes (2 terminadas libres): coherente con remodelación, que la mire Sebastian. Gancho: permiso de reforma y barrera (F.S. 515) según la oficina local. |
| 2 | pool-screen-enclosures | 1 | **0** | – | – | **EXCLUIDA**: 1 foto, en obra. Menos fotos que páginas y que huecos. |
| 3 | pergola-builders | 66 | **53** | 20 | 33 | Todas. Gancho: oficina de permisos, viento (HVHZ en Broward) y CCCL en costa. |
| 4 | outdoor-kitchens | 33 | **33** | 20 | 13 | Gancho: permisos de gas, eléctrico y fontanería; gas natural o LP según la red local. |
| 5 | louvered-roofs | 16 | **16** | 16 | 0 | 16 ≥ 15, justo. Las 16 mayores de North. Alternativa en D3. |
| 6 | patio-screen-rooms | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos. |
| 7 | deck-builders | 45 | **45** | 20 | 25 | Fuera, como reservas, las 8 South más pequeñas. Gancho: permiso de deck y CCCL. |
| 8 | landscaping | 23 | **23** | 20 | 3 | Gancho: distrito de agua y ordenanzas de riego y fertilizante. |
| 9 | retractable-screens | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. |
| 10 | soffit-led-lighting | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. Además no consta licencia eléctrica. |
| 11 | irrigation-systems | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos reales; las 51 del banco son stock. |
| 12 | outdoor-furniture | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. Además es producto: no hay permiso ni norma local verdadera que decir. |
| 13 | steel-buildings-pole-barns | 31 | **23** | 20 | 3 | South solo Davie, Wellington y Southwest Ranches (rural/ecuestre, a verificar). El resto de South queda ✖: no hay hecho agrícola o rural que afirmar. **Condicional a D4.** |

**Total: 225 páginas en 7 servicios.** 6 servicios excluidos.

### Rejilla completa

Leyenda:
- ✔ propuesta;
- R reserva (entra solo si cae una ✔ del mismo servicio y región, y sin pasar el tope);
- ✖f excluida por fotos;
- ✖r excluida porque no hay nada verdadero y específico que decir.

Columnas, en el orden del loop:
rem = pool-remodeling · enc = pool-screen-enclosures · per = pergola-builders ·
kit = outdoor-kitchens · lou = louvered-roofs · roo = patio-screen-rooms · dek = deck-builders ·
lan = landscaping · scr = retractable-screens · led = soffit-led-lighting · irr = irrigation-systems ·
fur = outdoor-furniture · pol = steel-buildings-pole-barns.

La ruta nueva sería `/services/<servicio>/<ciudad>-fl`, con el mismo slug que pool-builders.

| Ciudad (ruta pool-builders) | Reg. | rem | enc | per | kit | lou | roo | dek | lan | scr | led | irr | fur | pol |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Gainesville (`gainesville-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Ocala (`ocala-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Lake City (`lake-city-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Palatka (`palatka-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Alachua (`alachua-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Newberry (`newberry-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| High Springs (`high-springs-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Williston (`williston-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Chiefland (`chiefland-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Trenton (`trenton-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Cross City (`cross-city-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Hawthorne (`hawthorne-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Archer (`archer-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Fanning Springs (`fanning-springs-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Waldo (`waldo-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Cedar Key (`cedar-key-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Micanopy (`micanopy-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Reddick (`reddick-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| McIntosh (`mcintosh-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Old Town (`old-town-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✔ |
| Fort Lauderdale (`fort-lauderdale-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖r |
| Pembroke Pines (`pembroke-pines-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖r |
| Hollywood (`hollywood-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖r |
| Miramar (`miramar-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| West Palm Beach (`west-palm-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Pompano Beach (`pompano-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Davie (`davie-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✔ |
| Boca Raton (`boca-raton-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Plantation (`plantation-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Deerfield Beach (`deerfield-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Boynton Beach (`boynton-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Delray Beach (`delray-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Weston (`weston-fl`) | S | R | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Wellington (`wellington-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✔ |
| Jupiter (`jupiter-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Palm Beach Gardens (`palm-beach-gardens-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Hallandale Beach (`hallandale-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Royal Palm Beach (`royal-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Parkland (`parkland-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Dania Beach (`dania-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| North Palm Beach (`north-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Wilton Manors (`wilton-manors-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Lighthouse Point (`lighthouse-point-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Southwest Ranches (`southwest-ranches-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✔ |
| Tequesta (`tequesta-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Juno Beach (`juno-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Hypoluxo (`hypoluxo-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Atlantis (`atlantis-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Hillsboro Beach (`hillsboro-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Ocean Ridge (`ocean-ridge-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| South Palm Beach (`south-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Gulf Stream (`gulf-stream-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| Manalapan (`manalapan-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖r |
| **✔ / R / ✖** | | 32/21/0 | 0/0/53 | 53/0/0 | 33/20/0 | 16/37/0 | 0/0/53 | 45/8/0 | 23/30/0 | 0/0/53 | 0/0/53 | 0/0/53 | 0/0/53 | 23/0/30 |


### Orden de lotes (2 por servicio: North y después South)

| Fase | Servicio | Lote North | Lote South |
|---|---|---|---|
| 1 | piloto | `/services/pool-remodeling/gainesville-fl` | – |
| 2 | pool-remodeling | 20 | 12 |
| 3 | pergola-builders | 20 | 33 |
| 4 | outdoor-kitchens | 20 | 13 |
| 5 | louvered-roofs | 16 | 0 (o 8 + 8, según D3) |
| 6 | deck-builders | 20 | 25 |
| 7 | landscaping | 20 | 3 |
| 8 | steel-buildings-pole-barns | 20 | 3 (si D4) |

## Decisiones pendientes para la PARADA 1 (con propuesta por defecto)

- **D1 — Mapa ciudad→condado.** Sin condado no hay enlace al condado ni oficina de permisos que
  nombrar. **Propuesta**: verificar el condado de cada ciudad en su lote con fuente oficial (web
  del municipio o del condado) y anotarlo con URL y fecha **solo en las filas nuevas**. Las 51
  filas de pool-builders no se tocan, por la línea roja de «no se toca el texto de rutas
  existentes».
- **D2 — Lectura de la regla de fotos.** Aplico las dos condiciones: páginas ≤ fotos libres, y al
  menos 15 libres para llenar los huecos. Si solo vale la segunda, porque las fotos se comparten
  entre las ciudades de un servicio igual que en pool-builders, remodeling, kitchens, decks y
  landscaping suben a 53.
- **D3 — louvered-roofs.** Propuesta: las 16 mayores de North. Alternativa: 8 de North y 8 de
  Broward, donde la HVHZ es el gancho más fuerte.
- **D4 — steel-buildings-pole-barns.** No consta licencia CGC/CBC. **Propuesta**: el servicio
  entra solo si Sebastian confirma con qué licencia se tramita. Si no, ✖ entero y la página no
  dice que sacamos el permiso.
- **D5 — Héroe.** El héroe de las ciudades es el vídeo de piscina compartido. **Propuesta para los
  demás servicios**: el mismo componente, con `heroe.foto` de la ficha del servicio. No se diseña
  nada; se decide en Fase 1, con el piloto delante.

## Mapa para la FASE 1 (lo que hoy está a fuego para pool-builders)

- `src/pages/services/pool-builders/[slug].astro`:
  - `:38` y `:46`: importa `seo-pool-builders.json` y `plantilla-pool-builders.json`;
  - `:70`: lee `_type=="poolBuilder"` de Sanity;
  - `:85`: cache `pool-builders-sanity.json`;
  - `:123-124`: copy del carrusel «Featured Custom Pool Projects»;
  - `:134`: comprueba que RUTA sea `/services/pool-builders/${slug}`;
  - `:313-314`: `Service.name` y `serviceType` de piscina;
  - `:483`: `ServiciosPorCategoria defecto="pool-spa"`.
- `scripts/build-captacion-ciudades.mjs`:
  - `:34`: `LINEA_PISCINA` y `DE_PISCINA`;
  - `:80-186`: todas las plantillas de copy;
  - `:204`: el borrado casa solo con `esCiudad`;
  - `:212`: `RUTAS_REALES` desde `seo-pool-builders.json`.
- `src/lib/rutas-seo.mjs:50-78`: `rutaCiudad` con caída a pool-builders, `BAJO_POOL_BUILDERS`,
  `esCiudad`, `esCondado`, `esLocal`, `PREFIJO_LOCAL` y `FICHA_POOL_BUILDERS`.
- `src/components/FormularioCore.astro:88,212`: checkbox oculto «New Pool and Spa Construction» y
  `PROYECTOS` de respaldo.
- `src/data/galeria-obra-por-ruta.json > _defecto`: «Custom Pool Project Gallery».
- `src/lib/miga-tramos.mjs:17-30`: `NOMBRE_TRAMO` necesita el slug de cada servicio.
- `scripts/build-seo-ficheros.mjs:48-60`: el sitemap toma las ciudades del `baseline/sitemap.xml`
  congelado, así que las nuevas van por `ADICIONES`. `llms.txt` cuenta `esCiudad` (`:258`).
- `scripts/check-estructura-ciudades.mjs:58-110`: `TODAS` desde `seo-pool-builders.json`, el 53
  escrito a fuego y los órdenes de sección escritos a mano.
- **Campos de Sanity** (`h1Title`, `h2Title`, `intro`, `bloques.*`, `seo.title`,
  `seo.description`): los servicios nuevos necesitan una fuente en el repo.
- **Prueba de no regresión**: diff = 0 del HTML construido en 3 ciudades de pool-builders.
  Propuesta: ocala-fl (con `faqExtra`), boca-raton-fl (South) y archer-fl (North sin condado).

## Rutas hechas

Ninguna.

## PR abiertos

Ninguno.

## Puertas corridas

| Fecha | Puerta | Salida |
|---|---|---|
| 5-oct-2026 | `npm run check:tokens` | `ok   la capa pesa 92.7 KB de 167 KB — 74.4 KB libres` · `PUERTA VERDE` |

Fase 0 no escribe páginas ni construye. Ninguna puerta de ruta corrió y no hay nada que medir;
**eso no es verde, es «no aplica»**.

## Bloqueos

- La memoria «worktree-fuera-de-tmp» (los tres symlinks del worktree) **no existe en este
  contenedor cloud**: `~/.claude/projects/.../memory` no está. Para la Fase 1 hace falta su
  contenido, o confirmar que basta con trabajar en la rama asignada a la sesión.
- La Fase 1 no empieza sin la aprobación de esta matriz (PARADA 1).
