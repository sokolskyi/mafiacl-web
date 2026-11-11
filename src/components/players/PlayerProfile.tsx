import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { PlayerPage, PlayerRole } from "@/lib/players";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { currentSeason, getEveningWinners, getPlayerOfWeek, getSeasons } from "@/lib/rating";
import { badgeOf, belongsTo, getBadges, getPrizes, getTitles } from "@/lib/badges";

const ROLES: PlayerRole[] = ["civilian", "sheriff", "mafia", "don"];
const ROLE_ICON: Record<PlayerRole, string> = { civilian: "●", sheriff: "★", mafia: "▲", don: "♛" };
const ROLE_CLASS: Record<PlayerRole, string> = {
  civilian: "text-red-400",
  sheriff: "text-yellow-300",
  mafia: "text-neutral-100",
  don: "text-neutral-100",
};

export async function PlayerProfile({ locale, player }: { locale: Locale; player: PlayerPage }) {
  const t = await getTranslations({ locale, namespace: "player" });
  const tm = await getTranslations({ locale, namespace: "match" });
  const s = player.stats;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Prague" }).format(new Date(iso));
  // Победы в мини-турнирах текущего сезона и «Игрок недели».
  const seasons = await getSeasons(MAIN_CLUB_SLUG);
  const season = currentSeason(seasons, new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date()));
  const eveningRating = season?.ratings.find((r) => r.prizePerEvening !== null);
  const eveningWins = eveningRating ? (await getEveningWinners(eveningRating.id)).filter((w) => w.profileId === player.id).length : 0;
  const potw = await getPlayerOfWeek(MAIN_CLUB_SLUG);
  const isPotw = !!potw?.winners.some((w) => w.profileId === player.id);
  const badges = await getBadges(MAIN_CLUB_SLUG);
  const badge = badgeOf(badges, player.id, player.nickname);
  const titles = (await getTitles(MAIN_CLUB_SLUG)).filter((x) => belongsTo(x, player.id, player.nickname));
  const prizes = (await getPrizes(MAIN_CLUB_SLUG)).filter((x) => belongsTo(x, player.id, player.nickname));
  const prizeTotal = prizes.reduce((a, x) => a + x.amount, 0);
  const czk = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);
  const since = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" }).format(new Date(player.since));

  return (
    <article>
      <header className="flex flex-wrap items-center gap-5">
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt="" width={96} height={96} referrerPolicy="no-referrer" className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-800 text-4xl font-black text-neutral-500">
            {player.nickname.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            {player.nickname}
            {badge && <span className="ml-2 text-3xl" aria-label={t("badges")}>{badge}</span>}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {player.city && <span>📍 {player.city} · </span>}
            {t("since", { date: since })}
          </p>
          {titles.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {titles.map((x) => (
                <li key={x.id} className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-200">
                  {x.kind === "season_champion" ? "⭐" : "👑"} {t(`title.${x.kind}`)} · {x.label}
                </li>
              ))}
            </ul>
          )}
          {(isPotw || eveningWins > 0) && (
            <p className="mt-2 flex flex-wrap gap-2">
              {isPotw && <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">⚜️ {t("playerOfWeek")}</span>}
              {eveningWins > 0 && eveningRating && season && (
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-neutral-200">
                  {t("eveningWins", { n: eveningWins, rating: eveningRating.name, season: season.name })}
                </span>
              )}
            </p>
          )}
          {player.staff.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-2">
              {player.staff.map((r) => (
                <span key={`${r.club}-${r.role}`} className="rounded bg-red-600/20 px-2 py-0.5 text-xs text-red-300">
                  {t(`staff.${r.role}`)} · {r.club}
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      <section aria-labelledby="stats" className="mt-10">
        <h2 id="stats" className="sr-only">{t("stats")}</h2>
        <dl className={`grid grid-cols-2 gap-3 ${prizeTotal ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          {[
            [t("games"), String(s.games)],
            [t("winRate"), pct(s.wins, s.games)],
            [t("points"), num(s.points)],
            [t("avgPoints"), s.games ? num(s.points / s.games) : "—"],
            ...(prizeTotal ? [[t("prizeMoney"), czk(prizeTotal)]] : []),
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-neutral-950 p-4">
              <dt className="text-sm text-neutral-400">{k}</dt>
              <dd className={`mt-1 font-black ${v.length > 6 ? "text-2xl" : "text-3xl"}`}>{v}</dd>
            </div>
          ))}
        </dl>
        {s.games === 0 && <p className="mt-6 text-neutral-400">{t("noGames")}</p>}
      </section>

      {prizes.length > 0 && (
        <section aria-labelledby="prizes" className="mt-10">
          <h2 id="prizes" className="text-xl font-bold">{t("prizeMoney")}</h2>
          <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10 text-sm">
            {prizes.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-24 text-neutral-400">{x.wonOn ? date(x.wonOn) : ""}</span>
                <span className="flex-1">{x.label}</span>
                <span className="font-mono font-bold">{czk(x.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.games > 0 && (
        <>
          <section aria-labelledby="roles" className="mt-10">
            <h2 id="roles" className="text-xl font-bold">{t("byRole")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="py-2 font-normal">{t("role")}</th>
                    <th className="font-normal">{t("games")}</th>
                    <th className="font-normal">{t("wins")}</th>
                    <th className="font-normal">{t("winRate")}</th>
                    <th className="font-normal">{t("points")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {ROLES.map((r) => {
                    const x = s.byRole[r];
                    return (
                      <tr key={r}>
                        <td className="py-2 font-semibold"><span className={ROLE_CLASS[r]} aria-hidden="true">{ROLE_ICON[r]}</span> {tm(`role.${r}`)}</td>
                        <td>{x.games}</td>
                        <td>{x.wins}</td>
                        <td>{pct(x.wins, x.games)}</td>
                        <td>{num(x.points)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-neutral-300">
              {t("bestMoveLine", { killed: s.firstKilled, hits: s.bestMoveHits, points: num(s.bestMovePoints) })}
              {" · "}
              {t("foulsLine", { avg: num(s.fouls / s.games) })}
            </p>
            {(s.redVotes.total > 0 || s.blackVotes.total > 0) && (
              <p className="mt-1 text-sm text-neutral-300">
                {s.redVotes.total > 0 && t("redVotesLine", { pct: pct(s.redVotes.black, s.redVotes.total), n: s.redVotes.total })}
                {s.redVotes.total > 0 && s.blackVotes.total > 0 && " · "}
                {s.blackVotes.total > 0 && t("blackVotesLine", { pct: pct(s.blackVotes.red, s.blackVotes.total), n: s.blackVotes.total })}
              </p>
            )}
          </section>

          <section aria-labelledby="recent" className="mt-10">
            <h2 id="recent" className="text-xl font-bold">{t("recent")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="py-2 font-normal">{t("date")}</th>
                    <th className="font-normal">{t("game")}</th>
                    <th className="font-normal">{t("seat")}</th>
                    <th className="font-normal">{t("role")}</th>
                    <th className="font-normal">{t("outcome")}</th>
                    <th className="text-right font-normal">{t("points")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {player.recent.map((g) => (
                    <tr key={g.matchId}>
                      <td className="py-2 text-neutral-400">{date(g.playedAt)}</td>
                      <td>{tm("header", { number: g.number, table: g.table })}</td>
                      <td>{g.seat}</td>
                      <td><span className={ROLE_CLASS[g.role]} aria-hidden="true">{ROLE_ICON[g.role]}</span> {tm(`role.${g.role}`)}</td>
                      <td className={g.win ? "text-green-400" : "text-neutral-400"}>
                        {g.win ? t("won") : t("lost")}
                        {!g.rated && <span className="ml-2 text-xs text-neutral-500">{t("unrated")}</span>}
                      </td>
                      <td className="text-right font-mono font-bold">{num(g.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </article>
  );
}
