/** Разбор страницы итогов турнира mafgame.org (/tournaments/{id}/results, Inertia data-page). Без сети — только текст. */

export type MafgameStage = { name: string; tables: number; sessions: number };

export type MafgameResult = {
  userId: number;
  nickname: string;
  club: string | null;
  /** id клуба на mafgame, за который игрок заявлен на турнир (MafiaCL = 4). */
  clubId: number | null;
  place: number;
  games: number;
  wins: number;
  /** Баллы последнего этапа, до которого дошёл игрок. */
  score: number | null;
  /** До какого этапа дошёл (1 — квалификация). */
  stage: number;
};

export type MafgameTournament = {
  id: number;
  clubId: number | null;
  name: string;
  startsOn: string | null;
  days: number | null;
  stars: number | null;
  status: string | null;
  stages: MafgameStage[];
  results: MafgameResult[];
};

const ENTITIES: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", "#039": "'", "#39": "'" };

function decodeAttr(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (ENTITIES[k]) return ENTITIES[k];
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return m;
  });
}

const int = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : typeof v === "string" && /^-?\d+$/.test(v) ? Number(v) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Достать props из HTML. null — на странице нет данных Inertia. */
export function inertiaProps(html: string): Record<string, unknown> | null {
  const m = html.match(/data-page="([^"]+)"/);
  if (!m) return null;
  try {
    const page = JSON.parse(decodeAttr(m[1])) as { props?: Record<string, unknown> };
    return page.props ?? null;
  } catch {
    return null;
  }
}

type Row = { player_id?: unknown; games_played?: unknown; scores?: { wins?: unknown; total_score?: unknown; games_total?: unknown } };
type StageRaw = { name?: unknown; tables?: unknown; sessions?: unknown; rows?: Row[] };
type PlayerRaw = { nickname?: unknown; user_id?: unknown; club_name?: unknown; club_id?: unknown };

/**
 * Итоги турнира. Место: сначала финалисты по порядку финала, затем выбывшие на предыдущем этапе по его порядку и т. д.
 * Игры — сумма сыгранных по этапам. Победы и баллы на mafgame обычно накопительные (последний этап включает прошлые);
 * если этап начинает счёт заново (games_total меньше сыгранного), победы складываются.
 */
export function parseResults(id: number, html: string): MafgameTournament | null {
  const props = inertiaProps(html);
  const t = props?.tournament as Record<string, unknown> | undefined;
  if (!t || int(t.id) !== id) return null;

  const rating = props?.rating as { results?: Record<string, StageRaw> } | undefined;
  const playersByStage = (props?.players ?? {}) as Record<string, Record<string, PlayerRaw>>;
  const stageKeys = Object.keys(rating?.results ?? {}).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));

  const stages: MafgameStage[] = [];
  type Acc = { userId: number; nickname: string; club: string | null; clubId: number | null; games: number; wins: number; score: number | null; stage: number; winsSum: number };
  const byUser = new Map<number, Acc>();
  const order: number[][] = [];

  stageKeys.forEach((key, idx) => {
    const st = rating!.results![key];
    stages.push({ name: str(st.name, 80) ?? `${idx + 1}`, tables: int(st.tables) ?? 0, sessions: int(st.sessions) ?? 0 });
    const players = playersByStage[key] ?? {};
    const stageOrder: number[] = [];
    for (const row of st.rows ?? []) {
      const pid = int(row.player_id);
      const info = pid != null ? players[String(pid)] : undefined;
      const userId = int(info?.user_id);
      const nickname = str(info?.nickname, 64);
      if (userId == null || !nickname) continue;
      const a = byUser.get(userId) ?? { userId, nickname, club: str(info?.club_name, 120), clubId: int(info?.club_id), games: 0, wins: 0, score: null, stage: 1, winsSum: 0 };
      const played = int(row.games_played) ?? 0;
      const total = int(row.scores?.games_total) ?? played;
      const w = int(row.scores?.wins) ?? 0;
      const cumulative = idx > 0 && total >= a.games + played && total > played;
      a.winsSum = cumulative ? w : a.winsSum + w;
      a.wins = a.winsSum;
      a.games += played;
      a.score = num(row.scores?.total_score);
      a.stage = idx + 1;
      byUser.set(userId, a);
      if (!stageOrder.includes(userId)) stageOrder.push(userId);
    }
    order.push(stageOrder);
  });

  const results: MafgameResult[] = [];
  const placed = new Set<number>();
  for (let s = order.length - 1; s >= 0; s--) {
    for (const userId of order[s]) {
      if (placed.has(userId)) continue;
      placed.add(userId);
      const a = byUser.get(userId)!;
      results.push({ userId: a.userId, nickname: a.nickname, club: a.club, clubId: a.clubId, games: a.games, wins: Math.min(a.wins, a.games), score: a.score, stage: a.stage, place: results.length + 1 });
    }
  }

  return {
    id,
    clubId: int(t.club_id),
    name: str(t.name, 200) ?? `#${id}`,
    startsOn: typeof t.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.start_date) ? t.start_date : null,
    days: int(t.days),
    stars: int(t.no_of_stars),
    status: str(t.status, 20),
    stages,
    results,
  };
}

/** Наибольший id турнира из списка на mafgame.org/tournaments (там видны и запланированные). */
export function maxListedId(html: string): number | null {
  const rows = ((inertiaProps(html)?.search_results as { data?: { id?: unknown }[] } | undefined)?.data ?? []).map((r) => int(r.id));
  const ids = rows.filter((x): x is number => x != null);
  return ids.length ? Math.max(...ids) : null;
}
