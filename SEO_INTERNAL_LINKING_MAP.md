# Internal Linking Map

Measured, not planned. Every count below comes from the final static build of this branch
(`.vercel/output/static`, 159 HTML pages, built 1-Oct-2026 with `MM_SANITY_CACHE=1
PUBLIC_ES_PRODUCCION=1`). Two counters were used:

- **Editorial links**: `<a href>` inside the article body of the 47 blog posts (the `.w-richtext`
  block, before «Most Read Articles»). These are the links an editor wrote.
- **Body links**: every `<a href>` on a page after stripping `<nav>` and `<footer>`. The Webflow
  mega-menu lives inside a `div.navbar`, so hub and city totals from this counter still include
  menu links; it is only used to prove that no page is orphaned.

The intent registry (`src/data/seo-intent-registry.json`, 32 intents) names one owner URL per
intent and the support pages (`apoyo`) that should link to it. The map below reports, per owner,
whether that support actually links today.

## 1. Linking rules applied

1. One owner per intent (see `SEO_KEYWORD_URL_MAP.md`). Support pages link **to** the owner; they
   do not compete with it.
2. Anchor text describes the destination («what permits are required for pool construction in
   Florida», «pool builders in Gainesville»), never «click here» or a bare URL.
3. No article links to itself. The 7 legacy self-links in «Most Read Articles» are gone (the
   `relatedPosts` of the 10 rewritten articles no longer include the article).
4. Blog → hub → city flow: every New Pool article links the New Pool hub; every Remodel article
   links the Remodel hub; North-Florida articles link Gainesville and Ocala.
5. No link to maintenance, cleaning, DIY or above-ground content (guide STEP 22).
6. Dead links are removed, not redirected: `/blogs/landscaping-around-a-pool` (never existed) was
   linked from a legacy article and is gone.
7. Links are added only on surfaces that are not frozen by the text gate (`check:texto` compares
   innerText 100 % against the Webflow baseline): blog bodies (Sanity), the paid-landing layer
   (`captacion-servicios.json`, declared) and FAQ answers. Webflow body copy of the hubs, the
   regional hubs and the 51 other city pages is **not** edited.

## 2. Owners and their inbound links (final build)

### Commercial owners

| Owner | Intent | Editorial inbound from articles | Support pages that link it | Support that does NOT link it | Status |
|---|---|---|---|---|---|
| `/services/custom-pool-spa-builders-in-north-south-florida` | New pool construction, North Florida | **21** articles (all 11 New Pool cluster articles + 10 others) | permits, process, timeline articles; Gainesville and Ocala landings; `/where-we-serve/north-florida` | — | Complete |
| `/services/pool-remodeling-renovation-in-north-south-florida` | Complete pool remodeling | **12** articles (all 7 Remodel cluster articles + 5 others) | new-vs-remodel, remodel-or-rebuild, remodel cost, resurfacing-vs-renovation | — | Complete |
| `/pool-builders/gainesville-florida` | Pool builder Gainesville / Alachua | **4**: `building-a-pool-in-north-florida` (intro + closing), permits article, process guide, `pool-and-spa-or-pool-only` | the North Florida article, Alachua county page (menu) | `/where-we-serve/north-florida` body (frozen Webflow copy) | Reinforced; one gap declared below |
| `/pool-builders/ocala-florida` | Pool builder Ocala / Marion | **4**: same four articles | the North Florida article, Marion county page (menu) | `/where-we-serve/north-florida` body (frozen) | Reinforced; one gap declared below |
| `/where-we-serve` | Generic «pool builders / near me» | 0 | — | the New Pool hub (frozen Webflow body) | **Open** (§4) |
| `/where-we-serve/north-florida` | Regional North Florida | 1 (`building-a-pool-in-north-florida`) | 14 service pages (menu) | — | Reinforced |
| `/where-we-serve/south-florida` | Regional South Florida | 0 | 14 service pages (menu) | — | Phase 2 (not in scope) |
| `/pool-cost-estimator` | Pool cost / estimate tool | **27** articles (every cost figure in the rewritten articles points here) | cost article, remodel cost article | — | Complete |
| `/financing` | Financing | 1 | — | — | KEEP |
| `/industry-solutions` | Commercial pools | 2 (both commercial articles) | — | — | Complete |
| `/request-estimated` | Conversion | **32** articles (closing CTA) | all | — | Complete |
| `/gallery` · `/projects` | Project proof | 24 · 0 editorial (`/projects` is linked from every page's showcase CTA «See all Projects») | — | — | KEEP |

### Informational owners (New Pool cluster)

| Owner | Editorial inbound (articles) | Support per registry | Links? |
|---|---|---|---|
| `what-permits-are-required-for-pool-construction-in-florida` | 12 | — | — |
| `complete-guide-to-pool-construction-in-florida-costs-timeline-process` | 5 | — | — |
| `how-much-does-a-custom-pool-cost-in-florida` | 11 | `/pool-cost-estimator` (tool page body is frozen; the article links the tool, not the reverse) | tool → article: no (declared gap, low value) |
| `pool-construction-timeline-in-florida-what-to-expect-from-start-to-finish` | 9 | — | — |
| `common-pool-construction-mistakes-we-see-in-florida` | 2 | — | — |
| `before-you-build-a-pool-in-florida` | 10 | — | — |
| `how-to-choose-a-pool-builder-in-florida` | 10 | — | — |
| `what-makes-a-pool-look-custom` | 4 | `top-10-luxury-pool-designs-for-florida-homes` | yes |
| `pool-and-spa-or-pool-only` | 3 | — | — |
| `building-a-pool-in-north-florida` | 4 (`before-you-build`, `mistakes`, `complete-guide`, `permits`) | Gainesville, Ocala landings | **no** — city page text is escaped (no `<a>` in FAQ answers); the reverse link (article → both cities) is in place. See §4 |
| `pool-upgrades-worth-planning-before-construction` | 12 | `pool-automation-for-new-construction` | yes |
| `top-10-luxury-pool-designs-for-florida-homes` | 3 | `dark-pool-finishes-in-florida`, `pool-automation-for-new-construction` | yes (both) |
| **`pool-automation-for-new-construction`** (new) | 3: `pool-upgrades…` §6, `top-10-luxury…`, `dark-pool-finishes…` | `pool-upgrades…` | yes |
| **`cold-plunge-integration-florida-pool-construction`** (new) | 1: `pool-and-spa-or-pool-only` (+ `/blogs-tips` card) | `pool-and-spa-or-pool-only` | yes |
| **`dark-pool-finishes-in-florida`** (new) | 3: `pool-resurfacing-vs-full-pool-renovation`, `what-makes-a-pool-look-custom`, `top-10-luxury…` | `pool-resurfacing-vs-full-pool-renovation` | yes |

### Informational owners (Remodel cluster)

| Owner | Editorial inbound | Support per registry | Links? |
|---|---|---|---|
| `new-pool-construction-vs-pool-remodeling-which-is-right-for-you` | 4 | `remodel-or-rebuild-your-pool` | yes (cross-linked both ways) |
| `remodel-or-rebuild-your-pool` | 5 | — | — |
| `how-much-does-a-pool-remodel-cost-in-florida` | 7 | `/pool-cost-estimator` (frozen tool page) | no (same declared gap) |
| `pool-resurfacing-vs-full-pool-renovation` | 7 | — | — |
| `what-to-upgrade-during-a-complete-pool-remodel` | 6 | — | — |
| `how-long-does-a-pool-remodel-take-in-florida` | 1 | — | — |

**Orphan check**: 0 of the 47 articles lack an inbound link from another article (before this
implementation: 1, the cold-plunge article right after creation). Every article is also linked
from `/blogs-tips` (server-rendered cards) and from its service page where that service has its
5 cards.

## 3. Links added in this implementation

| From | To | Anchor / placement | Why |
|---|---|---|---|
| 10 legacy articles (rewritten) | New Pool hub or Remodel hub; `/pool-cost-estimator`; `/request-estimated`; 2-4 sibling articles each | descriptive anchors in body; closing CTA | P0-1: hub not indexed on www; every strong legacy page now votes for the hub |
| `what-permits-are-required…`, `complete-guide…` | `/pool-builders/gainesville-florida`, `/pool-builders/ocala-florida`, `building-a-pool-in-north-florida` | «which office reviews the permit» / «building in North Florida» | Local reinforcement from the two strongest non-brand pages |
| `pool-upgrades-worth-planning-before-construction` §6 | `pool-automation-for-new-construction` | «what to decide about automation before the pour» | Registry support for the new article |
| `pool-and-spa-or-pool-only` | `cold-plunge-integration-florida-pool-construction` | new paragraph «A cold plunge, if one is on the list» | Only support link the new article had none of |
| `pool-resurfacing-vs-full-pool-renovation` | `dark-pool-finishes-in-florida` | new paragraph on finish colour at resurface time | Remodel-side entry into the new article |
| `what-makes-a-pool-look-custom` | `dark-pool-finishes-in-florida` | new paragraph after «Where it always earns its cost» | Design-side entry |
| `top-10-luxury-pool-designs-for-florida-homes` (rewrite) | `dark-pool-finishes-in-florida`, `pool-automation-for-new-construction`, `what-makes-a-pool-look-custom` | in body | Registry support |
| `building-a-pool-in-north-florida` intro | `/pool-builders/gainesville-florida`, `/pool-builders/ocala-florida` | first sentence («Building a pool in Gainesville or Ocala») | The article already linked both cities in its last paragraph; the intro link puts the vote above the fold |
| 3 new articles | New Pool hub, Remodel hub (dark finishes), estimator, `/request-estimated`, 3-4 siblings each | body + closing | Standard cluster wiring |
| `new-pool-construction-vs-pool-remodeling…` ↔ `remodel-or-rebuild-your-pool` | each other | «renovate or tear out and rebuild» / «build new or renovate what you have» | Cannibalization split E3 |

Removed: 7 self-links («Most Read Articles» of the legacy 10); 1 dead link.

## 4. Gaps left open, with the reason

| Gap | Why it was not closed here | Recommended closure |
|---|---|---|
| `/where-we-serve` has 0 editorial inbound links; the hubs do not link it | The New Pool hub body is Webflow copy frozen by `check:texto`; the only editable surfaces on the hub are the paid-landing layer and the FAQ (answers are escaped text, no `<a>`) | Add a declared `LINEAS_ANADIDAS` line to the hub's captacion layer («See every area we serve») or link it from the home's service-area block in a text encargo |
| `/where-we-serve/north-florida` does not link Gainesville / Ocala in its body | Same: frozen Webflow copy; the regional hub's only own block is the project showcase | Same mechanism (one declared line) |
| Gainesville / Ocala landings do not link `building-a-pool-in-north-florida` or their county page from the body | FAQ answers are escaped (`check:ads` rule 14 requires the schema text to equal the visible text, and the visible text is plain) | Extend the captacion layer with an optional `enlaces` block rendered under the FAQ, declared in `check-texto.mjs` (`bloquesCaptacion()`), then add the two links per city |
| `/pool-cost-estimator` does not link the cost articles | Tool page body frozen | Low value; the flow is article → tool, which exists (27 inbound) |
| `/where-we-serve/south-florida` has 0 editorial inbound | Out of scope (North Florida first) | Phase 2 South Florida guide links it |

## 5. Hub outbound (what the two hubs link today, body only)

- **New Pool hub** → `/where-we-serve/north-florida`, `/where-we-serve/south-florida`, 5 blog cards
  (`how-much-does-a-custom-pool-cost`, `before-you-build-a-pool`, `pool-upgrades-worth-planning`,
  `how-to-choose-a-pool-builder`, `what-makes-a-pool-look-custom`), `/blogs-tips`, all 53 cities.
- **Remodel hub** → the two regional hubs, 5 blog cards (`how-much-does-a-pool-remodel-cost`,
  `pool-resurfacing-vs-full-pool-renovation`, `pool-remodeling-decisions…`,
  `remodel-or-rebuild-your-pool`, `what-to-upgrade-during-a-complete-pool-remodel`), `/blogs-tips`,
  all 53 cities.
- **Gainesville / Ocala** → the 14 service pages, 10 blog cards (legacy 9 + process guide),
  `/blogs-tips`, the two regional hubs, their county page (menu).

The blog cards on the hubs were not changed: both hubs already had their 5 cards, and swapping a
card would remove an existing link to a strong page for a new one with no equity yet. The new
articles enter through the article bodies instead (§3).
