import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/contacts">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "contacts", href: "/contacts" });
}

export default async function Page({ params }: PageProps<"/[locale]/contacts">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <SectionPage locale={locale} pageKey="contacts" />;
}
