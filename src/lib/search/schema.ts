import { z } from "zod";
export const searchPropertyTypes = [
  "house",
  "flat",
  "bungalow",
  "maisonette",
  "studio",
  "terraced",
  "semi-detached",
  "detached",
] as const;
const amount = z.number().min(0).max(21474836.47);
const rooms = z.number().int().min(0).max(100);
export const searchSchema = z
  .object({
    intent: z.enum(["buy", "rent", "unknown"]),
    location: z.object({
      text: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      postcode: z.string().max(12).optional(),
      radiusKm: z.number().min(0).max(1000).optional(),
    }),
    price: z.object({
      min: amount.optional(),
      max: amount.optional(),
      currency: z.literal("GBP").optional(),
    }),
    bedrooms: z.object({ min: rooms.optional(), max: rooms.optional() }),
    bathrooms: z.object({ min: rooms.optional(), max: rooms.optional() }),
    propertyType: z.array(z.enum(searchPropertyTypes)).max(8).optional(),
    features: z.array(z.string().max(80)).max(30),
    softPreferences: z.array(z.string().max(100)).max(20),
    mustHave: z.array(z.string().max(80)).max(30),
    niceToHave: z.array(z.string().max(80)).max(30),
    ambiguous: z.boolean(),
    clarifyingQuestions: z.array(z.string().max(200)).max(3).optional(),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((s, ctx) => {
    for (const key of ["price", "bedrooms", "bathrooms"] as const) {
      if (
        s[key].min !== undefined &&
        s[key].max !== undefined &&
        s[key].min! > s[key].max!
      )
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Minimum must not exceed maximum",
        });
    }
  });
export type ParsedSearch = z.infer<typeof searchSchema>;
export const queryBodySchema = z.object({
  query: z.string().trim().min(1).max(300),
});
// OpenAI strict output schemas require every field; optional values use null on the wire.
export const modelSearchSchema = z.object({
  intent: z.enum(["buy", "rent", "unknown"]),
  location: z.object({
    text: z.string().nullable(),
    city: z.string().nullable(),
    postcode: z.string().nullable(),
    radiusKm: z.number().nullable(),
  }),
  price: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    currency: z.literal("GBP").nullable(),
  }),
  bedrooms: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  bathrooms: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  propertyType: z.array(z.enum(searchPropertyTypes)).nullable(),
  features: z.array(z.string()),
  softPreferences: z.array(z.string()),
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  ambiguous: z.boolean(),
  clarifyingQuestions: z.array(z.string()),
});
