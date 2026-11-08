"use client";
import { useEffect, useState } from "react";
import { usePropertySearch } from "@/hooks/use-property-search";
import { ArrowRight, LoaderCircle, Mic, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
export const SEARCH_EXAMPLES = [
  "3-bed house in London under £600k with a garden",
  "Pet-friendly flat with balcony in Manchester",
  "Family home near schools in Bristol under £450k",
  "Quiet modern flat in Leeds under £350k",
];
export function SearchBar({
  initialQuery = "",
  example,
  hero = false,
}: {
  initialQuery?: string;
  example?: string;
  hero?: boolean;
}) {
  const { submit, pending, error } = usePropertySearch();
  const [value, setValue] = useState(initialQuery);
  const [placeholder, setPlaceholder] = useState(0);
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    const interval = setInterval(
      () => setPlaceholder((p) => (p + 1) % SEARCH_EXAMPLES.length),
      4500,
    );
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (example) {
      setValue(example);
      void submit(example);
    }
  }, [example, submit]);
  return (
    <form
      aria-label="Natural language property search"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(value);
      }}
      className="w-full"
    >
      <div
        className={`flex items-center gap-2 rounded-2xl border border-[#d9cce7] bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/25 ${hero ? "sm:p-3" : ""}`}
      >
        <Search className="ml-2 hidden size-5 shrink-0 text-primary sm:block" />
        <input
          aria-label="Describe your ideal home"
          aria-describedby={error ? "search-error" : undefined}
          aria-invalid={!!error}
          type="search"
          maxLength={300}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={SEARCH_EXAMPLES[placeholder]}
          className={`min-w-0 flex-1 bg-transparent px-2 text-sm outline-none sm:text-base ${hero ? "h-12" : "h-10"}`}
        />
        {/* // TODO Phase 4: connect microphone and voice transcription. */}
        <button
          type="button"
          disabled
          aria-label="Voice search coming soon"
          title="Voice search coming soon"
          className="hidden p-2 text-muted-foreground opacity-40 sm:block"
        >
          <Mic className="size-5" />
        </button>
        <Button
          type="submit"
          disabled={pending}
          aria-label={
            pending ? "Understanding your search" : "Search properties"
          }
          className={`${hero ? "h-12" : "h-10"} px-4 sm:px-6`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Find my home</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
      {error && (
        <p
          id="search-error"
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  );
}
