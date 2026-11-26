/**
 * Голосовые команды бланка ведущего: из распознанной фразы — состав по местам, фолы и выставления.
 * Только разбор текста (распознаёт речь браузер), без обращений к серверу — работает и в fun-бланке.
 *
 * Примеры:
 *   «первый Тревери, второй Гармония, третий YeS»     → места 1–3
 *   «место пять Лжец», «5 Лжец»                        → место 5
 *   «Гармония» (без номера)                            → на первое свободное место
 *   «фол пятому», «пятый фол», «два фола третьему»     → фол(ы)
 *   «снять фол пятому»                                 → минус фол
 *   «выставляю третьего», «третий выставляет седьмого» → выставление (с тем, кто выставил)
 *   «снять выставление третьего»                       → убрать выставление
 */

export type VoiceCommand =
  | { kind: "seat"; seat: number | null; text: string }
  | { kind: "foul"; seat: number }
  | { kind: "unfoul"; seat: number }
  | { kind: "nominate"; seat: number; by?: number }
  | { kind: "unnominate"; seat: number };

/** Основы числительных (рус., укр., англ., чеш.): сначала длинные, чтобы «пятнадцать» не стало «пять». */
const NUMBER_STEMS: [number, RegExp][] = [
  [11, /^(одиннадцат|одинадцят|eleven|jedenáct|jedenact)/],
  [12, /^(двенадцат|дванадцят|twelv|dvanáct|dvanact)/],
  [13, /^(тринадцат|тринадцят|thirteen|třináct|trinact)/],
  [14, /^(четырнадцат|чотирнадцят|fourteen|čtrnáct|ctrnact)/],
  [15, /^(пятнадцат|п'ятнадцят|пятнадцят|fifteen|patnáct|patnact)/],
  [16, /^(шестнадцат|шістнадцят|sixteen|šestnáct|sestnact)/],
  [17, /^(семнадцат|сімнадцят|seventeen|sedmnáct|sedmnact)/],
  [18, /^(восемнадцат|вісімнадцят|eighteen|osmnáct|osmnact)/],
  [19, /^(девятнадцат|дев'ятнадцят|девятнадцят|nineteen|devatenáct|devatenact)/],
  [20, /^(двадцат|двадцят|twent|dvacát|dvacet|dvacat)/],
  [10, /^(десят|tenth$|ten$|deset|desát|desat)/],
  [1, /^(один$|одна$|одно$|одного|одному|перв|перш|one$|first|jedn|prvn)/],
  [2, /^(два$|две$|двух|двум|втор|друг|two$|second|dvě$|dve$|druh)/],
  [3, /^(три$|трех|трем|трет|трь|three|third|tři$|tri$|třet|tret)/],
  [4, /^(четыр|четверт|четвёрт|чотир|четвер|four|čtyř|ctyr|čtvrt|ctvrt)/],
  [5, /^(пят|п'ят|пять|five|fifth|pět$|pet$|pát|pat[yi])/],
  [6, /^(шест|шіст|шост|six|šest|sest)/],
  [7, /^(сем|седьм|сім|сьом|seven|sedm)/],
  [8, /^(восем|восьм|вісім|eight|osm)/],
  [9, /^(девят|дев'ят|nine|ninth|devět|devet|devát|devat)/],
];

const FOUL = /^(фол|фал|фолы|фола|фолов|foul|faul)/;
const NOMINATE = /^(выстав|вистав|кандидат|номинир|номінув|nomin|navrh|navrž)/;
const CANCEL = /^(снят|сним|сниму|убер|убра|отмен|минус|прибер|скас|зніми|знят|zruš|zrus|odeb|remove|cancel|minus|undo)/;
/** Служебные слова в составе: «место пять — Лжец», «игрок номер три Гармония». */
const FILLER = new Set(["место", "места", "номер", "игрок", "игрока", "сидит", "на", "это", "у", "нас", "місце", "гравець", "це", "seat", "number", "player", "is", "místo", "hráč", "číslo", "і", "и", "а", "and", "a"]);
/** «два фола» — число перед словом «фол» здесь не номер места. */
const COUNT_BEFORE_FOUL = /^(два|две|два|три|двa|two|three|dva|dvě|tři)$/;

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’ʼ`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Номер места из слова: «5», «5-й», «пятому», «п'ятий», «fifth». */
export function seatNumber(token: string): number | null {
  const d = token.match(/^(\d{1,2})(й|я|е|ый|ий|ой|го|му|th|st|nd|rd|\.)?$/);
  if (d) return Number(d[1]);
  for (const [n, re] of NUMBER_STEMS) if (re.test(token)) return n;
  return null;
}

/** Разбор фразы. seating — нулевая ночь (состав), иначе — фолы и выставления. maxSeat — число мест за столом. */
export function parseVoice(text: string, seating: boolean, maxSeat = 10): VoiceCommand[] {
  const tokens = normalize(text);
  if (!tokens.length) return [];
  const num = (i: number) => {
    const n = i >= 0 && i < tokens.length ? seatNumber(tokens[i]) : null;
    return n !== null && n >= 1 && n <= maxSeat ? n : null;
  };
  return seating ? parseSeating(tokens, num) : parseDay(tokens, num);
}

function parseSeating(tokens: string[], num: (i: number) => number | null): VoiceCommand[] {
  const out: { seat: number | null; words: string[] }[] = [];
  let cur: { seat: number | null; words: string[] } | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const n = num(i);
    if (n !== null) {
      if (cur && (cur.words.length || cur.seat !== null)) out.push(cur);
      cur = { seat: n, words: [] };
      continue;
    }
    if (FILLER.has(tokens[i])) continue;
    cur ??= { seat: null, words: [] };
    cur.words.push(tokens[i]);
  }
  if (cur) out.push(cur);
  return out.filter((x) => x.words.length).map((x) => ({ kind: "seat" as const, seat: x.seat, text: x.words.join(" ") }));
}

function parseDay(tokens: string[], num: (i: number) => number | null): VoiceCommand[] {
  const out: VoiceCommand[] = [];
  const used = new Set<number>();
  // Ближайший номер места к слову-команде: сначала после (до 3 слов), потом перед (до 2 слов).
  const near = (i: number, after = 3, before = 2) => {
    for (let k = 1; k <= after; k++) if (!used.has(i + k) && num(i + k) !== null) return i + k;
    for (let k = 1; k <= before; k++) if (!used.has(i - k) && num(i - k) !== null) return i - k;
    return null;
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const cancel = (i > 0 && CANCEL.test(tokens[i - 1])) || (i > 1 && CANCEL.test(tokens[i - 2]));
    if (FOUL.test(tok)) {
      // «два фола третьему»: число прямо перед «фол» — сколько фолов, если после есть номер места.
      let times = 1;
      const after = near(i, 3, 0);
      if (after !== null && i > 0 && COUNT_BEFORE_FOUL.test(tokens[i - 1])) {
        times = num(i - 1) ?? 1;
        used.add(i - 1);
      }
      const j = after ?? near(i, 0, 2);
      if (j === null) continue;
      used.add(j);
      for (let k = 0; k < times; k++) out.push({ kind: cancel ? "unfoul" : "foul", seat: num(j)! });
      continue;
    }
    if (NOMINATE.test(tok)) {
      const j = near(i);
      if (j === null) continue;
      used.add(j);
      if (cancel) {
        out.push({ kind: "unnominate", seat: num(j)! });
        continue;
      }
      // «третий выставляет седьмого»: номер перед глаголом — кто выставил.
      let by: number | undefined;
      if (j > i) {
        for (let k = 1; k <= 2; k++) {
          if (!used.has(i - k) && num(i - k) !== null) {
            by = num(i - k)!;
            used.add(i - k);
            break;
          }
        }
      }
      out.push(by && by !== num(j) ? { kind: "nominate", seat: num(j)!, by } : { kind: "nominate", seat: num(j)! });
    }
  }
  return out;
}
