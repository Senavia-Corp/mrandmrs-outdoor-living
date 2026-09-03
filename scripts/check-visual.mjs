#!/usr/bin/env node
/**
 * PUERTA — diff de píxeles contra el baseline, en los 4 anchos.
 *
 *     npm run check:visual                  las 115 (unos 65 min, navegador con foco)
 *     npm run check:visual -- /about /gallery   solo las que casen
 *
 * Usa el MISMO congelado y la MISMA escala que produjo el baseline
 * (`scripts/lib/captura.mjs`). Si esto reimplementara la receta, la comparación dejaría de ser
 * de lo mismo contra lo mismo el día que una de las dos copias se arregle sola.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOBRE EL UMBRAL, QUE NO ES OBVIO
 *
 * En la Fase 4 se midió que «≥99 % de píxeles iguales» **no discrimina** sobre una banda casi
 * vacía: el nav con un enlace movido 6 px daba 99,33 % y pasaba. Sobre una PÁGINA ENTERA sí
 * discrimina —el contenido ocupa casi todo— pero el umbral hay que leerlo sabiendo eso: mide
 * bien un bloque que se mueve o una imagen que falta, y mide mal un detalle pequeño.
 *
 * La tolerancia POR PÍXEL es 0.3, no 0.1. Medido: el reescalado a 1/4 hace que una diferencia
 * de antialiasing de 1 px a tamaño completo se reparta entre los 16 que promedia cada píxel de
 * salida. Con 0.1, contenido IDÉNTICO daba 97,7 %; con 0.3 da 100 %.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DIFERENCIAS DECLARADAS
 *
 * La decisión D2 rehace los widgets de Elfsight en nativo, así que hay páginas donde el sitio
 * nuevo **tiene que verse distinto a propósito**. Se declaran UNA A UNA con su motivo; bajar el
 * umbral global convertiría la puerta en un número que ya no avisa de nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ANCHOS, ARGS_NAVEGADOR, aSlug, asentar, disparar, aJpeg } from './lib/captura.mjs';
import { leerContratos, contratoDe, redisenadas } from './lib/contratos.mjs';
import { conPropias } from './lib/rutas-propias.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const UMBRAL = 99;
const TOLERANCIA = 0.3;
/**
 * Tolerancia de ALTO, en pixeles del JPEG a 1/4 (o sea ~12 px reales). Medido: paginas
 * identicas salen con 1-3 px de diferencia por el redondeo de la captura a pagina completa.
 * Por encima de eso ya no es redondeo: es contenido que crece o encoge, y eso tiene que salir
 * en rojo. Nunca se convierte en porcentaje: un recorte silencioso haria que una pagina que
 * pierde una seccion entera puntuara bien en la parte que queda.
 */
const TOL_ALTO = 3;
/**
 * EL CONTRATO DE CADA RUTA (`disenio/contratos.json`). Decide una sola cosa, y es la que
 * arregla el fallo n.º 1 del Programa R: que hacer cuando FALTA la referencia. Ver mas abajo.
 */
const CONTRATOS = leerContratos();


/**
 * FILTRO POSICIONAL. Cada argumento es una SUBCADENA de la ruta, salvo que empiece por `=`,
 * que entonces es coincidencia EXACTA.
 *
 * El `=` existe por una razon concreta: la home es `/`, y `/` como subcadena casa las 115
 * rutas. O sea que la unica pagina del sitio que NO se podia acotar era justo la que mas veces
 * hay que medir durante el redisenio —y creerte que mides 1 mientras mides 115 son ~65 minutos
 * con la pantalla del usuario secuestrada. Con `=/` se mide solo la home.
 *
 *     node scripts/check-visual.mjs /services/ /pool-builders/     (subcadena, como siempre)
 *     node scripts/check-visual.mjs '=/'                           (SOLO la home; las comillas hacen
 *                                                          falta: zsh expande `=/` solo)
 */
const filtro = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const casa = (r) => !filtro.length || filtro.some((f) => (f.startsWith('=') ? r === f.slice(1) : r.includes(f)));

/**
 * Páginas que se ven distinto A PROPÓSITO, con su motivo.
 *
 * El valor puede ser un texto —vale para los 4 anchos— o `{ anchos: [479], motivo }` para
 * declarar **solo el ancho donde la diferencia existe**. Lo segundo importa: declarar una ruta
 * entera por una diferencia que solo aparece a 479 apaga la puerta también a 1920, 1440 y 991,
 * y ahí es donde vive casi todo el contenido. Una declaración que tapa más de lo que explica es
 * una puerta menos.
 */
const DISTINTAS_A_PROPOSITO = {
  '/brochures': { anchos: [479], motivo:
    'el sitio VIVO tiene Turnstile inyectado por Cloudflare en TODOS sus formularios, incluido '
    + 'el de FILTRO de categorias, que no envia nada: Webflow cuelga ahi un '
    + '`<div><div><input type="hidden" name="cf-turnstile-response"></div></div>`. Ese formulario '
    + 'es `display:grid; gap:16px`, asi que a una columna (479) el nodo vacio anade UNA FILA de '
    + '16 px; a partir de 991 cae en la segunda columna y no suma nada -por eso solo falla a 479-. '
    + 'El sitio nuevo NO lo replica a proposito: no se pone captcha donde no hay envio. '
    + 'Medido con diag-geometria contra el vivo: 310 elementos, el unico desvio es ese.' },
  '/pool-cost-estimator':
    'DECISION D3 (Sebastian, 28-ago-2026): fuera el iframe. Esta pagina embebia '
    + '/pool-investment-estimator en un `<iframe>` con ALTURA FIJA -900px a partir de 992, 1400 '
    + 'entre 768 y 991, 1600 por debajo- porque el estimador era una app de Webflow Cloud que '
    + 'vivia en otro servidor. Desde la Fase 12c es un componente de este mismo sitio y va '
    + 'montado en la pagina, asi que la seccion mide LO QUE MIDE en vez de lo que decia el '
    + 'iframe. Medido: la pagina queda mas CORTA en los 4 anchos -196px a 1920 y 1440, 260px a '
    + '991, 272px a 479 (px reales; la puerta los ve a 1/4)-. Ese acortamiento ES el cambio que '
    + 'se pidio. Ademas ahora hay un formulario de lead aqui, y su Turnstile no pinta fuera del '
    + 'dominio registrado, igual que en /contact-us. El texto NO se declara entero: '
    + 'check:texto sigue comparando las 90 lineas de la pagina al 100% y solo se le declara el '
    + 'bloque de 13 del estimador, seguido y en orden.',
  '/contact-us': 'el widget de Turnstile NO renderiza fuera del dominio registrado. Medido: el '
    + 'script carga y `window.turnstile` existe, pero `render()` no pinta nada en localhost, '
    + 'asi que la pagina sale ~16 px mas corta que el baseline, donde SI estaba pintado. '
    + 'HAY QUE VOLVER A MEDIRLO contra la preview, con el dominio de Vercel dado de alta en el '
    + 'widget de Cloudflare.',
  '/request-estimated': 'lo mismo que /contact-us: es el otro formulario.',
  /* `/` YA NO ESTA AQUI. Su motivo se mudo a `disenio/contratos.json` con contrato
   * `rediseno` el 31-ago-2026 (R9-BLOG-01), que es lo que manda PROMPT-REDISENO §5.3 al
   * re-baselinizar una ruta. Las otras dos rutas `svc` siguen aqui porque siguen en paridad:
   * se mudaran el dia que se re-baselinicen ellas, no antes. */
  '/where-we-serves/custom-pool-builders-north-florida': 'REDISENO DE LA SECCION DE SERVICIOS POR CATEGORIA (Sebastian, 28-ago-2026), direccion «panel de mando». Rompe la paridad A PROPOSITO en esta ruta y en las otras dos donde vivia la seccion. Lo que cambia, y el numero que lo pedia:'
    + '  1. El original filtraba los servicios EN EL CLIENTE. Medido con un sondeo cada 50 ms: a los 756 ms, con la pagina ya en readyState:"complete", se veian los 14 servicios y ninguna ficha; el filtro caia entre 870 y 2764 ms y la seccion pasaba de 1211,6 px a 826,4 px a 1440. Eso son 385,2 px de tiron en cada carga, arrastrando todo lo que va debajo. Ahora el estado inicial va SERVIDO en el HTML y el salto medido es 0,0 px en los 4 anchos.'
    + '  2. La pestana activa pintaba blanco sobre el degradado cian: 1,81:1, contra los 4,5:1 de WCAG AA -y las inactivas iban a 13,72:1, o sea la jerarquia INVERTIDA-. Ahora es navy relleno, 15,60:1. El hover de las filas hacia lo mismo y tambien se va.'
    + '  3. Las 3 pestanas y las 14 filas eran <div> con tabIndex -1 y sin rol: lo unico enfocable era el «See More» de la ficha abierta, 1 de 14. Ahora son 11 elementos enfocables, con role=tablist/tab/tabpanel, aria-selected y flechas.'
    + '  4. Las dos columnas acababan en tres suelos distintos -481,2 / 475 / 500 px-. Ahora el desfase medido es 0,0 px.'
    + '  5. En movil NO se abria ninguna ficha (isTabletDown() cortaba): 3 pestanas y 7 rotulos, sin foto ni CTA. Ahora la primera viene abierta, en acordeon.'
    + 'El TEXTO no cambia: check:texto sigue comparando esta ruta al 100 % y sale identica -las filas ocultas van con [hidden], que innerText no ve, y el contador «3 / 7» es contenido generado con ::before, que tampoco cuenta-. Aqui la pestana por defecto es pool-spa y son 3 servicios, no 7: con la lista tan corta las filas van centradas en vertical contra la ficha. Medido a 1920: 95,92 %.',
  '/where-we-serves/custom-pool-builders-south-florida': 'REDISENO DE LA SECCION DE SERVICIOS POR CATEGORIA (Sebastian, 28-ago-2026), direccion «panel de mando». Rompe la paridad A PROPOSITO en esta ruta y en las otras dos donde vivia la seccion. Lo que cambia, y el numero que lo pedia:'
    + '  1. El original filtraba los servicios EN EL CLIENTE. Medido con un sondeo cada 50 ms: a los 756 ms, con la pagina ya en readyState:"complete", se veian los 14 servicios y ninguna ficha; el filtro caia entre 870 y 2764 ms y la seccion pasaba de 1211,6 px a 826,4 px a 1440. Eso son 385,2 px de tiron en cada carga, arrastrando todo lo que va debajo. Ahora el estado inicial va SERVIDO en el HTML y el salto medido es 0,0 px en los 4 anchos.'
    + '  2. La pestana activa pintaba blanco sobre el degradado cian: 1,81:1, contra los 4,5:1 de WCAG AA -y las inactivas iban a 13,72:1, o sea la jerarquia INVERTIDA-. Ahora es navy relleno, 15,60:1. El hover de las filas hacia lo mismo y tambien se va.'
    + '  3. Las 3 pestanas y las 14 filas eran <div> con tabIndex -1 y sin rol: lo unico enfocable era el «See More» de la ficha abierta, 1 de 14. Ahora son 11 elementos enfocables, con role=tablist/tab/tabpanel, aria-selected y flechas.'
    + '  4. Las dos columnas acababan en tres suelos distintos -481,2 / 475 / 500 px-. Ahora el desfase medido es 0,0 px.'
    + '  5. En movil NO se abria ninguna ficha (isTabletDown() cortaba): 3 pestanas y 7 rotulos, sin foto ni CTA. Ahora la primera viene abierta, en acordeon.'
    + 'El TEXTO no cambia: check:texto sigue comparando esta ruta al 100 % y sale identica -las filas ocultas van con [hidden], que innerText no ve, y el contador «3 / 7» es contenido generado con ::before, que tampoco cuenta-. Es la gemela de la de north: mismos 14 servicios, mismo orden y misma pestana por defecto. Medido a 1920: 95,96 %.',
  '/videos': 'la galeria de YouTube era el CUARTO widget de Elfsight y es el unico que SI '
    + 'pintaba. Ahora es nativa (D2), con el diseño del sitio en vez del de Elfsight: mismos 8 '
    + 'videos y mismo texto -check:texto lo exige al 100%- pero otra maqueta.',
};

/** ¿Está declarada esta ruta PARA ESTE ANCHO? Devuelve el motivo, o null. */
const declarada = (ruta, ancho) => {
  const d = DISTINTAS_A_PROPOSITO[ruta];
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.anchos.includes(ancho) ? d.motivo : null;
};

if (!fs.existsSync(ESTATICO)) { console.error('\nROJO falta .vercel/output/static\n'); process.exit(1); }

const TIPO = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = [path.join(ESTATICO, p), path.join(ESTATICO, p + '.html'), path.join(ESTATICO, p, 'index.html')]
    .find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const BASE = `http://localhost:${servidor.address().port}`;

const csv = fs.readFileSync(path.join(RAIZ, '_source/routes.csv'), 'utf8');
/**
 * Las del origen MAS las de autoria propia (`lib/rutas-propias.mjs`). Sin sumarlas aqui, una
 * ruta propia declarada en `disenio/contratos.json` no se mediria NUNCA: este bucle recorre
 * `routes.csv`, asi que su contrato seria letra muerta y el rojo que promete —«contrato
 * rediseno y NO hay referencia aprobada»— no llegaria a saltar jamas. Es la misma familia de
 * fallo que §2.1, un piso mas abajo: alli el silencio lo daba una referencia que faltaba;
 * aqui lo daria la ruta entera, que ni se visita.
 */
const RUTAS = conPropias(csv.trim().split('\n').slice(1)
  .map((l) => l.match(/"((?:[^"]|"")*)"/g)[0].slice(1, -1)))
  .filter(casa);

const cruda = (s) => s.ensureAlpha().raw().toBuffer();
const nav = await chromium.launch({ headless: false, args: ARGS_NAVEGADOR });

let ok = 0, mal = 0, declaradas = 0, saltadas = 0;
const rojos = [];

for (const [ancho, alto] of ANCHOS) {
  console.log(`\n── ${ancho}px`);
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const pag = await ctx.newPage();

  for (const ruta of RUTAS) {
    const ref = path.join(RAIZ, 'baseline/shots', String(ancho), `${aSlug(ruta)}.jpg`);
    if (!fs.existsSync(ref)) {
      /**
       * EL FALLO N.º 1 DEL PROGRAMA R, CERRADO AQUI (PROMPT-REDISENO §2.1).
       *
       * Esto era `{ saltadas++; continue; }` a secas: falta de referencia = saltada EN SILENCIO,
       * nunca roja. Con las 460 en su sitio daba igual. En cuanto una ruta se redisena, deja de
       * dar igual: saldria verde sin haberse medido jamas — y verde es justo lo que nadie va a
       * ir a revisar. `check-texto.mjs:137` y `check-seo.mjs` si ponen rojo en este caso; esta
       * era la unica de las tres que fallaba abierta.
       *
       * Ahora manda el CONTRATO de la ruta:
       *   · `rediseno` -> ROJO. Se prometio una referencia aprobada y no esta.
       *   · `paridad`  -> saltada, como siempre: es una ruta que aun no se ha tocado.
       */
      if (contratoDe(CONTRATOS, ruta) === 'rediseno') {
        mal++;
        rojos.push([ancho, ruta, 'contrato rediseno y NO hay referencia aprobada'
          + ' (node scripts/aprobar-diseno.mjs ' + ruta + ' --si)']);
        console.log(`  ROJO ${ruta.padEnd(52).slice(0, 52)} sin referencia aprobada`);
      } else saltadas++;
      continue;
    }
    const resp = await pag.goto(BASE + ruta, { waitUntil: 'load', timeout: 40000 }).catch(() => null);
    if (!resp?.ok()) { rojos.push([ancho, ruta, `HTTP ${resp?.status()}`]); mal++; continue; }
    await pag.bringToFront();

    /**
     * UNA RUTA NO PUEDE MATAR LA CORRIDA. Medido dos veces el 28-ago:
     *
     *   - `asentar` lanzó «Execution context was destroyed» en la captura del baseline y se
     *     llevó 40 min de trabajo por delante;
     *   - aquí, `page.screenshot: Timeout 120000ms exceeded` mató la comparación **4 de 460**
     *     porque la máquina estaba saturada y una página larga tardó más de 2 minutos.
     *
     * Ninguno de los dos era un fallo del sitio. Que una página vaya lenta o se porte raro es
     * normal; que eso tire 70 minutos de medición es un defecto de la puerta. Ahora la ruta se
     * cuenta como ROJA con su motivo y se sigue — y como se cuenta en rojo, no se cuela nada:
     * la puerta acaba en rojo igual y dice exactamente cuál falló.
     */
    let est, buffer, ma, mb;
    try {
      est = await asentar(pag);
      if (!est.valida) { rojos.push([ancho, ruta, `medicion invalida ${JSON.stringify(est.sonda)}`]); mal++; continue; }
      ({ buffer } = await aJpeg(sharp, await disparar(pag)));
      ma = await sharp(ref, { limitInputPixels: false }).metadata();
      mb = await sharp(buffer, { limitInputPixels: false }).metadata();
    } catch (e) {
      rojos.push([ancho, ruta, `no se pudo medir: ${e.message.split('\n')[0].slice(0, 90)}`]);
      mal++; console.log(`  ROJO ${ruta.padEnd(52).slice(0, 52)} ${e.message.split('\n')[0].slice(0, 40)}`);
      continue;
    }

    const deltaAlto = mb.height - ma.height;
    if (ma.width !== mb.width || Math.abs(deltaAlto) > TOL_ALTO) {
      // Una diferencia de alto GRANDE no se compara a la fuerza recortando: eso daria un
      // porcentaje que parece bueno mientras la pagina crece o encoge. Se reporta como lo que es.
      const dif = `alto ${ma.height} -> ${mb.height} (${deltaAlto > 0 ? '+' : ''}${deltaAlto}px)`;
      if (declarada(ruta, ancho)) { declaradas++; console.log(`  decl ${ruta} — ${dif}`); }
      else {
        /* ESTA LINEA FALTABA, y es la unica rama de la puerta que contaba sin decir cual.
         * Sintoma: el resumen daba «171 distintas» y en pantalla solo habia 33 lineas ROJO
         * — 138 fallos contados y silenciados—. El `── detalle` del final tampoco salva,
         * porque imprime `rojos.slice(0, 6)`.
         *
         * No falla ABIERTA -la puerta sale roja y el `process.exit` es correcto- pero
         * oculta QUE fallo, y eso operativamente cuesta casi lo mismo: la lista de rojas es
         * justo lo que decide que rutas se re-baselinizan. Un veredicto sin inventario
         * obliga a adivinar, y adivinar delante del unico acto irreversible del sistema es
         * como se hornea un defecto. */
        rojos.push([ancho, ruta, dif]); mal++;
        console.log(`  ROJO ${ruta.padEnd(52).slice(0, 52)} ${dif}`);
      }
      continue;
    }

    // Con una diferencia de 1-3 px se compara la parte comun. Es redondeo subpixel de la
    // captura a pagina completa -medido: /gallery +1px y /contact-us +2px sobre paginas de
    // 3527 y 904 px-, no maqueta que se mueve. El delta se IMPRIME siempre, para que 2px
    // repetidos en muchas paginas no pasen desapercibidos.
    const h = Math.min(ma.height, mb.height);
    const recorta = (src) => sharp(src, { limitInputPixels: false })
      .extract({ left: 0, top: 0, width: ma.width, height: h });
    const [pa, pb] = await Promise.all([cruda(recorta(ref)), cruda(recorta(buffer))]);
    const dist = pixelmatch(pa, pb, null, ma.width, h, { threshold: TOLERANCIA });
    const igual = 100 * (1 - dist / (ma.width * h));
    const nota = deltaAlto ? ` (alto ${deltaAlto > 0 ? '+' : ''}${deltaAlto}px)` : '';

    if (igual >= UMBRAL) { ok++; console.log(`  ok   ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
    else if (declarada(ruta, ancho)) { declaradas++; console.log(`  decl ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
    else { mal++; rojos.push([ancho, ruta, `${igual.toFixed(2)} % (umbral ${UMBRAL} %)${nota}`]); console.log(`  ROJO ${ruta.padEnd(52).slice(0, 52)} ${igual.toFixed(2)} %${nota}`); }
  }
  await ctx.close();
}
await nav.close();
servidor.close();

if (rojos.length) {
  console.log('\n── detalle\n');
  for (const [a, r, d] of rojos.slice(0, 20)) console.log(`  ${String(a).padStart(4)} ${r.padEnd(56).slice(0, 56)} ${d}`);
  if (rojos.length > 20) console.log(`  ... y ${rojos.length - 20} mas`);
}
console.log(`\n  ${ok} iguales · ${mal} distintas · ${declaradas} declaradas · ${saltadas} sin baseline`);
const REDIS = redisenadas(CONTRATOS);
console.log(`  contratos: ${REDIS.length} ruta(s) en \`rediseno\`${REDIS.length ? ' -> ' + REDIS.join(' ') : ''} · el resto, paridad`);
for (const [r, d] of Object.entries(DISTINTAS_A_PROPOSITO)) {
  const m = typeof d === 'string' ? d : d.motivo;
  const donde = typeof d === 'string' ? 'los 4 anchos' : `solo ${d.anchos.join('/')}px`;
  console.log(`     declarada ${r} (${donde}): ${m.slice(0, 84)}...`);
}
console.log(`\n${mal === 0 ? 'PUERTA VERDE' : `PUERTA ROJA — ${mal} comparacion(es)`}\n`);
process.exit(mal ? 1 : 0);
