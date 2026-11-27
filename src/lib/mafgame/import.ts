import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { maxListedId, parseResults, type MafgameTournament } from "./parse";

const BASE = "https://mafgame.org";
/** Клуб MafiaCL на mafgame. */
export const MAFGAME_CLUB_ID = 4;
/** Арены считаются по электронному бланку на сайте — с mafgame за них Respect не начисляем. */
const NO_RESPECT = /arena|арена/i;
/** Как наш клуб называется на mafgame (клуб игрока в итогах турнира). */
const OUR_CLUB = /champions\s+league/i;

/** Призёры за MafiaCL: 1–3 место, в итогах стоит наш клуб. Арены — не турниры, без бонуса. */
function ourPodium(t: MafgameTournament) {
  if (t.status !== "closed" || !t.startsOn || NO_RESPECT.test(t.name)) return [];
  return t.results
    .filter((r) => r.place >= 1 && r.place <= 3 && r.club && OUR_CLUB.test(r.club))
    .map((r) => ({ userId: r.userId, nickname: r.nickname, place: r.place, club: r.club }));
}

async function savePodium(db: SupabaseClient, t: MafgameTournament): Promise<number> {
  const rows = ourPodium(t);
  if (!rows.length || !t.startsOn) return 0;
  const { data, error } = await db.rpc("podium_from_mafgame", { p_tournament: t.id, p_name: t.name, p_date: t.startsOn, p_rows: rows });
  if (error) throw new Error(`podium ${t.id}: ${error.message}`);
  return typeof data === "number" ? data : 0;
}

async function fetchHtml(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": "MafiaCL site importer (+https://mafiacl.com)", Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`mafgame ${path}: HTTP ${res.status}`);
  return res.text();
}

export async function fetchTournament(id: number): Promise<MafgameTournament | null> {
  const html = await fetchHtml(`/tournaments/${id}/results`);
  return html ? parseResults(id, html) : null;
}

/** id турниров mafgame, которые есть на сайте (ссылка регистрации или подробностей). */
async function siteLinks(db: SupabaseClient): Promise<Map<number, number>> {
  const { data, error } = await db.from("tournaments").select("id, registration_url, info_url").limit(1000);
  if (error) throw new Error(`site tournaments: ${error.message}`);
  const out = new Map<number, number>();
  for (const t of data ?? []) {
    for (const url of [t.registration_url, t.info_url]) {
      const m = typeof url === "string" ? url.match(/mafgame\.org\/tournaments\/(\d+)/) : null;
      if (m) out.set(Number(m[1]), t.id);
    }
  }
  return out;
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function save(db: SupabaseClient, t: MafgameTournament, siteId: number | undefined, isNew: boolean): Promise<number> {
  const row = {
    id: t.id,
    club_id: t.clubId,
    name: t.name,
    starts_on: t.startsOn,
    days: t.days,
    stars: t.stars,
    status: t.status,
    players: t.results.length,
    stages: t.stages,
    tournament_id: siteId ?? null,
    fetched_at: new Date().toISOString(),
    ...(isNew ? { respect: !NO_RESPECT.test(t.name) } : {}),
  };
  const { error } = await db.from("mafgame_tournaments").upsert(row);
  if (error) throw new Error(`save ${t.id}: ${error.message}`);
  const { error: delError } = await db.from("mafgame_results").delete().eq("tournament_id", t.id);
  if (delError) throw new Error(`clear ${t.id}: ${delError.message}`);
  if (t.results.length) {
    const { error: insError } = await db.from("mafgame_results").insert(
      t.results.map((r) => ({
        tournament_id: t.id,
        user_id: r.userId,
        nickname: r.nickname,
        club: r.club,
        place: r.place,
        games: r.games,
        wins: r.wins,
        score: r.score,
        stage: r.stage,
      })),
    );
    if (insError) throw new Error(`results ${t.id}: ${insError.message}`);
  }
  // Привязка к профилям и Respect (база сама проверит, положен ли он за этот турнир).
  const { data, error: rpcError } = await db.rpc("respect_award_mafgame", { p_tournament: t.id });
  if (rpcError) throw new Error(`respect ${t.id}: ${rpcError.message}`);
  return (typeof data === "number" ? data : 0) + (await savePodium(db, t));
}

export type ImportReport = { scanned: [number, number] | null; saved: number[]; respect: number; podiums: number; errors: string[] };

/**
 * Чужой турнир: ждём закрытия (список mafgame_watch), потом ищем призёров за MafiaCL.
 * Сам турнир и все итоги не сохраняем — только призовые места наших игроков.
 */
async function handleAway(db: SupabaseClient, t: MafgameTournament, report: ImportReport) {
  const closed = t.status === "closed" || NO_RESPECT.test(t.name);
  if (t.status === "closed") report.podiums += await savePodium(db, t);
  const { error } = await db.from("mafgame_watch").upsert({
    id: t.id,
    name: t.name.slice(0, 200),
    starts_on: t.startsOn,
    days: t.days,
    checked_at: new Date().toISOString(),
    done: closed,
  });
  if (error) throw new Error(`watch ${t.id}: ${error.message}`);
}

/**
 * Один проход импорта: обновить идущие и недавно закрытые турниры клуба, затем просмотреть следующие `scan` id
 * (до наибольшего id в списке турниров mafgame). `ids` — проверить только эти турниры.
 */
export async function runImport(db: SupabaseClient, opts: { ids?: number[]; scan?: number }): Promise<ImportReport> {
  const report: ImportReport = { scanned: null, saved: [], respect: 0, podiums: 0, errors: [] };
  const links = await siteLinks(db);
  const { data: known, error } = await db.from("mafgame_tournaments").select("id, status, starts_on, days, fetched_at").limit(5000);
  if (error) throw new Error(`known: ${error.message}`);
  const knownIds = new Set((known ?? []).map((k) => k.id as number));

  let targets: number[];
  let scanEnd: number | null = null;
  if (opts.ids?.length) {
    targets = [...new Set(opts.ids)];
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const refresh = (known ?? [])
      .filter((k) => {
        if (!k.starts_on || k.starts_on > today) return false;
        // Турнир старше месяца так и не закрыли на mafgame — больше не перечитываем.
        const month = new Date(`${k.starts_on}T00:00:00Z`);
        month.setUTCDate(month.getUTCDate() + (k.days ?? 1) + 30);
        if (new Date() > month) return false;
        if (k.status !== "closed") return true;
        // Итоги иногда правят после закрытия — перечитываем неделю после окончания.
        const end = new Date(`${k.starts_on}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() + (k.days ?? 1) + 7);
        return new Date(k.fetched_at) < end;
      })
      .map((k) => k.id as number);
    const linked = [...links.keys()].filter((id) => !knownIds.has(id));

    const from = await db.rpc("mafgame_next_id").then((r) => (typeof r.data === "number" ? r.data : 1));
    const listHtml = await fetchHtml("/tournaments");
    const upper = listHtml ? maxListedId(listHtml) : null;
    const scan = Math.max(0, Math.min(opts.scan ?? 30, 80));
    const to = upper ? Math.min(from + scan - 1, upper) : from - 1;
    const range = to >= from ? Array.from({ length: to - from + 1 }, (_, i) => from + i) : [];
    if (range.length) {
      report.scanned = [from, to];
      scanEnd = to;
    }
    // Чужие турниры, которые уже закончились, но ещё не закрыты: проверяем не чаще раза в 6 часов, до 20 за проход.
    const ago6h = new Date(Date.now() - 6 * 3600_000).toISOString();
    const since = new Date(Date.now() - 45 * 86400_000).toISOString().slice(0, 10);
    const { data: watch } = await db
      .from("mafgame_watch")
      .select("id, starts_on, days, checked_at")
      .eq("done", false)
      .lte("starts_on", today)
      .gte("starts_on", since)
      .or(`checked_at.is.null,checked_at.lt.${ago6h}`)
      .order("checked_at", { ascending: true, nullsFirst: true })
      .limit(20);
    const away = (watch ?? [])
      .filter((w) => {
        const end = new Date(`${w.starts_on}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() + (w.days ?? 1));
        return new Date() >= end;
      })
      .map((w) => w.id as number);
    targets = [...new Set([...refresh, ...linked, ...range, ...away])];
  }

  await pool(targets, 6, async (id) => {
    try {
      const t = await fetchTournament(id);
      if (!t) return;
      const siteId = links.get(id);
      if (t.clubId !== MAFGAME_CLUB_ID && siteId == null) {
        await handleAway(db, t, report);
        return;
      }
      report.respect += await save(db, t, siteId, !knownIds.has(id));
      report.saved.push(id);
    } catch (e) {
      report.errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // Обход идёт дальше, даже если отдельные id не открылись (их перечитает ручной запуск с ids).
  if (scanEnd != null) await db.rpc("mafgame_set_next_id", { p_id: scanEnd + 1 });
  report.saved.sort((a, b) => a - b);
  return report;
}
