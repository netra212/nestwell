import type { Prisma } from "@prisma/client";
// JSON-safe client data: Prisma dates are serialized by the API.
type Listing = Prisma.PropertyGetPayload<{
  include: { agent: { select: { name: true; logoUrl: true } }; images: true };
}>;
export type PropertyResult = Omit<Listing, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
export type PropertyResults = {
  results: PropertyResult[];
  total: number;
  page: number;
  pageSize: number;
};
export type LocationMatch = {
  label: string;
  city: string;
  postcode?: string;
  latitude: number;
  longitude: number;
};
