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
  await db.favorite.deleteMany({ where: { userId: actor.userId, propertyId } });
  return NextResponse.json({ ok: true });
}
