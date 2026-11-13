import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { SeasonStats } from "@/lib/ratingArchive";

/** Статистика сезона лиги: средний доп и процент побед (по таблице статистики клуба). */
export async function SeasonStatsBlock({ locale, stats }: { locale: Locale; stats: SeasonStats }) {
  const t = await getTranslations({ locale, namespace: "ratingArchive" });
  const num = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const head = "px-2 py-1.5 text-right font-normal";
  const cell = "px-2 py-1.5 text-right tabular-nums";
  if (!stats.hosts?.length && !stats.avgExtra?.length && !stats.winrate?.length) return null;
  return (
    <section className="mt-10" aria-labelledby="season-stats">
      <h2 id="season-stats" className="text-2xl font-bold">{t("statsTitle")}</h2>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {stats.hosts && stats.hosts.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="font-semibold">{t("hostsTitle")}</h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="w-8 py-1.5 font-normal">#</th>
                  <th className="font-normal">{t("host")}</th>
                  <th className={head}>{t("hostedGames")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {stats.hosts.map((r, i) => (
                  <tr key={r.n}>
                    <td className="py-1.5 font-mono">{i + 1}</td>
                    <td className="font-semibold">{r.n}</td>
                    <td className={cell}>{r.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {stats.avgExtra && stats.avgExtra.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="font-semibold">{t("avgExtraTitle")}</h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="w-8 py-1.5 font-normal">#</th>
                  <th className="font-normal">{t("player")}</th>
                  <th className={head}>{t("avgExtra")}</th>
                  <th className={head}>{t("medianExtra")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {stats.avgExtra.map((r, i) => (
                  <tr key={r.n}>
                    <td className="py-1.5 font-mono">{i + 1}</td>
                    <td className="font-semibold">{r.n}</td>
                    <td className={cell}>{num.format(r.avg)}</td>
                    <td className={cell}>{num.format(r.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {stats.winrate && stats.winrate.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="font-semibold">{t("winrateTitle")}</h3>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="w-8 py-1.5 font-normal">#</th>
                  <th className="font-normal">{t("player")}</th>
                  <th className={head}>{t("winBlack")}</th>
                  <th className={head}>{t("winRed")}</th>
                  <th className={head}>{t("winTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {stats.winrate.map((r, i) => (
                  <tr key={r.n}>
                    <td className="py-1.5 font-mono">{i + 1}</td>
                    <td className="font-semibold">{r.n}</td>
                    <td className={cell}>{pct.format(r.black)}%</td>
                    <td className={cell}>{pct.format(r.red)}%</td>
                    <td className={`${cell} font-bold text-white`}>{pct.format(r.total)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
