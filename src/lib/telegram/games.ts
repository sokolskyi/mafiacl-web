import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gameTitle, type Localized } from "@/lib/games";
import { escapeHtml } from "./api";
import type { BotLang } from "./texts";

const LOCALE: Record<BotLang, string> = { cs: "cs-CZ", ru: "ru-RU", uk: "uk-UA", en: "en-GB" };

export type BotGame = {
  id: number;
  startsAt: string;
  lateAfter: string | null;
  status: string;
  capacity: number;
  title: Localized | null;
  number: number | null;
  numberStyle: "arabic" | "roman";
  kind: string;
  venue: { name: string; address: string | null } | null;
  timezone: string;
  confirmed: number;
  /** Все активные записи: в очереди + в составе + в ожидании. */
  active: number;
  /** До этого момента записи — в очереди (вторники с приоритетом абонементов). */
  queueOpen: boolean;
};

export const GAME_SELECT = `id, starts_at, late_after, status, capacity, title, number, kind,
  game_schedules ( number_style ), venues ( name, address ), clubs ( cities ( timezone ) ),
  game_signups ( status ), priority_until, allocated_at`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBotGame(g: any): BotGame {
  const signups = (g.game_signups ?? []) as { status: string }[];
  return {
    id: g.id,
    startsAt: g.starts_at,
    lateAfter: g.late_after,
    status: g.status,
    capacity: g.capacity,
    title: g.title,
    number: g.number,
    numberStyle: g.game_schedules?.number_style === "roman" ? "roman" : "arabic",
    kind: g.kind,
    venue: g.venues ? { name: g.venues.name, address: g.venues.address } : null,
    timezone: g.clubs?.cities?.timezone ?? "Europe/Prague",
    confirmed: signups.filter((s) => s.status === "confirmed").length,
    active: signups.filter((s) => s.status !== "cancelled").length,
    queueOpen: !!g.priority_until && !g.allocated_at && new Date(g.priority_until) > new Date(),
  };
}

export async function upcomingGames(db: SupabaseClient, limit = 6) {
  const { data, error } = await db
    .from("games")
    .select(GAME_SELECT)
    .eq("status", "open")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit);
  if (error) throw new Error(`upcomingGames: ${error.message}`);
  return (data ?? []).map(toBotGame);
}

export function titleOf(g: BotGame, lang: BotLang) {
  const tpl = g.title?.[lang] ?? g.title?.cs;
  const fallback = { rating: "Mafia", fun: "Fun", tournament: "Tournament", corporate: "Corporate", kids: "Kids" }[g.kind] ?? "Mafia";
  return escapeHtml(tpl ? gameTitle(tpl, g.number, g.numberStyle) : fallback);
}

export function whenOf(g: BotGame, lang: BotLang, withDay = true) {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: g.timezone,
    ...(withDay ? { weekday: "short", day: "numeric", month: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(g.startsAt));
}

export function timeOf(iso: string, tz: string, lang: BotLang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function venueOf(g: BotGame) {
  if (!g.venue) return "";
  return escapeHtml(g.venue.address ? `${g.venue.name}, ${g.venue.address}` : g.venue.name);
}
