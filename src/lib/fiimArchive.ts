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
  /** Точной даты нет (старый сайт клуба) — показываем только год. */
  approx_date: boolean;
  /** Год розыгрыша, если он не совпадает с датой (финал сезона 2022/2023 Europe прошёл в январе 2024). */
  season_year: number | null;
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

export type ArchiveGamePlayer = {
  seat: number;
  nick: string;
  role: "citizen" | "mafia" | "don" | "sheriff" | null;
  fouls: number | null;
  /** Лучший игрок по версии ведущего: 1, 2 или 3. */
  best: number | null;
  killed_first: boolean;
  /** Лучший ход убитого первым (номера мест). */
  best_move: number[] | null;
  penalty: number | null;
};

/** Протокол игры со старого сайта клуба. */
export type ArchiveGame = { id: number; number: number; date: string | null; host: string | null; winner: "town" | "mafia" | null; players: ArchiveGamePlayer[] };

export type ArchiveStage = {
  title: string;
  note: string | null;
  columns: string[];
  rows: ArchiveRow[];
  /** Протоколы игр этапа (только то, что сохранилось в веб-архиве). */
  games?: ArchiveGame[];
  games_total?: number;
};

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
  approx_date?: boolean;
  legend: Record<string, string>;
  notes?: string[];
  stages: ArchiveStage[];
};

export const ARCHIVE = index as ArchiveItem[];

export const archiveYear = (x: { date: string; season_year?: number | null }) => x.season_year ?? Number(x.date.slice(0, 4));

/** Европа или Украина — для лиг с двумя конференциями (MCL 2022/2023). */
export function archiveRegion(x: { name: string; city: string }): "EU" | "UA" | null {
  if (/europe/i.test(x.name)) return "EU";
  if (/ukrain|україн|украин/i.test(x.name)) return "UA";
  if (/праг|praha|prague/i.test(x.city)) return "EU";
  if (/харьк|харків|kharkiv/i.test(x.city)) return "UA";
  return null;
}

export const archiveItem = (key: string) => ARCHIVE.find((x) => x.key === key);

/** Этапы (серии, полуфиналы) финала по порядку дат: сначала проведённые клубом. */
export const archiveStagesOf = (key: string) =>
  ARCHIVE.filter((x) => x.parent === key).sort((a, z) => a.date.localeCompare(z.date) || a.name.localeCompare(z.name));

/** Полные таблицы турнира. Файл большой, поэтому грузится только на странице турнира. */
export async function getArchiveTournament(key: string): Promise<ArchiveTournament | null> {
  const all = (await import("@/content/fiim/archive.json")).default as unknown as ArchiveTournament[];
  return all.find((x) => x.key === key) ?? null;
}
