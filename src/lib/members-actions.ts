"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBotConfigured, sendMessage } from "@/lib/telegram/api";
import { MATCHES_TAG } from "@/lib/players";
import { formatMemberNo } from "@/lib/memberNo";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTICE = {
  approved: {
    cs: (no: string) => `✅ Vaše žádost na webu MafiaCL byla schválena. Vaše ID: <b>${no}</b>. Teď se můžete zapisovat na hry.`,
    ru: (no: string) => `✅ Ваша заявка на сайте MafiaCL одобрена. Ваш ID: <b>${no}</b>. Теперь можно записываться на игры.`,
    uk: (no: string) => `✅ Вашу заявку на сайті MafiaCL схвалено. Ваш ID: <b>${no}</b>. Тепер можна записуватися на ігри.`,
    en: (no: string) => `✅ Your MafiaCL account has been approved. Your ID: <b>${no}</b>. You can now sign up for games.`,
  },
  rejected: {
    cs: "Vaše žádost na webu MafiaCL nebyla schválena. Pokud jde o omyl, napište pořadateli.",
    ru: "Ваша заявка на сайте MafiaCL не одобрена. Если это ошибка, напишите организатору.",
    uk: "Вашу заявку на сайті MafiaCL не схвалено. Якщо це помилка, напишіть організатору.",
    en: "Your MafiaCL account request was not approved. If this is a mistake, please contact the organiser.",
  },
} as const;

/** Одобрить или отклонить заявку. Только owner/admin клуба; номер выдаёт база. */
export async function decideMember(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = getPathname({ href: "/admin", locale });
  const profileId = String(formData.get("profileId") ?? "");
  const approve = formData.get("decision") === "approve";
  if (!UUID_RE.test(profileId)) redirect(`${back}?error=invalid#members`);

  const ctx = await getStaffContext();
  if (!ctx || !ctx.clubs.some((c) => c.roles.includes("owner") || c.roles.includes("admin"))) {
    redirect(`${back}?error=save#members`);
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("member_decide", { p_profile: profileId, p_approve: approve, p_by: ctx.userId });
  if (error) {
    console.error("member_decide failed", { code: error.code, message: error.message });
    redirect(`${back}?error=save#members`);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { verification: string; member_no: number | null } | undefined;
  updateTag(MATCHES_TAG);

  // Уведомление в Telegram, если игрок привязал бота (почту пока не подключаем).
  if (isBotConfigured) {
    const [{ data: priv }, { data: prof }] = await Promise.all([
      db.from("profile_private").select("telegram_chat_id").eq("profile_id", profileId).maybeSingle(),
      db.from("profiles").select("locale").eq("id", profileId).maybeSingle(),
    ]);
    const chatId = priv?.telegram_chat_id;
    const lang = (["cs", "ru", "uk", "en"] as const).find((l) => l === prof?.locale) ?? "cs";
    if (chatId) {
      const text =
        row?.verification === "approved" ? NOTICE.approved[lang](formatMemberNo(row.member_no) ?? "") : NOTICE.rejected[lang];
      try {
        await sendMessage(chatId, text);
      } catch (e) {
        console.error("member notice failed", e);
      }
    }
  }
  redirect(`${back}?member=${row?.verification === "approved" ? "approved" : "rejected"}#members`);
}
