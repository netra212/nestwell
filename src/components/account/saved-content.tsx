"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useFavorites";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { clientAPI } from "@/lib/client-api";
import { savedSearchURL, type SavedSearchResult } from "@/lib/saved-searches";
import { toast } from "@/hooks/use-toast";
export function SavedContent() {
  const favorites = useFavorites();
  const { data: session } = useSession();
  const cache = useQueryClient();
  const key = ["saved-searches", session?.user.id];
  const searches = useQuery<{ results: SavedSearchResult[] }>({
    queryKey: key,
    enabled: !!session?.user.id,
    queryFn: ({ signal }) => clientAPI("/api/saved-searches", { signal }),
  });
  const deletion = useMutation({
    mutationFn: (id: string) =>
      clientAPI(`/api/saved-searches/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
    onError: (error) =>
      toast({ title: "Couldn’t delete search", description: error.message }),
  });
  return (
    <div className="space-y-14">
      <section aria-labelledby="saved-homes-title">
        <h2 id="saved-homes-title" className="mb-6 text-2xl font-bold">
          Saved homes
        </h2>
        {favorites.isPending ? (
          <p role="status">Loading your saved homes…</p>
        ) : favorites.isError ? (
          <div role="alert">
            We couldn’t load your homes.{" "}
            <Button variant="outline" onClick={() => favorites.refetch()}>
              Try again
            </Button>
          </div>
        ) : !favorites.data?.results.length ? (
          <div className="rounded-xl border bg-white p-8">
            <p>You haven’t saved any homes yet.</p>
            <Link
              href="/for-sale"
              className="mt-4 inline-block font-semibold text-primary underline"
            >
              Find a home to save
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.data.results.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="saved-searches-title">
        <h2 id="saved-searches-title" className="mb-6 text-2xl font-bold">
          Saved searches
        </h2>
        {searches.isPending ? (
          <p role="status">Loading your searches…</p>
        ) : searches.isError ? (
          <div role="alert">
            We couldn’t load your searches.{" "}
            <Button variant="outline" onClick={() => searches.refetch()}>
              Try again
            </Button>
          </div>
        ) : !searches.data?.results.length ? (
          <div className="rounded-xl border bg-white p-8">
            <p>
              No searches saved yet. Find your ideal filters and select “Save
              this search”.
            </p>
            <Link
              href="/for-sale"
              className="mt-4 inline-block text-primary underline"
            >
              Start a search
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {searches.data.results.map((search) => (
              <li key={search.id} className="rounded-xl border bg-white p-5">
                <h3 className="font-semibold">
                  {search.name || "Saved property search"}
                </h3>
                {search.rawQuery && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search.rawQuery}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href={savedSearchURL(search.filters, search.rawQuery)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                  >
                    Run
                  </Link>
                  <Button
                    variant="outline"
                    disabled={deletion.isPending}
                    onClick={() => deletion.mutate(search.id)}
                    aria-label={`Delete ${search.name || "saved search"}`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
