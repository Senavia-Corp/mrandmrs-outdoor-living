#!/usr/bin/env node
/**
 * BLOG-SANITY · el enlazado interno de los 10 articulos heredados.
 *
 *     node scripts/enlaza-blog-sanity.mjs              SECO
 *     node scripts/enlaza-blog-sanity.mjs --escribir   aplica
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL PROBLEMA, MEDIDO
 *
 * Los 10 articulos tienen CERO enlaces en el cuerpo. No es una impresion:
 *
 *     $ node -e "…cuenta <a> dentro de .w-richtext en _source/vivo/blogs_*.html"
 *     TOTAL enlaces dentro del cuerpo de los 10: 0
 *
 * O sea que la queja del encargo -«NINGUN BLOG HUERFANO»- esta medida: ninguno de los 10
 * manda a ninguna parte. Un lector que acaba de leer 2.000 palabras sobre permisos de piscina
 * no tiene, en todo el cuerpo, un solo camino hacia la ficha del servicio.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL ANCLA SE ELIGE DEL TEXTO QUE YA HAY, NUNCA SE INVENTA
 *
 * Cada enlace envuelve una frase que YA ESTA ESCRITA en el articulo. Eso tiene dos
 * consecuencias que importan:
 *
 *   · el `innerText` NO se mueve —un `<a>` no cambia el texto—, asi que `check:texto` sigue
 *     verde en las 10 sin declarar nada;
 *   · el anchor es descriptivo por construccion. Nada de «click here».
 *
 * Y si una frase declarada no aparece, o aparece en un encabezado, esto SE PARA con el slug y
 * la frase puestos. Un enlazador que «hace lo que puede» deja articulos huerfanos en silencio,
 * que es justo el defecto que viene a cerrar.
 *
 * IDEMPOTENTE: si el destino ya esta enlazado en ese articulo, no vuelve a enlazar.
 */
import { groq, mutar, SIN_BORRADORES } from './lib/sanity.mjs';

const ESCRIBIR = process.argv.includes('--escribir');
const SVC = (s) => `/services/${s}`;

/**
 * EL ENLAZADO, ARTICULO POR ARTICULO.
 *
 * Regla: el PRIMER enlace es siempre la ficha del servicio primario -el CTA del articulo-, y
 * los siguientes solo si el texto los pide de verdad. No se enlaza por cubrir el expediente:
 * un enlace que no viene a cuento se ignora y ademas reparte autoridad a lo tonto.
 */
const ENLACES = {
  'complete-guide-to-pool-construction-in-florida-costs-timeline-process': [
    ['custom pool construction', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'el servicio del que trata la guia entera'],
    ['landscaping', SVC('professional-landscaping-services-in-north-south-florida'),
      'el parrafo habla de integrar patios y jardineria con la obra'],
  ],
  'what-permits-are-required-for-pool-construction-in-florida': [
    ['pool construction permits', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'quien lee sobre permisos esta planteandose la obra'],
    ['screen enclosure permit', SVC('pool-screen-enclosures-for-north-south-florida-pools'),
      'el cerramiento tiene su propio permiso y su propia ficha'],
  ],
  'pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish': [
    ['Florida pool construction', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'el servicio cuyo plazo se esta explicando'],
  ],
  'common-pool-construction-mistakes-we-see-in-florida': [
    ['pool construction', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'los errores son de esta obra; la ficha es la salida natural'],
    ['landscaping', SVC('professional-landscaping-services-in-north-south-florida'),
      'el error que describe ese parrafo es de jardineria mal planificada'],
  ],
  'new-pool-construction-vs-pool-remodeling-which-is-right-for-you': [
    ['pool remodeling', SVC('pool-remodeling-renovation-in-north-south-florida'),
      'servicio primario: la pregunta la hace quien YA tiene piscina'],
    ['outdoor kitchens', SVC('custom-outdoor-kitchens-for-north-south-florida-homes'),
      'el parrafo propone anadirlas al alcance de la obra'],
    ['Pool financing', '/financing',
      'el parrafo habla de como se paga; la pagina de financiacion es la respuesta'],
  ],
  'top-10-luxury-pool-designs-for-florida-homes': [
    ['custom pool features', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'el articulo es de diseno y el servicio es quien lo construye'],
    ['landscaping', SVC('professional-landscaping-services-in-north-south-florida'),
      'el diseno que describe incluye la jardineria alrededor'],
  ],
  'outdoor-living-design-guide-for-florida-homes': [
    ['outdoor kitchens', SVC('custom-outdoor-kitchens-for-north-south-florida-homes'),
      'servicio primario de la guia'],
    ['pergolas', SVC('custom-aluminum-pergola-builders-in-north-south-florida'),
      'el parrafo habla de la sombra que dan'],
    ['screen enclosures', SVC('patio-screen-rooms-enclosures-in-north-south-florida'),
      'el parrafo compara mallas y cerramientos de patio'],
  ],
  'how-outdoor-living-spaces-increase-property-value-in-florida': [
    ['outdoor kitchens', SVC('custom-outdoor-kitchens-for-north-south-florida-homes'),
      'es la primera mejora que nombra el articulo'],
    ['pergolas', SVC('custom-aluminum-pergola-builders-in-north-south-florida'),
      'el parrafo las nombra junto a los decks como mejora de valor'],
  ],
  'commercial-pool-construction-in-florida-what-decision-makers-must-know': [
    ['commercial pool construction', '/industry-solutions',
      'la pagina comercial del sitio, no la ficha residencial: el lector no es un homeowner'],
  ],
  'residential-vs-commercial-pool-construction-in-florida': [
    ['pool construction', SVC('custom-pool-spa-builders-in-north-south-florida'),
      'la mitad residencial del articulo'],
    ['Pool financing', '/financing',
      'el parrafo compara como se financia cada lado'],
  ],
};

/** `_key` estable: re-correr no cambia las claves de las marcas ya puestas. */
const clave = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `lnk${Math.abs(h).toString(36)}`;
};

/**
 * Envuelve la PRIMERA aparicion de `frase` en un bloque `normal` con un enlace a `href`.
 * Devuelve el bloque nuevo, o `null` si no la encuentra.
 */
function enlaza(bloques, frase, href, slug) {
  const yaEsta = bloques.some((b) => (b.markDefs ?? []).some((d) => d.href === href));
  if (yaEsta) return { bloques, estado: 'ya estaba' };

  for (const b of bloques) {
    /* Parrafos y elementos de lista. Se excluyen los ENCABEZADOS: un enlace dentro de un h2
     * compite con el propio titulo de la seccion y Google lo lee como el tema del apartado.
     * Dentro de una vineta si vale, y es donde cae el ancla de «outdoor kitchens» en el
     * articulo de construccion contra remodelacion. */
    if (b._type !== 'block' || b.style !== 'normal') continue;
    for (let i = 0; i < (b.children ?? []).length; i++) {
      const sp = b.children[i];
      if (sp._type !== 'span') continue;
      const j = sp.text.indexOf(frase);
      if (j < 0) continue;

      const k = clave(`${slug}:${href}`);
      const antes = sp.text.slice(0, j);
      const medio = sp.text.slice(j, j + frase.length);
      const despues = sp.text.slice(j + frase.length);
      const trozos = [];
      if (antes) trozos.push({ ...sp, _key: `${sp._key}a`, text: antes });
      trozos.push({ ...sp, _key: `${sp._key}${k}`, text: medio, marks: [...(sp.marks ?? []), k] });
      if (despues) trozos.push({ ...sp, _key: `${sp._key}b`, text: despues });

      b.children.splice(i, 1, ...trozos);
      b.markDefs = [...(b.markDefs ?? []), { _key: k, _type: 'link', href }];
      return { bloques, estado: 'enlazado' };
    }
  }
  return { bloques: null, estado: 'NO ENCONTRADA' };
}

const main = async () => {
  const posts = await groq(`*[_type == "blogPost" && ${SIN_BORRADORES}]{_id, "slug": slug.current, blog}`);
  const mutaciones = [];
  let fallos = 0;
  console.log('');

  for (const p of posts) {
    const plan = ENLACES[p.slug];
    if (!plan) { console.log(`  ROJO ${p.slug}: sin enlaces declarados`); fallos++; continue; }
    let bloques = JSON.parse(JSON.stringify(p.blog));
    const hechos = [];
    for (const [frase, href, motivo] of plan) {
      const r = enlaza(bloques, frase, href, p.slug);
      if (r.estado === 'NO ENCONTRADA') {
        console.log(`  ROJO ${p.slug}`);
        console.log(`       la frase «${frase}» no aparece en ningun parrafo del cuerpo.`);
        console.log('       No se inventa un ancla: declara otra frase que SI este escrita.');
        fallos++;
        bloques = null;
        break;
      }
      bloques = r.bloques;
      hechos.push(`${href}  (${r.estado})  <- «${frase}» · ${motivo}`);
    }
    if (!bloques) continue;
    console.log(`  ${p.slug.slice(0, 58)}`);
    for (const h of hechos) console.log(`     ${h}`);
    const nEnlaces = bloques.filter((b) => b._type === 'block')
      .reduce((n, b) => n + (b.markDefs ?? []).length, 0);
    console.log(`     -> ${nEnlaces} enlace(s) en el cuerpo`);
    mutaciones.push({ patch: { id: p._id, set: { blog: bloques } } });
  }

  if (fallos) { console.error(`\n  ROJO ${fallos} articulo(s) sin resolver. No se escribe nada.\n`); process.exit(1); }
  console.log('');
  await mutar(mutaciones, { seco: !ESCRIBIR });

  if (ESCRIBIR) {
    const v = await groq(`*[_type == "blogPost" && ${SIN_BORRADORES}]{"s": slug.current,`
      + ' "n": count(blog[].markDefs[])}');
    const sin = v.filter((x) => !x.n);
    console.log(`\n  VERIFICACION: ${v.length - sin.length}/${v.length} articulos con enlaces en el cuerpo`);
    if (sin.length) { console.error(`  ROJO huerfanos: ${sin.map((x) => x.s).join(', ')}\n`); process.exit(1); }
    console.log('  VERDE: 0 huerfanos\n');
  }
};

main().catch((e) => { console.error('\n  ROJO', e.message, '\n'); process.exit(1); });
