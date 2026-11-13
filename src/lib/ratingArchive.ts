import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const RATING_ARCHIVE_TAG = "rating-archive";

/** Пара баллов: [команда игрока победила, команда проиграла]. */
export type Pair = [number, number];

/** Правила подсчёта сезона (как в настройках рейтинга на the-mafia.net). */
export type Scoring = {
  /** Баллы за победу по ролям; за поражение — 0. */
  win: { civ: number; mafia: number; sheriff: number; don: number };
  /** Первый убитый. */
  pu: Pair;
  /** Лучший ход: сколько из трёх названных оказались чёрными (0–3). */
  lh: Record<"0" | "1" | "2" | "3", Pair>;
  lhSheriff: Record<"0" | "1" | "2" | "3", Pair>;
  bestPlayer: number | null;
  buttons: number[];
  /** Надбавка за количество игр: + gamesCoef × игры. */
  gamesCoef: number;
  /** В зачёт: игр больше, чем всего игр сезона / minShareDiv. */
  minShareDiv: number;
};

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
  scoring: Scoring | null;
  sourceUrl: string | null;
  asOf: string | null;
  isCurrent: boolean;
  /** Призёры финала сезона (из зала славы): чемпион определяется в финале, не по рейтингу. */
  final: string[];
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
  scoring: Scoring | null;
  source_url: string | null;
  as_of: string | null;
  is_current: boolean;
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const PRAGUE = "Прага";

const toSeason = (r: SeasonRow, finals: Map<string, string[]>): ArchiveSeason => ({
  id: r.id,
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
  final: r.is_current ? [] : (finals.get(ROMAN[r.number] ?? "") ?? []),
});

/** Призёры финалов пражских сезонов из зала славы: «I» → [1-е, 2-е, 3-е место]. */
async function getPragueFinals(db: ReturnType<typeof createPublicClient>, clubSlug: string): Promise<Map<string, string[]>> {
  const { data, error } = await db
    .from("hall_of_fame")
    .select("season, places, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("category", "season")
    .eq("city", PRAGUE);
  if (error) console.error("getPragueFinals failed", { code: error.code, message: error.message });
  return new Map((data ?? []).filter((r) => r.season).map((r) => [r.season as string, (r.places ?? []) as string[]]));
}

const SEASON_COLS = "id, number, slug, title, year, games, civ_wins, mafia_wins, formula, scoring, source_url, as_of, is_current, clubs!inner ( slug )";

/** Сезоны рейтинга Premier League (архив с the-mafia.net), свежие сначала, с призёрами финала. */
export async function getArchiveSeasons(clubSlug: string): Promise<ArchiveSeason[]> {
  "use cache";
  cacheTag(RATING_ARCHIVE_TAG);
  cacheTag("hall-archive");
  cacheLife("days");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const [{ data, error }, finals] = await Promise.all([
    db.from("rating_archive").select(SEASON_COLS).eq("clubs.slug", clubSlug).order("number", { ascending: false }),
    getPragueFinals(db, clubSlug),
  ]);
  if (error) console.error("getArchiveSeasons failed", { code: error.code, message: error.message });
  return ((data ?? []) as unknown as SeasonRow[]).map((r) => toSeason(r, finals));
}

/** Один сезон архива с полной таблицей. */
export async function getArchiveSeason(clubSlug: string, slug: string): Promise<{ season: ArchiveSeason; rows: ArchiveRow[] } | null> {
  "use cache";
  cacheTag(RATING_ARCHIVE_TAG);
  cacheTag("hall-archive");
  cacheLife("days");
  if (!isSupabaseConfigured) return null;
  const db = createPublicClient();
  const [{ data, error }, finals] = await Promise.all([
    db.from("rating_archive").select(SEASON_COLS).eq("clubs.slug", clubSlug).eq("slug", slug).maybeSingle(),
    getPragueFinals(db, clubSlug),
  ]);
  if (error) console.error("getArchiveSeason failed", { code: error.code, message: error.message });
  if (!data) return null;
  const season = toSeason(data as unknown as SeasonRow, finals);
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
