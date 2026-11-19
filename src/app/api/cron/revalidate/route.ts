import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALIASES_TAG } from "@/lib/aliases";
import { TITLES_TAG } from "@/lib/badges";
import { BANS_TAG } from "@/lib/bans";
import { BLOG_POSTS_TAG } from "@/lib/blog-posts";
import { GAMES_TAG } from "@/lib/games";
import { HALL_ARCHIVE_TAG } from "@/lib/hallArchive";
import { HOSTS_TAG } from "@/lib/hosts";
import { PARTNERS_TAG } from "@/lib/partners";
import { MATCHES_TAG } from "@/lib/players";
import { PROMOTIONS_TAG } from "@/lib/promotions";
import { RATING_ARCHIVE_TAG } from "@/lib/ratingArchive";
import { REVIEWS_TAG } from "@/lib/reviews/queries";
import { SHOP_TAG } from "@/lib/shop/queries";
import { TESTIMONIALS_TAG } from "@/lib/testimonials";
import { TOURNAMENTS_TAG } from "@/lib/tournaments";
import { VENUES_TAG } from "@/lib/venues";
import { MAFGAME_TAG } from "@/lib/mafgame/queries";

/** Все теги кеша сайта. Сбросить можно только их. */
const TAGS = new Set<string>([
  ALIASES_TAG, TITLES_TAG, BANS_TAG, BLOG_POSTS_TAG, GAMES_TAG, HALL_ARCHIVE_TAG, HOSTS_TAG, PARTNERS_TAG,
  MATCHES_TAG, PROMOTIONS_TAG, RATING_ARCHIVE_TAG, REVIEWS_TAG, SHOP_TAG, TESTIMONIALS_TAG, TOURNAMENTS_TAG, VENUES_TAG, MAFGAME_TAG,
]);

/**
 * Сброс кеша после правок прямо в базе (без пересборки сайта).
 * Вызывается из базы: select private.site_revalidate(array['partners']); — пустой массив или 'all' сбрасывают всё.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return new Response("forbidden", { status: 403 });

  let db;
  try {
    db = createAdminClient();
  } catch {
    return new Response("not configured", { status: 503 });
  }
  const { data: ok } = await db.rpc("check_cron_secret", { p_secret: secret });
  if (ok !== true) return new Response("forbidden", { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const asked = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
  const all = asked.length === 0 || asked.includes("all");
  const tags = all ? [...TAGS] : asked.filter((t) => TAGS.has(t));
  const unknown = all ? [] : asked.filter((t) => !TAGS.has(t));

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  console.info("cache revalidated", { tags, unknown });
  return Response.json({ revalidated: tags, unknown });
}
