import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { VideoItem } from "@/lib/videos";

const YT = (
  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
);

/**
 * Видео сезона или турнира: плейлист на YouTube и/или отдельные трансляции (день 1, день 2, финал, серии).
 */
export async function VideoLink({
  url,
  videos = [],
  locale,
  big = false,
  className = "",
}: {
  url: string | null;
  videos?: VideoItem[];
  locale: Locale;
  big?: boolean;
  className?: string;
}) {
  if (!url && videos.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  const label = (x: VideoItem) =>
    x.k === "final" ? t("videoFinal") : x.k === "series" ? t("videoSeries", { n: x.n ?? "" }) : t("videoDay", { n: x.n ?? "" });
  const icon = <svg viewBox="0 0 24 24" aria-hidden="true" className={big ? "h-5 w-5 fill-current" : "h-4 w-4 fill-current"}>{YT}</svg>;

  if (big) {
    return (
      <>
        {url && (
          <a href={url} target="_blank" rel="noopener" className={`inline-flex min-h-12 items-center gap-2 rounded-full border border-white/55 px-6 font-bold hover:bg-white/10 ${className}`}>
            {icon}
            {t("video")} ↗
          </a>
        )}
        {videos.map((x) => (
          <a key={x.v} href={`https://www.youtube.com/watch?v=${x.v}`} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-5 font-semibold hover:bg-white/10">
            {icon}
            {label(x)}
          </a>
        ))}
      </>
    );
  }

  const link = "relative z-10 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-200 hover:underline";
  return (
    <span className={`flex flex-wrap items-center gap-x-3 ${className}`}>
      {url ? (
        <a href={url} target="_blank" rel="noopener" className={link}>
          {icon}
          {t("video")}
        </a>
      ) : (
        <span className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-red-300">{icon}{t("videoShort")}:</span>
      )}
      {videos.map((x) => (
        <a key={x.v} href={`https://www.youtube.com/watch?v=${x.v}`} target="_blank" rel="noopener" className={link.replace("gap-1.5 ", "")}>
          {label(x)}
        </a>
      ))}
    </span>
  );
}
