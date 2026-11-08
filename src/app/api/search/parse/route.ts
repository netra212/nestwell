import { allowedOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { parseQuery } from "@/lib/search/parseQuery";
import { queryBodySchema } from "@/lib/search/schema";
import { clientIP, takeSearchRequest } from "@/lib/search/rateLimit";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return apiError(403, "INVALID_ORIGIN", "This request is not allowed.");
  const rate = takeSearchRequest(clientIP(request.headers));
  if (!rate.allowed) {
    const response = apiError(
      429,
      "RATE_LIMITED",
      "Too many searches. Please try again in a minute.",
    );
    response.headers.set("Retry-After", String(rate.retryAfter));
    return response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_BODY", "Send a JSON object containing query");
  }
  const parsed = queryBodySchema.safeParse(body);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_QUERY",
      "Enter a search of 1–300 characters",
      parsed.error.issues,
    );
  const result = await parseQuery(parsed.data.query);
  return NextResponse.json({
    ...result.parsed,
    cached: result.cached,
    modelUsed: result.modelUsed,
    latencyMs: result.latencyMs,
  });
}
