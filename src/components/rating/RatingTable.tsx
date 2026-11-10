import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { FIRST_SEASON, MIN_GAMES, getRating, getSeries, seriesName } from "@/lib/rating";

export type RatingSort = "points" | "avg" | "winrate";

export async function RatingTable({
  locale,
  season,
  series,
  sort,
}: {
  locale: Locale;
  season: number;
  series: number | null;
  sort: RatingSort;
}) {
  const t = await getTranslations({ locale, namespace: "rating" });
  const allSeries = await getSeries(MAIN_CLUB_SLUG);
  const seriesId = series && allSeries.some((s) => s.id === series) ? series : null;
  const rows = await getRating(MAIN_CLUB_SLUG, season, seriesId);
  const nowYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Prague" }).format(new Date()));
  const seasons = Array.from({ length: Math.max(nowYear - FIRST_SEASON + 1, 1) }, (_, i) => nowYear - i);

  const avg = (r: (typeof rows)[number]) => (r.games ? r.points / r.games : 0);
  const rate = (r: (typeof rows)[number]) => (r.games ? r.wins / r.games : 0);
  const key = sort === "avg" ? avg : sort === "winrate" ? rate : (r: (typeof rows)[number]) => r.points;
  const qualified = sort === "points" ? rows : rows.filter((r) => r.games >= MIN_GAMES);
  const rest = sort === "points" ? [] : rows.filter((r) => r.games < MIN_GAMES);
  const sorted = [
    ...qualified.sort((a, b) => key(b) - key(a) || b.points - a.points || b.games - a.games),
    ...rest.sort((a, b) => b.points - a.points),
  ];
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const q = (patch: Record<string, string | number | null>) => {
    const query: Record<string, string> = {};
    const next = { season, series: seriesId, sort, ...patch };
    if (next.season !== nowYear) query.season = String(next.season);
    if (next.series) query.series = String(next.series);
    if (next.sort !== "points") query.sort = String(next.sort);
    return { pathname: "/ratings" as const, query };
  };
  const chip = (active: boolean) =>
    `rounded px-3 py-1.5 text-sm font-semibold ${active ? "bg-red-600 text-white" : "bg-white/10 text-neutral-200 hover:bg-white/20"}`;

  return (
    <div className="mt-10 space-y-6">
      <nav aria-label={t("filters")} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-sm text-neutral-400">{t("season")}</span>
          {seasons.map((y) => (
            <Link key={y} href={q({ season: y })} className={chip(y === season)} aria-current={y === season ? "page" : undefined}>{y}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-sm text-neutral-400">{t("series")}</span>
          <Link href={q({ series: null })} className={chip(!seriesId)}>{t("allSeries")}</Link>
          {allSeries.map((s) => (
            <Link key={s.id} href={q({ series: s.id })} className={chip(seriesId === s.id)}>{seriesName(s, locale)}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-sm text-neutral-400">{t("sortBy")}</span>
          {(["points", "avg", "winrate"] as RatingSort[]).map((s) => (
            <Link key={s} href={q({ sort: s })} className={chip(sort === s)}>{t(`sort.${s}`)}</Link>
          ))}
        </div>
        {sort !== "points" && <p className="text-xs text-neutral-500">{t("minGames", { n: MIN_GAMES })}</p>}
      </nav>

      {sorted.length === 0 ? (
        <p className="text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">{t("caption", { season })}</caption>
            <thead className="text-neutral-400">
              <tr>
                <th className="w-10 py-2 font-normal">#</th>
                <th className="font-normal">{t("player")}</th>
                <th className="text-right font-normal">{t("games")}</th>
                <th className="text-right font-normal">{t("wins")}</th>
                <th className="text-right font-normal">{t("winrate")}</th>
                <th className="text-right font-normal">{t("sheriff")}</th>
                <th className="text-right font-normal">{t("black")}</th>
                <th className="text-right font-normal">{t("bestMove")}</th>
                <th className="text-right font-normal">{t("avg")}</th>
                <th className="text-right font-normal">{t("points")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sorted.map((r, i) => {
                const ranked = i < qualified.length;
                return (
                  <tr key={r.profileId} className={ranked ? "" : "text-neutral-500"}>
                    <td className="py-2 font-mono">{ranked ? i + 1 : "—"}</td>
                    <td>
                      <Link href={{ pathname: "/players/[nick]", params: { nick: r.nickname } }} className="flex items-center gap-2 font-semibold hover:text-red-400">
                        {r.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatarUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs">{r.nickname.slice(0, 1).toUpperCase()}</span>
                        )}
                        {r.nickname}
                      </Link>
                    </td>
                    <td className="text-right">{r.games}</td>
                    <td className="text-right">{r.wins}</td>
                    <td className="text-right">{pct(r.wins, r.games)}</td>
                    <td className="text-right">{r.sheriffGames ? `${r.sheriffWins}/${r.sheriffGames}` : "—"}</td>
                    <td className="text-right">{r.blackGames ? `${r.blackWins}/${r.blackGames}` : "—"}</td>
                    <td className="text-right">{r.bestMovePoints ? `+${num(r.bestMovePoints)}` : "—"}</td>
                    <td className="text-right">{num(avg(r))}</td>
                    <td className="text-right font-mono text-base font-black">{num(r.points)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-500">{t("note")}</p>
    </div>
  );
}
