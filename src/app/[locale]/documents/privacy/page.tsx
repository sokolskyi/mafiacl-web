import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/documents/LegalDoc";

export async function generateMetadata({ params }: PageProps<"/[locale]/documents/privacy">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "privacy", href: "/documents/privacy" });
}

export default async function Page({ params }: PageProps<"/[locale]/documents/privacy">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <LegalDoc locale={locale} doc="privacy" />;
}
