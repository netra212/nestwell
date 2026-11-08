import { db } from "./db";
import type { Property } from "@prisma/client";
export function similarProperties(
  property: Pick<
    Property,
    "id" | "city" | "propertyType" | "price" | "bedrooms" | "listingType"
  >,
) {
  return db.property.findMany({
    where: {
      id: { not: property.id },
      city: property.city,
      propertyType: property.propertyType,
      listingType: property.listingType,
      price: {
        gte: Math.ceil(property.price * 0.7),
        lte: Math.floor(property.price * 1.3),
      },
      bedrooms: {
        gte: Math.max(0, property.bedrooms - 1),
        lte: property.bedrooms + 1,
      },
    },
    take: 6,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: {
      agent: { select: { name: true, logoUrl: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });
}
