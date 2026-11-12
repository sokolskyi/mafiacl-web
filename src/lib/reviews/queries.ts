import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ReviewData } from "@/lib/reviews/types";

export const REVIEWS_TAG = "season-reviews";


/** Опубликованные обзоры клуба, новые сверху (только данные, без сравнения). */
export async function getReviews(clubSlug: string): Promise<ReviewData[]> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("season_reviews")
    .select("month, data, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("published", true)
    .order("month", { ascending: false })
    .limit(60);
  if (error) console.error("getReviews failed", { code: error.code, message: error.message });
  return (data ?? []).map((r) => r.data as ReviewData);
}

/** Обзор за месяц и обзор за предыдущий месяц (для сравнения мест). */
export async function getReview(clubSlug: string, month: string): Promise<{ review: ReviewData; previous: ReviewData | null } | null> {
  const all = await getReviews(clubSlug);
  const i = all.findIndex((r) => r.month === month);
  if (i < 0) return null;
  return { review: all[i], previous: all[i + 1] ?? null };
}
