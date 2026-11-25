import "server-only";
import { cacheLife, cacheTag } from "next/cache";

// Раздел MafiaCL Kings (/seasons/...) живёт в старом приложении (Flask + Neon): страница сезона
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
export function kingsSiteBar(path: string): string {
  const season = path.match(/^\/seasons\/(\d+)/)?.[1];
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
    ${season ? `<li><a href="/seasons/${season}">MafiaCL Kings</a></li><li aria-current="page">Сезон ${season}</li>` : `<li aria-current="page">MafiaCL Kings</li>`}
  </ol></nav>
  <a class="acc" href="/ru/kabinet">Кабинет</a>
</div></div>
`;
}

/** Вставить полоску сайта сразу после <body>. */
export function withSiteBar(html: string, path: string): string {
  const bar = kingsSiteBar(path);
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + bar) : bar + html;
}

/** Адрес перенаправления старого приложения → адрес на нашем домене. */
export function localLocation(location: string | null): string | null {
  if (!location) return null;
  try {
    const u = new URL(location, KINGS_ORIGIN);
    return u.origin === new URL(KINGS_ORIGIN).origin ? u.pathname + u.search + u.hash : location;
  } catch {
    return location;
  }
}
