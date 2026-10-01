# Requires Client Confirmation

Items that could not be verified from the website, the repository, Sanity, an official source or
the approved guide. Nothing below was guessed: each item is either omitted from the site or
worded generically until Sebastian / the client confirms it. Items carried over from earlier
encargos are marked ↺ so they are not lost.

## Business facts (E-E-A-T / schema)
| # | Item | Why it matters | Current handling |
|---|---|---|---|
| 1 | ↺ **Postal address** publishable? (service-area business vs. physical office) | `LocalBusiness.address`, GBP consistency | Omitted; `areaServed` only (`src/lib/negocio.mjs`) |
| 2 | ↺ **Opening hours** and **price range** | `openingHours`, `priceRange` | Omitted |
| 3 | ↺ **Additional profiles** for `sameAs` (Facebook, Houzz, Yelp, BBB, LinkedIn) | Entity confirmation for generative engines | Only GBP, Instagram, YouTube (verified in repo) |
| 4 | ↺ Licences **CPC1461119**, **CPC1460562** and **SCC131153553** current and belonging to the company? | Footer, hero badges and `identifier` in schema state them on every page | Kept as published; verify on https://www.myfloridalicense.com/ |
| 5 | «**Licensed & Insured**» (footer, home, about, where-we-serve, financing) — insurance in force? | Guide STEP 18 | Kept (already published). No «Licensed & Insurance» typo found in `src/`. |
| 6 | Years in business, number of projects completed, awards | Would strengthen About/E-E-A-T | Not published anywhere; nothing added |
| 7 | ↺ `aggregateRating` | GBP shows 4.1 over 13 reviews (fetch-resenas) vs 8 selected 5-star reviews on site | Not emitted |

## Project evidence
| # | Item | Current handling |
|---|---|---|
| 8 | **Verified city/county** for each of the 15 projects. Today every project states only «North Florida» / «South Florida» (`src/data/proyectos-propios.json`, Webflow `location`) | City pages label projects «Florida Project Showcase» / regional; no city attribution. New Sanity fields `verifiedCity`, `county`, `completionYear`, `locationDisclosure` added to the `project` schema (empty until confirmed) |
| 9 | **Alt text** on the Webflow project pages | **Partly resolved 1-Oct-2026**: the 10 showcase covers (660 `<img>` on 66 pages) now carry the alt the same photo already had on `/projects`. Still empty: the 10 cross-sell service thumbnails that the Webflow `/project/*` template repeats on every project page (decorative, not project photos). Describing those needs no client input and is a text encargo |
| 10 | Which gallery photos are **before/after pairs** of the same pool | Needed for a true before/after case study on the Remodel hub; today the slider uses verified real work but not paired shots |
| 11 | Real **client testimonial ↔ project** relationships | `testimonialRelationship` left empty |

## Services / scope
| # | Item | Current handling |
|---|---|---|
| 12 | **Cold plunge integration** offered — **confirmed by Sebastian, 1-Oct-2026** | Article created |
| 13 | **Dark finishes** actually recommended/used (which product families: dark plaster, dark pebble/quartz, glass bead)? | Article written on technical grounds without naming a brand as «ours» |
| 14 | Automation brands installed (Jandy iAquaLink / Pentair IntelliCenter / Hayward Omni) — logos marquee shows Jandy and Zodiac | Article names platforms generically; Jandy/Zodiac mentioned as «brands we work with» only because their logos are already on the site |
| 15 | Does the company take **resurfacing-only / tile-only** jobs? The remodel form offers «Resurfacing or Tile Only» | Kept as is (business decision from R19); hub copy frames components inside a complete renovation |
| 16 | **3D design** offered on every new-pool project (site states it; keep?) | Kept as published |
| 17 | «**We call you back within 24 hours**» (lead forms) and «**fixed project price before you commit**» | Kept as published (R17/R20 copy approved by Sebastian); flagged because both are promises |
| 18 | «**Financing available**» via lending partners — partner names, APR terms | Kept generic (TILA/Reg Z decision 2-Sep-2026) |

## Local facts (Gainesville / Ocala)
| # | Item | Current handling |
|---|---|---|
| 19 | Any **completed project located in Gainesville/Alachua or Ocala/Marion** (even one, with permission to disclose the city) | None verified → city pages show a regional/Florida showcase |
| 20 | Typical **permit review times** at Alachua County / City of Gainesville / Marion County / City of Ocala building departments | Not quoted; only the process and the office are named |
| 21 | Local service radius (ZIP list) for each landing | Not quoted |

## Technical / accounts
| # | Item | Current handling |
|---|---|---|
| 22 | «Request indexing» in Search Console for `/services/custom-pool-spa-builders-in-north-south-florida` (API cannot do it) | Ask Sebastian to click it after merge/deploy |
| 23 | ↺ `mrandmrsoutdoorsliving.com` (extra «s») domain: redirect to main or keep? | Untouched |
| 24 | GTM: block `localhost` and `*.vercel.app` hostnames from GA4 (156 + 25 sessions of noise in 90 days) | Not in repo |
| 25 | Sanity MCP connector | Reconnected by Sebastian on 1-Oct with the Mr & Mrs account (project `m273z6jc`); all 17 document writes of this encargo went through it. Nothing pending |
| 26 | **Deploy the Sanity Studio** so editors see the new optional fields (`blogPost`: primaryService, targetRegion, contentStatus, factChecked, factCheckedAt, reviewedBy, lastSeoAuditDate; `project`: verifiedCity, county, completionYear, classification, locationDisclosure) | The dataset already holds the values for 13 articles; the Studio just does not show them yet | `cd studio && npx sanity deploy` from a machine with the Sanity login (not possible from this container) |
| 27 | **After the production deploy**, confirm `https://mrandmrs-outdoor-living.vercel.app/` answers `308` → `https://www.mrandmrsoutdoorliving.com/` | The redirect is in `vercel.json` and verified in the prebuilt `config.json`, but only a live request proves the platform applies the `has.host` rule | `curl -I https://mrandmrs-outdoor-living.vercel.app/` |
| 28 | Relabel the project carousel heading on Gainesville/Ocala («Florida Project Showcase» instead of a city-specific heading) | The heading comes from Sanity `headingPortfolio` and is anchored by the frozen text baseline; changing it needs a declared line in `check-texto.mjs` | Decide wording; then one declared edit |
| 29 | ~~Approve the references of the remodel hub, Gainesville and Ocala~~ — **done 1-Oct-2026**: Sebastian approved after looking at `audit/seo-safe/*.jpg`; `aprobar-diseno.mjs` wrote the 12 references (sha `ff00adb`), contracts updated | — | `check:menu` and `check:carrusel` remain unrun (director-only) |
