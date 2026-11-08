import type { Metadata } from "next";
import { parsePropertyQuery } from "./property-query";
import { fallbackParser } from "./search/fallbackParser";
import { mergeSearchFilters } from "./search/mergeFilters";
import { formatPrice, labelFor } from "./property-options";
import { propertyImageSource } from "./property-images";
import { siteDescription } from "./site";
export function resultsMetadata(
  input: Record<string, string | string[] | undefined>,
): Metadata {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
  }
  const parsed = parsePropertyQuery(params);
  let state: Record<string, string> = {};
  if (parsed.success) {
    if (parsed.data.q) {
      const merged = mergeSearchFilters(
        fallbackParser(parsed.data.q),
        parsed.data,
        params,
      );
      if (merged.success) state = merged.filterState;
    } else state = Object.fromEntries(params);
  }
  const city = state.city || state.postcode;
  const beds = state.bedsMin
    ? `${state.bedsMin}+ beds`
    : state.bedsMax
      ? `Up to ${state.bedsMax} beds`
      : "";
  const price =
    state.priceMin || state.priceMax
      ? `${formatPrice(Number(state.priceMin || 0) * 100)}–${state.priceMax ? formatPrice(Number(state.priceMax) * 100) : "any price"}`
      : "";
  const title = [
    `Properties ${state.listingType === "RENT" ? "to rent" : "for sale"}${city ? ` in ${city}` : " in the UK"}`,
    beds,
    price,
  ]
    .filter(Boolean)
    .join(" · ");
  const description =
    `${title}. Explore photos, listing details and the features that matter to you with Nestwell.`.slice(
      0,
      160,
    );
  params.delete("view");
  params.sort();
  return {
    title,
    description,
    alternates: { canonical: `/for-sale${params.size ? `?${params}` : ""}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: ["/images/properties/photo-1600596542815-ffad4c1539a9.jpg"],
    },
    ...(!parsed.success ? { robots: { index: false, follow: true } } : {}),
  };
}
export function propertyMetadata(property: {
  id: string;
  price: number;
  currency: string;
  bedrooms: number;
  propertyType: string;
  city: string;
  description: string;
  title: string;
  images: { url: string; alt: string | null }[];
}): Metadata {
  const title = `${formatPrice(property.price, property.currency)} · ${property.bedrooms}-bed ${labelFor(property.propertyType).toLowerCase()} in ${property.city}`;
  const description = property.description.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/property/${property.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(property.images[0]
        ? {
            images: [
              {
                url: propertyImageSource(property.images[0].url),
                alt: property.images[0].alt || property.title,
              },
            ],
          }
        : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
export function homeMetadata(): Metadata {
  return {
    title: { absolute: "Nestwell — Find home, in your own words" },
    description: siteDescription,
    alternates: { canonical: "/" },
    openGraph: {
      title: "Your next home. In your own words.",
      description: siteDescription,
      type: "website",
      images: ["/images/properties/photo-1600596542815-ffad4c1539a9.jpg"],
    },
  };
}
