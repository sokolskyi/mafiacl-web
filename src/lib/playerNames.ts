import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { HALL_ARCHIVE_TAG } from "@/lib/hallArchive";
import { ALIASES_TAG, getAliases, canonicalizer } from "@/lib/aliases";


/**
 * Все известные клубу игроки: ники на сайте, в архивах рейтингов, в зале славы и старые ники.
 * Ключ — ник в нижнем регистре, значение — текущий ник игрока (по нему открывается страница).
 */
export async function getKnownPlayers(): Promise<Record<string, string>> {
  "use cache";
  cacheTag("matches", RATING_ARCHIVE_TAG, HALL_ARCHIVE_TAG, ALIASES_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return {};
  const db = createPublicClient();
  const [aliases, { data: profiles }, { data: rows }, { data: hall }] = await Promise.all([
    getAliases(),
    db.from("profiles").select("nickname").not("nickname", "is", null).limit(10000),
    db.from("rating_archive_rows").select("nickname").limit(20000),
    db.from("hall_of_fame").select("places").limit(5000),
  ]);
  const canon = canonicalizer(aliases);
  const out: Record<string, string> = {};
  const add = (name: string | null | undefined) => {
    const n = name?.trim();
    // Названия команд («шо маємо, то маємо», «… и …») — не игроки.
    if (!n || n.length > 32 || /[,"«»]/.test(n) || / и /.test(n)) return;
    out[n.toLowerCase()] ??= canon(n);
  };
  for (const p of profiles ?? []) add(p.nickname);
  for (const r of rows ?? []) add(r.nickname);
  for (const h of hall ?? []) for (const p of (h.places as string[] | null) ?? []) for (const part of p.split(" и ")) add(part);
  for (const a of aliases) {
    out[a.alias.toLowerCase()] = a.canonical;
    out[a.canonical.toLowerCase()] ??= a.canonical;
  }
  return out;
}
