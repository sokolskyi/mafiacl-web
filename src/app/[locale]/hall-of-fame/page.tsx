import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getHallOfFame } from "@/lib/badges";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "hallOfFame", href: "/hall-of-fame" });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const tp = await getTranslations({ locale, namespace: "pages" });
  const t = await getTranslations({ locale, namespace: "hall" });
  const rows = await getHallOfFame(MAIN_CLUB_SLUG);
  const czk = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p><Link href="/ratings" className="text-sm text-neutral-400 hover:text-white">← {t("back")}</Link></p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{tp("hallOfFame.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">{tp("hallOfFame.description")}</p>
      {rows.length === 0 ? (
        <p className="mt-10 text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="w-10 py-2 font-normal">#</th>
                <th className="font-normal">{t("player")}</th>
                <th className="text-right font-normal" title={t("champion")}>⭐ <span className="sr-only">{t("champion")}</span></th>
                <th className="text-right font-normal" title={t("kings")}>👑 <span className="sr-only">{t("kings")}</span></th>
                <th className="text-right font-normal" title={t("evenings")}>⚜️ <span className="sr-only">{t("evenings")}</span></th>
                <th className="text-right font-normal">{t("prize")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="py-2 font-mono text-neutral-400">{i + 1}</td>
                  <td className="font-semibold">
                    {r.linked ? (
                      <Link href={{ pathname: "/players/[nick]", params: { nick: r.nickname } }} className="hover:text-red-400">{r.nickname}</Link>
                    ) : r.nickname}
                  </td>
                  <td className="text-right">{r.champion || "—"}</td>
                  <td className="text-right">{r.kings || "—"}</td>
                  <td className="text-right">{r.evenings || "—"}</td>
                  <td className="text-right font-mono font-bold">{r.prize ? czk(r.prize) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-neutral-500">{t("legend")}</p>
        </div>
      )}
    </main>
  );
}
