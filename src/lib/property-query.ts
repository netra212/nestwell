import { z } from "zod";
import { FEATURES, PROPERTY_TYPES } from "./property-options";

const numeric = (min: number, max: number, integer = false) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid non-negative number")
    .transform(Number)
    .pipe(
      integer
        ? z.number().int().min(min).max(max)
        : z.number().min(min).max(max),
    );
const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, "Invalid coordinate")
    .transform(Number)
    .pipe(z.number().min(min).max(max));
const csv = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .max(500)
    .transform((s) => s.split(",").map((s) => s.trim()))
    .pipe(z.array(z.enum(values)).min(1))
    .transform((values) => [...new Set(values)]);
export const propertyQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(300).optional(),
    softPreferences: z
      .string()
      .max(500)
      .transform((s) =>
        s
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .optional(),
    featureMode: z.enum(["ranked", "required"]).optional(),
    parser: z.enum(["keyword"]).optional(),
    omit: z
      .string()
      .max(300)
      .regex(/^[a-zA-Z,]*$/)
      .optional(),
    listingType: z.enum(["SALE", "RENT"]).default("SALE"),
    city: z.string().trim().min(1).max(100).optional(),
    postcode: z.string().trim().min(1).max(12).optional(),
    lat: coordinate(-90, 90).optional(),
    lng: coordinate(-180, 180).optional(),
    radiusKm: numeric(0, 1000).optional(),
    // Public filters use pounds; Property.price remains an integer in pence.
    priceMin: numeric(0, 21474836.47).optional(),
    priceMax: numeric(0, 21474836.47).optional(),
    bedsMin: numeric(0, 100, true).optional(),
    bedsMax: numeric(0, 100, true).optional(),
    bathsMin: numeric(0, 100, true).optional(),
    bathsMax: numeric(0, 100, true).optional(),
    propertyTypes: csv(PROPERTY_TYPES).optional(),
    features: csv(FEATURES).optional(),
    sort: z
      .enum(["relevance", "newest", "price_asc", "price_desc"])
      .default("newest"),
    page: numeric(1, 1000000, true).default(1),
    pageSize: numeric(1, 50, true).default(20),
  })
  .superRefine((q, ctx) => {
    if (
      q.priceMin !== undefined &&
      q.priceMax !== undefined &&
      q.priceMin > q.priceMax
    )
      ctx.addIssue({
        code: "custom",
        path: ["priceMax"],
        message: "Maximum price must be at least minimum price",
      });
    if (
      q.bedsMin !== undefined &&
      q.bedsMax !== undefined &&
      q.bedsMin > q.bedsMax
    )
      ctx.addIssue({
        code: "custom",
        path: ["bedsMax"],
        message: "Maximum bedrooms must be at least minimum bedrooms",
      });
    if (
      q.bathsMin !== undefined &&
      q.bathsMax !== undefined &&
      q.bathsMin > q.bathsMax
    )
      ctx.addIssue({
        code: "custom",
        path: ["bathsMax"],
        message: "Maximum bathrooms must be at least minimum bathrooms",
      });
    if ((q.lat === undefined) !== (q.lng === undefined))
      ctx.addIssue({
        code: "custom",
        path: ["lat"],
        message: "Latitude and longitude must be supplied together",
      });
    if (
      q.radiusKm !== undefined &&
      (q.lat === undefined || q.lng === undefined)
    )
      ctx.addIssue({
        code: "custom",
        path: ["radiusKm"],
        message: "Radius requires lat and lng",
      });
  });
export type PropertyQuery = z.infer<typeof propertyQuerySchema>;
export function parsePropertyQuery(params: URLSearchParams) {
  // Reject duplicate keys instead of silently applying an ambiguous value.
  const duplicates = [...new Set([...params.keys()])].filter(
    (key) => params.getAll(key).length > 1,
  );
  if (duplicates.length)
    return {
      success: false as const,
      error: {
        issues: duplicates.map((key) => ({
          path: [key],
          message: "Supply each parameter once",
        })),
      },
    };
  return propertyQuerySchema.safeParse(Object.fromEntries(params));
}
