import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MATCHES_TAG } from "@/lib/players";

export type SeasonRatingInfo = {
  id: number;
  name: string;
  formula: "sum" | "winrate";
  minShare: number;
  finalCoef: number;
  finalSize: number | null;
  finalOn: string | null;
  prizePerGame: number | null;
  prizePerEvening: number | null;
};

export type Season = { id: number; number: number; name: string; startsOn: string; endsOn: string; ratings: SeasonRatingInfo[] };

export type RatingRow = {
  profileId: string;
  nickname: string;
  avatarUrl: string | null;
  games: number;
  wins: number;
  finals: number;
  rating: number;
  points: number;
  bestMove: number;
  sheriffGames: number;
  sheriffWins: number;
  blackGames: number;
  blackWins: number;
};

/** Сезоны клуба (новые сверху) с их рейтингами. */
export async function getSeasons(clubSlug: string): Promise<Season[]> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("seasons")
    .select(
      "id, number, name, starts_on, ends_on, clubs!inner ( slug ), season_ratings ( id, name, formula, min_share, final_coef, final_size, final_on, prize_per_game, prize_per_evening, sort_order )",
    )
    .eq("clubs.slug", clubSlug)
    .order("number", { ascending: false });
  if (error) {
    console.error("getSeasons failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((s) => ({
    id: s.id,
    number: s.number,
    name: s.name,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    ratings: ((s.season_ratings ?? []) as Record<string, unknown>[])
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        formula: r.formula === "winrate" ? "winrate" : "sum",
        minShare: Number(r.min_share),
        finalCoef: Number(r.final_coef),
        finalSize: r.final_size === null ? null : Number(r.final_size),
        finalOn: (r.final_on as string | null) ?? null,
        prizePerGame: r.prize_per_game === null ? null : Number(r.prize_per_game),
        prizePerEvening: r.prize_per_evening === null ? null : Number(r.prize_per_evening),
      })),
  }));
}

export async function getSeasonRating(ratingId: number): Promise<{ rows: RatingRow[]; matches: number; evenings: number }> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return { rows: [], matches: 0, evenings: 0 };
  const db = createPublicClient();
  const [{ data, error }, { data: totals }] = await Promise.all([
    db.rpc("season_rating", { p_rating_id: ratingId }),
    db.rpc("season_rating_totals", { p_rating_id: ratingId }),
  ]);
  if (error) console.error("getSeasonRating failed", { code: error.code, message: error.message });
  const t = ((totals ?? []) as { matches: number; evenings: number }[])[0];
  return {
    matches: Number(t?.matches ?? 0),
    evenings: Number(t?.evenings ?? 0),
    rows: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      profileId: r.profile_id as string,
      nickname: r.nickname as string,
      avatarUrl: (r.avatar_url as string | null) ?? null,
      games: Number(r.games),
      wins: Number(r.wins),
      finals: Number(r.finals),
      rating: Number(r.rating),
      points: Number(r.points),
      bestMove: Number(r.best_move),
      sheriffGames: Number(r.sheriff_games),
      sheriffWins: Number(r.sheriff_wins),
      blackGames: Number(r.black_games),
      blackWins: Number(r.black_wins),
    })),
  };
}

/** Текущий сезон: последний начавшийся. */
export function currentSeason(seasons: Season[], today: string) {
  return seasons.find((s) => s.startsOn <= today) ?? seasons[seasons.length - 1] ?? null;
}

export type EveningWinner = {
  gameId: number;
  startsAt: string;
  gameNumber: number | null;
  title: Record<string, string> | null;
  profileId: string | null;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  games: number;
  wins: number;
  points: number;
};

/** Победители вечеров рейтинга, новые сверху. */
export async function getEveningWinners(ratingId: number): Promise<EveningWinner[]> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db.rpc("evening_winners", { p_rating_id: ratingId });
  if (error) console.error("getEveningWinners failed", { code: error.code, message: error.message });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    gameId: Number(r.game_id),
    startsAt: r.starts_at as string,
    gameNumber: r.game_number === null ? null : Number(r.game_number),
    title: (r.title as Record<string, string> | null) ?? null,
    profileId: (r.profile_id as string | null) ?? null,
    name: String(r.name),
    nickname: (r.nickname as string | null) ?? null,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    games: Number(r.games),
    wins: Number(r.wins),
    points: Number(r.points),
  }));
}

export type StandingRow = { place: number; profileId: string | null; name: string; nickname: string | null; games: number; wins: number; points: number };

/** Итоги одного вечера (мини-турнира). */
export async function getEveningStandings(gameId: number): Promise<StandingRow[]> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data } = await db.rpc("evening_standings", { p_game_id: gameId });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    place: Number(r.place),
    profileId: (r.profile_id as string | null) ?? null,
    name: String(r.name),
    nickname: (r.nickname as string | null) ?? null,
    games: Number(r.games),
    wins: Number(r.wins),
    points: Number(r.points),
  }));
}

/** «Игрок недели»: победитель(и) последнего мини-турнира рейтинга с призом за вечер, если он был не старше 14 дней. */
export async function getPlayerOfWeek(clubSlug: string) {
  const seasons = await getSeasons(clubSlug);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
  const season = currentSeason(seasons, today);
  const rating = season?.ratings.find((r) => r.prizePerEvening !== null) ?? season?.ratings[0];
  if (!rating) return null;
  const winners = await getEveningWinners(rating.id);
  if (!winners.length) return null;
  const latest = winners.filter((w) => w.gameId === winners[0].gameId);
  if (Date.now() - new Date(latest[0].startsAt).getTime() > 14 * 24 * 3600 * 1000) return null;
  return { rating, winners: latest };
}
