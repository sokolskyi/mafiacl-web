import type { HallEntry } from "@/lib/hallArchive";

export type Award = { id: number; year: number; title: string; season: string | null; category: HallEntry["category"]; place: number | null };
export type AwardCounts = Record<"season" | "tournament" | "mini", [number, number, number]>;

/** Ник в строке призёра: «YeS», «YeS и Морф», «Don'Tright & YeS». */
export function placeHas(place: string, nickname: string) {
  const n = nickname.toLowerCase();
  return place
    .split(/\s+и\s+|\s+i\s+|\s*&\s*|\s*\+\s*|\s*,\s*|\s*\/\s*/i)
    .some((p) => p.trim().toLowerCase() === n);
}

/** Призовые места игрока в зале славы (сезоны, турниры, мини-турниры) и его достижения. */
export function awardsOf(hall: HallEntry[], nickname: string) {
  const list: Award[] = [];
  const counts: AwardCounts = { season: [0, 0, 0], tournament: [0, 0, 0], mini: [0, 0, 0] };
  for (const e of hall) {
    const i = e.places.findIndex((p) => placeHas(p, nickname));
    if (i < 0) continue;
    if (e.category === "achievement") {
      list.push({ id: e.id, year: e.year, title: e.title, season: e.season, category: e.category, place: null });
      continue;
    }
    if (i > 2) continue;
    counts[e.category][i]++;
    list.push({ id: e.id, year: e.year, title: e.title, season: e.season, category: e.category, place: i + 1 });
  }
  list.sort((a, b) => b.year - a.year || (a.place ?? 9) - (b.place ?? 9));
  const medals = [0, 1, 2].map((i) => counts.season[i] + counts.tournament[i] + counts.mini[i]) as [number, number, number];
  return { list, counts, medals };
}
