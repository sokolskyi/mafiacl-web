import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
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

export default async function Page({ params, searchParams }: PageProps<"/[locale]/play">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const games = await getUpcomingGames(MAIN_CLUB_SLUG);

  return (
    <SectionPage locale={locale} pageKey="play">
      <Suspense fallback={null}>
        <SignupNotice searchParams={searchParams} locale={locale} />
      </Suspense>
      {/* Расписание из кеша показывается сразу, кнопки записи догружаются для конкретного игрока. */}
      <Suspense fallback={<GameList games={games} locale={locale} />}>
        <GameListForVisitor games={games} locale={locale} />
      </Suspense>
    </SectionPage>
  );
}

/** Сообщение после неудачной записи (?signup=error|banned) — читает адрес, поэтому внутри <Suspense>. */
async function SignupNotice({ searchParams, locale }: { searchParams: PageProps<"/[locale]/play">["searchParams"]; locale: Locale }) {
  const sp = await searchParams;
  if (sp.signup !== "error" && sp.signup !== "banned") return null;
  const t = await getTranslations({ locale, namespace: "games" });
  return (
    <p role="alert" className="mt-6 rounded border border-red-400/50 bg-red-600/15 p-3 text-sm text-red-200">
      {t(sp.signup === "banned" ? "signupBanned" : "signupError")}
    </p>
  );
}
