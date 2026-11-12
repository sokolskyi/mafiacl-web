import "server-only";
import type { RankRow, RankingKey, ReviewData } from "@/lib/reviews/types";

const LEGACY = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";
const TOP = 15;

type LegacyRow = { rank: number; nickname: string; points: number | null; count: number | null; best: number | null };
type LegacyKings = {
  season: { title: string; mainEvent: { title: string | null; from: string; to: string; prizeEur: number | null } };
  stats: Record<string, number | string | null> | null;
  rankings: Partial<Record<RankingKey, LegacyRow[] | null>>;
};

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** В Арене место определяет рейтинг (best), в остальных — сумма баллов. */
function rows(key: RankingKey, list: LegacyRow[] | null | undefined): RankRow[] | undefined {
  if (!list?.length) return undefined;
  return list.slice(0, TOP).map((x) => ({
    r: x.rank,
    n: x.nickname,
    v: Math.round(((key === "arena" ? x.best : x.points) ?? 0) * 100) / 100,
    c: num(x.count),
  }));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    console.error("review source failed", { url, message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

type MclFile = {
  finalISO?: string;
  kpi?: [string, string][];
  series?: { date: string; city: string; fl: string; top?: [string, number][]; semi?: number }[];
  squad?: { n?: string; c: string }[];
};

async function fetchMcl(year: number): Promise<MclFile | null> {
  try {
    const res = await fetch(`${LEGACY}/mcl/data/mcl${year}.js`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/window\.MCL\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    return m ? (JSON.parse(m[1]) as MclFile) : null;
  } catch (e) {
    console.error("review MCL source failed", { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/** Собрать снимок всех текущих рейтингов за месяц `month` (YYYY-MM). */
export async function collectReview(month: string, asOf: string, partial: boolean): Promise<ReviewData> {
  const year = Number(month.slice(0, 4));
  const [kings, mcl] = await Promise.all([fetchJson<LegacyKings>(`${LEGACY}/api/kings/current.json`), fetchMcl(year)]);

  const rankings: ReviewData["rankings"] = {};
  if (kings) {
    for (const key of ["premier", "arena", "mafiacl", "represent"] as const) {
      const r = rows(key, kings.rankings[key]);
      if (r) rankings[key] = r;
    }
  }

  return {
    month,
    asOf,
    partial,
    kings: kings
      ? {
          title: kings.season.title,
          eventTitle: kings.season.mainEvent?.title ?? null,
          eventFrom: kings.season.mainEvent?.from || null,
          eventTo: kings.season.mainEvent?.to || null,
          prizeEur: num(kings.season.mainEvent?.prizeEur),
          premierGames: num(kings.stats?.premier_games_total),
          arenaGames: num(kings.stats?.arena_games_total),
          clubTournaments: num(kings.stats?.club_tournaments_total),
          uniquePlayers: num(kings.stats?.unique_players_all_rankings),
        }
      : null,
    rankings,
    mcl: mcl
      ? {
          year,
          finalISO: mcl.finalISO ?? null,
          played: mcl.kpi?.[0]?.[0] ?? null,
          series: (mcl.series ?? [])
            .filter((s) => s.date?.startsWith(month) && s.top?.length)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((s) => ({ date: s.date, city: s.city, fl: s.fl, winner: s.top![0][0], score: s.top![0][1], semi: Boolean(s.semi) })),
          squad: (mcl.squad ?? []).filter((s): s is { n: string; c: string } => Boolean(s.n)).map((s) => ({ n: s.n, c: s.c })),
        }
      : null,
  };
}
