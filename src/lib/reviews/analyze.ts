import { KINGS_ZONE, RANKINGS, type RankRow, type RankingKey, type ReviewData } from "@/lib/reviews/types";

export type RankingInsight = {
  key: RankingKey;
  rows: (RankRow & { delta: number | null; isNew: boolean })[];
  leader: RankRow;
  previousLeader: string | null;
  climber: { n: string; from: number; to: number } | null;
  newcomers: string[];
  zone: string[];
};

const norm = (s: string) => s.trim().toLowerCase();

/** Сравнить рейтинг с прошлым обзором: смена лидера, кто поднялся сильнее всех, новички в топ-10. */
export function analyze(review: ReviewData, previous: ReviewData | null): RankingInsight[] {
  const out: RankingInsight[] = [];
  for (const key of RANKINGS) {
    const cur = review.rankings[key];
    if (!cur?.length) continue;
    const prev = previous?.rankings[key] ?? null;
    const prevRank = new Map((prev ?? []).map((r) => [norm(r.n), r.r]));

    const rows = cur.slice(0, 10).map((r) => {
      const was = prevRank.get(norm(r.n));
      return { ...r, delta: prev && was ? was - r.r : null, isNew: Boolean(prev) && (!was || was > 10) };
    });

    let climber: RankingInsight["climber"] = null;
    if (prev) {
      for (const r of cur) {
        const was = prevRank.get(norm(r.n));
        if (was && was - r.r >= 2 && (!climber || was - r.r > climber.from - climber.to)) climber = { n: r.n, from: was, to: r.r };
      }
    }

    out.push({
      key,
      rows,
      leader: cur[0],
      previousLeader: prev?.[0] && norm(prev[0].n) !== norm(cur[0].n) ? prev[0].n : null,
      climber,
      newcomers: rows.filter((r) => r.isNew).map((r) => r.n),
      zone: cur.slice(0, KINGS_ZONE[key]).map((r) => r.n),
    });
  }
  return out;
}
