import { after, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
after(() => db.$disconnect());
const all = await db.property.findMany({
  include: { images: { orderBy: { order: "asc" } }, agent: true },
});
async function get(path) {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, body: await response.json() };
}
async function check(query, predicate, sort = "newest") {
  const expected = all.filter(predicate).sort((a, b) => {
    if (sort === "price_asc" || sort === "price_desc")
      return (
        (sort === "price_asc" ? a.price - b.price : b.price - a.price) ||
        a.id.localeCompare(b.id)
      );
    return b.createdAt - a.createdAt || b.id.localeCompare(a.id);
  });
  const received = [];
  for (
    let page = 1;
    page <= Math.max(1, Math.ceil(expected.length / 50));
    page++
  ) {
    const { status, body } = await get(
      `/api/properties?${query}&sort=${sort}&page=${page}&pageSize=50`,
    );
    assert.equal(status, 200);
    assert.equal(body.total, expected.length);
    assert.equal(body.page, page);
    assert.equal(body.pageSize, 50);
    received.push(...body.results);
  }
  assert.deepEqual(
    received.map((p) => p.id),
    expected.map((p) => p.id),
  );
  received.forEach((p) => {
    const source = all.find((row) => row.id === p.id);
    assert.equal(p.images.length, Math.min(1, source.images.length));
    assert.equal(p.agent.name, source.agent.name);
  });
}
test("default SALE and stable pagination", async () => {
  const { status, body } = await get("/api/properties");
  assert.equal(status, 200);
  assert.equal(body.total, all.filter((p) => p.listingType === "SALE").length);
  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 20);
  await check("", (p) => p.listingType === "SALE");
});
test("URL example uses pounds, city is case insensitive", async () => {
  await check(
    "city=london&priceMax=600000&bedsMin=3",
    (p) =>
      p.listingType === "SALE" &&
      p.city.toLowerCase() === "london" &&
      p.price <= 60000000 &&
      p.bedrooms >= 3,
  );
});
test("price, room bounds, postcode prefix and property types combine", async () => {
  await check(
    "city=Manchester&postcode=M20&priceMin=200000&priceMax=900000&bedsMin=2&bedsMax=5&bathsMin=2&propertyTypes=DETACHED,SEMI_DETACHED",
    (p) =>
      p.listingType === "SALE" &&
      p.city === "Manchester" &&
      p.postcode.startsWith("M20") &&
      p.price >= 20000000 &&
      p.price <= 90000000 &&
      p.bedrooms >= 2 &&
      p.bedrooms <= 5 &&
      p.bathrooms >= 2 &&
      ["DETACHED", "SEMI_DETACHED"].includes(p.propertyType),
  );
});
test("features match all selected values", () =>
  check(
    "features=garden,parking",
    (p) =>
      p.listingType === "SALE" &&
      ["garden", "parking"].every((f) => p.features.includes(f)),
  ));
test("ascending and descending prices, relevance fallback", async () => {
  await check(
    "city=Leeds",
    (p) => p.listingType === "SALE" && p.city === "Leeds",
    "price_asc",
  );
  await check(
    "city=Leeds",
    (p) => p.listingType === "SALE" && p.city === "Leeds",
    "price_desc",
  );
  await check("", (p) => p.listingType === "SALE", "relevance");
});
test("radius is measured before pagination and supports zero and negative longitude", async () => {
  const lat = 51.541,
    lng = -0.103;
  const rad = (n) => (n * Math.PI) / 180;
  const distance = (p) => {
    const a =
      Math.sin(rad(p.latitude - lat) / 2) ** 2 +
      Math.cos(rad(lat)) *
        Math.cos(rad(p.latitude)) *
        Math.sin(rad(p.longitude - lng) / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  };
  for (const r of [0, 0.3, 8.04672, 100])
    await check(
      `lat=${lat}&lng=${lng}&radiusKm=${r}`,
      (p) => p.listingType === "SALE" && distance(p) <= r,
    );
});
test("rent, empty filters and out-of-range pages", async () => {
  await check("listingType=RENT", (p) => p.listingType === "RENT");
  const { body } = await get("/api/properties?page=999999");
  assert.deepEqual(body.results, []);
  await check("city=Atlantis", () => false);
});
test("invalid parameters have structured 400 errors", async () => {
  for (const q of [
    "page=0",
    "page=-1",
    "page=1.5",
    "pageSize=51",
    "priceMin=abc",
    "priceMin=",
    "priceMin=500&priceMax=100",
    "bedsMin=4&bedsMax=2",
    "radiusKm=5",
    "lat=91&lng=0&radiusKm=5",
    "lat=0",
    "lat=0&lng=181",
    "sort=wrong",
    "propertyTypes=CASTLE",
    "features=swimming-pool",
    "listingType=FOO",
    "page=1&page=2",
    "priceMax=Infinity",
  ]) {
    const { status, body } = await get(`/api/properties?${q}`);
    assert.equal(status, 400, q);
    assert.equal(body.error.code, "INVALID_PARAMS");
    assert.equal(typeof body.error.message, "string");
    assert.ok(Array.isArray(body.error.details));
  }
});
test("detail includes all images in order, agent and empty similar stub", async () => {
  assert.ok(all.length, "Seed the DB first");
  for (const p of all) {
    const { status, body } = await get(`/api/properties/${p.id}`);
    assert.equal(status, 200);
    assert.equal(body.id, p.id);
    assert.equal(body.agent.phone, p.agent.phone);
    assert.deepEqual(
      body.images.map((i) => i.id),
      p.images.map((i) => i.id),
    );
    assert.deepEqual(body.similarProperties, []);
  }
  const missing = await get("/api/properties/not-a-real-property");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, "NOT_FOUND");
});
test("autocomplete returns unique bounded matches and centroids from database", async () => {
  for (const q of ["lon", "M20", "b", "Atlantis", ""]) {
    const { status, body } = await get(`/api/locations/autocomplete?q=${q}`);
    assert.equal(status, 200);
    assert.ok(body.results.length <= 8);
    assert.equal(
      new Set(body.results.map((r) => r.label)).size,
      body.results.length,
    );
    for (const match of body.results) {
      assert.ok(
        all.some(
          (p) =>
            p.city === match.city &&
            (!match.postcode || p.postcode === match.postcode),
        ),
      );
      assert.equal(typeof match.latitude, "number");
      assert.equal(typeof match.longitude, "number");
    }
  }
  const empty = await get("/api/locations/autocomplete?q=");
  assert.deepEqual(empty.body.results, []);
  assert.equal(
    (await get(`/api/locations/autocomplete?q=${"x".repeat(101)}`)).status,
    400,
  );
});
