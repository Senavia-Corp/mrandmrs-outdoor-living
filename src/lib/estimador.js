/**
 * EL MODELO DEL ESTIMADOR. Función pura, sin DOM, sin red.
 *
 * La usan dos sitios y tiene que ser UNO SOLO:
 *   · `src/components/widgets/Estimador.astro` — lo que ve el visitante;
 *   · `scripts/check-estimador.mjs`            — la puerta que lo compara con el oráculo.
 * Dos copias que empiezan iguales dejan de serlo al primer arreglo que solo se aplica en un
 * lado, y el síntoma sería un precio distinto en pantalla y en la puerta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALEN ESTOS NÚMEROS
 *
 * Del bundle original (`_source/estimator/PoolEstimatorPage.Cy-Yd7Xu.js`, byte ~190.100), que
 * está minificado pero NO ofuscado: el objeto de precios y la fórmula sobreviven literales.
 * Y verificados contra los 384 casos MEDIDOS del oráculo en `_source/estimator-casos.json`.
 * Si una lectura del código y una medición se contradijeran, manda la medición.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DOS INCOHERENCIAS DEL ORIGINAL QUE SE REPLICAN A PROPÓSITO
 *
 * 1. **El HOA cuenta distinto en el total y en el desglose.** El total hace
 *    `(… + hoa) × recargo`; la línea «Site Conditions» hace `(…) × (recargo − 1) + hoa`. O sea
 *    que los 1500 $ del HOA salen multiplicados por el recargo en el total y sin multiplicar en
 *    el desglose. Con «Tight Access» y «Rock Excavation» marcados son 300 $ de diferencia.
 * 2. **En «Pool & Patio Remodel» el ×0,82 se aplica al total y NO a las líneas del desglose**,
 *    así que las líneas no suman el total.
 *
 * NO SE ARREGLAN. Cambiar un precio sin que lo apruebe el cliente es cambiarle el negocio.
 * Están anotadas en «Mejoras candidatas NO aplicadas» de `MIGRACION-LOG.md`.
 */

/** Los precios, tal cual están en el bundle. Este objeto es LA tabla de precios del negocio. */
export const PRECIOS = {
  baseRatePerSqft: { standard: 85, freeform: 110, luxury: 145 },
  finishMultiplier: { plaster: 1, pebble: 1.15, premium: 1.35 },
  deckingPerSqft: { concrete: 12, pavers: 22, travertine: 35 },
  spa: { none: 0, integrated: 12000, spillover: 18000 },
  equipment: { heater: 4500, saltSystem: 2200, automation: 3500, ledPerLight: 450 },
  outdoor: { pergola: 8500, louveredRoof: 18000, screenEnclosure: 15000, outdoorKitchen: 25000, landscaping: 8000 },
  siteConditions: { tightAccess: 0.08, rockExcavation: 0.12, hoaApproval: 1500 },
  /** Permisos e ingeniería: 9 % de (piscina + deck). No estaba en la tabla del original: iba
   *  suelto en la fórmula. Aquí se nombra para que se pueda cambiar sin leer código. */
  permisos: 0.09,
  /** Una reforma sale al 82 % de lo que costaría de obra nueva. */
  descuentoRemodel: 0.82,
  /** El rango que se enseña es ±10 % del total, redondeado al millar. */
  banda: 0.1,
};

/** El estado inicial: los `useState` del componente original, uno a uno. */
export const POR_DEFECTO = {
  proyecto: 'new',        // new | remodel
  tamano: 450,            // sqft de piscina   250–900, paso 25
  estilo: 'freeform',     // standard | freeform | luxury
  acabado: 'pebble',      // plaster | pebble | premium
  deck: 600,              // sqft de deck      200–1500, paso 50
  material: 'pavers',     // concrete | pavers | travertine
  spa: 'none',            // none | integrated | spillover
  calefaccion: true,
  sal: true,
  automatizacion: false,
  luces: 3,               // 0–12, paso 1
  pergola: false,
  techoLamas: false,
  mosquitera: false,
  cocina: false,
  jardineria: true,
  accesoLimitado: false,
  roca: false,
  hoa: false,
};

/** Los límites de los tres sliders, en un solo sitio: los usan el marcado y la validación. */
export const SLIDERS = {
  tamano: { min: 250, max: 900, step: 25 },
  deck: { min: 200, max: 1500, step: 50 },
  luces: { min: 0, max: 12, step: 1 },
};

/** `$83,000`. Es el mismo `Intl.NumberFormat` del original, incluidos los 0 decimales. */
export const dolares = (n) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(n);

/** El separador del rango es un GUION LARGO con espacios, como en el original. */
export const rangoTexto = (min, max) => `${dolares(min)} – ${dolares(max)}`;

export const subtitulo = (proyecto) => (proyecto === 'new' ? 'Custom Pool Construction' : 'Pool & Patio Remodel');

/**
 * @param {typeof POR_DEFECTO} e
 * @returns {{min:number, max:number, total:number, desglose:Record<string,number>}}
 */
export function calcula(e) {
  const P = PRECIOS;
  const piscina = e.tamano * P.baseRatePerSqft[e.estilo] * P.finishMultiplier[e.acabado];
  const deck = e.deck * P.deckingPerSqft[e.material];
  const spa = P.spa[e.spa];

  const equipo = (e.calefaccion ? P.equipment.heater : 0)
    + (e.sal ? P.equipment.saltSystem : 0)
    + (e.automatizacion ? P.equipment.automation : 0)
    + e.luces * P.equipment.ledPerLight;

  const exterior = (e.pergola ? P.outdoor.pergola : 0)
    + (e.techoLamas ? P.outdoor.louveredRoof : 0)
    + (e.mosquitera ? P.outdoor.screenEnclosure : 0)
    + (e.cocina ? P.outdoor.outdoorKitchen : 0)
    + (e.jardineria ? P.outdoor.landscaping : 0);

  const permisos = (piscina + deck) * P.permisos;

  const recargo = 1 + (e.accesoLimitado ? P.siteConditions.tightAccess : 0)
    + (e.roca ? P.siteConditions.rockExcavation : 0);
  const hoa = e.hoa ? P.siteConditions.hoaApproval : 0;

  // Ver la nota 1 de la cabecera: el `hoa` va SUMADO aquí y MULTIPLICADO en el total.
  const condiciones = (piscina + deck + spa + equipo + exterior + permisos) * (recargo - 1) + hoa;

  let total = (piscina + deck + spa + equipo + exterior + permisos + hoa) * recargo;
  if (e.proyecto === 'remodel') total *= P.descuentoRemodel;   // nota 2: solo al total

  const almillar = (x) => Math.round(x / 1000) * 1000;
  return {
    total,
    min: almillar(total * (1 - P.banda)),
    max: almillar(total * (1 + P.banda)),
    desglose: {
      piscina: Math.round(piscina),
      deck: Math.round(deck),
      spa,
      equipo: Math.round(equipo),
      exterior,
      permisos: Math.round(permisos),
      condiciones: Math.round(condiciones),
    },
  };
}

/**
 * Las etiquetas del desglose, en el orden en que se pintan, y cuáles se ESCONDEN a cero.
 * Piscina, deck y permisos salen siempre; las otras cuatro solo si son > 0. Es lo que hace el
 * original y lo que espera el oráculo.
 */
export const LINEAS_DESGLOSE = [
  ['piscina', 'Pool Structure', false],
  ['deck', 'Decking', false],
  ['spa', 'Spa', true],
  ['equipo', 'Equipment & Systems', true],
  ['exterior', 'Outdoor Features', true],
  ['permisos', 'Permits & Engineering', false],
  ['condiciones', 'Site Conditions', true],
];
