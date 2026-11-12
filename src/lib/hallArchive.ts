import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const HALL_ARCHIVE_TAG = "hall-archive";

export type HallEntry = {
  id: number;
  city: string;
  year: number;
  category: "season" | "tournament" | "mini" | "achievement";
  title: string;
  season: string | null;
  places: string[];
  note: string | null;
  photos: string[];
};

/** Архив зала славы по годам: сезоны, турниры, мини-турниры, достижения игроков клуба. */
export async function getHallArchive(clubSlug: string): Promise<HallEntry[]> {
  "use cache";
  cacheTag(HALL_ARCHIVE_TAG);
  cacheLife("days");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("hall_of_fame")
    .select("id, city, year, category, title, season, places, note, photos, sort, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .order("year", { ascending: false })
    .order("sort");
  if (error) console.error("getHallArchive failed", { code: error.code, message: error.message });
  return (data ?? []).map((r) => ({
    id: r.id,
    city: r.city,
    year: r.year,
    category: r.category as HallEntry["category"],
    title: r.title,
    season: r.season,
    places: r.places ?? [],
    note: r.note,
    photos: r.photos ?? [],
  }));
}

/** Сколько раз игрок становился первым (сезоны, турниры, мини-турниры) — для «самых титулованных». */
export function topWinners(entries: HallEntry[], limit = 10) {
  const m = new Map<string, { name: string; seasons: number; tournaments: number; minis: number }>();
  for (const e of entries) {
    if (e.category === "achievement") continue;
    const name = e.places[0];
    if (!name) continue;
    const k = name.toLowerCase();
    const row = m.get(k) ?? { name, seasons: 0, tournaments: 0, minis: 0 };
    if (e.category === "season") row.seasons++;
    else if (e.category === "tournament") row.tournaments++;
    else row.minis++;
    m.set(k, row);
  }
  return [...m.values()]
    .map((r) => ({ ...r, total: r.seasons + r.tournaments + r.minis }))
    .sort((a, b) => b.seasons - a.seasons || b.tournaments - a.tournaments || b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, limit);
}
