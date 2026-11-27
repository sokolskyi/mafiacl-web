import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FederationReport } from "./imafia";

const API = "https://api-v1.emotion.games";
/** Клуб MafiaCL Prague на Emotion Games. */
export const EMOTION_CLUB_ID = 59;
/** type_id в API: 1 — основной турнир, 2 — серии (Olympic и т.п.), 3 — командные. Считаем только 1. */
const MAIN_TOURNAMENT = 1;
/** stage = 3 — турнир завершён. */
const FINISHED = 3;

type Info = { id: number; name: string; start_date: string; type_id: number; stage: number };
type Row = { profile_id: number; nickname: string; place: number };

async function api<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "MafiaCL site importer (+https://mafiacl.com)" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`emotion ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** id игроков, состоящих в клубе в этом году (состав на EG ведётся по годам). */
async function members(year: number, cache: Map<number, Set<number>>) {
  const hit = cache.get(year);
  if (hit) return hit;
  const ids = new Set<number>();
  for (let page = 1; page <= 10; page++) {
    const r = await api<{ members?: { player_id?: number; profile_id?: number }[]; members_pagination?: { total_pages?: number } }>(
      `/club/clubs/${EMOTION_CLUB_ID}?page=${page}&per_page=100&year=${year}`,
    );
    for (const m of r?.members ?? []) {
      const id = Number(m.player_id ?? m.profile_id);
      if (Number.isInteger(id)) ids.add(id);
    }
    if (!r || page >= (r.members_pagination?.total_pages ?? 1)) break;
  }
  cache.set(year, ids);
  return ids;
}

/**
 * Emotion Games: участник клуба MafiaCL Prague на EG (состав за год турнира) занял 1–3 место в основном
 * завершённом турнире → Respect 30/20/10. Новые турниры — по id, незавершённые ждут в emotion_watch.
 */
export async function runEmotion(db: SupabaseClient, opts: { scan?: number } = {}): Promise<FederationReport> {
  const report: FederationReport = { scanned: null, checked: 0, podiums: 0, errors: [] };
  const roster = new Map<number, Set<number>>();

  const handle = async (id: number): Promise<boolean> => {
    const r = await api<{ info?: Info }>(`/tournament/tournaments/json_info/${id}`);
    const t = r?.info;
    report.checked++;
    if (!t || !t.name) return false;
    const startsOn = t.start_date ? t.start_date.slice(0, 10) : null;
    const main = t.type_id === MAIN_TOURNAMENT;
    const done = !main || t.stage === FINISHED;
    if (main && t.stage === FINISHED && startsOn) {
      const res = await api<{ tables?: { combined?: { rows?: Row[] } } }>(`/tournament/tournaments/results_tab/${id}`);
      const club = await members(Number(startsOn.slice(0, 4)), roster);
      const rows = (res?.tables?.combined?.rows ?? [])
        .filter((x) => x.place >= 1 && x.place <= 3 && club.has(x.profile_id))
        .map((x) => ({ userId: x.profile_id, nickname: x.nickname, place: x.place }));
      if (rows.length) {
        const { data, error } = await db.rpc("podium_from_emotion", { p_tournament: id, p_name: t.name, p_date: startsOn, p_rows: rows });
        if (error) throw new Error(`podium ${id}: ${error.message}`);
        report.podiums += typeof data === "number" ? data : 0;
      }
    }
    const { error } = await db.from("emotion_watch").upsert({ id, name: t.name.slice(0, 200), starts_on: startsOn, checked_at: new Date().toISOString(), done });
    if (error) throw new Error(`watch ${id}: ${error.message}`);
    return true;
  };

  // Незавершённые основные турниры, дата которых прошла: проверяем не чаще раза в 6 часов.
  const ago6h = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data: watch } = await db
    .from("emotion_watch")
    .select("id")
    .eq("done", false)
    .lte("starts_on", new Date().toISOString().slice(0, 10))
    .or(`checked_at.is.null,checked_at.lt.${ago6h}`)
    .limit(10);
  for (const w of watch ?? []) {
    try {
      await handle(w.id as number);
    } catch (e) {
      report.errors.push(`${w.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Новые id: окно от последнего найденного; указатель двигаем только до найденных (дальше турниров ещё нет).
  const from = await db.rpc("federation_next_id", { p_name: "emotion" }).then((r) => (typeof r.data === "number" ? r.data : 575));
  const scan = Math.max(0, Math.min(opts.scan ?? 10, 40));
  let lastFound: number | null = null;
  for (let id = from; id < from + scan; id++) {
    try {
      if (await handle(id)) lastFound = id;
    } catch (e) {
      report.errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  report.scanned = scan ? [from, from + scan - 1] : null;
  if (lastFound != null) await db.rpc("federation_set_next_id", { p_name: "emotion", p_id: lastFound + 1 });
  return report;
}
