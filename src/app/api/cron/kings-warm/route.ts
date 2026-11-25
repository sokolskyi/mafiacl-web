import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKingsSeasonPath } from "@/lib/kings";
import { getKingsPage } from "@/lib/kingsPage";

/**
 * Прогрев раздела Kings: держит в кеше свежую страницу текущего сезона, чтобы посетитель
 * не ждал, пока старое приложение соберёт её (5–8 секунд). Вызывает pg_cron (kings-warm) каждые 5 минут.
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
  const started = Date.now();
  try {
    const page = await getKingsPage(path);
    return Response.json({ path, status: page.status, ms: Date.now() - started });
  } catch (e) {
    console.error("kings warm failed", path, e instanceof Error ? e.message : e);
    return Response.json({ path, error: "upstream" }, { status: 502 });
  }
}
