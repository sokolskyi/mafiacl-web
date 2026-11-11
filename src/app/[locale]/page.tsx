import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG, SITE_NAME, SITE_URL } from "@/lib/site";
import { getUpcomingGames } from "@/lib/games";
import { GameList } from "@/components/games/GameList";
import { GameListForVisitor } from "@/components/games/GameListForVisitor";
import { PlayerOfWeek } from "@/components/home/PlayerOfWeek";

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
    logo: `${SITE_URL}/brand/mafiacl-mark-light.png`,
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
  const t = await getTranslations({ locale, namespace: "home" });
  const games = (await getUpcomingGames(MAIN_CLUB_SLUG)).slice(0, 2);

  return (
    <main>
      <OrganizationJsonLd />
      <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{t("kicker")}</p>
        <h1 id="hero-title" className="mt-5 max-w-4xl text-[clamp(3.5rem,10vw,8.5rem)]">
          {t("tagline")}
        </h1>
        <p className="mt-7 max-w-xl text-lg text-neutral-300">{t("lead")}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-red-600 px-8 text-base font-bold text-white hover:bg-red-500"
          >
            {t("cta")}
          </Link>
          <Link
            href="/ratings"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/55 px-8 text-base font-semibold hover:bg-white/10"
          >
            {t("ratingLink")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="next-games" className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="next-games" className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            {t("nextGames")}
          </h2>
          <Link href="/play" className="inline-flex min-h-11 items-center font-semibold hover:underline">
            {t("allGames")} →
          </Link>
        </div>
        <Suspense fallback={<GameList games={games} locale={locale} />}>
          <GameListForVisitor games={games} locale={locale} />
        </Suspense>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <PlayerOfWeek locale={locale} />
        <p className="mt-8">
          <Link href="/hall-of-fame" className="inline-flex min-h-11 items-center font-semibold hover:underline">
            ⭐ {t("hallLink")} →
          </Link>
        </p>
      </div>
    </main>
  );
}
