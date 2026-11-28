import { cacheLife, cacheTag } from "next/cache";
import { MATCHES_TAG } from "@/lib/players";
import { currentSeason, getSeasonRating, getSeasons } from "@/lib/rating";
import { getHallArchive } from "@/lib/hallArchive";
import { getCurrentArchiveSeason, RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { getProducts } from "@/lib/shop/queries";
import { getTournaments, TOURNAMENTS_TAG, type Tournament } from "@/lib/tournaments";
import type { VideoItem } from "@/lib/videos";

const pragueToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());

/** Ближайшие турниры: идут сейчас или ещё впереди, по дате начала. */
export async function getNextTournaments(clubSlug: string, limit = 2): Promise<Tournament[]> {
  "use cache";
  cacheTag(TOURNAMENTS_TAG);
  cacheLife("minutes");
  const today = pragueToday();
  return (await getTournaments(clubSlug))
    .filter((t) => (t.status === "announced" || t.status === "running") && (t.endsOn ?? t.startsOn) >= today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .slice(0, limit);
}

/** Лидер первого рейтинга текущего сезона — тот же порядок, что в таблице рейтинга. */
export async function getSeasonLeader(clubSlug: string) {
  "use cache";
  cacheTag(MATCHES_TAG, RATING_ARCHIVE_TAG);
  cacheLife("minutes");
  const season = currentSeason(await getSeasons(clubSlug), pragueToday());
  const rating = season?.ratings[0];
  if (!rating) return null;
  const { rows, matches } = await getSeasonRating(rating.id);
  const minGames = Math.ceil(rating.minShare * matches);
  const top = rows
    .filter((x) => x.games > 0 && x.games >= minGames)
    .sort((a, b) => b.rating - a.rating || b.games - a.games)[0];
  if (top) return { ratingName: rating.name, nickname: top.nickname, rating: top.rating, games: top.games };
  // Пока сезон ведётся на the-mafia.net — лидер из копии таблицы оттуда (как на странице рейтингов).
  if (matches === 0) {
    const live = await getCurrentArchiveSeason(clubSlug);
    const first = live?.rows.find((r) => r.qualified);
    if (first) return { ratingName: rating.name, nickname: first.nickname, rating: first.points, games: first.games };
  }
  return null;
}

/** Последний финал с видео из зала славы. */
export async function getLatestFinal(clubSlug: string): Promise<{ title: string; video: VideoItem } | null> {
  for (const e of await getHallArchive(clubSlug)) {
    const video = e.videos.find((v) => v.k === "final");
    if (video) return { title: e.title, video };
  }
  return null;
}

/** Самая низкая сегодняшняя цена абонемента в магазине. */
export async function getMembershipFrom(clubSlug: string): Promise<number | null> {
  const prices = (await getProducts(clubSlug)).filter((p) => p.kind === "membership" && p.onSale).map((p) => p.priceCzk);
  return prices.length ? Math.min(...prices) : null;
}
