import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Localized } from "@/lib/games";

export type StaffRole = "owner" | "admin" | "host";

export type StaffClub = { id: number; name: string; slug: string; timezone: string; roles: StaffRole[] };

/** Клубы, где текущий пользователь — сотрудник. null — не вошёл. */
export async function getStaffContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: rows } = await supabase
    .from("club_staff")
    .select("role, clubs ( id, name, slug, cities ( timezone ) )")
    .eq("profile_id", userId);

  const clubs = new Map<number, StaffClub>();
  for (const r of rows ?? []) {
    const c = r.clubs as unknown as { id: number; name: string; slug: string; cities: { timezone: string } | null };
    if (!c) continue;
    const entry = clubs.get(c.id) ?? { id: c.id, name: c.name, slug: c.slug, timezone: c.cities?.timezone ?? "Europe/Prague", roles: [] };
    entry.roles.push(r.role as StaffRole);
    clubs.set(c.id, entry);
  }
  return { supabase, userId, clubs: [...clubs.values()] };
}

export type AdminGameRow = {
  id: number;
  clubId: number;
  startsAt: string;
  status: string;
  kind: string;
  title: Localized | null;
  number: number | null;
  numberStyle: "arabic" | "roman";
  capacity: number;
  confirmed: number;
  waitlist: number;
  venueName: string | null;
};

export async function getAdminGames(clubIds: number[]): Promise<AdminGameRow[]> {
  if (clubIds.length === 0) return [];
  const supabase = await createClient();
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("games")
    .select("id, club_id, starts_at, status, kind, title, number, capacity, game_schedules ( number_style ), venues ( name ), game_signups ( status )")
    .in("club_id", clubIds)
    .gte("starts_at", since)
    .order("starts_at")
    .limit(60);
  if (error) {
    console.error("getAdminGames failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((g) => {
    const s = (g.game_signups ?? []) as { status: string }[];
    return {
      id: g.id,
      clubId: g.club_id,
      startsAt: g.starts_at,
      status: g.status,
      kind: g.kind,
      title: g.title as Localized | null,
      number: g.number,
      numberStyle: (g.game_schedules as unknown as { number_style: string } | null)?.number_style === "roman" ? "roman" : "arabic",
      capacity: g.capacity,
      confirmed: s.filter((x) => x.status === "confirmed").length,
      waitlist: s.filter((x) => x.status === "waitlist").length,
      venueName: (g.venues as unknown as { name: string } | null)?.name ?? null,
    };
  });
}

export async function getAdminGame(id: number) {
  const supabase = await createClient();
  const { data: game, error } = await supabase
    .from("games")
    .select(
      `id, club_id, venue_id, starts_at, status, kind, title, number, capacity, price_czk, stream_url, info_url, late_after,
       game_schedules ( number_style ), clubs ( name, cities ( timezone ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !game) return null;

  const [{ data: signups }, { data: venues }] = await Promise.all([
    supabase
      .from("game_signups")
      .select("id, status, guest_name, checked_in_at, created_at, profiles!game_signups_profile_id_fkey ( nickname, display_name )")
      .eq("game_id", id)
      .neq("status", "cancelled")
      .order("created_at"),
    supabase.from("venues").select("id, name").eq("club_id", game.club_id).eq("is_active", true).order("name"),
  ]);

  const club = game.clubs as unknown as { name: string; cities: { timezone: string } | null };
  return {
    game: {
      ...game,
      numberStyle: (game.game_schedules as unknown as { number_style: string } | null)?.number_style === "roman" ? ("roman" as const) : ("arabic" as const),
      title: game.title as Localized | null,
      clubName: club?.name ?? "",
      timezone: club?.cities?.timezone ?? "Europe/Prague",
    },
    signups: (signups ?? []).map((s) => {
      const p = s.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
      return {
        id: s.id,
        status: s.status as "confirmed" | "waitlist",
        name: s.guest_name ?? p?.nickname ?? p?.display_name ?? "—",
        isGuest: s.guest_name !== null,
        checkedIn: s.checked_in_at !== null,
      };
    }),
    venues: venues ?? [],
  };
}

export async function getClubStaff(clubId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_staff")
    .select("profile_id, role, profiles ( nickname, display_name )")
    .eq("club_id", clubId)
    .order("role");
  return (data ?? []).map((r) => {
    const p = r.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
    return { profileId: r.profile_id, role: r.role as StaffRole, name: p?.nickname ?? p?.display_name ?? "—" };
  });
}
