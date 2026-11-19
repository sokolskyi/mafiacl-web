import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImport } from "@/lib/mafgame/import";
import { MAFGAME_TAG } from "@/lib/mafgame/queries";

export const maxDuration = 120;

/**
 * Импорт турниров клуба с mafgame.org. Будильник из базы (pg_cron → pg_net) раз в 30 минут.
 * Тело (необязательно): {"ids": [692]} — перечитать эти турниры; {"scan": 60} — сколько новых id просмотреть.
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

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown; scan?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is number => Number.isInteger(x) && x > 0 && x < 1e7).slice(0, 50)
    : undefined;
  const scan = typeof body.scan === "number" && Number.isFinite(body.scan) ? Math.trunc(body.scan) : undefined;

  try {
    const report = await runImport(db, { ids, scan });
    if (report.saved.length) revalidateTag(MAFGAME_TAG, { expire: 0 });
    if (report.errors.length) console.error("mafgame import errors", report.errors.slice(0, 20));
    console.info("mafgame import", { scanned: report.scanned, saved: report.saved.length, respect: report.respect });
    return Response.json(report);
  } catch (e) {
    console.error("mafgame import failed", { message: e instanceof Error ? e.message : String(e) });
    return new Response("error", { status: 500 });
  }
}
