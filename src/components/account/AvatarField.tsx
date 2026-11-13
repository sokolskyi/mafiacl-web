"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAvatarUpload, setAvatar } from "@/lib/avatar-actions";

const OUT = 800; // итоговый квадрат, px
const VIEW = 256; // окно кадрирования на экране, px
const MAX_ZOOM = 4;

type Crop = { src: string; w: number; h: number; zoom: number; x: number; y: number };

/** Масштаб «вписать с перекрытием»: при zoom = 1 фото целиком закрывает квадрат. */
const baseScale = (c: Pick<Crop, "w" | "h">) => Math.max(VIEW / c.w, VIEW / c.h);

function clamp(c: Crop): Crop {
  const s = baseScale(c) * c.zoom;
  const minX = VIEW - c.w * s;
  const minY = VIEW - c.h * s;
  return { ...c, x: Math.min(0, Math.max(minX, c.x)), y: Math.min(0, Math.max(minY, c.y)) };
}

/** Новый масштаб вокруг центра окна. */
function zoomTo(c: Crop, zoom: number): Crop {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const k = z / c.zoom;
  return clamp({ ...c, zoom: z, x: VIEW / 2 - (VIEW / 2 - c.x) * k, y: VIEW / 2 - (VIEW / 2 - c.y) * k });
}

async function render(c: Crop, img: HTMLImageElement): Promise<Blob> {
  const s = baseScale(c) * c.zoom;
  const side = VIEW / s;
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -c.x / s, -c.y / s, side, side, 0, 0, OUT, OUT);
  return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", 0.85));
}

export function AvatarField({
  initial,
  labels,
}: {
  initial: string | null;
  labels: {
    title: string; hint: string; upload: string; change: string; remove: string; uploading: string; failed: string; saved: string;
    cropHint: string; zoom: string; save: string; cancel: string;
  };
}) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [crop, setCrop] = useState<Crop | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  // Пальцы на экране — для щипка двумя пальцами на телефоне.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<Crop | null>(null);
  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);
  const id = `avatar-${useId()}`;

  // Колесо мыши масштабирует, а не прокручивает страницу (нужен не-passive обработчик).
  const open = crop !== null;
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = cropRef.current;
      if (c) setCrop(zoomTo(c, c.zoom - e.deltaY / 500));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  function onFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setStatus("");
    const src = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const c = { src, w: probe.naturalWidth, h: probe.naturalHeight, zoom: 1, x: 0, y: 0 };
      const s = baseScale(c);
      setCrop(clamp({ ...c, x: (VIEW - c.w * s) / 2, y: (VIEW - c.h * s) / 2 }));
    };
    probe.onerror = () => {
      URL.revokeObjectURL(src);
      setStatus("failed");
    };
    probe.src = src;
  }

  function closeCrop() {
    if (crop) URL.revokeObjectURL(crop.src);
    setCrop(null);
  }

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      drag.current = null;
      pinch.current = { dist: distance(), zoom: crop.zoom };
    } else {
      drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
    }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!crop || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      setCrop(zoomTo(crop, pinch.current.zoom * (distance() / pinch.current.dist)));
      return;
    }
    const d = drag.current;
    if (d) setCrop(clamp({ ...crop, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    drag.current = null;
    const rest = [...pointers.current.values()][0];
    if (rest && crop) drag.current = { px: rest.x, py: rest.y, x: crop.x, y: crop.y };
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!crop) return;
    const step = e.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setCrop(clamp({ ...crop, x: crop.x + moves[e.key][0], y: crop.y + moves[e.key][1] }));
    } else if (e.key === "+" || e.key === "=") setCrop(zoomTo(crop, crop.zoom + 0.1));
    else if (e.key === "-") setCrop(zoomTo(crop, crop.zoom - 0.1));
  }

  async function save() {
    if (!crop || !imgRef.current) return;
    setBusy(true);
    setStatus("");
    try {
      const blob = await render(crop, imgRef.current);
      const up = await createAvatarUpload();
      if (!("token" in up) || !up.token) throw new Error("no upload url");
      const { error } = await createClient().storage.from("avatars").uploadToSignedUrl(up.path, up.token, blob, { contentType: "image/webp" });
      if (error) throw error;
      const res = await setAvatar(up.path);
      if (!("ok" in res)) throw new Error(res.error);
      setUrl(res.url ?? null);
      setStatus("saved");
      closeCrop();
    } catch (e) {
      console.error("avatar upload failed", e);
      setStatus("failed");
    } finally {
      setBusy(false);
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

  const s = crop ? baseScale(crop) * crop.zoom : 1;

  return (
    <div className="mt-6 max-w-md">
      <p className="text-sm font-semibold">{labels.title}</p>
      {crop ? (
        <div className="mt-2">
          <p className="text-xs text-neutral-400">{labels.cropHint}</p>
          <div
            ref={viewRef}
            role="application"
            tabIndex={0}
            aria-label={labels.cropHint}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKey}
            style={{ width: VIEW, height: VIEW }}
            className="relative mt-2 cursor-grab touch-none select-none overflow-hidden rounded-lg bg-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={crop.src}
              alt=""
              draggable={false}
              style={{ width: crop.w * s, height: crop.h * s, transform: `translate(${crop.x}px, ${crop.y}px)`, maxWidth: "none" }}
              className="pointer-events-none absolute left-0 top-0"
            />
            {/* Круг — как фото будет выглядеть на сайте. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.55)] ring-2 ring-white/70" />
          </div>
          <label className="mt-3 flex items-center gap-3 text-sm" style={{ width: VIEW }}>
            {labels.zoom}
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(e) => setCrop(zoomTo(crop, Number(e.target.value)))}
              className="flex-1 accent-red-600"
            />
          </label>
          <div className="mt-3 flex gap-2 text-sm">
            <button type="button" onClick={save} disabled={busy} className="min-h-10 rounded bg-red-600 px-4 font-semibold hover:bg-red-500 disabled:opacity-60">
              {busy ? labels.uploading : labels.save}
            </button>
            <button type="button" onClick={closeCrop} disabled={busy} className="min-h-10 rounded px-3 text-neutral-300 underline hover:text-white">
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" width={80} height={80} referrerPolicy="no-referrer" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-800 text-2xl text-neutral-500">?</span>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center rounded border border-white/30 px-3 hover:bg-white/10">
              {url ? labels.change : labels.upload}
            </label>
            <input id={id} ref={fileRef} type="file" accept="image/*" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
            {url && (
              <button type="button" onClick={onRemove} disabled={busy} className="min-h-10 rounded px-3 text-neutral-400 underline hover:text-red-400">
                {labels.remove}
              </button>
            )}
          </div>
        </div>
      )}
      {!crop && <p className="mt-2 text-xs text-neutral-400">{labels.hint}</p>}
      <p role="status" className="mt-1 min-h-5 text-sm">
        {status === "saved" && <span className="text-green-400">{labels.saved}</span>}
        {status === "failed" && <span className="text-red-400">{labels.failed}</span>}
      </p>
    </div>
  );
}
