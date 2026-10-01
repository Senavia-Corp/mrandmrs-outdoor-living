# SEO Implementation Report — Mr & Mrs Outdoor Living

Final report required by the *Final Guide for Safe Implementation* (§25). Branch
`claude/zen-lovelace-9vd0pi`, 1-Oct-2026, five commits on top of `main` (`7300075`). Nothing is
merged or deployed: production still serves `main`. Every count comes from a tool (Sanity MCP,
Search Console, GA4, the repository's gates, or a script over `.vercel/output/static`); the
tool is named next to the number.

Companion files: `SEO_IMPLEMENTATION_AUDIT.md`, `SEO_CONTENT_INVENTORY.md`,
`SEO_KEYWORD_URL_MAP.md`, `SEO_BLOG_GAP_ANALYSIS.md`, `SEO_INTERNAL_LINKING_MAP.md`,
`SEO_HIGH_RISK_CHANGES.md`, `REQUIRES_CLIENT_CONFIRMATION.md`. Spanish log entry in
`MIGRACION-LOG.md` («SEO-SAFE»).

---

## 1. What existed before

| Area | State at `7300075` (measured) |
|---|---|
| Site | Astro 7 static + Vercel adapter, 159 HTML pages (113 Webflow routes + 8 own + 44 blog + 3 legal + noindex pages); 14 redirects; `www` canonical with fail-closed `PUBLIC_ES_PRODUCCION` switch |
| Indexation | Sitemap 155 URLs, 0 errors in GSC. **New Pool hub «Discovered – currently not indexed» on www** while the apex copy had 1,156 impressions at position 11.2 (GSC URL inspection + performance API) |
| Hosts | `mrandmrs-outdoor-living.vercel.app` was a production alias answering 200 with the indexable build; GA4 recorded sessions on 5 `*.vercel.app` hosts |
| Blog | 44 published `blogPost`, 0 drafts (Sanity MCP). 10 legacy articles (Dec-2025): no FAQ, no sources, 7 linking to themselves in «Most Read Articles», fabricated claims (non-existent licence class, wrong code edition, invented statistics, fee tables, product prices). 34 own articles (Sep-2026) clean |
| Hubs | Remodel hub framed as generic «renovation» with a FAQ answer on financing that named a lending provider; New Pool hub copy already North-Florida-first (R17/R20) |
| Gainesville / Ocala | Paid-landing layer with 3 FAQ each, no local permitting fact; projects shown as regional showcase (no fabricated city attribution) |
| Schema | `BlogPosting` with relative `url`/`image`/`logo`, no `mainEntityOfPage`; `Service` nodes on the 14 service pages not tied to the `LocalBusiness#negocio` node; city `LocalBusiness` with empty `geo` (unchanged, see §4) |
| Images | 16,270 `<img>` on 159 pages; **660 without a usable alt** (the 10 Webflow showcase covers repeated on 66 pages) ; 8,587 empty `alt=""` (icons, logos, decorative) |
| Verification data | No `factChecked`, `contentStatus`, `primaryService`, `targetRegion` on articles; no `verifiedCity`/`county`/`completionYear` on projects |
| Tracking | GTM + Ads tags in `Base.astro`; 90-day GA4: `generate_lead` 6, `form_submit` 44, `click_to_call` 21, `estimator_complete` 8 |

## 2. What changed

| # | Change | Files |
|---|---|---|
| 1 | 10 legacy articles rewritten from the same slug (body, summary, description, `<title>` on 7, FAQ of 4, sources, related posts; H1 untouched) and republished in Sanity | `contenido/blog/*.md` (10), Sanity, `src/data/blogs-sanity.json` |
| 2 | Remodel hub: `<title>` «Complete Pool Remodeling in North Florida \| Mr & Mrs» (52 chars), description (156), hero support line, FAQ 5 → 8 (financing answer without figures or provider name) | `src/data/meta-propia.json`, `src/data/captacion-servicios.json` |
| 3 | Gainesville and Ocala: 4th FAQ «Which office reviews a pool permit in …?» (city vs unincorporated county, septic/wells, limestone for Ocala) with source URL | `src/data/ciudades-captacion.json`, `scripts/build-captacion-ciudades.mjs` |
| 4 | Host redirect `.vercel.app` → www (308) | `vercel.json`, `scripts/build-vercel-config.mjs`, `scripts/check-enlaces.mjs` |
| 5 | `BlogPosting` absolute URLs + `mainEntityOfPage` (47 pages); `Service.provider.@id` + `about.url` (14 pages) | `src/pages/blogs/[slug].astro`, `scripts/build-paginas.mjs`, 14 `src/pages/services/*.astro` |
| 6 | 660 showcase `<img>` gain the alt their photo already had on `/projects` | `src/data/obras-migradas.json` |
| 7 | `public/llms.txt` generated in production builds (95 lines, derived) | `scripts/build-seo-ficheros.mjs` |
| 8 | Optional verification fields in the Sanity schema and in the publish script; 13 articles carry them | `studio/schemaTypes/blogPost.ts`, `project.ts`, `scripts/publica-blog.mjs` |
| 9 | Intent registry (32 intents, one owner each) as data | `src/data/seo-intent-registry.json` |
| 10 | Gates taught the new truth instead of being silenced: `check-texto.mjs` derives the 10 rewritten bodies from the cache; `check-seo.mjs` derives their titles/descriptions/JSON-LD; `check-medicion.mjs` counts own blog routes; `check-ads-landing-pages.mjs` expects 8/4/4 FAQ rows | `scripts/check-*.mjs`, `src/data/blog-reescritos.json` |
| 11 | Offline publishing path (`--emitir`, `--local`) so content can be pushed through the Sanity MCP when `api.sanity.io` is unreachable | `scripts/publica-blog.mjs`, `scripts/cache-blog-sanity.mjs`, `scripts/lib/cache-local.mjs`, `scripts/build-imagenes-blog.mjs` |

Totals: 5 commits, 73 files (67 at `98025d3` + 6 in the last commit). Sanity: 17 documents written (13 patches + 3 creates + 4 link patches → 47 published, 0 drafts, verified by GROQ after the last publish).

## 3. What was created

- 3 articles (URLs, Sanity documents, sitemap entries 155 → 158):
  `/blogs/cold-plunge-integration-florida-pool-construction` (P1, offering confirmed by Sebastian),
  `/blogs/dark-pool-finishes-in-florida` (P1), `/blogs/pool-automation-for-new-construction` (P2).
- `public/llms.txt` (production only).
- 1 host redirect.
- 7 + 5 optional schema fields; 1 data registry (`seo-intent-registry.json`); 1 gate declaration
  file (`blog-reescritos.json`); 2 image ladders for the cold-plunge cover.
- 8 deliverable documents in the repository root.

## 4. What was intentionally not changed

- **URLs, slugs, H1s, `publishedAt`**: none, anywhere.
- **51 city pages** other than Gainesville/Ocala, 9 county pages, `/where-we-serve/*` bodies,
  home, `/about`: Webflow copy frozen by the text gate; their only change is the carousel alt.
- **Forms, CRM path, GTM/GA4/Ads tags, `/thank-you`**: not in the diff.
- **Schema facts that need the client**: `aggregateRating`, postal address, `geo`, opening hours,
  price range. City `LocalBusiness` blocks keep their empty `geo` (byte-compared Webflow block;
  logged as P1-5).
- **Blog cards on the hubs**: both hubs already had 5 cards to strong pages; swapping one for a
  new article with no equity would be a net loss.
- **`/where-we-serve/south-florida`** and the South Florida planning guide (Phase 2).
- **«Florida Project Showcase» heading** on city pages (needs a declared text line; client #28).
- **Studio deploy, production deploy, merge**: outside the authorised scope.

## 5. Existing articles updated (10)

| Slug | GSC 90 d (impr / clicks) | What was removed | What was added |
|---|---|---|---|
| `what-permits-are-required-for-pool-construction-in-florida` | 3,398 / 15 | «CPCG» licence, FBC 7th-edition claim, «15,247 permits», county fee tables, setbacks, product models, «7 mandatory inspections», above-ground intent | Permit path by jurisdiction, FBC 8th Edition (2023), DBPR lookup, FS 515 barrier section (the «safety barriers» EXPAND), links to the New Pool hub, Gainesville, Ocala, North Florida article; FAQ 4, sources 6 |
| `complete-guide-to-pool-construction-in-florida-costs-timeline-process` | 2,172 / 7 | Price ranges by pool type, «8-12 weeks», maintenance section, above-ground comparison | Process end-to-end; cost handed to the cost article and estimator; FAQ; sources |
| `pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish` | 1,406 / 13 | Week-by-week schedule, «DBPR data», fees, software prices, «5 inspections per FBC 105.4» | Phases as a sequence and what moves each; FAQ; sources |
| `common-pool-construction-mistakes-we-see-in-florida` | 336 / 6 | «40 % failure», «12 % sinkhole», «LeakTrac study», «$18,000 Tampa case» | Mistakes tied to the build process, no invented cases; FAQ; sources |
| `top-10-luxury-pool-designs-for-florida-homes` | 397 / 4 | Prices per design | Timeless design guide; links to dark finishes, automation, custom cues |
| `how-outdoor-living-spaces-increase-property-value-in-florida` | 315 / 2 | «Zillow 20 %», «237 sunny days», Houzz table, «FS 193.155 50 % exemption», city ROI table | What appraisers and buyers look at, no ROI %; FAQ; sources |
| `new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | 137 / 1 | Price tables, «40 % qualify», week schedules, DIY kits, above-ground | Build-new vs renovate; cross-link with `remodel-or-rebuild-your-pool`; FAQ |
| `residential-vs-commercial-pool-construction-in-florida` | 229 / 1 | «$95-150 vs $65-110 per sq ft», «DOH Table 3-1» | FAC 64E-9 reference, link to `/industry-solutions`; FAQ |
| `commercial-pool-construction-in-florida-what-decision-makers-must-know` | 140 / 0 | Invented costs/ROI | Same; FAQ |
| `outdoor-living-design-guide-for-florida-homes` | 80 / 0 | Product models and prices, «170/200 mph» | Principles, build order, materials table; FAQ 4; source |

Also touched (links only, no claim change): `pool-upgrades-worth-planning-before-construction`,
`pool-and-spa-or-pool-only`, `pool-resurfacing-vs-full-pool-renovation`,
`what-makes-a-pool-look-custom`, `building-a-pool-in-north-florida`,
`remodel-or-rebuild-your-pool` (summary without the `$16,600` figure). Descriptions of all 13
touched articles ≤ 160 characters. All 13 carry `factChecked: true`, `factCheckedAt`,
`lastSeoAuditDate: 2026-10-01`, `contentStatus` (`updated` / `published`), `primaryService`,
`targetRegion: florida`.

## 6. New articles created (3)

| Slug | Words (body, Markdown) | FAQ | Sources | Inbound editorial links at build |
|---|---|---|---|---|
| `cold-plunge-integration-florida-pool-construction` | 1,160 | 4 | 2 | 1 (`pool-and-spa-or-pool-only`) + `/blogs-tips` card |
| `dark-pool-finishes-in-florida` | 1,060 | 4 | 1 | 3 (`pool-resurfacing-vs-full-pool-renovation`, `what-makes-a-pool-look-custom`, `top-10-luxury…`) |
| `pool-automation-for-new-construction` | 1,030 | 4 | 2 | 3 (`pool-upgrades…`, `top-10-luxury…`, `dark-pool-finishes…`) |

Each passed the content-intent lock (no title/slug/question/service/geography overlap in Sanity
or `contenido/roadmap-blog.json`), uses only real photos (`gallery-procedencia.json` guard) and
only figures from the approved estimator table.

## 7. Articles merged / removed

None. One dead link (`/blogs/landscaping-around-a-pool`) and 7 self-links removed. The two
candidate pairs for merging (E2 cost intent, E3 new-vs-remodel) were split by intent and
cross-linked instead, because each URL has its own impressions.

## 8. Internal links added

Full map in `SEO_INTERNAL_LINKING_MAP.md`. Headline numbers (editorial links inside article
bodies, final build):

| Target | Editorial inbound links |
|---|---|
| New Pool hub | 21 articles |
| Remodel hub | 12 articles |
| `/pool-builders/gainesville-florida` · `/pool-builders/ocala-florida` | 4 articles each (permits, process guide, North Florida, pool-and-spa) |
| `/pool-cost-estimator` | 27 articles |
| `/request-estimated` | 32 articles |
| 3 new articles | 1 / 3 / 3 (see §6) |

Orphans: 0 of 47 articles without an inbound link from another article (was 1 right after the
cold-plunge article was created). Open gaps (frozen Webflow bodies): `/where-we-serve` has no
editorial inbound; the North Florida regional hub does not link Gainesville/Ocala; city pages do
not link the North Florida article. Closure path documented in the map §4.

## 9. Metadata changes

- Remodel hub: title «Complete Pool Remodeling in North Florida | Mr & Mrs» (52), description
  156 chars (was generic renovation wording).
- 10 legacy articles: `seo.description` rewritten (≤ 160 chars) on all 10; `<title>` rewritten on
  7 of 10 (≤ 60 chars, intent-first wording, e.g. «Pool Permits in Florida: What You Need and Who
  Issues Them»), declared in `check-seo.mjs` (`TITULO_PROPIO`); **H1 unchanged on all 10**
  (verified against the pre-rewrite cache). The obsolete override for the commercial article was
  removed from `meta-propia.json` because Sanity now carries the title.
- 3 new articles: title ≤ 60, description ≤ 160.
- No duplicate `<title>` across the 159 pages (`check:seo`).
- `og:`/`twitter:` images of the 13 touched articles are real project photos (declared).

## 10. Schema changes

| Node | Pages | Change |
|---|---|---|
| `BlogPosting` | 47 | absolute `url`, `image.url`, `publisher.logo.url`, `publisher.url`; `mainEntityOfPage {WebPage, @id}`; `dateModified` = republish date on the 13 touched |
| `FAQPage` | 10 legacy articles (new, 4 questions each), remodel hub (5 → 8), Gainesville/Ocala (3 → 4) | emitted from the same array that renders the visible FAQ (`check:ads` rule 14: 1:1) |
| `Service` | 14 service pages | `provider.@id: …/#negocio`, `url` |
| `LocalBusiness#negocio` | all | unchanged (no rating, address, geo) |
| Validation | — | `check:seo` byte-compares every head against the Webflow baseline with each change declared; Google's Rich Results test could not be reached from the container → run it after deploy on the remodel hub and one rewritten article |

## 11. Image SEO changes

- 660 `<img>` (10 showcase covers × 66 pages) now carry descriptive alt text, copied from the
  alt the same file already had on `/projects` (no invented descriptions). Count of `<img>`
  without a usable alt on the 159 pages: 660 → **0** (script over the static output).
- 3 new article covers and 9 figures use real project photos through the provenance guard, with
  responsive ladders (`-p-400/800` covers, `704/1240-1280` figures) and written alts.
- Still empty: 8,587 `alt=""` on icons, logos and the Webflow cross-sell thumbnails inside
  `/project/*` (decorative); 262 alts over 160 characters and 229 alts containing «licensed/best»
  in the Webflow origin (frozen; listed for a text encargo).

## 12. Technical SEO changes

- Host redirect `mrandmrs-outdoor-living.vercel.app/(.*)` → `https://www.mrandmrsoutdoorliving.com/$1`
  (308; 15th redirect; `build-vercel-config.mjs` now passes `has`; `check:enlaces` asserts it).
- Sitemap 155 → 158, robots unchanged, `llms.txt` added (production builds only).
- No change to canonical logic, `noindex` set, headers, fonts, JS or hydration. No redirect chains
  introduced (`check:enlaces`).
- Gates extended rather than bypassed (see §2 row 10). Gate run on the final build:

| Gate | Result | Note |
|---|---|---|
| `check:tokens`, `check:rutas`, `check:enlaces`, `check:ads`, `check:captacion`, `check:estructura`, `check:estructura:ciudades` | green | static |
| `check:seo`, `check:medicion` | green with `PUBLIC_ES_PRODUCCION=1` | without the flag they report the 158 sitemap URLs as a failure by design |
| `check:texto` (browser, `xvfb-run`) | green | run only on changed routes: 10 rewritten articles, both hubs, Gainesville, Ocala, the 4 link-edited articles (no baseline → derived), and `/pool-builders/ocala-florida` after the alt change |
| `check:ix2` (browser, `xvfb-run`) | **green** (PUERTA VERDE): 0 orphan reveal keys; at 1920, 1440, 991 and 479 px on its 14 archetype routes 0 `data-w-id` at opacity 0, 0 residual transforms, 0 horizontal scrollbar, nav returns after scroll; desktop dropdown and mobile menu open and close | full run without a cap (the first attempt was cut by a 500 s cap after the 991 px pass) |
| `check:cascaron` | **not run** | it performs its own `MM_FIXTURES=1` build, which needs `api.sanity.io` (blocked by the container proxy) |
| `check:encabezados`, `check:aviso`, `check:estimador` | green | static |
| `check:assets` | steps 1-4 green (every referenced file exists, matches its extension, its sha256 and has dimensions); step 5 **not run** | step 5 reads `_source/sanity-masters/`, a gitignored folder that is not in this container |
| `check:blog`, `check:portable`, `check:blogs:rutas` | **not run** | they open the live dataset through `.env` (absent here; the API host is blocked). Their subject, the 47 published documents, was verified instead by GROQ through the Sanity MCP: 47 published, 0 drafts, the four link patches present |
| `check:visual` (browser, `xvfb-run`, asked by Sebastian 1-Oct) on the remodel hub, Gainesville and Ocala | **red, 12/12 comparisons, all height deltas** (`ROJO CORRECTO` in the repo’s terms) | The references are older than the pages: the city references date from 31-Aug (sha `527b5f0`, before the R20 paid-landing layer, still pending approval) and the hub reference from 13-Sep. Measured attribution (real px, `audit/seo-safe/medicion.json`): of the +1,306…+1,591 px on the hub, 222–268 px are this encargo’s 3 FAQ rows; of the +4,332…+5,527 px on the cities, 74–90 px are this encargo’s 1 FAQ row. Current captures at the 4 widths are in `audit/seo-safe/` for the approval look (`scripts/aprobar-diseno.mjs`, human-only). One cell (Gainesville at 1920) was flagged «medicion invalida» by the gate’s frame probe under the virtual X server; the measurement pass captured it normally |
| `check:menu`, `check:carrusel` | **not run** | director-only per `CLAUDE.md` |

## 13. Remaining content gaps

| Gap | Decision |
|---|---|
| South Florida planning guide (Broward / Palm Beach) + South Florida regional hub reinforcement | Phase 2 |
| Pembroke Pines, Davie, Fort Lauderdale, Delray Beach, Boca Raton city pages carry the demand (9,787 / 5,689 / 3,777 / 2,792 / 2,509 impr) with template-only content | Phase 2 candidates, in that order |
| 9 of 14 service pages without their 5 blog cards (pre-existing, declared `pendientes`) | needs 2-5 articles per service from the roadmap (63 unwritten) |
| Biophilic design, sun-shelf guide, statewide septic/wells guide | no measured demand; not created |
| `/where-we-serve` inbound links; North Florida hub → cities; city FAQ → article | one declared text line each (map §4) |
| 4 empty blog category chips on `/blogs-tips` | UI nit; no URL impact |

## 14. Requires client confirmation

29 items in `REQUIRES_CLIENT_CONFIRMATION.md`. The ones that block measurable value:
«Request indexing» of the New Pool hub in GSC (#22); Studio deploy so editors see the
verification fields (#26); confirm the `.vercel.app` 308 after deploy (#27); browser gates before
merge (#29); any Gainesville/Ocala project that may be named (#19); licences and insurance in
force (#4, #5).

## 15. Next 30 / 60 / 90 days

**30 days** — Merge and deploy; run `check:visual`/`check:menu` first. In GSC: request indexing
of the New Pool hub, then watch the 4 strongest rewritten slugs weekly (impressions, position)
and the 3 new URLs' first impressions. Deploy the Studio. Confirm the `.vercel.app` 308. Rich
Results test on the remodel hub and one article.

**60 days** — Close the three declared linking gaps (one text line each). Fill the 9 services'
blog cards from the roadmap (2-5 articles each, same pipeline). GTM hostname filter for
`localhost` and `*.vercel.app`. Decide the «Florida Project Showcase» wording.

**90 days** — Phase 2: South Florida planning guide and regional hub; unique content for the five
highest-demand South Florida city pages; county-level evidence for Alachua/Marion if a project
can be named. Re-run the claim grep on all 47 articles and the alt audit on the Webflow
templates. Review GSC query→page ownership against `seo-intent-registry.json` and move any
intent whose «today» page still differs from its owner.

---

### QA checklist (guide «QA before deployment»)

| Item | Evidence |
|---|---|
| Build passes, no build/TypeScript errors | `MM_SANITY_CACHE=1 PUBLIC_ES_PRODUCCION=1 npm run build` exit 0, 159 pages, 15 redirects injected |
| No broken routes / images | `check:rutas`, `check:enlaces` green |
| Intended H1 structure | `check:estructura`, `check:estructura:ciudades` green; H1s unchanged |
| Unique metadata, correct canonical, no accidental noindex | `check:seo` (production mode) green; `/thank-you` noindex declared |
| Valid structured data | `check:seo` declared diffs + `check:ads` rule 14; external validator pending after deploy |
| Correct sitemap / robots | `check:medicion` (production mode): 158 URLs, robots `Allow: /`, GTM on every page |
| Internal links work | `check:enlaces` green; 0 orphan articles |
| Sanity content loads | Build from the versioned cache (live API unreachable from the container); live dataset verified by GROQ: 47 published, 0 drafts, links present in the published bodies |
| Forms work, tracking preserved | Not in the diff (`src/pages/api/formulario.ts`, `Formularios.astro`, `Base.astro` untouched); GTM presence asserted by `check:medicion` |
| Mobile layout works | **not verified** (`check:visual`/`check:menu` not run) |
| Performance not materially degraded | No new JS or fonts; 2 new image ladders; not measured |
| No redirect chains | `check:enlaces`; the host rule lands directly on `www/$1` |
