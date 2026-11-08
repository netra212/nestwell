export const PROPERTY_TYPES = [
  "HOUSE",
  "FLAT",
  "BUNGALOW",
  "MAISONETTE",
  "STUDIO",
  "TERRACED",
  "SEMI_DETACHED",
  "DETACHED",
] as const;
export const FEATURES = [
  "garden",
  "parking",
  "garage",
  "balcony",
  "elevator",
  "furnished",
  "pet-friendly",
  "near-transport",
  "near-schools",
  "fireplace",
  "conservatory",
  "driveway",
  "central-heating",
] as const;
export const labelFor = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^./, (s) => s.toUpperCase());
export const formatPrice = (pence: number, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(pence / 100);
export const MILES_TO_KM = 1.609344;
