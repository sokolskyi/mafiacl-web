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
  learn: "/learn",
  documents: "/documents",
  blog: "/blog",
  gallery: "/gallery",
  shop: "/shop",
  corporate: "/corporate",
  kids: "/kids",
  franchise: "/franchise",
  partners: "/partners",
  reviews: "/reviews",
  faq: "/faq",
  contacts: "/contacts",
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
];

/** Подвал: всё остальное. */
export const FOOTER_NAV: SectionKey[] = [
  "kids",
  "gallery",
  "documents",
  "partners",
  "reviews",
  "franchise",
  "faq",
  "contacts",
];

/** Города сети. Пока только Прага; Брно и Карловы Вары добавятся из базы. */
export const CITIES = {
  praha: { cs: "Praha", ru: "Прага", uk: "Прага", en: "Prague" },
} as const;

export type CitySlug = keyof typeof CITIES;
