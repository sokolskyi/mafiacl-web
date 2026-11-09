import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Продлевает сессию Supabase и записывает свежие cookie в ответ (после next-intl).
 * Без cookie сессии ничего не делает — гости не платят за лишний вызов.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return response;
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Не вставлять код между созданием клиента и getClaims(): это и есть обновление токена.
  await supabase.auth.getClaims();
  return response;
}
