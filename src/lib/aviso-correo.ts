/**
 * EL AVISO DE LEAD — texto plano y letterhead HTML, construidos del mismo material.
 *
 * 🚨 NO PUEDE VIVIR BAJO `src/pages/`. Astro convierte TODO `.ts` que cuelgue de `src/pages/`
 * en una ruta: `src/pages/api/lib/aviso-correo.ts` se publicaria como endpoint en
 * `/api/lib/aviso-correo`. Por eso esta aqui.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SE MANDAN LOS DOS CUERPOS, SIEMPRE
 *
 * El texto plano no es un resto historico: es accesibilidad (lectores de pantalla, relojes,
 * clientes en modo texto) y ademas los filtros antispam penalizan el correo solo-HTML. Si
 * algun dia alguien borra el `text:` de `formulario.ts`, el aviso empieza a caer en spam y el
 * sintoma —«ya no me llegan los leads»— no apunta a esta linea.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS REGLAS DURAS DEL HTML DE CORREO. El 90% de los fallos estan aqui.
 *
 *   · Maquetacion con <table> y CSS EN LINEA. Nada de flex, grid, <style> en el <head> ni
 *     clases: Gmail recorta lo que no entiende y lo hace en SILENCIO.
 *   · Ancho maximo 600 px, con width="100%" en la tabla exterior.
 *   · El logo es un PNG por URL ABSOLUTA (`scripts/build-logo-correo.mjs`). Nunca SVG —Gmail
 *     y Outlook no lo pintan—, nunca ruta relativa, nunca base64, nunca background-image
 *     —Outlook la ignora sin VML—.
 *   · `color-scheme: light` declarado. Gmail invierte colores en modo oscuro, asi que ningun
 *     dato depende de que un fondo blanco siga siendo blanco: el navy y el negro se leen
 *     igual invertidos.
 *   · EL CORREO SE ENTIENDE SIN UNA SOLA IMAGEN. Muchos clientes bloquean imagenes por
 *     defecto; el `alt` del logo es texto blanco sobre la celda navy y no se pierde nada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COLOR — los literales son OBLIGATORIOS aqui
 *
 * Un correo no puede usar `var(--mm-*)`: no hay hoja de estilos que cargar. Los valores son
 * los mismos de `src/styles/disenio/tokens.css` copiados a mano, con su ratio medido al lado.
 * `check:tokens` no alcanza este fichero (su ambito son `src/styles/**.css` y los bloques
 * `<style>` de componentes), asi que la disciplina la sostiene esta tabla.
 *
 * 🚨 EL ORO NUNCA ES TEXTO. #f4b248 da 1,86:1 sobre blanco. Aqui vive UNICAMENTE como la
 * banda de 4 px bajo la cabecera —un fondo sin nada escrito encima—. Medido, no se rediscute.
 */

/** Paleta, con el ratio medido de cada par que se usa de verdad. */
const C = {
  navy: '#001c63',      // --mm-navy      · sobre blanco 15,60:1 · sobre tenue 13,68:1
  negro: '#000000',     // --mm-negro     · sobre blanco 21,00:1 · sobre tenue 18,42:1
  suave: '#596b9a',     // --mm-tinta-suave · sobre blanco 5,26:1 · sobre tenue 4,61:1
  blanco: '#ffffff',    // --mm-blanco    · sobre navy 15,60:1
  tenue: '#edf0f8',     // --mm-azul-tenue
  borde: '#e0e4ec',     // --mm-borde
  oro: '#f4b248',       // --mm-oro       · SOLO como banda de fondo, jamas texto (1,86:1)
};

/** Mismo fallback, palabra por palabra, que `astro.config.mjs` y `build-seo-ficheros.mjs`. */
const SITIO = process.env.PUBLIC_SITE_URL || 'https://www.mrandmrsoutdoorliving.com';
const LOGO = `${SITIO}/images/site/logo-correo.png`;

/**
 * El nombre legible sale del id CORTO (`__form_id`), no del `data-name`. Los tres formularios
 * de «Request Quote Form» comparten `data-name` y solo la ruta los distingue: sin esto, el
 * lead del visor de la galeria y el de /request-estimated llegarian con el mismo titulo y
 * habria que mirar la ruta para saber cual es cual.
 */
const NOMBRES: Record<string, string> = {
  contact: 'Contact form',
  estimate: 'Estimate request',
  gallery: 'Gallery request',
  brochures: 'Brochure request',
  estimator: 'Pool estimator',
};

/** Los campos que se convierten en enlace, por NOMBRE de campo y no por etiqueta. */
const CAMPOS_CORREO = new Set(['Email', 'email']);
const CAMPOS_TEL = new Set(['Phone', 'Phone-Number']);

export interface CampoAviso { campo: string; etiqueta: string; valor: string }

export interface DatosAviso {
  /** id corto: contact | estimate | gallery | brochures | estimator */
  formId: string;
  /** Titulo de `FORMULARIOS`, de respaldo si el id corto no llega. */
  tituloRespaldo: string;
  campos: CampoAviso[];
  /** Ruta de la pagina donde se envio, p.ej. `/contact-us`. */
  ruta: string;
  /** Origen de primer toque ya filtrado por lista blanca. */
  origen: Record<string, string>;
  ip: string;
  fecha: Date;
}

const escapa = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * LA HORA DE FLORIDA, NO UTC.
 *
 * Antes esto era `new Date().toISOString()` —«2026-09-04T22:33:56.886Z»— y obligaba a un
 * contratista de Ocala a restar cuatro horas mentalmente para saber si su lead entro esta
 * tarde o anoche. `America/New_York` ademas resuelve solo el salto EDT/EST, que es justo lo
 * que un desfase fijo de -4 o -5 no hace.
 *
 * `formatToParts` y no `format()` a secas: el formato corto de en-US mete una coma antes de
 * la hora («Sep 4, 2026, 6:33 PM EDT») y aqui el separador es un punto medio.
 */
export function enHoraDeFlorida(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZoneName: 'short',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.year} · ${p.hour}:${p.minute} ${p.dayPeriod} ${p.timeZoneName}`;
}

/** `tel:` utilizable desde el movil: solo digitos, con +1 si venia sin prefijo de pais. */
function aTel(v: string): string {
  const d = v.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  const n = d.replace(/\D/g, '');
  return n.length === 10 ? `+1${n}` : `+${n}`;
}

/**
 * EL ORIGEN DEL LEAD, reducido a una linea que se entienda de un vistazo.
 *
 * Se distingue «capturamos y fue directo» de «no capturamos nada» (modo privado, o una sesion
 * anterior a que esto existiera). Son cosas distintas y confundirlas hace creer que el trafico
 * directo sube cuando lo que pasa es que la medicion se cayo.
 */
export function lineasDeOrigen(o: Record<string, string>): { titular: string; detalle: string[] } {
  const g = (k: string) => (o[k] || '').trim();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (!Object.keys(o).length) {
    return { titular: 'Not captured', detalle: ['No session data — private browsing, or the visit predates source tracking.'] };
  }

  let titular: string;
  if (g('utm_source')) {
    titular = cap(g('utm_source'))
      + (g('utm_medium') ? ` / ${g('utm_medium')}` : '')
      + (g('utm_campaign') ? ` · campaign "${g('utm_campaign')}"` : '');
  } else if (g('gclid') || g('wbraid') || g('gbraid')) {
    titular = 'Google Ads';
  } else if (g('fbclid')) {
    titular = 'Meta ads';
  } else if (g('referrer')) {
    titular = `Referral from ${g('referrer')}`;
  } else {
    titular = 'Direct';
  }

  const detalle: string[] = [];
  const extra = [['utm_term', 'Term'], ['utm_content', 'Content']] as const;
  for (const [k, etq] of extra) if (g(k)) detalle.push(`${etq}: ${g(k)}`);
  // Los identificadores de clic van enteros y en su propia linea: se pegan en Google Ads o en
  // el gestor de Meta para casar el lead con el anuncio que lo trajo.
  for (const k of ['gclid', 'wbraid', 'gbraid', 'fbclid']) if (g(k)) detalle.push(`${k}: ${g(k)}`);
  if (g('referrer') && g('utm_source')) detalle.push(`Referrer: ${g('referrer')}`);

  const pisada: string[] = [];
  if (g('landing_page')) pisada.push(`Landed on ${g('landing_page')}`);
  if (g('first_seen')) {
    const t = new Date(g('first_seen'));
    if (!Number.isNaN(t.getTime())) pisada.push(enHoraDeFlorida(t));
  }
  if (pisada.length) detalle.push(pisada.join(' · '));

  return { titular, detalle };
}

/** El asunto tiene que servir para TRIAR SIN ABRIR: que formulario y de donde es el lead. */
function construyeAsunto(d: DatosAviso, nombre: string): string {
  const v = (c: string) => (d.campos.find((x) => x.campo === c)?.valor || '').trim();
  // El formulario de contacto no pide ni ciudad ni ZIP: ahi el asunto se queda en dos partes,
  // que sigue siendo mas util que el «Contact form — Jane» de antes.
  const donde = [v('City'), v('ZIP-Code')].filter(Boolean).join(' ');
  return ['New lead', nombre, donde].filter(Boolean).join(' · ');
}

export function construyeAviso(d: DatosAviso): { asunto: string; texto: string; html: string } {
  const nombre = NOMBRES[d.formId] || d.tituloRespaldo;
  const cuando = enHoraDeFlorida(d.fecha);
  const url = `${SITIO}${d.ruta}`;
  const origen = lineasDeOrigen(d.origen);

  // ── TEXTO PLANO ────────────────────────────────────────────────────────────
  const texto = [
    `${nombre} — mrandmrsoutdoorliving.com`,
    cuando,
    `Page: ${url}`,
    '',
    `LEAD SOURCE: ${origen.titular}`,
    ...origen.detalle.map((l) => `  ${l}`),
    '',
    ...d.campos.map((c) => `${c.etiqueta}: ${c.valor}`),
    '',
    `IP: ${d.ip}`,
    'Reply to this email to answer the customer directly.',
  ].join('\n');

  // ── HTML ───────────────────────────────────────────────────────────────────
  const fuente = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";

  const filas = d.campos.map((c) => {
    let valor = escapa(c.valor);
    if (CAMPOS_CORREO.has(c.campo)) {
      valor = `<a href="mailto:${escapa(c.valor.trim())}" style="color:${C.navy};text-decoration:underline">${valor}</a>`;
    } else if (CAMPOS_TEL.has(c.campo)) {
      valor = `<a href="tel:${escapa(aTel(c.valor))}" style="color:${C.navy};text-decoration:underline">${valor}</a>`;
    }
    return `<tr>`
      + `<td style="padding:10px 16px 10px 0;vertical-align:top;font:600 12px/1.5 ${fuente};`
      // 🚨 NADA de `white-space:nowrap` en la etiqueta. Lo llevaba, y «SERVICES OF INTEREST»
      // fijaba un ancho minimo que la tabla no podia bajar: a 375 px el correo desbordaba
      // 27 px y aparecia scroll horizontal. En la captura de pagina completa NO se ve —el
      // lienzo se ensancha al contenido—, solo lo caza la sonda de desborde.
      + `color:${C.suave};text-transform:uppercase;letter-spacing:.04em">${escapa(c.etiqueta)}</td>`
      + `<td style="padding:10px 0;vertical-align:top;font:400 15px/1.55 ${fuente};color:${C.negro};`
      + `border-bottom:1px solid ${C.borde}">${valor}</td>`
      + `</tr>`;
  }).join('');

  // `break-word` y NO `break-all`: con `break-all` un gclid largo si cabia, pero la linea de
  // aterrizaje partia «Sep 4, 2026» por la mitad («Sep 4, 2 / 026») en 375 px. `break-word`
  // solo parte la palabra que no cabe entera, que es exactamente el gclid y nada mas.
  const detalleOrigen = origen.detalle.map((l) =>
    `<div style="font:400 13px/1.6 ${fuente};color:${C.suave};margin-top:2px;word-break:break-word;overflow-wrap:break-word">${escapa(l)}</div>`).join('');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapa(construyeAsunto(d, nombre))}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.tenue}">
<!-- Preencabezado: lo que Gmail ensena junto al asunto en la bandeja. Oculto en el cuerpo. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapa(`${origen.titular} · ${cuando}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.tenue}">
<tr><td align="center" style="padding:24px 12px">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.blanco};border-radius:8px;overflow:hidden">

  <!-- CABECERA. El bgcolor va tambien como atributo: Outlook ignora el background-color en
       linea de algunos <td>, y sin el el logo blanco caeria sobre blanco. -->
  <tr><td bgcolor="${C.navy}" align="center" style="background-color:${C.navy};padding:16px 24px">
    <!-- OJO: dentro de esta plantilla NO se pueden usar acentos graves ni en los comentarios;
         cierran el literal y el modulo deja de parsear.
         El ancho va como ATRIBUTO y no solo en el style: Outlook de escritorio ignora el CSS
         de tamano y pintaria el PNG a sus 480 px nativos, reventando el ancho de 600.
         🚨 Y NADA de atributo de alto. Con el, un cliente que bloquea imagenes —que son
         muchos, por defecto— reserva una caja de 103 px con el texto alternativo pegado
         arriba y una mancha navy vacia debajo. Sin el, la fila se encoge al alto del texto
         alternativo y el encabezado sigue teniendo sentido. Outlook escala por el ancho. -->
    <img src="${LOGO}" width="240" alt="Mr &amp; Mrs Outdoor Living"
         style="display:block;border:0;width:240px;max-width:100%;height:auto;color:${C.blanco};font:700 18px/1.4 ${fuente}">
  </td></tr>
  <!-- La banda de oro. Es lo UNICO oro del correo y no lleva texto encima: 1,86:1 sobre
       blanco lo descarta como tinta, pero como fondo de 4 px es la firma de la marca. -->
  <tr><td bgcolor="${C.oro}" style="background-color:${C.oro};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>

  <tr><td style="padding:28px 24px 8px">
    <div style="font:800 22px/1.3 ${fuente};color:${C.navy}">New lead</div>
    <div style="font:400 14px/1.6 ${fuente};color:${C.suave};padding-top:4px">${escapa(cuando)}</div>
    <div style="font:400 14px/1.6 ${fuente};color:${C.negro};padding-top:10px">
      <strong style="color:${C.navy}">${escapa(nombre)}</strong> &middot;
      <a href="${escapa(url)}" style="color:${C.navy};text-decoration:underline">${escapa(d.ruta)}</a>
    </div>
  </td></tr>

  <!-- ORIGEN DEL LEAD -->
  <tr><td style="padding:16px 24px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:${C.tenue};border-radius:6px">
      <tr><td style="padding:14px 16px">
        <div style="font:600 11px/1.4 ${fuente};color:${C.suave};text-transform:uppercase;letter-spacing:.08em">Lead source</div>
        <div style="font:600 15px/1.5 ${fuente};color:${C.navy};padding-top:4px">${escapa(origen.titular)}</div>
        ${detalleOrigen}
      </td></tr>
    </table>
  </td></tr>

  <!-- LOS DATOS. El orden es el de FORMULARIOS: primero con quien hay que hablar. -->
  <tr><td style="padding:20px 24px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filas}</table>
  </td></tr>

  <tr><td style="padding:18px 24px 28px">
    <div style="font:400 13px/1.6 ${fuente};color:${C.suave}">
      Hit <strong style="color:${C.navy}">Reply</strong> to answer this customer directly.
    </div>
    <div style="font:400 12px/1.6 ${fuente};color:${C.suave};padding-top:6px">IP ${escapa(d.ip)}</div>
  </td></tr>

</table>

</td></tr></table>
</body></html>`;

  return { asunto: construyeAsunto(d, nombre), texto, html };
}
