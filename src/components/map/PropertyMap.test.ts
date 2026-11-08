// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PropertyResult } from "@/lib/property-types";
const mock = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>();
  const source = {
    setData: vi.fn(),
    getClusterExpansionZoom: vi.fn(
      (_: number, callback: (error: null, zoom: number) => void) =>
        callback(null, 11),
    ),
  };
  const map = {
    on: vi.fn(),
    addControl: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(() => source),
    fitBounds: vi.fn(),
    easeTo: vi.fn(),
    getZoom: () => 5,
    setFeatureState: vi.fn(),
    getCanvas: () => ({ style: { cursor: "" } }),
    resize: vi.fn(),
    remove: vi.fn(),
  };
  map.on.mockImplementation((event, layer, handler) => {
    handlers.set(
      typeof layer === "string" ? `${event}:${layer}` : event,
      typeof layer === "function" ? layer : handler,
    );
    return map;
  });
  const popup = {
    remove: vi.fn(),
    setLngLat: vi.fn(),
    setDOMContent: vi.fn(),
    addTo: vi.fn(),
  };
  for (const method of [popup.setLngLat, popup.setDOMContent, popup.addTo])
    method.mockReturnValue(popup);
  return {
    handlers,
    source,
    map,
    popup,
    supported: vi.fn(() => true),
    create: vi.fn(function () {
      return map;
    }),
  };
});
vi.mock("mapbox-gl", () => ({
  default: {
    Map: mock.create,
    supported: mock.supported,
    NavigationControl: class {},
    LngLatBounds: class {
      extend() {
        return this;
      }
    },
    Popup: class {
      constructor() {
        return mock.popup;
      }
    },
  },
}));
import { PropertyMap } from "./PropertyMap";
const property = (id: string): PropertyResult => ({
  id,
  title: "A flat",
  description: "A bright home",
  price: 30000000,
  currency: "GBP",
  priceQualifier: null,
  listingType: "SALE",
  propertyType: "FLAT",
  bedrooms: 2,
  bathrooms: 1,
  receptions: 1,
  addressLine: "12 Grove Road",
  city: "London",
  postcode: "N1 8AB",
  country: "UK",
  latitude: 51.54,
  longitude: -0.1,
  features: [],
  floorPlanUrl: null,
  agentId: "agent",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  agent: { name: "Agent", logoUrl: null },
  images: [],
});
beforeEach(() => {
  mock.handlers.clear();
  mock.supported.mockReturnValue(true);
  Object.defineProperty(window, "matchMedia", {
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    configurable: true,
  });
});
afterEach(cleanup);
it("clusters pins, synchronizes pin/list selection, creates safe detail links and cleans up", async () => {
  const onSelect = vi.fn();
  const properties = [
    property("a"),
    { ...property("b"), addressLine: "<img src=x onerror=alert(1)>" },
  ];
  const view = render(
    createElement(PropertyMap, {
      token: "pk.test",
      properties,
      selectedId: null,
      onSelect,
    }),
  );
  await waitFor(() => expect(mock.create).toHaveBeenCalledOnce());
  await act(async () => mock.handlers.get("load")?.({}));
  expect(mock.map.addSource).toHaveBeenCalledWith(
    "properties",
    expect.objectContaining({
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    }),
  );
  expect(mock.map.addLayer).toHaveBeenCalledWith(
    expect.objectContaining({ id: "property-pins" }),
  );
  act(() =>
    mock.handlers.get("click:property-pins")?.({
      features: [{ properties: { id: "b" } }],
    }),
  );
  expect(onSelect).toHaveBeenCalledWith("b");
  view.rerender(
    createElement(PropertyMap, {
      token: "pk.test",
      properties,
      selectedId: "b",
      onSelect,
    }),
  );
  await waitFor(() =>
    expect(mock.map.setFeatureState).toHaveBeenCalledWith(
      { source: "properties", id: "b" },
      { selected: true },
    ),
  );
  expect(mock.map.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: 15, center: [-0.1, 51.54] }),
  );
  const content = mock.popup.setDOMContent.mock.calls.at(
    -1,
  )?.[0] as HTMLDivElement;
  expect(content.querySelector("img")).toBeNull();
  expect(content.querySelector("a")?.getAttribute("href")).toBe("/property/b");
  act(() =>
    mock.handlers.get("click:property-clusters")?.({
      features: [
        {
          geometry: { type: "Point", coordinates: [-0.2, 51.5] },
          properties: { cluster_id: 7 },
        },
      ],
    }),
  );
  expect(mock.source.getClusterExpansionZoom).toHaveBeenCalledWith(
    7,
    expect.any(Function),
  );
  expect(mock.map.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: 11 }),
  );
  view.unmount();
  expect(mock.map.remove).toHaveBeenCalledOnce();
});
it("shows a usable error when WebGL is unsupported", async () => {
  mock.supported.mockReturnValue(false);
  render(
    createElement(PropertyMap, {
      token: "pk.test",
      properties: [],
      selectedId: null,
      onSelect: () => {},
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "cannot display the map",
    ),
  );
  expect(mock.create).not.toHaveBeenCalled();
});
