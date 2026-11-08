import { describe, expect, it, vi, afterEach } from "vitest";
import { savedSearchSchema, savedSearchURL } from "./saved-searches";
import { enquiryBodySchema } from "./enquiry-schema";
import { takeEnquiryRequest } from "./enquiry-rate-limit";
import { recentIds, addRecentId } from "./recently-viewed";
import { publicMapboxToken } from "./map-config";
import { fetchMapProperties, propertyGeoJSON } from "./map-properties";
import type { PropertyResult } from "./property-types";
afterEach(() => vi.unstubAllGlobals());
describe("saved search URLs", () => {
  it("runs legacy seeded pence/beds filters correctly", () => {
    const url = new URL(
      savedSearchURL(
        {
          city: "London",
          maxPrice: 75000000,
          minBedrooms: 2,
          features: ["garden", "parking"],
        },
        "Family home",
      ),
      "http://localhost",
    );
    expect(url.searchParams.get("priceMax")).toBe("750000");
    expect(url.searchParams.get("bedsMin")).toBe("2");
    expect(url.searchParams.get("features")).toBe("garden,parking");
    expect(url.searchParams.get("q")).toBe("Family home");
  });
  it("preserves URL overrides, omissions and presentation state", () => {
    const filters = {
      q: "flat in London",
      omit: "priceMax",
      city: "Leeds",
      view: "map",
      features: "parking",
      featureMode: "ranked",
    };
    expect(savedSearchURL(filters, "ignored query")).toContain(
      "q=flat+in+London",
    );
    expect(savedSearchSchema.safeParse({ filters }).success).toBe(true);
  });
  it("rejects unknown filters, invalid values and ownership injection", () => {
    for (const input of [
      { filters: { bedsMin: -1 } },
      { filters: { priceMax: "nope" } },
      { filters: { userId: "other" } },
      { filters: { constructor: "unsafe" } },
      { userId: "other", filters: {} },
    ])
      expect(savedSearchSchema.safeParse(input).success).toBe(false);
  });
});
it("validates enquiries and accepts an optional phone and honeypot", () => {
  const valid = {
    name: "Emma Wilson",
    email: "emma@example.com",
    message: "Can I arrange a viewing?",
    propertyId: "property",
  };
  expect(enquiryBodySchema.safeParse(valid).success).toBe(true);
  expect(
    enquiryBodySchema.safeParse({ ...valid, website: "bot" }).success,
  ).toBe(true);
  expect(enquiryBodySchema.safeParse({ ...valid, email: "bad" }).success).toBe(
    false,
  );
  expect(
    enquiryBodySchema.safeParse({ ...valid, userId: "other" }).success,
  ).toBe(false);
});
it("limits enquiry attempts to one per ten seconds independently by IP", () => {
  const ip = `test-${Math.random()}`;
  expect(takeEnquiryRequest(ip, 1000).allowed).toBe(true);
  expect(takeEnquiryRequest(ip, 1500)).toEqual({
    allowed: false,
    retryAfter: 10,
  });
  expect(takeEnquiryRequest(ip + "other", 1500).allowed).toBe(true);
  expect(takeEnquiryRequest(ip, 11000).allowed).toBe(true);
});
it("keeps eight recently viewed IDs, removes duplicates and tolerates bad storage", () => {
  expect(recentIds("bad json")).toEqual([]);
  expect(recentIds('{"id":"nope"}')).toEqual([]);
  expect(recentIds('[1,"a","a","b",null]')).toEqual(["a", "b"]);
  expect(addRecentId(["a", "b", "c", "d", "e", "f", "g", "h"], "b")).toEqual([
    "b",
    "a",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
  ]);
  expect(
    addRecentId(["a", "b", "c", "d", "e", "f", "g", "h"], "i"),
  ).toHaveLength(8);
});
it("never exposes a secret Mapbox token", () => {
  expect(publicMapboxToken("sk.secret")).toBeUndefined();
  expect(publicMapboxToken("")).toBeUndefined();
  expect(publicMapboxToken("pk.public")).toBe("pk.public");
});
it("uses longitude/latitude GeoJSON coordinates and stable feature IDs", () => {
  const properties = [
    { id: "a", longitude: -0.1, latitude: 51.5 },
  ] as PropertyResult[];
  expect(propertyGeoJSON(properties).features[0]).toMatchObject({
    id: "a",
    geometry: { type: "Point", coordinates: [-0.1, 51.5] },
    properties: { id: "a" },
  });
});
it("fetches every map page, preserves filters and deduplicates IDs", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: Array.from({ length: 50 }, (_, i) => ({ id: String(i) })),
        total: 51,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ id: "49" }, { id: "50" }], total: 51 }),
    });
  vi.stubGlobal("fetch", fetch);
  const rows = await fetchMapProperties(
    "city=London&page=3&pageSize=20&view=map",
  );
  expect(rows).toHaveLength(51);
  expect(fetch).toHaveBeenCalledTimes(2);
  const second = new URL(fetch.mock.calls[1][0], "http://localhost");
  expect(second.searchParams.get("page")).toBe("2");
  expect(second.searchParams.get("pageSize")).toBe("50");
  expect(second.searchParams.get("city")).toBe("London");
  expect(second.searchParams.has("view")).toBe(false);
});
