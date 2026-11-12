import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Localized } from "@/lib/games";

export const HOSTS_TAG = "hosts";
export const HOST_LANGS = ["cs", "ru", "uk", "en"] as const;
export type HostLang = (typeof HOST_LANGS)[number];
export const TEAM_ROLES = ["founder", "admin", "host"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export type Host = {
  id: number;
  nickname: string;
  name: string;
  languages: HostLang[];
  playingSince: number | null;
  hostingSince: number | null;
  photoUrl: string | null;
  bio: Localized | null;
  profileNick: string | null;
  teamRoles: TeamRole[];
};

/** Ведущие клуба (кеш; сбрасывается при правках в админке). */
export async function getHosts(clubSlug: string): Promise<Host[]> {
  "use cache";
  cacheTag(HOSTS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("hosts")
    .select("id, nickname, name, languages, playing_since, hosting_since, photo_url, bio, sort, team_roles, profiles ( nickname ), clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("active", true)
    .order("sort")
    .order("id");
  if (error) console.error("getHosts failed", { code: error.code, message: error.message });
  return (data ?? []).map((h) => ({
    id: h.id,
    nickname: h.nickname,
    name: h.name,
    languages: (h.languages ?? []).filter((l: string): l is HostLang => (HOST_LANGS as readonly string[]).includes(l)),
    playingSince: h.playing_since,
    hostingSince: h.hosting_since,
    photoUrl: h.photo_url,
    bio: (h.bio ?? null) as Localized | null,
    profileNick: (h.profiles as unknown as { nickname: string | null } | null)?.nickname ?? null,
    teamRoles: (h.team_roles ?? ["host"]).filter((r: string): r is TeamRole => (TEAM_ROLES as readonly string[]).includes(r)),
  }));
}
