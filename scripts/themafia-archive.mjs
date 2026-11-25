#!/usr/bin/env node
/**
 * Турниры клуба на the-mafia.net (2022–2024, до перехода на mafgame): страницы турниров и таблицы итогов.
 * Обходит страницы клубов (Prague и Kharkiv) и их архивы турниров, сохраняет в data/themafia/:
 *   tournament/<slug>.html — страница турнира (даты, место, ссылки на итоги);
 *   rate/<id>.html         — таблица итогов /tournament/rate/<id>.
 * Скрипты и стили вырезаются. Уже скачанные страницы не перекачивает.
 * Нужен интернет — запускается в GitHub Actions (.github/workflows/themafia-archive.yml).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://the-mafia.net";
const ROOT = "data/themafia";
const CLUBS = ["mafia-club-champions-league-prague", "mafia-club-champions-league-kharkiv"];
const UA = "Mozilla/5.0 (compatible; MafiaCL archive; +https://mafiacl.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch(BASE + path, { headers: { "user-agent": UA, "accept-language": "ru" } });
      if (res.ok) return res.text();
      if (res.status === 404) return null;
      console.warn(`${path}: ${res.status}`);
    } catch (e) {
      console.warn(`${path}: ${e.message}`);
    }
    await sleep(2500 * i);
  }
  return null;
}

const clean = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/(["'(])data:[^"')]+/g, "$1").replace(/>\s+</g, ">\n<");
const links = (html, re) => [...new Set([...html.matchAll(re)].map((m) => m[1]))];

mkdirSync(`${ROOT}/tournament`, { recursive: true });
mkdirSync(`${ROOT}/rate`, { recursive: true });
mkdirSync(`${ROOT}/club`, { recursive: true });

const tournaments = new Set();
for (const club of CLUBS) {
  const page = await get(`/club/${club}`);
  if (!page) continue;
  writeFileSync(`${ROOT}/club/${club}.html`, clean(page));
  for (const slug of links(page, /href="(?:https:\/\/the-mafia\.net)?\/tournament\/([a-z0-9-]+)"/g)) tournaments.add(slug);
  // Архив турниров клуба: /arch/tournaments/<club id> (с постраничной навигацией).
  for (const id of links(page, /\/arch\/tournaments\/(\d+)/g)) {
    for (let p = 0; p < 30; p++) {
      const arch = await get(`/arch/tournaments/${id}${p ? `?page=${p}` : ""}`);
      if (!arch) break;
      const found = links(arch, /href="(?:https:\/\/the-mafia\.net)?\/tournament\/([a-z0-9-]+)"/g).filter((s) => s !== "rate");
      const before = tournaments.size;
      found.forEach((s) => tournaments.add(s));
      if (tournaments.size === before) break;
      await sleep(500);
    }
  }
}
tournaments.delete("rate");
console.log(`Турниров: ${tournaments.size}`);

let saved = 0;
for (const slug of tournaments) {
  const file = `${ROOT}/tournament/${slug}.html`;
  let html = null;
  if (!existsSync(file)) {
    html = await get(`/tournament/${slug}`);
    if (!html) continue;
    writeFileSync(file, `<!-- ${BASE}/tournament/${slug} -->\n${clean(html)}`);
    saved++;
    await sleep(500);
  } else {
    html = (await import("node:fs")).readFileSync(file, "utf8");
  }
  for (const id of links(html, /\/tournament\/rate\/(\d+)/g)) {
    const rf = `${ROOT}/rate/${id}.html`;
    if (existsSync(rf)) continue;
    const rate = await get(`/tournament/rate/${id}`);
    if (rate) writeFileSync(rf, `<!-- ${BASE}/tournament/rate/${id} -->\n${clean(rate)}`), saved++;
    await sleep(500);
  }
}
console.log(`Сохранено: ${saved}`);
