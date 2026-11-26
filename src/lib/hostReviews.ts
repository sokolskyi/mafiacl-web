import "server-only";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { escapeHtml, isBotConfigured, sendMessage } from "@/lib/telegram/api";
import { botLang, t } from "@/lib/telegram/texts";
import { SITE_URL } from "@/lib/site";

/**
 * Отзывы о ведущем: в форме отзыва посетитель выбирает, кто вёл игру (testimonials.host_id).
 * Ведущий узнаёт о них, когда администрация клуба опубликовала отзыв: сообщением бота клуба (если Telegram привязан)
 * и в кабинете («Отзывы о вас», новые — с отметкой, плюс плашка вверху кабинета).
 */

export type HostReview = { id: number; author: string; company: string | null; body: string; publishedAt: string; isNew: boolean };

/** Опубликованные отзывы о ведущем, привязанном к этому аккаунту. null — аккаунт не ведущий. */
export async function getMyHostReviews(profileId: string): Promise<{ host: string; reviews: HostReview[]; unseen: number } | null> {
  if (!isAdminConfigured) return null;
  const db = createAdminClient();
  const { data: hosts } = await db.from("hosts").select("id, nickname").eq("profile_id", profileId);
  if (!hosts?.length) return null;
  const [{ data: rows }, { data: priv }] = await Promise.all([
    db
      .from("testimonials")
      .select("id, author, company, body, published_at, created_at")
      .in("host_id", hosts.map((h) => h.id))
      .eq("active", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20),
    db.from("profile_private").select("reviews_seen_at").eq("profile_id", profileId).maybeSingle(),
  ]);
  const seen = priv?.reviews_seen_at ? Date.parse(priv.reviews_seen_at) : 0;
  const reviews = (rows ?? []).map((r) => {
    const publishedAt = (r.published_at ?? r.created_at) as string;
    return { id: r.id, author: r.author, company: r.company, body: r.body, publishedAt, isNew: Date.parse(publishedAt) > seen };
  });
  return { host: hosts[0].nickname, reviews, unseen: reviews.filter((r) => r.isNew).length };
}

/** Ведущий посмотрел «Отзывы о вас» — отметки «новый» гаснут. */
export async function markHostReviewsSeen(profileId: string) {
  if (!isAdminConfigured) return;
  await createAdminClient()
    .from("profile_private")
    .upsert({ profile_id: profileId, reviews_seen_at: new Date().toISOString() }, { onConflict: "profile_id" });
}

/**
 * Сообщение ведущему об опубликованном отзыве (один раз на отзыв и ведущего; сменили ведущего — уйдёт новому).
 * Ошибка не мешает сохранению отзыва.
 */
export async function notifyHostAboutReview(testimonialId: number) {
  if (!isAdminConfigured) return;
  try {
    const db = createAdminClient();
    const { data: r } = await db
      .from("testimonials")
      .select("id, author, company, body, active, host_notified_at, hosts ( profile_id )")
      .eq("id", testimonialId)
      .maybeSingle();
    const profileId = (r?.hosts as unknown as { profile_id: string | null } | null)?.profile_id ?? null;
    if (!r || !r.active || r.host_notified_at || !profileId) return;
    // Отмечаем сразу: даже без Telegram ведущий увидит отзыв в кабинете, повторно не пишем.
    await db.from("testimonials").update({ host_notified_at: new Date().toISOString() }).eq("id", r.id);
    if (!isBotConfigured) return;

    const [{ data: priv }, { data: profile }] = await Promise.all([
      db.from("profile_private").select("telegram_chat_id").eq("profile_id", profileId).maybeSingle(),
      db.from("profiles").select("locale").eq("id", profileId).maybeSingle(),
    ]);
    if (!priv?.telegram_chat_id) return;
    const lang = botLang(profile?.locale as string | null);
    const locale = ((routing.locales as readonly string[]).includes(lang) ? lang : routing.defaultLocale) as Locale;
    const snippet = r.body.length > 500 ? `${r.body.slice(0, 500)}…` : r.body;
    const who = r.company ? `${r.author} · ${r.company}` : r.author;
    const url = `${SITE_URL}${getPathname({ href: "/account", locale })}#my-reviews`;
    await sendMessage(priv.telegram_chat_id as number, t(lang, "reviewAboutYou", { author: escapeHtml(who), text: escapeHtml(snippet) }), [
      [{ text: t(lang, "openMyReviews"), url }],
    ]);
  } catch (e) {
    console.error("host review notify failed", { testimonialId, message: e instanceof Error ? e.message : String(e) });
  }
}
