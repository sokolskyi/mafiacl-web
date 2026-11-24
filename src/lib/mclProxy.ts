import "server-only";

// Страницы MCL Europe живут в старом проекте Vercel «mafiacl» (их обновляет робот).
// Новый сайт отдаёт их на своём домене и добавляет сверху полоску MafiaCL —
// чтобы было видно, что это раздел того же сайта, и был путь обратно.
const LEGACY = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";

/** Полоска сайта над шапкой MCL. Страницы MCL на русском — ссылки ведут на русскую версию. */
const SITE_BAR = `
<style id="mafiacl-sitebar-css">
.mcl-sitebar{position:relative;z-index:31;background:#1c0308;border-bottom:1px solid rgba(253,255,194,.12);font-family:var(--ff-b,Inter,system-ui,sans-serif);font-size:14px;line-height:1}
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
/* Старая строка «MafiaCL / MCL Europe 2026» со старого сайта — её заменяет полоска выше. */
.dv-crumb{display:none!important}
/* Вступительное видео — на весь экран, а не маленьким окошком посередине. */
#intro video{width:100vw!important;height:100vh!important;height:100dvh!important;object-fit:contain}
</style>
<div class="mcl-sitebar"><div class="in">
  <a class="logo" href="/ru" aria-label="MafiaCL — главная"><img src="/brand/mafiacl-wordmark-dark.svg" alt="MafiaCL" width="67" height="24"></a>
  <nav aria-label="Где вы на сайте"><ol>
    <li class="home-crumb"><a href="/ru/turniry">Турниры</a></li>
    <li><a href="/ru/turniry/mafia-champions-league">Mafia Champions League</a></li>
    <li aria-current="page">Europe 2026</li>
  </ol></nav>
  <a class="acc" href="/ru/kabinet">Кабинет</a>
</div></div>
`;

/** Отдать файл MCL со старого сайта; в HTML-страницы вставить полоску сайта сразу после <body>. */
export async function proxyMcl(file: string): Promise<Response> {
  if (!/^[\w.-]+$/.test(file)) return new Response("Not found", { status: 404 });
  const upstream = await fetch(`${LEGACY}/mcl/${file === "index.html" ? "" : file}`, { cache: "no-store" });
  const type = upstream.headers.get("content-type") ?? "";
  const headers = new Headers();
  if (type) headers.set("content-type", type);
  // Данные MCL обновляются роботом раз в несколько минут — короткий кэш на CDN.
  headers.set("cache-control", "public, s-maxage=60, stale-while-revalidate=300");
  if (!upstream.ok || !type.includes("text/html")) {
    return new Response(upstream.body, { status: upstream.status, headers });
  }
  const html = await upstream.text();
  const withBar = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + SITE_BAR) : SITE_BAR + html;
  return new Response(withBar, { status: 200, headers });
}
