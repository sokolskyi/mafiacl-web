import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";

export const ALIASES_TAG = "player-aliases";

/** Старые ники → текущий ник (в нижнем регистре), из таблицы player_aliases. */
export async function getAliases(): Promise<{ alias: string; canonical: string }[]> {
  "use cache";
  cacheTag(ALIASES_TAG, RATING_ARCHIVE_TAG);
  cacheLife("days");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("player_aliases").select("alias, canonical").limit(5000);
  if (error) console.error("getAliases failed", { code: error.code, message: error.message });
  return data ?? [];
}

/** Функция «ник → текущий ник игрока» (без учёта регистра). */
export function canonicalizer(aliases: { alias: string; canonical: string }[]) {
  const m = new Map(aliases.map((a) => [a.alias.toLowerCase(), a.canonical]));
  return (nick: string) => m.get(nick.toLowerCase()) ?? nick;
}

/** Все ники игрока: текущий и старые. */
export function namesOf(aliases: { alias: string; canonical: string }[], nickname: string): string[] {
  const n = nickname.toLowerCase();
  return [nickname, ...aliases.filter((a) => a.canonical.toLowerCase() === n).map((a) => a.alias)];
}
