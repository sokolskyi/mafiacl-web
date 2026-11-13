import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const RATING_ARCHIVE_TAG = "rating-archive";

/** Лиги клуба в Праге: Premier League (the-mafia.net), Liga Mova (на украинском), First League. */
export const ARCHIVE_LEAGUES = ["premier", "mova", "first"] as const;
export type ArchiveLeague = (typeof ARCHIVE_LEAGUES)[number];

/** Пара баллов: [команда игрока победила, команда проиграла]. */
export type Pair = [number, number];
type LhTable = Record<"0" | "1" | "2" | "3", Pair>;

/** Правила подсчёта сезона (как в регламенте / настройках рейтинга). */
export type Scoring = {
  /** Баллы за победу по ролям; за поражение — 0. */
  win: { civ: number; mafia: number; sheriff: number; don: number };
  /** Первый убитый. */
  pu: Pair;
  /** Лучший ход: сколько из трёх названных оказались чёрными (0–3). */
  lh: LhTable;
  lhSheriff: LhTable | null;
  bestPlayer: number | null;
  /** Баллы за лучшего игрока начисляются за каждый голос игроков. */
  bestPlayerPerVote?: boolean;
  buttons: number[];
  /**
   * coefGames — баллы ÷ игры × 100 + gamesCoef × игры;
   * perGame — (баллы + gamesCoef за каждую игру) ÷ игры × 100;
   * sum — сумма баллов. По умолчанию coefGames.
   */
  formula?: "coefGames" | "perGame" | "sum";
  gamesCoef: number;
  /** Порог зачёта: больше, чем всего игр / minShareDiv (Premier League)… */
  minShareDiv?: number;
  /** …или не меньше minPct % игр сезона, то есть от minGames игр (лиги). */
  minPct?: number;
  minGames?: number;
  penalty?: number;
  /** Коэффициент баллов в финальных играх. */
  finalCoef?: number;
};

export type SeasonStats = {
  /** Ведущие сезона: сколько игр провёл каждый. */
  hosts?: { n: string; games: number }[];
  /** Места в таблице, у которых число игр неполное (часть вечеров сохранилась без разбивки по играм). */
  partialGamesRanks?: number[];
  avgExtra?: { n: string; avg: number; median: number }[];
  winrate?: { n: string; black: number; red: number; total: number }[];
};

export type ArchiveSeason = {
  id: number;
  league: ArchiveLeague;
  number: number;
  slug: string;
  title: string;
  year: number;
  games: number;
  civWins: number | null;
  mafiaWins: number | null;
  formula: string | null;
  scoring: Scoring | null;
  sourceUrl: string | null;
  asOf: string | null;
  isCurrent: boolean;
  /** Призёры сезона: определяются финалом, а не местом в рейтинге. */
  final: string[];
  stats: SeasonStats | null;
};

export type WL = { w: number; l: number };

export type ArchiveRow = {
  rank: number;
  nickname: string;
  /** Рейтинг (коэффициент или сумма, по формуле сезона). */
  points: number;
  /** Набранные баллы (в лигах; в Premier League — null). */
  score: number | null;
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
  stars: number;
  finalist: boolean;
  finalPoints: number | null;
};

type SeasonRow = {
  id: number;
  league: ArchiveLeague;
  number: number;
  slug: string;
  title: string;
  year: number;
  games: number;
  civ_wins: number | null;
  mafia_wins: number | null;
  formula: string | null;
  scoring: Scoring | null;
  source_url: string | null;
  as_of: string | null;
  is_current: boolean;
  final_places: string[] | null;
  stats: SeasonStats | null;
};

const toSeason = (r: SeasonRow): ArchiveSeason => ({
  id: r.id,
  league: r.league,
  number: r.number,
  slug: r.slug,
  title: r.title,
  year: r.year,
  games: r.games,
  civWins: r.civ_wins,
  mafiaWins: r.mafia_wins,
  formula: r.formula,
  scoring: r.scoring,
  sourceUrl: r.source_url,
  asOf: r.as_of,
  isCurrent: r.is_current,
  final: r.is_current ? [] : (r.final_places ?? []),
  stats: r.stats,
});

const SEASON_COLS =
  "id, league, number, slug, title, year, games, civ_wins, mafia_wins, formula, scoring, source_url, as_of, is_current, final_places, stats, clubs!inner ( slug )";

/** Сезоны всех лиг клуба, свежие сначала, с призёрами финала. */
export async function getArchiveSeasons(clubSlug: string): Promise<ArchiveSeason[]> {
  "use cache";
  cacheTag(RATING_ARCHIVE_TAG);
  cacheLife("days");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("rating_archive")
    .select(SEASON_COLS)
    .eq("clubs.slug", clubSlug)
    .order("year", { ascending: false })
    .order("number", { ascending: false });
  if (error) console.error("getArchiveSeasons failed", { code: error.code, message: error.message });
  return ((data ?? []) as unknown as SeasonRow[]).map(toSeason);
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
    .select(
      "rank, nickname, points, score, extra, games, wins, best_player, first_killed, best_move3, best_move2, civ_w, civ_l, mafia_w, mafia_l, sheriff_w, sheriff_l, don_w, don_l, qualified, stars, finalist, final_points",
    )
    .eq("archive_id", season.id)
    .order("rank");
  if (e2) console.error("getArchiveSeason rows failed", { code: e2.code, message: e2.message });
  return {
    season,
    rows: (rows ?? []).map((r) => ({
      rank: r.rank,
      nickname: r.nickname,
      points: Number(r.points),
      score: r.score === null ? null : Number(r.score),
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
      stars: r.stars,
      finalist: r.finalist,
      finalPoints: r.final_points === null ? null : Number(r.final_points),
    })),
  };
}
