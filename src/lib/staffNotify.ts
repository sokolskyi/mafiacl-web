import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBotConfigured, sendMessage } from "@/lib/telegram/api";

/** Сообщение владельцу и админам клуба в Telegram (если они привязали бота). Ошибка не мешает основному действию. */
export async function notifyStaff(clubId: number, lines: (string | false | null | undefined)[]) {
  if (!isBotConfigured) return;
  try {
    const db = createAdminClient();
    const { data: staff } = await db.from("club_staff").select("profile_id").eq("club_id", clubId).in("role", ["owner", "admin"]);
    const ids = [...new Set((staff ?? []).map((s) => s.profile_id))];
    if (!ids.length) return;
    const { data: chats } = await db.from("profile_private").select("telegram_chat_id").in("profile_id", ids).not("telegram_chat_id", "is", null);
    const text = lines.filter(Boolean).join("\n");
    await Promise.allSettled((chats ?? []).map((c) => c.telegram_chat_id && sendMessage(c.telegram_chat_id, text)));
  } catch (e) {
    console.error("staff notify failed", e);
  }
}
