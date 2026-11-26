/**
 * Поиск ника «как набрали»: ведущий может печатать ник не в той раскладке
 * («Екуумкн» вместо «Trevery») или кириллицей вместо латиницы («Тревори»).
 * Здесь нет обращений к серверу — модуль работает и в браузере.
 */

export type NickOption = { nickname: string; id: string | null };

// Клавиши латинской раскладки QWERTY → русская ЙЦУКЕН (та же физическая клавиша).
const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const RU = "ёйцукенгшщзхъфывапролджэячсмитьбю";
// Украинская раскладка отличается несколькими клавишами.
const UK_EXTRA: Record<string, string> = { і: "s", ї: "]", є: "'", ґ: "`" };

const enToRuMap = new Map<string, string>();
const ruToEnMap = new Map<string, string>();
for (let i = 0; i < EN.length; i++) {
  enToRuMap.set(EN[i], RU[i]);
  ruToEnMap.set(RU[i], EN[i]);
}
for (const [uk, en] of Object.entries(UK_EXTRA)) ruToEnMap.set(uk, en);

const swap = (s: string, map: Map<string, string>) => [...s].map((c) => map.get(c) ?? c).join("");

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", ё: "e", є: "e", ж: "zh", з: "z", и: "i", і: "i", ї: "i",
  й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "u", я: "a",
};

/**
 * «Звуковой скелет» ника латиницей: одинаковый для «Trevery», «Тревори», «Тревери».
 * Буквы, которые пишут по-разному (y/i, c/k/q, w/v, ph/f…), сводятся к одной,
 * повторы схлопываются.
 */
export function skeleton(s: string): string {
  let x = [...s.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join("");
  x = x
    .replace(/ph/g, "f")
    .replace(/ow(?![aeiou])/g, "ou")
    .replace(/ck|q|c(?=[aou])/g, "k")
    .replace(/c/g, "s")
    .replace(/w/g, "v")
    .replace(/x/g, "ks")
    .replace(/j/g, "i")
    .replace(/y/g, "i")
    .replace(/ee|ea/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1");
  return x;
}

/** Согласные скелета — на случай, если гласные расслышали по-разному («Тревори» ~ «Trevery»). */
const consonants = (s: string) => s.replace(/[aeiou]/g, "");

/** Расстояние Левенштейна, обрезанное сверху: нужно только «0, 1, 2 или больше». */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

type Indexed = NickOption & { lower: string; skel: string; cons: string };

export function indexNicks(options: NickOption[]): Indexed[] {
  return options.map((o) => {
    const skel = skeleton(o.nickname);
    return { ...o, lower: o.nickname.toLowerCase().replace(/ё/g, "е"), skel, cons: consonants(skel) };
  });
}

/** Подсказки для набранного текста: сначала точные совпадения, потом «не та раскладка», потом похожие по звучанию. */
export function searchNicks(index: Indexed[], query: string, limit = 6): NickOption[] {
  const q = query.trim().toLowerCase().replace(/ё/g, "е");
  if (!q) return [];
  // Что ведущий «имел в виду»: как набрано, и то же самое в другой раскладке.
  const typed = [...new Set([q, swap(q, enToRuMap), swap(q, ruToEnMap)])];
  const skels = [...new Set(typed.map(skeleton).filter(Boolean))];
  const cons = [...new Set(skels.map(consonants).filter((c) => c.length >= 2))];

  const scored: { o: Indexed; score: number }[] = [];
  for (const o of index) {
    let score = 0;
    for (const t of typed) {
      if (o.lower.startsWith(t)) score = Math.max(score, t === q ? 100 : 95);
      else if (t.length >= 2 && o.lower.includes(t)) score = Math.max(score, t === q ? 85 : 80);
    }
    if (score < 70) {
      for (const s of skels) {
        if (o.skel.startsWith(s)) score = Math.max(score, 70);
        else if (s.length >= 4) {
          const head = o.skel.slice(0, s.length);
          const d = distance(s, head, s.length >= 7 ? 2 : 1);
          if (d <= (s.length >= 7 ? 2 : 1)) score = Math.max(score, 60 - d * 5);
        }
      }
      for (const c of cons) if (c.length >= 3 && o.cons.startsWith(c)) score = Math.max(score, 45);
    }
    if (score > 0) scored.push({ o, score: score + (o.id ? 3 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.o.nickname.length - b.o.nickname.length || a.o.nickname.localeCompare(b.o.nickname));
  return scored.slice(0, limit).map(({ o }) => ({ nickname: o.nickname, id: o.id }));
}

/**
 * Ник из распознанной речи: браузер пишет его «как слышно» («ес» вместо YeS, «тревори» вместо Trevery).
 * Сначала обычный поиск, потом — самое близкое звучание целиком (расстояние по скелету).
 * null — уверенного совпадения нет.
 */
export function matchSpokenNick(index: Indexed[], spoken: string): NickOption | null {
  const q = spoken.trim().toLowerCase().replace(/ё/g, "е").replace(/^(мистер|містер)\s+/, "mr ").replace(/^(миссис|місіс)\s+/, "mrs ");
  if (!q) return null;
  const exact = index.find((o) => o.lower === q);
  if (exact) return { nickname: exact.nickname, id: exact.id };
  const s = skeleton(q);
  if (!s) return null;
  const max = s.length <= 3 ? 1 : s.length <= 6 ? 2 : 3;
  let best: { o: Indexed; d: number } | null = null;
  for (const o of index) {
    // «ес» ~ «ies» (YeS): в начале скелета у латинских ников часто лишняя «i».
    const d = Math.min(distance(s, o.skel, max), distance(s, o.skel.replace(/^i/, ""), max));
    if (d <= max && (!best || d < best.d || (d === best.d && !!o.id && !best.o.id))) best = { o, d };
  }
  if (best) return { nickname: best.o.nickname, id: best.o.id };
  const [top] = searchNicks(index, q, 1);
  return top ?? null;
}
