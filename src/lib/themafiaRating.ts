import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Текущий сезон Premier League ведётся на the-mafia.net, пока игры не перешли на электронный бланк сайта.
 * Раз в день перечитываем таблицу сезона (`rating_archive.is_current` с `source_url` на the-mafia.net) и обновляем копию.
 */

type Row = {
  rank: number;
  nickname: string;
  points: number;
  extra: number;
  games: number;
  wins: number;
  best_player: number;
  first_killed: number;
  best_move3: number;
  best_move2: number;
  civ_w: number; civ_l: number;
  mafia_w: number; mafia_l: number;
  sheriff_w: number; sheriff_l: number;
  don_w: number; don_l: number;
};

export type ParsedRating = { games: number | null; civWins: number | null; mafiaWins: number | null; rows: Row[] };

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const num = (s: string) => {
  const n = Number(s.replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : 0;
};
const wl = (s: string): [number, number] => {
  const m = s.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};
const dd = (html: string, label: string) => {
  const m = html.match(new RegExp(`<dt>\\s*${label}\\s*</dt>\\s*<dd>([^<]*)</dd>`));
  return m ? num(m[1]) : null;
};

/** Разбор страницы рейтинга the-mafia.net: таблица `tournament-table` и сводка слева. */
export function parseThemafiaRating(html: string): ParsedRating {
  const table = html.match(/<table class="tournament-table[^"]*">([\s\S]*?)<\/table>/)?.[1] ?? "";
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const rows: Row[] = [];
  for (const tr of body.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (td.length < 14) continue;
    const nickname = decode(td[1].match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? td[1]);
    const rank = num(decode(td[0]));
    if (!nickname || !rank) continue;
    const [civ_w, civ_l] = wl(td[10]);
    const [mafia_w, mafia_l] = wl(td[11]);
    const [sheriff_w, sheriff_l] = wl(td[12]);
    const [don_w, don_l] = wl(td[13]);
    rows.push({
      rank,
      nickname,
      points: num(decode(td[2])),
      extra: num(decode(td[3])),
      games: num(decode(td[4])),
      wins: num(decode(td[5])),
      best_player: num(decode(td[6])),
      first_killed: num(decode(td[7])),
      best_move3: num(decode(td[8])),
      best_move2: num(decode(td[9])),
      civ_w, civ_l, mafia_w, mafia_l, sheriff_w, sheriff_l, don_w, don_l,
    });
  }
  return {
    games: dd(html, "Количество игр в рейтинге:"),
    civWins: dd(html, "Побед мирных:"),
    mafiaWins: dd(html, "Побед мафии:"),
    rows,
  };
}

/** Порог зачёта Premier League: больше, чем всего игр ÷ minShareDiv (5.01 — то есть от 20 %). */
const qualifiedOf = (games: number, total: number, div: number) => games > 0 && games > total / div;

export type RefreshReport = { season: string; games: number; rows: number; skipped?: string };

export async function refreshCurrentThemafiaSeasons(db: SupabaseClient, today: string): Promise<RefreshReport[]> {
  const { data: seasons, error } = await db
    .from("rating_archive")
    .select("id, slug, source_url, as_of, games, scoring")
    .eq("is_current", true)
    .like("source_url", "https://the-mafia.net/rate/%");
  if (error) throw new Error(`rating_archive: ${error.message}`);
  const out: RefreshReport[] = [];
  for (const s of seasons ?? []) {
    // Раз в день: игры у клуба по вторникам и воскресеньям, чаще не нужно.
    if (s.as_of && s.as_of >= today) {
      out.push({ season: s.slug, games: s.games, rows: 0, skipped: "fresh" });
      continue;
    }
    const res = await fetch(s.source_url, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "MafiaCL site (mafiacl.com)" } });
    if (!res.ok) throw new Error(`${s.slug}: HTTP ${res.status}`);
    const parsed = parseThemafiaRating(await res.text());
    // Защита от сломанной разметки: пустую или подозрительно короткую таблицу не сохраняем.
    const { count } = await db.from("rating_archive_rows").select("id", { count: "exact", head: true }).eq("archive_id", s.id);
    if (!parsed.games || parsed.rows.length === 0 || parsed.rows.length < Math.floor((count ?? 0) * 0.8)) {
      throw new Error(`${s.slug}: table not recognised (${parsed.rows.length} rows, ${parsed.games} games)`);
    }
    const div = Number((s.scoring as { minShareDiv?: number } | null)?.minShareDiv) || 5.01;
    const rows = parsed.rows.map((r) => ({ ...r, qualified: qualifiedOf(r.games, parsed.games!, div) }));
    const { error: rpcErr } = await db.rpc("rating_archive_replace", {
      p_id: s.id, p_rows: rows, p_games: parsed.games, p_civ: parsed.civWins, p_mafia: parsed.mafiaWins, p_as_of: today,
    });
    if (rpcErr) throw new Error(`${s.slug}: save: ${rpcErr.message}`);
    out.push({ season: s.slug, games: parsed.games, rows: rows.length });
  }
  return out;
}
