/**
 * LAS RUTAS DE AUTORIA PROPIA, declaradas en un solo sitio.
 *
 * Todo este proyecto esta construido sobre una premisa: 115 rutas congeladas, medidas contra
 * el sitio de Webflow del que se migro. `_source/routes.csv` es ese inventario, y ademas es
 * DERIVADO —lo escribe `build-inventory.mjs:70` desde un array cableado—, asi que no es el
 * sitio donde apuntar una pagina que el origen nunca tuvo: se perderia a la primera
 * regeneracion, y encima pondria en rojo a las tres puertas que buscan su baseline.
 *
 * Aqui se declaran las rutas que hemos escrito NOSOTROS. No tienen origen contra el que
 * compararse, y esa es toda la diferencia.
 *
 * VA EN UN MODULO COMPARTIDO por el mismo motivo que `lib/contratos.mjs` y `lib/captura.mjs`:
 * lo leen TRES puertas, y tres copias empiezan iguales y dejan de serlo al primer arreglo que
 * solo se aplica en un lado. El sintoma seria una puerta que da por buena una ruta que otra
 * ni conoce.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUE HACE CADA PUERTA CON ESTAS RUTAS, Y POR QUE NO ES LO MISMO EN LAS TRES
 *
 *   check:rutas   deja de contarla como «de mas». Sin esto la puerta sale ROJA: barre
 *                 `.vercel/output/static` y marca como extra toda pagina que no este en el
 *                 CSV. Es el unico sitio donde la ruta nueva rompe algo por existir.
 *
 *   check:seo     la MIDE, pero contra si misma. Se salta la comparacion con
 *                 `baseline/seo.json` —no hay entrada, y no puede haberla— y le sigue
 *                 exigiendo lo que si es exigible: `<title>` y `meta description` no vacios,
 *                 y el bloque de canonica/noindex. Esa ultima parte es la que de verdad
 *                 importa: sin ella, la unica pagina del sitio sin vigilancia de indexacion
 *                 seria justo la nueva, que es la que puede colarse indexada desde una
 *                 preview.
 *
 *   check:visual  la ITERA, para que su contrato de `disenio/contratos.json` llegue a
 *                 ejecutarse. Sin esto la entrada del contrato es letra muerta: `check-visual`
 *                 recorre `routes.csv` y nunca la miraria. Con contrato `rediseno` y sin
 *                 referencia aprobada sale ROJA, que es lo correcto — obliga a aprobarla
 *                 mirandola en vez de dejarla pasar en silencio (PROMPT-REDISENO §2.1).
 *
 * QUE NO LA MIDE, Y NO ES UN DESCUIDO:
 *   check:texto     compara `innerText` contra `baseline/text/`, que sale del sitio vivo y NO
 *                   se re-baseliniza jamas (§1.1). Una ruta sin origen no tiene contra que
 *                   compararse: no hay medicion posible, no una medicion que se omite.
 *   check:assets    itera `_source/assets-manifest.json`, no el build.
 *   check:ix2       itera 11 arquetipos escritos a mano (`check-ix2.mjs:79-84`).
 *   check:baseline  audita el baseline de las 115, que es otra cosa.
 * Quien informe de una corrida tiene que DECIRLO. Una puerta que no corrio no es una puerta
 * verde: es la regla 7 de `~/Sites/CLAUDE.md`, y es como se cuela una regresion.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PARA AÑADIR UNA: una entrada aqui, con motivo, y una entrada en `disenio/contratos.json`
 * con contrato `rediseno`. Lo segundo no es opcional — sin contrato, `check:visual` la trata
 * como `paridad`, no encuentra referencia y la SALTA EN SILENCIO.
 */

/** Ruta -> por que existe. El motivo no es adorno: es lo que hace auditable la excepcion. */
export const RUTAS_PROPIAS = {
  '/financing': 'Escrita el 2-sep-2026. El nav mandaba a Acorn Finance con `target="_blank"` '
    + 'desde las 115 rutas: cada clic en «Financing» salia del sitio antes de explicar nada. '
    + 'Esta pagina se pone en medio y el enlace externo se queda solo en su CTA.',
};

/** `true` si la ruta la hemos escrito nosotros y no tiene origen en Webflow. */
export const esPropia = (ruta) => Object.hasOwn(RUTAS_PROPIAS, ruta);

/** El conjunto de rutas a medir: las del origen mas las propias, sin duplicados. */
export const conPropias = (rutas) => [...new Set([...rutas, ...Object.keys(RUTAS_PROPIAS)])];
