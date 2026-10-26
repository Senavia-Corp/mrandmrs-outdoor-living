# SEO Implementation — Final Report

**Project:** Mr. & Mrs. Outdoor Living, https://www.mrandmrsoutdoorliving.com/
**Date:** 4-Oct-2026
**Merged and deployed:** [Senavia-Corp/mrandmrs-outdoor-living#42](https://github.com/Senavia-Corp/mrandmrs-outdoor-living/pull/42) → `main` @ `b005bdf` (Vercel Git integration). Verified live the same day (§24).

Companion files:
- `SEO_CHANGELOG.md`
- `SEO_REQUIRES_CLIENT_DATA.md`
- `SEO_REDIRECT_MAP.md`
- `SEO_URL_INVENTORY.md`
- `seo-audit/url-inventory.{json,csv}`
- `seo-audit/claim-verification.md`
- `seo-audit/blog-inventory.md`
- `seo-audit/network-assets-*.md`
- `seo-audit/lighthouse/summary.md`
- `seo-audit/qa/` (42 responsive captures + `qa-responsive.json`)

Engineering log (Spanish): `MIGRACION-LOG.md` → «SEO-REMEDIACIÓN».

**How numbers were produced.** Every number here comes from a command named next to it, run against the production build (`PUBLIC_ES_PRODUCCION=1 MM_SANITY_CACHE=1 npm run build`, `.vercel/output/static`). Lab Lighthouse 13 ran locally with simulated mobile throttling.

Two caveats are stated up front because they matter for reading the performance tables:

1. **Lab LCP varies a lot run to run.** Lighthouse's simulation swings widely on identical code: the home page measured between 2.3 s and 7.1 s on the same build. Medians of 5 runs are reported, and per-run data is in `seo-audit/lighthouse/summary.md`.
2. **The lab browser has no H.264.** It downloaded the WebM where real Chrome would download the MP4. This inflates the *before* page weight slightly and does not affect *after* on mobile, where no video is downloaded at all.

Production Lighthouse/PageSpeed could not be run today: the PSI API daily quota was exhausted, and no browser exists in the external sandbox. Field data (CrUX) needs 28 days.

---

## 1. Executive summary

**Already done before this session.** The six duplicate URL families named in the brief were already consolidated on 3-Oct-2026 with direct 308s:
- `/pool-builders/{gainesville,ocala}-florida`;
- the long outdoor-kitchens, louvered-roofs, landscaping and outdoor-furniture slugs.

This session verified that live: one hop, destination 200, self-canonical, absent from the sitemap. It then fixed what was still open.

**Mobile performance.**
- A multi-MB background video was the LCP on 65 routes; it no longer is. A ~15 KB poster image paints the hero, phones never download video, and desktop gets the video after the page has loaded.
- Initial mobile transfer fell sharply (lab, mobile):

  | Page | Before | After |
  |---|---|---|
  | Home | 16.8 MB | 1.0 MB |
  | Gainesville | 16.5 MB | 1.3 MB |
  | Ocala | 14.0 MB | 1.3 MB |

- 382 large images got responsive variants.

**False local signals removed.**
- All 53 city pages no longer call a shared Florida portfolio "our Gainesville portfolio".
- The 53 invented per-city `LocalBusiness` entities are gone.
- Gainesville and Ocala lead with the pool and cite the four official permit offices.

**Unverified claims removed** from the money pages and `/about`: ~7 % home value, 3–6 months, up to 90 % energy, 4–8 weeks, and five identical FAQ answers. Everything that needs the owner's records is listed, not guessed.

**Accessibility.** Lighthouse Accessibility went from 89–97 to 100 on all 9 measured templates (mobile and desktop). SEO is 100 on all 9 (the blog article was 92).

**Not fully solved.**
- Lab mobile LCP on Pool Builders and Pool Remodeling is still 4–6 s.
- Mobile CLS on home and the city pages stays 0.13–0.16, a pre-existing nav reflow (§7).

## 2. Before vs after scorecard

Scores are a judgement on a 0–100 scale; the evidence column says what supports them. No category is given 100 because none is complete without the owner's data or field metrics.

| Category | Before | After | Evidence | Remaining limitation |
|---|---|---|---|---|
| Technical SEO | 82 | 90 | 90 direct 308s verified live; 0 inventory problems (canonical, sitemap, H1, titles, JSON-LD parse); cache headers; `<main>` | No field CWV yet; lab mobile LCP 4–6 s on two money pages |
| On-page SEO | 78 | 86 | Pool-first H2/intro on Gainesville/Ocala; CTA aligned; no duplicate titles (`check:seo`, inventory) | Secondary service pages untouched |
| Content quality | 70 | 80 | 4 unsourced figures removed; `/about` FAQ rewritten; remodel copy reframed | 44 "rewrite/confirm" claims remain, mostly secondary pages and blog (`claim-verification.md`) |
| Topical authority | 78 | 84 | Footer and city pages put pool construction/remodel first; 47/47 articles link to their money page | Case-study content needs real project data |
| Local SEO | 65 | 78 | Fake per-city entities removed; honest gallery labels; official permit sources; visible breadcrumbs | No verified local project; no GBP/NAP work possible from code |
| E-E-A-T | 62 | 70 | Licence numbers from one source, all 3 in schema; claims inventory | Licence status, insurance, years, team bios: owner input |
| Entity SEO | 70 | 82 | One `#negocio` entity + `WebSite`; the duplicate `Organization` and 53 fake entities are gone | `sameAs` limited to 3 verified profiles |
| AEO readiness | 72 | 80 | Direct answers in money-page and `/about` FAQs; FAQPage 1:1 with visible text | More first-party Q&A needs real timelines/costs |
| GEO readiness | 70 | 78 | Concise, sourced local permit answers; `llms.txt`; consistent entity | Needs first-party project evidence |
| Internal linking | 80 | 84 | Breadcrumbs; footer hierarchy; 0 orphan cities (53/53 linked from their county) | Regional hubs could link cities directly |
| Structured data | 68 | 85 | `Service` per city, `WebSite`, FAQPage fixes, licences in `#negocio`; gate `BLOQUES_SUSTITUIDOS` | Rich Results test after deploy (client action) |
| Page experience | 60 | 74 | Mobile weight −90 % on video pages; About CLS 0.278 → 0; A11y 100 | Lab LCP 4–6 s on Pool Builders/Remodeling; nav CLS 0.13–0.16 |
| CRO / qualified leads | 75 | 80 | Evaluation CTA; homeowner + timeline on `/request-estimated`; secondary services moved below the FAQ | Ads copy must be aligned (client) |
| Authority signals | 55 | 58 | Verified official links; consistent licences | Backlinks, reviews, associations: outside code |

## 3. Critical issues fixed

| # | Original problem | Root cause | Implementation | Validation | Status |
|---|---|---|---|---|---|
| C1 | Mobile LCP was the hero `<video>` (production audit: 11.7 s; lab before: 3.4 s median, up to 10.5 s) | Webflow markup: `autoplay`, no `poster`, no `preload` | `src/lib/video-fondo.mjs` + loader in `Interacciones.astro`: poster `<img>` as LCP, video deferred and desktop-only | `check:video-fondo` (red on `main` with 847 failures → green); live: posters + preload on home/cities; 0 video requests at 360–430 px (`qa-responsive`) | Fixed |
| C2 | ~16 MB initial transfer on video pages | Two autoplay MP4s per page (hero + 3D) | Same as C1; the 3D video loads near the viewport; MP4s re-encoded −13…−35 % | Lab mobile 16.8 MB → 1.0 MB (home) | Fixed |
| C3 | Duplicate URL families (Gainesville, Ocala, 4 service slugs) | Webflow legacy slugs | Already consolidated on 3-Oct (`c4f8d62`) | Live: 308 → 200 in one hop; sitemap 168, 0 legacy | Verified |
| C4 | City pages implied local portfolio work | Sanity copy «Browse our <City> portfolio» over a shared carousel | Template override with honest wording | `check-texto` (declared, derived per city) | Fixed |
| C5 | 53 fake `LocalBusiness` entities | Webflow city template | Replaced by `Service` (provider `#negocio`) | `check:seo` `BLOQUES_SUSTITUIDOS` 54/54 (53 cities + home); live 0 | Fixed |
| C6 | `/about` FAQ: same answer ×5 | Webflow placeholder | `textos-propios.json` + generator | Live: «FAQs – Custom Pool Construction» | Fixed |
| C7 | Unverified figures on money pages | Webflow copy | FAQ substitutions (visible + FAQPage) | `check:seo` `respuestasSustituidas`, `check:ads` | Fixed |
| C8 | Repair-intent copy on the remodel page | Webflow subservice copy | Reframed inside a complete remodel | `check-texto` | Fixed |

## 4. URL changes

No URL was created, removed or redirected in this session. The final redirect architecture (90 path redirects + host redirect, all 308) is in `SEO_REDIRECT_MAP.md`. Key rows:

| OLD | NEW | STATUS |
|---|---|---|
| `/pool-builders/gainesville-florida` | `/services/pool-builders/gainesville-fl` | 308 → 200 (live) |
| `/pool-builders/ocala-florida` | `/services/pool-builders/ocala-fl` | 308 → 200 (live) |
| `/services/custom-outdoor-kitchens-for-north-south-florida-homes` | `/services/outdoor-kitchens` | 308 → 200 (live) |
| `/services/motorized-louvered-roof-systems-in-north-south-florida` | `/services/louvered-roofs` | 308 → 200 (live) |
| `/services/professional-landscaping-services-in-north-south-florida` | `/services/landscaping` | 308 → 200 (live) |
| `/services/premium-outdoor-furniture-for-north-south-florida-homes` | `/services/outdoor-furniture` | 308 → 200 (live) |

## 5. Canonical changes

None needed.
- **Build:** all 167 indexable pages are self-canonical, absolute, HTTPS and `www` (inventory: 0 problems). `/thank-you` is noindex.
- **Preview builds:** emit noindex with no canonical (fail-closed `PUBLIC_ES_PRODUCCION`).
- **Live:** canonicals on the 6 key pages match their URLs.

## 6. Sitemap changes

None needed. 168 `<loc>`, all 200 and self-canonical, 0 redirected or legacy URLs (live and in the build). `lastmod` is not added because there is no reliable per-page modified date.

## 7. Mobile performance

Lab, Lighthouse 13, mobile, simulated throttling, **median of 5 runs**. Before = `main` @ `2b800c7`, after = deployed build. Source: `seo-audit/lighthouse/summary.md`.

| Page | Perf | A11y | BP | SEO | FCP | LCP | CLS | TBT | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| Home | 84 → **89** | 97 → **100** | 96 → 96 | 100 → 100 | 1.66 → 1.66 s | 3.39 → **2.71 s** | 0.148 → 0.159 | 0 → 0 | 16.8 MB → **1.0 MB** |
| Pool Builders | 78 → 76 | 95 → **100** | 96 | 100 | 1.66 → 1.66 s | 5.12 → 5.71 s | 0.125 → **0.095** | 0 | 2.3 MB → **0.9 MB** |
| Gainesville | 78 → **83** | 97 → **100** | 96 | 100 | 1.66 → 1.66 s | 4.59 → **4.06 s** | 0.137 → 0.128 | 0 | 16.5 MB → **1.3 MB** |
| Ocala | 77 → 79 | 97 → **100** | 96 | 100 | 1.66 → 1.66 s | 4.44 → 4.43 s | 0.163 → **0.134** | 0 | 14.0 MB → **1.3 MB** |
| Pool Remodeling | 80 → 79 | 95 → **100** | 96 | 100 | 1.66 → 1.66 s | 4.75 → 5.04 s | 0.095 → 0.095 | 0 | 1.5 MB → **0.8 MB** |
| About | 83 → **97** | 93 → **100** | 96 | 100 | 1.36 → 1.36 s | 2.64 → 2.56 s | 0.278 → **0.000** | 0 | 0.67 → 0.60 MB |

**Reading this honestly.**
- The production audit in the brief (Performance ~73, LCP ~11.7 s, ~10 MB) measured the video-download path that no longer exists on phones.
- **Pool Builders / Pool Remodeling.** The lab LCP did not improve, even though the request graph is lighter. Below-the-fold images on these pages now finish downloading *before* LCP, which the simulation counts against LCP (traced in `lcp-breakdown-insight`: observed LCP ~0.2 s, simulated 5–6 s, same main-thread work). Their hero images now have 640/1024 px variants. Field data (CrUX) is the arbiter.
- **Mobile CLS on home and the city pages** comes from `div.wrapper-menu` (the nav) re-laying out ~150 ms after first paint under 4× CPU throttling. It is not caused by the logo (fixed anyway: it was lazy and unsized), the fonts (an Inter metric fallback was added), external scripts or the marquee: each was ruled out by blocking it in a controlled Playwright run. It is equally present on `main`. **Open item.**

## 8. Desktop performance

Lab, 3 runs, median (after measured on build `f878672`, before the nav-logo/About-hero fix).

| Page | Perf before → after | LCP | CLS | A11y |
|---|---|---|---|---|
| Home | 100 → 100 | 0.49 → 0.53 s | 0.024 → 0.025 | 100 → 100 |
| Gainesville / Ocala | 100 → 100 | 0.49 → 0.53 s | ≤0.025 | 100 → 100 |
| Pool Builders | 99 → 99 | 0.91 → 0.89 s | 0 | 98 → 100 |
| Pool Remodeling | 99 → 99 | 0.96 → 0.97 s | 0 | 98 → 100 |
| About / Projects / Blog / Request estimate | 99–100 → 99–100 | ≤0.97 s | 0 | 93–99 → **100** |

Desktop stays at 99–100. The desktop video still plays, after load.

## 9. Image optimization

**Responsive variants.**
- `scripts/build-variantes-imagen.mjs` created 640/1024 px variants for 382 local images: those over 150 KB and 1000 px served without `srcset`, plus LCP/eager images over 40 KB.
- That is 753 files, 54 MB in the repo.
- `src/lib/srcset-auto.mjs` adds `srcset` with the original as the largest candidate and `sizes="100vw"`, so quality never drops below today's.
- Gate: `check:variantes`.

**Video posters.** AVIF/WebP at 640/960/1280 px, plus a 9:16 phone crop at native resolution, generated from Webflow's own first-frame posters.

**LCP / layout fixes.**
- The `/about` hero was `loading="lazy"` and unsized: now eager, `fetchpriority="high"`, 1454×900.
- The nav logo was lazy and unsized: now eager, 193×61.

**Alt text.** No changes; nothing was keyword-stuffed.

## 10. Video optimization

- **Hero and 3D videos:** never on phones, reduced-motion or Save-Data. Desktop gets them after load (hero) or near the viewport (3D); they pause off-screen; the pause button appears only when a video exists.
- **MP4s re-encoded** (H.264, CRF 27, faststart, no audio; same resolution and duration):

  | Video | Before | After |
  |---|---|---|
  | `bg-video-1` (home hero) | 7.07 MB | 6.15 MB |
  | `bg-video` (city hero) | 7.42 MB | 5.88 MB |
  | `bg-video-3d` | 6.34 MB | 4.15 MB |

  The asset manifest was updated and the re-encodes are declared in `check-assets.mjs`.
- **WebM** is kept as a typed fallback (Chromium builds without H.264).
- **No `VideoObject` schema:** the videos are decorative backgrounds, not project content.

## 11. Technical SEO

- `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` on `/videos`, `/images` and `/fonts` (live).
- Heading levels that skip get `aria-level` (`src/lib/niveles-titulo.mjs`).
- `<main>` landmark on every page without one.
- **New gates:** `check:video-fondo`, `check:identidad`, `check:variantes`. All were proven red once.
- **CSS budget** raised to the size of `webflow.css` (167 KB; 70 KB free) at Sebastian's request.

## 12. Gainesville improvements

- **Headings:** H1 "Custom Pool Builders In Gainesville, Florida" (kept). The intro H2 is now "Custom Pool Design & Construction In Gainesville, Florida" and the paragraph leads with the pool process.
- **CTA and breadcrumb:** "Request a Design-Build Project Evaluation" on the hero, form and closers; visible breadcrumb Home / Pool Builders / Gainesville, FL.
- **Permit FAQ:**
  - explains City of Gainesville vs. unincorporated Alachua County;
  - covers the barrier review under the Residential Swimming Pool Safety Act and the septic/well separation;
  - links the City of Gainesville residential pool checklist and the Alachua County in-ground pool checklist (verified 4-Oct-2026).
- **Project evidence:** the carousel says "Featured Custom Pool Projects / Selected custom pool and outdoor living projects from our Florida portfolio…". No project is attributed to Gainesville because none is verified.
- **Page order:** secondary services (the gallery band and the 14-service panel) moved below the FAQ.
- **Schema:** `Service` with `areaServed` City Gainesville in Alachua County; FAQPage.

## 13. Ocala improvements

The same template changes as Gainesville:
- **Intro H2:** "Custom Pool Design & Construction In Ocala, Florida".
- **Permit FAQ:** City of Ocala Building Services vs. Marion County Building Safety, plus the limestone and septic notes, with both official pages linked.

## 14. Pool Builders improvements

- **FAQ:** the "approximately 7 %" home-value and "three to six months" answers were replaced with verifiable answers (visible + FAQPage). The generator now matches FAQ substitutions by question name.
- **CTA:** hero, form and services grid use the evaluation CTA.
- **Hero image:** responsive variants added.
- **Internal links:** Gainesville and Ocala are linked from the footer on every page.

## 15. Pool Remodeling improvements

- **FAQ answers replaced:**
  - "Up to 90 %" energy → cites §553.909, F.S. (two-speed pumps of 1 hp or more);
  - "four to eight weeks" → a schedule given in writing for the assessed scope.
- **Repair-intent copy reframed** inside a complete renovation: the structural and equipment cards, plus the "Structural Pool Repairs" and "Pool Equipment Upgrades" summaries.
- **CTA:** the evaluation CTA.

## 16. E-E-A-T improvements

- `src/lib/identidad.mjs` is the single source of the licence numbers. `#negocio` now publishes all three, matching the footer, and `check:identidad` enforces it.
- `/about`: licence line aligned; FAQ answers are factual.
- Claims inventory: `seo-audit/claim-verification.md` (368 distinct sentences, each classified).
- The Sanity `project` schema is ready for real case studies (§25 of the changelog). There is still no data to publish.

## 17. AEO / GEO improvements

- FAQ answers on the money pages, city pages and `/about` open with the direct answer, contain no invented figures, and match their FAQPage 1:1 (`check:ads` rule 14).
- Local permit answers cite official sources, which makes them extractable and verifiable facts.
- **Entity graph:** one `#negocio` plus `WebSite` (home), `Service` (cities), `BreadcrumbList` and FAQPage.

## 18. Internal linking

- **Footer:**
  - Gainesville, Ocala, All North/South Florida Areas and All Service Areas, instead of 53 cities;
  - all 53 cities stay linked from their county page bodies (53/53 measured);
  - the services column leads with pool construction and remodeling.
- **Breadcrumbs:** visible on all city pages, from the same function as the `BreadcrumbList`.
- **Blog:** 47/47 articles link to their money page (`seo-audit/blog-inventory.md`).
- **Redirect links:** 0 internal links through redirects (`check:enlaces`, `check:redirects`).

## 19. Schema changes

| Node | Where | Change |
|---|---|---|
| `LocalBusiness #negocio` | all pages | `identifier` now lists all 3 licences with generic descriptions |
| `WebSite #website` | home | replaces a duplicate `Organization` (no `@id`, relative URL, half address) |
| `Service <url>#servicio` | 53 city pages | replaces the per-city `LocalBusiness` (city as business name, empty `geo`, `priceRange $$$$`) |
| `FAQPage` | `/about`, Pool Builders, Pool Remodeling, Gainesville, Ocala | answers rewritten to match the visible text |
| Review / AggregateRating | — | still none (not eligible) |

## 20. CRO improvements

- **Primary CTA** "Request a Design-Build Project Evaluation" on home, the 2 pool money pages and the 53 cities. "Free estimate, no obligation" stays in the form intro, and the nav and footer keep "Get a Free Estimate".
- **`/request-estimated`:**
  - optional homeowner and timeline questions (the same options as the landing forms, whitelisted in the form API);
  - a labelled budget select;
  - unique checkbox ids.
- **Tracking:** untouched (GTM, Ads, `generate_lead`); `check:medicion` and `check:aviso` are green.

## 21. Accessibility improvements

Lighthouse Accessibility went from 89–97 to **100** on all 9 templates, mobile and desktop:
- `<main>` landmark;
- heading order;
- footer touch targets (24 px, no overlap);
- the select label;
- descriptive "Read More" links (hidden `: <title>` suffix).

## 22. Remaining business-owner inputs

See `SEO_REQUIRES_CLIENT_DATA.md` (30 items). The most valuable:

| Item | Ref |
|---|---|
| Licence status and class (SCC131153553 was not found publicly) | #1 |
| Insurance | #2 |
| Warranties | #8 |
| Real timelines | #9 |
| Any verified Gainesville/Ocala project | #17 |
| Project cities | #18 |
| Team bios | #4 |
| Unsourced percentages on secondary service pages | #14 |

## 23. Remaining external dependencies

**Search Console:**
- resubmit the sitemap;
- inspect the 4 paid landing pages;
- run Rich Results tests for the `Service`, FAQPage and `WebSite` nodes.

**Google Ads:**
- Final URLs and ad-copy alignment with the new CTA;
- GTM container import (`gtm-container.json`) and the hostname filter.

**Other:**
- **CrUX:** field data after 28 days.
- **PageSpeed Insights:** quota exhausted today.
- **Sanity Studio:** deploy it to expose the new project fields.
- **Backlinks and GBP:** outside the repository.

## 24. Final QA results

**Build.** `PUBLIC_ES_PRODUCCION=1 MM_SANITY_CACHE=1 npm run build`: exit 0, 169 HTML files, 91 redirects + 4 header blocks injected.

| Gate | Result |
|---|---|
| `check:tokens` | green (97.0 of 167 KB) |
| `check:rutas`, `check:enlaces`, `check:redirects` | green |
| `check:seo` | green — `BLOQUES_SUSTITUIDOS` 54/54 |
| `check:medicion`, `check:ads`, `check:aviso`, `check:estimador` | green |
| `check:estructura`, `check:estructura:ciudades`, `check:galeria-obra`, `check:encabezados`, `check:captacion` | green |
| `check:video-fondo`, `check:identidad`, `check:variantes` (new) | green; each proven red once |
| `check:assets` | steps 1–4 green; step 5 not run (needs `_source/sanity-masters/`, absent here — same as before) |
| `check:texto` (browser) | full run **114/115 identical**; the 1 red is `/blogs-tips`, **also red on `main`** (measured on main's build in a worktree): pre-existing, not touched |
| `check:menu`, `check:galeria`, `check:galeria-formulario` (browser) | green |
| `check:ix2`, `check:carrusel`, `check:cascaron` | not run this session (`cascaron` needs the Sanity API, blocked in this container) |
| `check:visual` | **not re-baselined**: expected red where the layout changed on purpose (footer on all pages, city pages, home hero). Needs Sebastian's approval of the captures |
| URL inventory | 258 rows, **0 problems** |
| Responsive QA (`scripts/qa-responsive.mjs`, 6 routes × 7 widths 360–1920) | **0 issues**: no horizontal overflow, no first-party console errors, no video requests below 768 px |

**Live, after deploy** (external sandbox, `curl`):
- 10 legacy URLs → 308 → 200 in one hop.
- Sitemap: 168 `<loc>`, 0 legacy.
- Hosts: `.vercel.app` → 308 www; apex → 308 www.
- Video posters and preload on home/cities; `<main>`, canonicals, CTA and footer as built.
- `/about` FAQ heading and licences correct.
- `Cache-Control` on `/videos` and `/images/site/posters`.

## 25. Files modified

See `SEO_CHANGELOG.md` for the purpose of each.

**New:**
- `src/lib/`: `video-fondo.mjs`, `srcset-auto.mjs`, `niveles-titulo.mjs`, `identidad.mjs`, `pie.mjs`, `miga-tramos.mjs`
- `src/components/MigaVisible.astro`
- `src/styles/video-fondo.css`
- `src/data/`: `textos-propios.json`, `variantes-imagen.json`
- `scripts/`:
  - `build-posters-video.mjs`, `build-variantes-imagen.mjs`
  - `check-video-fondo.mjs`, `check-identidad.mjs`
  - `build-url-inventory.mjs`, `build-blog-inventory.mjs`
  - `claims-grep.mjs`, `informe-red.mjs`, `qa-responsive.mjs`
- `public/images/site/posters/*` and `public/images/**/*-mm640|1024.*`
- `seo-audit/*` and the `SEO_*.md` reports

**Changed — layout and components:**
- `src/layouts/Base.astro`
- `src/components/`: `Interacciones.astro`, `Footer.astro`, `Nav.astro`, `widgets/FormularioCore.astro`

**Changed — pages:**
- `src/pages/services/pool-builders/[slug].astro`
- `src/pages/index.astro`
- `src/pages/blogs/[slug].astro`
- the generated `about`, `pool-builders`, `pool-remodeling` and `request-estimated` pages

**Changed — libraries and data:**
- `src/lib/`: `negocio.mjs`, `captacion-ciudad.mjs`
- `src/data/`: `captacion-servicios.json`, `ciudades-captacion.json`, `seo-pool-builders.json`
- `src/pages/api/formulario.ts`
- `src/styles/propio.css`
- `studio/schemaTypes/project.ts`
- `public/videos/*.mp4`
- `_source/assets-manifest.json`

**Changed — scripts and config:**
- `scripts/`:
  - `build-paginas.mjs`, `build-captacion-ciudades.mjs`, `build-vercel-config.mjs`
  - `check-texto.mjs`, `check-seo.mjs`, `check-estructura-ciudades.mjs`, `check-assets.mjs`, `check-tokens.mjs`
- `vercel.json`
- `package.json`
- `MIGRACION-LOG.md`
