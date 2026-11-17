import Image from "next/image";
import type { ReactNode } from "react";

type Tone = "dark" | "red" | "cream";

const TONES: Record<Tone, string> = {
  dark: "bg-neutral-900 text-white",
  red: "bg-red-600 text-white",
  cream: "bg-white text-black",
};

/** Плитка сетки главной. `place` — классы позиции в сетке на широком экране. */
export function Tile({
  children,
  tone = "dark",
  className = "",
  photo,
  photoAlt = "",
  photoPosition = "center",
  shade = "bottom",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  photo?: string;
  photoAlt?: string;
  photoPosition?: string;
  /** Затемнение поверх фото: снизу (текст внизу) или слева (текст слева). */
  shade?: "bottom" | "left" | "flat";
}) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[24px] lg:rounded-[28px] ${TONES[tone]} ${className}`}>
      {photo && (
        <>
          <Image
            src={photo}
            alt={photoAlt}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="-z-10 object-cover"
            style={{ objectPosition: photoPosition }}
          />
          <div
            aria-hidden="true"
            className={`-z-10 absolute inset-0 ${
              shade === "left"
                ? "bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/20 lg:bg-gradient-to-r lg:via-neutral-950/70 lg:to-transparent"
                : shade === "flat"
                  ? "bg-neutral-950/50"
                  : "bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-transparent"
            }`}
          />
        </>
      )}
      {children}
    </div>
  );
}

export function TileLabel({ children, tone = "dark" }: { children: ReactNode; tone?: Tone }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${tone === "cream" ? "text-red-800" : tone === "red" ? "text-white" : "text-red-300"}`}>
      {children}
    </p>
  );
}

export function TileTitle({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-[28px] lg:text-[44px]" : size === "md" ? "text-[22px] lg:text-[32px]" : "text-[18px] lg:text-[24px]";
  return <p className={`font-hero font-extrabold leading-[1.08] tracking-[-0.01em] ${s}`}>{children}</p>;
}

export const pill =
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-extrabold transition-colors";
