import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Клиент без cookie — только для публичных данных (расписание, рейтинги).
 * Его можно вызывать внутри "use cache": результат одинаков для всех посетителей.
 */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
