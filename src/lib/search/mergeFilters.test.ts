import { expect, it } from "vitest";
import { fallbackParser } from "./fallbackParser";
import { mergeSearchFilters } from "./mergeFilters";
import { propertyQuerySchema } from "../property-query";
function merge(q: string, explicit: string) {
  const params = new URLSearchParams(explicit);
  return mergeSearchFilters(
    fallbackParser(q),
    propertyQuerySchema.parse(Object.fromEntries(params)),
    params,
  );
}
it("explicit filters override inferred filters", () => {
  const result = merge(
    "Buy house in London under £600k with garden",
    "city=Manchester&priceMax=900000&propertyTypes=FLAT&features=parking",
  );
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.query.city).toBe("Manchester");
    expect(result.query.priceMax).toBe(900000);
    expect(result.query.propertyTypes).toEqual(["FLAT"]);
    expect(result.preferences.features).toEqual(["parking"]);
  }
});
it("omissions prevent removed chips reappearing", () => {
  const result = merge(
    "Buy house in London under £600k with garden",
    "omit=city,priceMax,features",
  );
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.query.city).toBeUndefined();
    expect(result.query.priceMax).toBeUndefined();
    expect(result.preferences.features).toEqual([]);
  }
});
it("ordinary features rank; must-have and explicit panel features filter", () => {
  const ordinary = merge("Buy in London with garden", "");
  const must = merge("Buy in London must have a garden", "");
  expect(ordinary.success && ordinary.query.features).toBeUndefined();
  expect(must.success && must.query.features).toEqual(["garden"]);
});

it("chip feature overrides can preserve ranking while traditional features stay required", () => {
  const ranked = merge(
    "Buy in London with garden and parking",
    "features=parking&featureMode=ranked",
  );
  const required = merge(
    "Buy in London with garden and parking",
    "features=parking&featureMode=required",
  );
  expect(ranked.success && ranked.query.features).toBeUndefined();
  expect(ranked.success && ranked.preferences.features).toEqual(["parking"]);
  expect(required.success && required.query.features).toEqual(["parking"]);
});
it("soft preferences can be edited and removed", () => {
  const p = merge("Buy modern quiet home in Leeds", "softPreferences=bright");
  expect(p.success && p.preferences.softPreferences).toEqual(["bright"]);
  const removed = merge("Buy modern home in Leeds", "omit=softPreferences");
  expect(removed.success && removed.preferences.softPreferences).toEqual([]);
});
