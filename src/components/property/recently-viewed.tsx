"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PropertyCard } from "./property-card";
import {
  RECENTLY_VIEWED_EVENT,
  RECENTLY_VIEWED_KEY,
  addRecentId,
  recentIds,
} from "@/lib/recently-viewed";
import type { PropertyResult } from "@/lib/property-types";
export function TrackViewed({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(
        RECENTLY_VIEWED_KEY,
        JSON.stringify(
          addRecentId(
            recentIds(localStorage.getItem(RECENTLY_VIEWED_KEY)),
            propertyId,
          ),
        ),
      );
      window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  }, [propertyId]);
  return null;
}
export function RecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        setIds(recentIds(localStorage.getItem(RECENTLY_VIEWED_KEY)));
      } catch {
        setIds([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(RECENTLY_VIEWED_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(RECENTLY_VIEWED_EVENT, read);
    };
  }, []);
  const query = useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const properties = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(
            `/api/properties/${encodeURIComponent(id)}`,
            { signal },
          );
          if (!response.ok) return null;
          return (await response.json()) as PropertyResult;
        }),
      );
      return properties.filter((p): p is PropertyResult => p !== null);
    },
  });
  if (!query.data?.length) return null;
  return (
    <section aria-labelledby="recently-viewed-title" className="mt-14">
      <h2 id="recently-viewed-title" className="mb-6 text-2xl font-bold">
        Recently viewed
      </h2>
      <div className="flex gap-5 overflow-x-auto pb-4">
        {query.data.map((property) => (
          <div key={property.id} className="w-72 shrink-0">
            <PropertyCard property={property} />
          </div>
        ))}
      </div>
    </section>
  );
}
