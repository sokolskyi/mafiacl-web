/** MafiaCL Gala Night — ежегодная вечеринка-награждение клуба в конце сезона. */
export const GALA_NOMINATIONS = [
  "bestHost",
  "breakthrough",
  "newcomer",
  "diplomat",
  "mysterious",
  "improv",
  "patient",
  "leader",
  "creative",
  "comfortable",
] as const;
export type GalaNomination = (typeof GALA_NOMINATIONS)[number];

export type GalaNight = {
  year: number;
  date: string;
  winners: Partial<Record<GalaNomination, string>>;
  albumUrl?: string;
  postUrl?: string;
  /** Фото вечера в public/gala/ — первое идёт обложкой мозаики. */
  photos?: string[];
};

export const GALA_NIGHTS: GalaNight[] = [
  {
    year: 2025,
    date: "2025-12-24",
    winners: {
      bestHost: "Espresso Martini",
      breakthrough: "DOVOD",
      newcomer: "Annvie",
      diplomat: "Batko",
      mysterious: "Берлин",
      improv: "Чикаго",
      patient: "Spice",
      leader: "Рауль",
      creative: "Maverick",
      comfortable: "Люсі",
    },
    albumUrl: "https://www.facebook.com/media/set/?set=a.1260892979466349&type=3",
    postUrl: "https://t.me/mafia_clp/1296",
  },
  {
    year: 2024,
    date: "2024-12-17",
    winners: {
      bestHost: "Trinity",
      breakthrough: "qUAest0r",
      newcomer: "Азула",
      diplomat: "Panda",
      mysterious: "PRO|kuror",
      improv: "Берлин",
      patient: "Курйоз",
      leader: "Рауль",
      creative: "Берлин",
    },
    albumUrl: "https://www.facebook.com/media/set/?set=a.946292330926417&type=3",
    postUrl: "https://t.me/mafia_clp/784",
    photos: Array.from({ length: 10 }, (_, i) => `/gala/2024-${String(i + 1).padStart(2, "0")}.jpg`),
  },
];
