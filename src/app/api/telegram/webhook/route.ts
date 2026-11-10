import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { webhookSecret } from "@/lib/telegram/api";
import { handleUpdate } from "@/lib/telegram/bot";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Вебхук Telegram. Принимаем только запросы с секретом, который знает Telegram. */
export async function POST(request: NextRequest) {
  let secret: string;
  try {
    secret = webhookSecret();
  } catch {
    return new Response("bot not configured", { status: 503 });
  }
  if (!safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await request.json().catch(() => null);
  if (update) {
    try {
      await handleUpdate(update, request.nextUrl.origin);
    } catch (e) {
      // Отвечаем 200, иначе Telegram будет бесконечно повторять то же обновление.
      console.error("telegram webhook failed", { message: e instanceof Error ? e.message : String(e) });
    }
  }
  return Response.json({ ok: true });
}
