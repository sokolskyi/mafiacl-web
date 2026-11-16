import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/documents/LegalDoc";

export async function generateMetadata({ params }: PageProps<"/[locale]/documents/terms">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "terms", href: "/documents/terms" });
}

export default async function Page({ params }: PageProps<"/[locale]/documents/terms">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <LegalDoc locale={locale} doc="terms" />;
}
