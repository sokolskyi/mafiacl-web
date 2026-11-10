import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotifications } from "@/lib/telegram/dispatch";

/** Будильник из базы (pg_cron → pg_net): разослать очередь уведомлений. */
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

  try {
    const result = await dispatchNotifications(request.nextUrl.origin);
    console.info("telegram dispatch", result);
    return Response.json(result);
  } catch (e) {
    console.error("telegram dispatch failed", { message: e instanceof Error ? e.message : String(e) });
    return new Response("error", { status: 500 });
  }
}
