# Nestwell — Phases 1–3

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
Prisma 6, PostgreSQL 16 and Zod. Natural-language and traditional search are available at `/for-sale`, with a
search hero at `/`. Voice and authentication are reserved for later phases.

## Run locally

Requires Node.js 22+ and pnpm 11. PostgreSQL must allow creation of Prisma's
shadow database for `migrate dev` (the local Compose user does).

```sh
cp .env.example .env
# Optional: start the included local PostgreSQL instance.
docker compose up -d --wait
pnpm install
pnpm prisma migrate dev
pnpm db:seed
pnpm dev
```

Open http://localhost:3000/health to see `ok`, 100 properties, 5 agents and 2
users. Database failures surface as errors rather than reporting a healthy
status. This development diagnostics page should be protected or removed
before a public production release.

```sh
pnpm lint
pnpm build
pnpm start
```

`pnpm db:migrate --name your_change` creates/applies development migrations.
`pnpm db:reset` **deletes all database data**, reapplies migrations and seeds.
For production migration application, use `pnpm prisma migrate deploy`.
Environment secrets and local `.env` files are ignored by Git.

## Demo data

- Twenty fictional listings each in London, Manchester, Birmingham, Leeds and
  Bristol, with approximate neighbourhood coordinates and illustrative photos.
- All Phase 1 listings are for sale, with GBP prices stored in **pence**.
  The schema also supports rental listings for subsequent phases; a rental
  pricing period should be agreed before adding rental data.
- Eight property types, 1–6 bedrooms, 1–4 bathrooms, 3–8 fixed Unsplash photo
  URLs per listing and descriptions of 3–4 sentences. Photos are illustrative
  and may repeat; bundled copies are used in the Phase 2 UI.
- Demo users: `emma.wilson@example.com` (3 favorites, 1 saved search) and
  `oliver.taylor@example.com` (4 favorites, 2 saved searches). These are records,
  not login accounts; authentication is not implemented yet.
- Idempotent upserts use agent email, property address + postcode, user email,
  property image order, user + property favorites, and user + saved-search name.
  A transaction and advisory lock make failures atomic and concurrent reruns
  safe. Unrelated records are preserved. Demo records are restored on reruns.
- Added natural-key unique constraints support seed upserts. Property images,
  favorites and saved searches cascade on parent deletion; deleting a user
  retains enquiries with a null user reference.

Sold and Agents navigation remain disabled stubs. All requested shadcn base
components are in `src/components/ui`; toast and tooltip providers are mounted
in the root layout. `src/lib/db.ts` holds the hot-reload-safe Prisma singleton.
No OpenAI, Mapbox, authentication or Redis service is called in Phase 1.

## Phase 2 — results and property details

Visit `/for-sale` to browse listings and `/property/<id>` for a listing’s details.
The Buy and Rent navigation links open the corresponding results. Sold and
Agents remain stubs. Voice search, persistent saves and sending contact enquiries are deferred.
Natural-language search is implemented in Phase 3 below.

### Search API

`GET /api/properties` returns `{ results, total, page, pageSize }`. Each listing
includes its agent’s name/logo and its first ordered image. `GET
/api/properties/<id>` returns the full listing, all ordered images, full agent
and `similarProperties: []`. Missing properties return HTTP 404.

Supported query parameters:

| Parameter                        | Meaning                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `listingType`                    | `SALE` (default) or `RENT`                                                                        |
| `city`, `postcode`               | Case-insensitive exact city and postcode prefix                                                   |
| `lat`, `lng`, `radiusKm`         | Latitude/longitude centre and great-circle radius in kilometres; radius requires both coordinates |
| `priceMin`, `priceMax`           | **Pounds**, converted to pence for database filtering                                             |
| `bedsMin`, `bedsMax`, `bathsMin` | Inclusive room bounds                                                                             |
| `propertyTypes`                  | Comma-separated schema enum values; any selected type matches                                     |
| `features`                       | Comma-separated feature names; **all** selected features must match                               |
| `sort`                           | `newest` (default), `price_asc`, `price_desc`, `relevance` (currently newest)                     |
| `page`, `pageSize`               | One-based page, default size 20, maximum size 50                                                  |

Prices in API **responses** remain in pence. Results include all property
statuses, which are shown on cards. All sort orders include an ID tie-breaker
for stable pagination. Invalid or repeated query parameters return HTTP 400
with `{ error: { code, message, details } }`; sizes greater than 50 are rejected.
Unrecognized query keys are ignored. Database errors use the same envelope.

Example: `/for-sale?city=London&priceMax=600000&bedsMin=3` reproduces the exact
filters (the updated seed includes a £575,000 three-bedroom terraced demo home).

`GET /api/locations/autocomplete?q=Lon` returns `{ results: [{ label, city,
postcode?, latitude, longitude }] }`, up to eight distinct matches derived from
property data. Coordinates are the average of matching stored property
coordinates. Picking a suggestion enables the radius slider (default five
miles, converted to kilometres in the URL). City/postcode and radius predicates
are combined. Typing a location clears its old coordinates; city/postcode
filtering still works without choosing a suggestion.

The filter panel updates the URL after 300ms; Apply flushes pending changes.
Sorting/pagination update immediately, filter changes reset to page one, and
browser back/forward restores controls and results. `view=grid|list` is stored
in the URL for presentation. TanStack Query retains and dims previous results
while loading a new query. An invalid URL shows a recoverable error state;
empty searches offer Reset. Reset restores default SALE results.

Contact form validation is local Zod validation only; no enquiry is transmitted
or stored. Save buttons show a preview toast and do not write favorites.

### Images

Eight illustrative Unsplash photos from the seed are bundled in
`public/images/properties` for dependable local browsing. Their original photo
IDs and source URLs are retained in `prisma/seed.ts`; `property-images.ts` maps
those known URLs to bundled copies. Agent placeholders are bundled SVG logos.
`next/image` handles responsive property images with a local fallback.

### Verification

With a running development or production server and a seeded `.env` database:

```sh
pnpm test:integration
# Override the server origin when needed:
TEST_BASE_URL=http://localhost:3001 pnpm test:integration
pnpm lint
pnpm build
```

The read-only integration checks compare API output with PostgreSQL records,
including price units, combined filters, radius, pagination, validation,
autocomplete and full details for every seeded property. Stop `pnpm dev` before
building; both commands write to `.next`.

## Phase 3 — natural-language search

The home hero and results page share `SearchBar`. Try the clickable examples or
submit your own query (1–300 characters). The microphone remains a Phase 4
placeholder. Search submits `POST /api/search/parse` then navigates to
`/for-sale?q=...`; URLs can also be opened directly.

### Provider and fallback

Set `OPENAI_API_KEY` in the server's `.env` to enable OpenAI `gpt-4o-mini`.
The key is optional, never bundled in client code, and the SDK is instantiated
only when a request needs it. Structured outputs use a strict Zod wire schema
with nullable optional fields; the public schema uses optional fields and
validates bounds. Confidence is added after parsing (0.9 for unambiguous model
output, 0.65 for ambiguous output). No retries extend the six-second provider
deadline. Timeouts, refusals, invalid output and provider/network failures use
the regex fallback. Without a key, the provider is never called.

The fallback recognizes UK cities/postcodes, buy/rent, bedroom/bathroom ranges,
£/k/m prices, type keywords, known features, soft preferences and distance units.
It uses 0.4 confidence and asks up to three clarifying questions when intent or
location is missing. Unresolvable locations produce no results; unrecognized
text uses a literal title/description keyword search. Hard bounds are never
silently relaxed. Ordinary features influence ranking; explicitly stated
must-haves and traditional feature checkbox selections are required.

The parser endpoint returns the parsed fields plus `cached`, `modelUsed` and
`latencyMs`. Invalid input uses the existing structured error envelope. A
process-local limiter allows 20 POST requests/minute/IP with HTTP 429 and
`Retry-After`. **Production should use Redis** for a shared limiter across
processes/instances, rate-limit direct `q` search requests at the gateway too,
and configure the trusted ingress to overwrite forwarded IP headers. The demo
reads `X-Forwarded-For`/`X-Real-IP`, falling back to one unknown-client bucket.

### Cache and logs

Apply `search_query_cache` with the normal Prisma migration command.
`SearchQuery` now stores an indexed SHA-256 `queryHash`, `cacheExpiresAt` and
`cached`, plus provider-configuration scope. Adding a key immediately bypasses
cache entries produced without a key. Queries normalize Unicode (NFKC), case and whitespace. Every parser
call, including cache hits and simultaneous callers, writes its raw query,
parsed JSON, model, latency and confidence to an individual audit row. Cache
hits retain the original absolute expiry, so repeated requests do not extend
the 24-hour TTL. The hash is indexed rather than unique because audit rows
intentionally repeat it. Concurrent misses in one process share provider work.
Invalid/expired cached output is ignored. Cache/audit storage failures do not
crash parsing; audit failures warn on the server. Configure log retention and
cache cleanup for a production service.

A forced `parser=keyword` path keeps browsing available if the parse POST fails
or is rate-limited. The UI shows “Smart search unavailable — using keyword
search.” and the summary identifies keyword interpretation and confidence.
Removing the key bypasses cached model entries and uses a fallback entry or a
fresh fallback parse.

### Filtering, ranking and chips

`GET /api/properties?q=...` merges parsed hard filters with explicit URL
filters (explicit values win), then scores the complete remaining set **before
pagination**. Natural-language queries default to `relevance`; traditional
search still defaults to `newest`. Explicit price/newest ordering remains
available. Responses include `relevanceScore` (0–100), `matchReasons`, effective
`parsed`, `originalParsed`, `filterState` and parser/cache metadata.

The deterministic score consists of feature overlap (40), matching preference
keywords in title/description (30), closeness to a GBP target price (15), and
recency decreasing over 90 days (15). Missing preference components contribute
zero. “Cheap” uses the cheapest remaining listing as the price target. Ties
break by recency then ID. Reasons cite stored features, requested room bounds,
budget, location or literal description wording. They never invent school
ratings, school counts, travel times or distances to amenities.

General “house” includes house, terraced, semi-detached and detached enum types.
An inferred radius uses the centroid of matching seeded locations. Explicit
location filters replace the inferred location group. `bathsMax` is also
supported to preserve parsed bathroom ranges.

Chips edit/remove the same filters shown in the panel, with the same 300ms
URL debounce. `omit=priceMin,priceMax,...` records explicitly cleared inferred
fields so they remain cleared after reload/back/forward. Feature chips retain
their ranking role via `featureMode=ranked`; selecting traditional feature
checkboxes sets `featureMode=required` and keeps the Phase 2 AND-match behavior.
An explicit API `features` parameter is required/AND-match by default. Soft
preference chips use `softPreferences` (comma-separated) and can be edited or
removed. Clearing all filters resets the query as well. Clarifying quick
replies append an answer to the query and resubmit it.

Two fictional demo listings were refined in the idempotent seed: a £575,000
three-bedroom London terrace with garden/parking, and an affordable Bristol
family terrace with the near-schools feature. Totals remain 100 properties,
5 agents and 2 users. The home page features the six highest-priced ACTIVE
listings.

### Tests

```sh
pnpm test                  # Vitest: mocked provider/fallback/cache/timeout, ranking, merging
pnpm test:integration      # Running server + seeded PostgreSQL required
pnpm lint
pnpm build
```

The integration suite checks all five flagship examples, explicit overrides,
chip omissions, ranking before pagination, cache hits/absolute expiry/audit
rows, input validation and POST rate limiting, alongside the Phase 2 checks.
The expiry test updates only its own uniquely tagged test cache rows. Unit tests
mock OpenAI, so no live key or billable provider calls are needed for them.
