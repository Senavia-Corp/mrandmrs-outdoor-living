#!/usr/bin/env node
/**
 * PUERTA · los datos estructurados contra lo que Google documenta como OBLIGATORIO.
 *
 *     npm run check:jsonld        estatica, sin navegador, sobre .vercel/output/static, las 234
 *
 * NO ENVIA NADA A NADIE: no es el validador de Google, es su tabla de propiedades escrita aqui.
 * `check:seo` compara los bloques del origen caracter a caracter y exige que los propios digan
 * lo que la pagina ensena; lo que no mira nadie es si cada nodo lleva lo que su tipo PIDE.
 *
 * LA TABLA. Leida de developers.google.com/search/docs/appearance/structured-data/ el
 * 13-oct-2026. Si Google la cambia, se cambia aqui: una regla sin fecha es una regla que nadie
 * sabe si sigue valiendo.
 *
 *   LocalBusiness    obligatorias: name, address.          recomendadas: telephone, url, geo,
 *                    openingHoursSpecification, priceRange.
 *   BreadcrumbList   itemListElement con >= 2 ListItem; cada uno position, name e item (el ultimo
 *                    puede ir sin item).
 *   VideoObject      obligatorias: name, thumbnailUrl, uploadDate (ISO 8601; se recomienda con
 *                    zona horaria).                        recomendadas: description, duration,
 *                    contentUrl o embedUrl.
 *   ItemList         itemListElement con >= 2 ListItem; cada uno position y, o bien url (pagina
 *                    de lista), o bien item con name y url (todo en una pagina). Nunca mezclados.
 *   Article & cia.   ninguna obligatoria.                  recomendadas: headline, image,
 *                    datePublished, dateModified, author con name y url.
 *   FAQPage          Google RETIRO el resultado enriquecido de FAQ (deja de mostrarse en 2026) y
 *                    con el su tabla. Se valida la forma de schema.org: mainEntity con Question,
 *                    name y acceptedAnswer.text. Sigue sirviendo a quien lee el marcado.
 *   Service          Google no documenta ningun resultado para Service. Se valida lo propio:
 *                    name y provider.
 *
 * ROJO es una obligatoria que falta o un JSON que no parsea. Lo RECOMENDADO que falta es AVISO:
 * se cuenta y se imprime, no falla.
 *
 * LO HEREDADO DEL ORIGEN, DECLARADO UNO A UNO. Tres bloques que el sitio trae de Webflow no
 * cumplen esta tabla, y esos bloques NO se tocan aqui: `check:seo` los compara caracter a
 * caracter con el origen y cambiarlos es una decision de SEO, no un arreglo. Van en `HEREDADOS`,
 * con su ruta, su tipo y su falta. Lo que no este en esa lista es ROJO; y una entrada de la lista
 * que ya no ocurra tambien, porque sobra. En un bloque PROPIO (`#negocio`, `#miga`, `#servicio`,
 * `#obras`, `#videos`) no se admite ninguna: lo que la casa anade tiene que cumplir.
 *
 * UNA EXCEPCION, DECLARADA Y SIEMPRE IMPRESA: el `LocalBusiness` de la casa (`#negocio`) va SIN
 * `address`. Es un negocio de area de servicio sin direccion publicable (`src/lib/negocio.mjs`);
 * inventar una seria peor que no optar al resultado de negocio local. Si un dia hay direccion,
 * se anade alli y esta excepcion se borra: mientras `address` falte se imprime, y si aparece,
 * la excepcion sobra y la puerta lo dice.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
if (!fs.existsSync(ESTATICO)) { console.error('\nROJO no hay build: npm run build\n'); process.exit(1); }

/** [ruta, tipo, fragmento de la falta, por que]. Bloques del origen; ver la cabecera. */
const HEREDADOS = [
  ['/industry-solutions', 'ItemList', 'va sin url ni item', 'el ItemList del origen lista diez publicos por nombre y descripcion, sin enlace'],
];
const PROPIO = /#(negocio|miga|servicio|obras|videos)$/;
const ARTICULOS = new Set(['Article', 'BlogPosting', 'NewsArticle']);
const tipos = (n) => [n?.['@type']].flat().filter(Boolean);
const lleno = (v) => (Array.isArray(v) ? v.length > 0 && v.every(lleno) : v && typeof v === 'object' ? Object.keys(v).length > 0 : String(v ?? '').trim() !== '');
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const CON_ZONA = /(Z|[+-]\d{2}:?\d{2})$/;
const lista = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Las reglas. Cada una devuelve { rojo: [...], aviso: [...] } para UN nodo. */
const REGLAS = {
  LocalBusiness(n) {
    const rojo = []; const aviso = [];
    if (!lleno(n.name)) rojo.push('sin name');
    if (!lleno(n.address)) (String(n['@id'] ?? '').endsWith('#negocio') ? aviso : rojo).push('sin address');
    for (const p of ['telephone', 'url']) if (!lleno(n[p])) aviso.push(`sin ${p}`);
    for (const p of ['geo', 'openingHoursSpecification', 'priceRange']) if (!lleno(n[p])) aviso.push(`sin ${p} (recomendada)`);
    return { rojo, aviso };
  },
  BreadcrumbList(n) {
    const rojo = []; const items = lista(n.itemListElement);
    if (items.length < 2) rojo.push(`${items.length} ListItem; pide al menos 2`);
    items.forEach((it, i) => {
      if (it.position !== i + 1) rojo.push(`el escalon ${i + 1} lleva position ${it.position}`);
      if (!lleno(it.name) && !lleno(it.item?.name)) rojo.push(`el escalon ${i + 1} va sin name`);
      if (!lleno(it.item) && i < items.length - 1) rojo.push(`el escalon ${i + 1} va sin item y no es el ultimo`);
      const url = typeof it.item === 'string' ? it.item : it.item?.['@id'] ?? it.item?.url;
      if (lleno(it.item) && !/^https?:\/\//.test(url ?? '')) rojo.push(`el item del escalon ${i + 1} no es una URL absoluta`);
    });
    return { rojo, aviso: [] };
  },
  VideoObject(n) {
    const rojo = []; const aviso = [];
    for (const p of ['name', 'thumbnailUrl', 'uploadDate']) if (!lleno(n[p])) rojo.push(`sin ${p}`);
    if (lleno(n.uploadDate) && !ISO.test(n.uploadDate)) rojo.push(`uploadDate «${n.uploadDate}» no es ISO 8601`);
    else if (lleno(n.uploadDate) && !CON_ZONA.test(n.uploadDate)) aviso.push('uploadDate sin zona horaria (Google toma la suya)');
    for (const u of lista(n.thumbnailUrl)) if (!/^https?:\/\//.test(String(u))) rojo.push('thumbnailUrl no es una URL absoluta');
    if (!lleno(n.description)) aviso.push('sin description (recomendada)');
    if (!lleno(n.duration)) aviso.push('sin duration (recomendada)');
    if (!lleno(n.contentUrl) && !lleno(n.embedUrl)) aviso.push('sin contentUrl ni embedUrl (recomendadas)');
    return { rojo, aviso };
  },
  ItemList(n) {
    const rojo = []; const items = lista(n.itemListElement);
    if (items.length < 2) rojo.push(`${items.length} ListItem; pide al menos 2`);
    const conUrl = items.filter((i) => lleno(i.url)).length; const conItem = items.filter((i) => lleno(i.item)).length;
    if (conUrl && conItem) rojo.push('mezcla ListItem con url y ListItem con item');
    items.forEach((it, i) => {
      if (it.position !== i + 1) rojo.push(`el elemento ${i + 1} lleva position ${it.position}`);
      if (!lleno(it.url) && !lleno(it.item)) rojo.push(`el elemento ${i + 1} va sin url ni item`);
      if (lleno(it.url) && !/^https?:\/\//.test(it.url)) rojo.push(`la url del elemento ${i + 1} no es absoluta`);
      if (lleno(it.item) && (!lleno(it.item.name) || !lleno(it.item.url))) rojo.push(`el item del elemento ${i + 1} va sin name o sin url`);
    });
    return { rojo, aviso: [] };
  },
  Articulo(n) {
    const aviso = [];
    for (const p of ['headline', 'image', 'datePublished', 'dateModified']) if (!lleno(n[p])) aviso.push(`sin ${p} (recomendada)`);
    for (const p of ['datePublished', 'dateModified']) if (lleno(n[p]) && !ISO.test(n[p])) aviso.push(`${p} «${n[p]}» no es ISO 8601`);
    const autores = lista(n.author);
    if (!autores.length) aviso.push('sin author (recomendada)');
    else if (autores.some((a) => !lleno(a?.name))) aviso.push('author sin name');
    else if (autores.some((a) => !lleno(a?.url))) aviso.push('author sin url (recomendada)');
    return { rojo: [], aviso };
  },
  FAQPage(n) {
    const rojo = []; const qs = lista(n.mainEntity);
    if (!qs.length) rojo.push('mainEntity vacio');
    qs.forEach((q, i) => {
      if (!tipos(q).includes('Question')) rojo.push(`la entrada ${i + 1} no es Question`);
      if (!lleno(q.name)) rojo.push(`la pregunta ${i + 1} va sin name`);
      if (!lleno(q.acceptedAnswer?.text)) rojo.push(`la pregunta ${i + 1} va sin acceptedAnswer.text`);
    });
    return { rojo, aviso: [] };
  },
  Service(n) {
    const rojo = []; const aviso = [];
    if (!lleno(n.name)) rojo.push('sin name');
    if (!lleno(n.provider)) aviso.push('sin provider');
    return { rojo, aviso };
  },
};
const reglaDe = (t) => (ARTICULOS.has(t) ? 'Articulo' : REGLAS[t] ? t : null);

const ficheros = [];
(function anda(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) anda(f); else if (e.name === 'index.html') ficheros.push(f); } })(ESTATICO);

const cuenta = {};      // tipo -> { nodos, paginas:Set, rojo:Map(msg->rutas), aviso:Map }
const otros = {};       // tipos sin regla -> nodos
const noParsea = [];
let bloques = 0;
const usadas = new Set();   // entradas de HEREDADOS que han casado con algo
const heredado = (ruta, t, m) => HEREDADOS.findIndex(([r0, t0, frag]) => r0 === ruta && t0 === t && m.includes(frag));
const anota = (t, ruta, r, propio) => {
  const c = (cuenta[t] ??= { nodos: 0, paginas: new Set(), rojo: new Map(), aviso: new Map(), heredado: new Map() });
  c.nodos++; c.paginas.add(ruta);
  for (const m of r.aviso) { if (!c.aviso.has(m)) c.aviso.set(m, []); c.aviso.get(m).push(ruta); }
  for (const m of r.rojo) {
    const h = propio ? -1 : heredado(ruta, t, m);
    if (h >= 0) usadas.add(h);
    const donde = h >= 0 ? c.heredado : c.rojo;
    if (!donde.has(m)) donde.set(m, []); donde.get(m).push(ruta);
  }
};
const visita = (n, ruta, propio) => {
  if (Array.isArray(n)) return n.forEach((x) => visita(x, ruta, propio));
  if (!n || typeof n !== 'object') return;
  for (const t of tipos(n)) {
    const regla = reglaDe(t);
    if (regla) anota(regla === 'Articulo' ? t : regla, ruta, REGLAS[regla](n), propio); else otros[t] = (otros[t] ?? 0) + 1;
  }
  for (const v of Object.values(n)) visita(v, ruta, propio);
};
for (const f of ficheros.sort()) {
  const ruta = '/' + path.relative(ESTATICO, path.dirname(f));
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    bloques++;
    let o; try { o = JSON.parse(m[1]); } catch (e) { noParsea.push(`${ruta}: ${String(e.message).slice(0, 60)}`); continue; }
    if (!Array.isArray(o) && !o['@context']) noParsea.push(`${ruta}: bloque sin @context`);
    visita(o, ruta, PROPIO.test(String(o?.['@id'] ?? '')));
  }
}

let fallos = noParsea.length;
console.log(`\n── ${ficheros.length} paginas · ${bloques} bloques de JSON-LD`);
console.log(`  ${noParsea.length ? 'ROJO' : 'ok  '} todos parsean y llevan @context${noParsea.length ? ' — ' + noParsea.slice(0, 4).join(' · ') : ''}`);
console.log('\n── por tipo: nodos · paginas · obligatorias que faltan · heredadas declaradas · avisos');
for (const [t, c] of Object.entries(cuenta).sort((a, b) => b[1].nodos - a[1].nodos)) {
  const suma = (mapa) => [...mapa.values()].reduce((s, v) => s + v.length, 0);
  const nr = suma(c.rojo); const na = suma(c.aviso); const nh = suma(c.heredado);
  fallos += nr;
  console.log(`  ${nr ? 'ROJO' : 'ok  '} ${t.padEnd(16)} ${String(c.nodos).padStart(5)} nodo(s) · ${String(c.paginas.size).padStart(3)} pagina(s) · ${nr} obligatoria(s) · ${nh} heredada(s) · ${na} aviso(s)`);
  for (const [m, rs] of c.rojo) console.log(`         ROJO  ${m} — ${rs.length} · p. ej. ${rs[0]}`);
  for (const [m, rs] of c.aviso) console.log(`         aviso ${m} — ${rs.length} · p. ej. ${rs[0]}`);
}
console.log(`\n  --   tipos sin regla propia (anidados o sin resultado documentado): ${Object.entries(otros).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · ')}`);

console.log('\n── heredado del origen, declarado — bloques que aqui no se tocan; van al parte');
HEREDADOS.forEach(([ruta, tipo, frag, porque], i) => {
  if (usadas.has(i)) console.log(`  --   ${ruta} · ${tipo} · ${frag}: ${porque}`);
  else { console.log(`  ROJO ${ruta} · ${tipo} · «${frag}» ya no ocurre: la entrada de HEREDADOS sobra, borrala`); fallos++; }
});

console.log('\n── excepcion declarada — se imprime siempre, no se perdona callando');
const sinDir = cuenta.LocalBusiness?.aviso.get('sin address')?.length ?? 0;
if (sinDir) console.log(`  --   LocalBusiness #negocio sin \`address\` en ${sinDir} pagina(s): negocio de area de servicio sin direccion\n       publicable (src/lib/negocio.mjs). Google la da por OBLIGATORIA para su resultado de negocio local.`);
else { console.log('  ROJO el #negocio ya lleva `address`: la excepcion de esta puerta sobra, borrala'); fallos++; }
console.log('  --   FAQPage: Google ya no muestra el resultado enriquecido de FAQ; el marcado se valida por su forma.');
console.log('  --   ItemList: Google solo pinta carrusel para cursos, peliculas, recetas y restaurantes; estas listas no optan.');

console.log(`\n${fallos ? `PUERTA ROJA — ${fallos} fallo(s)` : 'PUERTA VERDE — ninguna propiedad obligatoria falta; los avisos son lo recomendado'}\n`);
process.exit(fallos ? 1 : 0);
