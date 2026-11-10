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

export type Prize = { id: number; amount: number; label: string; wonOn: string | null; profileId: string | null; holderName: string | null; nickname: string | null };

/** Призовые игроков клуба (Kč), новые сверху. */
export async function getPrizes(clubSlug: string): Promise<Prize[]> {
  "use cache";
  cacheTag(TITLES_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data } = await db
    .from("player_prizes")
    .select("id, amount_czk, label, won_on, profile_id, holder_name, profiles ( nickname ), clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .order("won_on", { ascending: false, nullsFirst: false })
    .limit(5000);
  return (data ?? []).map((p) => ({
    id: p.id,
    amount: p.amount_czk,
    label: p.label,
    wonOn: p.won_on,
    profileId: p.profile_id,
    holderName: p.holder_name,
    nickname: (p.profiles as unknown as { nickname: string | null } | null)?.nickname ?? null,
  }));
}

/** Запись принадлежит игроку: по аккаунту или (если записано на ник) по совпадению ника. */
export function belongsTo(x: { profileId: string | null; holderName: string | null }, profileId: string, nickname: string) {
  return x.profileId === profileId || (!x.profileId && x.holderName?.toLowerCase() === nickname.toLowerCase());
}

export type HallRow = {
  key: string;
  nickname: string;
  linked: boolean; // есть аккаунт → ссылка на страницу игрока
  champion: number;
  kings: number;
  evenings: number;
  prize: number;
};

/** Зал славы: титулы, победы в мини-турнирах за все сезоны и призовые. */
export async function getHallOfFame(clubSlug: string): Promise<HallRow[]> {
  "use cache";
  cacheTag(TITLES_TAG, MATCHES_TAG);
  cacheLife("minutes");
  const { getSeasons, getEveningWinners } = await import("@/lib/rating");
  const [titles, prizes, seasons] = await Promise.all([getTitles(clubSlug), getPrizes(clubSlug), getSeasons(clubSlug)]);
  const rows = new Map<string, HallRow>();
  const row = (profileId: string | null, name: string, nickname: string | null) => {
    const key = profileId ? `p:${profileId}` : `n:${name.toLowerCase()}`;
    let r = rows.get(key);
    if (!r) {
      r = { key, nickname: nickname ?? name, linked: !!profileId && !!nickname, champion: 0, kings: 0, evenings: 0, prize: 0 };
      rows.set(key, r);
    }
    return r;
  };
  for (const t of titles) {
    const r = row(t.profileId, t.holderName ?? t.nickname ?? "—", t.nickname);
    if (t.kind === "season_champion") r.champion++;
    else r.kings++;
  }
  for (const p of prizes) row(p.profileId, p.holderName ?? p.nickname ?? "—", p.nickname).prize += p.amount;
  for (const s of seasons) {
    for (const rating of s.ratings.filter((x) => x.prizePerEvening !== null)) {
      for (const w of await getEveningWinners(rating.id)) row(w.profileId, w.name, w.nickname).evenings++;
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.champion - a.champion || b.kings - a.kings || b.prize - a.prize || b.evenings - a.evenings || a.nickname.localeCompare(b.nickname),
  );
}
