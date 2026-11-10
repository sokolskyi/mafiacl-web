import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Клиент с секретным ключом — обходит RLS. Только для бота и служебных задач на сервере,
 * никогда не для запросов от имени пользователя. Каждое действие проверяет права в коде.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SECRET_KEY не задан (Vercel → Environment Variables)");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const isAdminConfigured = Boolean(SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
