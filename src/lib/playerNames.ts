import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { HALL_ARCHIVE_TAG } from "@/lib/hallArchive";
import { ALIASES_TAG, getAliases, canonicalizer } from "@/lib/aliases";
import { selectAll } from "@/lib/supabase/selectAll";
import { MAFGAME_TAG } from "@/lib/mafgame/queries";

/** Так клуб MafiaCL называется на mafgame (у игроков в итогах турниров): сейчас и до переименования в ноябре 2026. */
const MAFGAME_CLUB_NAMES = ["MafiaCL Prague", 'Mafia club "Champions League" Prague'];


/**
 * Все известные клубу игроки: ники на сайте, в архивах рейтингов, в зале славы, игроки клуба в турнирах на mafgame и старые ники.
 * Ключ — ник в нижнем регистре, значение — текущий ник игрока (по нему открывается страница).
 */
export async function getKnownPlayers(): Promise<Record<string, string>> {
  "use cache";
  cacheTag("matches", RATING_ARCHIVE_TAG, HALL_ARCHIVE_TAG, ALIASES_TAG, MAFGAME_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return {};
  const db = createPublicClient();
  const [aliases, { data: profiles }, { data: rows }, { data: hall }, { data: mafgame }] = await Promise.all([
    getAliases(),
    db.from("profiles").select("nickname").not("nickname", "is", null).limit(10000),
    selectAll<{ nickname: string }>((a, b) => db.from("rating_archive_rows").select("nickname").order("id").range(a, b)),
    selectAll<{ places: unknown }>((a, b) => db.from("hall_of_fame").select("places").order("id").range(a, b)),
    selectAll<{ nickname: string }>((a, b) =>
      db.from("mafgame_results").select("nickname").in("club", MAFGAME_CLUB_NAMES).order("tournament_id").order("user_id").range(a, b),
    ),
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
  for (const r of mafgame ?? []) add(r.nickname);
  for (const h of hall ?? []) for (const p of (h.places as string[] | null) ?? []) for (const part of p.split(" и ")) add(part);
  for (const a of aliases) {
    out[a.alias.toLowerCase()] = a.canonical;
    out[a.canonical.toLowerCase()] ??= a.canonical;
  }
  return out;
}
