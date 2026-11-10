import { defineRouting } from "next-intl/routing";

/**
 * Языки сайта и локализованные адреса страниц.
 * Чешский — основной (Прага), адреса на каждом языке свои — это важно для SEO.
 * Ключ (слева) — внутреннее имя страницы, его используют ссылки в коде.
 */
export const routing = defineRouting({
  locales: ["cs", "ru", "uk", "en"],
  defaultLocale: "cs",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/play": { cs: "/hrat", ru: "/igrat", uk: "/hraty", en: "/play" },
    "/kings": "/kings",
    "/tournaments": { cs: "/turnaje", ru: "/turniry", uk: "/turniry", en: "/tournaments" },
    "/ratings": { cs: "/zebricky", ru: "/reytingi", uk: "/reitynhy", en: "/ratings" },
    "/learn": { cs: "/pravidla", ru: "/pravila", uk: "/pravyla", en: "/rules" },
    "/documents": { cs: "/dokumenty", ru: "/dokumenty", uk: "/dokumenty", en: "/documents" },
    "/blog": "/blog",
    "/gallery": { cs: "/galerie", ru: "/galereya", uk: "/halereia", en: "/gallery" },
    "/shop": { cs: "/obchod", ru: "/magazin", uk: "/mahazyn", en: "/shop" },
    "/corporate": {
      cs: "/firemni-mafie",
      ru: "/korporativnaya-mafiya",
      uk: "/korporatyvna-mafiia",
      en: "/corporate-mafia",
    },
    "/kids": { cs: "/detska-mafie", ru: "/detskaya-mafiya", uk: "/dytiacha-mafiia", en: "/kids-mafia" },
    "/franchise": { cs: "/franchiza", ru: "/franshiza", uk: "/franshyza", en: "/franchise" },
    "/partners": { cs: "/partneri", ru: "/partnery", uk: "/partnery", en: "/partners" },
    "/reviews": { cs: "/recenze", ru: "/otzyvy", uk: "/vidhuky", en: "/reviews" },
    "/faq": "/faq",
    "/contacts": { cs: "/kontakty", ru: "/kontakty", uk: "/kontakty", en: "/contacts" },
    "/clubs/[city]": { cs: "/kluby/[city]", ru: "/kluby/[city]", uk: "/kluby/[city]", en: "/clubs/[city]" },
    "/account": { cs: "/ucet", ru: "/kabinet", uk: "/kabinet", en: "/account" },
    "/players/[nick]": { cs: "/hraci/[nick]", ru: "/igroki/[nick]", uk: "/hravtsi/[nick]", en: "/players/[nick]" },
    "/admin": "/admin",
    "/admin/games/[id]": "/admin/games/[id]",
    "/admin/matches/[id]": "/admin/matches/[id]",
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
