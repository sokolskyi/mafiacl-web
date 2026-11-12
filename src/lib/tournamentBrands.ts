import type { HallEntry } from "@/lib/hallArchive";
import type { Tournament } from "@/lib/tournaments";

/**
 * Турниры клуба «без года»: Central Cup, Championship, Kings… Каждый турнир (из базы турниров или из
 * архива зала славы) относится к бренду по названию — новый «Central Cup 2027» из админки попадёт сюда сам.
 */
export const BRANDS = [
  { key: "championship", slug: "mafiacl-championship", match: /mafiacl championship/i },
  { key: "centralCup", slug: "central-cup", match: /^(four seasons:\s*)?central cup/i },
  { key: "winners", slug: "turnir-pobediteley", match: /турнир победителей/i },
  { key: "kings", slug: "mafiacl-kings", match: /mafiacl kings/i, project: "/kings" },
  { key: "mcl", slug: "mafia-champions-league", match: /mafia champions league/i, project: "/mcl/" },
  { key: "battle", slug: "bitva-chempionov", match: /битва чемпионов/i },
  { key: "centralEuroCup", slug: "central-euro-cup", match: /central euro cup/i },
  { key: "protocol", slug: "mafiacl-protocol-4", match: /protocol 4/i },
  { key: "czechMeHard", slug: "czech-me-hard", match: /czech me hard/i },
  { key: "worldChampionship", slug: "mafia-world-championship", match: /mafia world championship/i },
  { key: "gameOfMasks", slug: "game-of-masks", match: /game of masks/i },
  { key: "teamEuro", slug: "team-european-championship", match: /командный чемпионат европы/i },
  { key: "euromaf", slug: "euromaf", match: /euromaf/i },
  { key: "cityLeague", slug: "city-league", match: /city league/i },
  { key: "slobozhanshchyna", slug: "kubok-slobozhanshchyny", match: /кубок слобожанщины/i },
  { key: "kharkivCup", slug: "mafiacl-kharkiv-cup", match: /kharkiv cup/i },
  { key: "marathon", slug: "maf-marathon", match: /маф-марафон/i },
  { key: "ust", slug: "ukrainian-students-tournament", match: /ukrainian students tournament/i },
  { key: "studentLeague", slug: "student-league", match: /student league/i },
  { key: "mafiaStars", slug: "mafia-stars", match: /mafia stars/i },
] as const;

export type Brand = (typeof BRANDS)[number];
export type BrandKey = Brand["key"];

export function brandOf(name: string): Brand | undefined {
  return BRANDS.find((b) => b.match.test(name.trim()));
}

export function brandBySlug(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}

/** Один розыгрыш турнира: строка из базы турниров и/или запись архива с призёрами. */
export type Edition = {
  key: string;
  year: number;
  title: string;
  city: string | null;
  places: string[];
  note: string | null;
  tournament: Tournament | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Все розыгрыши бренда, свежие сначала. Турниры-черновики сюда не попадают (их нет в публичном списке). */
export function editionsOf(brand: Brand, tournaments: Tournament[], hall: HallEntry[]): Edition[] {
  const ts = tournaments.filter((t) => t.status !== "cancelled" && brandOf(t.name)?.key === brand.key);
  const hs = hall.filter((h) => h.category === "tournament" && brandOf(h.title)?.key === brand.key);
  const years = [...new Set([...ts.map((t) => Number(t.startsOn.slice(0, 4))), ...hs.map((h) => h.year)])].sort((a, b) => b - a);
  const out: Edition[] = [];
  for (const year of years) {
    const yt = ts.filter((t) => Number(t.startsOn.slice(0, 4)) === year);
    const yh = hs.filter((h) => h.year === year);
    const used = new Set<number>();
    for (const t of yt) {
      let h = yh.find((x) => !used.has(x.id) && norm(x.title) === norm(t.name));
      if (!h && yt.length === 1 && yh.length === 1) h = yh[0];
      if (h) used.add(h.id);
      out.push({
        key: `t${t.id}`,
        year,
        title: t.name.replace(/^[^\p{L}\p{N}"]+|[^\p{L}\p{N}"]+$/gu, ""),
        city: t.city ?? h?.city ?? null,
        places: h?.places.length ? h.places : t.winners,
        note: h?.note ?? null,
        tournament: t,
      });
    }
    for (const h of yh) {
      if (used.has(h.id)) continue;
      out.push({ key: `h${h.id}`, year, title: h.title, city: h.city, places: h.places, note: h.note, tournament: null });
    }
  }
  return out;
}

export const isUpcoming = (e: Edition) => e.tournament?.status === "announced" || e.tournament?.status === "running";

/** Бренд «живой», если его разыгрывали в пражский период (с 2022 года). */
export const isActiveBrand = (eds: Edition[]) => eds.some((e) => e.year >= 2022);
