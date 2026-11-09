import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/**
 * Клиент для серверных компонентов, Server Actions и Route Handlers.
 * Создавать заново на каждый запрос. Права — через RLS от имени пользователя.
 * Для проверки входа используйте `supabase.auth.getClaims()`, не getSession().
 */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Вызов из серверного компонента: писать cookie нельзя, сессию обновит proxy.
        }
      },
    },
  });
}
