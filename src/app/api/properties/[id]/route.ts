import { similarProperties } from "@/lib/similar-properties";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProperty } from "@/lib/properties";
import { apiError } from "@/lib/api-error";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = z
    .string()
    .min(1)
    .max(100)
    .safeParse((await params).id);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_PARAMS",
      "Invalid property ID",
      parsed.error.issues,
    );
  try {
    const property = await getProperty(parsed.data);
    if (!property) return apiError(404, "NOT_FOUND", "Property not found");
    return NextResponse.json({
      ...property,
      similarProperties: await similarProperties(property),
    });
  } catch (error) {
    console.error("Property lookup failed", error);
    return apiError(
      500,
      "DATABASE_ERROR",
      "Property could not be loaded. Please try again.",
    );
  }
}
