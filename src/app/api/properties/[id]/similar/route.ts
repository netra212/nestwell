import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { similarProperties } from "@/lib/similar-properties";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id } });
  if (!property) return apiError(404, "NOT_FOUND", "Property not found.");
  return NextResponse.json({ results: await similarProperties(property) });
}
