import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { CITIES, type CitySlug } from "@/lib/site";
import { SectionPage } from "@/components/SectionPage";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    Object.keys(CITIES).map((city) => ({ locale, city })),
  );
}

function getCity(slug: string) {
  return slug in CITIES ? CITIES[slug as CitySlug] : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/clubs/[city]">) {
  const { locale, city } = (await params) as { locale: Locale; city: string };
  const c = getCity(city);
  if (!c) return {};
  return pageMetadata({
    locale,
    key: "club",
    href: { pathname: "/clubs/[city]", params: { city } },
    values: { club: c.club, city: c[locale] },
  });
}

export default async function Page({ params }: PageProps<"/[locale]/clubs/[city]">) {
  const { locale, city } = (await params) as { locale: Locale; city: string };
  const c = getCity(city);
  if (!c) notFound();
  setRequestLocale(locale);
  return <SectionPage locale={locale} pageKey="club" values={{ club: c.club, city: c[locale] }} />;
}
