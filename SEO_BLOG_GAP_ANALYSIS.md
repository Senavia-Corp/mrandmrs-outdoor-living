# Blog Content Gap Analysis

Semantic comparison of every topic proposed in the approved guide (§8) against the 44 published
`blogPost` documents in Sanity (`m273z6jc/production`, queried 1-Oct-2026: 44 published, 0 drafts)
and the editorial roadmap (`contenido/roadmap-blog.json`, 97 planned, 34 written). Comparison
fields: title, slug, primary question, service, geography, funnel stage, body sections.

Status values: KEEP · UPDATE · EXPAND · MERGE · CREATE · REMOVE · NO ACTION. **CANNIBALIZATION
WARNING** is raised wherever two URLs would compete.

## Guide topics vs existing articles

| Topic (guide) | Existing article(s) | Status | Action | Reason |
|---|---|---|---|---|
| Ocala limestone / rock clause | `building-a-pool-in-north-florida` (sections on limestone, well water, permit office) | KEEP | Link from Ocala landing FAQ; no surcharge % quoted (only the approved «rock excavation +12 %» from the estimator table is citable) | Already covered; adding a URL would split a 2-impression topic |
| Septic / wells / setbacks | `building-a-pool-in-north-florida` + permits article | EXPAND (permits) | Setbacks and septic clearances described as *who decides* (county zoning, DOH septic permit) without inventing distances | Current permits article invents «5ft/10ft/7.5ft» setbacks → removed |
| FBC Chapter 45 / safety barriers | permits article | UPDATE + EXPAND | Barrier section rewritten from the Residential Swimming Pool Safety Act (FS 515) and FBC Residential R4501.17; no standalone URL | GSC: 0 non-brand impressions for barrier/fence queries; «CONDITIONAL» in the guide → not justified |
| Louvered roof wind engineering | `louvered-roof-in-florida-rain-and-high-winds`, `features-to-compare-before-buying-a-louvered-roof` | NO ACTION (this round) | Out of priority scope (not New Pool / Remodel) | Already published; no fabricated numbers found in the grep |
| Remodel vs rebuild | `remodel-or-rebuild-your-pool` (new) and legacy `new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | UPDATE legacy; KEEP new | **CANNIBALIZATION WARNING resolved by intent split**: legacy = «build new or renovate what I have»; new = «renovate or tear out and rebuild the existing shell». Cross-linked | Both have real impressions (137 / 6); a merge would need a 301 and lose the stronger slug |
| Luxury Pool Trends 2026 | `top-10-luxury-pool-designs-for-florida-homes` (397 impr) | UPDATE | Rewrite as timeless design guide; remove invented prices | A dated «trends» URL would compete with it |
| Sun shelf design | `pool-upgrades-worth-planning-before-construction`, `what-makes-a-pool-look-custom`, `pool-and-spa-or-pool-only` | NO ACTION | Already covered in three places | No distinct demand measured |
| **Cold plunge integration** | none (0 matches on «cold plunge», «plunge», «chiller») | **CREATED** (P1, published 1-Oct-2026) | `/blogs/cold-plunge-integration-florida-pool-construction` — what to plan before construction: location, chiller/equipment pad, electrical load, plumbing isolation, drainage, barrier code | Offering confirmed by Sebastian (1-Oct-2026). GSC 0 impr because the site has no page; net-new intent |
| **Dark pool finishes / heat** | none (0 matches on «dark finish», «black plaster», «dark pebble») | **CREATED** (P1, published 1-Oct-2026) | `/blogs/dark-pool-finishes-in-florida` — heat gain, finish families, maintenance visibility, cooling options (chiller, shade, water features) | Net-new design/technical topic; ties to New Pool and Remodel hubs |
| Pergola permits | `do-you-need-a-permit-for-a-pergola-in-florida` | KEEP | — | Published |
| Outdoor kitchen utilities | `gas-electric-and-plumbing-for-an-outdoor-kitchen` | KEEP | — | Published |
| Pergola price factors | `how-much-does-an-aluminum-pergola-cost-in-florida` (+ louvered cost article) | KEEP | — | Published; not priority scope |
| **Pool automation for new construction** | `pool-upgrades-worth-planning-before-construction` mentions automation as 1 of 10 upgrades | **CREATED** (P2, published 1-Oct-2026) | `/blogs/pool-automation-for-new-construction` — decisions before the pour: conduit, valve actuators, equipment pad layout, lighting zones, Wi-Fi, what cannot be retrofitted cheaply | Differentiated around *pre-construction* decisions; the upgrades article links to it instead of expanding |
| Commercial pool / DOH | `commercial-pool-construction-in-florida-what-decision-makers-must-know`, `residential-vs-commercial-pool-construction-in-florida` | UPDATE | Remove invented $/sq ft and «DOH Table 3-1» references; point to FAC 64E-9 and `/industry-solutions` | Published; low priority but P0 for fabricated numbers |
| Biophilic design | none | NO ACTION | Future | Not priority |
| South Florida planning guide (Broward / Palm Beach) | none | DEFERRED (Phase 2) | — | Guide: North Florida first |

## Legacy articles (10) — remediation decisions

| Slug | GSC impr/clicks | Problems found | Status |
|---|---|---|---|
| `what-permits-are-required-for-pool-construction-in-florida` | 3,398 / 15 | Non-existent «CPCG» licence, wrong FBC edition, invented permit counts, fee tables, setbacks, product models, «7 mandatory inspections», above-ground intent | **REWRITTEN** (P0, published 1-Oct-2026) |
| `complete-guide-to-pool-construction-in-florida-costs-timeline-process` | 2,172 / 7 | Invented price ranges by pool type, «8-12 weeks», maintenance/cleaning section (low-value intent), above-ground comparison | **REWRITTEN** (1-Oct-2026); cost handed to estimator/cost article |
| `pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish` | 1,406 / 13 | Week-by-week schedule presented as fact, invented fees, «DBPR data», software prices, «5 inspections per FBC 105.4» | **REWRITTEN** (1-Oct-2026; phases as sequence + what moves each) |
| `common-pool-construction-mistakes-we-see-in-florida` | 336 / 6 | «40% failure rates», «12% sinkhole risk», «LeakTrac study», «$18,000 Tampa case», «we see» with no project evidence | **REWRITTEN** (1-Oct-2026; first-hand language tied to the build process, not to invented cases) |
| `top-10-luxury-pool-designs-for-florida-homes` | 397 / 4 | Prices per design, generic | **UPDATED** (1-Oct-2026) |
| `how-outdoor-living-spaces-increase-property-value-in-florida` | 315 / 2 | «Zillow 20%», «237 sunny days», «Houzz 2024 table», «FS 193.155 50% homestead», city ROI table | **REWRITTEN** (1-Oct-2026; no ROI %; what appraisers and buyers actually look at, generalized) |
| `new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | 137 / 1 | Price tables, «only 40% of homes qualify», week schedules, DIY kits, above-ground | **REWRITTEN** (1-Oct-2026) |
| `residential-vs-commercial-pool-construction-in-florida` | 229 / 1 | «$95-150 vs $65-110 per sq ft», «DOH Table 3-1», feature price list | **UPDATED** (1-Oct-2026; generalized, cites FAC 64E-9) |
| `commercial-pool-construction-in-florida-what-decision-makers-must-know` | 140 / 0 | Same class of invented costs/ROI | **UPDATED** (1-Oct-2026) |
| `outdoor-living-design-guide-for-florida-homes` | 80 / 0 | Product models and prices («Blaze LTE 32 $2,499»), «170 mph», «200 mph», «$65K pool» | **REWRITTEN** (1-Oct-2026; principles, no catalogue prices) |

All ten keep slug, H1 intent and `publishedAt`; `updatedAt` is set to the publish date of the
rewrite; `relatedPosts` no longer include the article itself; each gains a 4-question FAQ and a
`fuentes` list with official URLs.

## Net-new articles created in this implementation (all three published in Sanity on 1-Oct-2026 and wired per `SEO_INTERNAL_LINKING_MAP.md`)

| Priority | Slug | Primary service | Geography | Funnel |
|---|---|---|---|---|
| P1 | `cold-plunge-integration-florida-pool-construction` | New Pool | Florida (North first) | consideration |
| P1 | `dark-pool-finishes-in-florida` | New Pool (also linked from Remodel) | Florida | consideration |
| P2 | `pool-automation-for-new-construction` | New Pool | Florida | consideration |

Each passed the content-intent lock: no existing title/slug/primary question/service/geography
overlap in Sanity or the roadmap (`contenido/roadmap-blog.json` has no automation, cold plunge or
dark-finish entry).

## Intentionally NOT created
- Florida Residential Pool Safety Barriers guide (EXPANDED into permits instead).
- Building a Custom Pool in South Florida: Broward & Palm Beach (Phase 2).
- Luxury Pool Trends 2026, Sun shelf design, Ocala rock clause, Septic/wells statewide guide, Biophilic design (duplicates or no measured demand).
