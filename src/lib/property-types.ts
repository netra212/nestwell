import type { ParsedSearch } from "./search/schema";
import type { Prisma } from "@prisma/client";
// JSON-safe client data: Prisma dates are serialized by the API.
type Listing = Prisma.PropertyGetPayload<{
  include: { agent: { select: { name: true; logoUrl: true } }; images: true };
}>;
export type PropertyResult = Omit<Listing, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  relevanceScore?: number;
  matchReasons?: string[];
};
export type PropertyResults = {
  results: PropertyResult[];
  total: number;
  page: number;
  pageSize: number;
  parsed?: ParsedSearch;
  originalParsed?: ParsedSearch;
  filterState?: Record<string, string>;
  searchQuery?: string;
  modelUsed?: string;
  cached?: boolean;
};
export type LocationMatch = {
  label: string;
  city: string;
  postcode?: string;
  latitude: number;
  longitude: number;
};
