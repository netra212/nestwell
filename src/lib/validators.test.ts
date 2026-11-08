import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePropertyQuery, propertyQuerySchema } from "./property-query";
import { queryBodySchema } from "./search/schema";
import {
  authMutationSchema,
  allowedOrigin,
  resourceIdSchema,
  safeReturnPath,
} from "./request-security";
import { takeAuthRequest } from "./auth-rate-limit";
import { resultsMetadata, propertyMetadata } from "./seo";
afterEach(() => vi.unstubAllEnvs());
describe("property search Zod validation", () => {
  it("sets safe defaults", () =>
    expect(propertyQuerySchema.parse({})).toMatchObject({
      listingType: "SALE",
      page: 1,
      pageSize: 20,
      sort: "newest",
    }));
  it("coerces filters and deduplicates canonical values", () => {
    expect(
      propertyQuerySchema.parse({
        priceMax: "600000",
        bedsMin: "3",
        features: "garden,parking,garden",
        propertyTypes: "HOUSE,FLAT",
      }),
    ).toMatchObject({
      priceMax: 600000,
      bedsMin: 3,
      features: ["garden", "parking"],
      propertyTypes: ["HOUSE", "FLAT"],
    });
  });
  it.each([
    "page=0",
    "page=1.2",
    "pageSize=51",
    "priceMax=abc",
    "priceMin=500&priceMax=100",
    "bedsMin=4&bedsMax=2",
    "bathsMin=3&bathsMax=1",
    "lat=91&lng=0",
    "lat=0",
    "radiusKm=5",
    "features=pool",
    "sort=invalid",
    "listingType=BUY",
    "propertyTypes=CASTLE",
    "q=",
  ])("rejects invalid %s", (query) => {
    expect(parsePropertyQuery(new URLSearchParams(query)).success).toBe(false);
  });
  it("validates radius zero, polar bounds and paired coordinates", () => {
    expect(
      propertyQuerySchema.safeParse({ lat: "90", lng: "180", radiusKm: "0" })
        .success,
    ).toBe(true);
    expect(
      propertyQuerySchema.safeParse({ lat: "0", lng: "181" }).success,
    ).toBe(false);
  });
  it("rejects duplicate keys instead of silently changing filters", () =>
    expect(
      parsePropertyQuery(new URLSearchParams("city=London&city=Leeds")).success,
    ).toBe(false));
});
describe("parse body Zod validation", () => {
  it.each(["Buy a home", "  flat in London  ", "x".repeat(300)])(
    "accepts %s",
    (query) => expect(queryBodySchema.safeParse({ query }).success).toBe(true),
  );
  it.each(["", "   ", "x".repeat(301), null, 123, [], {}])(
    "rejects invalid query %j",
    (query) => expect(queryBodySchema.safeParse({ query }).success).toBe(false),
  );
  it("rejects extra body fields", () =>
    expect(
      queryBodySchema.safeParse({ query: "London", userId: "other" }).success,
    ).toBe(false));
});
describe("mutation security", () => {
  it("validates credentials without calling string methods on untrusted values", () => {
    expect(authMutationSchema.safeParse({ email: ["invalid"] }).success).toBe(
      false,
    );
    expect(
      authMutationSchema.parse({
        email: " EMMA@EXAMPLE.COM ",
        password: "any",
        redirect: "false",
      }).email,
    ).toBe("emma@example.com");
    expect(resourceIdSchema.safeParse(" ").success).toBe(false);
  });
  it("allows same-origin/server clients and blocks cross-site requests", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://homes.example");
    expect(
      allowedOrigin(
        new Request("http://localhost/api", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
    expect(
      allowedOrigin(
        new Request("http://localhost/api", {
          headers: { origin: "https://homes.example" },
        }),
      ),
    ).toBe(true);
    expect(allowedOrigin(new Request("http://localhost/api"))).toBe(true);
  });
  it("bounds callback redirects to local paths and avoids sign-in loops", () => {
    expect(safeReturnPath("/property/abc?x=1")).toBe("/property/abc?x=1");
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/sign-in",
      `/bad${String.fromCharCode(10)}`,
    ])
      expect(safeReturnPath(value)).toBe("/saved");
  });
  it("rate-limits auth writes, isolates IPs and expires windows", () => {
    const key = `auth-${Math.random()}`;
    for (let i = 0; i < 20; i++)
      expect(takeAuthRequest(key, true, 1000).allowed).toBe(true);
    expect(takeAuthRequest(key, true, 1500)).toMatchObject({
      allowed: false,
      retryAfter: 60,
    });
    expect(takeAuthRequest(key, false, 1500).allowed).toBe(true);
    expect(takeAuthRequest(key + "b", true, 1500).allowed).toBe(true);
    expect(takeAuthRequest(key, true, 61000).allowed).toBe(true);
  });
});
describe("metadata", () => {
  it("includes explicit city, room and price filters", () => {
    const result = resultsMetadata({
      city: "London",
      bedsMin: "3",
      priceMin: "200000",
      priceMax: "600000",
    });
    expect(result.title).toContain("London");
    expect(result.title).toContain("3+ beds");
    expect(result.title).toContain("£200,000–£600,000");
  });
  it("honours removed NLP constraints in metadata", () =>
    expect(
      resultsMetadata({
        q: "Buy in London under £600k",
        omit: "priceMin,priceMax",
      }).title,
    ).not.toContain("600,000"));
  it("uses listing descriptions, price in pounds and first photo for sharing", () => {
    const result = propertyMetadata({
      id: "a",
      price: 57500000,
      currency: "GBP",
      bedrooms: 3,
      propertyType: "TERRACED",
      city: "London",
      description: "A home with a garden",
      title: "A home",
      images: [
        {
          url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
          alt: "A home",
        },
      ],
    });
    expect(result.title).toBe("£575,000 · 3-bed terraced in London");
    expect(result.description).toBe("A home with a garden");
    expect(result.openGraph?.images).toEqual([
      {
        url: "/images/properties/photo-1600596542815-ffad4c1539a9.jpg",
        alt: "A home",
      },
    ]);
  });
});
