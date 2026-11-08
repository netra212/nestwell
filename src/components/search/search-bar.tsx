"use client";
import { useEffect, useState, useRef, useId } from "react";
import { usePropertySearch } from "@/hooks/use-property-search";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { VoiceButton, VoiceFeedback } from "./VoiceButton";
import { SearchOnboarding } from "./SearchOnboarding";
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
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(initialQuery);
  const voice = useVoiceSearch((text) => {
    setValue(text);
    input.current?.focus();
  });
  const [placeholder, setPlaceholder] = useState(0);
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(
      () => setPlaceholder((p) => (p + 1) % SEARCH_EXAMPLES.length),
      4500,
    );
    return () => clearInterval(interval);
  }, [reducedMotion]);
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
        if (voice.listening || voice.processing) voice.stop(true);
        void submit(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && (voice.listening || voice.processing)) {
          voice.stop(true);
          input.current?.focus();
        }
      }}
      className="relative w-full"
    >
      <SearchOnboarding onDismiss={() => input.current?.focus()} />
      <div
        className={`flex items-center gap-2 rounded-2xl border border-[#d9cce7] bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/25 ${hero ? "sm:p-3" : ""}`}
      >
        <Search className="ml-2 hidden size-5 shrink-0 text-primary sm:block" />
        <input
          ref={input}
          aria-label="Describe your ideal home"
          aria-describedby={`${id}-voice${error ? ` ${id}-error` : ""}`}
          aria-invalid={!!error}
          type="search"
          maxLength={Math.max(300, value.length)}
          value={value}
          onChange={(e) => {
            if (voice.listening || voice.processing) voice.stop(true);
            setValue(e.target.value);
          }}
          placeholder={SEARCH_EXAMPLES[placeholder]}
          className={`min-w-0 flex-1 bg-transparent px-2 text-sm outline-none sm:text-base ${hero ? "h-12" : "h-10"}`}
        />
        <VoiceButton
          voice={voice}
          statusId={`${id}-voice`}
          disabled={pending}
        />
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
              <span className="hidden sm:inline">Search</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
      <VoiceFeedback voice={voice} id={`${id}-voice`} />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  );
}
