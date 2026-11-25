#!/usr/bin/env node
/**
 * Архив MCL Europe 2026: перенести к себе всё, что страницы ещё берут с серверов mafgame.
 *
 * 1. Аватарки игроков (storage.googleapis.com/mafgame-prod и web-prod.s3.nl-ams.scw.cloud) —
 *    скачать в public/mcl/assets/avatars/ и заменить ссылки в страницах и данных на свои.
 * 2. Исходные данные финала с mafgame (турнир 757: игры и итоговая таблица) — сохранить
 *    в data/mcl-2026/, чтобы таблицу финала можно было пересчитать, даже если турнир удалят.
 *
 * Нужен интернет — запускается в GitHub Actions (.github/workflows/mcl-archive.yml).
 * Повторный запуск безопасен: уже перенесённые ссылки не трогает.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = "public/mcl";
const AVATARS = join(ROOT, "assets/avatars");
const RAW = "data/mcl-2026";
const UA = "Mozilla/5.0 (compatible; MafiaCL archive; +https://mafiacl.com)";
const REMOTE = /https:\/\/(?:storage\.googleapis\.com\/mafgame-prod|web-prod\.s3\.nl-ams\.scw\.cloud)\/files\/uploads\/[^"'\s)\\<>]+/g;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(ROOT).filter((p) => /\.(html|js|json)$/.test(p));
const urls = new Set(files.flatMap((p) => readFileSync(p, "utf8").match(REMOTE) ?? []));
console.log(`Аватарок на серверах mafgame: ${urls.size}`);

mkdirSync(AVATARS, { recursive: true });
const local = new Map();
let failed = 0;
for (const url of urls) {
  const ext = (extname(new URL(url).pathname) || ".jpg").toLowerCase();
  const name = createHash("sha1").update(url).digest("hex").slice(0, 16) + ext;
  const path = join(AVATARS, name);
  if (!existsSync(path)) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      failed++;
      console.warn(`не скачалась: ${url} — ${e.message}`);
      continue;
    }
  }
  local.set(url, `/mcl/assets/avatars/${name}`);
}
for (const p of files) {
  const text = readFileSync(p, "utf8");
  const next = text.replace(REMOTE, (u) => local.get(u) ?? u);
  if (next !== text) writeFileSync(p, next);
}
console.log(`Перенесено: ${local.size}, не скачалось: ${failed}`);

// Исходные данные турнира 757 с mafgame: JSON из data-page (Inertia) страниц игр и итогов.
mkdirSync(RAW, { recursive: true });
for (const page of ["game_results", "results"]) {
  const url = `https://mafgame.org/tournaments/757/${page}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/data-page="([^"]+)"/);
    if (!m) throw new Error("нет data-page");
    const json = m[1].replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    writeFileSync(join(RAW, `mafgame-757-${page}.json`), JSON.stringify(JSON.parse(json), null, 1) + "\n");
    console.log(`сохранено: ${url}`);
  } catch (e) {
    console.warn(`не получилось сохранить ${url}: ${e.message}`);
  }
}
