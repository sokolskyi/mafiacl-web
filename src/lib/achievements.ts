import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MATCHES_TAG, type PlayerPage } from "@/lib/players";
import type { AwardCounts } from "@/lib/awards";
import type { TournamentLine } from "@/lib/mafgame/queries";
import type { Title } from "@/lib/badges";

/** Факты по электронному бланку сайта и вечерам клуба (RPC `player_achievement_facts`). */
export type AchievementFacts = {
  site_games: number;
  red_streak: number;
  full_best_move: number;
  self_shot_wins: number;
  voted_all_blacks: number;
  evening_wins: number;
  evening_streak: number;
  evening_wins_2tables: number;
  referrals: number;
  sheriff_wins: number;
  don_wins: number;
  mafia_wins: number;
  red_wins: number;
  club_podiums: number;
  club_wins: number;
};

const EMPTY: AchievementFacts = {
  site_games: 0, red_streak: 0, full_best_move: 0, self_shot_wins: 0, voted_all_blacks: 0,
  evening_wins: 0, evening_streak: 0, evening_wins_2tables: 0, referrals: 0,
  sheriff_wins: 0, don_wins: 0, mafia_wins: 0, red_wins: 0, club_podiums: 0, club_wins: 0,
};

export async function getAchievementFacts(profileId: string | null): Promise<AchievementFacts> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("hours");
  if (!profileId || !isSupabaseConfigured) return EMPTY;
  const { data, error } = await createPublicClient().rpc("player_achievement_facts", { p_profile: profileId });
  if (error) {
    console.error("getAchievementFacts failed", { code: error.code, message: error.message });
    return EMPTY;
  }
  return { ...EMPTY, ...((data ?? {}) as Partial<AchievementFacts>) };
}

export type AchievementGroup = "roles" | "evenings" | "tournaments" | "season" | "club";

export type Achievement = {
  id: string;
  icon: string;
  group: AchievementGroup;
  /** Сколько раз получено (для повторяемых) или текущий прогресс к цели. */
  value: number;
  /** Порог открытия. */
  goal: number;
  /** Повторяемое: на карточке «×N». Иначе — прогресс «value / goal». */
  repeatable: boolean;
  earned: boolean;
};

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = ["roles", "evenings", "tournaments", "season", "club"];

const ARENA = /arena|арена/i;

type Input = {
  player: PlayerPage;
  facts: AchievementFacts;
  awards: { counts: AwardCounts };
  tournaments: TournamentLine[];
  titles: Title[];
  firstYear: number | null;
  currentYear: number;
};

/**
 * Достижения игрока. Ничего не дают (кроме гордости), поэтому считаются из того, что уже есть:
 * архивные сезоны + игры по электронному бланку, вечера клуба, mafgame, зал славы, титулы.
 */
export function computeAchievements({ player, facts, awards, tournaments, titles, firstYear, currentYear }: Input): Achievement[] {
  const s = player.stats;
  const main = tournaments.filter((x) => !ARENA.test(x.name));
  const arenas = tournaments.filter((x) => ARENA.test(x.name));
  const finished = player.archive.filter((a) => !a.isCurrent);
  // Источники пересекаются (тот же турнир есть и в mafgame, и в зале славы), поэтому берём больший счёт, а не сумму.
  const champion = Math.max(
    titles.filter((x) => x.kind === "season_champion").length,
    awards.counts.season[0],
    finished.filter((a) => a.league === "premier" && a.finalPlace === 1).length,
  );
  const eveningWins = Math.max(facts.evening_wins, awards.counts.mini[0]);
  const tournamentWins = Math.max(main.filter((x) => x.place === 1).length, awards.counts.tournament[0], facts.club_wins);
  const tournamentPodiums = Math.max(
    main.filter((x) => x.place !== null && x.place <= 3).length,
    awards.counts.tournament.reduce((a, n) => a + n, 0),
    facts.club_podiums,
  );
  const years = firstYear ? currentYear - firstYear : 0;

  const list: [string, string, AchievementGroup, number, number, boolean][] = [
    // Роли и игры
    ["donWin", "♛", "roles", s.byRole.don.wins, 1, true],
    ["sheriffWin", "★", "roles", s.byRole.sheriff.wins, 1, true],
    ["godfather", "🎩", "roles", s.byRole.don.wins, 25, false],
    ["commissar", "🔦", "roles", s.byRole.sheriff.wins, 25, false],
    ["fullBestMove", "🎯", "roles", s.bestMoveFullArchive + facts.full_best_move, 1, true],
    ["clairvoyant", "🔮", "roles", s.bestMoveHits, 10, false],
    ["redStreak", "🔴", "roles", facts.red_streak, 5, false],
    ["selfShot", "🔫", "roles", facts.self_shot_wins, 1, true],
    ["allBlacks", "🗳️", "roles", facts.voted_all_blacks, 1, true],
    ["bestPlayer", "🏅", "roles", s.bestPlayer, 1, true],
    ["target", "🎪", "roles", s.firstKilled, 20, false],
    ["games100", "💯", "roles", s.games, 100, false],
    ["games500", "🃏", "roles", s.games, 500, false],
    ["games1000", "🏛️", "roles", s.games, 1000, false],
    ["wins250", "🔥", "roles", s.wins, 250, false],
    // Мини-турниры (вечера клуба)
    ["eveningWin", "🥇", "evenings", eveningWins, 1, true],
    ["eveningStreak", "⚡", "evenings", facts.evening_streak, 2, false],
    ["eveningTwoTables", "🪑", "evenings", facts.evening_wins_2tables, 1, true],
    ["evening10", "🎖️", "evenings", eveningWins, 10, false],
    // Турниры
    ["arenaWin", "⚔️", "tournaments", arenas.filter((x) => x.place === 1).length, 1, true],
    ["tournamentWin", "🏆", "tournaments", tournamentWins, 1, true],
    ["tournamentPodium", "🥉", "tournaments", tournamentPodiums, 1, true],
    ["tournamentFinal", "🎬", "tournaments", main.filter((x) => x.finalist).length, 1, true],
    ["tournaments10", "🧳", "tournaments", tournaments.length, 10, false],
    // Сезоны клуба
    ["seasonChampion", "👑", "season", champion, 1, true],
    ["seasonFinal", "🎟️", "season", finished.filter((a) => a.finalPlace !== null).length, 1, true],
    ["seasonTop10", "🔟", "season", finished.filter((a) => a.league === "premier" && a.rank <= 10).length, 1, true],
    ["seasons5", "📅", "season", new Set(player.archive.map((a) => a.year)).size, 5, false],
    // Клуб
    ["veteran5", "🌳", "club", years, 5, false],
    ["veteran10", "🗿", "club", years, 10, false],
    ["recruiter", "🤝", "club", facts.referrals, 1, true],
  ];

  return list.map(([id, icon, group, value, goal, repeatable]) => ({ id, icon, group, value, goal, repeatable, earned: value >= goal }));
}
