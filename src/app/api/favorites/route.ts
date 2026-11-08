import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { jsonBody, requireSession } from "@/lib/session-api";
export const dynamic = "force-dynamic";
export async function GET() {
  const actor = await requireSession();
  if (actor.error) return actor.error;
  const rows = await db.favorite.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        include: {
          agent: { select: { name: true, logoUrl: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
        },
      },
    },
  });
  return NextResponse.json(
    {
      results: rows.map((r) => r.property),
      propertyIds: rows.map((r) => r.propertyId),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const actor = await requireSession(request);
  if (actor.error) return actor.error;
  const body = await jsonBody(request);
  if (body.error) return body.error;
  const parsed = z
    .object({ propertyId: z.string().min(1).max(100) })
    .strict()
    .safeParse(body.body);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_BODY",
      "Choose a valid property.",
      parsed.error.issues,
    );
  if (
    !(await db.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: { id: true },
    }))
  )
    return apiError(404, "NOT_FOUND", "Property not found.");
  const favorite = await db.favorite.upsert({
    where: {
      userId_propertyId: {
        userId: actor.userId,
        propertyId: parsed.data.propertyId,
      },
    },
    create: { userId: actor.userId, propertyId: parsed.data.propertyId },
    update: {},
  });
  return NextResponse.json(favorite, { status: 201 });
}
