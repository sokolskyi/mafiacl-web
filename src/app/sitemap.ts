import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";
import { CITIES, SECTIONS } from "@/lib/site";

type Href = Parameters<typeof absoluteUrl>[0];

/** Все публичные страницы × 4 языка, с hreflang-альтернативами. Кабинет не включаем. */
export default function sitemap(): MetadataRoute.Sitemap {
  const hrefs: { href: Href; priority: number }[] = [
    { href: "/", priority: 1 },
    ...Object.values(SECTIONS).map((href) => ({ href, priority: 0.7 })),
    ...Object.keys(CITIES).map((city) => ({
      href: { pathname: "/clubs/[city]" as const, params: { city } },
      priority: 0.8,
    })),
  ];

  return hrefs.flatMap(({ href, priority }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(href, locale),
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(href, l)])),
      },
    })),
  );
}
