import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getKingsSeasons, kingsResponse } from "@/lib/kingsPage";

// MafiaCL Kings по понятным адресам: /ru/kings/2026, /ru/kings/2026/ranking/premier, /ru/kings/2026/players/123 …
// Страницы берутся со старого приложения (/seasons/<id>/...) — из общего кеша, с полоской MafiaCL сверху.

const SEGMENT = /^[\w.-]+$/;

async function handle(req: NextRequest, ctx: RouteContext<"/[locale]/kings/[year]/[[...rest]]">) {
  const { locale, year, rest = [] } = await ctx.params;
  if (!hasLocale(routing.locales, locale) || !SEGMENT.test(year) || !rest.every((s) => SEGMENT.test(s))) {
    return new Response("Not found", { status: 404 });
  }
  const seasons = await getKingsSeasons();
  const season = seasons.find((s) => s.slug === year);
  if (!season) return new Response("Сезон не найден", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const tail = rest.length ? `/${rest.join("/")}` : "";
  return kingsResponse(req, {
    legacyPath: `/seasons/${season.id}${tail}${req.nextUrl.search}`,
    locale,
    slug: season.slug,
    isHome: rest.length === 0,
    seasons,
  });
}

export const GET = handle;
export const POST = handle;
