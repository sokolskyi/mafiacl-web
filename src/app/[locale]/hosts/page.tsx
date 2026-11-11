import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getHosts } from "@/lib/hosts";
import { SectionPage } from "@/components/SectionPage";
import { HostCards } from "@/components/HostCards";

export async function generateMetadata({ params }: PageProps<"/[locale]/hosts">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "hosts", href: "/hosts" });
}

export default async function Page({ params }: PageProps<"/[locale]/hosts">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const hosts = await getHosts(MAIN_CLUB_SLUG);
  return (
    <SectionPage locale={locale} pageKey="hosts">
      <div className="mt-4">
        <HostCards hosts={hosts} locale={locale} />
      </div>
    </SectionPage>
  );
}
