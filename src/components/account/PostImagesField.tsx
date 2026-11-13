"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPostImageUploads } from "@/lib/blog-actions";

const MAX = 4;

// Сжимаем в браузере (до 1600 px, WebP) и грузим прямо в хранилище по одноразовой ссылке.
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

/** Картинки к статье: первая — обложка, остальные — под текстом. */
export function PostImagesField({ labels }: { labels: { title: string; hint: string; add: string; uploading: string; failed: string; remove: string; cover: string } }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = `post-images-${useId()}`;

  async function onFiles(files: FileList | null) {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, MAX - urls.length);
    if (!list.length) return;
    setBusy(true);
    setError(false);
    try {
      const res = await createPostImageUploads(list.length);
      if (!("uploads" in res) || !res.uploads) throw new Error("no upload urls");
      const supabase = createClient();
      const added: string[] = [];
      for (const [i, file] of list.entries()) {
        const { path, token, publicUrl } = res.uploads[i];
        const { error: upErr } = await supabase.storage.from("blog").uploadToSignedUrl(path, token, await toWebp(file), { contentType: "image/webp" });
        if (upErr) throw upErr;
        added.push(publicUrl);
      }
      setUrls((prev) => [...prev, ...added].slice(0, MAX));
    } catch (e) {
      console.error("post image upload failed", e);
      setError(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="text-sm">
      <p>{labels.title}</p>
      <p className="mt-1 text-xs text-neutral-400">{labels.hint}</p>
      <input type="hidden" name="images" value={urls.join("\n")} />
      {urls.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <li key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-20 w-28 rounded object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px]">{labels.cover}</span>}
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
                aria-label={labels.remove}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-xs hover:bg-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {urls.length < MAX && (
        <p className="mt-2">
          <label htmlFor={fileId} className="inline-flex min-h-10 cursor-pointer items-center rounded border border-white/30 px-3 hover:bg-white/10">
            {busy ? labels.uploading : labels.add}
          </label>
          <input id={fileId} ref={fileRef} type="file" accept="image/*" multiple disabled={busy} onChange={(e) => onFiles(e.target.files)} className="sr-only" />
        </p>
      )}
      {error && <p role="alert" className="mt-1 text-red-400">{labels.failed}</p>}
    </div>
  );
}
