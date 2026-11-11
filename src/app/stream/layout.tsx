import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = { title: "MafiaCL stream", robots: { index: false, follow: false } };

/** Отдельный корневой макет для слоя OBS: прозрачный фон, без шапки сайта. */
export default function StreamLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" style={{ background: "transparent" }}>
      <body data-stream style={{ background: "transparent" }} className="overflow-hidden text-white antialiased">
        {children}
      </body>
    </html>
  );
}
