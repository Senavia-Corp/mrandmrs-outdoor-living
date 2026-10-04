#!/usr/bin/env node
/**
 * VERIFICACION DE AFIRMACIONES — cada promesa o cifra que el sitio publica, con su estado.
 *
 *     node scripts/claims-grep.mjs        ->  seo-audit/claim-verification.md
 *
 * SEO-REMEDIACION (4-oct-2026). Recorre el TEXTO VISIBLE y el JSON-LD de las paginas construidas
 * (`.vercel/output/static`) buscando la familia de afirmaciones que el encargo pide auditar
 * (experiencia, licencias, seguro, premios, superlativos, garantias, ahorro, plazos, recuentos,
 * promesas de servicio). Agrupa por frase y cuenta paginas. La CLASIFICACION la pone la tabla
 * `REGLAS` de abajo, escrita a mano y con su porque: el script mide donde sale cada cosa, no
 * decide si es verdad.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ESTATICO = path.join(RAIZ, '.vercel/output/static');

/** patron -> [clasificacion, nota]. La primera que case gana. */
const REGLAS = [
  [/CPC1461119|CPC1460562|SCC131153553/, 'BUSINESS CONFIRMATION REQUIRED',
    'Licence numbers published on every page. Public records (4-Oct-2026 search) list CPC1461119 and CPC1460562 as Florida pool contractor licences; SCC131153553 was not found and its class is described two different ways on the site ("Structural" on /about, "aluminum contractor" on the pergola page). Owner to confirm all three are active, held by the company/qualifier, and the correct class. Single source: src/lib/identidad.mjs.'],
  [/insured/i, 'BUSINESS CONFIRMATION REQUIRED', 'Insurance in force (general liability and workers’ comp) not verifiable from the repository. Kept as published.'],
  [/licensed/i, 'VERIFIED (licence numbers published) — status to confirm', 'Claim of licensure is backed by published licence numbers; current status still needs DBPR confirmation.'],
  [/decades|years of (combined )?experience|since \d{4}/i, 'BUSINESS CONFIRMATION REQUIRED', 'Years in business / experience not documented anywhere in the repository.'],
  [/former professional athletes/i, 'BUSINESS CONFIRMATION REQUIRED', 'Biographical claim on /about; needs owner confirmation (and ideally named team bios).'],
  [/best investment\?/i, 'VERIFIED (question wording)', 'Reader question in a blog FAQ, not a superlative claim about the company.'],
  [/award|top[- ]rated|#1|number one|best in/i, 'REMOVE if present', 'No award or ranking is documented.'],
  [/\$\d/, 'VERIFIED (estimator table)', 'Price inputs of the cost estimator, from the approved estimator table (scripts/check-estimador.mjs).'],
  [/warrant/i, 'BUSINESS CONFIRMATION REQUIRED', 'Warranty terms not documented. The /about FAQ question about warranties was replaced; manufacturer warranty mentions on product pages need the manufacturer source.'],
  [/guarantee/i, 'BUSINESS CONFIRMATION REQUIRED', 'No written guarantee documented.'],
  [/24 hours/i, 'BUSINESS CONFIRMATION REQUIRED', '"We call you back within 24 hours" is a service promise approved earlier (R17/R20); owner to confirm it is met.'],
  [/fixed project price|fixed price/i, 'BUSINESS CONFIRMATION REQUIRED', '"Fixed project price in writing" is a contractual promise; owner to confirm it reflects the contract.'],
  [/\d+\s?%/, 'REWRITE / CONFIRM', 'Percentage claims need a cited source. The two money-page FAQ figures (~7 % home value, up to 90 % energy) were removed in this remediation.'],
  [/\b\d+\s*(to|-|–)\s*\d+\s*(weeks|months)\b|three to six months|four to eight weeks/i, 'REWRITE / CONFIRM', 'Timelines need the owner’s real project data. The two money-page FAQ timelines were replaced by a process sequence.'],
  [/financing/i, 'VERIFIED (generic wording)', 'Financing is offered through lending partners; no rates, terms or partner names published (TILA/Reg Z decision 2-Sep-2026).'],
  [/3d (design|render)/i, 'BUSINESS CONFIRMATION REQUIRED', 'Site states every custom pool starts with a 3D design; owner to confirm it applies to every project.'],
];

const PATRON = /[^.!?\n]*(CPC1461119|CPC1460562|SCC131153553|licensed|insured|decades|years of (?:combined )?experience|since \d{4}|former professional athletes|award|top[- ]rated|#1|number one|best in|warrant\w*|guarantee\w*|24 hours|fixed (?:project )?price|\d+\s?%|\b\d+\s*(?:to|-|–)\s*\d+\s*(?:weeks|months)\b|three to six months|four to eight weeks)[^.!?\n]*[.!?]?/gi;

const ficheros = [];
(function recorre(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['_astro', 'images', 'videos', 'fonts'].includes(e.name)) recorre(p); }
    else if (e.name.endsWith('.html')) ficheros.push(p);
  }
})(ESTATICO);

const frases = new Map();
for (const f of ficheros) {
  const ruta = '/' + path.relative(ESTATICO, f).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
  const doc = new JSDOM(fs.readFileSync(f, 'utf8')).window.document;
  doc.querySelectorAll('script:not([type="application/ld+json"]), style, noscript, select').forEach((n) => n.remove());
  /* Texto POR ELEMENTO (los que no tienen hijos de bloque), no el `textContent` del body: este
   * pega parrafos vecinos sin separador y parte mal las frases. Y del JSON-LD, sus cadenas. */
  const trozos = [...doc.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, figcaption, blockquote, label, a, div, span')]
    .filter((e) => ![...e.children].some((c) => /^(P|DIV|UL|OL|LI|H[1-6]|TABLE|SECTION)$/.test(c.tagName)))
    .map((e) => e.textContent);
  for (const sc of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      (function cadenas(o) {
        if (typeof o === 'string') trozos.push(o);
        else if (o && typeof o === 'object') Object.values(o).forEach(cadenas);
      })(JSON.parse(sc.textContent));
    } catch { /* un bloque roto ya lo cuenta check-seo */ }
  }
  const texto = [...new Set(trozos.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))].join('\n');
  for (const m of texto.matchAll(PATRON)) {
    const frase = m[0].replace(/\s+/g, ' ').trim().slice(0, 220);
    if (frase.length < 8) continue;
    const e = frases.get(frase) ?? { rutas: new Set() };
    e.rutas.add(ruta);
    frases.set(frase, e);
  }
}

const clasifica = (fr) => REGLAS.find(([re]) => re.test(fr)) ?? [null, 'REVIEW', ''];
const filas = [...frases].map(([frase, e]) => {
  const [, clase, nota] = clasifica(frase);
  return { frase, clase, nota, paginas: e.rutas.size, ejemplo: [...e.rutas].sort()[0] };
}).sort((a, b) => a.clase.localeCompare(b.clase) || b.paginas - a.paginas);

const resumen = Object.entries(filas.reduce((a, f) => ((a[f.clase] = (a[f.clase] ?? 0) + 1), a), {}));
const md = `# Claim Verification — Mr & Mrs Outdoor Living

Generated by \`node scripts/claims-grep.mjs\` over the production build (visible text + JSON-LD of
${ficheros.length} HTML files) on ${new Date().toISOString().slice(0, 10)}. One row per distinct sentence; "pages" is
how many pages publish it. The classification comes from a hand-written rule table in the script
(each rule states why); the script only measures where each claim appears.

**Nothing in this table was invented or "verified" by assumption.** VERIFIED means the claim is
supported by information already published and checkable (e.g. a licence number); everything that
depends on the owner's records is BUSINESS CONFIRMATION REQUIRED and is carried to
\`SEO_REQUIRES_CLIENT_DATA.md\`.

## Changes made in this remediation (claims removed or rewritten)

| Where | Was | Now |
|---|---|---|
| \`/services/pool-builders\` FAQ (+ FAQPage) | "can increase Florida home value by approximately 7%" | No percentage; what a permitted, documented build gives a buyer/appraiser |
| \`/services/pool-builders\` FAQ (+ FAQPage) | "typically takes three to six months" | Project-specific schedule + the construction sequence |
| \`/services/pool-remodeling\` FAQ (+ FAQPage) | "reduce energy use by up to 90%" | No percentage; cites the Florida two-speed pump requirement (§553.909, F.S.) |
| \`/services/pool-remodeling\` FAQ (+ FAQPage) | "four to eight weeks" | Schedule given in writing for the assessed scope |
| \`/services/pool-remodeling\` cards | "Structural Pool Repairs … cracks, leaks", "We swap single-speed pumps…" | Framed as part of a complete renovation |
| \`/about\` FAQ (+ FAQPage) | Five questions with the same commercial answer, incl. "Do you provide warranties? — Yes…" | Five distinct answers from facts published elsewhere; warranty question removed (no documented warranty) |
| \`/about\` | Licences "CPC1460562 & SCC131153553" | Same three numbers as the footer |
| Home hero badge | "Licensed & Insurance" | "Licensed & Insured" (typo; insurance status still to confirm) |
| 53 city pages | "Browse our <City> portfolio of waterfront pools…" | "Selected custom pool and outdoor living projects from our Florida portfolio…" (no project has a verified city) |

## Summary

| Classification | Distinct sentences |
|---|---|
${resumen.map(([c, n]) => `| ${c} | ${n} |`).join('\n')}

## Inventory

| Classification | Pages | Example page | Sentence | Note |
|---|---|---|---|---|
${filas.map((f) => `| ${f.clase} | ${f.paginas} | \`${f.ejemplo}\` | ${f.frase.replace(/\|/g, '/')} | ${f.nota} |`).join('\n')}
`;
fs.mkdirSync(path.join(RAIZ, 'seo-audit'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'seo-audit/claim-verification.md'), md);
console.log(`claims: ${filas.length} frases distintas en ${ficheros.length} paginas`);
for (const [c, n] of resumen) console.log(`  ${c}: ${n}`);
