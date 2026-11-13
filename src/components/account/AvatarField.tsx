"use client";

import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAvatarUpload, setAvatar } from "@/lib/avatar-actions";

const SIZE = 800;

// Квадрат по центру, 800×800, WebP — подходит и для профиля, и для плашек трансляции.
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", 0.85));
}

export function AvatarField({
  initial,
  labels,
}: {
  initial: string | null;
  labels: { title: string; hint: string; upload: string; change: string; remove: string; uploading: string; failed: string; saved: string };
}) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const id = `avatar-${useId()}`;

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setStatus("");
    try {
      const up = await createAvatarUpload();
      if (!("token" in up) || !up.token) throw new Error("no upload url");
      const { error } = await createClient().storage.from("avatars").uploadToSignedUrl(up.path, up.token, await toSquareWebp(file), { contentType: "image/webp" });
      if (error) throw error;
      const res = await setAvatar(up.path);
      if (!("ok" in res)) throw new Error(res.error);
      setUrl(res.url ?? null);
      setStatus("saved");
    } catch (e) {
      console.error("avatar upload failed", e);
      setStatus("failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    setStatus("");
    const res = await setAvatar(null);
    setBusy(false);
    if ("ok" in res) setUrl(null);
    else setStatus("failed");
  }

  return (
    <div className="mt-6 max-w-md">
      <p className="text-sm font-semibold">{labels.title}</p>
      <div className="mt-2 flex items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" width={80} height={80} referrerPolicy="no-referrer" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-800 text-2xl text-neutral-500">?</span>
        )}
        <div className="flex flex-wrap gap-2 text-sm">
          <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center rounded border border-white/30 px-3 hover:bg-white/10">
            {busy ? labels.uploading : url ? labels.change : labels.upload}
          </label>
          <input id={id} ref={fileRef} type="file" accept="image/*" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
          {url && (
            <button type="button" onClick={onRemove} disabled={busy} className="min-h-10 rounded px-3 text-neutral-400 underline hover:text-red-400">
              {labels.remove}
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{labels.hint}</p>
      <p role="status" className="mt-1 min-h-5 text-sm">
        {status === "saved" && <span className="text-green-400">{labels.saved}</span>}
        {status === "failed" && <span className="text-red-400">{labels.failed}</span>}
      </p>
    </div>
  );
}
