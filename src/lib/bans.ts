import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const BANS_TAG = "bans";

export type PublicBan = { nickname: string; since: string };

/**
 * Публичный список банов клуба: только ник и дата. Причина — внутренняя, на сайт не выводится.
 * Таблица закрыта RLS для посетителей, поэтому читаем служебным ключом и отдаём лишь эти два поля.
 */
export async function getPublicBans(clubSlug: string): Promise<PublicBan[]> {
  "use cache";
  cacheTag(BANS_TAG);
  cacheLife("hours");
  if (!isAdminConfigured) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .from("club_bans")
    .select("created_at, profiles!club_bans_profile_id_fkey ( nickname ), clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .order("created_at", { ascending: false });
  if (error) console.error("getPublicBans failed", { code: error.code, message: error.message });
  return (data ?? [])
    .map((b) => ({
      nickname: (b.profiles as unknown as { nickname: string | null } | null)?.nickname ?? "",
      since: b.created_at as string,
    }))
    .filter((b) => b.nickname);
}
