import type { Locale } from "@/i18n/routing";
import type { LegalDocKey, LegalText } from "./types";
import privacyCs from "./privacy/cs";
import privacyRu from "./privacy/ru";
import privacyUk from "./privacy/uk";
import privacyEn from "./privacy/en";
import termsCs from "./terms/cs";
import termsRu from "./terms/ru";
import termsUk from "./terms/uk";
import termsEn from "./terms/en";
import shopCs from "./shop/cs";
import shopRu from "./shop/ru";
import shopUk from "./shop/uk";
import shopEn from "./shop/en";

/** Тексты документов. Чешская версия — основная (при расхождении действует она). */
const DOCS: Record<LegalDocKey, Record<Locale, LegalText>> = {
  privacy: { cs: privacyCs, ru: privacyRu, uk: privacyUk, en: privacyEn },
  terms: { cs: termsCs, ru: termsRu, uk: termsUk, en: termsEn },
  shop: { cs: shopCs, ru: shopRu, uk: shopUk, en: shopEn },
};

export function legalText(doc: LegalDocKey, locale: Locale): LegalText {
  return DOCS[doc][locale];
}

export const LEGAL_HREF = {
  privacy: "/documents/privacy",
  terms: "/documents/terms",
  shop: "/documents/shop-terms",
} as const satisfies Record<LegalDocKey, string>;
