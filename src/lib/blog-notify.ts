import "server-only";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, isBotConfigured, sendMessage } from "@/lib/telegram/api";
import { botLang, t } from "@/lib/telegram/texts";
import { postIdOf } from "@/lib/blog-posts";
import { monthTitle } from "@/components/reviews/format";
import { MAIN_CLUB_SLUG } from "@/lib/site";

/**
 * Автору статьи — сообщение в Telegram о новом комментарии (если он привязал бота).
 * У обзоров сезона автор — клуб: пишем владельцу и админам. Свои комментарии не присылаем. Ошибка не мешает комментарию.
 */
export async function notifyNewComment(opts: { slug: string; commenterId: string; nickname: string; body: string; origin: string }) {
  if (!isBotConfigured) return;
  try {
    const db = createAdminClient();
    const postId = postIdOf(opts.slug);
    const month = /^season-review-(\d{4}-\d{2})$/.exec(opts.slug)?.[1] ?? null;

    let recipients: string[] = [];
    let postTitle: string | null = null;
    if (postId) {
      const { data } = await db.from("blog_posts").select("author_id, title").eq("id", postId).maybeSingle();
      if (data?.author_id) recipients = [data.author_id];
      postTitle = data?.title ?? null;
    } else if (month) {
      const { data: club } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
      const { data: staff } = club
        ? await db.from("club_staff").select("profile_id").eq("club_id", club.id).in("role", ["owner", "admin"])
        : { data: [] };
      recipients = [...new Set((staff ?? []).map((s) => s.profile_id as string))];
    }
    recipients = recipients.filter((id) => id !== opts.commenterId);
    if (!recipients.length) return;

    const [{ data: chats }, { data: profiles }] = await Promise.all([
      db.from("profile_private").select("profile_id, telegram_chat_id").in("profile_id", recipients).not("telegram_chat_id", "is", null),
      db.from("profiles").select("id, locale").in("id", recipients),
    ]);
    const localeOf = new Map((profiles ?? []).map((p) => [p.id as string, p.locale as string | null]));
    const snippet = opts.body.length > 300 ? `${opts.body.slice(0, 300)}…` : opts.body;

    await Promise.allSettled(
      (chats ?? []).map(async (c) => {
        const lang = botLang(localeOf.get(c.profile_id as string));
        const locale = ((routing.locales as readonly string[]).includes(lang) ? lang : routing.defaultLocale) as Locale;
        const title = postTitle ?? (month ? (await getTranslations({ locale, namespace: "reviews" }))("title", { month: monthTitle(month, locale) }) : opts.slug);
        const url = `${opts.origin}${getPathname({ href: { pathname: "/blog/[slug]", params: { slug: opts.slug } }, locale })}#comments`;
        const text = t(lang, "newComment", { title: escapeHtml(title), nick: escapeHtml(opts.nickname), text: escapeHtml(snippet) });
        return sendMessage(c.telegram_chat_id as number, text, [[{ text: t(lang, "openComments"), url }]]);
      }),
    );
  } catch (e) {
    console.error("comment notify failed", { message: e instanceof Error ? e.message : String(e) });
  }
}
