"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, X, ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property/property-card";
import { fetchMapProperties } from "@/lib/map-properties";
import { useReducedMotion } from "@/hooks/useReducedMotion";
const PropertyMap = dynamic(
  () => import("./PropertyMap").then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-5">
        Loading map…
      </p>
    ),
  },
);
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
export function MapResults({
  token,
  query,
  onClose,
}: {
  token: string;
  query: string;
  onClose: () => void;
}) {
  const results = useQuery({
    queryKey: ["map-properties", query],
    queryFn: ({ signal }) => fetchMapProperties(query, signal),
  });
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [selected, setSelected] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    setSelected(null);
  }, [query]);
  useEffect(() => {
    if (!selected) return;
    document
      .getElementById(`map-card-${selected.id}`)
      ?.scrollIntoView({
        block: "nearest",
        behavior: reduced ? "instant" : "smooth",
      });
  }, [selected, reduced, listOpen]);
  if (results.isPending)
    return (
      <p role="status" className="rounded-xl border bg-white p-8">
        Loading all matching homes for the map…
      </p>
    );
  if (results.isError)
    return (
      <div role="alert" className="rounded-xl border bg-white p-8">
        <p>{results.error.message}</p>
        <Button className="mt-4" onClick={() => results.refetch()}>
          Try again
        </Button>
        <Button variant="outline" className="mt-4 ml-3" onClick={onClose}>
          Return to Grid
        </Button>
      </div>
    );
  const select = (id: string) => {
    setSelected((previous) => ({ id, version: (previous?.version || 0) + 1 }));
    setListOpen(true);
  };
  const content = (
    <div
      className="fixed inset-0 z-40 bg-white lg:relative lg:z-auto lg:h-[75vh] lg:min-h-[560px] lg:overflow-hidden lg:rounded-2xl lg:border"
      aria-label="Map results"
    >
      <div className="absolute inset-0 lg:left-[320px]">
        <PropertyMap
          token={token}
          properties={results.data}
          selectedId={selected?.id || null}
          selectionKey={selected?.version || 0}
          onSelect={select}
        />
      </div>
      <Button
        onClick={onClose}
        variant="secondary"
        className="absolute top-4 left-4 z-10 bg-white shadow-sm lg:hidden"
      >
        <X className="size-4" />
        Close map
      </Button>
      <section
        className={`absolute inset-x-0 bottom-0 z-10 overflow-hidden rounded-t-2xl border bg-white shadow-lg lg:inset-y-0 lg:right-auto lg:w-[320px] lg:rounded-none lg:border-0 lg:border-r lg:shadow-none ${listOpen ? "h-[42vh]" : "h-14"} lg:h-full`}
        aria-label="Map property list"
      >
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          aria-expanded={listOpen}
          aria-controls="map-card-list"
          className="flex h-14 w-full items-center justify-between border-b px-4 text-sm font-semibold lg:hidden"
        >
          {results.data.length} homes
          {listOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
        </button>
        <p className="hidden border-b p-4 text-sm font-semibold lg:block">
          {results.data.length} homes on the map
        </p>
        <div
          id="map-card-list"
          className={`h-[calc(100%-56px)] space-y-4 overflow-y-auto p-3 ${listOpen ? "" : "hidden lg:block"}`}
        >
          {results.data.map((property) => (
            <div id={`map-card-${property.id}`} key={property.id}>
              <PropertyCard
                property={property}
                view="compact"
                selected={selected?.id === property.id}
                onSelectMap={() => select(property.id)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
  return desktop ? (
    content
  ) : (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        style={{
          position: "fixed",
          inset: 0,
          translate: "none",
          transform: "none",
          width: "100vw",
          height: "100dvh",
          maxWidth: "none",
          padding: 0,
          borderRadius: 0,
        }}
      >
        <DialogTitle className="sr-only">Property map and results</DialogTitle>
        <DialogDescription className="sr-only">
          Select a home on the map or in the list. Escape closes the map.
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
