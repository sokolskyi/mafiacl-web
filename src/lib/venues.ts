import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Localized } from "@/lib/games";

export const VENUES_TAG = "venues";

export type VenueWithSchedule = {
  id: number;
  name: string;
  address: string | null;
  mapsUrl: string | null;
  slots: { weekday: number; time: string; title: Localized }[];
};

/** Площадки клуба и регулярные игры на них — для страницы «Контакты». */
export async function getVenues(clubSlug: string): Promise<VenueWithSchedule[]> {
  "use cache";
  cacheTag(VENUES_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("venues")
    .select("id, name, address, maps_url, clubs!inner ( slug ), game_schedules ( weekday, start_time, title, is_active )")
    .eq("clubs.slug", clubSlug)
    .eq("is_active", true)
    .order("id");
  if (error) console.error("getVenues failed", { code: error.code, message: error.message });
  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    mapsUrl: v.maps_url,
    slots: ((v.game_schedules ?? []) as { weekday: number; start_time: string; title: Localized; is_active: boolean }[])
      .filter((g) => g.is_active)
      .sort((a, b) => a.weekday - b.weekday)
      .map((g) => ({ weekday: g.weekday, time: g.start_time.slice(0, 5), title: g.title })),
  }));
}
