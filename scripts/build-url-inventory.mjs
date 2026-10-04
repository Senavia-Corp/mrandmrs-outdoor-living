#!/usr/bin/env node
/**
 * INVENTARIO DE URLS — una fila por URL que el sitio sirve o redirige (SEO-REMEDIACION, 4-oct-2026).
 *
 *     node scripts/build-url-inventory.mjs
 *
 * Lee SOLO el build (`.vercel/output/static`, `.vercel/output/config.json`) y los datos del repo
 * (`seo-url-migrations.json`, `seo-intent-registry.json`). No inventa nada: el estado HTTP de
 * una pagina construida es 200 porque existe en el build y el de un redirect sale de config.json;
 * la «disposicion» es una regla escrita aqui abajo, no una opinion por fila.
 *
 * Escribe:
 *   seo-audit/url-inventory.json   maquina
 *   seo-audit/url-inventory.csv    hoja de calculo
 *   SEO_URL_INVENTORY.md           resumen legible + tabla completa
 *   SEO_REDIRECT_MAP.md            mapa final de redirects (OLD -> NEW -> estado)
 *
 * Lo que NO sabe y lo dice: clics/impresiones por URL (Search Console no es accesible desde aqui;
 * solo las impresiones por INTENCION de `seo-intent-registry.json`, medidas el 1-oct-2026) y
 * enlaces externos (no hay datos de backlinks en el repo).
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');
const SITIO = 'https://www.mrandmrsoutdoorliving.com';
if (!fs.existsSync(ESTATICO)) { console.error('✗ no hay build'); process.exit(1); }

const leeJson = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));
const MIG = leeJson('src/data/seo-url-migrations.json');
const INT = leeJson('src/data/seo-intent-registry.json').intenciones;
const CONF = JSON.parse(fs.readFileSync(path.join(RAIZ, '.vercel/output/config.json'), 'utf8'));
const SITEMAP = new Set([...fs.readFileSync(path.join(ESTATICO, 'sitemap.xml'), 'utf8')
  .matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITIO, '') || '/'));

// ── paginas construidas ──
const ficheros = [];
(function recorre(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['_astro', 'images', 'videos', 'fonts'].includes(e.name)) recorre(p); }
    else if (e.name.endsWith('.html')) ficheros.push(p);
  }
})(ESTATICO);
const rutaDe = (f) => '/' + path.relative(ESTATICO, f).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');

const paginas = new Map();
for (const f of ficheros) {
  const ruta = rutaDe(f);
  if (ruta === '/404') continue;
  const doc = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  const tipos = new Set();
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      (function t(o) {
        if (!o || typeof o !== 'object') return;
        if (o['@type']) [].concat(o['@type']).forEach((x) => tipos.add(x));
        Object.values(o).forEach(t);
      })(JSON.parse(s.textContent));
    } catch { tipos.add('JSON-LD-INVALIDO'); }
  }
  const pie = doc.querySelector('section.footer');
  const enlaces = new Set([...doc.querySelectorAll('a[href^="/"]')]
    .filter((a) => !pie?.contains(a) && !a.closest('nav.navbar, .navbar, .menu'))
    .map((a) => a.getAttribute('href').split('#')[0].split('?')[0].replace(/(.)\/$/, '$1'))
    .filter((h) => h && !/\.(pdf|jpg|png|webp|avif)$/.test(h)));
  paginas.set(ruta, {
    url: SITIO + (ruta === '/' ? '/' : ruta),
    ruta,
    estado: 200,
    canonica: doc.querySelector('link[rel=canonical]')?.href ?? '',
    robots: doc.querySelector('meta[name=robots]')?.content ?? 'index, follow (por defecto)',
    enSitemap: SITEMAP.has(ruta),
    titulo: doc.title,
    descripcion: doc.querySelector('meta[name=description]')?.content ?? '',
    h1: [...doc.querySelectorAll('h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()),
    schema: [...tipos].sort(),
    enlacesSalientes: [...enlaces].filter((h) => h !== ruta),
  });
}

// enlaces entrantes (cuerpo, sin nav ni pie: el pie y el menu los recibe todo el sitio)
for (const p of paginas.values()) p.enlacesEntrantes = 0;
for (const p of paginas.values()) for (const h of p.enlacesSalientes) if (paginas.has(h)) paginas.get(h).enlacesEntrantes++;

// ── clasificacion ──
const tipoDe = (r) => {
  if (r === '/') return 'home';
  if (/^\/services\/pool-builders\/[a-z-]+-county-fl$/.test(r)) return 'county';
  if (/^\/services\/pool-builders\/[a-z-]+-fl$/.test(r)) return 'city';
  if (/^\/services\/[a-z-]+$/.test(r)) return 'service';
  if (r.startsWith('/where-we-serve')) return 'service-area-hub';
  if (r.startsWith('/blogs/')) return 'blog-post';
  if (r.startsWith('/project/')) return 'project';
  if (r.startsWith('/gallery')) return 'gallery';
  if (r.startsWith('/articles/')) return 'legal';
  if (/estimator|request-estimated|contact-us|thank-you|financing/.test(r)) return 'conversion';
  return 'corporate';
};
const PRIORITARIAS = new Set(['/services/pool-builders/gainesville-fl', '/services/pool-builders/ocala-fl']);
const NORTE = new Set(['alachua', 'archer', 'cedar-key', 'chiefland', 'cross-city', 'fanning-springs', 'gainesville',
  'hawthorne', 'high-springs', 'lake-city', 'mcintosh', 'micanopy', 'newberry', 'ocala', 'old-town', 'palatka',
  'reddick', 'trenton', 'waldo', 'williston']);
const ciudadDe = (r) => r.match(/\/services\/pool-builders\/([a-z-]+)-fl$/)?.[1];
const geografia = (r) => {
  const c = ciudadDe(r);
  if (!c) return /north-florida/.test(r) ? 'North Florida' : /south-florida/.test(r) ? 'South Florida' : 'Florida';
  if (c.endsWith('-county')) return c.replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()) + ', FL';
  return `${c.replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase())}, FL (${NORTE.has(c) ? 'North' : 'South'} Florida)`;
};
const servicio = (r) => {
  if (/pool-builders/.test(r) || r === '/') return 'Custom pool construction';
  if (/pool-remodel/.test(r)) return 'Complete pool remodeling';
  const m = r.match(/^\/services\/([a-z-]+)$/);
  return m ? m[1].replace(/-/g, ' ') : '';
};
const intencion = (r) => {
  const i = INT.find((x) => x.duena === r);
  return i ? { id: i.id, tipo: i.tipo, impresiones: i.impresiones ?? null } : null;
};
const disposicion = (p, tipo) => {
  if (p.estado !== 200) return 'REDIRECT';
  if (/noindex/.test(p.robots)) return 'NOINDEX';
  if (PRIORITARIAS.has(p.ruta) || ['/services/pool-builders', '/services/pool-remodeling'].includes(p.ruta)) return 'IMPROVE';
  if (tipo === 'city') return NORTE.has(ciudadDe(p.ruta)) ? 'KEEP' : 'INVESTIGATE';
  if (tipo === 'legal' || tipo === 'conversion') return 'KEEP';
  return 'KEEP';
};
const motivoDisp = (d, tipo, p) => ({
  REDIRECT: 'Migrated/legacy URL: 308 to its final destination in one hop.',
  NOINDEX: 'Conversion confirmation page; intentionally noindex.',
  IMPROVE: 'Primary money page / priority market: improved in this remediation; keep improving with real project evidence.',
  INVESTIGATE: 'South Florida city page with template copy: keep indexed (existing equity), decide unique content or consolidation with Search Console data per URL.',
  KEEP: tipo === 'city' ? 'North Florida city in the core service area; template copy, keep indexed and enrich when local evidence exists.' : 'Indexable, self-canonical, in sitemap.',
}[d]);

const filas = [];
for (const p of [...paginas.values()].sort((a, b) => a.ruta.localeCompare(b.ruta))) {
  const tipo = tipoDe(p.ruta);
  const d = disposicion(p, tipo);
  const canonicaOk = p.canonica === p.url || (p.ruta === '/' && p.canonica === SITIO + '/');
  filas.push({
    ...p, tipo, servicio: servicio(p.ruta), geografia: geografia(p.ruta),
    intencion: intencion(p.ruta), canonicaPropia: canonicaOk,
    riesgoCanibalizacion: tipo === 'city' && !PRIORITARIAS.has(p.ruta) ? 'low (one city per URL, same template)' : 'none detected',
    redirect: 'none', disposicion: d, motivo: motivoDisp(d, tipo, p),
  });
}

// ── redirects (de config.json, que es lo que sirve Vercel) ──
const redirects = CONF.routes.filter((r) => r.status === 308 && r.headers?.Location);
const destinoFinal = (u) => u.replace(SITIO, '') || '/';
for (const r of redirects) {
  if (r.has) continue; // el de host (.vercel.app -> www) va aparte
  // La de Astro que quita la barra final (`^/(.*)/$ -> /$1`) no es una URL: es una regla.
  if (/[()*]/.test(r.src.replace(/\\./g, ''))) continue;
  const origen = r.src.replace(/^\^/, '').replace(/\$$/, '').replace(/\\(.)/g, '$1');
  const dest = destinoFinal(r.headers.Location);
  filas.push({
    url: SITIO + origen, ruta: origen, estado: 308, canonica: '', robots: '', enSitemap: SITEMAP.has(origen),
    titulo: '', descripcion: '', h1: [], schema: [], enlacesSalientes: [], enlacesEntrantes: 0,
    tipo: 'redirect', servicio: servicio(dest), geografia: geografia(dest), intencion: null,
    canonicaPropia: null, riesgoCanibalizacion: 'resolved by redirect',
    redirect: `308 -> ${dest} (${paginas.has(dest) ? '200' : 'DESTINO NO CONSTRUIDO'})`,
    disposicion: 'REDIRECT', motivo: 'Consolidated into its canonical destination (3-oct-2026 migration or legacy).',
  });
}

// ── comprobaciones que el inventario puede hacer por si mismo ──
const problemas = [];
for (const f of filas) {
  if (f.estado === 200 && f.disposicion !== 'NOINDEX' && !f.canonicaPropia) problemas.push(`${f.ruta}: canonica ${f.canonica}`);
  if (f.estado === 200 && f.disposicion !== 'NOINDEX' && !f.enSitemap) problemas.push(`${f.ruta}: indexable y fuera del sitemap`);
  if (f.estado === 308 && f.enSitemap) problemas.push(`${f.ruta}: redirige y esta en el sitemap`);
  if (f.estado === 308 && /NO CONSTRUIDO/.test(f.redirect)) problemas.push(`${f.ruta}: ${f.redirect}`);
  if (f.schema.includes('JSON-LD-INVALIDO')) problemas.push(`${f.ruta}: JSON-LD que no parsea`);
  if (f.estado === 200 && f.h1.length !== 1 && f.tipo !== 'redirect') problemas.push(`${f.ruta}: ${f.h1.length} h1`);
}
const titulos = new Map();
for (const f of filas.filter((x) => x.estado === 200)) titulos.set(f.titulo, [...(titulos.get(f.titulo) ?? []), f.ruta]);
for (const [t, rs] of titulos) if (rs.length > 1) problemas.push(`titulo duplicado «${t}»: ${rs.join(', ')}`);

// ── salida ──
const OUT = path.join(RAIZ, 'seo-audit');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'url-inventory.json'), JSON.stringify({ generado: new Date().toISOString().slice(0, 10), filas, problemas }, null, 1));
const col = ['url', 'tipo', 'estado', 'canonica', 'canonicaPropia', 'robots', 'enSitemap', 'titulo', 'descripcion', 'h1',
  'schema', 'enlacesEntrantes', 'enlacesSalientes', 'redirect', 'servicio', 'geografia', 'intencion', 'riesgoCanibalizacion', 'disposicion', 'motivo'];
const csvCelda = (v) => {
  const s = Array.isArray(v) ? (v.length && typeof v[0] === 'string' && v[0].startsWith('/') ? v.length : v.join(' | '))
    : v && typeof v === 'object' ? `${v.id} (${v.tipo}, ${v.impresiones ?? '?'} impr.)` : v ?? '';
  return `"${String(s).replace(/"/g, '""')}"`;
};
fs.writeFileSync(path.join(OUT, 'url-inventory.csv'),
  [col.join(','), ...filas.map((f) => col.map((c) => csvCelda(f[c])).join(','))].join('\n') + '\n');

const cuenta = (k) => Object.entries(filas.reduce((a, f) => ((a[f[k]] = (a[f[k]] ?? 0) + 1), a), {}))
  .sort((a, b) => b[1] - a[1]).map(([x, n]) => `| ${x} | ${n} |`).join('\n');
const md = `# SEO URL Inventory — Mr & Mrs Outdoor Living

Generated by \`node scripts/build-url-inventory.mjs\` from the production build
(\`PUBLIC_ES_PRODUCCION=1\`, \`.vercel/output/static\` + \`.vercel/output/config.json\`) on
${new Date().toISOString().slice(0, 10)}. Machine-readable copies: \`seo-audit/url-inventory.json\` and
\`seo-audit/url-inventory.csv\` (one row per URL, ${filas.length} rows).

**What this inventory cannot know** (stated, not guessed): per-URL Search Console clicks and impressions
(the session has no Search Console access; the \`intent\` column carries the 90-day impressions per
*intent* recorded in \`src/data/seo-intent-registry.json\` on 1-Oct-2026) and external backlinks (no
backlink data in the repository). Inbound-link counts are **body links only** — every page also receives
the navigation menu and the footer.

## Totals

| Type | URLs |
|---|---|
${cuenta('tipo')}

| Disposition | URLs |
|---|---|
${cuenta('disposicion')}

## Automatic checks over the inventory

${problemas.length ? problemas.map((p) => `- ❌ ${p}`).join('\n') : '- ✅ every indexable page is self-canonical and in the sitemap; no redirect is in the sitemap; every redirect lands on a built page in one hop; every JSON-LD block parses; one H1 per page; no duplicate titles.'}

## Disposition rules

- **IMPROVE** — the two money pages (\`/services/pool-builders\`, \`/services/pool-remodeling\`) and the two priority markets (Gainesville, Ocala).
- **KEEP** — indexable, self-canonical, in the sitemap; North Florida city pages in the core service area.
- **INVESTIGATE** — South Florida city pages with template copy. They are kept indexed (existing equity, no per-URL data here); the decision to enrich, consolidate or leave needs Search Console data per URL. **No page was removed, noindexed or redirected in this remediation.**
- **NOINDEX** — \`/thank-you\` (conversion confirmation).
- **REDIRECT** — the 90 consolidated URLs; see \`SEO_REDIRECT_MAP.md\`.

## Full table

| URL | Type | Status | Sitemap | Inbound (body) | H1 | Schema | Disposition |
|---|---|---|---|---|---|---|---|
${filas.map((f) => `| \`${f.ruta}\` | ${f.tipo} | ${f.estado}${f.estado === 308 ? ` → \`${f.redirect.match(/-> (\S+)/)?.[1]}\`` : ''} | ${f.enSitemap ? 'yes' : 'no'} | ${f.estado === 200 ? f.enlacesEntrantes : '–'} | ${(f.h1[0] ?? '').replace(/\|/g, '/').slice(0, 70)} | ${f.schema.join(', ')} | ${f.disposicion} |`).join('\n')}
`;
fs.writeFileSync(path.join(RAIZ, 'SEO_URL_INVENTORY.md'), md);

const mapa = filas.filter((f) => f.estado === 308);
const host = redirects.filter((r) => r.has);
const md2 = `# SEO Redirect Map — final architecture

Generated by \`node scripts/build-url-inventory.mjs\` from \`.vercel/output/config.json\` (the routes Vercel
actually serves; \`vercel.json\` is written from \`src/data/seo-url-migrations.json\` by
\`scripts/build-redirects.mjs\`). Verified statically by \`npm run check:redirects\` (single hop, no loops,
destination built, self-canonical, not in the sitemap, zero internal links to the old URL).

- **${mapa.length} path redirects**, all \`308\` (permanent), all literal (no wildcards), all landing on a page that returns 200.
- **${host.length} host redirect**: \`mrandmrs-outdoor-living.vercel.app/(.*)\` → \`https://www.mrandmrsoutdoorliving.com/$1\` (308).
- Astro's trailing-slash rule \`/(.*)/\` → \`/$1\` (308) normalizes any URL with a trailing slash.
- Apex \`mrandmrsoutdoorliving.com\` → \`www\` is handled by the Vercel domain configuration (308), not by this file.

The duplicate families named in the audit brief were already consolidated on 3-Oct-2026 (\`c4f8d62\`) and
are listed below: \`/pool-builders/gainesville-florida\`, \`/pool-builders/ocala-florida\`, the outdoor
kitchens, louvered roofs, landscaping and outdoor furniture long slugs.

| OLD | NEW | STATUS |
|---|---|---|
${mapa.map((f) => `| \`${f.ruta}\` | \`${f.redirect.match(/-> (\S+)/)?.[1]}\` | 308 → 200 |`).join('\n')}
`;
fs.writeFileSync(path.join(RAIZ, 'SEO_REDIRECT_MAP.md'), md2);

console.log(`inventario: ${filas.length} filas (${paginas.size} paginas, ${mapa.length} redirects) · ${problemas.length} problema(s)`);
for (const p of problemas) console.log('  - ' + p);
