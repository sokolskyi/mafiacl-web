import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Тег кеша сыгранных партий: сбрасывается при сохранении итога партии. */
export const MATCHES_TAG = "matches";

export type PlayerRole = "civilian" | "sheriff" | "mafia" | "don";

export type PlayerGame = {
  matchId: number;
  number: number;
  table: number;
  club: string;
  playedAt: string;
  seat: number;
  role: PlayerRole;
  win: boolean;
  result: string;
  rated: boolean;
  points: number;
  firstKilled: boolean;
  bestMovePoints: number;
};

export type RoleStats = { games: number; wins: number; points: number };

export type PlayerPage = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  city: string | null;
  since: string;
  /** Номер участника клуба (после верификации). */
  memberNo: number | null;
  staff: { club: string; role: string }[];
  stats: {
    games: number;
    wins: number;
    points: number;
    byRole: Record<PlayerRole, RoleStats>;
    firstKilled: number;
    bestMoveHits: number; // ЛХ с баллами (2 или 3 чёрных)
    bestMovePoints: number;
    fouls: number;
    /** Поимённые голоса: красным — сколько раз в чёрных; чёрным — сколько раз в красных. */
    redVotes: { black: number; total: number };
    blackVotes: { red: number; total: number };
  };
  recent: PlayerGame[];
};

/** Публичная карточка игрока по нику (без учёта регистра). Считаются только рейтинговые сыгранные партии. */
export async function getPlayer(nick: string): Promise<PlayerPage | null> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured || !nick || nick.length > 32) return null;

  const db = createPublicClient();
  const pattern = nick.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: profiles } = await db
    .from("profiles")
    .select("id, nickname, avatar_url, city, created_at, member_no")
    .ilike("nickname", pattern)
    .limit(2);
  const p = profiles?.length === 1 ? profiles[0] : null;
  if (!p?.nickname) return null;

  const [{ data: staff }, { data: rows, error }] = await Promise.all([
    db.from("club_staff").select("role, clubs ( name )").eq("profile_id", p.id),
    db
      .from("match_players")
      .select(
        "seat, role, win, points, fouls, first_killed, best_move_points, votes_black, votes_red, matches!inner ( id, number, table_no, result, rated, finished_at, status, clubs ( name ) )",
      )
      .eq("profile_id", p.id)
      .eq("matches.status", "finished")
      .limit(5000),
  ]);
  if (error) console.error("getPlayer failed", { code: error.code, message: error.message });

  const games: PlayerGame[] = (rows ?? []).map((r) => {
    const m = r.matches as unknown as {
      id: number; number: number; table_no: number; result: string; rated: boolean; finished_at: string; clubs: { name: string } | null;
    };
    return {
      matchId: m.id,
      number: m.number,
      table: m.table_no,
      club: m.clubs?.name ?? "",
      playedAt: m.finished_at,
      seat: r.seat,
      role: r.role as PlayerRole,
      win: r.win,
      result: m.result,
      rated: m.rated,
      points: Number(r.points),
      firstKilled: r.first_killed,
      bestMovePoints: Number(r.best_move_points),
    };
  });
  games.sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  const rated = games.filter((g) => g.rated);
  const empty = (): RoleStats => ({ games: 0, wins: 0, points: 0 });
  const byRole: Record<PlayerRole, RoleStats> = { civilian: empty(), sheriff: empty(), mafia: empty(), don: empty() };
  let fouls = 0;
  const redVotes = { black: 0, total: 0 };
  const blackVotes = { red: 0, total: 0 };
  for (const g of rated) {
    const s = byRole[g.role];
    s.games++;
    if (g.win) s.wins++;
    s.points += g.points;
  }
  for (const r of rows ?? []) {
    if (!(r.matches as unknown as { rated: boolean }).rated) continue;
    fouls += r.fouls;
    if (r.role === "mafia" || r.role === "don") {
      blackVotes.red += r.votes_red;
      blackVotes.total += r.votes_red + r.votes_black;
    } else {
      redVotes.black += r.votes_black;
      redVotes.total += r.votes_red + r.votes_black;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  for (const s of Object.values(byRole)) s.points = round(s.points);

  return {
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatar_url,
    city: p.city ?? null,
    since: p.created_at,
    memberNo: p.member_no ?? null,
    staff: (staff ?? []).map((s) => ({ club: (s.clubs as unknown as { name: string } | null)?.name ?? "", role: s.role })),
    stats: {
      games: rated.length,
      wins: rated.filter((g) => g.win).length,
      points: round(rated.reduce((a, g) => a + g.points, 0)),
      byRole,
      firstKilled: rated.filter((g) => g.firstKilled).length,
      bestMoveHits: rated.filter((g) => g.bestMovePoints > 0).length,
      bestMovePoints: round(rated.reduce((a, g) => a + g.bestMovePoints, 0)),
      fouls,
      redVotes,
      blackVotes,
    },
    recent: games.slice(0, 30),
  };
}
