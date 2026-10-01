# Keyword → URL Map (content intent registry)

One primary owner per search intent. «Today» = the page Google served most in GSC
(2026-07-02 → 2026-09-29, apex+www merged). Where today ≠ owner, the work is internal-link
reinforcement and copy alignment, never a new URL. Machine-readable copy of the same registry:
`src/data/seo-intent-registry.json` (used by the blog gate to warn on duplicate ownership).

## Commercial / transactional

| Intent | Representative queries (impr) | Owner URL | Today | Status |
|---|---|---|---|---|
| New pool construction, North Florida (custom pool builders, inground pool contractors) | «inground pool contractors near me» 233 · «custom pool builder near me» 97 · «custom pool construction» 87 · «in ground pool contractor near me» 91 | `/services/custom-pool-spa-builders-in-north-south-florida` | Pembroke Pines city page / home | **Not indexed on www** → P0-1 |
| Pool builder Gainesville / Alachua | «new pool construction gainesville» 13 · «custom pool builder gainesville» 11 · «pool builders gainesville fl» 11 | `/pool-builders/gainesville-florida` | same (pos 27) | Reinforce |
| Pool builder Ocala / Marion | «custom pool builder ocala fl» 34 · «pool builder ocala» 29 · «pool builder marion county» 17 | `/pool-builders/ocala-florida` | old slug `/pool-builders/pool-builders-ocala-florida` (308) | Reinforce; consolidation monitored |
| Complete pool remodeling / renovation, North Florida | «pool and spa renovations florida» 11 · «florida pool renovations» 2 · city variants (Boca 131) | `/services/pool-remodeling-renovation-in-north-south-florida` | city pages (South FL) | Reinforce + copy sharpened to *complete* renovation |
| Generic «best pool builders / near me» (no city) | «best pool builders» 91 · «best pool builder near me» 88 · «pool contractors near me» 198 | `/where-we-serve` | Pembroke Pines | Decided in SEO-AEO-GEO-PLAN §2.1; hubs link to it |
| Regional North Florida | «barn builders north florida» · «best outdoor living contractor in gainesville» | `/where-we-serve/north-florida` | home | Reinforce |
| Regional South Florida | «pool builders south florida» 485 · «custom pool construction south florida» 116 | `/where-we-serve/south-florida` | old `/where-we-serves/…` slug (308) | Phase 2 |
| City (any of the 51 others) | «pool builders {city}» | `/pool-builders/{city}-florida` | same | KEEP (see inventory) |
| Pool cost / estimate (tool intent) | «pool cost calculator» 21 · «inground pool cost estimator» 17 · «pool builder estimate florida» 86 | `/pool-cost-estimator` | cost guide article (pos 34) and estimator (pos 61) | Cost article now hands off to the estimator |
| Financing | «pool financing florida» | `/financing` | — | KEEP |
| Commercial pools | «commercial pool companies near me» 91 | `/industry-solutions` | — | KEEP |

## Informational / commercial-investigation (New Pool cluster)

| Intent | Owner URL | Status |
|---|---|---|
| Permits required for a pool in Florida (+ barrier/final-inspection requirements) | `/blogs/what-permits-are-required-for-pool-construction-in-florida` | REWRITE (P0-2), EXPAND with barriers |
| Pool construction process end-to-end | `/blogs/complete-guide-to-pool-construction-in-florida-costs-timeline-process` | REWRITE; cost sub-intent handed to the cost article + estimator |
| How much does a custom pool cost in Florida | `/blogs/how-much-does-a-custom-pool-cost-in-florida` | KEEP (uses approved estimator figures) |
| Timeline / how long to build | `/blogs/pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish` | REWRITE (invented week schedule removed) |
| Mistakes / what goes wrong | `/blogs/common-pool-construction-mistakes-we-see-in-florida` | REWRITE (invented statistics removed) |
| Decisions before excavation | `/blogs/before-you-build-a-pool-in-florida` | KEEP |
| Choosing a builder | `/blogs/how-to-choose-a-pool-builder-in-florida` | KEEP |
| Custom design cues | `/blogs/what-makes-a-pool-look-custom` | KEEP |
| Pool + spa | `/blogs/pool-and-spa-or-pool-only` | KEEP |
| North Florida site conditions (Gainesville/Ocala) | `/blogs/building-a-pool-in-north-florida` | KEEP; linked from both city pages |
| Upgrades to plan up front | `/blogs/pool-upgrades-worth-planning-before-construction` | KEEP |
| Luxury pool design ideas / trends | `/blogs/top-10-luxury-pool-designs-for-florida-homes` | UPDATE (no separate «2026 trends» URL) |
| **Pool automation for new construction** | `/blogs/pool-automation-for-new-construction` | CREATE (P2) |
| **Cold plunge integration** | `/blogs/cold-plunge-integration-florida-pool-construction` | CREATE (P1, offering confirmed) |
| **Dark pool finishes & heat** | `/blogs/dark-pool-finishes-in-florida` | CREATE (P1) |

## Informational (Remodeling cluster)

| Intent | Owner URL | Status |
|---|---|---|
| Build new vs remodel the existing pool | `/blogs/new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | REWRITE |
| Remodel vs demolish-and-rebuild | `/blogs/remodel-or-rebuild-your-pool` | KEEP |
| Remodel cost / scope | `/blogs/how-much-does-a-pool-remodel-cost-in-florida` | KEEP |
| Resurfacing vs full renovation | `/blogs/pool-resurfacing-vs-full-pool-renovation` | KEEP |
| What to upgrade while open | `/blogs/what-to-upgrade-during-a-complete-pool-remodel` | KEEP |
| Remodel timeline | `/blogs/how-long-does-a-pool-remodel-take-in-florida` | KEEP |
| Decisions / visual impact | `/blogs/pool-remodeling-decisions-that-transform-an-old-pool`, `/blogs/before-and-after-pool-remodel-ideas` | KEEP |

## Project proof
| Intent | Owner |
|---|---|
| «mr and mrs outdoor living projects / before and after» | `/projects`, `/project/*`, `/gallery` |

## Explicitly NOT targeted (guide STEP 22)
Pool cleaning, routine maintenance, leak repair, equipment-only replacement, supplies, DIY, above-ground pools, «cheap/affordable». Legacy articles that attracted these (above-ground permit queries on the permits article; «maintenance tips» section in the cost guide) are rewritten to drop that intent.
