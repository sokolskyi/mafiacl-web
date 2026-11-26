import type { NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_ID, escapeHtml, isBotConfigured, sendPhoto } from "@/lib/telegram/api";
import { botLang, t } from "@/lib/telegram/texts";

export const maxDuration = 120;

type Birthday = { profile_id: string; nickname: string; locale: string | null; telegram_chat_id: number | null; birthday_public: boolean };

/**
 * Будильник из базы (pg_cron → pg_net, каждое утро): поздравить именинников.
 * Начисляет подарок (10 Respect, если ещё не начислен), бот присылает открытку в личку,
 * а тех, кто разрешил публичное поздравление, — поздравляет в канале клуба. Каждое — один раз в год.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return new Response("forbidden", { status: 403 });

  let db;
  try {
    db = createAdminClient();
  } catch {
    return new Response("not configured", { status: 503 });
  }
  const { data: ok } = await db.rpc("check_cron_secret", { p_secret: secret });
  if (ok !== true) return new Response("forbidden", { status: 403 });

  const { data, error } = await db.rpc("birthdays_today");
  if (error) {
    console.error("birthdays_today failed", { code: error.code, message: error.message });
    return new Response("error", { status: 500 });
  }
  const people = (data ?? []) as Birthday[];
  const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Prague" }).format(new Date()));
  const origin = request.nextUrl.origin;
  const card = (nick: string, f: "story" | "post", l: string, gift: boolean) =>
    `${origin}/api/share/birthday?${new URLSearchParams({ nick, f, l, v: String(year), ...(gift ? {} : { gift: "0" }) })}`;

  const result = { people: people.length, dm: 0, channel: 0, failed: 0 };
  for (const p of people) {
    // Подарок: база начисляет 10 Respect один раз в год и отвечает, есть ли он.
    const { data: gifted } = await db.rpc("respect_birthday_check", { p_profile: p.profile_id });
    const gift = gifted === true;

    await db.from("birthday_greetings").upsert({ profile_id: p.profile_id, year }, { onConflict: "profile_id,year", ignoreDuplicates: true });
    const { data: row } = await db
      .from("birthday_greetings")
      .select("dm_sent_at, channel_posted_at")
      .eq("profile_id", p.profile_id)
      .eq("year", year)
      .maybeSingle();
    if (!row || !isBotConfigured) continue;
    const name = escapeHtml(p.nickname);

    if (!row.dm_sent_at && p.telegram_chat_id) {
      const lang = botLang(p.locale);
      try {
        await sendPhoto(p.telegram_chat_id, card(p.nickname, "post", lang, gift), t(lang, gift ? "birthdayDm" : "birthdayDmNoGift", { name }), [
          [{ text: t(lang, "birthdayStory"), url: card(p.nickname, "story", lang, gift) }],
          [{ text: t(lang, "openAccount"), url: `${origin}${getPathname({ href: "/account", locale: lang })}` }],
        ]);
        await db.from("birthday_greetings").update({ dm_sent_at: new Date().toISOString() }).eq("profile_id", p.profile_id).eq("year", year);
        result.dm++;
      } catch (e) {
        result.failed++;
        console.error("birthday dm failed", { profile: p.profile_id, message: e instanceof Error ? e.message : String(e) });
      }
    }

    if (!row.channel_posted_at && p.birthday_public && CHANNEL_ID) {
      try {
        await sendPhoto(CHANNEL_ID, card(p.nickname, "post", "ru", gift), t("ru", "birthdayChannel", { name }));
        await db.from("birthday_greetings").update({ channel_posted_at: new Date().toISOString() }).eq("profile_id", p.profile_id).eq("year", year);
        result.channel++;
      } catch (e) {
        result.failed++;
        console.error("birthday channel post failed", { profile: p.profile_id, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  console.info("birthdays", result);
  return Response.json(result);
}
