import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getTournaments } from "@/lib/tournaments";
import { SectionPage } from "@/components/SectionPage";
import { TournamentCards } from "@/components/tournaments/TournamentCards";
import { BrandGrid } from "@/components/tournaments/BrandViews";
import { getHallArchive } from "@/lib/hallArchive";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/tournaments">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "tournaments", href: "/tournaments" });
}

export default async function Page({ params }: PageProps<"/[locale]/tournaments">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const [all, hall] = await Promise.all([getTournaments(MAIN_CLUB_SLUG), getHallArchive(MAIN_CLUB_SLUG)]);
  const upcoming = all.filter((x) => x.status === "announced" || x.status === "running");

  return (
    <SectionPage locale={locale} pageKey="tournaments">
      <section className="mt-10" aria-labelledby="upcoming">
        <h2 id="upcoming" className="font-display text-4xl font-extrabold uppercase">{t("upcoming")}</h2>
        {upcoming.length ? <TournamentCards items={upcoming} locale={locale} /> : <p className="mt-4 text-neutral-400">{t("noUpcoming")}</p>}
      </section>
      <BrandGrid tournaments={all} hall={hall} locale={locale} />
      <p className="mt-10">
        <Link href="/tournaments/archive" className="inline-flex min-h-11 items-center rounded border border-white/40 px-5 text-sm font-bold hover:bg-white/10">
          {t("archive.title")}: {t("archive.open")} →
        </Link>
      </p>
    </SectionPage>
  );
}
