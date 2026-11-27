import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImport } from "@/lib/mafgame/import";
import { runImafia } from "@/lib/federations/imafia";
import { runEmotion } from "@/lib/federations/emotion";
import { MAFGAME_TAG } from "@/lib/mafgame/queries";

export const maxDuration = 300;

/**
 * Импорт турниров клуба с mafgame.org, затем призовые места за клуб на iMafia и Emotion Games. Будильник из базы (pg_cron → pg_net) раз в 30 минут.
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
    console.info("mafgame import", { scanned: report.scanned, saved: report.saved.length, respect: report.respect, podiums: report.podiums });
    // Призовые места за клуб на iMafia и Emotion Games (сбой одной федерации не мешает остальным).
    const other: Record<string, unknown> = {};
    for (const [name, run] of [["imafia", runImafia], ["emotion", runEmotion]] as const) {
      try {
        const r = await run(db);
        other[name] = r;
        if (r.errors.length) console.error(`${name} import errors`, r.errors.slice(0, 10));
        console.info(`${name} import`, { scanned: r.scanned, checked: r.checked, podiums: r.podiums });
      } catch (e) {
        other[name] = { error: e instanceof Error ? e.message : String(e) };
        console.error(`${name} import failed`, other[name]);
      }
    }
    return Response.json({ ...report, federations: other });
  } catch (e) {
    console.error("mafgame import failed", { message: e instanceof Error ? e.message : String(e) });
    return new Response("error", { status: 500 });
  }
}
