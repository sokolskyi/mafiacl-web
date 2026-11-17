import type { AppPathname } from "@/i18n/routing";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://mafiacl.com";

export const SITE_NAME = "MafiaCL";

/** Тестовая версия (до переезда на mafiacl.com): закрыть весь сайт от поисковиков. */
export const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === "1";

/** Ключ раздела в messages/*.json → внутренний путь роутера. */
export const SECTIONS = {
  play: "/play",
  kings: "/kings",
  tournaments: "/tournaments",
  ratings: "/ratings",
  players: "/players",
  learn: "/learn",
  documents: "/documents",
  blog: "/blog",
  gallery: "/gallery",
  shop: "/shop",
  corporate: "/corporate",
  kids: "/kids",
  franchise: "/franchise",
  partners: "/partners",
  hosts: "/hosts",
  reviews: "/reviews",
  faq: "/faq",
  respect: "/respect",
  contacts: "/contacts",
  about: "/about",
} as const satisfies Record<string, AppPathname>;

export type SectionKey = keyof typeof SECTIONS;

/** Главное меню (порядок важен). */
export const MAIN_NAV: SectionKey[] = [
  "play",
  "tournaments",
  "kings",
  "ratings",
  "learn",
  "blog",
  "corporate",
  "shop",
  "partners",
  "about",
];

/** Шапка: 5 групп. Пункт группы — ключ из messages nav.* и путь. Первый пункт — куда ведёт сама группа. */
export const NAV_GROUPS: { key: "groupPlay" | "groupCompete" | "groupClub" | "groupBusiness" | "shop"; items: { label: string; href: (typeof SECTIONS)[SectionKey] | "/hall-of-fame" }[] }[] = [
  { key: "groupPlay", items: [
    { label: "schedule", href: "/play" },
    { label: "learn", href: "/learn" },
    { label: "documents", href: "/documents" },
    { label: "faq", href: "/faq" },
  ] },
  { key: "groupCompete", items: [
    { label: "tournaments", href: "/tournaments" },
    { label: "kings", href: "/kings" },
    { label: "ratings", href: "/ratings" },
    { label: "players", href: "/players" },
    { label: "hall", href: "/hall-of-fame" },
  ] },
  { key: "groupClub", items: [
    { label: "about", href: "/about" },
    { label: "hosts", href: "/hosts" },
    { label: "blog", href: "/blog" },
    { label: "gallery", href: "/gallery" },
    { label: "respect", href: "/respect" },
    { label: "partners", href: "/partners" },
    { label: "reviews", href: "/reviews" },
    { label: "contacts", href: "/contacts" },
  ] },
  { key: "groupBusiness", items: [
    { label: "corporate", href: "/corporate" },
    { label: "kids", href: "/kids" },
    { label: "franchise", href: "/franchise" },
  ] },
  { key: "shop", items: [{ label: "shop", href: "/shop" }] },
];

/** Подвал: всё остальное. */
export const FOOTER_NAV: SectionKey[] = [
  "players",
  "hosts",
  "kids",
  "gallery",
  "documents",
  "reviews",
  "franchise",
  "respect",
  "faq",
  "contacts",
];

/** Главный клуб сети (slug в базе). */
export const MAIN_CLUB_SLUG = "mafiacl-prague";

/** Города сети. Пока только Прага; Брно и Карловы Вары добавятся из базы. */
export const CITIES = {
  prague: { club: "MafiaCL Prague", cs: "Praha", ru: "Прага", uk: "Прага", en: "Prague" },
} as const;

export type CitySlug = keyof typeof CITIES;
