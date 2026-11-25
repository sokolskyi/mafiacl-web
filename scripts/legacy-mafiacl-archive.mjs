#!/usr/bin/env node
/**
 * Старый mafiacl.com (2016–2019) из веб-архива.
 *  - /mafia_stars_results/<id> — итоги турниров клуба (серии Mafia Champions League 2016/2017, Mafia Stars,
 *    Маф-марафоны, «Зачётные дни» и др.) → data/legacy-mafiacl/mafia_stars_results/<id>.html;
 *  - /show_game/<id> — протоколы игр, на которые ссылаются сохранённые страницы итогов
 *    → data/legacy-mafiacl/show_game/<id>.html.
 * Список снимков берётся из CDX веб-архива. Уже скачанные страницы не перекачивает.
 * Нужен интернет — запускается в GitHub Actions (.github/workflows/legacy-mafiacl-archive.yml).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const ROOT = "data/legacy-mafiacl";
const UA = "Mozilla/5.0 (compatible; MafiaCL archive; +https://mafiacl.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.ok) return res;
      if (res.status === 404) return null;
      console.warn(`${url}: ${res.status}`);
    } catch (e) {
      console.warn(`${url}: ${e.message}`);
    }
    await sleep(3000 * i);
  }
  return null;
}

/** Последний удачный снимок каждой страницы раздела: id → timestamp. */
async function snapshots(path) {
  const res = await get(`https://web.archive.org/cdx/search/cdx?url=mafiacl.com/${path}/*&output=json&filter=statuscode:200&fl=original,timestamp`);
  const rows = res ? await res.json() : [];
  const out = new Map();
  for (const [original, timestamp] of rows.slice(1)) {
    const m = original.match(new RegExp(`/${path}/(\\d+)`));
    if (m && (!out.has(m[1]) || out.get(m[1]).timestamp < timestamp)) out.set(m[1], { original, timestamp });
  }
  return out;
}

async function save(dir, id, snap) {
  const file = `${dir}/${id}.html`;
  if (existsSync(file)) return false;
  const page = await get(`https://web.archive.org/web/${snap.timestamp}id_/${snap.original}`);
  if (!page) return false;
  writeFileSync(file, `<!-- http://web.archive.org/web/${snap.timestamp}/${snap.original} -->\n${await page.text()}`);
  return true;
}

let saved = 0;
const results = `${ROOT}/mafia_stars_results`;
mkdirSync(results, { recursive: true });
const rs = await snapshots("mafia_stars_results");
console.log(`Страниц итогов в веб-архиве: ${rs.size}`);
for (const [id, snap] of rs) {
  if (await save(results, id, snap)) saved++, await sleep(700);
}

// Протоколы игр — только те, на которые ссылаются сохранённые итоги.
const games = `${ROOT}/show_game`;
mkdirSync(games, { recursive: true });
const wanted = new Set();
for (const f of readdirSync(results)) {
  for (const m of readFileSync(`${results}/${f}`, "utf8").matchAll(/show_game\/(\d+)/g)) wanted.add(m[1]);
}
const gs = await snapshots("show_game");
const missing = [...wanted].filter((id) => !gs.has(id));
console.log(`Игр в итогах: ${wanted.size}, в веб-архиве: ${[...wanted].filter((id) => gs.has(id)).length}`);
if (missing.length) console.log(`Нет в веб-архиве: ${missing.length}`);
for (const id of wanted) {
  const snap = gs.get(id);
  if (snap && (await save(games, id, snap))) saved++, await sleep(700);
}
console.log(`Сохранено: ${saved}`);
