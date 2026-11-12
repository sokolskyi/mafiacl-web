import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { collectReview } from "@/lib/reviews/collect";

/** YYYY-MM-DD и YYYY-MM по пражскому времени. */
function pragueToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function currentMonth() {
  return pragueToday().slice(0, 7);
}

export function previousMonth() {
  const [y, m] = currentMonth().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Собрать и сохранить обзор за месяц. Повторный запуск за тот же месяц обновляет обзор —
 * так обзор, собранный посреди месяца, 1-го числа следующего месяца становится итоговым.
 */
export async function generateReview(month: string, partial: boolean) {
  const db = createAdminClient();
  const { data: club, error: clubError } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).single();
  if (clubError || !club) throw new Error(`club not found: ${clubError?.message ?? MAIN_CLUB_SLUG}`);

  const asOf = partial ? pragueToday() : lastDayOf(month);
  const data = await collectReview(month, asOf, partial);
  const sources = Object.keys(data.rankings).length + (data.mcl ? 1 : 0);
  if (sources === 0) throw new Error("no rating sources available");

  const { error } = await db
    .from("season_reviews")
    .upsert({ club_id: club.id, month: `${month}-01`, data, generated_at: new Date().toISOString() }, { onConflict: "club_id,month" });
  if (error) throw new Error(`save failed: ${error.code} ${error.message}`);
  return { month, sources };
}

function lastDayOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
