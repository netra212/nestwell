"use client";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientAPI } from "@/lib/client-api";
import type { PropertyResult } from "@/lib/property-types";
import { toast } from "@/hooks/use-toast";
export type FavoriteData = { results: PropertyResult[]; propertyIds: string[] };
export function useFavorites() {
  const { data: session, status } = useSession();
  const key = ["favorites", session?.user.id];
  const query = useQuery<FavoriteData>({
    queryKey: key,
    enabled: status === "authenticated",
    queryFn: ({ signal }) => clientAPI("/api/favorites", { signal }),
  });
  return { ...query, session, status, key };
}
export function useFavoriteToggle(
  propertyId: string,
  property?: PropertyResult,
) {
  const favorites = useFavorites();
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationKey: ["favorite", favorites.session?.user.id, propertyId],
    mutationFn: ({ save }: { save: boolean }) =>
      clientAPI(
        save
          ? "/api/favorites"
          : `/api/favorites/${encodeURIComponent(propertyId)}`,
        save
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ propertyId }),
            }
          : { method: "DELETE" },
      ),
    onMutate: async ({ save }) => {
      await cache.cancelQueries({ queryKey: favorites.key });
      const previous = cache.getQueryData<FavoriteData>(favorites.key);
      const previousProperty = previous?.results.find(
        (p) => p.id === propertyId,
      );
      const wasSaved = previous?.propertyIds.includes(propertyId) || false;
      cache.setQueryData<FavoriteData>(favorites.key, (current) => {
        const data = current || { results: [], propertyIds: [] };
        return {
          propertyIds: save
            ? [...new Set([...data.propertyIds, propertyId])]
            : data.propertyIds.filter((id) => id !== propertyId),
          results: save
            ? property && !data.results.some((p) => p.id === propertyId)
              ? [property, ...data.results]
              : data.results
            : data.results.filter((p) => p.id !== propertyId),
        };
      });
      return { wasSaved, previousProperty };
    },
    onError: (error, _, context) => {
      cache.setQueryData<FavoriteData>(favorites.key, (current) => {
        if (!current || !context) return current;
        return {
          propertyIds: context.wasSaved
            ? [...new Set([...current.propertyIds, propertyId])]
            : current.propertyIds.filter((id) => id !== propertyId),
          results: context.wasSaved
            ? context.previousProperty &&
              !current.results.some((p) => p.id === propertyId)
              ? [context.previousProperty, ...current.results]
              : current.results
            : current.results.filter((p) => p.id !== propertyId),
        };
      });
      toast({
        title: "Couldn’t update saved homes",
        description: error.message,
      });
    },
    onSuccess: (_, variables) =>
      toast({
        title: variables.save
          ? "Property saved"
          : "Property removed from saved homes",
      }),
    onSettled: () => {
      if (
        cache.isMutating({
          mutationKey: ["favorite", favorites.session?.user.id],
        }) <= 1
      )
        void cache.invalidateQueries({ queryKey: favorites.key });
    },
  });
  return {
    ...favorites,
    mutation,
    saved: favorites.data?.propertyIds.includes(propertyId) || false,
  };
}
