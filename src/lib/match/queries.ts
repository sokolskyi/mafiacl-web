import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Action } from "./engine";
import type { SeatInfo } from "./types";

export type MatchRow = {
  id: number;
  clubId: number;
  gameId: number | null;
  number: number;
  tableNo: number;
  status: "live" | "finished" | "void";
  result: string | null;
  rated: boolean;
  showRoles: boolean;
  seats: SeatInfo[];
  log: Action[];
  version: number;
  clubSlug: string;
  judgeName: string | null;
  adjustments: Record<number, { extra: number; penalty: number }>;
};

/** Партия для экрана ведущего (RLS: только сотрудники клуба видят идущую). */
export async function getMatch(id: number): Promise<MatchRow | null> {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("matches")
    .select(
      "id, club_id, game_id, number, table_no, status, result, rated, show_roles, seats, log, version, clubs ( slug ), judge:profiles!matches_judge_id_fkey ( nickname, display_name ), match_players ( seat, extra, penalty )",
    )
    .eq("id", id)
    .maybeSingle();
  if (!m) return null;
  const judge = m.judge as unknown as { nickname: string | null; display_name: string | null } | null;
  const adjustments: MatchRow["adjustments"] = {};
  for (const p of (m.match_players ?? []) as { seat: number; extra: number; penalty: number }[]) {
    adjustments[p.seat] = { extra: Number(p.extra), penalty: Number(p.penalty) };
  }
  return {
    id: m.id,
    clubId: m.club_id,
    gameId: m.game_id,
    number: m.number,
    tableNo: m.table_no,
    status: m.status as MatchRow["status"],
    result: m.result,
    rated: m.rated,
    showRoles: m.show_roles,
    seats: (m.seats as { profile_id?: string | null; name: string }[]).map((s) => ({ profileId: s.profile_id ?? null, name: s.name })),
    log: m.log as Action[],
    version: m.version,
    clubSlug: (m.clubs as unknown as { slug: string } | null)?.slug ?? "",
    judgeName: judge?.nickname ?? judge?.display_name ?? null,
    adjustments,
  };
}

export type MatchListItem = { id: number; number: number; tableNo: number; status: string; result: string | null };

export async function getGameMatches(gameId: number): Promise<MatchListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, number, table_no, status, result")
    .eq("game_id", gameId)
    .order("number");
  return (data ?? []).map((m) => ({ id: m.id, number: m.number, tableNo: m.table_no, status: m.status, result: m.result }));
}

/** Ники игроков клуба для подсказки при рассадке (вошедшие на сайт). */
export async function getNicknames(): Promise<{ id: string; nickname: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, nickname").not("nickname", "is", null).order("nickname").limit(1000);
  return (data ?? []).map((p) => ({ id: p.id, nickname: p.nickname as string }));
}
