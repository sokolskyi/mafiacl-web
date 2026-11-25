import type { NextRequest } from "next/server";
import { getKingsSeasons, kingsResponse, toSiteUrl } from "@/lib/kingsPage";

// Старые адреса Kings (/seasons/12/...) → новые (/ru/kings/2026/...): сохранённые ссылки не ломаются.
// Формы администратора Kings, отправленные по старому адресу, уходят в старое приложение как есть.

const SEGMENT = /^[\w.-]+$/;

export async function GET(req: NextRequest, ctx: RouteContext<"/seasons/[...path]">) {
  const { path } = await ctx.params;
  if (!path.every((s) => SEGMENT.test(s))) return new Response("Not found", { status: 404 });
  const seasons = await getKingsSeasons();
  const target = toSiteUrl(`/seasons/${path.join("/")}`, seasons, "ru") + req.nextUrl.search;
  return new Response(null, { status: 308, headers: { location: target } });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/seasons/[...path]">) {
  const { path } = await ctx.params;
  if (!path.every((s) => SEGMENT.test(s))) return new Response("Not found", { status: 404 });
  const seasons = await getKingsSeasons();
  const id = Number(path[0]);
  return kingsResponse(req, {
    legacyPath: `/seasons/${path.join("/")}${req.nextUrl.search}`,
    locale: "ru",
    slug: seasons.find((s) => s.id === id)?.slug ?? path[0],
    isHome: path.length === 1,
    seasons,
  });
}
