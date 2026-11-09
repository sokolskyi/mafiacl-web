import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/franchise">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "franchise", href: "/franchise" });
}

export default async function Page({ params }: PageProps<"/[locale]/franchise">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <SectionPage locale={locale} pageKey="franchise" />;
}
