import { type PropertyQuery, propertyQuerySchema } from "../property-query";
import { FEATURES } from "../property-options";
import type { ParsedSearch } from "./schema";
export type FilterState = Record<string, string>;
export const INFERRED_KEYS = [
  "listingType",
  "city",
  "postcode",
  "radiusKm",
  "priceMin",
  "priceMax",
  "bedsMin",
  "bedsMax",
  "bathsMin",
  "bathsMax",
  "propertyTypes",
  "features",
  "softPreferences",
] as const;
const typeMap = {
  house: ["HOUSE", "TERRACED", "SEMI_DETACHED", "DETACHED"],
  flat: ["FLAT"],
  bungalow: ["BUNGALOW"],
  maisonette: ["MAISONETTE"],
  studio: ["STUDIO"],
  terraced: ["TERRACED"],
  "semi-detached": ["SEMI_DETACHED"],
  detached: ["DETACHED"],
};
export function inferredFilters(parsed: ParsedSearch): FilterState {
  const result: FilterState = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) result[key] = String(value);
  };
  if (parsed.intent !== "unknown")
    put("listingType", parsed.intent === "rent" ? "RENT" : "SALE");
  put("city", parsed.location.city);
  put("postcode", parsed.location.postcode);
  put("radiusKm", parsed.location.radiusKm);
  put("priceMin", parsed.price.min);
  put("priceMax", parsed.price.max);
  put("bedsMin", parsed.bedrooms.min);
  put("bedsMax", parsed.bedrooms.max);
  put("bathsMin", parsed.bathrooms.min);
  put("bathsMax", parsed.bathrooms.max);
  if (parsed.propertyType?.length)
    put(
      "propertyTypes",
      [...new Set(parsed.propertyType.flatMap((t) => typeMap[t]))].join(","),
    );
  const requested = [
    ...new Set([...parsed.features, ...parsed.mustHave, ...parsed.niceToHave]),
  ].filter((f) => FEATURES.includes(f as (typeof FEATURES)[number]));
  if (requested.length) {
    put("features", requested.join(","));
    put("featureMode", "ranked");
  }
  if (parsed.softPreferences.length)
    put("softPreferences", parsed.softPreferences.join(","));
  return result;
}
export function mergeSearchFilters(
  parsed: ParsedSearch,
  explicit: PropertyQuery,
  params: URLSearchParams,
) {
  const omitted = new Set(params.get("omit")?.split(",") || []);
  const inherited = inferredFilters(parsed);
  for (const key of omitted) delete inherited[key];
  // An explicit location replaces the inferred location as a group.
  if (params.has("city") || params.has("postcode")) {
    delete inherited.city;
    delete inherited.postcode;
    delete inherited.radiusKm;
  }
  const state: FilterState = { ...inherited };
  for (const key of INFERRED_KEYS) {
    if (params.has(key) && params.get(key) !== "")
      state[key] = params.get(key)!;
  }
  for (const key of ["lat", "lng"]) {
    if (params.has(key)) state[key] = params.get(key)!;
  }
  if (params.has("features"))
    state.featureMode = params.get("featureMode") || "required";
  if (state.radiusKm && (!state.lat || !state.lng)) delete state.radiusKm;
  const validation = propertyQuerySchema.safeParse({
    ...state,
    features:
      params.has("features") && state.featureMode !== "ranked"
        ? state.features
        : undefined,
    sort: params.get("sort") || "relevance",
    page: String(explicit.page),
    pageSize: String(explicit.pageSize),
  });
  if (!validation.success)
    return { success: false as const, error: validation.error };
  const q = validation.data;
  const preferences: ParsedSearch = structuredClone(parsed);
  preferences.intent = params.has("listingType")
    ? q.listingType === "RENT"
      ? "rent"
      : "buy"
    : omitted.has("listingType")
      ? "unknown"
      : parsed.intent;
  preferences.location = {
    ...(state.city ? { city: state.city } : {}),
    ...(state.postcode ? { postcode: state.postcode } : {}),
    ...(q.radiusKm !== undefined ? { radiusKm: q.radiusKm } : {}),
  };
  preferences.price = {
    ...(q.priceMin !== undefined ? { min: q.priceMin } : {}),
    ...(q.priceMax !== undefined ? { max: q.priceMax } : {}),
    currency: "GBP",
  };
  preferences.bedrooms = { min: q.bedsMin, max: q.bedsMax };
  preferences.bathrooms = { min: q.bathsMin, max: q.bathsMax };
  if (params.has("propertyTypes") || omitted.has("propertyTypes"))
    preferences.propertyType = q.propertyTypes?.map(
      (t) =>
        t.toLowerCase().replaceAll("_", "-") as NonNullable<
          ParsedSearch["propertyType"]
        >[number],
    );
  preferences.softPreferences =
    state.softPreferences?.split(",").filter(Boolean) || [];
  preferences.features = state.features?.split(",").filter(Boolean) || [];
  preferences.mustHave = parsed.mustHave.filter((f) =>
    preferences.features.includes(f),
  );
  preferences.niceToHave = preferences.features.filter(
    (f) => !preferences.mustHave.includes(f),
  );
  // Explicit feature choices supersede inferred must-haves, too.
  if (params.has("features") || omitted.has("features"))
    preferences.mustHave = [];
  if (!params.has("features") && preferences.mustHave.length)
    q.features = preferences.mustHave.filter(
      (f): f is (typeof FEATURES)[number] =>
        FEATURES.includes(f as (typeof FEATURES)[number]),
    );
  let questions = (parsed.clarifyingQuestions || []).filter(
    (question) =>
      !(params.has("listingType") && /buy|rent|intent/i.test(question)) &&
      !(
        (state.city || state.postcode) &&
        /where|city|postcode|location|area/i.test(question)
      ),
  );
  if (
    !state.city &&
    !state.postcode &&
    !questions.some((q) => /city|postcode|location/i.test(q))
  )
    questions.push("Which city or postcode would you like to search?");
  if (
    preferences.intent === "unknown" &&
    !questions.some((q) => /buy|rent/i.test(q))
  )
    questions.push("Are you looking to buy or rent?");
  questions = questions.slice(0, 3);
  preferences.clarifyingQuestions = questions;
  preferences.ambiguous = questions.length > 0;
  return { success: true as const, query: q, preferences, filterState: state };
}
export function hasSearchMeaning(parsed: ParsedSearch) {
  return !!(
    parsed.location.city ||
    parsed.location.postcode ||
    parsed.location.text ||
    Object.keys(parsed.price).length ||
    Object.keys(parsed.bedrooms).length ||
    Object.keys(parsed.bathrooms).length ||
    parsed.propertyType?.length ||
    parsed.features.length ||
    parsed.mustHave.length ||
    parsed.niceToHave.length ||
    parsed.softPreferences.length ||
    parsed.intent !== "unknown"
  );
}
export function describeSearch(p: ParsedSearch) {
  const rooms =
    p.bedrooms.min !== undefined
      ? `${p.bedrooms.min}${p.bedrooms.max === p.bedrooms.min ? "" : "+"}-bed `
      : "";
  const types =
    p.propertyType?.map((t) => t.replaceAll("-", " ")).join(" or ") || "home";
  const place = p.location.city || p.location.postcode;
  const money =
    p.price.max !== undefined
      ? `, up to £${p.price.max.toLocaleString("en-GB")}`
      : p.price.min !== undefined
        ? `, from £${p.price.min.toLocaleString("en-GB")}`
        : "";
  return `${rooms}${types}${p.intent === "rent" ? " to rent" : ""}${place ? ` in ${place}` : ""}${money}${p.features.length ? `, with ${p.features.map((f) => f.replaceAll("-", " ")).join(" & ")}` : ""}${p.softPreferences.length ? `; preferences: ${p.softPreferences.join(", ")}` : ""}.`;
}
