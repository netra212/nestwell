"use client";
import { usePropertySearch } from "@/hooks/use-property-search";
import { MessageCircle, LoaderCircle } from "lucide-react";
import { describeSearch } from "@/lib/search/mergeFilters";
import type { ParsedSearch } from "@/lib/search/schema";
export function ClarifyingQuestions({
  parsed,
  query,
  modelUsed,
}: {
  parsed: ParsedSearch;
  query: string;
  modelUsed?: string;
}) {
  const { submit, pending } = usePropertySearch();
  const questions = parsed.ambiguous
    ? (parsed.clarifyingQuestions || []).slice(0, 3)
    : [];
  return (
    <section
      aria-label="Search understanding"
      className="mb-6 rounded-xl border border-[#e4d9ef] bg-[#f7f3fb] px-5 py-4"
    >
      <p className="text-sm leading-relaxed">
        <span className="font-semibold text-[#523772]">We understood: </span>
        {describeSearch(parsed)}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {modelUsed === "fallback"
          ? "Keyword interpretation"
          : "Smart interpretation"}{" "}
        · {Math.round(parsed.confidence * 100)}% confidence · Adjust any filter
        above or in the panel.
      </p>
      {questions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-[#e4d9ef] pt-4">
          {questions.map((question) => {
            const options = /buy|rent|intent/i.test(question)
              ? ["Buy", "Rent"]
              : /where|city|location|postcode|area/i.test(question)
                ? ["In London", "In Manchester", "In Bristol"]
                : /budget|price/i.test(question)
                  ? ["Under £300k", "Under £600k"]
                  : /bed|room/i.test(question)
                    ? ["2 bedrooms", "3 bedrooms"]
                    : ["Buy", "In London"];
            return (
              <div key={question}>
                <p className="flex items-center gap-2 text-xs font-medium">
                  <MessageCircle className="size-3 text-primary" />
                  {question}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      onClick={() => void submit(`${query} ${option}`)}
                      disabled={pending || `${query} ${option}`.length > 300}
                      className="rounded-full border bg-white px-3 py-1.5 text-xs text-primary hover:bg-accent disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {pending && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-xs text-primary"
        >
          <LoaderCircle className="size-3 animate-spin" />
          Updating your search…
        </p>
      )}
    </section>
  );
}
