"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOT_USERNAME, CHANNEL_ID, newLinkToken, sendMessage, sha256, tg, webhookSecret } from "./api";
import { GAME_SELECT, timeOf, titleOf, toBotGame, venueOf, whenOf } from "./games";
import { t } from "./texts";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Кабинет → «Подключить Telegram»: одноразовая ссылка t.me/<бот>?start=<код>. */
export async function connectTelegram(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/account", locale });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(back);

  const token = newLinkToken();
  const db = createAdminClient();
  await db.from("telegram_link_tokens").delete().eq("profile_id", userId);
  const { error } = await db.from("telegram_link_tokens").insert({ token_hash: sha256(token), profile_id: userId });
  if (error) {
    console.error("connectTelegram failed", { code: error.code, message: error.message });
    redirect(`${back}?telegram=error`);
  }
  redirect(`https://t.me/${BOT_USERNAME}?start=${token}`);
}

/** Владелец клуба: подключить вебхук и меню команд. Повторный запуск безопасен. */
export async function setupBot(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(back);
  const { count } = await supabase
    .from("club_staff")
    .select("club_id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq("role", "owner");
  if (!count) redirect(`${back}?error=save`);

  try {
    await tg("setWebhook", {
      url: `${await origin()}/api/telegram/webhook`,
      secret_token: webhookSecret(),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    const commands = {
      ru: [["games", "Ближайшие игры и запись"], ["stop", "Отключить напоминания"]],
      uk: [["games", "Найближчі ігри та запис"], ["stop", "Вимкнути нагадування"]],
      cs: [["games", "Nejbližší hry a zápis"], ["stop", "Vypnout připomínky"]],
      en: [["games", "Upcoming games and sign-up"], ["stop", "Turn off reminders"]],
    } as const;
    for (const [lang, list] of Object.entries(commands)) {
      await tg("setMyCommands", {
        commands: list.map(([command, description]) => ({ command, description })),
        ...(lang === "en" ? {} : { language_code: lang }),
      });
    }
  } catch (e) {
    console.error("setupBot failed", { message: e instanceof Error ? e.message : String(e) });
    redirect(`${back}?error=bot`);
  }
  redirect(`${back}?bot=1`);
}

/** Ведущий: анонс игры в канал клуба с кнопкой записи. */
export async function announceGame(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = Number(formData.get("gameId"));
  const page = (flag: string) =>
    `${getPathname({ href: { pathname: "/admin/games/[id]", params: { id: String(gameId) } }, locale })}?${flag}`;
  if (!Number.isSafeInteger(gameId) || gameId < 1) redirect(getPathname({ href: "/admin", locale }));
  if (!CHANNEL_ID) redirect(page("error=channel"));

  // Права — через сессию ведущего: игру его клуба он видит, чужую — нет.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: game } = await supabase.from("games").select("club_id").eq("id", gameId).maybeSingle();
  const { count } = await supabase
    .from("club_staff")
    .select("club_id", { count: "exact", head: true })
    .eq("profile_id", claims?.claims.sub ?? "")
    .eq("club_id", game?.club_id ?? 0);
  if (!game || !count) redirect(page("error=save"));

  const db = createAdminClient();
  const { data } = await db.from("games").select(GAME_SELECT).eq("id", gameId).single();
  const g = toBotGame(data);
  const lang = "ru" as const;
  const late = g.lateAfter ? `\n${t(lang, "late", { time: timeOf(g.lateAfter, g.timezone, lang) })}` : "";
  const text = [
    `<b>MafiaCL Prague</b> · ${titleOf(g, lang)}`,
    `🗓 ${whenOf(g, lang)}${late}`,
    `📍 ${venueOf(g)}`,
    `👥 ${t(lang, "seats", { c: g.confirmed, cap: g.capacity })}`,
  ].join("\n");
  const playUrl = `${await origin()}${getPathname({ href: "/play", locale: lang })}#game-${g.id}`;
  try {
    await sendMessage(CHANNEL_ID, text, [
      [{ text: t(lang, "join"), url: `https://t.me/${BOT_USERNAME}?start=games` }],
      [{ text: t(lang, "site"), url: playUrl }],
    ]);
  } catch (e) {
    console.error("announceGame failed", { gameId, message: e instanceof Error ? e.message : String(e) });
    redirect(page("error=bot"));
  }
  redirect(page("announced=1"));
}
