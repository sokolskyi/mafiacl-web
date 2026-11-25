#!/usr/bin/env node
/**
 * Старый mafiacl.com (2016–2019) из веб-архива: страницы итогов турниров клуба
 * /mafia_stars_results/<id> (серии Mafia Champions League 2016/2017, Mafia Stars и др.).
 * Сохраняет исходный HTML ближайшего снимка в data/legacy-mafiacl/mafia_stars_results/<id>.html.
 * Нужен интернет — запускается в GitHub Actions (.github/workflows/legacy-mafiacl-archive.yml).
 * Уже скачанные страницы не перекачивает.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const DIR = "data/legacy-mafiacl/mafia_stars_results";
const FROM = 1;
const TO = 60;
const UA = "Mozilla/5.0 (compatible; MafiaCL archive; +https://mafiacl.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 1; i <= 4; i++) {
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

mkdirSync(DIR, { recursive: true });
let saved = 0;
for (let id = FROM; id <= TO; id++) {
  const file = `${DIR}/${id}.html`;
  if (existsSync(file)) continue;
  const avail = await get(`https://archive.org/wayback/available?url=mafiacl.com/mafia_stars_results/${id}`);
  const snap = avail ? (await avail.json())?.archived_snapshots?.closest : null;
  if (!snap?.available) {
    console.log(`${id}: снимка нет`);
    await sleep(1000);
    continue;
  }
  const raw = snap.url.replace(/\/web\/(\d+)\//, "/web/$1id_/").replace(/^http:/, "https:");
  const page = await get(raw);
  if (page) {
    writeFileSync(file, `<!-- ${snap.url} -->\n${await page.text()}`);
    saved++;
    console.log(`${id}: ${snap.timestamp}`);
  }
  await sleep(1500);
}
console.log(`Сохранено: ${saved}`);
