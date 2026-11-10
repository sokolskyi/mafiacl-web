import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MATCHES_TAG } from "@/lib/players";
import { getPlayerOfWeek } from "@/lib/rating";

/** Значки у ника, как в клубе: ⭐ чемпион сезона Premier League, 👑 MafiaCL Kings, ⚜️ победитель последнего мини-турнира. */
export const BADGE = { season_champion: "⭐", kings_winner: "👑", evening: "⚜️" } as const;
export const TITLES_TAG = "titles";

export type Title = { id: number; kind: "season_champion" | "kings_winner"; label: string; wonOn: string | null; profileId: string | null; holderName: string | null; nickname: string | null };
export type Badges = { byProfile: Record<string, string>; byName: Record<string, string> };

export async function getTitles(clubSlug: string): Promise<Title[]> {
  "use cache";
  cacheTag(TITLES_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data } = await db
    .from("player_titles")
    .select("id, kind, label, won_on, profile_id, holder_name, profiles ( nickname ), clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .order("won_on", { ascending: false, nullsFirst: false });
  return (data ?? []).map((t) => ({
    id: t.id,
    kind: t.kind as Title["kind"],
    label: t.label,
    wonOn: t.won_on,
    profileId: t.profile_id,
    holderName: t.holder_name,
    nickname: (t.profiles as unknown as { nickname: string | null } | null)?.nickname ?? null,
  }));
}

/** Значки всех игроков: по аккаунту и по нику (для гостей и титулов, записанных на ник). */
export async function getBadges(clubSlug: string): Promise<Badges> {
  "use cache";
  cacheTag(TITLES_TAG, MATCHES_TAG);
  cacheLife("minutes");
  const [titles, potw] = await Promise.all([getTitles(clubSlug), getPlayerOfWeek(clubSlug)]);
  const count: Record<string, { s: number; k: number; e: boolean }> = {};
  const keyOf = (profileId: string | null, name: string | null) => (profileId ? `p:${profileId}` : `n:${(name ?? "").toLowerCase()}`);
  for (const t of titles) {
    const k = keyOf(t.profileId, t.holderName);
    count[k] ??= { s: 0, k: 0, e: false };
    if (t.kind === "season_champion") count[k].s++;
    else count[k].k++;
  }
  for (const w of potw?.winners ?? []) {
    const k = keyOf(w.profileId, w.name);
    count[k] ??= { s: 0, k: 0, e: false };
    count[k].e = true;
  }
  const out: Badges = { byProfile: {}, byName: {} };
  for (const [k, c] of Object.entries(count)) {
    const b = BADGE.season_champion.repeat(c.s) + BADGE.kings_winner.repeat(c.k) + (c.e ? BADGE.evening : "");
    if (k.startsWith("p:")) out.byProfile[k.slice(2)] = b;
    else out.byName[k.slice(2)] = b;
  }
  return out;
}

/** Значок игрока: сначала по аккаунту, затем по нику. */
export function badgeOf(b: Badges, profileId: string | null | undefined, name: string | null | undefined) {
  return (profileId ? b.byProfile[profileId] : undefined) ?? (name ? b.byName[name.toLowerCase()] : undefined) ?? "";
}

/** «Ник ⭐⚜️» */
export function withBadge(b: Badges, profileId: string | null | undefined, name: string) {
  const badge = badgeOf(b, profileId, name);
  return badge ? `${name} ${badge}` : name;
}
