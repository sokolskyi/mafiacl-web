import "server-only";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { escapeHtml, sendMessage } from "@/lib/telegram/api";
import { analyze } from "@/lib/reviews/analyze";
import { KINGS_ZONE, reviewSlug, type ReviewData } from "@/lib/reviews/types";
import { daysBetween, fmtNum, fullDate, monthTitle } from "@/components/reviews/format";

/** Канал MafiaCL Kings: сводка по рейтингам. Бот должен быть админом канала с правом публикации. */
export const KINGS_CHANNEL = process.env.TELEGRAM_KINGS_CHANNEL ?? "@mafiaclkings";

const LANG = "ru" as const;

/** Короткая сводка для канала: сезон Kings, лидеры и зона прохода по каждому рейтингу, ссылка на полный обзор. */
export async function channelText(review: ReviewData, previous: ReviewData | null) {
  const t = await getTranslations({ locale: LANG, namespace: "reviews" });
  const lines: string[] = [`👑 <b>${escapeHtml(t("title", { month: monthTitle(review.month, LANG) }))}</b>`];
  if (review.partial) lines.push(`<i>${escapeHtml(t("asOfPartial", { date: fullDate(review.asOf, LANG) }))}</i>`);
  const k = review.kings;
  if (k?.eventTitle && k.eventFrom) {
    const prize = k.prizeEur ? ` ${t("kingsPrize", { prize: fmtNum(k.prizeEur, LANG) })}` : "";
    lines.push("", `🏆 ${escapeHtml(t("kingsEvent", { title: k.eventTitle, date: fullDate(k.eventFrom, LANG), days: Math.max(0, daysBetween(review.asOf, k.eventFrom)) }) + prize)}`);
  }
  for (const ins of analyze(review, previous)) {
    lines.push("", `<b>${escapeHtml(t(`rankings.${ins.key}.title`))}</b>`);
    lines.push(
      escapeHtml(
        ins.previousLeader
          ? t("newLeader", { name: ins.leader.n, previous: ins.previousLeader, value: fmtNum(ins.leader.v, LANG) })
          : t("leader", { name: ins.leader.n, value: fmtNum(ins.leader.v, LANG) }),
      ),
    );
    if (KINGS_ZONE[ins.key] > 1) lines.push(escapeHtml(t("zone", { count: KINGS_ZONE[ins.key], names: ins.zone.join(", ") })));
    if (ins.climber) lines.push(escapeHtml(t("climber", { name: ins.climber.n, from: ins.climber.from, to: ins.climber.to })));
  }
  if (review.mcl?.squad.length) {
    lines.push("", `<b>${escapeHtml(t("mclTitle", { year: review.mcl.year }))}</b>`);
    lines.push(escapeHtml(t("mclSquad", { count: review.mcl.squad.length, names: review.mcl.squad.map((s) => s.n).join(", ") })));
  }
  return lines.join("\n");
}

/** Отправить обзор за месяц в канал Kings и отметить отправку. */
export async function postReview(month: string, origin: string) {
  const db = createAdminClient();
  const { data: club } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).single();
  const { data: rows } = await db
    .from("season_reviews")
    .select("id, month, data")
    .eq("club_id", club?.id ?? 0)
    .eq("published", true)
    .lte("month", `${month}-01`)
    .order("month", { ascending: false })
    .limit(2);
  const cur = rows?.[0];
  if (!cur || String(cur.month).slice(0, 7) !== month) throw new Error(`review ${month} not found`);
  const text = await channelText(cur.data as ReviewData, (rows?.[1]?.data as ReviewData | undefined) ?? null);
  const url = `${origin}${getPathname({ href: { pathname: "/blog/[slug]", params: { slug: reviewSlug(month) } }, locale: LANG })}`;
  const kings = `${origin}${getPathname({ href: "/kings", locale: LANG })}`;
  await sendMessage(KINGS_CHANNEL, text, [[{ text: "Полный обзор", url }], [{ text: "Рейтинги MafiaCL Kings", url: kings }]]);
  await db.from("season_reviews").update({ posted_at: new Date().toISOString() }).eq("id", cur.id);
}
