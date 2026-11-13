import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const RATING_ARCHIVE_TAG = "rating-archive";

export type ArchiveSeason = {
  id: number;
  number: number;
  slug: string;
  title: string;
  year: number;
  games: number;
  civWins: number;
  mafiaWins: number;
  formula: string | null;
  sourceUrl: string | null;
  asOf: string | null;
  isCurrent: boolean;
};

export type WL = { w: number; l: number };

export type ArchiveRow = {
  rank: number;
  nickname: string;
  points: number;
  extra: number;
  games: number;
  wins: number;
  bestPlayer: number;
  firstKilled: number;
  bestMove3: number;
  bestMove2: number;
  civ: WL;
  mafia: WL;
  sheriff: WL;
  don: WL;
  qualified: boolean;
};

type SeasonRow = {
  id: number;
  number: number;
  slug: string;
  title: string;
  year: number;
  games: number;
  civ_wins: number;
  mafia_wins: number;
  formula: string | null;
  source_url: string | null;
  as_of: string | null;
  is_current: boolean;
};

const toSeason = (r: SeasonRow): ArchiveSeason => ({
  id: r.id,
  number: r.number,
  slug: r.slug,
  title: r.title,
  year: r.year,
  games: r.games,
  civWins: r.civ_wins,
  mafiaWins: r.mafia_wins,
  formula: r.formula,
  sourceUrl: r.source_url,
  asOf: r.as_of,
  isCurrent: r.is_current,
});

const SEASON_COLS = "id, number, slug, title, year, games, civ_wins, mafia_wins, formula, source_url, as_of, is_current, clubs!inner ( slug )";

/** Сезоны рейтинга Premier League (архив с the-mafia.net), свежие сначала, с лидером каждого. */
export async function getArchiveSeasons(clubSlug: string): Promise<(ArchiveSeason & { leaders: string[] })[]> {
  "use cache";
  cacheTag(RATING_ARCHIVE_TAG);
  cacheLife("days");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db.from("rating_archive").select(SEASON_COLS).eq("clubs.slug", clubSlug).order("number", { ascending: false });
  if (error) console.error("getArchiveSeasons failed", { code: error.code, message: error.message });
  const seasons = ((data ?? []) as unknown as SeasonRow[]).map(toSeason);
  if (seasons.length === 0) return [];
  const { data: top } = await db
    .from("rating_archive_rows")
    .select("archive_id, rank, nickname")
    .in("archive_id", seasons.map((s) => s.id))
    .eq("qualified", true)
    .lte("rank", 3)
    .order("rank");
  return seasons.map((s) => ({
    ...s,
    leaders: (top ?? []).filter((r) => r.archive_id === s.id).map((r) => r.nickname as string),
  }));
}

/** Один сезон архива с полной таблицей. */
export async function getArchiveSeason(clubSlug: string, slug: string): Promise<{ season: ArchiveSeason; rows: ArchiveRow[] } | null> {
  "use cache";
  cacheTag(RATING_ARCHIVE_TAG);
  cacheLife("days");
  if (!isSupabaseConfigured) return null;
  const db = createPublicClient();
  const { data, error } = await db.from("rating_archive").select(SEASON_COLS).eq("clubs.slug", clubSlug).eq("slug", slug).maybeSingle();
  if (error) console.error("getArchiveSeason failed", { code: error.code, message: error.message });
  if (!data) return null;
  const season = toSeason(data as unknown as SeasonRow);
  const { data: rows, error: e2 } = await db
    .from("rating_archive_rows")
    .select("rank, nickname, points, extra, games, wins, best_player, first_killed, best_move3, best_move2, civ_w, civ_l, mafia_w, mafia_l, sheriff_w, sheriff_l, don_w, don_l, qualified")
    .eq("archive_id", season.id)
    .order("rank");
  if (e2) console.error("getArchiveSeason rows failed", { code: e2.code, message: e2.message });
  return {
    season,
    rows: (rows ?? []).map((r) => ({
      rank: r.rank,
      nickname: r.nickname,
      points: Number(r.points),
      extra: Number(r.extra),
      games: r.games,
      wins: r.wins,
      bestPlayer: r.best_player,
      firstKilled: r.first_killed,
      bestMove3: r.best_move3,
      bestMove2: r.best_move2,
      civ: { w: r.civ_w, l: r.civ_l },
      mafia: { w: r.mafia_w, l: r.mafia_l },
      sheriff: { w: r.sheriff_w, l: r.sheriff_l },
      don: { w: r.don_w, l: r.don_l },
      qualified: r.qualified,
    })),
  };
}
