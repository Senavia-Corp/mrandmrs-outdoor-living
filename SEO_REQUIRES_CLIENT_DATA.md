# SEO — Items That Require Real Business Information

Everything below was **left in its safest current state** because completing it would mean inventing
business facts. Nothing here was guessed. This file supersedes and carries forward
`REQUIRES_CLIENT_CONFIRMATION.md` (1-Oct-2026); items from that file are marked ↺.

How to use it: answer an item, and the change it unlocks is listed in the last column. Most are a
single data edit (`src/lib/identidad.mjs`, `src/data/*.json` or a Sanity field) followed by a build.

## 1. Licences, insurance and company identity (E-E-A-T, schema)

| # | Needed | Why | Current safe state | Unlocks |
|---|---|---|---|---|
| 1 ↺ | Confirm **CPC1461119**, **CPC1460562** and **SCC131153553** are active, the holder (company or qualifier) and the exact class of each. A 4-Oct-2026 public search found CPC1461119 and CPC1460562 as Florida pool contractor licences; **SCC131153553 was not found**. The site calls the SCC licence "Structural" on `/about` and "aluminum contractor" on the pergola page. | Published on every page and in the `#negocio` JSON-LD | All three published as before; schema uses generic descriptions. Single source: `src/lib/identidad.mjs` (+ `check:identidad`) | Exact licence class in schema and on `/about`; DBPR lookup link next to each number |
| 2 ↺ | **Insurance in force** (general liability, workers' comp) | "Licensed & Insured" appears site-wide | Kept as published (typo "Licensed & Insurance" fixed on the home hero) | Keep or reword the badge |
| 3 ↺ | **Years in business**, founding year, number of projects completed, awards, associations (e.g. PHTA/APSP, FSPA, BBB) | Strongest experience/authority signals; none is documented | Nothing published | About page facts, `foundingDate`, `memberOf`, `award` in schema |
| 4 | "**Former professional athletes**" and "decades of combined experience" (`/about`) | Biographical claims | Kept as published (Webflow copy) | Named team bios with roles (author/reviewer attribution for the blog) |
| 5 ↺ | **Postal address** (is there a publishable office?), opening hours, price range | `LocalBusiness.address`, GBP consistency | Omitted; service-area business with `areaServed` | `address`, `geo`, `openingHoursSpecification` |
| 6 ↺ | More **`sameAs` profiles** (Facebook is linked in the footer but not in schema until confirmed as official; Houzz, BBB, Yelp, LinkedIn) | Entity confirmation for search and AI systems | GBP, Instagram, YouTube only | Add to `PERFILES` in `src/lib/negocio.mjs` |
| 7 ↺ | **Review markup**: GBP shows 4.1 over 13 reviews (fetch-resenas) while the site shows 8 selected 5-star reviews | Marking up a curated subset would be misleading | No `aggregateRating` or `Review` schema anywhere | Nothing, unless an eligible, complete source is agreed |

## 2. Promises and figures

| # | Needed | Current safe state |
|---|---|---|
| 8 | **Warranty** terms (structure, finish, equipment) | `/about` FAQ question about warranties **replaced** (it answered "Yes…" with a generic commercial sentence). Deck page "25-year manufacturer warranties" and screen rooms "20 to 30 years" left in place, flagged in `seo-audit/claim-verification.md` |
| 9 | Typical **project timelines** (new pool, complete remodel) from real projects | Money-page FAQ answers rewritten without "three to six months" / "four to eight weeks"; the construction sequence is explained instead |
| 10 | **Energy-savings** figures | "Up to 90 %" removed; the remodel FAQ cites §553.909, F.S. (two-speed pumps ≥1 hp) — a verifiable rule, not a savings claim |
| 11 | **Home-value** figures | "Approximately 7 %" removed |
| 12 ↺ | "We call you back within **24 hours**" and "**fixed project price** in writing before you commit" (lead forms) | Kept (approved copy R17/R20); confirm both are met |
| 13 ↺ | **3D design on every** new-pool project | Kept as published |
| 14 | Secondary service pages still publish unsourced percentages: irrigation "20–40 %", "up to 90 % efficiency", "30 % or more"; landscaping "up to 20 % property value"; outdoor kitchens "recover up to 80 %"; soffit LED "up to 80 % less energy" | Left as published (outside the core pool topics of this remediation); listed in `seo-audit/claim-verification.md` → provide sources or approve qualitative rewrites |
| 15 ↺ | **Financing** partner names / terms | Generic wording (TILA/Reg Z decision 2-Sep-2026) |
| 16 ↺ | Does the company take **resurfacing-only / tile-only** jobs? The remodel form offers "Resurfacing or Tile Only" | Kept; remodel page copy now frames repairs and equipment inside a complete renovation |

## 3. Local proof (Gainesville, Ocala and the other city pages)

| # | Needed | Current safe state |
|---|---|---|
| 17 ↺ | **Any completed project in Gainesville / Alachua County or Ocala / Marion County** (with permission to name the city), ideally with before/progress/after photos | Carousel no longer says "Browse our Gainesville portfolio"; it says "Selected custom pool and outdoor living projects from our Florida portfolio". No project is attributed to a city |
| 18 ↺ | **Verified city/county** for each of the 15 project pages | Projects still say "North Florida" / "South Florida". New optional Sanity fields are ready (`verifiedCity`, `county`, `permittingJurisdiction`, case-study fields) |
| 19 ↺ | Typical **permit review times** at City of Gainesville, Alachua County, City of Ocala, Marion County | Not quoted. The FAQ now links the four official offices (verified 4-Oct-2026) |
| 20 ↺ | **Service radius / ZIP list** per market | Not published |
| 21 | Which South Florida city pages are commercially worth keeping vs. consolidating (33 marked INVESTIGATE in `SEO_URL_INVENTORY.md`) | All kept indexed; needs Search Console clicks/impressions per URL |
| 22 ↺ | Before/after **pairs** of the same pool for the remodel page | Slider uses verified real work, not paired shots |

## 4. Accounts, tracking and deployment follow-ups

| # | Needed | Why |
|---|---|---|
| 23 | **Import `gtm-container.json` into GTM** (or confirm the live container has equivalent GA4 event tags) | The site pushes `generate_lead`, `click_to_call`, `estimator_complete`, `brochure_download`, `view_project_gallery` to the dataLayer; they only reach GA4 if the container has tags for them. Not changeable from the repo |
| 24 | **Consent mode** decision (Florida has no GDPR-style mandate; needed only if EU/state privacy scope or Ads policy requires it) | No consent mode today |
| 25 ↺ | GTM hostname filter for `localhost` and `*.vercel.app` | Preview noise in GA4 |
| 26 | **Google Ads**: update Final URLs of "Pool Builders Core", "Ocala", "Gainesville", "Remodeling" to the `/services/...` URLs (today they arrive through one 308), and align ad copy with the new primary CTA "Request a Design-Build Project Evaluation" | Message match on paid landing pages |
| 27 | **Search Console**: resubmit the sitemap; inspect `/services/pool-builders`, `/services/pool-builders/gainesville-fl`, `/services/pool-builders/ocala-fl`, `/services/pool-remodeling`; run the Rich Results test on a city page (new `Service` node), `/about` (FAQ) and the home (`WebSite`) | No GSC access from this environment |
| 28 ↺ | **Deploy the Sanity Studio** so editors see the new optional `project` fields | `cd studio && npx sanity deploy` from a machine logged into Sanity |
| 29 ↺ | `mrandmrsoutdoorsliving.com` (extra "s") domain: redirect to the main site? | Untouched |
| 30 | **CrUX / field data** (PageSpeed Insights origin report) after 28 days | Lighthouse numbers in the report are lab numbers |
