import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMyRespectHistory, getRespectBalance, getUnseenRespect, type RespectEntry } from "@/lib/respect-queries";
import { RespectAmount } from "./RespectAmount";
import { RespectBalance } from "./RespectBalance";
import { RespectCelebration, type CelebrationItem } from "./RespectCelebration";

/** Блок Respect в кабинете: баланс и последние движения. */
export async function AccountRespect({ locale, userId }: { locale: Locale; userId: string }) {
  const t = await getTranslations({ locale, namespace: "respect" });
  const [balance, history, unseen] = await Promise.all([getRespectBalance(userId), getMyRespectHistory(10), getUnseenRespect(userId)]);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Prague" });
  const note = (h: Pick<RespectEntry, "reason" | "note">) =>
    !h.note
      ? null
      : h.reason === "milestone"
        ? t("milestoneNote", { n: h.note })
        : h.reason === "streak"
          ? t("streakNote", { n: h.note })
          : h.reason === "membership" && ["month", "quarter", "year"].includes(h.note)
            ? t(`plans.${h.note as "month" | "quarter" | "year"}`)
            : h.note;

  // Праздничное окно: одинаковые начисления (причина + пояснение) сворачиваем в одну строку «×N».
  const MAX_ITEMS = 6;
  const grouped: CelebrationItem[] = [];
  for (const e of unseen?.entries ?? []) {
    const n = note(e);
    const label = n ? `${t(`reason.${e.reason}`)} · ${n}` : t(`reason.${e.reason}`);
    const g = grouped.find((x) => x.label === label);
    if (g) {
      g.amount += e.amount;
      g.count += 1;
    } else grouped.push({ label, amount: e.amount, count: 1 });
  }
  grouped.sort((a, b) => b.amount - a.amount);
  const items = grouped.slice(0, MAX_ITEMS);
  const restN = grouped.length - items.length;
  return (
    <section aria-labelledby="respect-title" className="mt-8 max-w-md rounded-lg border border-gold-500/30 bg-gold-500/5 p-5">
      <h3 id="respect-title" className="text-sm font-semibold">Respect</h3>
      <RespectBalance from={unseen ? balance - unseen.gained : balance} to={balance} />
      {unseen && (
        <RespectCelebration
          lastId={unseen.lastId}
          gained={unseen.gained}
          balance={balance}
          items={items}
          more={restN}
          texts={{ title: t("celebrate.title"), collect: t("celebrate.collect"), balanceNow: t("celebrate.balanceNow"), more: t("celebrate.more", { n: restN }) }}
        />
      )}
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
                {h.note && <span className="text-neutral-400"> · {note(h)}</span>}
              </span>
              <RespectAmount n={h.amount} sign className={h.amount > 0 ? "font-semibold text-green-400" : "font-semibold text-neutral-300"} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
