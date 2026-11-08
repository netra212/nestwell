import { z } from "zod";
export const resourceIdSchema = z.string().trim().min(1).max(100);
export const demoEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const authMutationSchema = z
  .object({
    email: demoEmailSchema.optional(),
    password: z.string().max(1024).optional(),
    csrfToken: z.string().max(256).optional(),
    callbackUrl: z.string().max(8192).optional(),
    redirect: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional(),
    json: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.NEXTAUTH_URL)
    try {
      allowed.add(new URL(process.env.NEXTAUTH_URL).origin);
    } catch {}
  return allowed.has(origin);
}
export function safeReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes(String.fromCharCode(92)) ||
    Array.from(value).some((c) => c.charCodeAt(0) < 32)
  )
    return "/saved";
  return new URL(value, "https://nestwell.invalid").pathname === "/sign-in"
    ? "/saved"
    : value;
}
