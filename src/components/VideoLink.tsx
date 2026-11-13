import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/** Ссылка на плейлист YouTube-канала клуба (видео сезона или турнира). */
export async function VideoLink({ url, locale, big = false, className = "" }: { url: string | null; locale: Locale; big?: boolean; className?: string }) {
  if (!url) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className={
        big
          ? `inline-flex min-h-12 items-center gap-2 rounded-full border border-white/55 px-6 font-bold hover:bg-white/10 ${className}`
          : `relative z-10 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-200 hover:underline ${className}`
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={big ? "h-5 w-5 fill-current" : "h-4 w-4 fill-current"}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
      </svg>
      {t("video")}
      {big && " ↗"}
    </a>
  );
}
