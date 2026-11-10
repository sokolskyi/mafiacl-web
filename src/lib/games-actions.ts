"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { GAMES_TAG } from "@/lib/games";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

function gameIdFrom(formData: FormData) {
  const id = Number(formData.get("gameId"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** «Записаться»: себя и только на открытую игру — это проверяет RLS. Сверх лимита — лист ожидания. */
export async function joinGame(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = gameIdFrom(formData);
  const back = getPathname({ href: "/play", locale });
  if (!gameId) redirect(back);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const { error } = await supabase.from("game_signups").insert({ game_id: gameId, profile_id: userId });
  // 23505 — уже записан: считаем успехом.
  if (error && error.code !== "23505") {
    console.error("joinGame failed", { gameId, code: error.code, message: error.message });
    redirect(`${back}?signup=error`);
  }
  updateTag(GAMES_TAG);
  redirect(`${back}#game-${gameId}`);
}

/** «Отменить запись»: место освобождается, первый из листа ожидания переходит в состав. */
export async function leaveGame(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = gameIdFrom(formData);
  const back = getPathname({ href: "/play", locale });
  if (!gameId) redirect(back);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const { error } = await supabase
    .from("game_signups")
    .update({ status: "cancelled" })
    .eq("game_id", gameId)
    .eq("profile_id", userId)
    .neq("status", "cancelled");
  if (error) {
    console.error("leaveGame failed", { gameId, code: error.code, message: error.message });
    redirect(`${back}?signup=error`);
  }
  updateTag(GAMES_TAG);
  redirect(`${back}#game-${gameId}`);
}
