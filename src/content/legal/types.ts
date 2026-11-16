/** Юридический документ сайта: разделы с пронумерованными пунктами (1.1, 1.2 …). */
export type LegalSection = { id: string; title: string; items: string[] };
export type LegalText = {
  title: string;
  lead: string;
  sections: LegalSection[];
};

export type LegalDocKey = "privacy" | "terms" | "shop";
