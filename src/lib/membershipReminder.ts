import "server-only";
import { createClient } from "@/lib/supabase/server";

const DAY = 24 * 60 * 60 * 1000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Окончание непрерывного абонемента игрока, если до него 7 дней или меньше.
 * Абонементы, идущие подряд (следующий начинается не позже дня после окончания), склеиваются:
 * купил продление — напоминания нет.
 */
export async function getMembershipEnding(userId: string): Promise<{ until: string; daysLeft: number } | null> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("valid_from, valid_until")
    .eq("profile_id", userId)
    .gte("valid_until", today)
    .order("valid_from");
  const rows = (data ?? []).filter((m) => m.valid_from && m.valid_until) as { valid_from: string; valid_until: string }[];
  const current = rows.filter((m) => m.valid_from <= today);
  if (current.length === 0) return null;
  let end = Math.max(...current.map((m) => toMs(m.valid_until)));
  for (const m of rows) {
    if (toMs(m.valid_from) <= end + DAY) end = Math.max(end, toMs(m.valid_until));
  }
  const daysLeft = Math.round((end - toMs(today)) / DAY);
  return daysLeft <= 7 ? { until: toDay(end), daysLeft } : null;
}
