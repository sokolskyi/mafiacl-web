import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Localized = Partial<Record<"cs" | "ru" | "uk" | "en", string>>;

export type UpcomingGame = {
  id: number;
  startsAt: string;
  lateAfter: string | null;
  title: Localized | null;
  kind: "rating" | "fun" | "tournament" | "corporate" | "kids";
  capacity: number;
  confirmed: number;
  waitlist: number;
  streamUrl: string | null;
  venue: { name: string; address: string | null; mapsUrl: string | null } | null;
  timezone: string;
};

export const GAMES_TAG = "games";

/** Ближайшие открытые игры клуба (кешируется, обновляется после каждой записи). */
export async function getUpcomingGames(clubSlug: string, limit = 12): Promise<UpcomingGame[]> {
  "use cache";
  cacheTag(GAMES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];

  const supabase = createPublicClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("games")
    .select(
      `id, starts_at, late_after, title, kind, capacity, stream_url,
       venues ( name, address, maps_url ),
       clubs!inner ( slug, cities ( timezone ) ),
       game_signups ( status )`,
    )
    .eq("clubs.slug", clubSlug)
    .eq("status", "open")
    .gte("starts_at", since)
    .order("starts_at")
    .limit(limit);

  if (error) {
    console.error("getUpcomingGames failed", { code: error.code, message: error.message });
    return [];
  }

  return (data ?? []).map((g) => {
    const signups = (g.game_signups ?? []) as { status: string }[];
    const venue = g.venues as unknown as { name: string; address: string | null; maps_url: string | null } | null;
    const club = g.clubs as unknown as { cities: { timezone: string } | null };
    return {
      id: g.id,
      startsAt: g.starts_at,
      lateAfter: g.late_after,
      title: g.title as Localized | null,
      kind: g.kind as UpcomingGame["kind"],
      capacity: g.capacity,
      confirmed: signups.filter((s) => s.status === "confirmed").length,
      waitlist: signups.filter((s) => s.status === "waitlist").length,
      streamUrl: g.stream_url,
      venue: venue ? { name: venue.name, address: venue.address, mapsUrl: venue.maps_url } : null,
      timezone: club?.cities?.timezone ?? "Europe/Prague",
    };
  });
}
