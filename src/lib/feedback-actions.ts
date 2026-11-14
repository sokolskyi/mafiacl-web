"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/admin/queries";
import { MAIN_CLUB_SLUG, SITE_URL } from "@/lib/site";
import { escapeHtml } from "@/lib/telegram/api";
import { notifyStaff } from "@/lib/staffNotify";

export type FeedbackState = { ok?: boolean; error?: "invalid" | "tooMany" | "save" | "signIn" };

/** Отзыв игрока для администрации клуба. Не больше 5 за сутки. */
export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: "signIn" };

  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (body.length < 3) return { error: "invalid" };

  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from("player_feedback").select("id", { count: "exact", head: true }).eq("profile_id", userId).gte("created_at", dayAgo);
  if ((count ?? 0) >= 5) return { error: "tooMany" };

  const { data: club } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
  if (!club) return { error: "save" };
  const { data: row, error } = await db.from("player_feedback").insert({ club_id: club.id, profile_id: userId, body }).select("id").single();
  if (error || !row) {
    console.error("feedback insert failed", { code: error?.code, message: error?.message });
    return { error: "save" };
  }

  const { data: profile } = await db.from("profiles").select("nickname, display_name").eq("id", userId).maybeSingle();
  const who = profile?.nickname ?? profile?.display_name ?? "—";
  await notifyStaff(club.id, [
    `💬 <b>Отзыв игрока №${row.id}</b> · ${escapeHtml(who)}`,
    escapeHtml(body.slice(0, 1500)),
    `${SITE_URL}${getPathname({ href: "/admin", locale: "ru" })}#feedback`,
  ]);
  return { ok: true };
}

/** Отметить отзыв прочитанным (или вернуть в непрочитанные). Владелец и админы клуба. */
export async function markFeedback(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = getPathname({ href: "/admin", locale });
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) redirect(`${back}?error=invalid#feedback`);
  const ctx = await getStaffContext();
  const clubIds = (ctx?.clubs ?? []).filter((c) => c.roles.includes("owner") || c.roles.includes("admin")).map((c) => c.id);
  if (!ctx || clubIds.length === 0) redirect(`${back}?error=save#feedback`);
  const read = formData.get("read") === "1";
  const { error } = await createAdminClient()
    .from("player_feedback")
    .update(read ? { read_at: new Date().toISOString(), read_by: ctx.userId } : { read_at: null, read_by: null })
    .eq("id", id)
    .in("club_id", clubIds);
  if (error) {
    console.error("feedback mark failed", { code: error.code, message: error.message });
    redirect(`${back}?error=save#feedback`);
  }
  redirect(`${back}#feedback`);
}
