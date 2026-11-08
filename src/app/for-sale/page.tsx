import { Suspense } from "react";
import type { Metadata } from "next";
import { ResultsPage, ResultsSkeleton } from "@/components/search/results-page";
export const metadata: Metadata = {
  title: "Properties for sale & rent | Nestwell",
  description:
    "Find a home with our UK property listings. Filter by location, price, bedrooms and the features that matter to you.",
};
export default function ForSale() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="mx-auto max-w-7xl p-8">
          <ResultsSkeleton />
        </main>
      }
    >
      <ResultsPage />
    </Suspense>
  );
}
