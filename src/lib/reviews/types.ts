/** Снимок рейтингов клуба для ежемесячного обзора сезона (хранится в season_reviews.data). */

export const RANKINGS = ["premier", "arena", "mafiacl", "represent"] as const;
export type RankingKey = (typeof RANKINGS)[number];

/** r — место, n — ник, v — показатель рейтинга, c — игр/турниров. */
export type RankRow = { r: number; n: string; v: number; c: number | null };

export type ReviewData = {
  /** Месяц обзора, YYYY-MM. */
  month: string;
  /** Дата снимка, YYYY-MM-DD (по Праге). */
  asOf: string;
  /** Снимок сделан посреди месяца (по кнопке), а не по его итогам. */
  partial: boolean;
  kings: {
    title: string;
    eventTitle: string | null;
    eventFrom: string | null;
    eventTo: string | null;
    prizeEur: number | null;
    premierGames: number | null;
    arenaGames: number | null;
    clubTournaments: number | null;
    uniquePlayers: number | null;
  } | null;
  rankings: Partial<Record<RankingKey, RankRow[]>>;
  mcl: {
    year: number;
    finalISO: string | null;
    played: string | null;
    series: { date: string; city: string; fl: string; winner: string; score: number; semi: boolean }[];
    squad: { n: string; c: string }[];
  } | null;
};

/** Сколько мест в рейтинге дают путёвку в MafiaCL Kings. */
export const KINGS_ZONE: Record<RankingKey, number> = { premier: 1, arena: 1, mafiacl: 4, represent: 4 };

export function reviewSlug(month: string) {
  return `season-review-${month}`;
}
