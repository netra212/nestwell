import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession, jsonBody } from "@/lib/session-api";
import { apiError } from "@/lib/api-error";
import { normalizeSavedFilters, savedSearchSchema } from "@/lib/saved-searches";
export const dynamic = "force-dynamic";
export async function GET() {
  const actor = await requireSession();
  if (actor.error) return actor.error;
  return NextResponse.json(
    {
      results: await db.savedSearch.findMany({
        where: { userId: actor.userId },
        orderBy: { createdAt: "desc" },
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const actor = await requireSession(request);
  if (actor.error) return actor.error;
  const body = await jsonBody(request);
  if (body.error) return body.error;
  const parsed = savedSearchSchema.safeParse(body.body);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_BODY",
      "Check your saved search.",
      parsed.error.issues,
    );
  try {
    const result = await db.savedSearch.create({
      data: {
        userId: actor.userId,
        name: parsed.data.name || null,
        rawQuery: parsed.data.rawQuery || null,
        filters: normalizeSavedFilters(parsed.data.filters),
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return apiError(
        409,
        "DUPLICATE_NAME",
        "You already have a search with this name. Choose another name.",
      );
    throw error;
  }
}
