import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { NOINDEX, SITE_NAME, SITE_URL } from "@/lib/site";

type Href = Parameters<typeof getPathname>[0]["href"];

const OG_LOCALE: Record<Locale, string> = {
  cs: "cs_CZ",
  ru: "ru_RU",
  uk: "uk_UA",
  en: "en_US",
};

/** Абсолютный адрес страницы на нужном языке. */
export function absoluteUrl(href: Href, locale: Locale) {
  return SITE_URL + getPathname({ href, locale });
}

/** canonical + hreflang для всех языков + x-default (чешский). */
export function alternatesFor(href: Href, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(href, l);
  languages["x-default"] = absoluteUrl(href, routing.defaultLocale);
  return { canonical: absoluteUrl(href, locale), languages };
}

/** Метаданные страницы раздела из messages: pages.<key>.title/description. */
export async function pageMetadata({
  locale,
  key,
  href,
  values,
  noindex = false,
}: {
  locale: Locale;
  key: string;
  href: Href;
  values?: Record<string, string>;
  noindex?: boolean;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages" });
  const title = t(`${key}.title`, values);
  const description = t(`${key}.description`, values);
  const url = absoluteUrl(href, locale);
  return {
    title,
    description,
    alternates: alternatesFor(href, locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex || NOINDEX ? { index: false, follow: false } : undefined,
  };
}
