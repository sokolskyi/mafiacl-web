import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPathname } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOT_USERNAME, escapeHtml, sendMessage, sha256, tg, type InlineButton } from "./api";
import { titleOf, upcomingGames, whenOf } from "./games";
import { botLang, t, type BotLang } from "./texts";

type TgUser = { id: number; language_code?: string };
type TgChat = { id: number; type: string };
type Update = {
  message?: { message_id: number; chat: TgChat; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { message_id: number; chat: TgChat } };
};

type Linked = { profileId: string; nickname: string | null; lang: BotLang };

async function findLinked(db: SupabaseClient, chatId: number): Promise<Linked | null> {
  const { data } = await db
    .from("profile_private")
    .select("profile_id, profiles ( nickname, display_name, locale )")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (!data) return null;
  const p = data.profiles as unknown as { nickname: string | null; display_name: string | null; locale: string } | null;
  return { profileId: data.profile_id, nickname: p?.nickname ?? p?.display_name ?? null, lang: botLang(p?.locale) };
}

function siteUrl(origin: string, lang: BotLang, path: "/account" | "/play") {
  return origin + getPathname({ href: path, locale: lang });
}

/** Список игр с кнопками записи для конкретного игрока. */
async function gamesMessage(db: SupabaseClient, origin: string, lang: BotLang, profileId: string | null) {
  const games = await upcomingGames(db);
  const mine = new Map<number, string>();
  if (profileId && games.length) {
    const { data } = await db
      .from("game_signups")
      .select("game_id, status")
      .eq("profile_id", profileId)
      .in("game_id", games.map((g) => g.id))
      .neq("status", "cancelled");
    for (const r of data ?? []) mine.set(r.game_id, r.status);
  }

  const lines = [t(lang, "gamesTitle"), ""];
  const buttons: InlineButton[][] = [];
  for (const g of games) {
    const status = mine.get(g.id);
    const mark =
      status === "confirmed" ? ` ${t(lang, "you")}`
      : status === "waitlist" ? ` ${t(lang, "youWait")}`
      : status === "queued" ? ` ${t(lang, "youQueue")}`
      : "";
    const seats = g.queueOpen ? t(lang, "inQueue", { c: g.active }) : t(lang, "seats", { c: g.confirmed, cap: g.capacity });
    lines.push(`🗓 <b>${whenOf(g, lang)}</b> — ${titleOf(g, lang)}`);
    lines.push(`📍 ${escapeHtml(g.venue?.name ?? "")} · ${seats}${mark}`, "");
    const label = status ? t(lang, "leave") : !g.queueOpen && g.confirmed >= g.capacity ? t(lang, "joinWait") : t(lang, "join");
    buttons.push([{ text: `${label} · ${whenOf(g, lang)}`, callback_data: `${status ? "l" : "j"}:${g.id}` }]);
  }
  if (!games.length) lines.push(t(lang, "noGames"));
  buttons.push([{ text: t(lang, "site"), url: siteUrl(origin, lang, "/play") }]);
  return { text: lines.join("\n").trim(), buttons };
}

async function handleStart(db: SupabaseClient, origin: string, chatId: number, from: TgUser | undefined, arg: string) {
  const fallbackLang = botLang(from?.language_code);

  if (arg && arg !== "games") {
    const { data } = await db
      .from("telegram_link_tokens")
      .delete()
      .eq("token_hash", sha256(arg))
      .gt("expires_at", new Date().toISOString())
      .select("profile_id");
    const profileId = data?.[0]?.profile_id as string | undefined;
    if (!profileId) return sendMessage(chatId, t(fallbackLang, "badToken"));

    // Один чат — один профиль: снимаем привязку с прежнего владельца этого чата.
    await db.from("profile_private").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    const { error } = await db.from("profile_private").update({ telegram_chat_id: chatId }).eq("profile_id", profileId);
    if (error) throw new Error(`link: ${error.message}`);
    const linked = await findLinked(db, chatId);
    return sendMessage(chatId, t(linked?.lang ?? fallbackLang, "linked", { name: escapeHtml(linked?.nickname ?? "") }));
  }

  const linked = await findLinked(db, chatId);
  if (linked) {
    const m = await gamesMessage(db, origin, linked.lang, linked.profileId);
    return sendMessage(chatId, m.text, m.buttons);
  }
  return sendMessage(chatId, t(fallbackLang, "welcome"), [
    [{ text: t(fallbackLang, "linkButton"), url: siteUrl(origin, fallbackLang, "/account") }],
  ]);
}

async function handleCallback(db: SupabaseClient, origin: string, q: NonNullable<Update["callback_query"]>) {
  const chatId = q.message?.chat.id;
  const m = /^([jl]):(\d+)$/.exec(q.data ?? "");
  if (!chatId || !m) return tg("answerCallbackQuery", { callback_query_id: q.id });

  const linked = await findLinked(db, chatId);
  const lang = linked?.lang ?? botLang(q.from.language_code);
  if (!linked) {
    return tg("answerCallbackQuery", { callback_query_id: q.id, text: t(lang, "notLinked"), show_alert: true });
  }

  const gameId = Number(m[2]);
  let notice: string;
  let alert = false;
  if (m[1] === "j") {
    // Бот работает с секретным ключом, поэтому правила записи проверяем здесь сами:
    // только открытая и ещё не начавшаяся игра, только себя.
    const { data: game } = await db.from("games").select("status, starts_at").eq("id", gameId).maybeSingle();
    if (!game || game.status !== "open" || new Date(game.starts_at) < new Date()) {
      notice = t(lang, "closed");
    } else {
      const { data, error } = await db
        .from("game_signups")
        .insert({ game_id: gameId, profile_id: linked.profileId })
        .select("status")
        .single();
      if (error && error.code !== "23505") throw new Error(`join: ${error.message}`);
      notice =
        data?.status === "waitlist" ? t(lang, "waitlisted")
        : data?.status === "queued" ? t(lang, "queued")
        : t(lang, "joined");
      alert = data?.status === "queued";
    }
  } else {
    const { error } = await db
      .from("game_signups")
      .update({ status: "cancelled" })
      .eq("game_id", gameId)
      .eq("profile_id", linked.profileId)
      .neq("status", "cancelled")
      .is("checked_in_at", null);
    if (error) throw new Error(`leave: ${error.message}`);
    notice = t(lang, "left");
  }

  await tg("answerCallbackQuery", { callback_query_id: q.id, text: notice, show_alert: alert });
  const msg = await gamesMessage(db, origin, lang, linked.profileId);
  await tg("editMessageText", {
    chat_id: chatId,
    message_id: q.message!.message_id,
    text: msg.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: msg.buttons },
  }).catch(() => undefined); // «message is not modified» — не ошибка
}

export async function handleUpdate(update: Update, origin: string) {
  const db = createAdminClient();

  if (update.callback_query) return handleCallback(db, origin, update.callback_query);

  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private") return;
  const [cmd, arg = ""] = msg.text.trim().split(/\s+/, 2);
  const command = cmd.split("@")[0].toLowerCase();
  const chatId = msg.chat.id;

  if (command === "/start") return handleStart(db, origin, chatId, msg.from, arg);

  const linked = await findLinked(db, chatId);
  const lang = linked?.lang ?? botLang(msg.from?.language_code);

  if (command === "/games" || command === "/igry" || command === "/hry") {
    const m = await gamesMessage(db, origin, lang, linked?.profileId ?? null);
    return sendMessage(chatId, m.text, m.buttons);
  }
  if (command === "/stop") {
    await db.from("profile_private").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    return sendMessage(chatId, t(lang, "stopped"));
  }
  return sendMessage(chatId, linked ? t(lang, "help") : t(lang, "welcome"), linked ? undefined : [
    [{ text: t(lang, "linkButton"), url: siteUrl(origin, lang, "/account") }],
  ]);
}

export { BOT_USERNAME };
