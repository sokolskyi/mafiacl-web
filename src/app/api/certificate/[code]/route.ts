import type { NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderCertificatePdf, renderCertificatePng, type CertificateData } from "@/lib/certificateImage";

export const maxDuration = 30;

/**
 * Подарочный сертификат по коду: PDF для печати (по умолчанию) или PNG (?format=png).
 * Код — как ключ: его знает только покупатель (страница заказа) и тот, кому подарили.
 * code=sample — образец для витрины магазина (?n=3).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/certificate/[code]">) {
  const { code: raw } = await ctx.params;
  const q = request.nextUrl.searchParams;
  const l = q.get("l");
  const locale: Locale = (routing.locales as readonly string[]).includes(l ?? "") ? (l as Locale) : routing.defaultLocale;
  const format = q.get("format") === "png" ? "png" : "pdf";

  let data: CertificateData;
  if (raw === "sample") {
    const n = Math.min(50, Math.max(1, Number(q.get("n")) || 3));
    const names: Record<Locale, [string, string, string]> = {
      cs: ["Kláru", "Tomáš", "Ať ti to u stolu vždycky vyjde!"],
      ru: ["Анне", "Максим", "Пусть тебе всегда выпадает шериф!"],
      uk: ["Олені", "Андрій", "Нехай тобі завжди випадає шериф!"],
      en: ["Anna", "Max", "May you always draw the sheriff!"],
    };
    const [recipient, sender, message] = names[locale];
    const until = new Date(Date.UTC(new Date().getUTCFullYear() + 1, new Date().getUTCMonth(), new Date().getUTCDate()));
    data = { code: "MCL-XXXX-XXXX", recipient, sender, message, evenings: n, validUntil: until.toISOString().slice(0, 10) };
  } else {
    const code = raw.toUpperCase();
    if (!/^MCL-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return new Response("not found", { status: 404 });
    let db;
    try {
      db = createAdminClient();
    } catch {
      return new Response("not configured", { status: 503 });
    }
    const { data: c } = await db
      .from("gift_certificates")
      .select("code, recipient, sender, message, evenings, valid_until, voided_at")
      .eq("code", code)
      .maybeSingle();
    if (!c) return new Response("not found", { status: 404 });
    if (c.voided_at) return new Response("gone", { status: 410 });
    data = { code: c.code, recipient: c.recipient, sender: c.sender, message: c.message, evenings: c.evenings, validUntil: c.valid_until };
  }

  const name = `MafiaCL-${data.code}`;
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (format === "png") {
    const png = await renderCertificatePng(data, locale);
    return new Response(png, { headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `inline; filename="${name}.png"` } });
  }
  const pdf = await renderCertificatePdf(data, locale);
  return new Response(Buffer.from(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"` } });
}
