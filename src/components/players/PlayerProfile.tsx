import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { headlineStats, type PlayerPage, type PlayerRole } from "@/lib/players";
import { Link } from "@/i18n/navigation";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { currentSeason, getEveningWinners, getPlayerOfWeek, getSeasons } from "@/lib/rating";
import { badgeOf, belongsTo, getBadges, getPrizes, getTitles } from "@/lib/badges";
import { PlayerShare } from "./PlayerShare";
import { formatMemberNo } from "@/lib/memberNo";
import { getHallArchive } from "@/lib/hallArchive";
import { getPremierTotals } from "@/lib/ratingArchive";
import { awardsOf } from "@/lib/awards";
import { compareWithClub } from "@/lib/clubCompare";
import { getAliases } from "@/lib/aliases";
import { PROFILE_SERVICES } from "@/lib/profileLinks";
import { cityLabel } from "@/lib/cities";

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
  const ta = await getTranslations({ locale, namespace: "ratingArchive" });
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
  const awards = awardsOf(await getHallArchive(MAIN_CLUB_SLUG), [player.nickname, ...player.aliases]);
  const compare = compareWithClub(await getPremierTotals(MAIN_CLUB_SLUG, await getAliases()), player.nickname);
  const top10 = player.archive.filter((a) => a.league === "premier" && !a.isCurrent && a.rank <= 10).length;
  const share = (x: number) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(x * 100)} %`;
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
          {player.aliases.length > 0 && <p className="mt-1 text-sm text-neutral-400">{t("aliases", { names: player.aliases.join(", ") })}</p>}
          <p className="mt-1 text-sm text-neutral-400">
            {player.memberNo && <span>ID {formatMemberNo(player.memberNo)} · </span>}
            {player.city && <span>📍 {cityLabel(player.city, locale)} · </span>}
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
          {(awards.medals.some((n) => n > 0) || top10 > 0) && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {awards.medals.map((n, i) =>
                n > 0 ? (
                  <span key={i} className="rounded bg-white/10 px-2 py-0.5 font-semibold" title={t("medalTitle", { place: i + 1 })}>
                    <span aria-hidden="true">{["🥇", "🥈", "🥉"][i]}</span> <span className="sr-only">{t("medalTitle", { place: i + 1 })}: </span>{n}
                  </span>
                ) : null,
              )}
              {top10 > 0 && <span className="rounded bg-white/10 px-2 py-0.5 text-neutral-200">{t("top10", { n: top10 })}</span>}
            </p>
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
        <div className="flex flex-wrap gap-2 sm:ml-auto sm:self-start">
          <PlayerShare locale={locale} nickname={player.nickname} games={s.games} />
          {PROFILE_SERVICES.filter((svc) => player.links[svc.key]).map((svc) => (
            <a
              key={svc.key}
              href={player.links[svc.key]}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-4 text-sm font-semibold hover:bg-white/10"
            >
              {svc.label} ↗
            </a>
          ))}
        </div>
      </header>

      <section aria-labelledby="stats" className="mt-10">
        <h2 id="stats" className="sr-only">{t("stats")}</h2>
        <dl className={`grid grid-cols-2 gap-3 ${prizeTotal ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          {[
            ...headlineStats(player, (key) => t(key), locale),
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

      {s.decided > 0 && (
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
                    {s.siteGames > 0 && <th className="font-normal">{t("points")}</th>}
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
                        {s.siteGames > 0 && <td>{num(x.points)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-neutral-300">
              {s.siteGames > 0
                ? t("bestMoveLine", { killed: s.firstKilled, hits: s.bestMoveHits, points: num(s.bestMovePoints) })
                : t("bestMoveLineShort", { killed: s.firstKilled, hits: s.bestMoveHits })}
              {s.siteGames > 0 && <>{" · "}{t("foulsLine", { avg: num(s.fouls / s.siteGames) })}</>}
              {s.extraGames > 0 && <>{" · "}{t("avgExtraLine", { avg: num(s.extra / s.extraGames) })}</>}
              {s.bestPlayer > 0 && <>{" · "}{t("bestPlayerLine", { n: s.bestPlayer })}</>}
            </p>
            {(s.redVotes.total > 0 || s.blackVotes.total > 0) && (
              <p className="mt-1 text-sm text-neutral-300">
                {s.redVotes.total > 0 && t("redVotesLine", { pct: pct(s.redVotes.black, s.redVotes.total), n: s.redVotes.total })}
                {s.redVotes.total > 0 && s.blackVotes.total > 0 && " · "}
                {s.blackVotes.total > 0 && t("blackVotesLine", { pct: pct(s.blackVotes.red, s.blackVotes.total), n: s.blackVotes.total })}
              </p>
            )}
          </section>
      )}

      {compare.length > 0 && (
        <section aria-labelledby="compare" className="mt-10">
          <h2 id="compare" className="text-xl font-bold">{t("compareTitle")}</h2>
          <p className="mt-1 text-sm text-neutral-400">{t("compareLead")}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="py-2 font-normal">{t("compareMetric")}</th>
                  <th className="font-normal">{t("compareYou")}</th>
                  <th className="font-normal">{t("compareMedian")}</th>
                  <th className="font-normal">{t("compareRank")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {compare.map((c) => {
                  const fmt = (v: number) => (c.key === "avgExtra" ? num(Math.round(v * 100) / 100) : share(v));
                  return (
                    <tr key={c.key}>
                      <td className="py-2 font-semibold">{t(`compare.${c.key}`)}</td>
                      <td className="font-mono font-bold">{fmt(c.value)}</td>
                      <td className="font-mono text-neutral-400">{fmt(c.median)}</td>
                      <td>
                        {c.top === null ? (
                          <span className="text-neutral-500">—</span>
                        ) : c.top <= 50 ? (
                          <span className={c.top <= 10 ? "font-bold text-yellow-300" : "text-green-400"}>{t("topPct", { n: c.top })}</span>
                        ) : (
                          <span className="text-neutral-400">{t("belowMedian")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {awards.list.length > 0 && (
        <section aria-labelledby="awards" className="mt-10">
          <h2 id="awards" className="text-xl font-bold">{t("awardsTitle")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["season", "tournament", "mini"] as const).map((k) => (
              <div key={k} className="rounded-lg border border-white/10 bg-neutral-950 p-4">
                <dt className="text-sm text-neutral-400">{t(`awards.${k}`)}</dt>
                <dd className="mt-1 flex gap-3 text-lg font-bold">
                  {awards.counts[k].map((n, i) => (
                    <span key={i} className={n ? "" : "opacity-30"}>
                      <span aria-hidden="true">{["🥇", "🥈", "🥉"][i]}</span>
                      <span className="sr-only">{t("medalTitle", { place: i + 1 })}: </span> {n}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          {awards.list.some((a) => a.category === "achievement") && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {awards.list.filter((a) => a.category === "achievement").map((a) => (
                <li key={a.id} className="rounded bg-yellow-500/15 px-2 py-0.5 text-sm text-yellow-200">🏅 {a.title} · {a.year}</li>
              ))}
            </ul>
          )}
          <details className="mt-4 rounded border border-white/10">
            <summary className="cursor-pointer px-4 py-3 font-semibold">{t("awardsAll", { n: awards.list.filter((a) => a.place).length })}</summary>
            <ul className="divide-y divide-white/10 border-t border-white/10 text-sm">
              {awards.list.filter((a) => a.place).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2">
                  <span aria-hidden="true">{["🥇", "🥈", "🥉"][(a.place ?? 1) - 1]}</span>
                  <span className="sr-only">{t("medalTitle", { place: a.place ?? 1 })}:</span>
                  <span className="w-12 text-neutral-400">{a.year}</span>
                  <span className="flex-1">
                    {a.category === "mini" ? (a.season ? t("miniTitleSeason", { n: a.title, season: a.season }) : t("miniTitle", { n: a.title })) : a.title}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {player.archive.length > 0 && (
        <section aria-labelledby="archive" className="mt-10">
          <h2 id="archive" className="text-xl font-bold">{t("archiveTitle")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="py-2 font-normal">{t("archiveSeason")}</th>
                  <th className="font-normal">{t("archivePlace")}</th>
                  <th className="font-normal">{t("games")}</th>
                  <th className="font-normal">{t("winRate")}</th>
                  <th className="font-normal"><abbr title={t("archiveFKFull")} className="no-underline">{t("archiveFK")}</abbr></th>
                  <th className="font-normal">{t("archiveExtra")}</th>
                  <th className="text-right font-normal">{t("archiveRating")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {player.archive.map((a) => (
                  <tr key={a.slug}>
                    <td className="py-2">
                      <span className="text-neutral-400">{ta(`leagues.${a.league as "premier" | "mova" | "first"}.name`)} · </span>
                      <Link href={{ pathname: "/ratings/prague/[slug]", params: { slug: a.slug } }} className="font-semibold hover:underline">{a.title}</Link>
                      <span className="ml-2 text-neutral-500">{a.year}</span>
                      {a.isCurrent && <span className="ml-2 rounded bg-red-500/25 px-1.5 text-xs font-semibold uppercase text-red-200">{t("archiveCurrent")}</span>}
                    </td>
                    <td>
                      {/* Если был финал сезона, место — по итогам финала; место по очкам — мелко рядом. */}
                      {a.finalPlace ? (
                        <>
                          <span title={t("archiveFinal")}>{["🥇", "🥈", "🥉"][a.finalPlace - 1] ?? ""} {a.finalPlace}</span>
                          {a.finalPlace !== a.rank && <span className="ml-1 text-xs text-neutral-500">{t("archiveByPoints", { n: a.rank })}</span>}
                        </>
                      ) : (
                        a.rank
                      )}
                    </td>
                    <td>{a.games}</td>
                    <td>{a.wins === null ? "—" : pct(a.wins, a.games)}</td>
                    <td>{a.firstKilled === null ? "—" : share(a.firstKilled)}</td>
                    <td>{a.avgExtra === null ? "—" : num(Math.round(a.avgExtra * 100) / 100)}</td>
                    <td className="text-right font-mono font-bold">{num(a.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {s.siteGames > 0 && (
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
      )}
    </article>
  );
}
