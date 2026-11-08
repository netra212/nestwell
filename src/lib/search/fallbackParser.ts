import { FEATURES } from "../property-options";
import { searchSchema, type ParsedSearch } from "./schema";
export const UK_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Bristol",
  "Liverpool",
  "Sheffield",
  "Newcastle",
  "Nottingham",
  "Leicester",
  "Oxford",
  "Cambridge",
  "Brighton",
  "Bath",
  "York",
  "Reading",
  "Southampton",
  "Portsmouth",
  "Edinburgh",
  "Glasgow",
  "Aberdeen",
  "Cardiff",
  "Swansea",
  "Belfast",
  "Coventry",
  "Bradford",
  "Derby",
  "Exeter",
  "Plymouth",
  "Milton Keynes",
];
export const featurePatterns: Record<string, RegExp> = {
  garden: /\bgardens?\b/i,
  parking: /\bparking\b/i,
  garage: /\bgarages?\b/i,
  balcony: /\bbalcon(?:y|ies)\b/i,
  elevator: /\b(?:elevator|lift)\b/i,
  furnished: /(?<!un)\bfurnished\b/i,
  "pet-friendly": /\b(?:pet[- ]friendly|pets? allowed|allows? pets?)\b/i,
  "near-transport":
    /\b(?:near[- ]transport|(?:near|close to|by|walk\w* to)\s+(?:a\s+|the\s+)?(?:train|rail|tube|tram|bus|transport|station))\b/i,
  "near-schools":
    /\b(?:near[- ]schools|(?:near|close to|by)\s+(?:good\s+|a\s+|the\s+)?schools?)\b/i,
  fireplace: /\bfireplaces?\b/i,
  conservatory: /\bconservator(?:y|ies)\b/i,
  driveway: /\bdriveways?\b/i,
  "central-heating": /\bcentral[- ]heating\b/i,
};
const money = "(£?\\s*\\d[\\d,]*(?:\\.\\d+)?\\s*[km]?)";
const toAmount = (s: string) => {
  const m = s.replace(/[£,\s]/g, "").match(/^(\d+(?:\.\d+)?)([km])?$/i);
  return m
    ? Math.min(
        21474836.47,
        Number(m[1]) *
          (m[2]?.toLowerCase() === "m"
            ? 1000000
            : m[2]?.toLowerCase() === "k"
              ? 1000
              : 1),
      )
    : undefined;
};
export function fallbackParser(raw: string): ParsedSearch {
  const text = raw
    .normalize("NFKC")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .toLowerCase();
  const intent = /\b(?:rent|rental|letting|pcm|per month)\b/.test(text)
    ? "rent"
    : /\b(?:buy|buying|purchase|for sale)\b/.test(text)
      ? "buy"
      : "unknown";
  const city = UK_CITIES.find((c) =>
    new RegExp(`\\b${c.toLowerCase()}\\b`).test(text),
  );
  const postcode = text
    .match(/\b([a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2})\b/i)?.[1]
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/(.{3})$/, " $1");
  const near = text.match(
    /\b(?:near|close to)\s+(.+?)(?=\s+(?:in|under|with|for|up to)\b|$)/,
  )?.[1];
  const freePlace = text
    .match(
      /\bin\s+([a-z][a-z ]*?)(?=\s+(?:under|over|with|near|below|for|up to)\b|$)/,
    )?.[1]
    ?.trim();
  const radiusMatch = text.match(
    /\b(?:within|radius(?: of)?)\s+(\d+(?:\.\d+)?)\s*(miles?|mi|km|kilometres?)\b/,
  );
  const price: ParsedSearch["price"] = {};
  const range = text.match(
    new RegExp(`(?:between|from)\\s+${money}\\s*(?:and|to|-)\\s*${money}`, "i"),
  );
  const under = text.match(
    new RegExp(
      `(?:under|below|up to|max(?:imum)?(?: budget)?|budget(?: of)?|less than|no more than)\\s*${money}`,
      "i",
    ),
  );
  const over = text.match(
    new RegExp(`(?:over|above|at least|min(?:imum)?)\\s*${money}`, "i"),
  );
  const around = text.match(
    new RegExp(`(?:around|about|approximately)\\s*${money}`, "i"),
  );
  if (range) {
    let first = range[1];
    if (!/[km]/i.test(first) && /[km]/i.test(range[2]))
      first += range[2].trim().slice(-1);
    const a = toAmount(first),
      b = toAmount(range[2]);
    if (a !== undefined && b !== undefined) {
      price.min = Math.min(a, b);
      price.max = Math.max(a, b);
    }
  } else {
    if (under) price.max = toAmount(under[1]);
    if (over) price.min = toAmount(over[1]);
    if (around) {
      const amount = toAmount(around[1])!;
      price.min = Math.round(amount * 0.9);
      price.max = Math.min(21474836.47, Math.round(amount * 1.1));
    }
  }
  if (!Object.keys(price).length) {
    const explicitMoney = text.match(
      /£\s*\d[\d,]*(?:\.\d+)?\s*[km]?|\b\d+(?:\.\d+)?\s*[km]\b/i,
    );
    if (explicitMoney) price.max = toAmount(explicitMoney[0]);
    else {
      const bare = [
        ...text.matchAll(
          /\b(\d[\d,]*(?:\.\d+)?)\b(?!\s*(?:km|miles?|mi|bed|bath))/g,
        ),
      ]
        .map((m) => toAmount(m[1]))
        .find((n) => n !== undefined && n >= 100);
      if (bare !== undefined) price.max = bare;
    }
  }
  const conflictingPrice =
    price.min !== undefined && price.max !== undefined && price.min > price.max;
  if (conflictingPrice) {
    delete price.min;
    delete price.max;
  }
  if (Object.keys(price).length) price.currency = "GBP";
  const roomBounds = (word: string) => {
    const m = text.match(
      new RegExp(
        `\\b(\\d+)(?:\\s*(?:-|to)\\s*(\\d+))?[- ]?${word}(?:room)?s?\\b`,
      ),
    );
    if (!m) return {};
    const min = Math.min(100, Number(m[1]));
    if (m[2])
      return {
        min: Math.min(min, Number(m[2])),
        max: Math.min(100, Math.max(min, Number(m[2]))),
      };
    return /\b(?:exactly)\b/.test(text) ? { min, max: min } : { min };
  };
  const types: NonNullable<ParsedSearch["propertyType"]> = [];
  for (const [type, pattern] of [
    ["semi-detached", /\bsemi[- ]detached\b/],
    ["detached", /(?<!semi[- ])\bdetached\b/],
    ["terraced", /\bterrac(?:ed|e)\b/],
    ["flat", /\b(?:flats?|apartments?)\b/],
    ["bungalow", /\bbungalows?\b/],
    ["maisonette", /\bmaisonettes?\b/],
    ["studio", /\bstudios?\b/],
  ] as const)
    if (pattern.test(text)) types.push(type);
  if (!types.length && /\b(?:houses?|family home)\b/.test(text))
    types.push("house");
  const features = FEATURES.filter(
    (feature) =>
      featurePatterns[feature]?.test(text) &&
      !new RegExp(
        `\\b(?:no|without)\\s+(?:a\\s+)?${feature.replaceAll("-", "[- ]")}\\b`,
      ).test(text),
  );
  const softPreferences = [
    "family-friendly",
    "modern",
    "quiet",
    "spacious",
    "bright",
    "period",
    "cheap",
  ].filter((pref) =>
    pref === "family-friendly"
      ? /\bfamily(?:[- ]friendly| home)?\b/.test(text)
      : new RegExp(
          `\\b${pref === "cheap" ? "(?:cheap|affordable|budget-friendly)" : pref}\\b`,
        ).test(text),
  );
  const mustHave = features.filter((f) =>
    new RegExp(
      `(?:must(?:[- ]have| have)?|essential|need(?:s)?)\\s+(?:a\\s+)?${f.replaceAll("-", "[- ]")}\\b`,
    ).test(text),
  );
  const questions = [];
  if (conflictingPrice) questions.push("What budget range should I use?");
  if (intent === "unknown") questions.push("Are you looking to buy or rent?");
  if (!city && !postcode)
    questions.push("Which city or postcode would you like to search?");
  return searchSchema.parse({
    intent,
    location: {
      ...(city ? { city } : {}),
      ...(postcode ? { postcode } : {}),
      ...(near || city || postcode || freePlace
        ? {
            text: [near, city || postcode || freePlace]
              .filter(Boolean)
              .join(" in "),
          }
        : {}),
      ...(radiusMatch
        ? {
            radiusKm: Math.min(
              1000,
              Number(radiusMatch[1]) *
                (/^(mi|mile)/.test(radiusMatch[2]) ? 1.609344 : 1),
            ),
          }
        : {}),
    },
    price,
    bedrooms: roomBounds("bed"),
    bathrooms: roomBounds("bath"),
    ...(types.length ? { propertyType: types } : {}),
    features,
    softPreferences,
    mustHave,
    niceToHave: features.filter((f) => !mustHave.includes(f)),
    ambiguous: conflictingPrice || intent === "unknown" || (!city && !postcode),
    clarifyingQuestions: questions.slice(0, 3),
    confidence: 0.4,
  });
}
