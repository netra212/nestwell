import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteURL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteURL();
  const properties = await db.property.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return [
    { url: new URL("/", base).href, changeFrequency: "weekly", priority: 1 },
    {
      url: new URL("/for-sale", base).href,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...properties.map((p) => ({
      url: new URL(`/property/${p.id}`, base).href,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
