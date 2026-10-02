# SEO Implementation Audit — Mr & Mrs Outdoor Living

Pre-implementation audit required by the *Final Guide for Safe Implementation* (STEP 2). Written
1-Oct-2026 from the repository on branch `claude/zen-lovelace-9vd0pi` (HEAD `7300075`), the live
Sanity dataset (`m273z6jc/production`, read through the Sanity MCP), Google Search Console
(`sc-domain:mrandmrsoutdoorliving.com`, 2026-07-02 → 2026-09-29), GA4 (`properties/506563956`,
same window) and the Vercel project (`prj_vjnQhNx0pAEV60vOFBc4DsE21Mjz`). Every number below has
the tool that produced it next to it; nothing is estimated.

Companion files: `SEO_CONTENT_INVENTORY.md` (every URL and article with its status),
`SEO_KEYWORD_URL_MAP.md` (one owner per intent), `SEO_BLOG_GAP_ANALYSIS.md` (topic-by-topic
decision), `SEO_INTERNAL_LINKING_MAP.md`, `SEO_HIGH_RISK_CHANGES.md`,
`REQUIRES_CLIENT_CONFIRMATION.md`, `SEO_IMPLEMENTATION_REPORT.md`.

---

## A. Existing architecture

| Layer | What exists | Where |
|---|---|---|
| Framework | Astro 7 (`astro ^7.2.9`), `output: 'static'`, `@astrojs/vercel` adapter, `trailingSlash: 'never'`, `build.format: 'file'` | `astro.config.mjs` |
| Site URL / canonical | `site = PUBLIC_SITE_URL \|\| https://www.mrandmrsoutdoorliving.com`; canonical emitted only when `PUBLIC_ES_PRODUCCION === '1'`, otherwise `noindex,nofollow` | `src/layouts/Base.astro:175-206,346-347` |
| robots / sitemap | Generated at build by `scripts/build-seo-ficheros.mjs`: production = `Allow: /` + sitemap (113 Webflow URLs + 8 declared additions + 34 blog routes = 155); non-production = `Disallow: /` and empty sitemap | `scripts/build-seo-ficheros.mjs` |
| Redirects / headers | 14 permanent redirects + 5 security headers in `vercel.json`; injected into `.vercel/output/config.json` by `scripts/build-vercel-config.mjs` (308). `aRegex()` only accepts plain paths and `/(.*)`; no `has` (host) support yet | `vercel.json`, `scripts/build-vercel-config.mjs` |
| Metadata | Webflow `<head>` replicated per page; overrides live in ONE file, `src/data/meta-propia.json`, read by the layout and enforced by `scripts/check-seo.mjs` | `src/data/meta-propia.json` |
| Structured data | Per-page Webflow JSON-LD (Service/FAQPage/WebPage/BlogPosting…) + injected `LocalBusiness#negocio` (sameAs, telephone, licences, areaServed, **no address/geo/rating by design**) + injected `BreadcrumbList#miga` on every non-home page | `src/lib/negocio.mjs`, `Base.astro:258-276` |
| Templates | 14 `/services/*` (derived from Webflow HTML, strings `T0…T14` + widgets), 53 `/pool-builders/[slug]` (one template, data from Sanity `poolBuilder`), 9 `/country/*`, 2 `/where-we-serve/*`, 15 `/project/*` (10 Webflow + 5 own), 44 `/blogs/[slug]` (Sanity `blogPost`), `/blogs-tips` (Sanity), 3 `/articles/*`, 20 static pages | `src/pages/**` |
| Paid-landing layer | `src/data/captacion-servicios.json` (67 entries) mounts hero copy, trust cards, lead form, investment band and FAQ on the 14 service pages and all 53 cities; the 53 city entries are **generated** from `src/data/ciudades-captacion.json` by `scripts/build-captacion-ciudades.mjs` | those files |
| Sanity | Project `m273z6jc`, dataset `production`, 21 types. Published: 44 `blogPost`, 53 `poolBuilder`, 10 `project`, 14 `service`, 9 `county`, 12 `blogCategory`. 0 blog drafts. Public dataset (anonymous read); write token only in local `.env` | `studio/schemaTypes/*` |
| Blog pipeline | Markdown in `contenido/blog/*.md` → `scripts/publica-blog.mjs` → Sanity (`createOrReplace`, deterministic `_id`); images by reference to `src/data/gallery-procedencia.json` (only `usable: true` photos) via `scripts/build-imagenes-blog.mjs`; routes/sitemap via `scripts/build-blogs-rutas.mjs`; offline build cache `src/data/blogs-sanity.json` (`MM_SANITY_CACHE=1`) | `contenido/BRIEF.md` |
| Blog hub | `/blogs-tips`: 1 featured + 9 visible, category chips and search filter client-side, "Load more" creates **no URLs**; every card `<a href="/blogs/…">` is server-rendered | `src/pages/blogs-tips.astro` |
| Service blog cards | `src/data/blog-por-servicio.json`: exactly 5 cards per service page or declared `pendientes`; 5 of 14 services have their 5 | `src/components/widgets/CarruselBlog.astro` |
| Forms / CRM | `src/pages/api/formulario.ts` (nodemailer → `LEAD_TO`, Turnstile); 6 lead forms; **no Zapier/CRM webhook in the codebase** | `src/pages/api/formulario.ts` |
| Tracking | GTM `GTM-N9BWB3BV` + Google Ads `AW-18420694908` (call conversions with number swap) in `Base.astro`; `generate_lead` pushed on `/thank-you`; `click_to_call`, `estimator_complete`, `brochure_download`, `view_project_gallery` pushed by components | `Base.astro:300-340`, `src/pages/thank-you.astro:158`, `src/components/Formularios.astro` |
| Gates | 15 scripted gates (`check:*`); the 4 browser gates need a visible Chromium and are director-only | `package.json`, `CLAUDE.md` |

### Deployment & indexation control (STEP 20 / guide §2) — verified
- **Production is Vercel.** `www.mrandmrsoutdoorliving.com` is an alias of the production target (branch `main`, deploy `naemqgt3o`, 22-Sep-2026). Apex → www = 308. (`VERCEL_GET_PROJECT2`, `VERCEL_GET_PROJECT_DOMAINS`.)
- `PUBLIC_ES_PRODUCCION` exists only for `production`; previews are `noindex` + empty sitemap. (`VERCEL_FILTER_PROJECT_ENVS`.)
- **`mrandmrs-outdoor-living.vercel.app` is also an alias of production.** It serves the indexable build (canonical → www, `Allow: /`). GA4 shows sessions on 5 `*.vercel.app` hosts. The canonical protects against duplication, but the host should not answer 200 at all → **P1-1**.
- GSC sitemap: `https://mrandmrsoutdoorliving.com/sitemap.xml`, 155 submitted, 0 errors, last downloaded 2026-09-30. The Webflow `page-sitemap.xml` zombie is gone. (`GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS`.)
- URL inspection (www): `/`, remodel hub, `/pool-builders/gainesville-florida`, `/pool-builders/ocala-florida`, permits article, remodel-or-rebuild → **Submitted and indexed**. `/services/custom-pool-spa-builders-in-north-south-florida` → **Discovered – currently not indexed** (P0-1).
- Google's index is still dominated by the apex host and old slugs: apex `/` 2,916 impr, `/where-we-serves/custom-pool-builders-south-florida` 2,558 impr, `/pool-builders/pool-builders-ocala-florida` 470 impr. All redirect 308; consolidation is in progress and is monitored, not forced.

---

## B. Existing content (summary — full table in `SEO_CONTENT_INVENTORY.md`)

| Group | Count | Primary routes |
|---|---|---|
| New Pool hub | 1 | `/services/custom-pool-spa-builders-in-north-south-florida` (paid landing «Pool Builders Core») |
| Remodeling hub | 1 | `/services/pool-remodeling-renovation-in-north-south-florida` (paid landing «Full Remodel») |
| Gainesville / Ocala | 2 | `/pool-builders/gainesville-florida`, `/pool-builders/ocala-florida` (paid landings) |
| Other cities | 51 | `/pool-builders/*` |
| Counties | 9 | `/country/custom-pool-builders-*-county-fl` |
| Regional hubs | 3 | `/where-we-serve`, `/where-we-serve/north-florida`, `/where-we-serve/south-florida` |
| Projects | 15 + index | `/project/*`, `/projects` (5 own with written copy and `ubicacion` = region only; 10 Webflow with empty alts) |
| Blog | 44 + hub | 10 legacy (Dec-2025, no FAQ, no sources, 7 self-links in «Most Read») + 34 new (Sep-2026, FAQ + markdown source) |

GSC headline per group (90 days, apex+www merged): home 8,471 impr / 107 clicks; permits article 3,398 / 15; cost guide 2,172 / 7; timeline 1,406 / 13; New Pool hub 1,173 / 0 (pos 11.1); Remodel hub 580 / 0; Gainesville 418 / 1; Ocala (old slug + new) 524 / 4. Non-brand totals: **25,301 impressions, 18 clicks**.

---

## C. Blog content gap analysis
See `SEO_BLOG_GAP_ANALYSIS.md`. Net result: **3 CREATE** (cold plunge — offering confirmed by Sebastian 1-Oct; dark pool finishes; pool automation for new construction), **1 EXPAND** (safety barriers → permits article), **10 REWRITE/UPDATE** (all legacy articles), **0 MERGE**, **0 REMOVE**, South Florida guide **deferred to Phase 2**.

## D. Keyword-to-URL map
See `SEO_KEYWORD_URL_MAP.md`.

## E. Cannibalization risks (measured)

| # | Competing URLs | Evidence | Resolution |
|---|---|---|---|
| E1 | Generic «pool builders / contractors near me» (9,479 impr) has no owner; Google serves `/pool-builders/pembroke-pines-florida` (3,732 impr for «pool builders pembroke pines» but also «pool builders», «pool contractors near me») | GSC query×page | Owner = `/where-we-serve` (already decided in `docs/encargos/SEO-AEO-GEO-PLAN.md` §2.1). Reinforce with links from hubs; city pages link up. No new URL. |
| E2 | Cost intent: `/blogs/complete-guide-…` (2,172 impr, pos 34) vs `/pool-cost-estimator` (553, pos 61) vs `/blogs/how-much-does-a-custom-pool-cost-in-florida` (new) | GSC | Guide keeps «process»; «how much» → new cost article → estimator. Legacy guide rewritten to point there; no slug change. |
| E3 | `/blogs/new-pool-construction-vs-pool-remodeling-…` (legacy, 137 impr) vs `/blogs/remodel-or-rebuild-your-pool` (new, 6 impr) | semantic | Distinct questions: *build new vs renovate what you have* vs *renovate vs demolish-and-rebuild an existing pool*. UPDATE both, cross-link, no merge. |
| E4 | Permits: legacy permits article vs the two «permit» questions on the hubs' FAQ vs barrier topic | semantic | Permits article owns informational intent; hubs keep the transactional «who pulls the permit»; barriers become a section (EXPAND), not a URL. |
| E5 | Gainesville/Ocala city pages vs «Building a Pool in North Florida» article vs `/country/*alachua*` / `*marion*` | GSC (county pages: 10 and 3 impr) | City pages own geo-transactional; article owns informational; county pages are supporting (KEEP, de-emphasised). |
| E6 | New Pool hub section «Remodeling & Spa Additions» (3 sub-cards) | on-page | Keep as cross-sell, already links to the remodel hub; reinforce that it is secondary. |
| E7 | 53 city pages are one template (82.9 % identical, measured in prior audit) | prior audit | Not touched here except Gainesville/Ocala (Phase 1). Inventory with actions in `SEO_CONTENT_INVENTORY.md` §Locations. |

---

## F. Technical SEO findings

### P0 — Critical
| ID | Finding | Evidence | Action |
|---|---|---|---|
| P0-1 | **New Pool hub not indexed on www** («Discovered – currently not indexed») while it is the Final URL of the main Ads group and the owner of the top commercial intent | `GOOGLE_SEARCH_CONSOLE_INSPECT_URL` | More internal links with descriptive anchors from the 11 New Pool articles, both city landings, the North Florida hub and `/where-we-serve`; `Service` JSON-LD; ask Sebastian to «Request indexing» in GSC (not available through the API). |
| P0-2 | **Legacy permits article is largely fabricated**: non-existent licence class «CPCG», wrong code edition («7th Edition 2020, effective December 31, 2023»), invented statistics («15,247 pool permits», «35% first-time barrier fails»), invented county fee tables, invented product models, above-ground intent | `src/data/blogs-sanity.json` body | Full rewrite with official sources (Florida Building Code 8th Edition (2023), DBPR licence lookup, FS 515, county portals). It is the site's strongest non-brand page (3,398 impr), so the slug and H1 stay. |
| P0-3 | Same class of fabricated numbers in the other 9 legacy articles (cost per sq ft, «Zillow 20%», «Florida Statute 193.155 50% homestead exemption», week-by-week timelines, fee tables, product prices) | claim grep, see `SEO_CONTENT_INVENTORY.md` | Rewrite each from the same slug, keeping intent; numbers only from the approved estimator table or official sources. |

### P1 — High
| ID | Finding | Action |
|---|---|---|
| P1-1 | `mrandmrs-outdoor-living.vercel.app` answers 200 with the production build | Host-conditioned 308 → www in `vercel.json`; extend `build-vercel-config.mjs` to emit `has: [{type:"host",…}]`. |
| P1-2 | 7 of the 10 legacy articles link to themselves in «Most Read Articles»; all 10 have no FAQ, no sources, no `searchIntent`/`funnelStage` | Fixed by the rewrite (relatedPosts without self, FAQ of 4, `fuentes`). |
| P1-3 | Service pages' `BlogPosting`/`Service` schema: blog `publisher.logo.url` and `url` are relative paths (`/images/site/logo-mr-mr.svg`, `/blogs/…`) | Absolute URLs in `src/pages/blogs/[slug].astro`. |
| P1-4 | Hubs have no `Service` node tied to `#negocio` (the Webflow block carries `about.serviceType` only) | Add `Service` JSON-LD with `provider: {@id: #negocio}`, `areaServed`, `serviceType` on the two hubs (declared in `check-seo.mjs`). |
| P1-5 | City `LocalBusiness` blocks (53) still carry an empty `geo: {@type: GeoCoordinates}` and a city-only address | Out of scope for a safe change (Webflow block compared byte-for-byte by `check:seo`); logged as P2 for a declared fix. |

### P2 — Medium
- 10 Webflow project pages: empty `alt` on gallery images (accessibility + image SEO). Needs the project owner to describe the photos; logged in `REQUIRES_CLIENT_CONFIRMATION.md`.
- `/pool-cost-estimator` ranks pos 61 for «pool cost calculator / estimate florida» queries; the cost article now links to it; no copy change on the tool page in this round.
- GA4 noise: `localhost` (156 sessions) and `/cascaron` (23) reach the property; fix is a GTM hostname filter (not in repo).
- Four empty blog categories (`decks`, `florida-homeowner-guides`, `landscaping-irrigation`, `structures-lighting`) show as chips with 0 results on `/blogs-tips`; they create no URLs so there is no thin-archive risk. Hide chips with 0 posts (small UI fix, done in Phase 13 only if it does not alter baseline text; otherwise logged).

### P3 — Low
- No `public/llms.txt`. Added as a deliberate addition (cheap, no risk).
- Legacy titles > 60 chars already handled by `meta-propia.json` in SEO-AEO-GEO F1; nothing new.
- `/videos`, `/brochures` fine.

### Not a finding (verified, do not re-report)
- Preview deployments are `noindex` and have no canonical (fail-closed switch).
- Sitemap and canonicals share host `www` (gate `check:seo` enforces it).
- `/thank-you` is `noindex` on purpose.
- Tracking chain works: 90-day GA4 `generate_lead` 6, `form_submit` 44, `click_to_call` 21, `estimator_complete` 8.

---

## G. Requires client confirmation
See `REQUIRES_CLIENT_CONFIRMATION.md`. Nothing in this implementation depends on those answers; each item is either omitted or worded generically until confirmed.
