"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitTestimonial, type TestimonialState } from "@/lib/testimonial-actions";

/** Сторона фото после уменьшения в браузере: хватает для кружка 56px на ретине и укладывается в предел 1 МБ. */
const MAX_SIDE = 800;
const MAX_BYTES = 950 * 1024;

/** Уменьшить фото в браузере (тяжёлые снимки с телефона иначе не пройдут). null — браузер не смог прочитать файл. */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    // Старый Safari не умеет WebP в toBlob и отдаёт PNG — тогда JPEG.
    if (blob && blob.type === "image/webp") return blob;
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

export function ReviewForm({ locale }: { locale: string }) {
  const t = useTranslations("testimonials.form");
  const [state, action, pending] = useActionState<TestimonialState, FormData>(submitTestimonial, {});
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef<HTMLInputElement>(null);
  const ids = { photoHint: useId(), bodyHint: useId(), error: useId() };

  // Время открытия формы — отсеять ботов, которые отправляют мгновенно.
  useEffect(() => {
    if (openedAt.current) openedAt.current.value = String(Date.now());
  }, [state]);
  // Освобождаем память превью, когда фото сменили или убрали.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function onPhoto(file: File | undefined) {
    setPhotoError(false);
    setPhoto(null);
    if (!file) return;
    const blob = await shrink(file);
    if (!blob || blob.size > MAX_BYTES) {
      setPhotoError(true);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPhoto({ blob, url: URL.createObjectURL(blob) });
  }

  const field = "mt-1 w-full rounded border border-white/25 bg-neutral-900 px-3 py-2.5 outline-none focus:border-red-500";

  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-lg text-green-200">
        {t("sent")}
      </p>
    );
  }

  return (
    <form
      action={(fd: FormData) => {
        // В запрос уходит уже уменьшенное фото, а не исходный файл с телефона.
        fd.delete("photo");
        if (photo) fd.set("photo", photo.blob, photo.blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
        return action(fd);
      }}
      aria-describedby={state.error ? ids.error : undefined}
      className="grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="locale" value={locale} />
      <input ref={openedAt} type="hidden" name="openedAt" defaultValue="0" />
      {/* Ловушка для ботов: поле спрятано от людей и от экранных дикторов. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="text-sm font-semibold">
        {t("author")} *
        <input name="author" required maxLength={80} autoComplete="name" className={field} />
      </label>
      <label className="text-sm font-semibold">
        {t("company")}
        <input name="company" maxLength={120} autoComplete="organization" className={field} />
      </label>

      <label className="text-sm font-semibold sm:col-span-2">
        {t("body")} *
        <textarea name="body" required minLength={10} maxLength={1500} rows={5} aria-describedby={ids.bodyHint} className={field} />
        <span id={ids.bodyHint} className="mt-1 block text-xs font-normal text-neutral-400">{t("bodyHint")}</span>
      </label>

      <div className="sm:col-span-2">
        <span className="text-sm font-semibold">{t("photo")}</span>
        <div className="mt-2 flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={t("photoPreview")} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-white/30 text-2xl text-neutral-500">
              +
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded border border-white/30 px-4 text-sm font-semibold hover:bg-white/10 focus-within:outline focus-within:outline-2 focus-within:outline-white">
              {photo ? t("photoChange") : t("photoChoose")}
              <input
                ref={fileRef}
                type="file"
                name="photo"
                accept="image/*"
                aria-describedby={ids.photoHint}
                onChange={(e) => onPhoto(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="min-h-11 rounded px-3 text-sm text-neutral-400 hover:text-white"
              >
                {t("photoRemove")}
              </button>
            )}
          </div>
        </div>
        <p id={ids.photoHint} className={`mt-2 text-xs ${photoError ? "text-red-300" : "text-neutral-400"}`} aria-live="polite">
          {photoError ? t("errors.photo") : t("photoHint")}
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" />
        <span>{t("consent")} *</span>
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-red-600 px-8 font-bold text-white hover:bg-red-500 disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
        <p className="mt-3 text-xs text-neutral-400">{t("moderation")}</p>
        <p id={ids.error} role="alert" className="mt-2 text-sm text-red-300">
          {state.error && t(`errors.${state.error}`)}
        </p>
      </div>
    </form>
  );
}
