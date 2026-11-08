"use client";
import { useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
export function MapViewToggle({
  available,
  active,
  onClick,
}: {
  available: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const [tip, setTip] = useState(false);
  return (
    <span
      className="relative inline-flex"
      {...(!available
        ? {
            tabIndex: 0,
            role: "group",
            "aria-label": "Map view unavailable",
            onFocus: () => setTip(true),
            onBlur: () => setTip(false),
            onMouseEnter: () => setTip(true),
            onMouseLeave: () => setTip(false),
          }
        : {})}
    >
      <Button
        variant={active ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label="Map view"
        aria-pressed={active}
        disabled={!available}
        onClick={onClick}
      >
        <MapIcon className="size-4" />
      </Button>
      {!available && tip && (
        <span
          role="tooltip"
          className="absolute top-10 right-0 z-30 w-56 rounded-lg bg-foreground p-3 text-xs font-normal text-background"
        >
          Map view isn’t available right now. You can browse homes in Grid or
          List.
        </span>
      )}
    </span>
  );
}
