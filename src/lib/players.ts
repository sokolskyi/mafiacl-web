import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { ALIASES_TAG, getAliases, namesOf } from "@/lib/aliases";

/** Тег кеша сыгранных партий: сбрасывается при сохранении итога партии. */
export const MATCHES_TAG = "matches";

export type PlayerRole = "civilian" | "sheriff" | "mafia" | "don";

export type PlayerGame = {
  matchId: number;
  number: number;
  table: number;
  club: string;
  playedAt: string;
  seat: number;
  role: PlayerRole;
  win: boolean;
  result: string;
  rated: boolean;
  points: number;
  firstKilled: boolean;
  bestMovePoints: number;
};

export type RoleStats = { games: number; wins: number; points: number };

/** Строка игрока в архивном рейтинге сезона (Premier League, Liga Mova, First League). */
export type ArchiveLine = {
  slug: string;
  title: string;
  league: string;
  year: number;
  isCurrent: boolean;
  rank: number;
  games: number;
  /** Победы известны только там, где таблица сезона ведёт роли. */
  wins: number | null;
  /** Рейтинг по формуле сезона (у каждой лиги своя шкала). */
  points: number;
  /** Место по итогам финала сезона, если игрок в призёрах. */
  finalPlace: number | null;
  /** Первый убиенный, доля от игр (только где таблица ведёт роли). */
  firstKilled: number | null;
  /** Средний доп за игру (только где таблица ведёт роли). */
  avgExtra: number | null;
};

export type PlayerPage = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  city: string | null;
  since: string;
  /** Номер участника клуба (после верификации). */
  memberNo: number | null;
  /** ID игрока на markery.online. */
  markeryId: number | null;
  /** Старые ники игрока (архивы и зал славы засчитываются и под ними). */
  aliases: string[];
  staff: { club: string; role: string }[];
  stats: {
    /** Все партии: сайт + архивные рейтинги сезонов. */
    games: number;
    /** Партии с известным итогом (для процента побед). */
    decided: number;
    wins: number;
    /** Рейтинговые партии, сыгранные по электронному бланку на сайте (баллы и фолы — только по ним). */
    siteGames: number;
    points: number;
    byRole: Record<PlayerRole, RoleStats>;
    firstKilled: number;
    bestMoveHits: number; // ЛХ с баллами (2 или 3 чёрных)
    bestMovePoints: number;
    /** «Лучший игрок» партии в таблицах сезонов. */
    bestPlayer: number;
    /** Сумма допов и число партий, по которым она известна (архив Premier League). */
    extra: number;
    extraGames: number;
    fouls: number;
    /** Поимённые голоса: красным — сколько раз в чёрных; чёрным — сколько раз в красных. */
    redVotes: { black: number; total: number };
    blackVotes: { red: number; total: number };
  };
  recent: PlayerGame[];
  archive: ArchiveLine[];
};

/** Публичная карточка игрока по нику (без учёта регистра): рейтинговые партии на сайте и архивные рейтинги сезонов. */
export async function getPlayer(nick: string): Promise<PlayerPage | null> {
  "use cache";
  cacheTag(MATCHES_TAG);
  cacheTag(RATING_ARCHIVE_TAG, ALIASES_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured || !nick || nick.length > 32) return null;

  const db = createPublicClient();
  const pattern = nick.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: profiles } = await db
    .from("profiles")
    .select("id, nickname, avatar_url, city, created_at, member_no, markery_id")
    .ilike("nickname", pattern)
    .limit(2);
  const p = profiles?.length === 1 ? profiles[0] : null;
  if (!p?.nickname) return null;

  const aliasNames = namesOf(await getAliases(), p.nickname).slice(1);
  const ARCH_COLS =
    "rank, nickname, points, score, extra, best_player, games, wins, first_killed, best_move2, best_move3, civ_w, civ_l, mafia_w, mafia_l, sheriff_w, sheriff_l, don_w, don_l, rating_archive!inner ( slug, title, league, year, is_current, final_places )";
  const [{ data: staff }, { data: rows, error }, { data: archMain, error: archError }, { data: archAlias }] = await Promise.all([
    db.from("club_staff").select("role, clubs ( name )").eq("profile_id", p.id),
    db
      .from("match_players")
      .select(
        "seat, role, win, points, fouls, first_killed, best_move_points, votes_black, votes_red, matches!inner ( id, number, table_no, result, rated, finished_at, status, clubs ( name ) )",
      )
      .eq("profile_id", p.id)
      .eq("matches.status", "finished")
      .limit(5000),
    db
      .from("rating_archive_rows")
      .select(ARCH_COLS)
      .ilike("nickname", pattern)
      .limit(200),
    aliasNames.length
      ? db.from("rating_archive_rows").select(ARCH_COLS).in("nickname", aliasNames).limit(200)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  if (error) console.error("getPlayer failed", { code: error.code, message: error.message });
  if (archError) console.error("getPlayer archive failed", { code: archError.code, message: archError.message });
  const arch = [...(archMain ?? []), ...((archAlias ?? []) as NonNullable<typeof archMain>)];
  const myNames = new Set([p.nickname, ...aliasNames].map((n) => n.toLowerCase()));

  const games: PlayerGame[] = (rows ?? []).map((r) => {
    const m = r.matches as unknown as {
      id: number; number: number; table_no: number; result: string; rated: boolean; finished_at: string; clubs: { name: string } | null;
    };
    return {
      matchId: m.id,
      number: m.number,
      table: m.table_no,
      club: m.clubs?.name ?? "",
      playedAt: m.finished_at,
      seat: r.seat,
      role: r.role as PlayerRole,
      win: r.win,
      result: m.result,
      rated: m.rated,
      points: Number(r.points),
      firstKilled: r.first_killed,
      bestMovePoints: Number(r.best_move_points),
    };
  });
  games.sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  const rated = games.filter((g) => g.rated);
  const empty = (): RoleStats => ({ games: 0, wins: 0, points: 0 });
  const byRole: Record<PlayerRole, RoleStats> = { civilian: empty(), sheriff: empty(), mafia: empty(), don: empty() };
  let fouls = 0;
  const redVotes = { black: 0, total: 0 };
  const blackVotes = { red: 0, total: 0 };
  for (const g of rated) {
    const s = byRole[g.role];
    s.games++;
    if (g.win) s.wins++;
    s.points += g.points;
  }
  for (const r of rows ?? []) {
    if (!(r.matches as unknown as { rated: boolean }).rated) continue;
    fouls += r.fouls;
    if (r.role === "mafia" || r.role === "don") {
      blackVotes.red += r.votes_red;
      blackVotes.total += r.votes_red + r.votes_black;
    } else {
      redVotes.black += r.votes_black;
      redVotes.total += r.votes_red + r.votes_black;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  for (const s of Object.values(byRole)) s.points = round(s.points);

  // Архивные рейтинги сезонов: игры, роли, первый убиенный, лучший ход.
  let archGames = 0;
  let archDecided = 0;
  let archWins = 0;
  let archKilled = 0;
  let archBestMove = 0;
  let archBestPlayer = 0;
  let archExtra = 0;
  const archive: ArchiveLine[] = [];
  for (const r of arch ?? []) {
    const a = r.rating_archive as unknown as {
      slug: string; title: string; league: string; year: number; is_current: boolean; final_places: string[] | null;
    };
    const roles: [PlayerRole, number, number][] = [
      ["civilian", r.civ_w, r.civ_l],
      ["mafia", r.mafia_w, r.mafia_l],
      ["sheriff", r.sheriff_w, r.sheriff_l],
      ["don", r.don_w, r.don_l],
    ];
    const roleGames = roles.reduce((x, [, w, l]) => x + w + l, 0);
    const detailed = roleGames > 0;
    if (detailed) {
      for (const [role, w, l] of roles) {
        byRole[role].games += w + l;
        byRole[role].wins += w;
      }
      archDecided += r.games;
      archWins += r.wins;
      archExtra += Number(r.extra);
    }
    archGames += r.games;
    archKilled += r.first_killed;
    archBestMove += r.best_move2 + r.best_move3;
    archBestPlayer += r.best_player;
    const fp = a.is_current ? -1 : (a.final_places ?? []).findIndex((n) => myNames.has(n.toLowerCase()));
    archive.push({
      slug: a.slug,
      title: a.title,
      league: a.league,
      year: a.year,
      isCurrent: a.is_current,
      rank: r.rank,
      games: r.games,
      wins: detailed ? r.wins : null,
      points: Number(r.score ?? r.points),
      finalPlace: fp >= 0 ? fp + 1 : null,
      firstKilled: detailed && r.games ? r.first_killed / r.games : null,
      avgExtra: detailed && r.games ? Number(r.extra) / r.games : null,
    });
  }
  archive.sort((x, y) => y.year - x.year || x.title.localeCompare(y.title));

  return {
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatar_url,
    city: p.city ?? null,
    since: p.created_at,
    memberNo: p.member_no ?? null,
    markeryId: p.markery_id ?? null,
    aliases: aliasNames,
    staff: (staff ?? []).map((s) => ({ club: (s.clubs as unknown as { name: string } | null)?.name ?? "", role: s.role })),
    stats: {
      games: rated.length + archGames,
      decided: rated.length + archDecided,
      wins: rated.filter((g) => g.win).length + archWins,
      siteGames: rated.length,
      points: round(rated.reduce((a, g) => a + g.points, 0)),
      byRole,
      firstKilled: rated.filter((g) => g.firstKilled).length + archKilled,
      bestMoveHits: rated.filter((g) => g.bestMovePoints > 0).length + archBestMove,
      bestMovePoints: round(rated.reduce((a, g) => a + g.bestMovePoints, 0)),
      bestPlayer: archBestPlayer,
      extra: round(archExtra),
      extraGames: archDecided,
      fouls,
      redVotes,
      blackVotes,
    },
    recent: games.slice(0, 30),
    archive,
  };
}

/** Лучшее место игрока в рейтингах сезонов (финал важнее места в таблице). */
export function bestPlace(archive: ArchiveLine[]): number | null {
  const places = archive.map((a) => a.finalPlace ?? a.rank).filter((n) => n > 0);
  return places.length ? Math.min(...places) : null;
}

/** Четыре главные цифры карточки игрока: с архивом сезонов — игры, % побед, сезоны, лучшее место. */
export function headlineStats(
  player: PlayerPage,
  t: (k: "games" | "winRate" | "points" | "avgPoints" | "seasonsCount" | "bestPlace") => string,
  locale: string,
): [string, string][] {
  const s = player.stats;
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  if (player.archive.length > 0) {
    const best = bestPlace(player.archive);
    return [
      [t("games"), String(s.games)],
      [t("winRate"), pct(s.wins, s.decided)],
      [t("seasonsCount"), String(player.archive.length)],
      [t("bestPlace"), best ? `№${best}` : "—"],
    ];
  }
  return [
    [t("games"), String(s.games)],
    [t("winRate"), pct(s.wins, s.decided)],
    [t("points"), num(s.points)],
    [t("avgPoints"), s.siteGames ? num(s.points / s.siteGames) : "—"],
  ];
}
