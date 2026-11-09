import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/ratings">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "ratings", href: "/ratings" });
}

export default async function Page({ params }: PageProps<"/[locale]/ratings">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <SectionPage locale={locale} pageKey="ratings" />;
}
