import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";

// Кабинет закрыт от поисковиков; вход через Google/Facebook (Supabase Auth) — следующий этап.
export async function generateMetadata({ params }: PageProps<"/[locale]/account">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "account", href: "/account", noindex: true });
}

export default async function Page({ params }: PageProps<"/[locale]/account">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <SectionPage locale={locale} pageKey="account" />;
}
