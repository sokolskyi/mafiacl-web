import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getKingsSeasonPath } from "@/lib/kings";
import { getKingsSeasons } from "@/lib/kingsPage";

// /<язык>/kings — раздел MafiaCL Kings: ведёт на текущий сезон, /<язык>/kings/<год>
// (страницы старого приложения, см. ./[year]/[[...rest]]/route.ts).
export async function GET(_req: Request, ctx: RouteContext<"/[locale]/kings">) {
  const { locale } = await ctx.params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  const [path, seasons] = await Promise.all([getKingsSeasonPath(), getKingsSeasons()]);
  const id = Number(path.match(/\d+/)?.[0]);
  return new Response(null, { status: 307, headers: { location: `/${locale}/kings/${seasons.find((s) => s.id === id)?.slug ?? id}` } });
}
