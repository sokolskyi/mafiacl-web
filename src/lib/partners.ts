import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Localized } from "@/lib/games";

export const PARTNERS_TAG = "partners";

export type Partner = { id: number; name: string; url: string | null; logoUrl: string | null; description: Localized | null };

/** Партнёры клуба для страницы «Партнёры» (кеш, сбрасывается при правках в админке). */
export async function getPartners(clubSlug: string): Promise<Partner[]> {
  "use cache";
  cacheTag(PARTNERS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("partners")
    .select("id, name, url, logo_url, description, sort, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("active", true)
    .order("sort")
    .order("id");
  if (error) console.error("getPartners failed", { code: error.code, message: error.message });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    logoUrl: p.logo_url,
    description: (p.description ?? null) as Localized | null,
  }));
}
