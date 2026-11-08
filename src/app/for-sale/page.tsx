import { parsePropertyQuery } from "@/lib/property-query";
import { searchProperties } from "@/lib/properties";
import type { PropertyResults } from "@/lib/property-types";
import { publicMapboxToken } from "@/lib/map-config";
import { Suspense } from "react";
import { resultsMetadata } from "@/lib/seo";
import { ResultsPage, ResultsSkeleton } from "@/components/search/results-page";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return resultsMetadata(await searchParams);
}
export default async function ForSale({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") params.set(key, value);
  params.delete("view");
  const validated = parsePropertyQuery(params);
  let initial: { query: string; data: PropertyResults } | undefined;
  // Render traditional results and their image URLs before client hydration.
  // Natural-language requests keep the existing cached API parsing path.
  if (validated.success && !validated.data.q && raw.view !== "map") {
    try {
      initial = {
        query: params.toString(),
        data: JSON.parse(
          JSON.stringify(await searchProperties(validated.data)),
        ),
      };
    } catch {
      /* Client fetch displays the recoverable error state. */
    }
  }
  return (
    <Suspense
      fallback={
        <main id="main-content" className="mx-auto max-w-7xl p-8">
          <ResultsSkeleton />
        </main>
      }
    >
      <ResultsPage mapboxToken={publicMapboxToken()} initial={initial} />
    </Suspense>
  );
}
