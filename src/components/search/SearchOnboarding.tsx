"use client";
import { useEffect, useState } from "react";
export const SEARCH_ONBOARDING_KEY = "nestwell.search-onboarding-dismissed.v1";
export function SearchOnboarding({ onDismiss }: { onDismiss?: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(localStorage.getItem(SEARCH_ONBOARDING_KEY) !== "true");
    } catch {
      setVisible(true);
    }
  }, []);
  if (!visible) return null;
  return (
    <div
      role="note"
      className="absolute top-full left-0 z-30 mt-2 flex max-w-full items-center justify-between gap-3 rounded-xl border border-[#d9cce7] bg-white px-3 py-2 text-xs text-[#523772]"
    >
      <p>Try describing your ideal home — or tap the mic.</p>
      <button
        type="button"
        aria-label="Dismiss search tip"
        className="shrink-0 rounded px-2 py-1 font-semibold text-primary underline"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
          try {
            localStorage.setItem(SEARCH_ONBOARDING_KEY, "true");
          } catch {}
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
