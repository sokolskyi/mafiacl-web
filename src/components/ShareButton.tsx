"use client";

import { useRef, useState } from "react";

type Labels = {
  button: string;
  story: string;
  post: string;
  link: string;
  copied: string;
  saved: string;
  error: string;
};

/**
 * «Поделиться»: ссылка на страницу и, если заданы картинки, коллаж для соцсетей —
 * вертикальный (сторис) или горизонтальный (пост). На телефоне открывается системное
 * меню «Поделиться» с готовой картинкой, на компьютере картинка скачивается.
 */
export function ShareButton({
  title,
  url,
  images,
  fileName,
  labels,
}: {
  title: string;
  /** Адрес, которым делимся; по умолчанию — текущая страница. */
  url?: string;
  images?: { story: string; post: string };
  fileName?: string;
  labels: Labels;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pageUrl = () => (url ? new URL(url, location.origin).href : location.href);
  const blobs = useRef<Partial<Record<"story" | "post", Promise<Blob>>>>({});

  // Картинки начинаем грузить при открытии меню: Safari разрешает системное меню
  // только сразу после нажатия, долгое ожидание сети его ломает.
  function prefetch() {
    if (!images) return;
    for (const f of ["story", "post"] as const) {
      blobs.current[f] ??= fetch(images[f]).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      blobs.current[f]!.catch(() => {
        delete blobs.current[f];
      });
    }
  }

  async function shareImage(f: "story" | "post") {
    if (!images) return;
    setBusy(true);
    setStatus("");
    try {
      prefetch();
      const blob = await blobs.current[f]!;
      const file = new File([blob], `${fileName ?? "mafiacl"}-${f}.png`, { type: "image/png" });
      const link = pageUrl();
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: link });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      setStatus(labels.saved);
    } catch {
      setStatus(labels.error);
    } finally {
      setBusy(false);
    }
  }

  async function shareLink() {
    setStatus("");
    const link = pageUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus(labels.copied);
    } catch {
      setStatus(labels.error);
    }
  }

  const item = "flex min-h-11 w-full items-center gap-3 rounded px-3 text-left text-sm font-semibold hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="inline-block">
      <details className="relative" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && prefetch()}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-white/55 px-4 text-sm font-semibold hover:bg-white/10 [&::-webkit-details-marker]:hidden">
          <ShareIcon />
          {labels.button}
        </summary>
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-white/15 bg-neutral-950 p-2 shadow-xl">
          {images && (
            <>
              <button type="button" className={item} disabled={busy} onClick={() => shareImage("story")}>
                <span aria-hidden="true" className="inline-block h-6 w-3.5 rounded-sm border-2 border-current" />
                {labels.story}
              </button>
              <button type="button" className={item} disabled={busy} onClick={() => shareImage("post")}>
                <span aria-hidden="true" className="inline-block h-3.5 w-6 rounded-sm border-2 border-current" />
                {labels.post}
              </button>
            </>
          )}
          <button type="button" className={item} onClick={shareLink}>
            <span aria-hidden="true">🔗</span>
            {labels.link}
          </button>
        </div>
      </details>
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-xs text-neutral-400">
        {busy ? "…" : status}
      </p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
    </svg>
  );
}
