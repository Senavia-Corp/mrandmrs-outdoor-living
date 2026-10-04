# SEO Changelog — remediation of 4-Oct-2026

Branch `claude/fervent-planck-ofawfo` on top of `main` @ `2b800c7`. Every entry names the file(s)
and the gate that proves it. Spanish engineering log: `MIGRACION-LOG.md` («SEO-REMEDIACIÓN»).

## Performance — background video (P0)

1. **Poster-first heroes.** `src/lib/video-fondo.mjs` rewrites every `.w-background-video` (121 blocks on 65 routes) when `Base.astro` renders the page:
   - inserts a responsive `<picture>`/`<img class="mm-video-poster">` (AVIF + WebP; a 9:16 crop for phones) with `width`/`height`;
   - `fetchpriority="high"` and a matching `<link rel="preload" as="image">` on heroes; `loading="lazy"` on the 3D section;
   - `<video>`: no `autoplay`, `preload="none"`, sources in `data-src` with `type`;
   - removes the inline `background-image` poster (it was a duplicate download) and the `<noscript>` fallback.
2. **Deferred loader.** `src/components/Interacciones.astro` §5:
   - no video at all below 768 px, with `prefers-reduced-motion`, or with Save-Data;
   - the hero video loads after `load` + idle; the 3D video loads when its section nears the viewport;
   - videos pause off-screen;
   - the pause button stays hidden until there is a video to pause.
3. **Posters.** `scripts/build-posters-video.mjs` (`npm run posters`) generates `public/images/site/posters/*` from Webflow's own first-frame posters (same frame, so there is no jump when the video takes over).
4. **Desktop MP4s re-encoded** (H.264 CRF 27, faststart, no audio track, same 1280×720 / 1280×534):
   - `bg-video-1` 7.07 → 6.15 MB;
   - `bg-video` 7.42 → 5.88 MB;
   - `bg-video-3d` 6.34 → 4.15 MB.
5. **Caching.** `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` for `/videos/*`, `/images/*` and `/fonts/*` (`vercel.json`; `scripts/build-vercel-config.mjs` learned the directory-prefix pattern).
6. **New gate** `scripts/check-video-fondo.mjs` (`npm run check:video-fondo`, inside `npm run check`). Red on `main` with 847 failures, green on this branch.

## Local pages — Gainesville, Ocala and the 51 other city pages (P1)

7. **Primary CTA** is "Request a Design-Build Project Evaluation": hero, form title and closing CTAs. The submit button reads "Request My Project Evaluation", and "Free estimate, no obligation." stays in the form intro.
   - Files: `scripts/build-captacion-ciudades.mjs`, `src/lib/captacion-ciudad.mjs`, `FormularioCore.astro`, `[slug].astro`.
8. **Gainesville/Ocala intro** is pool-first ("Custom Pool Design & Construction In …"). Secondary services are mentioned after the pool process (`src/data/seo-pool-builders.json`).
9. **No false locality.** "Browse our <City> portfolio of waterfront pools…" is replaced on all 53 pages by "Featured Custom Pool Projects / Selected custom pool and outdoor living projects from our Florida portfolio…" (`[slug].astro`).
10. **Layout.** The "Project Gallery" band (pools, pergolas, kitchens, decks…) and the 14-service panel moved **below the FAQ** (`[slug].astro`, `check-estructura-ciudades.mjs`).
11. **Visible breadcrumb** "Home / Pool Builders / <City>, FL" (`src/components/MigaVisible.astro`). It comes from the same function as the `BreadcrumbList` JSON-LD (`src/lib/miga-tramos.mjs`).
12. **Permit FAQ.** "Which office reviews a pool permit in Gainesville/Ocala?" now:
    - names the City vs. unincorporated-county split and the Residential Swimming Pool Safety Act barrier review;
    - shows **visible links to the four official offices**, verified 4-Oct-2026 (`src/data/ciudades-captacion.json`).
13. **Schema.** The 53 fake per-city `LocalBusiness` nodes (city name as business name, empty `geo`, `priceRange $$$$`, relative URL) are replaced by a `Service` node with:
    - `areaServed` City (+ County where verified);
    - `provider` → `#negocio`;
    - an absolute `url` and `@id`.

## Money pages (P1)

14. `/services/pool-builders`:
    - CTA wording;
    - FAQ answers without "approximately 7 %" home value or "three to six months" (visible + FAQPage, `src/data/captacion-servicios.json` `faq.sustituye`);
    - `scripts/build-paginas.mjs` now matches FAQ substitutions by question name.
15. `/services/pool-remodeling`:
    - CTA wording;
    - FAQ without "up to 90 %" energy (cites §553.909, F.S.) or "four to eight weeks";
    - the "Structural Repairs" and "Equipment" cards and their two subservice summaries are reframed inside a complete renovation.

## About, identity, footer, forms (P1)

16. `/about`:
    - the FAQ heading was "Commercial Pool Construction" and all 5 answers were identical; it now has 5 distinct answers built from facts the site already publishes, and the warranty question is replaced (`src/data/textos-propios.json`, applied by `build-paginas.mjs` `textosPropios()`, FAQPage updated);
    - the licence line matches the footer;
    - "…from start to finish ok." typo fixed.
17. **Licence numbers have one source**, `src/lib/identidad.mjs`:
    - `#negocio` now carries all three numbers;
    - the city capture layer reads from it;
    - new gate `scripts/check-identidad.mjs` (`npm run check:identidad`).
18. **Footer** (`src/components/Footer.astro`, `src/lib/pie.mjs`):
    - "Areas We Serve" shows Gainesville, Ocala, All North Florida Areas, All South Florida Areas and All Service Areas instead of 53 city links (all 53 stay linked from their county pages, measured 53/53);
    - pool construction and remodeling lead the services column;
    - the copyright year comes from the build;
    - service/area links are 24 px touch targets without overlap.
19. **Home hero**: "Licensed & Insurance" → "Licensed & Insured"; CTA wording.
20. **`/request-estimated`**:
    - optional "Do you own this property?" and "Project timeline" questions (same options as the landing-page form, whitelisted in `src/pages/api/formulario.ts`);
    - the budget `<select>` gets a real `<label>`;
    - the 14 service checkboxes get unique ids.

## Structured data (P2)

21. **Home.** The duplicate `Organization` (no `@id`, relative URL, half address, Webflow CDN logo) is replaced by `WebSite` (`@id #website`, `publisher` → `#negocio`).
22. **`check-seo.mjs`** gains a fourth declaration category, `BLOQUES_SUSTITUIDOS` (old type in the baseline → new type in the build, validated), plus multi-answer FAQ substitutions (`respuestasSustituidas`).

## Accessibility and best practices (P2)

23. **`<main>` landmark** on every page that did not have one (`Base.astro`); the band-seam CSS that depended on sibling order is covered (`propio.css`).
24. **Heading levels that skip** (e.g. `h1` → `h4.heading-logos`) get `aria-level` = previous + 1 (`src/lib/niveles-titulo.mjs`). The visual style is untouched.
25. **Blog "Most Read Articles"** buttons get a visually hidden `: <title>` suffix, so the link text is descriptive (Lighthouse `link-text`, SEO 92 → 100 on articles).

## Sanity (P1)

26. **`studio/schemaTypes/project.ts`**: optional case-study fields:
    - `projectType`, `projectStatus`;
    - `relatedService`, `relatedLocation`;
    - `permittingJurisdiction`;
    - `projectSummary`, `homeownerGoal`, `challenge`, `designDecision`;
    - `scope`, `materials`, `features`;
    - `beforeImages`, `progressImages`, `afterImages`;
    - `video`.

    None is required and no page renders them yet. The Studio deploy is pending (client action).

## Reports and tooling

27. `scripts/build-url-inventory.mjs` → `seo-audit/url-inventory.{json,csv}`, `SEO_URL_INVENTORY.md`, `SEO_REDIRECT_MAP.md`.
28. `scripts/claims-grep.mjs` → `seo-audit/claim-verification.md`.
29. `scripts/build-blog-inventory.mjs` → `seo-audit/blog-inventory.md`.
30. `scripts/informe-red.mjs` → `seo-audit/network-assets-*.md`.
31. `scripts/check-texto.mjs` learned every intentional text change from the same data that renders it:
    - hero CTA anchor (`ctaHeroe`);
    - footer (`piePropio`);
    - city band reorder (`bajaBandaCiudad`);
    - About and estimate-form declarations from `textos-propios.json`;
    - optional `MM_TEXTO_DIFF=1` diagnostic dump.
