"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SearchState = Record<string, string>;
export function useSearchParamsState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [draft, setDraft] = useState<SearchState>(() =>
    Object.fromEntries(searchParams),
  );
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const committedQuery = useRef<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    // Preserve a newer edit if an earlier router navigation finishes late.
    if (committedQuery.current === query) {
      committedQuery.current = null;
      if (pending.current) return;
    }
    if (pending.current) clearTimeout(pending.current);
    const state = Object.fromEntries(new URLSearchParams(query));
    draftRef.current = state;
    setDraft(state);
  }, [query]);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );
  const commit = useCallback(
    (state: SearchState) => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      const params = new URLSearchParams();
      Object.entries(state).forEach(([key, value]) => {
        if (value !== "") params.set(key, value);
      });
      if (params.toString() !== queryRef.current) {
        committedQuery.current = params.toString();
        router.push(`${pathname}${params.size ? `?${params}` : ""}`, {
          scroll: false,
        });
      }
    },
    [pathname, router],
  );
  const update = useCallback(
    (patch: SearchState, immediate = false, resetPage = true) => {
      const next = {
        ...draftRef.current,
        ...patch,
        ...(resetPage ? { page: "1" } : {}),
      };
      draftRef.current = next;
      setDraft(next);
      if (pending.current) clearTimeout(pending.current);
      if (immediate) commit(next);
      else pending.current = setTimeout(() => commit(next), 300);
    },
    [commit],
  );
  const reset = useCallback(() => {
    draftRef.current = {};
    setDraft({});
    commit({});
  }, [commit]);
  return {
    state: draft,
    query,
    update,
    reset,
    apply: () => commit(draftRef.current),
  };
}
