import type { NextRequest } from "next/server";
import { KINGS_ORIGIN, getKingsPage, localLocation, withSiteBar } from "@/lib/kingsPage";

// Раздел MafiaCL Kings: страницы старого приложения на нашем домене, с полоской MafiaCL сверху.
// Посетители получают готовую страницу из кеша (lib/kingsPage.ts), администратор Kings
// (с сессией старого приложения) — свежую, без кеша.

const SEGMENT = /^[\w.-]+$/;
const isAdmin = (req: NextRequest) => /(?:^|;\s*)session=/.test(req.headers.get("cookie") ?? "");

function pathOf(req: NextRequest, segments: string[]) {
  return `/seasons/${segments.join("/")}${req.nextUrl.search}`;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/seasons/[...path]">) {
  const { path: segments } = await ctx.params;
  if (!segments.every((s) => SEGMENT.test(s))) return new Response("Not found", { status: 404 });
  const path = pathOf(req, segments);

  if (isAdmin(req)) return forward(req, path, "GET");

  let page;
  try {
    page = await getKingsPage(path);
  } catch (e) {
    console.error("kings page failed", path, e instanceof Error ? e.message : e);
    return new Response("Раздел MafiaCL Kings временно недоступен. Обновите страницу через минуту.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (page.status >= 300 && page.status < 400) {
    return new Response(null, { status: page.status, headers: { location: localLocation(page.location) ?? "/" } });
  }
  const html = page.type.includes("text/html");
  return new Response(html ? withSiteBar(page.body, path) : page.body, {
    status: page.status,
    headers: {
      "content-type": page.type,
      // На краю Vercel: минуту свежая, дальше отдаётся прежняя копия, пока в фоне готовится новая.
      "cache-control": page.status === 200 ? "public, s-maxage=60, stale-while-revalidate=604800" : "no-store",
    },
  });
}

/** Действия администратора Kings (формы старого приложения) — как есть, без кеша. */
export async function POST(req: NextRequest, ctx: RouteContext<"/seasons/[...path]">) {
  const { path: segments } = await ctx.params;
  if (!segments.every((s) => SEGMENT.test(s))) return new Response("Not found", { status: 404 });
  return forward(req, pathOf(req, segments), "POST");
}

async function forward(req: NextRequest, path: string, method: "GET" | "POST") {
  const headers = new Headers();
  for (const h of ["cookie", "content-type", "accept", "accept-language", "user-agent"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const res = await fetch(`${KINGS_ORIGIN}${path}`, {
    method,
    headers,
    body: method === "POST" ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });
  const out = new Headers({ "cache-control": "private, no-store" });
  const type = res.headers.get("content-type");
  if (type) out.set("content-type", type);
  const loc = localLocation(res.headers.get("location"));
  if (loc) out.set("location", loc);
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);
  if (type?.includes("text/html") && res.status === 200) {
    return new Response(withSiteBar(await res.text(), path), { status: res.status, headers: out });
  }
  return new Response(res.body, { status: res.status, headers: out });
}
