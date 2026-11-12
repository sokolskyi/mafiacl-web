/** Публичные контакты и соцсети клуба и его проектов. */

export type SocialKind = "telegram" | "instagram" | "facebook" | "youtube" | "phone";
export type SocialLink = { kind: SocialKind; label: string; href: string; note?: "en" | "channel" | "dm" };

/** Запись на игры и вопросы — напрямую основателю. */
export const SIGNUP_CONTACTS: SocialLink[] = [
  { kind: "telegram", label: "@Yes1911", href: "https://t.me/Yes1911", note: "dm" },
  { kind: "phone", label: "+420 773 194 945", href: "tel:+420773194945" },
];

/** MafiaCL Prague. */
export const CLUB_SOCIAL: SocialLink[] = [
  { kind: "telegram", label: "@mafia_clp", href: "https://t.me/mafia_clp", note: "channel" },
  { kind: "instagram", label: "@mafia_clp", href: "https://www.instagram.com/mafia_clp/" },
  { kind: "instagram", label: "@mafia_clp_e", href: "https://www.instagram.com/mafia_clp_e/", note: "en" },
  { kind: "facebook", label: "mafiaclprague", href: "https://www.facebook.com/mafiaclprague" },
  { kind: "youtube", label: "mafiaclK", href: "https://www.youtube.com/user/mafiaclK" },
];

/** Проекты клуба. */
export const PROJECTS: { key: "mcl" | "stars"; name: string; href?: string; links: SocialLink[] }[] = [
  {
    key: "mcl",
    name: "MCL Europe",
    href: "/mcl/",
    links: [
      { kind: "telegram", label: "@mafiamcl", href: "https://t.me/mafiamcl" },
      { kind: "instagram", label: "@mafiamcl", href: "https://www.instagram.com/mafiamcl/" },
      { kind: "facebook", label: "mafiamcl", href: "https://www.facebook.com/mafiamcl/" },
    ],
  },
  {
    key: "stars",
    name: "Mafia Stars Europe",
    href: "https://mafiaworldtour.com/tournaments/1310",
    links: [
      { kind: "telegram", label: "@mafiastarsw", href: "https://t.me/mafiastarsw" },
      { kind: "instagram", label: "@mafiastarsw", href: "https://www.instagram.com/mafiastarsw/" },
      { kind: "facebook", label: "mafiastars", href: "https://www.facebook.com/mafiastars/" },
    ],
  },
];

/** MafiaCL Kharkiv — архив. */
export const KHARKIV_SOCIAL: SocialLink[] = [
  { kind: "telegram", label: "@mafia_cl", href: "https://t.me/mafia_cl" },
  { kind: "instagram", label: "@mafia_cl", href: "https://www.instagram.com/mafia_cl/" },
  { kind: "facebook", label: "mafiaclK", href: "https://www.facebook.com/mafiaclK/" },
];
