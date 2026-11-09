import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Клиент для браузерных компонентов ("use client"). */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
