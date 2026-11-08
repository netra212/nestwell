# Nestwell — Phase 1

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
Prisma 6, PostgreSQL 16 and Zod. Search, authentication and listing UI are
reserved for later phases; the home page is intentionally empty.

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
  and may repeat; availability depends on Unsplash.
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

The header navigation consists of disabled stubs. All requested shadcn base
components are in `src/components/ui`; toast and tooltip providers are mounted
in the root layout. `src/lib/db.ts` holds the hot-reload-safe Prisma singleton.
No OpenAI, Mapbox, authentication or Redis service is called in Phase 1.
