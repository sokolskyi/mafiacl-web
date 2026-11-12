import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Localized } from "@/lib/games";

export const PROMOTIONS_TAG = "promotions";

export type Promotion = { id: number; title: Localized; body: Localized | null; validUntil: string | null };

/** Действующие акции клуба (кеш; сбрасывается при правках в админке). Просроченные не показываем. */
export async function getPromotions(clubSlug: string): Promise<Promotion[]> {
  "use cache";
  cacheTag(PROMOTIONS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("promotions")
    .select("id, title, body, valid_until, sort, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("active", true)
    .order("sort")
    .order("id");
  if (error) console.error("getPromotions failed", { code: error.code, message: error.message });
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title as Localized,
    body: (p.body ?? null) as Localized | null,
    validUntil: p.valid_until,
  }));
}
