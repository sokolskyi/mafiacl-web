import type { PremierTotals, WL } from "@/lib/ratingArchive";

export type CompareKey = "winRate" | "civilian" | "sheriff" | "mafia" | "don" | "avgExtra" | "firstKilled";

export type CompareRow = {
  key: CompareKey;
  /** Значение игрока (доля 0–1 или средний доп). */
  value: number;
  median: number;
  /** «Топ N %» среди игроков с достаточным числом партий; null — показатель без «лучше/хуже» (первый убиенный). */
  top: number | null;
  /** С кем сравниваем: игроков с минимумом партий. */
  pool: number;
  games: number;
};

const MIN_GAMES = 30;
const MIN_ROLE_GAMES = 10;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/** Сравнение игрока с клубом по Premier League (все сезоны): процент побед, роли, доп, первый убиенный. */
export function compareWithClub(all: PremierTotals[], nickname: string): CompareRow[] {
  const me = all.find((t) => t.nickname.toLowerCase() === nickname.toLowerCase());
  if (!me || me.games < MIN_GAMES) return [];
  const rows: CompareRow[] = [];
  const add = (key: CompareKey, pick: (t: PremierTotals) => { value: number; games: number } | null, min: number, ranked: boolean) => {
    const mine = pick(me);
    if (!mine || mine.games < min) return;
    const pool = all.map(pick).filter((x): x is { value: number; games: number } => !!x && x.games >= min).map((x) => x.value);
    if (pool.length < 5) return;
    const better = pool.filter((v) => v > mine.value).length;
    rows.push({
      key,
      value: mine.value,
      median: median(pool),
      top: ranked ? Math.max(1, Math.ceil(((better + 1) / pool.length) * 100)) : null,
      pool: pool.length,
      games: mine.games,
    });
  };
  const role = (wl: WL) => ({ value: wl.w + wl.l ? wl.w / (wl.w + wl.l) : 0, games: wl.w + wl.l });
  add("winRate", (t) => ({ value: t.games ? t.wins / t.games : 0, games: t.games }), MIN_GAMES, true);
  add("civilian", (t) => role(t.civ), MIN_ROLE_GAMES, true);
  add("sheriff", (t) => role(t.sheriff), MIN_ROLE_GAMES, true);
  add("mafia", (t) => role(t.mafia), MIN_ROLE_GAMES, true);
  add("don", (t) => role(t.don), MIN_ROLE_GAMES, true);
  add("avgExtra", (t) => ({ value: t.games ? t.extra / t.games : 0, games: t.games }), MIN_GAMES, true);
  add("firstKilled", (t) => ({ value: t.games ? t.firstKilled / t.games : 0, games: t.games }), MIN_GAMES, false);
  return rows;
}
