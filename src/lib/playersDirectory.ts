import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { HALL_ARCHIVE_TAG } from "@/lib/hallArchive";
import { ALIASES_TAG } from "@/lib/aliases";
import { getKnownPlayers } from "@/lib/playerNames";
import { MAFGAME_TAG } from "@/lib/mafgame/queries";
import { selectAll } from "@/lib/supabase/selectAll";

/** Турнир клуба на mafgame: от 20 участников. Серия — стол из 10 (с заменами до 12), от 8 игр подряд (MCL, GMC, CEC…). */
export function mafgameKind(players: number | null, stages: unknown): "tournament" | "series" | null {
  const n = players ?? 0;
  const sessions = Array.isArray(stages) ? stages.reduce((a: number, st) => a + (Number((st as { sessions?: unknown })?.sessions) || 0), 0) : 0;
  if (n >= 20) return "tournament";
  if (n >= 10 && n <= 12 && sessions >= 8) return "series";
  return null;
}

export type DirectoryPlayer = {
  nickname: string;
  /** Зарегистрирован на сайте. */
  registered: boolean;
  avatarUrl: string | null;
  /** Игры: архивы рейтингов сезонов + рейтинговые игры на сайте. */
  games: number;
  seasons: number;
  /** Лучшее место в сезоне (место в финале важнее места в таблице). */
  bestPlace: number | null;
  /** Медали сезонов и турниров: 1, 2, 3 места. */
  medals: [number, number, number];
  /** Победы в мини-турнирах. */
  minis: number;
  /** Турниры клуба на mafgame (от 20 участников). */
  tournamentCount: number;
  /** Серии клуба на mafgame (стол из 10–12, от 8 игр). */
  series: number;
  club: boolean;
  tournaments: boolean;
};

export type Directory = {
  players: DirectoryPlayer[];
  total: number;
  club: number;
  tournaments: number;
  both: number;
};

/** Все игроки клуба: по архивам рейтингов, залу славы, играм и регистрациям на турниры на сайте. */
export async function getPlayersDirectory(): Promise<Directory> {
  "use cache";
  cacheTag("matches", RATING_ARCHIVE_TAG, HALL_ARCHIVE_TAG, ALIASES_TAG, "tournaments", MAFGAME_TAG);
  cacheLife("hours");
  const empty: Directory = { players: [], total: 0, club: 0, tournaments: 0, both: 0 };
  if (!isSupabaseConfigured) return empty;
  const db = createPublicClient();
  const [known, { data: rows }, { data: hall }, { data: profiles }, { data: matches }, { data: regs }, { data: mafgame }] = await Promise.all([
    getKnownPlayers(),
    selectAll((a, b) => db.from("rating_archive_rows").select("nickname, rank, games, rating_archive!inner ( is_current, final_places )").order("id").range(a, b)),
    selectAll((a, b) => db.from("hall_of_fame").select("category, places").order("id").range(a, b)),
    db.from("profiles").select("id, nickname, avatar_url").not("nickname", "is", null).limit(10000),
    selectAll((a, b) =>
      db.from("match_players").select("profile_id, matches!inner ( rated, status )").eq("matches.status", "finished").eq("matches.rated", true).not("profile_id", "is", null)
        .order("match_id").order("seat").range(a, b),
    ),
    db.from("tournament_registrations").select("profile_id").limit(20000),
    selectAll((a, b) =>
      db.from("mafgame_results").select("tournament_id, nickname, profile_id, mafgame_tournaments!inner ( players, stages )").order("tournament_id").order("user_id").range(a, b),
    ),
  ]);

  const map = new Map<string, DirectoryPlayer>();
  const get = (name: string | null | undefined) => {
    const canon = name ? known[name.trim().toLowerCase()] : undefined;
    if (!canon) return null;
    const key = canon.toLowerCase();
    let p = map.get(key);
    if (!p) {
      p = { nickname: canon, registered: false, avatarUrl: null, games: 0, seasons: 0, bestPlace: null, medals: [0, 0, 0], minis: 0, tournamentCount: 0, series: 0, club: false, tournaments: false };
      map.set(key, p);
    }
    return p;
  };
  const better = (a: number | null, b: number) => (a === null || b < a ? b : a);

  const byId = new Map<string, DirectoryPlayer>();
  for (const pr of profiles ?? []) {
    const p = get(pr.nickname);
    if (!p) continue;
    p.registered = true;
    p.avatarUrl = pr.avatar_url;
    byId.set(pr.id, p);
  }
  for (const r of rows ?? []) {
    const p = get(r.nickname);
    if (!p) continue;
    const a = r.rating_archive as unknown as { is_current: boolean; final_places: string[] | null };
    p.games += r.games;
    p.seasons += 1;
    if (r.games > 0) p.club = true;
    const fp = a.is_current ? -1 : (a.final_places ?? []).findIndex((n) => known[n.toLowerCase()]?.toLowerCase() === p.nickname.toLowerCase());
    if (fp >= 0) p.bestPlace = better(p.bestPlace, fp + 1);
    else if (!a.is_current && r.rank > 0) p.bestPlace = better(p.bestPlace, r.rank);
  }
  for (const m of matches ?? []) {
    const p = m.profile_id ? byId.get(m.profile_id) : undefined;
    if (!p) continue;
    p.games += 1;
    p.club = true;
  }
  for (const r of regs ?? []) {
    const p = r.profile_id ? byId.get(r.profile_id) : undefined;
    if (p) p.tournaments = true;
  }
  // Турниры и серии с mafgame: игрок — по привязанному профилю, иначе по нику (с учётом старых ников).
  const counted = new Set<string>();
  for (const r of mafgame ?? []) {
    const t = r.mafgame_tournaments as unknown as { players: number | null; stages: unknown };
    const kind = mafgameKind(t.players, t.stages);
    if (!kind) continue;
    const p = (r.profile_id ? byId.get(r.profile_id) : undefined) ?? get(r.nickname);
    if (!p) continue;
    const key = `${p.nickname.toLowerCase()}:${r.tournament_id}`;
    if (counted.has(key)) continue;
    counted.add(key);
    if (kind === "tournament") p.tournamentCount += 1;
    else p.series += 1;
    p.tournaments = true;
  }
  for (const h of hall ?? []) {
    const places = (h.places as string[] | null) ?? [];
    places.forEach((place, i) => {
      for (const part of place.split(" и ")) {
        const p = get(part);
        if (!p) continue;
        if (h.category === "mini") {
          if (i === 0) p.minis += 1;
          p.club = true;
        } else if (h.category === "season" || h.category === "tournament") {
          if (i < 3) p.medals[i] += 1;
          if (h.category === "season") p.club = true;
          else p.tournaments = true;
        }
      }
    });
  }

  const players = [...map.values()].filter((p) => p.club || p.tournaments || p.registered);
  const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });
  players.sort((a, b) => collator.compare(a.nickname, b.nickname));
  return {
    players,
    total: players.length,
    club: players.filter((p) => p.club).length,
    tournaments: players.filter((p) => p.tournaments).length,
    both: players.filter((p) => p.club && p.tournaments).length,
  };
}
