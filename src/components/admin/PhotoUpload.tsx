"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPhotoUploads } from "@/lib/admin/shop-actions";

// Сжимаем фото в браузере (до 1600 px, WebP) и грузим прямо в хранилище по одноразовой ссылке.
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", 0.82),
  );
}

type Labels = { label: string; hint: string; upload: string; uploading: string; failed: string };

export function PhotoField({ clubId, initial, labels, name = "images" }: { clubId: number; initial: string[]; labels: Labels; name?: string }) {
  const [text, setText] = useState(initial.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Уникальные id: на странице несколько форм товаров, у каждой своё поле фото.
  const uid = useId();
  const fieldId = `images-${uid}`;
  const fileId = `file-${uid}`;
  const preview = text.split("\n").map((s) => s.trim()).filter(Boolean);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(false);
    try {
      const list = [...files].slice(0, 12);
      const res = await createPhotoUploads(clubId, list.length);
      if (!("uploads" in res) || !res.uploads) throw new Error("no upload urls");
      const supabase = createClient();
      const urls: string[] = [];
      for (const [i, file] of list.entries()) {
        const blob = await toWebp(file);
        const { path, token, publicUrl } = res.uploads[i];
        const { error: upErr } = await supabase.storage.from("shop").uploadToSignedUrl(path, token, blob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        urls.push(publicUrl);
      }
      setText((prev) => [prev.trim(), ...urls].filter(Boolean).join("\n"));
    } catch (e) {
      console.error("photo upload failed", e);
      setError(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="text-sm sm:col-span-2">
      <label htmlFor={fieldId}>{labels.label}</label>
      {preview.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {preview.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-16 w-16 rounded object-cover" loading="lazy" />
          ))}
        </div>
      )}
      <textarea
        id={fieldId}
        name={name}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-2 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 font-mono text-xs outline-none focus:border-red-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" id={fileId} onChange={(e) => onFiles(e.target.files)} />
        <label htmlFor={fileId} className={`inline-flex min-h-10 cursor-pointer items-center rounded border border-white/40 px-4 font-semibold hover:bg-white/10 ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? labels.uploading : labels.upload}
        </label>
        {error && <span role="alert" className="text-red-400">{labels.failed}</span>}
      </div>
      <span className="mt-1 block text-xs text-neutral-500">{labels.hint}</span>
    </div>
  );
}
