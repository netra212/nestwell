import { labelFor } from "../property-options";
import type { ParsedSearch } from "./schema";
export type RankableProperty = {
  id: string;
  features: string[];
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  postcode: string;
  createdAt: Date | string;
};
const keywords: Record<string, string[]> = {
  "family-friendly": ["family", "schools", "flexible", "garden"],
  modern: ["modern", "updated", "updates", "contemporary", "renovated"],
  quiet: ["quiet", "peaceful", "tranquil"],
  spacious: ["spacious", "generous", "space"],
  bright: ["bright", "natural light", "windows"],
  period: ["period", "character"],
};
export function rankResults<T extends RankableProperty>(
  properties: T[],
  parsed: ParsedSearch,
  now = new Date(),
) {
  const wanted = [
    ...new Set([...parsed.features, ...parsed.mustHave, ...parsed.niceToHave]),
  ];
  const soft = [...new Set(parsed.softPreferences)].filter(
    (s) => s !== "cheap",
  );
  const target =
    parsed.price.min !== undefined && parsed.price.max !== undefined
      ? (parsed.price.min + parsed.price.max) / 2
      : (parsed.price.max ??
        parsed.price.min ??
        (parsed.softPreferences.includes("cheap") && properties.length
          ? Math.min(...properties.map((p) => p.price / 100))
          : undefined));
  return properties
    .map((p) => {
      const reasons: string[] = [];
      const overlap = wanted.filter((f) => p.features.includes(f));
      const featureScore = wanted.length
        ? (40 * overlap.length) / wanted.length
        : 0;
      overlap.forEach((f) => reasons.push(`${labelFor(f)} ✓`));
      if (
        parsed.bedrooms.min !== undefined &&
        p.bedrooms >= parsed.bedrooms.min
      )
        reasons.push(`${p.bedrooms} beds ✓`);
      if (
        parsed.bathrooms.min !== undefined &&
        p.bathrooms >= parsed.bathrooms.min
      )
        reasons.push(`${p.bathrooms} baths ✓`);
      if (
        parsed.location.city &&
        p.city.toLowerCase() === parsed.location.city.toLowerCase()
      )
        reasons.push(`${p.city} ✓`);
      const text = `${p.title} ${p.description}`.toLowerCase();
      let softHits = 0;
      for (const preference of soft) {
        const terms = keywords[preference.toLowerCase()] || [
          preference.toLowerCase(),
        ];
        const term = terms.find((t) =>
          new RegExp(
            `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i",
          ).test(text),
        );
        if (term) {
          softHits++;
          reasons.push(`Listing mentions “${term}”`);
        }
      }
      const softScore = soft.length ? (30 * softHits) / soft.length : 0;
      const priceScore =
        target === undefined
          ? 0
          : 15 *
            Math.max(
              0,
              1 - Math.abs(p.price / 100 - target) / Math.max(target, 1),
            );
      if (priceScore > 0)
        reasons.push(
          parsed.price.max !== undefined && p.price / 100 <= parsed.price.max
            ? `Within £${parsed.price.max.toLocaleString("en-GB")} budget ✓`
            : parsed.softPreferences.includes("cheap")
              ? "Towards the affordable end of these results"
              : "Close to your target price",
        );
      const age = Math.max(
        0,
        (now.getTime() - new Date(p.createdAt).getTime()) / 86400000,
      );
      const recencyScore = Number.isFinite(age)
        ? 15 * Math.max(0, 1 - age / 90)
        : 0;
      if (recencyScore >= 10) reasons.push("Recently listed");
      return {
        ...p,
        relevanceScore:
          Math.round(
            Math.min(
              100,
              Math.max(0, featureScore + softScore + priceScore + recencyScore),
            ) * 100,
          ) / 100,
        matchReasons: [...new Set(reasons)],
      };
    })
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        a.id.localeCompare(b.id),
    );
}
