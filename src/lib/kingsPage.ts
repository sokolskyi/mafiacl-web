import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getKingsSeasonPath } from "@/lib/kings";

// Раздел MafiaCL Kings живёт в старом приложении (Flask + Neon) по адресам /seasons/<id>/...;
// у нас он открывается по понятным адресам /<язык>/kings/<год>/... (app/[locale]/kings/[year]/[[...rest]]).
// Страница сезона
// собирается там 5–8 секунд. Новый сайт хранит готовую страницу в общем кеше и отдаёт её сразу,
// а обновляет в фоне не чаще раза в 5 минут (плюс прогрев по расписанию — api/cron/kings-warm).
export const KINGS_ORIGIN = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";
export const KINGS_TAG = "kings";

export type KingsPage = { status: number; location: string | null; type: string; body: string };

/** Страница Kings со старого приложения (без сессии администратора — общая для всех). */
export async function getKingsPage(path: string): Promise<KingsPage> {
  "use cache: remote";
  cacheTag(KINGS_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 60 * 60 * 24 * 7 });
  const res = await fetch(`${KINGS_ORIGIN}${path}`, { redirect: "manual", signal: AbortSignal.timeout(25000) });
  // Сбой старого приложения не кешируем — отдадим прошлую копию или ошибку.
  if (res.status >= 500) throw new Error(`Kings ${path}: HTTP ${res.status}`);
  return { status: res.status, location: res.headers.get("location"), type: res.headers.get("content-type") ?? "text/html", body: await res.text() };
}

/** Полоска MafiaCL над страницами Kings — чтобы было видно, что это раздел того же сайта. */
function kingsSiteBar(seasonHref: string, isHome: boolean): string {
  // На главной странице сезона «MafiaCL Kings» — текущее место; на вложенных (рейтинг, игрок, турнир) — ссылка на сезон.
  return `
<style id="mafiacl-sitebar-css">
.mcl-sitebar{position:relative;z-index:31;background:#1c0308;border-bottom:1px solid rgba(253,255,194,.12);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1}
.mcl-sitebar .in{max-width:1360px;margin:0 auto;padding:0 16px;height:44px;display:flex;align-items:center;gap:14px}
.mcl-sitebar a{color:#fdffc2;text-decoration:none}
.mcl-sitebar .logo{display:flex;align-items:center;flex:none;min-height:36px}
.mcl-sitebar .logo img{height:24px;width:auto;display:block}
.mcl-sitebar ol{display:flex;align-items:center;gap:8px;margin:0;padding:0;list-style:none;color:rgba(253,255,194,.6);min-width:0;white-space:nowrap;overflow:hidden}
.mcl-sitebar ol li+li::before{content:"›";margin-right:8px;color:rgba(253,255,194,.4)}
.mcl-sitebar ol a{color:rgba(253,255,194,.78);display:inline-flex;align-items:center;min-height:32px}
.mcl-sitebar ol a:hover{color:#fdffc2;text-decoration:underline}
.mcl-sitebar ol [aria-current]{color:#fdffc2;font-weight:600;overflow:hidden;text-overflow:ellipsis}
.mcl-sitebar .acc{margin-left:auto;flex:none;display:inline-flex;align-items:center;min-height:32px;padding:0 16px;border-radius:999px;background:#fdffc2;color:#1c0308;font-weight:700;font-size:13px}
.mcl-sitebar .acc:hover{background:#fff5a8}
.mcl-sitebar a:focus-visible{outline:2px solid #fdffc2;outline-offset:2px;border-radius:4px}
@media (max-width:560px){.mcl-sitebar .home-crumb{display:none}.mcl-sitebar .in{gap:10px}}
</style>
<div class="mcl-sitebar"><div class="in">
  <a class="logo" href="/ru" aria-label="MafiaCL — главная"><img src="/brand/mafiacl-wordmark-dark.svg" alt="MafiaCL" width="67" height="24"></a>
  <nav aria-label="Где вы на сайте"><ol>
    <li class="home-crumb"><a href="/ru/turniry">Турниры</a></li>
    <li${isHome ? ' aria-current="page"' : ""}>${isHome ? "MafiaCL Kings" : `<a href="${seasonHref}">MafiaCL Kings</a>`}</li>
  </ol></nav>
  <a class="acc" href="/ru/kabinet">Кабинет</a>
</div></div>
`;
}

export type KingsSeason = { id: number; slug: string };

/** Сезоны Kings: внутренний номер старого приложения ↔ год в адресе (берём с вкладок сезонов на странице). */
export async function getKingsSeasons(): Promise<KingsSeason[]> {
  "use cache: remote";
  cacheTag(KINGS_TAG);
  cacheLife("hours");
  const current = await getKingsSeasonPath();
  const currentId = Number(current.match(/\d+/)?.[0]);
  const seasons: KingsSeason[] = [];
  try {
    const page = await getKingsPage(current);
    for (const m of page.body.matchAll(/<a href="\/seasons\/(\d+)" class="season-chip[^"]*">\s*([^<]+?)\s*<\/a>/g)) {
      const label = m[2].trim();
      let slug = /^\d{4}$/.test(label) ? label : m[1];
      if (seasons.some((x) => x.slug === slug)) slug = `${slug}-${m[1]}`;
      seasons.push({ id: Number(m[1]), slug });
    }
  } catch (e) {
    console.error("getKingsSeasons failed", e instanceof Error ? e.message : e);
  }
  if (currentId && !seasons.some((x) => x.id === currentId)) seasons.push({ id: currentId, slug: String(currentId) });
  return seasons;
}

/** /seasons/12/ranking/premier → /ru/kings/2026/ranking/premier (адреса старого приложения → наши). */
export function toSiteUrl(legacy: string, seasons: KingsSeason[], locale: string): string {
  return legacy
    .replace(/^\/seasons\/(\d+)/, (m, id) => `/${locale}/kings/${seasons.find((x) => x.id === Number(id))?.slug ?? id}`)
    .replace(/^\/kings(?=$|[?#/])/, `/${locale}/kings`);
}

/** Ссылки и формы на странице старого приложения → наши адреса; плюс полоска сайта после <body>. */
export function prepareHtml(html: string, opts: { seasons: KingsSeason[]; locale: string; slug: string; isHome: boolean }): string {
  const { seasons, locale } = opts;
  const out = html.replace(/(href|action)="(\/seasons\/\d+[^"]*|\/kings)"/g, (_m, attr, url) => `${attr}="${toSiteUrl(url, seasons, locale)}"`);
  const bar = kingsSiteBar(`/${locale}/kings/${opts.slug}`, opts.isHome);
  return /<body[^>]*>/i.test(out) ? out.replace(/<body[^>]*>/i, (m) => m + bar) : bar + out;
}

/** Перенаправление старого приложения → адрес на нашем домене. */
export function localLocation(location: string | null, seasons: KingsSeason[], locale: string): string | null {
  if (!location) return null;
  try {
    const u = new URL(location, KINGS_ORIGIN);
    if (u.origin !== new URL(KINGS_ORIGIN).origin) return location;
    return toSiteUrl(u.pathname, seasons, locale) + u.search + u.hash;
  } catch {
    return location;
  }
}

const isAdmin = (req: Request) => /(?:^|;\s*)session=/.test(req.headers.get("cookie") ?? "");

/**
 * Ответ для страницы Kings: посетителям — из кеша, администратору Kings (cookie старого приложения)
 * и формам (POST) — напрямую, без кеша.
 */
export async function kingsResponse(req: Request, opts: { legacyPath: string; locale: string; slug: string; isHome: boolean; seasons: KingsSeason[] }) {
  const { legacyPath, seasons, locale } = opts;
  if (req.method === "POST" || isAdmin(req)) return forward(req, opts);
  let page: KingsPage;
  try {
    page = await getKingsPage(legacyPath);
  } catch (e) {
    console.error("kings page failed", legacyPath, e instanceof Error ? e.message : e);
    return new Response("Раздел MafiaCL Kings временно недоступен. Обновите страницу через минуту.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (page.status >= 300 && page.status < 400) {
    return new Response(null, { status: page.status, headers: { location: localLocation(page.location, seasons, locale) ?? `/${locale}` } });
  }
  const html = page.type.includes("text/html");
  return new Response(html ? prepareHtml(page.body, opts) : page.body, {
    status: page.status,
    headers: {
      "content-type": page.type,
      // На краю Vercel: минуту свежая, дальше отдаётся прежняя копия, пока в фоне готовится новая.
      "cache-control": page.status === 200 ? "public, s-maxage=60, stale-while-revalidate=604800" : "no-store",
    },
  });
}

async function forward(req: Request, opts: { legacyPath: string; locale: string; slug: string; isHome: boolean; seasons: KingsSeason[] }) {
  const headers = new Headers();
  for (const h of ["cookie", "content-type", "accept", "accept-language", "user-agent"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const res = await fetch(`${KINGS_ORIGIN}${opts.legacyPath}`, {
    method: req.method,
    headers,
    body: req.method === "POST" ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });
  const out = new Headers({ "cache-control": "private, no-store" });
  const type = res.headers.get("content-type");
  if (type) out.set("content-type", type);
  const loc = localLocation(res.headers.get("location"), opts.seasons, opts.locale);
  if (loc) out.set("location", loc);
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);
  if (type?.includes("text/html") && res.status === 200) {
    return new Response(prepareHtml(await res.text(), opts), { status: res.status, headers: out });
  }
  return new Response(res.body, { status: res.status, headers: out });
}
