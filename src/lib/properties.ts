import { Prisma } from "@prisma/client";
import { db } from "./db";
import type { PropertyQuery } from "./property-query";
import { rankResults } from "./search/rankResults";
import type { ParsedSearch } from "./search/schema";

export async function searchProperties(
  q: PropertyQuery,
  preferences?: ParsedSearch,
  keyword?: string,
  noMatches = false,
) {
  const where: Prisma.PropertyWhereInput = {
    listingType: q.listingType,
    city: q.city ? { equals: q.city, mode: "insensitive" } : undefined,
    postcode: q.postcode
      ? { startsWith: q.postcode, mode: "insensitive" }
      : undefined,
    price: {
      gte: q.priceMin === undefined ? undefined : Math.round(q.priceMin * 100),
      lte: q.priceMax === undefined ? undefined : Math.round(q.priceMax * 100),
    },
    bedrooms: { gte: q.bedsMin, lte: q.bedsMax },
    bathrooms: { gte: q.bathsMin, lte: q.bathsMax },
    propertyType: q.propertyTypes ? { in: q.propertyTypes } : undefined,
    features: q.features ? { hasEvery: q.features } : undefined,
  };
  if (noMatches) where.id = { in: [] };
  if (keyword)
    where.OR = [
      { title: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  if (q.radiusKm !== undefined && q.lat !== undefined && q.lng !== undefined) {
    // Parameterized great-circle distance, clamped against floating-point drift.
    // Geographic filtering happens before counting and paginating.
    const nearby = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Property" WHERE
      6371.0088 * 2 * asin(sqrt(least(1.0, greatest(0.0,
        power(sin(radians("latitude" - ${q.lat}) / 2), 2) +
        cos(radians(${q.lat})) * cos(radians("latitude")) *
        power(sin(radians("longitude" - ${q.lng}) / 2), 2)
      )))) <= ${q.radiusKm}`;
    where.id = { in: nearby.map((p) => p.id) };
  }
  if (noMatches) where.id = { in: [] };
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    q.sort === "price_asc"
      ? [{ price: "asc" }, { id: "asc" }]
      : q.sort === "price_desc"
        ? [{ price: "desc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];
  if (preferences && q.sort === "relevance") {
    const candidates = await db.property.findMany({
      where,
      include: {
        agent: { select: { name: true, logoUrl: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
    });
    const ranked = rankResults(candidates, preferences);
    return {
      results: ranked.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      total: ranked.length,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  const [results, total] = await db.$transaction(
    [
      db.property.findMany({
        where,
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          agent: { select: { name: true, logoUrl: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
        },
      }),
      db.property.count({ where }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const ranked = preferences
    ? rankResults(results, preferences)
    : results.map((p) => ({
        ...p,
        relevanceScore: 0,
        matchReasons: [] as string[],
      }));
  const scores = new Map(ranked.map((p) => [p.id, p]));
  return {
    results: results.map((p) => scores.get(p.id)!),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}
export function getProperty(id: string) {
  return db.property.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } }, agent: true },
  });
}
