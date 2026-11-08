"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  SearchX,
  CircleAlert,
} from "lucide-react";
import { useSearchParamsState } from "@/hooks/use-search-params-state";
import { PropertyCard } from "@/components/property/property-card";
import { FilterPanel } from "./filter-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapResults, MapViewToggle } from "@/components/map/MapResults";
import { SaveSearchButton } from "./SaveSearchButton";
import { SearchBar } from "./search-bar";
import { FilterChips } from "./filter-chips";
import { ClarifyingQuestions } from "./clarifying-questions";
import type { SearchState } from "@/hooks/use-search-params-state";
import type { PropertyResults } from "@/lib/property-types";

export function ResultsPage({ mapboxToken }: { mapboxToken?: string }) {
  const filters = useSearchParamsState();
  const { state: rawState, query, update: rawUpdate, reset } = filters;
  const [open, setOpen] = useState(false);
  // view is presentation-only; keep it in the URL while excluding it from API validation.
  const apiParams = new URLSearchParams(query);
  apiParams.delete("view");
  if (rawState.view === "map" && mapboxToken) apiParams.delete("page");
  const apiQuery = apiParams.toString();
  const results = useQuery<PropertyResults>({
    queryKey: ["properties", apiQuery],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/properties?${apiQuery}`, { signal });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.details
            ?.map((d: { message: string }) => d.message)
            .join(". ") ||
            data.error?.message ||
            "Properties could not be loaded",
        );
      return data;
    },
  });
  const data = results.data;
  const inherited =
    data && data.searchQuery === rawState.q ? { ...data.filterState } : {};
  for (const key of rawState.omit?.split(",") || []) delete inherited[key];
  const state = { ...inherited, ...rawState };
  const update = (patch: SearchState, immediate = false, resetPage = true) => {
    if (patch.radiusKm && !rawState.lat && state.lat && state.lng)
      patch = { ...patch, lat: state.lat, lng: state.lng };
    rawUpdate(patch, immediate, resetPage);
  };
  const visibleFilters = {
    ...filters,
    state,
    update: (patch: SearchState, immediate = false, resetPage = true) =>
      update(
        patch.features !== undefined
          ? { ...patch, featureMode: "required" }
          : patch,
        immediate,
        resetPage,
      ),
  };
  const updateChip = (patch: SearchState) =>
    update(
      patch.features !== undefined
        ? { ...patch, featureMode: state.featureMode || "required" }
        : patch,
    );
  const page = data?.page || Number(state.page) || 1;
  const pages = Math.ceil((data?.total || 0) / (data?.pageSize || 20));
  const view =
    state.view === "map" && mapboxToken
      ? "map"
      : state.view === "list"
        ? "list"
        : "grid";
  const sorting = state.sort || (state.q ? "relevance" : "newest");
  const sortLabels: Record<string, string> = {
    newest: "Newest listed",
    relevance: "Best match",
    price_asc: "Price ↑",
    price_desc: "Price ↓",
  };
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n > 0 && n <= pages)
    .sort((a, b) => a - b);
  const activeCount = [
    "city",
    "postcode",
    "priceMin",
    "priceMax",
    "bedsMin",
    "bedsMax",
    "bathsMin",
    "propertyTypes",
    "features",
  ].filter((k) => state[k]).length;
  return (
    <main id="main-content" className="min-h-screen bg-[#faf9fc]">
      <div className="border-b bg-[#f5f1f9]">
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
          <div className="max-w-4xl">
            <SearchBar initialQuery={state.q || ""} />
            <FilterChips state={state} update={updateChip} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8">
        <p className="mb-6 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Home</span>
          <ChevronRight className="size-3" />
          <span>
            Property {state.listingType === "RENT" ? "to rent" : "for sale"}
          </span>
          {state.city && (
            <>
              <ChevronRight className="size-3" />
              <span className="text-primary">{state.city}</span>
            </>
          )}
        </p>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
              Your next chapter starts here
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Find a place to call home<span className="text-primary">.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Explore properties{" "}
              {state.listingType === "RENT" ? "to rent" : "for sale"}
              {state.city ? ` in ${state.city}` : " across the UK"}.
            </p>
          </div>
          <span className="hidden items-center gap-2 pb-1 text-xs text-muted-foreground xl:flex">
            A home for every possibility{" "}
            <ArrowRight className="size-4 text-primary" />
          </span>
        </div>
        {data?.parsed && state.q && data.searchQuery === state.q && (
          <ClarifyingQuestions
            key={state.q}
            parsed={data.parsed}
            query={state.q}
            modelUsed={data.modelUsed}
          />
        )}
        <div className="flex items-start gap-7">
          <aside
            aria-label="Property filters"
            className="hidden w-64 shrink-0 rounded-2xl border bg-white p-5 lg:block"
          >
            <FilterPanel {...visibleFilters} />
          </aside>
          <section className="min-w-0 flex-1" aria-label="Property results">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <SaveSearchButton query={query} />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="h-9 lg:hidden"
                  onClick={() => setOpen(true)}
                >
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded bg-accent px-1.5 text-primary">
                      {activeCount}
                    </span>
                  )}
                </Button>
                <p
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-sm font-semibold"
                >
                  {data
                    ? `${data.total.toLocaleString("en-GB")} ${data.total === 1 ? "property" : "properties"} found`
                    : results.isError
                      ? "Search unavailable"
                      : "Finding properties…"}
                </p>
                {results.isFetching && data && (
                  <span className="text-xs text-muted-foreground">
                    Updating…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-muted-foreground sm:block">
                  Sort by
                </span>
                <Select
                  value={sorting}
                  onValueChange={(value) => {
                    if (value) update({ sort: String(value) }, true);
                  }}
                >
                  <SelectTrigger
                    aria-label="Sort properties"
                    className="h-9 min-w-36 bg-white"
                  >
                    <SelectValue>{sortLabels[sorting] || sorting}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Best match</SelectItem>
                    <SelectItem value="newest">Newest listed</SelectItem>
                    <SelectItem value="price_asc">Price ↑</SelectItem>
                    <SelectItem value="price_desc">Price ↓</SelectItem>
                  </SelectContent>
                </Select>
                <div
                  className="flex gap-1 rounded-lg border bg-white p-1"
                  role="group"
                  aria-label="Results layout"
                >
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => update({ view: "grid" }, true, false)}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => update({ view: "list" }, true, false)}
                  >
                    <List className="size-4" />
                  </Button>
                  <MapViewToggle
                    available={!!mapboxToken}
                    active={view === "map"}
                    onClick={() => update({ view: "map" }, true)}
                  />
                </div>
              </div>
            </div>
            {results.isError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-100 bg-white px-6 py-16 text-center"
              >
                <CircleAlert className="mx-auto mb-4 size-9 text-destructive" />
                <h2 className="text-lg font-semibold">
                  We couldn’t load these properties
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
                  {results.error.message}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button onClick={() => results.refetch()}>Try again</Button>
                  <Button variant="outline" onClick={reset}>
                    Reset filters
                  </Button>
                </div>
              </div>
            ) : results.isPending ? (
              <ResultsSkeleton />
            ) : data?.results.length === 0 ? (
              <div className="rounded-2xl border bg-white px-6 py-20 text-center">
                <SearchX className="mx-auto mb-5 size-10 text-primary" />
                <h2 className="text-xl font-semibold">
                  No properties match — try widening your filters
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your next home could be just a few filters away.
                </p>
                <Button onClick={reset} className="mt-6">
                  Reset filters
                </Button>
                {page > 1 && (
                  <Button
                    variant="outline"
                    className="mt-6 ml-3"
                    onClick={() => update({ page: "1" }, true, false)}
                  >
                    First page
                  </Button>
                )}
              </div>
            ) : view === "map" && mapboxToken ? (
              <MapResults
                token={mapboxToken}
                query={apiQuery}
                onClose={() => update({ view: "grid" }, true, false)}
              />
            ) : (
              <div
                aria-busy={results.isFetching}
                className={`transition-opacity ${results.isFetching ? "opacity-45" : "opacity-100"}`}
              >
                <div
                  className={
                    view === "grid"
                      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                      : "grid gap-5"
                  }
                >
                  {data?.results.map((property, index) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      view={view === "map" ? "grid" : view}
                      priority={index < 3}
                    />
                  ))}
                </div>
              </div>
            )}
            {!!data?.results.length && !results.isError && view !== "map" && (
              <nav
                aria-label="Pagination"
                className="mt-10 flex flex-wrap items-center justify-center gap-2 pb-6"
              >
                <Button
                  variant="outline"
                  aria-label="Previous page"
                  disabled={page <= 1 || results.isPlaceholderData}
                  onClick={() =>
                    update({ page: String(page - 1) }, true, false)
                  }
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                {pageNumbers.map((n, index) => (
                  <span key={n} className="flex items-center gap-2">
                    {index > 0 && n - pageNumbers[index - 1] > 1 && (
                      <span className="text-muted-foreground">…</span>
                    )}
                    <Button
                      variant={n === page ? "default" : "outline"}
                      aria-label={`Page ${n}`}
                      aria-current={n === page ? "page" : undefined}
                      disabled={results.isPlaceholderData}
                      onClick={() => update({ page: String(n) }, true, false)}
                    >
                      {n}
                    </Button>
                  </span>
                ))}
                <Button
                  variant="outline"
                  aria-label="Next page"
                  disabled={page >= pages || results.isPlaceholderData}
                  onClick={() =>
                    update({ page: String(page + 1) }, true, false)
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
                <p className="mt-3 w-full text-center text-xs text-muted-foreground">
                  Showing {(page - 1) * data.pageSize + 1}–
                  {Math.min(page * data.pageSize, data.total)} of {data.total}{" "}
                  properties
                </p>
              </nav>
            )}
          </section>
        </div>
        <footer className="mt-12 border-t py-8 text-center text-xs text-muted-foreground">
          A new home. A fresh start. A little more you.{" "}
          <span className="ml-2 font-semibold text-primary">nestwell.</span>
        </footer>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(90vw,360px)] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Property filters</SheetTitle>
            <SheetDescription>
              Find the details that feel like home.
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-8">
            <FilterPanel
              {...visibleFilters}
              apply={() => {
                filters.apply();
                setOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
export function ResultsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading properties"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border bg-white"
        >
          <Skeleton className="aspect-[1.55] w-full rounded-none" />
          <div className="space-y-4 p-5">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
