import index from "@/content/fiim/index.json";

/**
 * Архив турниров клуба с ФИИМ (fiim.world) и MafiaCl Championship 2013 (со скриншотов ВКонтакте).
 * Данные — статичные файлы в src/content/fiim/, их собирает scripts/fiim-parse.py из data/fiim/raw/
 * (страницы ФИИМ сохраняет GitHub Actions: scripts/fiim-archive.mjs).
 *
 * ours — турнир клуба (идёт в статистику клуба); project && !ours — отборочная серия лиги клуба
 * (Mafia Champions League, Mafia Stars), которую проводил другой клуб: показываем, но в статистику клуба не берём.
 */
export type ArchiveItem = {
  key: string;
  name: string;
  date: string;
  city: string;
  ours: boolean;
  project: boolean;
  /** Ключ финала, к которому относится этот этап (серия, полуфинал). */
  parent: string | null;
  /** Этап серии (в том числе без финала в архиве) — не отдельный розыгрыш турнира. */
  stage: boolean;
  /** Первые три места главной таблицы (итоговой или финала). */
  top: string[];
  players: number;
};

export type ArchiveRow = {
  place: number | string | null;
  nick: string;
  club: string | null;
  penalty: number | null;
  seat: number | null;
  total: number | null;
  values: Record<string, number | string | null>;
};

export type ArchiveStage = { title: string; note: string | null; columns: string[]; rows: ArchiveRow[] };

export type ArchiveTournament = {
  key: string;
  fiim_id: number | null;
  url: string | null;
  name: string;
  date: string;
  city: string;
  ours: boolean;
  project: boolean;
  source: string;
  legend: Record<string, string>;
  notes?: string[];
  stages: ArchiveStage[];
};

export const ARCHIVE = index as ArchiveItem[];

export const archiveYear = (x: { date: string }) => Number(x.date.slice(0, 4));

export const archiveItem = (key: string) => ARCHIVE.find((x) => x.key === key);

/** Этапы (серии, полуфиналы) финала по порядку дат: сначала проведённые клубом. */
export const archiveStagesOf = (key: string) =>
  ARCHIVE.filter((x) => x.parent === key).sort((a, z) => a.date.localeCompare(z.date) || a.name.localeCompare(z.name));

/** Полные таблицы турнира. Файл большой, поэтому грузится только на странице турнира. */
export async function getArchiveTournament(key: string): Promise<ArchiveTournament | null> {
  const all = (await import("@/content/fiim/archive.json")).default as unknown as ArchiveTournament[];
  return all.find((x) => x.key === key) ?? null;
}
