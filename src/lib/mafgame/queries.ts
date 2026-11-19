import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Тег кеша турниров mafgame: сбрасывается после каждого импорта. */
export const MAFGAME_TAG = "mafgame";

export type TournamentLine = {
  mafgameId: number;
  name: string;
  startsOn: string | null;
  stars: number | null;
  players: number | null;
  place: number | null;
  games: number;
  wins: number;
  /** Дошёл до финала (последний этап турнира из нескольких). */
  finalist: boolean;
  /** Страница турнира на сайте, если он там есть. */
  slug: string | null;
};

type Row = {
  tournament_id: number;
  place: number | null;
  games: number;
  wins: number;
  stage: number;
  mafgame_tournaments: {
    name: string;
    starts_on: string | null;
    stars: number | null;
    players: number | null;
    stages: unknown[];
    tournaments: { slug: string } | null;
  } | null;
};

const COLS =
  "tournament_id, place, games, wins, stage, mafgame_tournaments!inner ( name, starts_on, stars, players, stages, tournaments ( slug ) )";

/** Турниры клуба (с mafgame), где играл игрок: по привязанному профилю и по нику (с учётом старых ников). */
export async function getPlayerTournaments(profileId: string | null, names: string[]): Promise<TournamentLine[]> {
  "use cache";
  cacheTag(MAFGAME_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured || !names.length) return [];
  const db = createPublicClient();
  const esc = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
  const [main, ...rest] = names;
  const queries = [
    db.from("mafgame_results").select(COLS).ilike("nickname", esc(main)).limit(500),
    rest.length ? db.from("mafgame_results").select(COLS).in("nickname", rest).limit(500) : null,
    profileId ? db.from("mafgame_results").select(COLS).eq("profile_id", profileId).limit(500) : null,
  ];
  const res = await Promise.all(queries.map((q) => q ?? Promise.resolve({ data: [], error: null })));
  for (const r of res) if (r.error) console.error("getPlayerTournaments failed", { code: r.error.code, message: r.error.message });

  const seen = new Map<number, TournamentLine>();
  for (const r of res.flatMap((x) => (x.data ?? []) as unknown as Row[])) {
    const t = r.mafgame_tournaments;
    if (!t || seen.has(r.tournament_id)) continue;
    const stages = Array.isArray(t.stages) ? t.stages.length : 1;
    seen.set(r.tournament_id, {
      mafgameId: r.tournament_id,
      name: t.name,
      startsOn: t.starts_on,
      stars: t.stars,
      players: t.players,
      place: r.place,
      games: r.games,
      wins: r.wins,
      finalist: stages > 1 && r.stage === stages,
      slug: t.tournaments?.slug ?? null,
    });
  }
  return [...seen.values()].sort((a, b) => (b.startsOn ?? "").localeCompare(a.startsOn ?? "") || b.mafgameId - a.mafgameId);
}
