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
  queued: number;
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
      queued: s.filter((x) => x.status === "queued").length,
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
       priority_until, allocated_at, final_at, finalized_at, table_size, max_capacity, final_rating_id,
       game_schedules ( number_style ), clubs ( name, cities ( timezone ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !game) return null;

  const [{ data: signups }, { data: venues }, { data: ratings }] = await Promise.all([
    supabase
      .from("game_signups")
      .select(
        "id, status, guest_name, checked_in_at, created_at, has_priority, profile_id, profiles!game_signups_profile_id_fkey ( nickname, display_name )",
      )
      .eq("game_id", id)
      .neq("status", "cancelled")
      .order("created_at"),
    supabase.from("venues").select("id, name").eq("club_id", game.club_id).eq("is_active", true).order("name"),
    supabase
      .from("season_ratings")
      .select("id, name, seasons!inner ( name, club_id, number )")
      .eq("seasons.club_id", game.club_id)
      .order("id", { ascending: false }),
  ]);

  const club = game.clubs as unknown as { name: string; cities: { timezone: string } | null };
  const timezone = club?.cities?.timezone ?? "Europe/Prague";
  const gameDay = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(game.starts_at));
  const rows = signups ?? [];
  const profileIds = rows.map((s) => s.profile_id).filter((x): x is string => !!x);

  // Оплаты за эти записи и абонементы, действующие в день игры.
  const [{ data: payments }, { data: memberships }] = await Promise.all([
    rows.length
      ? supabase.from("payments").select("id, signup_id, method, amount_czk, status").in("signup_id", rows.map((s) => s.id)).in("status", ["paid", "pending"])
      : Promise.resolve({ data: [] as { id: number; signup_id: number | null; method: string; amount_czk: number; status: string }[] }),
    profileIds.length
      ? supabase
          .from("memberships")
          .select("profile_id")
          .eq("club_id", game.club_id)
          .in("profile_id", profileIds)
          .lte("valid_from", gameDay)
          .gte("valid_until", gameDay)
      : Promise.resolve({ data: [] as { profile_id: string }[] }),
  ]);
  const paymentOf = new Map((payments ?? []).map((p) => [p.signup_id, p]));
  const members = new Set((memberships ?? []).map((m) => m.profile_id));

  return {
    game: {
      ...game,
      numberStyle: (game.game_schedules as unknown as { number_style: string } | null)?.number_style === "roman" ? ("roman" as const) : ("arabic" as const),
      title: game.title as Localized | null,
      clubName: club?.name ?? "",
      timezone,
    },
    signups: rows.map((s) => {
      const p = s.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
      const pay = paymentOf.get(s.id);
      return {
        id: s.id,
        status: s.status as "queued" | "confirmed" | "waitlist",
        name: s.guest_name ?? p?.nickname ?? p?.display_name ?? "—",
        profileId: s.profile_id as string | null,
        isGuest: s.guest_name !== null,
        checkedIn: s.checked_in_at !== null,
        hasMembership: !!s.profile_id && members.has(s.profile_id),
        payment: pay ? { id: pay.id, method: pay.method, amount: Number(pay.amount_czk), pending: pay.status === "pending" } : null,
      };
    }),
    venues: venues ?? [],
    ratings: (ratings ?? []).map((r) => ({ id: r.id as number, name: `${(r.seasons as unknown as { name: string }).name} · ${r.name}` })),
  };
}

export type AdminMembership = {
  id: number;
  name: string;
  /** Абонемент записан на ник из таблицы, аккаунт ещё не привязан — приоритета не даёт. */
  linked: boolean;
  plan: "month" | "quarter" | "year" | "custom";
  validFrom: string;
  validUntil: string;
  note: string | null;
  paid: { method: string; amount: number } | null;
};

/** Действующие и будущие абонементы клуба (для владельца/админа). */
export async function getClubMemberships(clubId: number, timezone: string): Promise<AdminMembership[]> {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const { data, error } = await supabase
    .from("memberships")
    .select("id, plan, valid_from, valid_until, note, holder_name, profile_id, profiles!memberships_profile_id_fkey ( nickname, display_name ), payments ( method, amount_czk, status )")
    .eq("club_id", clubId)
    .gte("valid_until", today)
    .order("valid_until")
    .order("holder_name")
    .limit(200);
  if (error) {
    console.error("getClubMemberships failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((m) => {
    const p = m.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
    const pay = ((m.payments ?? []) as { method: string; amount_czk: number; status: string }[]).find((x) => x.status === "paid");
    return {
      id: m.id,
      name: p?.nickname ?? p?.display_name ?? m.holder_name ?? "—",
      linked: m.profile_id !== null,
      plan: m.plan as AdminMembership["plan"],
      validFrom: m.valid_from,
      validUntil: m.valid_until,
      note: m.note,
      paid: pay ? { method: pay.method, amount: Number(pay.amount_czk) } : null,
    };
  });
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
