"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
export function usePropertySearch() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const submit = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q || q.length > 300) {
        setError("Enter a search of 1–300 characters.");
        return;
      }
      if (busy.current) return;
      busy.current = true;
      setPending(true);
      setError("");
      const request = new AbortController();
      controller.current = request;
      const timeout = setTimeout(() => request.abort(), 8000);
      let keyword = false;
      try {
        const response = await fetch("/api/search/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: request.signal,
        });
        if (!response.ok) throw new Error("Parser unavailable");
        const result = await response.json();
        keyword = result.modelUsed === "fallback";
      } catch {
        keyword = true;
      } finally {
        clearTimeout(timeout);
        busy.current = false;
        if (mounted.current) setPending(false);
      }
      if (!mounted.current) return;
      if (keyword)
        toast({ title: "Smart search unavailable — using keyword search." });
      router.push(
        `/for-sale?${new URLSearchParams({ q, ...(keyword ? { parser: "keyword" } : {}) })}`,
      );
    },
    [router],
  );
  return { submit, pending, error };
}
