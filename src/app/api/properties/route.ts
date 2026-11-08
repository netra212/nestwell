import { NextRequest, NextResponse } from "next/server";
import { parsePropertyQuery } from "@/lib/property-query";
import { searchProperties } from "@/lib/properties";
import { apiError } from "@/lib/api-error";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const parsed = parsePropertyQuery(request.nextUrl.searchParams);
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_PARAMS",
      "Invalid property search parameters",
      parsed.error.issues,
    );
  try {
    return NextResponse.json(await searchProperties(parsed.data));
  } catch (error) {
    console.error("Property search failed", error);
    return apiError(
      500,
      "DATABASE_ERROR",
      "Properties could not be loaded. Please try again.",
    );
  }
}
