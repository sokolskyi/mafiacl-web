/** Отдельное видео турнира (например, трансляция дня с канала Mafs). */
export type VideoItem = { v: string; k: "day" | "final" | "series"; n?: number };

/** Разбирает jsonb-массив из базы, отбрасывая всё, что не похоже на видео YouTube. */
export function parseVideos(raw: unknown): VideoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const { v, k, n } = x as Record<string, unknown>;
    if (typeof v !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(v)) return [];
    if (k !== "day" && k !== "final" && k !== "series") return [];
    return [{ v, k, ...(typeof n === "number" ? { n } : {}) }];
  });
}
