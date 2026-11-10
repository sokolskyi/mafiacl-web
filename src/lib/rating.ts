import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { gameTitle, type Localized } from "@/lib/games";
import { MATCHES_TAG } from "@/lib/players";

export type RatingRow = {
  profileId: string;
  nickname: string;
  avatarUrl: string | null;
  games: number;
  wins: number;
  points: number;
  bestMovePoints: number;
  sheriffGames: number;
  sheriffWins: number;
  blackGames: number;
  blackWins: number;
};

export type Series = { id: number; title: Localized };

/** Первый сезон на новом сайте. */
export const FIRST_SEASON = 2026;
/** Для сортировки по среднему баллу и проценту побед нужно сыграть хотя бы столько партий. */
export const MIN_GAMES = 5;

export async function getRating(clubSlug: string, season: number, scheduleId: number | null): Promise<RatingRow[]> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db.rpc("club_rating", {
    p_club_slug: clubSlug,
    p_from: `${season}-01-01`,
    p_to: `${season}-12-31`,
    p_schedule_id: scheduleId,
  });
  if (error) {
    console.error("getRating failed", { code: error.code, message: error.message });
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    profileId: r.profile_id as string,
    nickname: r.nickname as string,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    games: Number(r.games),
    wins: Number(r.wins),
    points: Number(r.points),
    bestMovePoints: Number(r.best_move_points),
    sheriffGames: Number(r.sheriff_games),
    sheriffWins: Number(r.sheriff_wins),
    blackGames: Number(r.black_games),
    blackWins: Number(r.black_wins),
  }));
}

/** Серии клуба (регулярные игры) для фильтра рейтинга. */
export async function getSeries(clubSlug: string): Promise<Series[]> {
  "use cache";
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data } = await db
    .from("game_schedules")
    .select("id, title, weekday, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("is_active", true)
    .order("weekday");
  return (data ?? []).map((s) => ({ id: s.id, title: (s.title ?? {}) as Localized }));
}

export function seriesName(s: Series, locale: keyof Localized) {
  return gameTitle(s.title[locale] ?? s.title.cs ?? "", null, "arabic");
}
