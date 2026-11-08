# Nestwell — Phases 1 & 2

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
Prisma 6, PostgreSQL 16 and Zod. Traditional search and listing details are available at `/for-sale`. AI search,
voice and authentication are reserved for later phases; the home page remains
intentionally empty.

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
Agents remain stubs. AI search, voice search, persistent saves and sending
contact enquiries are intentionally deferred.

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
filters (the seed currently has no London homes meeting those combined bounds).

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
