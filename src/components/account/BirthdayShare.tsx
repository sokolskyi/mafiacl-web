"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/** Открытка ко дню рождения: превью, «Поделиться» (на телефоне — сразу в приложения) и скачивание для сторис и ленты. */
export function BirthdayShare({ nick, compact = false }: { nick: string; compact?: boolean }) {
  const t = useTranslations("birthdayCard");
  const locale = useLocale();
  const src = (f: "story" | "post") => `/api/share/birthday?${new URLSearchParams({ nick, f, l: locale })}`;
  const file = (f: "story" | "post") => `mafiacl-birthday-${f}.png`;
  // Файл загружаем заранее: share() нужно вызвать сразу по нажатию, иначе Safari его не разрешит.
  const [shareFile, setShareFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof navigator.canShare !== "function") return;
    let alive = true;
    fetch(src("story"))
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!alive || !b) return;
        const f = new File([b], file("story"), { type: b.type || "image/png" });
        if (navigator.canShare({ files: [f] })) setShareFile(f);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nick, locale]);

  async function share() {
    if (!shareFile) return;
    try {
      await navigator.share({ files: [shareFile], title: t("happy") });
    } catch {
      // Пользователь закрыл меню — ничего не делаем.
    }
  }

  const btn = "inline-flex min-h-11 items-center rounded px-4 text-sm font-semibold";
  return (
    <div className={compact ? "mt-4" : "mt-4 flex flex-col gap-4 sm:flex-row sm:items-start"}>
      <a href={src("post")} target="_blank" rel="noopener" className="block shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src("post")}
          alt={t("preview")}
          width={1080}
          height={1350}
          className={compact ? "mx-auto h-auto max-h-[34vh] w-auto rounded-lg" : "h-auto w-48 rounded-lg"}
        />
      </a>
      <div className={compact ? "mt-3" : ""}>
        {!compact && <p className="text-sm text-neutral-300">{t("shareHint")}</p>}
        <div className={`flex flex-wrap items-center gap-2 ${compact ? "justify-center" : "mt-3"}`}>
          {shareFile && (
            <button type="button" onClick={share} className={`${btn} bg-gold-400 text-neutral-950 hover:bg-gold-300`}>
              {t("share")}
            </button>
          )}
          <a href={src("story")} download={file("story")} className={`${btn} border border-white/30 hover:bg-white/10`}>
            {t("download")} · {t("story")}
          </a>
          <a href={src("post")} download={file("post")} className={`${btn} border border-white/30 hover:bg-white/10`}>
            {t("download")} · {t("post")}
          </a>
        </div>
      </div>
    </div>
  );
}
