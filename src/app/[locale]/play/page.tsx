import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { getUpcomingGames } from "@/lib/games";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { SectionPage } from "@/components/SectionPage";
import { GameList } from "@/components/games/GameList";
import { GameListForVisitor } from "@/components/games/GameListForVisitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/play">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "play", href: "/play" });
}

export default async function Page({ params }: PageProps<"/[locale]/play">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const games = await getUpcomingGames(MAIN_CLUB_SLUG);

  return (
    <SectionPage locale={locale} pageKey="play">
      {/* Расписание из кеша показывается сразу, кнопки записи догружаются для конкретного игрока. */}
      <Suspense fallback={<GameList games={games} locale={locale} />}>
        <GameListForVisitor games={games} locale={locale} />
      </Suspense>
    </SectionPage>
  );
}
