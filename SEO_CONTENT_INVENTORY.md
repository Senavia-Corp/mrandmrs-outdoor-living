# SEO Content Inventory

Every indexable URL with its primary intent, owner role, status and evidence. GSC = impressions /
clicks, 2026-07-02 → 2026-09-29, apex and www merged (`GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY`,
dimension `page`). GA4 = landing-page sessions, same window. Index = `GOOGLE_SEARCH_CONSOLE_INSPECT_URL`
on the www URL (only the sampled URLs were inspected; quota).

Status values: KEEP · UPDATE · EXPAND · MERGE · CREATE · REMOVE · NO ACTION
Location actions: KEEP · IMPROVE · DE-EMPHASIZE · REMOVE FROM GLOBAL FOOTER · CONSOLIDATE · 301 · NO ACTION

## 1. Commercial hubs and conversion pages

| URL | Type | Primary intent | Service | Geo | Funnel | GSC | GA4 | Index | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| `/services/custom-pool-spa-builders-in-north-south-florida` | service hub (Ads Final URL) | custom new inground pool construction | New Pool | North FL first | decision | 1,173 / 0, pos 11.1 | 52 sessions, 2 conv | **Discovered – not indexed** | UPDATE (copy gaps, Service schema, links in) | none: URL, H1 kept |
| `/services/pool-remodeling-renovation-in-north-south-florida` | service hub (Ads Final URL) | complete pool remodeling | Remodel | North FL first | decision | 580 / 0, pos 31.9 | 33, 0 | indexed | UPDATE (complete-renovation framing, FAQ, `$16,600` removed from body) | none |
| `/pool-builders/gainesville-florida` | city landing (Ads) | pool builder Gainesville/Alachua | New Pool | Gainesville | decision | 418 / 1, pos 27.3 | 20, 4 | indexed | IMPROVE (local FAQ with official sources, links) | none |
| `/pool-builders/ocala-florida` | city landing (Ads) | pool builder Ocala/Marion | New Pool | Ocala | decision | 524 / 4 (old slug 470 + new 54) | 22, 2 | indexed | IMPROVE | none |
| `/where-we-serve` | regional index | generic «pool builders near me» | all | FL | consideration | 25 / 0 | 8 | — | KEEP; receives links from hubs | none |
| `/where-we-serve/north-florida` | regional hub | pool builders North Florida | New Pool | North FL | consideration | 44 / 0 (old slug 187) | — | — | UPDATE (links to Gainesville/Ocala/hub) | none |
| `/where-we-serve/south-florida` | regional hub | pool builders South Florida | New Pool | South FL | consideration | 533 / 1 (old slug 2,558) | — | — | NO ACTION (Phase 2) | none |
| `/pool-cost-estimator` | tool | pool cost estimate | New Pool | FL | consideration | 553 / 2, pos 61 | 42 | — | KEEP (receives cost links) | none |
| `/pool-investment-estimator` | tool | investment/financing | New Pool | FL | consideration | — | 10 | — | KEEP | none |
| `/financing` | own page | pool financing | all | FL | decision | 4 / 0 | — | — | KEEP | none |
| `/request-estimated`, `/contact-us`, `/thank-you` (noindex) | conversion | — | — | — | — | 10 / 208 | 14 / 19 | — | KEEP | none |
| `/` | home | brand + outdoor living | all | FL | — | 8,471 / 107 | 979 | indexed | KEEP (links to hubs already) | none |
| `/about`, `/testimonials`, `/gallery`, `/videos`, `/brochures`, `/projects`, `/industry-solutions`, `/blogs-tips` | support | — | — | — | — | 230 / 266 / 115 / 27 / 45 / 12 / 77 / 33 | — | — | KEEP | none |
| `/articles/privacy-policy`, `/articles/terms-conditions`, `/articles/accessibility` | legal | — | — | — | — | — | — | — | KEEP | none |

## 2. Other service pages (not priority; no change unless noted)

`/services/custom-aluminum-pergola-builders-…` (460 / 2), `custom-deck-builders` (460 / 1), `custom-outdoor-kitchens` (856 / 1), `motorized-louvered-roof-systems` (184 / 1), `motorized-retractable-screens` (803 / 0), `patio-screen-rooms-enclosures` (265 / 0), `pool-screen-enclosures` (492 / 1), `premium-outdoor-furniture` (219 / 0), `professional-landscaping-services` (71 / 0), `smart-irrigation` (48 / 0), `smart-soffit-led-lighting` (215 / 5), `steel-building-pole-barn` (2,957 / 1, pos 39) → all **KEEP / NO ACTION** in this encargo.

## 3. Location inventory (STEP 21)

Service area verified = the county appears in `src/lib/negocio.mjs` (Alachua, Broward, Columbia, Dixie, Gilchrist, Levy, Marion, Palm Beach, Putnam) and the city has a county assigned in `src/data/ciudades-captacion.json` (only Gainesville and Ocala do). Project evidence = a project with a verified city: **none** for any city (all projects state region only). Unique value: Gainesville and Ocala carry hero/FAQ/county copy; the other 51 share one template (82.9 % identical, measured in `docs/encargos/SEO-AEO-GEO-PLAN.md`). Footer: the global footer links service areas through `/where-we-serve` only (no per-city footer links), so «REMOVE FROM GLOBAL FOOTER» applies to none.

| URL | Location | Existing content | Unique value | Verified service area | Project evidence | GSC (impr/clicks) | Action |
|---|---|---|---|---|---|---|---|
| `/pool-builders/gainesville-florida` | Gainesville, Alachua | full landing + captacion layer | hero, FAQ, county | yes | none → regional showcase | 418 / 1 | **IMPROVE** |
| `/pool-builders/ocala-florida` | Ocala, Marion | full landing + captacion layer | hero, FAQ, county | yes | none → regional showcase | 524 / 4 | **IMPROVE** |
| `/pool-builders/pembroke-pines-florida` | Pembroke Pines, Broward | template | none | county yes, city unverified | none | 9,787 / 2 | KEEP (Phase 2 candidate: highest demand) |
| `/pool-builders/davie-florida` | Davie, Broward | template | none | county yes | none | 5,689 / 1 | KEEP (Phase 2) |
| `/pool-builders/fort-lauderdale-florida` | Fort Lauderdale, Broward | template | none | county yes | none | 3,777 / 0 | KEEP (Phase 2) |
| `/pool-builders/delray-beach-florida` | Delray Beach, Palm Beach | template | none | county yes | none | 2,792 / 3 | KEEP (Phase 2) |
| `/pool-builders/boca-raton-florida` | Boca Raton, Palm Beach | template | none | county yes | none | 2,509 / 1 | KEEP (Phase 2) |
| `/pool-builders/hollywood-florida` | Hollywood, Broward | template | none | county yes | none | 1,769 / 1 | KEEP |
| `/pool-builders/jupiter-florida` | Jupiter, Palm Beach | template | none | county yes | none | 1,727 / 0 | KEEP |
| `/pool-builders/miramar-florida` | Miramar, Broward | template | none | county yes | none | 1,686 / 0 | KEEP |
| `/pool-builders/southwest-ranches-florida` | Southwest Ranches, Broward | template | none | county yes | none | 1,828 (incl. old slug) / 0 | KEEP |
| `/pool-builders/deerfield-beach-florida` | Deerfield Beach, Broward | template | none | county yes | none | 1,494 / 0 | KEEP |
| `/pool-builders/parkland-florida`, `wilton-manors`, `plantation`, `dania-beach`, `pompano-beach`, `beach` (Hillsboro Beach), `lighthouse-point`, `weston`, `boynton-beach`, `tequesta`, `hallandale-beach`, `royal-palm-beach`, `gulf-stream`, `south-palm-beach`, `wellington`, `juno-beach`, `palm-beach-gardens`, `ocean-ridge`, `hypoluxo`, `north-palm-beach`, `manalapan`, `atlantis` | South FL (Broward / Palm Beach) | template | none | county yes | none | 138 – 1,271 each | KEEP (no change; Phase 2 by impressions) |
| `/pool-builders/old-town-florida` (750), `reddick` (398), `lake-city` (202), `cedar-key` (201), `williston` (200), `waldo` (157), `hawthorne` (133), `fanning-springs` (132), `archer` (105), `high-springs` (103), `trenton` (84), `palatka` (81), `chiefland` (80), `cross-city` (71), `newberry` (44), `alachua` (30), `mcintosh` (18), `micanopy` (420 incl. old slug) | North FL (Alachua / Marion / Levy / Gilchrist / Dixie / Columbia / Putnam) | template | none | county not assigned in data (city–county map unverified) | none | as listed | KEEP; DE-EMPHASIZE only in the sense that no work is spent on them until a verified city–county map exists |
| `/country/custom-pool-builders-alachua-county-fl` | Alachua County | county page | county framing | yes | none | 10 / 0 | KEEP; linked from Gainesville |
| `/country/custom-pool-builders-marion-county-fl` | Marion County | county page | county framing | yes | none | 3 / 0 | KEEP; linked from Ocala |
| `/country/custom-pool-builders-{broward,palm-beach,columbia,dixie,gilchrist,levy,putnam}-county-fl` | counties | county page | county framing | yes | none | 4 – 130 | KEEP / NO ACTION |
| `/where-we-serve/north-florida` | region | regional hub | yes | yes | 1 own project («North Florida») | 44 / 0 | UPDATE (links) |
| `/where-we-serve/south-florida` | region | regional hub | yes | yes | 4 own projects («South Florida») | 533 / 1 | NO ACTION (Phase 2) |

No location URL is removed, redirected, consolidated or created. Rationale: all 53 cities receive
impressions, two are Ads Final URLs, and the Tier 2 consolidation was already declined
(`docs/encargos/SEO-AEO-GEO-PLAN.md` §6).

## 4. Projects (STEP 14)

| URL | Source | Location stated | Alt text | Status |
|---|---|---|---|---|
| 5 own: `luxury-pool-raised-spa-travertine-deck-south-florida`, `estate-pool-spa-sun-shelf-north-florida`, `pool-raised-spa-marble-deck-south-florida`, `luxury-pool-spa-aluminum-pergola-south-florida`, `aluminum-patio-cover-pool-deck-south-florida` | `src/data/proyectos-propios.json` | region only | written | KEEP; schema fields for verified city added (empty) |
| 10 Webflow: `luxury-pool-motorized-pergola-*`, `luxury-pool-spa-*`, `luxury-pool-pergola-*`, `modern-pool-motorized-pergola-south-florida`, `residential-pool-pergola-outdoor-dining-north-florida`, `south-florida-backyard-pool-wood-pergola` | Sanity `project` + `obras-migradas.json` | region only | **empty** (origin) | KEEP; alt text needs client input (`REQUIRES_CLIENT_CONFIRMATION` #9) |

## 5. Blog (44 published, Sanity; GSC impr/clicks)

### New Pool Construction (11)
| Slug | Origin | GSC | FAQ | Sources | Status |
|---|---|---|---|---|---|
| `what-permits-are-required-for-pool-construction-in-florida` | legacy | 3,398 / 15 | 0 | 0 | **REWRITE** |
| `complete-guide-to-pool-construction-in-florida-costs-timeline-process` | legacy | 2,172 / 7 | 0 | 0 | **REWRITE** |
| `pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish` | legacy | 1,406 / 13 | 0 | 0 | **REWRITE** |
| `common-pool-construction-mistakes-we-see-in-florida` | legacy | 336 / 6 | 0 | 0 | **REWRITE** |
| `how-much-does-a-custom-pool-cost-in-florida` | new | — | 4 | 1 | KEEP |
| `before-you-build-a-pool-in-florida` | new | 4 / 0 | 4 | 0 | KEEP |
| `how-to-choose-a-pool-builder-in-florida` | new | 8 / 0 | 4 | 0 | KEEP |
| `what-makes-a-pool-look-custom` | new | 2 / 0 | 4 | 0 | KEEP |
| `pool-and-spa-or-pool-only` | new | 5 / 0 | 5 | 0 | KEEP |
| `building-a-pool-in-north-florida` | new | 2 / 0 | 4 | 0 | KEEP (link target for Gainesville/Ocala) |
| `pool-upgrades-worth-planning-before-construction` | new | 2 / 0 | 5 | 0 | UPDATE (link to automation article) |

### Pool Remodeling (8)
| Slug | Origin | GSC | Status |
|---|---|---|---|
| `new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | legacy | 137 / 1 | **REWRITE** |
| `remodel-or-rebuild-your-pool` | new | 6 / 0 | KEEP |
| `how-much-does-a-pool-remodel-cost-in-florida` | new | 18 / 0 | KEEP |
| `pool-resurfacing-vs-full-pool-renovation` | new | 2 / 0 | KEEP |
| `what-to-upgrade-during-a-complete-pool-remodel` | new | 4 / 0 | KEEP |
| `how-long-does-a-pool-remodel-take-in-florida` | new | 6 / 0 | KEEP |
| `pool-remodeling-decisions-that-transform-an-old-pool` | new | 2 / 0 | KEEP |
| `before-and-after-pool-remodel-ideas` | new | 17 / 1 | KEEP |

### Pool Design & Planning (1) · Outdoor Living (2) · Commercial (2)
| Slug | Origin | GSC | Status |
|---|---|---|---|
| `top-10-luxury-pool-designs-for-florida-homes` | legacy | 397 / 4 | **UPDATE** |
| `how-outdoor-living-spaces-increase-property-value-in-florida` | legacy | 315 / 2 | **REWRITE** |
| `outdoor-living-design-guide-for-florida-homes` | legacy | 80 / 0 | **REWRITE** |
| `commercial-pool-construction-in-florida-what-decision-makers-must-know` | legacy | 140 / 0 | **UPDATE** |
| `residential-vs-commercial-pool-construction-in-florida` | legacy | 229 / 1 | **UPDATE** |

### Pergolas & Louvered Roofs (13) · Outdoor Kitchens (6) · Screens & Enclosures (1)
All 20 are new (Sep-2026), carry FAQ, no fabricated figures found → **KEEP / NO ACTION**:
`aluminum-vs-wood-pergolas-in-florida`, `attached-vs-freestanding-pergola`, `pergola-vs-louvered-roof`,
`do-you-need-a-permit-for-a-pergola-in-florida`, `pergola-design-decisions-before-construction`,
`pergola-beside-a-pool-features-to-plan-together`, `how-much-does-an-aluminum-pergola-cost-in-florida`,
`is-a-motorized-louvered-roof-worth-it-in-florida`, `how-much-does-a-motorized-louvered-roof-cost`,
`louvered-roof-in-florida-rain-and-high-winds`, `features-to-compare-before-buying-a-louvered-roof`,
`designing-a-complete-louvered-roof-system`, `questions-to-ask-a-louvered-roof-installer`,
`how-much-does-an-outdoor-kitchen-cost-in-florida`, `outdoor-kitchen-appliance-decisions`,
`grill-island-vs-full-outdoor-kitchen`, `best-outdoor-kitchen-materials-for-florida`,
`gas-electric-and-plumbing-for-an-outdoor-kitchen`, `outdoor-kitchen-layout-guide`,
`how-much-does-a-pool-screen-enclosure-cost-in-florida`.

### Created in this implementation (3)
`cold-plunge-integration-florida-pool-construction` (P1), `dark-pool-finishes-in-florida` (P1),
`pool-automation-for-new-construction` (P2). See `SEO_BLOG_GAP_ANALYSIS.md`.

## 6. Claim registry for the legacy rewrites

| Claim (as published today) | Status | Handling |
|---|---|---|
| «Florida requires building permits for all in-ground and above-ground pools over 24 inches deep per FBC Chapter 45» | REWRITE | Permits are issued by the local building department under the Florida Building Code; depth thresholds are not stated; above-ground intent dropped |
| «FBC 7th Edition 2020, effective December 31, 2023» | REMOVE | The 8th Edition (2023) became effective 31-Dec-2023 (Florida Building Commission). Stated with source |
| «DBPR oversees the CPCG contractor license… 4 years experience and a $305 application fee» | REMOVE | DBPR licenses pool/spa contractors (Certified Pool/Spa Contractor, CPC); no fee or years quoted; link to the DBPR licence lookup |
| «In 2023, Florida DBPR stats show 15,247 pool permits issued statewide» | REMOVE | No such statistic |
| County fee tables (Miami-Dade $1.25/sqft, Broward $0.75/sqft…) | REMOVE | Fees are set per jurisdiction; reader is pointed to the county portal |
| Setbacks «5ft side/rear, 10ft corner, 7.5ft Miami-Dade R-1» | REMOVE | Setbacks are zoning, per jurisdiction |
| «Miami-Dade 2023 data shows 35% first-time barrier fails»; «Re-inspections cost $95» | REMOVE | Invented |
| Product models (Magnum Gates #SG48, Square D QO250GFICP, Pentair Amerlite…) | REMOVE | Not relevant, unverifiable |
| «Florida pool construction requires 7 mandatory inspections… 15-30 day timeline» | REWRITE | Inspections are scheduled by the jurisdiction; typical stages described without a count or days |
| Cost ranges by pool type (e.g. «$50,000 to $150,000», «fiberglass $50K-$80K») | REMOVE | Only the approved estimator table may be cited (`contenido/BRIEF.md`) |
| Week-by-week timelines («Weeks 1-8 permitting», «8-12 weeks») | REWRITE | Sequence and dependencies only |
| «Boost your property value by up to 20%, Zillow» · «237 sunny days» · Houzz 2024 table · «FS 193.155 50% homestead exemption» · city ROI table | REMOVE | Invented or misattributed |
| «40% failure rates», «12% sinkhole risk», «LeakTrac study», «$18,000 Tampa redo» | REMOVE | Invented |
| «Commercial pools cost $95-150 per sq ft» · «DOH Table 3-1» | REMOVE / REWRITE | FAC Chapter 64E-9 is the public pool rule; no $/sq ft |
| Product prices in the design guide (Blaze LTE 32 $2,499…) · «170 mph», «200 mph» | REMOVE | Not verifiable; wind design is per FBC risk category and location |
| «Licensed & Insured», licences CPC1461119 / CPC1460562 / SCC131153553 | EVIDENCE REQUIRED (client) | Kept as already published |
