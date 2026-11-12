import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMonth, generateReview, previousMonth } from "@/lib/reviews/save";
import { REVIEWS_TAG } from "@/lib/reviews/queries";

export const maxDuration = 120;

/** Будильник из базы (pg_cron → pg_net, 1-го числа): обзор сезона за прошедший месяц. */
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

  // По умолчанию — итоги прошедшего месяца; {"current": true} — промежуточный обзор текущего.
  const body = (await request.json().catch(() => ({}))) as { current?: boolean };
  try {
    const result = body.current ? await generateReview(currentMonth(), true) : await generateReview(previousMonth(), false);
    revalidateTag(REVIEWS_TAG, { expire: 0 });
    console.info("season review", result);
    return Response.json(result);
  } catch (e) {
    console.error("season review failed", { message: e instanceof Error ? e.message : String(e) });
    return new Response("error", { status: 500 });
  }
}
