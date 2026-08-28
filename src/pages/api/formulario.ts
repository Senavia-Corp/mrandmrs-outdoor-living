/**
 * FASE 8 — el endpoint de los dos formularios.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `console.log` NO ES ENTREGA
 *
 * En Pergola Plus el endpoint hacía `ok = canales.log || …` y **`console.log` no falla
 * nunca**: el visitante veía «gracias» pasara lo que pasara con su lead, y el 500 era código
 * inalcanzable. Aquí `ok` es true **solo si el correo salió de verdad**. Si no hay credenciales
 * o el envío falla, esto devuelve error y el formulario enseña su estado de fallo.
 *
 * El acuse al visitante tampoco cuenta como entrega: que le llegue su confirmación mientras el
 * negocio no se entera es una mentira más educada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS CUATRO CAPAS ANTIBOT, EN ESTE ORDEN
 *
 *   1. **Honeypot `ref_id`** — descarta en silencio. NO se llama `company_url` ni nada que
 *      parezca un campo real: eso lo autorellenan los gestores de contraseñas y tira usuarios
 *      de verdad.
 *   2. **Time-trap a <1000 ms** — en silencio. No a 2500: ese umbral tiraba a quien usa
 *      autofill.
 *   3. **Turnstile en modo Managed** — la capa principal. Sin token, 403. Token válido, pasa.
 *      **Cloudflare inalcanzable, FALLA ABIERTO**: perder leads es peor que colar un bot.
 *   4. **Rate-limit por IP en memoria, 8 s.**
 *
 * La clave de sitio ya existe (`0x4AAAAAAAQTptj2So4dx43e`, la tenía el propio Webflow). La
 * SECRETA vive en `TURNSTILE_SECRET` y hay que sacarla del panel de Cloudflare del cliente.
 * Sin ella, esto NO valida y lo dice en el arranque.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * ⚠️ LOS SECRETOS SE LEEN DE `process.env`, NO DE `import.meta.env`. NO LO CAMBIES.
 *
 * Vite **sustituye `import.meta.env.X` en tiempo de BUILD**. Como al construir aquí no había
 * SMTP_USER ni SMTP_PASS, el empaquetador dedujo que `if (!usuario || !clave)` era siempre
 * cierto, dio por muerta la rama del envío y **la borró entera del bundle**: el chunk de esta
 * función acabó con un `return 500` a fuego y sin una sola mención a nodemailer.
 *
 * Es peor que un fallo normal, porque **poner las variables en Vercel después NO lo arregla**:
 * el código de enviar ya no existe en lo desplegado. Verificado leyendo el chunk construido.
 *
 * `process.env` se lee en EJECUCIÓN, así que el código sobrevive al build y las variables se
 * resuelven en el servidor, que es donde tienen que estar.
 */
const env = (k: string) => process.env[k] ?? '';
const DESTINO = env('LEAD_TO') || 'info@mrandmrsoutdoorliving.com';

/** Rate-limit en memoria. Se reinicia con la funcion; para 8 s de ventana da igual. */
const ultimaPorIp = new Map<string, number>();
const VENTANA_MS = 8000;

/** Los campos de cada formulario, con su etiqueta legible para el correo. */
const FORMULARIOS: Record<string, { titulo: string; campos: [string, string][] }> = {
  'Contact Page Form': {
    titulo: 'Contact form',
    campos: [
      ['First-Name', 'First name'], ['Last-Name', 'Last name'], ['Email', 'Email'],
      ['Phone-Number', 'Phone'], ['Project-Type', 'Project type'], ['Type', 'Type'],
      ['Message', 'Message'],
    ],
  },
  'Request Quote Form': {
    titulo: 'Request a quote',
    campos: [
      ['Full-Name', 'Full name'], ['email', 'Email'], ['Phone', 'Phone'],
      ['Street-Address', 'Street address'], ['City', 'City'], ['State', 'State'],
      ['ZIP-Code', 'ZIP code'], ['Estimated-Project-Budget', 'Budget'],
      ['checkbox', 'Services of interest'],
    ],
  },
  /**
   * FASE 12d — el cierre del estimador de piscinas.
   *
   * Antes, el paso 7 acababa en un enlace a `/request-estimated` que **se llevaba por delante
   * todo lo que el visitante acababa de configurar**: llegaba a un formulario en blanco y el
   * negocio no se enteraba ni de que había usado la calculadora. Ahora los datos se piden allí
   * mismo y el aviso sale con la estimación y las opciones elegidas.
   *
   * Los 13 campos de configuración van OCULTOS y los reescribe el propio estimador en cada
   * cambio, así que lo que llega es lo ÚLTIMO que se eligió. El orden de esta lista es el orden
   * del correo: primero con quién hay que hablar, después cuánto y de qué.
   *
   * ⚠️ Esto NO se cablea desde `build-paginas.mjs` como los otros dos. Aquel solo toca los
   * `<form>` que vienen del HTML de Webflow; éste lo escribe a mano
   * `src/components/widgets/Estimador.astro`, con su `data-mm-envia="1"` y su honeypot puestos
   * ahí. Lo que sí comparte es `Formularios.astro`: las cuatro capas antibot son las mismas.
   */
  'Pool Estimator Form': {
    titulo: 'Pool estimator lead',
    campos: [
      ['Full-Name', 'Full name'], ['email', 'Email'], ['Phone', 'Phone'],
      ['ZIP-Code', 'ZIP code'], ['Message', 'Message'],
      ['Estimate-Range', 'ESTIMATED RANGE'],
      ['Project-Type', 'Project type'], ['Pool-Size', 'Pool size'], ['Pool-Style', 'Pool style'],
      ['Interior-Finish', 'Interior finish'], ['Deck-Size', 'Deck size'],
      ['Deck-Material', 'Deck material'], ['Spa', 'Spa'], ['Systems', 'Systems'],
      ['LED-Lights', 'LED lights'], ['Outdoor-Add-Ons', 'Outdoor add-ons'],
      ['Site-Conditions', 'Site conditions'], ['Cost-Breakdown', 'Cost breakdown'],
    ],
  },
};

const responde = (estado: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json' } });

async function validaTurnstile(token: string | null, ip: string): Promise<'ok' | 'sin-token' | 'invalido'> {
  const secreta = env('TURNSTILE_SECRET');
  if (!secreta) return 'ok';                 // sin secreta configurada no se puede validar
  if (!token) return 'sin-token';
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secreta, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json();
    return j.success ? 'ok' : 'invalido';
  } catch {
    // Cloudflare inalcanzable: FALLA ABIERTO. Perder leads es peor que colar un bot.
    return 'ok';
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida';

  const datos = await request.formData().catch(() => null);
  if (!datos) return responde(400, { ok: false, error: 'cuerpo ilegible' });

  // 1 · honeypot: se descarta EN SILENCIO (200), para que el bot no aprenda
  if (String(datos.get('ref_id') ?? '').trim()) return responde(200, { ok: true });

  // 2 · time-trap: idem
  const transcurrido = Number(datos.get('elapsedMs') ?? 0);
  if (!Number.isFinite(transcurrido) || transcurrido < 1000) return responde(200, { ok: true });

  // 3 · Turnstile
  const veredicto = await validaTurnstile(String(datos.get('turnstileToken') ?? '') || null, ip);
  if (veredicto !== 'ok') return responde(403, { ok: false, error: 'verificacion fallida' });

  // 4 · rate-limit por IP
  const ahora = Date.now();
  const previo = ultimaPorIp.get(ip) ?? 0;
  if (ahora - previo < VENTANA_MS) return responde(429, { ok: false, error: 'demasiado rapido' });
  ultimaPorIp.set(ip, ahora);

  const nombreForm = String(datos.get('__form') ?? '');
  const def = FORMULARIOS[nombreForm];
  if (!def) return responde(400, { ok: false, error: 'formulario desconocido' });

  // Validacion en SERVIDOR. La del navegador es comodidad, no seguridad.
  const correo = String(datos.get('Email') ?? datos.get('email') ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo)) {
    return responde(400, { ok: false, error: 'correo no valido' });
  }

  const lineas: string[] = [];
  for (const [campo, etiqueta] of def.campos) {
    const valores = datos.getAll(campo).map((v) => String(v).trim()).filter(Boolean);
    if (valores.length) lineas.push(`${etiqueta}: ${valores.join(', ')}`);
  }
  if (!lineas.length) return responde(400, { ok: false, error: 'formulario vacio' });

  const cuerpo = [
    `${def.titulo} — mrandmrsoutdoorliving.com`, '',
    ...lineas, '',
    `IP: ${ip}`,
    `Recibido: ${new Date().toISOString()}`,
  ].join('\n');

  // ── el envio. `ok` solo es true si esto SALE. ──────────────────────────
  const usuario = env('SMTP_USER');
  const clave = env('SMTP_PASS');
  if (!usuario || !clave) {
    console.error('[formulario] faltan SMTP_USER / SMTP_PASS: el lead NO se ha entregado', { lineas });
    return responde(500, { ok: false, error: 'el correo no esta configurado' });
  }

  try {
    // Especificador LITERAL, nunca en variable: el rastreador del adaptador de Vercel no ve un
    // import dinamico con la ruta en una variable, no lo empaqueta, y el envio revienta en
    // produccion con `Cannot find module`. Como el envio suele ir en try/catch, el sintoma es
    // «el lead se guarda y el aviso nunca llega».
    const { default: nodemailer } = await import('nodemailer');
    const t = nodemailer.createTransport({
      host: env('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(env('SMTP_PORT') || 465),
      secure: true,
      auth: { user: usuario, pass: clave },
    });
    const info = await t.sendMail({
      from: `"Mr & Mrs Outdoor Living" <${usuario}>`,
      to: DESTINO,
      replyTo: correo,
      subject: `${def.titulo} — ${String(datos.get('First-Name') ?? datos.get('Full-Name') ?? correo)}`,
      text: cuerpo,
    });
    // Si el servidor rechaza al destinatario, esto NO es una entrega.
    if (!info.accepted?.length) {
      console.error('[formulario] el servidor no acepto ningun destinatario', info);
      return responde(502, { ok: false, error: 'el correo no fue aceptado' });
    }
    return responde(200, { ok: true });
  } catch (e) {
    console.error('[formulario] fallo el envio, el lead NO se ha entregado:', e);
    return responde(502, { ok: false, error: 'fallo el envio' });
  }
};
