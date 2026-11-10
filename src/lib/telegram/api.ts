import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "mafiaclub_prague_bot";
export const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID ?? "";

function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN не задан (Vercel → Environment Variables)");
  return t;
}

export const isBotConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);

/** Секрет вебхука выводится из токена бота — отдельный секрет хранить не нужно. */
export function webhookSecret() {
  return createHash("sha256").update(`mafiacl-webhook:${token()}`).digest("hex");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newLinkToken() {
  return randomBytes(24).toString("base64url");
}

export type InlineButton = { text: string; url?: string; callback_data?: string };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null;
  if (!json?.ok) throw new Error(`Telegram ${method}: ${json?.description ?? res.status}`);
  return json.result as T;
}

export function sendMessage(chatId: number | string, text: string, buttons?: InlineButton[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
