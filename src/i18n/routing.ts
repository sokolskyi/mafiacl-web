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
    "/tournaments/[slug]": { cs: "/turnaje/[slug]", ru: "/turniry/[slug]", uk: "/turniry/[slug]", en: "/tournaments/[slug]" },
    "/ratings": { cs: "/zebricky", ru: "/reytingi", uk: "/reitynhy", en: "/ratings" },
    "/hall-of-fame": { cs: "/sin-slavy", ru: "/zal-slavy", uk: "/zal-slavy", en: "/hall-of-fame" },
    "/learn": { cs: "/pravidla", ru: "/pravila", uk: "/pravyla", en: "/rules" },
    "/documents": { cs: "/dokumenty", ru: "/dokumenty", uk: "/dokumenty", en: "/documents" },
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/gallery": { cs: "/galerie", ru: "/galereya", uk: "/halereia", en: "/gallery" },
    "/shop": { cs: "/obchod", ru: "/magazin", uk: "/mahazyn", en: "/shop" },
    "/shop/cart": { cs: "/obchod/kosik", ru: "/magazin/korzina", uk: "/mahazyn/kosh", en: "/shop/cart" },
    "/shop/orders/[id]": {
      cs: "/obchod/objednavky/[id]",
      ru: "/magazin/zakazy/[id]",
      uk: "/mahazyn/zamovlennia/[id]",
      en: "/shop/orders/[id]",
    },
    "/shop/[slug]": { cs: "/obchod/[slug]", ru: "/magazin/[slug]", uk: "/mahazyn/[slug]", en: "/shop/[slug]" },
    "/corporate": {
      cs: "/firemni-mafie",
      ru: "/korporativnaya-mafiya",
      uk: "/korporatyvna-mafiia",
      en: "/corporate-mafia",
    },
    "/kids": { cs: "/detska-mafie", ru: "/detskaya-mafiya", uk: "/dytiacha-mafiia", en: "/kids-mafia" },
    "/franchise": { cs: "/franchiza", ru: "/franshiza", uk: "/franshyza", en: "/franchise" },
    "/hosts": { cs: "/moderatori", ru: "/vedushchie", uk: "/vedutchi", en: "/hosts" },
    "/partners": { cs: "/partneri", ru: "/partnery", uk: "/partnery", en: "/partners" },
    "/reviews": { cs: "/recenze", ru: "/otzyvy", uk: "/vidhuky", en: "/reviews" },
    "/about": { cs: "/o-klubu", ru: "/o-klube", uk: "/pro-klub", en: "/about" },
    "/about/history": { cs: "/o-klubu/historie", ru: "/o-klube/istoriya", uk: "/pro-klub/istoriia", en: "/about/history" },
    "/about/code": { cs: "/o-klubu/kodex", ru: "/o-klube/kodeks", uk: "/pro-klub/kodeks", en: "/about/code" },
    "/about/team": { cs: "/o-klubu/tym", ru: "/o-klube/struktura", uk: "/pro-klub/struktura", en: "/about/team" },
    "/about/promotions": { cs: "/o-klubu/akce", ru: "/o-klube/aktsii", uk: "/pro-klub/aktsii", en: "/about/promotions" },
    "/about/bans": { cs: "/o-klubu/bany", ru: "/o-klube/bany", uk: "/pro-klub/bany", en: "/about/bans" },
    "/about/gala": { cs: "/o-klubu/gala-night", ru: "/o-klube/gala-night", uk: "/pro-klub/gala-night", en: "/about/gala-night" },
    "/faq": "/faq",
    "/contacts": { cs: "/kontakty", ru: "/kontakty", uk: "/kontakty", en: "/contacts" },
    "/clubs/[city]": { cs: "/kluby/[city]", ru: "/kluby/[city]", uk: "/kluby/[city]", en: "/clubs/[city]" },
    "/account": { cs: "/ucet", ru: "/kabinet", uk: "/kabinet", en: "/account" },
    "/players/[nick]": { cs: "/hraci/[nick]", ru: "/igroki/[nick]", uk: "/hravtsi/[nick]", en: "/players/[nick]" },
    "/admin": "/admin",
    "/admin/shop": "/admin/shop",
    "/admin/games/[id]": "/admin/games/[id]",
    "/admin/matches/[id]": "/admin/matches/[id]",
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
