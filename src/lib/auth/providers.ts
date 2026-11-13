import { cacheLife } from "next/cache";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Необязательные способы входа: кнопки показываются, только когда провайдер включён в Supabase Auth. */
export type OptionalProvider = "apple" | "azure";

/** Какие из Apple / Microsoft включены в Supabase (публичные настройки Auth, кеш на 10 минут). */
export async function getOptionalProviders(): Promise<OptionalProvider[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { external?: Record<string, boolean> };
    return (["apple", "azure"] as const).filter((p) => json.external?.[p] === true);
  } catch {
    return [];
  }
}
