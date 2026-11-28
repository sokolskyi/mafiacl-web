import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { archiveSeasonHref, type ArchiveRow, type ArchiveSeason, type WL } from "@/lib/ratingArchive";
import { getKnownPlayers } from "@/lib/playerNames";
import { playerLinks } from "@/components/players/PlayerNameLink";

const FINAL_SIZE = 10;

/**
 * Текущий сезон, пока игры записываются на the-mafia.net: копия таблицы оттуда (обновляется раз в день кроном).
 * Показывается на странице рейтингов вместо пустой таблицы электронного бланка.
 */
export async function CurrentArchiveTable({ locale, season: s, rows }: { locale: Locale; season: ArchiveSeason; rows: ArchiveRow[] }) {
  const t = await getTranslations({ locale, namespace: "rating" });
  const a = await getTranslations({ locale, namespace: "ratingArchive" });
  const known = await getKnownPlayers();
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const wl = (x: WL) => (x.w + x.l > 0 ? `${x.w}/${x.l}` : "—");
  const pct = (w: number, g: number) => (g ? `${Math.round((w / g) * 100)} %` : "—");
  const qualified = rows.filter((r) => r.qualified).length;
  const minGames = rows.filter((r) => r.qualified).reduce((m, r) => Math.min(m, r.games), Infinity);
  const head = "text-right font-normal";
  const cell = "text-right tabular-nums";

  return (
    <>
      <section className="rounded-lg border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-300">
        <h2 className="text-xl font-bold text-white">{s.title} · {a(`leagues.${s.league}.name`)}</h2>
        <p className="mt-1">{t("liveGames", { games: s.games })}</p>
        <p className="mt-1">
          {t("liveSource", { date: s.asOf ? date.format(new Date(`${s.asOf}T12:00:00Z`)) : "—" })}{" "}
          {s.sourceUrl && (
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
              the-mafia.net ↗
            </a>
          )}
        </p>
        {Number.isFinite(minGames) && <p className="mt-1">{t("liveThreshold", { n: minGames, count: qualified })}</p>}
        <p className="mt-1">{t("liveFinal", { size: FINAL_SIZE })}</p>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">{`${s.title} · ${a(`leagues.${s.league}.name`)}`}</caption>
          <thead className="text-neutral-400">
            <tr>
              <th className="w-10 py-2 font-normal">#</th>
              <th className="font-normal">{t("player")}</th>
              <th className={head}>{t("games")}</th>
              <th className={head}>{t("wins")}</th>
              <th className={head}>{t("winrate")}</th>
              <th className={head}>{a("sheriff")}</th>
              <th className={head}>{a("don")}</th>
              <th className={head} title={a("firstKilledHint")}>{a("firstKilled")}</th>
              <th className={head}>{a("extra")}</th>
              <th className={head}>{a("points")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r, i) => {
              const finalist = r.qualified && i < FINAL_SIZE;
              return (
                <tr key={r.rank} className={r.qualified ? "" : "text-neutral-500"}>
                  <td className="py-2 font-mono">{r.qualified ? r.rank : "—"}</td>
                  <td className="font-semibold">
                    {playerLinks(r.nickname, known)}
                    {finalist && <span className="ml-2 rounded bg-gold-500/20 px-1.5 text-xs font-normal text-gold-300">{t("finalist")}</span>}
                  </td>
                  <td className={cell}>{r.games}</td>
                  <td className={cell}>{r.wins}</td>
                  <td className={cell}>{pct(r.wins, r.games)}</td>
                  <td className={cell}>{wl(r.sheriff)}</td>
                  <td className={cell}>{wl(r.don)}</td>
                  <td className={cell}>{r.firstKilled || "—"}</td>
                  <td className={cell}>{r.extra ? num.format(r.extra) : "—"}</td>
                  <td className={`${cell} font-mono text-base font-black ${r.qualified ? "text-white" : ""}`}>{num.format(r.points)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        <Link href={archiveSeasonHref(s.league, s.slug)} className="font-semibold text-neutral-200 underline underline-offset-4 hover:text-white">
          {t("liveFull")} →
        </Link>
      </p>
    </>
  );
}
