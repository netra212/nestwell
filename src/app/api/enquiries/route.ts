import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquiryBodySchema } from "@/lib/enquiry-schema";
import { jsonBody, requireSession } from "@/lib/session-api";
import { apiError } from "@/lib/api-error";
import { clientIP } from "@/lib/search/rateLimit";
import { takeEnquiryRequest } from "@/lib/enquiry-rate-limit";
export async function POST(request: Request) {
  const actor = await requireSession(request);
  if (actor.error) return actor.error;
  const limit = takeEnquiryRequest(clientIP(request.headers));
  if (!limit.allowed) {
    const response = apiError(
      429,
      "RATE_LIMITED",
      "Please wait a few seconds before sending another enquiry.",
    );
    response.headers.set("Retry-After", String(limit.retryAfter));
    return response;
  }
  const body = await jsonBody(request);
  if (body.error) return body.error;
  const parsed = enquiryBodySchema.safeParse(body.body);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_BODY",
      "Check your contact details and message.",
      parsed.error.issues,
    );
  if (parsed.data.website)
    return NextResponse.json({ ok: true }, { status: 201 });
  if (
    !(await db.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: { id: true },
    }))
  )
    return apiError(404, "NOT_FOUND", "Property not found.");
  const { website: _, propertyId, ...details } = parsed.data;
  void _;
  const enquiry = await db.enquiry.create({
    data: {
      ...details,
      phone: details.phone || null,
      propertyId,
      userId: actor.userId,
    },
  });
  return NextResponse.json({ ok: true, id: enquiry.id }, { status: 201 });
}
