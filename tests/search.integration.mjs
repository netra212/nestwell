import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
after(() => db.$disconnect());
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const testIP = () =>
  `2001:db8:${randomUUID().slice(0, 4)}::${randomUUID().slice(0, 4)}`;
async function post(query, ip = testIP()) {
  const response = await fetch(`${base}/api/search/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ query }),
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}
async function search(q, extra = {}) {
  const response = await fetch(
    `${base}/api/properties?${new URLSearchParams({ q, parser: "keyword", ...extra })}`,
  );
  assert.equal(response.status, 200);
  return response.json();
}
test("flagship manual queries work without an OpenAI key via forced keyword path", async () => {
  const london = await search(
    "3-bed house in London under £600k with a garden and parking",
  );
  assert.ok(london.total > 0, "Run the updated seed");
  assert.equal(london.modelUsed, "fallback");
  assert.equal(london.parsed.confidence, 0.4);
  london.results.forEach((p) => {
    assert.equal(p.city, "London");
    assert.ok(p.price <= 60000000);
    assert.ok(p.bedrooms >= 3);
    assert.ok(p.relevanceScore >= 0 && p.relevanceScore <= 100);
  });
  assert.ok(london.results[0].matchReasons.includes("Garden ✓"));
  assert.ok(london.results[0].matchReasons.includes("Parking ✓"));
  const manchester = await search(
    "pet-friendly flat with balcony near a train station in Manchester",
  );
  assert.ok(manchester.total > 0);
  manchester.results.forEach((p) => {
    assert.equal(p.city, "Manchester");
    assert.equal(p.propertyType, "FLAT");
  });
  assert.ok(manchester.parsed.features.includes("near-transport"));
  const bristol = await search(
    "family home near good schools in Bristol under £450k",
  );
  assert.ok(bristol.total > 0);
  assert.ok(bristol.results[0].matchReasons.includes("Near schools ✓"));
  assert.ok(bristol.results.every((p) => p.price <= 45000000));
  assert.ok(
    !bristol.results
      .flatMap((p) => p.matchReasons)
      .some((r) => /good schools|outstanding|2 schools/i.test(r)),
  );
  const cheap = await search("cheap studio");
  assert.equal(cheap.parsed.ambiguous, true);
  assert.ok(cheap.parsed.clarifyingQuestions.length > 0);
  assert.ok(cheap.results.every((p) => p.propertyType === "STUDIO"));
  const unknown = await search("asdfgh");
  assert.equal(unknown.total, 0);
  assert.deepEqual(unknown.results, []);
});
test("explicit overrides and removed inferred chips survive URL-only searches", async () => {
  const q = "Buy a 3-bed house in London under £600k with garden";
  const override = await search(q, {
    city: "Manchester",
    priceMax: "900000",
    propertyTypes: "FLAT",
    bedsMin: "1",
    omit: "bedsMax",
  });
  assert.ok(override.total > 0);
  override.results.forEach((p) => {
    assert.equal(p.city, "Manchester");
    assert.equal(p.propertyType, "FLAT");
    assert.ok(p.price <= 90000000);
  });
  const removed = await search(q, {
    omit: "city,priceMax,features,propertyTypes,bedsMin",
  });
  assert.equal(removed.total, 100);
  assert.equal(removed.parsed.location.city, undefined);
  assert.equal(removed.parsed.price.max, undefined);
  assert.deepEqual(removed.parsed.features, []);
  const features = await search("Buy a home", { features: "garden,parking" });
  assert.ok(
    features.results.every(
      (p) => p.features.includes("garden") && p.features.includes("parking"),
    ),
  );
  const must = await search("Buy a home in London must have a garden");
  assert.ok(must.results.every((p) => p.features.includes("garden")));
});
test("ranked pagination preserves full-set order and score ordering", async () => {
  const q = "Buy a quiet modern home with garden in Manchester";
  const all = await search(q, { pageSize: "50" });
  const first = await search(q, { pageSize: "3", page: "1" });
  const second = await search(q, { pageSize: "3", page: "2" });
  assert.deepEqual(
    [...first.results, ...second.results].map((p) => p.id),
    all.results.slice(0, 6).map((p) => p.id),
  );
  for (let i = 1; i < all.results.length; i++)
    assert.ok(
      all.results[i - 1].relevanceScore >= all.results[i].relevanceScore,
    );
});
test("POST cache hashes normalize input, log hits and use a fixed expiry", async () => {
  const query = `Buy a home in Leeds verification ${randomUUID()}`;
  const first = await post(query);
  assert.equal(first.status, 200);
  assert.equal(first.body.cached, false);
  const hash = createHash("sha256")
    .update(query.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "))
    .digest("hex");
  const original = await db.searchQuery.findFirst({
    where: { queryHash: hash },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(original);
  const next = await post(`  ${query.toUpperCase().replaceAll(" ", "  ")}  `);
  assert.equal(next.body.cached, true);
  let entries = await db.searchQuery.findMany({
    where: { queryHash: hash },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(entries.length, 2);
  assert.equal(
    entries[1].cacheExpiresAt.getTime(),
    original.cacheExpiresAt.getTime(),
  );
  assert.equal(typeof entries[1].confidence, "number");
  // Only these unique test rows are expired, never unrelated cache/audit records.
  await db.searchQuery.updateMany({
    where: { queryHash: hash },
    data: { cacheExpiresAt: new Date(Date.now() - 1000) },
  });
  const fresh = await post(query);
  assert.equal(fresh.body.cached, false);
  entries = await db.searchQuery.findMany({ where: { queryHash: hash } });
  assert.equal(entries.length, 3);
});
test("POST input validation and rate limiting return structured errors", async () => {
  for (const value of ["", "   ", "x".repeat(301), 123, null]) {
    const response = await post(value, testIP());
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_QUERY");
  }
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "198.51.100.93",
    },
    body: "{",
  };
  const invalid = await fetch(`${base}/api/search/parse`, request);
  assert.equal(invalid.status, 400);
  const rateIP = testIP();
  for (let i = 0; i < 20; i++)
    assert.equal((await post("cheap studio", rateIP)).status, 200);
  const limited = await post("cheap studio", rateIP);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, "RATE_LIMITED");
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);
});
