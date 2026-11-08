import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session-api";
import { apiError } from "@/lib/api-error";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireSession(request);
  if (actor.error) return actor.error;
  const { id } = await params;
  const result = await db.savedSearch.deleteMany({
    where: { id, userId: actor.userId },
  });
  if (!result.count)
    return apiError(404, "NOT_FOUND", "Saved search not found.");
  return NextResponse.json({ ok: true });
}
