import type { MetadataRoute } from "next";
import { siteURL } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/saved", "/sign-in", "/health", "/500"],
    },
    sitemap: new URL("/sitemap.xml", siteURL()).href,
  };
}
