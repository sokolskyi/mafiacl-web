import "server-only";
import { getPathname } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendMessage } from "./api";
import { GAME_SELECT, timeOf, titleOf, toBotGame, venueOf, whenOf, type BotGame } from "./games";
import { botLang, t, type BotLang } from "./texts";

type Pending = {
  id: number;
  kind: "reminder" | "promoted" | "table_full" | "game_cancelled";
  attempts: number;
  game_id: number | null;
  profile_id: string;
};

/** Текст поста «стол собран» — в стиле анонсов клуба: название, дата, место, список игроков. */
async function tableDraft(db: ReturnType<typeof createAdminClient>, g: BotGame, lang: BotLang) {
  const { data } = await db
    .from("game_signups")
    .select("guest_name, profiles!game_signups_profile_id_fkey ( nickname, display_name )")
    .eq("game_id", g.id)
    .eq("status", "confirmed")
    .order("created_at");
  const names = (data ?? []).map((s) => {
    const p = s.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
    return escapeHtml(s.guest_name ?? p?.nickname ?? p?.display_name ?? "—");
  });
  const late = g.lateAfter ? `\n${t(lang, "late", { time: timeOf(g.lateAfter, g.timezone, lang) })}` : "";
  return [
    `<b>MafiaCL Prague</b> · ${titleOf(g, lang)}`,
    `🗓 ${whenOf(g, lang)}${late}`,
    `📍 ${venueOf(g)}`,
    "",
    ...names.map((n, i) => `${i + 1}. ${n}`),
  ].join("\n");
}

/** Разослать накопившиеся уведомления (вызывается базой раз в 5 минут, если есть что слать). */
export async function dispatchNotifications(origin: string) {
  const db = createAdminClient();
  const { data: pending, error } = await db
    .from("notifications")
    .select("id, kind, attempts, game_id, profile_id")
    .is("sent_at", null)
    .lt("attempts", 5)
    .order("created_at")
    .limit(50);
  if (error) throw new Error(`dispatch: ${error.message}`);
  const rows = (pending ?? []) as Pending[];
  if (!rows.length) return { sent: 0, skipped: 0, failed: 0 };

  const profileIds = [...new Set(rows.map((r) => r.profile_id))];
  const gameIds = [...new Set(rows.map((r) => r.game_id).filter((x): x is number => x !== null))];
  const [{ data: privs }, { data: profiles }, { data: games }] = await Promise.all([
    db.from("profile_private").select("profile_id, telegram_chat_id").in("profile_id", profileIds),
    db.from("profiles").select("id, locale").in("id", profileIds),
    db.from("games").select(GAME_SELECT).in("id", gameIds.length ? gameIds : [0]),
  ]);
  const chatOf = new Map((privs ?? []).map((p) => [p.profile_id, p.telegram_chat_id as number | null]));
  const langOf = new Map((profiles ?? []).map((p) => [p.id, botLang(p.locale)]));
  const gameOf = new Map((games ?? []).map((g) => [g.id, toBotGame(g)]));

  let sent = 0, skipped = 0, failed = 0;
  for (const n of rows) {
    const chatId = chatOf.get(n.profile_id);
    const g = n.game_id ? gameOf.get(n.game_id) : undefined;
    const now = new Date().toISOString();
    if (!chatId || !g) {
      await db.from("notifications").update({ sent_at: now, last_error: chatId ? "no_game" : "no_chat" }).eq("id", n.id);
      skipped++;
      continue;
    }
    const lang = langOf.get(n.profile_id) ?? "ru";
    const playUrl = `${origin}${getPathname({ href: "/play", locale: lang })}#game-${g.id}`;
    try {
      if (n.kind === "reminder") {
        // Напоминание, отправленное уже после начала игры, бесполезно.
        if (new Date(g.startsAt) < new Date()) throw new Error("too_late");
        const late = g.lateAfter ? `\n${t(lang, "late", { time: timeOf(g.lateAfter, g.timezone, lang) })}` : "";
        await sendMessage(
          chatId,
          `${t(lang, "reminder", { time: timeOf(g.startsAt, g.timezone, lang), title: titleOf(g, lang), venue: venueOf(g) })}${late}\n\n${t(lang, "cantCome")}`,
          [[{ text: t(lang, "leave"), callback_data: `l:${g.id}` }]],
        );
      } else if (n.kind === "promoted") {
        await sendMessage(chatId, t(lang, "promoted", { when: whenOf(g, lang), title: titleOf(g, lang), venue: venueOf(g) }), [
          [{ text: t(lang, "leave"), callback_data: `l:${g.id}` }],
        ]);
      } else if (n.kind === "game_cancelled") {
        await sendMessage(chatId, t(lang, "cancelledGame", { when: whenOf(g, lang), title: titleOf(g, lang) }), [
          [{ text: t(lang, "site"), url: playUrl }],
        ]);
      } else {
        await sendMessage(chatId, t(lang, "tableFull"));
        await sendMessage(chatId, await tableDraft(db, g, lang));
      }
      await db.from("notifications").update({ sent_at: now, last_error: null }).eq("id", n.id);
      sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const final = message === "too_late" || /blocked|chat not found|deactivated/i.test(message);
      await db
        .from("notifications")
        .update({ attempts: n.attempts + 1, last_error: message.slice(0, 300), ...(final ? { sent_at: now } : {}) })
        .eq("id", n.id);
      failed++;
    }
  }
  return { sent, skipped, failed };
}
