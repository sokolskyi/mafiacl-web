"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitTestimonial, type TestimonialState } from "@/lib/testimonial-actions";

/** Сторона картинки после уменьшения в браузере: хватает для показа на ретине, а фото и логотип вместе укладываются в предел 1 МБ. */
const MAX_SIDE = { photo: 800, logo: 600 } as const;
const MAX_BYTES = 450 * 1024;

/** Уменьшить картинку в браузере (тяжёлые снимки с телефона иначе не пройдут). null — браузер не смог прочитать файл. */
async function shrink(file: File, kind: "photo" | "logo"): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, MAX_SIDE[kind] / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    // Старый Safari не умеет WebP в toBlob и отдаёт PNG — тогда JPEG (у логотипа — PNG, чтобы не потерять прозрачность).
    if (blob && blob.type === "image/webp") return blob;
    if (kind === "logo") return blob;
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

type Picked = { blob: Blob; url: string };
const fileName = (b: Blob, base: string) => `${base}.${b.type === "image/webp" ? "webp" : b.type === "image/png" ? "png" : "jpg"}`;

/** Выбор картинки: превью, «Выбрать / Заменить / Убрать», уменьшение в браузере. */
function ImagePicker({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: "photo" | "logo";
  value: Picked | null;
  onChange: (v: Picked | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("testimonials.form");
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  // Освобождаем память превью, когда картинку сменили или убрали.
  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.url);
  }, [value]);

  async function pick(file: File | undefined) {
    setError(false);
    onChange(null);
    if (!file) return;
    const blob = await shrink(file, kind);
    if (!blob || blob.size > MAX_BYTES) {
      setError(true);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    onChange({ blob, url: URL.createObjectURL(blob) });
  }

  const shape = kind === "photo" ? "h-16 w-16 rounded-full object-cover" : "h-16 w-32 rounded object-contain bg-white/5 p-1";
  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <span className="text-sm font-semibold">{t(kind)}</span>
      <div className="mt-2 flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt={t(kind === "photo" ? "photoPreview" : "logoPreview")} className={`shrink-0 ${shape}`} />
        ) : (
          <span aria-hidden="true" className={`flex shrink-0 items-center justify-center border border-dashed border-white/30 text-2xl text-neutral-500 ${kind === "photo" ? "h-16 w-16 rounded-full" : "h-16 w-32 rounded"}`}>
            +
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex min-h-11 items-center rounded border border-white/30 px-4 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-white ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/10"}`}>
            {value ? t("photoChange") : t("photoChoose")}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={disabled}
              aria-describedby={hintId}
              onChange={(e) => pick(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="min-h-11 rounded px-3 text-sm text-neutral-400 hover:text-white"
            >
              {t("photoRemove")}
            </button>
          )}
        </div>
      </div>
      <p id={hintId} className={`mt-2 text-xs ${error ? "text-red-300" : "text-neutral-400"}`} aria-live="polite">
        {error ? t(`errors.${kind}`) : t(kind === "photo" ? "photoHint" : disabled ? "logoNeedsCompany" : "logoHint")}
      </p>
    </div>
  );
}

export function ReviewForm({ locale, hosts }: { locale: string; hosts: { id: number; nickname: string }[] }) {
  const t = useTranslations("testimonials.form");
  const [state, action, pending] = useActionState<TestimonialState, FormData>(submitTestimonial, {});
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [logo, setLogo] = useState<Picked | null>(null);
  const [company, setCompany] = useState("");
  const openedAt = useRef<HTMLInputElement>(null);
  const ids = { bodyHint: useId(), error: useId() };

  // Время открытия формы — отсеять ботов, которые отправляют мгновенно.
  useEffect(() => {
    if (openedAt.current) openedAt.current.value = String(Date.now());
  }, [state]);
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
        // В запрос уходят уже уменьшенные картинки, а не исходные файлы с телефона.
        fd.delete("photo");
        fd.delete("logo");
        if (photo) fd.set("photo", photo.blob, fileName(photo.blob, "photo"));
        if (logo && company.trim()) fd.set("logo", logo.blob, fileName(logo.blob, "logo"));
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
        <input name="company" maxLength={120} autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} className={field} />
      </label>
      <div className="sm:col-start-2">
        <ImagePicker kind="logo" value={logo} onChange={setLogo} disabled={!company.trim()} />
      </div>

      {hosts.length > 0 && (
        <label className="text-sm font-semibold sm:col-span-2">
          {t("host")}
          <select name="host" defaultValue="" className={`${field} block sm:max-w-sm`}>
            <option value="">{t("hostNone")}</option>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>{h.nickname}</option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm font-semibold sm:col-span-2">
        {t("body")} *
        <textarea name="body" required minLength={10} maxLength={1500} rows={5} aria-describedby={ids.bodyHint} className={field} />
        <span id={ids.bodyHint} className="mt-1 block text-xs font-normal text-neutral-400">{t("bodyHint")}</span>
      </label>

      <div className="sm:col-span-2">
        <ImagePicker kind="photo" value={photo} onChange={setPhoto} />
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
