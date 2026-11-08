"use client";
import { Heart } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/hooks/useFavorites";
import type { PropertyResult } from "@/lib/property-types";
export function FavoriteButton({
  propertyId,
  address,
  property,
  className,
  showLabel = false,
}: {
  propertyId: string;
  address: string;
  property?: PropertyResult;
  className?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const state = useFavoriteToggle(propertyId, property);
  const updating =
    useIsMutating({
      mutationKey: ["favorite", state.session?.user.id, propertyId],
    }) > 0;
  return (
    <Button
      type="button"
      variant={showLabel ? "outline" : "secondary"}
      size={showLabel ? "default" : "icon"}
      aria-label={`${state.saved ? "Unsave" : "Save"} ${showLabel ? "property at " : ""}${address}`}
      aria-pressed={state.saved}
      disabled={
        state.status === "loading" ||
        updating ||
        (state.status === "authenticated" && state.isPending)
      }
      className={className}
      onClick={() => {
        if (state.status !== "authenticated") {
          router.push(
            `/sign-in?${new URLSearchParams({ callbackUrl: `${pathname}${window.location.search}` })}`,
          );
          return;
        }
        if (state.isError) {
          void state.refetch();
          return;
        }
        state.mutation.mutate({ save: !state.saved });
      }}
    >
      <Heart
        className={`size-4 ${state.saved ? "fill-primary text-primary" : ""}`}
        aria-hidden="true"
      />
      {showLabel && (state.saved ? "Unsave property" : "Save property")}
    </Button>
  );
}
