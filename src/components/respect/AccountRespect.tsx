import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CZK_PER_RESPECT } from "@/lib/respect";
import { getMyRespectHistory, getRespectBalance } from "@/lib/respect-queries";
import { RespectAmount } from "./RespectAmount";

/** Блок Respect в кабинете: баланс и последние движения. */
export async function AccountRespect({ locale, userId }: { locale: Locale; userId: string }) {
  const t = await getTranslations({ locale, namespace: "respect" });
  const [balance, history] = await Promise.all([getRespectBalance(userId), getMyRespectHistory(10)]);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Prague" });
  return (
    <section aria-labelledby="respect-title" className="mt-8 max-w-md rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-5">
      <h2 id="respect-title" className="text-sm font-semibold">Respect</h2>
      <p className="mt-1">
        <RespectAmount n={balance} className="text-4xl font-black text-yellow-200" />
        <span className="ml-3 text-sm text-neutral-400">≈ {balance * CZK_PER_RESPECT} Kč</span>
      </p>
      <p className="mt-2 text-sm text-neutral-400">{t("accountHint")}</p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <Link href="/respect" className="text-red-400 hover:text-red-300">{t("howItWorks")}</Link>
        <Link href="/respect" className="text-red-400 hover:text-red-300">{t("redeemTitle")}</Link>
      </p>
      {history.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10 border-t border-white/10 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex items-baseline gap-3 py-2">
              <span className="w-14 shrink-0 text-neutral-500">{date.format(new Date(h.createdAt))}</span>
              <span className="flex-1">
                {t(`reason.${h.reason}`)}
                {h.note && <span className="text-neutral-400"> · {h.reason === "milestone" ? t("milestoneNote", { n: h.note }) : h.reason === "streak" ? t("streakNote", { n: h.note }) : h.reason === "membership" && ["month", "quarter", "year"].includes(h.note) ? t(`plans.${h.note as "month" | "quarter" | "year"}`) : h.note}</span>}
              </span>
              <RespectAmount n={h.amount} sign className={h.amount > 0 ? "font-semibold text-green-400" : "font-semibold text-neutral-300"} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
