import type { MetadataRoute } from "next";
import { NOINDEX, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/ucet", "/*/kabinet", "/*/account"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
