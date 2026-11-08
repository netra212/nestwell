import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import type { LocationMatch } from "@/lib/property-types";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const parsed = z
    .string()
    .trim()
    .max(100)
    .safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success)
    return apiError(
      400,
      "INVALID_PARAMS",
      "Invalid location query",
      parsed.error.issues,
    );
  const q = parsed.data;
  if (!q) return NextResponse.json({ results: [] });
  try {
    const groups = await db.property.groupBy({
      by: ["city", "postcode"],
      where: {
        OR: [
          { city: { contains: q, mode: "insensitive" } },
          { postcode: { contains: q, mode: "insensitive" } },
        ],
      },
      _avg: { latitude: true, longitude: true },
      orderBy: [{ city: "asc" }, { postcode: "asc" }],
      take: 8,
    });
    const cities = await db.property.groupBy({
      by: ["city"],
      where: { city: { contains: q, mode: "insensitive" } },
      _avg: { latitude: true, longitude: true },
      orderBy: { city: "asc" },
      take: 8,
    });
    const results: LocationMatch[] = [
      ...cities.map((p) => ({
        label: p.city,
        city: p.city,
        latitude: p._avg.latitude!,
        longitude: p._avg.longitude!,
      })),
      ...groups.map((p) => ({
        label: `${p.postcode}, ${p.city}`,
        city: p.city,
        postcode: p.postcode,
        latitude: p._avg.latitude!,
        longitude: p._avg.longitude!,
      })),
    ].slice(0, 8);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Location lookup failed", error);
    return apiError(
      500,
      "DATABASE_ERROR",
      "Locations could not be loaded. Please try again.",
    );
  }
}
