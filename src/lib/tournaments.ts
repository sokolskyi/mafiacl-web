import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Localized } from "@/lib/games";
import { parseVideos, type VideoItem } from "@/lib/videos";

export const TOURNAMENTS_TAG = "tournaments";
export const SERIES = ["club", "kings", "mcl_europe", "other"] as const;
export type Series = (typeof SERIES)[number];

export type Tournament = {
  id: number;
  slug: string;
  name: string;
  series: Series;
  status: "announced" | "running" | "finished" | "cancelled";
  startsOn: string;
  endsOn: string | null;
  startsAt: string | null;
  city: string | null;
  venueName: string | null;
  venueAddress: string | null;
  organizer: string | null;
  description: Localized | null;
  coverUrl: string | null;
  registration: "none" | "external" | "internal";
  registrationUrl: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  /** Взнос в валюте currency (поле в базе исторически называется price_czk). */
  priceCzk: number | null;
  currency: "CZK" | "EUR";
  prizeFund: number | null;
  winners: string[];
  infoUrl: string | null;
  /** Плейлист на YouTube-канале клуба. */
  videoUrl: string | null;
  /** Отдельные видео (дни, финал, серии). */
  videos: VideoItem[];
};

export type Registration = { profileId: string; nickname: string; status: "registered" | "waitlist" };

const COLS =
  "id, slug, name, series, status, starts_on, ends_on, starts_at, city, venue_name, venue_address, organizer, description, cover_url, registration, registration_url, registration_closes_at, capacity, price_czk, currency, prize_fund, winners, info_url, video_url, videos";

type Row = Record<string, unknown>;
function map(t: Row): Tournament {
  return {
    id: t.id as number,
    slug: t.slug as string,
    name: t.name as string,
    series: t.series as Series,
    status: t.status as Tournament["status"],
    startsOn: t.starts_on as string,
    endsOn: (t.ends_on as string) ?? null,
    startsAt: (t.starts_at as string) ?? null,
    city: (t.city as string) ?? null,
    venueName: (t.venue_name as string) ?? null,
    venueAddress: (t.venue_address as string) ?? null,
    organizer: (t.organizer as string) ?? null,
    description: (t.description as Localized) ?? null,
    coverUrl: (t.cover_url as string) ?? null,
    registration: t.registration as Tournament["registration"],
    registrationUrl: (t.registration_url as string) ?? null,
    registrationClosesAt: (t.registration_closes_at as string) ?? null,
    capacity: (t.capacity as number) ?? null,
    priceCzk: t.price_czk === null || t.price_czk === undefined ? null : Number(t.price_czk),
    currency: (t.currency as "CZK" | "EUR") ?? "CZK",
    prizeFund: t.prize_fund === null || t.prize_fund === undefined ? null : Number(t.prize_fund),
    winners: (t.winners as string[]) ?? [],
    infoUrl: (t.info_url as string) ?? null,
    videoUrl: (t.video_url as string) ?? null,
    videos: parseVideos(t.videos),
  };
}

/** Опубликованные турниры клуба: ближайшие сначала, прошедшие — свежие сначала (кеш). */
export async function getTournaments(clubSlug: string): Promise<Tournament[]> {
  "use cache";
  cacheTag(TOURNAMENTS_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("tournaments")
    .select(`${COLS}, clubs!inner ( slug )`)
    .eq("clubs.slug", clubSlug)
    .neq("status", "draft")
    .order("starts_on", { ascending: true });
  if (error) console.error("getTournaments failed", { code: error.code, message: error.message });
  return (data ?? []).map((t) => map(t as Row));
}

export async function getTournament(slug: string): Promise<{ tournament: Tournament; registrations: Registration[] } | null> {
  "use cache";
  cacheTag(TOURNAMENTS_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = createPublicClient();
  const { data: t } = await db.from("tournaments").select(COLS).eq("slug", slug).neq("status", "draft").maybeSingle();
  if (!t) return null;
  const { data: regs } = await db
    .from("tournament_registrations")
    .select("profile_id, status, created_at, profiles ( nickname )")
    .eq("tournament_id", t.id)
    .neq("status", "cancelled")
    .order("created_at");
  return {
    tournament: map(t as Row),
    registrations: (regs ?? []).map((r) => ({
      profileId: r.profile_id,
      nickname: (r.profiles as unknown as { nickname: string | null } | null)?.nickname ?? "—",
      status: r.status as Registration["status"],
    })),
  };
}

export function formatMoney(locale: string, value: number, currency: "CZK" | "EUR") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(value);
}
