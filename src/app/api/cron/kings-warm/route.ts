import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKingsSeasonPath } from "@/lib/kings";
import { getKingsPage, getKingsSeasons } from "@/lib/kingsPage";

/**
 * Прогрев раздела Kings: держит в кеше свежие страницы — текущий сезон, его четыре рейтинга
 * и главные страницы прошлых сезонов, — чтобы посетитель не ждал, пока старое приложение
 * соберёт их (3–8 секунд). Вызывает pg_cron (kings-warm) каждые 5 минут.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return new Response("forbidden", { status: 403 });
  let db;
  try {
    db = createAdminClient();
  } catch {
    return new Response("not configured", { status: 503 });
  }
  const { data: ok } = await db.rpc("check_cron_secret", { p_secret: secret });
  if (ok !== true) return new Response("forbidden", { status: 403 });

  const path = await getKingsSeasonPath();
  const seasons = await getKingsSeasons();
  const paths = [
    path,
    ...["mafiacl", "represent", "premier", "arena"].map((r) => `${path}/ranking/${r}`),
    ...seasons.map((s) => `/seasons/${s.id}`).filter((p) => p !== path),
  ];
  const started = Date.now();
  const results = await Promise.allSettled(paths.map((p) => getKingsPage(p)));
  const failed = paths.filter((_, i) => results[i].status === "rejected");
  if (failed.length) console.error("kings warm failed", failed);
  return Response.json({ warmed: paths.length - failed.length, failed, ms: Date.now() - started }, { status: failed.length === paths.length ? 502 : 200 });
}
