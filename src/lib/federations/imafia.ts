import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isImafiaSeries, maxImafiaTournamentId, parseImafiaClubMembers, parseImafiaTournament, type ImafiaTournament } from "./imafiaParse";

const BASE = "https://imafia.org";
/** Клуб Mafia CL Prague на iMafia. */
export const IMAFIA_CLUB_ID = 50;
const UA = "Mozilla/5.0 (compatible; MafiaCL site importer; +https://mafiacl.com)";

async function page(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}lang=ua`, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "uk" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`imafia ${path}: HTTP ${res.status}`);
  return res.text();
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
/** Итоги считаем окончательными через 2 дня после последнего дня турнира (успевают апелляции). */
function settled(t: { startsOn: string | null; days: number }) {
  if (!t.startsOn) return false;
  const end = new Date(`${t.startsOn}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + t.days - 1 + 2);
  return new Date() >= end;
}

export type FederationReport = { scanned: [number, number] | null; checked: number; podiums: number; errors: string[] };

/**
 * iMafia: участник клуба Mafia CL Prague на iMafia занял 1–3 место в основном турнире (серии лиг — нет) →
 * Respect 30/20/10 (база проверяет дату запуска и аккаунт). Новые турниры — по id от последнего просмотренного,
 * будущие ждут в imafia_watch.
 */
export async function runImafia(db: SupabaseClient, opts: { scan?: number } = {}): Promise<FederationReport> {
  const report: FederationReport = { scanned: null, checked: 0, podiums: 0, errors: [] };
  const clubHtml = await page(`/club/${IMAFIA_CLUB_ID}`);
  const members = clubHtml ? parseImafiaClubMembers(clubHtml) : new Set<number>();
  if (!members.size) {
    const title = clubHtml?.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 80);
    throw new Error(`imafia: club members not found (${clubHtml ? `${clubHtml.length} bytes, title «${title ?? "—"}»` : "404"})`);
  }

  const process = async (t: ImafiaTournament) => {
    const rows = t.results.filter((r) => r.place <= 3 && members.has(r.userId));
    if (rows.length && t.startsOn) {
      const { data, error } = await db.rpc("podium_from_imafia", { p_tournament: t.id, p_name: t.name, p_date: t.startsOn, p_rows: rows });
      if (error) throw new Error(`podium ${t.id}: ${error.message}`);
      report.podiums += typeof data === "number" ? data : 0;
    }
  };
  const handle = async (id: number) => {
    const html = await page(`/tournament/${id}`);
    const t = html ? parseImafiaTournament(id, html) : null;
    report.checked++;
    if (!t) return;
    if (isImafiaSeries(t.type)) {
      await db.from("imafia_watch").upsert({ id, name: t.name, starts_on: t.startsOn, days: t.days, checked_at: new Date().toISOString(), done: true });
      return;
    }
    const done = settled(t);
    if (done) await process(t);
    const { error } = await db.from("imafia_watch").upsert({ id, name: t.name, starts_on: t.startsOn, days: t.days, checked_at: new Date().toISOString(), done });
    if (error) throw new Error(`watch ${id}: ${error.message}`);
  };

  // Ждущие турниры, которые уже закончились.
  const { data: watch } = await db
    .from("imafia_watch")
    .select("id, starts_on, days")
    .eq("done", false)
    .lte("starts_on", isoDay(new Date()))
    .order("starts_on")
    .limit(10);
  const due = (watch ?? []).filter((w) => settled({ startsOn: w.starts_on, days: w.days ?? 1 })).map((w) => w.id as number);

  // Новые id: от последнего просмотренного до наибольшего в списке турниров.
  const from = await db.rpc("imafia_next_id").then((r) => (typeof r.data === "number" ? r.data : 2000));
  const listHtml = await page("/tournaments");
  const upper = listHtml ? maxImafiaTournamentId(listHtml) : null;
  const scan = Math.max(0, Math.min(opts.scan ?? 10, 40));
  const to = upper ? Math.min(from + scan - 1, upper) : from - 1;
  const range = to >= from ? Array.from({ length: to - from + 1 }, (_, i) => from + i) : [];
  if (range.length) report.scanned = [from, to];

  for (const id of [...new Set([...due, ...range])]) {
    try {
      await handle(id);
    } catch (e) {
      report.errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (range.length) await db.rpc("imafia_set_next_id", { p_id: to + 1 });
  return report;
}
