import { apiError } from "@/lib/api-error";
import { resourceIdSchema } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session-api";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  const actor = await requireSession(request);
  if (actor.error) return actor.error;
  const { propertyId } = await params;
  const validated = resourceIdSchema.safeParse(propertyId);
  if (!validated.success)
    return apiError(
      400,
      "INVALID_PARAMS",
      "Invalid identifier.",
      validated.error.issues,
    );
  await db.favorite.deleteMany({ where: { userId: actor.userId, propertyId } });
  return NextResponse.json({ ok: true });
}
