import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

// 1) next-intl: язык (адрес → cookie → Accept-Language) и редирект на /<язык>/...
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // Старая страница MCL живёт по адресу со слэшем (/mcl/): её относительные ссылки
  // (standings.html, assets/...) работают только так. /mcl без слэша → /mcl/.
  const { pathname } = request.nextUrl;
  if (pathname === "/mcl") {
    // Строкой, а не через nextUrl: NextURL срезает завершающий слэш.
    return NextResponse.redirect(new URL("/mcl/" + request.nextUrl.search, request.url).toString(), 308);
  }
  if (pathname.startsWith("/mcl/")) return NextResponse.next();

  const response = handleI18n(request);
  // 2) Supabase: продление сессии вошедшего пользователя.
  return updateSession(request, response);
}

export const config = {
  // Всё, кроме API, служебных файлов Next.js и файлов с расширением (картинки, sitemap.xml, robots.txt).
  // Плюс разделы старого сайта, которые проксируются как есть (next.config.ts): mcl, seasons и их файлы.
  matcher: ["/mcl", "/((?!api|auth|stream|_next|_vercel|mcl|seasons|public|static|club|assets|.*\\..*).*)"],
};
