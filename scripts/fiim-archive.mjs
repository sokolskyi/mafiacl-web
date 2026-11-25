#!/usr/bin/env node
/**
 * Архив турниров клуба с ФИИМ (fiim.world): сохранить к себе страницы итогов и протоколы игр,
 * чтобы таблицы можно было показать и пересчитать, даже если на ФИИМ их удалят.
 *
 * Список турниров — data/fiim/tournaments.json (ours = турнир клуба, project = серия лиги клуба).
 * Для каждого турнира с fiim_id сохраняет в data/fiim/raw/:
 *   <id>.html        — основная часть страницы турнира (описание, итоги, лучшие игроки), без скриптов и встроенных картинок;
 *   <id>-games.html  — протоколы игр по турам (/tournaments/<id>/old_games_table).
 * Уже скачанные файлы не перекачивает (для повторной загрузки удалите файл).
 *
 * Нужен интернет — запускается в GitHub Actions (.github/workflows/fiim-archive.yml).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAW = "data/fiim/raw";
const UA = "Mozilla/5.0 (compatible; MafiaCL archive; +https://mafiacl.com)";
const list = JSON.parse(readFileSync("data/fiim/tournaments.json", "utf8")).tournaments.filter(
  (t) => t.fiim_id && (t.ours || t.project),
);

/** Основная часть страницы: от первой <section> до подвала, без <script>, <style> и форм входа. */
function mainPart(html) {
  const start = html.indexOf("<section");
  const end = html.lastIndexOf("<footer");
  const body = html.slice(start >= 0 ? start : 0, end > start ? end : html.length);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/(["'(])data:[^"')]+/g, "$1") // встроенные картинки (афиши в base64) — мегабайты без пользы
    .replace(/>\s+</g, ">\n<")
    .replace(/[ \t]{2,}/g, " ");
}

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "ru" } });
    if (res.ok) return res.text();
    if (res.status === 404) return null;
    console.warn(`${url}: ${res.status}, попытка ${attempt}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`Не удалось скачать ${url}`);
}

mkdirSync(RAW, { recursive: true });
let saved = 0;
for (const t of list) {
  const page = join(RAW, `${t.fiim_id}.html`);
  const games = join(RAW, `${t.fiim_id}-games.html`);
  if (!existsSync(page)) {
    const html = await get(`https://fiim.world/tournaments/${t.fiim_id}`);
    if (html) writeFileSync(page, `<!-- ${t.url} · ${new Date().toISOString().slice(0, 10)} -->\n${mainPart(html)}`), saved++;
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!existsSync(games)) {
    const html = await get(`https://fiim.world/tournaments/${t.fiim_id}/old_games_table`);
    if (html) writeFileSync(games, `<!-- ${t.url}/old_games_table · ${new Date().toISOString().slice(0, 10)} -->\n${mainPart(html)}`), saved++;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`${t.fiim_id} ${t.name}`);
}
console.log(`Сохранено файлов: ${saved}, турниров в списке: ${list.length}`);
