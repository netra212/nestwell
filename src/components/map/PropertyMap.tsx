"use client";
import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PropertyResult } from "@/lib/property-types";
import { formatPrice } from "@/lib/property-options";
import { propertyGeoJSON } from "@/lib/map-properties";
import { useReducedMotion } from "@/hooks/useReducedMotion";
export function PropertyMap({
  token,
  properties,
  selectedId,
  selectionKey = 0,
  onSelect,
}: {
  token: string;
  properties: PropertyResult[];
  selectedId: string | null;
  selectionKey?: number;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const sdk = useRef<typeof mapboxgl | null>(null);
  const data = useRef(properties);
  data.current = properties;
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    void import("mapbox-gl")
      .then((module) => {
        if (cancelled || !container.current) return;
        const lib = module.default;
        sdk.current = lib;
        if (!lib.supported()) {
          setError(
            "Your browser cannot display the map. Choose Grid or List to browse homes.",
          );
          return;
        }
        const instance = new lib.Map({
          container: container.current,
          accessToken: token,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-2, 53],
          zoom: 5,
        });
        map.current = instance;
        instance.addControl(new lib.NavigationControl(), "top-right");
        instance.on("error", () => {
          if (!cancelled)
            setError(
              "The map is unavailable. Check your connection or choose Grid or List.",
            );
        });
        instance.on("load", () => {
          if (cancelled) return;
          instance.addSource("properties", {
            type: "geojson",
            data: propertyGeoJSON(data.current),
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
          });
          instance.addLayer({
            id: "property-clusters",
            type: "circle",
            source: "properties",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#644192",
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                10,
                26,
                50,
                32,
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
          instance.addLayer({
            id: "property-cluster-count",
            type: "symbol",
            source: "properties",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 13,
            },
            paint: { "text-color": "#ffffff" },
          });
          instance.addLayer({
            id: "property-pins",
            type: "circle",
            source: "properties",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#047857",
                "#644192",
              ],
              "circle-radius": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                12,
                8,
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
          setReady(true);
        });
        instance.on("click", "property-pins", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") callback.current(id);
        });
        instance.on("click", "property-clusters", (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const clusterId = feature.properties?.cluster_id;
          if (typeof clusterId !== "number") return;
          (
            instance.getSource("properties") as mapboxgl.GeoJSONSource
          ).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (!err && !cancelled && zoom !== null && zoom !== undefined)
              instance.easeTo({
                center:
                  feature.geometry.type === "Point"
                    ? (feature.geometry.coordinates as [number, number])
                    : undefined,
                zoom,
                duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? 0
                  : 350,
              });
          });
        });
        for (const layer of ["property-pins", "property-clusters"]) {
          instance.on("mouseenter", layer, () => {
            instance.getCanvas().style.cursor = "pointer";
          });
          instance.on("mouseleave", layer, () => {
            instance.getCanvas().style.cursor = "";
          });
        }
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => instance.resize());
          observer.observe(container.current);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("The map couldn’t load. Choose Grid or List to continue.");
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      popup.current?.remove();
      popup.current = null;
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
  }, [token]);
  useEffect(() => {
    const instance = map.current;
    const lib = sdk.current;
    if (!ready || !instance || !lib) return;
    (instance.getSource("properties") as mapboxgl.GeoJSONSource).setData(
      propertyGeoJSON(properties),
    );
    if (properties.length) {
      const bounds = new lib.LngLatBounds();
      for (const p of properties) bounds.extend([p.longitude, p.latitude]);
      instance.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
        duration: reduced ? 0 : 350,
      });
    }
  }, [properties, ready, reduced]);
  useEffect(() => {
    const instance = map.current;
    const lib = sdk.current;
    if (!ready || !instance || !lib) return;
    popup.current?.remove();
    popup.current = null;
    for (const p of data.current)
      instance.setFeatureState(
        { source: "properties", id: p.id },
        { selected: p.id === selectedId },
      );
    const p = data.current.find((p) => p.id === selectedId);
    if (!p) return;
    const content = document.createElement("div");
    const price = document.createElement("p");
    price.textContent = formatPrice(p.price, p.currency);
    price.className = "font-bold";
    const link = document.createElement("a");
    link.href = `/property/${encodeURIComponent(p.id)}`;
    link.textContent = `View ${p.addressLine}`;
    link.className = "mt-2 block font-medium text-primary underline";
    content.append(price, link);
    popup.current = new lib.Popup({ offset: 16, focusAfterOpen: false })
      .setLngLat([p.longitude, p.latitude])
      .setDOMContent(content)
      .addTo(instance);
    instance.easeTo({
      center: [p.longitude, p.latitude],
      zoom: Math.max(instance.getZoom(), 15),
      duration: reduced ? 0 : 350,
    });
  }, [selectedId, selectionKey, ready, reduced]);
  return (
    <div className="relative h-full min-h-80 w-full bg-[#eee9f3]">
      <div
        ref={container}
        className="absolute inset-0"
        aria-label="Property map; use the property list to select a home"
        role="region"
      />
      {!ready && !error && (
        <p
          role="status"
          className="absolute top-5 left-5 rounded-lg bg-white p-3 text-sm"
        >
          Loading map…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="absolute inset-x-5 top-20 rounded-lg border bg-white p-4 text-sm text-foreground shadow-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
