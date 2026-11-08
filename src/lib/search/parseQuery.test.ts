import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { parse: mocks.complete } };
  },
}));
vi.mock("../db", () => ({
  db: { searchQuery: { findFirst: mocks.findFirst, create: mocks.create } },
}));
import { parseQuery, queryHash, SYSTEM_PROMPT } from "./parseQuery";
import { fallbackParser } from "./fallbackParser";
import { modelSearchSchema } from "./schema";
const structured = {
  intent: "buy",
  location: { text: "London", city: "London", postcode: null, radiusKm: null },
  price: { min: null, max: 600000, currency: "GBP" },
  bedrooms: { min: 3, max: null },
  bathrooms: { min: null, max: null },
  propertyType: ["house"],
  features: ["garden", "parking"],
  softPreferences: [],
  mustHave: [],
  niceToHave: ["garden"],
  ambiguous: false,
  clarifyingQuestions: [],
};
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mocks.findFirst.mockResolvedValue(null);
  mocks.create.mockResolvedValue({});
  mocks.complete.mockResolvedValue({
    choices: [{ message: { parsed: structured } }],
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("primary parser and resilience", () => {
  it("uses structured outputs and returns pounds and metadata", async () => {
    const result = await parseQuery(
      "Buy a 3-bed house in London under £600k with garden",
    );
    expect(result.parsed.price.max).toBe(600000);
    expect(result.parsed.bedrooms.min).toBe(3);
    expect(result.modelUsed).toBe("gpt-4o-mini");
    expect(result.parsed.confidence).toBe(0.9);
    expect(result.cached).toBe(false);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mocks.complete.mock.calls[0][0].response_format.type).toBe(
      "json_schema",
    );
    expect(SYSTEM_PROMPT).toContain("600000");
    expect(modelSearchSchema.safeParse(structured).success).toBe(true);
  });
  it("works without a key and never constructs a provider request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await parseQuery(
      "Pet-friendly flat with balcony near a train station in Manchester",
    );
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(result.modelUsed).toBe("fallback");
    expect(result.parsed.features).toEqual(
      expect.arrayContaining(["pet-friendly", "balcony", "near-transport"]),
    );
    expect(result.parsed.location.city).toBe("Manchester");
    expect(result.parsed.confidence).toBe(0.4);
  });
  it("falls back after provider failure", async () => {
    mocks.complete.mockRejectedValue(new Error("upstream"));
    const result = await parseQuery("Buy a flat in Leeds under £300k");
    expect(result.modelUsed).toBe("fallback");
    expect(result.parsed.price.max).toBe(300000);
  });
  it("falls back on refusal and invalid output", async () => {
    mocks.complete
      .mockResolvedValueOnce({ choices: [{ message: { parsed: null } }] })
      .mockResolvedValueOnce({
        choices: [
          { message: { parsed: { ...structured, price: { max: -20 } } } },
        ],
      });
    expect((await parseQuery("A studio in Bristol")).modelUsed).toBe(
      "fallback",
    );
    expect((await parseQuery("Another studio in London")).modelUsed).toBe(
      "fallback",
    );
  });
  it("enforces a six second deadline and aborts the request", async () => {
    vi.useFakeTimers();
    mocks.complete.mockReturnValue(new Promise(() => {}));
    const result = parseQuery("Timeout example in London under £500k");
    await vi.advanceTimersByTimeAsync(6001);
    expect((await result).modelUsed).toBe("fallback");
    expect(mocks.complete.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("reuses a validated 24-hour hash cache but logs every hit without sliding expiry", async () => {
    const parsed = fallbackParser("flat in London");
    const expires = new Date(Date.now() + 60000);
    mocks.findFirst.mockResolvedValue({
      parsed,
      modelUsed: "fallback",
      cacheExpiresAt: expires,
    });
    const result = await parseQuery("  FLAT  in London  ");
    expect(result.cached).toBe(true);
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      queryHash: queryHash("flat in london"),
      cacheExpiresAt: expires,
      cached: true,
      confidence: 0.4,
    });
    expect(
      mocks.findFirst.mock.calls[0][0].where.cacheExpiresAt.gt,
    ).toBeInstanceOf(Date);
  });
  it("deduplicates concurrent provider work but audits every caller", async () => {
    const result = await Promise.all([
      parseQuery("Buy in Bath concurrency"),
      parseQuery("Buy in Bath concurrency"),
      parseQuery("Buy in Bath concurrency"),
    ]);
    expect(result).toHaveLength(3);
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });
  it("hashes normalized case, spaces and unicode consistently", () => {
    expect(queryHash("  BUY   in LONDON ")).toBe(queryHash("buy in london"));
    expect(queryHash("ＢＵＹ in London")).toBe(queryHash("buy in london"));
  });
  it("ignores corrupt cached JSON", async () => {
    mocks.findFirst.mockResolvedValue({
      parsed: { bad: true },
      cacheExpiresAt: new Date(),
    });
    expect((await parseQuery("Buy in London")).cached).toBe(false);
    expect(mocks.complete).toHaveBeenCalledOnce();
  });
  it("survives unavailable cache/audit storage", async () => {
    mocks.findFirst.mockRejectedValue(new Error("db down"));
    mocks.create.mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await parseQuery("Buy in Bristol")).parsed.intent).toBe("buy");
    warn.mockRestore();
  });
  it("allows a forced keyword path even with a key", async () => {
    expect(
      (await parseQuery("Buy in Manchester", { forceFallback: true }))
        .modelUsed,
    ).toBe("fallback");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
describe("fallback UK language", () => {
  it("extracts the flagship London query without turning bedroom counts into prices", () => {
    const p = fallbackParser(
      "3-bed house in London under £600k with a garden and parking",
    );
    expect(p.price.max).toBe(600000);
    expect(p.bedrooms.min).toBe(3);
    expect(p.propertyType).toEqual(["house"]);
    expect(p.features).toEqual(["garden", "parking"]);
  });
  it("extracts family/schools and budget", () => {
    const p = fallbackParser(
      "family home near good schools in Bristol under £450k",
    );
    expect(p.softPreferences).toContain("family-friendly");
    expect(p.features).toContain("near-schools");
    expect(p.price.max).toBe(450000);
    expect(p.location.city).toBe("Bristol");
  });
  it("flags cheap studio and gibberish with questions and low confidence", () => {
    for (const q of ["cheap studio", "asdfgh"]) {
      const p = fallbackParser(q);
      expect(p.ambiguous).toBe(true);
      expect(p.clarifyingQuestions?.length).toBeGreaterThan(0);
      expect(p.clarifyingQuestions!.length).toBeLessThanOrEqual(3);
      expect(p.confidence).toBe(0.4);
    }
    expect(fallbackParser("asdfgh").features).toEqual([]);
  });
  it("understands million prices, ranges, postcode and miles", () => {
    expect(
      fallbackParser("Buy a detached home in London under £1.2m").price.max,
    ).toBe(1200000);
    const p = fallbackParser(
      "Rent 2-3 bed flat within 5 miles of N1 8AB between £1,500 and £2,500",
    );
    expect(p.bedrooms).toEqual({ min: 2, max: 3 });
    expect(p.price).toMatchObject({ min: 1500, max: 2500 });
    expect(p.location.postcode).toBe("N1 8AB");
    expect(p.location.radiusKm).toBeCloseTo(8.04672);
  });
  it("does not conflate semi-detached or negative features", () => {
    expect(
      fallbackParser("semi-detached in Leeds without a garden").propertyType,
    ).toEqual(["semi-detached"]);
    expect(fallbackParser("flat without a garden").features).not.toContain(
      "garden",
    );
    expect(
      fallbackParser("Buy a house in Leeds must have a garden").mustHave,
    ).toContain("garden");
  });
  it("flags contradictory budgets gracefully", () => {
    expect(
      fallbackParser("Buy in Leeds over £600k under £200k").ambiguous,
    ).toBe(true);
  });
});

it("separates cache scopes when a key is added or removed", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  await parseQuery("Buy in London scope test");
  expect(mocks.findFirst.mock.calls[0][0].where.providerConfigured).toBe(false);
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  await parseQuery("Buy in London scope test");
  expect(mocks.findFirst.mock.calls[1][0].where.providerConfigured).toBe(true);
});
