import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { ShareButton } from "@/components/ShareButton";

/** «Поделиться» для страницы игрока: ссылка и коллаж со статистикой (сторис или пост). */
export async function PlayerShare({ locale, nickname, games }: { locale: Locale; nickname: string; games?: number }) {
  const t = await getTranslations({ locale, namespace: "share" });
  const tp = await getTranslations({ locale, namespace: "player" });
  // Число партий в адресе: после новой игры картинка не берётся из кеша.
  const img = (f: "story" | "post") =>
    `/api/share/player?${new URLSearchParams({ nick: nickname, f, l: locale, ...(games !== undefined ? { v: String(games) } : {}) })}`;
  return (
    <ShareButton
      title={tp("metaTitle", { nick: nickname })}
      url={getPathname({ href: { pathname: "/players/[nick]", params: { nick: nickname } }, locale })}
      images={{ story: img("story"), post: img("post") }}
      fileName={`mafiacl-${nickname.replace(/[^\p{L}\p{N}_-]+/gu, "_")}`}
      labels={{
        button: t("button"),
        story: t("story"),
        post: t("post"),
        link: t("link"),
        copied: t("copied"),
        saved: t("saved"),
        error: t("error"),
      }}
    />
  );
}
