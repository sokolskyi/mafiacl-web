import type { Locale } from "@/i18n/routing";
import type { UpcomingGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { GameList } from "./GameList";

/** Читает сессию посетителя — рендерится только внутри <Suspense>. */
export async function GameListForVisitor({ games, locale }: { games: UpcomingGame[]; locale: Locale }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const signups = new Map<number, "confirmed" | "waitlist">();

  if (userId && games.length > 0) {
    const { data: rows } = await supabase
      .from("game_signups")
      .select("game_id, status")
      .eq("profile_id", userId)
      .in("game_id", games.map((g) => g.id))
      .neq("status", "cancelled");
    for (const r of rows ?? []) signups.set(r.game_id, r.status as "confirmed" | "waitlist");
  }

  return <GameList games={games} locale={locale} me={{ signedIn: Boolean(userId), signups }} />;
}
