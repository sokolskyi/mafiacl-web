import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { replay, type Action } from "@/lib/match/engine";
import { getBadges, badgeOf } from "@/lib/badges";

// Данные для слоя трансляции. Публичные, поэтому роли отдаём только если ведущий включил
// «показывать роли» (обычно при задержке стрима). Журнал целиком наружу не уходит.
export async function GET(_req: Request, ctx: { params: Promise<{ club: string; table: string }> }) {
  const { club, table } = await ctx.params;
  const tableNo = Number(table);
  if (!/^[a-z0-9-]{1,60}$/.test(club) || !Number.isInteger(tableNo) || tableNo < 1 || tableNo > 9 || !isAdminConfigured) {
    return NextResponse.json({ match: null }, { status: 404 });
  }
  const db = createAdminClient();
  const { data: c } = await db.from("clubs").select("id, name").eq("slug", club).maybeSingle();
  if (!c) return NextResponse.json({ match: null }, { status: 404 });

  // Идущая партия за столом; если нет — только что сыгранная (последние 30 минут).
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: rows } = await db
    .from("matches")
    .select("id, number, table_no, status, result, show_roles, seats, log, updated_at")
    .eq("club_id", c.id)
    .eq("table_no", tableNo)
    .or(`status.eq.live,and(status.eq.finished,updated_at.gte.${since})`)
    .order("status", { ascending: true }) // live < finished
    .order("updated_at", { ascending: false })
    .limit(1);
  const m = rows?.[0];
  if (!m) return NextResponse.json({ match: null, club: c.name }, { headers: { "Cache-Control": "no-store" } });

  let s;
  try {
    s = replay(m.log as Action[]);
  } catch {
    return NextResponse.json({ match: null, club: c.name }, { headers: { "Cache-Control": "no-store" } });
  }
  const seats = (m.seats as { profile_id?: string | null; name: string }[]) ?? [];
  const ids = seats.map((x) => x.profile_id).filter((x): x is string => !!x);
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, avatar_url").in("id", ids) : { data: [] };
  const avatarOf = new Map((profiles ?? []).map((p) => [p.id, p.avatar_url as string | null]));
  const reveal = m.show_roles || s.phase === "finished";
  const badges = await getBadges(club);

  return NextResponse.json(
    {
      club: c.name,
      match: {
        number: m.number,
        table: m.table_no,
        phase: s.phase,
        round: s.round,
        result: s.result,
        nominations: s.nominations,
        seats: Array.from({ length: 10 }, (_, i) => {
          const seat = i + 1;
          const info = seats[i];
          return {
            seat,
            name: info?.name || String(seat),
            badge: badgeOf(badges, info?.profile_id ?? null, info?.name ?? null),
            avatar: info?.profile_id ? avatarOf.get(info.profile_id) ?? null : null,
            fouls: s.fouls[seat] ?? 0,
            out: s.out[seat]?.reason ?? null,
            role: reveal ? s.roles[seat] ?? "civilian" : null,
          };
        }),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
