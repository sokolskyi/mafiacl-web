/** Разбор страниц imafia.org (обычный HTML). Без сети — только текст, чтобы можно было проверить на сохранённой странице. */

export type ImafiaTournament = {
  id: number;
  name: string;
  /** YYYY-MM-DD */
  startsOn: string | null;
  days: number;
  /** «Турнір», «Серія», … — серии лиг не считаем. */
  type: string | null;
  results: { userId: number; nickname: string; place: number }[];
};

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Значение строки таблицы «Інфо»: <td>Дата</td> <td>07.11.2026</td>. */
function infoCell(html: string, label: string): string | null {
  const re = new RegExp(`<td>\\s*${label}\\s*</td>\\s*<td>([\\s\\S]*?)</td>`, "i");
  const m = html.match(re);
  return m ? decode(m[1]) : null;
}

export function parseImafiaTournament(id: number, html: string): ImafiaTournament | null {
  const title = html.match(/<meta property="og:title" content="([^"]*)"/i)?.[1] ?? html.match(/<title>([^<]*)<\/title>/i)?.[1];
  const date = infoCell(html, "Дата");
  if (!title || !date) return null;
  const d = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const days = Number(infoCell(html, "Тривалість \\(днів\\)") ?? "1");
  const table = html.match(/<table id="table_results">([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const results: ImafiaTournament["results"] = [];
  for (const m of table.matchAll(/<tr>\s*<td>\s*(\d+)\s*<\/td>\s*<td>\s*<a href="https?:\/\/imafia\.org\/u\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    results.push({ place: Number(m[1]), userId: Number(m[2]), nickname: decode(m[3]).slice(0, 60) });
  }
  return {
    id,
    name: decode(title).slice(0, 200),
    startsOn: d ? `${d[3]}-${d[2]}-${d[1]}` : null,
    days: Number.isFinite(days) && days > 0 ? Math.min(days, 14) : 1,
    type: infoCell(html, "Тип турніра"),
    results,
  };
}

/** id участников клуба из блока «Члени клуба» страницы клуба. */
export function parseImafiaClubMembers(html: string): Set<number> {
  const start = html.indexOf('id="club-members"');
  if (start < 0) return new Set();
  // Следующий раздел страницы (внутренний «content_tabs_block_inner» не считается).
  const next = html.indexOf('class="content_tabs_block content_tabs_block_js"', start + 20);
  const block = html.slice(start, next > 0 ? next : undefined);
  return new Set([...block.matchAll(/imafia\.org\/u\/(\d+)/g)].map((m) => Number(m[1])));
}

/** Наибольший id турнира в списке /tournaments. */
export function maxImafiaTournamentId(html: string): number | null {
  const ids = [...html.matchAll(/imafia\.org\/tournament\/(\d+)/g)].map((m) => Number(m[1]));
  return ids.length ? Math.max(...ids) : null;
}

export const isImafiaSeries = (type: string | null) => !!type && /сері|сери|series/i.test(type);
