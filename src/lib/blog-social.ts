import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { BLOG_POSTS_TAG, getApprovedPosts, postSlug } from "@/lib/blog-posts";
import { getReviews, REVIEWS_TAG } from "@/lib/reviews/queries";
import { reviewSlug } from "@/lib/reviews/types";
import { MAIN_CLUB_SLUG } from "@/lib/site";

export { REACTIONS, isReaction, COMMENT_MAX, SLUG_RE, type ReactionKind } from "@/lib/blog-social-shared";

/** Тег кеша счётчиков (популярное): обновляется раз в несколько минут сам. */
export const BLOG_STATS_TAG = "blog-stats";

export type ArticleRef = {
  slug: string;
  title: string;
  /** Ник автора; null — обзор сезона от клуба. */
  author: string | null;
  date: string;
  kind: "post" | "review";
  /** Месяц обзора (YYYY-MM) — для заголовка на нужном языке. */
  month?: string;
};

/** Все опубликованные материалы блога: статьи игроков и обзоры сезона, новые сверху. */
export async function getArticles(): Promise<ArticleRef[]> {
  "use cache";
  cacheTag(BLOG_POSTS_TAG, REVIEWS_TAG);
  cacheLife("hours");
  const [posts, reviews] = await Promise.all([getApprovedPosts(200), getReviews(MAIN_CLUB_SLUG)]);
  const list: ArticleRef[] = [
    ...posts.map((p) => ({ slug: postSlug(p.id), title: p.title, author: p.author, date: p.approvedAt, kind: "post" as const })),
    ...reviews.map((r) => ({ slug: reviewSlug(r.month), title: r.month, author: null, date: r.asOf, kind: "review" as const, month: r.month })),
  ];
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

/** Просмотры по статьям (для «Популярного»). Обновляются раз в несколько минут. */
export async function getViews(slugs: string[]): Promise<Record<string, number>> {
  "use cache";
  cacheTag(BLOG_STATS_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured || !slugs.length) return {};
  const { data, error } = await createPublicClient().rpc("blog_stats", { p_slugs: slugs.slice(0, 200) });
  if (error) console.error("getViews failed", { code: error.code, message: error.message });
  return Object.fromEntries(((data ?? []) as { slug: string; views: number }[]).map((r) => [r.slug, r.views]));
}

/** Что показать под статьёй: самое читаемое, предыдущую по дате и другие статьи этого автора. */
export async function getRelated(slug: string) {
  const all = await getArticles();
  const i = all.findIndex((a) => a.slug === slug);
  const current = i >= 0 ? all[i] : null;
  const previous = i >= 0 ? (all[i + 1] ?? null) : null;
  const views = await getViews(all.map((a) => a.slug));
  const popular =
    all
      .filter((a) => a.slug !== slug && a.slug !== previous?.slug && (views[a.slug] ?? 0) > 0)
      .sort((a, b) => (views[b.slug] ?? 0) - (views[a.slug] ?? 0) || b.date.localeCompare(a.date))[0] ?? null;
  const byAuthor = current
    ? all
        .filter((a) => a.slug !== slug && a.slug !== previous?.slug && a.slug !== popular?.slug)
        .filter((a) => (current.author ? a.author === current.author : a.kind === "review"))
        .slice(0, 3)
    : [];
  return { current, popular, previous, byAuthor };
}
