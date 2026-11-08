import { NextRequest, NextResponse } from "next/server";
import { parsePropertyQuery } from "@/lib/property-query";
import { searchProperties } from "@/lib/properties";
import { apiError } from "@/lib/api-error";
import { parseQuery } from "@/lib/search/parseQuery";
import {
  hasSearchMeaning,
  mergeSearchFilters,
} from "@/lib/search/mergeFilters";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const validated = parsePropertyQuery(params);
  if (!validated.success)
    return apiError(
      400,
      "INVALID_PARAMS",
      "Invalid property search parameters",
      validated.error.issues,
    );
  try {
    if (!validated.data.q)
      return NextResponse.json(await searchProperties(validated.data));
    const search = await parseQuery(validated.data.q, {
      forceFallback: validated.data.parser === "keyword",
    });
    const merged = mergeSearchFilters(search.parsed, validated.data, params);
    if (!merged.success)
      return apiError(
        400,
        "INVALID_PARAMS",
        "Filters conflict with your search. Edit or remove a filter.",
        merged.error.issues,
      );
    const q = merged.query;
    let unresolvedLocation = false;
    if (
      search.parsed.location.radiusKm !== undefined &&
      q.radiusKm === undefined &&
      !params.has("city") &&
      !params.has("postcode") &&
      !params.get("omit")?.split(",").includes("radiusKm")
    ) {
      const point = await db.property.aggregate({
        where: {
          ...(q.city ? { city: { equals: q.city, mode: "insensitive" } } : {}),
          ...(q.postcode
            ? { postcode: { startsWith: q.postcode, mode: "insensitive" } }
            : {}),
        },
        _avg: { latitude: true, longitude: true },
      });
      if (
        point._avg.latitude !== null &&
        point._avg.longitude !== null &&
        (q.city || q.postcode)
      ) {
        q.lat = point._avg.latitude;
        q.lng = point._avg.longitude;
        q.radiusKm = search.parsed.location.radiusKm;
        Object.assign(merged.filterState, {
          lat: String(q.lat),
          lng: String(q.lng),
          radiusKm: String(q.radiusKm),
        });
        merged.preferences.location.radiusKm = q.radiusKm;
      } else unresolvedLocation = true;
    }
    // Free-text locations that cannot be resolved must not silently search the whole UK.
    if (
      search.parsed.location.text &&
      !q.city &&
      !q.postcode &&
      !merged.preferences.features.includes("near-transport") &&
      !merged.preferences.features.includes("near-schools") &&
      !params.has("city") &&
      !params.has("postcode") &&
      !params
        .get("omit")
        ?.split(",")
        .some((k) => k === "city" || k === "postcode")
    )
      unresolvedLocation = true;
    const data = await searchProperties(
      q,
      merged.preferences,
      hasSearchMeaning(search.parsed) ? undefined : validated.data.q,
      unresolvedLocation,
    );
    return NextResponse.json({
      ...data,
      parsed: merged.preferences,
      originalParsed: search.parsed,
      filterState: merged.filterState,
      searchQuery: validated.data.q,
      modelUsed: search.modelUsed,
      cached: search.cached,
      latencyMs: search.latencyMs,
    });
  } catch (error) {
    console.error("Property search failed", error);
    return apiError(
      500,
      "DATABASE_ERROR",
      "Properties could not be loaded. Please try again.",
    );
  }
}
