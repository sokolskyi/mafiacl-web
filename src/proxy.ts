import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

// 1) next-intl: язык (адрес → cookie → Accept-Language) и редирект на /<язык>/...
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  // 2) Supabase: продление сессии вошедшего пользователя.
  return updateSession(request, response);
}

export const config = {
  // Всё, кроме API, служебных файлов Next.js и файлов с расширением (картинки, sitemap.xml, robots.txt).
  matcher: "/((?!api|auth|stream|_next|_vercel|.*\\..*).*)",
};
