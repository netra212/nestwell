"use client";
import { useState } from "react";
import { SearchBar, SEARCH_EXAMPLES } from "./search-bar";
export function HomeSearch() {
  const [example, setExample] = useState("");
  return (
    <>
      <SearchBar hero example={example} />
      <p className="mt-5 text-xs text-[#897a99]">A little inspiration</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEARCH_EXAMPLES.slice(0, 3).map((query) => (
          <button
            key={query}
            onClick={() => setExample(query)}
            className="rounded-full border border-[#d9cce7] bg-white/70 px-3 py-2 text-left text-[11px] text-[#61417f] transition hover:bg-white"
          >
            {query}
          </button>
        ))}
      </div>
    </>
  );
}
