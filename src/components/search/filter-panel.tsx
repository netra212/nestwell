"use client";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FEATURES,
  PROPERTY_TYPES,
  labelFor,
  MILES_TO_KM,
} from "@/lib/property-options";
import type { LocationMatch } from "@/lib/property-types";
import type { SearchState } from "@/hooks/use-search-params-state";

export type FilterProps = {
  state: SearchState;
  update: (
    patch: SearchState,
    immediate?: boolean,
    resetPage?: boolean,
  ) => void;
  reset: () => void;
  apply: () => void;
};
export function FilterPanel({ state, update, reset, apply }: FilterProps) {
  const id = useId();
  const [location, setLocation] = useState(state.postcode || state.city || "");
  const [focused, setFocused] = useState(false);
  const [term, setTerm] = useState(location);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    setLocation(state.postcode || state.city || "");
  }, [state.postcode, state.city]);
  useEffect(() => {
    const timeout = setTimeout(() => setTerm(location), 300);
    return () => clearTimeout(timeout);
  }, [location]);
  const matches = useQuery<{ results: LocationMatch[] }>({
    queryKey: ["locations", term],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/locations/autocomplete?q=${encodeURIComponent(term)}`,
        { signal },
      );
      if (!response.ok) throw new Error("Location suggestions unavailable");
      return response.json();
    },
    enabled: focused && !!term.trim(),
    retry: false,
  });
  const suggestions = matches.data?.results || [];
  const choose = (match: LocationMatch) => {
    setLocation(match.postcode || match.city);
    setFocused(false);
    setActive(-1);
    update({
      city: match.city,
      postcode: match.postcode || "",
      lat: String(match.latitude),
      lng: String(match.longitude),
      radiusKm: state.radiusKm || String(5 * MILES_TO_KM),
    });
  };
  const toggle = (
    key: "features" | "propertyTypes",
    value: string,
    checked: boolean,
  ) => {
    const list = new Set(state[key]?.split(",").filter(Boolean) || []);
    if (checked) list.add(value);
    else list.delete(value);
    update({ [key]: [...list].join(",") });
  };
  const radius = Number(state.radiusKm || 5 * MILES_TO_KM) / MILES_TO_KM;
  const maximum = Math.max(
    2500000,
    Number(state.priceMax) || 0,
    Number(state.priceMin) || 0,
  );
  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Refine your search</h2>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>
      <fieldset>
        <legend className="mb-3 font-semibold">Listing type</legend>
        <div className="grid grid-cols-2 rounded-lg bg-[#f0ebf5] p-1">
          {(["SALE", "RENT"] as const).map((value) => (
            <button
              key={value}
              onClick={() => update({ listingType: value })}
              aria-pressed={(state.listingType || "SALE") === value}
              className={`rounded-md py-2 text-sm font-semibold transition ${(state.listingType || "SALE") === value ? "bg-white text-primary shadow-xs" : "text-muted-foreground"}`}
            >
              {value === "SALE" ? "Sale" : "Rent"}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="border-t pt-5">
        <label htmlFor={`${id}-location`} className="font-semibold">
          Location
        </label>
        <div className="relative mt-3">
          <MapPin className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            id={`${id}-location`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={focused && suggestions.length > 0}
            aria-controls={`${id}-suggestions`}
            aria-activedescendant={
              active >= 0 && suggestions[active]
                ? `${id}-option-${active}`
                : undefined
            }
            value={location}
            placeholder="City or postcode"
            autoComplete="off"
            className="h-10 pl-9"
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 150);
            }}
            onChange={(e) => {
              const value = e.target.value;
              setLocation(value);
              setFocused(true);
              setActive(-1);
              const isPostcode = /\d/.test(value);
              update({
                city: isPostcode ? "" : value.trim(),
                postcode: isPostcode ? value.trim() : "",
                lat: "",
                lng: "",
                radiusKm: "",
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, suggestions.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === "Enter" && focused && suggestions.length) {
                e.preventDefault();
                choose(suggestions[active < 0 ? 0 : active]);
              }
              if (e.key === "Escape") setFocused(false);
            }}
          />
          {focused && !!term && (
            <ul
              id={`${id}-suggestions`}
              role="listbox"
              aria-label="Location suggestions"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-white p-1 shadow-lg"
            >
              {suggestions.map((match, index) => (
                <li
                  key={match.label}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={active === index}
                  className={`cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-accent ${active === index ? "bg-accent" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(match)}
                >
                  {match.label}
                </li>
              ))}
              {!suggestions.length && (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  {matches.isFetching || term !== location
                    ? "Finding locations…"
                    : matches.isError
                      ? "Suggestions unavailable. You can still enter a city or postcode."
                      : "No matching locations"}
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="mt-5 flex justify-between text-xs">
          <span>Search radius</span>
          <span className="font-semibold">
            {Number.isFinite(radius) ? radius.toFixed(0) : 5} mi
          </span>
        </div>
        <Slider
          aria-label="Search radius in miles"
          className="mt-4"
          min={0}
          max={40}
          step={1}
          value={[Number.isFinite(radius) ? Math.min(40, radius) : 5]}
          disabled={!state.lat || !state.lng}
          onValueChange={(value) =>
            update({
              radiusKm: String(
                (Array.isArray(value) ? value[0] : value) * MILES_TO_KM,
              ),
            })
          }
        />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Choose a suggestion to search within a radius.
        </p>
      </div>
      <fieldset className="border-t pt-5">
        <legend className="sr-only">Price range in pounds</legend>
        <p className="font-semibold">Price range</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["priceMin", "priceMax"] as const).map((key, i) => (
            <div key={key}>
              <label
                htmlFor={`${id}-${key}`}
                className="mb-1.5 block text-[11px] text-muted-foreground"
              >
                {i === 0 ? "Min price (£)" : "Max price (£)"}
              </label>
              <Input
                type="number"
                min={0}
                max={21474836.47}
                step="0.01"
                id={`${id}-${key}`}
                className="h-10 text-xs"
                placeholder={i === 0 ? "No min" : "No max"}
                value={state[key] || ""}
                onChange={(e) => update({ [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Slider
          aria-label="Price range in pounds"
          className="mt-5"
          min={0}
          max={maximum}
          step={10000}
          value={[
            Math.min(
              Number(state.priceMin) || 0,
              Number(state.priceMax) || maximum,
            ),
            Math.max(
              Number(state.priceMin) || 0,
              Number(state.priceMax) || maximum,
            ),
          ]}
          onValueChange={(value) => {
            if (Array.isArray(value))
              update({
                priceMin: String(value[0]),
                priceMax: String(value[1]),
              });
          }}
        />
        <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
          <span>£0</span>
          <span>£{(maximum / 1000000).toFixed(1)}m+</span>
        </div>
      </fieldset>
      <fieldset className="border-t pt-5">
        <legend className="sr-only">Rooms</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["bedsMin", "Bedrooms"],
              ["bathsMin", "Bathrooms"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label
                id={`${id}-${key}-label`}
                className="mb-3 block font-semibold"
              >
                {label}
              </label>
              <Select
                value={state[key] || "any"}
                onValueChange={(value) =>
                  update({
                    [key]:
                      value === "any" || value === null ? "" : String(value),
                  })
                }
              >
                <SelectTrigger
                  aria-labelledby={`${id}-${key}-label`}
                  className="h-10 w-full"
                >
                  <SelectValue>
                    {state[key] ? `${state[key]}+` : "Any"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        {state.bedsMax && (
          <div className="mt-3">
            <label htmlFor={`${id}-bedsMax`} className="text-xs">
              Maximum bedrooms
            </label>
            <Input
              id={`${id}-bedsMax`}
              type="number"
              min={0}
              value={state.bedsMax}
              onChange={(e) => update({ bedsMax: e.target.value })}
            />
          </div>
        )}
      </fieldset>
      <fieldset className="border-t pt-5">
        <legend className="sr-only">Property type</legend>
        <p className="mb-3 font-semibold">Property type</p>
        <div className="grid gap-3">
          {PROPERTY_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-3 text-xs text-[#61576d]"
            >
              <Checkbox
                checked={
                  state.propertyTypes?.split(",").includes(type) || false
                }
                onCheckedChange={(checked) =>
                  toggle("propertyTypes", type, checked)
                }
              />
              {labelFor(type)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="border-t pt-5">
        <legend className="sr-only">Features</legend>
        <p className="mb-3 font-semibold">The little extras</p>
        <div className="grid gap-3">
          {FEATURES.map((feature) => (
            <label
              key={feature}
              className="flex cursor-pointer items-center gap-3 text-xs text-[#61576d]"
            >
              <Checkbox
                checked={state.features?.split(",").includes(feature) || false}
                onCheckedChange={(checked) =>
                  toggle("features", feature, checked)
                }
              />
              {labelFor(feature)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2 border-t pt-5">
        <Button variant="outline" onClick={reset} className="h-10 flex-1">
          Reset
        </Button>
        <Button onClick={apply} className="h-10 flex-1">
          Apply filters
        </Button>
      </div>
    </div>
  );
}
