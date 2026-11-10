import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SectionPage } from "@/components/SectionPage";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  const meta = await pageMetadata({ locale, key: "home", href: "/" });
  return { ...meta, title: { absolute: meta.title as string } };
}

/** Schema.org: организация + клуб в Праге. Адрес/телефон добавим, когда будут данные. */
function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: SITE_NAME,
    alternateName: "MafiaCL Prague",
    url: SITE_URL,
    sport: "Mafia",
    foundingDate: "2011",
    areaServed: "Prague",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return (
    <>
      <OrganizationJsonLd />
      <SectionPage locale={locale} pageKey="home" />
    </>
  );
}
