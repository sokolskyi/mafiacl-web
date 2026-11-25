#!/usr/bin/env node
/**
 * Архив раздела MCL Europe 2026 на новом сайте.
 *
 * Сезон и финал закончились, поэтому страницы MCL больше не берутся со старого проекта и с mafgame:
 * их копия лежит в public/mcl/ (статические файлы). Скрипт переносит страницы из старого репозитория
 * (sokolskyi/mafiacl, папка public/mcl) и вставляет в них то, что нужно новому сайту:
 *   — полоску MafiaCL над шапкой турнира, вступительное видео на весь экран;
 *   — на final.html блок «Фото финала» (public/mcl-final/) и таблицу финала из снимка data/final.json
 *     вместо живого запроса к /api/mcl/final.json (снимок 25.11.2026 — итог всех 16 игр финала);
 *   — убирает ссылки на файлы, которых нет (share.js, аналитика старого проекта).
 * Запуск: node scripts/mcl-freeze.mjs ../mafiacl/public/mcl
 * Аватарки игроков с серверов mafgame переносит scripts/mcl-archive-avatars.mjs (нужен интернет).
 */
import { cpSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const from = process.argv[2];
if (!from || !existsSync(join(from, "index.html"))) {
  console.error("Укажите папку public/mcl старого сайта: node scripts/mcl-freeze.mjs ../mafiacl/public/mcl");
  process.exit(1);
}
const to = "public/mcl";
const snapshot = existsSync(join(to, "data/final.json")) ? readFileSync(join(to, "data/final.json")) : null;
cpSync(from, to, { recursive: true });
if (snapshot) writeFileSync(join(to, "data/final.json"), snapshot);

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
/* Кнопки эфира и таблицы финала в первом экране — то же есть в разделе Final, а таблица t757 уже не открывается. */
.hero .cta a.ytl,.hero .cta a[href="t757.html"]{display:none!important}
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
<script>/* ?intro=1 — показать вступительное видео ещё раз (обычно оно показывается раз в сутки). */
try{if(/[?&]intro=1/.test(location.search))localStorage.removeItem("mclIntro")}catch(e){}</script>
`;

const photo = (name, w, h, alt, cls = "") =>
  `<a class="fp${cls}" href="/mcl-final/${name}-1800.webp" target="_blank" rel="noopener">` +
  `<img src="/mcl-final/${name}-900.webp" srcset="/mcl-final/${name}-900.webp 900w, /mcl-final/${name}-1800.webp 1800w" ` +
  `sizes="(max-width:760px) 100vw, ${cls ? "1100px" : "550px"}" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"></a>`;

/** Фото финала MCL Europe 2026 (файлы в public/mcl-final) — блок сразу после итогов, перед составом. */
const FINAL_PHOTOS = `
<style>
#photos .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
#photos .fp{display:block;overflow:hidden;border-radius:4px;border:1px solid var(--line,rgba(255,255,255,.12));background:#000}
#photos .fp.wide{grid-column:1/-1}
#photos .fp img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
#photos .fp:hover img{transform:scale(1.02)}
@media (max-width:760px){#photos .fgrid{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){#photos .fp img{transition:none}#photos .fp:hover img{transform:none}}
</style>
<section id="photos"><div class="wrap">
  <div class="sechead"><div class="no">★</div><h2 class="h">Фото финала</h2><div class="line"></div></div>
  <div class="fgrid">
    ${photo("group", 1800, 915, "Финалисты MCL Europe 2026 с медалями и дипломами за финальным столом", " wide")}
    ${photo("podium", 1800, 1268, "Призёры финала: 1 место — KEX, 2 место — TOPS, 3 место — DOVOD")}
    ${photo("champion", 1800, 1200, "Победитель MCL Europe 2026 KEX с кубком, медалью и наградой MVP")}
  </div>
</div></section>
`;


for (const file of readdirSync(to).filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(join(to, file), "utf8");
  if (html.includes("mcl-sitebar")) continue;
  html = html.replace(/<body[^>]*>/i, (m) => m + SITE_BAR);
  html = html.replace(/<script[^>]*src="\/assets\/share\.js[^"]*"[^>]*><\/script>\s*/g, "");
  html = html.replace(/<script[^>]*src="\/_vercel\/insights\/script\.js"[^>]*><\/script>\s*/g, "");
  if (file === "final.html") {
    html = html.replace('<section id="squad">', FINAL_PHOTOS + '<section id="squad">');
    html = html.replace("fetch('/api/mcl/final.json',{cache:'no-store'})", "fetch('data/final.json',{cache:'no-cache'})");
  }
  writeFileSync(join(to, file), html);
  console.log("ok", file);
}
