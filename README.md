# Nestwell — Phases 1–5

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
Prisma 6, PostgreSQL 16 and Zod. Natural-language and traditional search are available at `/for-sale`, with a
search hero at `/`. Browser voice input is available on supported browsers;
demo email authentication, saved homes/searches and enquiries are available.

## Run locally

Requires Node.js 24 LTS (24.15+) or 22 LTS (22.22.2+), and pnpm 11. PostgreSQL must allow creation of Prisma's
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
  available through the Phase 5 demo sign-in form.
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
Agents remain stubs. Favorites, saved searches and enquiries are implemented in Phase 5 below.
Voice search is described in Phase 4.
Natural-language search is implemented in Phase 3 below.

### Search API

`GET /api/properties` returns `{ results, total, page, pageSize }`. Each listing
includes its agent’s name/logo and its first ordered image. `GET
/api/properties/<id>` returns the full listing, all ordered images, full agent
and matching `similarProperties`. Missing properties return HTTP 404.

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

Contact enquiries now validate and store records through the authenticated
Phase 5 endpoint. Save buttons update the signed-in user’s favorites.

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
submit your own query (1–300 characters). The microphone uses browser speech recognition as described below. Search submits `POST /api/search/parse` then navigates to
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

## Voice Search

Select the microphone, allow microphone access if prompted, and speak your
query. The language is `en-GB`, with interim results and a single utterance.
Live text and listening/processing status are announced in a polite live region.
The final transcript fills and focuses the input. **It never submits
automatically:** review/edit it, then press Enter or Search. Selecting the mic
again stops capture and waits for final text. Typing or Escape cancels capture
and ignores late events. Leaving the page releases recognition and listeners.

| Browser       | Support                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome / Edge | ✅ Where the browser exposes SpeechRecognition or webkitSpeechRecognition; device, service and policy settings can affect availability |
| Safari 14.1+  | ✅ Partial; OS/browser speech permissions and service availability vary                                                                |
| Firefox       | ❌ Browser speech recognition is normally unavailable; type your query instead                                                         |

Feature detection is authoritative. An unsupported browser shows a disabled mic
with a tooltip available on hover or keyboard focus; ordinary text search stays
available. The optional MediaRecorder/Whisper backend is not implemented: there
is no `/api/voice/transcribe` endpoint and no recording option, even if an
external audio-fallback flag is set. The native path does not require an OpenAI
key. The first-use example hint can be dismissed; its dismissal is stored in
`localStorage` when storage is available.

Permission troubleshooting:

1. Use HTTPS or localhost. An insecure origin cannot use microphone recognition.
2. Open Chrome/Edge's site controls beside the address and allow Microphone.
   In Safari, check Settings → Websites → Microphone and the device's speech
   recognition/dictation permissions.
3. Check the system privacy settings allow the browser to use a connected mic.
4. Reload after changing permission. On managed devices, administrator policy
   may block speech services. The inline **How to enable** dialog has these steps.
5. For no-speech errors, try again and speak clearly; for network errors, check
   connectivity. You can always continue with typed search.

Keyboard users can activate the mic with Enter/Space. Dialogs trap focus, close
on Escape and restore focus to their trigger. Focus outlines cover native and
headless UI controls, and the results count uses an atomic polite live region.
Property photo alternatives include the title and full address. Primary/accent,
muted text and input-boundary contrast were checked; reduced motion disables
animations/transitions and automatic example-placeholder rotation.

To reproduce the checks with a running production server and seeded database:

```sh
pnpm test                  # Includes mocked speech lifecycle and reduced-motion tests
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:browser          # Speech-event mocks, keyboard/focus, unsupported, errors, mobile
pnpm audit:a11y            # Lighthouse home + /for-sale; fails below 95
```

`TEST_BASE_URL` can override the server origin for browser tests and audits.
`CHROME_PATH` can select an installed Chrome/Chromium executable (for example
`/usr/bin/chromium` in this environment). Lighthouse JSON reports are written to
ignored `work/accessibility/`. Browser speech tests simulate recognition events
and permissions; they do not claim to verify acoustic recognition accuracy or
an external speech service. Check real microphone recognition on the intended
Chrome/Edge and Safari devices before release.

Phase 4 production verification: Lighthouse Accessibility **100/100** on both
home and `/for-sale`, with 47 unit tests, 15 integration checks and eight
Chromium browser tests passing.

## Phase 5 — accounts, saved collections and maps

### Demo sign-in

`/sign-in` contains one email field. The NextAuth credentials provider accepts
any valid email and any/omitted demo password, finds or creates that user, and
issues an encrypted JWT in an HttpOnly, SameSite=Lax **browser-session cookie**.
No token is stored in localStorage and no session database adapter is needed.
The JWT also has a one-day expiry. Sign out clears the cookie. Browsing,
traditional/AI search, property details and similar listings remain public.

Use `emma.wilson@example.com` or `oliver.taylor@example.com` for the seeded
accounts. Email identity is deliberately unverified for this demo; replace the
credentials provider with verified authentication before using real accounts.
Set `NEXTAUTH_URL` to the app's actual origin and `NEXTAUTH_SECRET` to a stable
random secret for deployment. If the secret is absent, the single-process demo
uses an ephemeral random secret; restarting logs users out and separate
instances cannot share those sessions.

The header shows Saved and Sign in/Sign out. `/saved` requires sign-in. Favorites
and saved searches are scoped to the session's server-side user ID; client
`userId` fields are rejected. Mutation endpoints additionally reject a supplied
cross-origin Origin header. Keep forwarded host/origin configuration correct
behind a reverse proxy.

### User APIs

| Endpoint                            | Behavior                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/favorites`                | Own `{ results, propertyIds }`, with agent and first image                      |
| `POST /api/favorites`               | `{ propertyId }`; idempotently save a property                                  |
| `DELETE /api/favorites/:propertyId` | Remove only the session user's favorite; idempotent                             |
| `GET /api/saved-searches`           | Own `{ results }`                                                               |
| `POST /api/saved-searches`          | `{ name?, rawQuery?, filters }`; validated URL filters, optional arrays/numbers |
| `DELETE /api/saved-searches/:id`    | Delete an owned search; other users' IDs return 404                             |
| `POST /api/enquiries`               | `{ propertyId, name, email, phone?, message, website? }`                        |

All listed reads/writes require a session and unauthenticated calls return 401.
Favorite hearts on cards and details update optimistically through a shared
TanStack Query cache keyed by user ID; failures roll back the affected property
without erasing other concurrent changes. `/saved` reuses `PropertyCard` and
provides saved-search Run/Delete actions. Search replay retains query, sort,
view, explicit overrides and chip omissions. Legacy seeded pence-based
`maxPrice`/`minPrice` and room aliases are converted to URL pounds/room keys.
Provided saved-search names are unique per user (duplicates return 409);
unnamed searches may be saved independently.

The agent form pre-fills available account details, validates with Zod, and
stores enquiries in PostgreSQL. Submission confirms receipt; agent email
notifications are outside this phase. The hidden `website` honeypot returns a
success response without storing a bot submission. Authenticated attempts are
limited to one per ten seconds/IP with HTTP 429 and Retry-After. This limiter is
process-local; use a shared store such as Redis for multiple instances, and
configure ingress to overwrite forwarded IP headers.

### Map view

Set **`MAPBOX_TOKEN=pk.…`** to a public, browser-scoped Mapbox token, then restart
the server. `/for-sale` reads it at request time; secret `sk.` tokens are never
passed to the client. Missing/non-public tokens disable Map with a keyboard-
and hover-accessible tooltip. The Mapbox SDK loads only when the view is used.
Connection/token/WebGL failures show a useful error while Grid/List remain
available.

Map fetches all matching pages (50 at a time), plots longitude/latitude GeoJSON
with stable property IDs, and clusters points at low zoom. Cluster clicks zoom
in; pin and “Show on map” selections synchronize highlighting and a safe detail
link popup. List selections zoom to an individual pin. Desktop uses a split
map/list pane; mobile uses a focus-trapped full-screen dialog with a collapsible
bottom list, Close map action and Escape support. Map movement respects reduced
motion. Mapbox's live service requires a configured working token; SDK mocks
exercise clustering, selection, popup links, WebGL fallback and cleanup without
external credentials.

### Similar and recently viewed homes

`GET /api/properties/:id/similar` returns `{ results }`: same city, type and
listing type, price within ±30%, bedrooms within ±1, excluding self, at most
six. Full property responses and the detail page use the same logic. When no
matches exist, the section offers a city/type browsing link.

The home page's Recently viewed strip reads the last eight unique property IDs
from `nestwell.recently-viewed.v1` in localStorage, most recent first. Details
record a view on mount. Malformed or unavailable storage is handled quietly;
missing properties are omitted. History is browser-local and independent of
account favorites.

### Phase 5 verification

```sh
pnpm test
pnpm test:integration
# With a running server and an installed Chromium:
CHROME_PATH=/usr/bin/chromium pnpm test:browser
pnpm build
```

The browser suite uses two seeded accounts for ownership and isolated temporary
users for sign-in, favorite rollback, saved-search replay/deletion and enquiry
submission/spam checks. Temporary test-user records are cleaned up. Unit tests
cover map SDK interactions, all-page map fetching, token handling, recent IDs,
saved URL normalization and enquiry validation/rate limiting. Live Mapbox tile
rendering is a separate check when a valid token is available.

Phase 5 production verification passed: **58 unit tests**, **15 API integration
checks**, **13 Chromium browser tests**, and `pnpm build`. Lighthouse
Accessibility remains **100/100** on home and results. Two-account ownership and
optimistic rollback were exercised against PostgreSQL; Mapbox SDK behavior was
mocked because no live public token is configured.
