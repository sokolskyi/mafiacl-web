import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG, SITE_NAME, SITE_URL } from "@/lib/site";
import { gameTitle, getUpcomingGames, type UpcomingGame } from "@/lib/games";
import { getPlayerOfWeek } from "@/lib/rating";
import { formatMoney, type Tournament } from "@/lib/tournaments";
import { getLatestFinal, getMembershipFrom, getNextTournaments, getSeasonLeader } from "@/lib/home";
import { videoHref } from "@/lib/videos";
import { money } from "@/lib/shop/queries";
import { HeroVideo } from "@/components/home/HeroVideo";
import { Tile, TileLabel, TileTitle, pill } from "@/components/home/Tile";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  const meta = await pageMetadata({ locale, key: "home", href: "/" });
  return { ...meta, title: { absolute: meta.title as string } };
}

/** Schema.org: организация + клуб в Праге. */
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

function gameName(g: UpcomingGame, locale: Locale, fallback: string) {
  const tpl = g.title?.[locale] ?? g.title?.cs;
  return tpl ? gameTitle(tpl, g.number, g.numberStyle) : fallback;
}

function gameWhen(g: UpcomingGame, locale: Locale) {
  const d = new Date(g.startsAt);
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: g.timezone }).format(d);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: g.timezone }).format(d);
  return [day, time, g.venue?.name, g.priceCzk ? money(locale, g.priceCzk) : null].filter(Boolean).join(" · ");
}

function tournamentDates(t: Tournament, locale: Locale) {
  const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const a = new Date(`${t.startsOn}T12:00:00Z`);
  return t.endsOn && t.endsOn !== t.startsOn ? f.formatRange(a, new Date(`${t.endsOn}T12:00:00Z`)) : f.format(a);
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const g = await getTranslations({ locale, namespace: "games" });
  const nav = await getTranslations({ locale, namespace: "nav" });

  const [games, tournaments, leader, potw, final, membershipFrom] = await Promise.all([
    getUpcomingGames(MAIN_CLUB_SLUG, 4),
    getNextTournaments(MAIN_CLUB_SLUG, 2),
    getSeasonLeader(MAIN_CLUB_SLUG),
    getPlayerOfWeek(MAIN_CLUB_SLUG),
    getLatestFinal(MAIN_CLUB_SLUG),
    getMembershipFrom(MAIN_CLUB_SLUG),
  ]);
  const [next, then] = games;
  const [tour, tourAfter] = tournaments;
  const winner = potw?.winners[0];
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);

  const seatsText = (x: UpcomingGame) => {
    if (x.queueUntil) {
      const until = new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: x.timezone }).format(new Date(x.queueUntil));
      return t("queueOpen", { until });
    }
    const free = Math.max(x.capacity - x.confirmed, 0);
    return free > 0 ? t("seatsLeft", { free, capacity: x.capacity }) : t("waitlist");
  };

  const tourHref = (x: Tournament) => ({ pathname: "/tournaments/[slug]" as const, params: { slug: x.slug } });

  return (
    <main>
      <OrganizationJsonLd />

      {/* Первый экран: на телефоне видео во весь экран, на компьютере — окно справа. */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate flex min-h-[calc(100svh-150px)] flex-col justify-end overflow-hidden lg:mx-auto lg:grid lg:min-h-0 lg:max-w-[1360px] lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16 lg:px-6 lg:pb-14 lg:pt-12"
      >
        <HeroVideo
          label={t("videoLabel")}
          className="absolute inset-0 -z-20 h-full w-full object-cover lg:static lg:z-auto lg:order-2 lg:h-[600px] lg:w-auto lg:max-w-none lg:rounded-[28px] lg:[aspect-ratio:9/16]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/70 via-neutral-950/10 to-neutral-950 lg:hidden"
        />
        <div className="flex flex-col gap-5 px-5 pb-8 lg:order-1 lg:px-0 lg:pb-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300 lg:text-sm">{t("kicker")}</p>
          <h1 id="hero-title" className="font-hero text-[46px] font-extrabold normal-case leading-[1.02] tracking-[-0.03em] sm:text-[64px] lg:text-[96px]">
            {t("heroTitle")} <span className="text-red-500">{t("heroAccent")}</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-neutral-200 lg:text-xl">{t("heroLead")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/play" className={`${pill} min-h-14 bg-red-600 text-lg text-white hover:bg-red-500`}>
              {t("cta")}
            </Link>
            <Link href="/learn" className={`${pill} min-h-14 border-2 border-white text-lg hover:bg-white/10`}>
              {t("newbie")}
            </Link>
          </div>
        </div>
      </section>

      {/* Сетка: на телефоне в одну колонку в этом порядке, на компьютере — 12 колонок. */}
      <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-3.5 px-4 pb-16 pt-5 lg:auto-rows-[300px] lg:grid-cols-12 lg:gap-5 lg:px-6">
        {/* Ближайшая игра */}
        <Tile
          photo="/home/table.webp"
          photoAlt=""
          className="col-span-2 min-h-[340px] lg:col-start-1 lg:col-end-8 lg:row-start-1 lg:row-end-3"
        >
          <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2 lg:inset-x-9 lg:bottom-8 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="flex flex-col gap-2">
              <TileLabel>{t("nextGame")}</TileLabel>
              {next ? (
                <>
                  <TileTitle size="lg">{gameName(next, locale, g(`kind.${next.kind}`))}</TileTitle>
                  <p className="text-[15px] text-neutral-200 lg:text-lg">{gameWhen(next, locale)}</p>
                </>
              ) : (
                <TileTitle size="md">{t("noGames")}</TileTitle>
              )}
            </div>
            <Link href="/play" className={`${pill} mt-2 bg-white text-black hover:bg-neutral-200 lg:mt-0 lg:whitespace-nowrap`}>
              {next ? seatsText(next) : nav("schedule")}
            </Link>
          </div>
        </Tile>

        {/* Затем */}
        {then && (
          <Tile className="col-span-2 lg:col-start-8 lg:col-end-13 lg:row-start-1">
            <Link href="/play" className="flex h-full flex-col gap-2 p-5 lg:p-8">
              <TileLabel>{t("then")}</TileLabel>
              <TileTitle size="md">{gameName(then, locale, g(`kind.${then.kind}`))}</TileTitle>
              <p className="text-[15px] text-neutral-300 lg:text-base">{gameWhen(then, locale)}</p>
              <p className="mt-auto hidden text-sm text-neutral-300 lg:block">{seatsText(then)}</p>
            </Link>
          </Tile>
        )}

        {/* Ближайший турнир */}
        <Tile
          photo="/home/tournament.webp"
          photoPosition="center 28%"
          shade="left"
          className="col-span-2 min-h-[360px] lg:min-h-0 lg:col-start-1 lg:col-end-8 lg:row-start-3"
        >
          <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2 lg:inset-y-8 lg:left-9 lg:right-auto lg:w-[560px] lg:bottom-8">
            <TileLabel>{t("nextTournament")}</TileLabel>
            {tour ? (
              <>
                <TileTitle size="md">{tour.name.replace(/"/g, "")}</TileTitle>
                <p className="text-[15px] text-neutral-200 lg:text-lg">
                  {[tournamentDates(tour, locale), tour.city, tour.priceCzk ? formatMoney(locale, tour.priceCzk, tour.currency) : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex flex-col gap-1 lg:mt-auto lg:flex-row lg:items-center lg:gap-6">
                  {tour.registration === "external" && tour.registrationUrl ? (
                    <a href={tour.registrationUrl} target="_blank" rel="noopener" className={`${pill} bg-white text-black hover:bg-neutral-200`}>
                      {t("register")}
                    </a>
                  ) : (
                    <Link href={tourHref(tour)} className={`${pill} bg-white text-black hover:bg-neutral-200`}>
                      {tour.registration === "internal" ? t("register") : t("details")}
                    </Link>
                  )}
                  {tourAfter ? (
                    <Link href={tourHref(tourAfter)} className="inline-flex min-h-11 items-center justify-center text-sm underline underline-offset-4 hover:text-white lg:text-base">
                      {t("afterThat", { name: tourAfter.name.replace(/"/g, ""), dates: tournamentDates(tourAfter, locale) })}
                    </Link>
                  ) : (
                    <Link href="/tournaments" className="inline-flex min-h-11 items-center justify-center text-sm underline underline-offset-4 lg:text-base">
                      {t("allTournaments")}
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <Link href="/tournaments" className={`${pill} mt-2 self-start bg-white text-black`}>{t("allTournaments")}</Link>
            )}
          </div>
        </Tile>

        {/* Новичкам */}
        <Tile tone="cream" className="col-span-2 lg:col-start-8 lg:col-end-13 lg:row-start-3">
          <div className="flex h-full flex-col lg:flex-row-reverse">
            <div className="relative h-[190px] lg:h-full lg:w-[44%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/newcomers.webp" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5 lg:p-8">
              <TileLabel tone="cream">{t("newcomersLabel")}</TileLabel>
              <TileTitle size="sm">{t("newcomersTitle")}</TileTitle>
              <p className="text-[15px] leading-snug text-neutral-800">{t("newcomersText")}</p>
              <Link href="/learn" className={`${pill} mt-2 self-stretch bg-black text-white hover:bg-neutral-800 lg:mt-auto lg:self-start`}>
                {t("newcomersCta")}
              </Link>
            </div>
          </div>
        </Tile>

        {/* Лидер сезона */}
        <Tile tone="red" className="col-span-1 min-h-[200px] lg:col-start-8 lg:col-end-11 lg:row-start-2">
          <Link href="/ratings" className="flex h-full flex-col gap-1.5 p-5 lg:p-8">
            <TileLabel tone="red">{t("leader")}</TileLabel>
            {leader ? (
              <>
                <TileTitle size="sm">{leader.nickname}</TileTitle>
                <p className="text-sm lg:text-base">{t("leaderPoints", { points: num(leader.rating), games: leader.games })}</p>
              </>
            ) : (
              <p className="text-sm lg:text-base">{t("leaderEmpty")}</p>
            )}
            <span className="mt-auto text-sm underline underline-offset-4 lg:text-base">{t("fullRating")}</span>
          </Link>
        </Tile>

        {/* Respect */}
        <Tile tone="cream" className="col-span-1 min-h-[200px] lg:col-start-11 lg:col-end-13 lg:row-start-2">
          <Link href="/respect" className="flex h-full flex-col gap-1.5 p-5 lg:p-7">
            <TileLabel tone="cream">Respect</TileLabel>
            <p className="font-hero text-[40px] font-extrabold leading-none lg:text-[54px]">+1</p>
            <p className="text-sm leading-snug">{t("respectText")}</p>
          </Link>
        </Tile>

        {/* Финал на YouTube */}
        <Tile photo="/home/final.webp" shade="flat" className="col-span-2 min-h-[220px] lg:min-h-0 lg:col-start-1 lg:col-end-7 lg:row-start-4">
          <a
            href={final ? videoHref(final.video) : "https://www.youtube.com/user/mafiaclK"}
            target="_blank"
            rel="noopener"
            className="absolute inset-x-5 bottom-5 flex items-center gap-4 lg:inset-x-8 lg:bottom-7"
          >
            <span aria-hidden="true" className="flex h-13 w-13 flex-none items-center justify-center rounded-full bg-red-600 lg:h-15 lg:w-15">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 4l14 8-14 8z" fill="currentColor" /></svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em]">{t("watch")}</span>
              <TileTitle size="sm">{final ? t("finalOf", { title: final.title }) : "YouTube"}</TileTitle>
            </span>
          </a>
        </Tile>

        {/* Игрок недели */}
        <Tile photo="/home/player-of-week.webp" photoPosition="center 25%" className="col-span-2 min-h-[240px] lg:min-h-0 lg:col-start-7 lg:col-end-13 lg:row-start-4">
          <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5 lg:inset-x-8 lg:bottom-7">
            <TileLabel>⚜️ {t("playerOfWeek")}</TileLabel>
            {winner ? (
              winner.nickname ? (
                <Link href={{ pathname: "/players/[nick]", params: { nick: winner.nickname } }} className="hover:underline">
                  <TileTitle size="md">{winner.nickname}</TileTitle>
                </Link>
              ) : (
                <TileTitle size="md">{winner.name}</TileTitle>
              )
            ) : (
              <TileTitle size="sm">{t("potwEmpty")}</TileTitle>
            )}
            {winner && <p className="text-sm text-neutral-200">{t("winnerStats", { points: num(winner.points), wins: winner.wins, games: winner.games })}</p>}
          </div>
        </Tile>

        {/* Корпоративы */}
        <Tile photo="/home/corporate.webp" photoPosition="center 30%" className="col-span-2 min-h-[240px] lg:min-h-0 lg:col-start-1 lg:col-end-6 lg:row-start-5">
          <Link href="/corporate" className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5 lg:inset-x-8 lg:bottom-7">
            <TileLabel>{nav("corporate")}</TileLabel>
            <TileTitle size="sm">{t("corporateTitle")}</TileTitle>
          </Link>
        </Tile>

        {/* Зал славы */}
        <Tile photo="/home/hall-of-fame.webp" className="col-span-2 min-h-[200px] lg:min-h-0 lg:col-start-6 lg:col-end-10 lg:row-start-5">
          <Link href="/hall-of-fame" className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5 lg:inset-x-8 lg:bottom-7">
            <TileLabel>{nav("hall")}</TileLabel>
            <TileTitle size="sm">{t("hallTitle")}</TileTitle>
          </Link>
        </Tile>

        {/* Абонемент */}
        <Tile className="col-span-2 lg:col-start-10 lg:col-end-13 lg:row-start-5">
          <div className="flex h-full items-center justify-between gap-4 p-5 lg:flex-col lg:items-start lg:justify-start lg:p-7">
            <div className="flex flex-col gap-1.5">
              <TileLabel>{t("membership")}</TileLabel>
              {membershipFrom !== null && <TileTitle size="sm">{t("membershipFrom", { price: money(locale, membershipFrom) })}</TileTitle>}
              <p className="text-sm text-neutral-300">{t("membershipText")}</p>
            </div>
            <Link href="/shop" className={`${pill} flex-none bg-white text-black hover:bg-neutral-200 lg:mt-auto`}>
              {t("toShop")}
            </Link>
          </div>
        </Tile>
      </div>
    </main>
  );
}
