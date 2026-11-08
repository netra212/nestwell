# Phase 6 verification

Verified on 8 November 2026 with Node 24.22.1, pnpm 11.25.0,
PostgreSQL 16, Next.js 15.5.29 and system Chromium.

## Automated checks

- Production `pnpm build` passes, including TypeScript validation.
- `pnpm lint` passes.
- Vitest: 96 tests across eight files. Parser cases include structured provider
  output, ambiguity, garbage, non-UK location, missing key, refusal/failure,
  timeout and fixed-expiry cache hits. Ranker and request/security/SEO validators
  have dedicated suites.
- API integration: 15 passing tests, including combined filters, pre-pagination
  radius, stable ordering, all five flagship queries, parser cache and rate limits.
- Browser suite covers two-user ownership, persisted favorites/saved searches,
  optimistic rollback, enquiries/honeypot/rate limits, similar/recent listings,
  voice event lifecycle, permission errors, unsupported speech, keyboard focus,
  reduced motion, onboarding persistence, metadata and crawl routes.
- `pnpm check:secrets` finds no server-only environment-variable references in
  `.next/static`; source audit finds no raw `<img>` elements outside tests.

## Clean setup

Cloned the previous committed repository, applied the Phase 6 source changes,
installed from its checked-in lockfile, and used a separate disposable PostgreSQL
`phase6_clean` database. `pnpm prisma migrate reset --force` applied all four
migrations and automatically seeded 100 properties, five agents and two users.
`pnpm dev --port 3001` started and `/health` reported ok/counts. A second seed
retained 100 properties, 546 images, five agents, two users, seven favorites and
three saved searches. The original database was not reset.

## Scope and limits

Speech events and unsupported-browser behavior are simulated in Chromium.
Acoustic Chrome/Edge/Safari recognition and permission policies need real-device
checks. Native Firefox could not be launched reliably in this environment;
no native Firefox result is claimed. No OpenAI or Mapbox credentials were supplied:
provider paths use mocks, the five flagship queries run against the real DB with
the no-key parser, and map degradation/SDK behavior are tested without live tiles.

Normal browser tests check page errors and unexpected console errors. Expected
failure scenarios are deliberately exercised. Error boundaries offer recovery;
404 and the `/500` preview are branded. Next.js streamed missing-listing pages
may have HTTP 200 once a loading boundary has flushed; they render the not-found
screen and `noindex`. The property API returns a proper 404. The `/500` route is
a visual preview, not a fabricated server failure/status response.

Auth remains an unverified demo email provider. Session cookies intentionally end
with the browser session; saved database data reappears after signing in again.
Keep a stable `NEXTAUTH_SECRET` for restarts/multiple instances. Rate limiting is
process-local; production needs shared storage and trusted proxy configuration.

## Final mobile Lighthouse run

Lighthouse 13.6.0, production `pnpm start`, mobile form factor with simulated
throttling; routes audited sequentially without concurrent build/browser jobs.
No auth session or external provider keys. The default `/for-sale` page and the
first seeded property detail were audited. All enforced thresholds passed.

| Route           | Performance | Accessibility | Best Practices | SEO |
| --------------- | ----------: | ------------: | -------------: | --: |
| Home            |         100 |           100 |            100 | 100 |
| Results         |          86 |           100 |            100 | 100 |
| Property detail |          91 |           100 |            100 | 100 |

Machine-readable scores are in [quality-summary.json](quality-summary.json).
Full local reports are generated under ignored `work/quality/`; reproduce with
`CHROME_PATH=/usr/bin/chromium pnpm audit:quality` after starting production.
Scores fluctuate with machine load and network. This is one measured run, not
an assurance that every query/device will achieve those scores.

Final browser coverage: **18 passing checks** (17-test suite plus the added mobile
filter focus check), against the same production build. Results sorting/history
and deferred drawer apply/Escape/focus restoration are explicitly covered.
Performance changes include server-rendered traditional results, high-priority
first-card images, native sorting, offscreen rendering hints and deferred
filter/map/dialog/toast code. Results initial JavaScript fell from 248 kB in the
first Phase 6 build to 192 kB. Natural-language parsing stays on the cached API path.
