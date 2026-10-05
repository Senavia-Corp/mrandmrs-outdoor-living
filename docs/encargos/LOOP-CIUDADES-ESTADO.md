# LOOP-CIUDADES — estado

> Lo lee cada iteración del loop «Páginas de SEO local por servicio y ciudad». Una iteración =
> UN paso: leer esto, hacer el siguiente pendiente, actualizar esto, terminar. El estado vive
> aquí, no en el chat.

## Estado

| Campo | Valor |
|---|---|
| fase | **2 — lotes por servicio** (Fase 0 y Fase 1 cerradas) |
| paso | Lote 1 (pool-remodeling North) → PR → merge → verificacion |
| lote siguiente | Lote 1: pool-remodeling North (las 19 restantes con hecho local verificable) |
| iteraciones sin avanzar | 0 |
| ultima iteracion | 5-oct-2026, sobre `origin/main` 9824a43 |
| rama | `claude/hopeful-brown-9anqr6` |
| modo | AUTOMATICO desde el 5-oct-2026: Sebastian pidio por `/goal` «terminar todo en automatico, tomar las decisiones que mejor convengan al proyecto y desplegar a produccion por partes». Por eso no hay PARADA 1 ni PARADA 2 esperando: las decisiones D1-D5 se tomaron abajo y el piloto sale a produccion como primer lote. |

## Decisiones tomadas (5-oct-2026, en automatico por el `/goal` de Sebastian)

- **D1 — condado.** Se verifica en cada lote con fuente oficial y se anota con URL y fecha SOLO en
  las filas nuevas (`ciudades-servicios-filas.json > ciudades`). Las 51 filas de pool-builders no
  se tocan. Dossier por ciudad en `docs/encargos/loop-ciudades/dossier-*.json` (53 lugares).
- **D2 — fotos.** Se aplican las dos condiciones: paginas <= fotos libres y >= 15 para los huecos.
  El generador PARA si un servicio declara mas paginas que `fotosLibres`.
- **D3 — louvered-roofs.** 8 de North + 8 de South, las mayores de cada region: es un producto con
  mercado en las dos y en Broward la HVHZ es un hecho local real.
- **D4 — steel-buildings-pole-barns: FUERA entero.** No consta licencia CGC/CBC en el repo y la
  plantilla promete permisos. Reversible si Sebastian aporta la licencia.
- **D5 — heroe.** Se conserva el video de fondo: es el reel del sitio (`bg-video`, el mismo de la
  home y de 65 rutas), no un video de piscina. Cero diseno nuevo.
- **D6 — seccion 3D.** Igual en todas: «3D Pool Design & Visualization» es una capacidad publicada
  de la empresa (unico servicio con 3D en las fichas: pool-builders). No se inventa 3D para otros.
- **D7 — red.** El egress de este contenedor bloquea produccion, las webs oficiales, Sanity y
  vercel.com. Las fuentes se buscan por WebSearch (fragmentos de dominios oficiales) y NO se puede
  comprobar que respondan 200: queda dicho en cada lote como NO VERIFICADO. Produccion se verifica
  por el estado de Vercel en GitHub, no abriendo URLs.

**Matriz resultante: 202 paginas en 6 servicios** (pool-remodeling 32, pergola-builders 53,
outdoor-kitchens 33, louvered-roofs 16, deck-builders 45, landscaping 23). 7 servicios fuera:
6 por fotos y steel-buildings por licencia (D4).

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

## Matriz (decidida el 5-oct-2026, ver «Decisiones tomadas»)

| # | Servicio | Tope (fotos) | **Páginas** | North | South | Motivo / gancho previsto |
|---|---|---|---|---|---|---|
| 1 | pool-remodeling | 32 | **32** | 20 | 12 | Tope = fotos. Galería casi toda de obra/antes (2 terminadas libres): coherente con remodelación, que la mire Sebastian. Gancho: permiso de reforma y barrera (F.S. 515) según la oficina local. |
| 2 | pool-screen-enclosures | 1 | **0** | – | – | **EXCLUIDA**: 1 foto, en obra. Menos fotos que páginas y que huecos. |
| 3 | pergola-builders | 66 | **53** | 20 | 33 | Todas. Gancho: oficina de permisos, viento (HVHZ en Broward) y CCCL en costa. |
| 4 | outdoor-kitchens | 33 | **33** | 20 | 13 | Gancho: permisos de gas, eléctrico y fontanería; gas natural o LP según la red local. |
| 5 | louvered-roofs | 16 | **16** | 8 | 8 | 16 ≥ 15, justo. Las 8 mayores de cada region (D3). |
| 6 | patio-screen-rooms | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos. |
| 7 | deck-builders | 45 | **45** | 20 | 25 | Fuera, como reservas, las 8 South más pequeñas. Gancho: permiso de deck y CCCL. |
| 8 | landscaping | 23 | **23** | 20 | 3 | Gancho: distrito de agua y ordenanzas de riego y fertilizante. |
| 9 | retractable-screens | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. |
| 10 | soffit-led-lighting | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. Además no consta licencia eléctrica. |
| 11 | irrigation-systems | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos reales; las 51 del banco son stock. |
| 12 | outdoor-furniture | 0 | **0** | – | – | **EXCLUIDA**: 0 fotos como protagonista. Además es producto: no hay permiso ni norma local verdadera que decir. |
| 13 | steel-buildings-pole-barns | 31 | **0** | – | – | **EXCLUIDA por D4**: no consta licencia CGC/CBC. |

**Total: 202 paginas en 6 servicios** (tras D3/D4). 7 servicios excluidos.

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
| Gainesville (`gainesville-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Ocala (`ocala-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Lake City (`lake-city-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Palatka (`palatka-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Alachua (`alachua-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Newberry (`newberry-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| High Springs (`high-springs-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Williston (`williston-fl`) | N | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Chiefland (`chiefland-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Trenton (`trenton-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Cross City (`cross-city-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Hawthorne (`hawthorne-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Archer (`archer-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Fanning Springs (`fanning-springs-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Waldo (`waldo-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Cedar Key (`cedar-key-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Micanopy (`micanopy-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Reddick (`reddick-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| McIntosh (`mcintosh-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Old Town (`old-town-fl`) | N | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Fort Lauderdale (`fort-lauderdale-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Pembroke Pines (`pembroke-pines-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Hollywood (`hollywood-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | ✔ | ✖f | ✖f | ✖f | ✖f | ✖l |
| Miramar (`miramar-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| West Palm Beach (`west-palm-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Pompano Beach (`pompano-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Davie (`davie-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Boca Raton (`boca-raton-fl`) | S | ✔ | ✖f | ✔ | ✔ | ✔ | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Plantation (`plantation-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Deerfield Beach (`deerfield-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Boynton Beach (`boynton-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Delray Beach (`delray-beach-fl`) | S | ✔ | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Weston (`weston-fl`) | S | R | ✖f | ✔ | ✔ | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Wellington (`wellington-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Jupiter (`jupiter-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Palm Beach Gardens (`palm-beach-gardens-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Hallandale Beach (`hallandale-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Royal Palm Beach (`royal-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Parkland (`parkland-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Dania Beach (`dania-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| North Palm Beach (`north-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Wilton Manors (`wilton-manors-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Lighthouse Point (`lighthouse-point-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Southwest Ranches (`southwest-ranches-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Tequesta (`tequesta-fl`) | S | R | ✖f | ✔ | R | R | ✖f | ✔ | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Juno Beach (`juno-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Hypoluxo (`hypoluxo-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Atlantis (`atlantis-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Hillsboro Beach (`hillsboro-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Ocean Ridge (`ocean-ridge-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| South Palm Beach (`south-palm-beach-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Gulf Stream (`gulf-stream-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| Manalapan (`manalapan-fl`) | S | R | ✖f | ✔ | R | R | ✖f | R | R | ✖f | ✖f | ✖f | ✖f | ✖l |
| **✔ / R / ✖** | | 32/21/0 | 0/0/53 | 53/0/0 | 33/20/0 | 16/37/0 | 0/0/53 | 45/8/0 | 23/30/0 | 0/0/53 | 0/0/53 | 0/0/53 | 0/0/53 | 0/0/53 |


✖l = excluida por licencia (D4).

### Orden de lotes (2 por servicio: North y después South)

| Fase | Servicio | Lote North | Lote South |
|---|---|---|---|
| 1 | piloto | `/services/pool-remodeling/gainesville-fl` | – |
| 2 | pool-remodeling | 20 | 12 |
| 3 | pergola-builders | 20 | 33 |
| 4 | outdoor-kitchens | 20 | 13 |
| 5 | louvered-roofs | 8 | 8 |
| 6 | deck-builders | 20 | 25 |
| 7 | landscaping | 20 | 3 |

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

## FASE 1 — fontaneria (cerrada el 5-oct-2026)

- `src/components/PaginaCiudad.astro`: el cuerpo de `pool-builders/[slug].astro`, movido sin cambiar
  una linea de lo que pinta. Lo que cambia por servicio vive en `src/lib/servicios-ciudad.mjs`.
- `src/pages/services/[servicio]/[ciudad].astro`: la ruta de los demas servicios, desde el repo.
- `scripts/build-ciudades-servicios.mjs` (`npm run ciudades:servicios`, `--check` dentro de
  `check:captacion`): de `src/data/ciudades-servicios-filas.json` a `ciudades-servicios.json`, a
  `captacion-servicios.json`, a `galeria-obra-por-ruta.json` (`servicio:<s>`) y a `usada_en`.
- Enlazado: `CiudadesServicio.astro` en las 14 fichas, detras de «Where We Serve» (no pinta nada
  si la ficha no tiene ciudades; regla anadida en `build-paginas.mjs`). La landing enlaza a su
  ficha, a su condado y a las hermanas de la misma ciudad (linea bajo la FAQ).
- Sitemap, llms.txt, `rutas-propias.mjs`, `check-medicion.mjs` y `check-texto.mjs` DERIVAN las
  rutas nuevas de `ciudades-servicios.json` (mismo patron que blog y galerias).
- `scripts/check-ciudades-servicios.mjs` (`npm run check:ciudades-servicios`): la puerta de las
  rutas sin referencia (texto declarado, SEO on/tecnico, enlazado, unicidad). Umbral de unicidad:
  **60 palabras propias** entre dos paginas del mismo servicio (justificado en su cabecera).
- **Prueba de no regresion: diff del HTML construido = 0** en las 53 de pool-builders (ocala-fl,
  boca-raton-fl y archer-fl comprobadas una a una) y en las 169 rutas existentes salvo
  `/services/pool-remodeling` (la linea de ciudades, declarada). Build `MM_SANITY_CACHE=1
  PUBLIC_ES_PRODUCCION=1` contra el de `main` 9824a43.

## Lote 0 — piloto `/services/pool-remodeling/gainesville-fl` (5-oct-2026)

**Rutas publicadas:** 1. **Excluidas:** ninguna en este lote.

**Puertas** (build `MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1`, salida literal):

```
check:tokens                 exit 0  PUERTA VERDE
check:rutas                  exit 0  PUERTA VERDE
check:enlaces                exit 0  PUERTA VERDE
check:seo                    exit 0  PUERTA VERDE
check:captacion              exit 0  PUERTA VERDE
check:estructura:ciudades    exit 0  PUERTA VERDE — dos formas y solo dos
check:medicion               exit 0  PUERTA VERDE
check:ciudades-servicios     exit 0  PUERTA VERDE
check:redirects              exit 0  PUERTA VERDE
check:estructura             exit 0  PUERTA VERDE — 14 fichas, un solo orden (+ 2 variante(s) declarada(s))
check:galeria-obra           exit 0  PUERTA VERDE — un set, las 53 ciudades, obra real trazada
check:identidad              exit 0  PUERTA VERDE
check:ads                    exit 0  PUERTA VERDE
check:menu                   exit 0  PUERTA VERDE
check:galeria                exit 0  PUERTA VERDE
```

- `check-texto '=/services/pool-remodeling'`: `1 identicas · 0 en rojo (1/1 rutas medidas)` (la
  linea nueva, declarada en `LINEAS_ANADIDAS`).
- `check-texto` sobre `gainesville-fl` y `archer-fl` de pool-builders: ROJO «linea 19: orden
  cambiado» en las dos. **PREEXISTENTE**: su HTML es identico byte a byte al de `main` 9824a43
  (viene del reordenado ORDEN-CIUDADES #46). No es de este lote.
- `check-visual` (4 anchos) sobre la ficha y las 2 ciudades: ROJO en las tres, **PREEXISTENTE**.
  Medido con un build de `main` en worktree aparte: la ficha ya daba -21/-14/+105/+5 px; con el
  lote, -12/-5/+112/+12 (la linea de ciudades, +7..+9 px). Las ciudades, identicas a `main`.
  Re-baselinizar es de Sebastian.
- **La ruta nueva NO tiene referencia**: `check-texto`/`check-visual` se la saltan (0/0 medidas) y
  eso NO es verde. La cubre `check:ciudades-servicios` (texto declarado: 32 piezas presentes).
- **Revision independiente:** 1a pasada RECHAZADA (2 afirmaciones de la FAQ local mas anchas que
  su fuente: atribuia el formulario de la Safety Act a la ciudad y decia que una reforma se revisa
  contra checklists de piscina nueva). Corregido. 2a pasada APROBADA.
- **NO verificado:** que las 2 `fuentes[].url` respondan 200 (egress bloqueado, D7); son las mismas
  URLs que ya publica `/services/pool-builders/gainesville-fl`.

**Fotos consumidas (pool-remodeling):** 15 del banco (intro bi-0614/bi-0519/bi-0617, inversion
bi-0616, galeria bi-0072/0547/0515/0664/0665/0071/0528/0530/0090/0679/0613). Libres que cuenta el
tope: 32 (el tope es por pagina y las fotos se comparten entre las ciudades del servicio, como en
pool-builders). Ninguna presentada como hecha en la ciudad.

## Lote 1 — pool-remodeling North (5-oct-2026)

**Cambio de metodo (D8).** El presupuesto de busquedas web de la sesion (200) se agoto en la ronda 2
de investigacion: no se puede verificar nada nuevo en esta sesion. Las paginas salen SOLO de lo que
ya esta en los dossiers (`docs/encargos/loop-ciudades/dossier-*.json` y `hechos2-*.json`). La FAQ
local se compone: parrafo de la ciudad (`ciudades.<slug>.local`) + hecho del servicio
(`extras.<tema>`) + hecho de condado (`regional`) + cierre de la ficha. Una combinacion entra si
su texto local propio llega a 60 palabras (mismo umbral de la Fase 1). Criterio de redaccion tras
la revision independiente: cada frase sale de un fragmento `evidencia`; las notas del
investigador (`oficina`, `hecho`, `dudas`) no son evidencia.

**Rutas publicadas (4):** /services/pool-remodeling/{ocala-fl, palatka-fl, cedar-key-fl, mcintosh-fl}.

**Excluidas en North (texto local propio < 60 palabras con lo verificado):** Lake City 27, Alachua 58,
Newberry 33, High Springs 37, Williston 36, Chiefland 44, Fanning Springs 40, Micanopy 56.
**Sin oficina de permisos verificada (fuera de toda la matriz):** Trenton, Cross City, Hawthorne,
Archer, Waldo, Reddick, Old Town.

**Puertas** (build `MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1`):

```
rutas existentes con HTML distinto al de main 9824a43: 1 -> services/pool-remodeling/index.html
diff=0 /services/pool-builders/ocala-fl
diff=0 /services/pool-builders/boca-raton-fl
diff=0 /services/pool-builders/archer-fl
check:tokens                 exit 0  PUERTA VERDE
check:rutas                  exit 0  PUERTA VERDE
check:enlaces                exit 0  PUERTA VERDE
check:seo                    exit 0  PUERTA VERDE
check:captacion              exit 0  PUERTA VERDE
check:estructura:ciudades    exit 0  PUERTA VERDE — dos formas y solo dos
check:medicion               exit 0  PUERTA VERDE
check:ciudades-servicios     exit 0  PUERTA VERDE
check:redirects              exit 0  PUERTA VERDE
check:estructura             exit 0  PUERTA VERDE — 14 fichas, un solo orden (+ 2 variante(s) declarada(s))
check:galeria-obra           exit 0  PUERTA VERDE — un set, las 53 ciudades, obra real trazada
check:identidad              exit 0  PUERTA VERDE
check:ads                    exit 0  PUERTA VERDE
check:menu                   exit 0  PUERTA VERDE
check:galeria                exit 0  PUERTA VERDE
check-texto =/services/pool-remodeling exit 0   1 identicas · 0 en rojo   (1/1 rutas medidas)
```

- Rutas nuevas sin referencia: cubiertas por `check:ciudades-servicios` (verde), NO por
  `check-texto`/`check-visual` (0/0 medidas: no es verde).
- Revision independiente: 1a pasada RECHAZADA (Lake City: direccion y competencia del condado sin
  fragmento; Micanopy: dos clausulas editoriales; Cedar Key/Ocala: detalles fuera del fragmento).
  Reescritos los 46 parrafos con el criterio estricto. 2a pasada APROBADA.
- NO verificado: las URL de `fuentes` (egress, D7).

**Fotos:** las mismas 15 del servicio (compartidas, como en pool-builders); `usada_en` actualizado.
Libres que quedan en `remodeling`: 32 − 15 = 17 sin otra ruta.

## Rutas hechas

| Ruta | Lote | PR | Produccion |
|---|---|---|---|
| /services/pool-remodeling/gainesville-fl | 0 | [#47](https://github.com/Senavia-Corp/mrandmrs-outdoor-living/pull/47) fusionado (f57ba48) | Vercel `success`, deployment 6871587096 (2026-10-05T23:17Z). URL no abierta: egress (D7) |
| /services/pool-remodeling/ocala-fl | 1 | (pendiente) | (pendiente) |
| /services/pool-remodeling/palatka-fl | 1 | (pendiente) | (pendiente) |
| /services/pool-remodeling/cedar-key-fl | 1 | (pendiente) | (pendiente) |
| /services/pool-remodeling/mcintosh-fl | 1 | (pendiente) | (pendiente) |

## Bloqueos y avisos

- Egress (D7): sin red a produccion ni a fuentes oficiales desde el contenedor.
- `npm run check:*` con navegador necesita `PLAYWRIGHT_BROWSERS_PATH` apuntando a un alias de
  chromium 1194 como 1234 (el contenedor trae 1194 y el repo pide 1234) y `xvfb-run` para
  `check-texto`/`check-visual` (`headless:false`).
- La memoria «worktree-fuera-de-tmp» no existe en este contenedor; se trabaja en la rama asignada.
