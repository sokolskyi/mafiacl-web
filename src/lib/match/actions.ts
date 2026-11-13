"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { MATCHES_TAG } from "@/lib/players";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { MatchError, isAction, replay, scores, voteStats, type Action } from "./engine";
import { MAX_SEATS, type SeatInfo } from "./types";

// Все записи идут от имени вошедшего ведущего: права проверяет RLS (сотрудник клуба).
// Журнал перед записью проигрывается движком — сломанный журнал в базу не попадёт.

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}
function int(value: unknown, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
const matchPath = (locale: Locale, id: number) =>
  getPathname({ href: { pathname: "/admin/matches/[id]", params: { id: String(id) } }, locale });
const gamePath = (locale: Locale, id: number, flag?: string) =>
  getPathname({ href: { pathname: "/admin/games/[id]", params: { id: String(id) } }, locale }) + (flag ? `?${flag}` : "");

function cleanSeats(raw: unknown): SeatInfo[] | null {
  if (!Array.isArray(raw) || raw.length !== MAX_SEATS) return null;
  const out: SeatInfo[] = [];
  for (const s of raw) {
    const name = String((s as SeatInfo)?.name ?? "").trim().slice(0, 80);
    const pid = (s as SeatInfo)?.profileId;
    if (pid !== null && pid !== undefined && !/^[0-9a-f-]{36}$/.test(String(pid))) return null;
    out.push({ profileId: pid ? String(pid) : null, name });
  }
  return out;
}
const seatsToDb = (seats: SeatInfo[]) => seats.map((s) => ({ profile_id: s.profileId, name: s.name }));

/** Новая партия на вечере: рассадка из подтверждённой записи (стол 1 — первые 10, стол 2 — следующие). */
export async function createMatch(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  const tableNo = int(formData.get("tableNo"), 1, 9);
  const numberRaw = String(formData.get("number") ?? "").trim();
  if (!gameId) redirect(getPathname({ href: "/admin", locale }));
  if (!tableNo) redirect(gamePath(locale, gameId, "error=invalid"));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: game } = await supabase.from("games").select("id, club_id").eq("id", gameId).maybeSingle();
  if (!game) redirect(gamePath(locale, gameId, "error=save"));

  let number = numberRaw ? int(numberRaw, 1, 10_000_000) : null;
  if (numberRaw && !number) redirect(gamePath(locale, gameId, "error=invalid"));
  if (!number) {
    const { data } = await supabase.rpc("next_match_number", { p_club_id: game.club_id });
    number = Number(data) || 1;
  }

  const { data: signups } = await supabase
    .from("game_signups")
    .select("profile_id, guest_name, has_priority, created_at, profiles!game_signups_profile_id_fkey ( nickname, display_name )")
    .eq("game_id", gameId)
    .eq("status", "confirmed")
    .order("has_priority", { ascending: false })
    .order("created_at");
  const pool = (signups ?? []).map((s) => {
    const p = s.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
    return { profileId: s.profile_id as string | null, name: s.guest_name ?? p?.nickname ?? p?.display_name ?? "" };
  });
  const slice = pool.slice((tableNo - 1) * MAX_SEATS, tableNo * MAX_SEATS);
  const seats: SeatInfo[] = Array.from({ length: MAX_SEATS }, (_, i) => slice[i] ?? { profileId: null, name: "" });

  const { data: m, error } = await supabase
    .from("matches")
    .insert({ club_id: game.club_id, game_id: gameId, number, table_no: tableNo, judge_id: claims?.claims.sub ?? null, seats: seatsToDb(seats) })
    .select("id")
    .single();
  if (error || !m) {
    console.error("createMatch failed", { gameId, code: error?.code, message: error?.message });
    redirect(gamePath(locale, gameId, error?.code === "23505" ? "error=matchNumber" : "error=save"));
  }
  redirect(matchPath(locale, m.id));
}

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; reason: "conflict"; version: number; log: Action[]; seats: SeatInfo[] }
  | { ok: false; reason: "invalid" | "closed" | "error"; code?: string };

/** Сохранить журнал (и рассадку). version — что видел ведущий; если кто-то записал раньше — конфликт. */
export async function saveMatch(input: { id: number; version: number; log: unknown; seats?: unknown }): Promise<SaveResult> {
  const id = int(input.id, 1, Number.MAX_SAFE_INTEGER);
  const version = int(input.version, 0, Number.MAX_SAFE_INTEGER);
  if (!id || version === null || !Array.isArray(input.log) || input.log.length > 2000 || !input.log.every(isAction)) {
    return { ok: false, reason: "invalid" };
  }
  const log = input.log as Action[];
  try {
    replay(log);
  } catch (e) {
    return { ok: false, reason: "invalid", code: e instanceof MatchError ? e.code : "bad" };
  }
  const seats = input.seats === undefined ? undefined : cleanSeats(input.seats);
  if (seats === null) return { ok: false, reason: "invalid", code: "seats" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ log, version: version + 1, ...(seats ? { seats: seatsToDb(seats) } : {}) })
    .eq("id", id)
    .eq("version", version)
    .eq("status", "live")
    .select("version");
  if (error) {
    console.error("saveMatch failed", { id, code: error.code, message: error.message });
    return { ok: false, reason: "error" };
  }
  if (data?.length) return { ok: true, version: data[0].version };

  const { data: cur } = await supabase.from("matches").select("status, version, log, seats").eq("id", id).maybeSingle();
  if (!cur || cur.status !== "live") return { ok: false, reason: "closed" };
  return {
    ok: false,
    reason: "conflict",
    version: cur.version,
    log: cur.log as Action[],
    seats: (cur.seats as { profile_id?: string | null; name: string }[]).map((s) => ({ profileId: s.profile_id ?? null, name: s.name })),
  };
}

export async function setShowRoles(input: { id: number; value: boolean }) {
  const id = int(input.id, 1, Number.MAX_SAFE_INTEGER);
  if (!id) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ show_roles: !!input.value }).eq("id", id);
  return { ok: !error };
}

/** Итог: журнал должен быть завершён; допы/штрафы — от ведущего. Пишем строки игроков и закрываем партию. */
export async function finishMatch(input: {
  id: number;
  version: number;
  rated: boolean;
  adjustments: Record<string, { extra?: number; penalty?: number }>;
}): Promise<{ ok: boolean; code?: string }> {
  const id = int(input.id, 1, Number.MAX_SAFE_INTEGER);
  if (!id) return { ok: false, code: "invalid" };
  const supabase = await createClient();
  const { data: m } = await supabase.from("matches").select("id, status, version, log, seats").eq("id", id).maybeSingle();
  if (!m) return { ok: false, code: "invalid" };
  if (m.version !== input.version) return { ok: false, code: "conflict" };

  let state;
  try {
    state = replay(m.log as Action[]);
  } catch {
    return { ok: false, code: "invalid" };
  }
  if (state.phase !== "finished" || !state.result) return { ok: false, code: "notFinished" };

  const adj: Record<number, { extra: number; penalty: number }> = {};
  for (let seat = 1; seat <= MAX_SEATS; seat++) {
    const a = input.adjustments?.[String(seat)] ?? {};
    const extra = Math.round(Number(a.extra ?? 0) * 100) / 100;
    const penalty = Math.round(Number(a.penalty ?? 0) * 100) / 100;
    if (!(extra >= -5 && extra <= 5) || !(penalty >= 0 && penalty <= 5)) return { ok: false, code: "range" };
    adj[seat] = { extra, penalty };
  }
  const seats = (m.seats as { profile_id?: string | null; name: string }[]) ?? [];
  if (seats.some((s) => !s?.name?.trim())) return { ok: false, code: "seats" };

  const votes = voteStats(state);
  const rows = scores(state, adj).map((sc) => {
    const seat = sc.seat;
    return {
      match_id: id,
      seat,
      profile_id: seats[seat - 1]?.profile_id ?? null,
      name: seats[seat - 1].name.trim(),
      role: state.roles[seat] ?? "civilian",
      fouls: state.fouls[seat] ?? 0,
      out_reason: state.out[seat]?.reason ?? null,
      out_round: state.out[seat]?.round ?? null,
      first_killed: state.firstKilled === seat,
      best_move: state.firstKilled === seat ? state.bestMove : null,
      win: sc.win,
      best_move_points: sc.bestMove,
      extra: sc.extra,
      penalty: sc.penalty,
      points: sc.total,
      votes_black: votes[sc.seat]?.black ?? 0,
      votes_red: votes[sc.seat]?.red ?? 0,
    };
  });

  const del = await supabase.from("match_players").delete().eq("match_id", id);
  if (del.error) return { ok: false, code: "save" };
  const ins = await supabase.from("match_players").insert(rows);
  if (ins.error) {
    console.error("finishMatch players failed", { id, code: ins.error.code, message: ins.error.message });
    return { ok: false, code: "save" };
  }
  const { error } = await supabase
    .from("matches")
    .update({ status: "finished", result: state.result, rated: !!input.rated, finished_at: new Date().toISOString(), version: m.version + 1 })
    .eq("id", id)
    .eq("version", m.version);
  if (error) {
    console.error("finishMatch failed", { id, code: error.code, message: error.message });
    return { ok: false, code: "save" };
  }
  // Respect за партию: начисляет база, повторное сохранение итога не удваивает.
  if (isAdminConfigured) {
    const award = await createAdminClient().rpc("respect_award_match", { p_match: id });
    if (award.error) console.error("respect_award_match failed", { id, code: award.error.code, message: award.error.message });
  }
  updateTag(MATCHES_TAG);
  return { ok: true };
}

/** Вернуть сыгранную партию на редактирование (исправить ошибку в бланке). */
export async function reopenMatch(input: { id: number }) {
  const id = int(input.id, 1, Number.MAX_SAFE_INTEGER);
  if (!id) return { ok: false };
  const supabase = await createClient();
  const { data: m } = await supabase.from("matches").select("version").eq("id", id).maybeSingle();
  if (!m) return { ok: false };
  const { error } = await supabase
    .from("matches")
    .update({ status: "live", result: null, finished_at: null, version: m.version + 1 })
    .eq("id", id);
  if (!error) updateTag(MATCHES_TAG);
  return { ok: !error };
}
