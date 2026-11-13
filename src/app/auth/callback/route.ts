import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordSignupCountry } from "@/lib/members";

/** Google → Supabase → сюда с ?code=…: меняем код на сессию и ведём в кабинет. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Страна по IP — для проверки новой заявки (клуб не регистрирует жителей РФ и РБ).
      const { data } = await supabase.auth.getClaims();
      await recordSignupCountry(data?.claims.sub, request.headers.get("x-vercel-ip-country"));
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("auth callback: exchangeCodeForSession failed", { message: error.message });
  }
  const failed = new URL(next, origin);
  failed.searchParams.set("auth", "error");
  return NextResponse.redirect(failed);
}

/** Только относительный путь внутри сайта — иначе открытый редирект. */
function safeNext(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  return "/";
}
