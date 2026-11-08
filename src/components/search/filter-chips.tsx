"use client";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FEATURES, labelFor, MILES_TO_KM } from "@/lib/property-options";
import type { SearchState } from "@/hooks/use-search-params-state";
const numbers = [
  "priceMin",
  "priceMax",
  "bedsMin",
  "bedsMax",
  "bathsMin",
  "bathsMax",
  "radiusKm",
];
type Chip = {
  id: string;
  label: string;
  keys: string[];
  feature?: string;
  preference?: string;
};
export function FilterChips({
  state,
  update,
}: {
  state: SearchState;
  update: (patch: SearchState) => void;
}) {
  const [editing, setEditing] = useState<Chip | null>(null);
  const [values, setValues] = useState<SearchState>({});
  const [invalid, setInvalid] = useState("");
  const chips: Chip[] = [];
  const money = (s: string) => Number(s).toLocaleString("en-GB");
  if (state.priceMin || state.priceMax)
    chips.push({
      id: "price",
      label: `£${money(state.priceMin || "0")}–${state.priceMax ? `£${money(state.priceMax)}` : "any"}`,
      keys: ["priceMin", "priceMax"],
    });
  if (state.bedsMin || state.bedsMax)
    chips.push({
      id: "beds",
      label: `${state.bedsMin || "0"}${state.bedsMax ? `–${state.bedsMax}` : "+"} beds`,
      keys: ["bedsMin", "bedsMax"],
    });
  if (state.bathsMin || state.bathsMax)
    chips.push({
      id: "baths",
      label: `${state.bathsMin || "0"}${state.bathsMax ? `–${state.bathsMax}` : "+"} baths`,
      keys: ["bathsMin", "bathsMax"],
    });
  if (state.city || state.postcode)
    chips.push({
      id: "location",
      label: state.postcode || state.city,
      keys: ["city", "postcode", "lat", "lng", "radiusKm"],
    });
  if (state.radiusKm)
    chips.push({
      id: "radius",
      label: `Within ${(Number(state.radiusKm) / MILES_TO_KM).toFixed(0)} mi`,
      keys: ["radiusKm"],
    });
  if (state.propertyTypes)
    chips.push({
      id: "type",
      label: state.propertyTypes.split(",").map(labelFor).join(" / "),
      keys: ["propertyTypes"],
    });
  if (state.listingType === "RENT")
    chips.push({ id: "listingType", label: "To rent", keys: ["listingType"] });
  for (const feature of state.features?.split(",").filter(Boolean) || [])
    chips.push({
      id: feature,
      label: labelFor(feature),
      keys: ["features"],
      feature,
    });
  for (const preference of state.softPreferences?.split(",").filter(Boolean) ||
    [])
    chips.push({
      id: `soft-${preference}`,
      label: labelFor(preference),
      keys: ["softPreferences"],
      preference,
    });
  function remove(chip: Chip) {
    update(
      chip.preference
        ? {
            softPreferences: state.softPreferences
              .split(",")
              .filter((p) => p !== chip.preference)
              .join(","),
          }
        : chip.feature
          ? {
              features: state.features
                .split(",")
                .filter((f) => f !== chip.feature)
                .join(","),
            }
          : Object.fromEntries(chip.keys.map((k) => [k, ""])),
    );
  }
  function start(chip: Chip) {
    setEditing(chip);
    setValues(
      chip.preference
        ? { softPreference: chip.preference }
        : chip.feature
          ? { feature: chip.feature }
          : chip.id === "location"
            ? { location: state.postcode || state.city }
            : Object.fromEntries(chip.keys.map((k) => [k, state[k] || ""])),
    );
    setInvalid("");
  }
  if (!chips.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center rounded-full border border-[#dfd3ec] bg-white text-xs text-[#654789]"
        >
          <button
            type="button"
            title={`Edit ${chip.label}`}
            aria-label={`Edit ${chip.label}`}
            onClick={() => start(chip)}
            className="flex min-w-0 items-center gap-1.5 py-2 pr-1 pl-3"
          >
            <span className="truncate">{chip.label}</span>
            <Pencil className="size-2.5 shrink-0 opacity-45" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => remove(chip)}
            className="mr-1 rounded-full p-1.5 hover:bg-primary/10"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Edit filter</DialogTitle>
          <DialogDescription>
            Update this filter or leave a value empty to remove it.
          </DialogDescription>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  Object.entries(values).some(
                    ([k, v]) =>
                      numbers.includes(k) &&
                      v !== "" &&
                      (!Number.isFinite(Number(v)) || Number(v) < 0),
                  )
                ) {
                  setInvalid("Enter a valid non-negative value.");
                  return;
                }
                let patch: SearchState = { ...values };
                if (editing.preference) {
                  patch = {
                    softPreferences: [
                      ...new Set(
                        state.softPreferences
                          .split(",")
                          .map((p) =>
                            p === editing.preference
                              ? values.softPreference
                              : p,
                          ),
                      ),
                    ]
                      .filter(Boolean)
                      .join(","),
                  };
                }
                if (editing.feature) {
                  patch = {
                    features: [
                      ...new Set(
                        state.features
                          .split(",")
                          .map((f) =>
                            f === editing.feature ? values.feature : f,
                          ),
                      ),
                    ]
                      .filter(Boolean)
                      .join(","),
                  };
                }
                if (editing.id === "location") {
                  const text = values.location.trim();
                  patch = {
                    city: /\d/.test(text) ? "" : text,
                    postcode: /\d/.test(text) ? text : "",
                    lat: "",
                    lng: "",
                    radiusKm: "",
                  };
                }
                update(patch);
                setEditing(null);
              }}
            >
              {editing.feature ? (
                <label className="block text-sm">
                  Feature
                  <select
                    aria-label="Feature"
                    value={values.feature}
                    onChange={(e) => setValues({ feature: e.target.value })}
                    className="mt-2 block h-10 w-full rounded border bg-white px-2"
                  >
                    {FEATURES.map((f) => (
                      <option key={f} value={f}>
                        {labelFor(f)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : editing.id === "listingType" ? (
                <label className="block text-sm">
                  Listing type
                  <select
                    aria-label="Listing type"
                    value={values.listingType}
                    onChange={(e) => setValues({ listingType: e.target.value })}
                    className="mt-2 block h-10 w-full rounded border bg-white px-2"
                  >
                    <option value="SALE">Sale</option>
                    <option value="RENT">Rent</option>
                  </select>
                </label>
              ) : (
                Object.entries(values)
                  .filter(([key]) => !["lat", "lng"].includes(key))
                  .map(([key, value]) => (
                    <label key={key} className="block text-sm">
                      {(
                        {
                          priceMin: "Minimum price (£)",
                          priceMax: "Maximum price (£)",
                          bedsMin: "Minimum bedrooms",
                          bedsMax: "Maximum bedrooms",
                          bathsMin: "Minimum bathrooms",
                          bathsMax: "Maximum bathrooms",
                          radiusKm: "Radius (km)",
                          softPreference: "Soft preference",
                          location: "City or postcode",
                          propertyTypes:
                            "Property types (comma-separated enum values)",
                        } as Record<string, string>
                      )[key] || key}
                      <Input
                        value={value}
                        type={numbers.includes(key) ? "number" : "text"}
                        min={0}
                        step={key.startsWith("price") ? "0.01" : "1"}
                        className="mt-2 h-10"
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))
              )}
              {invalid && (
                <p role="alert" className="text-xs text-destructive">
                  {invalid}
                </p>
              )}
              <Button type="submit" className="w-full">
                Update filter
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
