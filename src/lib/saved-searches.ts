import { z } from "zod";
import { parsePropertyQuery } from "./property-query";
const keys = new Set([
  "q",
  "parser",
  "omit",
  "listingType",
  "city",
  "postcode",
  "radiusKm",
  "lat",
  "lng",
  "priceMin",
  "priceMax",
  "bedsMin",
  "bedsMax",
  "bathsMin",
  "bathsMax",
  "propertyTypes",
  "features",
  "softPreferences",
  "featureMode",
  "sort",
  "page",
  "pageSize",
  "view",
]);
const aliases: Record<string, string> = {
  maxPrice: "priceMax",
  minPrice: "priceMin",
  minBedrooms: "bedsMin",
  maxBedrooms: "bedsMax",
  minBathrooms: "bathsMin",
};
export function normalizeSavedFilters(filters: Record<string, unknown>) {
  const output: Record<string, string> = {};
  for (const [original, value] of Object.entries(filters)) {
    const key = aliases[original] || original;
    if (!keys.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    output[key] = ["maxPrice", "minPrice"].includes(original)
      ? String(Number(value) / 100)
      : Array.isArray(value)
        ? value.join(",")
        : String(value);
  }
  return output;
}
export function savedSearchURL(
  filters: Record<string, unknown>,
  rawQuery?: string | null,
) {
  const params = new URLSearchParams(normalizeSavedFilters(filters));
  if (rawQuery && !params.has("q")) params.set("q", rawQuery);
  return `/for-sale${params.size ? `?${params}` : ""}`;
}
const value = z.union([
  z.string().max(500),
  z.number().finite(),
  z.array(z.string().max(100)).max(30),
]);
export const savedSearchSchema = z
  .object({
    name: z.string().trim().max(100).optional(),
    rawQuery: z.string().trim().max(300).optional(),
    filters: z
      .record(z.string(), value)
      .refine((f) => Object.keys(f).length <= 30, "Too many filters")
      .refine(
        (f) =>
          Object.keys(f).every((k) => keys.has(k) || Object.hasOwn(aliases, k)),
        "Unknown filter",
      ),
  })
  .strict()
  .superRefine((data, ctx) => {
    const normalized = normalizeSavedFilters(data.filters);
    if (data.rawQuery && !normalized.q) normalized.q = data.rawQuery;
    const parsed = parsePropertyQuery(new URLSearchParams(normalized));
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        ctx.addIssue({
          code: "custom",
          path: ["filters", ...issue.path],
          message: issue.message,
        });
    if (normalized.view && !["grid", "list", "map"].includes(normalized.view))
      ctx.addIssue({
        code: "custom",
        path: ["filters", "view"],
        message: "Invalid view",
      });
  });
export type SavedSearchResult = {
  id: string;
  name: string | null;
  rawQuery: string | null;
  filters: Record<string, unknown>;
  createdAt: string;
};
