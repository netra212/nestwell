# Property query plans

Measured locally on PostgreSQL 16, 8 November 2026. Raw `EXPLAIN (ANALYZE,
BUFFERS)` output is in [QUERY_PLANS.txt](QUERY_PLANS.txt).

The real 100-row London + SALE + £600k query took 0.170 ms. PostgreSQL correctly
chooses a sequential scan for this small table; forcing an index would misrepresent
production behavior.

A temporary 100,000-row replicated-data probe compared the default newest page:
37.422 ms with a full scan/top-N sort versus 0.054 ms with a backwards index-only
scan on `(listingType, createdAt, id)`. This is a synthetic warm local measurement,
not a production capacity claim. The temporary table was rolled back.

The migration adds that index, `(listingType, price, id)` for stable price paging,
and a GIN features index for array AND predicates. Existing city/listingType/price
and latitude/longitude indexes remain. Radius retrieval now bounds latitude before
applying exact spherical distance; integration tests check the result set.

Case-insensitive city predicates still need attention for large feeds: the probe's
correlated city/date distribution made newest-first city filtering scan many rows
(69.415 ms). Canonical location IDs or measured functional/trigram indexes belong
with real feed/geocoding work. Relevance scoring also currently loads candidates
into memory. Recheck realistic distributions and concurrent load before scaling.
