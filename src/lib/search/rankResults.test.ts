import { describe, expect, it } from "vitest";
import { rankResults, type RankableProperty } from "./rankResults";
import { fallbackParser } from "./fallbackParser";
const now = new Date("2026-11-08T12:00:00Z");
const base: RankableProperty = {
  id: "a",
  features: [],
  title: "A home",
  description: "A quiet modern home",
  price: 30000000,
  bedrooms: 3,
  bathrooms: 2,
  city: "London",
  postcode: "N1 8AB",
  createdAt: now,
};
describe("rankResults", () => {
  it("assigns 100 for complete overlap, soft wording, target price and recency", () => {
    const p = fallbackParser(
      "Buy in London around £300k with garden and parking modern quiet",
    );
    p.price = { min: 300000, max: 300000 };
    const result = rankResults(
      [{ ...base, features: ["garden", "parking"] }],
      p,
      now,
    )[0];
    expect(result.relevanceScore).toBe(100);
    expect(result.matchReasons).toContain("Garden ✓");
    expect(result.matchReasons).toContain("Parking ✓");
  });
  it("awards 20 for half feature overlap plus independent recency", () => {
    const p = fallbackParser("garden parking");
    expect(
      rankResults([{ ...base, features: ["garden"] }], p, now)[0]
        .relevanceScore,
    ).toBe(35);
  });
  it("does not reward missing overlap", () => {
    const p = fallbackParser("garden parking modern");
    const result = rankResults(
      [{ ...base, description: "plain", createdAt: "2020-01-01" }],
      p,
      now,
    )[0];
    expect(result.relevanceScore).toBe(0);
    expect(result.matchReasons).toEqual([]);
  });
  it("handles missing preferences without NaN or invented reasons", () => {
    const result = rankResults([base], fallbackParser("asdfgh"), now)[0];
    expect(result.relevanceScore).toBe(15);
    expect(result.matchReasons).toEqual(["Recently listed"]);
  });
  it("breaks equal scores deterministically by recency then ID", () => {
    const p = fallbackParser("quiet");
    const result = rankResults(
      [
        { ...base, id: "z" },
        { ...base, id: "a" },
      ],
      p,
      now,
    );
    expect(result.map((p) => p.id)).toEqual(["a", "z"]);
  });
  it("rewards price closeness using pounds against pence data", () => {
    const p = fallbackParser("around £300k");
    const ranked = rankResults(
      [
        { ...base, id: "far", price: 50000000 },
        { ...base, id: "near", price: 30000000 },
      ],
      p,
      now,
    );
    expect(ranked[0].id).toBe("near");
    expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);
  });
  it("deduplicates preferences and bounds scores to 0–100", () => {
    const p = fallbackParser("garden modern");
    p.features = ["garden", "garden"];
    p.niceToHave = ["garden"];
    const [result] = rankResults(
      [{ ...base, features: ["garden"], createdAt: "2099-01-01" }],
      p,
      now,
    );
    expect(result.relevanceScore).toBe(85);
    expect(result.matchReasons.filter((r) => r === "Garden ✓")).toHaveLength(1);
  });
  it("does not claim a school count or school quality", () => {
    const p = fallbackParser("near good schools in Bristol");
    const [result] = rankResults(
      [{ ...base, city: "Bristol", features: ["near-schools"] }],
      p,
      now,
    );
    expect(result.matchReasons).toContain("Near schools ✓");
    expect(result.matchReasons.join(" ")).not.toMatch(
      /good|outstanding|2 schools/i,
    );
  });
  it("ranks cheap properties towards the lowest candidate price", () => {
    const p = fallbackParser("cheap studio");
    const result = rankResults(
      [
        { ...base, id: "expensive", price: 50000000 },
        { ...base, id: "cheap", price: 15000000 },
      ],
      p,
      now,
    );
    expect(result[0].id).toBe("cheap");
  });
});
