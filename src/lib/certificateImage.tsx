import "server-only";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { BG, CREAM, fonts, FONT, GOLD_200, GOLD_400, GOLD_500, logo, MUTED } from "@/lib/shareImage";

/** Подарочный сертификат: A4 альбомный (~200 dpi). Картинка рисуется в «единицах» холста 1000×707. */

export type CertificateData = {
  code: string;
  recipient: string;
  sender: string | null;
  message: string | null;
  evenings: number;
  validUntil: string; // YYYY-MM-DD
};

const W = 2339;
const H = 1654;
const u = (n: number) => Math.round((n * W) / 1000);

function fitSize(text: string, base: number, chars: number) {
  return Math.min(base, (base * chars) / Math.max(chars, text.length));
}

export async function renderCertificatePng(c: CertificateData, locale: Locale): Promise<ArrayBuffer> {
  const t = await getTranslations({ locale, namespace: "certificate" });
  const playUrl = `${SITE_URL}${getPathname({ href: "/play", locale })}`;
  const [fontData, logoSrc, qr] = await Promise.all([
    fonts(),
    logo(),
    QRCode.toDataURL(playUrl, { margin: 1, width: u(190), color: { dark: "#2a050bff", light: "#fdffc2ff" }, errorCorrectionLevel: "M" }),
  ]);
  const until = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${c.validUntil}T00:00:00Z`));

  const Star = ({ size }: { size: number }) => (
    <svg width={u(size)} height={u(size)} viewBox="0 0 24 24">
      <path fill={GOLD_400} d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />
    </svg>
  );
  const corner = (pos: Record<string, number>) => (
    <div style={{ display: "flex", position: "absolute", ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, u(v)])) }}>
      <Star size={16} />
    </div>
  );

  const body = (
    <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: BG, color: CREAM, fontFamily: FONT }}>
      {/* Двойная золотая рамка */}
      <div style={{ display: "flex", position: "absolute", left: u(22), top: u(22), right: u(22), bottom: u(22), border: `${u(2.2)}px solid ${GOLD_400}`, borderRadius: u(10) }} />
      <div style={{ display: "flex", position: "absolute", left: u(31), top: u(31), right: u(31), bottom: u(31), border: `${u(0.7)}px solid ${GOLD_500}`, borderRadius: u(6) }} />
      {corner({ left: 14, top: 14 })}
      {corner({ right: 14, top: 14 })}
      {corner({ left: 14, bottom: 14 })}
      {corner({ right: 14, bottom: 14 })}

      <div style={{ display: "flex", width: "100%", height: "100%", padding: `${u(62)}px ${u(70)}px ${u(56)}px` }}>
        {/* Левая часть: кому и на что */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: u(40) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={u(160)} height={u(57)} />
          <div style={{ display: "flex", marginTop: u(26), fontSize: u(19), fontWeight: 800, color: GOLD_400, letterSpacing: u(4), textTransform: "uppercase" }}>{t("title")}</div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: u(6) }}>
            <div style={{ display: "flex", fontSize: u(150), fontWeight: 800, lineHeight: 0.85, color: GOLD_400 }}>{c.evenings}</div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: u(18), marginBottom: u(8) }}>
              <div style={{ display: "flex", fontSize: u(46), fontWeight: 800, lineHeight: 0.95, textTransform: "uppercase" }}>{t("evenings", { n: c.evenings })}</div>
              <div style={{ display: "flex", fontSize: u(19), color: MUTED, marginTop: u(6) }}>{t("club")}</div>
            </div>
          </div>

          <div style={{ display: "flex", marginTop: u(40), fontSize: u(17), color: MUTED, textTransform: "uppercase", letterSpacing: u(3) }}>{t("for")}</div>
          <div style={{ display: "flex", marginTop: u(4), fontSize: u(fitSize(c.recipient, 66, 16)), fontWeight: 800, lineHeight: 1 }}>{c.recipient}</div>
          <div style={{ display: "flex", width: u(380), height: u(1.4), marginTop: u(14), background: GOLD_500 }} />
          {c.sender && <div style={{ display: "flex", marginTop: u(16), fontSize: u(21), color: GOLD_200 }}>{t("from", { name: c.sender })}</div>}
          {c.message && (
            <div style={{ display: "flex", marginTop: u(12), maxWidth: u(520), fontSize: u(c.message.length > 120 ? 17 : 20), lineHeight: 1.3, color: CREAM }}>
              {`«${c.message}»`}
            </div>
          )}
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", maxWidth: u(540), fontSize: u(15.5), lineHeight: 1.35, color: MUTED }}>{t("howTo")}</div>
        </div>

        {/* Правая часть: код, срок, QR на запись */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: u(250) }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: `${u(16)}px ${u(10)}px`, borderRadius: u(10), border: `${u(1.2)}px solid ${GOLD_500}`, background: "rgba(251,191,36,0.08)" }}>
            <div style={{ display: "flex", fontSize: u(14), color: MUTED, textTransform: "uppercase", letterSpacing: u(2.5) }}>{t("code")}</div>
            <div style={{ display: "flex", marginTop: u(6), fontSize: u(30), fontWeight: 800, color: GOLD_200, letterSpacing: u(1.5) }}>{c.code}</div>
            <div style={{ display: "flex", marginTop: u(10), fontSize: u(15), color: CREAM }}>{t("validUntil", { date: until })}</div>
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" width={u(170)} height={u(170)} style={{ borderRadius: u(8) }} />
          <div style={{ display: "flex", marginTop: u(10), fontSize: u(17), fontWeight: 800, textTransform: "uppercase", letterSpacing: u(1.5) }}>{t("qr")}</div>
          <div style={{ display: "flex", marginTop: u(2), fontSize: u(14), color: MUTED }}>{SITE_URL.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
    </div>
  );

  const res = new ImageResponse(body, { width: W, height: H, fonts: fontData });
  return res.arrayBuffer();
}

/** PDF A4 альбомный: одна страница с картинкой сертификата во весь лист. */
export async function renderCertificatePdf(c: CertificateData, locale: Locale): Promise<Uint8Array> {
  const png = await renderCertificatePng(c, locale);
  const doc = await PDFDocument.create();
  doc.setTitle(`MafiaCL — ${c.code}`);
  doc.setAuthor("MafiaCL");
  const img = await doc.embedPng(png);
  const page = doc.addPage([841.89, 595.28]);
  page.drawImage(img, { x: 0, y: 0, width: 841.89, height: 595.28 });
  return doc.save();
}
