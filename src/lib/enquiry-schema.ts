import { z } from "zod";
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.email("Enter a valid email address").max(254),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^[+\d\s()-]{7,25}$/.test(value),
      "Enter a valid phone number",
    )
    .optional()
    .default(""),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(3000, "Please keep your message under 3,000 characters"),
});

export const enquiryBodySchema = enquirySchema
  .extend({
    propertyId: z.string().min(1).max(100),
    website: z.string().max(200).optional(),
  })
  .strict();
