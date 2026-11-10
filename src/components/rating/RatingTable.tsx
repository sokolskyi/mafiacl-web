import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { currentSeason, getEveningWinners, getSeasonRating, getSeasons } from "@/lib/rating";
import { badgeOf, getBadges } from "@/lib/badges";

export async function RatingTable({ locale, season, rating }: { locale: Locale; season: number | null; rating: number | null }) {
  const t = await getTranslations({ locale, namespace: "rating" });
  const seasons = await getSeasons(MAIN_CLUB_SLUG);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
  const s = seasons.find((x) => x.number === season) ?? currentSeason(seasons, today);
  if (!s) return <p className="mt-10 text-neutral-400">{t("noSeasons")}</p>;
  const r = s.ratings.find((x) => x.id === rating) ?? s.ratings[0];
  if (!r) return <p className="mt-10 text-neutral-400">{t("empty")}</p>;

  const { rows, matches, evenings } = await getSeasonRating(r.id);
  const badges = await getBadges(MAIN_CLUB_SLUG);
  // Победы в мини-турнирах (вечерах) — для рейтингов с призом за вечер.
  const showEvenings = r.prizePerEvening !== null;
  const eveningWins = new Map<string, number>();
  if (showEvenings) {
    for (const w of await getEveningWinners(r.id)) {
      if (w.profileId) eveningWins.set(w.profileId, (eveningWins.get(w.profileId) ?? 0) + 1);
    }
  }
  const minGames = Math.ceil(r.minShare * matches);
  const qualified = rows.filter((x) => x.games >= minGames && x.games > 0).sort((a, b) => b.rating - a.rating || b.games - a.games);
  const rest = rows.filter((x) => !(x.games >= minGames && x.games > 0)).sort((a, b) => b.rating - a.rating);
  const sorted = [...qualified, ...rest];
  const prize = (r.prizePerGame ?? 0) * matches + (r.prizePerEvening ?? 0) * evenings;

  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const date = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(d));
  const chip = (active: boolean) =>
    `rounded px-3 py-1.5 text-sm font-semibold ${active ? "bg-red-600 text-white" : "bg-white/10 text-neutral-200 hover:bg-white/20"}`;
  const href = (seasonNo: number, ratingId?: number) => ({
    pathname: "/ratings" as const,
    query: { ...(seasonNo !== currentSeason(seasons, today)?.number ? { season: String(seasonNo) } : {}), ...(ratingId ? { rating: String(ratingId) } : {}) },
  });

  return (
    <div className="mt-10 space-y-6">
      <nav aria-label={t("filters")} className="space-y-3">
        {seasons.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-sm text-neutral-400">{t("season")}</span>
            {seasons.map((x) => (
              <Link key={x.id} href={href(x.number)} className={chip(x.id === s.id)} aria-current={x.id === s.id ? "page" : undefined}>{x.name}</Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {s.ratings.map((x) => (
            <Link key={x.id} href={href(s.number, x.id)} className={chip(x.id === r.id)} aria-current={x.id === r.id ? "page" : undefined}>{x.name}</Link>
          ))}
        </div>
      </nav>

      <section className="rounded-lg border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-300">
        <h2 className="text-lg font-bold text-white">{s.name} · {r.name}</h2>
        <p className="mt-1">{t("period", { from: date(s.startsOn), to: date(s.endsOn) })} · {t("played", { matches, evenings })}</p>
        <p className="mt-1">{r.formula === "winrate" ? t("formulaWinrate") : t("formulaSum")}</p>
        {r.minShare > 0 && <p className="mt-1">{t("threshold", { pct: Math.round(r.minShare * 100), n: minGames })}</p>}
        {r.finalOn && (
          <p className="mt-1">{t("final", { date: date(r.finalOn), size: r.finalSize ?? 10, coef: num(r.finalCoef) })}</p>
        )}
        {(r.prizePerGame || r.prizePerEvening) && (
          <p className="mt-1">{t("prize", { sum: new Intl.NumberFormat(locale).format(prize), ppg: r.prizePerGame ?? 0, ppe: r.prizePerEvening ?? 0 })}</p>
        )}
      </section>

      {sorted.length === 0 ? (
        <p className="text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">{`${s.name} · ${r.name}`}</caption>
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
                {showEvenings && <th className="text-right font-normal" title={t("eveningWinsHint")}>⚜️</th>}
                {r.formula === "winrate" && <th className="text-right font-normal">{t("points")}</th>}
                <th className="text-right font-normal">{t("rating")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sorted.map((x, i) => {
                const ranked = i < qualified.length;
                const finalist = ranked && r.finalSize !== null && i < r.finalSize;
                return (
                  <tr key={x.profileId} className={ranked ? "" : "text-neutral-500"}>
                    <td className="py-2 font-mono">{ranked ? i + 1 : "—"}</td>
                    <td>
                      <Link href={{ pathname: "/players/[nick]", params: { nick: x.nickname } }} className="flex items-center gap-2 font-semibold hover:text-red-400">
                        {x.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={x.avatarUrl} alt="" width={28} height={28} referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs">{x.nickname.slice(0, 1).toUpperCase()}</span>
                        )}
                        {x.nickname}
                        {badgeOf(badges, x.profileId, x.nickname) && <span aria-hidden="true">{badgeOf(badges, x.profileId, x.nickname)}</span>}
                        {finalist && <span className="rounded bg-yellow-500/20 px-1.5 text-xs font-normal text-yellow-300">{t("finalist")}</span>}
                      </Link>
                    </td>
                    <td className="text-right">{x.games}{x.finals ? <span className="text-yellow-300"> +{x.finals}</span> : null}</td>
                    <td className="text-right">{x.wins}</td>
                    <td className="text-right">{pct(x.wins, x.games + x.finals)}</td>
                    <td className="text-right">{x.sheriffGames ? `${x.sheriffWins}/${x.sheriffGames}` : "—"}</td>
                    <td className="text-right">{x.blackGames ? `${x.blackWins}/${x.blackGames}` : "—"}</td>
                    <td className="text-right">{x.bestMove ? `+${num(x.bestMove)}` : "—"}</td>
                    {showEvenings && <td className="text-right">{eveningWins.get(x.profileId) ?? "—"}</td>}
                    {r.formula === "winrate" && <td className="text-right">{num(x.points)}</td>}
                    <td className="text-right font-mono text-base font-black">{num(x.rating)}</td>
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
