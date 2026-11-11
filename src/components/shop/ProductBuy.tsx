"use client";

import { useState, type ReactNode } from "react";
import { AddToCart } from "./AddToCart";
import { Gallery } from "./Gallery";

type Variant = { id: number; label: string; stock: number | null; images: string[] };

/** Фото + выбор варианта: если у варианта свои фото, показываем их. */
export function ProductBuy(props: {
  header: ReactNode;
  footer?: ReactNode;
  photoLabel: string;
  productId: number;
  name: string;
  priceCzk: number;
  images: string[];
  kind: "merch" | "membership";
  variants: Variant[];
  askNickname: boolean;
  askColor: boolean;
  defaultNickname?: string;
}) {
  const firstAvailable = props.variants.find((v) => v.stock === null || v.stock > 0)?.id ?? null;
  const [variantId, setVariantId] = useState<number | null>(firstAvailable);
  const variant = props.variants.find((v) => v.id === variantId);
  const images = variant && variant.images.length > 0 ? variant.images : props.images;

  return (
    <div className="mt-4 grid gap-10 md:grid-cols-2">
      <Gallery key={images.join("|")} images={images} alt={props.name} label={props.photoLabel} />
      <div>
        {props.header}
        <div className="mt-8">
          <AddToCart
            productId={props.productId}
            name={props.name}
            priceCzk={props.priceCzk}
            imageUrl={images[0] ?? null}
            kind={props.kind}
            variants={props.variants}
            askNickname={props.askNickname}
            askColor={props.askColor}
            defaultNickname={props.defaultNickname}
            onVariantChange={setVariantId}
          />
        </div>
        {props.footer}
      </div>
    </div>
  );
}
