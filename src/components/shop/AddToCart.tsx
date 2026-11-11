"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart } from "./cart-store";

type Props = {
  productId: number;
  name: string;
  priceCzk: number;
  imageUrl: string | null;
  kind: "merch" | "membership";
  variants: { id: number; label: string; stock: number | null }[];
};

export function AddToCart({ productId, name, priceCzk, imageUrl, kind, variants }: Props) {
  const t = useTranslations("shop");
  const available = variants.filter((v) => v.stock === null || v.stock > 0);
  const [variantId, setVariantId] = useState<number | null>(available[0]?.id ?? null);
  const [added, setAdded] = useState(false);
  const current = variants.find((v) => v.id === variantId);
  const labelled = variants.length > 1 || variants[0]?.label !== "";

  if (available.length === 0) return <p className="font-semibold text-neutral-400">{t("soldOut")}</p>;

  return (
    <div className="space-y-4">
      {labelled && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-neutral-300">{t("choose")}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock !== null && v.stock <= 0;
              return (
                <label
                  key={v.id}
                  className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white ${
                    out ? "cursor-not-allowed border-white/15 text-neutral-600 line-through" : variantId === v.id ? "border-white bg-white text-black" : "border-white/40 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="variant"
                    className="sr-only"
                    disabled={out}
                    checked={variantId === v.id}
                    onChange={() => {
                      setVariantId(v.id);
                      setAdded(false);
                    }}
                  />
                  {v.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {current && current.stock !== null && current.stock > 0 && current.stock <= 5 && (
        <p className="text-sm text-amber-400">{t("fewLeft", { count: current.stock })}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={variantId === null}
          onClick={() => {
            if (variantId === null) return;
            addToCart({ variantId, productId, name, label: current?.label ?? "", priceCzk, imageUrl, kind });
            setAdded(true);
          }}
          className="min-h-12 rounded-full bg-red-600 px-8 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {t("addToCart")}
        </button>
        {added && (
          <p role="status" className="text-sm font-semibold">
            {t("added")}{" "}
            <Link href="/shop/cart" className="underline">
              {t("goToCart")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
