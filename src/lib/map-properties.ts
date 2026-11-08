import type { FeatureCollection, Point } from "geojson";
import type { PropertyResult, PropertyResults } from "./property-types";
export function propertyGeoJSON(
  properties: PropertyResult[],
): FeatureCollection<Point, { id: string }> {
  return {
    type: "FeatureCollection",
    features: properties.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: { id: p.id },
    })),
  };
}
export async function fetchMapProperties(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams(query);
  params.delete("view");
  params.set("pageSize", "50");
  params.set("page", "1");
  const all: PropertyResult[] = [];
  let total = 1;
  let page = 1;
  do {
    params.set("page", String(page));
    const response = await fetch(`/api/properties?${params}`, { signal });
    const result = (await response.json()) as PropertyResults & {
      error?: { message: string };
    };
    if (!response.ok)
      throw new Error(
        result.error?.message || "Map properties could not be loaded.",
      );
    all.push(...result.results);
    total = result.total;
    page++;
    if (!result.results.length) break;
  } while ((page - 1) * 50 < total);
  return [...new Map(all.map((p) => [p.id, p])).values()];
}
