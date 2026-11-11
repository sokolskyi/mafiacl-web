"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { isBotConfigured, sendMessage, escapeHtml } from "@/lib/telegram/api";

export type CorporateState = { ok?: boolean; error?: "invalid" | "tooMany" | "save" };

const FORMATS = ["teambuilding", "party", "birthday", "office", "club", "other"] as const;
const LANGS = ["cs", "ru", "uk", "en"] as const;

/** Заявка на корпоратив с открытой страницы: защита от ботов — скрытое поле и лимиты по IP и в целом. */
export async function submitCorporateRequest(_prev: CorporateState, formData: FormData): Promise<CorporateState> {
  // Скрытое поле «website» люди не видят и не заполняют; боты — заполняют.
  if (String(formData.get("website") ?? "")) return { ok: true };
  // Слишком быстрая отправка (меньше 3 с после открытия формы) — тоже бот.
  const openedAt = Number(formData.get("openedAt"));
  if (!Number.isFinite(openedAt) || Date.now() - openedAt < 3000) return { error: "invalid" };

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 120);
  if (!name || contact.length < 3) return { error: "invalid" };
  const company = String(formData.get("company") ?? "").trim().slice(0, 120) || null;
  const dateRaw = String(formData.get("date") ?? "");
  const event_date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
  const guestsN = Number(formData.get("guests"));
  const guests = Number.isInteger(guestsN) && guestsN >= 1 && guestsN <= 1000 ? guestsN : null;
  const formatRaw = String(formData.get("format") ?? "");
  const format = (FORMATS as readonly string[]).includes(formatRaw) ? formatRaw : null;
  const langRaw = String(formData.get("language") ?? "");
  const language = (LANGS as readonly string[]).includes(langRaw) ? langRaw : null;
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000) || null;
  const siteLocale = String(formData.get("locale") ?? "").slice(0, 5) || null;

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(`mafiacl-corp:${ip}`).digest("hex").slice(0, 32);

  const db = createAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: fromIp }, { count: total }] = await Promise.all([
    db.from("corporate_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    db.from("corporate_requests").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if ((fromIp ?? 0) >= 3 || (total ?? 0) >= 40) return { error: "tooMany" };

  const { data: club } = await db.from("clubs").select("id, name").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
  if (!club) return { error: "save" };
  const { data: row, error } = await db
    .from("corporate_requests")
    .insert({ club_id: club.id, name, company, contact, event_date, guests, format, language, message, site_locale: siteLocale, ip_hash: ipHash })
    .select("id")
    .single();
  if (error || !row) {
    console.error("corporate request failed", { code: error?.code, message: error?.message });
    return { error: "save" };
  }

  // Сообщаем владельцу и админам клуба в Telegram (если они привязали бота). Ошибка здесь не мешает заявке.
  if (isBotConfigured) {
    try {
      const { data: staff } = await db.from("club_staff").select("profile_id").eq("club_id", club.id).in("role", ["owner", "admin"]);
      const ids = [...new Set((staff ?? []).map((s) => s.profile_id))];
      const { data: chats } = ids.length
        ? await db.from("profile_private").select("telegram_chat_id").in("profile_id", ids).not("telegram_chat_id", "is", null)
        : { data: [] as { telegram_chat_id: number | null }[] };
      const text = [
        `🎩 <b>Заявка на корпоратив №${row.id}</b>`,
        `${escapeHtml(name)}${company ? ` · ${escapeHtml(company)}` : ""}`,
        `📞 ${escapeHtml(contact)}`,
        [event_date && `📅 ${event_date}`, guests && `👥 ${guests}`, format && `🎯 ${format}`, language && `🗣 ${language}`].filter(Boolean).join("  "),
        message ? `💬 ${escapeHtml(message.slice(0, 600))}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      await Promise.allSettled((chats ?? []).map((c) => c.telegram_chat_id && sendMessage(c.telegram_chat_id, text)));
    } catch (e) {
      console.error("corporate request notify failed", e);
    }
  }
  return { ok: true };
}
