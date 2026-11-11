import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getTournaments } from "@/lib/tournaments";
import { Link } from "@/i18n/navigation";
import { SectionPage } from "@/components/SectionPage";
import { TournamentCards } from "@/components/tournaments/TournamentCards";

export async function generateMetadata({ params }: PageProps<"/[locale]/kings">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "kings", href: "/kings" });
}

export default async function Page({ params }: PageProps<"/[locale]/kings">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const kings = (await getTournaments(MAIN_CLUB_SLUG)).filter((x) => x.series === "kings").reverse();
  return (
    <SectionPage locale={locale} pageKey="kings">
      <p className="mt-6 max-w-2xl text-neutral-300">{t("kingsLead")}</p>
      {kings.length > 0 ? <TournamentCards items={kings} locale={locale} /> : <p className="mt-6 text-neutral-400">{t("kingsSoon")}</p>}
      <p className="mt-10 flex flex-wrap gap-4">
        <Link href="/hall-of-fame" className="underline">{t("hallOfFame")}</Link>
        <Link href="/tournaments" className="underline">{t("all")}</Link>
      </p>
    </SectionPage>
  );
}
